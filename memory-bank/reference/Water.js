import * as THREE from "three";
import { Water } from "three/addons/objects/Water.js";

/**
 * Ocean class representing the ocean in the 3D environment
 * Uses Three.js Water shader for realistic ocean rendering
 */
class Ocean {
  constructor(scene, sun) {
    this.scene = scene;
    this.sun = sun;
    this.water = null;
    this.waveDirection = new THREE.Vector2(0.5, 0.5);
    this.waveSpeedFactor = 0.5;
  }

  create() {
    const waterGeometry = new THREE.PlaneGeometry(10000, 10000);
    // const reflectionRenderTarget = new THREE.WebGLRenderTarget(512, 512);

    this.water = new Water(waterGeometry, {
      textureWidth: 512,
      textureHeight: 512,
      waterNormals: new THREE.TextureLoader().load(
        "textures/waternormals.jpg",
        function (texture) {
          texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        }
      ),
      sunDirection: this.sun.clone().normalize(),
      sunColor: 0xffffff,
      waterColor: 0x187db2,
      distortionScale: 5,
      size: 2.0,
      fog: false,
    });

    if (this.water.material.uniforms.mirrorSampler) {
      const originalOnBeforeRender = this.water.onBeforeRender;
      this.water.onBeforeRender = (renderer, scene, camera) => {
        const originalCameraLayers = camera.layers.mask;
        camera.layers.disable(1);

        if (originalOnBeforeRender) {
          originalOnBeforeRender(renderer, scene, camera);
        }

        camera.layers.mask = originalCameraLayers;
      };
    }

    this.water.rotation.x = -Math.PI / 2;
    this.scene.add(this.water);

    this.setWaveDirection(this.waveDirection);
  }

  update(deltaTime) {
    if (this.water) {
      this.water.material.uniforms["time"].value +=
        deltaTime * this.waveSpeedFactor;

      const time = this.water.material.uniforms["time"].value;
      this.water.material.uniforms["normalSampler"].value.offset.set(
        time * this.waveDirection.x * 0.05,
        time * this.waveDirection.y * 0.05
      );
    }
  }

  setWaveDirection(direction) {
    this.waveDirection = direction;
    if (this.water) {
      this.water.material.uniforms["normalSampler"].value.offset.set(
        this.water.material.uniforms["time"].value * direction.x * 0.05,
        this.water.material.uniforms["time"].value * direction.y * 0.05
      );
    }
  }

  setWaveSpeed(speed) {
    this.waveSpeedFactor = speed;
  }

  setParameters(params = {}) {
    if (!this.water) return;

    const waterUniforms = this.water.material.uniforms;

    if (params.distortionScale !== undefined) {
      waterUniforms.distortionScale.value = params.distortionScale;
    }

    if (params.size !== undefined) {
      waterUniforms.size.value = params.size;
    }

    if (params.waterColor !== undefined) {
      waterUniforms.waterColor.value.set(params.waterColor);
    }
  }
}

export default Ocean;
