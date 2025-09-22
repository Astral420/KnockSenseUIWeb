class WebSocketService {
  constructor() {
    this.ws = null;
    this.messageHandlers = new Set();
    this.connectionState = 'disconnected';
    this.reconnectTimer = null;
    this.reconnectDelay = 5000;
    this.scanMode = false;
    this.host = null;
    this.port = null;
    this.isAddRfidDialogOpen = false; // Track dialog state
    this.connectionStateHandlers = new Set(); // Track connection state changes
  }

  connect(host = window.location.hostname, port = 81) {
    this.host = host;
    this.port = port;
    
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log('WebSocket already connected');
      return;
    }

    const wsUrl = `ws://${host}:${port}/ws`;
    console.log(`Connecting to ESP32 WebSocket at ${wsUrl}`);

    try {
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onopen = () => {
        console.log('ESP32 WebSocket connected');
        this.connectionState = 'connected';
        this.clearReconnectTimer();
        this.notifyConnectionStateChange('connected');
        
        // Send initial status request
        this.send({ type: 'status' });
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('ESP32 message:', data);
          
          // Handle different message types
          switch(data.type) {
            case 'rfid_scan':
              // Only process RFID scans if we're in scan mode AND the dialog is open
              if (this.scanMode && this.isAddRfidDialogOpen && data.uid) {
                this.handleNewRfidScan(data.uid);
              } else if (data.uid) {
                // If dialog is closed but we got a scan, ensure scan mode is disabled
                if (!this.isAddRfidDialogOpen && this.scanMode) {
                  console.log('Dialog closed but scan mode still active, disabling...');
                  this.setScanMode(false);
                }
              }
              break;
              
            case 'rfid_error':
              // Handle RFID errors (like duplicate UID)
              if (this.scanMode && this.isAddRfidDialogOpen) {
                this.handleRfidError(data);
              }
              break;
              
            case 'wifi_status':
              this.handleWifiStatus(data);
              break;
              
            case 'system_status':
              this.handleSystemStatus(data);
              break;
              
            default:
              // Check if this is a WiFi status message without explicit type
              if (this.isWifiStatusMessage(data)) {
                this.handleWifiStatus(data);
              } else {
                // Pass to registered handlers
                this.notifyHandlers(data);
              }
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('ESP32 WebSocket error:', error);
        this.connectionState = 'error';
        this.notifyConnectionStateChange('error');
      };

      this.ws.onclose = () => {
        console.log('ESP32 WebSocket disconnected');
        this.connectionState = 'disconnected';
        this.ws = null;
        this.notifyConnectionStateChange('disconnected');
        this.scheduleReconnect();
      };
      
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      this.scheduleReconnect();
    }
  }

  disconnect() {
    this.clearReconnectTimer();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.connectionState = 'disconnected';
  }

  scheduleReconnect() {
    if (this.reconnectTimer) return;
    
    this.reconnectTimer = setTimeout(() => {
      console.log('Attempting to reconnect to ESP32...');
      this.reconnectTimer = null;
      if (this.host && this.port) {
        this.connect(this.host, this.port);
      }
    }, this.reconnectDelay);
  }

  clearReconnectTimer() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
      return true;
    }
    console.warn('WebSocket not connected');
    return false;
  }

  // NEW: Set dialog state - call this when opening/closing the Add RFID dialog
  setAddRfidDialogState(isOpen) {
    this.isAddRfidDialogOpen = isOpen;
    console.log(`Add RFID dialog ${isOpen ? 'opened' : 'closed'}`);
    
    // If dialog is closed, ensure scan mode is disabled
    if (!isOpen && this.scanMode) {
      this.setScanMode(false);
    }
  }

  // Scan mode control - now also requires dialog to be open
  setScanMode(enabled) {
    this.scanMode = enabled;
    this.send({
      type: 'scan_mode',
      enabled: enabled
    });
    console.log(`RFID scan mode ${enabled ? 'enabled' : 'disabled'}`);
  }

  // WiFi configuration
  sendWifiConfig(ssid, password) {
    return this.send({
      type: 'wifi_config',
      ssid: ssid,
      password: password
    });
  }

  // Request current WiFi status
  requestWifiStatus() {
    return this.send({ type: 'wifi_status_request' });
  }

  // Request system status
  requestSystemStatus() {
    return this.send({ type: 'system_status_request' });
  }

  // Handler management
  addMessageHandler(handler) {
    this.messageHandlers.add(handler);
  }

  removeMessageHandler(handler) {
    this.messageHandlers.delete(handler);
  }

  // Connection state handler management
  addConnectionStateHandler(handler) {
    this.connectionStateHandlers.add(handler);
  }

  removeConnectionStateHandler(handler) {
    this.connectionStateHandlers.delete(handler);
  }

  notifyConnectionStateChange(state) {
    for (const handler of this.connectionStateHandlers) {
      try {
        handler(state);
      } catch (error) {
        console.error('Error in connection state handler:', error);
      }
    }
  }

  notifyHandlers(data) {
    for (const handler of this.messageHandlers) {
      try {
        handler(data);
      } catch (error) {
        console.error('Error in message handler:', error);
      }
    }
  }

  // Specific handlers
  handleNewRfidScan(uid) {
    console.log('New RFID scanned in scan mode:', uid);
    // Arduino already handles adding to Firebase, just notify UI
    this.notifyHandlers({
      type: 'new_rfid_scanned',
      uid: uid
    });
  }

  handleRfidError(errorData) {
    console.log('RFID error received:', errorData);
    this.notifyHandlers({
      type: 'rfid_error',
      error: errorData.error,
      uid: errorData.uid,
      message: errorData.message
    });
  }

  handleWifiStatus(data) {
    console.log('WiFi status:', data);
    
    // Extract WiFi status from various possible message formats
    const connected = data.connected || data.wifi_connected || data.sta_connected || false;
    const ssid = data.ssid || '';
    const ip = data.ip || '';
    
    this.notifyHandlers({
      type: 'wifi_status',
      connected: connected,
      ssid: ssid,
      ip: ip,
      wifi_connected: connected // Add this for consistency with system_status
    });
  }

  handleSystemStatus(data) {
    console.log('System status:', data);
    this.notifyHandlers({
      type: 'system_status',
      ...data
    });
  }

  // Check if a message is a WiFi status message (even without explicit type)
  isWifiStatusMessage(data) {
    // Check for WiFi status indicators in the message
    return (
      (data.hasOwnProperty('connected') && (data.hasOwnProperty('ssid') || data.hasOwnProperty('ip'))) ||
      (data.hasOwnProperty('wifi_connected')) ||
      (data.hasOwnProperty('wifi_status')) ||
      (data.hasOwnProperty('sta_connected'))
    );
  }

  // Utility methods
  isConnected() {
    return this.ws && this.ws.readyState === WebSocket.OPEN;
  }

  getConnectionState() {
    return this.connectionState;
  }
}

// Create singleton instance
export const espWebSocket = new WebSocketService();
export default espWebSocket;