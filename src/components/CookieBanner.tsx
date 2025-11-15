import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { X } from "lucide-react";
import { Link } from "react-router-dom";

const CookieBanner = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if user has already accepted/rejected cookies
    const cookieConsent = localStorage.getItem("cookieConsent");
    if (!cookieConsent) {
      setIsVisible(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem("cookieConsent", "accepted");
    setIsVisible(false);
  };

  const handleReject = () => {
    localStorage.setItem("cookieConsent", "rejected");
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 animate-in slide-in-from-bottom">
      <Card className="max-w-4xl mx-auto p-6 shadow-lg border-2">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold mb-2">Cookie Notice</h3>
            <p className="text-sm text-muted-foreground mb-4">
              We use cookies and similar technologies to enhance your experience on our platform. 
              These help us provide essential functionality, analyze platform usage, and improve our services. 
              By clicking "Accept All", you consent to the use of all cookies. 
              You can manage your preferences or learn more in our{" "}
              <Link to="/legal/privacy" className="text-primary hover:underline">
                Privacy Policy
              </Link>.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button onClick={handleAccept} size="sm">
                Accept All
              </Button>
              <Button onClick={handleReject} variant="outline" size="sm">
                Reject Non-Essential
              </Button>
              <Link to="/legal/privacy">
                <Button variant="ghost" size="sm">
                  Learn More
                </Button>
              </Link>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleReject}
            className="shrink-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default CookieBanner;
