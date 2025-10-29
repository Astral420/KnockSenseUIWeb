import { ReactNode } from "react";

type AppShellProps = {
  sidebar: ReactNode;
  header: ReactNode;
  children: ReactNode;
};

export function AppShell({ sidebar, header, children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200 shadow-sm">
        {sidebar}
      </div>

      {/* Main Content */}
      <div className="ml-64">
        {header}
        <main className="p-8 space-y-8">{children}</main>
      </div>
    </div>
  );
}

export default AppShell;
