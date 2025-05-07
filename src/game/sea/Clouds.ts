import * as THREE from "three";

import { AssetLoader } from "../../utils/assetLoader";

interface CloudScene extends THREE.Scene {
  camera?: THREE.Camera;
}

interface CloudParams {
  scene: CloudScene;
  position?: THREE.Vector3;
  scale?: number;
}

/**
 * Optimized Cloud class using InstancedMesh and shared resources
 */
export class Cloud {
  private static geometry: THREE.PlaneGeometry | null = null;
  private static material: THREE.MeshBasicMaterial | null = null;
  private static texture: THREE.Texture | null = null;
  private static instancedMesh: THREE.InstancedMesh | null = null;
  private static readonly INSTANCES_PER_CLOUD = 4;
  private static readonly MAX_CLOUDS = 150; // Reduced from previous amount
  private static updateCounter = 0;
  private static readonly UPDATE_FREQUENCY = 2; // Update every N frames

  private scene: CloudScene;
  private position: THREE.Vector3;
  private scale: number;
  private speed: number;
  private instanceIds: number[];
  private group: THREE.Group;
  private static frustum = new THREE.Frustum();
  private static projScreenMatrix = new THREE.Matrix4();
  private static tempMatrix = new THREE.Matrix4();
  private static tempVector = new THREE.Vector3();
  // private static tempQuaternion = new THREE.Quaternion();
  // private static tempEuler = new THREE.Euler();

  constructor({ scene, position = new THREE.Vector3(), scale = 1.0 }: CloudParams) {
    this.scene = scene;
    this.position = position.clone();
    this.scale = scale;
    this.speed = 0.1;
    this.instanceIds = [];
    this.group = new THREE.Group();
    this.scene.add(this.group);

    this.init();
  }

  private async init(): Promise<void> {
    await this.initSharedResources();
    this.createCloudInstances();
  }

  private async initSharedResources(): Promise<void> {
    if (!Cloud.geometry || !Cloud.material || !Cloud.instancedMesh) {
      // Create shared geometry if not exists
      Cloud.geometry = new THREE.PlaneGeometry(1, 1);

      // Load texture if not exists
      if (!Cloud.texture) {
        const assetLoader = new AssetLoader();
        Cloud.texture = await assetLoader.loadCloudTexture();
      }

      // Create shared material if not exists
      Cloud.material = new THREE.MeshBasicMaterial({
        map: Cloud.texture,
        transparent: true,
        opacity: 0.5,
        depthWrite: false,
        blending: THREE.NormalBlending,
        side: THREE.DoubleSide,
        fog: true
      });

      // Create shared instancedMesh if not exists
      Cloud.instancedMesh = new THREE.InstancedMesh(
        Cloud.geometry,
        Cloud.material,
        Cloud.MAX_CLOUDS * Cloud.INSTANCES_PER_CLOUD
      );
      Cloud.instancedMesh.frustumCulled = true;
      this.scene.add(Cloud.instancedMesh);
    }
  }

  private createCloudInstances(): void {
    const baseInstance = this.instanceIds.length;
    const numLayers = Cloud.INSTANCES_PER_CLOUD;
    const angleStep = (Math.PI * 2) / numLayers;

    for (let i = 0; i < numLayers; i++) {
      const instanceId = baseInstance + i;
      this.instanceIds.push(instanceId);

      const angle = angleStep * i;
      const layerScale = this.scale * 200 * (0.85 + Math.random() * 0.3);

      Cloud.tempMatrix.makeRotationY(angle);
      Cloud.tempVector
        .set(Math.cos(angle) * 20, (Math.random() - 0.5) * 10, Math.sin(angle) * 20)
        .add(this.position);
      Cloud.tempMatrix.setPosition(Cloud.tempVector);
      Cloud.tempMatrix.scale(new THREE.Vector3(layerScale, layerScale * 0.6, 1));

      if (Cloud.instancedMesh) {
        Cloud.instancedMesh.setMatrixAt(instanceId, Cloud.tempMatrix);
      }
    }

    if (Cloud.instancedMesh) {
      Cloud.instancedMesh.instanceMatrix.needsUpdate = true;
    }
  }

