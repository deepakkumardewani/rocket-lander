import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import { useGameStore } from "./stores/gameStore";

const pinia = createPinia();
const app = createApp(App);

app.use(pinia);

// Reset the environment to empty when the app starts
const gameStore = useGameStore();
gameStore.resetToSelection();

app.mount("#app");
