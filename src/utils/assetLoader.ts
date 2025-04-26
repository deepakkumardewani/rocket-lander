import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { handleAssetError } from "./errorHandler";

// Types of assets that can be loaded
export enum AssetType {
  TEXTURE = "texture",
  MODEL = "model",
  AUDIO = "audio",
}

// Interface for asset data
export interface AssetData {
  type: AssetType;
  url: string;
  key: string;
}

// Interface for a loaded asset
export interface LoadedAsset {
  key: string;
  type: AssetType;
  data: THREE.Texture | THREE.Object3D | AudioBuffer;
}

// Interface for platform textures
export interface PlatformTextures {
  metal: THREE.Texture;
  neon: THREE.Texture;
}

// Class to manage asset loading
export class AssetLoader {
  private textures: Map<string, THREE.Texture>;
  private models: Map<string, THREE.Object3D>;
  private audio: Map<string, AudioBuffer>;
  public loadingManager: THREE.LoadingManager;
  private textureLoader: THREE.TextureLoader;
  private modelLoader: GLTFLoader;
  private audioContext: AudioContext | null;
  private loadedTextures: Map<string, THREE.Texture>;
  private loadedSkyboxTextures: THREE.Texture[];
  private loadedSeaSkyboxTextures: THREE.Texture[];
  private seaNormalTexture: THREE.Texture | null = null;
  private activeSources: Map<string, AudioBufferSourceNode>;

  constructor() {
    this.textures = new Map();
    this.models = new Map();
    this.audio = new Map();
    this.activeSources = new Map();

    // Create a loading manager to track progress across all assets
    this.loadingManager = new THREE.LoadingManager();
    this.setupLoadingManager();

    // Initialize loaders
    this.textureLoader = new THREE.TextureLoader(this.loadingManager);
    this.modelLoader = new GLTFLoader(this.loadingManager);

    // Initialize audio context (lazy loading)
    this.audioContext = null;

    this.loadedTextures = new Map();
    this.loadedSkyboxTextures = [];
    this.loadedSeaSkyboxTextures = [];
  }

  // Set up the loading manager with progress and error handlers
  private setupLoadingManager(): void {
    // Track overall loading progress
    // this.loadingManager.onProgress = (_, itemsLoaded, itemsTotal) => {
    //   // const progress = Math.round((itemsLoaded / itemsTotal) * 100);
    //   // console.log(`Loading: ${progress}% (${url})`);
    // };

    // Handle loading errors
    this.loadingManager.onError = (url) => {
      handleAssetError(`Failed to load asset: ${url}`);
    };
  }

  // Initialize audio context (must be called after user interaction)
  public initAudioContext(): void {
    try {
      this.audioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
    } catch (error) {
      handleAssetError("Could not create audio context", error as Error);
    }
  }

  // Load multiple assets and return a promise that resolves when all are loaded
  public loadAssets(assets: AssetData[]): Promise<LoadedAsset[]> {
    const promises = assets.map((asset) => this.loadAsset(asset));
    return Promise.all(promises);
  }

  // Load a single asset based on its type
  private loadAsset(asset: AssetData): Promise<LoadedAsset> {
    switch (asset.type) {
      case AssetType.TEXTURE:
        return this.loadTexture(asset.url, asset.key);
      case AssetType.MODEL:
        return this.loadModel(asset.url, asset.key);
      case AssetType.AUDIO:
        return this.loadAudio(asset.url, asset.key);
      default:
        return Promise.reject(new Error(`Unknown asset type: ${asset.type}`));
    }
  }

  // Load a texture and store it in the textures map
  private loadTexture(url: string, key: string): Promise<LoadedAsset> {
    return new Promise((resolve, reject) => {
      this.textureLoader.load(
        url,
        (texture) => {
          this.textures.set(key, texture);
          resolve({
            key,
            type: AssetType.TEXTURE,
            data: texture,
          });
        },
        undefined,
        (error) => {
          handleAssetError(
            `Failed to load texture: ${url}`,
            error instanceof Error ? error : new Error(String(error))
          );
          reject(error);
        }
      );
    });
  }

