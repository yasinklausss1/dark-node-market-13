import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const Privacy = () => {
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
          <h1 className="text-4xl font-bold mb-8 text-foreground">Privacy Policy</h1>
          
          <div className="space-y-6 text-foreground">
            <section>
              <h2 className="text-2xl font-semibold mb-4">1. Data Protection at a Glance</h2>
              
              <h3 className="text-xl font-semibold mb-3 mt-4">General Information</h3>
              <p className="mb-4">
                The following information provides a simple overview of what happens to your personal data when you visit our website. 
                Personal data is any data that can personally identify you.
              </p>

              <h3 className="text-xl font-semibold mb-3">Data Collection on Our Website</h3>
              <p className="mb-2"><strong>Who is responsible for data collection on this website?</strong></p>
              <p className="mb-4">
                Data processing on this website is carried out by the website operator. You can find their contact details in the imprint of this website.
              </p>

              <p className="mb-2"><strong>How do we collect your data?</strong></p>
              <p className="mb-4">
                Your data is collected when you provide it to us. This could, for example, be data you enter on a contact form or when registering for an account.
                Other data is collected automatically by our IT systems when you visit the website. This is mainly technical data (e.g., internet browser, operating system, or time of page access).
              </p>

              <p className="mb-2"><strong>What do we use your data for?</strong></p>
              <p className="mb-4">
                Some of the data is collected to ensure proper provision of the website. Other data may be used to analyze your user behavior.
              </p>

              <p className="mb-2"><strong>What rights do you have regarding your data?</strong></p>
              <p className="mb-4">
                You have the right to receive information about the origin, recipient, and purpose of your stored personal data free of charge at any time. 
                You also have the right to request the correction, blocking, or deletion of this data. You can contact us at any time at the address given in the imprint for this purpose and for further questions on the subject of data protection.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">2. General Information and Mandatory Information</h2>
              
              <h3 className="text-xl font-semibold mb-3">Data Protection</h3>
              <p className="mb-4">
                The operators of these pages take the protection of your personal data very seriously. We treat your personal data confidentially and in accordance with statutory data protection regulations and this privacy policy.
              </p>
              <p className="mb-4">
                When you use this website, various personal data is collected. Personal data is data with which you can be personally identified. 
                This privacy policy explains what data we collect and what we use it for. It also explains how and for what purpose this is done.
              </p>

              <h3 className="text-xl font-semibold mb-3">Data Controller</h3>
              <p className="mb-4">
                The controller for data processing on this website is:
              </p>
              <p className="mb-2">[Company Name / Platform Operator Name]</p>
              <p className="mb-2">[Street Address]</p>
              <p className="mb-2">[Postal Code, City]</p>
              <p className="mb-4">Email: [your-email@example.com]</p>

              <h3 className="text-xl font-semibold mb-3">Revocation of Your Consent to Data Processing</h3>
              <p className="mb-4">
                Many data processing operations are only possible with your express consent. You can revoke consent you have already given at any time. 
                An informal communication by email is sufficient. The legality of the data processing carried out until the revocation remains unaffected by the revocation.
              </p>

              <h3 className="text-xl font-semibold mb-3">Right to Data Portability</h3>
              <p className="mb-4">
                You have the right to have data that we process automatically on the basis of your consent or in fulfillment of a contract handed over to you or to a third party in a common, machine-readable format.
              </p>

              <h3 className="text-xl font-semibold mb-3">SSL or TLS Encryption</h3>
              <p className="mb-4">
                This site uses SSL or TLS encryption for security reasons and to protect the transmission of confidential content, such as orders or inquiries you send to us as the site operator. 
                You can recognize an encrypted connection by the fact that the address line of the browser changes from "http://" to "https://" and by the lock symbol in your browser line.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">3. Data Collection on Our Website</h2>
              
              <h3 className="text-xl font-semibold mb-3">Cookies</h3>
              <p className="mb-4">
                Our website uses cookies. Cookies are small text files that are stored on your device and save certain settings and data for exchange with our system via your browser. 
                Some cookies remain stored on your device until you delete them. They enable us to recognize your browser on your next visit.
              </p>
              <p className="mb-4">
                You can set your browser to inform you about the setting of cookies and only allow cookies in individual cases, exclude the acceptance of cookies for certain cases or in general, 
                and activate the automatic deletion of cookies when closing the browser. If cookies are deactivated, the functionality of this website may be limited.
              </p>

              <h3 className="text-xl font-semibold mb-3">Server Log Files</h3>
              <p className="mb-4">
                The provider of the pages automatically collects and stores information in so-called server log files, which your browser automatically transmits to us. These are:
              </p>
              <ul className="list-disc list-inside mb-4 space-y-2">
                <li>Browser type and browser version</li>
                <li>Operating system used</li>
                <li>Referrer URL</li>
                <li>Host name of the accessing computer</li>
                <li>Time of the server request</li>
                <li>IP address</li>
              </ul>
              <p className="mb-4">
                This data is not merged with other data sources. The data is collected on the basis of Art. 6 (1) lit. f GDPR. 
                The website operator has a legitimate interest in the technically error-free presentation and optimization of its website.
              </p>

              <h3 className="text-xl font-semibold mb-3">Registration on This Website</h3>
              <p className="mb-4">
                You can register on our website to use additional functions. We use the data entered only for the purpose of using the respective offer or service for which you have registered. 
                The mandatory information requested during registration must be provided in full. Otherwise, we will reject the registration.
              </p>
              <p className="mb-4">
                For important changes, such as the scope of the offer or technically necessary changes, we use the email address provided during registration to inform you in this way.
              </p>
              <p className="mb-4">
                The data entered during registration is stored by us for as long as you are registered on our website and will then be deleted. 
                Legal retention periods remain unaffected.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">4. Platform-Specific Data Processing</h2>
              
              <h3 className="text-xl font-semibold mb-3">User-Generated Content</h3>
              <p className="mb-4">
                Our platform enables sellers to upload and offer digital images for sale. When sellers upload content:
              </p>
              <ul className="list-disc list-inside mb-4 space-y-2">
                <li>Sellers retain full responsibility for copyright and image rights of uploaded content</li>
                <li>We process and store uploaded images solely for the purpose of marketplace operation</li>
                <li>Image metadata may be processed for categorization and search functionality</li>
                <li>We reserve the right to remove content that violates our terms of service</li>
              </ul>

              <h3 className="text-xl font-semibold mb-3">Transaction Data</h3>
              <p className="mb-4">
                When buyers purchase digital content, we process:
              </p>
              <ul className="list-disc list-inside mb-4 space-y-2">
                <li>Transaction details (amount, date, purchased items)</li>
                <li>Digital wallet information (cryptocurrency addresses)</li>
                <li>Download history and access logs</li>
              </ul>
              <p className="mb-4">
                This data is processed on the basis of Art. 6 (1) lit. b GDPR for contract fulfillment and stored according to legal retention requirements.
              </p>

              <h3 className="text-xl font-semibold mb-3">Cryptocurrency Transactions</h3>
              <p className="mb-4">
                Our platform supports cryptocurrency payments (Bitcoin, Litecoin, Ethereum). Blockchain transactions are public by nature. 
                We do not control or have access to blockchain data beyond what is publicly available on the respective networks.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">5. Your Rights</h2>
              
              <p className="mb-4">You have the following rights regarding your personal data:</p>
              <ul className="list-disc list-inside mb-4 space-y-2">
                <li><strong>Right of Access:</strong> You can request information about your personal data we process</li>
                <li><strong>Right to Rectification:</strong> You can request correction of inaccurate personal data</li>
                <li><strong>Right to Erasure:</strong> You can request deletion of your personal data under certain conditions</li>
                <li><strong>Right to Restriction:</strong> You can request restriction of processing under certain conditions</li>
                <li><strong>Right to Data Portability:</strong> You can receive your data in a structured, commonly used format</li>
                <li><strong>Right to Object:</strong> You can object to processing based on legitimate interests</li>
                <li><strong>Right to Withdraw Consent:</strong> Where processing is based on consent, you can withdraw it at any time</li>
              </ul>
              <p className="mb-4">
                To exercise these rights, please contact us at [your-email@example.com]. You also have the right to lodge a complaint with a supervisory authority.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">6. Third-Party Services</h2>
              
              <h3 className="text-xl font-semibold mb-3">Supabase (Database & Authentication)</h3>
              <p className="mb-4">
                We use Supabase for database hosting and user authentication. Supabase processes personal data on our behalf in accordance with their privacy policy and GDPR requirements. 
                Data is stored in EU data centers.
              </p>

              <h3 className="text-xl font-semibold mb-3">Cryptocurrency Price APIs</h3>
              <p className="mb-4">
                We use third-party APIs to fetch current cryptocurrency prices. These services may log API requests but do not receive personal user data.
              </p>
            </section>

            <p className="text-sm text-muted-foreground mt-8">Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Privacy;
