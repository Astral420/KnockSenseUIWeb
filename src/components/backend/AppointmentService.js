import { getDatabase, ref, onValue, push, update, get, serverTimestamp } from 'firebase/database';

class AppointmentService {
  constructor() {
    this.MAX_APPOINTMENTS_PER_TEACHER = 3;
    this.APPOINTMENT_COOLDOWN_MS = 60000; // 1 minute 
    this.db = getDatabase();
  }

  subscribeToAllAppointments(callback) {
    const appointmentsRef = ref(this.db, 'appointments');

    const unsubscribe = onValue(appointmentsRef, (snapshot) => {
      const allAppointments = [];

      if (snapshot.exists()) {
        const allStudentData = snapshot.val();

        // Loop through each student's set of appointments
        Object.values(allStudentData).forEach(studentAppointments => {
          // Loop through each individual appointment
          Object.entries(studentAppointments).forEach(([id, appointment]) => {
            allAppointments.push({
              id,
              ...appointment,
              createdAt: appointment.createdAt ? new Date(appointment.createdAt) : null,
              respondedAt: appointment.respondedAt ? new Date(appointment.respondedAt) : null,
              scheduledTime: appointment.scheduledTime ? new Date(appointment.scheduledTime) : null
            });
          });
        });

        // Sort the combined list by creation date (newest first)
        allAppointments.sort((a, b) => {
          if (!a.createdAt || !b.createdAt) return 0;
          return b.createdAt - a.createdAt;
        });
      }

      callback(allAppointments);
    });

    return unsubscribe;
  }

  // Check if student has reached max appointments with a teacher
  async getActiveAppointmentCount(studentNumber, teacherUid) {
    try {
      const appointmentsRef = ref(this.db, `appointments/${studentNumber}`);
      const snapshot = await get(appointmentsRef);
      
      if (!snapshot.exists()) return 0;
      
      const appointments = snapshot.val();
      let activeCount = 0;
      
      Object.values(appointments).forEach(appointment => {
        if (appointment.teacherUid === teacherUid && 
           (appointment.status === 'pending' || appointment.status === 'accepted')) {
          activeCount++;
        }
      });
      
      return activeCount;
    } catch (error) {
      console.error('Error getting active appointment count:', error);
      return 0;
    }
  }

