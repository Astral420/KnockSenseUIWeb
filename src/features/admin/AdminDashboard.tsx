import { FacultyMember } from "@/features/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Trash2, Users, CreditCard, Clock } from "lucide-react";

interface AdminDashboardProps {
  facultyMembers: FacultyMember[];
  filteredFaculty: FacultyMember[];
  facultyLoading: boolean;
  facultyError: string;
  handleRemoveFaculty: (facultyId: string) => void;
  isSuperAdmin: boolean;
}

export function AdminDashboard({
  facultyMembers,
  filteredFaculty,
  facultyLoading,
  facultyError,
  handleRemoveFaculty,
  isSuperAdmin,
}: AdminDashboardProps) {
  return (
    <>
      {/* === Admin Dashboard (admin on "dashboard") === */}
      {/* Admin Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <Users className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Active faculty</p>
                <p className="text-2xl font-semibold">
                  {facultyMembers.filter((f) => f.isActive).length}
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
                <p className="text-sm text-gray-600">Total faculty</p>
                <p className="text-2xl font-semibold">{facultyMembers.length}</p>
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
                <p className="text-sm text-gray-600">RFID Assigned</p>
                <p className="text-2xl font-semibold">
                  {facultyMembers.filter((f) => f.rfid && f.rfid !== "--").length}
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
                <p className="text-sm text-gray-600">Online Now</p>
                <p className="text-2xl font-semibold">
                  {facultyMembers.filter((f) => f.status === "Online").length}
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
            <div className="flex items-center justify-center py-8 text-gray-600">
              Loading faculty...
            </div>
          )}
          {facultyError && (
            <div className="flex items-center justify-center py-8 text-red-600">
              {facultyError}
            </div>
          )}
          {!facultyLoading && !facultyError && (
            <div className="space-y-4">
              {filteredFaculty.map((faculty) => (
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
                      <h4 className="font-medium text-gray-900">{faculty.name}</h4>
                      {faculty.teacherMsg && (
                        <p className="text-sm text-gray-500 italic mt-1">"{faculty.teacherMsg}"</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-8">
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-900">First Time In Today</p>
                      <p className="text-sm text-gray-500">{faculty.timeIn}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-900">Last Time Out Today</p>
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
                                This will permanently delete the teacher account of <b>{faculty.name}</b> from
                                Firebase. This action cannot be undone.
                                <br />
                                <br />
                                <strong>Note:</strong> Complete deletion from Firebase may take up to 30 days.
                              </>
                            ) : (
                              <>
                                This will remove <b>{faculty.name}</b> from the local faculty list.
                                <br />
                                <br />
                                <strong>Note:</strong> Only super admins can permanently delete teacher accounts,
                                unless given permission.
                              </>
                            )}
                          </AlertDialogDescription>
                        </AlertDialogHeader>

                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleRemoveFaculty(faculty.id)}
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
  );
}

export default AdminDashboard;
