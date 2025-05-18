import * as THREE from "three";
import { Sky } from "three/addons/objects/Sky.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

import { Birds } from "./sea/Birds";
import { Cloud } from "./sea/Clouds";
import { Aurora } from "./space/Aurora";
import { CelestialObjects } from "./space/CelestialObjects";
import { LensFlare } from "./space/LensFlare";
import { Nebula } from "./space/Nebula";
import { ShootingStars } from "./space/ShootingStars";
import { StarField } from "./space/StarField";

// Camera view types
export enum CameraView {
  DEFAULT = "default",
  TOP_DOWN = "top-down",
  CHASE = "chase"
}

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
    alpha: true
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
  public pipRenderer: THREE.WebGLRenderer;
  public controls: OrbitControls;
  private skybox: THREE.Mesh | null;
  private sky: Sky | null = null;
  private sunPosition: THREE.Vector3 = new THREE.Vector3(100, 100, 50);
  private directionalLight: THREE.DirectionalLight | null = null;
  private starField: StarField | null = null;
  private celestialObjects: CelestialObjects | null = null;
  private shootingStars: ShootingStars | null = null;
  private nebula: Nebula | null = null;
  private aurora: Aurora | null = null;
  private lensFlare: LensFlare | null = null;
  private clouds: Cloud[] | null = null;
  private birds: Birds | null = null;
  private hudRef: any | null = null; // Reference to HUD component
  private lastUpdateTime: number = 0;
  private fpsCounter: { count: number; lastTime: number; value: number } = {
    count: 0,
    lastTime: 0,
    value: 0
  };
  private effectsIntensity: number = 1.0;
  private cubeCamera: THREE.CubeCamera | null = null;
  private cubeRenderTarget: THREE.WebGLCubeRenderTarget | null = null;

  // Camera view state
  private currentCameraView: CameraView = CameraView.DEFAULT;
  private defaultCameraPosition: THREE.Vector3 = new THREE.Vector3(0, 20, 30);
  private defaultCameraTarget: THREE.Vector3 = new THREE.Vector3(0, 10, 0);
  private rocketRef: THREE.Object3D | null = null;
  private platformXPosition: number = 0;

  // PIP (Picture-in-Picture) camera
  public pipCamera: THREE.PerspectiveCamera;
  private hasPIP: boolean = true;

  constructor(container: HTMLElement) {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );

    // Main renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    // PIP renderer
    this.pipRenderer = new THREE.WebGLRenderer({ antialias: true });
    const pipSize = Math.min(window.innerWidth, window.innerHeight) * 0.3;
    this.pipRenderer.setSize(pipSize, pipSize);
    this.pipRenderer.domElement.style.position = "absolute";
    this.pipRenderer.domElement.style.left = "10px";
    this.pipRenderer.domElement.style.bottom = "10px";
    this.pipRenderer.domElement.style.borderRadius = "8px";
    this.pipRenderer.domElement.style.border = "2px solid rgba(255, 255, 255, 0.2)";

    this.skybox = null;

    // Initialize PIP camera with narrow FOV for landing pad view
    this.pipCamera = new THREE.PerspectiveCamera(
      35, // Narrower FOV for more focused view
      1, // Square aspect ratio for the PIP view
      0.1,
      100 // Shorter far plane to limit view distance
    );
    // Initial position will be set in updatePIPCamera

    this.setupScene();
    container.appendChild(this.renderer.domElement);
    container.appendChild(this.pipRenderer.domElement);

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

    // Set high quality pixel ratio
    this.renderer.setPixelRatio(window.devicePixelRatio);

    this.camera.position.set(0, 20, 30);
    this.camera.lookAt(0, 0, 0);

    // Add ambient light with soft blue tint for sky color reflection
    const ambientLight = new THREE.AmbientLight(0xd4e9ff, 0.3);
    this.scene.add(ambientLight);

    // Add main directional light with warm sunset color
    this.directionalLight = new THREE.DirectionalLight(0xffeddb, 0.3);
    this.directionalLight.position.copy(this.sunPosition);
    this.directionalLight.lookAt(0, 0, 0);
    this.directionalLight.castShadow = true;

    // Configure shadow properties for soft, natural shadows
    this.directionalLight.shadow.mapSize.width = 2048;
    this.directionalLight.shadow.mapSize.height = 2048;
    this.directionalLight.shadow.camera.near = 0.1;
    this.directionalLight.shadow.camera.far = 60;
    this.directionalLight.shadow.camera.left = -25;
    this.directionalLight.shadow.camera.right = 25;
    this.directionalLight.shadow.camera.top = 25;
    this.directionalLight.shadow.camera.bottom = -25;
    this.directionalLight.shadow.bias = -0.0005;
    this.directionalLight.shadow.radius = 3; // Increased shadow softness

    // Add a subtle fill light from the opposite direction
    const fillLight = new THREE.DirectionalLight(0x9ab9ff, 0.1);
    fillLight.position.set(-15, 10, -10);
    fillLight.lookAt(0, 0, 0);
    this.scene.add(fillLight);

    // Add hemisphere light for ambient environment lighting
    const hemisphereLight = new THREE.HemisphereLight(
      0x9ab9ff, // Sky color - soft blue
      0xffe1cc, // Ground color - soft peach
      0.2
    );
    this.scene.add(hemisphereLight);

    this.scene.add(this.directionalLight);
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
        side: THREE.BackSide
      });
    });

    // Create the skybox mesh
    this.skybox = new THREE.Mesh(skyboxGeometry, skyboxMaterials);
    this.scene.add(this.skybox);
  }

  /**
   * Creates a skybox based on the environment
   * @param spaceTextures Textures for space skybox
   * @param seaTextures Textures for sea skybox
   * @param environment Current environment ('space' or 'sea')
   */
  createEnvironmentSkybox(
    spaceTextures: THREE.Texture[],
    seaTextures: THREE.Texture[],
    environment: string
  ): void {
    if (environment === "space") {
      this.createSkybox(spaceTextures);
    } else if (environment === "sea") {
      this.createSeaSkybox(seaTextures);
    } else {
      console.error(`Unknown environment: ${environment}`);
    }
  }

  /**
   * Creates a sea skybox with blue sky textures
   * @param textures Array of 6 textures for the sea skybox
   */
  createSeaSkybox(textures: THREE.Texture[]): void {
    if (this.skybox) {
      this.scene.remove(this.skybox);
      this.skybox.geometry.dispose();
      (this.skybox.material as THREE.Material).dispose();
    }

    if (textures.length !== 6) {
      console.error("Sea skybox requires exactly 6 textures");
      return;
    }

    const size = 500; // Same size as space skybox for consistency
    const skyboxGeometry = new THREE.BoxGeometry(size, size, size);
    const skyboxMaterials = textures.map((texture) => {
      return new THREE.MeshBasicMaterial({
        map: texture,
        side: THREE.BackSide
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

    // console.log("Created star field", options);
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

    // console.log("Created celestial objects");
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

    // console.log("Created shooting stars", options);
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

    // console.log("Created nebula effect", options);
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

    // console.log("Created aurora effect", options);
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
      camera: this.camera
    });
    this.scene.add(this.lensFlare.getMesh());

    // console.log("Created lens flare effect", options);
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

    // Make sure clouds are always visible at full intensity
    if (this.clouds) {
      this.clouds.forEach((cloud) => {
        cloud.setVisible(true);
      });
    }
  }

  /**
   * Creates a cloud system for the sea environment
   * @param options Cloud system configuration options
   */
  public createClouds(options?: { count?: number; boundary?: number }): void {
    // Dispose previous clouds if they exist
    if (this.clouds) {
      this.clouds.forEach((cloud) => cloud.dispose());
      this.clouds = null;
    }

    this.clouds = Cloud.createClouds(this.scene, options?.boundary || 4000, options?.count || 50);

    // Create new clouds with the camera reference
    // this.clouds = Array.from({ length: options?.count || 50 }, () => {
    //   const cloud = new CloudV2(this.scene, {
    //     boundary: options?.boundary || 4000,
    //     camera: this.camera,
    //   });
    //   return cloud;
    // });

    // console.log("Created cloud system");
  }

  /**
   * Creates a cube camera for real-time environment reflections on the sea surface
   * @param position Position for the cube camera
   * @param resolution Resolution of the cube render target
   * @returns The created cube render target or null if creation failed
   */
  public createCubeCamera(
    position: THREE.Vector3 = new THREE.Vector3(0, 5, 0),
    resolution: number = 512
  ): THREE.WebGLCubeRenderTarget | null {
    try {
      // Clean up any existing cube camera first
      this.disposeCubeCamera();

      // Create a cube render target with mipmaps for high quality
      this.cubeRenderTarget = new THREE.WebGLCubeRenderTarget(resolution, {
        format: THREE.RGBAFormat,
        generateMipmaps: true,
        minFilter: THREE.LinearMipmapLinearFilter
      });

      // Create a cube camera with appropriate near and far clipping planes
      this.cubeCamera = new THREE.CubeCamera(0.1, 100, this.cubeRenderTarget);

      // Position the cube camera
      this.cubeCamera.position.copy(position);

      // Add the camera to the scene
      this.scene.add(this.cubeCamera);

      return this.cubeRenderTarget;
    } catch (error) {
      console.error("Failed to create cube camera:", error);
      return null;
    }
  }

  /**
   * Updates the cube camera for real-time reflections
   * This should be called before rendering the main camera
   */
  public updateCubeCamera(): void {
    if (!this.cubeCamera || !this.cubeRenderTarget) return;

    // Hide any objects you don't want in the reflection
    const seaSurface = this.scene.getObjectByName("seaSurface");
    if (seaSurface) seaSurface.visible = false;

    // Full quality update with light adjustments
    const ambientLights = this.scene.children.filter(
      (child) => child instanceof THREE.AmbientLight
    ) as THREE.AmbientLight[];
    const directionalLights = this.scene.children.filter(
      (child) => child instanceof THREE.DirectionalLight
    ) as THREE.DirectionalLight[];

    const originalAmbientIntensities = ambientLights.map((light) => light.intensity);
    const originalDirectionalIntensities = directionalLights.map((light) => light.intensity);

    // Increase light intensity for reflections
    ambientLights.forEach((light) => (light.intensity *= 1.2));
    directionalLights.forEach((light) => (light.intensity *= 1.2));

    // Update the cube camera (captures the scene from 6 directions)
    this.cubeCamera.update(this.renderer, this.scene);

    // Restore original light intensities
    ambientLights.forEach((light, index) => (light.intensity = originalAmbientIntensities[index]));
    directionalLights.forEach(
      (light, index) => (light.intensity = originalDirectionalIntensities[index])
    );

    // Make the sea surface visible again
    if (seaSurface) seaSurface.visible = true;
  }

  /**
   * Disposes of the cube camera and its render target
   */
  private disposeCubeCamera(): void {
    if (this.cubeCamera) {
      this.scene.remove(this.cubeCamera);
      this.cubeCamera = null;
    }

    if (this.cubeRenderTarget) {
      this.cubeRenderTarget.dispose();
      this.cubeRenderTarget = null;
    }
  }

  /**
   * Creates a dynamic sky using Three.js Sky shader
   * @param options Configuration options for the sky
   */
  public createSky(
    options: {
      turbidity?: number;
      rayleigh?: number;
      mieCoefficient?: number;
      mieDirectionalG?: number;
      elevation?: number;
      azimuth?: number;
    } = {}
  ): void {
    // Dispose previous sky if exists
    if (this.sky) {
      this.scene.remove(this.sky);
      this.sky = null;
    }

    // Create the sky with atmospheric scattering
    this.sky = new Sky();
    this.sky.scale.setScalar(10000);
    this.scene.add(this.sky);

    // Configure sky shader uniforms
    const skyUniforms = this.sky.material.uniforms;
    skyUniforms["turbidity"].value = options.turbidity ?? 5;
    skyUniforms["rayleigh"].value = options.rayleigh ?? 1.5;
    skyUniforms["mieCoefficient"].value = options.mieCoefficient ?? 0.01;
    skyUniforms["mieDirectionalG"].value = options.mieDirectionalG ?? 0.3;

    // Update sun position based on elevation and azimuth
    this.updateSunPosition({
      elevation: options.elevation ?? 4,
      azimuth: options.azimuth ?? 90
    });

    // console.log("Created dynamic sky with atmospheric scattering");
  }

  /**
   * Updates the sun position based on elevation and azimuth angles
   * @param params Configuration parameters for sun position
   */
  public updateSunPosition(
    params: {
      elevation?: number; // Elevation angle in degrees
      azimuth?: number; // Azimuth angle in degrees
    } = {}
  ): void {
    const elevation = params.elevation ?? 45;
    const azimuth = params.azimuth ?? 180;

    // Convert angles to radians and calculate sun position
    const phi = THREE.MathUtils.degToRad(90 - elevation);
    const theta = THREE.MathUtils.degToRad(azimuth);

    // Set sun position using spherical coordinates
    this.sunPosition.setFromSphericalCoords(1000, phi, theta);

    // Update sky shader with new sun position
    if (this.sky) {
      this.sky.material.uniforms["sunPosition"].value.copy(this.sunPosition);
    }

    // Update directional light to match sun position
    if (this.directionalLight) {
      this.directionalLight.position.copy(this.sunPosition);
    }

    // Emit event for any components that need to know about sun position changes
    const event = new CustomEvent("sunPositionChanged", {
      detail: { position: this.sunPosition.clone() }
    });
    window.dispatchEvent(event);
  }

  /**
   * Get the current sun position
   * @returns The current sun position vector
   */
  public getSunPosition(): THREE.Vector3 {
    return this.sunPosition.clone();
  }

  /**
   * Creates birds for the sea environment
   * @param options Birds configuration options
   */
  public createBirds(options?: {
    flockCount?: number;
    birdHeight?: number;
    direction?: THREE.Vector3;
  }): void {
    // Dispose previous birds if they exist
    if (this.birds) {
      this.birds.dispose();
      this.birds = null;
    }

    // Create birds with wind direction based on sunPosition
    const windDirection = new THREE.Vector3(
      -this.sunPosition.x,
      0,
      -this.sunPosition.z
    ).normalize();

    // Create new birds
    this.birds = Birds.createBirds(this.scene, {
      flockCount: options?.flockCount || 3,
      birdHeight: options?.birdHeight || 50,
      direction: options?.direction || windDirection
    });

    // console.log("Created birds effect", { flockCount, windDirection });
  }

  /**
   * Animation loop
   * @param delta Time since last frame in seconds
   */
  public animate(): void {
    // Calculate delta time
    const currentTime = performance.now();
    const deltaTime = (currentTime - this.lastUpdateTime) / 1000; // Convert to seconds
    this.lastUpdateTime = currentTime;

    // Update dynamic camera views
    this.updateCameraView();

    // Update PIP camera
    this.updatePIPCamera();

    // Update FPS counter
    this.fpsCounter.count++;
    if (currentTime > this.fpsCounter.lastTime + 1000) {
      this.fpsCounter.value = this.fpsCounter.count;
      this.fpsCounter.count = 0;
      this.fpsCounter.lastTime = currentTime;
    }

    // Always update controls
    if (this.controls) {
      this.controls.update();
    }

    // Update starfield every frame
    if (this.starField) {
      this.starField.update(deltaTime);
    }

    // Update celestial objects
    if (this.celestialObjects) {
      this.celestialObjects.update(deltaTime);
    }

    // Update shooting stars
    if (this.shootingStars) {
      this.shootingStars.update(deltaTime);
    }

    // Update nebula
    if (this.nebula) {
      this.nebula.update(deltaTime);
    }

    // Update aurora
    if (this.aurora) {
      this.aurora.update(deltaTime);
    }

    // Update lens flare
    if (this.lensFlare) {
      this.lensFlare.update(deltaTime);
    }

    // Update birds
    if (this.birds) {
      this.birds.update(deltaTime);
    }

    // Update clouds every frame
    if (this.clouds) {
      const windDirection = new THREE.Vector3(
        -this.sunPosition.x,
        0,
        -this.sunPosition.z
      ).normalize();

      this.clouds.forEach((cloud) => {
        cloud.update(windDirection, deltaTime);
      });
    }

    // Update cube camera for sea reflections
    if (this.cubeCamera && this.cubeRenderTarget) {
      this.updateCubeCamera();
    }

    // No need to call renderer.render here as it's called in the render() method
  }

  public dispose(): void {
    // Remove event listeners
    window.removeEventListener("resize", this.handleResize);

    // Dispose renderers
    this.pipRenderer.dispose();
    this.pipRenderer.domElement.remove();

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

    // Dispose sky
    if (this.sky) {
      this.scene.remove(this.sky);
      this.sky = null;
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

    // Dispose clouds
    if (this.clouds) {
      this.clouds.forEach((cloud) => cloud.dispose());
      this.clouds = null;
    }

    // Dispose birds
    if (this.birds) {
      this.birds.dispose();
      this.birds = null;
    }

    // Clean up cube camera
    this.disposeCubeCamera();
  }

  private handleResize = (): void => {
    if (this.camera && this.renderer) {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);

      // Always use high quality pixel ratio
      this.renderer.setPixelRatio(window.devicePixelRatio);
    }
  };

  public setHUDRef(hudRef: any) {
    this.hudRef = hudRef;
  }

  /**
   * Renders the current scene with both main and PIP cameras
   */
  public render(): void {
    if (!this.renderer || !this.scene || !this.camera) return;

    // Render main view
    this.renderer.render(this.scene, this.camera);

    // Render PIP view if enabled
    if (this.hasPIP) {
      this.pipRenderer.render(this.scene, this.pipCamera);
    }

    // Show/hide PIP renderer based on state
    this.pipRenderer.domElement.style.display = this.hasPIP ? "block" : "none";
  }

  /**
   * Sets the platform's x position for camera positioning
   * @param x The x position of the platform
   */
  public setPlatformXPosition(x: number): void {
    this.platformXPosition = x;
  }

  /**
   * Updates the PIP camera position based on rocket position
   */
  private updatePIPCamera(): void {
    // Fixed camera position slightly elevated and offset from the landing pad
    const cameraPos = new THREE.Vector3(
      this.platformXPosition + 2, // Slightly offset from platform center
      4, // Fixed height
      30 // Fixed distance from platform
    );
    this.pipCamera.position.copy(cameraPos);

    // Look at the center of the landing platform at ground level
    const lookAtPos = new THREE.Vector3(
      this.platformXPosition, // Center of platform
      0, // Ground level
      0 // Platform Z position
    );
    this.pipCamera.lookAt(lookAtPos);
  }

  /**
   * Toggles the PIP view on/off
   */
  public togglePIP(): void {
    this.hasPIP = !this.hasPIP;
  }

  /**
   * Gets whether the PIP view is enabled
   * @returns Boolean indicating if PIP view is enabled
   */
  public isPIPEnabled(): boolean {
    return this.hasPIP;
  }

  /**
   * Checks if a sky component is active in the scene
   * @returns Boolean indicating if sky component exists
   */
  public hasSky(): boolean {
    return this.sky !== null;
  }

  /**
   * Updates the current camera view
   */
  public updateCameraView(): void {
    if (this.currentCameraView === CameraView.CHASE && this.rocketRef) {
      // Calculate position behind the rocket based on its orientation
      const rocketPosition = this.rocketRef.position.clone();

      // Get rocket's forward direction (assuming it points up in local space)
      const matrix = new THREE.Matrix4();
      matrix.extractRotation(this.rocketRef.matrix);
      const up = new THREE.Vector3(0, 1, 0).applyMatrix4(matrix).normalize();

      // Position camera behind and slightly above the rocket
      const cameraOffset = new THREE.Vector3().copy(up).multiplyScalar(-15);
      cameraOffset.y += 5; // Add some height

      const cameraPosition = rocketPosition.clone().add(cameraOffset);

      // Smoothly move the camera (with some lag for better feel)
      this.camera.position.lerp(cameraPosition, 0.1);

      // Look at position slightly ahead of the rocket
      const lookAtPosition = rocketPosition.clone().add(up.clone().multiplyScalar(10));
      this.controls.target.lerp(lookAtPosition, 0.1);
      this.controls.update();
    }
  }

  /**
   * Cycles to the next camera view
   */
  public cycleCamera(): void {
    const views = Object.values(CameraView);
    const currentIndex = views.indexOf(this.currentCameraView);
    const nextIndex = (currentIndex + 1) % views.length;
    this.setCameraView(views[nextIndex]);
  }

  /**
   * Sets the camera to a specific view
   * @param view The camera view to set
   */
  public setCameraView(view: CameraView): void {
    this.currentCameraView = view;

    // Store original control state to restore after transition
    const controlsWereEnabled = this.controls.enabled;

    // Temporarily disable controls during transition
    this.controls.enabled = false;

    // Set up camera based on view type
    switch (view) {
      case CameraView.DEFAULT:
        this.transitionCameraTo(
          this.defaultCameraPosition.clone(),
          this.defaultCameraTarget.clone()
        );
        break;

      case CameraView.TOP_DOWN:
        // Position camera high above the rocket/platform looking straight down
        this.transitionCameraTo(new THREE.Vector3(0, 60, 0), new THREE.Vector3(0, 0, 0));
        break;

      case CameraView.CHASE:
        // Chase view will be updated dynamically in updateCameraView
        // Just set up an initial position behind the rocket
        if (this.rocketRef) {
          const rocketPosition = this.rocketRef.position.clone();
          this.transitionCameraTo(
            new THREE.Vector3(rocketPosition.x - 5, rocketPosition.y + 5, rocketPosition.z + 15),
            rocketPosition
          );
        }
        break;
    }

    // Restore original control state after transition
    setTimeout(() => {
      this.controls.enabled = controlsWereEnabled;
    }, 1000); // Enable after transition completes
  }

  /**
   * Smoothly transitions the camera to a new position and target
   */
  private transitionCameraTo(
    targetPosition: THREE.Vector3,
    targetLookAt: THREE.Vector3,
    duration: number = 1000
  ): void {
    const startPosition = this.camera.position.clone();
    const startTarget = this.controls.target.clone();
    const startTime = performance.now();

    const animateCameraTransition = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Use easing function for smoother transition
      const eased = this.easeOutCubic(progress);

      // Interpolate position and target
      this.camera.position.lerpVectors(startPosition, targetPosition, eased);
      this.controls.target.lerpVectors(startTarget, targetLookAt, eased);

      // Update controls
      this.controls.update();

      if (progress < 1) {
        requestAnimationFrame(animateCameraTransition);
      }
    };

    animateCameraTransition();
  }

  /**
   * Easing function for smoother camera animation
   */
  private easeOutCubic(x: number): number {
    return 1 - Math.pow(1 - x, 3);
  }

  /**
   * Gets the current camera view
   */
  public getCurrentCameraView(): CameraView {
    return this.currentCameraView;
  }

  /**
   * Sets default camera position and target for reset operations
   */
  public setDefaultCameraPositionAndTarget(position: THREE.Vector3, target: THREE.Vector3): void {
    this.defaultCameraPosition = position.clone();
    this.defaultCameraTarget = target.clone();
  }

  /**
   * Sets the rocket reference for camera tracking
   * @param rocket The rocket mesh to track with certain camera views
   */
  public setRocketRef(rocket: THREE.Object3D): void {
    this.rocketRef = rocket;
  }
}
