import * as THREE from "three";
import * as CANNON from "cannon-es";
import { Water } from "three/addons/objects/Water.js";
import { world } from "./physics";

/**
 * Class to create and manage a sea surface with waves
 * Uses Three.js Water shader for realistic water rendering
 */
export class SeaSurface {
  private water: Water;
  private body: CANNON.Body;
  private waveDirection: THREE.Vector2 = new THREE.Vector2(0.5, 0.5);
  private waveSpeedFactor: number = 1.0;
  private normalMap: THREE.Texture | null = null;
  private sunDirection: THREE.Vector3 = new THREE.Vector3(0.70707, 0.70707, 0);

  /**
   * Create a new sea surface with waves using Three.js Water
   * @param options Options for the sea surface
   */
  constructor({
    size = 10000,
    waterColor = 0x1e7785,
    sunColor = 0xffffff,
    distortionScale = 3.7,
    textureSize = 512,
    position = new THREE.Vector3(0, 0, 0),
    normalMap = null,
    fog = false,
    waveDirection = new THREE.Vector2(0.5, 0.5),
    waveSpeedFactor = 1.0,
    sunDirection = new THREE.Vector3(0.70707, 0.70707, 0),
    cubeRenderTarget = null,
  }: {
    size?: number;
    waterColor?: number;
    sunColor?: number;
    distortionScale?: number;
    textureSize?: number;
    position?: THREE.Vector3;
    normalMap?: THREE.Texture | null;
    fog?: boolean;
    waveDirection?: THREE.Vector2;
    waveSpeedFactor?: number;
    sunDirection?: THREE.Vector3;
    cubeRenderTarget?: THREE.WebGLCubeRenderTarget | null;
  } = {}) {
    // Store properties
    this.waveDirection = waveDirection;
    this.waveSpeedFactor = waveSpeedFactor;
    this.sunDirection = sunDirection;

    // Create the water geometry (plane)
    const waterGeometry = new THREE.PlaneGeometry(size, size);

    // Load the normal map if not provided
    if (!normalMap) {
      normalMap = new THREE.TextureLoader().load(
        "textures/waternormals.jpg",
        (texture) => {
          texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        }
      );
    }
    this.normalMap = normalMap;

    // Create the water object using Three.js Water
    this.water = new Water(waterGeometry, {
      textureWidth: textureSize,
      textureHeight: textureSize,
      waterNormals: normalMap,
      sunDirection: this.sunDirection.clone().normalize(),
      sunColor: sunColor,
      waterColor: waterColor,
      distortionScale: distortionScale,
      fog: fog,
      // Add cube render target for reflections if provided
      ...(cubeRenderTarget && { reflectionCubeRenderTarget: cubeRenderTarget }),
    });

    // Position and orient the water
    this.water.rotation.x = -Math.PI / 2;
    this.water.position.copy(position);
    this.water.name = "seaSurface";

    // Create physics plane (mass = 0 makes it static)
    const shape = new CANNON.Plane();
    this.body = new CANNON.Body({
      mass: 0, // Static body
      type: CANNON.Body.STATIC,
      collisionResponse: true,
    });

    // Add shape to body
    this.body.addShape(shape);

    // Position the body at the same position as the visual plane
    this.body.position.set(position.x, position.y, position.z);

    // Rotate to match the visual plane
    this.body.quaternion.setFromAxisAngle(
      new CANNON.Vec3(1, 0, 0),
      -Math.PI / 2
    );

    // Store a reference to this object for easier access in collision handling
    this.water.userData.owner = this;
    (this.body as any).userData = { type: "sea", owner: this };

    // Add the body to the physics world
    world.addBody(this.body);

    // Set initial wave direction
    this.setWaveDirection(this.waveDirection);

    // Listen for sun position changes from scene manager
    window.addEventListener(
      "sunPositionChanged",
      this.handleSunPositionChanged as EventListener
    );
  }

  /**
   * Handle sun position changes from the scene manager
   * @param event Custom event with sun position data
   */
  private handleSunPositionChanged(event: Event): void {
    const customEvent = event as CustomEvent<{ position: THREE.Vector3 }>;
    if (customEvent.detail && customEvent.detail.position) {
      const sunPosition = customEvent.detail.position;

      // Update water with new sun direction
      if (this.water && this.water.material.uniforms["sunDirection"]) {
        const normalizedDirection = sunPosition.clone().normalize();
        this.water.material.uniforms["sunDirection"].value.copy(
          normalizedDirection
        );
        this.sunDirection = normalizedDirection;
      }
    }
  }

  /**
   * Update the sea surface animation
   * @param deltaTime Time since last update in seconds
   */
  public update(deltaTime: number): void {
    if (this.water && this.water.material.uniforms["time"]) {
      // Apply the wave speed factor to the time increment
      this.water.material.uniforms["time"].value +=
        deltaTime * this.waveSpeedFactor;

      // Update normal map offset based on wave direction
      const time = this.water.material.uniforms["time"].value;
      this.water.material.uniforms["normalSampler"].value.offset.set(
        time * this.waveDirection.x * 0.05,
        time * this.waveDirection.y * 0.05
      );
    }
  }

