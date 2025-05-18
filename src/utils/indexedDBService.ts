import { v4 as uuidv4 } from "uuid";

interface UserProgress {
  userId: string;
  username: string;
  unlockedSeaTextures: string[];
  unlockedSpaceTextures: string[];
  completedSeaLevels: number;
  completedSpaceLevels: number;
  unlockedRockets: string[];
  achievements: {
    perfectLandings: number;
    highFuelLandings: number;
    lowVelocityLandings: number;
    highScores: number[];
    totalLandings: number;
    completedAllLevels: boolean;
    lowVelocityInSpaceLevel3: boolean;
    highFuelInSpaceLevel3: boolean;
  };
}

class IndexedDBService {
  private dbName = "rocket-lander-db";
  private dbVersion = 1;
  private db: IDBDatabase | null = null;

  // Initialize the database
  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = (event) => {
        console.error("IndexedDB error:", (event.target as IDBRequest).error);
        reject((event.target as IDBRequest).error);
      };

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create the users object store with userId as key path
        if (!db.objectStoreNames.contains("users")) {
          db.createObjectStore("users", { keyPath: "userId" });
        }
      };
    });
  }

  // Get or create user progress
  async getUserProgress(): Promise<UserProgress> {
    await this.ensureDbConnection();

    // Try to get existing user data from localStorage first
    const userId = localStorage.getItem("rocketLanderUserId");
    const username = localStorage.getItem("rocketLanderUsername") || "";

    if (userId) {
      try {
        const userProgress = await this.getUserById(userId);
        if (userProgress) {
          // Update the username if it exists in localStorage but not in the DB record
          if (username && !userProgress.username) {
            userProgress.username = username;
            await this.saveUserProgress(userProgress);
          }
          return userProgress;
        }
      } catch (error) {
        console.error("Error getting user progress:", error);
      }
    }

    // If no existing user, create a new one
    const newUserId = uuidv4();
    localStorage.setItem("rocketLanderUserId", newUserId);

    const newUserProgress: UserProgress = {
      userId: newUserId,
      username: username,
      unlockedSeaTextures: ["vintage"],
      unlockedSpaceTextures: ["platform_1"],
      completedSeaLevels: 0,
      completedSpaceLevels: 0,
      unlockedRockets: ["classic"],
      achievements: {
        perfectLandings: 0,
        highFuelLandings: 0,
        lowVelocityLandings: 0,
        highScores: [],
        totalLandings: 0,
        completedAllLevels: false,
        lowVelocityInSpaceLevel3: false,
        highFuelInSpaceLevel3: false
      }
    };

    await this.saveUserProgress(newUserProgress);
    return newUserProgress;
  }

  // Save user progress
  async saveUserProgress(userProgress: UserProgress): Promise<void> {
    await this.ensureDbConnection();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error("Database not initialized"));
        return;
      }

      const transaction = this.db.transaction(["users"], "readwrite");
      const store = transaction.objectStore("users");
      const request = store.put(userProgress);

      request.onsuccess = () => resolve();
      request.onerror = (event) => {
        console.error("Error saving user progress:", (event.target as IDBRequest).error);
        reject((event.target as IDBRequest).error);
      };
    });
  }

  // Get user by ID
  private async getUserById(userId: string): Promise<UserProgress | null> {
    await this.ensureDbConnection();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error("Database not initialized"));
        return;
      }

      const transaction = this.db.transaction(["users"], "readonly");
      const store = transaction.objectStore("users");
      const request = store.get(userId);

      request.onsuccess = () => {
        if (request.result) {
          resolve(request.result as UserProgress);
        } else {
          resolve(null);
        }
      };

      request.onerror = (event) => {
        console.error("Error getting user:", (event.target as IDBRequest).error);
        reject((event.target as IDBRequest).error);
      };
    });
  }

  // Ensure database connection is established
  private async ensureDbConnection(): Promise<void> {
    if (!this.db) {
      await this.init();
    }
  }
}

// Create and export a singleton instance
const indexedDBService = new IndexedDBService();
export default indexedDBService;
