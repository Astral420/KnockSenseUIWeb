export type AdminPermissionKey =
  | "removeTeacherAccounts"
  | "seeAccessLogs"
  | "seeAttendanceLogs"
  | "changeWifiInformation";

export const ADMIN_PERMISSION_OPTIONS: { key: AdminPermissionKey; label: string }[] = [
  { key: "removeTeacherAccounts", label: "Remove Teacher Accounts" },
  { key: "seeAccessLogs", label: "See Access Logs" },
  { key: "seeAttendanceLogs", label: "See Attendance Logs" },
  { key: "changeWifiInformation", label: "Change WiFi Information" },
];

export const ADMIN_PERMISSION_DEFAULTS: Record<AdminPermissionKey, boolean> = {
  removeTeacherAccounts: false,
  seeAccessLogs: false,
  seeAttendanceLogs: false,
  changeWifiInformation: false,
};

export const SUPER_ADMIN_PERMISSIONS: Record<AdminPermissionKey, boolean> = {
  removeTeacherAccounts: true,
  seeAccessLogs: true,
  seeAttendanceLogs: true,
  changeWifiInformation: true,
};
