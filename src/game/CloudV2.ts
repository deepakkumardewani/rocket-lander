import * as THREE from "three";

/**
 * Interface for cloud creation parameters
 */
interface CloudV2Params {
  boundary?: number;
  numClusters?: number;
  texture?: THREE.Texture | null;
  camera?: THREE.Camera;
  quality?: "low" | "medium" | "high";
  useLOD?: boolean;
}

/**
 * Class to create and manage a more realistic cloud system
 * Uses multiple planes with alpha textures for volumetric effect
 */
export class CloudV2 {
  private scene: THREE.Scene;
  private group: THREE.Group;
  private meshes: THREE.Mesh[] = [];
  private materials: THREE.Material[] = [];
  private time: number = 0;
  private cloudClusters: THREE.Group[] = [];
  private boundary: number;
  private windDirection: THREE.Vector3 = new THREE.Vector3(1, 0, 0);
  private windSpeed: number = 0.1;
  private camera: THREE.Camera | null = null;
  private qualitySetting: "low" | "medium" | "high";
  private useLOD: boolean;
  private frustum: THREE.Frustum = new THREE.Frustum();
  private projScreenMatrix: THREE.Matrix4 = new THREE.Matrix4();
  private updateCounter: number = 0;
  private lodDistances: { near: number; mid: number; far: number } = {
    near: 1000,
    mid: 3000,
    far: 6000,
  };

  /**
   * Create a new cloud system
   * @param scene The THREE.Scene to add clouds to
   * @param params Configuration parameters
   */
  constructor(scene: THREE.Scene, params: CloudV2Params = {}) {
    this.scene = scene;
    this.boundary = params.boundary || 4000;
    this.group = new THREE.Group();
    this.scene.add(this.group);
    this.camera = params.camera || null;
    this.qualitySetting = params.quality || "medium";
    this.useLOD = params.useLOD !== undefined ? params.useLOD : true;

    // Adjust boundary based on quality setting
    this.adjustBoundaryForQuality();

    // Create clouds - adjust cloud count based on quality
    this.createClouds(this.getCloudCount(params.numClusters), params.texture);
  }

  /**
   * Adjust boundary for quality settings
   */
  private adjustBoundaryForQuality(): void {
    if (this.qualitySetting === "low") {
      // Reduce visibility distance for low quality
      this.boundary *= 0.6;
      this.lodDistances = { near: 800, mid: 2000, far: 4000 };
    } else if (this.qualitySetting === "high") {
      // Increase visibility for high quality
      this.boundary *= 1.2;
      this.lodDistances = { near: 1200, mid: 3500, far: 7000 };
    }
  }

  /**
   * Get adjusted cloud count based on quality and provided count
   * @param baseClusters Base number of cloud clusters
   * @returns Adjusted number of cloud clusters
   */
  private getCloudCount(baseClusters?: number): number {
    const baseCount = baseClusters || 15;

    switch (this.qualitySetting) {
      case "low":
        return Math.floor(baseCount * 0.5); // 50% of original count
      case "high":
        return baseCount;
      default:
        return Math.floor(baseCount * 0.75); // 75% of original count
    }
  }

  /**
   * Set camera for view-dependent effects
   * @param camera Camera to use for calculations
   */
  public setCamera(camera: THREE.Camera): void {
    this.camera = camera;
  }

  /**
   * Create a cluster of clouds
   * @param numClusters Number of cloud clusters to create
   * @param texture Optional texture to use for clouds
   */
  private createClouds(
    numClusters: number,
    customTexture?: THREE.Texture | null
  ): void {
    const textureLoader = new THREE.TextureLoader();

    const initClouds = (texture: THREE.Texture) => {
      // Create clouds in multiple rings for better distribution
      const rings = this.qualitySetting === "low" ? 4 : 6;
      const clustersPerRing = Math.floor(numClusters / 3);

      // Shared geometry for better performance
      const geometry = new THREE.PlaneGeometry(1, 1);

      // Create one material per texture to reduce draw calls
      const sharedMaterial = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        opacity: 0.5,
        depthWrite: false,
        blending: THREE.NormalBlending,
        side: THREE.DoubleSide,
        fog: true, // Enable fog for better distance fading
      });

