import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface AdminLoginDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  adminEmail: string;
  adminPassword: string;
  loginError: string;
  isLoginBlocked: boolean;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: () => void;
}

export function AdminLoginDialog({
  open,
  onOpenChange,
  adminEmail,
  adminPassword,
  loginError,
  isLoginBlocked,
  onEmailChange,
  onPasswordChange,
  onSubmit,
}: AdminLoginDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm">Admin Login</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Admin Login</DialogTitle>
          <DialogDescription>
            Please enter your admin credentials to access the management panel.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          <div className="grid gap-4 py-4">
            {loginError && (
              <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                {loginError}
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="adminEmail">Email</Label>
              <Input
                id="adminEmail"
                placeholder="Enter admin Email"
                value={adminEmail}
                onChange={(event) => onEmailChange(event.target.value)}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
                data-form-type="other"
                className={loginError ? "border-red-300 focus:border-red-500" : ""}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="adminPassword">Password</Label>
              <Input
                id="adminPassword"
                type="password"
                placeholder="Enter admin password"
                value={adminPassword}
                onChange={(event) => onPasswordChange(event.target.value)}
                className={loginError ? "border-red-300 focus:border-red-500" : ""}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!adminEmail || !adminPassword || isLoginBlocked}>
              {isLoginBlocked ? "Login Blocked" : "Login"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default AdminLoginDialog;
