import { getDatabase, ref, onValue, set, push, serverTimestamp } from 'firebase/database';
import { auth } from './auth/AuthService';

// Get database instance - will be initialized when Firebase app is ready
let database = null;

const getDatabaseInstance = () => {
  if (!database) {
    try {
      database = getDatabase();
    } catch (error) {
      console.error('Failed to initialize Firebase database:', error);
      throw error;
    }
  }
  return database;
};

export class RFIDService {
  constructor() {
    this.rfidTags = [];
    this.listeners = new Set();
    this.isListening = false;
    this.retryCount = 0;
    this.maxRetries = 3;
    this.retryDelay = 1000; // 1 second
  }

  // Retry mechanism for database operations
  async retryOperation(operation, context = 'operation') {
    try {
      return await operation();
    } catch (error) {
      if (this.retryCount < this.maxRetries) {
        this.retryCount++;
        console.warn(`${context} failed, retrying in ${this.retryDelay}ms (attempt ${this.retryCount}/${this.maxRetries}):`, error);
        
        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
        return this.retryOperation(operation, context);
      } else {
        console.error(`${context} failed after ${this.maxRetries} retries:`, error);
        throw error;
      }
    }
  }

  // Subscribe to RFID tags changes
  subscribeToRFIDTags(callback) {
    this.listeners.add(callback);
    
    if (!this.isListening) {
      this.retryOperation(async () => {
        const database = getDatabaseInstance();
        const rfidTagsRef = ref(database, 'rfid_tags');
        
        onValue(rfidTagsRef, (snapshot) => {
          const data = snapshot.val();
          if (data) {
            // Convert Firebase object to array format
            this.rfidTags = Object.keys(data).map(uid => ({
              uid: uid,
              status: data[uid].status || 'inactive',
              createdAt: data[uid].createdAt || null,
              assignedTo: data[uid].assignedTo || null, // Future assignment support
              lastAccess: data[uid].lastAccess || null
            }));
          } else {
            this.rfidTags = [];
          }

          // Reset retry count on successful operation
          this.retryCount = 0;
          
          // Notify all subscribers
          this.listeners.forEach(callback => callback(this.rfidTags));
        }, (error) => {
          console.error('Error listening to RFID tags:', error);
          // Notify subscribers with empty array on error
          this.listeners.forEach(callback => callback([]));
        });
        
        this.isListening = true;
      }, 'RFID subscription').catch(error => {
        console.error('Failed to subscribe to RFID tags after retries:', error);
        // Notify subscribers with empty array on error
        this.listeners.forEach(callback => callback([]));
      });
    } else {
      // If already listening, immediately call callback with current data
      callback(this.rfidTags);
    }
  }

  // Unsubscribe from RFID tags changes
  unsubscribeFromRFIDTags(callback) {
    this.listeners.delete(callback);
  }

  // Update RFID tag status (active/inactive)
  async updateRFIDStatus(uid, status) {
    try {
      await this.retryOperation(async () => {
        const database = getDatabaseInstance();
        const rfidRef = ref(database, `rfid_tags/${uid}/status`);
        await set(rfidRef, status);
      }, 'Update RFID status');
      return { success: true };
    } catch (error) {
      console.error('Error updating RFID status:', error);
      return { success: false, error: error.message };
    }
  }

  // Assign RFID to faculty member
  async assignRFIDToFaculty(uid, facultyId, facultyName) {
    try {
      await this.retryOperation(async () => {
        const database = getDatabaseInstance();
        const updates = {};
        updates[`rfid_tags/${uid}/assignedTo`] = {
          facultyId: facultyId,
          facultyName: facultyName,
          assignedAt: serverTimestamp()
        };
        
        const dbRef = ref(database);
        await set(dbRef, updates);
      }, 'Assign RFID to faculty');
      return { success: true };
    } catch (error) {
      console.error('Error assigning RFID:', error);
      return { success: false, error: error.message };
    }
  }

  // Unassign RFID from faculty member
  async unassignRFID(uid) {
    try {
      await this.retryOperation(async () => {
        const database = getDatabaseInstance();
        const assignedRef = ref(database, `rfid_tags/${uid}/assignedTo`);
        await set(assignedRef, null);
      }, 'Unassign RFID');
      return { success: true };
    } catch (error) {
      console.error('Error unassigning RFID:', error);
      return { success: false, error: error.message };
    }
  }

  // Delete RFID tag
  async deleteRFIDTag(uid) {
    try {
      await this.retryOperation(async () => {
        const database = getDatabaseInstance();
        const rfidRef = ref(database, `rfid_tags/${uid}`);
        await set(rfidRef, null);
      }, 'Delete RFID tag');
      return { success: true };
    } catch (error) {
      console.error('Error deleting RFID:', error);
      return { success: false, error: error.message };
    }
  }