      this.materials.push(sharedMaterial);

      for (let ring = 0; ring < rings; ring++) {
        // Exponential distribution for ring radius to place more clouds at horizon
        const ringProgress = ring / (rings - 1);
        const ringRadius =
          this.boundary * (0.2 + Math.pow(ringProgress, 1.5) * 2.5);

        // Calculate height factor based on distance
        // Clouds get progressively higher as they get more distant
        const heightFactor = Math.pow(ringProgress, 1.2); // Exponential height increase
        const baseHeight = 200; // Minimum height for closest clouds
        const maxAdditionalHeight = 400; // Maximum additional height for distant clouds
        const ringHeight = baseHeight + maxAdditionalHeight * heightFactor;

        // More clusters in distant rings
        let ringClusters;
        if (ring >= 4) {
          ringClusters = Math.floor(clustersPerRing * 2);
        } else if (ring >= 2) {
          ringClusters = Math.floor(clustersPerRing * 1.5);
        } else {
          ringClusters = clustersPerRing;
        }

        // Adjust for quality
        if (this.qualitySetting === "low") {
          ringClusters = Math.floor(ringClusters * 0.6);
        }

        for (let i = 0; i < ringClusters; i++) {
          // Calculate position in this ring
          const angle = (i / ringClusters) * Math.PI * 2;
          const radiusVariation = ringRadius * (0.9 + Math.random() * 0.2);

          const position = new THREE.Vector3(
            Math.cos(angle) * radiusVariation,
            ringHeight + Math.random() * 100 * (1 + heightFactor), // Height varies more with distance
            Math.sin(angle) * radiusVariation
          );

          // Add some randomness to the position, less for distant clouds
          const randomFactor = Math.max(0.05, 0.2 - ring * 0.04);
          position.x += (Math.random() - 0.5) * ringRadius * randomFactor;
          position.z += (Math.random() - 0.5) * ringRadius * randomFactor;

          // Scale clouds based on distance - larger clouds on the horizon
          const distanceScale = 0.8 + Math.pow(ring / (rings - 1), 2) * 1.2;
          const scale = (0.8 + Math.random() * 0.4) * distanceScale;

          // Create fewer clouds at similar positions for denser clusters when in low or medium quality
          const numCloudsAtPosition =
            this.qualitySetting === "high" && ring >= 4 ? 2 : 1;

          for (let j = 0; j < numCloudsAtPosition; j++) {
            const offsetPosition = position.clone();
            if (j > 0) {
              // Add slight offset for additional clouds
              offsetPosition.x += (Math.random() - 0.5) * 100;
              offsetPosition.z += (Math.random() - 0.5) * 100;
              offsetPosition.y += (Math.random() - 0.5) * 50; // Increased vertical variation
            }
            this.createSingleCloud(
              offsetPosition,
              scale,
              geometry,
              sharedMaterial
            );
          }
        }
      }
    };

    // Use provided texture or load from assets
    if (customTexture) {
      initClouds(customTexture);
    } else {
      textureLoader.load("assets/textures/cloud.avif", (texture) => {
        initClouds(texture);
      });
    }
  }

  /**
   * Create a single cloud with multiple planes for volumetric effect
   * @param position Cloud position
   * @param scale Scale multiplier
   * @param geometry Shared geometry to use
   * @param material Shared material to use
   */
  private createSingleCloud(
    position: THREE.Vector3,
    scale: number = 1.0,
    geometry: THREE.BufferGeometry,
    material: THREE.Material
  ): void {
    const cloudGroup = new THREE.Group();
    // Adjust number of layers based on quality
    const numLayers =
      this.qualitySetting === "low"
        ? 2
        : this.qualitySetting === "medium"
        ? 3
        : 4;

    // Create layers at fixed angles
    const angleStep = (Math.PI * 2) / numLayers;
    for (let i = 0; i < numLayers; i++) {
      const mesh = new THREE.Mesh(geometry, material);
      this.meshes.push(mesh);

      // Position layers in a fixed circular pattern
      const angle = angleStep * i;
      mesh.position.x = Math.cos(angle) * 20;
      mesh.position.z = Math.sin(angle) * 20;
      mesh.position.y = (Math.random() - 0.5) * 10 + Math.random() * 5; // Added slight upward bias

      // Fixed rotation for each layer
      mesh.rotation.y = angle;

      // Scale each layer
      const layerScale = scale * 200 * (0.85 + Math.random() * 0.3);
      mesh.scale.set(layerScale, layerScale * 0.6, 1);

      cloudGroup.add(mesh);
    }

    // Position this cloud within the cluster
    cloudGroup.position.copy(position);
    // Give each cloud in cluster a random fixed rotation
    cloudGroup.rotation.y = Math.random() * Math.PI * 2;

    // Store distance from origin for LOD calculations
    cloudGroup.userData.distanceFromOrigin = position.length();

    this.cloudClusters.push(cloudGroup);
    this.group.add(cloudGroup);
  }

  /**
   * Set the wind direction and speed
   * @param direction Direction vector
   * @param speed Wind speed
   */
  public setWind(direction: THREE.Vector3, speed: number): void {
    this.windDirection.copy(direction).normalize();
    this.windSpeed = speed * 0.02; // Scale down to appropriate speed
  }

  /**
   * Update cloud system for the current frame
   * @param direction Wind direction
   * @param deltaTime Time since last frame in seconds
   */
  public update(direction: THREE.Vector3, deltaTime: number): void {
    this.time += deltaTime;

    // Update wind direction
    this.windDirection.copy(direction).normalize();

    // Skip updates for better performance based on quality
    this.updateCounter = (this.updateCounter + 1) % this.getUpdateFrequency();
    if (this.updateCounter !== 0) return;

    // Scale delta time to compensate for skipped frames
    const scaledDelta = deltaTime * this.getUpdateFrequency();

    // Only update if camera exists
    if (!this.camera) return;

    // Update the frustum for culling
    this.updateFrustum();

    // Update each cloud cluster
    this.cloudClusters.forEach((cloudGroup) => {
      // Skip update if cloud group is outside view frustum (culling)
      if (this.useLOD && !this.isInView(cloudGroup)) {
        cloudGroup.visible = false;
        return;
      }

      cloudGroup.visible = true;

      // Move cloud based on wind direction and speed
      cloudGroup.position.x +=
        this.windDirection.x * this.windSpeed * scaledDelta;
      cloudGroup.position.z +=
        this.windDirection.z * this.windSpeed * scaledDelta;

      // Very subtle rotation
      cloudGroup.rotation.y += scaledDelta * 0.001 * (Math.random() - 0.5);

      // Update opacities based on view angle and distance
      if (this.useLOD && this.camera) {
        this.updateCloudLOD(cloudGroup, this.camera);
      }

      // Wrap around when cloud goes too far
      this.checkWorldBounds(cloudGroup);
    });
  }

  /**
   * Get update frequency based on quality setting
   * @returns Number of frames to skip between updates
   */
  private getUpdateFrequency(): number {
    switch (this.qualitySetting) {
      case "low":
        return 3; // Update every 3 frames
      case "medium":
        return 2; // Update every 2 frames
      case "high":
        return 1; // Update every frame
      default:
        return 1;
    }
  }

  /**
   * Update the frustum for view culling
   */
  private updateFrustum(): void {
    if (!this.camera) return;

    this.projScreenMatrix.multiplyMatrices(
      this.camera.projectionMatrix,
      this.camera.matrixWorldInverse
    );
    this.frustum.setFromProjectionMatrix(this.projScreenMatrix);
  }

  /**
   * Check if a cloud group is in the camera's view
   * @param cloudGroup Cloud group to check
   * @returns Whether the cloud is in view
   */
  private isInView(cloudGroup: THREE.Group): boolean {
    // Create a bounding sphere for the cloud group
    const position = cloudGroup.position;
    const radius = 250; // Approximate cloud radius

    // Return true if bounding sphere is in view frustum
    return this.frustum.intersectsSphere(new THREE.Sphere(position, radius));
  }

  /**
   * Update cloud LOD (Level of Detail) based on distance
   * @param cloudGroup Cloud group to update
   * @param camera Camera for distance calculation
   */
  private updateCloudLOD(cloudGroup: THREE.Group, camera: THREE.Camera): void {
    const distance = cloudGroup.position.distanceTo(camera.position);
    const children = cloudGroup.children;

    // Adjust visibility based on distance
    if (distance > this.lodDistances.far) {
      // Far distance - show only half of planes for distant clouds
      for (let i = 0; i < children.length; i++) {
        children[i].visible = i % 2 === 0;
      }
    } else if (distance > this.lodDistances.mid) {
      // Medium distance - show 75% of planes
      for (let i = 0; i < children.length; i++) {
        children[i].visible = i % 4 !== 3;
      }
    } else {
      // Near distance - show all planes
      for (let i = 0; i < children.length; i++) {
        children[i].visible = true;
      }
    }

    // Adjust opacity based on distance for better fade out
    const maxVisibleDistance = this.boundary * 1.1;
    if (distance > this.boundary * 0.9) {
      const fadeOutFactor =
        1 -
        Math.min(
          1,
          (distance - this.boundary * 0.9) /
            (maxVisibleDistance - this.boundary * 0.9)
        );
      children.forEach((child) => {
        const material = (child as THREE.Mesh)
          .material as THREE.MeshBasicMaterial;
        if (material && material.opacity !== undefined) {
          material.opacity = 0.5 * fadeOutFactor;
        }
      });
    }
  }

  /**
   * Check if cloud has gone beyond the world boundary and wrap it around
   * @param cloudGroup Cloud group to check
   */
  private checkWorldBounds(cloudGroup: THREE.Group): void {
    const distance = Math.sqrt(
      cloudGroup.position.x * cloudGroup.position.x +
        cloudGroup.position.z * cloudGroup.position.z
    );

    if (distance > this.boundary * 1.1) {
      // Move to the opposite side but maintain relative angle
      const angle = Math.atan2(cloudGroup.position.z, cloudGroup.position.x);
      const newDistance = this.boundary * 0.7;
      cloudGroup.position.x = Math.cos(angle) * -newDistance;
      cloudGroup.position.z = Math.sin(angle) * -newDistance;
    }
  }

  /**
   * Get the group containing all clouds
   * @returns The cloud group
   */
  public getMesh(): THREE.Group {
    return this.group;
  }

  /**
   * Set the quality level for clouds
   * @param quality Quality level
   */
  public setQuality(quality: "low" | "medium" | "high"): void {
    if (this.qualitySetting === quality) return;
    this.qualitySetting = quality;

    // Update LOD distances based on quality
    if (quality === "low") {
      this.lodDistances = { near: 800, mid: 2000, far: 4000 };
    } else if (quality === "high") {
      this.lodDistances = { near: 1200, mid: 3500, far: 7000 };
    } else {
      this.lodDistances = { near: 1000, mid: 3000, far: 6000 };
    }
  }

  /**
   * Clean up resources
   */
  public dispose(): void {
    // Remove all clouds from scene
    if (this.group && this.scene) {
      this.scene.remove(this.group);
    }

    // Dispose of geometries and materials
    this.meshes.forEach((mesh) => {
      if (mesh.geometry) {
        mesh.geometry.dispose();
      }
    });

    // Dispose of materials (careful not to dispose shared materials multiple times)
    const disposedMaterials = new Set();
    this.materials.forEach((material) => {
      if (!disposedMaterials.has(material)) {
        material.dispose();
        disposedMaterials.add(material);
      }
    });

    // Clear arrays
    this.meshes = [];
    this.materials = [];
    this.cloudClusters = [];
  }
}
