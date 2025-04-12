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
