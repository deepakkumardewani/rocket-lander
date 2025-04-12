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
import LoadingScreen from "../components/LoadingScreen.vue";
import EffectsPanel from "../components/EffectsPanel.vue";
import { Terrain } from "./Terrain";

// Define emits
const emit = defineEmits<{
  (e: "game-end"): void;
}>();

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
const hudRef = ref<InstanceType<typeof HUD> | null>(null);

// Interval references for cleanup
let shootingStarInterval: number | null = null;
let auroraInterval: number | null = null;

// Watch for hudRef changes to properly connect it to SceneManager
watch(
  hudRef,
  (newHudRef) => {
    if (newHudRef && sceneManager) {
      sceneManager.setHUDRef(newHudRef);
    }
  },
  { flush: "post" }
);

// Sound state tracking
let isThrusterSoundPlaying = false;
let lastRocketVelocityY = 0;
const LANDING_SOUND_VELOCITY_THRESHOLD = -2; // Velocity threshold to play landing sound

// Get the game store
const gameStore = useGameStore();

// Constants for game physics
const THRUST_FORCE = 15; // Force magnitude for rocket thrust
const FUEL_CONSUMPTION_RATE = -0.05; // Fuel consumed per frame when thrusting (reduced from -0.5)
const ROTATION_SPEED = 1; // Angular velocity for rotation (radians/second)
const ROTATION_DAMPING = 0.95; // Damping factor for rotation

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
      // Add sound effects
      {
        type: AssetType.AUDIO,
        url: "/src/assets/sounds/rocket-thrust.mp3",
        key: "rocket-thrust",
      },
      {
        type: AssetType.AUDIO,
        url: "/src/assets/sounds/rocket-landing.mp3",
        key: "rocket-landing",
      },
      {
        type: AssetType.AUDIO,
        url: "/src/assets/sounds/missile-explosion.mp3",
        key: "missile-explosion",
      },
    ];

    // Set up loading manager progress tracking
    assetLoader.loadingManager.onProgress = (url, itemsLoaded, itemsTotal) => {
      loadingProgress.value = Math.round((itemsLoaded / itemsTotal) * 100);
      console.log(`Loading: ${loadingProgress.value}% (${url})`);
    };

    // Initialize audio context (must be called after user interaction)
    // We'll initialize it here for loading, but it won't produce sound until user interacts
    assetLoader.initAudioContext();

    // Load all assets
    await assetLoader.loadAssets(assetsToLoad);

    // Load platform textures
    await assetLoader.loadPlatformTextures();

    // Load skybox textures
    const skyboxTextures = await assetLoader.loadSkyboxTextures();

    // Load star texture
    const starTexture = await assetLoader.loadStarTexture();

    // Assets loaded successfully
    isLoading.value = false;
    console.log("All assets loaded successfully");

    // Initialize the game scene
    initializeGameScene(skyboxTextures, starTexture);
  } catch (error) {
    handleAssetError(
      "Failed to load game assets",
      error instanceof Error ? error : new Error(String(error))
    );
    isLoading.value = false;
  }
};

