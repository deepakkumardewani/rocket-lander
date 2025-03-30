Below is a **Tech Stack Document** for _Rocket Lander_ in Markdown format. This document outlines the chosen technologies, their roles, justifications, and integration details to guide the development process. It’s tailored to your preference for using **Vue 3**, **Tailwind CSS**, **Three.js**, and **Cannon.js**.

---

# Rocket Lander - Tech Stack Document

## 1. Overview

This document defines the technology stack for _Rocket Lander_, a physics-based 3D game where players control a rocket to land on platforms. The stack is designed to balance performance, development efficiency, and modern web capabilities, leveraging a combination of a frontend framework, styling tools, and 3D rendering/physics libraries.

---

## 2. Tech Stack

### 2.1 Core Technologies

| **Technology**   | **Version**        | **Role**             | **Purpose**                                                             |
| ---------------- | ------------------ | -------------------- | ----------------------------------------------------------------------- |
| **Vue 3**        | ^3.4.x             | Frontend Framework   | Manages UI (HUD, menus) and game state (fuel, score).                   |
| **Tailwind CSS** | ^3.4.x             | Styling Framework    | Styles UI elements with a utility-first approach.                       |
| **Three.js**     | ^0.162.x           | 3D Rendering Library | Renders 3D graphics (rocket, terrain, particle effects) in the browser. |
| **Cannon.js**    | ^0.6.x (cannon-es) | Physics Engine       | Simulates physics (gravity, collisions, rocket movement).               |

### 2.2 Development Tools

| **Tool**         | **Version** | **Purpose**                                                                |
| ---------------- | ----------- | -------------------------------------------------------------------------- |
| **Vite**         | ^5.2.x      | Build tool and dev server for fast setup and hot module replacement (HMR). |
| **Node.js**      | ^20.x       | Runtime environment for running the development server and building.       |
| **npm**          | ^10.x       | Package manager for installing dependencies.                               |
| **PostCSS**      | ^8.4.x      | Processes Tailwind CSS with autoprefixer for browser compatibility.        |
| **Autoprefixer** | ^10.4.x     | Adds vendor prefixes to CSS for broader support.                           |

### 2.3 Optional Enhancements

- **Web Audio API**: Adds sound effects (thruster hum, crash explosion) via browser-native audio.
- **ESLint + Prettier**: Enforces code style and formatting consistency.

---

## 3. Justification

### 3.1 Vue 3

- **Why:** Provides a reactive, component-based framework for managing UI and state.
- **Benefits:**
  - Reactivity for real-time HUD updates (e.g., fuel bar).
  - Modular components for reusable UI (e.g., menus, overlays).
  - Lightweight compared to alternatives like React or Angular.
- **Fit:** Ideal for organizing game logic outside the rendering loop, syncing UI with gameplay.

### 3.2 Tailwind CSS

- **Why:** Speeds up UI styling with a utility-first approach.
- **Benefits:**
  - Rapid prototyping of HUD elements (e.g., `bg-green-500 w-1/2 h-4` for a fuel bar).
  - No runtime overhead—pure CSS output.
  - Responsive design for varying screen sizes.
- **Fit:** Perfect for styling Vue components without writing custom CSS.

### 3.3 Three.js

- **Why:** Industry-standard library for WebGL-based 3D rendering.
- **Benefits:**
  - Handles complex scenes (rocket, terrain, skybox) with ease.
  - Supports particle effects, dynamic lighting, and shadows.
  - Large ecosystem with examples and community support.
- **Fit:** Core to rendering the game’s 3D visuals.

### 3.4 Cannon.js

- **Why:** Lightweight physics engine with Three.js compatibility.
- **Benefits:**
  - Simulates realistic gravity, collisions, and rocket forces.
  - Simple API for syncing physics bodies with Three.js objects.
- **Fit:** Essential for the game’s physics-based mechanics (e.g., thrust, landing).

### 3.5 Vite

- **Why:** Modern build tool optimized for Vue and fast development.
- **Benefits:**
  - Lightning-fast dev server with HMR.
  - Easy integration with Vue, Three.js, and Tailwind.
  - Small bundle size for production.
- **Fit:** Streamlines setup and improves developer experience.

---

## 4. Integration Details

### 4.1 Project Structure

```
rocket-lander/
├── public/              # Static assets (e.g., skybox images)
├── src/
│   ├── assets/         # Textures, sounds (if used)
│   ├── components/     # Vue components (HUD.vue, Menu.vue)
│   ├── game/           # Game logic (GameCanvas.vue, physics.js)
│   ├── styles/         # Tailwind CSS setup (main.css)
│   ├── App.vue         # Root component
│   └── main.js         # Entry point
├── tailwind.config.js  # Tailwind configuration
├── vite.config.js      # Vite configuration
└── package.json        # Dependencies and scripts
```

