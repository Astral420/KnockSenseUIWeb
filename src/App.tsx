import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import AppShell from "@/features/layout/AppShell";
import Sidebar from "@/features/layout/Sidebar";
import HeaderBar from "@/features/layout/HeaderBar";
import StudentDashboard from "@/features/student/StudentDashboard";
import AdminDashboard from "@/features/admin/AdminDashboard";
import AdminManagementPanel from "@/features/admin/AdminManagementPanel";
import RfidManagement from "@/features/rfid/RfidManagement";
import HardwareSettings from "@/features/hardware/HardwareSettings";
import LogsPanel from "@/features/logs/LogsPanel";
import AdminLoginDialog from "@/features/dialogs/AdminLoginDialog";
import StudentLoginDialog from "@/features/dialogs/StudentLoginDialog";
import { CreditCard } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";
import {
  AdminAccount,
  FacultyMember,
  LogEntry,
  RfidTag,
  StudentAppointment,
} from "@/features/types";
import {
  AdminPermissionKey,
  ADMIN_PERMISSION_DEFAULTS,
  SUPER_ADMIN_PERMISSIONS,
} from "@/features/admin/adminPermissions";

import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";
import { Textarea } from "./components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./components/ui/alert-dialog";
import { Toaster } from "./components/ui/sonner";

import { teacherService } from "./components/backend/TeacherService";
import authService from "./components/backend/auth/AuthService";
import { rfidService } from "./components/backend/RFIDService";
import { espWebSocket } from "./components/backend/WebSocketService";
import { appointmentService } from "./components/backend/AppointmentService";
import { logService } from "./components/backend/LogService";