// Initialize game objects and start the animation loop
const initializeGameScene = (
  skyboxTextures: THREE.Texture[],
  starTexture: THREE.Texture
) => {
  if (!canvasContainer.value) return;

  try {
    // Initialize the scene manager
    sceneManager = new SceneManager(canvasContainer.value);

    // Create skybox
    sceneManager.createSkybox(skyboxTextures);

    // Create a dynamic star field
    sceneManager.createStarField({
      starCount: 3500,
      radius: 95,
      minSize: 0.15,
      maxSize: 0.7,
      movementSpeed: 0.2,
      movementPattern: "radial",
      texture: starTexture,
    });

    // Create celestial objects (planets and moons)
    sceneManager.createCelestialObjects();

    // Create shooting stars system
    sceneManager.createShootingStars({
      maxShootingStars: 8,
      maxTrailLength: 25,
      minSpawnInterval: 4,
      maxSpawnInterval: 12,
      texture: starTexture,
    });

    // Create and add the terrain
    terrain = new Terrain();
    sceneManager.scene.add(terrain.getMesh());
    // The terrain body is already added to the world in the Terrain constructor
    console.log("Terrain added to scene");

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

    // Initially set rocket to static in waiting mode
    if (gameStore.gameState === "waiting") {
      rocket.getBody().type = CANNON.Body.STATIC;
    }

    // Set up collision detection between rocket and platform
    if (rocket && platform) {
      cleanupCollisionHandlers = registerCollisionHandlers(
        rocket.getBody(),
        platform.getBody(),
        // Add callback for successful landing
        () => {
          // Play landing sound when successfully landed
          // assetLoader.playAudio("rocket-landing", false, 0.7);
        },
        // Add callback for crash
        () => {
          // Play explosion sound when crashed
          console.log("Playing explosion sound");
          assetLoader.playAudio("missile-explosion", false, 0.8);
        }
      );

      // Add crash particles to the scene
      const crashParticles = getCrashParticles();
      if (crashParticles) {
        sceneManager.scene.add(crashParticles.getMesh());
      }
    }

    // Add collision detection between rocket and terrain
    if (rocket && terrain) {
      const terrainCleanup = registerCollisionHandlers(
        rocket.getBody(),
        terrain.getBody(),
        undefined, // No successful landing on terrain
        () => {
          // Play explosion sound when crashing into terrain
          console.log("Rocket crashed into terrain");
          assetLoader.playAudio("missile-explosion", false, 0.8);
        }
      );

      // Combine cleanup functions
      const previousCleanup = cleanupCollisionHandlers;
      cleanupCollisionHandlers = () => {
        if (previousCleanup) previousCleanup();
        terrainCleanup();
      };
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

    // Watch for game state changes to handle sound effects
    watch(
      () => gameStore.gameState,
      (newState) => {
        // Stop thruster sound when game state changes to landed or crashed
        if (newState === "landed" || newState === "crashed") {
          if (isThrusterSoundPlaying) {
            assetLoader.stopAudio("rocket-thrust");
            isThrusterSoundPlaying = false;
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

      // Track the rocket's velocity for landing sound
      if (rocket && gameStore.gameState === "flying") {
        const rocketBody = rocket.getBody();
        const currentVelY = rocketBody.velocity.y;

        // If rocket is descending (negative velocity) and then suddenly slows down (approaching platform)
        // This indicates it might be approaching the landing pad
        if (
          lastRocketVelocityY < LANDING_SOUND_VELOCITY_THRESHOLD &&
          Math.abs(currentVelY) < 0.5
        ) {
          assetLoader.playAudio("rocket-landing", false, 0.3); // Play at lower volume when approaching
        }

        lastRocketVelocityY = currentVelY;
      }

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

        // Stop any playing thruster sound when resetting
        if (isThrusterSoundPlaying) {
          assetLoader.stopAudio("rocket-thrust");
          isThrusterSoundPlaying = false;
        }

        // Reset game state but maintain environment
        gameStore.resetGame();

        // Now make rocket static again until space is pressed
        rocketBody.type = CANNON.Body.STATIC;

        return;
      }

      // Waiting for space to start the game
      if (gameStore.gameState === "waiting") {
        if (inputHandler.isKeyPressed(" ")) {
          // Transition to pre-launch state
          gameStore.setGameState("pre-launch");
        }

        // While in waiting state, make the rocket static (not affected by gravity)
        const rocketBody = rocket.getBody();
        rocketBody.type = CANNON.Body.STATIC;
        return;
      } else if (gameStore.gameState === "pre-launch") {
        // When in pre-launch, make the rocket dynamic again (affected by gravity)
        const rocketBody = rocket.getBody();
        if (rocketBody.type === CANNON.Body.STATIC) {
          rocketBody.type = CANNON.Body.DYNAMIC;
          rocketBody.mass = 1;
          rocketBody.updateMassProperties();
        }
      }

      // Don't process other input if the rocket has landed or crashed
      if (
        gameStore.gameState === "landed" ||
        gameStore.gameState === "crashed"
      ) {
        // Stop thruster sound if it was playing
        if (isThrusterSoundPlaying) {
          assetLoader.stopAudio("rocket-thrust");
          isThrusterSoundPlaying = false;
        }
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

      const rocketBody = rocket.getBody();

      // Apply tilt controls with smooth damping
      if (inputHandler.isTiltLeft()) {
        // Apply controlled rotation speed
        rocketBody.angularVelocity.z = ROTATION_SPEED;
      } else if (inputHandler.isTiltRight()) {
        // Apply controlled rotation speed in opposite direction
        rocketBody.angularVelocity.z = -ROTATION_SPEED;
      } else {
        // Apply damping to smoothly stop rotation
        rocketBody.angularVelocity.z *= ROTATION_DAMPING;
        if (Math.abs(rocketBody.angularVelocity.z) < 0.01) {
          rocketBody.angularVelocity.z = 0;
        }
      }

      // Keep other angular velocities at 0 to prevent unwanted rotation
      rocketBody.angularVelocity.x = 0;
      rocketBody.angularVelocity.y = 0;

      // Apply thrust when spacebar is pressed and there's fuel remaining
      if (
        inputHandler.isThrust() &&
        gameStore.hasFuel &&
        gameStore.gameState === "flying"
      ) {
        // Calculate thrust direction based on rocket's current orientation
        const thrustDirection = new CANNON.Vec3(0, 1, 0); // Local "up" vector
        const worldThrustDirection =
          rocketBody.quaternion.vmult(thrustDirection);

        // Apply the force through the center of mass to prevent unwanted rotation
        rocketBody.applyForce(
          worldThrustDirection.scale(THRUST_FORCE),
          new CANNON.Vec3(0, 0, 0) // Apply force at center of mass
        );

        // Consume fuel
        gameStore.updateFuel(FUEL_CONSUMPTION_RATE);

        // Emit thruster particles
        rocket.emitThrusterParticles(5);

        // Play thruster sound if not already playing
        if (!isThrusterSoundPlaying) {
          assetLoader.playAudio("rocket-thrust", true, 0.4); // Loop the thrust sound
          isThrusterSoundPlaying = true;
        }
      } else if (isThrusterSoundPlaying) {
        // Stop thruster sound when not thrusting
        assetLoader.stopAudio("rocket-thrust");
        isThrusterSoundPlaying = false;
      }
    };

    // Start the animation loop wrapped with error handling
    const safeAnimate = withErrorHandling(
      animate,
      ErrorType.RENDERING,
      "Error in animation loop"
    );
    safeAnimate();

    // Initialize audio after user interaction
    document.addEventListener(
      "click",
      () => {
        assetLoader.initAudioContext();
      },
      { once: true }
    );

    document.addEventListener(
      "keydown",
      () => {
        assetLoader.initAudioContext();
      },
      { once: true }
    );

    // Create a star field
    sceneManager.createStarField({
      starCount: 2000,
      radius: 90,
      movementPattern: "radial",
      texture: assetLoader.getTexture("star"),
    });

    // Create celestial objects (planets/moons)
    sceneManager.createCelestialObjects();

    // Create shooting stars effect
    sceneManager.createShootingStars({
      maxShootingStars: 5,
      minSpawnInterval: 3,
      maxSpawnInterval: 15,
      texture: assetLoader.getTexture("star"),
    });

    // Create nebula effect (Phase 5, Step 17)
    sceneManager.createNebula({
      planeCount: 5,
      planeSize: 120,
      opacity: 0.15,
      distribution: 60,
      colors: [
        new THREE.Color(0x3311cc), // Deep purple
        new THREE.Color(0x0066ff), // Blue
        new THREE.Color(0xff3377), // Pink
      ],
    });

    // Create aurora effect (Phase 5, Step 18)
    sceneManager.createAurora({
      radius: 100,
      baseColor: new THREE.Color(0x00ff99), // Green
      secondaryColor: new THREE.Color(0x4455ff), // Blue
      initialIntensity: 0.4, // Start partially visible
    });

    // Find a bright star or planet for the lens flare
    // Use position of the blue gas giant from CelestialObjects.ts
    const flareSourcePosition = new THREE.Vector3(40, 25, -70);

    // Create lens flare effect (Phase 5, Step 19)
    sceneManager.createLensFlare({
      sourcePosition: flareSourcePosition,
      flareColor: new THREE.Color(0xffffcc), // Warm yellow
      size: 15,
      intensity: 0.8,
    });

    // Trigger some effects for demonstration
    // Shooting star every 5 seconds instead of 10
    shootingStarInterval = window.setInterval(() => {
      if (sceneManager) {
        sceneManager.triggerShootingStar();
      }
    }, 5000);

    // Aurora effect that pulses every 30 seconds
    auroraInterval = window.setInterval(() => {
      if (sceneManager) {
        sceneManager.triggerAurora(0.8, 5); // 0.8 intensity for 5 seconds
      }
    }, 30000);
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

  // Clear effect intervals
  if (shootingStarInterval !== null) {
    clearInterval(shootingStarInterval);
  }
  if (auroraInterval !== null) {
    clearInterval(auroraInterval);
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
    <!-- Loading Screen -->
    <LoadingScreen v-if="isLoading" :progress="loadingProgress" />

    <!-- Start Instruction -->
    <div
      v-if="!isLoading && gameStore.gameState === 'waiting'"
      class="start-instruction"
    >
      Press Space to Start
    </div>

    <!-- Back to Selection Button -->
    <div
      v-if="
        !isLoading &&
        (gameStore.gameState === 'landed' || gameStore.gameState === 'crashed')
      "
      class="back-button"
      @click="emit('game-end')"
    >
      Back to Selection
    </div>

    <!-- HUD -->
    <HUD
      v-if="!isLoading && sceneManager"
      ref="hudRef"
      :scene-manager="sceneManager"
    />

    <!-- Effects Panel Component -->
    <EffectsPanel
      v-if="!isLoading && sceneManager"
      :scene-manager="sceneManager"
    />
  </div>
</template>

<style scoped>
#canvas {
  width: 100%;
  height: 100%;
  display: block;
  position: relative;
}

.start-instruction {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 2rem;
  color: white;
  text-shadow: 0 0 10px rgba(0, 200, 255, 0.8);
  animation: pulse 1.5s infinite ease-in-out;
  z-index: 10;
  pointer-events: none;
  font-family: "Arial", sans-serif;
  letter-spacing: 2px;
}

@keyframes pulse {
  0% {
    opacity: 0.6;
    transform: translate(-50%, -50%) scale(0.98);
  }
  50% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1.02);
  }
  100% {
    opacity: 0.6;
    transform: translate(-50%, -50%) scale(0.98);
  }
}

.back-button {
  position: absolute;
  top: 20px;
  right: 20px;
  background-color: rgba(0, 0, 0, 0.6);
  color: white;
  padding: 10px 15px;
  border-radius: 4px;
  cursor: pointer;
  font-family: "Arial", sans-serif;
  z-index: 20;
  border: 1px solid rgba(255, 255, 255, 0.3);
  transition: background-color 0.2s, transform 0.1s;
}

.back-button:hover {
  background-color: rgba(0, 0, 0, 0.8);
  transform: scale(1.05);
}

.back-button:active {
  transform: scale(0.98);
}
</style>
