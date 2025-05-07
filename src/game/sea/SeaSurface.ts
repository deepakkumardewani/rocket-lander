import * as CANNON from "cannon-es";
import * as THREE from "three";
import { Water } from "three/addons/objects/Water.js";

import { world } from "../physics";

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
  private updateCounter: number = 0;
  private updateFrequency: number = 1; // Update every frame by default
  private qualitySetting: "low" | "medium" | "high" = "medium";
  private eventListenerRef: ((event: Event) => void) | null = null;

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
    quality = "medium"
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
    quality?: "low" | "medium" | "high";
  } = {}) {
    // Store properties
    this.waveDirection = waveDirection;
    this.waveSpeedFactor = waveSpeedFactor;
    this.sunDirection = sunDirection;
    this.qualitySetting = quality;

    // Adjust texture size based on quality
    const adjustedTextureSize = this.getTextureSize(textureSize);

    // Create the water geometry (plane)
    const waterGeometry = new THREE.PlaneGeometry(size, size);

    // Load the normal map if not provided
    if (!normalMap) {
      normalMap = new THREE.TextureLoader().load("textures/waternormals.jpg", (texture) => {
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      });
    }
    this.normalMap = normalMap;

    // Create the water object using Three.js Water
    this.water = new Water(waterGeometry, {
      textureWidth: adjustedTextureSize,
      textureHeight: adjustedTextureSize,
      waterNormals: normalMap,
      sunDirection: this.sunDirection.clone().normalize(),
      sunColor: sunColor,
      waterColor: waterColor,
      distortionScale: this.adjustDistortionScale(distortionScale),
      fog: fog,
      // Add cube render target for reflections if provided
      ...(cubeRenderTarget && { reflectionCubeRenderTarget: cubeRenderTarget })
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
      collisionResponse: true
    });

    // Add shape to body
    this.body.addShape(shape);

    // Position the body at the same position as the visual plane
    this.body.position.set(position.x, position.y, position.z);

    // Rotate to match the visual plane
    this.body.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);

    // Store a reference to this object for easier access in collision handling
    this.water.userData.owner = this;
    (this.body as any).userData = { type: "sea", owner: this };

    // Add the body to the physics world
    world.addBody(this.body);

    // Set initial wave direction
    this.setWaveDirection(this.waveDirection);

    // Set update frequency based on quality
    this.updateFrequency = this.getUpdateFrequency();

    // Store the event listener reference for proper cleanup
    this.eventListenerRef = this.handleSunPositionChanged.bind(this);

    // Listen for sun position changes from scene manager
    window.addEventListener("sunPositionChanged", this.eventListenerRef);
  }

  /**
   * Calculate the appropriate texture size based on quality setting
   * @param baseSize The base texture size
   * @returns The adjusted texture size
   */
  private getTextureSize(baseSize: number): number {
    switch (this.qualitySetting) {
      case "low":
        return Math.floor(baseSize / 2); // Half resolution
      case "high":
        return baseSize; // Full resolution
      default:
        return Math.floor(baseSize * 0.75); // 75% resolution
    }
  }

  /**
   * Adjust distortion scale based on quality
   * @param baseScale The base distortion scale
   * @returns The adjusted distortion scale
   */
  private adjustDistortionScale(baseScale: number): number {
    switch (this.qualitySetting) {
      case "low":
        return baseScale * 0.5; // Lower distortion for better performance
      case "high":
        return baseScale * 1.2; // Higher distortion for better visuals
      default:
        return baseScale;
    }
  }

  /**
   * Get update frequency based on quality
   * @returns Number of frames to skip between updates
   */
  private getUpdateFrequency(): number {
    switch (this.qualitySetting) {
      case "low":
        return 4; // Update every 4 frames
      case "high":
        return 1; // Update every frame
      default:
        return 2; // Update every 2 frames
    }
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
        this.water.material.uniforms["sunDirection"].value.copy(normalizedDirection);
        this.sunDirection = normalizedDirection;
      }
    }
  }

  /**
   * Update the sea surface animation
   * @param deltaTime Time since last update in seconds
   */
  public update(deltaTime: number): void {
    // Increment counter and check if we should update this frame
    this.updateCounter = (this.updateCounter + 1) % this.updateFrequency;
    if (this.updateCounter !== 0) return;

    if (this.water && this.water.material.uniforms["time"]) {
      // Scale delta time to compensate for skipped frames
      const scaledDelta = deltaTime * this.updateFrequency;

      // Apply the wave speed factor to the time increment
      this.water.material.uniforms["time"].value += scaledDelta * this.waveSpeedFactor;

      // Update normal map offset based on wave direction
      const time = this.water.material.uniforms["time"].value;
      this.water.material.uniforms["normalSampler"].value.offset.set(
        time * this.waveDirection.x * 0.05,
        time * this.waveDirection.y * 0.05
      );
    }
  }

  /**
   * Set the quality level for the sea surface
   * @param quality Quality level
   */
  public setQuality(quality: "low" | "medium" | "high"): void {
    if (this.qualitySetting === quality) return;

    this.qualitySetting = quality;

    // Update distortion scale based on quality
    if (this.water && this.water.material.uniforms["distortionScale"]) {
      const baseScale = 3.7; // Default distortion scale
      this.water.material.uniforms["distortionScale"].value = this.adjustDistortionScale(baseScale);
    }

    // Update update frequency
    this.updateFrequency = this.getUpdateFrequency();
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
   * Clean up resources used by the sea surface
   */
  public dispose(): void {
    // Remove event listener using the stored reference
    if (this.eventListenerRef) {
      window.removeEventListener("sunPositionChanged", this.eventListenerRef);
      this.eventListenerRef = null;
    }

    // Remove from physics world
    if (world && this.body) {
      world.removeBody(this.body);
    }

    // Dispose of geometry and material
    if (this.water) {
      if (this.water.geometry) {
        this.water.geometry.dispose();
      }

      if (this.water.material) {
        // Material should be disposable
        if ("dispose" in this.water.material) {
          (this.water.material as THREE.Material).dispose();
        }
      }
    }

    // Dispose of textures
    if (this.normalMap) {
      this.normalMap.dispose();
      this.normalMap = null;
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
      side: THREE.DoubleSide
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

  /**
   * Set the wave height for the water surface
   * @param height The wave height value (0-1 recommended)
   */
  public setWaveHeight(height: number): void {
    if (this.water && this.water.material.uniforms["waveHeight"]) {
      this.water.material.uniforms["waveHeight"].value = height;
    } else {
      // If waveHeight uniform doesn't exist, try to add it to the shader
      if (this.water && this.water.material) {
        // Add the uniform if it doesn't exist
        this.water.material.uniforms["waveHeight"] = { value: height };

        // This might require modifying shader code for proper rendering
        // For now, we'll update parameters based on the height for a simple effect
        this.setParameters({
          distortionScale: 3.7 + height * 5 // Increase distortion with wave height
        });
      }
    }
  }
}
