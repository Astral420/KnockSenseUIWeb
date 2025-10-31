const functions = require('firebase-functions/v1');
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

exports.handleTeacherAuthReactivation = functions
  .region('asia-southeast1')
  .auth.user()
  .onCreate(async (user) => {
    const email = user.email;
    if (!email) {
      return;
    }

    const normalizedEmail = normalizeEmail(email);
    const emailKey = encodeKey(normalizedEmail);
    const linkSnapshot = await db
      .ref(`reactivated_teacher_links/${emailKey}`)
      .once('value');
    const link = linkSnapshot.val();

    if (!link?.originalUid) {
      return;
    }

    const originalUid = link.originalUid;
    const newUid = user.uid;

    if (originalUid === newUid) {
      await db.ref(`reactivated_teacher_links/${emailKey}`).remove();
      return;
    }

    const [teacherSnapshot, userSnapshot] = await Promise.all([
      db.ref(`roles/teacher/${originalUid}`).once('value'),
      db.ref(`users/${originalUid}`).once('value'),
    ]);

    const teacherData = teacherSnapshot.val();
    const userData = userSnapshot.val();

    if (teacherData) {
      await db.ref(`roles/teacher/${newUid}`).set({
        ...teacherData,
        restoredFromUid: originalUid,
        teacherUid: newUid,
      });
    }

    if (userData) {
      await db.ref(`users/${newUid}`).set({
        ...userData,
        uid: newUid,
        restoredFromUid: originalUid,
      });
    }

    const teacherIdForRfid =
      teacherData?.teacherID ||
      userData?.teacherID ||
      link.teacherID ||
      null;

    if (link.rfidUid && teacherIdForRfid) {
      await db.ref(`rfid_tags/${link.rfidUid}/assignedTo`).set(teacherIdForRfid);
    }

    await Promise.all([
      db.ref(`roles/teacher/${originalUid}`).remove(),
      db.ref(`users/${originalUid}`).remove(),
      db.ref(`reactivated_teacher_links/${emailKey}`).remove(),
    ]);

    await db.ref(`admin_actions/${Date.now()}`).set({
      action: 'teacher_uid_relinked',
      email,
      oldUid: originalUid,
      newUid,
      timestamp: new Date().toISOString(),
    });
  });

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
 * Archive a teacher account (soft delete)
 * Only callable by super admins
 */
exports.archiveTeacherAccount = onCall(
  { region: 'asia-southeast1' },
  async (request) => {
    const { teacherUid, deletedBy } = request.data || {};

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
          'Only super admins can archive teacher accounts'
        );
      }

      const teacherSnapshot = await db.ref(`roles/teacher/${teacherUid}`).once('value');
      const userSnapshot = await db.ref(`users/${teacherUid}`).once('value');
      const teacherData = teacherSnapshot.val() || null;
      const userData = userSnapshot.val() || null;

      if (!teacherData && !userData) {
        throw new HttpsError('not-found', 'Teacher account not found');
      }

      const archivedAt = new Date().toISOString();
      const displayName = teacherData?.displayName || userData?.displayName || null;
      const email = teacherData?.email || userData?.email || null;
      const teacherID = teacherData?.teacherID || userData?.teacherID || null;
      const rfidUid = teacherData?.rfid_uid || null;
      const normalizedEmail = email ? normalizeEmail(email) : null;
      const emailKey = normalizedEmail ? encodeKey(normalizedEmail) : null;

      const archivedRecord = {
        teacherUid,
        displayName,
        email,
        teacherID,
        rfidUid,
        archivedAt,
        archivedBy: deletedBy,
        archivedReason: request.data?.reason || null,
        teacherData: teacherData || null,
        userData: userData || null,
      };

      await db.ref(`archived_teachers/${teacherUid}`).set(archivedRecord);

      if (emailKey) {
        await db.ref(`reactivated_teacher_links/${emailKey}`).set({
          originalUid: teacherUid,
          email,
          normalizedEmail,
          rfidUid: rfidUid || null,
          teacherID: teacherID || null,
          archivedAt,
        });
      }

      await Promise.all([
        db.ref(`roles/teacher/${teacherUid}`).remove(),
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
        db.ref(`fcm_tokens/${teacherUid}`).remove(),
      ]);

      await db.ref(`users/${teacherUid}`).set({
        uid: teacherUid,
        role: 'teacher',
        displayName,
        email,
        teacherID,
        accountStatus: 'archived',
        archivedAt,
        archivedBy: deletedBy,
        lastLogin: userData?.lastLogin || null,
        photoUrl: userData?.photoUrl || null,
      });

      try {
        await auth.updateUser(teacherUid, {disabled: true});
      } catch (authError) {
        if (authError?.code === 'auth/user-not-found') {
          console.warn(`Auth user ${teacherUid} not found during archive; continuing cleanup.`);
        } else {
          throw authError;
        }
      }

      await db.ref(`admin_actions/${Date.now()}`).set({
        action: 'archive_teacher',
        teacherUid,
        teacherName: displayName || 'Unknown',
        archivedBy: deletedBy,
        archivedAt,
        archivedPath: `archived_teachers/${teacherUid}`,
      });

      return {
        success: true,
        message: 'Teacher account archived and login disabled.',
      };
    } catch (error) {
      console.error('Error archiving teacher account:', error);
      throw new HttpsError(
        'internal',
        'Failed to archive teacher account: ' + error.message
      );
    }
  }
);

