import { getDatabase, ref, onValue } from 'firebase/database';

class TeacherService {
  constructor() {
    this.listeners = new Set();
    this.offTeachers = null;
    this.offUsers = null;
    this.offRfidTags = null; // Add RFID listener
    this.teachersRaw = {}; // roles/teacher snapshot
    this.usersRaw = {};    // users snapshot
    this.rfidTagsRaw = {}; // rfid_tags snapshot
  }

  // Map raw teacher snapshot to UI-friendly object
  mapTeacher(key, t) {
    const raw = (t?.active_status || 'offline').toLowerCase();
    const normalizedStatus = raw === 'online' ? 'Online' : raw === 'busy' ? 'Busy' : 'Offline';
    const active = normalizedStatus !== 'Offline';
    const displayName = t?.displayName || 'Unknown';
    const initials = displayName
      .split(' ')
      .map((n) => n.charAt(0))
      .join('')
      .toUpperCase() || 'UN';

    // Find assigned RFID info
    let assignedRfidInfo = null;
    if (t?.rfid_uid) {
      const rfidTag = this.rfidTagsRaw[t.rfid_uid];
      if (rfidTag) {
        assignedRfidInfo = {
          uid: t.rfid_uid,
          status: rfidTag.status || 'inactive',
          assignedTo: rfidTag.assignedTo
        };
      }
    }

    return {
      id: key,
      name: displayName,
      email: t?.email || '',
      teacherID: t?.teacherID || key,
      rfid: t?.rfid_uid || '--',
      rfidInfo: assignedRfidInfo, // Add detailed RFID info
      status: normalizedStatus,
      isActive: active,
      lastSeen: 'Pending',
      timeIn: '--',
      timeOut: '--',
      photoUrl: t?.photoUrl || '',
      initials,
      color: 'bg-blue-500',
    };
  }

  subscribeToTeachers(callback, errorCallback) {
    this.listeners.add(callback);

    // Start listeners once
    if (!this.offTeachers || !this.offUsers || !this.offRfidTags) {
      const db = getDatabase();

      // Listen to roles/teacher
      const teachersRef = ref(db, 'roles/teacher');
      this.offTeachers = onValue(
        teachersRef,
        (snap) => {
          this.teachersRaw = snap.val() || {};
          this.emit();
        },
        (err) => {
          if (errorCallback) errorCallback(err);
          this.emit(true);
        }
      );

      // Listen to users (private; used to enrich with displayName/photo)
      const usersRef = ref(db, 'users');
      this.offUsers = onValue(
        usersRef,
        (snap) => {
          this.usersRaw = snap.val() || {};
          this.emit();
        },
        (err) => {
          // If users read fails (e.g., guest), emit using teachers only
          if (errorCallback) errorCallback(err);
          this.usersRaw = {};
          this.emit();
        }
      );

      // Listen to rfid_tags for assignment info
      const rfidTagsRef = ref(db, 'rfid_tags');
      this.offRfidTags = onValue(
        rfidTagsRef,
        (snap) => {
          this.rfidTagsRaw = snap.val() || {};
          this.emit();
        },
        (err) => {
          // If RFID read fails, continue without RFID data
          console.warn('RFID tags read failed:', err);
          this.rfidTagsRaw = {};
          this.emit();
        }
      );
    }
  }

  // Combine teachers and users and notify listeners
  emit(error = false) {
    if (error) {
      for (const cb of this.listeners) cb([]);
      return;
    }

    // Build indices for users by uid and by teacherID
    const usersByUid = this.usersRaw || {};
    const usersByTeacherId = {};
    for (const [uUid, u] of Object.entries(usersByUid)) {
      const tid = u?.teacherID;
      if (tid) usersByTeacherId[tid] = u;
    }

    const mapped = Object.entries(this.teachersRaw || {}).map(([uid, t]) => {
      const u = usersByUid[uid] || (t?.teacherID ? usersByTeacherId[t.teacherID] : undefined) || {};
      const base = this.mapTeacher(uid, t || {});
      return {
        ...base,
        name: u?.displayName || base.name,
        email: u?.email || base.email,
        photoUrl: u?.photoUrl || base.photoUrl,
        teacherID: u?.teacherID || base.teacherID,
      };
    });

    for (const cb of this.listeners) cb(mapped);
  }

  unsubscribeFromTeachers(callback) {
    this.listeners.delete(callback);
    // If no more listeners, stop the Firebase listener
    if (this.listeners.size === 0) {
      if (this.offTeachers) {
        this.offTeachers();
        this.offTeachers = null;
      }
      if (this.offUsers) {
        this.offUsers();
        this.offUsers = null;
      }
      if (this.offRfidTags) {
        this.offRfidTags();
        this.offRfidTags = null;
      }
    }
  }
}

export const teacherService = new TeacherService();
export default teacherService;