  // Load a 3D model and store it in the models map
  private loadModel(url: string, key: string): Promise<LoadedAsset> {
    return new Promise((resolve, reject) => {
      this.modelLoader.load(
        url,
        (gltf: GLTF) => {
          try {
            const model = gltf.scene;

            // Validate the model
            if (!model) {
              throw new Error("Model scene is empty");
            }

            this.models.set(key, model);
            resolve({
              key,
              type: AssetType.MODEL,
              data: model,
            });
          } catch (error) {
            handleAssetError(
              `Error processing model ${key}: ${
                error instanceof Error ? error.message : String(error)
              }`,
              error instanceof Error ? error : new Error(String(error))
            );
            reject(error);
          }
        },
        (_) => {
          // if (progress.lengthComputable) {
          //   const percentComplete = (progress.loaded / progress.total) * 100;
          //   console.log(
          //     `Loading model ${key}: ${Math.round(percentComplete)}%`
          //   );
          // }
        },
        (err: unknown) => {
          const errorMessage = `Failed to load model ${key} from ${url}: ${
            err instanceof Error ? err.message : String(err)
          }`;
          console.error("Model loading error details:", err);
          handleAssetError(
            errorMessage,
            err instanceof Error ? err : new Error(String(err))
          );
          reject(new Error(errorMessage));
        }
      );
    });
  }

  // Load an audio file and store it in the audio map
  private loadAudio(url: string, key: string): Promise<LoadedAsset> {
    return new Promise((resolve, reject) => {
      // Ensure audio context is initialized
      if (!this.audioContext) {
        this.initAudioContext();

        if (!this.audioContext) {
          const error = new Error("Audio context not available");
          handleAssetError(
            "Could not load audio: audio context not available",
            error
          );
          reject(error);
          return;
        }
      }

      fetch(url)
        .then((response) => {
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          return response.arrayBuffer();
        })
        .then((arrayBuffer) => {
          if (!this.audioContext) {
            throw new Error("Audio context not available");
          }
          return this.audioContext.decodeAudioData(arrayBuffer);
        })
        .then((audioBuffer) => {
          this.audio.set(key, audioBuffer);
          resolve({
            key,
            type: AssetType.AUDIO,
            data: audioBuffer,
          });
        })
        .catch((error) => {
          handleAssetError(
            `Failed to load audio: ${url}`,
            error instanceof Error ? error : new Error(String(error))
          );
          reject(error);
        });
    });
  }

  // Get a loaded texture by key
  public getTexture(key: string): THREE.Texture | undefined {
    return this.textures.get(key);
  }

  // Get a loaded model by key
  public getModel(key: string): THREE.Object3D | undefined {
    return this.models.get(key);
  }

  // Get a loaded audio by key
  public getAudio(key: string): AudioBuffer | undefined {
    return this.audio.get(key);
  }

