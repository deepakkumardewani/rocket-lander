import * as THREE from "three";

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
  camera.position.set(0, 10, 15);
  camera.lookAt(0, 5, 0);

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

  return renderer;
}

/**
 * Sets up standard lighting for the scene
 * @param scene The Three.js scene to add lights to
 */
export function setupLighting(scene: THREE.Scene): void {
  // Ambient light for overall illumination
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);

  // Directional light for shadows and directional illumination
  const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
  directionalLight.position.set(5, 10, 5);
  directionalLight.castShadow = true;

  // Configure shadow properties
  directionalLight.shadow.mapSize.width = 1024;
  directionalLight.shadow.mapSize.height = 1024;
  directionalLight.shadow.camera.near = 0.5;
  directionalLight.shadow.camera.far = 50;

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
  private skybox: THREE.Mesh | null;

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
  }

  private setupScene(): void {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.camera.position.set(0, 10, 20);
    this.camera.lookAt(0, 0, 0);

    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
    this.scene.add(ambientLight);

    // Add directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(10, 20, 10);
    directionalLight.castShadow = true;
    this.scene.add(directionalLight);
  }

  createSkybox(textures: THREE.Texture[]): void {
    if (this.skybox) {
      this.scene.remove(this.skybox);
      this.skybox.geometry.dispose();
      (this.skybox.material as THREE.Material[]).forEach((material) =>
        material.dispose()
      );
    }

    const geometry = new THREE.BoxGeometry(1000, 1000, 1000);
    const materials = textures.map(
      (texture) =>
        new THREE.MeshBasicMaterial({
          map: texture,
          side: THREE.BackSide,
        })
    );

    this.skybox = new THREE.Mesh(geometry, materials);
    this.scene.add(this.skybox);
  }

  public render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  public dispose(): void {
    if (this.skybox) {
      this.scene.remove(this.skybox);
      this.skybox.geometry.dispose();
      (this.skybox.material as THREE.Material[]).forEach((material) =>
        material.dispose()
      );
    }
    this.renderer.dispose();
  }
}