export default function App() {
  const [studentLoginOpen, setStudentLoginOpen] = useState(false);
  const [adminLoginOpen, setAdminLoginOpen] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isLoginBlocked, setIsLoginBlocked] = useState(false);
  const [blockedUntil, setBlockedUntil] = useState<Date | null>(null);
  const [failedLoginAttempts, setFailedLoginAttempts] = useState(0);
  const [isStudentLoginLoading, setIsStudentLoginLoading] = useState(false);

  const [user, setUser] = useState<any | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState("dashboard");

  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [facultyMembers, setFacultyMembers] = useState<FacultyMember[]>([]);
  const [filteredFaculty, setFilteredFaculty] = useState<FacultyMember[]>([]);
  const [facultyLoading, setFacultyLoading] = useState(true);
  const [facultyError, setFacultyError] = useState("");

  const [rfidTags, setRfidTags] = useState<RfidTag[]>([]);
  const [rfidLoading, setRfidLoading] = useState(true);
  const [rfidError, setRfidError] = useState("");
  const [selectedTagUid, setSelectedTagUid] = useState<string | null>(null);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [isAddRfidPopupOpen, setIsAddRfidPopupOpen] = useState(false);

  const [ssid, setSsid] = useState("");
  const [wifiPassword, setWifiPassword] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [wifiConnected, setWifiConnected] = useState(true);
  const [isFailsafeMode, setIsFailsafeMode] = useState(false);

  const [studentAppointments, setStudentAppointments] = useState<StudentAppointment[]>([]);
  const [appointmentLoading, setAppointmentLoading] = useState(false);
  const [appointmentError, setAppointmentError] = useState("");
  const [requestMeetingDialogOpen, setRequestMeetingDialogOpen] = useState(false);
  const [selectedFacultyForMeeting, setSelectedFacultyForMeeting] = useState<FacultyMember | null>(null);
  const [verificationStudentNumber, setVerificationStudentNumber] = useState("");
  const [appointmentNote, setAppointmentNote] = useState("");
  const [installInstructionsOpen, setInstallInstructionsOpen] = useState(false);

  const [adminPermissions, setAdminPermissions] = useState<Record<AdminPermissionKey, boolean>>(ADMIN_PERMISSION_DEFAULTS);
  const [adminAccounts, setAdminAccounts] = useState<AdminAccount[]>([]);
  const [newAdminName, setNewAdminName] = useState("");
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminPassword, setNewAdminPassword] = useState("");
  const [adminLoading, setAdminLoading] = useState(false);
  const [archivedTeachers, setArchivedTeachers] = useState<any[]>([]);
  const [archivedLoading, setArchivedLoading] = useState(false);
  const [archivedError, setArchivedError] = useState("");
  const [updatingPermissionKey, setUpdatingPermissionKey] = useState<string | null>(null);
  const [adminManagementOpen, setAdminManagementOpen] = useState(false);

  const [logsLoading, setLogsLoading] = useState(false);
  const [logsError, setLogsError] = useState("");
  const [accessLogs, setAccessLogs] = useState<LogEntry[]>([]);
  const [attendanceLogs, setAttendanceLogs] = useState<LogEntry[]>([]);
  const [activeLogCategory, setActiveLogCategory] = useState<"access" | "attendance">("access");
  const [logDateFilter, setLogDateFilter] = useState({ startDate: "", endDate: "" });

  const studentLogoutTimerRef = useRef<number | null>(null);

  const formatLogDate = useCallback((timestamp: number) => {
    if (!timestamp) return "N/A";
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return "N/A";
    return date.toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
    });
  }, []);

  const formatLogTime = useCallback((timestamp: number) => {
    if (!timestamp) return "N/A";
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return "N/A";
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  }, []);

  const getAppointmentStatusColor = useCallback((status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-700";
      case "accepted":
        return "bg-green-100 text-green-700";
      case "denied":
        return "bg-red-100 text-red-700";
      case "completed":
        return "bg-blue-100 text-blue-700";
      case "cancelled":
        return "bg-gray-100 text-gray-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  }, []);

  const formatAppointmentDate = useCallback((date: Date | string | number | null | undefined) => {
    if (!date) return "Unknown";
    const dateObj = date instanceof Date ? date : new Date(date);
    if (Number.isNaN(dateObj.getTime())) return "Unknown";

    const now = new Date();
    const seconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000);

    if (seconds < 0) return "Just now";
    if (seconds < 60) return "Just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return minutes === 1 ? "1 minute ago" : `${minutes} minutes ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days} days ago`;
    return dateObj.toLocaleDateString();
  }, []);

  const formatAppointmentStatus = useCallback((appointment: StudentAppointment) => {
    const status = appointment.status || "unknown";
    const action = appointment.teacherAction || "";

    if (status === "accepted") {
      switch (action) {
        case "meetNow":
          return "Meet Now";
        case "wait5Minutes":
          return "Wait 5 Min";
        case "meetLater":
          return "Scheduled";
        default:
          return "Accepted";
      }
    }

    return status.charAt(0).toUpperCase() + status.slice(1);
  }, []);

  const isTagActive = useCallback(
    (tag: RfidTag) => tag?.status === "active" || tag?.status === true || tag?.status === "Active",
    [],
  );

  const availableProfessors = useMemo(
    () =>
      facultyMembers.map((prof) => ({
        ...prof,
        isAssignedToRfid: !!(prof.rfid && prof.rfid !== "--"),
        assignedRfidUid: prof.rfid,
      })),
    [facultyMembers],
  );

  useEffect(() => {
    const unsubscribe = authService.onAuthStateChange(async (nextUser) => {
      setUser(nextUser);

      if (nextUser) {
        try {
          const isAdmin = await authService.isAdmin(nextUser);
          const superAdmin = await authService.isSuperAdmin(nextUser);

          setIsAdminLoggedIn(isAdmin);
          setIsSuperAdmin(superAdmin);
          setUserRole(superAdmin ? "super_admin" : isAdmin ? "admin" : "user");

          if (isAdmin) {
            setCurrentPage("dashboard");
          }
        } catch (error) {
          console.error("Error checking user roles:", error);
          const fallbackAdmin = await authService.isAdmin(nextUser);
          setIsAdminLoggedIn(fallbackAdmin);
          setIsSuperAdmin(false);
          setUserRole(fallbackAdmin ? "admin" : "user");
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

  useEffect(() => {
    if (!user || isFailsafeMode) {
      setAdminPermissions(ADMIN_PERMISSION_DEFAULTS);
      return;
    }

    if (isSuperAdmin) {
      setAdminPermissions(SUPER_ADMIN_PERMISSIONS);
      return;
    }

    if (!isAdminLoggedIn) {
      setAdminPermissions(ADMIN_PERMISSION_DEFAULTS);
      return;
    }

    let active = true;

    authService
      .getAdminPermissions(user.uid)
      .then((permissions) => {
        if (!active) return;
        setAdminPermissions({
          ...ADMIN_PERMISSION_DEFAULTS,
          ...(permissions || {}),
        });
      })
      .catch(() => {
        if (!active) return;
        setAdminPermissions(ADMIN_PERMISSION_DEFAULTS);
      });

    return () => {
      active = false;
    };
  }, [user, isAdminLoggedIn, isSuperAdmin, isFailsafeMode]);

  const can = useCallback(
    (permission: AdminPermissionKey) => {
      if (isSuperAdmin || isFailsafeMode) return true;
      return !!adminPermissions[permission];
    },
    [adminPermissions, isSuperAdmin, isFailsafeMode],
  );

  const canSeeAccessLogs = can("seeAccessLogs");
  const canSeeAttendanceLogs = can("seeAttendanceLogs");
  const canChangeWifiInformation = can("changeWifiInformation");

  useEffect(() => {
    if (!canSeeAttendanceLogs && activeLogCategory === "attendance" && canSeeAccessLogs) {
      setActiveLogCategory("access");
    } else if (!canSeeAccessLogs && activeLogCategory === "access" && canSeeAttendanceLogs) {
      setActiveLogCategory("attendance");
    }
  }, [canSeeAccessLogs, canSeeAttendanceLogs, activeLogCategory]);

  useEffect(() => {
    const savedTimeout = localStorage.getItem("adminLoginTimeout");
    const savedAttempts = localStorage.getItem("adminLoginAttempts");

    if (savedTimeout && savedAttempts) {
      const timeoutDate = new Date(Number(savedTimeout));
      const attempts = Number(savedAttempts);

      if (new Date() < timeoutDate) {
        setIsLoginBlocked(true);
        setBlockedUntil(timeoutDate);
        setFailedLoginAttempts(attempts);
      } else {
        localStorage.removeItem("adminLoginTimeout");
        localStorage.removeItem("adminLoginAttempts");
      }
    }
  }, []);

  useEffect(() => {
    if (!isLoginBlocked || !blockedUntil) return;

    const timer = window.setInterval(() => {
      if (new Date() >= blockedUntil) {
        setIsLoginBlocked(false);
        setBlockedUntil(null);
        setFailedLoginAttempts(0);
        setLoginError("");
        localStorage.removeItem("adminLoginTimeout");
        localStorage.removeItem("adminLoginAttempts");
      }
    }, 1000);

    return () => window.clearInterval(timer);
  }, [isLoginBlocked, blockedUntil]);

  useEffect(() => {
    espWebSocket.connect(window.location.hostname, 81);
    espWebSocket.requestSystemStatus();

    return () => {
      espWebSocket.disconnect();
    };
  }, []);

  useEffect(() => {
    const wifiStatusHandler = (msg: any) => {
      if (msg.type === "wifi_status" || msg.type === "system_status") {
        const connected = msg.connected || msg.wifi_connected;
        setWifiConnected(!!connected);

        if (!connected) {
          setIsFailsafeMode(true);
          setIsAdminLoggedIn(true);
          setCurrentPage("hardware");
          setAuthLoading(false);
        } else if (isFailsafeMode) {
          setIsFailsafeMode(false);
          setTimeout(() => window.location.reload(), 1000);
        }
      }
    };

    const connectionStateHandler = (state: string) => {
      if (state === "connected") {
        setTimeout(() => espWebSocket.requestSystemStatus(), 500);
        setTimeout(() => espWebSocket.requestSystemStatus(), 2000);
      }
    };

    espWebSocket.addMessageHandler(wifiStatusHandler);
    espWebSocket.addConnectionStateHandler(connectionStateHandler);

    const interval = window.setInterval(() => {
      if (espWebSocket.isConnected() && !isFailsafeMode) {
        espWebSocket.requestSystemStatus();
      }
    }, 5000);

    return () => {
      espWebSocket.removeMessageHandler(wifiStatusHandler);
      espWebSocket.removeConnectionStateHandler(connectionStateHandler);
      window.clearInterval(interval);
    };
  }, [isFailsafeMode]);

  useEffect(() => {
    if (isFailsafeMode) {
      setIsAdminLoggedIn(true);
      setCurrentPage("hardware");
      setAuthLoading(false);
    }
  }, [isFailsafeMode]);

  useEffect(() => {
    if (authLoading || isFailsafeMode) return;

    setFacultyLoading(true);
    setFacultyError("");

    const handleTeachers = (teachers: FacultyMember[]) => {
      setFacultyMembers(teachers);
      setFacultyLoading(false);
    };

    const handleError = (err?: any) => {
      const code = err?.code || err?.name || "";
      if (String(code).toLowerCase().includes("permission")) {
        setFacultyMembers([]);
        setFacultyLoading(false);
        return;
      }
      setFacultyError("Failed to load faculty data.");
      setFacultyLoading(false);
    };

    teacherService.subscribeToTeachers(handleTeachers, handleError);

    return () => teacherService.unsubscribeFromTeachers(handleTeachers);
  }, [authLoading, user?.uid, isFailsafeMode]);

  useEffect(() => {
    if (!authLoading && isAdminLoggedIn) {
      setRfidLoading(true);
      setRfidError("");

      const handleTags = (tags: RfidTag[]) => {
        setRfidTags(tags);
        setRfidLoading(false);
      };

      const handleError = (error: any) => {
        console.error("RFID subscription error:", error);
        setRfidError("Failed to load RFID data. Please refresh the page.");
        setRfidLoading(false);
      };

      rfidService.subscribeToRFIDTags(handleTags, handleError);

      return () => rfidService.unsubscribeFromRFIDTags(handleTags);
    }
  }, [authLoading, isAdminLoggedIn]);

  useEffect(() => {
    if (!debouncedSearchQuery) {
      setFilteredFaculty(facultyMembers);
    } else {
      const lower = debouncedSearchQuery.toLowerCase();
      setFilteredFaculty(
        facultyMembers.filter((faculty) => (faculty.name || "").toLowerCase().includes(lower)),
      );
    }
  }, [debouncedSearchQuery, facultyMembers]);

  useEffect(() => {
    const handleNewRfidMessage = (msg: any) => {
      if (msg.type === "new_rfid_scanned" && msg.uid && !msg.error) {
        toast.success(`RFID ${msg.uid} added successfully!`);
        setIsAddRfidPopupOpen(false);
      }
    };

    const handleRfidErrorMessage = (msg: any) => {
      if (msg.type === "rfid_error") {
        if (msg.error === "duplicate") {
          toast.error(`RFID ${msg.uid} already exists in the database!`);
        } else {
          toast.error(`RFID Error: ${msg.message || "Unknown error occurred"}`);
        }
        setIsAddRfidPopupOpen(false);
      }
    };

    espWebSocket.addMessageHandler(handleNewRfidMessage);
    espWebSocket.addMessageHandler(handleRfidErrorMessage);

    return () => {
      espWebSocket.removeMessageHandler(handleNewRfidMessage);
      espWebSocket.removeMessageHandler(handleRfidErrorMessage);
    };
  }, []);

  useEffect(() => {
    espWebSocket.setAddRfidDialogState(isAddRfidPopupOpen);
    espWebSocket.setScanMode(isAddRfidPopupOpen);
  }, [isAddRfidPopupOpen]);

  useEffect(() => {
    if (user && !isAdminLoggedIn && !isFailsafeMode) {
      if (studentLogoutTimerRef.current) {
        window.clearTimeout(studentLogoutTimerRef.current);
      }
      studentLogoutTimerRef.current = window.setTimeout(async () => {
        try {
          setRequestMeetingDialogOpen(false);
          setInstallInstructionsOpen(false);
          setIsAddRfidPopupOpen(false);
          setAdminLoginOpen(false);
          setStudentLoginOpen(false);

          await authService.logout();
          toast.info("Session expired after 2 minutes. You have been logged out.");
        } finally {
          studentLogoutTimerRef.current = null;
        }
      }, 120_000);
    } else if (studentLogoutTimerRef.current) {
      window.clearTimeout(studentLogoutTimerRef.current);
      studentLogoutTimerRef.current = null;
    }

    return () => {
      if (studentLogoutTimerRef.current) {
        window.clearTimeout(studentLogoutTimerRef.current);
        studentLogoutTimerRef.current = null;
      }
    };
  }, [user?.uid, isAdminLoggedIn, isFailsafeMode]);

  useEffect(() => {
    let unsubscribe = () => {};

    if (user && !isAdminLoggedIn && user.studentNumber) {
      setAppointmentLoading(true);
      unsubscribe = appointmentService.subscribeToStudentAppointments(
        user.studentNumber,
        (appointments) => {
          setStudentAppointments(appointments);
          setAppointmentLoading(false);
        },
      );
    } else if (!user && !isAdminLoggedIn) {
      setAppointmentLoading(true);
      unsubscribe = appointmentService.subscribeToAllAppointments((appointments) => {
        setStudentAppointments(appointments);
        setAppointmentLoading(false);
      });
    } else {
      setStudentAppointments([]);
    }

    return () => unsubscribe();
  }, [user, isAdminLoggedIn]);

  const loadArchivedTeachers = useCallback(async () => {
    try {
      setArchivedLoading(true);
      setArchivedError("");
      const teachers = await authService.getArchivedTeachers();
      setArchivedTeachers(teachers);
    } catch (error) {
      console.error("Error loading archived teachers:", error);
      setArchivedError("Failed to load archived teachers.");
    } finally {
      setArchivedLoading(false);
    }
  }, []);

  const loadAdminAccounts = useCallback(async () => {
    try {
      setAdminLoading(true);
      const result = await authService.getAdminAccounts();
      const combined = [...result.admins, ...result.superAdmins];
      const accounts = await Promise.all(
        combined.map(async (admin) => {
          if (admin.role === "super_admin") {
            return {
              ...admin,
              permissions: { ...SUPER_ADMIN_PERMISSIONS },
            };
          }
          try {
            const permissions = await authService.getAdminPermissions(admin.uid);
            return {
              ...admin,
              permissions: {
                ...ADMIN_PERMISSION_DEFAULTS,
                ...(permissions || {}),
              },
            };
          } catch (error) {
            console.error("Error loading permissions for admin:", admin.uid, error);
            return {
              ...admin,
              permissions: { ...ADMIN_PERMISSION_DEFAULTS },
            };
          }
        }),
      );
      setAdminAccounts(accounts);
    } catch (error) {
      console.error("Error loading admin accounts:", error);
      toast.error("Failed to load admin accounts");
    } finally {
      setAdminLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isSuperAdmin && currentPage === "admin-management") {
      loadAdminAccounts();
      loadArchivedTeachers();
    }
  }, [isSuperAdmin, currentPage, loadAdminAccounts, loadArchivedTeachers]);

  useEffect(() => {
    if (!(currentPage === "logs" && (isSuperAdmin || canSeeAccessLogs || canSeeAttendanceLogs))) {
      return;
    }

    setLogsLoading(true);
    setLogsError("");

    const handleAccessLogs = (logs: LogEntry[]) => {
      setAccessLogs(logs);
      setLogsLoading(false);
    };

    const handleAttendanceLogs = (logs: LogEntry[]) => {
      setAttendanceLogs(logs);
      setLogsLoading(false);
    };

    const handleError = (error: any) => {
      console.error("Error loading logs:", error);
      setLogsError("Failed to load logs. Please refresh the page.");
      setLogsLoading(false);
    };

    logService.subscribeToAccessLogs(handleAccessLogs, handleError);
    logService.subscribeToAttendanceLogs(handleAttendanceLogs, handleError);

    return () => {
      logService.unsubscribeFromAll();
    };
  }, [currentPage, isSuperAdmin, canSeeAccessLogs, canSeeAttendanceLogs]);

  const handleSaveWifiConfig = useCallback(() => {
    if (!canChangeWifiInformation) {
      toast.error("You do not have permission to change WiFi settings.");
      return;
    }
    espWebSocket.sendWifiConfig(ssid, wifiPassword);
    toast.success("WiFi configuration saved. The page will refresh to apply changes.");
    setTimeout(() => window.location.reload(), 3000);
  }, [canChangeWifiInformation, ssid, wifiPassword]);

  const handleCheckConnection = useCallback(async () => {
    try {
      await fetch("https://www.google.com", { mode: "no-cors" });
      setIsConnected(true);
    } catch (error) {
      setIsConnected(false);
    }
  }, []);

  const handleOffice365Login = useCallback(async () => {
    setIsStudentLoginLoading(true);
    try {
      const result = await authService.loginWithMicrosoft();
      if (result.success) {
        setStudentLoginOpen(false);
        toast.success(`Welcome ${result.user.displayName || result.user.email}!`);
      } else {
        const errorMessage = result.error || "Login failed";
        const code = result.code || "";

        if (code === "auth/popup-closed-by-user" || errorMessage.toLowerCase().includes("cancel")) {
          toast.error("Sign in has been cancelled.");
        } else if (errorMessage.toLowerCase().includes("network")) {
          toast.error("Network error. Please check your connection and try again.");
        } else if (errorMessage.toLowerCase().includes("auth")) {
          toast.error("Authentication failed. Please try again.");
        } else {
          toast.error(`Login failed: ${errorMessage}`);
        }
      }
    } catch (error: any) {
      if (String(error?.code) === "auth/popup-closed-by-user") {
        toast.error("Sign in has been cancelled.");
      } else {
        toast.error("Failed to login with Microsoft. Please try again.");
      }
    } finally {
      setIsStudentLoginLoading(false);
    }
  }, []);

  const handleMeetingRequest = useCallback(
    (faculty: FacultyMember) => {
      if (!user) {
        toast.error("Please login to request a meeting");
        return;
      }
      setSelectedFacultyForMeeting(faculty);
      setRequestMeetingDialogOpen(true);
      setVerificationStudentNumber("");
      setAppointmentNote("");
      setAppointmentError("");
    },
    [user],
  );

  const handleSubmitAppointment = useCallback(async () => {
    if (!verificationStudentNumber || verificationStudentNumber.length !== 6) {
      toast.error("Please enter your 6-digit student number for verification");
      return;
    }

    if (!user?.studentNumber || user.studentNumber !== verificationStudentNumber) {
      toast.error("The student number entered does not match your account.");
      return;
    }

    const trimmedNote = appointmentNote.trim();
    if (!trimmedNote) {
      toast.error("Please add a note for the faculty member.");
      return;
    }

    setAppointmentLoading(true);
    setAppointmentError("");

    try {
      const studentData = {
        studentNumber: user.studentNumber,
        displayName: user.displayName || user.email,
        uid: user.uid,
        photoUrl: user.photoURL || null,
      };

      const teacherData = {
        uid: selectedFacultyForMeeting?.id,
        name: selectedFacultyForMeeting?.name,
        photoUrl: selectedFacultyForMeeting?.photoUrl || null,
      };

      const result = await appointmentService.createAppointment(studentData, teacherData, trimmedNote);

      if (result.success) {
        toast.success("Appointment request sent successfully!");
        setRequestMeetingDialogOpen(false);
        setVerificationStudentNumber("");
        setAppointmentNote("");
      } else {
        toast.error(result.error || "Failed to create appointment");
        setAppointmentError(result.error || "Failed to create appointment");
      }
    } catch (error) {
      console.error("Error creating appointment:", error);
      toast.error("An error occurred while creating the appointment");
      setAppointmentError("An error occurred while creating the appointment");
    } finally {
      setAppointmentLoading(false);
    }
  }, [verificationStudentNumber, user, appointmentNote, selectedFacultyForMeeting]);

  const handleAdminLogin = useCallback(async () => {
    if (!adminEmail || !adminPassword) {
      toast.error("Please enter both email and password");
      return;
    }

    if (isLoginBlocked && blockedUntil && new Date() < blockedUntil) {
      const remainingMinutes = Math.ceil((blockedUntil.getTime() - new Date().getTime()) / (1000 * 60));
      setLoginError(`Too many failed attempts. Please try again in ${remainingMinutes} minutes.`);
      return;
    }

    setLoginError("");

    try {
      const result = await authService.loginAdmin(adminEmail, adminPassword);
      if (result.success) {
        setFailedLoginAttempts(0);
        setIsLoginBlocked(false);
        setBlockedUntil(null);
        setAdminLoginOpen(false);
        setAdminEmail("");
        setAdminPassword("");
        toast.success("Admin login successful!");
        localStorage.removeItem("adminLoginTimeout");
        localStorage.removeItem("adminLoginAttempts");
      } else {
        const newFailedAttempts = failedLoginAttempts + 1;
        setFailedLoginAttempts(newFailedAttempts);

        if (newFailedAttempts >= 3) {
          const blockUntil = new Date(Date.now() + 10 * 60 * 1000);
          setIsLoginBlocked(true);
          setBlockedUntil(blockUntil);
          setLoginError("Too many failed attempts. Admin login is blocked for 10 minutes.");
          toast.error("Too many failed attempts. Admin login is blocked for 10 minutes.");
          localStorage.setItem("adminLoginTimeout", blockUntil.getTime().toString());
          localStorage.setItem("adminLoginAttempts", newFailedAttempts.toString());
        } else {
          const errorMessage = result.error || "Login failed";
          setLoginError(errorMessage);
          toast.error(`Login failed: ${errorMessage}`);
          localStorage.setItem("adminLoginAttempts", newFailedAttempts.toString());
        }
      }
    } catch (error) {
      const newFailedAttempts = failedLoginAttempts + 1;
      setFailedLoginAttempts(newFailedAttempts);

      if (newFailedAttempts >= 3) {
        const blockUntil = new Date(Date.now() + 10 * 60 * 1000);
        setIsLoginBlocked(true);
        setBlockedUntil(blockUntil);
        setLoginError("Too many failed attempts. Admin login is blocked for 10 minutes.");
        toast.error("Too many failed attempts. Admin login is blocked for 10 minutes.");
        localStorage.setItem("adminLoginTimeout", blockUntil.getTime().toString());
        localStorage.setItem("adminLoginAttempts", newFailedAttempts.toString());
      } else {
        const errorMessage = "Login failed - please try again";
        setLoginError(errorMessage);
        toast.error(errorMessage);
        localStorage.setItem("adminLoginAttempts", newFailedAttempts.toString());
      }
    }
  }, [adminEmail, adminPassword, isLoginBlocked, blockedUntil, failedLoginAttempts]);

  const handleLogout = useCallback(async () => {
    try {
      await authService.logout();
      setIsAdminLoggedIn(false);
      setCurrentPage("dashboard");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  }, []);

  const handleToggleRfidAccess = useCallback((facultyId: string) => {
    setFacultyMembers((prev) =>
      prev.map((faculty) =>
        faculty.id === facultyId
          ? {
              ...faculty,
              isActive: !faculty.isActive,
            }
          : faculty,
      ),
    );
  }, []);

  const handleRfidAssignClick = useCallback((tagUid: string) => {
    setSelectedTagUid(tagUid);
    setIsAssignDialogOpen(true);
  }, []);

  const handleAssignProfessor = useCallback(async (tagUid: string, facultyId: string, facultyName: string) => {
    try {
      await rfidService.assignRFIDToFaculty(tagUid, facultyId, facultyName);
      setIsAssignDialogOpen(false);
      setSelectedTagUid(null);
    } catch (error) {
      toast.error("Failed to assign RFID. Please try again.");
    }
  }, []);

  const handleUnassignProfessor = useCallback(async (tagUid: string) => {
    try {
      await rfidService.unassignRFID(tagUid);
      toast.success("RFID unassigned successfully.");
    } catch (error) {
      toast.error("Failed to unassign RFID. Please try again.");
    }
  }, []);

  const handleDeleteRfid = useCallback(async (tagUid: string) => {
    try {
      await rfidService.deleteRFIDTag(tagUid);
      toast.success("RFID deleted successfully.");
    } catch (error) {
      toast.error("Failed to delete RFID. Please try again.");
    }
  }, []);

  const handleAddFaculty = useCallback((name: string) => {
    if (name.trim()) {
      const newTeacher: FacultyMember = {
        id: `${Date.now()}`,
        name,
        initials: name
          .split(" ")
          .map((n) => n.charAt(0))
          .join("")
          .toUpperCase(),
        status: "Offline",
        lastSeen: "Never",
        color: "bg-blue-500",
        isActive: false,
        rfid: "--",
        timeIn: "--",
        timeOut: "--",
      };

      setFacultyMembers((prev) => [...prev, newTeacher]);
    }
  }, []);

  const handleRemoveFaculty = useCallback(
    async (facultyId: string) => {
      if (!isSuperAdmin && !adminPermissions.removeTeacherAccounts) {
        toast.error("You do not have permission to remove teacher accounts.");
        return;
      }

      if (isSuperAdmin) {
        try {
          setFacultyLoading(true);
          const result = await authService.deleteTeacherAccount(facultyId);
          toast.success(result.message);
          setFacultyMembers((prev) => prev.filter((faculty) => faculty.id !== facultyId));
          await loadArchivedTeachers();
        } catch (error) {
          console.error("Error deleting teacher:", error);
          toast.error("Failed to delete teacher account: " + error);
        } finally {
          setFacultyLoading(false);
        }
      } else {
        setFacultyMembers((prev) => prev.filter((faculty) => faculty.id !== facultyId));
      }
    },
    [isSuperAdmin, adminPermissions.removeTeacherAccounts, loadArchivedTeachers],
  );

  const handleCreateAdmin = useCallback(async () => {
    if (!newAdminName || !newAdminEmail || !newAdminPassword) {
      toast.error("Please fill in all fields");
      return;
    }

    try {
      setAdminLoading(true);
      const result = await authService.createAdminAccount(newAdminEmail, newAdminPassword, newAdminName);
      toast.success(result.message);
      setNewAdminName("");
      setNewAdminEmail("");
      setNewAdminPassword("");
      setAdminManagementOpen(false);
      await loadAdminAccounts();
    } catch (error) {
      console.error("Error creating admin:", error);
      toast.error("Failed to create admin account: " + error);
    } finally {
      setAdminLoading(false);
    }
  }, [newAdminEmail, newAdminName, newAdminPassword, loadAdminAccounts]);

  const handleDeleteAdmin = useCallback(
    async (adminUid: string) => {
      try {
        setAdminLoading(true);
        const result = await authService.deleteAdminAccount(adminUid);
        toast.success(result.message);
        await loadAdminAccounts();
      } catch (error) {
        console.error("Error deleting admin:", error);
        toast.error("Failed to delete admin account: " + error);
      } finally {
        setAdminLoading(false);
      }
    },
    [loadAdminAccounts],
  );

  const handleToggleAdminPermission = useCallback(
    async (adminUid: string, permissionKey: AdminPermissionKey, value: boolean) => {
      if (!adminUid) return;
      const mutationKey = `${adminUid}:${permissionKey}`;
      try {
        setUpdatingPermissionKey(mutationKey);
        await authService.updateAdminPermission(adminUid, permissionKey, value);
        setAdminAccounts((prev) =>
          prev.map((admin) =>
            admin.uid === adminUid
              ? {
                  ...admin,
                  permissions: {
                    ...ADMIN_PERMISSION_DEFAULTS,
                    ...(admin.permissions || {}),
                    [permissionKey]: value,
                  },
                }
              : admin,
          ),
        );
        if (user?.uid === adminUid && !isSuperAdmin) {
          setAdminPermissions((prev) => ({
            ...ADMIN_PERMISSION_DEFAULTS,
            ...prev,
            [permissionKey]: value,
          }));
        }
      } catch (error) {
        console.error("Error updating admin permission:", error);
        toast.error("Failed to update permission");
      } finally {
        setUpdatingPermissionKey(null);
      }
    },
    [user?.uid, isSuperAdmin],
  );

  const handleRestoreArchivedTeacher = useCallback(
    async (teacherUid: string) => {
      if (!isSuperAdmin) {
        toast.error("Only super admins can restore archived teachers.");
        return;
      }

      try {
        setArchivedLoading(true);
        const result = await authService.restoreArchivedTeacher(teacherUid);
        toast.success(result.message || "Teacher restored successfully.");
        await loadArchivedTeachers();
      } catch (error: any) {
        console.error("Error restoring archived teacher:", error);
        const message = error?.message || "Failed to restore archived teacher.";
        toast.error(message);
      } finally {
        setArchivedLoading(false);
      }
    },
    [isSuperAdmin, loadArchivedTeachers],
  );

  const renderPage = () => {
    if (isFailsafeMode || currentPage === "hardware") {
      return (
        <HardwareSettings
          isFailsafeMode={isFailsafeMode}
          ssid={ssid}
          wifiPassword={wifiPassword}
          canChangeWifiInformation={canChangeWifiInformation}
          setSsid={setSsid}
          setWifiPassword={setWifiPassword}
          handleSaveWifiConfig={handleSaveWifiConfig}
          handleCheckConnection={handleCheckConnection}
          isConnected={isConnected}
        />
      );
    }

    if (currentPage === "rfid" && isAdminLoggedIn) {
      return (
        <RfidManagement
          rfidTags={rfidTags}
          rfidLoading={rfidLoading}
          rfidError={rfidError}
          availableProfessors={availableProfessors}
          isTagActive={isTagActive}
          onToggleTagStatus={async (tag) => {
            const nextStatus = isTagActive(tag) ? "inactive" : "active";
            await rfidService.updateRFIDStatus(tag.uid, nextStatus);
          }}
          onSelectTagForAssignment={handleRfidAssignClick}
          selectedTagUid={selectedTagUid}
          isAssignDialogOpen={isAssignDialogOpen}
          onAssignDialogOpenChange={(open) => {
            setIsAssignDialogOpen(open);
            if (!open) {
              setSelectedTagUid(null);
            }
          }}
          onAssignProfessor={handleAssignProfessor}
          onUnassignProfessor={handleUnassignProfessor}
          onDeleteTag={handleDeleteRfid}
          onAddRfidClick={() => {
            setIsAddRfidPopupOpen(true);
          }}
        />
      );
    }

    if (currentPage === "admin-management" && isSuperAdmin) {
      return (
        <AdminManagementPanel
          adminLoading={adminLoading}
          adminAccounts={adminAccounts}
          newAdminName={newAdminName}
          newAdminEmail={newAdminEmail}
          newAdminPassword={newAdminPassword}
          onNewAdminNameChange={setNewAdminName}
          onNewAdminEmailChange={setNewAdminEmail}
          onNewAdminPasswordChange={setNewAdminPassword}
          handleCreateAdmin={handleCreateAdmin}
          handleDeleteAdmin={handleDeleteAdmin}
          handleToggleAdminPermission={handleToggleAdminPermission}
          updatingPermissionKey={updatingPermissionKey}
          adminManagementOpen={adminManagementOpen}
          setAdminManagementOpen={setAdminManagementOpen}
          archivedTeachers={archivedTeachers}
          archivedLoading={archivedLoading}
          archivedError={archivedError}
          loadArchivedTeachers={loadArchivedTeachers}
          handleRestoreArchivedTeacher={handleRestoreArchivedTeacher}
        />
      );
    }

    if (currentPage === "logs" && (isSuperAdmin || canSeeAccessLogs || canSeeAttendanceLogs)) {
      return (
        <LogsPanel
          canSeeAccessLogs={canSeeAccessLogs}
          canSeeAttendanceLogs={canSeeAttendanceLogs}
          activeLogCategory={activeLogCategory}
          setActiveLogCategory={setActiveLogCategory}
          logDateFilter={logDateFilter}
          setLogDateFilter={setLogDateFilter}
          logsLoading={logsLoading}
          logsError={logsError}
          accessLogs={accessLogs}
          attendanceLogs={attendanceLogs}
          formatLogDate={formatLogDate}
          formatLogTime={formatLogTime}
        />
      );
    }

    if (currentPage === "dashboard" && isAdminLoggedIn) {
      return (
        <AdminDashboard
          facultyMembers={facultyMembers}
          filteredFaculty={filteredFaculty}
          facultyLoading={facultyLoading}
          facultyError={facultyError}
          handleRemoveFaculty={handleRemoveFaculty}
          isSuperAdmin={isSuperAdmin}
        />
      );
    }

    return (
      <StudentDashboard
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        facultyMembers={facultyMembers}
        filteredFaculty={filteredFaculty}
        user={user}
        handleMeetingRequest={handleMeetingRequest}
        studentAppointments={studentAppointments}
        appointmentLoading={appointmentLoading}
        getAppointmentStatusColor={getAppointmentStatusColor}
        formatAppointmentDate={formatAppointmentDate}
        formatAppointmentStatus={formatAppointmentStatus}
        setInstallInstructionsOpen={setInstallInstructionsOpen}
      />
    );
  };

  const renderHeaderActions = () => {
    if (isFailsafeMode) {
      return null;
    }

    if (isAdminLoggedIn) {
      return (
        <Button variant="outline" size="sm" onClick={handleLogout}>
          Logout
        </Button>
      );
    }

    if (user) {
      return (
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-700">
            {user.displayName || user.email}
          </span>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            Logout
          </Button>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2">
        <StudentLoginDialog
          open={studentLoginOpen}
          onOpenChange={(open) => {
            setStudentLoginOpen(open);
          }}
          isStudentLoginLoading={isStudentLoginLoading}
          onLogin={handleOffice365Login}
        />
        <AdminLoginDialog
          open={adminLoginOpen}
          onOpenChange={(open) => {
            setAdminLoginOpen(open);
            if (!open) {
              setLoginError("");
            }
          }}
          adminEmail={adminEmail}
          adminPassword={adminPassword}
          loginError={loginError}
          isLoginBlocked={isLoginBlocked}
          onEmailChange={(value) => {
            setAdminEmail(value);
            if (loginError) {
              setLoginError("");
            }
          }}
          onPasswordChange={(value) => {
            setAdminPassword(value);
            if (loginError) {
              setLoginError("");
            }
          }}
          onSubmit={handleAdminLogin}
        />
      </div>
    );
  };

  const headerTitle = isFailsafeMode
    ? "Hardware Settings"
    : isAdminLoggedIn
    ? "Admin Dashboard"
    : "Faculty Dashboard";

  const headerSubtitle = isFailsafeMode
    ? "ESP32 WiFi is disconnected. Configure WiFi settings to restore connectivity."
    : isAdminLoggedIn
    ? "Manage faculty members and system settings"
    : "Manage and connect with faculty members";

  return (
    <>
      <Toaster />
      <AppShell
        sidebar={
          <Sidebar
            currentPage={currentPage}
            isAdminLoggedIn={isAdminLoggedIn}
            isSuperAdmin={isSuperAdmin}
            isFailsafeMode={isFailsafeMode}
            can={can}
            setCurrentPage={setCurrentPage}
          />
        }
        header={
          <HeaderBar
            title={headerTitle}
            subtitle={headerSubtitle}
            isFailsafeMode={isFailsafeMode}
            wifiConnected={wifiConnected}
            actionButtons={renderHeaderActions()}
          />
        }
      >
        {renderPage()}
      </AppShell>

      <Dialog open={requestMeetingDialogOpen} onOpenChange={setRequestMeetingDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Request Meeting{selectedFacultyForMeeting ? ` with ${selectedFacultyForMeeting.name}` : ""}
            </DialogTitle>
            <DialogDescription>
              Enter your student number and a short note for the faculty member.
            </DialogDescription>
          </DialogHeader>
          {appointmentError && (
            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
              {appointmentError}
            </div>
          )}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="studentNumber">Student Number</Label>
              <Input
                id="studentNumber"
                value={verificationStudentNumber}
                onChange={(event) => setVerificationStudentNumber(event.target.value)}
                placeholder="Enter your 6-digit student number"
                maxLength={6}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="appointmentNote">Message</Label>
              <Textarea
                id="appointmentNote"
                value={appointmentNote}
                onChange={(event) => setAppointmentNote(event.target.value)}
                placeholder="Let the faculty member know why you want to meet"
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRequestMeetingDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitAppointment} disabled={appointmentLoading}>
              {appointmentLoading ? "Sending..." : "Send Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={installInstructionsOpen} onOpenChange={setInstallInstructionsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Install Instructions</DialogTitle>
            <DialogDescription>
              Follow these steps to install the KnockSense mobile application on your device.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm text-gray-700">
            <p>1. Open the camera on your mobile phone.</p>
            <p>2. Scan the QR code displayed on the dashboard to open the download link.</p>
            <p>3. Install the application and sign in with your school Microsoft account.</p>
            <p>4. Enable notifications so you never miss meeting updates.</p>
          </div>
          <DialogFooter>
            <Button onClick={() => setInstallInstructionsOpen(false)}>Got it</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isAddRfidPopupOpen}
        onOpenChange={(open) => {
          setIsAddRfidPopupOpen(open);
          espWebSocket.setAddRfidDialogState(open);
          if (!open) {
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
                <p className="text-lg font-medium text-gray-900">Ready to Scan</p>
                <p className="text-sm text-gray-500 mt-1">Place RFID tag near the scanner</p>
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
    </>
  );
}