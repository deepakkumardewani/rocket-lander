import * as THREE from "three";

/**
 * Birds class for creating and managing flocks of birds flying in V-formations
 * Birds fly continuously in the same direction at a constant height
 */
class Birds {
  constructor(
    scene,
    position = new THREE.Vector3(),
    direction = new THREE.Vector3(1, 0, 0)
  ) {
    this.scene = scene;
    this.position = position;
    this.direction = direction.clone().normalize();
    this.speed = 20; // Units per second
    this.flocks = [];
    this.height = 50; // Flying height

    this.init();
  }

  init() {
    // Create several flocks of birds at medium distance (around 300 units away)
    // Position them in different directions around the world
    this.createFlock(10, new THREE.Vector3(300, this.height, 0));
    this.createFlock(8, new THREE.Vector3(-250, this.height, 250));
    this.createFlock(12, new THREE.Vector3(0, this.height, -350));
    this.createFlock(7, new THREE.Vector3(-200, this.height, -300));
    this.createFlock(9, new THREE.Vector3(250, this.height, 250));
  }

  createFlock(birdCount, startPosition) {
    const flock = {
      group: new THREE.Group(),
      birds: [],
      position: startPosition.clone(),
      direction: this.direction.clone(),
      angle: Math.random() * Math.PI * 2,
      speed: this.speed * (0.8 + Math.random() * 0.4),
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

        // Position in inverted V-formation (^ shape) that points backward
        bird.position.set(
          side * row * 3, // Left or right wing of the inverted V
          row * 0.5, // Slightly higher for each row back
          -row * 5 // In front of the leader (negative Z is forward in local space)
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

  createBird() {
    // Create a simple bird shape using triangles
    const birdGroup = new THREE.Group();

    // Body
    const bodyGeometry = new THREE.ConeGeometry(1, 3, 3);
    bodyGeometry.rotateX(Math.PI / 2);
    const bodyMaterial = new THREE.MeshBasicMaterial({ color: 0x444444 }); // Changed back to grey
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
    }); // Changed back to grey
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

  rotateFlockToDirection(flock) {
    // Get the angle between the current direction and the target direction
    const currentDir = new THREE.Vector3(0, 0, 1); // Default forward direction
    const targetAngle = Math.atan2(flock.direction.x, flock.direction.z);

    // Apply rotation to the flock group
    flock.group.rotation.y = targetAngle;
  }

  update(deltaTime) {
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

  animateBirdWings(flock, deltaTime) {
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
        // Instead of rotating, move wings up and down
        const flapHeight = Math.sin(bird.userData.flapAngle) * 0.5;
        wings.position.y = flapHeight;
      }
    });
  }

  checkWorldBounds(flock) {
    // Check if birds have flown too far
    const boundary = 1000; // Reduced from 2000 to 1000
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

      // Keep the original direction - don't change it
      // No direction changes, birds always fly in their initial direction

      // Update rotation to match direction (shouldn't be necessary, but just in case)
      this.rotateFlockToDirection(flock);
    }
  }

  dispose() {
    // Clean up all resources
    this.flocks.forEach((flock) => {
      flock.birds.forEach((bird) => {
        bird.children.forEach((child) => {
          if (child.geometry) child.geometry.dispose();
          if (child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach((mat) => mat.dispose());
            } else {
              child.material.dispose();
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
   * @param {THREE.Scene} scene - The scene to add birds to
   * @param {number} flockCount - Number of flocks to create
   * @param {THREE.Vector3} direction - Direction for birds to fly
   * @returns {Birds} - The birds instance
   */
  static createBirds(
    scene,
    flockCount = 3,
    direction = new THREE.Vector3(1, 0, 0)
  ) {
    const birds = new Birds(scene, new THREE.Vector3(0, 0, 0), direction);
    return birds;
  }
}

export default Birds;
