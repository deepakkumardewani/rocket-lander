import * as THREE from "three";

/**
 * StarField class to create and manage a dynamic star field in the scene
 */
export class StarField {
  private points: THREE.Points;
  private geometry: THREE.BufferGeometry;
  private material: THREE.PointsMaterial;
  private positions: Float32Array;
  private colors: Float32Array;
  private velocities: Float32Array;
  private opacities: Float32Array; // For twinkling effect
  private originalColors: Float32Array; // Store original colors for pulsing
  private sizes: Float32Array; // Variable sizes for depth effect
  private time: number = 0;
  private twinkleTime: number = 0;
  private texture: THREE.Texture | null = null;

  private readonly starCount: number;
  private readonly minSize: number;
  private readonly maxSize: number;
  private readonly radius: number;
  private readonly movementSpeed: number;
  private readonly movementPattern: "radial" | "directional" | "twinkling";

  private quality: "low" | "high" = "high";
  private originalSizes: Float32Array | null = null;

  // Star color distribution (based on real star populations)
  private readonly starColors = [
    { color: new THREE.Color(0xaaaaff), weight: 0.15 }, // Blue-white (O, B type)
    { color: new THREE.Color(0xffffff), weight: 0.4 }, // White (A type)
    { color: new THREE.Color(0xffffaa), weight: 0.3 }, // Yellow (G type, like our Sun)
    { color: new THREE.Color(0xffcc88), weight: 0.1 }, // Orange (K type)
    { color: new THREE.Color(0xff8866), weight: 0.05 }, // Red (M type)
  ];

  // Multiple layers for parallax
  private readonly layers = [
    { distance: 1.0, speedFactor: 1.0, count: 0.6 }, // Front layer (60% of stars)
    { distance: 1.5, speedFactor: 0.7, count: 0.3 }, // Middle layer (30% of stars)
    { distance: 2.0, speedFactor: 0.4, count: 0.1 }, // Background layer (10% of stars)
  ];

  /**
   * Create a new star field
   * @param starCount Number of stars to create
   * @param radius Radius of the sphere containing stars
   * @param minSize Minimum size of stars
   * @param maxSize Maximum size of stars
   * @param movementSpeed Speed of star movement
   * @param movementPattern Pattern for star movement
   * @param texture Optional texture for stars
   */
  constructor({
    starCount = 1000,
    radius = 90,
    minSize = 0.1,
    maxSize = 0.5,
    movementSpeed = 0.01,
    movementPattern = "radial",
    texture = null,
  }: {
    starCount?: number;
    radius?: number;
    minSize?: number;
    maxSize?: number;
    movementSpeed?: number;
    movementPattern?: "radial" | "directional" | "twinkling";
    texture?: THREE.Texture | null;
  } = {}) {
    // Store parameters
    this.starCount = starCount;
    this.radius = radius;
    this.minSize = minSize;
    this.maxSize = maxSize;
    this.movementSpeed = movementSpeed;
    this.movementPattern = movementPattern;
    this.texture = texture;

    // Initialize arrays
    this.positions = new Float32Array(starCount * 3);
    this.colors = new Float32Array(starCount * 3);
    this.originalColors = new Float32Array(starCount * 3);
    this.velocities = new Float32Array(starCount * 3);
    this.opacities = new Float32Array(starCount);
    this.sizes = new Float32Array(starCount);

    // Create geometry and material
    this.geometry = new THREE.BufferGeometry();
    this.material = this.createStarMaterial();

    // Generate initial star positions
    this.generateStars();

    // Create points object
    this.points = new THREE.Points(this.geometry, this.material);

    // Log successful creation
    console.log(`Created star field with ${starCount} stars`);
  }

