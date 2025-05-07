import * as THREE from "three";

/**
 * Class to create and manage aurora-like effects near the horizon
 */
export class Aurora {
  private mesh: THREE.Mesh;
  private time: number = 0;
  private active: boolean = false;
  private intensity: number = 0;
  private targetIntensity: number = 0;

  // Vertex shader for the aurora effect
  private static readonly auroraVertexShader = `
    varying vec2 vUv;
    varying float vHeight;
    
    void main() {
      vUv = uv;
      vHeight = position.y;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;

  // Fragment shader for the aurora effect
  private static readonly auroraFragmentShader = `
    uniform vec3 baseColor;
    uniform vec3 secondaryColor;
    uniform float time;
    uniform float intensity;
    
    varying vec2 vUv;
    varying float vHeight;
    
    // Simplex noise functions
    vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
    
    float snoise(vec2 v){
      const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                -0.577350269189626, 0.024390243902439);
      vec2 i  = floor(v + dot(v, C.yy) );
      vec2 x0 = v -   i + dot(i, C.xx);
      vec2 i1;
      i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
      vec4 x12 = x0.xyxy + C.xxzz;
      x12.xy -= i1;
      i = mod(i, 289.0);
      vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
      + i.x + vec3(0.0, i1.x, 1.0 ));
      vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy),
        dot(x12.zw,x12.zw)), 0.0);
      m = m*m ;
      m = m*m ;
      vec3 x = 2.0 * fract(p * C.www) - 1.0;
      vec3 h = abs(x) - 0.5;
      vec3 ox = floor(x + 0.5);
      vec3 a0 = x - ox;
      m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
      vec3 g;
      g.x  = a0.x  * x0.x  + h.x  * x0.y;
      g.yz = a0.yz * x12.xz + h.yz * x12.yw;
      return 130.0 * dot(m, g);
    }
    
    void main() {
      // Calculate height-based alpha (visible only near the horizon)
      float heightAlpha = smoothstep(0.0, 0.3, vUv.y) * smoothstep(1.0, 0.7, vUv.y);
      
      // Create moving noise patterns for the aurora
      float speed1 = time * 0.05;
      float speed2 = time * 0.08;
      
      vec2 noisePos1 = vec2(vUv.x * 2.0 + sin(speed1) * 0.1, vUv.y + speed1);
      vec2 noisePos2 = vec2(vUv.x * 3.0 - speed2, vUv.y * 2.0);
      
      float noise1 = snoise(noisePos1);
      float noise2 = snoise(noisePos2);
      
      // Combine noise patterns
      float combinedNoise = (noise1 + noise2 * 0.5) * 0.5 + 0.5;
      
      // Create vertical curtain effect
      float verticalCurtain = sin(vUv.x * 10.0 + time * 0.2) * 0.5 + 0.5;
      combinedNoise *= verticalCurtain;
      
      // Apply height alpha and curtain effect
      float alpha = combinedNoise * heightAlpha * intensity;
      
      // Mix colors based on noise
      vec3 finalColor = mix(baseColor, secondaryColor, noise1 * 0.5 + 0.5);
      
      // Output final color with alpha
      gl_FragColor = vec4(finalColor, alpha);
    }
  `;

  /**
   * Create a new aurora effect
   * @param options Options for the aurora effect
   */
  constructor({
    radius = 90,
    baseColor = new THREE.Color(0x00ff88), // Green
    secondaryColor = new THREE.Color(0x4455ff), // Blue
    initialIntensity = 0.0
  }: {
    radius?: number;
    baseColor?: THREE.Color;
    secondaryColor?: THREE.Color;
    initialIntensity?: number;
  } = {}) {
    // Initialize properties
    this.intensity = initialIntensity;
    this.targetIntensity = initialIntensity;
    this.active = initialIntensity > 0;

    // Create half-cylinder geometry for the aurora
    const geometry = new THREE.CylinderGeometry(
      radius, // top radius
      radius, // bottom radius
      radius * 0.7, // height
      64, // radial segments
      16, // height segments
      true, // open-ended
      0, // start angle
      Math.PI // arc angle (half cylinder)
    );

    // Rotate to place the open side toward the camera
    geometry.rotateX(Math.PI / 2);
    geometry.rotateY(Math.PI);

    // Create shader material with uniforms
    const material = new THREE.ShaderMaterial({
      uniforms: {
        baseColor: { value: baseColor },
        secondaryColor: { value: secondaryColor },
        time: { value: 0 },
        intensity: { value: this.intensity }
      },
      vertexShader: Aurora.auroraVertexShader,
      fragmentShader: Aurora.auroraFragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      depthWrite: false
    });

    // Create mesh
    this.mesh = new THREE.Mesh(geometry, material);

    // Position below the horizon
    this.mesh.position.y = -radius * 0.3;
  }

  /**
   * Update the aurora effect with time
   * @param deltaTime Time since last update in seconds
   */
  public update(deltaTime: number): void {
    this.time += deltaTime;

    // Smoothly adjust intensity toward target
    const intensityDiff = this.targetIntensity - this.intensity;
    if (Math.abs(intensityDiff) > 0.001) {
      this.intensity += intensityDiff * Math.min(1.0, deltaTime * 2);

      // Update intensity uniform
      const material = this.mesh.material as THREE.ShaderMaterial;
      material.uniforms.intensity.value = this.intensity;
    }

    // Update time uniform
    const material = this.mesh.material as THREE.ShaderMaterial;
    material.uniforms.time.value = this.time;

    // Add subtle rotation to the aurora
    this.mesh.rotation.y += deltaTime * 0.03;
  }

  /**
   * Trigger aurora effect
   * @param intensity Target intensity (0-1)
   * @param duration Duration to maintain the effect in seconds (0 for indefinite)
   */
  public trigger(intensity: number = 1.0, duration: number = 0): void {
    this.targetIntensity = Math.max(0, Math.min(1, intensity));
    this.active = true;

    // Set up automatic fade-out if duration is specified
    if (duration > 0) {
      setTimeout(() => {
        this.hide();
      }, duration * 1000);
    }
  }

  /**
   * Hide aurora effect (fade out)
   */
  public hide(): void {
    this.targetIntensity = 0;
    this.active = false;
  }

  /**
   * Set aurora colors
   * @param baseColor Primary color
   * @param secondaryColor Secondary color
   */
  public setColors(baseColor: THREE.Color, secondaryColor: THREE.Color): void {
    const material = this.mesh.material as THREE.ShaderMaterial;
    material.uniforms.baseColor.value = baseColor;
    material.uniforms.secondaryColor.value = secondaryColor;
  }

  /**
   * Check if aurora is currently active
   * @returns True if aurora is active (visible or fading)
   */
  public isActive(): boolean {
    return this.active;
  }

  /**
   * Get the aurora mesh to add to the scene
   * @returns The aurora mesh
   */
  public getMesh(): THREE.Mesh {
    return this.mesh;
  }

  /**
   * Dispose of all resources used by the aurora effect
   */
  public dispose(): void {
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.ShaderMaterial).dispose();
  }
}
