import { ReactNode } from "react";

interface HeaderBarProps {
  title: string;
  subtitle: string;
  isFailsafeMode: boolean;
  wifiConnected: boolean;
  actionButtons: ReactNode;
  offlineIndicator?: ReactNode;
}

export function HeaderBar({
  title,
  subtitle,
  isFailsafeMode,
  wifiConnected,
  actionButtons,
  offlineIndicator,
}: HeaderBarProps) {
  return (
    <header className="bg-white border-b border-gray-200 px-8 py-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-semibold text-gray-900">{title}</h2>
            {/* WiFi Status Indicator */}
            {!isFailsafeMode && (
              <div className="flex items-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full ${wifiConnected ? "bg-green-500" : "bg-red-500"}`}
                ></div>
                <span
                  className={`text-xs font-medium ${wifiConnected ? "text-green-600" : "text-red-600"}`}
                >
                  {wifiConnected ? "Online" : "Offline"}
                </span>
              </div>
            )}
          </div>
          <p className="text-gray-600 mt-1">{subtitle}</p>
        </div>
        <div className="flex items-center gap-4">
          {actionButtons}
          {offlineIndicator}
        </div>
      </div>
    </header>
  );
}

export default HeaderBar;
