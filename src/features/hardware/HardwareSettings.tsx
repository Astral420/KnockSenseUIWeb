import { ChangeEvent } from "react";
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

type HardwareSettingsProps = {
  isFailsafeMode: boolean;
  ssid: string;
  wifiPassword: string;
  canChangeWifiInformation: boolean;
  setSsid: (value: string) => void;
  setWifiPassword: (value: string) => void;
  handleSaveWifiConfig: () => void;
  handleCheckConnection: () => void;
  isConnected: boolean;
};

export function HardwareSettings({
  isFailsafeMode,
  ssid,
  wifiPassword,
  canChangeWifiInformation,
  setSsid,
  setWifiPassword,
  handleSaveWifiConfig,
  handleCheckConnection,
  isConnected,
}: HardwareSettingsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>ESP32 Hardware Settings</CardTitle>
        <p className="text-sm text-gray-600">
          {isFailsafeMode
            ? "Configure WiFi settings to restore ESP32 internet connectivity."
            : "Configure WiFi settings and check device connection status."}
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
              onChange={(e: ChangeEvent<HTMLInputElement>) => setSsid(e.target.value)}
              disabled={!canChangeWifiInformation}
            />
          </div>
          <div>
            <Label htmlFor="password">WiFi Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Enter WiFi Password"
              value={wifiPassword}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setWifiPassword(e.target.value)}
              disabled={!canChangeWifiInformation}
            />
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button disabled={!canChangeWifiInformation}>Save Configuration</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Save WiFi Configuration</AlertDialogTitle>
                <AlertDialogDescription>
                  {canChangeWifiInformation
                    ? "Are you sure you want to update the WiFi SSID and password? This will restart connectivity checks."
                    : "You do not have permission to change WiFi configuration. Contact a super admin for access."}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                {canChangeWifiInformation && (
                  <AlertDialogAction onClick={handleSaveWifiConfig}>
                    Confirm Save
                  </AlertDialogAction>
                )}
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        {/* Connection Status & Serial Monitor */}
        <div className="flex gap-4 w-full max-w-2xl">
          {/* Connection Status */}
          <div className="flex-1 p-4 border rounded-lg flex items-center justify-between">
            <div className="text-left">
              <p className="text-sm font-medium text-gray-900">Connection Status</p>
              <p className="text-xs text-gray-500">{isConnected ? "Connected" : "No Connection"}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCheckConnection}
              className="text-xs py-1 px-2"
            >
              Check Connection
            </Button>
          </div>

          {/* WebSerial Access */}
          <div className="flex-1 p-4 border rounded-lg flex flex-col gap-3">
            <div>
              <h3 className="text-sm font-semibold text-gray-800">WebSerial Monitor</h3>
              <p className="text-xs text-gray-500">Open the live device console in a new tab.</p>
            </div>
            <Button
              variant="secondary"
              onClick={() => {
                const url = `${window.location.protocol}//${window.location.host}/webserial`;
                window.open(url, "_blank");
              }}
            >
              Go to WebSerial Monitor
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default HardwareSettings;
