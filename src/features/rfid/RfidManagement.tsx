import { FacultyMember, RfidTag } from "@/features/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
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
import { CreditCard, Trash2, Users, Clock } from "lucide-react";

type AvailableProfessor = FacultyMember & {
  isAssignedToRfid: boolean;
  assignedRfidUid?: string | null;
};

type RfidManagementProps = {
  rfidTags: RfidTag[];
  rfidLoading: boolean;
  rfidError: string;
  availableProfessors: AvailableProfessor[];
  isTagActive: (tag: RfidTag) => boolean;
  onToggleTagStatus: (tag: RfidTag) => Promise<void>;
  onSelectTagForAssignment: (tagUid: string) => void;
  selectedTagUid: string | null;
  isAssignDialogOpen: boolean;
  onAssignDialogOpenChange: (open: boolean) => void;
  onAssignProfessor: (tagUid: string, facultyId: string, facultyName: string) => Promise<void>;
  onUnassignProfessor: (tagUid: string) => Promise<void>;
  onDeleteTag: (tagUid: string) => Promise<void>;
  onAddRfidClick: () => void;
};

export function RfidManagement({
  rfidTags,
  rfidLoading,
  rfidError,
  availableProfessors,
  isTagActive,
  onToggleTagStatus,
  onSelectTagForAssignment,
  selectedTagUid,
  isAssignDialogOpen,
  onAssignDialogOpenChange,
  onAssignProfessor,
  onUnassignProfessor,
  onDeleteTag,
  onAddRfidClick,
}: RfidManagementProps) {
  return (
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
                <p className="text-sm text-gray-600">Active RFID</p>
                <p className="text-2xl font-semibold">{rfidTags.filter((t) => isTagActive(t)).length}</p>
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
                <p className="text-sm text-gray-600">Inactive RFID</p>
                <p className="text-2xl font-semibold">{rfidTags.filter((t) => !isTagActive(t)).length}</p>
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
                <p className="text-sm text-gray-600">Total Faculty</p>
                <p className="text-2xl font-semibold">{availableProfessors.length}</p>
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
                <p className="text-sm text-gray-600">Access Today</p>
                <p className="text-2xl font-semibold">
                  {availableProfessors.filter((f) => f.timeIn && f.timeIn !== "--").length}
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
            <CardTitle>RFID Access Management</CardTitle>
            <p className="text-sm text-gray-600">
              Control RFID access permissions and manage assignments for faculty members
            </p>
          </div>
          {/* ✅ Add RFID Button */}
          <Button variant="default" size="sm" onClick={onAddRfidClick}>
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

            {!rfidLoading && !rfidError &&
              rfidTags.map((tag) => (
                <div
                  key={tag.uid}
                  className="flex items-center justify-between p-4 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-900">RFID: {tag.uid}</p>
                      {tag.assignedTo?.facultyName ? (
                        <p className="text-sm text-gray-500">
                          Assigned: {tag.assignedTo.facultyName}
                        </p>
                      ) : (
                        <p className="text-sm text-gray-400 italic">Not assigned</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-8">
                    {/* Toggle Switch */}
                    <div className="flex flex-col items-center gap-2">
                      <Switch
                        checked={isTagActive(tag)}
                        onCheckedChange={async () => {
                          await onToggleTagStatus(tag);
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
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to unassign <b>{tag.assignedTo.facultyName}</b> from RFID <b>{tag.uid}</b>?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={async () => {
                                await onUnassignProfessor(tag.uid);
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
                          onSelectTagForAssignment(tag.uid);
                          onAssignDialogOpenChange(true);
                        }}
                      >
                        <CreditCard className="w-4 h-4 mr-2" />
                        Assign Prof
                      </Button>
                    )}

                    <AlertDialog open={isAssignDialogOpen} onOpenChange={onAssignDialogOpenChange}>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Assign Professor</AlertDialogTitle>
                          <AlertDialogDescription>
                            <div className="space-y-2">
                              <p>
                                Choose a professor to assign to RFID <span className="font-mono font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded">{selectedTagUid}</span>
                              </p>
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
                          {availableProfessors.map((prof) => (
                            <div key={prof.id} className="relative">
                              {prof.isAssignedToRfid ? (
                                /* Disabled/Assigned Professor Card */
                                <div className="w-full p-4 border border-gray-200 rounded-lg bg-gradient-to-r from-gray-50 to-gray-100 cursor-not-allowed">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                                        <span className="text-xs font-medium text-gray-600">{prof.initials}</span>
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
                                /* Available Professor Button */
                                <Button
                                  variant="outline"
                                  className="w-full justify-start p-4 h-auto hover:bg-blue-50 hover:border-blue-200 transition-colors"
                                  onClick={async () => {
                                    if (!selectedTagUid) return;
                                    await onAssignProfessor(selectedTagUid, prof.id, prof.name);
                                  }}
                                >
                                  <div className="flex items-center gap-3 w-full">
                                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                      <span className="text-xs font-medium text-blue-600">{prof.initials}</span>
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
                          ))}
                        </div>

                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
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
                          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently remove RFID <b>{tag.uid}</b>. You cannot undo this action.
                          </AlertDialogDescription>
                        </AlertDialogHeader>

                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={async () => {
                              await onDeleteTag(tag.uid);
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
  );
}

export default RfidManagement;
