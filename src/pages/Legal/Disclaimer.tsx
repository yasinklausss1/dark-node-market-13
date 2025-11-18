import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
const Disclaimer = () => {
  return <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Link to="/">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
        </Link>

        <Card className="p-8">
          <h1 className="text-4xl font-bold mb-8 text-foreground">Disclaimer</h1>
          
          <div className="space-y-6 text-foreground">
            <section>
              <h2 className="text-2xl font-semibold mb-4">1. Platform Role and Liability</h2>
              
              <h3 className="text-xl font-semibold mb-3">Intermediary Status</h3>
              <p className="mb-4">
                This platform operates exclusively as an intermediary marketplace connecting independent sellers with buyers of digital content. 
                We do not create, produce, own, or control any content listed on the platform.
              </p>
              <p className="mb-4">
                <strong>Important:</strong> All digital images and content available on this platform are created and uploaded by independent third-party sellers. 
                Sellers retain full ownership and responsibility for their content.
              </p>

              <h3 className="text-xl font-semibold mb-3">No Liability for User Content</h3>
              <p className="mb-4">
                We expressly disclaim all liability for:
              </p>
              <ul className="list-disc list-inside mb-4 space-y-2">
                <li>Accuracy, quality, legality, or appropriateness of seller-uploaded content</li>
                <li>Copyright, trademark, or intellectual property infringement by sellers</li>
                <li>Violations of personality rights, privacy rights, or image rights</li>
                <li>Content that violates applicable laws despite our moderation efforts</li>
                <li>Disputes between buyers and sellers regarding content or transactions</li>
              </ul>
              <p className="mb-4">
                While we implement content moderation and prohibit illegal content, we cannot guarantee that all prohibited content will be identified and removed immediately. 
                Users are encouraged to report violations through our reporting system.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">2. Seller Responsibility</h2>
              
              <p className="mb-4">
                Sellers using our platform are solely responsible for:
              </p>
              <ul className="list-disc list-inside mb-4 space-y-2">
                <li>Ensuring they own all rights to uploaded content or have obtained necessary licenses</li>
                <li>Obtaining consent from all individuals depicted in images for commercial use</li>
                <li>Complying with copyright, trademark, and intellectual property laws</li>
                <li>Respecting personality rights and privacy laws (including GDPR)</li>
                <li>Ensuring content does not violate any applicable laws or regulations</li>
                <li>Providing accurate descriptions and representations of their content</li>
                <li>Fulfilling their tax and legal obligations in their jurisdiction</li>
                <li>Resolving disputes with buyers related to their content</li>
              </ul>
              <p className="mb-4">
                By uploading content, sellers indemnify the platform against all claims, damages, and liabilities arising from their content or conduct.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">3. Buyer Acknowledgment</h2>
              
              <p className="mb-4">
                Buyers acknowledge and accept that:
              </p>
              <ul className="list-disc list-inside mb-4 space-y-2">
                <li>Content is created by third-party sellers, not by the platform</li>
                <li>The platform does not guarantee content quality, accuracy, or fitness for purpose</li>
                <li>Sellers are responsible for content legality and proper licensing</li>
                <li>License terms and usage rights are determined by sellers</li>
                <li>Disputes regarding content should first be directed to the seller</li>
                <li>The platform facilitates but does not control transactions</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">4. No Warranties</h2>
              
              <h3 className="text-xl font-semibold mb-3">Platform "As Is"</h3>
              <p className="mb-4">
                The platform and all services are provided "as is" and "as available" without any warranties of any kind, either express or implied, including but not limited to:
              </p>
              <ul className="list-disc list-inside mb-4 space-y-2">
                <li>Warranties of merchantability or fitness for a particular purpose</li>
                <li>Warranties of non-infringement or quiet enjoyment</li>
                <li>Warranties regarding accuracy, reliability, or completeness of content</li>
                <li>Warranties that the service will be uninterrupted, secure, or error-free</li>
              </ul>

              <h3 className="text-xl font-semibold mb-3">Third-Party Content</h3>
              <p className="mb-4">
                We make no representations or warranties regarding:
              </p>
              <ul className="list-disc list-inside mb-4 space-y-2">
                <li>The legality, quality, or safety of user-uploaded content</li>
                <li>The accuracy of product descriptions or seller representations</li>
                <li>The authenticity or originality of digital content</li>
                <li>The validity of licenses or permissions claimed by sellers</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">5. Limitation of Liability</h2>
              
              <h3 className="text-xl font-semibold mb-3">Maximum Liability</h3>
              <p className="mb-4">
                To the maximum extent permitted by applicable law, we shall not be liable for any:
              </p>
              <ul className="list-disc list-inside mb-4 space-y-2">
                <li>Indirect, incidental, special, consequential, or punitive damages</li>
                <li>Loss of profits, revenue, data, or business opportunities</li>
                <li>Damages arising from user content or third-party conduct</li>
                <li>Damages resulting from platform unavailability or technical issues</li>
                <li>Damages related to cryptocurrency price fluctuations</li>
                <li>Legal costs or expenses related to content disputes</li>
              </ul>
              <p className="mb-4">
                In no event shall our total liability exceed the fees paid by you in the 12 months preceding the claim, or €100, whichever is lower.
              </p>

              <h3 className="text-xl font-semibold mb-3">Exceptions</h3>
              <p className="mb-4">
                Nothing in this disclaimer shall exclude or limit liability for:
              </p>
              <ul className="list-disc list-inside mb-4 space-y-2">
                <li>Death or personal injury caused by negligence</li>
                <li>Fraud or fraudulent misrepresentation</li>
                <li>Any liability that cannot be excluded or limited under applicable law</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">6. Cryptocurrency Disclaimer</h2>
              
              <p className="mb-4">
                Cryptocurrency transactions involve significant risks:
              </p>
              <ul className="list-disc list-inside mb-4 space-y-2">
                <li><strong>Price Volatility:</strong> Cryptocurrency values can fluctuate dramatically</li>
                <li><strong>Irreversibility:</strong> Blockchain transactions cannot be reversed or cancelled</li>
                <li><strong>Network Delays:</strong> Transaction confirmation times vary and are beyond our control</li>
                <li><strong>Network Fees:</strong> Blockchain fees fluctuate and are set by the network, not us</li>
                <li><strong>Address Errors:</strong> Sending funds to incorrect addresses results in permanent loss</li>
                <li><strong>Regulatory Changes:</strong> Cryptocurrency regulations vary by jurisdiction and may change</li>
              </ul>
              <p className="mb-4">
                We are not responsible for losses arising from cryptocurrency use, blockchain network issues, or regulatory changes.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">7. External Links</h2>
              
              <p className="mb-4">
                Our platform may contain links to external websites or third-party services. We have no control over and assume no responsibility for:
              </p>
              <ul className="list-disc list-inside mb-4 space-y-2">
                <li>The content, privacy policies, or practices of third-party sites</li>
                <li>The accuracy, legality, or appropriateness of external content</li>
                <li>Any damages or losses caused by use of third-party services</li>
              </ul>
              <p className="mb-4">
                We do not endorse or make any representations about external websites. Use of third-party services is at your own risk.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">8. Technical Limitations</h2>
              
              <p className="mb-4">
                We disclaim liability for:
              </p>
              <ul className="list-disc list-inside mb-4 space-y-2">
                <li>Platform downtime, maintenance, or technical interruptions</li>
                <li>Data loss or corruption</li>
                <li>Unauthorized access or security breaches not caused by our negligence</li>
                <li>Compatibility issues with user devices or software</li>
                <li>Download failures or file corruption during transfer</li>
                <li>Internet connectivity issues or ISP problems</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">9. Age Verification and Adult Content</h2>
              
              <p className="mb-4">
                While we prohibit pornographic content, some artistic or erotic content may be permitted. Users must:
              </p>
              <ul className="list-disc list-inside mb-4 space-y-2">
                <li>Be at least 18 years old to access the platform</li>
                <li>Verify their age during registration</li>
                <li>Understand that some content may be intended for mature audiences</li>
                <li>Comply with local laws regarding adult content</li>
              </ul>
              <p className="mb-4">
                We are not responsible for minors who falsify age information or bypass age verification measures.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">10. No Professional Advice</h2>
              
              <p className="mb-4">
                Information provided on this platform is for general informational purposes only and does not constitute:
              </p>
              <ul className="list-disc list-inside mb-4 space-y-2">
                <li>Legal, financial, tax, or investment advice</li>
                <li>Professional consultation or recommendations</li>
                <li>Endorsement of any products, services, or content</li>
              </ul>
              <p className="mb-4">
                Users should seek appropriate professional advice before making legal, financial, or business decisions.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">11. Indemnification</h2>
              
              <p className="mb-4">
                You agree to indemnify, defend, and hold harmless the platform, its operators, employees, and affiliates from any claims, damages, losses, or expenses (including legal fees) arising from:
              </p>
              <ul className="list-disc list-inside mb-4 space-y-2">
                <li>Your use of the platform or services</li>
                <li>Your violation of these Terms or applicable laws</li>
                <li>Your content or conduct on the platform</li>
                <li>Infringement of third-party rights</li>
                <li>Disputes with other users</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">12. Governing Law and Jurisdiction</h2>
              
              <p className="mb-4">
                This disclaimer and all related matters are governed by the laws of [Your Jurisdiction], without regard to conflict of law principles.
              </p>
              <p className="mb-4">
                Any disputes shall be subject to the exclusive jurisdiction of the courts of [Your Jurisdiction], except where mandatory consumer protection laws provide otherwise.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">13. Changes to This Disclaimer</h2>
              
              <p className="mb-4">
                We reserve the right to modify this disclaimer at any time. Material changes will be communicated via email or platform notification. 
                Continued use of the platform after changes constitutes acceptance of the updated disclaimer.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">14. Contact</h2>
              
              <p className="mb-4">
                For questions about this disclaimer, please contact:
              </p>
              <p className="mb-2">Email: [legal@example.com]</p>
              
            </section>

            
          </div>
        </Card>
      </div>
    </div>;
};
export default Disclaimer;