  // Play audio by key
  public playAudio(key: string, loop = false, volume = 1.0): void {
    try {
      const audioBuffer = this.audio.get(key);

      if (!audioBuffer || !this.audioContext) {
        console.warn(
          `Cannot play audio: ${key} - Asset or audio context not available`
        );
        return;
      }

      // Stop any previously playing instances of this sound
      this.stopAudio(key);

      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.loop = loop;

      // Create a gain node for volume control
      const gainNode = this.audioContext.createGain();
      gainNode.gain.value = volume;

      // Connect the source to the gain node and the gain node to the destination
      source.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      source.start(0);

      // Store the source for potential stopping later
      this.activeSources.set(key, source);

      // When the source ends naturally, remove it from active sources
      source.onended = () => {
        this.activeSources.delete(key);
      };
    } catch (error) {
      handleAssetError(
        `Failed to play audio: ${key}`,
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  // Stop audio by key
  public stopAudio(key: string): void {
    try {
      const source = this.activeSources.get(key);
      if (source) {
        source.stop();
        this.activeSources.delete(key);
      }
    } catch (error) {
      handleAssetError(
        `Failed to stop audio: ${key}`,
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  // Dispose of loaded assets to free memory
  public dispose(): void {
    // Stop all playing audio
    this.activeSources.forEach((source) => {
      try {
        source.stop();
      } catch (error) {
        // Ignore errors when stopping audio during disposal
      }
    });
    this.activeSources.clear();

    // Dispose textures
    this.textures.forEach((texture) => texture.dispose());
    this.textures.clear();

    // Models don't have a direct dispose method, but their geometries and materials do
    this.models.forEach((model) => {
      model.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          if (child.geometry) child.geometry.dispose();

          if (child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach((material) => material.dispose());
            } else {
              child.material.dispose();
            }
          }
        }
      });
    });
    this.models.clear();

    // Audio buffers don't need explicit disposal
    this.audio.clear();

    // Close audio context if it exists
    if (this.audioContext && this.audioContext.state !== "closed") {
      this.audioContext.close();
    }

    this.loadedTextures.forEach((texture) => texture.dispose());
    this.loadedTextures.clear();
    this.loadedSkyboxTextures.forEach((texture) => texture.dispose());
    this.loadedSkyboxTextures = [];
    this.loadedSeaSkyboxTextures.forEach((texture) => texture.dispose());
    this.loadedSeaSkyboxTextures = [];

    // Dispose of the sea normal texture
    if (this.seaNormalTexture) {
      this.seaNormalTexture.dispose();
      this.seaNormalTexture = null;
    }
  }

  /**
   * Load skybox textures and create a CubeTexture
   * @returns Promise that resolves with an array of 6 textures for skybox
   */
  public async loadSkyboxTextures(): Promise<THREE.Texture[]> {
    try {
      // If textures already loaded, return them
      if (this.loadedSkyboxTextures.length === 6) {
        return this.loadedSkyboxTextures;
      }

      const paths = [
        "/src/assets/skybox/space/right.png", // positive x
        "/src/assets/skybox/space/left.png", // negative x
        "/src/assets/skybox/space/top.png", // positive y
        "/src/assets/skybox/space/bottom.png", // negative y
        "/src/assets/skybox/space/front.png", // positive z
        "/src/assets/skybox/space/back.png", // negative z
      ];

      // Load each texture separately
      const promises = paths.map((path) => {
        return new Promise<THREE.Texture>((resolve, reject) => {
          this.textureLoader.load(
            path,
            (texture) => {
              resolve(texture);
            },
            undefined,
            (error) => {
              reject(
                new Error(`Failed to load skybox texture: ${path} - ${error}`)
              );
            }
          );
        });
      });

      // Wait for all textures to load
      this.loadedSkyboxTextures = await Promise.all(promises);
      return this.loadedSkyboxTextures;
    } catch (error) {
      handleAssetError(
        "Failed to load skybox textures",
        error instanceof Error ? error : new Error(String(error))
      );
      // Return an array of placeholder textures (black) in case of error
      return Array(6)
        .fill(null)
        .map(() => new THREE.Texture());
    }
  }

  // Load star texture for particle systems
  async loadStarTexture(): Promise<THREE.Texture> {
    try {
      const starTexture = await this.textureLoader.loadAsync(
        "/src/assets/textures/stars/star.svg"
      );

      // Configure texture for optimal star appearance
      starTexture.wrapS = THREE.ClampToEdgeWrapping;
      starTexture.wrapT = THREE.ClampToEdgeWrapping;
      starTexture.magFilter = THREE.LinearFilter;
      starTexture.minFilter = THREE.LinearFilter;

      // Store texture in the map
      this.textures.set("star", starTexture);

      console.log("Star texture loaded successfully");
      return starTexture;
    } catch (error) {
      console.error("Failed to load star texture:", error);
      throw error;
    }
  }

  // Load platform textures (metal and neon)
  async loadPlatformTextures(): Promise<Map<string, THREE.Texture>> {
    try {
      // Load all platform textures
      const texturePaths = [
        "/src/assets/textures/platform/metallic.png",
        "/src/assets/textures/platform/metallic_1.png",
        "/src/assets/textures/platform/metallic_2.png",
        "/src/assets/textures/platform/metallic_3.png",
        "/src/assets/textures/platform/gold.png",
        "/src/assets/textures/platform/neon.png",
        "/src/assets/textures/platform/night_sky.png",
        "/src/assets/textures/platform/platform_1.png",
      ];

      const platformTextures = await Promise.all(
        texturePaths.map((path) => this.textureLoader.loadAsync(path))
      );
      // Store textures in the map with their corresponding keys
      this.textures.set("metallic", platformTextures[0]);
      this.textures.set("metallic_1", platformTextures[1]);
      this.textures.set("metallic_2", platformTextures[2]);
      this.textures.set("metallic_3", platformTextures[3]);
      this.textures.set("gold", platformTextures[4]);
      this.textures.set("neon", platformTextures[5]);
      this.textures.set("night_sky", platformTextures[6]);
      this.textures.set("platform_1", platformTextures[7]);

      return this.textures;
    } catch (error) {
      handleAssetError(
        "Failed to load platform textures",
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }

  // Load boat textures
  async loadBoatTextures(): Promise<Map<string, THREE.Texture>> {
    try {
      // Load all boat textures
      const texturePaths = [
        "/src/assets/textures/boat/vintage.jpg",
        "/src/assets/textures/boat/boat_1.jpg",
        "/src/assets/textures/boat/boat_2.jpg",
        "/src/assets/textures/boat/boat_3.png",
      ];
      const boatTextures = await Promise.all(
        texturePaths.map((path) => this.textureLoader.loadAsync(path))
      );

      // Store textures in the map with their corresponding keys
      this.textures.set("vintage", boatTextures[0]);
      this.textures.set("boat_1", boatTextures[1]);
      this.textures.set("boat_2", boatTextures[2]);
      this.textures.set("boat_3", boatTextures[3]);

      return this.textures;
    } catch (error) {
      handleAssetError(
        "Failed to load boat textures",
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }

  /**
   * Load or generate a normal map texture for the sea surface
   * @returns The sea normal map texture
   */
  async loadSeaNormalTexture(): Promise<THREE.Texture | null> {
    // If already loaded, return the cached texture
    if (this.seaNormalTexture) {
      return this.seaNormalTexture;
    }

    try {
      // Try to load the texture from file
      const texturePath = "/src/assets/textures/waternormals.jpg";

      // Create a promise to handle the loading
      return new Promise((resolve) => {
        this.textureLoader.load(
          texturePath,
          (texture) => {
            // Configure the texture
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;

            // Cache and resolve
            this.seaNormalTexture = texture;
            resolve(texture);
          },
          undefined,
          (error) => {
            console.warn(
              `Failed to load sea normal map from ${texturePath}, generating placeholder.`,
              error
            );

            // Generate a placeholder normal map
            const placeholderTexture = this.generateSeaNormalTexture();
            this.seaNormalTexture = placeholderTexture;
            resolve(placeholderTexture);
          }
        );
      });
    } catch (error) {
      console.warn(
        "Error loading sea normal map, generating placeholder.",
        error
      );

      // Generate a placeholder normal map
      const placeholderTexture = this.generateSeaNormalTexture();
      this.seaNormalTexture = placeholderTexture;
      return placeholderTexture;
    }
  }

  /**
   * Generate a placeholder normal map texture for the sea surface
   * @returns A procedurally generated normal map texture
   */
  private generateSeaNormalTexture(): THREE.Texture {
    // Create canvas with higher resolution for more detail
    const canvas = document.createElement("canvas");
    canvas.width = 512; // Increased from 256 for higher detail
    canvas.height = 512; // Increased from 256 for higher detail
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      throw new Error("Could not get canvas context for normal map generation");
    }

    // Fill with base normal pointing upward (128,128,255)
    ctx.fillStyle = "rgb(128, 128, 255)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Create multiple wave patterns for more realistic water normal map
    const createWavePattern = (
      frequency: number,
      amplitude: number,
      direction: number,
      phase: number
    ) => {
      const cos = Math.cos(direction);
      const sin = Math.sin(direction);

      // More efficiency with a smaller step size for high-res canvas
      const step = 2;

      for (let y = 0; y < canvas.height; y += step) {
        for (let x = 0; x < canvas.width; x += step) {
          // Transform coordinates based on wave direction
          const xDir = (x * cos - y * sin) * frequency;
          const yDir = (x * sin + y * cos) * frequency;

          // Create wave pattern - combination of sine waves
          const wave =
            Math.sin(xDir + phase) * Math.sin(yDir + phase * 0.7) * amplitude;

          // Get existing pixel data
          const imgData = ctx.getImageData(x, y, step, step);

          // Normal map encoding: RGB = XYZ
          // Modify the normals based on wave pattern
          for (let i = 0; i < step * step * 4; i += 4) {
            // Add wave effect to existing normal
            imgData.data[i] = Math.max(
              0,
              Math.min(255, imgData.data[i] + wave * cos * 15)
            );
            imgData.data[i + 1] = Math.max(
              0,
              Math.min(255, imgData.data[i + 1] + wave * sin * 15)
            );

            // Z component (blue) - adjust based on slope for realistic normals
            // (higher areas have more upward-facing normals)
            const slopeX = cos * Math.cos(xDir + phase) * amplitude * 0.2;
            const slopeY = sin * Math.cos(yDir + phase * 0.7) * amplitude * 0.2;
            const slopeLen = Math.sqrt(slopeX * slopeX + slopeY * slopeY);

            imgData.data[i + 2] = Math.max(
              0,
              Math.min(255, 255 - slopeLen * 40)
            );
          }

          ctx.putImageData(imgData, x, y);
        }
      }
    };

    // Add multiple wave patterns with different parameters
    // Primary wave pattern
    createWavePattern(0.03, 1.0, 0, 0);
    // Secondary crossed wave patterns
    createWavePattern(0.05, 0.7, Math.PI / 4, 1.5);
    createWavePattern(0.04, 0.5, Math.PI / 6, 2.7);
    // Small ripple details
    createWavePattern(0.12, 0.3, Math.PI / 3, 0.8);
    createWavePattern(0.08, 0.4, -Math.PI / 5, 3.2);

    // Add some random noise for fine detail
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < imgData.data.length; i += 4) {
      // Add slight randomness to each color channel
      imgData.data[i] += (Math.random() - 0.5) * 10;
      imgData.data[i + 1] += (Math.random() - 0.5) * 10;
      imgData.data[i + 2] += (Math.random() - 0.5) * 5; // Less noise in blue channel for stability
    }
    ctx.putImageData(imgData, 0, 0);

    // Create and configure texture
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 4); // Repeat the texture multiple times for smaller wave patterns

    return texture;
  }

  /**
   * Load or generate a cloud texture
   * Uses an existing cloud.avif or generates a procedural one
   * @returns Promise for the loaded cloud texture
   */
  async loadCloudTexture(): Promise<THREE.Texture> {
    try {
      if (this.loadedTextures.has("cloud")) {
        return this.loadedTextures.get("cloud")!;
      }

      return new Promise((resolve, reject) => {
        this.textureLoader.load(
          "/src/assets/textures/cloud.avif",
          (texture) => {
            this.loadedTextures.set("cloud", texture);
            resolve(texture);
          },
          undefined,
          (error) => {
            console.error("Error loading cloud texture:", error);
            reject(error);
          }
        );
      });
    } catch (error) {
      console.error("Failed to load cloud texture", error);
      throw error;
    }
  }
}

// Create and export a singleton instance for use throughout the app
export const assetLoader = new AssetLoader();

// Extend Window interface to include gameAssetLoader
declare global {
  interface Window {
    gameAssetLoader: AssetLoader;
  }
}

// Assign the instance to window for global access
window.gameAssetLoader = assetLoader;
