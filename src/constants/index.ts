const LANDING_SOUND_VELOCITY_THRESHOLD = -2; // Velocity threshold to play landing sound

// Constants for game physics
const THRUST_FORCE = 15; // Force magnitude for rocket thrust
const FUEL_CONSUMPTION_RATE = -0.05; // Fuel consumed per frame when thrusting (reduced from -0.5)
const ROTATION_SPEED = 1; // Angular velocity for rotation (radians/second)
const ROTATION_DAMPING = 0.95; // Damping factor for rotation
// How often the wind changes direction (in seconds)
const WIND_CHANGE_INTERVAL = 3;
// How quickly the wind transitions to new direction (0-1, higher = faster)
const WIND_CHANGE_SPEED = 0.05;

export {
  LANDING_SOUND_VELOCITY_THRESHOLD,
  THRUST_FORCE,
  FUEL_CONSUMPTION_RATE,
  ROTATION_SPEED,
  ROTATION_DAMPING,
  WIND_CHANGE_INTERVAL,
  WIND_CHANGE_SPEED
};
