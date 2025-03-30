<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from "vue";
import * as THREE from "three";
import * as CANNON from "cannon-es";
import { SceneManager } from "./sceneManager";
import { Rocket } from "./Rocket";
import { Platform } from "./Platform";
import { updatePhysics, syncMeshWithBody, disposePhysics } from "./physics";
import {
  ErrorType,
  handleRenderingError,
  withErrorHandling,
  handleAssetError,
} from "../utils/errorHandler";
import inputHandler from "./inputHandler";
import { useGameStore } from "../stores/gameStore";
import {
  registerCollisionHandlers,
  getCrashParticles,
} from "./collisionHandler";
import { assetLoader, AssetType } from "../utils/assetLoader";
import HUD from "../components/HUD.vue";
import { Terrain } from "./Terrain";

// Create refs for the scene elements
const canvasContainer = ref<HTMLDivElement | null>(null);
const isLoading = ref(true);
const loadingProgress = ref(0);
let sceneManager: SceneManager | null = null;
let rocket: Rocket | null = null;
let platform: Platform | null = null;
let terrain: Terrain | null = null;
let animationFrameId: number | null = null;
let cleanupCollisionHandlers: (() => void) | null = null;

// Get the game store
const gameStore = useGameStore();

// Constants for game physics
const THRUST_FORCE = 15; // Force magnitude for rocket thrust
const FUEL_CONSUMPTION_RATE = -0.5; // Fuel consumed per frame when thrusting

// Function to load all game assets
const loadGameAssets = async (): Promise<void> => {
  try {
    // Define assets to load
    const assetsToLoad = [
      {
        type: AssetType.MODEL,
        url: "/models/rocket.glb",
        key: "rocket",
      },
    ];

    // Set up loading manager progress tracking
    assetLoader.loadingManager.onProgress = (url, itemsLoaded, itemsTotal) => {
      loadingProgress.value = Math.round((itemsLoaded / itemsTotal) * 100);
      console.log(`Loading: ${loadingProgress.value}% (${url})`);
    };

    // Load all assets
    await assetLoader.loadAssets(assetsToLoad);

    // Load platform textures
    await assetLoader.loadPlatformTextures();

    // Load skybox textures
    const skyboxTextures = await assetLoader.loadSkyboxTextures();

    // Assets loaded successfully
    isLoading.value = false;
    console.log("All assets loaded successfully");

    // Initialize the game scene
    initializeGameScene(skyboxTextures);
  } catch (error) {
    handleAssetError(
      "Failed to load game assets",
      error instanceof Error ? error : new Error(String(error))
    );
    isLoading.value = false;
  }
};

