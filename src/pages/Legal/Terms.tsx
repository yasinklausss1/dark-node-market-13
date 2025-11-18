import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
const Terms = () => {
  return <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Link to="/">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
        </Link>

        <Card className="p-8">
          <h1 className="text-4xl font-bold mb-8 text-foreground">Terms of Use & Platform Rules</h1>
          
          <div className="space-y-6 text-foreground">
            <section>
              <h2 className="text-2xl font-semibold mb-4">1. Scope and Acceptance</h2>
              <p className="mb-4">
                These Terms of Use govern your access to and use of our digital marketplace platform. By accessing or using our platform, you agree to be bound by these Terms. 
                If you do not agree to these Terms, you may not use our platform.
              </p>
              <p className="mb-4">
                We reserve the right to modify these Terms at any time. We will notify users of material changes via email or platform notification. 
                Your continued use of the platform after such modifications constitutes acceptance of the updated Terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">2. Platform Description</h2>
              <p className="mb-4">
                Our platform operates as a digital marketplace connecting sellers and buyers of digital images. We provide:
              </p>
              <ul className="list-disc list-inside mb-4 space-y-2">
                <li>A platform for sellers to upload, list, and sell digital images</li>
                <li>A marketplace for buyers to browse, purchase, and download digital images</li>
                <li>Payment processing via cryptocurrency (Bitcoin, Litecoin, Ethereum)</li>
                <li>User account management and transaction history</li>
                <li>Communication tools between buyers and sellers</li>
              </ul>
              <p className="mb-4">
                <strong>Important:</strong> We act solely as an intermediary platform. We do not create, own, or control the digital content listed by sellers. 
                All content is created and uploaded by independent sellers who retain full responsibility for their listings.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">3. User Accounts and Registration</h2>
              
              <h3 className="text-xl font-semibold mb-3">Account Creation</h3>
              <p className="mb-4">
                To use our platform, you must create an account and provide accurate, complete information. You are responsible for:
              </p>
              <ul className="list-disc list-inside mb-4 space-y-2">
                <li>Maintaining the confidentiality of your account credentials</li>
                <li>All activities that occur under your account</li>
                <li>Notifying us immediately of any unauthorized use of your account</li>
                <li>Ensuring your account information remains accurate and up-to-date</li>
              </ul>

              <h3 className="text-xl font-semibold mb-3">Age Requirement</h3>
              <p className="mb-4">
                You must be at least 18 years old to use our platform. By creating an account, you represent and warrant that you meet this age requirement.
              </p>

              <h3 className="text-xl font-semibold mb-3">Account Suspension and Termination</h3>
              <p className="mb-4">
                We reserve the right to suspend or terminate your account at any time if you violate these Terms or engage in fraudulent, illegal, or harmful activities.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">4. Prohibited Content and Activities</h2>
              
              <p className="mb-4">Users are strictly prohibited from uploading, posting, or engaging with content that:</p>
              <ul className="list-disc list-inside mb-4 space-y-2">
                <li>Contains pornographic, obscene, or sexually explicit material</li>
                <li>Depicts minors in any suggestive, inappropriate, or exploitative manner</li>
                <li>Violates intellectual property rights, including copyrights and trademarks</li>
                <li>Contains images of individuals without their consent (violation of personality rights)</li>
                <li>Promotes illegal activities, violence, hate speech, or discrimination</li>
                <li>Contains malware, viruses, or other harmful code</li>
                <li>Infringes on privacy rights or involves unauthorized surveillance</li>
                <li>Violates any applicable local, national, or international laws</li>
              </ul>

              <p className="mb-4">Additionally, users may not:</p>
              <ul className="list-disc list-inside mb-4 space-y-2">
                <li>Attempt to circumvent platform security measures or access controls</li>
                <li>Engage in fraudulent transactions or money laundering</li>
                <li>Use automated tools (bots, scrapers) without explicit permission</li>
                <li>Manipulate ratings, reviews, or platform metrics</li>
                <li>Harass, threaten, or abuse other users</li>
                <li>Resell or redistribute purchased content in violation of license terms</li>
              </ul>

              <p className="mb-4">
                <strong>Enforcement:</strong> Violation of these rules may result in immediate content removal, account suspension, or permanent ban. 
                We reserve the right to report illegal activities to appropriate law enforcement authorities.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">5. Content Moderation and Reporting</h2>
              
              <h3 className="text-xl font-semibold mb-3">Moderation</h3>
              <p className="mb-4">
                While we implement automated and manual moderation processes, we cannot guarantee that all prohibited content will be identified and removed immediately. 
                Users play a crucial role in maintaining platform integrity.
              </p>

              <h3 className="text-xl font-semibold mb-3">Reporting Violations</h3>
              <p className="mb-4">
                If you encounter content that violates these Terms, please report it immediately using our reporting system or by contacting [report@example.com]. 
                We will review all reports promptly and take appropriate action.
              </p>

              <h3 className="text-xl font-semibold mb-3">Copyright Claims</h3>
              <p className="mb-4">
                If you believe your copyrighted work has been infringed, please submit a DMCA takedown notice to [dmca@example.com] including:
              </p>
              <ul className="list-disc list-inside mb-4 space-y-2">
                <li>Identification of the copyrighted work</li>
                <li>Identification of the infringing material and its location on our platform</li>
                <li>Your contact information</li>
                <li>A statement of good faith belief that the use is not authorized</li>
                <li>A statement under penalty of perjury that the information is accurate</li>
                <li>Your physical or electronic signature</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">6. Intellectual Property</h2>
              
              <h3 className="text-xl font-semibold mb-3">Platform IP</h3>
              <p className="mb-4">
                All platform design, software, logos, trademarks, and other intellectual property are owned by us or our licensors. 
                You may not use, copy, or distribute any platform IP without explicit written permission.
              </p>

              <h3 className="text-xl font-semibold mb-3">User Content</h3>
              <p className="mb-4">
                Sellers retain all intellectual property rights to content they upload. By uploading content, sellers grant us a limited, worldwide, royalty-free license to:
              </p>
              <ul className="list-disc list-inside mb-4 space-y-2">
                <li>Display, store, and distribute the content on our platform</li>
                <li>Create thumbnails and previews for listing purposes</li>
                <li>Use content for platform promotion and marketing (with seller consent)</li>
              </ul>
              <p className="mb-4">
                This license terminates when sellers remove content from the platform, except for content that has been purchased and downloaded by buyers.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">7. Privacy and Data Protection</h2>
              <p className="mb-4">
                Your use of the platform is subject to our Privacy Policy, which explains how we collect, use, and protect your personal data in compliance with GDPR and applicable data protection laws. 
                Please review our Privacy Policy for detailed information.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">8. Liability and Disclaimers</h2>
              
              <h3 className="text-xl font-semibold mb-3">Platform Availability</h3>
              <p className="mb-4">
                We strive to maintain platform availability but do not guarantee uninterrupted or error-free service. 
                We reserve the right to modify, suspend, or discontinue any aspect of the platform at any time.
              </p>

              <h3 className="text-xl font-semibold mb-3">Third-Party Content</h3>
              <p className="mb-4">
                We are not responsible for content uploaded by sellers. Sellers are solely responsible for ensuring their content complies with all applicable laws, 
                including copyright, trademark, and personality rights laws.
              </p>

              <h3 className="text-xl font-semibold mb-3">Limitation of Liability</h3>
              <p className="mb-4">
                To the maximum extent permitted by law, we are not liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the platform. 
                Our total liability shall not exceed the fees paid by you in the 12 months preceding the claim.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">9. Dispute Resolution</h2>
              <p className="mb-4">
                Disputes between buyers and sellers should first be resolved directly through our platform's dispute resolution system. 
                If unresolved, parties may seek mediation or arbitration as outlined in our separate Buyer-Seller Terms and Conditions.
              </p>
              <p className="mb-4">
                Disputes with the platform operator are subject to the laws of [Your Jurisdiction] and the exclusive jurisdiction of [Your Courts].
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">10. Contact Information</h2>
              <p className="mb-4">
                For questions about these Terms or to report violations, please contact us at:
              </p>
              <p className="mb-2">Email: oracle.makret@proton.me </p>
              <p className="mb-2">Legal inquiries: [legal@example.com]</p>
              <p className="mb-2">Copyright/DMCA: [dmca@example.com]</p>
            </section>

            <p className="text-sm text-muted-foreground mt-8">Last updated: {new Date().toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}</p>
          </div>
        </Card>
      </div>
    </div>;
};
export default Terms;