  // Get access logs
  subscribeToAccessLogs(callback, limit = 50) {
    try {
      const database = getDatabaseInstance();
      const logsRef = ref(database, 'access_logs');
      
      onValue(logsRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          // Convert to array and sort by timestamp (most recent first)
          const logs = Object.keys(data).map(key => ({
            id: key,
            ...data[key]
          })).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)).slice(0, limit);
          
          callback(logs);
        } else {
          callback([]);
        }
      }, (error) => {
        console.error('Error listening to access logs:', error);
        callback([]);
      });
    } catch (error) {
      console.error('Failed to subscribe to access logs:', error);
      callback([]);
    }
  }

  // Get current RFID tags (synchronous)
  getCurrentRFIDTags() {
    return this.rfidTags;
  }

  // Check if user is authorized to manage RFID
  isAuthorizedUser() {
    const user = auth.currentUser;
    if (!user) return false;
    
    // Check if user is admin
    const adminEmails = ['coolrigby101@gmail.com', 'fateh8er201@gmail.com'];
    return adminEmails.includes(user.email);
  }
}

// WebSocket service for ESP32 communication
export class ESPWebSocketService {
  constructor() {
    this.ws = null;
    this.isConnected = false;
    this.scanModeEnabled = false;
    this.messageHandlers = new Set();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }

  // Connect to ESP32 WebSocket
  connect(espIP = '192.168.1.100', port = 81) {
    try {
      this.ws = new WebSocket(`ws://${espIP}:${port}`);
      
      this.ws.onopen = () => {
        console.log('Connected to ESP32 WebSocket');
        this.isConnected = true;
        this.reconnectAttempts = 0;
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.ws.onclose = () => {
        console.log('ESP32 WebSocket connection closed');
        this.isConnected = false;
        this.attemptReconnect(espIP, port);
      };

      this.ws.onerror = (error) => {
        console.error('ESP32 WebSocket error:', error);
      };

    } catch (error) {
      console.error('Error connecting to ESP32:', error);
    }
  }

  // Attempt to reconnect
  attemptReconnect(espIP, port) {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      setTimeout(() => {
        this.connect(espIP, port);
      }, 2000 * this.reconnectAttempts); // Exponential backoff
    }
  }

  // Handle incoming messages from ESP32
  handleMessage(message) {
    // Notify all message handlers
    this.messageHandlers.forEach(handler => handler(message));

    // Handle specific message types
    switch (message.type) {
      case 'rfid_scanned':
        if (this.scanModeEnabled) {
          console.log('New RFID scanned in scan mode:', message.uid);
          // The ESP32 will automatically add to Firebase when scan mode is enabled
        }
        break;
      
      case 'access_attempt':
        console.log('Access attempt logged:', message);
        break;
      
      default:
        console.log('Unknown message type:', message);
    }
  }

  // Enable/disable scan mode
  setScanMode(enabled) {
    if (this.isConnected && this.ws) {
      const command = {
        type: 'scan_mode',
        enabled: enabled
      };
      
      this.ws.send(JSON.stringify(command));
      this.scanModeEnabled = enabled;
      console.log(`Scan mode ${enabled ? 'enabled' : 'disabled'}`);
    } else {
      console.warn('WebSocket not connected. Cannot set scan mode.');
    }
  }

  // Add message handler
  addMessageHandler(handler) {
    this.messageHandlers.add(handler);
  }

  // Remove message handler
  removeMessageHandler(handler) {
    this.messageHandlers.delete(handler);
  }

  // Send WiFi configuration
  sendWiFiConfig(ssid, password) {
    if (this.isConnected && this.ws) {
      const command = {
        type: 'wifi_config',
        ssid: ssid,
        password: password
      };
      
      this.ws.send(JSON.stringify(command));
      console.log('WiFi configuration sent to ESP32');
    } else {
      console.warn('WebSocket not connected. Cannot send WiFi config.');
    }
  }

  // Disconnect
  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.isConnected = false;
      this.scanModeEnabled = false;
    }
  }

  // Get connection status
  getConnectionStatus() {
    return {
      connected: this.isConnected,
      scanMode: this.scanModeEnabled,
      reconnectAttempts: this.reconnectAttempts
    };
  }
}

// Create singleton instances
export const rfidService = new RFIDService();
export const espWebSocket = new ESPWebSocketService();

// Auto-connect to ESP32 on service load (you might want to make this configurable)
// espWebSocket.connect(); // Uncomment when you have ESP32 WebSocket server ready