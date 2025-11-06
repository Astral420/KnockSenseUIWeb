import { Dispatch, SetStateAction } from "react";
import {
  Calendar,
  Clock,
  Search,
  Smartphone,
  UserX,
  Users,
} from "lucide-react";

import qrImg from "@/assets/qr_img.png";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FacultyMember, StudentAppointment } from "@/features/types";

type StudentDashboardProps = {
  searchQuery: string;
  setSearchQuery: Dispatch<SetStateAction<string>>;
  facultyMembers: FacultyMember[];
  filteredFaculty: FacultyMember[];
  user: any;
  handleMeetingRequest: (faculty: FacultyMember) => void;
  studentAppointments: StudentAppointment[];
  appointmentLoading: boolean;
  getAppointmentStatusColor: (status: string) => string;
  formatAppointmentDate: (date: Date | string | number | null | undefined) => string;
  formatAppointmentStatus: (appointment: StudentAppointment) => string;
  setInstallInstructionsOpen: Dispatch<SetStateAction<boolean>>;
};

export function StudentDashboard({
  searchQuery,
  setSearchQuery,
  facultyMembers,
  filteredFaculty,
  user,
  handleMeetingRequest,
  studentAppointments,
  appointmentLoading,
  getAppointmentStatusColor,
  formatAppointmentDate,
  formatAppointmentStatus,
  setInstallInstructionsOpen,
}: StudentDashboardProps) {
  return (
    <>
      {/* === Student Dashboard (only for non-admin on "dashboard") === */}
      {/* Search Bar */}
      <Card>
        <CardContent className="p-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              placeholder="Search faculty members..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
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
                <p className="text-sm text-gray-600">Online Faculty</p>
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
                <p className="text-sm text-gray-600">Busy Faculty</p>
                <p className="text-2xl font-semibold">
                  {facultyMembers.filter((f) => f.status === "Busy").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gray-100 rounded-lg">
                <UserX className="w-6 h-6 text-gray-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Offline Faculty</p>
                <p className="text-2xl font-semibold">
                  {facultyMembers.filter((f) => f.status === "Offline").length}
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
                <p className="text-sm text-gray-600">Total Faculty</p>
                <p className="text-2xl font-semibold">{facultyMembers.length}</p>
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
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col items-end">
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
                      {faculty.status !== "Online" && faculty.lastSeen && (
                        <p className="text-xs text-gray-500">{faculty.lastSeen}</p>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!user || faculty.status !== "Online"}
                      onClick={() => handleMeetingRequest(faculty)}
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
                <h4 className="text-lg font-medium text-gray-900 mb-4">
                  Download the KnockSense App
                </h4>

                <div className="w-20 h-20 bg-white border-2 border-gray-300 rounded-lg flex items-center justify-center shadow-sm mb-8">
                  <img
                    src={qrImg}
                    alt="QR Code for KnockSense Mobile App"
                    className="w-16 h-16 object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                      const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                      if (fallback) {
                        fallback.style.display = "flex";
                      }
                    }}
                  />
                  {/* Fallback pattern if image doesn't exist */}
                  <div
                    className="w-16 h-16 bg-gray-100 border border-gray-200 rounded flex items-center justify-center"
                    style={{ display: "none" }}
                  >
                    <div className="text-xs text-gray-500 text-center">
                      QR Code
                      <br />
                      520x520
                      <br />
                      PNG
                    </div>
                  </div>
                </div>

                <p className="mt-4 text-sm text-gray-600 max-w-sm mb-10">
                  Scan the QR code with your Android device to download our mobile app to be able to schedule
                  appointments with offline/busy professors.
                </p>

                <div className="mt-12">
                  <Button size="sm" onClick={() => setInstallInstructionsOpen(true)}>
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
                            <span className="font-bold">{appointment.studentName || "Unknown Student"}</span>
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
  );
}

export default StudentDashboard;
