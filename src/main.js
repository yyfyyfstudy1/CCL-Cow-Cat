import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import { Analytics } from '@vercel/analytics/vue';
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import Vue3Lottie from 'vue3-lottie';

// Firebase 配置
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// 初始化 Firebase
const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);

const app = createApp(App);
app.use(router);
app.use(Analytics);
app.use(Vue3Lottie);
app.mount('#app');
