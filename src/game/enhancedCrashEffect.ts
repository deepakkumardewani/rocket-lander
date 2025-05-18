import * as CANNON from "cannon-es";
import * as THREE from "three";

import { handleRenderingError } from "../utils/errorHandler";

import { ParticleSystem } from "./particleSystem";
import { createPhysicsMaterial, world } from "./physics";

// Type definitions
interface CrashEffectOptions {
  position: THREE.Vector3;
  rocketMesh?: THREE.Object3D;
  scene?: THREE.Scene;
  fragmentLifetime?: number;
  flashDuration?: number;
}

// ParticleSystems for different crash effects
let fireParticles: ParticleSystem | null = null;
let smokeParticles: ParticleSystem | null = null;
let debrisParticles: ParticleSystem | null = null;

// Collection of fragment meshes and bodies for cleanup
const fragments: {
  meshes: THREE.Mesh[];
  bodies: CANNON.Body[];
  creationTime: number;
  lifetime: number;
} = {
  meshes: [],
  bodies: [],
  creationTime: 0,
  lifetime: 3000 // 3 seconds default lifetime
};

// Flash effect for impact
let flashLight: THREE.PointLight | null = null;

/**
 * Initialize all particle systems needed for crash effects
 */
export function initCrashEffects(): void {
  // Fire particles (orange/yellow with color variation)
  fireParticles = new ParticleSystem({
    count: 1000,
    color: 0xff5500,
    size: 1,
    lifetime: 1.5,
    colorVariation: true, // Enable color variation
    colorRange: [0xff3300, 0xff9900], // Range from deep orange to yellow-orange
    sizeVariation: [0.2, 1] // Size variation for more dynamic effect
  });

  // Smoke particles (gray with longer lifetime)
  smokeParticles = new ParticleSystem({
    count: 1000,
    color: 0x555555,
    size: 1,
    lifetime: 2.5,
    alphaVariation: true, // Enable alpha variation
    alphaRange: [0.2, 0.8], // Range of transparency
    sizeVariation: [0.2, 1] // Size variation for billowy effect
  });

  // Debris particles (small metallic fragments)
  debrisParticles = new ParticleSystem({
    count: 1200,
    color: 0xcccccc,
    size: 1,
    lifetime: 1.8,
    colorVariation: true,
    colorRange: [0xaaaaaa, 0xeeeeee], // Metallic color variation
    sizeVariation: [0.2, 1]
  });
}

/**
 * Create a fragment mesh based on the rocket's geometry
 * @param position Position for the fragment
 * @param size Size of the fragment
 * @param material Material to apply to the fragment
 * @returns The created mesh
 */
function createFragmentMesh(
  position: THREE.Vector3,
  size: { width: number; height: number; depth: number },
  material: THREE.Material
): THREE.Mesh {
  // Use simple box geometry for fragments
  const geometry = new THREE.BoxGeometry(size.width, size.height, size.depth);
  const mesh = new THREE.Mesh(geometry, material);

  // Position the fragment
  mesh.position.copy(position);

  // Add some random rotation
  mesh.rotation.set(
    Math.random() * Math.PI * 2,
    Math.random() * Math.PI * 2,
    Math.random() * Math.PI * 2
  );

  // Enable shadows
  mesh.castShadow = true;
  mesh.receiveShadow = false;

  return mesh;
}

/**
 * Create a physics body for a fragment
 * @param position Position for the body
 * @param size Size of the fragment
 * @returns The created body
 */
function createFragmentBody(
  position: THREE.Vector3,
  size: { width: number; height: number; depth: number }
): CANNON.Body {
  // Create physics material
  const material = createPhysicsMaterial("rocketFragment");

  // Create a body with a box shape
  const body = new CANNON.Body({
    mass: 0.2, // Light weight for fragments
    material: material,
    shape: new CANNON.Box(new CANNON.Vec3(size.width / 2, size.height / 2, size.depth / 2)),
    position: new CANNON.Vec3(position.x, position.y, position.z),
    linearDamping: 0.1,
    angularDamping: 0.2
  });

  return body;
}

/**
 * Create impact flash at crash point
 * @param position Position of the flash
 * @param scene The scene to add the light to
 * @param duration Duration of the flash in milliseconds
 * @returns The created light
 */
