import * as THREE from "three";
import World from "./components/world/index.js";
import Boat from "./components/Boat.js";
import UI from "./components/UI.js";
import MobileControls from "./components/MobileControls.js";
import AudioManager from "./components/AudioManager.js";
import CameraController from "./components/CameraController.js";
import MultiplayerManager from "./components/MultiplayerManager.js";
import LightingControls from "./components/LightingControls.js";

/**
 * Main application class for the sailing simulator
 */
class Sail {
  constructor() {
    // Core Three.js components
    this.scene = null;
    this.camera = null;
    this.renderer = null;

    // Game components
    this.world = null;
    this.boat = null;
    this.ui = null;
    this.audio = null;
    this.cameraController = null;
    this.multiplayer = null;
    this.lightingControls = null;

    // Pause state
    this.isPaused = false;
    this._wasPlayingBeforePause = false;

    // Multiplayer server configuration
    this.multiplayerEnabled = true;

    // Check if running locally for development-only features
    this.isLocalhost =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1";

    // Use local server when running locally, Heroku server when deployed
    this.serverUrl = this.isLocalhost
      ? "ws://localhost:8765"
      : "wss://sail-server-eb8a39ba5a31.herokuapp.com";

    console.log(`Using WebSocket server: ${this.serverUrl}`);

    // Time tracking
    this.clock = new THREE.Clock();
    this.lastTime = 0;

    // Store initial speed for reset functionality
    this.initialSpeed = 0;

    // Track if we've been initialized (for restart functionality)
    this.initialized = false;

    // Bind methods
    this._handleVisibilityChange = this._handleVisibilityChange.bind(this);
    this._handleBlur = this._handleBlur.bind(this);
    this._handleFocus = this._handleFocus.bind(this);

    // Add event listeners for window focus/blur
    document.addEventListener("visibilitychange", this._handleVisibilityChange);
    window.addEventListener("blur", this._handleBlur);
    window.addEventListener("focus", this._handleFocus);

    // Initialize the application
    this.init();
  }

