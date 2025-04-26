<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from "vue";
import * as THREE from "three";
import * as CANNON from "cannon-es";
import { SceneManager } from "./sceneManager";
import { Rocket } from "./Rocket";
import { Platform } from "./Platform";
import { BoatPlatform } from "./BoatPlatform";
import { Obstacle } from "./Obstacle";
import {
  updatePhysics,
  syncMeshWithBody,
  disposePhysics,
  setGravity,
  setWindStrength,
} from "./physics";
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
  registerLandingTarget,
} from "./collisionHandler";
import { assetLoader, AssetType } from "../utils/assetLoader";
import HUD from "../components/HUD/HUD.vue";
import LoadingScreen from "../components/LoadingScreen.vue";
import EffectsPanel from "../components/EffectsPanel.vue";
import { Terrain } from "./Terrain";
import { SeaSurface } from "./SeaSurface";
import { spaceLevels, seaLevels } from "./levels";
import type { LevelConfig } from "./levels";

// Define emits
const emit = defineEmits<{
  (e: "game-end"): void;
}>();

const gameStore = useGameStore();

// Create refs for the scene elements
const canvasContainer = ref<HTMLDivElement | null>(null);
const isLoading = ref(true);
const loadingProgress = ref(0);
let sceneManager: SceneManager | null = null;
let rocket: Rocket | null = null;
let platform: Platform | null = null;
let boatPlatform: BoatPlatform | null = null;
let terrain: Terrain | null = null;
let seaSurface: SeaSurface | null = null;
let animationFrameId: number | null = null;
let cleanupCollisionHandlers: (() => void) | null = null;
const hudRef = ref<InstanceType<typeof HUD> | null>(null);
let lastFrameTime = performance.now();
let frameCount = 0; // Add frame counter for throttling updates

// Camera position storage
let defaultCameraPosition: THREE.Vector3 | null = null;
let defaultCameraTarget: THREE.Vector3 | null = null;

// Interval references for cleanup
let shootingStarInterval: number | null = null;
let auroraInterval: number | null = null;

// Array to store obstacle instances
let obstacles: Obstacle[] = [];

// Sound state tracking
let isThrusterSoundPlaying = false;
let lastRocketVelocityY = 0;
const LANDING_SOUND_VELOCITY_THRESHOLD = -2; // Velocity threshold to play landing sound

// Constants for game physics
const THRUST_FORCE = 15; // Force magnitude for rocket thrust
const FUEL_CONSUMPTION_RATE = -0.05; // Fuel consumed per frame when thrusting (reduced from -0.5)
const ROTATION_SPEED = 1; // Angular velocity for rotation (radians/second)
const ROTATION_DAMPING = 0.95; // Damping factor for rotation

// Get the current level configuration based on environment and level
const levelConfig = computed<LevelConfig | null>(() => {
  const { environment, currentLevel } = gameStore;

  console.log("environment", environment);
  console.log("currentLevel", currentLevel);
  if (environment === "space") {
    return (
      spaceLevels.find((level) => level.levelNumber === currentLevel) || null
    );
  } else if (environment === "sea") {
    return (
      seaLevels.find((level) => level.levelNumber === currentLevel) || null
    );
  }

  return null;
});

// Function to reset camera to default position
const resetCamera = () => {
  if (!sceneManager || !defaultCameraPosition || !defaultCameraTarget) return;

  // Smoothly animate to default position
  const startPosition = sceneManager.camera.position.clone();
  const startTarget = sceneManager.controls.target.clone();
  const startTime = performance.now();
  const duration = 2000; // 1 second transition

  const animateCameraReset = () => {
    if (!sceneManager || !defaultCameraPosition || !defaultCameraTarget) return;

    const elapsed = performance.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);

    // Use easing function for smoother transition
    const eased = easeOutCubic(progress);

    // Interpolate position and target
    sceneManager.camera.position.lerpVectors(
      startPosition,
      defaultCameraPosition,
      eased
    );

    sceneManager.controls.target.lerpVectors(
      startTarget,
      defaultCameraTarget,
      eased
    );

    // Update controls and projection
    sceneManager.controls.update();

    if (progress < 1) {
      requestAnimationFrame(animateCameraReset);
    }
  };

  animateCameraReset();
};