  static createClouds(
    scene: CloudScene,
    boundary: number = 4000,
    numClusters: number = 30 // Reduced number of clusters
  ): Cloud[] {
    const clouds: Cloud[] = [];
    const rings = 4; // Reduced number of rings
    const clustersPerRing = Math.floor(numClusters / rings);

    for (let ring = 0; ring < rings; ring++) {
      const ringProgress = ring / (rings - 1);
      const ringRadius = boundary * (0.2 + Math.pow(ringProgress, 1.5) * 2.5);
      const heightFactor = Math.pow(ringProgress, 1.2);
      const baseHeight = 200;
      const maxAdditionalHeight = 400;
      const ringHeight = baseHeight + maxAdditionalHeight * heightFactor;

      // Reduce clusters in distant rings
      const ringClusters = Math.floor(clustersPerRing * (1 - ringProgress * 0.3));

      for (let i = 0; i < ringClusters; i++) {
        const angle = (i / ringClusters) * Math.PI * 2;
        const radiusVariation = ringRadius * (0.9 + Math.random() * 0.2);

        Cloud.tempVector.set(
          Math.cos(angle) * radiusVariation,
          ringHeight + Math.random() * 100 * (1 + heightFactor),
          Math.sin(angle) * radiusVariation
        );

        const randomFactor = Math.max(0.05, 0.2 - ring * 0.04);
        Cloud.tempVector.x += (Math.random() - 0.5) * ringRadius * randomFactor;
        Cloud.tempVector.z += (Math.random() - 0.5) * ringRadius * randomFactor;

        const distanceScale = 0.8 + Math.pow(ring / (rings - 1), 2) * 1.2;
        const scale = (0.8 + Math.random() * 0.4) * distanceScale;

        const cloud = new Cloud({
          scene,
          position: Cloud.tempVector.clone(),
          scale
        });
        clouds.push(cloud);
      }
    }

    return clouds;
  }

  update(windDirection: THREE.Vector3, deltaTime: number): void {
    if (!Cloud.instancedMesh || !this.scene.camera) return;

    // Update only every N frames for performance
    Cloud.updateCounter = (Cloud.updateCounter + 1) % Cloud.UPDATE_FREQUENCY;
    if (Cloud.updateCounter !== 0) return;

    // Update frustum for culling
    Cloud.projScreenMatrix.multiplyMatrices(
      this.scene.camera.projectionMatrix,
      this.scene.camera.matrixWorldInverse
    );
    Cloud.frustum.setFromProjectionMatrix(Cloud.projScreenMatrix);

    // Move position based on wind
    this.position.x += windDirection.x * this.speed * deltaTime;
    this.position.z += windDirection.z * this.speed * deltaTime;

    // Wrap around when cloud goes too far
    const boundary = 10000;
    if (Math.abs(this.position.x) > boundary) {
      this.position.x = -Math.sign(this.position.x) * boundary;
    }
    if (Math.abs(this.position.z) > boundary) {
      this.position.z = -Math.sign(this.position.z) * boundary;
    }

    // Update instances
    const cameraPosition = this.scene.camera.position;
    const distance = this.position.distanceTo(cameraPosition);

    // Skip updates for very distant clouds
    if (distance > 12000) return;

    // Update frequency based on distance
    const updateFreq = distance > 8000 ? 4 : distance > 4000 ? 2 : 1;
    if (Cloud.updateCounter % updateFreq !== 0) return;

    this.instanceIds.forEach((instanceId, index) => {
      Cloud.instancedMesh?.getMatrixAt(instanceId, Cloud.tempMatrix);

      // Extract position and update it
      Cloud.tempVector.setFromMatrixPosition(Cloud.tempMatrix);
      Cloud.tempVector.add(this.position);

      // Check if instance is in frustum
      if (!Cloud.frustum.containsPoint(Cloud.tempVector)) {
        Cloud.tempMatrix.makeScale(0, 0, 0); // Hide if not in frustum
        Cloud.instancedMesh?.setMatrixAt(instanceId, Cloud.tempMatrix);
        return;
      }

      // Update opacity based on distance
      const instanceDistance = Cloud.tempVector.distanceTo(cameraPosition);
      const opacity = Math.max(0.1, 0.5 * (1 - Math.pow(instanceDistance / 10000, 2)));

      if (Cloud.material) {
        Cloud.material.opacity = opacity;
      }

      // Update matrix
      Cloud.tempMatrix.setPosition(Cloud.tempVector);
      Cloud.instancedMesh?.setMatrixAt(instanceId, Cloud.tempMatrix);
    });

    Cloud.instancedMesh.instanceMatrix.needsUpdate = true;
  }

  dispose(): void {
    if (this.group) {
      this.scene.remove(this.group);
    }

    // Clear instance references
    this.instanceIds = [];

    // Static cleanup only if this is the last cloud
    if (Cloud.instancedMesh && Cloud.instancedMesh.count === 0) {
      Cloud.geometry?.dispose();
      Cloud.material?.dispose();
      Cloud.texture?.dispose();
      this.scene.remove(Cloud.instancedMesh);

      Cloud.geometry = null;
      Cloud.material = null;
      Cloud.texture = null;
      Cloud.instancedMesh = null;
    }
  }

  setVisible(visible: boolean): void {
    if (Cloud.instancedMesh) {
      Cloud.instancedMesh.visible = visible;
    }
  }
}