  /**
   * Check if the user is on a mobile device
   * @returns {boolean} True if on mobile device
   */
  isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
  }

  /**
   * Initialize the application
   */
  init() {
    // Create scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb); // Sky blue background

    // Create renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    // Disable canvas scaling on mobile devices by setting a fixed pixel ratio of 1.0
    const isMobile = this.isMobileDevice();
    if (isMobile) {
      this.renderer.setPixelRatio(1.0);
    } else {
      this.renderer.setPixelRatio(window.devicePixelRatio);
    }

    document.body.appendChild(this.renderer.domElement);

    // Create world
    this.world = new World(this.scene, null); // Will set camera reference later

    // Set initial wind to a stronger value for testing
    // Wind direction from 220 degrees (southwest)
    const windAngle = (220 * Math.PI) / 180;
    const initialWindDirection = new THREE.Vector3(
      Math.sin(windAngle), // X component
      0, // Y component (horizontal wind)
      Math.cos(windAngle) // Z component
    ).normalize();
    this.world.setWind(initialWindDirection, 15); // Stronger wind for better visibility of forces and easier movement

    // Initialize audio system earlier in the loading process (before boat creation)
    this.audio = new AudioManager();

    // Start audio initialization immediately - this will load the audio files in the background
    // The actual playback will still require user interaction due to browser policies
    this.audio
      .init()
      .catch((err) => console.warn("Audio pre-initialization failed:", err));

    // Create boat with options
    const boatOptions = {
      // Physics options
      mass: 15, // Halved from 30 to 15 for extreme responsiveness
      dragCoefficient: 0.12, // Leaving unchanged as it affects deceleration
      sailEfficiency: 1.5, // Leaving unchanged
      rudderEfficiency: 1.25, // Halved from 2.5 to 1.25 to account for lower mass
      inertia: 9, // Halved from 18 to 9 for extremely quick turning
      heelFactor: 0.12, // Leaving unchanged
      heelRecoveryRate: 0.7, // Leaving unchanged

      // Visual options
      customHullPath:
        "assets/models/Boat.obj/a9edbc7c-4ec5-45d8-a165-119bc0a05e40.obj", // Custom hull model path
    };
    this.boat = new Boat(this.scene, this.world, boatOptions);

    // Save boat reference in the world object for the portal to access
    this.world.boat = this.boat;

    // Set random initial direction (avoiding against wind)
    this.boat.setRandomInitialDirection();

    // Determine favorable sail angle based on wind direction
    // Get wind direction relative to boat and set sail angle accordingly
    const windDirection = this.world.getWindDirection();
    const boatRotation = this.boat.getRotation().y;

    // Convert wind to boat-local coordinates
    const localWindDirection = windDirection
      .clone()
      .applyAxisAngle(new THREE.Vector3(0, 1, 0), -boatRotation);

    // Determine if wind is coming from left or right of boat
    // positive X in boat coordinates is starboard (right), negative X is port (left)
    const windFromLeft = localWindDirection.x > 0;

    // Set sail angle to 45 degrees on the same side the wind is coming from
    // Negative sail angle = sail on port (left) side
    // Positive sail angle = sail on starboard (right) side
    const sailAngle = windFromLeft ? -Math.PI / 4 : Math.PI / 4; // 45 degrees
    this.boat.setSailAngle(sailAngle);

    // Set initial speed for testing
    this.boat.setInitialSpeed(10); // 10 knots

    // Initialize camera controller (after boat is created)
    this.cameraController = new CameraController(
      this.scene,
      this.boat,
      this.renderer.domElement
    );
    this.camera = this.cameraController.getCamera();

    // Update world with camera reference
    this.world.setCamera(this.camera);

    // Initialize multiplayer
    this.initMultiplayer();

    // Create UI
    this.ui = new UI(this);

    // Add mobile controls if needed
    this.mobileControls = new MobileControls(this);

    // Initialize lighting controls only on localhost
    if (this.isLocalhost) {
      // Only create lighting controls on localhost for development
      this.lightingControls = new LightingControls(this.world);
      console.log("Lighting controls enabled (localhost only)");
    }

    // Handle window resize
    window.addEventListener("resize", this.onWindowResize.bind(this));

    // Set up event listeners for audio initialization
    this.setupAudioInitialization();

    // Start animation loop
    this.lastTime = this.clock.getElapsedTime();
    this.animate();
  }

  /**
   * Initialize multiplayer functionality
   */
  initMultiplayer() {
    // Create the multiplayer manager
    this.multiplayer = new MultiplayerManager(
      this.scene,
      this.world,
      this.boat
    );

    // Connect to the server by default
    this.multiplayer.connect(this.serverUrl);
  }

  /**
   * Set up event listeners to initialize audio on user interaction
   * (required by browsers to allow audio playback)
   */
  setupAudioInitialization() {
    const initAudio = () => {
      if (this.audio) {
        this.audio
          .init()
          .then(() => {
            console.log("Audio system initialized");

            // Start with appropriate levels based on current state
            const windSpeed = this.world.getWindSpeed();
            const windDirection = this.world.getWindDirection();
            this.audio.updateWindSound(windSpeed, windDirection);
            this.audio.updateSeaSound(0.2); // Reduced sea sound intensity from 0.3 to 0.2

            // Update the sound button state
            if (this.ui) {
              this.ui.updateSoundButtonState(true);
            }
          })
          .catch((error) => {
            console.error("Failed to initialize audio:", error);

            // Update the sound button state to show error
            if (this.ui) {
              this.ui.updateSoundButtonState(false);
            }
          });
      }

      // Remove event listeners after first interaction
      document.removeEventListener("click", initAudio);
      document.removeEventListener("keydown", initAudio);
      document.removeEventListener("touchstart", initAudio);
    };

    // Add event listeners for common user interactions
    document.addEventListener("click", initAudio);
    document.addEventListener("keydown", initAudio);
    document.addEventListener("touchstart", initAudio);
  }

  /**
   * Handle window resize
   */
  onWindowResize() {
    // Update camera aspect ratio
    this.cameraController.onWindowResize();

    // Update renderer size
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    // Disable canvas scaling on mobile devices by setting a fixed pixel ratio of 1.0
    const isMobile = this.isMobileDevice();
    if (isMobile) {
      this.renderer.setPixelRatio(1.0);
    } else {
      this.renderer.setPixelRatio(window.devicePixelRatio);
    }
  }

  /**
   * Handle visibility change (tab switching)
   */
  _handleVisibilityChange() {
    if (document.hidden) {
      this.pause();
    } else {
      this.resume();
    }
  }

  /**
   * Handle window blur
   */
  _handleBlur() {
    this.pause();
  }

  /**
   * Handle window focus
   */
  _handleFocus() {
    this.resume();
  }

  /**
   * Pause the game
   */
  pause() {
    if (this.isPaused) return;

    this.isPaused = true;

    // Store current audio state
    this._wasPlayingBeforePause = this.audio && this.audio.initialized;

    // Pause audio
    if (this.audio) {
      this.audio._pauseAllSounds();
    }

    // Optional: Show pause overlay or UI element
    if (this.ui) {
      this.ui.showPauseOverlay?.();
    }
  }

  /**
   * Resume the game
   */
  resume() {
    if (!this.isPaused) return;

    this.isPaused = false;

    // Resume audio only if it was playing before pause
    if (this.audio && this._wasPlayingBeforePause) {
      this.audio._resumeAllSounds();
    }

    // Reset last time to prevent large delta time after resume
    this.lastTime = this.clock.getElapsedTime();

    // Optional: Hide pause overlay or UI element
    if (this.ui) {
      this.ui.hidePauseOverlay?.();
    }
  }

  /**
   * Toggle pause state
   */
  togglePause() {
    if (this.isPaused) {
      this.resume();
    } else {
      this.pause();
    }
  }

  /**
   * Animation loop
   */
  animate() {
    requestAnimationFrame(this.animate.bind(this));

    // Skip updates if paused, but still render the scene
    if (!this.isPaused) {
      // Calculate delta time
      const currentTime = this.clock.getElapsedTime();
      const deltaTime = currentTime - this.lastTime;
      this.lastTime = currentTime;

      // Update components
      this.update(deltaTime);
    }

    // Always render the scene to maintain visual state
    this.renderer.render(this.scene, this.camera);
  }

  /**
   * Update all components
   * @param {number} deltaTime - Time since last update in seconds
   */
  update(deltaTime) {
    // Update camera
    this.cameraController.update(deltaTime);

    // Update world
    this.world.update(deltaTime);

    // Update boat
    this.boat.update(deltaTime);

    // Update multiplayer
    if (this.multiplayer && this.multiplayerEnabled) {
      this.multiplayer.update(deltaTime);
    }

    // Update audio
    if (this.audio) {
      const windSpeed = this.world.getWindSpeed();
      const windDirection = this.world.getWindDirection();

      // Get boat speed for sea sound intensity
      const boatSpeed = this.boat.getSpeedInKnots();

      // Map boat speed to sea sound intensity (0.4 to 1.0 range)
      const seaIntensity = 0.4 + Math.min(0.6, boatSpeed / 8) * 0.6;

      // Only update active sounds
      if (this.audio.windSound.playing) {
        this.audio.updateWindSound(windSpeed, windDirection);
      }

      if (this.audio.seaSound.playing) {
        this.audio.updateSeaSound(seaIntensity);
      }
    }

    // Update UI
    this.ui.update();
  }

  /**
   * Toggle between camera modes
   */
  toggleCameraMode() {
    const newMode = this.cameraController.toggleCameraMode();
    this.updateCameraModeInfo(newMode);
  }

  /**
   * Update camera mode info in the controls panel
   */
  updateCameraModeInfo(mode) {
    const controlsInfo = document.getElementById("controls-info");
    if (controlsInfo) {
      // Find if there's already a camera mode line and update it
      const cameraModeInfo = document.getElementById("camera-mode-info");
      if (cameraModeInfo) {
        cameraModeInfo.textContent = `Camera Mode: ${
          mode === "orbit" ? "Orbit" : "First-Person"
        }`;
      } else {
        // Create new line if it doesn't exist
        const newInfo = document.createElement("p");
        newInfo.id = "camera-mode-info";
        newInfo.textContent = `Camera Mode: ${
          mode === "orbit" ? "Orbit" : "First-Person"
        }`;
        controlsInfo.appendChild(newInfo);
      }
    }
  }

  /**
   * Get current camera mode
   */
  getCameraMode() {
    return this.cameraController.getCameraMode();
  }

  /**
   * Clean up resources
   */
  dispose() {
    // Remove event listeners
    document.removeEventListener(
      "visibilitychange",
      this._handleVisibilityChange
    );
    window.removeEventListener("blur", this._handleBlur);
    window.removeEventListener("focus", this._handleFocus);

    // Clean up audio
    if (this.audio) {
      this.audio.dispose();
    }

    // Add any other cleanup needed...
  }
}

// Create and start the application when the DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  // Create a global reference to the simulator for UI elements to access
  window.sail = new Sail();
  console.log("Simulator initialized and attached to window object");

  // Log the initial camera mode
  try {
    if (window.sail) {
      console.log("Initial camera mode: " + window.sail.getCameraMode());
    }
  } catch (e) {
    console.error("Simulator not available");
  }
});
