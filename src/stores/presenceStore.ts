import {
  ref as dbRef,
  getDatabase,
  onDisconnect,
  onValue,
  serverTimestamp,
  set
} from "firebase/database";
import { defineStore } from "pinia";
import { computed, ref } from "vue";

import { firebaseApp } from "../lib/firebase";

export const usePresenceStore = defineStore("presence", () => {
  const db = getDatabase(firebaseApp);
  const onlineUsers = ref<Record<string, { status: string; last_seen: number; username: string }>>(
    {}
  );
  const onlineCount = computed(() => {
    return Object.values(onlineUsers.value).filter((user) => user.status === "online").length;
  });

  function initPresence(userId: string, username: string) {
    const userStatusRef = dbRef(db, `presence/${userId}`);

    // Set up presence handling
    const connectedRef = dbRef(db, ".info/connected");
    onValue(connectedRef, (snap) => {
      if (snap.val() === true) {
        // User is connected
        const userStatus = {
          status: "online",
          last_seen: serverTimestamp(),
          username
        };

        // Set up onDisconnect
        onDisconnect(userStatusRef).set({
          status: "offline",
          last_seen: serverTimestamp(),
          username
        });

        // Set online status
        set(userStatusRef, userStatus);
      }
    });

    // Listen to presence changes
    const presenceRef = dbRef(db, "presence");
    onValue(presenceRef, (snap) => {
      onlineUsers.value = snap.val() || {};
    });
  }

  return {
    onlineUsers,
    onlineCount,
    initPresence
  };
});
