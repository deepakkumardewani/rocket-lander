import * as THREE from "three";

import { handleRenderingError } from "../utils/errorHandler";

/**
 * Parameters for creating a particle system
 */
export interface ParticleSystemParams {
  count?: number; // Number of particles
  color?: number; // Color of particles
  size?: number; // Size of particles
  lifetime?: number; // Maximum lifetime of particles in seconds
  texture?: THREE.Texture; // Optional texture for particles
  maxParticlesPerFrame?: number; // Maximum particles to spawn per frame
}

/**
 * Class representing a particle system for effects like thrusters and explosions
 * Optimized for performance
 */
export class ParticleSystem {
  private geometry: THREE.BufferGeometry;
  private material: THREE.ShaderMaterial;
  private mesh: THREE.Points;
  private positions: Float32Array;
  private velocities: Float32Array;
  private lifetimes: Float32Array;
  private maxLifetimes: Float32Array;
  private count: number;
  private positionAttribute: THREE.BufferAttribute;
  private sizeAttribute: THREE.BufferAttribute;
  private opacityAttribute: THREE.BufferAttribute;
  private maxParticlesPerFrame: number;
  private isEnabled: boolean = true;
  private frustum: THREE.Frustum = new THREE.Frustum();
  private projScreenMatrix: THREE.Matrix4 = new THREE.Matrix4();
  private lastCameraPosition: THREE.Vector3 = new THREE.Vector3();
  private boundingSphere: THREE.Sphere = new THREE.Sphere(new THREE.Vector3(), 100);
  private inFrustum: boolean = true;

  /**
   * Create a new particle system
   * @param params Parameters to customize the particle system
   */
  constructor(params: ParticleSystemParams = {}) {
    try {
      // Set default values if not provided
      this.count = params.count || 50;
      const color = params.color || 0xffa500; // Default orange
      const size = params.size || 0.2;
      const lifetime = params.lifetime || 2; // 2 seconds default lifetime
      this.maxParticlesPerFrame = params.maxParticlesPerFrame || 10;

      // Create buffer geometry for particles
      this.geometry = new THREE.BufferGeometry();

      // Create arrays for positions, velocities, and lifetimes
      this.positions = new Float32Array(this.count * 3); // xyz
      this.velocities = new Float32Array(this.count * 3); // xyz
      this.lifetimes = new Float32Array(this.count); // Current lifetime
      this.maxLifetimes = new Float32Array(this.count); // Maximum lifetime

      // Size array for each particle
      const sizes = new Float32Array(this.count);
      // Opacity array for each particle
      const opacities = new Float32Array(this.count);

      // Initialize arrays with default values
      for (let i = 0; i < this.count; i++) {
        // Set all particles to inactive initially
        this.lifetimes[i] = 0;
        this.maxLifetimes[i] = lifetime * (0.8 + Math.random() * 0.4); // Slight randomness in max lifetime
        sizes[i] = size * (0.8 + Math.random() * 0.4); // Slight randomness in size
        opacities[i] = 0; // Start with invisible particles
      }

      // Add attributes to geometry
      this.positionAttribute = new THREE.BufferAttribute(this.positions, 3);
      this.geometry.setAttribute("position", this.positionAttribute);

      this.sizeAttribute = new THREE.BufferAttribute(sizes, 1);
      this.geometry.setAttribute("size", this.sizeAttribute);

      this.opacityAttribute = new THREE.BufferAttribute(opacities, 1);
      this.geometry.setAttribute("opacity", this.opacityAttribute);

      // Create shader material with custom uniforms for opacity
      this.material = new THREE.ShaderMaterial({
        uniforms: {
          pointTexture: { value: params.texture ? params.texture : null },
          color: { value: new THREE.Color(color) }
        },
        vertexShader: `
          attribute float size;
          attribute float opacity;
          varying float vOpacity;
          void main() {
            vOpacity = opacity;
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = size * (300.0 / -mvPosition.z);
            gl_Position = projectionMatrix * mvPosition;
          }
        `,
        fragmentShader: `
          uniform vec3 color;
          uniform sampler2D pointTexture;
          varying float vOpacity;
          void main() {
            gl_FragColor = vec4(color, vOpacity);
            ${
              params.texture
                ? "gl_FragColor = gl_FragColor * texture2D(pointTexture, gl_PointCoord);"
                : ""
            }
            if (gl_FragColor.a < 0.1) discard;
          }
        `,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        transparent: true
      });

      // Create mesh with geometry and material
      this.mesh = new THREE.Points(this.geometry, this.material);
      this.mesh.frustumCulled = false; // We'll handle culling manually
    } catch (error) {
      handleRenderingError("Failed to create particle system", error as Error);
      throw error;
    }
  }

