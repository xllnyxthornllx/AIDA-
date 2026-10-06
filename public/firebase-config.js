// Pega aquí tu config de Firebase Console > Project Settings > General > Your apps > Web
// Ejemplo:
// const firebaseConfig = {
//   apiKey: "...",
//   authDomain: "aida-plus.firebaseapp.com",
//   databaseURL: "https://aida-plus-default-rtdb.firebaseio.com",
//   projectId: "aida-plus",
//   storageBucket: "aida-plus.appspot.com",
//   messagingSenderId: "...",
//   appId: "..."
// };

const firebaseConfig = {
  apiKey: "PEGA_TU_APIKEY",
  authDomain: "PEGA_TU_AUTHDOMAIN",
  databaseURL: "https://aida-plus-default-rtdb.firebaseio.com",
  projectId: "PEGA_TU_PROJECTID",
  storageBucket: "PEGA_TU_STORAGE",
  messagingSenderId: "PEGA_TU_SENDERID",
  appId: "PEGA_TU_APPID"
};

const FIREBASE_ENABLED = firebaseConfig.apiKey !== "PEGA_TU_APIKEY";
