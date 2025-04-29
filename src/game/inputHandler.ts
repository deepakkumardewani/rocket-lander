import { handleInputError } from "../utils/errorHandler";

/**
 * InputHandler class for managing keyboard input in the game
 */
export class InputHandler {
  private keyStates: Map<string, boolean>;
  private keyPressed: Map<string, boolean>;
  private keyReleased: Map<string, boolean>;
  private boundKeydownHandler: (event: KeyboardEvent) => void;
  private boundKeyupHandler: (event: KeyboardEvent) => void;
  private initialized: boolean;

  constructor() {
    this.keyStates = new Map<string, boolean>();
    this.keyPressed = new Map<string, boolean>();
    this.keyReleased = new Map<string, boolean>();
    this.initialized = false;

    // Initialize key states for all game controls
    const gameControls = [
      "ArrowLeft",
      "ArrowRight",
      "ArrowUp",
      "ArrowDown",
      " ",
      "r",
      "R",
      "n",
      "N",
    ];
    gameControls.forEach((key) => {
      this.keyStates.set(key, false);
      this.keyPressed.set(key, false);
      this.keyReleased.set(key, false);
    });

    this.boundKeydownHandler = this.handleKeyDown.bind(this);
    this.boundKeyupHandler = this.handleKeyUp.bind(this);

    try {
      window.addEventListener("keydown", this.boundKeydownHandler);
      window.addEventListener("keyup", this.boundKeyupHandler);
      this.initialized = true;
    } catch (error) {
      handleInputError("Failed to initialize input handlers", error as Error);
    }
  }

  /**
   * Handle keydown events
   */
  private handleKeyDown(event: KeyboardEvent): void {
    // Prevent default behavior for game control keys
    if (
      [
        "ArrowLeft",
        "ArrowRight",
        "ArrowUp",
        "ArrowDown",
        " ",
        "r",
        "R",
        "n",
        "N",
      ].includes(event.key)
    ) {
      event.preventDefault();
    }

    const key = event.key;

    // If key wasn't down before, mark it as just pressed
    if (!this.isKeyDown(key)) {
      this.keyPressed.set(key, true);
    }

    // Mark key as down
    this.keyStates.set(key, true);
  }

  /**
   * Handle keyup events
   */
  private handleKeyUp(event: KeyboardEvent): void {
    const key = event.key;

    // Mark key as released
    this.keyReleased.set(key, true);

    // Mark key as not down
    this.keyStates.set(key, false);
    this.keyPressed.set(key, false);
  }

  /**
   * Check if a key is currently held down
   */
  public isKeyDown(key: string): boolean {
    return this.keyStates.get(key) === true;
  }

  /**
   * Check if a key was just pressed this frame
   */
  public isKeyPressed(key: string): boolean {
    return this.keyPressed.get(key) === true;
  }

  /**
   * Check if a key was just released this frame
   */
  public isKeyReleased(key: string): boolean {
    return this.keyReleased.get(key) === true;
  }

  /**
   * Update method to be called once per frame to reset per-frame state
   */
  public update(): void {
    this.keyPressed.clear();
    this.keyReleased.clear();
  }

  /**
   * Check if left tilt control is active
   */
  public isTiltLeft(): boolean {
    return this.isKeyDown("ArrowLeft");
  }

  /**
   * Check if right tilt control is active
   */
  public isTiltRight(): boolean {
    return this.isKeyDown("ArrowRight");
  }

  /**
   * Check if thrust control is active
   */
  public isThrust(): boolean {
    return this.isKeyDown(" "); // Spacebar
  }

  /**
   * Check if reset control was just pressed
   */
  public isResetPressed(): boolean {
    return this.isKeyPressed("r") || this.isKeyPressed("R");
  }

  /**
   * Check if next level key was just pressed
   */
  public isNextLevelPressed(): boolean {
    return this.isKeyPressed("n") || this.isKeyPressed("N");
  }

  /**
   * Check if the input handler is properly initialized
   */
  public isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Reset and reinitialize the input handler
   */
  public reset(): void {
    // Clean up existing event listeners
    this.dispose();

    // Clear all key states
    this.keyStates.clear();
    this.keyPressed.clear();
    this.keyReleased.clear();

    // Reinitialize key states for all game controls
    const gameControls = [
      "ArrowLeft",
      "ArrowRight",
      "ArrowUp",
      "ArrowDown",
      " ",
      "r",
      "R",
      "n",
      "N",
    ];
    gameControls.forEach((key) => {
      this.keyStates.set(key, false);
      this.keyPressed.set(key, false);
      this.keyReleased.set(key, false);
    });

    // Reattach event listeners
    try {
      window.addEventListener("keydown", this.boundKeydownHandler);
      window.addEventListener("keyup", this.boundKeyupHandler);
      this.initialized = true;
      console.log("InputHandler successfully reset and reinitialized");
    } catch (error) {
      handleInputError("Failed to reinitialize input handlers", error as Error);
    }
  }

  /**
   * Clean up event listeners
   */
  public dispose(): void {
    try {
      window.removeEventListener("keydown", this.boundKeydownHandler);
      window.removeEventListener("keyup", this.boundKeyupHandler);
      this.initialized = false;
    } catch (error) {
      handleInputError("Failed to remove input handlers", error as Error);
    }
  }
}

// Create and export a singleton instance for use throughout the game
const inputHandler = new InputHandler();
export default inputHandler;
