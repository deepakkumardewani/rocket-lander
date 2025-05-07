import * as THREE from "three";

/**
 * Class to create and manage lens flare effects for bright sources
 */
export class LensFlare {
  private plane: THREE.Mesh;
  private time: number = 0;
  private sourcePosition: THREE.Vector3;
  private camera: THREE.Camera;
  private intensity: number = 1.0;
  private visible: boolean = true;
  private visibilityThreshold: number = 0.2;

  // Vertex shader for the lens flare effect
  private static readonly flareVertexShader = `
    varying vec2 vUv;
    
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;

  // Fragment shader for the lens flare effect
  private static readonly flareFragmentShader = `
    uniform sampler2D flareTexture;
    uniform float intensity;
    uniform float time;
    uniform vec3 flareColor;
    
    varying vec2 vUv;
    
    void main() {
      // Transform UV to be centered
      vec2 centeredUv = vUv * 2.0 - 1.0;
      
      // Calculate distance from center for circular gradient
      float dist = length(centeredUv);
      
      // Sample flare texture
      vec4 flareTexel = texture2D(flareTexture, vUv);
      
      // Create time-based pulse effect
      float pulse = 0.05 * sin(time * 2.0) + 1.0;
      
      // Create circular intensity falloff
      float circleIntensity = smoothstep(1.0, 0.1, dist) * intensity * pulse;
      
      // Apply color and intensity
      vec3 color = flareTexel.rgb * flareColor * circleIntensity;
      float alpha = flareTexel.a * circleIntensity;
      
      // Add subtle rainbow effect at the edges
      if (dist > 0.5 && dist < 0.9) {
        float rainbowFactor = (dist - 0.5) / 0.4; // 0-1 range from inner to outer edge
        vec3 rainbow = vec3(
          0.5 + 0.5 * sin(rainbowFactor * 3.14159 * 2.0 + time),
          0.5 + 0.5 * sin(rainbowFactor * 3.14159 * 2.0 + time + 2.094),
          0.5 + 0.5 * sin(rainbowFactor * 3.14159 * 2.0 + time + 4.188)
        );
        color = mix(color, rainbow * color, 0.3 * smoothstep(0.7, 0.8, dist));
      }
      
      // Output final color with alpha
      gl_FragColor = vec4(color, alpha);
    }
  `;

  /**
   * Create a new lens flare effect
   * @param options Options for the lens flare effect
   */
  constructor({
    sourcePosition = new THREE.Vector3(50, 40, -60),
    camera,
    flareColor = new THREE.Color(0xffffaa),
    size = 10,
    intensity = 1.0,
    texture = null
  }: {
    sourcePosition: THREE.Vector3;
    camera: THREE.Camera;
    flareColor?: THREE.Color;
    size?: number;
    intensity?: number;
    texture?: THREE.Texture | null;
  }) {
    // Store camera and light source position
    this.camera = camera;
    this.sourcePosition = sourcePosition.clone();
    this.intensity = intensity;

    // Create flare texture if none provided
    if (!texture) {
      texture = this.generateDefaultFlareTexture();
    }

    // Create a quad for the lens flare
    const geometry = new THREE.PlaneGeometry(size, size);

    // Create shader material with uniforms
    const material = new THREE.ShaderMaterial({
      uniforms: {
        flareTexture: { value: texture },
        flareColor: { value: flareColor },
        intensity: { value: intensity },
        time: { value: 0 }
      },
      vertexShader: LensFlare.flareVertexShader,
      fragmentShader: LensFlare.flareFragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthTest: false,
      depthWrite: false
    });

    // Create lens flare mesh
    this.plane = new THREE.Mesh(geometry, material);

    // Set the plane to always face the camera
    this.plane.onBeforeRender = () => {
      this.plane.lookAt(this.camera.position);
    };
  }

  /**
   * Generate a default lens flare texture
   * @returns A procedurally generated lens flare texture
   */
  private generateDefaultFlareTexture(): THREE.Texture {
    const size = 256;
    const data = new Uint8Array(size * size * 4);
    const center = size / 2;

    // Generate circular gradient for flare
    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        const index = (i * size + j) * 4;

        // Calculate distance from center
        const dx = i - center;
        const dy = j - center;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const maxDist = center;

        // Create gradient falloff with some noise
        let intensity = 1.0 - Math.min(1.0, distance / maxDist);
        intensity = Math.pow(intensity, 2); // Sharpen the falloff

        // Add some texture and highlights
        const noise = Math.random() * 0.1;
        const highlight = Math.max(0, 1.0 - Math.abs(distance - maxDist * 0.7) / (maxDist * 0.2));

        // Set color (white with some bloom)
        const value = Math.floor((intensity + noise + highlight * 0.5) * 255);
        data[index] = value;
        data[index + 1] = value;
        data[index + 2] = value;
        data[index + 3] = Math.floor(intensity * 255); // Alpha channel
      }
    }

    const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
    texture.needsUpdate = true;
    (texture as any)._wasGeneratedInternally = true;
    return texture;
  }

  /**
   * Update the lens flare effect with time
   * @param deltaTime Time since last update in seconds
   */
  public update(deltaTime: number): void {
    this.time += deltaTime;

    // Position flare based on the light source position projected to screen space
    this.updateFlarePosition();

    // Update time uniform
    const material = this.plane.material as THREE.ShaderMaterial;
    material.uniforms.time.value = this.time;
  }

  /**
   * Update the lens flare position based on light source
   */
  private updateFlarePosition(): void {
    // Check if light source is behind the camera
    const cameraDirection = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
    const toSource = new THREE.Vector3()
      .subVectors(this.sourcePosition, this.camera.position)
      .normalize();
    const dotProduct = cameraDirection.dot(toSource);

    // If light source is behind the camera, hide the flare
    if (dotProduct < this.visibilityThreshold) {
      if (this.visible) {
        this.plane.visible = false;
        this.visible = false;
      }
      return;
    }

    // Otherwise, make it visible and position it
    if (!this.visible) {
      this.plane.visible = true;
      this.visible = true;
    }

    // Project light source position to camera space
    const sourceClone = this.sourcePosition.clone();
    const vector = sourceClone.project(this.camera);

    // Scale intensity based on the viewing angle
    const angleIntensity = Math.pow(Math.max(0, dotProduct), 1.5);
    const material = this.plane.material as THREE.ShaderMaterial;
    material.uniforms.intensity.value = this.intensity * angleIntensity;

    // Convert to screen position and position the flare
    const widthHalf = window.innerWidth / 2;
    const heightHalf = window.innerHeight / 2;

    // Position the flare in world space relative to camera
    this.updateWorldPosition(
      vector.x * widthHalf + widthHalf,
      -(vector.y * heightHalf) + heightHalf
    );
  }

  /**
   * Convert screen position to world position for the flare
   * @param x Screen X coordinate
   * @param y Screen Y coordinate
   */
  private updateWorldPosition(x: number, y: number): void {
    // Convert screen coordinates to normalized device coordinates
    const ndcX = (x / window.innerWidth) * 2 - 1;
    const ndcY = -(y / window.innerHeight) * 2 + 1;

    // Create a position vector at a fixed distance from the camera
    const distance = 10; // Fixed distance from camera

    // Calculate world position using unproject
    const vector = new THREE.Vector3(ndcX, ndcY, 0.5);
    vector.unproject(this.camera);
    vector.sub(this.camera.position).normalize();
    vector.multiplyScalar(distance);
    vector.add(this.camera.position);

    // Set the flare position
    this.plane.position.copy(vector);
  }

  /**
   * Set intensity of the lens flare
   * @param intensity New intensity value (0-1)
   */
  public setIntensity(intensity: number): void {
    this.intensity = Math.max(0, Math.min(1, intensity));
    const material = this.plane.material as THREE.ShaderMaterial;
    material.uniforms.intensity.value = this.intensity;
  }

  /**
   * Set the color of the lens flare
   * @param color New color
   */
  public setColor(color: THREE.Color): void {
    const material = this.plane.material as THREE.ShaderMaterial;
    material.uniforms.flareColor.value = color;
  }

  /**
   * Set the visibility threshold angle
   * @param threshold Dot product threshold (-1 to 1)
   */
  public setVisibilityThreshold(threshold: number): void {
    this.visibilityThreshold = Math.max(-1, Math.min(1, threshold));
  }

  /**
   * Update the light source position
   * @param position New source position
   */
  public setSourcePosition(position: THREE.Vector3): void {
    this.sourcePosition.copy(position);
  }

  /**
   * Get the lens flare mesh to add to the scene
   * @returns The lens flare mesh
   */
  public getMesh(): THREE.Mesh {
    return this.plane;
  }

  /**
   * Dispose of all resources used by the lens flare effect
   */
  public dispose(): void {
    this.plane.geometry.dispose();

    const material = this.plane.material as THREE.ShaderMaterial;
    material.dispose();

    const texture = material.uniforms.flareTexture.value;
    if (texture && (texture as any)._wasGeneratedInternally) {
      texture.dispose();
    }
  }
}
