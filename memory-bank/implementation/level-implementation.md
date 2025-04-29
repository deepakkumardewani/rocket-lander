# Implementation Plan for Levels in Rocket Lander

This plan provides step-by-step instructions to implement five levels for both the space and sea environments in _Rocket Lander_, a physics-based 3D game built with Vue 3, Three.js, Cannon.js, and Pinia. Each level follows the specified designs, with unique challenges (platform size, movement, wind, gravity, fuel, obstacles, visibility). Players can only progress to the next level after successfully landing the rocket. The plan integrates with the existing flow: players select an environment, start at Level 1, and advance sequentially upon successful landings, with options to retry or return to environment selection.

---

## Step 1: Define Level Configurations ✅

- **Action:** Create a file to store level configurations for both environments.
- **Instructions:**
  - Create `src/game/levels.ts`.
  - Define a TypeScript interface `LevelConfig` with properties: `levelNumber: number`, `platformWidth: number`, `platformDepth: number`, `platformMovement?: { type: 'oscillate' | 'drift' | 'tilt'; axis?: 'x' | 'z'; amplitude: number; frequency: number }`, `windStrength: number`, `gravity: number`, `startingFuel: number`, `waveHeight?: number`, `obstacles?: { type: 'asteroid' | 'platform'; count: number; size: number }`, `visibility?: 'normal' | 'low'`.
  - Create two arrays: `spaceLevels: LevelConfig[]` and `seaLevels: LevelConfig[]` with the following:
    - **Space Levels:**
      - Level 1: `levelNumber: 1`, `platformWidth: 20`, `platformDepth: 20`, `windStrength: 0`, `gravity: -9.81`, `startingFuel: 100`.
      - Level 2: `levelNumber: 2`, `platformWidth: 10`, `platformDepth: 10`, `windStrength: 2`, `gravity: -9.81`, `startingFuel: 75`.
      - Level 3: `levelNumber: 3`, `platformWidth: 10`, `platformDepth: 10`, `platformMovement: { type: 'oscillate', axis: 'x', amplitude: 5, frequency: 0.001 }`, `windStrength: 0`, `gravity: -9.81`, `startingFuel: 50`.
      - Level 4: `levelNumber: 4`, `platformWidth: 5`, `platformDepth: 5`, `windStrength: 5`, `gravity: -9.81`, `startingFuel: 25`, `obstacles: { type: 'asteroid', count: 5, size: 2 }`.
      - Level 5: `levelNumber: 5`, `platformWidth: 3`, `platformDepth: 3`, `windStrength: 0`, `gravity: -10`, `startingFuel: 10` (gravity will be adjusted dynamically later).
    - **Sea Levels:**
      - Level 1: `levelNumber: 1`, `platformWidth: 20`, `platformDepth: 10`, `windStrength: 0`, `gravity: -9.81`, `startingFuel: 100`, `waveHeight: 0.2`.
      - Level 2: `levelNumber: 2`, `platformWidth: 15`, `platformDepth: 8`, `platformMovement: { type: 'drift', axis: 'x', amplitude: 0.01, frequency: 1 }`, `windStrength: 3`, `gravity: -9.81`, `startingFuel: 75`, `waveHeight: 0.2`.
      - Level 3: `levelNumber: 3`, `platformWidth: 10`, `platformDepth: 5`, `platformMovement: { type: 'tilt', axis: 'z', amplitude: 0.1, frequency: 0.002 }`, `windStrength: 5`, `gravity: -9.81`, `startingFuel: 50`, `waveHeight: 0.5`.
      - Level 4: `levelNumber: 4`, `platformWidth: 5`, `platformDepth: 5`, `windStrength: 3`, `gravity: -9.81`, `startingFuel: 25`, `waveHeight: 0.2`, `obstacles: { type: 'platform', count: 3, size: 5 }`.
      - Level 5: `levelNumber: 5`, `platformWidth: 5`, `platformDepth: 3`, `windStrength: 1`, `gravity: -9.81`, `startingFuel: 10`, `waveHeight: 0.2`, `visibility: 'low'`.
  - Export `spaceLevels` and `seaLevels`.
- **Test:** In `GameCanvas.vue`, import and log both arrays in `setup`. Verify the console shows all five levels per environment with correct properties (e.g., Space Level 4 has obstacles, Sea Level 5 has low visibility).

---

## Step 2: Extend Game Store with Level State ✅

- **Action:** Update the Pinia store to manage level tracking and completion.
- **Instructions:**
  - Open `src/stores/gameStore.ts`.
  - Add `currentLevel: number` to the state, initialized to 1.
  - Add `isLevelCompleted: boolean` to the state, initialized to false.
  - Add actions:
    - `setCurrentLevel(level: number)`: Updates `currentLevel` and sets `isLevelCompleted` to false.
    - `markLevelCompleted()`: Sets `isLevelCompleted` to true.