function createImpactFlash(
  position: THREE.Vector3,
  scene: THREE.Scene,
  duration: number = 200
): THREE.PointLight {
  // Remove any existing flash light
  if (flashLight && flashLight.parent) {
    flashLight.parent.remove(flashLight);
  }

  // Create a bright point light
  flashLight = new THREE.PointLight(0xffffff, 3, 10);
  flashLight.position.copy(position);

  // Add to scene
  scene.add(flashLight);

  // Set up automatic removal
  setTimeout(() => {
    if (flashLight && flashLight.parent) {
      flashLight.parent.remove(flashLight);
      flashLight = null;
    }
  }, duration);

  return flashLight;
}

/**
 * Spawn all crash effect particles
 * @param position Position of the crash
 */
function spawnAllParticles(position: THREE.Vector3): void {
  // Spawn fire particles
  if (fireParticles) {
    fireParticles.spawn(
      position,
      new THREE.Vector3(0, 1, 0), // Upward direction
      Math.PI, // Wide spread (180 degrees)
      8, // Higher speed
      100 // Spawn many particles
    );
  }

  // Spawn smoke particles slightly above fire
  if (smokeParticles) {
    const smokePosition = position.clone().add(new THREE.Vector3(0, 0.5, 0));
    smokeParticles.spawn(
      smokePosition,
      new THREE.Vector3(0, 1, 0),
      Math.PI / 2, // Less spread than fire
      3, // Slower speed
      70 // Fewer particles
    );
  }

  // Spawn debris particles
  if (debrisParticles) {
    debrisParticles.spawn(
      position,
      new THREE.Vector3(0, 1, 0),
      Math.PI, // Full hemisphere spread
      10, // Fast speed
      40 // Fewer debris particles
    );
  }
}

/**
 * Generate rocket fragments at crash site
 * @param rocketMesh The original rocket mesh
 * @param position Crash position
 * @param scene The scene to add fragments to
 * @param lifetime Lifetime of fragments in milliseconds
 */
function generateRocketFragments(
  rocketMesh: THREE.Object3D,
  position: THREE.Vector3,
  scene: THREE.Scene,
  lifetime: number = 3000
): void {
  try {
    // Clear any existing fragments
    cleanupFragments();

    // Get material from rocket mesh
    let material: THREE.Material | null = null;

    // Find a material from the rocket mesh
    rocketMesh.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material && !material) {
        if (Array.isArray(child.material)) {
          material = child.material[0].clone();
        } else {
          material = child.material.clone();
        }
      }
    });

    // Fallback material if none found
    if (!material) {
      material = new THREE.MeshStandardMaterial({
        color: 0xcccccc,
        metalness: 0.8,
        roughness: 0.2
      });
    }

    // Determine fragment sizes based on rocket dimensions
    const box = new THREE.Box3().setFromObject(rocketMesh);
    const size = box.getSize(new THREE.Vector3());

    // Calculate dimensions for fragments
    const width = size.x * 0.4;
    const height = size.y * 0.3;
    const depth = size.z * 0.4;

    // Generate 6-8 fragments
    const fragmentCount = 6 + Math.floor(Math.random() * 3);

    for (let i = 0; i < fragmentCount; i++) {
      // Randomize fragment size
      const fragmentSize = {
        width: width * (0.5 + Math.random() * 0.8),
        height: height * (0.5 + Math.random() * 0.8),
        depth: depth * (0.5 + Math.random() * 0.8)
      };

      // Randomize fragment position around crash point
      const offset = new THREE.Vector3(
        (Math.random() - 0.5) * 1.5,
        (Math.random() - 0.5) * 1.5,
        (Math.random() - 0.5) * 1.5
      );

      const fragmentPosition = position.clone().add(offset);

      // Create fragment mesh
      const mesh = createFragmentMesh(fragmentPosition, fragmentSize, material);
      scene.add(mesh);
      fragments.meshes.push(mesh);

      // Create fragment body
      const body = createFragmentBody(fragmentPosition, fragmentSize);

      // Apply explosive impulse away from center
      const direction = offset.normalize();
      const impulse = 15 + Math.random() * 10; // 15-25 N
      body.applyImpulse(
        new CANNON.Vec3(direction.x * impulse, direction.y * impulse, direction.z * impulse),
        new CANNON.Vec3(0, 0, 0) // Apply at center of mass
      );

      // Add random angular velocity for spinning
      body.angularVelocity.set(
        (Math.random() - 0.5) * 5,
        (Math.random() - 0.5) * 5,
        (Math.random() - 0.5) * 5
      );

      // Add body to physics world
      world.addBody(body);
      fragments.bodies.push(body);
    }

    // Set fragments lifetime for cleanup
    fragments.lifetime = lifetime;
    fragments.creationTime = Date.now();
  } catch (error) {
    handleRenderingError("Failed to generate rocket fragments", error as Error);
  }
}

