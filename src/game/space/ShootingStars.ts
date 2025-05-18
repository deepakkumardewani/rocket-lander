import * as THREE from "three";

/**
 * Class to manage shooting star effects in the scene
 */
export class ShootingStars {
  private trail: THREE.Points;
  private geometry: THREE.BufferGeometry;
  private material: THREE.PointsMaterial;
  private positions: Float32Array;
  private velocities: Float32Array;
  private opacities: Float32Array;
  private sizes: Float32Array;
  private activeStars: boolean[];
  private maxTrailLength: number;
  private spawnTimer: number = 0;
  private spawnInterval: number;
  private minSpawnInterval: number;
  private maxSpawnInterval: number;
  // private trailLength: number;
  private isPaused: boolean = false;
  private enabled: boolean = true;

  /**
   * Create a shooting stars system
   * @param options Configuration options
   */
  constructor({
    maxShootingStars = 5,
    maxTrailLength = 20,
    minSpawnInterval = 3, // Minimum seconds between shooting stars
    maxSpawnInterval = 10, // Maximum seconds between shooting stars
    texture = null
  }: {
    maxShootingStars?: number;
    maxTrailLength?: number;
    minSpawnInterval?: number;
    maxSpawnInterval?: number;
    texture?: THREE.Texture | null;
  } = {}) {
    this.maxTrailLength = maxTrailLength;
    // this.trailLength = maxTrailLength;
    this.minSpawnInterval = minSpawnInterval;
    this.maxSpawnInterval = maxSpawnInterval;
    this.spawnInterval = this.getRandomSpawnInterval();

    // Calculate total number of points (stars × trail length)
    const totalPoints = maxShootingStars * maxTrailLength;

    // Create arrays for positions, velocities, opacities and sizes
    this.positions = new Float32Array(totalPoints * 3);
    this.velocities = new Float32Array(totalPoints * 3);
    this.opacities = new Float32Array(totalPoints);
    this.sizes = new Float32Array(totalPoints);
    this.activeStars = new Array(maxShootingStars).fill(false);

    // Create geometry
    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute("position", new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute(
      "color",
      new THREE.BufferAttribute(new Float32Array(totalPoints * 3).fill(1.0), 3)
    );

    // Create material
    this.material = new THREE.PointsMaterial({
      size: 0.5,
      sizeAttenuation: true,
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    // Apply texture if provided
    if (texture) {
      this.material.map = texture;
      this.material.alphaMap = texture;
      this.material.alphaTest = 0.01;
    }

    // Create points object
    this.trail = new THREE.Points(this.geometry, this.material);

    // Initialize attributes for size and opacity
    const opacityAttr = new THREE.BufferAttribute(this.opacities, 1);
    const sizeAttr = new THREE.BufferAttribute(this.sizes, 1);

    this.geometry.setAttribute("opacity", opacityAttr);
    this.geometry.setAttribute("size", sizeAttr);

    // Set all opacities to 0 initially (invisible)
    for (let i = 0; i < totalPoints; i++) {
      this.opacities[i] = 0;
      this.sizes[i] = 0.5; // Default size
    }

    opacityAttr.needsUpdate = true;
    sizeAttr.needsUpdate = true;
  }

  /**
   * Generate a random spawn interval between min and max values
   */
  private getRandomSpawnInterval(): number {
    return this.minSpawnInterval + Math.random() * (this.maxSpawnInterval - this.minSpawnInterval);
  }

  /**
   * Generate a random starting position for a shooting star
   */
  private getRandomStartPosition(): THREE.Vector3 {
    // Generate a position on a hemisphere (visible from camera)
    const radius = 80 + Math.random() * 20; // 80-100 units from center
    const theta = Math.random() * Math.PI * 2; // Random angle around y-axis
    const phi = Math.random() * Math.PI * 0.5; // Angle from y-axis (top hemisphere)

    const x = radius * Math.sin(phi) * Math.cos(theta);
    const y = radius * Math.sin(phi) * Math.sin(theta) * 0.8 + radius * 0.2; // Keep stars in upper hemisphere
    const z = radius * Math.cos(phi);

    return new THREE.Vector3(x, y, z);
  }

  /**
   * Generate a random velocity vector for a shooting star
   */
  private getRandomVelocity(startPos: THREE.Vector3): THREE.Vector3 {
    // Calculate direction toward a point near the center, but with some variation
    const targetX = (Math.random() - 0.5) * 40; // Random target point
    const targetY = (Math.random() - 0.5) * 40;
    const targetZ = (Math.random() - 0.5) * 40;

    const direction = new THREE.Vector3(
      targetX - startPos.x,
      targetY - startPos.y,
      targetZ - startPos.z
    ).normalize();

    // Random speed between 20 and 50 units per second
    const speed = 20 + Math.random() * 30;

    return direction.multiplyScalar(speed);
  }

  /**
   * Spawn a new shooting star
   */
  private spawnShootingStar(): void {
    // Find an inactive star
    const starIndex = this.activeStars.findIndex((active) => !active);
    if (starIndex === -1) return; // All stars are active

    // Mark this star as active
    this.activeStars[starIndex] = true;

    // Generate start position and velocity
    const startPos = this.getRandomStartPosition();
    const velocity = this.getRandomVelocity(startPos);

    // Initialize the trail
    const baseIndex = starIndex * this.maxTrailLength;

    // All points in the trail start at the same position
    for (let i = 0; i < this.maxTrailLength; i++) {
      const idx = (baseIndex + i) * 3;

      // Set all trail points to the start position
      this.positions[idx] = startPos.x;
      this.positions[idx + 1] = startPos.y;
      this.positions[idx + 2] = startPos.z;

      // Set velocities (same for all points in this trail)
      this.velocities[idx] = velocity.x;
      this.velocities[idx + 1] = velocity.y;
      this.velocities[idx + 2] = velocity.z;

      // Set opacity based on position in trail (head is brightest)
      const trailFactor = 1 - i / this.maxTrailLength;
      this.opacities[baseIndex + i] = trailFactor;

      // Set size based on position in trail (head is largest)
      this.sizes[baseIndex + i] = 0.8 * trailFactor + 0.2;
    }

    // Mark geometry attributes for update
    (this.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (this.geometry.attributes.opacity as THREE.BufferAttribute).needsUpdate = true;
    (this.geometry.attributes.size as THREE.BufferAttribute).needsUpdate = true;
  }

  /**
   * Check if a shooting star is out of bounds and should be deactivated
   * @param position The position to check
   */
  private isOutOfBounds(position: THREE.Vector3): boolean {
    // Consider a star out of bounds if it's more than 120 units from center
    const distanceSquared =
      position.x * position.x + position.y * position.y + position.z * position.z;
    return distanceSquared > 120 * 120;
  }

  /**
   * Update all shooting stars
   * @param deltaTime Time elapsed since last update
   */
  public update(deltaTime: number): void {
    if (this.isPaused) return;

    // Update spawn timer
    this.spawnTimer += deltaTime;

    // Check if it's time to spawn a new shooting star
    if (
      this.enabled &&
      this.spawnTimer >= this.spawnInterval &&
      this.activeStars.filter((active) => active).length < this.maxTrailLength
    ) {
      this.spawnShootingStar();
      this.spawnTimer = 0;
      this.spawnInterval = this.getRandomSpawnInterval();
    }

    // Update active stars
    for (let starIndex = 0; starIndex < this.activeStars.length; starIndex++) {
      if (!this.activeStars[starIndex]) continue;

      const baseIndex = starIndex * this.maxTrailLength;
      const headIndex = baseIndex * 3; // Head is the first point

      // Update the head position
      this.positions[headIndex] += this.velocities[headIndex] * deltaTime;
      this.positions[headIndex + 1] += this.velocities[headIndex + 1] * deltaTime;
      this.positions[headIndex + 2] += this.velocities[headIndex + 2] * deltaTime;

      // Check if the star is out of bounds
      const headPos = new THREE.Vector3(
        this.positions[headIndex],
        this.positions[headIndex + 1],
        this.positions[headIndex + 2]
      );

      if (this.isOutOfBounds(headPos)) {
        // Deactivate this star
        this.activeStars[starIndex] = false;

        // Make all points in this trail invisible
        for (let i = 0; i < this.maxTrailLength; i++) {
          this.opacities[baseIndex + i] = 0;
        }

        continue;
      }

      // Update the trail (each point follows the previous point)
      for (let i = this.maxTrailLength - 1; i > 0; i--) {
        const currIdx = (baseIndex + i) * 3;
        const prevIdx = (baseIndex + i - 1) * 3;

        // Move each point toward the position of the point ahead of it
        this.positions[currIdx] = this.positions[prevIdx];
        this.positions[currIdx + 1] = this.positions[prevIdx + 1];
        this.positions[currIdx + 2] = this.positions[prevIdx + 2];

        // Fade opacity toward tail
        const trailFactor = 1 - i / this.maxTrailLength;
        this.opacities[baseIndex + i] = trailFactor;
      }
    }

    // Update geometry attributes
    (this.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (this.geometry.attributes.opacity as THREE.BufferAttribute).needsUpdate = true;

    // Update material for opacity changes
    this.material.opacity = 1.0;
    this.material.needsUpdate = true;
  }

  /**
   * Manually trigger a shooting star
   * Useful for testing or for special events in game
   */
  public triggerShootingStar(): void {
    this.spawnShootingStar();
  }

  /**
   * Pause the spawning and movement of shooting stars
   */
  public pause(): void {
    this.isPaused = true;
  }

  /**
   * Resume the spawning and movement of shooting stars
   */
  public resume(): void {
    this.isPaused = false;
  }

  /**
   * Get the mesh containing the shooting star trails
   */
  public getMesh(): THREE.Points {
    return this.trail;
  }

  /**
   * Set the visibility of the shooting stars
   * @param visible Whether the shooting stars should be visible
   */
  public setVisible(visible: boolean): void {
    this.trail.visible = visible;
  }

  /**
   * Dispose of all resources
   */
  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    if (this.material.map) {
      this.material.map.dispose();
    }
  }

  /**
   * Set spawn interval range for shooting stars
   * @param minSpawnInterval Minimum seconds between spawns
   * @param maxSpawnInterval Maximum seconds between spawns
   */
  public setSpawnIntervals(minSpawnInterval: number, maxSpawnInterval: number): void {
    this.minSpawnInterval = Math.max(1, minSpawnInterval);
    this.maxSpawnInterval = Math.max(this.minSpawnInterval, maxSpawnInterval);

    // Reset spawn timer with new values
    this.spawnInterval = this.getRandomSpawnInterval();
  }

  /**
   * Enable or disable shooting star spawning
   * @param enabled Whether shooting stars should spawn
   */
  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }
}
