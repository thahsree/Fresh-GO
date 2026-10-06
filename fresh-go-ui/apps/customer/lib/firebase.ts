import { initializeApp, getApps, getApp } from "firebase/app";
import {
  initializeAuth,
  getAuth,
  // @ts-ignore
  getReactNativePersistence,
} from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

export const firebaseConfig = {
  apiKey: "AIzaSyBo2groYEN_V0unj10YoqS2f1_BpjL6zVQ",
  authDomain: "freshgo-60966.firebaseapp.com",
  projectId: "freshgo-60966",
  storageBucket: "freshgo-60966.firebasestorage.app",
  messagingSenderId: "96640122388",
  appId: "1:96640122388:web:296a7454049b6ebbb9f101",
  measurementId: "G-7P0TFLCS95",
};

export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

let authInstance: any;
try {
  if (Platform.OS === "web") {
    authInstance = getAuth(app);
  } else {
    try {
      authInstance = initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage),
      });
    } catch {
      authInstance = getAuth(app);
    }
  }
} catch {
  authInstance = getAuth(app);
}

export const auth = authInstance;
