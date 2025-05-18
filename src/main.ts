import { createPinia } from "pinia";
import { createApp } from "vue";
import { VueFire, VueFireAuth } from "vuefire";

import App from "./App.vue";

import { firebaseApp } from "./lib/firebase.ts";
import { useGameStore } from "./stores/gameStore";

const pinia = createPinia();
const app = createApp(App);

app.use(pinia);
app.use(VueFire, {
  // imported above but could also just be created here
  firebaseApp,
  modules: [
    // we will see other modules later on
    VueFireAuth()
  ]
});
// Reset the environment to empty when the app starts
const gameStore = useGameStore();
gameStore.resetToSelection();

app.mount("#app");