  /**
   * Set the wave direction
   * @param direction The direction vector for waves
   */
  public setWaveDirection(direction: THREE.Vector2): void {
    this.waveDirection = direction;

    // Update normal map offset immediately if possible
    if (
      this.water &&
      this.water.material.uniforms["time"] &&
      this.water.material.uniforms["normalSampler"]
    ) {
      const time = this.water.material.uniforms["time"].value;
      this.water.material.uniforms["normalSampler"].value.offset.set(
        time * direction.x * 0.05,
        time * direction.y * 0.05
      );
    }
  }

  /**
   * Set the wave speed factor
   * @param speed Wave animation speed multiplier
   */
  public setWaveSpeed(speed: number): void {
    this.waveSpeedFactor = speed;
  }

  /**
   * Set water appearance parameters
   * @param params Object containing parameters to update
   */
  public setParameters(
    params: {
      distortionScale?: number;
      size?: number;
      waterColor?: number | THREE.Color;
      sunColor?: number | THREE.Color;
      sunDirection?: THREE.Vector3;
      waveSpeed?: number;
      waveHeight?: number;
      reflectionCubeRenderTarget?: THREE.WebGLCubeRenderTarget;
    } = {}
  ): void {
    if (!this.water) return;

    const waterUniforms = this.water.material.uniforms;

    if (params.distortionScale !== undefined) {
      waterUniforms["distortionScale"].value = params.distortionScale;
    }

    if (params.size !== undefined) {
      waterUniforms["size"].value = params.size;
    }

    if (params.waterColor !== undefined) {
      if (params.waterColor instanceof THREE.Color) {
        waterUniforms["waterColor"].value = params.waterColor;
      } else {
        waterUniforms["waterColor"].value.set(params.waterColor);
      }
    }

    if (params.sunColor !== undefined) {
      if (params.sunColor instanceof THREE.Color) {
        waterUniforms["sunColor"].value = params.sunColor;
      } else {
        waterUniforms["sunColor"].value.set(params.sunColor);
      }
    }

    if (params.sunDirection !== undefined) {
      this.sunDirection = params.sunDirection.clone().normalize();
      waterUniforms["sunDirection"].value.copy(this.sunDirection);
    }

    if (params.waveSpeed !== undefined) {
      this.setWaveSpeed(params.waveSpeed);
    }

    // Handle wave height if supported by the shader
    if (params.waveHeight !== undefined && waterUniforms["waveHeight"]) {
      waterUniforms["waveHeight"].value = params.waveHeight;
    }

    // Update reflection map if provided
    if (params.reflectionCubeRenderTarget && waterUniforms["envMap"]) {
      waterUniforms["envMap"].value = params.reflectionCubeRenderTarget.texture;
    }
  }

  /**
   * Update the reflection cube render target
   * @param cubeRenderTarget The updated cube render target with reflection data
   */
  public updateReflection(cubeRenderTarget: THREE.WebGLCubeRenderTarget): void {
    if (this.water && this.water.material.uniforms["envMap"]) {
      this.water.material.uniforms["envMap"].value = cubeRenderTarget.texture;
    }
  }

  /**
   * Get the sea surface mesh
   * @returns The sea surface mesh (Water object)
   */
  public getMesh(): Water {
    return this.water;
  }

  /**
   * Get the sea surface physics body
   * @returns The sea surface physics body
   */
  public getBody(): CANNON.Body {
    return this.body;
  }

  /**
   * Dispose of resources
   */
  public dispose(): void {
    // Remove event listener
    window.removeEventListener(
      "sunPositionChanged",
      this.handleSunPositionChanged as EventListener
    );

    if (this.water) {
      // Dispose of geometry
      if (this.water.geometry) {
        this.water.geometry.dispose();
      }

      // Dispose of material
      if (this.water.material) {
        if (
          this.water.material.uniforms &&
          this.water.material.uniforms["normalSampler"] &&
          this.water.material.uniforms["normalSampler"].value
        ) {
          // Don't dispose textures as they might be shared
        }

        this.water.material.dispose();
      }
    }

    // Remove physics body from world
    if (this.body && world.bodies.includes(this.body)) {
      world.removeBody(this.body);
    }
  }

  /**
   * Creates an optional visual grid on the water surface
   * @param show Whether to show the grid
   */
  public createGrid(show: boolean = true): void {
    if (!show) return;

    // Create a canvas for the grid texture
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext("2d");

    if (!ctx) return;

    // Draw grid lines
    ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, canvas.width, canvas.height);
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 0);
    ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.moveTo(0, canvas.height / 2);
    ctx.lineTo(canvas.width, canvas.height / 2);
    ctx.stroke();

    // Create texture from canvas
    const gridTexture = new THREE.CanvasTexture(canvas);
    gridTexture.wrapS = gridTexture.wrapT = THREE.RepeatWrapping;
    gridTexture.repeat.set(200, 200);

    // Create material with the grid texture
    const gridMaterial = new THREE.MeshBasicMaterial({
      map: gridTexture,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.NormalBlending,
      side: THREE.DoubleSide,
    });

    // Create mesh with the same geometry size as the water
    const gridGeometry = new THREE.PlaneGeometry(10000, 10000);
    const gridMesh = new THREE.Mesh(gridGeometry, gridMaterial);
    gridMesh.rotation.x = -Math.PI / 2;
    gridMesh.position.y = 0.2; // Slightly above water to prevent z-fighting
    gridMesh.renderOrder = 1;

    // Add to scene
    const scene = this.water.parent;
    if (scene) {
      scene.add(gridMesh);
    }
  }
}
