Below is a detailed implementation plan to extend your existing _Rocket Lander_ game by adding the requested features: a space-themed environment, neon/metallic textures for platforms, particle effects, dynamic shadows, ambient lighting, and realistic terrain. Each step is small, specific, and includes a test for validation. Following that, I’ll suggest additional features to enhance realism.

---

# Rocket Lander - Extended Features Implementation Plan

## Feature 1: Space-Themed Environment with Starry Skybox and Planetary Terrain

### Step 2: Implement Skybox Loading in AssetLoader

- Update `src/utils/assetLoader.ts` to include a method `loadSkyboxTextures`.
- Use `THREE.TextureLoader` to load the six skybox images from `src/assets/skybox`.
- Return an array of loaded textures or throw an error if any fail to load.
- Add progress tracking for skybox loading.

**Test:**

- Run the app. Log the result of `loadSkyboxTextures` to the console and confirm six textures are loaded without errors.

### Step 3: Create Skybox in SceneManager

- Update `src/game/sceneManager.ts` to include a `createSkybox` function.
- Create a `THREE.BoxGeometry` with dimensions 1000x1000x1000.
- Use the texture array from `assetLoader.ts` to create a `THREE.MeshBasicMaterial` array with `side: THREE.BackSide` for each face.
- Construct a `THREE.Mesh` with the geometry and materials.
- Add the skybox mesh to the scene.

**Test:**

- Run the app. Verify a starry skybox surrounds the scene, visible in all directions from the camera.

### Step 4: Create a Simple Planetary Terrain Mesh

- Create a new file `src/game/Terrain.ts`.
- Export a function `createTerrain` that:
  - Creates a `THREE.PlaneGeometry` with width 100, depth 100, and 32x32 segments.
  - Rotates it -90 degrees around the X-axis to lie flat.
  - Applies a `THREE.MeshPhongMaterial` with a gray color (`0x808080`).
  - Returns a `THREE.Mesh`.
- In `GameCanvas.vue`, call `createTerrain` in the `onMounted` hook and add it to the scene at position `(0, -5, 0)`.

**Test:**

- Run the app. Confirm a flat, gray plane appears below the platform, visible from the rocket’s starting position.

## Feature 2: Neon or Metallic Textures for Platforms

### Step 6: Load Platform Textures in AssetLoader

- Update `src/utils/assetLoader.ts` to include a `loadPlatformTextures` method.
- Use THREE.TextureLoader to load `metallic.png` and `neon.png`.
- Return an object with the texture or handle errors if loading fails.

### Step 7: Apply Textures to Platform

- Update `src/game/Platform.ts` to accept a texture parameter in its constructor/factory function.
- Modify the `THREE.MeshPhongMaterial` to use the provided texture (e.g., pass `metallic.png` by default).
- In `GameCanvas.vue`, load textures via `assetLoader.ts` and pass one to the platform creation function.

### Step 8: Add Texture Switching Option

- Update `src/components/HUD.vue` to include a dropdown or button for texture selection (e.g., "Metallic" and "Neon").
- Add a `textureChoice` state in the game store (`src/stores/gameStore.ts`) with options `'metallic'` and `'neon'`.
- Update `GameCanvas.vue` to re-create the platform with the selected texture when `textureChoice` changes.

## Feature 3: Particle Effects for Thrusters and Crashes

### Step 9: Create Particle System Utility

- Create a new file `src/game/particleSystem.ts`.
- Export a `ParticleSystem` class that:
  - Takes parameters for particle count, color, size, and lifetime.
  - Creates a `THREE.BufferGeometry` with position and velocity attributes for particles.
  - Uses `THREE.PointsMaterial` for rendering.
  - Includes an `update` method to move particles and fade them out over time.
- Add a method to spawn particles at a given position.

### Step 10: Add Thruster Particle Effect

- Update `src/game/Rocket.ts` to include a `thrusterParticles` property initialized with a `ParticleSystem` (orange/yellow, e.g., `0xffa500`, 50 particles).
- In `GameCanvas.vue`, in the `processInput` function:
  - When thrust is active (spacebar pressed), spawn particles at the rocket’s bottom (offset by `-1` on the Y-axis in local space).
  - Update `thrusterParticles` in the animation loop.
- Add the particle system mesh to the scene.

### Step 11: Add Crash Particle Effect

- Update `src/game/collisionHandler.ts` to include a `crashParticles` property initialized with a `ParticleSystem` (red/white, e.g., `0xff0000`, 100 particles).
- In the `setupCollisionDetection` function, spawn particles at the rocket’s position when `gameState` changes to `'crashed'`.
- Update `crashParticles` in the `GameCanvas.vue` animation loop and add its mesh to the scene.

