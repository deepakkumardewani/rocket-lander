### Implementation Plan to Enhance Sea Environment Realism

#### Objective

Transform the sea surface into a realistic ocean with dynamic waves, reflections, and proper lighting interaction. Redesign the cloud system to look fluffy, volumetric, and naturally integrated with the sea environment.

---

### Phase 1: Improve Sea Surface Visuals

#### Step 1: Upgrade Sea Surface Geometry ✅

- Open `src/game/SeaSurface.ts`.
- Increase the plane geometry segments from 32x32 to 128x128 for finer wave detail.
- Ensure the plane size remains 100x100 units to maintain scale.
- Ensure the sea spans the entire width of the screen so that it look real.

#### Step 2: Enhance Wave Animation in Vertex Shader ✅

- In `SeaSurface.ts`, locate the vertex shader code.
- Add two additional sine waves with different amplitudes (0.1 and 0.05) and frequencies (0.15 and 0.08) to create layered wave effects.
- Introduce a directional component to waves by multiplying x and z coordinates with weights (e.g., 0.7 for x, 0.3 for z) to simulate wind-driven waves.
- Add a time-based offset to each wave for continuous motion (multiply time by 0.5 for slower waves, 0.3 for faster ones).

#### Step 3: Improve Fragment Shader for Realism ✅

- In `SeaSurface.ts`, update the fragment shader.
- Add a fresnel effect to simulate angle-dependent reflection (use view direction and normal dot product, with a bias of 0.2 and power of 2.0).
- Introduce subtle foam highlights by thresholding wave height (e.g., above 0.15) and blending white (0xffffff) at low opacity (0.1).
- Adjust base color to a deeper blue-green (0x1e8090) for ocean-like appearance.

#### Step 4: Add Normal Mapping for Wave Detail ✅

- In `src/utils/assetLoader.ts`, add a `loadSeaNormalTexture` method to load a normal map texture (`/src/assets/textures/waternormals.jpg`).
- If the texture doesn’t exist, create a placeholder normal map using canvas (purple-blue gradient, RGB: 128, 128, 255).
- In `SeaSurface.ts`, update the fragment shader to use the normal map for lighting calculations.
- Apply the normal map with a tiling factor of 4x4 to repeat across the surface.
- Combine normal map with wave normals from the vertex shader for enhanced lighting.

#### Step 5: Enable Environment Reflection ✅

- In `src/game/sceneManager.ts`, create a `CubeCamera` for real-time environment reflections.
- Position the cube camera at y=5 above the sea surface, covering a 100x100x100 unit area.
- In `SeaSurface.ts`, add a reflection texture uniform to the shader material, using the cube camera’s render target.
- In the fragment shader, blend the reflection texture with the base color based on the fresnel effect (50% reflection contribution).
- In `GameCanvas.vue`, update the render loop to render the cube camera before the main scene each frame.

#### Step 6: Add Specular Highlights ✅

- In `SeaSurface.ts`, update the fragment shader to calculate specular highlights.
- Use a Blinn-Phong model with the directional light’s direction (from `sceneManager.ts`).
- Set specular power to 32 and intensity to 0.5 for sharp, sun-like highlights.
- Modulate specular color by wave height to avoid highlights in troughs.

<!-- #### Step 7: Optimize Sea Surface Performance

- In `SeaSurface.ts`, reduce the geometry segments to 64x64 if performance drops below 30 FPS (add a check in `GameCanvas.vue` using FPS monitoring).
- Use `THREE.BufferGeometry` with indexed vertices to optimize rendering.
- Limit shader calculations by clamping wave height and normal blending in the vertex shader. -->

---

### Phase 2: Revamp Cloud System

#### Step 8: Redesign Cloud Geometry ✅

- Open `src/game/Clouds.ts`.
- Replace `THREE.Sprite` with instanced `THREE.Mesh` using `SphereGeometry` (radius 2, 16 segments) for volumetric clouds.
- Create 20 cloud instances to balance visuals and performance.
- Randomly position clouds between y=15 and y=30, and x/z between -40 and 40.

#### Step 9: Create Fluffy Cloud Texture ✅

- In `src/utils/assetLoader.ts`, add a `loadCloudTexture` method to load a cloud texture (`/src/assets/textures/cloud.png`).
- If the texture doesn’t exist, generate a procedural texture using canvas:
  - Create a 256x256 canvas.
  - Use Perlin noise to draw soft, white (0xffffff) blobs with 0.8 opacity.
  - Add slight gray (0xcccccc) variations for depth.
- Set texture to repeat with `wrapS` and `wrapT` as `THREE.ClampToEdgeWrapping`.

