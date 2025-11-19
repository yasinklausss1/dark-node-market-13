import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

const AgeVerificationModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    // Only show for non-logged-in users
    if (user) {
      setIsOpen(false);
      return;
    }

    // Check if user has already verified their age
    const ageVerified = localStorage.getItem("ageVerified");
    if (!ageVerified) {
      setIsOpen(true);
    }
  }, [user]);

  const handleEnter = () => {
    localStorage.setItem("ageVerified", "true");
    setIsOpen(false);
  };

  const handleLeave = () => {
    window.close();
    // Fallback if window.close() doesn't work (requires window to be opened by script)
    window.location.href = "about:blank";
  };

  return (
    <AlertDialog open={isOpen}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-destructive/10 p-3">
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
          </div>
          <AlertDialogTitle className="text-center text-2xl">
            Age Verification Required
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center space-y-4 pt-4">
            <p className="text-base font-medium text-foreground">
              This website contains content intended for adults only.
            </p>
            <p className="text-sm">
              By entering this site, you confirm that you are at least 18 years of age 
              and agree to our terms of service.
            </p>
            <p className="text-sm text-muted-foreground">
              If you are under 18 years of age, please leave this site immediately.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={handleLeave}
            className="w-full sm:w-auto"
          >
            Leave
          </Button>
          <Button
            onClick={handleEnter}
            className="w-full sm:w-auto"
          >
            I am 18 or older - Enter
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default AgeVerificationModal;
