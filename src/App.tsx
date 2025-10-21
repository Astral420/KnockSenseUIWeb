import {
  Search,
  Bell,
  Home,
  Users,
  Clock,
  Settings,
  Plus,
  Filter,
  Calendar,
  Trash2,
  LogOut,
  CreditCard,
  Smartphone,
} from "lucide-react";
import { Input } from "./components/ui/input";
import { Badge } from "./components/ui/badge";
import { Button } from "./components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "./components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "./components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./components/ui/dialog";
import { Label } from "./components/ui/label";
import { Switch } from "./components/ui/switch";
import { useState, useEffect, useRef } from "react";
import { teacherService } from './components/backend/TeacherService';

import authService from './components/backend/auth/AuthService';
import { rfidService } from './components/backend/RFIDService';
import { espWebSocket } from './components/backend/WebSocketService';
import { appointmentService } from './components/backend/AppointmentService';
import { toast } from "sonner";
import { Toaster } from "./components/ui/sonner";

import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "./components/ui/alert-dialog";

// Listening to Firebase `teacher` node to hydrate faculty members
// Expected teacher shape:
// {
//   displayName: string,
//   email: string,
//   teacherID: string,
//   rfid_uid?: string,
//   active_status?: 'online' | 'offline',
//   photoUrl?: string,
//   today_first_entry?: number, // timestamp of first entry today
//   today_last_exit?: number,   // timestamp of last exit today
//   last_entry_time?: number,   // timestamp of most recent entry
//   last_exit_time?: number     // timestamp of most recent exit
// }




