export interface FacultyMember {
  id: string;
  name: string;
  initials: string;
  status: string;
  lastSeen?: string;
  color: string;
  teacherMsg?: string;
  photoUrl?: string;
  email?: string;
  teacherID?: string;
  rfid?: string;
  timeIn?: string;
  timeOut?: string;
  [key: string]: any;
}

export interface StudentAppointment {
  id: string;
  studentName?: string;
  teacherName: string;
  createdAt?: Date | string | number;
  status: string;
  studentNote?: string;
  teacherResponse?: string;
  teacherAction?: string;
  [key: string]: any;
}

export interface RfidTag {
  uid: string;
  status: string | boolean;
  assignedTo?: {
    facultyId?: string;
    facultyName?: string;
    teacherID?: string;
    [key: string]: any;
  } | null;
  createdAt?: number;
  [key: string]: any;
}

export interface AdminAccount {
  uid: string;
  email?: string;
  displayName?: string;
  role: string;
  permissions?: Record<string, boolean>;
  [key: string]: any;
}

export interface LogEntry {
  id: string;
  timestamp: number;
  [key: string]: any;
}
