import * as THREE from "three";

/**
 * Interface for birds creation parameters
 */
interface BirdsParams {
  flockCount?: number;
  birdHeight?: number;
  direction?: THREE.Vector3;
}

/**
 * Class to create and manage flocks of birds flying in V-formations
 * Birds fly continuously at a constant height
 */
export class Birds {
  private scene: THREE.Scene;
  private flocks: {
    group: THREE.Group;
    birds: THREE.Group[];
    position: THREE.Vector3;
    direction: THREE.Vector3;
    angle: number;
    speed: number;
  }[] = [];
  private height: number;
  private direction: THREE.Vector3;

  /**
   * Create a new birds system
   * @param scene The THREE.Scene to add birds to
   * @param params Configuration parameters
   */
  constructor(scene: THREE.Scene, params: BirdsParams = {}) {
    this.scene = scene;
    this.height = params.birdHeight || 50;
    this.direction = params.direction
      ? params.direction.clone().normalize()
      : new THREE.Vector3(1, 0, 0);

    this.init(params.flockCount || 3);
  }

  /**
   * Initialize the bird flocks
   * @param flockCount Number of flocks to create
   */
  private init(flockCount: number): void {
    // Create several flocks of birds around the scene center
    for (let i = 0; i < flockCount; i++) {
      // Calculate positions in a circle around the scene center
      const angle = (i / flockCount) * Math.PI * 2;
      const distance = 250 + Math.random() * 100;
      const x = Math.sin(angle) * distance;
      const z = Math.cos(angle) * distance;

      // Create flock with random number of birds
      const birdCount = 7 + Math.floor(Math.random() * 6); // 7-12 birds
      this.createFlock(birdCount, new THREE.Vector3(x, this.height, z));
    }
  }

  /**
   * Create a single flock of birds
   * @param birdCount Number of birds in the flock
   * @param startPosition Starting position for the flock
   */
  private createFlock(birdCount: number, startPosition: THREE.Vector3): void {
    const flock = {
      group: new THREE.Group(),
      birds: [] as THREE.Group[],
      position: startPosition.clone(),
      direction: this.direction.clone(),
      angle: Math.random() * Math.PI * 2,
      speed: 20 * (0.8 + Math.random() * 0.4), // Random speed variation
    };

    // Create the birds in a V-formation
    for (let i = 0; i < birdCount; i++) {
      const bird = this.createBird();

      // Place birds in V-formation
      // First bird is the leader
      if (i === 0) {
        bird.position.set(0, 0, 0);
      } else {
        // Alternate left and right sides of the V
        const side = i % 2 === 0 ? 1 : -1;
        const row = Math.ceil(i / 2);

        // Position in inverted V-formation (^ shape)
        bird.position.set(
          side * row * 3, // Left or right wing of the inverted V
          row * 0.5, // Slightly higher for each row back
          -row * 5 // Behind the leader (negative Z is backward in local space)
        );
      }

      flock.birds.push(bird);
      flock.group.add(bird);
    }

    // Position the entire flock
    flock.group.position.copy(flock.position);

    // Rotate the flock to match the initial direction
    this.rotateFlockToDirection(flock);

    this.scene.add(flock.group);
    this.flocks.push(flock);
  }

  /**
   * Create a simple bird model
   * @returns A THREE.Group representing a bird
   */
  private createBird(): THREE.Group {
    // Create a simple bird shape using basic geometries
    const birdGroup = new THREE.Group();

    // Body
    const bodyGeometry = new THREE.ConeGeometry(1, 3, 3);
    bodyGeometry.rotateX(Math.PI / 2);
    const bodyMaterial = new THREE.MeshBasicMaterial({ color: 0x444444 });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    birdGroup.add(body);

    // Wings (2 triangles)
    const wingGeometry = new THREE.BufferGeometry();
    const wingVertices = new Float32Array([
      0,
      0,
      0, // center
      -4,
      0,
      -2, // left back
      -4,
      0,
      2, // left front

      0,
      0,
      0, // center
      4,
      0,
      -2, // right back
      4,
      0,
      2, // right front
    ]);
    wingGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(wingVertices, 3)
    );
    const wingMaterial = new THREE.MeshBasicMaterial({
      color: 0x555555,
      side: THREE.DoubleSide,
    });
    const wings = new THREE.Mesh(wingGeometry, wingMaterial);
    birdGroup.add(wings);

