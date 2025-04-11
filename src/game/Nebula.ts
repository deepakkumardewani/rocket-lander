import * as THREE from "three";

/**
 * Class to create and manage nebula and space dust effects in the scene
 */
export class Nebula {
  private planes: THREE.Mesh[] = [];
  private nebulaGroup: THREE.Group;
  private time: number = 0;

  // Noise texture for the nebula effect
  private noiseTexture: THREE.Texture | null = null;

  // Fragment shader for the nebula effect
  private static readonly nebulaFragmentShader = `
    uniform sampler2D noiseTexture;
    uniform vec3 nebulaColor;
    uniform float opacity;
    uniform float time;
    
    varying vec2 vUv;
    
    void main() {
      vec2 uv = vUv;
      
      // Sample noise texture with time-based offset for subtle movement
      vec2 offset = vec2(sin(time * 0.01) * 0.01, cos(time * 0.008) * 0.01);
      float noise1 = texture2D(noiseTexture, uv + offset).r;
      float noise2 = texture2D(noiseTexture, uv * 2.0 - offset).r;
      
      // Combine noise samples for more complex pattern
      float combined = noise1 * noise2;
      
      // Apply falloff toward edges for softer look
      float distance = length(uv - 0.5) * 2.0;
      float edgeFalloff = 1.0 - smoothstep(0.5, 1.0, distance);
      
      // Apply color and transparency
      float alpha = combined * opacity * edgeFalloff;
      gl_FragColor = vec4(nebulaColor, alpha);
    }
  `;

  // Vertex shader for the nebula effect
  private static readonly nebulaVertexShader = `
    varying vec2 vUv;
    
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;

  /**
   * Create a new nebula effect
   * @param options Options for the nebula effect
   */
  constructor({
    noiseTexture = null,
    colors = [
      new THREE.Color(0x4a00e0), // Purple
      new THREE.Color(0x0077ff), // Blue
      new THREE.Color(0xff5588), // Pink
    ],
    planeCount = 5,
    planeSize = 100,
    opacity = 0.15,
    distribution = 40, // Distribution range in world units
  }: {
    noiseTexture?: THREE.Texture | null;
    colors?: THREE.Color[];
    planeCount?: number;
    planeSize?: number;
    opacity?: number;
    distribution?: number;
  } = {}) {
    this.noiseTexture = noiseTexture;

    // Create a group to hold all nebula planes
    this.nebulaGroup = new THREE.Group();

    // Generate a default noise texture if none provided
    if (!this.noiseTexture) {
      this.noiseTexture = this.generateDefaultNoiseTexture();
    }

    // Create the nebula planes
    for (let i = 0; i < planeCount; i++) {
      // Calculate position with random distribution
      const position = new THREE.Vector3(
        (Math.random() - 0.5) * distribution,
        (Math.random() - 0.5) * distribution,
        (Math.random() - 0.5) * distribution - 50 // Push back in scene
      );

      // Select a random color from the provided colors
      const color = colors[Math.floor(Math.random() * colors.length)];

      // Create a plane with shader material
      const plane = this.createNebulaPlane({
        size: planeSize * (0.5 + Math.random() * 0.5), // Random size variation
        position,
        color,
        opacity: opacity * (0.7 + Math.random() * 0.3), // Random opacity variation
        rotation: new THREE.Euler(
          Math.random() * Math.PI * 2,
          Math.random() * Math.PI * 2,
          Math.random() * Math.PI * 2
        ),
      });

      this.planes.push(plane);
      this.nebulaGroup.add(plane);
    }
  }

  /**
   * Generate a default noise texture when none is provided
   * @returns A procedurally generated noise texture
   */
  private generateDefaultNoiseTexture(): THREE.Texture {
    const size = 256;
    const data = new Uint8Array(size * size * 4);

    // Generate Perlin-like noise
    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        const index = (i * size + j) * 4;

        // Layered noise for more natural look
        const noise1 = Math.random();
        const noise2 = Math.random();
        const combined = (noise1 + noise2) / 2;

        data[index] = Math.floor(combined * 255);
        data[index + 1] = Math.floor(combined * 255);
        data[index + 2] = Math.floor(combined * 255);
        data[index + 3] = 255;
      }
    }

    const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
    texture.needsUpdate = true;
    return texture;
  }

  /**
   * Create a single nebula plane with shader material
   * @param options Options for the nebula plane
   * @returns The created nebula plane mesh
   */
  private createNebulaPlane({
    size = 50,
    position = new THREE.Vector3(0, 0, -50),
    color = new THREE.Color(0x4a00e0),
    opacity = 0.15,
    rotation = new THREE.Euler(0, 0, 0),
  }: {
    size?: number;
    position?: THREE.Vector3;
    color?: THREE.Color;
    opacity?: number;
    rotation?: THREE.Euler;
  } = {}): THREE.Mesh {
    // Create plane geometry
    const geometry = new THREE.PlaneGeometry(size, size, 1, 1);

    // Create shader material with uniforms
    const material = new THREE.ShaderMaterial({
      uniforms: {
        noiseTexture: { value: this.noiseTexture },
        nebulaColor: { value: color },
        opacity: { value: opacity },
        time: { value: 0 },
      },
      vertexShader: Nebula.nebulaVertexShader,
      fragmentShader: Nebula.nebulaFragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    // Create mesh and set position/rotation
    const plane = new THREE.Mesh(geometry, material);
    plane.position.copy(position);
    plane.rotation.copy(rotation);

    return plane;
  }

  /**
   * Update the nebula effect with time
   * @param deltaTime Time since last update in seconds
   */
  public update(deltaTime: number): void {
    this.time += deltaTime;

    // Update time uniform in all plane materials
    for (const plane of this.planes) {
      const material = plane.material as THREE.ShaderMaterial;
      if (material.uniforms.time) {
        material.uniforms.time.value = this.time;
      }

      // Add very slow rotation to create living universe feeling
      plane.rotation.x += deltaTime * 0.005 * (Math.random() - 0.5);
      plane.rotation.y += deltaTime * 0.005 * (Math.random() - 0.5);
    }
  }

  /**
   * Get the nebula group to add to the scene
   * @returns The THREE.Group containing all nebula planes
   */
  public getMesh(): THREE.Group {
    return this.nebulaGroup;
  }

  /**
   * Dispose of all resources used by the nebula effect
   */
  public dispose(): void {
    for (const plane of this.planes) {
      plane.geometry.dispose();

      const material = plane.material as THREE.ShaderMaterial;
      material.dispose();
    }

    this.planes = [];

    // Don't dispose the texture if it was provided externally
    if (this.noiseTexture && this.noiseTexture.source) {
      // Only dispose if it was generated internally
      if ((this.noiseTexture as any)._wasGeneratedInternally) {
        this.noiseTexture.dispose();
      }
    }
  }
}
