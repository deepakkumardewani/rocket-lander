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

  constructor() {
    this.textures = new Map();
    this.models = new Map();
    this.audio = new Map();

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
  }

  // Set up the loading manager with progress and error handlers
  private setupLoadingManager(): void {
    // Track overall loading progress
    this.loadingManager.onProgress = (url, itemsLoaded, itemsTotal) => {
      const progress = Math.round((itemsLoaded / itemsTotal) * 100);
      console.log(`Loading: ${progress}% (${url})`);
    };

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

            // Log model information for debugging
            console.log(`Model loaded: ${key}`, {
              children: model.children.length,
              animations: gltf.animations?.length || 0,
            });

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
        (progress) => {
          // Log loading progress
          if (progress.lengthComputable) {
            const percentComplete = (progress.loaded / progress.total) * 100;
            console.log(
              `Loading model ${key}: ${Math.round(percentComplete)}%`
            );
          }
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
    } catch (error) {
      handleAssetError(
        `Failed to play audio: ${key}`,
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  // Dispose of loaded assets to free memory
  public dispose(): void {
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
  }

  async loadSkyboxTextures(): Promise<THREE.Texture[]> {
    const sides = ["right", "left", "top", "bottom", "front", "back"];
    const promises = sides.map((side) =>
      this.textureLoader.loadAsync(`/src/assets/skybox/${side}.png`)
    );

    try {
      this.loadedSkyboxTextures = await Promise.all(promises);
      return this.loadedSkyboxTextures;
    } catch (error) {
      console.error("Failed to load skybox textures:", error);
      throw error;
    }
  }

  // Load platform textures (metal and neon)
  async loadPlatformTextures(): Promise<PlatformTextures> {
    try {
      const metalTexture = await this.textureLoader.loadAsync(
        "/src/assets/platform/metallic.png"
      );
      const neonTexture = await this.textureLoader.loadAsync(
        "/src/assets/platform/neon.png"
      );

      // Store textures in the map
      this.textures.set("metal", metalTexture);
      this.textures.set("neon", neonTexture);

      return {
        metal: metalTexture,
        neon: neonTexture,
      };
    } catch (error) {
      handleAssetError(
        "Failed to load platform textures",
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }
}

// Create and export a singleton instance for use throughout the app
export const assetLoader = new AssetLoader();
