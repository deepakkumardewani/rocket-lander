import * as THREE from "three";

/**
 * Class to manage celestial objects like planets and moons in the scene
 */
export class CelestialObjects {
  private planets: THREE.Mesh[] = [];
  private glowEffects: THREE.Mesh[] = [];

  // Vertex shader for the planet glow effect
  private static readonly glowVertexShader = `
    varying vec3 vNormal;
    varying vec3 vViewPosition;
    
    void main() {
      vNormal = normalize(normalMatrix * normal);
      vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
      vViewPosition = viewPosition.xyz;
      gl_Position = projectionMatrix * viewPosition;
    }
  `;

  // Fragment shader for the planet glow effect
  private static readonly glowFragmentShader = `
    uniform vec3 glowColor;
    uniform float intensity;
    uniform float power;
    
    varying vec3 vNormal;
    varying vec3 vViewPosition;
    
    void main() {
      float viewDot = abs(dot(normalize(vViewPosition), vNormal));
      float glowFactor = pow(1.0 - viewDot, power) * intensity;
      gl_FragColor = vec4(glowColor, glowFactor);
    }
  `;

  /**
   * Create a planet/moon with specified parameters
   * @param options Options for the celestial object
   * @returns The created mesh
   */
  public createCelestialObject({
    radius = 3,
    position = new THREE.Vector3(30, 15, -40),
    textureUrl = "",
    color = 0x3498db,
    segments = 32,
    addGlow = true,
    glowColor = 0x00bfff,
    glowIntensity = 1.0,
    glowPower = 2.5,
    glowSize = 1.15
  }: {
    radius?: number;
    position?: THREE.Vector3;
    textureUrl?: string;
    color?: number;
    segments?: number;
    addGlow?: boolean;
    glowColor?: number;
    glowIntensity?: number;
    glowPower?: number;
    glowSize?: number;
  } = {}): THREE.Mesh {
    // Create geometry for the planet
    const geometry = new THREE.SphereGeometry(radius, segments, segments);

    // Create material for the planet
    let material: THREE.Material;

    if (textureUrl) {
      // Load texture if specified
      const texture = new THREE.TextureLoader().load(textureUrl);
      material = new THREE.MeshPhongMaterial({
        map: texture,
        shininess: 15
      });
    } else {
      // Use basic color if no texture provided
      material = new THREE.MeshPhongMaterial({
        color,
        shininess: 15
      });
    }

    // Create the planet mesh
    const planet = new THREE.Mesh(geometry, material);
    planet.position.copy(position);

    // Add a subtle rotation to the planet
    const rotationSpeed = Math.random() * 0.001 + 0.0005;
    planet.userData.rotationSpeed = rotationSpeed;

    // Add to planets array
    this.planets.push(planet);

    // Create glow effect if requested
    if (addGlow) {
      const glowMesh = this.createGlowEffect(planet, {
        color: glowColor,
        size: glowSize,
        intensity: glowIntensity,
        power: glowPower
      });

      this.glowEffects.push(glowMesh);
    }

    return planet;
  }

  /**
   * Create a glow effect for a celestial object
   * @param planet The planet mesh to add glow to
   * @param options Glow effect options
   * @returns The created glow mesh
   */
  private createGlowEffect(
    planet: THREE.Mesh,
    {
      color = 0x00bfff,
      size = 1.15,
      intensity = 1.0,
      power = 2.5
    }: {
      color?: number;
      size?: number;
      intensity?: number;
      power?: number;
    } = {}
  ): THREE.Mesh {
    // Get the planet radius from its geometry
    const planetGeometry = planet.geometry as THREE.SphereGeometry;
    const radius = planetGeometry.parameters.radius;

    // Create a slightly larger sphere for the glow effect
    const glowGeometry = new THREE.SphereGeometry(
      radius * size,
      planetGeometry.parameters.widthSegments,
      planetGeometry.parameters.heightSegments
    );

    // Create shader material for the glow effect
    const glowMaterial = new THREE.ShaderMaterial({
      uniforms: {
        glowColor: { value: new THREE.Color(color) },
        intensity: { value: intensity },
        power: { value: power }
      },
      vertexShader: CelestialObjects.glowVertexShader,
      fragmentShader: CelestialObjects.glowFragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.FrontSide,
      depthWrite: false
    });

    // Create the glow mesh
    const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);

