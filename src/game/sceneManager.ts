import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { StarField } from "./StarField";
import { CelestialObjects } from "./CelestialObjects";
import { ShootingStars } from "./ShootingStars";
import { Nebula } from "./Nebula";
import { Aurora } from "./Aurora";
import { LensFlare } from "./LensFlare";

/**
 * Creates and configures the Three.js scene
 * @returns The created scene
 */
export function createScene(): THREE.Scene {
  const scene = new THREE.Scene();
  return scene;
}

/**
 * Creates and configures the camera
 * @param container The HTML element to base aspect ratio on
 * @returns The created camera
 */
export function createCamera(container: HTMLElement): THREE.PerspectiveCamera {
  const width = container.clientWidth;
  const height = container.clientHeight;
  const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);

  // Set initial camera position - adjusted to better view the rocket
  camera.position.set(0, 20, 30);
  camera.lookAt(0, 10, 0);

  return camera;
}

/**
 * Creates and configures the WebGL renderer
 * @param container The HTML element to render into
 * @returns The created renderer
 */
export function createRenderer(container: HTMLElement): THREE.WebGLRenderer {
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
  });

  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Limit pixel ratio for performance
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  // Set output encoding if supported by THREE.js version
  if ("outputColorSpace" in renderer) {
    renderer.outputColorSpace = THREE.SRGBColorSpace;
  }

  return renderer;
}

/**
 * Sets up standard lighting for the scene
 * @param scene The Three.js scene to add lights to
 */
export function setupLighting(scene: THREE.Scene): void {
  // Ambient light for overall illumination
  const ambientLight = new THREE.AmbientLight(0x404040, 0.3);
  scene.add(ambientLight);

  // Directional light for shadows and directional illumination
  const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
  directionalLight.position.set(10, 20, 10);
  directionalLight.lookAt(0, 0, 0);
  directionalLight.castShadow = true;

  // Configure shadow properties for better quality
  directionalLight.shadow.mapSize.width = 1024;
  directionalLight.shadow.mapSize.height = 1024;
  directionalLight.shadow.camera.near = 0.1;
  directionalLight.shadow.camera.far = 50;
  directionalLight.shadow.camera.left = -20;
  directionalLight.shadow.camera.right = 20;
  directionalLight.shadow.camera.top = 20;
  directionalLight.shadow.camera.bottom = -20;
  directionalLight.shadow.bias = -0.0005;

  scene.add(directionalLight);
}

/**
 * Sets up a handler for window resize events
 * @param camera The camera to update on resize
 * @param renderer The renderer to update on resize
 * @param container The container element used for dimensions
 */
export function handleResize(
  camera: THREE.PerspectiveCamera,
  renderer: THREE.WebGLRenderer,
  container: HTMLElement
): () => void {
  const resizeHandler = (): void => {
    // Update camera aspect ratio
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();

    // Update renderer size
    renderer.setSize(container.clientWidth, container.clientHeight);
  };

  // Add the event listener
  window.addEventListener("resize", resizeHandler);

  // Return a function to remove the event listener (for cleanup)
  return () => window.removeEventListener("resize", resizeHandler);
}

export class SceneManager {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  public controls: OrbitControls;
  private skybox: THREE.Mesh | null;
  private starField: StarField | null = null;
  private celestialObjects: CelestialObjects | null = null;
  private shootingStars: ShootingStars | null = null;
  private nebula: Nebula | null = null;
  private aurora: Aurora | null = null;
  private lensFlare: LensFlare | null = null;
  private hudRef: any | null = null; // Reference to HUD component
  private lastUpdateTime: number = 0;
  private fpsCounter: { count: number; lastTime: number; value: number } = {
    count: 0,
    lastTime: 0,
    value: 0,
  };
  private isPerformanceMode: boolean = false;
  private effectsIntensity: number = 1.0;

  constructor(container: HTMLElement) {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.skybox = null;

    this.setupScene();
    container.appendChild(this.renderer.domElement);

    // Initialize OrbitControls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true; // Add smooth damping
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 20; // Minimum zoom distance
    this.controls.maxDistance = 100; // Maximum zoom distance
    this.controls.maxPolarAngle = Math.PI / 2; // Prevent camera from going below ground
    this.controls.target.set(0, 10, 0); // Set orbit target to center of game area

    // Add event listener for camera distance changes
    this.controls.addEventListener("change", () => {
      if (this.hudRef && this.camera) {
        // Calculate the camera distance from target instead of from origin
        const distance = this.camera.position.distanceTo(this.controls.target);
        this.hudRef.updateZoomFromCamera(distance);
      }
    });

    // Set initial update time
    this.lastUpdateTime = performance.now();
  }