// Easing function for smoother camera animation
const easeOutCubic = (x: number): number => {
  return 1 - Math.pow(1 - x, 3);
};

// Function to load all game assets
const loadGameAssets = async (): Promise<void> => {
  try {
    // Define assets to load
    const assetsToLoad = [
      {
        type: AssetType.MODEL,
        url: "/src/assets/models/rocket.glb",
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

    // Add sea environment specific audio if in sea environment
    if (gameStore.environment === "sea") {
      assetsToLoad.push({
        type: AssetType.AUDIO,
        url: "/src/assets/sounds/sea_waves.mp3",
        key: "sea-waves",
      });
    }

    // Set up loading manager progress tracking
    assetLoader.loadingManager.onProgress = (_, itemsLoaded, itemsTotal) => {
      loadingProgress.value = Math.round((itemsLoaded / itemsTotal) * 100);
      // console.log(`Loading: ${loadingProgress.value}% (${url})`);
    };

    // Initialize audio context (must be called after user interaction)
    // We'll initialize it here for loading, but it won't produce sound until user interacts
    assetLoader.initAudioContext();

    // Load all assets
    await assetLoader.loadAssets(assetsToLoad);

    // Log level configuration for testing
    if (levelConfig.value) {
      console.log(`Loaded level configuration:`, levelConfig.value);
    } else {
      console.warn(
        "No level configuration found for the current environment and level"
      );
    }

    // Load platform textures
    await assetLoader.loadPlatformTextures();

    // Initialize variables
    let seaNormalMap: THREE.Texture | null = null;

    // Load boat textures if in sea environment
    if (gameStore.environment === "sea") {
      await assetLoader.loadBoatTextures();
      // Load sea normal map texture for enhanced water detail
      seaNormalMap = await assetLoader.loadSeaNormalTexture();
    }

    // Load skybox textures (both space and sea)
    const spaceTextures = await assetLoader.loadSkyboxTextures();

    // Load star texture
    const starTexture = await assetLoader.loadStarTexture();

    // Get the current texture based on environment and texture choice
    const currentTexture = assetLoader.getTexture(gameStore.textureChoice);
    if (!currentTexture) {
      throw new Error(`Failed to load texture: ${gameStore.textureChoice}`);
    }

    // Assets loaded successfully
    isLoading.value = false;
    // console.log("All assets loaded successfully");

    // Initialize the game scene with the current texture
    initializeGameScene(
      spaceTextures,
      starTexture,
      currentTexture,
      seaNormalMap
    );
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
  spaceTextures: THREE.Texture[],
  starTexture: THREE.Texture,
  boatTexture: THREE.Texture | null = null,
  seaNormalMap: THREE.Texture | null = null
) => {
  if (!canvasContainer.value) return;

  try {
    // Initialize the scene manager
    sceneManager = new SceneManager(canvasContainer.value);

    // Store default camera position after scene is set up
    defaultCameraPosition = sceneManager.camera.position.clone();
    defaultCameraTarget = sceneManager.controls.target.clone();

    // Apply level-specific physics settings if level configuration exists
    if (levelConfig.value) {
      // Set gravity from level config
      setGravity(levelConfig.value.gravity);

      // Set wind strength from level config
      setWindStrength(levelConfig.value.windStrength);

      // Set fuel from level config (update initial fuel value)
      gameStore.updateFuel(levelConfig.value.startingFuel - 100); // Adjust from default 100
    }

    // Create skybox based on environment
    if (gameStore.environment === "space") {
      sceneManager.createSkybox(spaceTextures);

      // Get the current texture choice from game store
      const currentTexture = assetLoader.getTexture(gameStore.textureChoice);

      // Create a dynamic star field
      sceneManager.createStarField({
        starCount: 800,
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
        maxShootingStars: 3,
        maxTrailLength: 15,
        minSpawnInterval: 6,
        maxSpawnInterval: 15,
        texture: starTexture,
      });

      // Create nebula effect
      sceneManager.createNebula({
        planeCount: 3,
        planeSize: 120,
        opacity: 0.15,
        distribution: 60,
        colors: [
          new THREE.Color(0x3311cc), // Deep purple
          new THREE.Color(0x0066ff), // Blue
          new THREE.Color(0xff3377), // Pink
        ],
      });

      // Create aurora effect
      sceneManager.createAurora({
        radius: 100,
        baseColor: new THREE.Color(0x00ff99), // Green
        secondaryColor: new THREE.Color(0x4455ff), // Blue
        initialIntensity: 0.4, // Start partially visible
      });

      // Create lens flare effect
      sceneManager.createLensFlare({
        sourcePosition: new THREE.Vector3(40, 25, -70),
        flareColor: new THREE.Color(0xffffcc), // Warm yellow
        size: 12, // Reduced from 15
        intensity: 0.5, // Reduced from 0.8
      });

      // Create and add the terrain
      terrain = new Terrain();
      sceneManager.scene.add(terrain.getMesh());

      platform = new Platform({
        width: levelConfig.value?.platformWidth || 5,
        depth: levelConfig.value?.platformDepth || 5,
        texture: currentTexture,
      });
      platform.addToScene(sceneManager.scene);
    } else if (gameStore.environment === "sea") {
      // Get the current texture choice from game store
      const currentTexture = assetLoader.getTexture(gameStore.textureChoice);

      // Create the dynamic sky with atmospheric scattering
      sceneManager.createSky({
        turbidity: 1.2, // Reduced for clearer, softer sky
        rayleigh: 2.0, // Increased for stronger blue scatter in upper sky
        mieCoefficient: 0.015, // Adjusted for sunset-like scattering
        mieDirectionalG: 0.85, // Increased for stronger horizon effects
        elevation: 5, // Very low sun position for horizon colors
        azimuth: 180, // Keep sun position
      });

      // Add ambient light with soft intensity for pastel look
      const ambientLight = new THREE.AmbientLight(0xd4e9ff, 0.6); // Soft blue tint

      sceneManager.scene.add(ambientLight);

      // Add directional light with warm color for horizon glow
      const directionalLight = new THREE.DirectionalLight(0xffeddb, 0.4); // Warm peach color
      directionalLight.position.copy(sceneManager.getSunPosition());
      sceneManager.scene.add(directionalLight);

      // Add a hemisphere light for sky-ground color interaction
      const hemisphereLight = new THREE.HemisphereLight(
        0x9ab9ff, // Sky color - soft blue
        0xffe1cc, // Ground color - soft peach
        0.6
      );
      sceneManager.scene.add(hemisphereLight);

      // Create and add the boat platform with the selected texture
      boatPlatform = new BoatPlatform({
        width: levelConfig.value?.platformWidth || 10,
        depth: levelConfig.value?.platformDepth || 20,
        texture: boatTexture || currentTexture,
      });
      boatPlatform.addToScene(sceneManager.scene);

      // Create cloud system with reference implementation parameters
      sceneManager.createClouds({
        count: 20, // Reduced from 50 to 20 clouds
        boundary: 4000, // Match reference boundary
      });

      // Create birds system
      sceneManager.createBirds({
        flockCount: 2,
        birdHeight: 60, // Birds fly at 60 units height above sea level
      });

      // Create a cube camera for reflections
      const cubeRenderTarget = sceneManager.createCubeCamera(
        new THREE.Vector3(0, 5, 0),
        512 // Higher resolution for better reflections
      );

      // Update the cube camera to capture the initial scene with clouds and boat
      sceneManager.updateCubeCamera();

      // Then create sea surface with the reflection map
      seaSurface = new SeaSurface({
        size: 10000, // Large sea surface
        waterColor: 0x0f5e7c, // Deeper blue-green ocean color (was 0x1e7785)
        normalMap: seaNormalMap,
        distortionScale: 8, // Higher distortion for more dynamic waves (was 5)
        waveDirection: new THREE.Vector2(0.8, 0.6), // Direction matching wind/sun
        waveSpeedFactor: 0.6, // Slower wave speed for more realistic ocean (was 0.8)
        sunDirection: sceneManager.getSunPosition().clone().normalize(),
        cubeRenderTarget: cubeRenderTarget,
      });

      sceneManager.scene.add(seaSurface.getMesh());

      // Set wave height from level config if in sea environment
      if (levelConfig.value && levelConfig.value.waveHeight && seaSurface) {
        seaSurface.setWaveHeight(levelConfig.value.waveHeight);
      }

      // Create optional grid on the water for better visual reference
      seaSurface.createGrid(true);

      // Adjust camera position for better sea view
      sceneManager.camera.position.set(0, 25, 45);
      sceneManager.camera.lookAt(0, 5, 0);
    }

    // Create and add the rocket
    rocket = new Rocket();
    rocket.addToScene(sceneManager.scene);

    // Initially set rocket to static in waiting mode
    if (gameStore.gameState === "waiting") {
      rocket.getBody().type = CANNON.Body.STATIC;
    }

    // Create obstacles based on level configuration
    if (levelConfig.value?.obstacles) {
      createObstacles(levelConfig.value.obstacles);
    }

    // Set up collision detection between rocket and platform
    if (rocket) {
      if (gameStore.environment === "space" && platform) {
        cleanupCollisionHandlers = registerCollisionHandlers(
          rocket.getBody(),
          platform.getBody(),
          // Add callback for successful landing
          () => {
            // Play landing sound when successfully landed
            assetLoader.playAudio("rocket-landing", false, 0.7);
          },
          // Add callback for crash
          () => {
            // Play explosion sound when crashed
            assetLoader.playAudio("missile-explosion", false, 0.8);
          }
        );

        // Add crash particles to the scene
        const crashParticles = getCrashParticles();
        if (crashParticles) {
          sceneManager.scene.add(crashParticles.getMesh());
        }
      } else if (gameStore.environment === "sea" && boatPlatform) {
        cleanupCollisionHandlers = registerCollisionHandlers(
          rocket.getBody(),
          boatPlatform.getBody(),
          // Add callback for successful landing
          () => {
            // Play landing sound when successfully landed
            // assetLoader.playAudio("rocket-landing", false, 0.7);
          },
          // Add callback for crash
          () => {
            // Play explosion sound when crashed
            assetLoader.playAudio("missile-explosion", false, 0.8);
          }
        );

        // Add crash particles to the scene
        const crashParticles = getCrashParticles();
        if (crashParticles) {
          sceneManager.scene.add(crashParticles.getMesh());
        }
      }
    }

    // Add collision detection between rocket and terrain
    if (rocket && terrain && gameStore.environment === "space") {
      const terrainCleanup = registerCollisionHandlers(
        rocket.getBody(),
        terrain.getBody(),
        undefined, // No successful landing on terrain
        () => {
          // Play explosion sound when crashing into terrain
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
        const texture = assetLoader.getTexture(newTextureChoice);
        if (!texture) return;

        if (gameStore.environment === "space" && platform) {
          platform.updateTexture(texture);
        } else if (gameStore.environment === "sea" && boatPlatform) {
          boatPlatform.updateTexture(texture);
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

    // Fix the shouldResetRocket flag access through the store
    watch(
      () => gameStore.shouldResetRocket,
      (shouldReset) => {
        if (shouldReset && rocket) {
          // Reset rocket position and orientation
          const rocketBody = rocket.getBody();
          rocketBody.position.set(0, 15, 0); // Match the new starting height
          rocketBody.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 0, 1), 0);
          rocketBody.velocity.set(0, 0, 0);
          rocketBody.angularVelocity.set(0, 0, 0);

          // Set rocket to static body type in waiting state
          rocketBody.type = CANNON.Body.STATIC;

          // Reset the flag after handling it
          gameStore.setResetRocketFlag(false);
        }
      }
    );

    // Animation loop
    const animate = withErrorHandling(
      () => {
        if (!sceneManager) return;

        // Get delta time for consistent animation speed
        const currentTime = performance.now();
        const deltaTime = (currentTime - lastFrameTime) / 1000; // Convert to seconds
        lastFrameTime = currentTime;

        // Limit delta time to avoid large jumps during tab switches or low FPS
        const clampedDeltaTime = Math.min(deltaTime, 0.1);

        // Increment frame counter
        frameCount++;

        // Update physics world - using original interface to avoid errors
        updatePhysics(clampedDeltaTime);

        // Sync the rocket mesh with its physics body
        if (rocket) {
          syncMeshWithBody(rocket.getMesh(), rocket.getBody());
        }

        // Update sea surface if in sea environment - reduce update frequency
        if (gameStore.environment === "sea" && seaSurface) {
          // Only update reflections every few frames
          const shouldUpdateReflections = frameCount % 3 === 0;

          if (shouldUpdateReflections && sceneManager) {
            sceneManager.updateCubeCamera();
          }
          seaSurface.update(clampedDeltaTime);
        }

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
        if (rocket) {
          rocket.getThrusterParticles().update(clampedDeltaTime);
        }

        // Update crash particles if they exist
        const crashParticles = getCrashParticles();
        if (crashParticles) {
          crashParticles.update(clampedDeltaTime);
        }

        // Update input handler for next frame
        inputHandler.update();

        // Update scene manager animations
        if (sceneManager) {
          sceneManager.animate(clampedDeltaTime);
        }

        // Render the scene
        if (sceneManager) {
          sceneManager.render();
        }

        // Request next frame
        animationFrameId = requestAnimationFrame(animate);
      },
      ErrorType.RENDERING,
      "Error in animation loop"
    );

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

        // Re-enable camera controls when resetting
        if (sceneManager) {
          sceneManager.controls.enabled = true;
        }

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

        // Re-enable camera controls when game ends
        if (sceneManager) {
          sceneManager.controls.enabled = true;
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

        // Reset camera to default position and disable controls
        resetCamera();
        if (sceneManager) {
          sceneManager.controls.enabled = false;
        }
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

    // Start the animation loop (withErrorHandling wraps with try/catch)
    animate();

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

    // Create environment-specific special effects
    if (gameStore.environment === "space") {
      // Trigger shooting star every 8 seconds instead of 5
      shootingStarInterval = window.setInterval(() => {
        if (sceneManager) {
          sceneManager.triggerShootingStar();
        }
      }, 8000);

      // Aurora effect that pulses every 45 seconds instead of 30
      auroraInterval = window.setInterval(() => {
        if (sceneManager) {
          sceneManager.triggerAurora(0.8, 5); // 0.8 intensity for 5 seconds
        }
      }, 45000);
    } else if (gameStore.environment === "sea") {
      // Play sea waves ambient sound
      assetLoader.playAudio("sea-waves", true, 0.3); // Loop sound at 30% volume
    }
  } catch (error) {
    handleRenderingError(
      "Failed to initialize game scene",
      error instanceof Error ? error : new Error(String(error))
    );
  }
};

/**
 * Creates obstacles based on level configuration
 * @param obstacleConfig Obstacle configuration from the level
 */
const createObstacles = (obstacleConfig: {
  type: "asteroid" | "platform";
  count: number;
  size: number;
}) => {
  if (!sceneManager) return;

  // Clear existing obstacles
  disposeObstacles();

  // Create new obstacles based on type
  const { type, count, size } = obstacleConfig;
  const isSpaceLevel4 =
    gameStore.environment === "space" && gameStore.currentLevel === 4;
  const isSeaLevel4 =
    gameStore.environment === "sea" && gameStore.currentLevel === 4;

  for (let i = 0; i < count; i++) {
    // Generate random position
    let position: THREE.Vector3;

    if (type === "asteroid" && isSpaceLevel4) {
      // For space asteroids, position them in a ring around the landing zone
      const radius = 20 + Math.random() * 10; // 20-30 units from center
      const angle = Math.random() * Math.PI * 2; // Random angle
      const height = 5 + Math.random() * 15; // 5-20 units high
      position = new THREE.Vector3(
        Math.sin(angle) * radius,
        height,
        Math.cos(angle) * radius
      );
    } else if (type === "platform" && isSeaLevel4) {
      // For sea platforms, position them around the scene
      position = new THREE.Vector3(
        -15 + Math.random() * 30, // -15 to 15 on x axis
        2, // slightly above water
        -15 + Math.random() * 30 // -15 to 15 on z axis
      );

      // Mark one platform as the target (first one created)
      const isTarget = i === 0;

      // Create the obstacle
      const obstacle = new Obstacle(type, size, position, isTarget);

      // Add to scene
      sceneManager.scene.add(obstacle.getMesh());

      // Add to physics world
      if (obstacle.getBody()) {
        // Update world physics
        updatePhysics(0);

        // If it's the target platform, register it for collision detection
        if (isTarget) {
          registerLandingTarget(obstacle.getBody(), true);
        } else {
          // Register as landing target but not primary (will cause crash)
          registerLandingTarget(obstacle.getBody(), false);
        }
      }

      // Add to obstacles array
      obstacles.push(obstacle);

      continue; // Skip the rest for platforms
    } else {
      // Default positioning for any other obstacle type
      position = new THREE.Vector3(
        -20 + Math.random() * 40, // -20 to 20 on x axis
        5 + Math.random() * 10, // 5 to 15 on y axis
        -20 + Math.random() * 40 // -20 to 20 on z axis
      );
    }

    // Create the obstacle
    const obstacle = new Obstacle(type, size, position);

    // Add to scene
    sceneManager.scene.add(obstacle.getMesh());

    // Add to physics world
    if (obstacle.getBody()) {
      // Update world physics
      updatePhysics(0);
    }

    // Add to obstacles array
    obstacles.push(obstacle);

    // Register collision handling for this obstacle with the rocket
    if (rocket) {
      const obstacleCleanup = registerCollisionHandlers(
        rocket.getBody(),
        obstacle.getBody(),
        undefined, // No successful landing on asteroids
        () => {
          // Play explosion sound when crashing into obstacle
          assetLoader.playAudio("missile-explosion", false, 0.8);
        }
      );

      // Store cleanup function
      const previousCleanup = cleanupCollisionHandlers;
      cleanupCollisionHandlers = () => {
        if (previousCleanup) previousCleanup();
        obstacleCleanup();
      };
    }
  }
};

/**
 * Dispose of all obstacles
 */
const disposeObstacles = () => {
  obstacles.forEach((obstacle) => {
    if (sceneManager) {
      sceneManager.scene.remove(obstacle.getMesh());
    }
    obstacle.dispose();
  });

  // Clear the obstacles array
  obstacles = [];
};

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

// Watch for game state changes to handle camera controls
watch(
  () => gameStore.gameState,
  (newState, oldState) => {
    if (!sceneManager) return;

    // If transitioning to flying state, reset the camera
    if (newState === "flying" && oldState !== "flying") {
      resetCamera();

      // Disable camera controls in flying state
      sceneManager.controls.enabled = false;
    }
    // Re-enable camera controls when not in flying state
    else if (newState !== "flying") {
      sceneManager.controls.enabled = true;
    }
  }
);

// Add a watch for level changes to update platform and physics
watch(
  () => gameStore.currentLevel,
  (newLevel, oldLevel) => {
    if (newLevel !== oldLevel && levelConfig.value) {
      // Update physics settings based on new level
      if (levelConfig.value.gravity) {
        setGravity(levelConfig.value.gravity);
      }

      if (levelConfig.value.windStrength) {
        setWindStrength(levelConfig.value.windStrength);
      }

      // Update platform size based on new level
      if (gameStore.environment === "space" && platform) {
        // Remove existing platform
        if (sceneManager?.scene) {
          platform.removeFromScene(sceneManager.scene);
        }
        platform.dispose();

        // Create new platform with updated dimensions
        const currentTexture = assetLoader.getTexture(gameStore.textureChoice);
        platform = new Platform({
          width: levelConfig.value?.platformWidth || 5,
          depth: levelConfig.value?.platformDepth || 5,
          texture: currentTexture,
        });

        if (sceneManager) {
          platform.addToScene(sceneManager.scene);
        }

        // Reset collision handlers
        if (rocket && cleanupCollisionHandlers) {
          cleanupCollisionHandlers();

          cleanupCollisionHandlers = registerCollisionHandlers(
            rocket.getBody(),
            platform.getBody(),
            // Add callback for successful landing
            () => {
              // Play landing sound when successfully landed
              assetLoader.playAudio("rocket-landing", false, 0.7);
            },
            // Add callback for crash
            () => {
              assetLoader.playAudio("missile-explosion", false, 0.8);
            }
          );

          // Add crash particles to the scene
          const crashParticles = getCrashParticles();
          if (crashParticles && sceneManager) {
            sceneManager.scene.add(crashParticles.getMesh());
          }
        }
      } else if (gameStore.environment === "sea" && boatPlatform) {
        // Update boat platform for sea levels
        if (sceneManager?.scene) {
          boatPlatform.removeFromScene(sceneManager.scene);
        }
        boatPlatform.dispose();

        // Create new boat platform with updated dimensions
        const currentTexture = assetLoader.getTexture(gameStore.textureChoice);
        boatPlatform = new BoatPlatform({
          width: levelConfig.value?.platformWidth || 10,
          depth: levelConfig.value?.platformDepth || 20,
          texture: currentTexture,
        });

        if (sceneManager) {
          boatPlatform.addToScene(sceneManager.scene);
        }

        // Update sea wave height if applicable
        if (seaSurface && levelConfig.value.waveHeight) {
          seaSurface.setWaveHeight(levelConfig.value.waveHeight);
        }

        // Reset collision handlers
        if (rocket && cleanupCollisionHandlers) {
          cleanupCollisionHandlers();

          cleanupCollisionHandlers = registerCollisionHandlers(
            rocket.getBody(),
            boatPlatform.getBody(),
            // Add callback for successful landing
            () => {
              // Play landing sound when successfully landed
              assetLoader.playAudio("rocket-landing", false, 0.7);
            },
            // Add callback for crash
            () => {
              assetLoader.playAudio("missile-explosion", false, 0.8);
            }
          );

          // Add crash particles to the scene
          const crashParticles = getCrashParticles();
          if (crashParticles && sceneManager) {
            sceneManager.scene.add(crashParticles.getMesh());
          }
        }
      }

      // Update obstacles based on new level configuration
      if (levelConfig.value.obstacles) {
        disposeObstacles();
        createObstacles(levelConfig.value.obstacles);
      }
    }
  }
);

// Start loading process when the component is mounted
onMounted(() => {
  gameStore.setCurrentLevel(1);
  loadGameAssets();
});

onUnmounted(() => {
  // Cancel animation frame if active
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }

  // Clear intervals
  if (shootingStarInterval !== null) {
    clearInterval(shootingStarInterval);
    shootingStarInterval = null;
  }

  if (auroraInterval !== null) {
    clearInterval(auroraInterval);
    auroraInterval = null;
  }

  // Clean up scene resources
  if (sceneManager) {
    sceneManager.dispose();
    sceneManager = null;
  }

  // Clean up rocket resources
  if (rocket) {
    rocket.dispose();
    rocket = null;
  }

  // Clean up platform resources
  if (platform) {
    platform.dispose();
    platform = null;
  }

  // Clean up boat platform resources
  if (boatPlatform) {
    boatPlatform.dispose();
    boatPlatform = null;
  }

  // Clean up terrain resources
  if (terrain) {
    terrain.dispose();
    terrain = null;
  }

  // Clean up sea surface resources
  if (seaSurface) {
    seaSurface.dispose();
    seaSurface = null;
  }

  // Clean up collision handlers
  if (cleanupCollisionHandlers) {
    cleanupCollisionHandlers();
    cleanupCollisionHandlers = null;
  }

  // Clean up physics world
  disposePhysics();

  // Clean up input handler
  if (inputHandler) {
    inputHandler.dispose();
  }

  // Clean up asset loader
  if (assetLoader) {
    // Stop any playing audio
    assetLoader.stopAudio("rocket-thrust");
    assetLoader.stopAudio("sea-waves");
    assetLoader.dispose();
  }

  // Clean up obstacles
  disposeObstacles();

  // Emit game end event
  emit("game-end");
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
    <div v-if="!isLoading" class="back-button" @click="emit('game-end')">
      Select Environment
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
