import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const BuyerSellerTerms = () => {
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
          <h1 className="text-4xl font-bold mb-8 text-foreground">Terms and Conditions for Buyers and Sellers</h1>
          
          <div className="space-y-6 text-foreground">
            <section>
              <h2 className="text-2xl font-semibold mb-4">Part A: Terms for Sellers</h2>
              
              <h3 className="text-xl font-semibold mb-3">1. Seller Obligations and Warranties</h3>
              <p className="mb-4">As a seller on our platform, you represent and warrant that:</p>
              <ul className="list-disc list-inside mb-4 space-y-2">
                <li>You are the original creator and copyright holder of all images you upload</li>
                <li>You have obtained all necessary rights, licenses, and consents for uploaded content</li>
                <li>All individuals depicted in images have provided explicit consent for commercial use</li>
                <li>Your content does not infringe on any third-party intellectual property, privacy, or publicity rights</li>
                <li>Your content complies with all applicable laws and our Platform Rules</li>
                <li>You will not upload prohibited content as defined in our Terms of Use</li>
              </ul>

              <h3 className="text-xl font-semibold mb-3">2. Content Upload and Listing</h3>
              <p className="mb-4">When uploading content, sellers must:</p>
              <ul className="list-disc list-inside mb-4 space-y-2">
                <li>Provide accurate descriptions, titles, and metadata</li>
                <li>Set appropriate pricing within platform guidelines</li>
                <li>Select correct categories and tags</li>
                <li>Upload high-quality images suitable for the intended use</li>
                <li>Not misrepresent the content, quality, or licensing terms</li>
              </ul>

              <h3 className="text-xl font-semibold mb-3">3. Seller Fees and Payments</h3>
              <p className="mb-4">
                Platform fees: We charge a [X]% commission on each sale. This fee covers:
              </p>
              <ul className="list-disc list-inside mb-4 space-y-2">
                <li>Platform hosting and maintenance</li>
                <li>Payment processing via cryptocurrency</li>
                <li>Customer support and dispute resolution</li>
                <li>Content delivery and download services</li>
              </ul>
              <p className="mb-4">
                Payouts: Seller earnings are credited to your platform wallet after a successful transaction. 
                You can withdraw funds to your cryptocurrency wallet at any time, subject to minimum withdrawal amounts and network fees.
              </p>

              <h3 className="text-xl font-semibold mb-3">4. Seller Responsibilities</h3>
              <p className="mb-4">Sellers are responsible for:</p>
              <ul className="list-disc list-inside mb-4 space-y-2">
                <li>All legal compliance including tax obligations in their jurisdiction</li>
                <li>Responding to buyer inquiries and disputes in a timely manner</li>
                <li>Maintaining content quality and resolving quality complaints</li>
                <li>Managing their product inventory and availability</li>
                <li>Complying with all platform policies and guidelines</li>
              </ul>

              <h3 className="text-xl font-semibold mb-3">5. Content Removal and Account Suspension</h3>
              <p className="mb-4">
                We reserve the right to remove any content or suspend seller accounts that:
              </p>
              <ul className="list-disc list-inside mb-4 space-y-2">
                <li>Violate our Terms of Use or Platform Rules</li>
                <li>Receive multiple valid complaints or copyright claims</li>
                <li>Engage in fraudulent or deceptive practices</li>
                <li>Fail to meet quality standards or buyer satisfaction metrics</li>
              </ul>
              <p className="mb-4">
                Sellers will be notified of removal or suspension and may appeal decisions within [X] days.
              </p>

              <h3 className="text-xl font-semibold mb-3">6. Indemnification</h3>
              <p className="mb-4">
                Sellers agree to indemnify and hold harmless the platform, its operators, and affiliates from any claims, damages, or expenses arising from:
              </p>
              <ul className="list-disc list-inside mb-4 space-y-2">
                <li>Copyright, trademark, or intellectual property infringement</li>
                <li>Violation of personality rights or privacy laws</li>
                <li>Breach of these Terms or applicable laws</li>
                <li>Any content uploaded by the seller</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Part B: Terms for Buyers</h2>
              
              <h3 className="text-xl font-semibold mb-3">1. Purchase and Payment</h3>
              <p className="mb-4">
                Buyers can purchase digital images using supported cryptocurrencies (Bitcoin, Litecoin, Ethereum). 
                By completing a purchase, you agree to:
              </p>
              <ul className="list-disc list-inside mb-4 space-y-2">
                <li>Pay the displayed price plus any applicable transaction fees</li>
                <li>Provide accurate payment information</li>
                <li>Complete payment within the specified time window</li>
                <li>Accept cryptocurrency price fluctuations during the payment window</li>
              </ul>

              <h3 className="text-xl font-semibold mb-3">2. Digital Content Delivery</h3>
              <p className="mb-4">
                Upon successful payment confirmation:
              </p>
              <ul className="list-disc list-inside mb-4 space-y-2">
                <li>You will receive immediate access to download purchased content</li>
                <li>Content is delivered in the format and resolution specified in the listing</li>
                <li>Downloads are available from your account dashboard</li>
                <li>You should download and save content promptly (download links remain active for [X] days)</li>
              </ul>

              <h3 className="text-xl font-semibold mb-3">3. License and Usage Rights</h3>
              <p className="mb-4">
                Unless otherwise specified in the product listing, buyers receive a non-exclusive, non-transferable license to:
              </p>
              <ul className="list-disc list-inside mb-4 space-y-2">
                <li>Use purchased images for personal, non-commercial purposes</li>
                <li>Download and store images on personal devices</li>
                <li>Print images for personal use</li>
              </ul>
              <p className="mb-4">
                Buyers may NOT:
              </p>
              <ul className="list-disc list-inside mb-4 space-y-2">
                <li>Resell, redistribute, or share purchased content</li>
                <li>Use content for commercial purposes without appropriate licensing</li>
                <li>Claim ownership or authorship of purchased content</li>
                <li>Modify content in ways that violate the seller's rights or the original license terms</li>
              </ul>

              <h3 className="text-xl font-semibold mb-3">4. Right of Withdrawal for Digital Content</h3>
              <p className="mb-4">
                <strong>Important Notice:</strong> According to EU Consumer Rights Directive and applicable distance selling laws, 
                you expressly acknowledge and agree that:
              </p>
              <ul className="list-disc list-inside mb-4 space-y-2">
                <li>Digital content is delivered immediately upon payment confirmation</li>
                <li>By completing your purchase, you expressly consent to immediate delivery</li>
                <li>You acknowledge that you lose your right of withdrawal once content is delivered</li>
                <li>This is standard practice for digital downloads as the content cannot be "returned"</li>
              </ul>
              <p className="mb-4">
                <strong>Exceptions:</strong> Your statutory rights remain unaffected if content is defective, not as described, or fails to download properly. 
                See "Refunds and Disputes" below.
              </p>

              <h3 className="text-xl font-semibold mb-3">5. Refunds and Disputes</h3>
              <p className="mb-4">
                While standard withdrawal rights do not apply to digital downloads, you may be eligible for a refund if:
              </p>
              <ul className="list-disc list-inside mb-4 space-y-2">
                <li>Content is significantly different from the description or preview</li>
                <li>Content is corrupted, damaged, or fails to download</li>
                <li>Content violates platform rules or applicable laws</li>
                <li>You were charged incorrectly or experienced a payment error</li>
              </ul>
              <p className="mb-4">
                To request a refund or dispute a transaction:
              </p>
              <ul className="list-disc list-inside mb-4 space-y-2">
                <li>Contact the seller directly through the platform messaging system within [7] days of purchase</li>
                <li>If unresolved, open a formal dispute through our dispute resolution system</li>
                <li>Provide evidence supporting your claim (screenshots, download errors, etc.)</li>
                <li>Our team will review and mediate the dispute within [14] business days</li>
              </ul>

              <h3 className="text-xl font-semibold mb-3">6. Buyer Conduct</h3>
              <p className="mb-4">Buyers must not:</p>
              <ul className="list-disc list-inside mb-4 space-y-2">
                <li>Make fraudulent purchases or chargebacks</li>
                <li>Abuse the refund or dispute process</li>
                <li>Leave false or misleading reviews</li>
                <li>Harass or threaten sellers</li>
                <li>Violate license terms or copyright restrictions</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Part C: General Provisions</h2>
              
              <h3 className="text-xl font-semibold mb-3">1. Platform as Intermediary</h3>
              <p className="mb-4">
                We operate solely as an intermediary marketplace connecting buyers and sellers. We do not:
              </p>
              <ul className="list-disc list-inside mb-4 space-y-2">
                <li>Create, own, or control seller content</li>
                <li>Guarantee content quality, accuracy, or legality</li>
                <li>Act as a party to transactions between buyers and sellers</li>
                <li>Assume responsibility for user-generated content or user conduct</li>
              </ul>

              <h3 className="text-xl font-semibold mb-3">2. Communication</h3>
              <p className="mb-4">
                All communication between buyers and sellers should occur through our platform messaging system. 
                This ensures transparency, enables dispute resolution, and protects both parties.
              </p>

              <h3 className="text-xl font-semibold mb-3">3. Dispute Resolution Process</h3>
              <p className="mb-4">
                Our dispute resolution process includes:
              </p>
              <ul className="list-disc list-inside mb-4 space-y-2">
                <li>Direct negotiation between buyer and seller (recommended first step)</li>
                <li>Platform-mediated dispute resolution with evidence review</li>
                <li>Binding decision by platform administrators based on evidence and Terms</li>
                <li>Final appeal process for disputes exceeding [€X] in value</li>
              </ul>

              <h3 className="text-xl font-semibold mb-3">4. Modification of Terms</h3>
              <p className="mb-4">
                We may update these Terms periodically. Material changes will be communicated via email and platform notification. 
                Continued use of the platform constitutes acceptance of updated Terms.
              </p>
            </section>

            <p className="text-sm text-muted-foreground mt-8">Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default BuyerSellerTerms;
