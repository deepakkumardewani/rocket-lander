# Rocket Lander - Game Design Document

## 1. Game Overview

### 1.1 Concept

_Rocket Lander_ is a physics-based, single-player game where the player controls a rocket with the goal of landing it safely on a designated platform. The challenge lies in managing thrust, tilt, and limited fuel while overcoming environmental obstacles like gravity, wind, and moving terrain. Success is measured by landing precision, remaining fuel, and soft touchdown velocity, offering a mix of skill, strategy, and replayability.

### 1.2 Genre

- Physics-based Simulation
- Arcade / Skill Game

### 1.3 Platform

- Web Browser (using Three.js and WebGL)

### 1.4 Target Audience

- Casual gamers who enjoy skill-based challenges.
- Developers learning 3D game development with Three.js.
- Ages 10+ (simple controls, moderate difficulty).

### 1.5 Unique Selling Points

- Realistic physics-based rocket control.
- Procedurally generated or dynamic landing environments.
- Immersive 3D visuals with particle effects and starry skybox.
- Progressive difficulty with engaging level design.

---

## 2. Gameplay

### 2.1 Core Loop

1. **Launch:** The rocket starts mid-air above a landing zone.
2. **Control:** The player adjusts thrust and tilt to guide the rocket.
3. **Land:** The player attempts to touch down on the platform softly and accurately.
4. **Score:** Points are awarded based on precision, fuel left, and landing velocity.
5. **Retry/Progress:** The player retries for a better score or advances to the next level.

### 2.2 Objectives

- Primary: Land the rocket on the platform without crashing.
- Secondary: Maximize score by landing precisely, conserving fuel, and minimizing impact velocity.

### 2.3 Win/Loss Conditions

- **Win:** Rocket lands on the platform with velocity < 5 m/s and remains upright.
- **Loss:** Rocket crashes (velocity > 5 m/s), misses the platform, or runs out of fuel mid-flight.

---

## 3. Mechanics

### 3.1 Player Controls

- **Spacebar:** Activates main thruster (hold to increase thrust, release to reduce).
- **Left/Right Arrows (A/D):** Tilts rocket left or right for lateral movement.
- **Up/Down Arrows (W/S) [Optional]:** Fine-tunes forward/backward tilt.

### 3.2 Rocket Physics

- **Thrust:** Applies upward force (e.g., 15 N) when active, counteracting gravity.
- **Tilt:** Rotates rocket orientation, redirecting thrust for lateral movement.
- **Gravity:** Constant downward force (default: -9.81 m/s², adjustable per level).
- **Mass:** Rocket weighs 1 unit, affected by thrust and gravity.

### 3.3 Fuel System

- **Starting Fuel:** 100 units.
- **Consumption:** 1 unit per frame while thrusting (adjustable).
- **Effect:** Thrust stops when fuel reaches 0.

### 3.4 Scoring

- **Precision:** 100 points for center landing, decreasing to 0 at platform edge.
- **Fuel Bonus:** 1 point per remaining fuel unit.
- **Velocity Bonus:** Full points for <1 m/s, scales down to 0 at 5 m/s.
- **Crash Penalty:** 0 points if velocity > 5 m/s or rocket tips over.

### 3.5 Environmental Factors

- **Terrain:** Randomly generated hills/craters or static platforms.
- **Moving Platforms:** Oscillate (e.g., sinusoidal motion) in later levels.
- **Wind [Optional]:** Random horizontal force applied periodically (e.g., 0 to 5 N).

---

## 4. Game World

### 4.1 Setting

- A space-themed environment with a starry skybox and planetary terrain.
- Levels represent different celestial bodies (e.g., moon, asteroid, Mars-like planet).

### 4.2 Visual Style

- Minimalist 3D with clean geometry (cylinders, planes, boxes).
- Neon or metallic textures for rocket and platforms.
- Particle effects for thrusters (orange/yellow) and crashes (red/white).
- Dynamic shadows and ambient lighting for depth.

### 4.3 Levels

1. **Level 1:** Large static platform, no wind, full fuel.
2. **Level 2:** Medium platform, mild wind, 75% fuel.
3. **Level 3:** Small platform, moving slightly, 50% fuel.
4. **Level 4:** Tiny platform, strong wind, 25% fuel.
5. **Level 5:** Moving platform, variable gravity, minimal fuel.

---

## 5. Technical Design

### 5.1 Engine & Libraries

- **Three.js:** Core rendering engine for 3D graphics and WebGL.
- **Cannon.js:** Physics engine for gravity, collisions, and forces.
- **Web Audio API [Optional]:** For thruster and crash sound effects.

