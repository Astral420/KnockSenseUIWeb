import type { JSX } from "preact";
import { ChevronDown, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ADMIN_PERMISSION_OPTIONS, AdminPermissionKey } from "@/features/admin/adminPermissions";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";

interface AdminAccount {
  uid: string;
  displayName?: string;
  email?: string;
  role: string;
  permissions?: Record<string, boolean>;
}

interface ArchivedTeacher {
  uid: string;
  displayName?: string;
  email?: string;
  teacherID?: string;
  archivedPath?: string;
  deletedAt?: string;
  teacherData?: unknown;
  userData?: unknown;
  [key: string]: unknown;
}

export interface BannedTeacher {
  emailKey?: string;
  email?: string;
  normalizedEmail?: string;
  teacherUid?: string;
  deletedBy?: string;
  bannedAt?: string;
  reason?: string;
  [key: string]: unknown;
}

type AdminManagementPanelProps = {
  adminLoading: boolean;
  adminAccounts: AdminAccount[];
  newAdminName: string;
  newAdminEmail: string;
  newAdminPassword: string;
  onNewAdminNameChange: (value: string) => void;
  onNewAdminEmailChange: (value: string) => void;
  onNewAdminPasswordChange: (value: string) => void;
  handleCreateAdmin: () => void;
  handleDeleteAdmin: (adminUid: string) => void;
  handleToggleAdminPermission: (adminUid: string, permissionKey: AdminPermissionKey, value: boolean) => void;
  updatingPermissionKey: string | null;
  adminManagementOpen: boolean;
  setAdminManagementOpen: (open: boolean) => void;
  archivedTeachers: ArchivedTeacher[];
  archivedLoading: boolean;
  archivedError: string;
  loadArchivedTeachers: () => void;
  handleRestoreArchivedTeacher: (teacherUid: string) => void;
  handleHardDeleteTeacher: (teacherUid: string) => void;

  bannedTeachers: BannedTeacher[];
  bannedLoading: boolean;
  bannedError: string;
  loadBannedTeachers: () => void;
  handleUnbanTeacherEmail: (email: string) => Promise<void> | void;

};

