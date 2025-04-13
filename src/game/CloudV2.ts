import * as THREE from "three";

/**
 * Interface for cloud creation parameters
 */
interface CloudV2Params {
  boundary?: number;
  numClusters?: number;
  texture?: THREE.Texture | null;
  camera?: THREE.Camera;
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

    // Create clouds
    this.createClouds(params.numClusters || 15, params.texture);
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
      const rings = 6;
      const clustersPerRing = Math.floor(numClusters / 3);

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

          // Create multiple clouds at similar positions for denser clusters
          const numCloudsAtPosition = ring >= 4 ? 2 : 1;
          for (let j = 0; j < numCloudsAtPosition; j++) {
            const offsetPosition = position.clone();
            if (j > 0) {
              // Add slight offset for additional clouds
              offsetPosition.x += (Math.random() - 0.5) * 100;
              offsetPosition.z += (Math.random() - 0.5) * 100;
              offsetPosition.y += (Math.random() - 0.5) * 50; // Increased vertical variation
            }
            this.createSingleCloud(offsetPosition, scale, texture);
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
   * @param texture Texture to use for cloud planes
   */
  private createSingleCloud(
    position: THREE.Vector3,
    scale: number = 1.0,
    texture: THREE.Texture
  ): void {
    const cloudGroup = new THREE.Group();
    const numLayers = 4;

    // Create cloud layers
    const geometry = new THREE.PlaneGeometry(1, 1);

    // Create layers at fixed angles
    const angleStep = (Math.PI * 2) / numLayers;
    for (let i = 0; i < numLayers; i++) {
      // Create base material
      const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        opacity: 0.5,
        depthWrite: false,
        blending: THREE.NormalBlending,
        side: THREE.DoubleSide,
        fog: true, // Enable fog for better distance fading
      });

      const mesh = new THREE.Mesh(geometry, material);

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

      this.meshes.push(mesh);
      this.materials.push(material);
      cloudGroup.add(mesh);
    }

    // Position this cloud within the cluster
    cloudGroup.position.copy(position);
    // Give each cloud in cluster a random fixed rotation
    cloudGroup.rotation.y = Math.random() * Math.PI * 2;

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
   * @param deltaTime Time since last frame in seconds
   */
  public update(deltaTime: number): void {
    this.time += deltaTime;

    // Update each cloud cluster
    this.cloudClusters.forEach((cloudGroup) => {
      // Move cloud based on wind direction and speed
      cloudGroup.position.x +=
        this.windDirection.x * this.windSpeed * deltaTime;
      cloudGroup.position.z +=
        this.windDirection.z * this.windSpeed * deltaTime;

      // Very subtle rotation
      cloudGroup.rotation.y += deltaTime * 0.001 * (Math.random() - 0.5);

      // Update opacities based on view angle and distance if camera exists
      if (this.camera) {
        this.updateCloudOpacity(cloudGroup, this.camera);
      }

      // Wrap around when cloud goes too far
      this.checkWorldBounds(cloudGroup);
    });
  }

  /**
   * Update cloud opacity based on camera angle and distance
   * @param cloudGroup Cloud group to update
   * @param camera Camera to use for calculations
   */
  private updateCloudOpacity(
    cloudGroup: THREE.Group,
    camera: THREE.Camera
  ): void {
    cloudGroup.children.forEach((child, index) => {
      const mesh = child as THREE.Mesh;

      // Get world normal of the cloud plane
      const normal = new THREE.Vector3(0, 0, 1);
      normal.applyQuaternion(mesh.getWorldQuaternion(new THREE.Quaternion()));

      // Get direction and distance from camera to cloud
      const cloudWorldPos = mesh.getWorldPosition(new THREE.Vector3());
      const toCamera = new THREE.Vector3();
      toCamera.subVectors(camera.position, cloudWorldPos).normalize();

      // Calculate distance factor (0 to 1, where 1 is at max distance)
      const distance = camera.position.distanceTo(cloudWorldPos);
      const distanceFactor = Math.min(distance / 10000, 1); // Adjusted for our scale

      // Calculate dot product (0 = perpendicular, 1 = parallel)
      const dot = Math.abs(normal.dot(toCamera));

      // Adjust opacity based on angle and distance with a more gradual fade
      const baseOpacity = 0.5;
      const minOpacity = 0.1;

      // More sophisticated distance fading for horizon clouds
      const distanceOpacity =
        distance > 8000
          ? 0.3 + 0.7 * (1 - Math.pow((distance - 8000) / 4000, 2)) // Quadratic falloff for very distant clouds
          : 0.3 + 0.7 * (1 - distanceFactor); // Linear falloff for closer clouds

      const material = mesh.material as THREE.MeshBasicMaterial;
      material.opacity =
        (minOpacity + (baseOpacity - minOpacity) * dot) * distanceOpacity;
    });
  }

  /**
   * Check if a cloud has gone beyond world boundaries and wrap it
   * @param cloudGroup Cloud group to check
   */
  private checkWorldBounds(cloudGroup: THREE.Group): void {
    // Wrap around when cloud goes too far
    const boundary = this.boundary * 2;
    if (Math.abs(cloudGroup.position.x) > boundary) {
      cloudGroup.position.x = -Math.sign(cloudGroup.position.x) * boundary;
    }
    if (Math.abs(cloudGroup.position.z) > boundary) {
      cloudGroup.position.z = -Math.sign(cloudGroup.position.z) * boundary;
    }
  }

  /**
   * Get the group containing all clouds
   * @returns THREE.Group containing all clouds
   */
  public getGroup(): THREE.Group {
    return this.group;
  }

  /**
   * Clean up all resources
   */
  public dispose(): void {
    if (this.group) {
      this.meshes.forEach((mesh) => {
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
      });

      this.materials = [];
      this.meshes = [];
      this.cloudClusters = [];
      this.scene.remove(this.group);
    }
  }
}
