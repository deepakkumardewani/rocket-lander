# Implementation Plan: Sea Environment for Rocket Lander Game

This implementation plan outlines the steps to add a new "Sea" environment to the Rocket Lander game, featuring a sea surface, a clear blue sky with clouds, and a flat boat as the landing platform. The user will be able to select this environment before the game starts. Each step includes specific instructions and a test to validate correct implementation.

## Step 1: Update Game Store to Support Environment Selection ✅

- **Instruction**: In `src/stores/gameStore.ts`, add an `environment` state property with possible values 'space' and 'sea'. Update the `GameStateValues` interface to include this property. Add a `setEnvironment` action to update the environment state and reset the game state to 'pre-launch'.
- **Test**: In `StoreTest.vue`, add a button to toggle between 'space' and 'sea' environments. Click the button and verify that the `environment` state updates correctly and the `gameState` resets to 'pre-launch' without affecting other state properties like `fuel` or `score`.

## Step 2: Create Environment Selection UI Component ✅

- **Instruction**: Create `src/components/EnvironmentSelector.vue`. Add a dropdown menu with options 'Space' and 'Sea'. Bind the dropdown to the `environment` state in `gameStore.ts` using a two-way binding. Style the component with Tailwind classes for a clean, centered layout. Add a "Start Game" button that remains disabled until an environment is selected.
- **Test**: In `App.vue`, temporarily replace the game content with `EnvironmentSelector.vue`. Load the app, verify the dropdown displays 'Space' and 'Sea', and check that selecting an option updates the store’s `environment` state. Ensure the "Start Game" button is disabled until a selection is made, then enables after choosing an environment.

## Step 3: Update App.vue to Handle Environment Selection ✅

- **Instruction**: In `App.vue`, add logic to render `EnvironmentSelector.vue` when the game is not started (no environment selected or `gameState` is 'pre-launch'). When the "Start Game" button is clicked, hide the selector and render `GameCanvas.vue`. Add a method to reset the game and show the selector when the game ends (landed or crashed).
- **Test**: Load the app and verify that `EnvironmentSelector.vue` appears initially. Select 'Sea' and click "Start Game" to ensure `GameCanvas.vue` appears and the selector disappears. Crash the rocket and confirm the selector reappears with the last selected environment pre-filled.

## Step 4: Create Sea Surface Component

- **Instruction**: Create `src/game/SeaSurface.ts`. Implement a class that generates a plane geometry (100x100 units) for the sea. Use `THREE.MeshPhongMaterial` with a blue color (`0x1e90ff`) and slight transparency (`opacity: 0.8`). Add subtle wave animation using a vertex shader to displace vertices based on time and position. Position the plane at y=0.
- **Test**: Temporarily add the `SeaSurface` to `GameCanvas.vue` in the `space` environment. Load the game and verify a blue, semi-transparent plane appears at y=0. Check that the surface shows gentle wave movements without performance lag. Remove the temporary code after testing.

## Step 5: Add Sea Surface to Physics World

- **Instruction**: In `src/game/SeaSurface.ts`, create a static `CANNON.Body` with mass=0 and a `CANNON.Plane` shape matching the visual plane’s dimensions. Position the physics body at y=0 and set it to be non-collidable (for visual effect only, not for landing). Add methods to get the mesh and body, and integrate into `GameCanvas.vue`’s physics world when the 'sea' environment is selected.
- **Test**: In `GameCanvas.vue`, set the environment to 'sea' and add the sea surface. Drop a test physics object (e.g., a cube) from above the sea. Verify the object passes through the sea surface without collision and the sea mesh renders correctly with waves.

## Step 6: Create Boat Platform Component

- **Instruction**: Create `src/game/BoatPlatform.ts`. Implement a class that generates a rectangular box geometry (10x20x1 units) for a flat boat. Use `THREE.MeshPhongMaterial` with a wooden brown color (`0x8b4513`). Position the boat at y=0.5 to float on the sea. Create a static `CANNON.Body` with mass=0 and a `CANNON.Box` shape matching the geometry. Add methods to get the mesh and body.
- **Test**: Temporarily add the `BoatPlatform` to `GameCanvas.vue` in the 'space' environment. Load the game and verify a brown rectangular boat appears at y=0.5. Drop a test physics object onto the boat and confirm it collides and rests on the surface without falling through.

## Step 7: Update Platform Logic for Environment

- **Instruction**: In `GameCanvas.vue`, modify the platform initialization to check the `environment` state. If 'space', create `Platform.ts` as before. If 'sea', create `BoatPlatform.ts`. Update the collision detection in `collisionHandler.ts` to use the boat as the landing surface in the 'sea' environment, reusing existing landing criteria (velocity, angle).
- **Test**: Set the environment to 'sea' in the store and start the game. Verify the boat appears instead of the space platform. Land the rocket on the boat and confirm the collision detection triggers correctly, updating the game state to 'landed' or 'crashed' based on velocity and angle.

## Step 8: Create Clear Blue Skybox

- **Instruction**: In `src/utils/assetLoader.ts`, add a `loadSeaSkyboxTextures` method to load six blue sky textures (e.g., solid light blue `#87ceeb` for top, sides, and bottom). In `src/game/sceneManager.ts`, add a `createSeaSkybox` method to create a skybox mesh with these textures, sized to match the space skybox. Update `createSkybox` to select the appropriate skybox based on the `environment` state.
- **Test**: Set the environment to 'sea' and start the game. Verify the skybox renders as a uniform light blue around the scene. Rotate the camera to check all six faces are consistent and there are no seams or distortions.