  private setupScene(): void {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.camera.position.set(0, 20, 30);
    this.camera.lookAt(0, 0, 0);

    // Add ambient light with more intensity for better overall illumination
    const ambientLight = new THREE.AmbientLight(0x404040, 0.3);
    this.scene.add(ambientLight);

    // Add directional light with enhanced shadow settings
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(10, 20, 10);
    directionalLight.lookAt(0, 0, 0);
    directionalLight.castShadow = true;

    // Configure shadow properties for better quality
    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.shadow.mapSize.height = 1024;
    directionalLight.shadow.camera.near = 0.1;
    directionalLight.shadow.camera.far = 50;
    directionalLight.shadow.camera.left = -20;
    directionalLight.shadow.camera.right = 20;
    directionalLight.shadow.camera.top = 20;
    directionalLight.shadow.camera.bottom = -20;
    directionalLight.shadow.bias = -0.0005;

    this.scene.add(directionalLight);

    // Add a helper to visualize light direction and shadow camera (for development)
    // const helper = new THREE.CameraHelper(directionalLight.shadow.camera);
    // this.scene.add(helper);
  }

  createSkybox(textures: THREE.Texture[]): void {
    if (this.skybox) {
      this.scene.remove(this.skybox);
      this.skybox.geometry.dispose();
      (this.skybox.material as THREE.Material).dispose();
    }

    if (textures.length !== 6) {
      console.error("Skybox requires exactly 6 textures");
      return;
    }

    const size = 500;
    const skyboxGeometry = new THREE.BoxGeometry(size, size, size);
    const skyboxMaterials = textures.map((texture) => {
      return new THREE.MeshBasicMaterial({
        map: texture,
        side: THREE.BackSide,
      });
    });

    // Create the skybox mesh
    this.skybox = new THREE.Mesh(skyboxGeometry, skyboxMaterials);
    this.scene.add(this.skybox);
  }

  /**
   * Creates and adds a star field to the scene
   * @param options Options for configuring the star field
   */
  public createStarField(options?: {
    starCount?: number;
    radius?: number;
    minSize?: number;
    maxSize?: number;
    movementSpeed?: number;
    movementPattern?: "radial" | "directional" | "twinkling";
    texture?: THREE.Texture;
  }): void {
    // Dispose of existing star field if any
    if (this.starField) {
      this.starField.dispose();
      this.starField = null;
    }

    // Create new star field with options
    this.starField = new StarField(options);
    this.scene.add(this.starField.getMesh());

    console.log("Created star field", options);
  }

  /**
   * Creates and adds celestial objects (planets/moons) to the scene
   */
  public createCelestialObjects(): void {
    // Dispose of existing celestial objects if any
    if (this.celestialObjects) {
      this.celestialObjects.dispose();

      // Remove all celestial meshes from the scene
      const planetMeshes = this.celestialObjects.getPlanetMeshes();
      const glowMeshes = this.celestialObjects.getGlowMeshes();

      planetMeshes.forEach((mesh) => this.scene.remove(mesh));
      glowMeshes.forEach((mesh) => this.scene.remove(mesh));

      this.celestialObjects = null;
    }

    // Create new celestial objects
    this.celestialObjects = new CelestialObjects();

    // Generate and add planets to the scene
    const planets = this.celestialObjects.generateCelestialObjects();
    const glowMeshes = this.celestialObjects.getGlowMeshes();

    planets.forEach((planet) => this.scene.add(planet));
    glowMeshes.forEach((glow) => this.scene.add(glow));

    console.log("Created celestial objects");
  }

  /**
   * Creates and adds a shooting stars system to the scene
   * @param options Options for configuring the shooting stars
   */
  public createShootingStars(options?: {
    maxShootingStars?: number;
    maxTrailLength?: number;
    minSpawnInterval?: number;
    maxSpawnInterval?: number;
    texture?: THREE.Texture;
  }): void {
    // Dispose of existing shooting stars if any
    if (this.shootingStars) {
      this.shootingStars.dispose();
      this.scene.remove(this.shootingStars.getMesh());
      this.shootingStars = null;
    }

    // Create new shooting stars with options
    this.shootingStars = new ShootingStars(options);
    this.scene.add(this.shootingStars.getMesh());

    console.log("Created shooting stars", options);
  }

