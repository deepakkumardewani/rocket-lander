import { defineStore } from "pinia";
import { ref } from "vue";

/**
 * Store to manage user data like username
 */
export const useUserStore = defineStore("user", () => {
  // State
  const username = ref<string>("");
  const hasSetUsername = ref<boolean>(false);

  // Initialize username from localStorage if available
  function initUsername(): void {
    const storedUsername = localStorage.getItem("rocketLanderUsername");
    if (storedUsername) {
      username.value = storedUsername;
      hasSetUsername.value = true;
    }
  }

  // Set the username and save to localStorage
  function setUsername(name: string): void {
    username.value = name;
    hasSetUsername.value = true;
    localStorage.setItem("rocketLanderUsername", name);
  }

  return {
    username,
    hasSetUsername,
    initUsername,
    setUsername
  };
});