## Feature 4: Dynamic Shadows and Ambient Lighting

### Step 12: Enable Shadow Casting in Renderer

- Update `src/game/sceneManager.ts` to set `renderer.shadowMap.enabled = true` and `renderer.shadowMap.type = THREE.PCFSoftShadowMap`.
- Ensure the renderer uses a reasonable shadow map size (e.g., 1024x1024).

**Test:**

- Run the app. Confirm no errors occur (shadows won’t be visible yet without light and object settings).

### Step 13: Add a Directional Light with Shadows

- In `src/game/sceneManager.ts`, replace or supplement existing lighting with a `THREE.DirectionalLight` (color `0xffffff`, intensity 1).
- Position it at `(10, 20, 10)` and set it to look at `(0, 0, 0)`.
- Enable `castShadow = true` and configure shadow camera bounds (e.g., `left: -20, right: 20, top: 20, bottom: -20, near: 0.1, far: 50`).

**Test:**

- Run the app. Verify the scene is lit brighter with the new light source.

### Step 14: Enable Shadow Casting and Receiving

- In `src/game/Rocket.ts`, set `rocketMesh.castShadow = true` and `rocketMesh.receiveShadow = false`.
- In `src/game/Platform.ts`, set `platformMesh.castShadow = true` and `platformMesh.receiveShadow = true`.
- In `src/game/Terrain.ts`, set `terrainMesh.receiveShadow = true`.

**Test:**

- Run the app. Tilt or thrust the rocket above the platform and confirm it casts a shadow onto the platform and terrain.

### Step 15: Add Ambient Lighting

- In `src/game/sceneManager.ts`, add a `THREE.AmbientLight` (color `0x404040`, intensity 0.3) to the scene.

**Test:**

- Run the app. Verify the scene has a subtle overall illumination, reducing harsh dark areas.

## Feature 5: Realistic Looking Terrain

### Step 16: Generate Heightmap-Based Terrain

- Update `src/game/Terrain.ts` to use a heightmap:
  - Create a 32x32 array of random height values (e.g., 0 to 5) using Perlin noise or a simple random function.
  - Modify the `PlaneGeometry` vertices’ Y positions based on the heightmap.
  - Recalculate normals for proper lighting.

**Test:**

- Run the app. Confirm the terrain is no longer flat but has varied, bumpy elevation.

### Step 17: Add Terrain Texture

- In `src/assets/textures`, add a 1024x1024 rocky terrain texture (e.g., `rocky.png`).
- Update `assetLoader.ts` to load `rocky.png`.
- In `Terrain.ts`, apply the loaded texture to the `MeshPhongMaterial`.

**Test:**

- Run the app. Verify the terrain displays a rocky texture instead of a solid color.

### Step 18: Add Physics to Terrain

- In `src/game/physics.ts`, create a `CANNON.Heightfield` body using the same 32x32 heightmap data.
- Set its position to match the visual terrain (`(0, -5, 0)`).
- Add it to the `world` as a static body (mass 0).

**Test:**

- Run the app. Let the rocket fall and confirm it collides with the uneven terrain surface, not passing through.

---

# Additional Features for Realism

Here are some suggestions to make _Rocket Lander_ more realistic beyond your requested features:

1. **Atmospheric Effects**

   - Add a subtle fog effect using `THREE.Fog` to simulate a thin planetary atmosphere.
   - Include a faint blue or orange haze near the horizon with a custom shader.

2. **Rocket Exhaust Glow**

   - Add a glowing cone mesh at the rocket’s base during thrust, using a semi-transparent `THREE.MeshBasicMaterial` with an orange color.

3. **Sound Effects**

   - Implement an audio system in `assetLoader.ts` to load and play sounds (e.g., thruster hum, crash explosion) using `THREE.Audio`.

4. **Weather Conditions**

   - Simulate wind by applying a random lateral force to the rocket’s physics body, varying over time.
   - Add visual particle effects for dust or mist blown by wind.

5. **Rocket Damage Model**

   - Track a `durability` state in the game store, reducing it on hard landings or crashes.
   - Visually indicate damage by swapping to a scratched texture or adding deformation to the rocket mesh.

6. **Dynamic Platform**
   - Make the platform movable (e.g., oscillating slowly) with a `CANNON.Body` mass > 0, adding challenge to landings.

---

This plan builds on your completed base game, enhancing it with immersive visuals, effects, and realism. Let me know if you’d like to refine any step or prioritize additional features!
