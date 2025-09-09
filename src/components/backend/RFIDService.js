import { getDatabase, ref, onValue, set, remove } from 'firebase/database';

class RFIDService {
  constructor() {
    this.listeners = new Set();
    this.offRfidTags = null;
    this.offTeachers = null;
    this.rfidTagsRaw = {};
    this.teachersRaw = {};
  }

  subscribeToRFIDTags(callback, errorCallback) {
    this.listeners.add(callback);

    if (!this.offRfidTags || !this.offTeachers) {
      const db = getDatabase();

      // Listen to rfid_tags
      const rfidTagsRef = ref(db, 'rfid_tags');
      this.offRfidTags = onValue(
        rfidTagsRef,
        (snap) => {
          this.rfidTagsRaw = snap.val() || {};
          this.emit();
        },
        (err) => {
          if (errorCallback) errorCallback(err);
          this.emit(true);
        }
      );

      // Listen to roles/teacher for assignment details
      const teachersRef = ref(db, 'roles/teacher');
      this.offTeachers = onValue(
        teachersRef,
        (snap) => {
          this.teachersRaw = snap.val() || {};
          this.emit();
        },
        (err) => {
          console.warn('Teachers read failed:', err);
          this.teachersRaw = {};
          this.emit();
        }
      );
    }
  }

  emit(error = false) {
    if (error) {
      for (const cb of this.listeners) cb([]);
      return;
    }

    // Create a map of teacherID to teacher info
    const teachersByID = {};
    Object.entries(this.teachersRaw).forEach(([uid, teacher]) => {
      if (teacher.teacherID) {
        teachersByID[teacher.teacherID] = {
          ...teacher,
          uid: uid
        };
      }
    });

    // Map RFID tags with assignment information
    const mapped = Object.entries(this.rfidTagsRaw).map(([uid, tag]) => {
      let assignedTo = null;
      
      if (tag.assignedTo) {
        const teacher = teachersByID[tag.assignedTo];
        if (teacher) {
          assignedTo = {
            facultyId: teacher.uid,
            facultyName: teacher.displayName || 'Unknown Teacher',
            teacherID: teacher.teacherID
          };
        }
      }

      return {
        uid: uid,
        status: tag.status || 'inactive',
        assignedTo: assignedTo,
        createdAt: tag.createdAt || Date.now()
      };
    });

    for (const cb of this.listeners) cb(mapped);
  }

  unsubscribeFromRFIDTags(callback) {
    this.listeners.delete(callback);
    
    if (this.listeners.size === 0) {
      if (this.offRfidTags) {
        this.offRfidTags();
        this.offRfidTags = null;
      }
      if (this.offTeachers) {
        this.offTeachers();
        this.offTeachers = null;
      }
    }
  }

  async updateRFIDStatus(uid, status) {
    const db = getDatabase();
    await set(ref(db, `rfid_tags/${uid}/status`), status);
  }

  async assignRFIDToFaculty(rfidUid, teacherUID, teacherName) {
    const db = getDatabase();
    
    // Find the teacher's teacherID from the UID
    const teacher = this.teachersRaw[teacherUID];
    if (!teacher || !teacher.teacherID) {
      throw new Error('Teacher not found or missing teacherID');
    }

    // Update RFID tag assignment
    await set(ref(db, `rfid_tags/${rfidUid}/assignedTo`), teacher.teacherID);
    
    // Update teacher's rfid_uid
    await set(ref(db, `roles/teacher/${teacherUID}/rfid_uid`), rfidUid);
  }

  async unassignRFID(rfidUid) {
    const db = getDatabase();
    
    // Find which teacher has this RFID assigned
    const tag = this.rfidTagsRaw[rfidUid];
    if (tag && tag.assignedTo) {
      // Find teacher by teacherID and remove their rfid_uid
      Object.entries(this.teachersRaw).forEach(async ([teacherUID, teacher]) => {
        if (teacher.teacherID === tag.assignedTo) {
          await remove(ref(db, `roles/teacher/${teacherUID}/rfid_uid`));
        }
      });
    }
    
    // Remove assignment from RFID tag
    await remove(ref(db, `rfid_tags/${rfidUid}/assignedTo`));
  }

  async deleteRFIDTag(uid) {
    const db = getDatabase();
    
    // First unassign if assigned
    await this.unassignRFID(uid);
    
    // Then delete the tag
    await remove(ref(db, `rfid_tags/${uid}`));
  }
}

export const rfidService = new RFIDService();
export default rfidService;