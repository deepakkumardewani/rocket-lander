import { initializeApp } from "firebase/app";

const firebaseConfig = {
  apiKey: "AIzaSyDFUncTAzNoefq45KIvntJGbkRv98vhDqY",
  authDomain: "rocker-lander-d6571.firebaseapp.com",
  databaseURL: "https://rocker-lander-d6571-default-rtdb.firebaseio.com",
  projectId: "rocker-lander-d6571",
  storageBucket: "rocker-lander-d6571.firebasestorage.app",
  messagingSenderId: "1079006229109",
  appId: "1:1079006229109:web:e29d3a66dde390affdbe3c",
  measurementId: "G-W06G2M4JMZ"
};

export const firebaseApp = initializeApp(firebaseConfig);
