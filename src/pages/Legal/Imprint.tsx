import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
const Imprint = () => {
  return <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Link to="/">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
        </Link>

        <Card className="p-8">
          <h1 className="text-4xl font-bold mb-8 text-foreground">Imprint</h1>
          
          <div className="space-y-6 text-foreground">
            <section>
              <h2 className="text-2xl font-semibold mb-4">Information according to § 5 TMG</h2>
              <p className="mb-2">Oracle Market      </p>
              <p className="mb-2">Martin-Luther-Weg 11          </p>
              <p className="mb-2">78532 Tuttlingen</p>
              <p className="mb-2">Schweiz</p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Contact</h2>
              <p className="mb-2">Email: [your-email@example.com]</p>
              <p className="mb-2">Phone: +41 381 (937-281)    </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Represented by</h2>
              <p>[Name of Legal Representative]</p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Register Entry</h2>
              <p className="mb-2">Entry in: [Commercial Register / Association Register]</p>
              <p className="mb-2">Register Number: [Your Registration Number]</p>
              <p className="mb-2">Register Court: [Court Name]</p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">VAT ID</h2>
              <p className="mb-2">VAT identification number according to §27a German VAT Tax Act:</p>
              <p>[Your VAT ID]</p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">EU Dispute Resolution</h2>
              <p className="mb-4">
                The European Commission provides a platform for online dispute resolution (OS): 
                <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline ml-1">
                  https://ec.europa.eu/consumers/odr
                </a>
              </p>
              <p>
                We are not willing or obliged to participate in dispute resolution proceedings before a consumer arbitration board.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Liability for Content</h2>
              <p className="mb-4">
                As a service provider, we are responsible for our own content on these pages in accordance with general legislation pursuant to § 7 (1) TMG. 
                However, according to §§ 8 to 10 TMG, we are not obligated to monitor transmitted or stored third-party information or to investigate circumstances that indicate illegal activity.
              </p>
              <p className="mb-4">
                Obligations to remove or block the use of information under general law remain unaffected. However, liability in this regard is only possible from the point in time at which we become aware of a specific infringement. 
                Upon notification of such violations, we will remove this content immediately.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Liability for Links</h2>
              <p className="mb-4">
                Our website contains links to external third-party websites, over whose content we have no control. Therefore, we cannot accept any liability for this external content. 
                The respective provider or operator of the pages is always responsible for the content of the linked pages.
              </p>
              <p>
                The linked pages were checked for possible legal violations at the time of linking. Illegal content was not recognizable at the time of linking. 
                However, permanent monitoring of the content of the linked pages is not reasonable without concrete evidence of a violation. Upon notification of violations, we will remove such links immediately.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Copyright</h2>
              <p className="mb-4">
                The content and works created by the site operators on these pages are subject to German copyright law. Duplication, processing, distribution, and any form of commercialization of such material beyond the scope of copyright law shall require the prior written consent of its respective author or creator.
              </p>
              <p className="mb-4">
                Downloads and copies of this site are only permitted for private, non-commercial use. Insofar as the content on this site was not created by the operator, the copyrights of third parties are respected. 
                In particular, third-party content is marked as such. Should you nevertheless become aware of a copyright infringement, please inform us accordingly. Upon notification of violations, we will remove such content immediately.
              </p>
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
export default Imprint;