  // Check if student has pending appointment with teacher
  async hasPendingAppointment(studentNumber, teacherUid) {
    try {
      const appointmentsRef = ref(this.db, `appointments/${studentNumber}`);
      const snapshot = await get(appointmentsRef);
      
      if (!snapshot.exists()) return false;
      
      const appointments = snapshot.val();
      
      for (const appointment of Object.values(appointments)) {
        if (appointment.teacherUid === teacherUid && appointment.status === 'pending') {
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.error('Error checking pending appointment:', error);
      return false;
    }
  }

  // Check if student is within cooldown period (3 minutes after last appointment)
  async isWithinCooldown(studentNumber) {
    try {
      const appointmentsRef = ref(this.db, `appointments/${studentNumber}`);
      const snapshot = await get(appointmentsRef);
      
      if (!snapshot.exists()) return false;
      
      const appointments = snapshot.val();
      const now = Date.now();
      
      // Find the most recent appointment
      let mostRecentTime = 0;
      Object.values(appointments).forEach(appointment => {
        const createdAt = appointment.createdAt;
        if (createdAt && createdAt > mostRecentTime) {
          mostRecentTime = createdAt;
        }
      });
      
      if (mostRecentTime === 0) return false;
      
      // Check if within 3-minute cooldown
      const timeSinceLastAppointment = now - mostRecentTime;
      if (timeSinceLastAppointment < this.APPOINTMENT_COOLDOWN_MS) {
        const remainingSeconds = Math.ceil((this.APPOINTMENT_COOLDOWN_MS - timeSinceLastAppointment) / 1000);
        return {
          inCooldown: true,
          remainingSeconds,
          remainingMinutes: Math.ceil(remainingSeconds / 60)
        };
      }
      
      return false;
    } catch (error) {
      console.error('Error checking cooldown:', error);
      return false;
    }
  }

  // Create a new appointment
  async createAppointment(studentData, teacherData, studentNote = null) {
    try {
      const { studentNumber, displayName: studentName, uid: studentUid, photoUrl: studentPhotoUrl } = studentData;
      const { uid: teacherUid, name: teacherName, photoUrl: teacherPhotoUrl } = teacherData;

      // Check cooldown period
      const cooldownStatus = await this.isWithinCooldown(studentNumber);
      if (cooldownStatus && cooldownStatus.inCooldown) {
        return {
          success: false,
          error: `Please wait ${cooldownStatus.remainingMinutes} more minute(s) before making another appointment.`
        };
      }

      // Check active appointment count
      const activeCount = await this.getActiveAppointmentCount(studentNumber, teacherUid);
      if (activeCount >= this.MAX_APPOINTMENTS_PER_TEACHER) {
        return {
          success: false,
          error: `You have reached the maximum of ${this.MAX_APPOINTMENTS_PER_TEACHER} active appointments with this teacher.`
        };
      }

      // Check for pending appointment
      const hasPending = await this.hasPendingAppointment(studentNumber, teacherUid);
      if (hasPending) {
        return {
          success: false,
          error: 'You already have a pending appointment with this teacher. Please wait for a response.'
        };
      }

      // Create appointment reference
      const appointmentRef = push(ref(this.db, `appointments/${studentNumber}`));
      const appointmentId = appointmentRef.key;

      // Create appointment data
      const appointmentData = {
        studentUid,
        studentNumber,
        studentName,
        studentPhotoUrl: studentPhotoUrl || null,
        teacherUid,
        teacherName,
        teacherPhotoUrl: teacherPhotoUrl || null,
        status: 'pending',
        createdAt: serverTimestamp(),
        studentNote
      };

      // Create teacher index entry
      const teacherIndexData = {
        studentNumber,
        appointmentId,
        status: 'pending',
        createdAt: serverTimestamp()
      };

      // Atomic update
      const updates = {};
      updates[`appointments/${studentNumber}/${appointmentId}`] = appointmentData;
      updates[`teacher_appointments/${teacherUid}/${appointmentId}`] = teacherIndexData;

      await update(ref(this.db), updates);

      return {
        success: true,
        appointmentId
      };
    } catch (error) {
      console.error('Error creating appointment:', error);
      return {
        success: false,
        error: 'Failed to create appointment. Please try again.'
      };
    }
  }

  // Subscribe to student appointments
  subscribeToStudentAppointments(studentNumber, callback) {
    const appointmentsRef = ref(this.db, `appointments/${studentNumber}`);
    
    const unsubscribe = onValue(appointmentsRef, (snapshot) => {
      const appointments = [];
      
      if (snapshot.exists()) {
        const data = snapshot.val();
        Object.entries(data).forEach(([id, appointment]) => {
          appointments.push({
            id,
            ...appointment,
            // Convert timestamp to Date if needed
            createdAt: appointment.createdAt ? new Date(appointment.createdAt) : null,
            respondedAt: appointment.respondedAt ? new Date(appointment.respondedAt) : null,
            scheduledTime: appointment.scheduledTime ? new Date(appointment.scheduledTime) : null
          });
        });
        
        // Sort by creation date (newest first)
        appointments.sort((a, b) => {
          if (!a.createdAt || !b.createdAt) return 0;
          return b.createdAt - a.createdAt;
        });
      }
      
      callback(appointments);
    });
    
    return unsubscribe;
  }

  // Cancel appointment
  async cancelAppointment(studentNumber, appointmentId, teacherUid) {
    try {
      const updates = {};
      updates[`appointments/${studentNumber}/${appointmentId}/status`] = 'cancelled';
      updates[`teacher_appointments/${teacherUid}/${appointmentId}/status`] = 'cancelled';
      
      await update(ref(this.db), updates);
      return { success: true };
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      return { success: false, error: 'Failed to cancel appointment' };
    }
  }

  // Get appointment statistics for dashboard
  async getAppointmentStats(studentNumber) {
    try {
      const appointmentsRef = ref(this.db, `appointments/${studentNumber}`);
      const snapshot = await get(appointmentsRef);
      
      if (!snapshot.exists()) {
        return {
          total: 0,
          pending: 0,
          accepted: 0,
          completed: 0,
          cancelled: 0,
          denied: 0
        };
      }
      
      const appointments = snapshot.val();
      const stats = {
        total: 0,
        pending: 0,
        accepted: 0,
        completed: 0,
        cancelled: 0,
        denied: 0
      };
      
      Object.values(appointments).forEach(appointment => {
        stats.total++;
        if (appointment.status) {
          stats[appointment.status] = (stats[appointment.status] || 0) + 1;
        }
      });
      
      return stats;
    } catch (error) {
      console.error('Error getting appointment stats:', error);
      return {
        total: 0,
        pending: 0,
        accepted: 0,
        completed: 0,
        cancelled: 0,
        denied: 0
      };
    }
  }
}

export const appointmentService = new AppointmentService();
export default appointmentService;