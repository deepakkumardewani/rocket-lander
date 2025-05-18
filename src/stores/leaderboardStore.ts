import {
  collection,
  doc,
  getDoc,
  getFirestore,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc
} from "firebase/firestore";
import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { useCollection } from "vuefire";

import type { Environment, LeaderboardEntry } from "../types/storeTypes";

import { firebaseApp } from "../lib/firebase";

// Initialize Firestore
const db = getFirestore(firebaseApp);
const leaderboardCollection = collection(db, "leaderboard");

// Minimum score threshold to be eligible for leaderboard
const MIN_SCORE_THRESHOLD = 150;

/**
 * Leaderboard store to manage game leaderboard data
 */
export const useLeaderboardStore = defineStore("leaderboard", () => {
  // State
  const isLoading = ref<boolean>(false);
  const error = ref<string | null>(null);
  const personalBest = ref<number>(0);
  const lastSubmissionTime = ref<Date | null>(null);

  // Use VueFire's useCollection to get reactive leaderboard data
  const leaderboardQuery = query(leaderboardCollection, orderBy("totalScore", "desc"), limit(100));

  const { data: leaderboard } = useCollection<LeaderboardEntry>(leaderboardQuery);

  // Filtered leaderboards with computed totals
  const spaceLeaderboard = computed<LeaderboardEntry[]>(
    () =>
      leaderboard.value
        ?.map((entry) => ({
          ...entry,
          totalScore: entry.spaceScore
        }))
        .sort((a, b) => b.totalScore - a.totalScore) || []
  );

  const seaLeaderboard = computed<LeaderboardEntry[]>(
    () =>
      leaderboard.value
        ?.map((entry) => ({
          ...entry,
          totalScore: entry.seaScore
        }))
        .sort((a, b) => b.totalScore - a.totalScore) || []
  );

  /**
   * Check if a score is eligible for submission to the leaderboard
   * @param score The score to check
   * @returns Whether the score is eligible
   */
  function isScoreEligible(score: number): boolean {
    // Score must exceed minimum threshold
    if (score < MIN_SCORE_THRESHOLD) return false;

    // Check if we've submitted recently (rate limiting)
    // if (lastSubmissionTime.value) {
    //   const now = new Date();
    //   const timeSinceLastSubmission = now.getTime() - lastSubmissionTime.value.getTime();
    //   // Rate limit to one submission per minute
    //   if (timeSinceLastSubmission < 60000) return false;
    // }

    return true;
  }

  /**
   * Submit a score to the leaderboard
   * @param entry The leaderboard entry to submit
   * @returns Promise that resolves when submission is complete
   */
  async function submitScore(entry: {
    uuid: string;
    username: string;
    score: number;
    environment: Environment;
    rocketId: string;
    fuelRemaining: number;
    landingVelocity: number;
  }): Promise<void> {
    if (!isScoreEligible(entry.score)) return;

    try {
      isLoading.value = true;
      error.value = null;

      // Get existing user document or create new one
      const userDocRef = doc(leaderboardCollection, entry.uuid);
      const userDoc = await getDoc(userDocRef);
      const existingData = userDoc.exists() ? (userDoc.data() as LeaderboardEntry) : null;

      // Calculate new scores
      const newData: LeaderboardEntry = {
        uuid: entry.uuid,
        username: entry.username,
        spaceScore:
          entry.environment === "space"
            ? (existingData?.spaceScore || 0) + entry.score
            : existingData?.spaceScore || 0,
        seaScore:
          entry.environment === "sea"
            ? (existingData?.seaScore || 0) + entry.score
            : existingData?.seaScore || 0,
        rocketId: entry.rocketId,
        fuelRemaining: entry.fuelRemaining,
        landingVelocity: entry.landingVelocity,
        lastUpdated: serverTimestamp() as any,
        totalScore: 0 // Will be calculated below
      };

      // Calculate total score
      newData.totalScore = newData.spaceScore + newData.seaScore;

      // Update personal best if total score is higher
      if (newData.totalScore > personalBest.value) {
        personalBest.value = newData.totalScore;
      }

      // Save to Firestore
      await setDoc(userDocRef, newData);

      // Update last submission time
      lastSubmissionTime.value = new Date();
    } catch (err) {
      console.error("Error submitting score:", err);
      error.value = err instanceof Error ? err.message : "Failed to submit score";
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Get the user's personal best score
   * @param uuid User ID to look up
   */
  async function fetchPersonalBest(uuid: string): Promise<void> {
    try {
      isLoading.value = true;

      const userDocRef = doc(leaderboardCollection, uuid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const data = userDoc.data() as LeaderboardEntry;
        personalBest.value = data.totalScore;
      }
    } catch (err) {
      console.error("Error fetching personal best:", err);
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Initialize the leaderboard store
   */
  async function init(): Promise<void> {
    const userId = localStorage.getItem("rocketLanderUserId");
    if (userId) {
      await fetchPersonalBest(userId);
    }
  }

  // Initialize the store when created
  init();

  return {
    // State
    leaderboard,
    spaceLeaderboard,
    seaLeaderboard,
    isLoading,
    error,
    personalBest,

    // Actions
    submitScore,
    fetchPersonalBest,
    isScoreEligible
  };
});