// exports.deleteTeacherAccount = exports.archiveTeacherAccount;

/**
 * 
 * delete a teacher account (irreversible)
 * Only callable by super admins
 */
exports.hardDeleteTeacherAccount = onCall(
  { region: 'asia-southeast1' },
  async (request) => {
    const { teacherUid, deletedBy } = request.data || {};

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
          'Only super admins can hard delete teacher accounts'
        );
      }

      const [teacherSnapshot, userSnapshot, archivedSnapshot] = await Promise.all([
        db.ref(`roles/teacher/${teacherUid}`).once('value'),
        db.ref(`users/${teacherUid}`).once('value'),
        db.ref(`archived_teachers/${teacherUid}`).once('value'),
      ]);

      const teacherData = teacherSnapshot.val() || null;
      const userData = userSnapshot.val() || null;
      const archivedData = archivedSnapshot.val() || null;
      const email = archivedData?.email || teacherData?.email || userData?.email || null;
      const rfidUid =
        archivedData?.rfidUid || teacherData?.rfid_uid || userData?.rfid_uid || null;

      try {
        await auth.deleteUser(teacherUid);
      } catch (authError) {
        if (authError?.code === 'auth/user-not-found') {
          console.warn(`Auth user ${teacherUid} already absent during hard delete.`);
        } else {
          throw authError;
        }
      }

      await Promise.all([
        db.ref(`roles/teacher/${teacherUid}`).remove(),
        db.ref(`users/${teacherUid}`).remove(),
        db.ref(`archived_teachers/${teacherUid}`).remove(),
        db.ref(`fcm_tokens/${teacherUid}`).remove(),
        db
          .ref('appointments')
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
        rfidUid ? db.ref(`rfid_tags/${rfidUid}/assignedTo`).remove() : Promise.resolve(),
      ]);

      if (email) {
        const normalizedEmail = normalizeEmail(email);
        const emailKey = encodeKey(normalizedEmail);
        await db.ref(`reactivated_teacher_links/${emailKey}`).remove();
      }

      await db.ref(`admin_actions/${Date.now()}`).set({
        action: 'hard_delete_teacher',
        teacherUid,
        deletedBy,
        timestamp: new Date().toISOString(),
      });

      return {
        success: true,
        message: 'Teacher account permanently deleted.',
      };
    } catch (error) {
      console.error('Error hard deleting teacher account:', error);
      throw new HttpsError(
        'internal',
        'Failed to hard delete teacher account: ' + error.message
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
      const restorationTimestamp = new Date().toISOString();
      const normalizedEmail = email ? normalizeEmail(email) : null;
      const emailKey = normalizedEmail ? encodeKey(normalizedEmail) : null;

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

      const teacherIdForRfid =
        teacherData?.teacherID ||
        userData?.teacherID ||
        teacherID ||
        null;

      // Restore RFID assignment if present
      if (rfidUid && teacherIdForRfid) {
        await db.ref(`rfid_tags/${rfidUid}/assignedTo`).set(teacherIdForRfid);
      }

      try {
        await auth.updateUser(teacherUid, {disabled: false});
      } catch (authError) {
        if (authError?.code === 'auth/user-not-found') {
          console.warn(`Auth user ${teacherUid} missing during restore; skipping enable.`);
        } else {
          throw authError;
        }
      }

      if (emailKey) {
        await db.ref(`reactivated_teacher_links/${emailKey}`).set({
          originalUid: teacherUid,
          email,
          rfidUid: rfidUid || null,
          teacherID: teacherIdForRfid,
          restoredAt: restorationTimestamp,
          normalizedEmail,
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

function normalizeEmail(email) {
  return (email || '').trim().toLowerCase();
}

function encodeKey(key) {
  return (key || '').replace(/[.#$\[\]]/g, '_');
}