export function AdminManagementPanel({
  adminLoading,
  adminAccounts,
  newAdminName,
  newAdminEmail,
  newAdminPassword,
  onNewAdminNameChange,
  onNewAdminEmailChange,
  onNewAdminPasswordChange,
  handleCreateAdmin,
  handleDeleteAdmin,
  handleToggleAdminPermission,
  updatingPermissionKey,
  adminManagementOpen,
  setAdminManagementOpen,
  archivedTeachers,
  archivedLoading,
  archivedError,
  loadArchivedTeachers,
  handleRestoreArchivedTeacher,
  handleHardDeleteTeacher,

  bannedTeachers,
  bannedLoading,
  bannedError,
  loadBannedTeachers,
  handleUnbanTeacherEmail,

}: AdminManagementPanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Account Management</CardTitle>
        <p className="text-sm text-gray-600">
          Create and manage accounts. Only super admins can access this section.
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
                onChange={(e: JSX.TargetedEvent<HTMLInputElement, Event>) =>
                  onNewAdminNameChange(e.currentTarget.value)
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newAdminEmail">Email</Label>
              <Input
                id="newAdminEmail"
                type="email"
                placeholder="Enter admin's email"
                value={newAdminEmail}
                onChange={(e: JSX.TargetedEvent<HTMLInputElement, Event>) =>
                  onNewAdminEmailChange(e.currentTarget.value)
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newAdminPassword">Password</Label>
              <Input
                id="newAdminPassword"
                type="password"
                placeholder="Enter temporary password"
                value={newAdminPassword}
                onChange={(e: JSX.TargetedEvent<HTMLInputElement, Event>) =>
                  onNewAdminPasswordChange(e.currentTarget.value)
                }
              />
            </div>
          </div>
          <Button
            onClick={handleCreateAdmin}
            disabled={
              adminLoading || !newAdminName || !newAdminEmail || !newAdminPassword
            }
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
            <div className="space-y-6">
              {adminAccounts.map((admin) => (
                <div
                  key={admin.uid}
                  className="rounded-lg border border-gray-200 bg-white p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 space-y-1.5">
                      <p className="text-lg font-semibold text-gray-900">{admin.displayName}</p>
                      <p className="text-sm text-gray-600">{admin.email}</p>
                      <p className="text-xs text-gray-500">
                        Role: {admin.role === "super_admin" ? "Super Admin" : "Admin"}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 ml-4">
                      {admin.role !== "super_admin" ? (
                        <DropdownMenu modal={false}>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex items-center gap-2 min-w-[130px]"
                            >
                              Permissions
                              <ChevronDown className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-64" sideOffset={5}>
                            <DropdownMenuLabel>Permissions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {ADMIN_PERMISSION_OPTIONS.map((permission) => {
                              const checkboxKey = `${admin.uid}:${permission.key}`;
                              return (
                                <DropdownMenuCheckboxItem
                                  key={permission.key}
                                  checked={!!admin.permissions?.[permission.key]}
                                  onCheckedChange={(checked) => {
                                    handleToggleAdminPermission(
                                      admin.uid,
                                      permission.key,
                                      checked === true,
                                    );
                                  }}
                                  disabled={updatingPermissionKey === checkboxKey}
                                >
                                  {permission.label}
                                </DropdownMenuCheckboxItem>
                              );
                            })}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled
                          className="flex items-center gap-2 min-w-[130px] opacity-50 cursor-not-allowed"
                        >
                          All Permissions
                        </Button>
                      )}
                      {admin.role !== "super_admin" && (
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
                                Are you sure you want to delete the admin account for <b>{admin.displayName}</b>? This action cannot be undone.
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
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Archived Teacher Accounts */}
        <div className="border rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold">Archived Teacher Accounts</h3>
              <p className="text-sm text-gray-500 mt-2">History of deleted teachers retained for audit.</p>
            </div>
          </div>

          {archivedLoading ? (
            <div className="flex items-center justify-center py-6 text-gray-600">
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                <span>Loading archived teachers...</span>
              </div>
            </div>
          ) : archivedError ? (
            <div className="p-4 bg-red-50 text-red-600 rounded-md text-sm">{archivedError}</div>
          ) : archivedTeachers.length === 0 ? (
            <div className="py-6 px-4 text-sm text-gray-500 border border-dashed rounded-md text-center">
              No archived teachers found.
            </div>
          ) : (
            <div className="space-y-3 mt-4">
              {archivedTeachers.map((teacher) => (
                <div
                  key={teacher.uid}
                  className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex-1">
                      <h4 className="text-base font-semibold text-gray-900">
                        {teacher.displayName || "Unknown Teacher"}
                      </h4>
                      {teacher.email && (
                        <p className="text-sm text-gray-500 mt-0.5">{teacher.email}</p>
                      )}
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(event) => event.stopPropagation()}
                          disabled={archivedLoading}
                          className="text-blue-600 border-blue-200 hover:bg-blue-50"
                        >
                          Restore
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Restore Teacher Account</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will move <b>{teacher.displayName || "this teacher"}</b> back to the active faculty list. Their previous profile and RFID assignments will be reinstated.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleRestoreArchivedTeacher(teacher.uid)}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            Confirm Restore
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={(event) => event.stopPropagation()}
                          disabled={archivedLoading}
                          className="ml-1"
                        >
                          Hard Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Permanently Delete Teacher</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently remove <b>{teacher.displayName || "this teacher"}</b> from Firebase Authentication, archive records, and all associated data. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-red-600 hover:bg-red-700"
                            onClick={() => handleHardDeleteTeacher(teacher.uid)}
                          >
                            Confirm Hard Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                  <details className="text-sm text-gray-600">
                    <summary className="cursor-pointer select-none text-gray-700 font-medium">
                      View raw snapshot
                    </summary>
                    <div className="mt-3 grid gap-2 md:grid-cols-2">
                      <div className="bg-gray-50 rounded-md p-3">
                        <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                          Teacher Data
                        </h5>
                        <pre className="text-xs text-gray-700 whitespace-pre-wrap">
{JSON.stringify(teacher.teacherData || {}, null, 2)}
                        </pre>
                      </div>
                      <div className="bg-gray-50 rounded-md p-3">
                        <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                          User Data
                        </h5>
                        <pre className="text-xs text-gray-700 whitespace-pre-wrap">
{JSON.stringify(teacher.userData || {}, null, 2)}
                        </pre>
                      </div>
                    </div>
                  </details>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold">Banned Teacher Emails</h3>
              <p className="text-sm text-gray-500 mt-2">
                Hard-deleted teacher accounts are banned here. Remove a ban to allow re-employment logins.
              </p>
            </div>
          </div>

          {bannedLoading ? (
            <div className="flex items-center justify-center py-6 text-gray-600">
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                <span>Loading banned teachers...</span>
              </div>
            </div>
          ) : bannedError ? (
            <Alert variant="destructive">
              <AlertTitle>Failed to load banned teachers</AlertTitle>
              <AlertDescription>{bannedError}</AlertDescription>
            </Alert>
          ) : bannedTeachers.length === 0 ? (
            <div className="py-6 px-4 text-sm text-gray-500 border border-dashed rounded-md text-center">
              No banned teachers recorded.
            </div>
          ) : (
            <div className="space-y-3 mt-4">
              {bannedTeachers.map((teacher) => (
                <div key={teacher.emailKey || teacher.email} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h4 className="text-base font-semibold text-gray-900">{teacher.email || teacher.normalizedEmail}</h4>
                      <p className="text-sm text-gray-500">
                        {teacher.bannedAt ? `Banned at: ${new Date(teacher.bannedAt).toLocaleString()}` : 'Ban timestamp unavailable'}
                      </p>
                      {teacher.teacherUid && (
                        <p className="text-xs text-gray-400">Original UID: {teacher.teacherUid}</p>
                      )}
                      {teacher.reason && (
                        <p className="text-xs text-gray-500 mt-1">Reason: {teacher.reason}</p>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-green-600 border-green-200 hover:bg-green-50"
                      onClick={() => handleUnbanTeacherEmail(teacher.email ?? teacher.normalizedEmail ?? "")}
                    >
                      Unban
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default AdminManagementPanel;
