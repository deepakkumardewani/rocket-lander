import * as THREE from "three";

/**
 * Cloud class for creating and managing cloud instances in the 3D world
 * Inspired by Mr. Doob's cloud implementation
 * Uses multiple planes with alpha textures for volumetric effect
 */
class Cloud {
  constructor(scene, position = new THREE.Vector3(), scale = 1.0) {
    this.scene = scene;
    this.position = position;
    this.scale = scale;
    this.speed = 0.1;
    this.meshes = [];
    this.materials = []; // Keep track of materials for opacity updates
    this.group = new THREE.Group();
    this.scene.add(this.group);

    this.init();
  }

  init() {
    const textureLoader = new THREE.TextureLoader();
    // Using local cloud texture
    textureLoader.load("textures/cloud.avif", (texture) => {
      // Create the main cloud
      this.createCloudMeshes(texture);

      // Create additional smaller clouds in the cluster
      const numCloudsInCluster = 5 + Math.floor(Math.random() * 3);
      for (let i = 0; i < numCloudsInCluster; i++) {
        this.createCloudMeshes(
          texture,
          0.5 + Math.random() * 0.4,
          new THREE.Vector3(
            (Math.random() - 0.5) * 300,
            (Math.random() - 0.5) * 60,
            (Math.random() - 0.5) * 300
          )
        );
      }

      // Position the entire cloud group with increased base height
      this.group.position.copy(this.position);
      this.group.position.y = 200 + Math.random() * 150; // Increased base height

      // Give the cloud group a random fixed rotation around Y axis
      this.group.rotation.y = Math.random() * Math.PI * 2;
    });
  }

  createCloudMeshes(
    texture,
    scaleMultiplier = 1,
    offset = new THREE.Vector3()
  ) {
    const geometry = new THREE.PlaneGeometry(1, 1);
    const numLayers = 4;

    // Create cloud layers
    const cloudGroup = new THREE.Group();

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
      const layerScale =
        this.scale * 200 * scaleMultiplier * (0.85 + Math.random() * 0.3);
      mesh.scale.set(layerScale, layerScale * 0.6, 1);

      this.meshes.push(mesh);
      this.materials.push(material);
      cloudGroup.add(mesh);
    }

    // Position this cloud within the cluster
    cloudGroup.position.copy(offset);
    // Give each cloud in cluster a random fixed rotation
    cloudGroup.rotation.y = Math.random() * Math.PI * 2;
    this.group.add(cloudGroup);
  }

  static createClouds(scene, boundary = 4000, numClusters = 50) {
    const clouds = [];

    // Create clouds in multiple rings for better distribution
    const rings = 6;
    const clustersPerRing = Math.floor(numClusters / 3);

    for (let ring = 0; ring < rings; ring++) {
      // Exponential distribution for ring radius to place more clouds at horizon
      const ringProgress = ring / (rings - 1);
      const ringRadius = boundary * (0.2 + Math.pow(ringProgress, 1.5) * 2.5);

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
          const cloud = new Cloud(scene, offsetPosition, scale);
          clouds.push(cloud);
        }
      }
    }

    return clouds;
  }

  update(windDirection, deltaTime) {
    if (this.group && this.scene.camera) {
      // Move cloud based on wind direction and speed
      this.group.position.x += windDirection.x * this.speed * deltaTime;
      this.group.position.z += windDirection.z * this.speed * deltaTime;

      // Very subtle movement for all meshes
      this.meshes.forEach((mesh) => {
        mesh.rotation.z += deltaTime * 0.001 * (Math.random() - 0.5);
      });

      // Update opacities based on view angle and distance
      const cameraPosition = this.scene.camera.position;
      this.meshes.forEach((mesh, index) => {
        // Get world normal of the cloud plane
        const normal = new THREE.Vector3(0, 0, 1);
        normal.applyQuaternion(mesh.getWorldQuaternion(new THREE.Quaternion()));

        // Get direction and distance from camera to cloud
        const cloudWorldPos = mesh.getWorldPosition(new THREE.Vector3());
        const toCamera = new THREE.Vector3();
        toCamera.subVectors(cameraPosition, cloudWorldPos).normalize();

        // Calculate distance factor (0 to 1, where 1 is at max distance)
        const distance = cameraPosition.distanceTo(cloudWorldPos);
        const distanceFactor = Math.min(distance / 10000, 1); // Increased from 4000 to match new distances

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

        this.materials[index].opacity =
          (minOpacity + (baseOpacity - minOpacity) * dot) * distanceOpacity;
      });

      // Wrap around when cloud goes too far
      const boundary = 10000; // Increased to match new distances
      if (Math.abs(this.group.position.x) > boundary) {
        this.group.position.x = -Math.sign(this.group.position.x) * boundary;
      }
      if (Math.abs(this.group.position.z) > boundary) {
        this.group.position.z = -Math.sign(this.group.position.z) * boundary;
      }
    }
  }

  dispose() {
    if (this.group) {
      this.meshes.forEach((mesh) => {
        mesh.material.dispose();
        mesh.geometry.dispose();
      });
      this.materials = [];
      this.meshes = [];
      this.scene.remove(this.group);
    }
  }
}

export default Cloud;
