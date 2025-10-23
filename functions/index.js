const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getDatabase } = require('firebase-admin/database');

// Initialize Firebase Admin
initializeApp();
const auth = getAuth();
const db = getDatabase();

/**
 * Create a new admin account
 * Only callable by super admins
 */
exports.createAdminAccount = onCall(
  { region: 'asia-southeast1' },
  async (request) => {
    const { email, password, displayName, createdBy } = request.data;

    // Validate input
    if (!email || !password || !displayName || !createdBy) {
      throw new HttpsError('invalid-argument', 'Missing required fields');
    }

    try {
      // Verify the caller is a super admin
      const callerToken = request.auth;
      if (!callerToken) {
        throw new HttpsError('unauthenticated', 'User must be authenticated');
      }

      const isSuperAdmin = await verifySuperAdmin(callerToken.uid);
      if (!isSuperAdmin) {
        throw new HttpsError(
          'permission-denied',
          'Only super admins can create admin accounts'
        );
      }

      // Create the user account
      const userRecord = await auth.createUser({
        email: email,
        password: password,
        displayName: displayName,
        emailVerified: false, // Will trigger verification email
      });

      // Add to admin role in database
      await db.ref(`roles/admin/${userRecord.uid}`).set({
        email: email,
        displayName: displayName,
        createdAt: new Date().toISOString(),
        createdBy: createdBy,
        status: 'enrolled',
      });

      // Add to users node for consistency
      await db.ref(`users/${userRecord.uid}`).set({
        uid: userRecord.uid,
        email: email,
        displayName: displayName,
        role: 'admin',
        createdAt: new Date().toISOString(),
        lastLogin: null,       
        studentNumber: null, 
        teacherID: null,      
        photoUrl: null,
      });

      // Track creation under creator's UID (audit/relationship)
      await db.ref(`users/${createdBy}/created/admin/${userRecord.uid}`).set({
        email: email,
        displayName: displayName,
        createdAt: new Date().toISOString(),
      });
      // Also mirror under roles/super_admin for convenience
      await db
        .ref(`roles/super_admin/${createdBy}/created/admin/${userRecord.uid}`)
        .set({
          email: email,
          displayName: displayName,
          createdAt: new Date().toISOString(),
        });

      return {
        success: true,
        uid: userRecord.uid,
        message: 'Admin account created successfully.',
      };
    } catch (error) {
      console.error('Error creating admin account:', error);
      throw new HttpsError(
        'internal',
        'Failed to create admin account: ' + error.message
      );
    }
  }
);

/**
 * Delete an admin account
 * Only callable by super admins
 */
exports.deleteAdminAccount = onCall(
  { region: 'asia-southeast1' },
  async (request) => {
    const { adminUid, deletedBy } = request.data;

    if (!adminUid || !deletedBy) {
      throw new HttpsError('invalid-argument', 'Missing required fields');
    }

    try {
      const callerToken = request.auth;
      if (!callerToken) {
        throw new HttpsError('unauthenticated', 'User must be authenticated');
      }

      const isSuperAdmin = await verifySuperAdmin(callerToken.uid);
      if (!isSuperAdmin) {
        throw new HttpsError(
          'permission-denied',
          'Only super admins can delete admin accounts'
        );
      }

      if (callerToken.uid === adminUid) {
        throw new HttpsError('invalid-argument', 'Cannot delete your own account');
      }

      await auth.deleteUser(adminUid);
      await db.ref(`roles/admin/${adminUid}`).remove();
      await db.ref(`users/${adminUid}`).remove();

      await db.ref(`admin_actions/${Date.now()}`).set({
        action: 'delete_admin',
        adminUid: adminUid,
        deletedBy: deletedBy,
        timestamp: new Date().toISOString(),
      });

      return {
        success: true,
        message: 'Admin account deleted successfully',
      };
    } catch (error) {
      console.error('Error deleting admin account:', error);
      throw new HttpsError(
        'internal',
        'Failed to delete admin account: ' + error.message
      );
    }
  }
);

/**
 * Delete a teacher account
 * Only callable by super admins
 */
