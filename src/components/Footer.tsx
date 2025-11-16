import { Link } from "react-router-dom";
import { Separator } from "@/components/ui/separator";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t bg-background mt-auto">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-6">
          {/* About Section */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">About</h3>
            <p className="text-sm text-muted-foreground">
              A secure marketplace for digital content creators and buyers.
            </p>
          </div>

          {/* Legal Links */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">Legal</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/legal/imprint" className="text-muted-foreground hover:text-primary transition-colors">
                  Imprint
                </Link>
              </li>
              <li>
                <Link to="/legal/privacy" className="text-muted-foreground hover:text-primary transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/legal/terms" className="text-muted-foreground hover:text-primary transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link to="/legal/disclaimer" className="text-muted-foreground hover:text-primary transition-colors">
                  Disclaimer
                </Link>
              </li>
            </ul>
          </div>

          {/* Policies */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">Policies</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/legal/buyer-seller-terms" className="text-muted-foreground hover:text-primary transition-colors">
                  Buyer & Seller Terms
                </Link>
              </li>
              <li>
                <Link to="/legal/withdrawal" className="text-muted-foreground hover:text-primary transition-colors">
                  Right of Withdrawal
                </Link>
              </li>
              <li>
                <Link to="/legal/age-verification" className="text-muted-foreground hover:text-primary transition-colors">
                  Age Verification
                </Link>
              </li>
            </ul>
          </div>

          {/* Platform Links */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">Platform</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/marketplace" className="text-muted-foreground hover:text-primary transition-colors">
                  Marketplace
                </Link>
              </li>
              <li>
                <Link to="/seller" className="text-muted-foreground hover:text-primary transition-colors">
                  Become a Seller
                </Link>
              </li>
              <li>
                <Link to="/wallet" className="text-muted-foreground hover:text-primary transition-colors">
                  Wallet
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <Separator className="my-6" />

        <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
          <p>© {currentYear} Digital Marketplace. All rights reserved.</p>
          <p className="text-xs">
            This platform is a marketplace. Sellers are responsible for their content.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