### 4.2 Setup Instructions

1. **Initialize Project:**
   ```bash
   npm init vite@latest rocket-lander --template vue
   cd rocket-lander
   npm install
   ```
2. **Install Dependencies:**
   ```bash
   npm install three cannon-es tailwindcss postcss autoprefixer
   ```
3. **Configure Tailwind:**
   ```bash
   npx tailwindcss init -p
   ```
   - Update `tailwind.config.js`:
     ```javascript
     module.exports = {
       content: ["./index.html", "./src/**/*.{vue,js,ts}"],
       theme: { extend: {} },
       plugins: [],
     };
     ```
   - Create `src/styles/main.css`:
     ```css
     @tailwind base;
     @tailwind components;
     @tailwind utilities;
     ```
   - Import in `main.js`:
     ```javascript
     import "./styles/main.css";
     ```

### 4.3 Vue + Three.js Integration

- **GameCanvas.vue:**
  ```vue
  <template>
    <div id="canvas" ref="canvasContainer"></div>
  </template>
  <script>
  import * as THREE from "three";
  import { ref, onMounted } from "vue";
  export default {
    setup() {
      const canvasContainer = ref(null);
      let scene, camera, renderer;
      onMounted(() => {
        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera(
          75,
          window.innerWidth / window.innerHeight,
          0.1,
          1000
        );
        renderer = new THREE.WebGLRenderer();
        renderer.setSize(window.innerWidth, window.innerHeight);
        canvasContainer.value.appendChild(renderer.domElement);
        animate();
      });
      function animate() {
        requestAnimationFrame(animate);
        renderer.render(scene, camera);
      }
      return { canvasContainer };
    },
  };
  </script>
  ```

### 4.4 Cannon.js Integration

- **physics.js:**
  ```javascript
  import * as CANNON from "cannon-es";
  export const world = new CANNON.World();
  world.gravity.set(0, -9.81, 0);
  export function updatePhysics() {
    world.step(1 / 60);
  }
  ```
- **Sync with Three.js (in GameCanvas.vue):**
  ```javascript
  import { world, updatePhysics } from "@/game/physics";
  const rocketBody = new CANNON.Body({ mass: 1 });
  world.addBody(rocketBody);
  const rocketMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5, 0.5, 2),
    material
  );
  scene.add(rocketMesh);
  function animate() {
    updatePhysics();
    rocketMesh.position.copy(rocketBody.position);
    renderer.render(scene, camera);
  }
  ```

### 4.5 Tailwind + Vue UI

- **HUD.vue:**
  ```vue
  <template>
    <div class="absolute top-4 left-4">
      <div class="w-64 bg-gray-200 h-4 rounded">
        <div
          class="bg-green-500 h-4 rounded"
          :style="{ width: `${fuel}%` }"
        ></div>
      </div>
      <p class="text-white">Fuel: {{ fuel }}</p>
    </div>
  </template>
  <script>
  import { ref } from "vue";
  export default {
    setup() {
      const fuel = ref(100);
      return { fuel };
    },
  };
  </script>
  ```

---

## 5. Development Workflow

### 5.1 Commands

- **Start Dev Server:** `npm run dev`
- **Build for Production:** `npm run build`
- **Preview Build:** `npm run preview`

### 5.2 Optimization

- **Three.js:** Minimize draw calls, use BufferGeometry for particles.
- **Cannon.js:** Limit physics bodies to essential objects (rocket, terrain).
- **Vue:** Use `v-show` instead of `v-if` for HUD toggling to reduce DOM updates.

---

## 6. Risks & Mitigations

- **Risk:** Performance lag with complex scenes.
  - **Mitigation:** Optimize Three.js (e.g., LOD, frustum culling) and limit physics steps.
- **Risk:** Vue learning curve for Three.js integration.
  - **Mitigation:** Start with a basic Three.js setup, then wrap in Vue components incrementally.

---

## 7. Conclusion

The combination of **Vue 3**, **Tailwind CSS**, **Three.js**, and **Cannon.js** with **Vite** provides a modern, efficient stack for _Rocket Lander_. It supports reactive UI, fast styling, robust 3D rendering, and realistic physics, all while maintaining a streamlined development process. This stack is ready to scale with additional features like audio or multiplayer if desired.

Let me know if you need help setting this up or tweaking any part!
