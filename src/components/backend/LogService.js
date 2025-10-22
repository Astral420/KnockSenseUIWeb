import { getDatabase, ref, onValue, query, orderByChild } from 'firebase/database';

class LogService {
  constructor() {
    this.accessLogsListener = null;
    this.attendanceLogsListener = null;
    this.offAccessLogs = null;
    this.offAttendanceLogs = null;
  }

  /**
   * Subscribe to access logs
   * @param {Function} onUpdate - Callback function that receives array of access logs
   * @param {Function} onError - Callback function for errors
   */
  subscribeToAccessLogs(onUpdate, onError) {
    try {
      const db = getDatabase();
      const accessLogsRef = ref(db, 'access_logs');
      const accessLogsQuery = query(accessLogsRef, orderByChild('timestamp'));

      this.offAccessLogs = onValue(
        accessLogsQuery,
        (snapshot) => {
          const logs = [];
          if (snapshot.exists()) {
            snapshot.forEach((childSnapshot) => {
              const logData = childSnapshot.val();
              logs.push({
                id: childSnapshot.key,
                deviceIP: logData.deviceIP || logData.device_ip || 'Unknown',
                reader: logData.reader !== undefined ? logData.reader : null,
                readerRole: logData.readerRole || logData.reader_role || 'Unknown',
                result: logData.result || 'Unknown',
                timestamp: logData.timestamp || Date.now(),
                uid: logData.uid || 'Unknown'
              });
            });
          }
          // Sort by timestamp descending (newest first)
          logs.sort((a, b) => b.timestamp - a.timestamp);
          onUpdate(logs);
        },
        (error) => {
          console.error('Error subscribing to access logs:', error);
          if (onError) onError(error);
        }
      );
    } catch (error) {
      console.error('Error setting up access logs subscription:', error);
      if (onError) onError(error);
    }
  }

  /**
   * Subscribe to attendance logs
   * @param {Function} onUpdate - Callback function that receives array of attendance logs
   * @param {Function} onError - Callback function for errors
   */
  subscribeToAttendanceLogs(onUpdate, onError) {
    try {
      const db = getDatabase();
      const attendanceLogsRef = ref(db, 'attendance_logs');

      this.offAttendanceLogs = onValue(
        attendanceLogsRef,
        (snapshot) => {
          const logs = [];
          if (snapshot.exists()) {
            snapshot.forEach((teacherSnapshot) => {
              const teacherId = teacherSnapshot.key;
              const teacherData = teacherSnapshot.val();
              
              if (teacherData.logs) {
                Object.entries(teacherData.logs).forEach(([logId, logData]) => {
                  logs.push({
                    id: logId,
                    teacherId: teacherId,
                    action: logData.action || 'unknown',
                    deviceIP: logData.device_ip || 'Unknown',
                    readerId: logData.reader_id !== undefined ? logData.reader_id : null,
                    timestamp: logData.timestamp || Date.now(),
                    currentStatus: teacherData.current_status || 'unknown',
                    lastActivity: teacherData.last_activity || null
                  });
                });
              }
            });
          }
          // Sort by timestamp descending (newest first)
          logs.sort((a, b) => b.timestamp - a.timestamp);
          onUpdate(logs);
        },
        (error) => {
          console.error('Error subscribing to attendance logs:', error);
          if (onError) onError(error);
        }
      );
    } catch (error) {
      console.error('Error setting up attendance logs subscription:', error);
      if (onError) onError(error);
    }
  }

  /**
   * Unsubscribe from access logs
   */
  unsubscribeFromAccessLogs() {
    if (this.offAccessLogs) {
      this.offAccessLogs();
      this.offAccessLogs = null;
    }
  }

  /**
   * Unsubscribe from attendance logs
   */
  unsubscribeFromAttendanceLogs() {
    if (this.offAttendanceLogs) {
      this.offAttendanceLogs();
      this.offAttendanceLogs = null;
    }
  }

  /**
   * Unsubscribe from all logs
   */
  unsubscribeFromAll() {
    this.unsubscribeFromAccessLogs();
    this.unsubscribeFromAttendanceLogs();
  }
}

export const logService = new LogService();
