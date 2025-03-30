# Rocket Lander - Architecture Document

## Project Structure

The Rocket Lander project follows a component-based architecture using Vue 3's Composition API and Pinia for state management. Below is an overview of the project's structure and the purpose of each file.

## Core Architecture

### State Management

- **`src/stores/gameStore.js`**: Central state management for the game using Pinia. This store maintains the game's reactive state and provides actions to modify it. The store follows a single source of truth pattern, where all game-related state is managed in one place rather than being distributed across components.

#### State Properties

- `fuel`: Tracks the rocket's remaining fuel (0-100).
- `score`: Tracks the player's current score.
- `isLanded`: Boolean flag indicating if the rocket has landed successfully.
- `gameState`: Enum-like string representing the current state of the game ('pre-launch', 'flying', 'landed', 'crashed').

#### Actions

- `updateFuel`: Modifies the fuel amount with bounds checking.
- `calculateScore`: Calculates the score based on landing precision, remaining fuel, and landing velocity.
- `setGameState`: Updates the game state and associated properties.
- `resetGame`: Resets all state properties to their initial values.

### Design Patterns

1. **Store Pattern**: Using Pinia implements a centralized store pattern, providing a single source of truth for game state.
2. **Composition Pattern**: Using Vue 3's Composition API allows for better code organization and reuse of logic.
3. **Observer Pattern**: The reactive state in Pinia automatically notifies components when state changes.
4. **Command Pattern**: Store actions serve as commands that modify the game state in well-defined ways.

### State Flow

```
Component Events → Store Actions → State Updates → UI Updates
```

For example:

- User presses spacebar → Game component calls `updateFuel(-amount)` → Store updates fuel value → HUD component reactively updates to show new fuel level

### Planned Components

The architecture will include these upcoming components:

- **GameCanvas.vue**: Main game container managing the 3D scene
- **Rocket.js**: Controls for rocket behavior and physics
- **Platform.js**: Landing platform definitions
- **HUD.vue**: Heads-up display showing game metrics
- **inputHandler.js**: Input management and abstraction

## File Structure

The project is organized as follows:

```
rocket-lander/
├── src/
│   ├── assets/            # Static assets (textures, sounds)
│   ├── components/        # Vue components
│   │   ├── StoreTest.vue  # Testing component for store functionality
│   │   └── HUD.vue        # (Planned) Game HUD component
│   ├── game/              # (Planned) Game-specific logic
│   ├── stores/            # Pinia stores
│   │   └── gameStore.js   # Game state management
│   ├── utils/             # (Planned) Utility functions
│   ├── App.vue            # Main application component
│   ├── main.ts            # Application entry point
│   └── style.css          # Global styles and Tailwind directives
└── memory-bank/           # Project documentation
    ├── architecture.md    # This document
    ├── game-design-doc.md # Game design document
    ├── progress.md        # Implementation progress tracking
    └── tech-stack.md      # Technology stack description
```

## Design Considerations

1. **State Isolation**: Game state is isolated in the store, separating it from the presentation logic.
2. **Testability**: The store can be tested independently from the UI components.
3. **Extensibility**: New game features can be added by extending the store with additional state and actions.
4. **Performance**: Using Pinia instead of Vuex improves performance due to its lighter weight and better TypeScript support.

## Future Considerations

- Consider using TypeScript interfaces to define the shape of state objects for better type safety.
- Implement derived state using Pinia getters for complex calculations.
- Use localStorage or IndexedDB for persistence of high scores or game settings.
