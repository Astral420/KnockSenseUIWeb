import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface StudentLoginDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isStudentLoginLoading: boolean;
  onLogin: () => void;
}

export function StudentLoginDialog({
  open,
  onOpenChange,
  isStudentLoginLoading,
  onLogin,
}: StudentLoginDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Student Login
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Student Login</DialogTitle>
          <DialogDescription>
            Sign in with your Office 365 account to access faculty services.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-6">
          <Button
            onClick={onLogin}
            variant="outline"
            className="w-full flex items-center gap-3 h-12"
            disabled={isStudentLoginLoading}
          >
            {isStudentLoginLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <span>Signing in...</span>
              </>
            ) : (
              <>
                <svg
                  className="w-5 h-5"
                  viewBox="0 0 21 21"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <rect x="1" y="1" width="9" height="9" fill="#f25022" />
                  <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
                  <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
                  <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
                </svg>
                Log in with Office 365
              </>
            )}
          </Button>

          <div className="text-center">
            <p className="text-xs text-gray-500">
              By signing in, you agree to our terms of service and privacy policy.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default StudentLoginDialog;