  /**
   * Create material for stars
   * @returns THREE.PointsMaterial configured for stars
   */
  private createStarMaterial(): THREE.PointsMaterial {
    const material = new THREE.PointsMaterial({
      size: this.maxSize,
      sizeAttenuation: true,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    // Apply texture if provided
    if (this.texture) {
      material.map = this.texture;
      material.alphaMap = this.texture;
      material.alphaTest = 0.01;
    }

    // Log material configuration
    console.log("Star material created with settings:", {
      size: this.maxSize,
      sizeAttenuation: true,
      vertexColors: true,
      hasTexture: !!this.texture,
    });

    return material;
  }

  /**
   * Get a weighted random star color based on real star distribution
   */
  private getRandomStarColor(): THREE.Color {
    const random = Math.random();
    let cumulativeWeight = 0;

    for (const starType of this.starColors) {
      cumulativeWeight += starType.weight;
      if (random <= cumulativeWeight) {
        return starType.color.clone();
      }
    }

    // Fallback to white
    return new THREE.Color(0xffffff);
  }

  /**
   * Generate random star positions in spherical distribution
   */
  private generateStars(): void {
    let currentStar = 0;

    // Distribute stars across layers
    for (const layer of this.layers) {
      const layerStarCount = Math.floor(this.starCount * layer.count);
      const layerRadius = this.radius * layer.distance;

      for (let i = 0; i < layerStarCount; i++) {
        if (currentStar >= this.starCount) break;

        // Generate random spherical coordinates
        const theta = Math.random() * Math.PI * 2; // Azimuthal angle (around y-axis)
        const phi = Math.acos(2 * Math.random() - 1); // Polar angle (from y-axis)
        const radius = layerRadius * (0.8 + Math.random() * 0.2); // Vary radius slightly

        // Convert to Cartesian coordinates
        const x = radius * Math.sin(phi) * Math.cos(theta);
        const y = radius * Math.sin(phi) * Math.sin(theta);
        const z = radius * Math.cos(phi);

        // Set position
        const idx = currentStar * 3;
        this.positions[idx] = x;
        this.positions[idx + 1] = y;
        this.positions[idx + 2] = z;

        // Get star color from distribution
        const starColor = this.getRandomStarColor();

        // Apply slight random variation to color
        const r = starColor.r * (0.9 + Math.random() * 0.1);
        const g = starColor.g * (0.9 + Math.random() * 0.1);
        const b = starColor.b * (0.9 + Math.random() * 0.1);

        // Set color
        this.colors[idx] = r;
        this.colors[idx + 1] = g;
        this.colors[idx + 2] = b;

        // Store original color for pulsing
        this.originalColors[idx] = r;
        this.originalColors[idx + 1] = g;
        this.originalColors[idx + 2] = b;

        // Set initial opacity for twinkling (slightly random)
        this.opacities[currentStar] = 0.7 + Math.random() * 0.3;

        // Set size based on layer and some randomness
        this.sizes[currentStar] =
          this.minSize +
          (this.maxSize - this.minSize) *
            (0.7 + Math.random() * 0.3) *
            (1 / layer.distance);

        // Set velocity based on movement pattern and layer speed
        const speedFactor = layer.speedFactor;
        if (this.movementPattern === "radial") {
          // Radial movement - stars move outward from center with varying speeds
          const magnitude =
            (0.5 + Math.random() * 0.5) * this.movementSpeed * 5 * speedFactor;
          this.velocities[idx] = (x / radius) * magnitude;
          this.velocities[idx + 1] = (y / radius) * magnitude;
          this.velocities[idx + 2] = (z / radius) * magnitude;
        } else if (this.movementPattern === "directional") {
          // Directional movement - stars move in a more unified direction
          this.velocities[idx] =
            (Math.random() - 0.3) * this.movementSpeed * 3 * speedFactor;
          this.velocities[idx + 1] =
            (0.7 + Math.random() * 0.3) * this.movementSpeed * 3 * speedFactor;
          this.velocities[idx + 2] =
            (Math.random() - 0.3) * this.movementSpeed * 3 * speedFactor;
        } else {
          // Twinkling - minimal movement but more variance
          this.velocities[idx] =
            (Math.random() - 0.5) * this.movementSpeed * speedFactor;
          this.velocities[idx + 1] =
            (Math.random() - 0.5) * this.movementSpeed * speedFactor;
          this.velocities[idx + 2] =
            (Math.random() - 0.5) * this.movementSpeed * speedFactor;
        }

        currentStar++;
      }
    }

    // Set attributes
    this.geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(this.positions, 3)
    );
    this.geometry.setAttribute(
      "color",
      new THREE.BufferAttribute(this.colors, 3)
    );
    this.geometry.setAttribute(
      "size",
      new THREE.BufferAttribute(this.sizes, 1)
    );

    // Log star generation
    console.log(
      `Generated ${this.starCount} stars in spherical distribution with layering`
    );
  }

  /**
   * Update star positions and visual effects for animation
   * @param deltaTime Time elapsed since last frame in seconds
   */
  public update(deltaTime: number): void {
    // Increment time counters
    this.time += deltaTime;
    this.twinkleTime += deltaTime;

    // Update at most 15 times per second for twinkling to improve performance
    const shouldUpdateTwinkle = this.twinkleTime > 0.067; // ~15fps
    if (shouldUpdateTwinkle) {
      this.twinkleTime = 0;
    }

    // Get attributes for direct manipulation
    const positions = this.geometry.attributes.position.array as Float32Array;
    const colors = this.geometry.attributes.color.array as Float32Array;
    const sizes = this.geometry.attributes.size.array as Float32Array;

    // Update each star position and appearance
    for (let i = 0; i < this.starCount; i++) {
      const idx = i * 3;

      // Add time-based oscillation for more dynamic movement
      const oscillation = Math.sin(this.time * 0.2 + i * 0.01) * 0.05;

      // Apply velocity to position with oscillation
      positions[idx] +=
        (this.velocities[idx] + this.velocities[idx] * oscillation) * deltaTime;
      positions[idx + 1] +=
        (this.velocities[idx + 1] + this.velocities[idx + 1] * oscillation) *
        deltaTime;
      positions[idx + 2] +=
        (this.velocities[idx + 2] + this.velocities[idx + 2] * oscillation) *
        deltaTime;

      // Check if star is too far from center
      const x = positions[idx];
      const y = positions[idx + 1];
      const z = positions[idx + 2];
      const distance = Math.sqrt(x * x + y * y + z * z);

      // If star is too far, reset it
      if (distance > this.radius * 1.5 || distance < this.radius * 0.7) {
        // Generate new spherical coordinates at the inner boundary
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        // Place most new stars at the inner boundary for a continuous outward flow
        const newRadius =
          distance > this.radius * 1.5
            ? this.radius * 0.7 // If it went too far out, reset to inner boundary
            : this.radius * 1.5; // If it got too close, reset to outer boundary

        // Convert to Cartesian coordinates
        positions[idx] = newRadius * Math.sin(phi) * Math.cos(theta);
        positions[idx + 1] = newRadius * Math.sin(phi) * Math.sin(theta);
        positions[idx + 2] = newRadius * Math.cos(phi);
      }

      // Update twinkling effect (less frequently to improve performance)
      if (shouldUpdateTwinkle) {
        // Only make some stars twinkle (based on star index)
        if (i % 4 === Math.floor(this.time * 3) % 4) {
          // Calculate a new opacity value that oscillates
          const opacityFactor =
            0.5 + Math.abs(Math.sin(this.time * 2 + i * 0.1)) * 0.5;
          this.opacities[i] = opacityFactor;

          // Apply opacity to color
          colors[idx] = this.originalColors[idx] * opacityFactor;
          colors[idx + 1] = this.originalColors[idx + 1] * opacityFactor;
          colors[idx + 2] = this.originalColors[idx + 2] * opacityFactor;

          // Also slightly vary the size for a more dynamic effect
          sizes[i] = this.sizes[i] * (0.8 + Math.sin(this.time + i) * 0.2);
        }
      }
    }

    // Update the geometry
    this.geometry.attributes.position.needsUpdate = true;
    if (shouldUpdateTwinkle) {
      this.geometry.attributes.color.needsUpdate = true;
      this.geometry.attributes.size.needsUpdate = true;
    }
  }

  /**
   * Get the star field mesh for adding to scene
   * @returns THREE.Points object containing the stars
   */
  public getMesh(): THREE.Points {
    return this.points;
  }

  /**
   * Dispose of geometry and material to free memory
   */
  public dispose(): void {
    if (this.texture) {
      this.texture.dispose();
    }
    this.geometry.dispose();
    this.material.dispose();
    console.log("Star field disposed");
  }

  /**
   * Set the visual intensity of the star field
   * @param intensity Value between 0-1 to scale brightness
   */
  public setIntensity(intensity: number): void {
    const clampedIntensity = Math.max(0, Math.min(1, intensity));

    // Store original colors if first time
    if (!this.originalColors) {
      this.originalColors = new Float32Array(this.colors.length);
      for (let i = 0; i < this.colors.length; i++) {
        this.originalColors[i] = this.colors[i];
      }
    }

    // Apply intensity to colors
    for (let i = 0; i < this.colors.length; i++) {
      this.colors[i] = this.originalColors[i] * clampedIntensity;
    }

    // Update the color attribute
    this.geometry.setAttribute(
      "color",
      new THREE.BufferAttribute(this.colors, 3)
    );
  }

  /**
   * Set the quality level of the star field for performance
   * @param quality Quality level ('low' or 'high')
   */
  public setQuality(quality: "low" | "high"): void {
    if (this.quality === quality) return;
    this.quality = quality;

    // Store original sizes if first quality change
    if (!this.originalSizes) {
      this.originalSizes = new Float32Array(this.sizes.length);
      for (let i = 0; i < this.sizes.length; i++) {
        this.originalSizes[i] = this.sizes[i];
      }
    }

    if (quality === "low") {
      // Reduce star count by making some stars invisible
      for (let i = 0; i < this.starCount; i++) {
        // Make 50% of stars invisible in low quality mode
        if (i % 2 === 0) {
          this.sizes[i] = this.originalSizes[i];
        } else {
          this.sizes[i] = 0; // Invisible
        }
      }
    } else {
      // Restore all stars
      for (let i = 0; i < this.starCount; i++) {
        this.sizes[i] = this.originalSizes[i];
      }
    }

    // Update the size attribute
    this.geometry.setAttribute(
      "size",
      new THREE.BufferAttribute(this.sizes, 1)
    );
  }
}