exports.deleteTeacherAccount = onCall(
  { region: 'asia-southeast1' },
  async (request) => {
    const { teacherUid, deletedBy } = request.data;

    if (!teacherUid || !deletedBy) {
      throw new HttpsError('invalid-argument', 'Missing required fields');
    }

    try {
      const callerToken = request.auth;
      if (!callerToken) {
        throw new HttpsError('unauthenticated', 'User must be authenticated');
      }

      const isSuperAdmin = await verifySuperAdmin(callerToken.uid);
      if (!isSuperAdmin) {
        throw new HttpsError(
          'permission-denied',
          'Only super admins can delete teacher accounts'
        );
      }

      const teacherSnapshot = await db.ref(`roles/teacher/${teacherUid}`).once('value');
      const teacherData = teacherSnapshot.val();
      const userSnapshot = await db.ref(`users/${teacherUid}`).once('value');
      const userData = userSnapshot.val();

      try {
        await auth.deleteUser(teacherUid);
      } catch (authError) {
        if (authError?.code === 'auth/user-not-found') {
          console.warn(`Auth user ${teacherUid} not found during deletion; continuing cleanup.`);
        } else {
          throw authError;
        }
      }

      const deletionTimestamp = new Date().toISOString();
      const archivedRecord = {
        teacherUid,
        displayName: teacherData?.displayName || userData?.displayName || null,
        email: teacherData?.email || userData?.email || null,
        teacherID: teacherData?.teacherID || userData?.teacherID || null,
        rfidUid: teacherData?.rfid_uid || null,
        deletedAt: deletionTimestamp,
        deletedBy,
        teacherData: teacherData || null,
        userData: userData || null,
      };

      await db.ref(`archived_teachers/${teacherUid}`).set(archivedRecord);

      await Promise.all([
        db.ref(`roles/teacher/${teacherUid}`).remove(),
        db.ref(`users/${teacherUid}`).remove(),
        teacherData?.rfid_uid
          ? db.ref(`rfid_tags/${teacherData.rfid_uid}/assignedTo`).remove()
          : Promise.resolve(),
        db
          .ref(`appointments`)
          .orderByChild('teacherUid')
          .equalTo(teacherUid)
          .once('value')
          .then((snapshot) => {
            const updates = {};
            snapshot.forEach((child) => {
              updates[`appointments/${child.key}`] = null;
            });
            return Object.keys(updates).length > 0
              ? db.ref().update(updates)
              : Promise.resolve();
          }),
      ]);

      const adminActionKey = Date.now();
      await db.ref(`admin_actions/${adminActionKey}`).set({
        action: 'delete_teacher',
        teacherUid: teacherUid,
        teacherName: teacherData?.displayName || 'Unknown',
        deletedBy: deletedBy,
        archived: true,
        archivedPath: `archived_teachers/${teacherUid}`,
        timestamp: deletionTimestamp,
      });

      return {
        success: true,
        message:
          'Teacher account deleted successfully. Note: Complete deletion from Firebase may take up to 30 days.',
      };
    } catch (error) {
      console.error('Error deleting teacher account:', error);
      throw new HttpsError(
        'internal',
        'Failed to delete teacher account: ' + error.message
      );
    }
  }
);

/**
 * Get list of admin accounts
 * Only callable by super admins
 */
exports.getAdminAccounts = onCall(
  { region: 'asia-southeast1' },
  async (request) => {
    try {
      const callerToken = request.auth;
      if (!callerToken) {
        throw new HttpsError('unauthenticated', 'User must be authenticated');
      }

      const isSuperAdmin = await verifySuperAdmin(callerToken.uid);
      if (!isSuperAdmin) {
        throw new HttpsError(
          'permission-denied',
          'Only super admins can view admin accounts'
        );
      }

      const adminSnapshot = await db.ref('roles/admin').once('value');
      const admins = adminSnapshot.val() || {};

      const superAdminSnapshot = await db.ref('roles/super_admin').once('value');
      const superAdmins = superAdminSnapshot.val() || {};

      const adminList = Object.entries(admins).map(([uid, data]) => ({
        uid,
        ...data,
        role: 'admin',
      }));

      const superAdminList = Object.entries(superAdmins).map(([uid, data]) => ({
        uid,
        ...data,
        role: 'super_admin',
      }));

      return {
        success: true,
        admins: adminList,
        superAdmins: superAdminList,
      };
    } catch (error) {
      console.error('Error getting admin accounts:', error);
      throw new HttpsError(
        'internal',
        'Failed to get admin accounts: ' + error.message
      );
    }
  }
);

/**
 * Get archived teacher accounts
 * Only callable by super admins
 */