export default function App() {
  const [studentLoginOpen, setStudentLoginOpen] =
    useState(false);
  const [adminLoginOpen, setAdminLoginOpen] = useState(false);
  const [meetingRequestOpen, setMeetingRequestOpen] =
    useState(false);
  const [addFacultyOpen, setAddFacultyOpen] = useState(false);
  const [rfidAssignOpen, setRfidAssignOpen] = useState(false);
  const [selectedFaculty, setSelectedFaculty] = useState("");
  const [selectedFacultyForRfid, setSelectedFacultyForRfid] =
    useState(null);
  const [studentNumber, setStudentNumber] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [facultyMembers, setFacultyMembers] = useState<any[]>([]);
  const [facultyLoading, setFacultyLoading] = useState<boolean>(true);
  const [facultyError, setFacultyError] = useState<string>("");

  const [newFacultyName, setNewFacultyName] = useState("");
  const [newRfidId, setNewRfidId] = useState("");

  const [selectedRfid, setSelectedRfid] = useState(null);
  const [isAssignDialogOpen, setIsAssignDialogOpen] =
    useState(false);
  const [isAddRfidPopupOpen, setIsAddRfidPopupOpen] = useState(false);
  const [installInstructionsOpen, setInstallInstructionsOpen] = useState(false);


  // Hardware settings states
  const [ssid, setSsid] = useState("");
  const [wifiPassword, setWifiPassword] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [backupBatteryPercent, setBackupBatteryPercent] = useState<number | null>(null);

  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginError, setLoginError] = useState('');
  const [isStudentLoginLoading, setIsStudentLoginLoading] = useState(false);
  
  // Super admin and role states
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [userRole, setUserRole] = useState(null);
  
  // Admin login timeout states (3 failed attempts)
  const [failedLoginAttempts, setFailedLoginAttempts] = useState(0);
  const [isLoginBlocked, setIsLoginBlocked] = useState(false);
  const [blockedUntil, setBlockedUntil] = useState<Date | null>(null);
  
  // Super admin management states
  const [adminManagementOpen, setAdminManagementOpen] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminPassword, setNewAdminPassword] = useState("");
  const [newAdminName, setNewAdminName] = useState("");
  const [adminAccounts, setAdminAccounts] = useState([]);
  const [adminLoading, setAdminLoading] = useState(false);
  
  const [rfidTags, setRfidTags] = useState([]);
  const [rfidLoading, setRfidLoading] = useState(true);
  const [rfidError, setRfidError] = useState('');
  const [selectedTagUid, setSelectedTagUid] = useState<string | null>(null);

  const [isFailsafeMode, setIsFailsafeMode] = useState(false);
  const [wifiConnected, setWifiConnected] = useState(true); 

  const [studentAppointments, setStudentAppointments] = useState([]);
  const [appointmentLoading, setAppointmentLoading] = useState(false);
  const [appointmentError, setAppointmentError] = useState('');
  const [requestMeetingDialogOpen, setRequestMeetingDialogOpen] = useState(false);
  const [selectedFacultyForMeeting, setSelectedFacultyForMeeting] = useState(null);
  const [verificationStudentNumber, setVerificationStudentNumber] = useState('');
  const [appointmentNote, setAppointmentNote] = useState('');


  // Auto-logout timer for student sessions (non-admin)
  const studentLogoutTimerRef = useRef<number | null>(null);

  const isTagActive = (tag: any) => tag?.status === 'active' || tag?.status === true || tag?.status === 'Active';

  useEffect(() => {
    const unsubscribe = authService.onAuthStateChange(async (user) => {
      setUser(user);
      
      if (user) {
        // Check user roles with new system
        try {
          const isAdmin = await authService.isAdmin(user);
          const isSuperAdminRole = await authService.isSuperAdmin(user);
          
          setIsAdminLoggedIn(isAdmin);
          setIsSuperAdmin(isSuperAdminRole);
          
          // Set user role for UI
          if (isSuperAdminRole) {
            setUserRole('super_admin');
          } else if (isAdmin) {
            setUserRole('admin');
          } else {
            setUserRole('user');
          }
          
          if (isAdmin) {
            setCurrentPage("dashboard");
          }
        } catch (error) {
          console.error('Error checking user roles:', error);
          // Fallback to basic admin check
          const isAdmin = await authService.isAdmin(user);
          setIsAdminLoggedIn(isAdmin);
          setIsSuperAdmin(false);
          setUserRole(isAdmin ? 'admin' : 'user');
        }
      } else {
        setIsAdminLoggedIn(false);
        setIsSuperAdmin(false);
        setUserRole(null);
      }
      
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Initialize timeout state from localStorage on component mount
  useEffect(() => {
    const savedTimeout = localStorage.getItem('adminLoginTimeout');
    const savedAttempts = localStorage.getItem('adminLoginAttempts');
    
    if (savedTimeout && savedAttempts) {
      const timeoutDate = new Date(parseInt(savedTimeout));
      const attempts = parseInt(savedAttempts);
      
      if (new Date() < timeoutDate) {
        // Still in timeout period
        setIsLoginBlocked(true);
        setBlockedUntil(timeoutDate);
        setFailedLoginAttempts(attempts);
      } else {
        // Timeout has expired, clear localStorage
        localStorage.removeItem('adminLoginTimeout');
        localStorage.removeItem('adminLoginAttempts');
        setIsLoginBlocked(false);
        setBlockedUntil(null);
        setFailedLoginAttempts(0);
      }
    }
  }, []);
  
  // Check if login timeout has expired
  useEffect(() => {
    if (isLoginBlocked && blockedUntil) {
      const interval = setInterval(() => {
        if (new Date() >= blockedUntil) {
          setIsLoginBlocked(false);
          setBlockedUntil(null);
          setFailedLoginAttempts(0);
          setLoginError('');
          // Clear localStorage when timeout expires
          localStorage.removeItem('adminLoginTimeout');
          localStorage.removeItem('adminLoginAttempts');
        }
      }, 1000); // Check every second
      
      return () => clearInterval(interval);
    }
  }, [isLoginBlocked, blockedUntil]);

  // WiFi status handler - listen for ESP32 WiFi station status
  useEffect(() => {
    const wifiStatusHandler = (msg) => {
      console.log('Received WebSocket message:', msg);
      
      if (msg.type === 'wifi_status' || msg.type === 'system_status') {
        const isWifiConnected = msg.connected || msg.wifi_connected;
        console.log('WiFi connected status from ESP32:', isWifiConnected);
        
        setWifiConnected(isWifiConnected);
        
        if (!isWifiConnected) {
          console.log('ESP32 WiFi disconnected - entering offline mode');
          setIsFailsafeMode(true);
          setIsAdminLoggedIn(true);
          setCurrentPage("hardware");
          setAuthLoading(false);
        } else if (isWifiConnected && isFailsafeMode) {
          console.log('ESP32 WiFi reconnected - refreshing page');
          setIsFailsafeMode(false);
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        }
      }
    };
  
    const connectionStateHandler = (state) => {
      console.log('WebSocket connection state:', state);
      if (state === 'connected') {
        // Multiple status requests to ensure we get current state
        setTimeout(() => {
          console.log('Requesting system status...');
          espWebSocket.requestSystemStatus();
        }, 500);
        
        setTimeout(() => {
          espWebSocket.requestSystemStatus();
        }, 2000);
      }
    };
  
    espWebSocket.addMessageHandler(wifiStatusHandler);
    espWebSocket.addConnectionStateHandler(connectionStateHandler);
    
    // Immediate status check on component mount
    if (espWebSocket.isConnected()) {
      console.log('WebSocket already connected, requesting status');
      espWebSocket.requestSystemStatus();
    }
    
    // Fallback: Check periodically if we haven't received status
    const statusCheckInterval = setInterval(() => {
      if (espWebSocket.isConnected() && !isFailsafeMode) {
        console.log('Periodic status check...');
        espWebSocket.requestSystemStatus();
      }
    }, 5000);
  
    return () => {
      espWebSocket.removeMessageHandler(wifiStatusHandler);
      espWebSocket.removeConnectionStateHandler(connectionStateHandler);
      clearInterval(statusCheckInterval);
    };
  }, [isFailsafeMode]);

  // Bypass authentication in offline mode
  useEffect(() => {
    if (isFailsafeMode) {
      // In offline mode, grant admin access for hardware settings
      setIsAdminLoggedIn(true);
      setCurrentPage("hardware");
      setAuthLoading(false);
    }
  }, []);

  // Subscribe to teachers via service — resubscribe on auth changes
  useEffect(() => {
    if (authLoading || isFailsafeMode) return; // Skip Firebase calls in offline mode
    setFacultyLoading(true);
    setFacultyError("");
    const handle = (teachers: any[]) => {
      setFacultyMembers(teachers);
      setFacultyLoading(false);
    };
    const handleError = (err?: any) => {
      const code = err?.code || err?.name || '';
      // If rules deny when logged out, don't show hard error — just show empty list
      if (String(code).toLowerCase().includes('permission')) {
        setFacultyMembers([]);
        setFacultyLoading(false);
        return;
      }
      setFacultyError('Failed to load faculty data.');
      setFacultyLoading(false);
    };
    teacherService.subscribeToTeachers(handle, handleError);
    return () => teacherService.unsubscribeFromTeachers(handle);
  }, [authLoading, user?.uid, isFailsafeMode]);

  // RFID tag subscription - only start after auth is loaded and user is admin
  useEffect(() => {
    if (!authLoading && isAdminLoggedIn) {
      setRfidLoading(true);
      setRfidError('');
      
      const handleTags = (tags) => {
        setRfidTags(tags);
        setRfidLoading(false);
        setRfidError('');
      };
      
      const handleError = (error) => {
        console.error('RFID subscription error:', error);
        setRfidError('Failed to load RFID data. Please refresh the page.');
        setRfidLoading(false);
      };
      
      try {
        rfidService.subscribeToRFIDTags(handleTags, handleError);
      } catch (error) {
        handleError(error);
      }
      
      return () => rfidService.unsubscribeFromRFIDTags(handleTags);
    }
  }, [authLoading, isAdminLoggedIn]);


  useEffect(() => {
    const handler = (msg) => {
      console.log('ESP message:', msg);
  
      // Handle system status messages for battery info
      if (msg.type === 'system_status') {
        // Update backup battery percent if present
        if (typeof msg.backup_battery_percent === 'number') {
          setBackupBatteryPercent(Math.max(0, Math.min(100, Math.round(msg.backup_battery_percent))));
        } else if (typeof msg.battery_percent === 'number') {
          setBackupBatteryPercent(Math.max(0, Math.min(100, Math.round(msg.battery_percent))));
        }
      }
     
    };
  
    espWebSocket.addMessageHandler(handler);
    
    // Connect to WebSocket and request initial status
    espWebSocket.connect(window.location.hostname, 81);
    espWebSocket.requestSystemStatus();
  
    return () => {
      espWebSocket.removeMessageHandler(handler);
    };
  }, []);

  useEffect(() => {
    const handleNewRfidMessage = (msg) => {
      if (msg.type === 'new_rfid_scanned' && msg.uid && !msg.error) {  
        console.log('New RFID scanned and added by Arduino:', msg.uid);
        
        // Show success feedback and close dialog
        toast.success(`RFID ${msg.uid} added successfully!`);
        
        // Close the dialog since the RFID was successfully added
        setIsAddRfidPopupOpen(false);
        espWebSocket.setAddRfidDialogState(false);
      }
    };

    const handleRfidErrorMessage = (msg) => {
      if (msg.type === 'rfid_error') {
        console.log('RFID error received:', msg);
        
        // Show error feedback
        if (msg.error === 'duplicate') {
          toast.error(`RFID ${msg.uid} already exists in the database!`);
        } else {
          toast.error(`RFID Error: ${msg.message || 'Unknown error occurred'}`);
        }
        
        
        setIsAddRfidPopupOpen(false);
        espWebSocket.setAddRfidDialogState(false);
      }
    };
    
    espWebSocket.addMessageHandler(handleNewRfidMessage);
    espWebSocket.addMessageHandler(handleRfidErrorMessage);
    
    return () => {
      espWebSocket.removeMessageHandler(handleNewRfidMessage);
      espWebSocket.removeMessageHandler(handleRfidErrorMessage);
    };
  }, []);




  // computed inside the component (so it re-evaluates after state changes)
  const availableProfessors = facultyMembers.map((prof) => {
    // Check if this professor is already assigned to any RFID
    const isAssignedToRfid = prof.rfid && prof.rfid !== '--';
    const assignedRfidUid = prof.rfid;
    
    return {
      ...prof,
      isAssignedToRfid,
      assignedRfidUid
    };
  });

  const handleRemoveRfid = (facultyId) => {
    setFacultyMembers((prev) =>
      prev.map((faculty) =>
        faculty.id === facultyId
          ? { ...faculty, rfid: "--" }
          : faculty,
      ),
    );
  };

  const handleSaveWifiConfig = () => {
    espWebSocket.sendWifiConfig(ssid, wifiPassword);
    toast.success(`WiFi Config Saved! The page will refresh to apply changes.`);
    
    // Refresh the page after a short delay to apply the new WiFi configuration
    setTimeout(() => {
      window.location.reload();
    }, 3000);
  };

  const handleCheckConnection = async () => {
    try {
      // try pinging a reliable site (Google DNS or your own backend)
      const response = await fetch("https://www.google.com", {
        mode: "no-cors",
      });

      // if fetch doesn't throw, we assume internet is okay
      setIsConnected(true);
    } catch (error) {
      setIsConnected(false);
    }
  };

  const handleOffice365Login = async () => {
    setIsStudentLoginLoading(true);
    
    try {
      const result = await authService.loginWithMicrosoft();
      if (result.success) {
        setStudentLoginOpen(false);
        toast.success(`Welcome ${result.user.displayName || result.user.email}!`);
        console.log('Student logged in:', result.user);
      } else {
        const errorMessage = result.error || 'Login failed';
        const code = result.code || '';
        
        // Specific handling for popup closed
        if (code === 'auth/popup-closed-by-user' || errorMessage.toLowerCase().includes('cancel')) {
          const msg = 'Sign in has been cancelled.';
          setIsStudentLoginLoading(false);
          toast.error(msg);
        } else if (errorMessage.toLowerCase().includes('network')) {
          toast.error('Network error. Please check your connection and try again.');
          setIsStudentLoginLoading(false);
        } else if (errorMessage.toLowerCase().includes('auth')) {
          toast.error('Authentication failed. Please try again.');
          setIsStudentLoginLoading(false);
        } else {
          setIsStudentLoginLoading(false);
          toast.error(`Login failed: ${errorMessage}`);
        }
      }
    } catch (error) {
      // Handle popup closed by user from thrown error
      const anyErr: any = error as any;
      const code = anyErr?.code ? String(anyErr.code) : '';
      if (code === 'auth/popup-closed-by-user') {
        const msg = 'Sign in has been cancelled.';
        setIsStudentLoginLoading(false);
        toast.error(msg);
      } else {
        const errorMessage = 'Failed to login with Microsoft. Please try again.';
        setIsStudentLoginLoading(false);
        toast.error(errorMessage);
        console.error('Student login error:', error);
      }
    } finally {
      setIsStudentLoginLoading(false);
    }
  };

  const handleMeetingRequest = (faculty) => {
    if (!user) {
      toast.error('Please login to request a meeting');
      return;
    }
    setSelectedFacultyForMeeting(faculty);
    setRequestMeetingDialogOpen(true);
    setVerificationStudentNumber('');
    setAppointmentNote('');
  };

  const handleSubmitAppointment = async () => {
    // 1. Basic check for the input field
    if (!verificationStudentNumber || verificationStudentNumber.length !== 6) {
      toast.error('Please enter your 6-digit student number for verification');
      return;
    }
    
    // 2. Secure check against the trusted user data
    // Because of our AuthService change, `user.studentNumber` now holds the REAL student number.
    if (!user?.studentNumber || user.studentNumber !== verificationStudentNumber) { // ✅ This check now works correctly!
      toast.error('The student number entered does not match your account.');
      return;
    }
    
    setAppointmentLoading(true);
    setAppointmentError('');
    
    try {
      const studentData = {
        // We use the verified number from the user object as the source of truth
        studentNumber: user.studentNumber,
        displayName: user.displayName || user.email,
        uid: user.uid,
        photoUrl: user.photoURL || null
      };
      
      const teacherData = {
        uid: selectedFacultyForMeeting.id,
        name: selectedFacultyForMeeting.name,
        photoUrl: selectedFacultyForMeeting.photoUrl || null
      };
      
      const result = await appointmentService.createAppointment(
        studentData,
        teacherData,
        appointmentNote || null
      );
      
      if (result.success) {
        toast.success('Appointment request sent successfully!');
        setRequestMeetingDialogOpen(false);
        setVerificationStudentNumber('');
        setAppointmentNote('');
      } else {
        toast.error(result.error || 'Failed to create appointment');
        setAppointmentError(result.error || 'Failed to create appointment');
      }
    } catch (error) {
      console.error('Error creating appointment:', error);
      toast.error('An error occurred while creating the appointment');
      setAppointmentError('An error occurred while creating the appointment');
    } finally {
      setAppointmentLoading(false);
    }
  };

  const getAppointmentStatusColor = (status: string): string => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      case 'accepted': return 'bg-green-100 text-green-700';
      case 'denied': return 'bg-red-100 text-red-700';
      case 'completed': return 'bg-blue-100 text-blue-700';
      case 'cancelled': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const formatAppointmentDate = (date: Date | string | number | null | undefined): string => {
    if (!date) return 'Unknown';
    const dateObj = date instanceof Date ? date : new Date(date);
    if (isNaN(dateObj.getTime())) return 'Unknown';

    const now = new Date();
    const seconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000);

    // Handle the case where the client's clock is slightly behind the server
    if (seconds < 0) return 'Just now';

    if (seconds < 60) {
      return 'Just now';
    }
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) {
      return minutes === 1 ? '1 minute ago' : `${minutes} minutes ago`;
    }
    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
      return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
    }
    const days = Math.floor(hours / 24);
    if (days === 1) {
      return 'Yesterday';
    }
    if (days < 7) {
      return `${days} days ago`;
    }
    return dateObj.toLocaleDateString();
  };

  const formatAppointmentStatus = (appointment: any): string => {
    const status = appointment.status || 'unknown';
    // The teacherAction field is added by the teacher's app when they respond
    const action = appointment.teacherAction || '';

    if (status === 'accepted') {
      switch (action) {
        case 'meetNow':
          return 'Meet Now';
        case 'wait5Minutes':
          return 'Wait 5 Min';
        case 'meetLater':
          return 'Scheduled';
        default:
          return 'Accepted'; // Fallback if no specific action is found
      }
    }

    // For other statuses like 'pending', 'denied', etc., just capitalize the first letter
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  // const handleSubmitMeetingRequest = () => {
  //   if (studentNumber && studentNumber.length === 6) {
  //     alert(
  //       `Meeting request submitted for ${selectedFaculty}! Student Number: ${studentNumber}`,
  //     );
  //     setMeetingRequestOpen(false);
  //     setStudentNumber("");
  //     setSelectedFaculty("");
  //   }
  // };

  const handleAdminLogin = async () => {
    if (!adminEmail || !adminPassword) {
      toast.error("Please enter both email and password");
      return;
    }
    
    // Check if login is blocked
    if (isLoginBlocked && blockedUntil && new Date() < blockedUntil) {
      const remainingMinutes = Math.ceil((blockedUntil.getTime() - new Date().getTime()) / (1000 * 60));
      setLoginError(`Too many failed attempts. Please try again in ${remainingMinutes} minutes.`);
      return;
    }
    
    setLoginError('');
    try {
      const result = await authService.loginAdmin(adminEmail, adminPassword);
      if (result.success) {
        // Reset failed attempts on successful login
        setFailedLoginAttempts(0);
        setIsLoginBlocked(false);
        setBlockedUntil(null);
        setAdminLoginOpen(false);
        setAdminEmail("");
        setAdminPassword("");
        toast.success("Admin login successful!");
        
        // Clear localStorage on successful login
        localStorage.removeItem('adminLoginTimeout');
        localStorage.removeItem('adminLoginAttempts');
        // isAdminLoggedIn will be set by the auth state observer
      } else {
        const newFailedAttempts = failedLoginAttempts + 1;
        setFailedLoginAttempts(newFailedAttempts);
        
        if (newFailedAttempts >= 3) {
          // Block login for 10 minutes
          const blockUntil = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now
          setIsLoginBlocked(true);
          setBlockedUntil(blockUntil);
          setLoginError('Too many failed attempts. Admin login is blocked for 10 minutes.');
          toast.error('Too many failed attempts. Admin login is blocked for 10 minutes.');
          
          // Save to localStorage to persist across page refreshes
          localStorage.setItem('adminLoginTimeout', blockUntil.getTime().toString());
          localStorage.setItem('adminLoginAttempts', newFailedAttempts.toString());
        } else {
          const errorMessage = result.error || 'Login failed';
          setLoginError(errorMessage);
          toast.error(`Login failed: ${errorMessage}`);
          
          // Save failed attempts to localStorage even if less than 3
          localStorage.setItem('adminLoginAttempts', newFailedAttempts.toString());
        }
      }
    } catch (error) {
      const newFailedAttempts = failedLoginAttempts + 1;
      setFailedLoginAttempts(newFailedAttempts);
      
      if (newFailedAttempts >= 3) {
        // Block login for 10 minutes
        const blockUntil = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now
        setIsLoginBlocked(true);
        setBlockedUntil(blockUntil);
        setLoginError('Too many failed attempts. Admin login is blocked for 10 minutes.');
        toast.error('Too many failed attempts. Admin login is blocked for 10 minutes.');
        
        // Save to localStorage to persist across page refreshes
        localStorage.setItem('adminLoginTimeout', blockUntil.getTime().toString());
        localStorage.setItem('adminLoginAttempts', newFailedAttempts.toString());
      } else {
        const errorMessage = 'Login failed - please try again';
        setLoginError(errorMessage);
        toast.error(errorMessage);
        
        // Save failed attempts to localStorage even if less than 3
        localStorage.setItem('adminLoginAttempts', newFailedAttempts.toString());
      }
    }
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
      setIsAdminLoggedIn(false);
      setCurrentPage("dashboard");
      // State will be updated by the auth observer
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  
  const handleToggleRfidAccess = (facultyId) => {
    setFacultyMembers((prev) =>
      prev.map((faculty) =>
        faculty.id === facultyId
          ? { ...faculty, isActive: !faculty.isActive }
          : faculty,
      ),
    );
  };

  const handleRfidAssignClick = (faculty) => {
    setSelectedFacultyForRfid(faculty);
    setIsAssignDialogOpen(true);
  };

  const handleAssignProf = (rfidOwnerId, profId) => {
    setFacultyMembers((prev) =>
      prev.map((f) => {
        if (f.id === rfidOwnerId) {
          // Toggle assign/unassign
          return {
            ...f,
            assignedProfId:
              f.assignedProfId === profId ? null : profId,
          };
        }

        // Unassign from other RFID if assigned there
        if (
          f.assignedProfId === profId &&
          f.id !== rfidOwnerId
        ) {
          return { ...f, assignedProfId: null };
        }

        return f;
      }),
    );

    setIsAssignDialogOpen(false);
    setSelectedFacultyForRfid(null);
  };

  const handleAddFaculty = () => {
    if (newFacultyName.trim()) {
      const newId =
        Math.max(...facultyMembers.map((f) => f.id)) + 1;
      const initials = newFacultyName
        .split(" ")
        .map((n) => n.charAt(0))
        .join("")
        .toUpperCase();
      const colors = [
        "bg-blue-500",
        "bg-green-500",
        "bg-purple-500",
        "bg-orange-500",
        "bg-red-500",
        "bg-indigo-500",
      ];
      const randomColor =
        colors[Math.floor(Math.random() * colors.length)];

      const newFaculty = {
        id: newId,
        name: newFacultyName,
        initials: initials,
        status: "Offline",
        lastSeen: "Never",
        color: randomColor,
        isActive: false,
        rfid: `RFID${newId.toString().padStart(3, "0")}`,
        timeIn: "--",
        timeOut: "--",
      };

      setFacultyMembers((prev) => [...prev, newFaculty]);
      setNewFacultyName("");
      setAddFacultyOpen(false);
    }
  };

  const handleRemoveFaculty = async (facultyId) => {
    if (isSuperAdmin) {
      // Super admin can actually delete teacher accounts
      try {
        setFacultyLoading(true);
        const result = await authService.deleteTeacherAccount(facultyId);
        toast.success(result.message);
        // Refresh faculty list
        setFacultyMembers((prev) =>
          prev.filter((faculty) => faculty.id !== facultyId),
        );
      } catch (error) {
        console.error('Error deleting teacher:', error);
        toast.error('Failed to delete teacher account: ' + error);
      } finally {
        setFacultyLoading(false);
      }
    } else {
      // Regular admin can only remove from local state (existing behavior)
      setFacultyMembers((prev) =>
        prev.filter((faculty) => faculty.id !== facultyId),
      );
    }
  };

  // Super admin management functions
  const handleCreateAdmin = async () => {
    if (!newAdminEmail || !newAdminPassword || !newAdminName) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      setAdminLoading(true);
      const result = await authService.createAdminAccount(
        newAdminEmail,
        newAdminPassword,
        newAdminName
      );
      
      toast.success(result.message);
      setNewAdminEmail("");
      setNewAdminPassword("");
      setNewAdminName("");
      setAdminManagementOpen(false);
      
      // Refresh admin list
      await loadAdminAccounts();
    } catch (error) {
      console.error('Error creating admin:', error);
      toast.error('Failed to create admin account: ' + error);
    } finally {
      setAdminLoading(false);
    }
  };

  const handleDeleteAdmin = async (adminUid) => {
    try {
      setAdminLoading(true);
      const result = await authService.deleteAdminAccount(adminUid);
      toast.success(result.message);
      
      // Refresh admin list
      await loadAdminAccounts();
    } catch (error) {
      console.error('Error deleting admin:', error);
      toast.error('Failed to delete admin account: ' + error);
    } finally {
      setAdminLoading(false);
    }
  };

  const loadAdminAccounts = async () => {
    try {
      setAdminLoading(true);
      const result = await authService.getAdminAccounts();
      setAdminAccounts([...result.admins, ...result.superAdmins]);
    } catch (error) {
      console.error('Error loading admin accounts:', error);
      toast.error('Failed to load admin accounts');
    } finally {
      setAdminLoading(false);
    }
  };

  const handleAssignRfid = () => {
    if (newRfidId.trim() && selectedFacultyForRfid) {
      setFacultyMembers((prev) =>
        prev.map((faculty) =>
          faculty.id === selectedFacultyForRfid.id
            ? { ...faculty, rfid: newRfidId }
            : faculty,
        ),
      );
      setNewRfidId("");
      setSelectedFacultyForRfid(null);
      setRfidAssignOpen(false);
    }
  };

  const [currentPage, setCurrentPage] = useState("dashboard");

  // Auto-logout student after 2 minutes
  useEffect(() => {
    // Apply only when a student (non-admin) is logged in and not in failsafe mode
    if (user && !isAdminLoggedIn && !isFailsafeMode) {
      // Clear any existing timer
      if (studentLogoutTimerRef.current) {
        clearTimeout(studentLogoutTimerRef.current);
        studentLogoutTimerRef.current = null;
      }
      // Start new 2-minute timer
      studentLogoutTimerRef.current = window.setTimeout(async () => {
        try {
          await authService.logout();
          toast.info('Session expired after 2 minutes. You have been logged out.');
        } catch (e) {
          // No-op; best effort
        } finally {
          studentLogoutTimerRef.current = null;
        }
      }, 120_000);
    } else {
      // If not applicable, clear any existing timer
      if (studentLogoutTimerRef.current) {
        clearTimeout(studentLogoutTimerRef.current);
        studentLogoutTimerRef.current = null;
      }
    }

    // Cleanup on dependency change/unmount
    return () => {
      if (studentLogoutTimerRef.current) {
        clearTimeout(studentLogoutTimerRef.current);
        studentLogoutTimerRef.current = null;
      }
    };
  }, [user?.uid, isAdminLoggedIn, isFailsafeMode]);

  // Auto-load admin accounts when super admin opens admin management page
  useEffect(() => {
    if (isSuperAdmin && currentPage === "admin-management") {
      loadAdminAccounts();
    }
  }, [isSuperAdmin, currentPage]);

  useEffect(() => {
    let unsubscribe = () => {}; 
  
    // Case 1: A student is logged in
    if (user && !isAdminLoggedIn && user.studentNumber) {
      setAppointmentLoading(true);
      unsubscribe = appointmentService.subscribeToStudentAppointments(
        user.studentNumber,
        (appointments) => {
          setStudentAppointments(appointments);
          setAppointmentLoading(false);
        }
      );
    } 
    
    else if (!user && !isAdminLoggedIn) { 
      setAppointmentLoading(true);
      
      unsubscribe = appointmentService.subscribeToAllAppointments(
        (appointments) => {
          setStudentAppointments(appointments); 
          setAppointmentLoading(false);
        }
      );
    } 
    
    else {
      setStudentAppointments([]); 
    }
    
   
    return () => unsubscribe();
  }, [user, isAdminLoggedIn]); 



  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200 shadow-sm">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-gray-900">
            KnockSense
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Faculty Management Portal
          </p>
        </div>

        <nav className="mt-8">
          <div className="px-6 space-y-2">
            {/* In offline mode, only show hardware settings */}
            {isFailsafeMode ? (
              <div className="space-y-2">
                <button
                  onClick={() => setCurrentPage("hardware")}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg ${
                    currentPage === "hardware"
                      ? "bg-blue-50 text-blue-700"
                      : "hover:bg-gray-100 text-gray-700"
                  }`}
                >
                  <Settings className="w-5 h-5" />
                  Hardware Settings
                </button>
              </div>
            ) : (
              <>
                <button
                  onClick={() => setCurrentPage("dashboard")}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg ${
                    currentPage === "dashboard"
                      ? "bg-blue-50 text-blue-700"
                      : "hover:bg-gray-100 text-gray-700"
                  }`}
                >
                  <Home className="w-5 h-5" />
                  Dashboard
                </button>

                {/* Show only if Admin is logged in */}
                {isAdminLoggedIn && (
                  <button
                    onClick={() => setCurrentPage("rfid")}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg ${
                      currentPage === "rfid"
                        ? "bg-blue-50 text-blue-700"
                        : "hover:bg-gray-100 text-gray-700"
                    }`}
                  >
                    <CreditCard className="w-5 h-5" />
                    RFID Management
                  </button>
                )}

                {/* Hardware Settings Button */}
                {isAdminLoggedIn && (
                  <button
                    onClick={() => setCurrentPage("hardware")}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg ${
                      currentPage === "hardware"
                        ? "bg-blue-50 text-blue-700"
                        : "hover:bg-gray-100 text-gray-700"
                    }`}
                  >
                    <Settings className="w-5 h-5" />
                    Hardware Settings
                  </button>
                )}

                {/* Super Admin Management Button - Only for Super Admin */}
                {isSuperAdmin && (
                  <button
                    onClick={() => setCurrentPage("admin-management")}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg ${
                      currentPage === "admin-management"
                        ? "bg-blue-50 text-blue-700"
                        : "hover:bg-gray-100 text-gray-700"
                    }`}
                  >
                    <Users className="w-5 h-5" />
                    Admin Management
                  </button>
                )}
              </>
            )}
          </div>
        </nav>
      </div>

      {/* Main Content */}
      <div className="ml-64">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-semibold text-gray-900">
                  {isFailsafeMode 
                    ? "Hardware Settings"
                    : isAdminLoggedIn
                    ? "Admin Dashboard"
                    : "Faculty Dashboard"}
                </h2>
                {/* WiFi Status Indicator */}
                {!isFailsafeMode && (
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      wifiConnected ? 'bg-green-500' : 'bg-red-500'
                    }`}></div>
                    <span className={`text-xs font-medium ${
                      wifiConnected ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {wifiConnected ? 'Online' : 'Offline'}
                    </span>
                  </div>
                )}
              </div>
              <p className="text-gray-600 mt-1">
                {isFailsafeMode
                  ? "ESP32 WiFi is disconnected. Configure WiFi settings to restore connectivity."
                  : isAdminLoggedIn
                  ? "Manage faculty members and system settings"
                  : "Manage and connect with faculty members"}
              </p>
            </div>
            <div className="flex items-center gap-4">
              {/* Show login buttons only when NOT in offline mode */}
              {!isFailsafeMode && (
                <>
                  {isAdminLoggedIn && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleLogout}
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Logout
                    </Button>
                  )}
                  {!isAdminLoggedIn && user && (
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-700 font-medium">
                        {user.displayName || user.email}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleLogout}
                      >
                        <LogOut className="w-4 h-4 mr-2" />
                        Logout
                      </Button>
                    </div>
                  )}
                  {!isAdminLoggedIn && !user && (
                    <>
                      <Dialog
                        open={studentLoginOpen}
                        onOpenChange={(open) => {
                          setStudentLoginOpen(open);
                          if (!open) {
                            setLoginError(''); // Clear error when dialog closes
                          }
                        }}
                      >
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            Student Login
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                          <DialogHeader>
                            <DialogTitle>Student Login</DialogTitle>
                            <DialogDescription>
                              Sign in with your Office 365 account to access faculty services.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="grid gap-4 py-6">
                             <Button
                               onClick={handleOffice365Login}
                               variant="outline"
                               className="w-full flex items-center gap-3 h-12"
                               disabled={isStudentLoginLoading}
                             >
                              {isStudentLoginLoading ? (
                                <>
                                  <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                  <span>Signing in...</span>
                                </>
                              ) : (
                                <>
                                    <svg
                                      className="w-5 h-5"
                                      viewBox="0 0 21 21"
                                      fill="none"
                                      xmlns="http://www.w3.org/2000/svg"
                                    >
                                      <rect x="1" y="1" width="9" height="9" fill="#f25022" /> 
                                      <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
                                      <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
                                      <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
                                    </svg>
                                  Log in with Office 365
                                </>
                              )}
                            </Button>
                            
                            <div className="text-center">
                              <p className="text-xs text-gray-500">
                                By signing in, you agree to our terms of service and privacy policy.
                              </p>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                      
                      <Dialog
                        open={adminLoginOpen}
                        onOpenChange={setAdminLoginOpen}
                      >
                        <DialogTrigger asChild>
                          <Button size="sm">Admin Login</Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                          <DialogHeader>
                            <DialogTitle>Admin Login</DialogTitle>
                            <DialogDescription>
                              Please enter your admin credentials to
                              access the management panel.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="grid gap-4 py-4">
                            {loginError && (
                              <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                                {loginError}
                              </div>
                            )}
                            <div className="grid gap-2">
                              <Label htmlFor="adminEmail">
                                Email
                              </Label>
                              <Input
                                id="adminEmail"
                                placeholder="Enter admin Email"
                                value={adminEmail}
                                onChange={(e) => {
                                  setAdminEmail(e.target.value);
                                  if (loginError) setLoginError(''); // Clear error when user starts typing
                                }}
                                className={loginError ? "border-red-300 focus:border-red-500" : ""}
                              />
                            </div>
                            <div className="grid gap-2">
                              <Label htmlFor="adminPassword">
                                Password
                              </Label>
                              <Input
                                id="adminPassword"
                                type="password"
                                placeholder="Enter admin password"
                                value={adminPassword}
                                onChange={(e) => {
                                  setAdminPassword(e.target.value);
                                  if (loginError) setLoginError(''); // Clear error when user starts typing
                                }}
                                className={loginError ? "border-red-300 focus:border-red-500" : ""}
                              />
                            </div>
                          </div>
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              onClick={() =>
                                setAdminLoginOpen(false)
                              }
                            >
                              Cancel
                            </Button>
                            <Button
                              onClick={handleAdminLogin}
                              disabled={
                                !adminEmail || !adminPassword || isLoginBlocked
                              }
                            >
                              {isLoginBlocked ? 'Login Blocked' : 'Login'}
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </>
                  )}
                </>
              )}
              
              {/* Offline Mode Indicator - Always show when in offline mode */}
              {isFailsafeMode && (
                <div className="flex items-center gap-2 px-4 py-2 bg-red-100 border border-red-200 rounded-lg">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-semibold text-red-700">Offline Mode</span>
                  
                </div>
              )}
            </div>
          </div>
        </header>

        {/* All Dialogs */}
        {/* Meeting Request Dialog */}
        <Dialog
        open={requestMeetingDialogOpen}
        onOpenChange={setRequestMeetingDialogOpen}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Request Meeting with {selectedFacultyForMeeting?.name}</DialogTitle>
            <DialogDescription>
              Enter your student number for verification and add an optional note for the faculty member.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {appointmentError && (
              <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                {appointmentError}
              </div>
            )}
            
            <div className="grid gap-2">
              <Label htmlFor="verificationNumber">
                Student Number (Required for verification)
              </Label>
              {/* Hidden dummy inputs to prevent autofill */}
              <input
                type="text"
                style={{ display: 'none' }}
                autoComplete="off"
                tabIndex={-1}
              />
              <input
                type="password"
                style={{ display: 'none' }}
                autoComplete="off"
                tabIndex={-1}
              />
              <Input
                id="verificationNumber"
                placeholder="Enter your 6-digit student number"
                value={verificationStudentNumber}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setVerificationStudentNumber(value);
                  setAppointmentError('');
                }}
                maxLength={6}
                disabled={appointmentLoading}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
                data-form-type="other"
              />
              <p className="text-xs text-gray-500">
                This is required to verify your identity and prevent abuse
              </p>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="appointmentNote">
                Note (Optional)
              </Label>
              <textarea
                id="appointmentNote"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Add a note for the faculty member..."
                rows={3}
               value={appointmentNote}
               onChange={(e) => setAppointmentNote(e.currentTarget.value)}
                disabled={appointmentLoading}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setRequestMeetingDialogOpen(false);
                setVerificationStudentNumber('');
                setAppointmentNote('');
                setAppointmentError('');
              }}
              disabled={appointmentLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitAppointment}
              disabled={!verificationStudentNumber || verificationStudentNumber.length !== 6 || appointmentLoading}
            >
              {appointmentLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Submitting...
                </>
              ) : (
                'Submit Request'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

        {/* RFID Assignment Dialog */}
        <Dialog
          open={rfidAssignOpen}
          onOpenChange={setRfidAssignOpen}
        >
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Assign RFID</DialogTitle>
              <DialogDescription>
                Assign a new RFID to{" "}
                {selectedFacultyForRfid?.name}.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="newRfidId">RFID ID</Label>
                <Input
                  id="newRfidId"
                  placeholder="Enter RFID ID"
                 value={newRfidId}
                 onChange={(e) => setNewRfidId(e.currentTarget.value)}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setRfidAssignOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAssignRfid}
                disabled={!newRfidId.trim()}
              >
                Assign RFID
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Add RFID Scanner Popup */}
        <Dialog
          open={isAddRfidPopupOpen}
          onOpenChange={(open) => {
            setIsAddRfidPopupOpen(open);
            // Properly sync dialog state with WebSocket service
            espWebSocket.setAddRfidDialogState(open);
            if (!open) {
              // Ensure scan mode is disabled when dialog closes
              espWebSocket.setScanMode(false);
            }
          }}
        >
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader className="text-center">
              <DialogTitle>Add New RFID Tag</DialogTitle>
              <DialogDescription>
                Scanner is in scan mode. Tap the RFID tag to add it to the database.
              </DialogDescription>
            </DialogHeader>
            
            <div className="text-center py-6">
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                  <CreditCard className="w-8 h-8 text-blue-600" />
                </div>
                <div>
                  <p className="text-lg font-medium text-gray-900">
                    Ready to Scan
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    Place RFID tag near the scanner
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsAddRfidPopupOpen(false);
                  espWebSocket.setAddRfidDialogState(false);
                  espWebSocket.setScanMode(false);
                }}
              >
                Cancel
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Content Area */}
        <main className="p-8 space-y-8">
          {/* === Student Dashboard (only for non-admin on "dashboard") === */}
          {!isAdminLoggedIn && currentPage === "dashboard" && (
            <>
              {/* Search Bar */}
              <Card>
                <CardContent className="p-6">
                  <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <Input
                      placeholder="Search faculty members..."
                      className="pl-10"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-green-100 rounded-lg">
                        <Users className="w-6 h-6 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">
                          Online Faculty
                        </p>
                        <p className="text-2xl font-semibold">
                          {facultyMembers.filter((f) => f.status === "Online").length}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-yellow-100 rounded-lg">
                        <Clock className="w-6 h-6 text-yellow-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">
                          Busy Faculty
                        </p>
                        <p className="text-2xl font-semibold">
                          {
                            facultyMembers.filter(
                              (f) => f.status === "Busy",
                            ).length
                          }
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-blue-100 rounded-lg">
                        <Bell className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">
                          Total Inquiries
                        </p>
                        {/* Replace the hardcoded number with the array length */}
                        <p className="text-2xl font-semibold">
                          {studentAppointments.length}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-purple-100 rounded-lg">
                        <Users className="w-6 h-6 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">
                          Total Faculty
                        </p>
                        <p className="text-2xl font-semibold">
                          {facultyMembers.length}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Main Content Grid - Faculty and Appointments Side by Side */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Faculty List */}
                <Card>
                  <CardHeader>
                    <CardTitle>Faculty Members</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {facultyMembers.map((faculty) => (
                        <div
                          key={faculty.id}
                          className="flex items-center justify-between p-4 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-center gap-4">
                            <Avatar>
                              {faculty.photoUrl ? (
                                <AvatarImage src={faculty.photoUrl} alt={faculty.name} />
                              ) : null}
                              <AvatarFallback
                                className={`${faculty.color} text-white`}
                              >
                                {faculty.initials}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <h4 className="font-medium text-gray-900">
                                {faculty.name}
                              </h4>
                              {faculty.teacherMsg && (
                              <p className="text-sm text-gray-500 italic mt-1">
                                "{faculty.teacherMsg}"
                              </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                          <div className="flex flex-col items-end">
    {/* Top line: Status Dot and Text (No changes here) */}
                          <div className="flex items-center gap-2">
                              <div
                                  className={`w-2 h-2 rounded-full ${
                                  faculty.status === "Online"
                                      ? "bg-green-500"
                                      : faculty.status === "Busy"
                                      ? "bg-yellow-500"
                                      : "bg-gray-400"
                                  }`}
                              ></div>
                              <span className="text-sm font-medium">{faculty.status}</span>
                          </div>
                            {/* Bottom line: Displays "time ago" only when not online */}
                              {faculty.status !== "Online" && faculty.lastSeen && (
                                <p className="text-xs text-gray-500">
                                  {faculty.lastSeen}
                                </p>
                              )}
                          </div>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={!user || faculty.status !== "Online"}
                              onClick={() =>
                                handleMeetingRequest(
                                  faculty,
                                )
                              }
                            >
                              Req. Meeting
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* QR Code (when not signed in) or Appointment History (when signed in) */}
                {!user ? (
                  /* QR Code for Mobile App */
                  <Card>
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <Smartphone className="w-5 h-5 text-blue-600" />
                        <CardTitle>Get the Mobile App</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-col items-center justify-center py-10 text-center">
                        <h4 className="text-lg font-medium text-gray-900 mb-4">Download the KnockSense App</h4>
                        
                        {/* QR Code Image */}
                        <div className="w-20 h-20 bg-white border-2 border-gray-300 rounded-lg flex items-center justify-center shadow-sm mb-4">
                          <img 
                            src="src/assets/qr_img.png" 
                            alt="QR Code for KnockSense Mobile App"
                            className="w-16 h-16 object-contain"
                            onError={(e) => {
                              // Fallback if image doesn't exist
                              e.currentTarget.style.display = 'none';
                              const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                              if (fallback) {
                                fallback.style.display = 'flex';
                              }
                            }}
                          />
                          {/* Fallback pattern if image doesn't exist */}
                          <div className="w-16 h-16 bg-gray-100 border border-gray-200 rounded flex items-center justify-center" style={{ display: 'none' }}>
                            <div className="text-xs text-gray-500 text-center">
                              QR Code<br/>1024x1024<br/>PNG
                            </div>
                          </div>
                        </div>
                        
                        <p className="text-sm text-gray-600 max-w-sm mb-16">Scan the QR code with your phone to download our mobile app to be able to schedule appointments.</p>
                        
                        <div className="mt-24">
                          <Button 
                            size="sm"
                            onClick={() => setInstallInstructionsOpen(true)}
                          >
                            Instructions
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  /* Appointment History (when signed in) */
                  <Card>
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <Calendar className="w-5 h-5 text-blue-600" />
                        <CardTitle>Appointment History</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {appointmentLoading ? (
                          <div className="flex items-center justify-center py-8">
                            <div className="flex items-center gap-2 text-gray-600">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                              <span>Loading appointments...</span>
                            </div>
                          </div>
                        ) : studentAppointments.length === 0 ? (
                          <div className="text-center py-8 text-gray-500">
                            <Calendar className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                            <p>No appointment history</p>
                            <p className="text-sm mt-1">Student appointments will appear here</p>
                          </div>
                        ) : (
                          studentAppointments.slice(0, 6).map((appointment) => (
                            <div
                              key={appointment.id}
                              className="flex flex-col gap-3 p-4 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-100 rounded-lg">
                                  <Calendar className="w-4 h-4 text-blue-600" />
                                </div>
                                <div className="flex-1">
                                  {/* ✅ Display both student and teacher name */}
                                  <h4 className="font-medium text-gray-900 text-sm">
                                      <span className="font-bold">{appointment.studentName || 'Unknown Student'}</span>
                                      <span className="mx-2 font-normal text-gray-400">→</span>
                                      <span>{appointment.teacherName}</span>
                                  </h4>
                                  <p className="text-sm text-gray-500">
                                    {formatAppointmentDate(appointment.createdAt)}
                                  </p>
                                </div>
                                <Badge
                                  variant="secondary"
                                  className={getAppointmentStatusColor(appointment.status)}
                                >
                                  {/* ✅ Use the new detailed status formatter */}
                                  {formatAppointmentStatus(appointment)}
                                </Badge>
                              </div>
                              {appointment.studentNote && (
                                <div className="text-sm text-gray-600 pl-11">
                                  Note: {appointment.studentNote}
                                </div>
                              )}
                              {appointment.teacherResponse && (
                                <div className="text-sm text-blue-600 pl-11">
                                  Response: {appointment.teacherResponse}
                                </div>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </>
          )}

          {/* === Admin Dashboard (admin on "dashboard") === */}
          {isAdminLoggedIn && currentPage === "dashboard" && (
            <>
              {/* Admin Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-green-100 rounded-lg">
                        <Users className="w-6 h-6 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">
                          Active faculty
                        </p>
                        <p className="text-2xl font-semibold">
                          {
                            facultyMembers.filter(
                              (f) => f.isActive,
                            ).length
                          }
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-blue-100 rounded-lg">
                        <Users className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">
                          Total faculty
                        </p>
                        <p className="text-2xl font-semibold">
                          {facultyMembers.length}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-purple-100 rounded-lg">
                        <CreditCard className="w-6 h-6 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">
                          RFID Assigned
                        </p>
                        <p className="text-2xl font-semibold">
                          {
                            facultyMembers.filter(
                              (f) => f.rfid && f.rfid !== "--",
                            ).length
                          }
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-yellow-100 rounded-lg">
                        <Clock className="w-6 h-6 text-yellow-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">
                          Online Now
                        </p>
                        <p className="text-2xl font-semibold">
                          {
                            facultyMembers.filter(
                              (f) => f.status === "Online",
                            ).length
                          }
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Faculty Management */}
              <Card>
                <CardHeader>
                  <CardTitle>Faculty Management</CardTitle>
                </CardHeader>
                <CardContent>
                  {/* Faculty loading/error */}
                  {facultyLoading && (
                    <div className="flex items-center justify-center py-8 text-gray-600">Loading faculty...</div>
                  )}
                  {facultyError && (
                    <div className="flex items-center justify-center py-8 text-red-600">{facultyError}</div>
                  )}
                  {!facultyLoading && !facultyError && (
                    <div className="space-y-4">
                      {facultyMembers.map((faculty) => (
                      <div
                        key={faculty.id}
                        className="flex items-center justify-between p-4 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <Avatar>
                            {faculty.photoUrl ? (
                              <AvatarImage src={faculty.photoUrl} alt={faculty.name} />
                            ) : null}
                            <AvatarFallback className={`${faculty.color} text-white`}>
                              {faculty.initials}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <h4 className="font-medium text-gray-900">
                              {faculty.name}
                            </h4>
                            {faculty.teacherMsg && (
                              <p className="text-sm text-gray-500 italic mt-1">
                                "{faculty.teacherMsg}"
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-8">
                          <div className="text-center">
                            <p className="text-sm font-medium text-gray-900">
                              First Time In Today
                            </p>
                            <p className="text-sm text-gray-500">{faculty.timeIn}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-sm font-medium text-gray-900">
                              Last Time Out Today
                            </p>
                            <p className="text-sm text-gray-500">{faculty.timeOut}</p>
                          </div>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>

                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  {isSuperAdmin ? "Delete Teacher Account" : "Remove Teacher"}
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  {isSuperAdmin ? (
                                    <>
                                      This will permanently delete the teacher account of{" "}
                                      <b>{faculty.name}</b> from Firebase. This action cannot be undone.
                                      <br /><br />
                                      <strong>Note:</strong> Complete deletion from Firebase may take up to 30 days.
                                    </>
                                  ) : (
                                    <>
                                      This will remove{" "}
                                      <b>{faculty.name}</b> from the local faculty list.
                                      <br /><br />
                                      <strong>Note:</strong> Only super admins can permanently delete teacher accounts.
                                    </>
                                  )}
                                </AlertDialogDescription>
                              </AlertDialogHeader>

                              <AlertDialogFooter>
                                <AlertDialogCancel>
                                  Cancel
                                </AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() =>
                                    handleRemoveFaculty(
                                      faculty.id,
                                    )
                                  }
                                  className="bg-red-600 hover:bg-red-700 text-white"
                                >
                                  {isSuperAdmin ? "Delete Account" : "Remove"}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}

          {/* === Admin RFID Management (only for admin when currentPage === "rfid") === */}
          {isAdminLoggedIn && currentPage === "rfid" && (
            <>
              {/* RFID Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-green-100 rounded-lg">
                        <CreditCard className="w-6 h-6 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">
                          Active RFID
                        </p>
                        <p className="text-2xl font-semibold">
                        {rfidTags.filter((t) => isTagActive(t)).length}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-red-100 rounded-lg">
                        <CreditCard className="w-6 h-6 text-red-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">
                          Inactive RFID
                        </p>
                        <p className="text-2xl font-semibold">
                          {rfidTags.filter((t) => !isTagActive(t)).length}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-blue-100 rounded-lg">
                        <Users className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">
                          Total Faculty
                        </p>
                        <p className="text-2xl font-semibold">
                          {facultyMembers.length}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-purple-100 rounded-lg">
                        <Clock className="w-6 h-6 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">
                          Access Today
                        </p>
                        <p className="text-2xl font-semibold">
                          {
                            facultyMembers.filter(
                              (f) => f.timeIn !== "--",
                            ).length
                          }
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* RFID Access Management */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>
                      RFID Access Management
                    </CardTitle>
                    <p className="text-sm text-gray-600">
                      Control RFID access permissions and manage
                      assignments for faculty members
                    </p>
                  </div>
                  {/* ✅ Add RFID Button */}
                  <Button 
                    variant="default" 
                    size="sm"
                    onClick={() => {
                      setIsAddRfidPopupOpen(true);
                      // Set dialog state first, then enable scan mode
                      espWebSocket.setAddRfidDialogState(true);
                      espWebSocket.setScanMode(true);
                    }}
                  >
                    Add RFID
                  </Button>

                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Loading and Error States */}
                    {rfidLoading && (
                      <div className="flex items-center justify-center py-8">
                        <div className="flex items-center gap-2 text-gray-600">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                          <span>Loading RFID data...</span>
                        </div>
                      </div>
                    )}
                    
                    {rfidError && (
                      <div className="flex items-center justify-center py-8">
                        <div className="text-center">
                          <p className="text-red-600 mb-2">{rfidError}</p>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => window.location.reload()}
                          >
                            Refresh Page
                          </Button>
                        </div>
                      </div>
                    )}
                    
                    {/* Live tags from Firebase */}
                    {!rfidLoading && !rfidError && rfidTags.length === 0 && (
                      <div className="flex items-center justify-center py-8">
                        <div className="text-center text-gray-500">
                          <p>No RFID tags found.</p>
                          <p className="text-sm">Add your first RFID tag to get started.</p>
                        </div>
                      </div>
                    )}
                    
                    {!rfidLoading && !rfidError && rfidTags.map((tag) => (
                      <div
                        key={tag.uid}
                        className="flex items-center justify-between p-4 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              RFID: {tag.uid}
                            </p>
                            {tag.assignedTo?.facultyName ? (
                              <p className="text-sm text-gray-500">Assigned: {tag.assignedTo.facultyName}</p>
                            ) : (<p className="text-sm text-gray-400 italic">Not assigned</p>)}
                          </div>
                        </div>
                        <div className="flex items-center gap-8">
                          {/* Toggle Switch */}
                          <div className="flex flex-col items-center gap-2">
                            <Switch
                              checked={isTagActive(tag)}
                              onCheckedChange={async () => {
                                const next = isTagActive(tag) ? 'inactive' : 'active';
                                await rfidService.updateRFIDStatus(tag.uid, next);
                              }}
                            />
                            <span className="text-xs text-gray-600">
                              {isTagActive(tag) ? "Active" : "Inactive"}
                            </span>
                          </div>
                              
                          {/* Assign/Unassign Prof Button */}
                          {tag.assignedTo?.facultyId ? (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-orange-600 hover:text-orange-700 hover:bg-orange-50 border-orange-200 w-[130px]"
                              >
                                <CreditCard className="w-4 h-4 mr-2" />
                                Unassign Prof
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  Are you sure?
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to unassign <b>{tag.assignedTo.facultyName}</b> from RFID <b>{tag.uid}</b>?
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>
                                  Cancel
                                </AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={async () => {
                                    await rfidService.unassignRFID(tag.uid);
                                  }}
                                  className="bg-red-600 hover:bg-red-700 text-white"
                                >
                                  Yes
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-[130px]"
                            onClick={() => {
                              setSelectedTagUid(tag.uid);
                              setIsAssignDialogOpen(true);
                            }}
                          >
                            <CreditCard className="w-4 h-4 mr-2" />
                            Assign Prof
                          </Button>
                        )}

                          <AlertDialog
                            open={isAssignDialogOpen}
                            onOpenChange={setIsAssignDialogOpen}
                          >
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  Assign Professor
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  <div className="space-y-2">
                                    <p>Choose a professor to assign to RFID <span className="font-mono font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded">{selectedTagUid}</span></p>
                                    <div className="flex items-center gap-2 text-xs text-gray-500">
                                      <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                                      <span>Available professors can be assigned</span>
                                      <div className="w-2 h-2 bg-amber-400 rounded-full ml-2"></div>
                                      <span>Already assigned professors are unavailable</span>
                                    </div>
                                  </div>
                                </AlertDialogDescription>
                              </AlertDialogHeader>

                              <div className="space-y-3 max-h-60 overflow-y-auto">
                                {availableProfessors.map(
                                  (prof) => (
                                    <div key={prof.id} className="relative">
                                      {prof.isAssignedToRfid ? (
                                        // Disabled/Assigned Professor Card
                                        <div className="w-full p-4 border border-gray-200 rounded-lg bg-gradient-to-r from-gray-50 to-gray-100 cursor-not-allowed">
                                          <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                              <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                                                <span className="text-xs font-medium text-gray-600">
                                                  {prof.initials}
                                                </span>
                                              </div>
                                              <div className="flex flex-col">
                                                <span className="font-medium text-gray-600">{prof.name}</span>
                                                <div className="flex items-center gap-2 mt-1">
                                                  <div className="w-2 h-2 bg-amber-400 rounded-full"></div>
                                                  <span className="text-xs text-amber-600 font-medium">
                                                    Assigned to RFID {prof.assignedRfidUid}
                                                  </span>
                                                </div>
                                              </div>
                                            </div>
                                            <div className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded-full">
                                              Unavailable
                                            </div>
                                          </div>
                                        </div>
                                      ) : (
                                        // Available Professor Button
                                        <Button
                                          variant="outline"
                                          className="w-full justify-start p-4 h-auto hover:bg-blue-50 hover:border-blue-200 transition-colors"
                                          onClick={() => {
                                            rfidService.assignRFIDToFaculty(selectedTagUid!, prof.id, prof.name).then(() => setIsAssignDialogOpen(false));
                                          }}
                                        >
                                          <div className="flex items-center gap-3 w-full">
                                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                              <span className="text-xs font-medium text-blue-600">
                                                {prof.initials}
                                              </span>
                                            </div>
                                            <div className="flex flex-col items-start">
                                              <span className="font-medium text-gray-900">{prof.name}</span>
                                              <div className="flex items-center gap-2 mt-1">
                                                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                                                <span className="text-xs text-green-600 font-medium">
                                                  Available for assignment
                                                </span>
                                              </div>
                                            </div>
                                          </div>
                                        </Button>
                                      )}
                                    </div>
                                  ),
                                )}
                              </div>

                              <AlertDialogFooter>
                                <AlertDialogCancel>
                                  Cancel
                                </AlertDialogCancel>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>

                          {/* Delete RFID Button with confirmation */}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>

                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  Are you sure?
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently remove RFID <b>{tag.uid}</b>. You cannot undo this action.
                                </AlertDialogDescription>
                              </AlertDialogHeader>

                              <AlertDialogFooter>
                                <AlertDialogCancel>
                                  Cancel
                                </AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={async () => {
                                    await rfidService.deleteRFIDTag(tag.uid);
                                  }}
                                  className="bg-red-600 hover:bg-red-700 text-white"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
          
          {/* === Super Admin Management (only for super admin when currentPage === "admin-management") === */}
          {isSuperAdmin && currentPage === "admin-management" && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Admin Account Management</CardTitle>
                  <p className="text-sm text-gray-600">
                    Create and manage admin accounts. Only super admins can access this section.
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Create New Admin */}
                  <div className="border rounded-lg p-6">
                    <h3 className="text-lg font-semibold mb-4">Create New Admin</h3>
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="space-y-2">
                        <Label htmlFor="newAdminName">Full Name</Label>
                        <Input
                          id="newAdminName"
                          placeholder="Enter admin's full name"
                          value={newAdminName}
                          onChange={(e) => setNewAdminName(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="newAdminEmail">Email</Label>
                        <Input
                          id="newAdminEmail"
                          type="email"
                          placeholder="Enter admin's email"
                          value={newAdminEmail}
                          onChange={(e) => setNewAdminEmail(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="newAdminPassword">Password</Label>
                        <Input
                          id="newAdminPassword"
                          type="password"
                          placeholder="Enter temporary password"
                          value={newAdminPassword}
                          onChange={(e) => setNewAdminPassword(e.target.value)}
                        />
                      </div>
                    </div>
                    <Button 
                      onClick={handleCreateAdmin}
                      disabled={adminLoading || !newAdminName || !newAdminEmail || !newAdminPassword}
                      className="mt-4"
                    >
                      {adminLoading ? "Creating..." : "Create Admin Account"}
                    </Button>
                  </div>

                  {/* Admin Accounts List */}
                  <div className="border rounded-lg p-6">
                    <h3 className="text-lg font-semibold mb-4">Admin Accounts</h3>
                    
                    {adminLoading ? (
                      <div className="flex items-center justify-center py-4">
                        <div className="flex items-center gap-2 text-gray-600">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                          <span>Loading admin accounts...</span>
                        </div>
                      </div>
                    ) : adminAccounts.length === 0 ? (
                      <p className="text-gray-500">No admin accounts found.</p>
                    ) : (
                      <div className="space-y-3">
                        {adminAccounts.map((admin) => (
                          <div key={admin.uid} className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="space-y-1">
                              <p className="font-medium">{admin.displayName}</p>
                              <p className="text-sm text-gray-500">{admin.email}</p>
                              <p className="text-xs text-gray-400">
                                Role: {admin.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              {admin.role !== 'super_admin' && (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="destructive" size="sm">
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete Admin Account</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to delete the admin account for{" "}
                                        <b>{admin.displayName}</b>? This action cannot be undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => handleDeleteAdmin(admin.uid)}
                                        className="bg-red-600 hover:bg-red-700"
                                      >
                                        Delete
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
          
          {/* === Admin Hardware Settings (only for admin when currentPage === "hardware") === */}
          {(isAdminLoggedIn || isFailsafeMode) && currentPage === "hardware" && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>ESP32 Hardware Settings</CardTitle>
                  <p className="text-sm text-gray-600">
                    {isFailsafeMode 
                      ? "Configure WiFi settings to restore ESP32 internet connectivity."
                      : "Configure WiFi settings and check device connection status."
                    }
                  </p>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* WiFi Config */}
                  <div className="grid gap-4">
                    <div>
                      <Label htmlFor="ssid">WiFi SSID</Label>
                      <Input
                        id="ssid"
                        placeholder="Enter WiFi SSID"
                        value={ssid}
                        onChange={(e) =>
                          setSsid(e.target.value)
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="password">
                        WiFi Password
                      </Label>
                      <Input
                        id="password"
                        type="password"
                        placeholder="Enter WiFi Password"
                        value={wifiPassword}
                        onChange={(e) =>
                          setWifiPassword(e.target.value)
                        }
                      />
                    </div>
                    <Button onClick={handleSaveWifiConfig}>
                      Save Configuration
                    </Button>
                  </div>

                  {/* Compact Status Cards Row */}
<div className="flex gap-4 w-full max-w-2xl">
  {/* Connection Status */}
  <div className="flex-1 p-4 border rounded-lg flex items-center justify-between">
    <div className="text-left">
      <p className="text-sm font-medium text-gray-900">Connection Status</p>
      <p className="text-xs text-gray-500">
        {isConnected ? "Connected" : "No Connection"}
      </p>
    </div>
    <Button 
      variant="outline" 
      size="sm" 
      onClick={handleCheckConnection}
      className="text-xs py-1 px-2"
    >
      Check Connection
    </Button>
  </div>

  {/* Battery Percentage */}
  <div className="flex-1 p-4 border rounded-lg flex items-center justify-between">
  <div className="text-left">
      <p className="text-sm font-medium text-gray-900">Battery Percentage</p>
    </div>
    <div className="text-right">
      <p className="text-lg font-medium text-gray-900">
        {backupBatteryPercent === null ? 'Unknown' : `${backupBatteryPercent}%`}
      </p>
    </div>
  </div>
</div>
                </CardContent>
              </Card>
            </>
          )}
        </main>
      </div>
      
      {/* Installation Instructions Dialog */}
      <Dialog
        open={installInstructionsOpen}
        onOpenChange={setInstallInstructionsOpen}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Android Installation Instructions</DialogTitle>
            <DialogDescription>
              Follow these steps to install the KnockSense mobile app on your Android device.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0 mt-0.5">
                  1
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Enable Unknown Sources</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    Go to <strong>Settings → Security → Unknown Sources</strong> and enable it. 
                    This allows installation of apps from sources other than Google Play Store.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0 mt-0.5">
                  2
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Scan the QR Code</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    Use your phone's camera or QR code scanner to scan the QR code above. 
                    This will download the APK file to your device.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0 mt-0.5">
                  3
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Install the APK</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    Once downloaded, tap on the APK file in your Downloads folder and follow the installation prompts. 
                    You may need to grant additional permissions during installation.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0 mt-0.5">
                  4
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Launch the App</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    After installation, you can find the KnockSense app in your app drawer. 
                    Tap to open and start scheduling appointments with your teachers.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-4">
              <div className="flex items-start gap-2">
                <div className="text-yellow-600 text-sm">⚠️</div>
                <div className="text-sm text-yellow-800">
                  <strong>Note:</strong> If you encounter any issues during installation, 
                  make sure your device has enough storage space and that you have a stable internet connection.
                </div>
              </div>
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={() => setInstallInstructionsOpen(false)}>
              Got it
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Toast Notifications */}
      <Toaster />
    </div>
  );
}