/**
 * Remove all fragments from scene and physics world
 */
export function cleanupFragments(): void {
  // Remove all fragment meshes from their parents
  fragments.meshes.forEach((mesh) => {
    if (mesh.parent) {
      mesh.parent.remove(mesh);
    }
  });

  // Remove all fragment bodies from the physics world
  fragments.bodies.forEach((body) => {
    world.removeBody(body);
  });

  // Clear arrays
  fragments.meshes = [];
  fragments.bodies = [];
}

/**
 * Update fragment positions based on physics bodies
 */
export function updateFragments(): void {
  // Check if fragments should be removed based on lifetime
  if (fragments.meshes.length > 0 && Date.now() - fragments.creationTime > fragments.lifetime) {
    cleanupFragments();
    return;
  }

  // Update fragment positions
  for (let i = 0; i < fragments.meshes.length; i++) {
    const mesh = fragments.meshes[i];
    const body = fragments.bodies[i];

    if (mesh && body) {
      // Update position
      mesh.position.set(body.position.x, body.position.y, body.position.z);

      // Update rotation
      mesh.quaternion.set(
        body.quaternion.x,
        body.quaternion.y,
        body.quaternion.z,
        body.quaternion.w
      );
    }
  }
}

/**
 * Create complete crash effect at a position
 * @param options Configuration options for the crash effect
 */
export function createCrashEffect(options: CrashEffectOptions): void {
  const { position, rocketMesh, scene, fragmentLifetime = 3000, flashDuration = 200 } = options;

  try {
    // Initialize particles if not already created
    if (!fireParticles || !smokeParticles || !debrisParticles) {
      initCrashEffects();
    }

    // Spawn all particle types
    spawnAllParticles(position);

    // Create rocket fragments if rocket mesh and scene provided
    if (rocketMesh && scene) {
      generateRocketFragments(rocketMesh, position, scene, fragmentLifetime);

      // Create impact flash
      createImpactFlash(position, scene, flashDuration);
    }
  } catch (error) {
    handleRenderingError("Failed to create crash effect", error as Error);
  }
}

/**
 * Update all crash effect elements
 * @param deltaTime Time since last update in seconds
 * @param camera Camera for particle system updates
 */
export function updateCrashEffects(deltaTime: number, camera: THREE.Camera): void {
  // Update all particle systems
  if (fireParticles) {
    fireParticles.update(deltaTime, camera);
  }

  if (smokeParticles) {
    smokeParticles.update(deltaTime, camera);
  }

  if (debrisParticles) {
    debrisParticles.update(deltaTime, camera);
  }

  // Update fragment positions
  updateFragments();
}

/**
 * Get all particle meshes for adding to scene
 * @returns Array of particle system meshes
 */
export function getCrashEffectMeshes(): THREE.Object3D[] {
  const meshes: THREE.Object3D[] = [];

  if (fireParticles) {
    meshes.push(fireParticles.getMesh());
  }

  if (smokeParticles) {
    meshes.push(smokeParticles.getMesh());
  }

  if (debrisParticles) {
    meshes.push(debrisParticles.getMesh());
  }

  return meshes;
}

/**
 * Dispose of all crash effect resources
 */
export function disposeCrashEffects(): void {
  if (fireParticles) {
    fireParticles.dispose();
    fireParticles = null;
  }

  if (smokeParticles) {
    smokeParticles.dispose();
    smokeParticles = null;
  }

  if (debrisParticles) {
    debrisParticles.dispose();
    debrisParticles = null;
  }

  cleanupFragments();

  if (flashLight && flashLight.parent) {
    flashLight.parent.remove(flashLight);
    flashLight = null;
  }
}
