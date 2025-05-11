# Improved Prompt for Realistic Rocket Crash Effect

Enhance the crash sequence in _Rocket Lander_ to create a visually compelling and realistic explosion when the rocket crashes, while maintaining performance and ensuring seamless game reset. The crash should feel impactful, align with the game's minimalist 3D aesthetic, and integrate with the existing Three.js and Cannon.js setup.

## 1. Realistic Crash Particle Effects

Increase the visual intensity of the crash by enhancing the particle system to simulate an explosion with fire, smoke, and debris. The goal is a dramatic effect that remains performant for web browsers.

- **Particle Count and Types:**
  - Increase particle count to 200-300 (from the current unspecified amount) for the crash effect.
  - Use multiple particle types:
    - **Fire/Sparks:** 100-150 orange/yellow particles (`Points` with small glowing sprite textures, as per GDD 5.2).
    - **Smoke:** 50-100 gray particles with semi-transparent textures, fading over time.
    - **Debris:** 20-50 small geometric shapes (e.g., tiny cubes or triangles) with metallic textures.
  - Particle sizes: Randomly vary between 0.1 and 0.5 units for diversity.
- **Behavior:**
  - Emit particles from the rocket’s base (crash contact point) in a spherical or conical spread.
  - Apply initial velocities (5-15 m/s) with randomization for natural spread.
  - Add slight gravity (-2 m/s²) to debris particles for realistic fall; fire/smoke unaffected.
  - Fade particles over 1-2 seconds using alpha blending.
- **Performance Optimization:**
  - Use a single `Points` system per particle type to minimize draw calls.
  - Pre-generate particle textures (e.g., 32x32 PNGs) to avoid runtime generation.
  - Limit particle lifespan to 2 seconds to prevent memory buildup.
  - Test performance to ensure 60 FPS on mid-range hardware (GDD 10).

## 2. Rocket Destruction into Pieces

When the rocket crashes (velocity &gt; 5 m/s or tips over, per GDD 3.4), break it into fragments to simulate a realistic explosion, replacing the current intact rocket model.

- **Fragmentation:**
  - Pre-split the rocket model (`CylinderGeometry`, radius 0.5, height 2) into 5-8 fragments in code or via a pre-fractured `.glTF` model.
    - Example: Split into 2-3 cylindrical segments, 2-3 irregular shards, and 1-2 small debris pieces.
    - Ensure fragments have the same `MeshPhongMaterial` (metallic texture) as the original rocket for visual consistency.
  - On crash, replace the rocket’s `Mesh` with individual fragment meshes, each paired with a `Cannon.Body` for physics.
- **Physics and Motion:**
  - Assign each fragment a small mass (e.g., 0.1-0.2 units) to react to the explosion force.
  - Apply an explosive impulse (10-20 N) at the crash point, with randomized directions for natural scattering.
  - Add slight angular velocity to fragments for spinning effect (0.1-0.5 rad/s, randomized).
  - Fragments collide with the platform/terrain (`Cannon.World`) and settle naturally.
- **Performance Considerations:**
  - Limit fragments to 8 to reduce physics calculations (Cannon.js updates at 60 FPS, GDD 5.2).
  - Remove fragments after 3 seconds (fade out or despawn) to free resources.
  - Use simplified collision shapes (e.g., `CANNON.Box` or `CANNON.Sphere`) for fragments instead of complex meshes.
- **Visual Polish:**
  - Add a brief flash (white `PointLight`, 0.2s duration) at the crash point to enhance impact.
  - Trigger crash sound (sharp explosion, GDD 7) synchronized with the effect.
