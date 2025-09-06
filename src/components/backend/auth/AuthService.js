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

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyADwTJ55RaBvjvpulAY7T7ORW2dnxZFNqQ",
  authDomain: "knocksense-21180.firebaseapp.com",
  databaseURL: "https://knocksense-21180-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "knocksense-21180",
  storageBucket: "knocksense-21180.firebasestorage.app",
  messagingSenderId: "567130767561",
  appId: "1:567130767561:web:b07c2ece1c042f0b16cd18"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

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
      
      // You can access Microsoft-specific data
      const credential = OAuthProvider.credentialFromResult(result);
      const accessToken = credential.accessToken;
      
      return {
        success: true,
        user: user,
        isAdmin: false,
        microsoftToken: accessToken
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Logout
  logout: async (userType = null) => {
    try {
      const currentUser = auth.currentUser;
      await signOut(auth);
      
      // Only redirect to Microsoft logout if user actually used Microsoft OAuth
      if (userType === 'student' || (currentUser && currentUser.providerData.some(p => p.providerId === 'microsoft.com'))) {
        // Optional: Clear Microsoft session silently
        setTimeout(() => {
          const tenant = '3663e35d-c7bc-4b90-90e0-a67a1d53bb77'; 
          const postLogout = encodeURIComponent(window.location.origin);
          window.location.href = `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/logout?post_logout_redirect_uri=${postLogout}`;
        }, 100);
      }
      
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
  onAuthStateChange: (callback) => {
    return onAuthStateChanged(auth, callback);
  },

  // Check if user is admin (you can customize this logic)
  isAdmin: (user) => {
    // Method 1: Check email domain or specific emails
    const adminEmails = ['coolrigby101@gmail.com', 'fateh8er201@gmail.com']; // Add your admin emails
    return user && adminEmails.includes(user.email);
    
    // Method 2: Check custom claims (requires backend setup)
    // return user && user.customClaims && user.customClaims.admin === true;
  }
};

export { auth };
export default authService;