  public createNebula(options?: {
    noiseTexture?: THREE.Texture | null;
    colors?: THREE.Color[];
    planeCount?: number;
    planeSize?: number;
    opacity?: number;
    distribution?: number;
  }): void {
    // Dispose of existing nebula if any
    if (this.nebula) {
      this.nebula.dispose();
      this.scene.remove(this.nebula.getMesh());
      this.nebula = null;
    }

    // Create new nebula with options
    this.nebula = new Nebula(options);
    this.scene.add(this.nebula.getMesh());

    console.log("Created nebula effect", options);
  }

  public createAurora(options?: {
    radius?: number;
    baseColor?: THREE.Color;
    secondaryColor?: THREE.Color;
    initialIntensity?: number;
  }): void {
    // Dispose of existing aurora if any
    if (this.aurora) {
      this.aurora.dispose();
      this.scene.remove(this.aurora.getMesh());
      this.aurora = null;
    }

    // Create new aurora with options
    this.aurora = new Aurora(options);
    this.scene.add(this.aurora.getMesh());

    console.log("Created aurora effect", options);
  }

  public createLensFlare(options: {
    sourcePosition: THREE.Vector3;
    flareColor?: THREE.Color;
    size?: number;
    intensity?: number;
    texture?: THREE.Texture | null;
  }): void {
    // Dispose of existing lens flare if any
    if (this.lensFlare) {
      this.lensFlare.dispose();
      this.scene.remove(this.lensFlare.getMesh());
      this.lensFlare = null;
    }

    // Create new lens flare with options (passing the camera)
    this.lensFlare = new LensFlare({
      ...options,
      camera: this.camera,
    });
    this.scene.add(this.lensFlare.getMesh());

    console.log("Created lens flare effect", options);
  }

  public triggerAurora(intensity: number = 1.0, duration: number = 0): void {
    if (this.aurora) {
      this.aurora.trigger(intensity, duration);
    } else {
      console.warn("Cannot trigger aurora: not initialized");
    }
  }

  public triggerShootingStar(): void {
    if (this.shootingStars) {
      this.shootingStars.triggerShootingStar();
    } else {
      console.warn("Cannot trigger shooting star: not initialized");
    }
  }

  /**
   * Set the intensity of all visual effects
   * @param intensity Value between 0-1 to scale all effect intensities
   */
  public setEffectsIntensity(intensity: number): void {
    this.effectsIntensity = Math.max(0, Math.min(1, intensity));

    // Update the intensity of each effect
    if (this.nebula) {
      // For nebula, adjust the opacity of all planes
      this.nebula.getMesh().children.forEach((child) => {
        const material = (child as THREE.Mesh).material as THREE.ShaderMaterial;
        if (material && material.uniforms && material.uniforms.opacity) {
          material.uniforms.opacity.value *= this.effectsIntensity;
        }
      });
    }

    if (this.aurora) {
      // For aurora, trigger with adjusted intensity
      this.aurora.trigger(this.aurora.isActive() ? this.effectsIntensity : 0);
    }

    if (this.lensFlare) {
      // For lens flare, set intensity directly
      this.lensFlare.setIntensity(this.effectsIntensity * 0.8);
    }

    if (this.shootingStars) {
      // For shooting stars, adjust the frequency indirectly
      // Lower intensity means fewer shooting stars
      this.shootingStars.setSpawnIntervals(
        10 / this.effectsIntensity, // minInterval
        30 / this.effectsIntensity // maxInterval
      );
    }

    if (this.starField) {
      // Adjust star brightness
      this.starField.setIntensity(this.effectsIntensity);
    }
  }

  /**
   * Enable/disable performance mode with reduced visual effects
   * @param enabled Whether performance mode should be enabled
   */
  public setPerformanceMode(enabled: boolean): void {
    this.isPerformanceMode = enabled;

    if (enabled) {
      // Reduce effects to improve performance
      this.setEffectsIntensity(0.5);

      // Reduce or disable more expensive effects
      if (this.nebula) {
        this.nebula.getMesh().visible = false;
      }

      if (this.starField) {
        this.starField.setQuality("low");
      }
    } else {
      // Restore normal effects
      this.setEffectsIntensity(1.0);

      if (this.nebula) {
        this.nebula.getMesh().visible = true;
      }

      if (this.starField) {
        this.starField.setQuality("high");
      }
    }
  }