#### Step 10: Apply Volumetric Cloud Material ✅

- In `Clouds.ts`, create a `THREE.ShaderMaterial` for clouds.
- In the vertex shader, offset vertex positions slightly based on time and Perlin noise for puffiness (scale offset by 0.1).
- In the fragment shader:
  - Sample the cloud texture with UV coordinates.
  - Use a soft alpha cutoff (0.3) for fluffy edges.
  - Add subtle lighting based on normal and directional light (0.2 ambient, 0.8 diffuse).
  - Apply slight blue tint (0xe6f0ff) to clouds facing away from the light.
- Enable `transparent: true` and `side: THREE.DoubleSide` for proper rendering.

#### Step 11: Animate Clouds Naturally ✅

- In `Clouds.ts`, update the cloud update method.
- Apply a slow drift (x += 0.02 per frame, scaled by delta time).
- Add vertical oscillation using a sine wave (amplitude 0.5, frequency 0.01) for gentle bobbing.
- Rotate clouds slightly (0.001 radians per frame) for dynamic motion.
- Ensure clouds loop back to x=-40 when reaching x=40 to maintain coverage.

#### Step 12: Add Cloud Shadows ✅

- In `Clouds.ts`, enable `castShadow: true` for each cloud mesh.
- In `src/game/sceneManager.ts`, ensure the directional light’s shadow map includes the cloud area (extend bounds to left: -50, right: 50, top: 50, bottom: -50).
- In `SeaSurface.ts`, set `receiveShadow: true` on the sea mesh to display cloud shadows.
- Adjust shadow bias to -0.0001 to reduce artifacts on the sea surface.

<!-- #### Step 13: Optimize Cloud Rendering

- In `Clouds.ts`, use `InstancedMesh` for clouds to reduce draw calls (combine all clouds into one instanced mesh).
- Limit cloud updates to every other frame if FPS drops below 30 (check in `GameCanvas.vue`).
- Reduce cloud count to 15 if performance issues persist. -->

---

### Phase 3: Integrate and Polish

#### Step 14: Adjust Sea Environment Lighting

- In `src/game/sceneManager.ts`, update the sea environment’s directional light.
- Set color to warm white (0xfff8e1) to simulate sunlight.
- Increase intensity to 1.5 for brighter reflections on the sea.
- Adjust ambient light to 0.5 intensity with a pale blue color (0xb0c4de) for sky influence.

#### Step 15: Enhance Sea Audio Feedback

- In `GameCanvas.vue`, adjust the sea waves audio (`/src/assets/audio/sea_waves.mp3`).
- Increase volume to 0.5 for better presence.
- Add a subtle wind sound (`/src/assets/audio/wind.mp3`) at 0.2 volume, looping, for atmosphere.
- Ensure both sounds stop when switching to the space environment.

#### Step 16: Update HUD for Visual Feedback

- In `src/components/HUD.vue`, add a subtle wave height indicator for the sea environment.
- Display “Wave Height: Low/Medium/High” based on average wave height (thresholds at 0.1 and 0.2).
- Style the indicator with a blue background (0x1e90ff, 0.5 opacity) to match the sea theme.

#### Step 17: Test Sea Surface Realism

- Run the game in the sea environment.
- Verify that waves look dynamic with varied heights and directions.
- Check that reflections show the skybox, clouds, and boat platform.
- Ensure foam and specular highlights appear under sunlight.
- Confirm that performance remains above 30 FPS.

#### Step 18: Test Cloud Appearance

- Observe clouds in the sea environment.
- Ensure they look fluffy with soft edges and subtle lighting.
- Verify that clouds cast shadows on the sea surface.
- Check that drift and bobbing animations feel natural.
- Confirm that clouds don’t cause performance drops.

#### Step 19: Add User Controls for Sea Effects

- In `src/components/EffectsPanel.vue`, add sliders for:
  - Wave height (range: 0.1 to 0.4).
  - Reflection intensity (range: 0.2 to 0.8).
  - Cloud density (range: 10 to 20 clouds).
- Bind sliders to uniforms in `SeaSurface.ts` and `Clouds.ts`.
- Update the panel to show sea-specific controls only in the sea environment.

#### Step 20: Final Integration and Cleanup

- In `GameCanvas.vue`, ensure all sea and cloud resources are disposed of when switching environments.
- Update `sceneManager.ts` to toggle between space and sea effects cleanly.
- Test environment switching to confirm no visual glitches or memory leaks.
- Verify that the sea environment feels distinct from the space environment while maintaining gameplay consistency.
