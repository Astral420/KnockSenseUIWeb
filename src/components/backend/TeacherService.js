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

  // Utility function to check if a timestamp is from today
  isToday(timestamp) {
    if (!timestamp) return false;
    try {
      const date = new Date(parseInt(timestamp));
      const today = new Date();
      return date.toDateString() === today.toDateString();
    } catch (error) {
      return false;
    }
  }

  // Utility function to calculate time difference
  getTimeDifference(startTime, endTime) {
    if (!startTime || !endTime) return null;
    try {
      const start = new Date(parseInt(startTime));
      const end = new Date(parseInt(endTime));
      const diffMs = end - start;
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      return `${hours}h ${minutes}m`;
    } catch (error) {
      return null;
    }
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

    // Format time tracking data
    const formatTime = (timestamp) => {
      if (!timestamp) return '--';
      try {
        const date = new Date(parseInt(timestamp));
        return date.toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: true 
        });
      } catch (error) {
        console.warn('Invalid timestamp:', timestamp);
        return '--';
      }
    };

    // Get first time in for today (prioritize today_first_entry, fallback to last_entry_time)
    const firstTimeIn = t?.today_first_entry || t?.last_entry_time;
    const lastTimeOut = t?.today_last_exit || t?.last_exit_time;

    // Calculate time spent today if we have both entry and exit times
    const timeSpentToday = this.getTimeDifference(t?.today_first_entry, t?.today_last_exit);
    
    // Check if teacher is currently in (has entry but no exit today)
    const isCurrentlyIn = t?.today_first_entry && !t?.today_last_exit && this.isToday(t?.today_first_entry);

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
      timeIn: formatTime(firstTimeIn),
      timeOut: formatTime(lastTimeOut),
      // Add raw timestamp data for debugging/advanced use
      rawTimeData: {
        today_first_entry: t?.today_first_entry,
        today_last_exit: t?.today_last_exit,
        last_entry_time: t?.last_entry_time,
        last_exit_time: t?.last_exit_time
      },
      // Additional time tracking info
      timeTracking: {
        timeSpentToday: timeSpentToday,
        isCurrentlyIn: isCurrentlyIn,
        hasEntryToday: this.isToday(t?.today_first_entry),
        hasExitToday: this.isToday(t?.today_last_exit)
      },
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