  /**
   * Set whether the particle system is enabled
   * @param enabled Whether the system is enabled
   */
  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    // Hide mesh if disabled
    if (this.mesh) {
      this.mesh.visible = enabled;
    }
  }

  /**
   * Update the frustum and check if the particle system is visible
   * @param camera The camera to check visibility against
   */
  private updateFrustumCheck(camera: THREE.Camera): void {
    // Only recalculate if camera moved
    if (camera.position.distanceToSquared(this.lastCameraPosition) > 0.1) {
      // Update frustum
      this.projScreenMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
      this.frustum.setFromProjectionMatrix(this.projScreenMatrix);

      // Update last camera position
      this.lastCameraPosition.copy(camera.position);

      // Update bounding sphere position to active particles' centroid
      let activeParticles = 0;
      const centroid = new THREE.Vector3();

      for (let i = 0; i < this.count; i++) {
        if (this.lifetimes[i] > 0) {
          centroid.x += this.positions[i * 3];
          centroid.y += this.positions[i * 3 + 1];
          centroid.z += this.positions[i * 3 + 2];
          activeParticles++;
        }
      }

      if (activeParticles > 0) {
        centroid.divideScalar(activeParticles);
        this.boundingSphere.center.copy(centroid);
        this.inFrustum = this.frustum.intersectsSphere(this.boundingSphere);
      } else {
        this.inFrustum = false;
      }
    }
  }

  /**
   * Get the THREE.Points mesh for this particle system
   */
  getMesh(): THREE.Points {
    return this.mesh;
  }

  /**
   * Spawn particles at a given position with optional direction and spread
   * Limited to a maximum number of particles per call for better performance
   * @param position Position to spawn particles from
   * @param direction Optional direction vector for particles
   * @param spread Angular spread in radians
   * @param speed Particle speed
   * @param count Number of particles to spawn (default: 10)
   */
  spawn(
    position: THREE.Vector3,
    direction: THREE.Vector3 = new THREE.Vector3(0, -1, 0),
    spread: number = Math.PI / 6, // 30 degrees default
    speed: number = 1,
    count: number = 10
  ): void {
    if (!this.isEnabled) return;

    try {
      // Limit particles per frame for better performance
      const particlesToSpawn = Math.min(count, this.maxParticlesPerFrame);
      let spawned = 0; // Initialize the spawned counter

      for (let i = 0; i < this.count && spawned < particlesToSpawn; i++) {
        // Only spawn if particle is inactive
        if (this.lifetimes[i] <= 0) {
          // Position
          this.positions[i * 3] = position.x;
          this.positions[i * 3 + 1] = position.y;
          this.positions[i * 3 + 2] = position.z;

          // Randomize direction within spread angle
          const angle1 = Math.random() * Math.PI * 2; // Random angle around y-axis
          const angle2 = Math.random() * spread; // Random angle within spread cone

          // Create a random direction within the cone
          const dirX = direction.x + Math.sin(angle2) * Math.cos(angle1);
          const dirY = direction.y + Math.sin(angle2) * Math.sin(angle1);
          const dirZ = direction.z + Math.cos(angle2);

          // Normalize and scale by speed
          const length = Math.sqrt(dirX * dirX + dirY * dirY + dirZ * dirZ);
          const speedMultiplier = speed * (0.8 + Math.random() * 0.4); // Randomize speed slightly

          this.velocities[i * 3] = (dirX / length) * speedMultiplier;
          this.velocities[i * 3 + 1] = (dirY / length) * speedMultiplier;
          this.velocities[i * 3 + 2] = (dirZ / length) * speedMultiplier;

          // Reset lifetime
          this.lifetimes[i] = this.maxLifetimes[i];

          // Set opacity to full
          this.opacityAttribute.array[i] = 1;

          spawned++;
        }
      }

      // Only update if we spawned particles
      if (spawned > 0) {
        // Notify Three.js that the attributes need to be updated
        this.positionAttribute.needsUpdate = true;
        this.opacityAttribute.needsUpdate = true;
      }
    } catch (error) {
      handleRenderingError("Failed to spawn particles", error as Error);
    }
  }

  /**
   * Check if there are any active particles
   * @returns True if there are active particles
   */
  public hasActiveParticles(): boolean {
    for (let i = 0; i < this.count; i++) {
      if (this.lifetimes[i] > 0) return true;
    }
    return false;
  }

  /**
   * Update the particle system (move particles, update lifetimes, etc.)
   * @param deltaTime Time elapsed since last update in seconds
   * @param camera Optional camera for frustum culling
   */
  update(deltaTime: number, camera?: THREE.Camera): void {
    if (!this.isEnabled) return;

    try {
      // Check if visible in camera frustum
      if (camera) {
        this.updateFrustumCheck(camera);

        // Skip updates if not in frustum and no active particles
        if (!this.inFrustum && !this.hasActiveParticles()) {
          return;
        }
      }

      let needsUpdate = false;

      for (let i = 0; i < this.count; i++) {
        // Skip inactive particles
        if (this.lifetimes[i] <= 0) continue;

        needsUpdate = true;

        // Update lifetime
        this.lifetimes[i] -= deltaTime;

        // Skip if particle has expired
        if (this.lifetimes[i] <= 0) {
          this.opacityAttribute.array[i] = 0;
          continue;
        }

        // Calculate lifetime ratio (1 = new, 0 = about to expire)
        const lifeRatio = this.lifetimes[i] / this.maxLifetimes[i];

        // Update opacity based on lifetime
        this.opacityAttribute.array[i] = lifeRatio;

        // Update position based on velocity
        this.positions[i * 3] += this.velocities[i * 3] * deltaTime;
        this.positions[i * 3 + 1] += this.velocities[i * 3 + 1] * deltaTime;
        this.positions[i * 3 + 2] += this.velocities[i * 3 + 2] * deltaTime;

        // Add gravity effect (optional)
        this.velocities[i * 3 + 1] -= 0.5 * deltaTime; // Gravity pull
      }

      // Only update attributes if needed
      if (needsUpdate) {
        // Notify Three.js that the attributes need to be updated
        this.positionAttribute.needsUpdate = true;
        this.opacityAttribute.needsUpdate = true;
      }
    } catch (error) {
      handleRenderingError("Failed to update particles", error as Error);
    }
  }

  /**
   * Dispose of resources used by the particle system
   */
  dispose(): void {
    if (this.geometry) {
      this.geometry.dispose();
    }

    if (this.material) {
      this.material.dispose();
    }
  }
}