    // Random small variations for more natural appearance
    birdGroup.scale.set(
      0.8 + Math.random() * 0.4,
      0.8 + Math.random() * 0.4,
      0.8 + Math.random() * 0.4
    );

    return birdGroup;
  }

  /**
   * Rotate a flock to face its direction of movement
   * @param flock The flock to rotate
   */
  private rotateFlockToDirection(flock: {
    group: THREE.Group;
    direction: THREE.Vector3;
  }): void {
    // Get the angle between the current direction and the target direction
    const targetAngle = Math.atan2(flock.direction.x, flock.direction.z);

    // Apply rotation to the flock group
    flock.group.rotation.y = targetAngle;
  }

  /**
   * Update birds animation for the current frame
   * @param deltaTime Time since last frame in seconds
   */
  public update(deltaTime: number): void {
    // Update each flock
    this.flocks.forEach((flock) => {
      // Move the flock in its direction
      const movement = flock.direction
        .clone()
        .multiplyScalar(flock.speed * deltaTime);
      flock.position.add(movement);
      flock.group.position.copy(flock.position);

      // Keep birds at constant height
      flock.position.y = this.height;

      // Add some gentle oscillation for more natural movement
      flock.angle += deltaTime * 2;
      flock.group.position.y += Math.sin(flock.angle) * 0.5;

      // Wrap around the world boundaries
      this.checkWorldBounds(flock);

      // Bird wing flapping animation
      this.animateBirdWings(flock, deltaTime);
    });
  }

  /**
   * Animate the wings of birds in a flock
   * @param flock The flock to animate
   * @param deltaTime Time since last frame in seconds
   */
  private animateBirdWings(
    flock: { birds: THREE.Group[] },
    deltaTime: number
  ): void {
    // Simple wing flapping for each bird
    flock.birds.forEach((bird) => {
      if (!bird.userData.flapAngle) {
        bird.userData.flapAngle = Math.random() * Math.PI * 2;
        bird.userData.flapSpeed = 5 + Math.random() * 3;
      }

      bird.userData.flapAngle += deltaTime * bird.userData.flapSpeed;

      // Get wing mesh (second child)
      if (bird.children.length > 1) {
        const wings = bird.children[1];
        // Move wings up and down
        const flapHeight = Math.sin(bird.userData.flapAngle) * 0.5;
        wings.position.y = flapHeight;
      }
    });
  }

  /**
   * Check if birds have flown outside world boundaries and wrap them
   * @param flock The flock to check
   */
  private checkWorldBounds(flock: { position: THREE.Vector3 }): void {
    // Check if birds have flown too far
    const boundary = 1000;
    const respawnDistance = 300; // Distance from center to respawn birds
    let needsRespawn = false;

    if (
      flock.position.x > boundary ||
      flock.position.x < -boundary ||
      flock.position.z > boundary ||
      flock.position.z < -boundary
    ) {
      needsRespawn = true;
    }

    if (needsRespawn) {
      // Respawn the flock at a medium distance in a new random position
      const angle = Math.random() * Math.PI * 2;
      const x = Math.sin(angle) * respawnDistance;
      const z = Math.cos(angle) * respawnDistance;

      // Set new position
      flock.position.set(x, this.height, z);
    }
  }

  /**
   * Get the group containing all birds
   * @returns THREE.Group with all bird flocks
   */
  public getGroup(): THREE.Group {
    const group = new THREE.Group();
    this.flocks.forEach((flock) => {
      group.add(flock.group);
    });
    return group;
  }

  /**
   * Clean up all resources
   */
  public dispose(): void {
    // Clean up all resources
    this.flocks.forEach((flock) => {
      flock.birds.forEach((bird) => {
        bird.children.forEach((child) => {
          if ((child as THREE.Mesh).geometry) {
            (child as THREE.Mesh).geometry.dispose();
          }
          if ((child as THREE.Mesh).material) {
            const material = (child as THREE.Mesh).material;
            if (Array.isArray(material)) {
              material.forEach((mat) => mat.dispose());
            } else {
              material.dispose();
            }
          }
        });
      });

      this.scene.remove(flock.group);
    });

    this.flocks = [];
  }

  /**
   * Factory method to create birds in the scene
   * @param scene The scene to add birds to
   * @param flockCount Number of flocks to create
   * @param direction Direction for birds to fly
   * @returns Birds instance
   */
  static createBirds(scene: THREE.Scene, params: BirdsParams = {}): Birds {
    return new Birds(scene, params);
  }
}
