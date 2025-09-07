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
import { Avatar, AvatarFallback } from "./components/ui/avatar";
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
import { useState, useEffect } from "react";

import authService from './components/backend/auth/AuthService';
import { rfidService, espWebSocket } from './components/backend/RFIDService';

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

const initialFacultyMembers = [] as any[];

const appointmentHistory = [
  {
    id: 1,
    studentName: "John Smith",
    studentId: "STU-001",
    faculty: "Prof. Santos",
    date: "2024-01-15",
    time: "2:00 PM",
    status: "Completed",
  },
  {
    id: 2,
    studentName: "Maria Garcia",
    studentId: "STU-002",
    faculty: "Prof. Kim",
    date: "2024-01-14",
    time: "10:30 AM",
    status: "Completed",
  },
  {
    id: 3,
    studentName: "David Lee",
    studentId: "STU-003",
    faculty: "Prof. Cruz",
    date: "2024-01-14",
    time: "3:15 PM",
    status: "Completed",
  },
  {
    id: 4,
    studentName: "Sarah Johnson",
    studentId: "STU-004",
    faculty: "Prof. Gonzales",
    date: "2024-01-13",
    time: "11:00 AM",
    status: "Completed",
  },
  {
    id: 5,
    studentName: "Michael Brown",
    studentId: "STU-005",
    faculty: "Prof. Joe",
    date: "2024-01-12",
    time: "1:45 PM",
    status: "Completed",
  },
  {
    id: 6,
    studentName: "Emily Davis",
    studentId: "STU-006",
    faculty: "Prof. Balbin",
    date: "2024-01-12",
    time: "4:00 PM",
    status: "Completed",
  },
];

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
  const [facultyMembers, setFacultyMembers] = useState(
    initialFacultyMembers,
  );

  const [newFacultyName, setNewFacultyName] = useState("");
  const [newRfidId, setNewRfidId] = useState("");

  const [selectedRfid, setSelectedRfid] = useState(null);
  const [isAssignDialogOpen, setIsAssignDialogOpen] =
    useState(false);
  const [isAddRfidPopupOpen, setIsAddRfidPopupOpen] = useState(false);

  // Hardware settings states
  const [ssid, setSsid] = useState("");
  const [wifiPassword, setWifiPassword] = useState("");
  const [isConnected, setIsConnected] = useState(false);

  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginError, setLoginError] = useState('');
  const [rfidTags, setRfidTags] = useState([]);
  const [selectedTagUid, setSelectedTagUid] = useState<string | null>(null);

  const isTagActive = (tag: any) => tag?.status === 'active' || tag?.status === true || tag?.status === 'Active';

  useEffect(() => {
    const unsubscribe = authService.onAuthStateChange((user) => {
      setUser(user);
      
      if (user) {
        // Check if user is admin and set state accordingly
        const isAdmin = authService.isAdmin(user);
        setIsAdminLoggedIn(isAdmin);
        if (isAdmin) {
          setCurrentPage("dashboard");
        }
      } else {
        setIsAdminLoggedIn(false);
      }
      
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // RFID tag subscription
  useEffect(() => {
    const handleTags = (tags) => setRfidTags(tags);
    rfidService.subscribeToRFIDTags(handleTags);
    return () => rfidService.unsubscribeFromRFIDTags(handleTags);
  }, []);

  // ESP32 WebSocket connection and message handling
  useEffect(() => {
    // Optionally, replace with your ESP IP/port
    // espWebSocket.connect('192.168.1.100', 81);
    const handler = (msg) => {
      // Handle messages as needed; already updates via Firebase when scan mode on
      // console.log('ESP message:', msg);
    };
    espWebSocket.addMessageHandler(handler);
    return () => {
      espWebSocket.removeMessageHandler(handler);
      // espWebSocket.disconnect(); // keep persistent connection if desired
    };
  }, []);

  // computed inside the component (so it re-evaluates after state changes)
  const availableProfessors = facultyMembers.filter((prof) => {
    // check whether any device (any facultyMembers item) currently has this professor assigned
    const isAssignedSomewhere = facultyMembers.some(
      (device) => device.assignedProfId === prof.id,
    );
    // available if not assigned anywhere OR if this professor is the one currently
    // assigned to the RFID we're editing (so they show up when re-opening)
    return (
      !isAssignedSomewhere ||
      prof.id === selectedFacultyForRfid?.assignedProfId
    );
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
    alert(
      `WiFi Config Saved!\nSSID: ${ssid}\nPassword: ${wifiPassword}`,
    );
    // Later: send this to your ESP32 via API
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
    setLoginError('');
    try {
      const result = await authService.loginWithMicrosoft();
      if (result.success) {
        setStudentLoginOpen(false);
        // Handle successful student login
        console.log('Student logged in:', result.user);
      } else {
        setLoginError(result.error);
      }
    } catch (error) {
      setLoginError('Failed to login with Microsoft');
    }
  const handleOffice365Login = async () => {
    setLoginError('');
    try {
      const result = await authService.loginWithMicrosoft();
      if (result.success) {
        setStudentLoginOpen(false);
        // Handle successful student login
        console.log('Student logged in:', result.user);
      } else {
        setLoginError(result.error);
      }
    } catch (error) {
      setLoginError('Failed to login with Microsoft');
    }
  };

  const handleMeetingRequest = (facultyName) => {
    setSelectedFaculty(facultyName);
    setMeetingRequestOpen(true);
  };

  const handleSubmitMeetingRequest = () => {
    if (studentNumber && studentNumber.length === 6) {
      alert(
        `Meeting request submitted for ${selectedFaculty}! Student Number: ${studentNumber}`,
      );
      setMeetingRequestOpen(false);
      setStudentNumber("");
      setSelectedFaculty("");
    }
  };

  const handleAdminLogin = async () => {
    if (!adminEmail || !adminPassword) return;
    
    setLoginError('');
    try {
      const result = await authService.loginAdmin(adminEmail, adminPassword);
      if (result.success) {
        setAdminLoginOpen(false);
        setAdminEmail("");
        setAdminPassword("");
       
        // isAdminLoggedIn will be set by the auth state observer
      } else {
        setLoginError(result.error);
      }
    } catch (error) {
      setLoginError('Login failed');
  const handleAdminLogin = async () => {
    if (!adminEmail || !adminPassword) return;
    
    setLoginError('');
    try {
      const result = await authService.loginAdmin(adminEmail, adminPassword);
      if (result.success) {
        setAdminLoginOpen(false);
        setAdminEmail("");
        setAdminPassword("");
       
        // isAdminLoggedIn will be set by the auth state observer
      } else {
        setLoginError(result.error);
      }
    } catch (error) {
      setLoginError('Login failed');
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

  const handleRemoveFaculty = (facultyId) => {
    setFacultyMembers((prev) =>
      prev.filter((faculty) => faculty.id !== facultyId),
    );
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

            {/* New Hardware Settings Button */}
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
          </div>
        </nav>
      </div>

      {/* Main Content */}
      <div className="ml-64">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900">
                {isAdminLoggedIn
                  ? "Admin Dashboard"
                  : "Faculty Dashboard"}
              </h2>
              <p className="text-gray-600 mt-1">
                {isAdminLoggedIn
                  ? "Manage faculty members and system settings"
                  : "Manage and connect with faculty members"}
              </p>
            </div>
            <div className="flex items-center gap-4">
              {isAdminLoggedIn && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLogout}
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
                    onOpenChange={setStudentLoginOpen}
                  >
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        Student Login
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                      <DialogHeader>
                        <DialogTitle>Log in</DialogTitle>
                      </DialogHeader>
                      <div className="grid gap-4 py-6">
                        <Button
                          onClick={handleOffice365Login}
                          variant="outline"
                          className="w-full flex items-center gap-3 h-12"
                        >
                          <div className="w-5 h-5 bg-blue-600 rounded flex items-center justify-center">
                            <span className="text-white text-xs font-bold">
                              M
                            </span>
                          </div>
                          Log in with Office 365
                        </Button>
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
                        <div className="grid gap-2">
                          <Label htmlFor="adminEmail">
                            Email
                          </Label>
                          <Input
                            id="adminEmail"
                            placeholder="Enter admin Email"
                            value={adminEmail}
                            onChange={(e) =>
                              setAdminEmail(e.target.value)
                            }
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
                            onChange={(e) =>
                              setAdminPassword(e.target.value)
                            }
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
                            !adminEmail || !adminPassword
                          }
                        >
                          Login
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </>
              )}
            </div>
          </div>
        </header>

        {/* All Dialogs */}
        {/* Meeting Request Dialog */}
        <Dialog
          open={meetingRequestOpen}
          onOpenChange={setMeetingRequestOpen}
        >
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Request Meeting</DialogTitle>
              <DialogDescription>
                Please enter your 6-digit student number to
                request a meeting with {selectedFaculty}.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="studentNumber">
                  Student Number
                </Label>
                <Input
                  id="studentNumber"
                  placeholder="Enter 6-digit student number"
                  value={studentNumber}
                  onChange={(e) => {
                    const value = e.target.value
                      .replace(/\D/g, "")
                      .slice(0, 6);
                    setStudentNumber(value);
                  }}
                  maxLength={6}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setMeetingRequestOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmitMeetingRequest}
                disabled={
                  !studentNumber || studentNumber.length !== 6
                }
              >
                Submit Request
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
                  onChange={(e) => setNewRfidId(e.target.value)}
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
            if (!open) {
              espWebSocket.setScanMode(false);
            }
          }}
        >
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader className="text-center">
              <DialogTitle>Add New RFID Tag</DialogTitle>
              <div className="text-center">
                <p className="text-lg font-medium text-black">
                  Scanner is in scan mode, tap the RFID to add the UID to database
                </p>
              </div>
            </DialogHeader>
            <div className="flex justify-center">
              <Button variant="outline" onClick={() => setIsAddRfidPopupOpen(false)}>Close</Button>
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

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-yellow-100 rounded-lg">
                        <Clock className="w-6 h-6 text-yellow-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">
                          In Office Hours
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
                        <Bell className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">
                          Total Inquiries
                        </p>
                        <p className="text-2xl font-semibold">
                          156
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
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <div className="flex items-center gap-2">
                                <div
                                  className={`w-2 h-2 rounded-full ${
                                    faculty.status === "Online"
                                      ? "bg-green-500"
                                      : faculty.status ===
                                          "Busy"
                                        ? "bg-yellow-500"
                                        : "bg-gray-400"
                                  }`}
                                ></div>
                                <span className="text-sm font-medium">
                                  {faculty.status}
                                </span>
                              </div>
                              <p className="text-xs text-gray-500">
                                {faculty.lastSeen}
                              </p>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                handleMeetingRequest(
                                  faculty.name,
                                )
                              }
                              disabled={!user}
                              className={!user ? "opacity-50 cursor-not-allowed" : ""}
                            >
                              Req. Meeting
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Appointment History */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <Calendar className="w-5 h-5 text-blue-600" />
                      <CardTitle>Appointment History</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {appointmentHistory.map((appointment) => (
                        <div
                          key={appointment.id}
                          className="flex flex-col gap-3 p-4 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 rounded-lg">
                              <Calendar className="w-4 h-4 text-blue-600" />
                            </div>
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900">
                                {appointment.studentName}
                              </h4>
                              <p className="text-sm text-gray-500">
                                ID: {appointment.studentId}
                              </p>
                            </div>
                            <Badge
                              variant="secondary"
                              className="bg-green-100 text-green-700"
                            >
                              {appointment.status}
                            </Badge>
                          </div>
                          <div className="flex justify-between text-sm">
                            <div>
                              <p className="font-medium text-gray-900">
                                {appointment.faculty}
                              </p>
                              <p className="text-gray-500">
                                Faculty
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium text-gray-900">
                                {appointment.date}
                              </p>
                              <p className="text-gray-500">
                                {appointment.time}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
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
                  <div className="space-y-4">
                    {facultyMembers.map((faculty) => (
                      <div
                        key={faculty.id}
                        className="flex items-center justify-between p-4 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <Avatar>
                            <AvatarFallback
                              className={`${faculty.color} text-white`}
                            >
                              {faculty.initials}
                            </AvatarFallback>
                          </Avatar>
                          <h4 className="font-medium text-gray-900">
                            {faculty.name}
                          </h4>
                        </div>
                        <div className="flex items-center gap-8">
                          <div className="text-center">
                            <p className="text-sm font-medium text-gray-900">
                              {" "}
                              First Time In
                            </p>
                            <p className="text-sm text-gray-500">
                              {faculty.timeIn}
                            </p>
                          </div>
                          <div className="text-center">
                            <p className="text-sm font-medium text-gray-900">
                              Last Time Out
                            </p>
                            <p className="text-sm text-gray-500">
                              {faculty.timeOut}
                            </p>
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
                                  Are you sure?
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently delete
                                  the account of{" "}
                                  <b>{faculty.name}</b>. You
                                  cannot undo this action.
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
                      espWebSocket.setScanMode(true);
                    }}
                  >
                    Add RFID
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Live tags from Firebase */}
                    
                    {rfidTags.map((tag) => (
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
                        <div className="flex items-center gap-4">
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
                                  className="text-orange-600 hover:text-orange-700 hover:bg-orange-50 border-orange-200"
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
                                  Choose a professor to assign to RFID <b>{selectedTagUid}</b>
                                </AlertDialogDescription>
                              </AlertDialogHeader>

                              <div className="space-y-2 max-h-60 overflow-y-auto">
                                {availableProfessors.map(
                                  (prof) => (
                                    <Button
                                      key={prof.id}
                                      variant="outline"
                                      className="w-full justify-start"
                                      onClick={() =>
                                        rfidService.assignRFIDToFaculty(selectedTagUid!, prof.id, prof.name).then(() => setIsAssignDialogOpen(false))
                                      }
                                    >
                                      {prof.name}
                                    </Button>
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
          {/* === Admin Hardware Settings (only for admin when currentPage === "hardware") === */}
          {isAdminLoggedIn && currentPage === "hardware" && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>ESP32 Hardware Settings</CardTitle>
                  <p className="text-sm text-gray-600">
                    Configure WiFi settings and check device
                    connection status.
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

                  {/* Connection Status */}
                  <div className="p-4 border rounded-lg flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">
                        Connection Status
                      </p>
                      <p className="text-sm text-gray-500">
                        {isConnected
                          ? "Internet is Available"
                          : "No Internet Connection"}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={handleCheckConnection}
                    >
                      Check Connection
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
    