import {
  CreditCard,
  FileText,
  Home,
  Settings,
  Users,
} from "lucide-react";

import { AdminPermissionKey } from "@/features/admin/adminPermissions";

type SidebarProps = {
  currentPage: string;
  isAdminLoggedIn: boolean;
  isSuperAdmin: boolean;
  isFailsafeMode: boolean;
  can: (permission: AdminPermissionKey) => boolean;
  setCurrentPage: (page: string) => void;
};

export function Sidebar({
  currentPage,
  isAdminLoggedIn,
  isSuperAdmin,
  isFailsafeMode,
  can,
  setCurrentPage,
}: SidebarProps) {
  return (
    <>
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-900">KnockSense</h1>
        <p className="text-sm text-gray-500 mt-1">Faculty Management Portal</p>
      </div>

      <nav className="mt-8">
        <div className="px-6 space-y-2">
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
                  Acct. Management
                </button>
              )}

              {(isSuperAdmin || can("seeAccessLogs") || can("seeAttendanceLogs")) && (
                <button
                  onClick={() => setCurrentPage("logs")}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg ${
                    currentPage === "logs"
                      ? "bg-blue-50 text-blue-700"
                      : "hover:bg-gray-100 text-gray-700"
                  }`}
                >
                  <FileText className="w-5 h-5" />
                  Logs
                </button>
              )}
            </>
          )}
        </div>
      </nav>
    </>
  );
}

export default Sidebar;
