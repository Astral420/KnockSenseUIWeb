// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  signInWithPopup, 
  OAuthProvider,
  signOut,
  onAuthStateChanged 
} from "firebase/auth";
// ADDED: Import Realtime Database functions
import { getDatabase, ref, get } from "firebase/database"; 

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app); // ADDED: Initialize database

// Microsoft OAuth provider
const microsoftProvider = new OAuthProvider('microsoft.com');
microsoftProvider.setCustomParameters({
  tenant: '3663e35d-c7bc-4b90-90e0-a67a1d53bb77',
  prompt: 'login' 
});

// Auth service functions
export const authService = {
  // Admin login with email and password
  loginAdmin: async (email, password) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return {
        success: true,
        user: userCredential.user,
        isAdmin: true
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Student login with Microsoft OAuth
  loginWithMicrosoft: async () => {
    try {
      const result = await signInWithPopup(auth, microsoftProvider);
      const user = result.user;
      
      const credential = OAuthProvider.credentialFromResult(result);
      const accessToken = credential.accessToken;
      
      return {
        success: true,
        user: user,
        isAdmin: false,
        microsoftToken: accessToken
      };
    } catch (error) {
      let errorMessage = 'Login failed';
      
      if (error.code) {
        switch (error.code) {
          case 'auth/popup-closed-by-user':
            errorMessage = 'Login cancelled by user';
            break;
          // ... (rest of the error handling)
          default:
            errorMessage = error.message || 'Authentication failed';
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      return {
        success: false,
        error: errorMessage,
        code: error.code
      };
    }
  },

  // Logout
  logout: async () => {
    try {
      await signOut(auth);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
  // Get current user
  getCurrentUser: () => {
    return auth.currentUser;
  },

  // Auth state observer
  // MODIFIED: This function now fetches student profile data
  onAuthStateChange: (callback) => {
    return onAuthStateChanged(auth, async (user) => {
      if (user) {
        // User is signed in, check if they have a student profile
        const userRoleRef = ref(db, `roles/student/${user.uid}`);
        const snapshot = await get(userRoleRef);

        if (snapshot.exists()) {
          // Student profile found, merge it with the auth user object
          const profile = snapshot.val();
          const enhancedUser = { ...user, ...profile };
          callback(enhancedUser); // Send the combined user object
        } else {
          // No student profile found (e.g., an admin), send the regular user object
          callback(user);
        }
      } else {
        // User is signed out
        callback(null);
      }
    });
  },

  // Check if user is admin (you can customize this logic)
  isAdmin: (user) => {
    const adminEmails = ['coolrigby101@gmail.com', 'fateh8er201@gmail.com']; 
    return user && adminEmails.includes(user.email);
  }
};

export { auth };
export default authService;