  /**
   * Toggle individual effects on/off for gameplay balance
   * @param effect The effect to toggle
   * @param enabled Whether the effect should be enabled
   */
  public toggleEffect(
    effect: "nebula" | "aurora" | "lensFlare" | "shootingStars" | "starField",
    enabled: boolean
  ): void {
    switch (effect) {
      case "nebula":
        if (this.nebula) {
          this.nebula.getMesh().visible = enabled;
        }
        break;
      case "aurora":
        if (this.aurora) {
          if (enabled) {
            this.aurora.trigger(this.effectsIntensity);
          } else {
            this.aurora.hide();
          }
        }
        break;
      case "lensFlare":
        if (this.lensFlare) {
          this.lensFlare.getMesh().visible = enabled;
        }
        break;
      case "shootingStars":
        if (this.shootingStars) {
          this.shootingStars.setEnabled(enabled);
        }
        break;
      case "starField":
        if (this.starField) {
          this.starField.getMesh().visible = enabled;
        }
        break;
    }
  }

  /**
   * Measure and get the current FPS
   * @returns The current frames per second
   */
  public getFPS(): number {
    return this.fpsCounter.value;
  }

  /**
   * Get performance status to determine if effects should be reduced
   * @returns Object with performance metrics
   */
  public getPerformanceStatus(): { fps: number; isLow: boolean } {
    return {
      fps: this.fpsCounter.value,
      isLow: this.fpsCounter.value < 30,
    };
  }

  public render(): void {
    // Calculate delta time
    const currentTime = performance.now();
    const deltaTime = (currentTime - this.lastUpdateTime) / 1000; // Convert to seconds
    this.lastUpdateTime = currentTime;

    // Update FPS counter
    this.fpsCounter.count++;
    if (currentTime > this.fpsCounter.lastTime + 1000) {
      this.fpsCounter.value = this.fpsCounter.count;
      this.fpsCounter.count = 0;
      this.fpsCounter.lastTime = currentTime;

      // Auto-adjust performance mode if FPS drops significantly
      if (this.fpsCounter.value < 25 && !this.isPerformanceMode) {
        console.warn(
          `FPS dropped to ${this.fpsCounter.value}, enabling performance mode`
        );
        this.setPerformanceMode(true);
      } else if (this.fpsCounter.value > 50 && this.isPerformanceMode) {
        console.log(
          `FPS restored to ${this.fpsCounter.value}, disabling performance mode`
        );
        this.setPerformanceMode(false);
      }
    }

    // Update controls if needed
    if (this.controls) {
      this.controls.update();
    }

    // Update starfield if active
    if (this.starField) {
      this.starField.update(deltaTime);
    }

    // Update celestial objects if active
    if (this.celestialObjects) {
      this.celestialObjects.update(deltaTime);
    }

    // Update shooting stars if active
    if (this.shootingStars) {
      this.shootingStars.update(deltaTime);
    }

    // Update nebula if active
    if (this.nebula) {
      this.nebula.update(deltaTime);
    }

    // Update aurora if active
    if (this.aurora) {
      this.aurora.update(deltaTime);
    }

    // Update lens flare if active
    if (this.lensFlare) {
      this.lensFlare.update(deltaTime);
    }

    // Render the scene
    this.renderer.render(this.scene, this.camera);
  }

  public dispose(): void {
    // Remove event listeners
    window.removeEventListener("resize", this.handleResize);

    // Dispose controls
    if (this.controls) {
      this.controls.dispose();
    }

    // Dispose skybox
    if (this.skybox) {
      this.scene.remove(this.skybox);
      this.skybox.geometry.dispose();

      if (Array.isArray(this.skybox.material)) {
        this.skybox.material.forEach((material) => material.dispose());
      } else {
        this.skybox.material.dispose();
      }

      this.skybox = null;
    }

    // Dispose starfield
    if (this.starField) {
      this.starField.dispose();
      this.starField = null;
    }

    // Dispose celestial objects
    if (this.celestialObjects) {
      this.celestialObjects.dispose();
      this.celestialObjects = null;
    }

    // Dispose shooting stars
    if (this.shootingStars) {
      this.shootingStars.dispose();
      this.shootingStars = null;
    }

    // Dispose nebula
    if (this.nebula) {
      this.nebula.dispose();
      this.nebula = null;
    }

    // Dispose aurora
    if (this.aurora) {
      this.aurora.dispose();
      this.aurora = null;
    }

    // Dispose lens flare
    if (this.lensFlare) {
      this.lensFlare.dispose();
      this.lensFlare = null;
    }
  }

  private handleResize = (): void => {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  };

  public setHUDRef(hudRef: any) {
    this.hudRef = hudRef;
  }
}