- **Test:** In `GameCanvas.vue`, call `store.setCurrentLevel(3)` and `store.markLevelCompleted()`, then log `store.currentLevel` and `store.isLevelCompleted`. Confirm outputs are 3 and true.

---

## Step 3: Load Level Configuration in GameCanvas ✅

- **Action:** Retrieve and apply the current level’s configuration.
- **Instructions:**
  - In `src/game/GameCanvas.vue`, import `spaceLevels` and `seaLevels` from `levels.ts`.
  - In `setup`, access `selectedEnvironment`, `currentLevel`, and `isLevelCompleted` from the game store.
  - Create a `computed` property `levelConfig`:
    - If `selectedEnvironment` is 'space', return the level from `spaceLevels` where `levelNumber` matches `currentLevel`.
    - If 'sea', return the matching level from `seaLevels`.
    - Return null if no environment is selected.
  - Add a check to skip game initialization if `levelConfig.value` is null.
- **Test:** Select the sea environment, log `levelConfig.value` in `setup`. Confirm it logs Sea Level 1’s config (e.g., `platformWidth: 20`, `waveHeight: 0.2`) when `currentLevel` is 1.

---

## Step 4: Configure Physics with Level Settings ✅

- **Action:** Apply level-specific gravity, wind, and wave height to the physics world.
- **Instructions:**
  - In `src/game/physics.ts`:
    - Add `setGravity(gravity: number)` to set `world.gravity.set(0, gravity, 0)`.
    - Add `windStrength: number = 0` and `setWindStrength(strength: number)` to update it.
    - In `updatePhysics`, if `windStrength > 0`, apply a random force to the rocket: `rocketBody.applyForce(new CANNON.Vec3((Math.random() - 0.5) * windStrength, 0, (Math.random() - 0.5) * windStrength), rocketBody.position)`.
  - In `src/game/SeaSurface.ts`, add a method `setWaveHeight(height: number)` to update the shader’s wave height uniform.
  - In `GameCanvas.vue`, after physics initialization in `setup`:
    - Call `setGravity(levelConfig.value.gravity)`.
    - Call `setWindStrength(levelConfig.value.windStrength)`.
    - If `selectedEnvironment` is 'sea', call `seaSurface.setWaveHeight(levelConfig.value.waveHeight)` if defined.
- **Test:** Start Sea Level 3 (windStrength: 5, waveHeight: 0.5). Confirm the rocket drifts due to wind and the sea shows higher waves compared to Level 1 (waveHeight: 0.2).

---

## Step 5: Set Rocket Fuel per Level ✅

- **Action:** Adjust the rocket’s starting fuel based on the level.
- **Instructions:**
  - In `GameCanvas.vue`, after `store.resetGame()` in game initialization, set `store.updateFuel(levelConfig.value.startingFuel)` if `levelConfig.value` exists.
- **Test:** Start Space Level 4 (25 fuel). Verify `HUD.vue` shows the fuel bar at 25% initially.

---

## Step 6: Adjust Platform Size and Type per Level ✅

- **Action:** Configure platform dimensions and type (Platform) based on the level.
- **Instructions:**
  - In `src/game/Platform.ts` ensure constructors accept `width` and `depth`.
  - In `Platform.ts`, use `new THREE.BoxGeometry(width, 1, depth)` and `new CANNON.Vec3(width / 2, 0.5, depth / 2)` for the physics shape.
  - In `GameCanvas.vue`, when initializing the platform:
    - If `selectedEnvironment` is 'space', create a `Platform` with `levelConfig.value.platformWidth` and `levelConfig.value.platformDepth`.
- **Test:** Start Space Level 5 (3x3). Confirm the platform is tiny. Switch to Sea Level 1 (20x10), confirm the boat is larger and rectangular.

---

## Step 7: Implement Platform Movement per Level

- **Action:** Add platform movement (oscillate, drift, tilt) as specified in the level config.
- **Instructions:**
  - In `Platform.ts`:
    - Add a `movement?: { type: 'oscillate' | 'drift' | 'tilt'; axis?: 'x' | 'z'; amplitude: number; frequency: number }` property and `initialPosition: CANNON.Vec3`.
    - Store `body.position.clone()` as `initialPosition` in the constructor.
    - Add an `update(time: number)` method:
      - For 'oscillate', set `body.position[axis] = initialPosition[axis] + Math.sin(time * frequency) * amplitude`.
      - For 'drift', increment `body.position[axis] += amplitude * windStrength` (use windStrength from physics).
      - For 'tilt', set `body.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 0, 1), Math.sin(time * frequency) * amplitude)`.
  - In `GameCanvas.vue`:
    - Pass `levelConfig.value.platformMovement` when creating the platform.
    - In the animation loop, call `platform.update(Date.now() / 1000)` after `updatePhysics`.
- **Test:** Start Sea Level 3 (tilt, amplitude: 0.1). Confirm the boat rocks side-to-side. Test Space Level 3 (oscillate, x-axis), confirm the platform moves left-right.

