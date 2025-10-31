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
import { getDatabase, ref, get, update, set } from "firebase/database";
// ADDED: Import Cloud Functions
import { getFunctions, httpsCallable } from "firebase/functions"; 

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
// Point client to the same region where functions are deployed
const functions = getFunctions(app, 'asia-southeast1'); // ADDED: Initialize Cloud Functions in region

const DEFAULT_ADMIN_PERMISSIONS = {
  removeTeacherAccounts: false,
  seeAccessLogs: false,
  seeAttendanceLogs: false,
  changeWifiInformation: false,
};

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

  // Check if user is admin (backward compatible)
  isAdmin: async (user) => {
    if (!user) return false;
    
    // Check new role system first
    try {
      const adminRef = ref(db, `roles/admin/${user.uid}`);
      const adminSnapshot = await get(adminRef);
      if (adminSnapshot.exists()) return true;
      
      // Fallback to existing logic during migration
      const adminEmails = ['coolrigby101@gmail.com', 'fateh8er201@gmail.com'];
      return adminEmails.includes(user.email);
    } catch (error) {
      console.error('Error checking admin status:', error);
      // Fallback to email check
      const adminEmails = ['coolrigby101@gmail.com', 'fateh8er201@gmail.com'];
      return adminEmails.includes(user.email);
    }
  },

  // Check if user is super admin
  isSuperAdmin: async (user) => {
    if (!user) return false;
    
    try {
      const superAdminRef = ref(db, `roles/super_admin/${user.uid}`);
      const snapshot = await get(superAdminRef);
      if (snapshot.exists()) return true;
      return false; // No email fallback; rely strictly on DB role
    } catch (error) {
      console.error('Error checking super admin status:', error);
      return false;
    }
  },

  // Check if user is verified admin (has verified email)
  isVerifiedAdmin: async (user) => {
    if (!user || !user.emailVerified) return false;
    return await this.isAdmin(user);
  },

  // Check if user is verified super admin
  isVerifiedSuperAdmin: async (user) => {
    if (!user || !user.emailVerified) return false;
    return await this.isSuperAdmin(user);
  },

  // Admin management functions
  createAdminAccount: async (email, password, displayName) => {
    try {
      const createAdmin = httpsCallable(functions, 'createAdminAccount');
      const result = await createAdmin({
        email,
        password,
        displayName,
        createdBy: auth.currentUser?.uid
      });
      const data = result?.data || {};
      const adminUid = data.adminUid || data.uid || data.userId;

      if (adminUid) {
        try {
          await authService.setAdminPermissions(adminUid, DEFAULT_ADMIN_PERMISSIONS);
        } catch (permissionError) {
          console.warn('Failed to seed default admin permissions:', permissionError);
        }
      } else {
        console.warn('createAdminAccount: Admin UID not returned from function, skipping default permissions seeding.', data);
      }

      return data;
    } catch (error) {
      console.error('Error creating admin account:', error);
      throw error;
    }
  },

  deleteAdminAccount: async (adminUid) => {
    try {
      const deleteAdmin = httpsCallable(functions, 'deleteAdminAccount');
      const result = await deleteAdmin({
        adminUid,
        deletedBy: auth.currentUser?.uid
      });
      return result.data;
    } catch (error) {
      console.error('Error deleting admin account:', error);
      throw error;
    }
  },

  archiveTeacherAccount: async (teacherUid, reason) => {
    try {
      const archiveTeacher = httpsCallable(functions, 'archiveTeacherAccount');
      const result = await archiveTeacher({
        teacherUid,
        deletedBy: auth.currentUser?.uid,
        reason: reason || null,
<<<<<<< HEAD
=======
        
>>>>>>> ebf1615 (auth service changes)
      });
      return result.data;
    } catch (error) {
      console.error('Error archiving teacher account:', error);
      throw error;
    }
  },

  hardDeleteTeacherAccount: async (teacherUid) => {
    try {
      const hardDeleteTeacher = httpsCallable(functions, 'hardDeleteTeacherAccount');
      const result = await hardDeleteTeacher({
        teacherUid,
        deletedBy: auth.currentUser?.uid,
      });
      return result.data;
    } catch (error) {
      console.error('Error hard deleting teacher account:', error);
      throw error;
    }
  },

  getArchivedTeachers: async () => {
    try {
      const getArchived = httpsCallable(functions, 'getArchivedTeachers');
      const result = await getArchived();
      return result.data?.archivedTeachers || [];
    } catch (error) {
      console.error('Error fetching archived teachers:', error);
      throw error;
    }
  },

  getBannedTeachers: async () => {
    try {
      const getBanned = httpsCallable(functions, 'getBannedTeachers');
      const result = await getBanned();
      return result.data?.bannedTeachers || [];
    } catch (error) {
      console.error('Error fetching banned teachers:', error);
      throw error;
    }
  },

  restoreArchivedTeacher: async (teacherUid) => {
    try {
      const restoreTeacher = httpsCallable(functions, 'restoreArchivedTeacher');
      const result = await restoreTeacher({
        teacherUid,
        restoredBy: auth.currentUser?.uid,
      });
      return result.data;
    } catch (error) {
      console.error('Error restoring archived teacher:', error);
      throw error;
    }
  },

  unbanTeacherEmail: async (email) => {
    try {
      const unbanTeacher = httpsCallable(functions, 'unbanTeacherEmail');
      const result = await unbanTeacher({ email });
      return result.data;
    } catch (error) {
      console.error('Error unbanning teacher email:', error);
      throw error;
    }
  },

  getAdminAccounts: async () => {
    try {
      const getAdmins = httpsCallable(functions, 'getAdminAccounts');
      const result = await getAdmins();
      return result.data;
    } catch (error) {
      console.error('Error getting admin accounts:', error);
      throw error;
    }
  },

  getAdminPermissions: async (adminUid) => {
    try {
      const permissionsRef = ref(db, `roles/admin/${adminUid}/permissions`);
      const snapshot = await get(permissionsRef);
      if (snapshot.exists()) {
        return snapshot.val();
      }
      return {};
    } catch (error) {
      console.error('Error fetching admin permissions:', error);
      throw error;
    }
  },

  updateAdminPermission: async (adminUid, permissionKey, value) => {
    try {
      const permissionsRef = ref(db, `roles/admin/${adminUid}/permissions`);
      await update(permissionsRef, { [permissionKey]: value });
      return { success: true };
    } catch (error) {
      console.error('Error updating admin permission:', error);
      throw error;
    }
  },

  setAdminPermissions: async (adminUid, permissions) => {
    try {
      const permissionsRef = ref(db, `roles/admin/${adminUid}/permissions`);
      await set(permissionsRef, permissions);
      return { success: true };
    } catch (error) {
      console.error('Error setting admin permissions:', error);
      throw error;
    }
  }
};

export { auth };
export default authService;