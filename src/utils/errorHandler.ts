/**
 * Types of errors that may occur in the game
 */
export enum ErrorType {
  RENDERING = "rendering",
  PHYSICS = "physics",
  INPUT = "input",
  ASSET = "asset",
  GENERAL = "general",
}

/**
 * Interface for structured error data
 */
interface ErrorData {
  type: ErrorType;
  message: string;
  originalError?: Error;
  timestamp: string;
}

/**
 * Creates a timestamp string for error logging
 */
function getTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Logs an error with additional context information
 * @param type The type of error that occurred
 * @param message A descriptive message about the error
 * @param originalError The original error object (optional)
 * @returns The error data object
 */
export function logError(
  type: ErrorType,
  message: string,
  originalError?: Error
): ErrorData {
  const errorData: ErrorData = {
    type,
    message,
    originalError,
    timestamp: getTimestamp(),
  };

  // Log to console with formatting
  console.error(
    `[${errorData.timestamp}] [${errorData.type.toUpperCase()}] ${
      errorData.message
    }`
  );

  if (originalError) {
    console.error("Original error:", originalError);
  }

  return errorData;
}

/**
 * Displays a user-friendly error message
 * Currently console-only, but could be updated to show UI elements
 * @param message The user-friendly error message to display
 */
export function displayErrorMessage(message: string): void {
  console.warn(`Error: ${message}`);
  // TODO: Add UI-based error messaging in a future update
}

/**
 * Handles rendering-related errors
 * @param message Error description
 * @param error Original error object
 */
export function handleRenderingError(message: string, error?: Error): void {
  logError(ErrorType.RENDERING, message, error);
  displayErrorMessage(
    "Failed to render graphics properly. Please refresh the page."
  );
}

/**
 * Handles physics-related errors
 * @param message Error description
 * @param error Original error object
 */
export function handlePhysicsError(message: string, error?: Error): void {
  logError(ErrorType.PHYSICS, message, error);
  displayErrorMessage(
    "Physics simulation error. Game behavior may be unpredictable."
  );
}

/**
 * Handles input-related errors
 * @param message Error description
 * @param error Original error object
 */
export function handleInputError(message: string, error?: Error): void {
  logError(ErrorType.INPUT, message, error);
  displayErrorMessage("Input handling error. Try using different controls.");
}

/**
 * Handles asset loading errors
 * @param message Error description
 * @param error Original error object
 */
export function handleAssetError(message: string, error?: Error): void {
  logError(ErrorType.ASSET, message, error);
  displayErrorMessage(
    "Failed to load game assets. Please check your connection and refresh."
  );
}

/**
 * Wraps a function with error handling
 * @param fn The function to wrap
 * @param errorType The type of error to handle if the function throws
 * @param errorMessage The error message to log if the function throws
 * @returns A wrapped function that handles errors
 */
export function withErrorHandling<T extends (...args: any[]) => any>(
  fn: T,
  errorType: ErrorType,
  errorMessage: string
): (...args: Parameters<T>) => ReturnType<T> | undefined {
  return (...args: Parameters<T>): ReturnType<T> | undefined => {
    try {
      return fn(...args);
    } catch (error) {
      logError(errorType, errorMessage, error as Error);
      displayErrorMessage(`An error occurred: ${errorMessage}`);
      return undefined;
    }
  };
}
