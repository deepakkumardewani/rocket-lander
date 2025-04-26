import * as THREE from "three";
import * as CANNON from "cannon-es";

/**
 * Class representing an obstacle in the game (asteroid or platform)
 */
export class Obstacle {
  private mesh: THREE.Mesh;
  private body: CANNON.Body;
  private type: "asteroid" | "platform";

  /**
   * Create an obstacle
   * @param type Type of obstacle ('asteroid' or 'platform')
   * @param size Size of the obstacle
   * @param position Initial position of the obstacle
   * @param isTarget Whether this platform is the landing target (for Sea Level 4)
   */
  constructor(
    type: "asteroid" | "platform",
    size: number,
    position: THREE.Vector3,
    public isTarget: boolean = false
  ) {
    this.type = type;

    // Create geometry and material based on type
    let geometry: THREE.BufferGeometry;
    let material: THREE.Material;
    let shape: CANNON.Shape;

    if (type === "asteroid") {
      // Create asteroid with sphere geometry
      geometry = new THREE.SphereGeometry(size);
      material = new THREE.MeshStandardMaterial({
        color: 0x8b4513, // Brown color for asteroids
        roughness: 0.8,
        metalness: 0.2,
      });
      shape = new CANNON.Sphere(size);
    } else {
      // Create platform with box geometry
      geometry = new THREE.BoxGeometry(size, 1, size);
      material = new THREE.MeshStandardMaterial({
        color: isTarget ? 0x00ff00 : 0xff0000, // Green for target, red for others
        roughness: 0.5,
        metalness: 0.2,
      });
      shape = new CANNON.Box(new CANNON.Vec3(size / 2, 0.5, size / 2));
    }

    // Create the mesh
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.copy(position);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;

    // Create the physics body
    this.body = new CANNON.Body({
      mass: type === "asteroid" ? 10 : 0, // Asteroids are dynamic, platforms static
      shape: shape,
    });
    this.body.position.set(position.x, position.y, position.z);

    // Store obstacle data for collision detection
    // Using CANNON.js's native properties for custom data
    this.body.collisionFilterGroup = 2; // Custom collision group for obstacles

    // Storing metadata in the mesh for reference
    this.mesh.userData = {
      type: "obstacle",
      obstacleType: type,
      isTarget,
    };
  }

  /**
   * Get the 3D mesh
   * @returns The THREE.js mesh
   */
  public getMesh(): THREE.Mesh {
    return this.mesh;
  }

  /**
   * Get the physics body
   * @returns The CANNON.js body
   */
  public getBody(): CANNON.Body {
    return this.body;
  }

  /**
   * Get the obstacle type
   * @returns The type of obstacle ('asteroid' or 'platform')
   */
  public getType(): "asteroid" | "platform" {
    return this.type;
  }

  /**
   * Dispose of resources
   */
  public dispose(): void {
    this.mesh.geometry.dispose();
    if (this.mesh.material instanceof THREE.Material) {
      this.mesh.material.dispose();
    }
  }
}
