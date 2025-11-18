import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
const Withdrawal = () => {
  return <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Link to="/">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
        </Link>

        <Card className="p-8">
          <h1 className="text-4xl font-bold mb-8 text-foreground">Right of Withdrawal for Digital Content</h1>
          
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Important Notice for Digital Downloads</AlertTitle>
            <AlertDescription>
              This platform exclusively offers digital content (downloadable images). Special withdrawal rules apply to digital purchases.
            </AlertDescription>
          </Alert>

          <div className="space-y-6 text-foreground">
            <section>
              <h2 className="text-2xl font-semibold mb-4">Right of Withdrawal</h2>
              <p className="mb-4">
                You have the right to withdraw from this contract within 14 days without giving any reason.
              </p>
              <p className="mb-4">
                The withdrawal period will expire after 14 days from the day of the conclusion of the contract.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Loss of Right of Withdrawal for Digital Content</h2>
              
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Express Acknowledgment Required</AlertTitle>
                <AlertDescription>
                  By purchasing digital content on our platform, you expressly acknowledge and agree that you will lose your right of withdrawal once the digital content has been delivered.
                </AlertDescription>
              </Alert>

              <p className="mb-4">
                <strong>According to Article 16(m) of the EU Consumer Rights Directive 2011/83/EU:</strong>
              </p>
              <p className="mb-4">
                The right of withdrawal shall not apply to:
              </p>
              <blockquote className="border-l-4 border-primary pl-4 italic mb-4">
                "The supply of digital content which is not supplied on a tangible medium if the performance has begun with the consumer's prior express consent 
                and his acknowledgment that he thereby loses his right of withdrawal."
              </blockquote>

              <h3 className="text-xl font-semibold mb-3 mt-6">What This Means for You:</h3>
              <ul className="list-disc list-inside mb-4 space-y-2">
                <li>Our platform delivers digital images immediately upon payment confirmation</li>
                <li>Before completing your purchase, you must expressly consent to immediate delivery</li>
                <li>You acknowledge that immediate delivery means you waive your right of withdrawal</li>
                <li>Once the download link is provided or content is delivered, the right of withdrawal is lost</li>
                <li>This is standard practice for all digital marketplaces and is legally required</li>
              </ul>

              <h3 className="text-xl font-semibold mb-3">Confirmation Process:</h3>
              <p className="mb-4">
                During the checkout process, you will be presented with a checkbox confirming:
              </p>
              <blockquote className="border-l-4 border-primary pl-4 mb-4">
                "I expressly request immediate delivery of the digital content and acknowledge that I will lose my right of withdrawal once delivery begins."
              </blockquote>
              <p className="mb-4">
                You must check this box to complete your purchase. This fulfills legal requirements for selling digital content within the EU.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Exceptions and Your Rights</h2>
              
              <p className="mb-4">
                While you lose the standard right of withdrawal for digital downloads, your statutory consumer rights remain protected. 
                You may be entitled to a refund or replacement if:
              </p>
              <ul className="list-disc list-inside mb-4 space-y-2">
                <li><strong>Defective Content:</strong> The digital file is corrupted, damaged, or cannot be downloaded</li>
                <li><strong>Not as Described:</strong> The content significantly differs from the description or preview shown</li>
                <li><strong>Technical Issues:</strong> Platform or technical errors prevent proper delivery or access</li>
                <li><strong>Unauthorized Charges:</strong> You were charged incorrectly or without authorization</li>
                <li><strong>Content Violations:</strong> The content violates platform rules or applicable laws</li>
              </ul>

              <h3 className="text-xl font-semibold mb-3">How to Report Issues:</h3>
              <p className="mb-4">
                If you experience any of the above issues:
              </p>
              <ol className="list-decimal list-inside mb-4 space-y-2">
                <li>Contact the seller through our platform messaging system within 7 days</li>
                <li>Provide specific details about the issue (screenshots, error messages, etc.)</li>
                <li>If unresolved, open a formal dispute through our dispute resolution system</li>
                <li>Our support team will review and respond within 14 business days</li>
              </ol>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">How to Exercise Your Right of Withdrawal (If Applicable)</h2>
              
              <p className="mb-4">
                If you are eligible to withdraw from a contract (i.e., before digital content has been delivered), you may do so by:
              </p>
              <ul className="list-disc list-inside mb-4 space-y-2">
                <li>Sending a clear statement to [withdrawal@example.com]</li>
                <li>Using the withdrawal form provided below</li>
                <li>Contacting customer support through the platform</li>
              </ul>

              <h3 className="text-xl font-semibold mb-3">Withdrawal Form Template:</h3>
              <div className="bg-muted p-6 rounded-lg mb-4">
                <p className="mb-2">To: [Your Company Name]</p>
                <p className="mb-2">[Your Address]</p>
                <p className="mb-2">Email: [withdrawal@example.com]</p>
                <p className="mb-4 mt-4">I hereby give notice that I withdraw from my contract for the following digital content:</p>
                <p className="mb-2">Ordered on: [Date]</p>
                <p className="mb-2">Order number: [Order Number]</p>
                <p className="mb-2">Name: [Your Name]</p>
                <p className="mb-2">Address: [Your Address]</p>
                <p className="mb-2">Email: [Your Email]</p>
                <p className="mb-2">Date: [Date]</p>
                <p className="mb-2">Signature: [If printed]</p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Effects of Withdrawal</h2>
              <p className="mb-4">
                If you successfully withdraw from a contract (before content delivery), we will reimburse all payments received from you, 
                including delivery costs (if applicable), without undue delay and in any event not later than 14 days from the day on which we are informed about your decision to withdraw.
              </p>
              <p className="mb-4">
                Reimbursement will be made using the same payment method used for the original transaction, unless expressly agreed otherwise. 
                You will not incur any fees as a result of such reimbursement.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Additional Information</h2>
              
              <h3 className="text-xl font-semibold mb-3">Cryptocurrency Refunds</h3>
              <p className="mb-4">
                Due to the nature of cryptocurrency transactions:
              </p>
              <ul className="list-disc list-inside mb-4 space-y-2">
                <li>Refunds are processed to the same cryptocurrency address or to your platform wallet</li>
                <li>Cryptocurrency price fluctuations may affect refund amounts</li>
                <li>We refund the EUR equivalent at the time of the original purchase</li>
                <li>Blockchain transaction fees may apply and will be deducted from the refund</li>
              </ul>

              <h3 className="text-xl font-semibold mb-3">Questions?</h3>
              <p className="mb-4">
                If you have questions about your right of withdrawal or need assistance, please contact:
              </p>
              <p className="mb-2">Email: oracle.market@proton.me </p>
              
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
export default Withdrawal;