// Initialize game objects and start the animation loop
const initializeGameScene = (skyboxTextures: THREE.Texture[]) => {
  if (!canvasContainer.value) return;

  try {
    // Initialize the scene manager
    sceneManager = new SceneManager(canvasContainer.value);

    // Create skybox
    sceneManager.createSkybox(skyboxTextures);

    // Create and add the terrain
    terrain = new Terrain();
    sceneManager.scene.add(terrain.getMesh());
    // Add terrain body to physics world
    const terrainBody = terrain.getBody();
    if (terrainBody) {
      // The body is already added to the world in the Terrain constructor
      console.log("Terrain added to physics world");
    }

    // Get the current texture choice from game store
    const currentTexture = assetLoader.getTexture(gameStore.textureChoice);

    // Create and add the platform with the selected texture
    platform = new Platform({
      texture: currentTexture,
    });
    platform.addToScene(sceneManager.scene);

    // Create and add the rocket
    rocket = new Rocket();
    rocket.addToScene(sceneManager.scene);

    // Set up collision detection between rocket and platform
    if (rocket && platform) {
      cleanupCollisionHandlers = registerCollisionHandlers(
        rocket.getBody(),
        platform.getBody()
      );

      // Add crash particles to the scene
      const crashParticles = getCrashParticles();
      if (crashParticles) {
        sceneManager.scene.add(crashParticles.getMesh());
      }
    }

    // Watch for texture choice changes to update platform
    watch(
      () => gameStore.textureChoice,
      (newTextureChoice) => {
        if (platform) {
          const texture = assetLoader.getTexture(newTextureChoice);
          if (texture) {
            platform.updateTexture(texture);
          }
        }
      }
    );

    // Animation loop
    const animate = () => {
      if (!sceneManager || !rocket) return;

      // Update physics simulation
      updatePhysics(1 / 60);

      // Sync the rocket mesh with its physics body
      syncMeshWithBody(rocket.getMesh(), rocket.getBody());

      // Process input
      processInput();

      // Update particle systems
      rocket.getThrusterParticles().update(1 / 60);

      // Update crash particles if they exist
      const crashParticles = getCrashParticles();
      if (crashParticles) {
        crashParticles.update(1 / 60);
      }

      // Update input handler for next frame
      inputHandler.update();

      // Render the scene
      sceneManager.render();

      // Request the next animation frame
      animationFrameId = requestAnimationFrame(animate);
    };

    // Process input from the input handler
    const processInput = () => {
      if (!rocket) return;

      // Check for reset first, regardless of game state
      if (inputHandler.isResetPressed()) {
        // Reset rocket position and orientation
        const rocketBody = rocket.getBody();
        rocketBody.position.set(0, 15, 0); // Match the new starting height
        rocketBody.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 0, 1), 0);
        rocketBody.velocity.set(0, 0, 0);
        rocketBody.angularVelocity.set(0, 0, 0);

        // Ensure the body is not static and can be affected by physics
        rocketBody.type = CANNON.Body.DYNAMIC;
        rocketBody.mass = 1;
        rocketBody.updateMassProperties();

        // Reset game state
        gameStore.resetGame();
        console.log("Game reset");
        return;
      }

      // Don't process other input if the rocket has landed or crashed
      if (
        gameStore.gameState === "landed" ||
        gameStore.gameState === "crashed"
      ) {
        return;
      }

      // Update game state if not already in flying state when controls are used
      if (
        gameStore.gameState === "pre-launch" &&
        (inputHandler.isTiltLeft() ||
          inputHandler.isTiltRight() ||
          inputHandler.isThrust())
      ) {
        gameStore.setGameState("flying");
      }

      // Apply tilt controls
      if (inputHandler.isTiltLeft()) {
        // Apply positive angular velocity around z-axis for counterclockwise rotation
        rocket.getBody().angularVelocity.set(0, 0, 1);
        console.log("Tilt Left");
      } else if (inputHandler.isTiltRight()) {
        // Apply negative angular velocity around z-axis for clockwise rotation
        rocket.getBody().angularVelocity.set(0, 0, -1);
        console.log("Tilt Right");
      } else {
        // When neither key is pressed, let the angular damping slow rotation naturally
        // We only zero out the Z component to allow physics to handle the rest
        rocket.getBody().angularVelocity.x = 0;
        rocket.getBody().angularVelocity.y = 0;
      }

      // Apply thrust when spacebar is pressed and there's fuel remaining
      if (
        inputHandler.isThrust() &&
        gameStore.hasFuel &&
        gameStore.gameState === "flying"
      ) {
        // Calculate thrust direction based on rocket's current orientation
        const thrustDirection = new CANNON.Vec3(0, 1, 0); // Local "up" vector
        const worldThrustDirection = rocket
          .getBody()
          .quaternion.vmult(thrustDirection);

        // Apply the force to the rocket body
        rocket
          .getBody()
          .applyForce(
            worldThrustDirection.scale(THRUST_FORCE),
            rocket.getBody().position
          );

        // Consume fuel
        gameStore.updateFuel(FUEL_CONSUMPTION_RATE);

        // Emit thruster particles
        rocket.emitThrusterParticles(5);

        console.log("Thrust applied, fuel remaining:", gameStore.fuel);
      }
    };

    // Start the animation loop wrapped with error handling
    const safeAnimate = withErrorHandling(
      animate,
      ErrorType.RENDERING,
      "Error in animation loop"
    );
    safeAnimate();
  } catch (error) {
    handleRenderingError("Failed to initialize game canvas", error as Error);
  }
};

// Start loading process when the component is mounted
onMounted(() => {
  loadGameAssets();
});

onUnmounted(() => {
  // Cancel animation frame
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
  }

  // Clean up collision handlers
  if (cleanupCollisionHandlers) {
    cleanupCollisionHandlers();
  }

  // Dispose of rocket resources
  if (rocket) {
    rocket.dispose();
  }

  // Dispose of platform resources
  if (platform) {
    platform.dispose();
  }

  // Dispose of terrain resources
  if (terrain) {
    terrain.dispose();
  }

  // Dispose of input handler
  inputHandler.dispose();

  // Clean up physics resources
  disposePhysics();

  // Clean up asset loader resources
  assetLoader.dispose();

  // Dispose of scene manager resources
  if (sceneManager) {
    sceneManager.dispose();
  }
});
</script>

<template>
  <div id="canvas" ref="canvasContainer" class="w-full h-full">
    <!-- Loading screen overlay -->
    <div v-if="isLoading" class="loading-overlay">
      <div class="loading-content">
        <div>Loading game assets: {{ loadingProgress }}%</div>
        <div class="loading-bar-container">
          <div class="loading-bar" :style="`width: ${loadingProgress}%`"></div>
        </div>
      </div>
    </div>

    <!-- HUD Component -->
    <HUD v-if="!isLoading" />
  </div>
</template>

<style scoped>
#canvas {
  width: 100%;
  height: 100%;
  display: block;
  position: relative;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: rgba(17, 24, 39, 0.9); /* bg-gray-900 with opacity */
  z-index: 10;
}

.loading-content {
  color: white;
  font-size: 1.25rem;
  text-align: center;
}

.loading-bar-container {
  width: 300px;
  height: 20px;
  background-color: #374151; /* bg-gray-700 */
  border-radius: 4px;
  margin-top: 10px;
  overflow: hidden;
}

.loading-bar {
  height: 100%;
  background-color: #10b981; /* bg-green-500 */
  transition: width 0.3s ease;
}
</style>
