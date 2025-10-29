import { Dispatch, SetStateAction } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogEntry } from "@/features/types";

type LogsPanelProps = {
  canSeeAccessLogs: boolean;
  canSeeAttendanceLogs: boolean;
  activeLogCategory: "access" | "attendance";
  setActiveLogCategory: Dispatch<SetStateAction<"access" | "attendance">>;
  logDateFilter: { startDate: string; endDate: string };
  setLogDateFilter: Dispatch<SetStateAction<{ startDate: string; endDate: string }>>;
  logsLoading: boolean;
  logsError: string;
  accessLogs: LogEntry[];
  attendanceLogs: LogEntry[];
  formatLogDate: (timestamp: number) => string;
  formatLogTime: (timestamp: number) => string;
};

export function LogsPanel({
  canSeeAccessLogs,
  canSeeAttendanceLogs,
  activeLogCategory,
  setActiveLogCategory,
  logDateFilter,
  setLogDateFilter,
  logsLoading,
  logsError,
  accessLogs,
  attendanceLogs,
  formatLogDate,
  formatLogTime,
}: LogsPanelProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>System Logs</CardTitle>
            <p className="text-sm text-gray-600 mt-1">
              View real-time access and attendance logs from the system
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Category Tabs */}
        <div className="flex gap-2 border-b">
          {canSeeAccessLogs && (
            <button
              onClick={() => setActiveLogCategory("access")}
              className={`px-4 py-2 font-medium transition-colors ${
                activeLogCategory === "access"
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Access Logs
            </button>
          )}
          {canSeeAttendanceLogs && (
            <button
              onClick={() => setActiveLogCategory("attendance")}
              className={`px-4 py-2 font-medium transition-colors ${
                activeLogCategory === "attendance"
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Attendance Logs
            </button>
          )}
        </div>

        {/* Date Range Filter */}
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <Label htmlFor="startDate">Start Date</Label>
            <Input
              id="startDate"
              type="date"
              value={logDateFilter.startDate}
              onChange={(e) => setLogDateFilter({ ...logDateFilter, startDate: e.target.value })}
            />
          </div>
          <div className="flex-1">
            <Label htmlFor="endDate">End Date</Label>
            <Input
              id="endDate"
              type="date"
              value={logDateFilter.endDate}
              onChange={(e) => setLogDateFilter({ ...logDateFilter, endDate: e.target.value })}
            />
          </div>
          <Button variant="outline" onClick={() => setLogDateFilter({ startDate: "", endDate: "" })}>
            Clear Filter
          </Button>
        </div>

        {/* Logs Display */}
        <div className="border rounded-lg">
          {logsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex items-center gap-2 text-gray-600">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-600"></div>
                <span>Loading logs...</span>
              </div>
            </div>
          ) : logsError ? (
            <div className="p-8 text-center">
              <p className="text-red-600">{logsError}</p>
            </div>
          ) : (
            <div className="overflow-auto max-h-[600px]">
              {canSeeAccessLogs && activeLogCategory === "access" && (
                <div>
                  {(() => {
                    const filteredLogs = accessLogs.filter((log) => {
                      if (!logDateFilter.startDate && !logDateFilter.endDate) return true;
                      const logDate = new Date(log.timestamp);
                      const start = logDateFilter.startDate ? new Date(logDateFilter.startDate) : null;
                      const end = logDateFilter.endDate
                        ? new Date(logDateFilter.endDate + "T23:59:59")
                        : null;
                      if (start && logDate < start) return false;
                      if (end && logDate > end) return false;
                      return true;
                    });

                    return filteredLogs.length === 0 ? (
                      <div className="p-8 text-center text-gray-500">
                        No access logs found for the selected date range
                      </div>
                    ) : (
                      <div className="divide-y">
                        {filteredLogs.map((log) => (
                          <div key={log.id} className="p-4 hover:bg-gray-50">
                            <div className="flex items-start justify-between">
                              <div className="space-y-1">
                                <div className="flex items-center gap-3">
                                  <Badge
                                    variant={
                                      log.result === "Granted"
                                        ? "default"
                                        : log.result === "Denied (inactive)"
                                        ? "destructive"
                                        : "secondary"
                                    }
                                  >
                                    {log.result}
                                  </Badge>
                                  <span className="font-medium text-gray-900">
                                    {log.readerRole === "Entry" ? "📥 Entry" : "📤 Exit"}
                                  </span>
                                </div>
                                <div className="text-sm text-gray-600 space-y-1">
                                  <p>
                                    <span className="font-medium">UID:</span> {log.uid}
                                  </p>
                                  <p>
                                    <span className="font-medium">Reader:</span> {log.reader !== null ? log.reader : "N/A"}
                                  </p>
                                  <p>
                                    <span className="font-medium">Device IP:</span> {log.deviceIP}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right text-sm text-gray-500">
                                <p>{formatLogDate(log.timestamp)}</p>
                                <p>{formatLogTime(log.timestamp)}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              )}

              {canSeeAttendanceLogs && activeLogCategory === "attendance" && (
                <div>
                  {(() => {
                    const filteredLogs = attendanceLogs.filter((log) => {
                      if (!logDateFilter.startDate && !logDateFilter.endDate) return true;
                      const logDate = new Date(log.timestamp);
                      const start = logDateFilter.startDate ? new Date(logDateFilter.startDate) : null;
                      const end = logDateFilter.endDate
                        ? new Date(logDateFilter.endDate + "T23:59:59")
                        : null;
                      if (start && logDate < start) return false;
                      if (end && logDate > end) return false;
                      return true;
                    });

                    return filteredLogs.length === 0 ? (
                      <div className="p-8 text-center text-gray-500">
                        No attendance logs found for the selected date range
                      </div>
                    ) : (
                      <div className="divide-y">
                        {filteredLogs.map((log) => (
                          <div key={log.id} className="p-4 hover:bg-gray-50">
                            <div className="flex items-start justify-between">
                              <div className="space-y-1">
                                <div className="flex items-center gap-3">
                                  <Badge variant={log.action === "entry" ? "default" : "secondary"}>
                                    {log.action === "entry" ? "📥 Entry" : "📤 Exit"}
                                  </Badge>
                                  <span className="font-medium text-gray-900">{log.teacherId}</span>
                                </div>
                                <div className="text-sm text-gray-600 space-y-1">
                                  <p>
                                    <span className="font-medium">Reader ID:</span> {log.readerId !== null ? log.readerId : "N/A"}
                                  </p>
                                  <p>
                                    <span className="font-medium">Device IP:</span> {log.deviceIP}
                                  </p>
                                  <p>
                                    <span className="font-medium">Status:</span> {log.currentStatus}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right text-sm text-gray-500">
                                <p>{formatLogDate(log.timestamp)}</p>
                                <p>{formatLogTime(log.timestamp)}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-3 gap-4">
          {canSeeAccessLogs && activeLogCategory === "access" && (
            <>
              <div className="p-4 border rounded-lg">
                <p className="text-sm text-gray-600">Total Access Logs</p>
                <p className="text-2xl font-semibold text-gray-900 mt-1">{accessLogs.length}</p>
              </div>
              <div className="p-4 border rounded-lg">
                <p className="text-sm text-gray-600">Granted</p>
                <p className="text-2xl font-semibold text-green-600 mt-1">
                  {accessLogs.filter((log) => log.result === "Granted").length}
                </p>
              </div>
              <div className="p-4 border rounded-lg">
                <p className="text-sm text-gray-600">Denied</p>
                <p className="text-2xl font-semibold text-red-600 mt-1">
                  {
                    accessLogs.filter(
                      (log) => log.result === "Denied" && log.uid !== "MANUAL_UNLOCK",
                    ).length
                  }
                </p>
              </div>
              <div className="p-4 border rounded-lg">
                <p className="text-sm text-gray-600">Manual Unlock</p>
                <p className="text-2xl font-semibold text-blue-600 mt-1">
                  {accessLogs.filter((log) => log.uid === "MANUAL_UNLOCK").length}
                </p>
              </div>
            </>
          )}
          {canSeeAttendanceLogs && activeLogCategory === "attendance" && (
            <>
              <div className="p-4 border rounded-lg">
                <p className="text-sm text-gray-600">Total Attendance Logs</p>
                <p className="text-2xl font-semibold text-gray-900 mt-1">{attendanceLogs.length}</p>
              </div>
              <div className="p-4 border rounded-lg">
                <p className="text-sm text-gray-600">Entries</p>
                <p className="text-2xl font-semibold text-blue-600 mt-1">
                  {attendanceLogs.filter((log) => log.action === "entry").length}
                </p>
              </div>
              <div className="p-4 border rounded-lg">
                <p className="text-sm text-gray-600">Exits</p>
                <p className="text-2xl font-semibold text-gray-600 mt-1">
                  {attendanceLogs.filter((log) => log.action === "exit").length}
                </p>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default LogsPanel;