exports.getArchivedTeachers = onCall(
  { region: 'asia-southeast1' },
  async (request) => {
    try {
      const callerToken = request.auth;
      if (!callerToken) {
        throw new HttpsError('unauthenticated', 'User must be authenticated');
      }

      const isSuperAdmin = await verifySuperAdmin(callerToken.uid);
      if (!isSuperAdmin) {
        throw new HttpsError(
          'permission-denied',
          'Only super admins can view archived teachers'
        );
      }

      const archivedSnapshot = await db.ref('archived_teachers').once('value');
      const archived = archivedSnapshot.val() || {};
      const archivedTeachers = Object.entries(archived).map(([uid, record]) => ({
        uid,
        ...(record || {}),
      }));

      archivedTeachers.sort((a, b) => {
        const aTime = a.deletedAt ? new Date(a.deletedAt).getTime() : 0;
        const bTime = b.deletedAt ? new Date(b.deletedAt).getTime() : 0;
        return bTime - aTime;
      });

      return {
        success: true,
        archivedTeachers,
      };
    } catch (error) {
      console.error('Error getting archived teachers:', error);
      throw new HttpsError(
        'internal',
        'Failed to get archived teachers: ' + error.message
      );
    }
  }
);

/**
 * Restore archived teacher account
 * Only callable by super admins
 */
exports.restoreArchivedTeacher = onCall(
  { region: 'asia-southeast1' },
  async (request) => {
    const { teacherUid, restoredBy } = request.data || {};

    if (!teacherUid || !restoredBy) {
      throw new HttpsError('invalid-argument', 'Missing required fields');
    }

    try {
      const callerToken = request.auth;
      if (!callerToken) {
        throw new HttpsError('unauthenticated', 'User must be authenticated');
      }

      const isSuperAdmin = await verifySuperAdmin(callerToken.uid);
      if (!isSuperAdmin) {
        throw new HttpsError(
          'permission-denied',
          'Only super admins can restore teacher accounts'
        );
      }

      const archivedSnapshot = await db.ref(`archived_teachers/${teacherUid}`).once('value');
      const archivedRecord = archivedSnapshot.val();

      if (!archivedRecord) {
        throw new HttpsError('not-found', 'Archived record not found');
      }

      const { teacherData = {}, userData = {}, email, displayName, teacherID, rfidUid } = archivedRecord;

      // Restore teacher role data
      if (Object.keys(teacherData).length > 0) {
        await db.ref(`roles/teacher/${teacherUid}`).set(teacherData);
      } else {
        await db.ref(`roles/teacher/${teacherUid}`).set({
          displayName: displayName || userData?.displayName || null,
          email: email || userData?.email || null,
          teacherID: teacherID || userData?.teacherID || null,
          rfid_uid: rfidUid || null,
          active_status: 'offline',
          status_changed_at: Date.now(),
        });
      }

      // Restore user profile data
      if (Object.keys(userData).length > 0) {
        await db.ref(`users/${teacherUid}`).set({
          ...userData,
          uid: teacherUid,
          role: 'teacher',
        });
      } else {
        await db.ref(`users/${teacherUid}`).set({
          uid: teacherUid,
          displayName: displayName || null,
          email: email || null,
          teacherID: teacherID || null,
          role: 'teacher',
          restoredAt: new Date().toISOString(),
        });
      }

      // Restore RFID assignment if present
      if (rfidUid) {
        await db.ref(`rfid_tags/${rfidUid}/assignedTo`).set({
          facultyId: teacherUid,
          facultyName: displayName || teacherData?.displayName || 'Unknown',
        });
      }

      // Remove from archive
      await db.ref(`archived_teachers/${teacherUid}`).remove();

      // Log admin action
      await db.ref(`admin_actions/${Date.now()}`).set({
        action: 'restore_teacher',
        teacherUid,
        restoredBy,
        timestamp: new Date().toISOString(),
      });

      return {
        success: true,
        message: 'Teacher account restored successfully.',
      };
    } catch (error) {
      console.error('Error restoring archived teacher:', error);
      throw new HttpsError(
        'internal',
        'Failed to restore teacher account: ' + error.message
      );
    }
  }
);

/**
 * Helper function to verify super admin status
 */
async function verifySuperAdmin(uid) {
  try {
    const superAdminSnapshot = await db.ref(`roles/super_admin/${uid}`).once('value');
    return superAdminSnapshot.exists();
  } catch (error) {
    console.error('Error verifying super admin status:', error);
    return false;
  }
}