## Step 9: Create Cloud System

- **Instruction**: Create `src/game/Clouds.ts`. Implement a class that generates 10-15 cloud objects using `THREE.Sprite` with a fluffy white texture (`0xffffff`, semi-transparent). Randomly position clouds between y=20 and y=40, spread across x and z (-50 to 50). Add a slow drift animation (move clouds along x-axis using time-based offset). Add methods to update and dispose of clouds.
- **Test**: Add the `Clouds` class to `GameCanvas.vue` in the 'sea' environment. Start the game and verify 10-15 white, semi-transparent clouds appear in the sky at varying heights. Observe for 30 seconds to confirm clouds drift slowly without disappearing or causing performance issues.

## Step 10: Integrate Sea Environment into SceneManager

- **Instruction**: In `src/game/sceneManager.ts`, update the scene initialization to check the `environment` state. For 'sea', call methods to create the sea surface, boat platform, sea skybox, and clouds instead of space-specific elements (terrain, celestial objects, etc.). Ensure proper disposal of all sea-specific resources in the cleanup method.
- **Test**: Start the game with the 'sea' environment. Verify the sea surface, boat platform, blue skybox, and clouds all render correctly. Switch to 'space' and confirm no sea elements remain. Crash the game in 'sea' and restart to ensure all elements reinitialize without errors.

## Step 11: Update Lighting for Sea Environment

- **Instruction**: In `src/game/sceneManager.ts`, adjust lighting for the 'sea' environment. Use a `THREE.DirectionalLight` positioned at (10, 20, 10) with intensity 1.2 and color `0xffffff` for bright daylight. Set `castShadow=true` for the boat and sea surface. Use a `THREE.AmbientLight` with color `0x404040` and intensity 0.4. Select lighting based on the `environment` state.
- **Test**: Start the game in the 'sea' environment. Verify the scene is brightly lit with a white directional light and subtle ambient light. Check that the boat casts a shadow on the sea surface when the rocket is above it. Switch to 'space' and confirm the lighting reverts to space settings.

## Step 12: Update HUD for Environment Context

- **Instruction**: In `src/components/HUD.vue`, add a display for the current environment ('Space' or 'Sea') at the top-left corner. Use Tailwind classes for styling (e.g., bold white text with a dark outline). Update the platform-related text to say "Boat" instead of "Platform" when in the 'sea' environment (e.g., in crash messages).
- **Test**: Start the game in the 'sea' environment. Verify the HUD shows "Sea" in the top-left corner. Crash the rocket and check that the message references the "Boat" (e.g., "Crashed into Boat"). Switch to 'space' and confirm the HUD shows "Space" and mentions "Platform".

## Step 13: Add Boat Texture

- **Instruction**: In `src/utils/assetLoader.ts`, add a `loadBoatTexture` method to load a wooden texture (e.g., 256x256 PNG) from `src/assets/textures/boat_wood.png`. In `src/game/BoatPlatform.ts`, update the constructor to accept the texture and apply it to the material. Update `GameCanvas.vue` to load and pass the texture when creating the boat in the 'sea' environment.
- **Test**: Start the game in the 'sea' environment. Verify the boat displays with a wooden texture instead of a solid brown color. Check that the texture aligns correctly without stretching. If the texture fails to load, confirm the boat falls back to the brown material.

## Step 14: Add Sea Environment Sound

- **Instruction**: In `src/utils/assetLoader.ts`, add a `loadSeaAudio` method to load a looping ambient sea wave sound from `src/assets/audio/sea_waves.mp3`. In `GameCanvas.vue`, play the sound when the 'sea' environment is active and stop it when switching environments or unmounting. Adjust volume to 0.3 for subtlety.
- **Test**: Start the game in the 'sea' environment and listen for a looping sea wave sound at low volume. Switch to 'space' and verify the sound stops. Restart the 'sea' environment and confirm the sound resumes without delay or overlap.

## Step 15: Test Environment Switching

- **Instruction**: In `GameCanvas.vue`, ensure all environment-specific objects (sea surface, boat, clouds, skybox, lighting, audio) are properly disposed of when the environment changes or the component unmounts. Update the game reset logic to reinitialize the correct environment based on the store’s `environment` state.
- **Test**: Start in 'sea', verify all sea elements (boat, sea, clouds, sound). Use the selector to switch to 'space' and confirm all sea elements disappear, replaced by space elements. Switch back to 'sea' and ensure all elements reappear correctly. Crash and reset in 'sea' to confirm the environment persists.

## Step 16: Final Integration Testing

- **Instruction**: Perform a full game cycle test in the 'sea' environment. Start the game, fly the rocket, thrust, tilt, and attempt to land on the boat. Verify all mechanics (input, physics, collision, scoring) work as in the 'space' environment. Check that HUD, lighting, and visuals are consistent.
- **Test**: Play a full game in 'sea'. Confirm the rocket moves and lands correctly on the boat, with proper collision detection and scoring. Verify the HUD shows fuel, score, and 'Sea' correctly. Check that waves, clouds, and lighting remain stable. Repeat in 'space' to ensure no regressions.