    // Position the glow at the same position as the planet
    glowMesh.position.copy(planet.position);

    // Store reference to parent planet for updates
    glowMesh.userData.parent = planet;

    return glowMesh;
  }

  /**
   * Generate a predefined set of celestial objects for the scene
   * @returns Array of created planet/moon meshes
   */
  public generateCelestialObjects(): THREE.Mesh[] {
    // Clear existing arrays
    this.planets = [];
    this.glowEffects = [];

    // Create a blue gas giant
    const gasGiant = this.createCelestialObject({
      radius: 5,
      position: new THREE.Vector3(40, 25, -70),
      color: 0x3498db,
      glowColor: 0x4aa7e6,
      glowIntensity: 0.8,
      glowPower: 2.0
    });

    // Create a reddish-orange planet (e.g., Mars-like)
    const redPlanet = this.createCelestialObject({
      radius: 2.5,
      position: new THREE.Vector3(-60, 10, -50),
      color: 0xe67e22,
      glowColor: 0xe74c3c,
      glowIntensity: 0.6,
      glowPower: 2.2
    });

    // Create a small moon
    const moon = this.createCelestialObject({
      radius: 1,
      position: new THREE.Vector3(-20, 40, -40),
      color: 0xaaaaaa,
      glowColor: 0xffffff,
      glowIntensity: 0.4,
      glowPower: 3.0
    });

    this.planets.push(gasGiant, redPlanet, moon);
    return this.planets;
  }

  /**
   * Update celestial objects (rotation, glow effects, etc.)
   * @param deltaTime Time since last update in seconds
   */
  public update(deltaTime: number): void {
    // Update planets (rotation)
    this.planets.forEach((planet) => {
      if (planet.userData.rotationSpeed) {
        planet.rotation.y += planet.userData.rotationSpeed * deltaTime * 60;
      }
    });

    // Update glow effects to match planet positions
    this.glowEffects.forEach((glowMesh) => {
      if (glowMesh.userData.parent) {
        glowMesh.position.copy(glowMesh.userData.parent.position);
        glowMesh.rotation.copy(glowMesh.userData.parent.rotation);
      }
    });
  }

  /**
   * Get all meshes (planets and glow effects)
   * @returns Array of all meshes
   */
  public getMeshes(): THREE.Mesh[] {
    return [...this.planets, ...this.glowEffects];
  }

  /**
   * Get planet meshes only
   * @returns Array of planet meshes
   */
  public getPlanetMeshes(): THREE.Mesh[] {
    return [...this.planets];
  }

  /**
   * Get glow effect meshes only
   * @returns Array of glow effect meshes
   */
  public getGlowMeshes(): THREE.Mesh[] {
    return [...this.glowEffects];
  }

  /**
   * Dispose of all resources
   */
  public dispose(): void {
    // Dispose of planet geometry and materials
    this.planets.forEach((planet) => {
      planet.geometry.dispose();
      if (planet.material instanceof THREE.Material) {
        planet.material.dispose();
      } else if (Array.isArray(planet.material)) {
        planet.material.forEach((material) => material.dispose());
      }
    });

    // Dispose of glow effect geometry and materials
    this.glowEffects.forEach((glow) => {
      glow.geometry.dispose();
      if (glow.material instanceof THREE.Material) {
        glow.material.dispose();
      } else if (Array.isArray(glow.material)) {
        glow.material.forEach((material) => material.dispose());
      }
    });

    // Clear arrays
    this.planets = [];
    this.glowEffects = [];
  }
}
