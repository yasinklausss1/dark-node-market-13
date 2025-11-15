import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ShieldAlert } from "lucide-react";

const AgeVerification = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Link to="/">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
        </Link>

        <Card className="p-8">
          <h1 className="text-4xl font-bold mb-8 text-foreground">Age Verification & Content Policy</h1>
          
          <Alert className="mb-6">
            <ShieldAlert className="h-4 w-4" />
            <AlertTitle>18+ Platform</AlertTitle>
            <AlertDescription>
              This platform is restricted to users aged 18 years and older. Some content may be artistic or erotic in nature but must not be pornographic.
            </AlertDescription>
          </Alert>

          <div className="space-y-6 text-foreground">
            <section>
              <h2 className="text-2xl font-semibold mb-4">1. Age Requirement</h2>
              
              <h3 className="text-xl font-semibold mb-3">Minimum Age: 18 Years</h3>
              <p className="mb-4">
                You must be at least 18 years of age to:
              </p>
              <ul className="list-disc list-inside mb-4 space-y-2">
                <li>Create an account on this platform</li>
                <li>Access, view, or purchase any content</li>
                <li>Upload or sell content as a seller</li>
                <li>Participate in community features</li>
              </ul>

              <h3 className="text-xl font-semibold mb-3">Age Verification Process</h3>
              <p className="mb-4">
                During registration, you must:
              </p>
              <ul className="list-disc list-inside mb-4 space-y-2">
                <li>Confirm that you are at least 18 years of age</li>
                <li>Provide accurate date of birth information</li>
                <li>Agree to our Terms of Use and Age Policy</li>
                <li>Understand that providing false age information violates our Terms and applicable laws</li>
              </ul>

              <h3 className="text-xl font-semibold mb-3">Additional Verification</h3>
              <p className="mb-4">
                We reserve the right to request additional age verification at any time, including:
              </p>
              <ul className="list-disc list-inside mb-4 space-y-2">
                <li>Government-issued ID verification</li>
                <li>Credit card or payment method verification (adults only)</li>
                <li>Third-party age verification services</li>
              </ul>
              <p className="mb-4">
                Failure to provide requested verification may result in account suspension or termination.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">2. Content Policy</h2>
              
              <h3 className="text-xl font-semibold mb-3">Permitted Content</h3>
              <p className="mb-4">
                Our platform allows artistic and creative digital images, which may include:
              </p>
              <ul className="list-disc list-inside mb-4 space-y-2">
                <li>Artistic photography and fine art nudes (tasteful, non-explicit)</li>
                <li>Erotic or sensual imagery that is artistic in nature</li>
                <li>Fashion, beauty, and glamour photography</li>
                <li>Artistic expressions of human form and intimacy</li>
                <li>Boudoir photography and tasteful adult themes</li>
              </ul>
              <p className="mb-4">
                <strong>Standard:</strong> Content must have artistic or aesthetic value and be presented in a tasteful, non-exploitative manner.
              </p>

              <h3 className="text-xl font-semibold mb-3">Strictly Prohibited Content</h3>
              <p className="mb-4">
                The following content is absolutely prohibited and will result in immediate account termination and potential legal action:
              </p>
              <ul className="list-disc list-inside mb-4 space-y-2">
                <li><strong>Child Sexual Abuse Material (CSAM):</strong> Any content depicting minors in sexual or suggestive contexts</li>
                <li><strong>Pornography:</strong> Explicit sexual content showing sexual acts or genitalia in graphic detail</li>
                <li><strong>Non-consensual Content:</strong> Images created or shared without subject consent</li>
                <li><strong>Revenge Porn:</strong> Intimate images shared without consent</li>
                <li><strong>Violent or Extreme Content:</strong> Content depicting violence, gore, or extreme acts</li>
                <li><strong>Illegal Activities:</strong> Content promoting or depicting illegal activities</li>
                <li><strong>Hate Speech:</strong> Content promoting discrimination or hatred</li>
                <li><strong>Deepfakes:</strong> Non-consensual manipulated images of real people</li>
              </ul>

              <h3 className="text-xl font-semibold mb-3">Gray Areas and Moderation</h3>
              <p className="mb-4">
                The distinction between artistic erotic content and pornography can be subjective. Our moderation team considers:
              </p>
              <ul className="list-disc list-inside mb-4 space-y-2">
                <li><strong>Artistic Merit:</strong> Does the content have creative, aesthetic, or cultural value?</li>
                <li><strong>Context:</strong> Is the content presented as art or purely for sexual gratification?</li>
                <li><strong>Explicitness:</strong> Does the content show explicit sexual acts or focus solely on genitalia?</li>
                <li><strong>Intent:</strong> What is the creator's stated purpose and the overall presentation?</li>
              </ul>
              <p className="mb-4">
                <strong>Final Decision:</strong> Our moderation team has the final say on content acceptability. When in doubt, err on the side of caution.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">3. Seller Obligations for Adult-Themed Content</h2>
              
              <p className="mb-4">
                Sellers uploading artistic or erotic content must ensure:
              </p>
              <ul className="list-disc list-inside mb-4 space-y-2">
                <li><strong>Age Verification:</strong> All individuals depicted are 18+ years old</li>
                <li><strong>Model Consent:</strong> Written consent from all individuals depicted (model release forms)</li>
                <li><strong>Identity Verification:</strong> Proof of age for all depicted individuals (18 U.S.C. § 2257 compliance if applicable)</li>
                <li><strong>Consent Documentation:</strong> Ability to provide consent documentation upon request</li>
                <li><strong>Accurate Tagging:</strong> Properly categorize and tag content as "mature" or "artistic"</li>
              </ul>

              <h3 className="text-xl font-semibold mb-3">Model Release Requirements</h3>
              <p className="mb-4">
                For any content featuring identifiable individuals in artistic or erotic contexts, sellers must maintain:
              </p>
              <ul className="list-disc list-inside mb-4 space-y-2">
                <li>Signed model release forms with explicit consent for commercial use</li>
                <li>Proof of age (copy of government ID showing 18+ age)</li>
                <li>Clear understanding and consent from models about content nature and distribution</li>
                <li>Records retention for at least 7 years as per legal requirements</li>
              </ul>
              <p className="mb-4">
                Sellers may be required to provide these documents to platform administrators upon request or in case of disputes.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">4. Buyer Responsibilities</h2>
              
              <p className="mb-4">
                Buyers accessing mature or artistic content acknowledge:
              </p>
              <ul className="list-disc list-inside mb-4 space-y-2">
                <li>They are 18 years of age or older</li>
                <li>They are legally permitted to view such content in their jurisdiction</li>
                <li>They will not share or redistribute content in violation of license terms</li>
                <li>They understand the difference between artistic content and pornography</li>
                <li>They will not use purchased content for illegal purposes</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">5. Legal Compliance</h2>
              
              <h3 className="text-xl font-semibold mb-3">International Laws</h3>
              <p className="mb-4">
                Users must comply with laws in their jurisdiction regarding:
              </p>
              <ul className="list-disc list-inside mb-4 space-y-2">
                <li>Legal age of majority and adult content access</li>
                <li>Content creation, distribution, and possession laws</li>
                <li>Privacy and personality rights</li>
                <li>Intellectual property and copyright laws</li>
              </ul>

              <h3 className="text-xl font-semibold mb-3">US Law Compliance (If Applicable)</h3>
              <p className="mb-4">
                If you are subject to US law, you must comply with:
              </p>
              <ul className="list-disc list-inside mb-4 space-y-2">
                <li><strong>18 U.S.C. § 2257:</strong> Record-keeping requirements for producers of adult content</li>
                <li><strong>PROTECT Act:</strong> Prohibitions on child pornography and obscene content</li>
                <li><strong>CDA Section 230:</strong> Understanding platform intermediary protections</li>
              </ul>

              <h3 className="text-xl font-semibold mb-3">EU Law Compliance</h3>
              <p className="mb-4">
                EU users and sellers must comply with:
              </p>
              <ul className="list-disc list-inside mb-4 space-y-2">
                <li><strong>GDPR:</strong> Privacy and data protection for depicted individuals</li>
                <li><strong>Copyright Directive:</strong> Creator rights and licensing requirements</li>
                <li><strong>DSA (Digital Services Act):</strong> Content moderation and illegal content reporting</li>
                <li><strong>National Laws:</strong> Country-specific regulations on adult content</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">6. Reporting and Enforcement</h2>
              
              <h3 className="text-xl font-semibold mb-3">How to Report Violations</h3>
              <p className="mb-4">
                If you encounter content that violates our policies:
              </p>
              <ul className="list-disc list-inside mb-4 space-y-2">
                <li>Use the "Report" button on content listings</li>
                <li>Email [report@example.com] with specific details</li>
                <li>For CSAM or illegal content, contact [abuse@example.com] immediately</li>
              </ul>

              <h3 className="text-xl font-semibold mb-3">Law Enforcement Cooperation</h3>
              <p className="mb-4">
                We cooperate fully with law enforcement agencies regarding:
              </p>
              <ul className="list-disc list-inside mb-4 space-y-2">
                <li>Child sexual abuse material (CSAM) - reported to NCMEC and appropriate authorities</li>
                <li>Non-consensual intimate imagery (revenge porn)</li>
                <li>Illegal content or activities</li>
                <li>Court orders and valid legal requests</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">7. Account Consequences</h2>
              
              <h3 className="text-xl font-semibold mb-3">Age Verification Failure</h3>
              <p className="mb-4">
                If you cannot verify you are 18+ years old:
              </p>
              <ul className="list-disc list-inside mb-4 space-y-2">
                <li>Your account will be immediately suspended</li>
                <li>All pending transactions will be cancelled</li>
                <li>You will not be able to re-register until you meet age requirements</li>
              </ul>

              <h3 className="text-xl font-semibold mb-3">Content Policy Violations</h3>
              <p className="mb-4">
                Violations result in:
              </p>
              <ul className="list-disc list-inside mb-4 space-y-2">
                <li><strong>First Minor Violation:</strong> Warning and content removal</li>
                <li><strong>Repeated Violations:</strong> Account suspension (7-30 days)</li>
                <li><strong>Serious Violations:</strong> Permanent account termination</li>
                <li><strong>Illegal Content:</strong> Immediate ban and law enforcement notification</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">8. Privacy and Data Protection</h2>
              
              <p className="mb-4">
                Age verification data is processed in accordance with our Privacy Policy and GDPR requirements:
              </p>
              <ul className="list-disc list-inside mb-4 space-y-2">
                <li>Age verification data is stored securely and encrypted</li>
                <li>ID documents are retained only as long as legally required</li>
                <li>Age verification is processed under legal obligation and legitimate interest bases</li>
                <li>You have rights to access and delete age verification data (subject to legal retention requirements)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">9. Parental Controls</h2>
              
              <p className="mb-4">
                While we implement age verification, parents and guardians should:
              </p>
              <ul className="list-disc list-inside mb-4 space-y-2">
                <li>Use parental control software on devices used by minors</li>
                <li>Monitor internet usage of children and teenagers</li>
                <li>Educate young people about online safety and age-restricted content</li>
                <li>Report any circumvention attempts to [abuse@example.com]</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">10. Contact</h2>
              
              <p className="mb-4">
                For questions about age verification or content policies:
              </p>
              <p className="mb-2">General inquiries: [support@example.com]</p>
              <p className="mb-2">Age verification issues: [verification@example.com]</p>
              <p className="mb-2">Report violations: [report@example.com]</p>
              <p className="mb-2">CSAM or illegal content: [abuse@example.com]</p>
            </section>

            <p className="text-sm text-muted-foreground mt-8">Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default AgeVerification;