### 5.2 Core Systems

#### Scene Setup

- **Scene:** `THREE.Scene` for all objects.
- **Camera:** `PerspectiveCamera` positioned above/behind rocket, tracking its movement.
- **Renderer:** `WebGLRenderer` with antialiasing and shadow support.

#### Rocket

- **Model:** `CylinderGeometry` (0.5 radius, 2 height) with `MeshPhongMaterial`.
- **Physics:** `Cannon.Body` (mass: 1) with cylinder shape, synced to Three.js mesh.
- **Controls:** Keyboard events apply forces/rotations to physics body.

#### Terrain/Platforms

- **Terrain:** `PlaneGeometry` (50x50) with random vertex displacement for hills.
- **Platform:** `BoxGeometry` (variable size) with static `Cannon.Body`.
- **Movement:** Animate platform position using `Math.sin()` for oscillation.

#### Physics

- **World:** `Cannon.World` with gravity (-9.81 m/s²).
- **Step:** Update physics at 60 FPS (`world.step(1/60)`).
- **Collisions:** Detect rocket-platform contact, evaluate velocity.

#### Effects

- **Particles:** `Points` with custom texture for thrusters and explosions.
- **Lighting:** `DirectionalLight` (sun) + `AmbientLight` for soft fill.

### 5.3 Sample Pseudocode

```javascript
// Setup
scene = new THREE.Scene();
camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
renderer = new THREE.WebGLRenderer({ antialiasing: true });
world = new CANNON.World();
world.gravity.set(0, -9.81, 0);

// Rocket
rocketMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 2), material);
rocketBody = new CANNON.Body({ mass: 1 });
rocketBody.addShape(new CANNON.Cylinder(0.5, 0.5, 2));
world.addBody(rocketBody);

// Game Loop
function update() {
  if (spacebarPressed && fuel > 0) {
    rocketBody.applyForce(new CANNON.Vec3(0, 15, 0), rocketBody.position);
    fuel -= 1;
  }
  if (leftArrow) rocketBody.quaternion.rotateZ(0.05);
  world.step(1 / 60);
  rocketMesh.position.copy(rocketBody.position);
  renderer.render(scene, camera);
}
```

---

## 6. User Interface

### 6.1 HUD

- **Fuel Bar:** Top-left, depletes as fuel is used (HTML/CSS or Three.js `Sprite`).
- **Velocity:** Bottom-left, shows current downward speed (e.g., “2.3 m/s”).
- **Score:** Post-landing overlay with breakdown (e.g., “Precision: 80, Fuel: 20”).

### 6.2 Menus

- **Main Menu:** Start, Levels, Exit.
- **Post-Landing:** Score display, Retry, Next Level.

---

## 7. Audio [Optional]

- **Thruster:** Low hum when active (Web Audio API).
- **Crash:** Sharp explosion sound on failure.
- **Landing:** Soft thud for success.
- **Background:** Ambient space drone or silence for focus.

---

## 8. Development Roadmap

### 8.1 Milestones

1. **Prototype (Week 1-2):**
   - Basic rocket with thrust control.
   - Static platform landing.
   - Simple physics (gravity, collision).
2. **Core Gameplay (Week 3-4):**
   - Add fuel system and scoring.
   - Implement tilt controls.
   - Random terrain generation.
3. **Polish (Week 5-6):**
   - Particle effects for thrusters/crashes.
   - Dynamic platforms and wind.
   - UI/HUD integration.
4. **Levels & Testing (Week 7-8):**
   - Design 5 levels with escalating difficulty.
   - Bug fixes and playtesting.

### 8.2 Stretch Goals

- Multiplayer mode (compete for best landing score).
- Customizable rocket skins.
- Procedural planet generation with unique visuals.

---

## 9. Art & Assets

### 9.1 3D Models

- **Rocket:** Simple cylinder or cone (in-game or Blender export as `.glTF`).
- **Platform:** Flat box with texture (e.g., green neon grid).
- **Terrain:** Plane with rocky texture or vertex displacement.

### 9.2 Textures

- **Skybox:** 6 starry images (free assets online).
- **Rocket:** Metallic or matte finish.
- **Particles:** Small glowing sprites (orange for thrust, red for crash).

---

## 10. Success Metrics

- **Completion Rate:** Players reach Level 3+.
- **Replayability:** Average 3+ retries per level.
- **Performance:** Runs at 60 FPS on mid-range hardware.
