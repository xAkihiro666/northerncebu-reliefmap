// Firebase Configuration for PUBLIC RELIEF MAP
// 🌐 This creates a public server where ANYONE can view and add relief locations
// 🔥 Replace these values with your actual Firebase project configuration

const firebaseConfig = {
    // 🔑 Real Firebase configuration for Northern Cebu Relief Map
    apiKey: "AIzaSyBsjSzG7OP76PIYr40SY6H8CoXoOPQ5Xck",
    authDomain: "northern-cebu-relief-public.firebaseapp.com", 
    projectId: "northern-cebu-relief-public",
    storageBucket: "northern-cebu-relief-public.firebasestorage.app",
    messagingSenderId: "939721559679",
    appId: "1:939721559679:web:8b07dc99a71abe4704b94a"
};

// 📋 SETUP INSTRUCTIONS (Follow FIREBASE_SETUP.md for detailed guide):
// 
// 1️⃣ CREATE FIREBASE PROJECT:
//    - Go to https://console.firebase.google.com
//    - Create project: "northern-cebu-relief-public"
//    - Disable Google Analytics
//
// 2️⃣ SETUP FIRESTORE DATABASE:
//    - Click "Firestore Database" -> "Create database"
//    - Choose "Start in production mode"
//    - Select location: "asia-southeast1"
//
// 3️⃣ SET PUBLIC ACCESS RULES (IMPORTANT - Do this FIRST):
//    - Go to Firestore -> Rules tab
//    - Replace with:
//      rules_version = '2';
//      service cloud.firestore {
//        match /databases/{database}/documents {
//          match /relief-locations/{document} {
//            allow read, write: if true;
//          }
//        }
//      }
//    - Click "Publish"
//
// 4️⃣ GET YOUR CONFIG:
//    - Project Settings -> Your apps -> Add app (Web)
//    - Copy the firebaseConfig object
//    - Replace the values above
//
// 5️⃣ TEST:
//    - Open index.html in browser
//    - Should see "Syncing across devices" (green status)
//    - Add a test location - should sync across devices
//
// 🚀 EXAMPLE CONFIG (yours will be different):
// const firebaseConfig = {
//     apiKey: "AIzaSyDxVlWA-cE_OfAShL62I-llxYsSVxHVXnI",
//     authDomain: "northern-cebu-relief-public.firebaseapp.com",
//     projectId: "northern-cebu-relief-public",
//     storageBucket: "northern-cebu-relief-public.appspot.com",
//     messagingSenderId: "987654321098",
//     appId: "1:987654321098:web:abc123def456ghi789"
// };

// ⚠️ SECURITY NOTE: 
// This configuration allows ANYONE to read/write to your database.
// This is intentional for a public relief map where community participation is needed.
// Firebase provides DDoS protection and the free tier has usage limits.

// 📊 FREE TIER LIMITS:
// - 50,000 reads/day (viewing pins)
// - 20,000 writes/day (adding pins) 
// - Should handle hundreds of users daily

export { firebaseConfig };