---

## Step 8: Add Obstacles for Specific Levels ✅

- **Action:** Implement asteroids (Space Level 4) and multiple platforms (Sea Level 4).
- **Instructions:**
  - Create `src/game/Obstacle.ts` with a class `Obstacle`:
    - Constructor accepts `type: 'asteroid' | 'platform'`, `size: number`, and `position: THREE.Vector3`.
    - For 'asteroid', use `THREE.SphereGeometry(size)` and `CANNON.Sphere(size)` with dynamic body (mass: 10).
    - For 'platform', use `THREE.BoxGeometry(size, 1, size)` and `CANNON.Box(new CANNON.Vec3(size / 2, 0.5, size / 2))` with static body (mass: 0).
    - Add methods `getMesh()` and `getBody()`.
  - In `GameCanvas.vue`:
    - If `levelConfig.value.obstacles` exists, create `obstacles.count` instances:
      - Randomly position within x/z: -20 to 20, y: 5 to 15.
      - Add meshes to the scene and bodies to the physics world.
    - For Sea Level 4, mark one platform as the target (store in a variable) and use it in collision detection.
  - Update `collisionHandler.ts` to:
    - Check collisions with obstacles (crash if hit asteroids or wrong platforms).
    - For Sea Level 4, only mark landing successful if the target platform is hit.
- **Test:** Start Space Level 4. Confirm 5 asteroids appear and cause a crash on collision. Start Sea Level 4, confirm 3 platforms exist, and landing succeeds only on one.

---

<!-- ## Step 9: Implement Variable Gravity for Space Level 5

- **Action:** Add fluctuating gravity for Space Level 5.
- **Instructions:**
  - In `src/game/physics.ts`, add a `setVariableGravity(baseGravity: number)` function:
    - Every 5 seconds (track with a timer), set `world.gravity.set(0, baseGravity + (Math.random() * 10 - 5), 0)` (range: -5 to -15 for base -10).
  - In `GameCanvas.vue`, for Space Level 5, call `setVariableGravity(levelConfig.value.gravity)` instead of `setGravity`.
- **Test:** Start Space Level 5. Confirm gravity changes every 5 seconds (rocket falls faster/slower). Log `world.gravity.y` to verify range (-5 to -15). -->

---

## Step 10: Implement Low Visibility for Sea Level 5

- **Action:** Reduce visibility for Sea Level 5 with a dark skybox and dim lighting.
- **Instructions:**
  - In `src/utils/assetLoader.ts`, add `loadDarkSkyboxTextures()` to create a dark blue skybox (#191970).
  - In `src/game/sceneManager.ts`:
    - Update `createEnvironmentSkybox` to use dark skybox if `visibility` is 'low'.
    - Add `setLightingIntensity(factor: number)` to scale directional and ambient light intensities.
  - In `GameCanvas.vue`, for Sea Level 5:
    - Call `sceneManager.setLightingIntensity(0.3)` to dim lights.
    - Ensure the dark skybox is loaded.
- **Test:** Start Sea Level 5. Confirm the sky is dark blue and the scene is dimly lit, making the boat harder to see compared to Level 1.

---

## Step 11: Update Collision Handler for Level Progression

- **Action:** Ensure level progression requires a successful landing.
- **Instructions:**
  - In `src/game/collisionHandler.ts`, in `checkLandingSuccess`:
    - If successful, call `store.markLevelCompleted()`.
    - If failed, keep `isLevelCompleted` as false.
  - Ensure `store.setGameState('landed')` or 'crashed' updates accordingly.
- **Test:** Land successfully on Space Level 1. Confirm `store.isLevelCompleted` is true. Crash, confirm it remains false.

---

## Step 13: Implement Level Progression Logic

- **Action:** Add UI controls for progression, requiring successful landing.
- **Instructions:**
  - In `HUD.vue`:
    - When `gameState` is 'landed' and `isLevelCompleted` is true:
      - Show “Next Level” button (disabled if `currentLevel` equals `spaceLevels.length` or `seaLevels.length`).
      - “Next Level” calls `store.setCurrentLevel(currentLevel + 1)` and `store.resetGame()`.
      - Show “Replay” button that calls `store.resetGame()`.
    - When `gameState` is 'crashed' or `isLevelCompleted` is false:
      - Show “Retry” button that calls `store.resetGame()`.
    - Add “Back to Selection” button (existing) for all states.
    - Use Tailwind classes (e.g., `bg-blue-500 text-white p-2 rounded hover:bg-blue-600`).
  - If `currentLevel` is max, show “All Levels Completed” instead of “Next Level”.
- **Test:** Land successfully on Space Level 1, confirm “Next Level” and “Replay” appear. Click “Next Level”, verify Level 2 loads (smaller platform). Crash on Level 2, confirm only “Retry” shows. Complete Level 5, confirm “All Levels Completed”.

---
