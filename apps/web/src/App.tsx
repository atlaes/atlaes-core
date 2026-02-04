import {
  Mail,
  MapPin,
  Building,
  Shield,
  CheckCircle,
  ExternalLink,
} from 'lucide-react';

function App() {
  return (
    <div className="min-h-screen bg-white">
      {/* JSON-LD Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Organization',
            name: 'ATLAES GmbH',
            url: 'https://www.atlaes.de/',
            logo: 'https://www.atlaes.de/Atlaes-Logo.png',
            legalName: 'ATLAES GmbH',
            address: {
              '@type': 'PostalAddress',
              streetAddress: 'Kaskelstr. 46',
              addressLocality: 'Berlin',
              postalCode: '10317',
              addressCountry: 'DE',
            },
            foundingDate: '2020',
            brand: {
              '@type': 'Brand',
              name: 'GermanyPensionRefund.com',
              url: 'https://www.germanypensionrefund.com/',
            },
            makesOffer: {
              '@type': 'Offer',
              category: 'Affiliate and Partner Programs',
              description:
                'ATLAES GmbH collaborates with affiliates, relocation partners, and digital service providers.',
              url: 'https://www.atlaes.de/#partners',
            },
          }),
        }}
      />

      {/* Sticky Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <img
                src="/Atlaes-Logo.png"
                alt="ATLAES Logo"
                className="h-8 w-auto"
              />
            </div>
            <nav className="hidden md:flex space-x-6">
              <a
                href="#about"
                className="text-gray-600 hover:text-blue-600 transition-colors"
              >
                About
              </a>
              <a
                href="#whatwedo"
                className="text-gray-600 hover:text-blue-600 transition-colors"
              >
                What We Do
              </a>
              <a
                href="#partners"
                className="text-gray-600 hover:text-blue-600 transition-colors"
              >
                Partners
              </a>
              <a
                href="#contact"
                className="text-gray-600 hover:text-blue-600 transition-colors"
              >
                Contact
              </a>
              <a
                href="#legal"
                className="text-gray-600 hover:text-blue-600 transition-colors"
              >
                Legal
              </a>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4 bg-gradient-to-b from-blue-50 to-white">
        <div className="container mx-auto text-center max-w-4xl">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Building trusted digital services that simplify official procedures
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            ATLAES develops and operates specialized platforms that digitize
            application and communication processes with German authorities,
            institutions, and private organizations — making bureaucracy easier
            for expats and partners worldwide.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <a
              href="https://www.germanypensionrefund.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors inline-flex items-center justify-center"
            >
              Visit GermanyPensionRefund.com
              <ExternalLink className="ml-2 w-4 h-4" />
            </a>
            <a
              href="#contact"
              className="border border-blue-600 text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
            >
              Contact Us
            </a>
          </div>
          <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-500">
            <span className="flex items-center">
              <CheckCircle className="w-4 h-4 mr-1 text-green-600" />
              Registered in Germany
            </span>
            <span className="flex items-center">
              <CheckCircle className="w-4 h-4 mr-1 text-green-600" />
              Law-firm escrow partnerships
            </span>
            <span className="flex items-center">
              <CheckCircle className="w-4 h-4 mr-1 text-green-600" />
              GDPR-first
            </span>
            <span className="flex items-center">
              <CheckCircle className="w-4 h-4 mr-1 text-green-600" />
              Transparent fees
            </span>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-20 px-4">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-900">
            Who We Are
          </h2>
          <div className="prose prose-lg mx-auto text-gray-600 text-center">
            <p className="text-xl mb-6">
              ATLAES GmbH is a Berlin-based company specializing in the digital
              transformation of administrative procedures.
            </p>
            <p className="mb-8">
              We create compliant, user-friendly services that make official
              processes accessible and efficient.
            </p>

            <h3 className="text-2xl font-semibold mb-6 text-gray-900">
              Key facts
            </h3>
            <ul className="space-y-3 text-left max-w-md mx-auto">
              <li className="flex items-start">
                <Building className="w-5 h-5 mr-3 mt-0.5 text-blue-600 flex-shrink-0" />
                <span>
                  Registered in Germany (HRB 242004, AG Berlin-Charlottenburg)
                </span>
              </li>
              <li className="flex items-start">
                <Shield className="w-5 h-5 mr-3 mt-0.5 text-blue-600 flex-shrink-0" />
                <span>VAT ID DE 352845957</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="w-5 h-5 mr-3 mt-0.5 text-green-600 flex-shrink-0" />
                <span>GDPR-first operations</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="w-5 h-5 mr-3 mt-0.5 text-green-600 flex-shrink-0" />
                <span>Partnerships with licensed German law firms</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="w-5 h-5 mr-3 mt-0.5 text-green-600 flex-shrink-0" />
                <span>Transparent, success-based service models</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* What We Do Section */}
      <section id="whatwedo" className="py-20 px-4 bg-gray-50">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-900">
            What We Do
          </h2>
          <div className="prose prose-lg mx-auto text-gray-600 text-center">
            <p className="text-xl mb-6">
              ATLAES develops and operates online platforms that turn
              paper-based procedures into secure digital workflows.
            </p>
            <p className="mb-8">
              <a
                href="https://www.germanypensionrefund.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 font-semibold"
              >
                GermanyPensionRefund.com
              </a>{' '}
              is one example — a trusted service helping former residents
              reclaim their German pension contributions online.
            </p>
            <p>
              In cooperation with legal and technology partners, ATLAES
              continues to expand its digital solutions that modernize
              interactions with authorities and institutions.
            </p>
          </div>
        </div>
      </section>

      {/* Partners Section */}
      <section id="partners" className="py-20 px-4">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-900">
            Partner with Us
          </h2>
          <div className="prose prose-lg mx-auto text-gray-600 mb-12 text-center">
            <p className="text-xl mb-6">
              ATLAES collaborates with relocation firms, digital service
              providers and affiliate partners worldwide.
            </p>
            <p className="mb-8">
              We offer transparent cooperation models, white-label integrations
              and affiliate programs.
            </p>
          </div>

          {/* Contact Information */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 text-center">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              Get in Touch
            </h3>
            <p className="text-gray-600 mb-6">
              Ready to partner with us? Contact us directly to discuss
              opportunities.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="mailto:info@atlaes.de"
                className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors inline-flex items-center justify-center"
              >
                <Mail className="w-4 h-4 mr-2" />
                info@atlaes.de
              </a>
              <a
                href="mailto:partners@atlaes.de"
                className="border border-blue-600 text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors inline-flex items-center justify-center"
              >
                <Mail className="w-4 h-4 mr-2" />
                partners@atlaes.de
              </a>
            </div>
            <p className="text-sm text-gray-500 mt-4">
              We'll respond within two business days
            </p>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-20 px-4 bg-gray-50">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-900">
            Contact
          </h2>
          <div className="text-center space-y-6">
            <div className="flex items-center justify-center">
              <Mail className="w-5 h-5 mr-3 text-blue-600" />
              <a
                href="mailto:info@atlaes.de"
                className="text-blue-600 hover:text-blue-800 font-semibold"
              >
                info@atlaes.de
              </a>
            </div>
            <div className="flex items-center justify-center">
              <MapPin className="w-5 h-5 mr-3 text-blue-600" />
              <span className="text-gray-700">
                ATLAES GmbH, Kaskelstr. 46, 10317 Berlin, Germany
              </span>
            </div>
            <div className="text-gray-600 space-y-2">
              <p>
                Commercial Registration no.: HRB 242004, District Court Berlin
                (Charlottenburg)
              </p>
              <p>VAT ID: DE 352845957</p>
              <p>Managing Directors: Johannes Kühn & Anna Kliem</p>
            </div>
          </div>
        </div>
      </section>

      {/* Legal & Privacy Section */}
      <section id="legal" className="py-20 px-4">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-900">
            Legal & Privacy
          </h2>

          <div className="space-y-12">
            <div>
              <h3 className="text-2xl font-semibold mb-6 text-gray-900">
                Impressum
              </h3>
              <div className="prose prose-lg text-gray-600">
                <p>
                  <strong>ATLAES GmbH</strong>
                </p>
                <p>
                  Kaskelstr. 46
                  <br />
                  10317 Berlin, Germany
                </p>
                <p>Email: info@atlaes.de</p>
                <p>Represented by: Johannes Kühn & Anna Kliem</p>
                <p>
                  Register Court: Berlin-Charlottenburg
                  <br />
                  HRB 242004
                  <br />
                  VAT ID: DE 352845957
                </p>
              </div>
            </div>

            <div>
              <h3 className="text-2xl font-semibold mb-6 text-gray-900">
                Privacy
              </h3>
              <div className="prose prose-lg text-gray-600">
                <p>
                  This website does not collect personal data. For any privacy
                  inquiries, please contact us at{' '}
                  <a
                    href="mailto:privacy@atlaes.de"
                    className="text-blue-600 hover:text-blue-800"
                  >
                    privacy@atlaes.de
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 px-4">
        <div className="container mx-auto text-center">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <p>&copy; ATLAES GmbH • Berlin</p>
            <div className="flex space-x-6">
              <a
                href="#legal"
                className="hover:text-blue-400 transition-colors"
              >
                Impressum
              </a>
              <a
                href="#legal"
                className="hover:text-blue-400 transition-colors"
              >
                Privacy
              </a>
            </div>
            <div className="flex space-x-6">
              <a
                href="mailto:info@atlaes.de"
                className="hover:text-blue-400 transition-colors"
              >
                info@atlaes.de
              </a>
              <a
                href="https://www.germanypensionrefund.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-blue-400 transition-colors"
              >
                GermanyPensionRefund.com
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
