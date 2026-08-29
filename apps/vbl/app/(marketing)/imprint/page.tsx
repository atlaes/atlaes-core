import type { Metadata } from 'next';
import { LegalPageHeader } from '@/components/marketing/LegalPageHeader';
import { LegalArticle } from '@/components/marketing/LegalArticle';

export const metadata: Metadata = {
  title: 'Imprint | CompanyPension',
};

// ---------------------------------------------------------------------------
// Company details follow the client-approved About page card (register court,
// HRB 242004 B, VAT ID DE335357879, info@companypension.de) and the ATLAES
// legal notice on germanypensionrefund.com. Content pending legal review —
// flagged in the task report.
// ---------------------------------------------------------------------------

export default function ImprintPage() {
  return (
    <>
      <LegalPageHeader
        eyebrow="Legal"
        title="Imprint"
        body="Provider identification in accordance with Section 5 of the German Digital Services Act (DDG)."
      />

      <LegalArticle>
        <h2>Information in accordance with Section 5 DDG</h2>
        <p>
          This website is operated under the brand{' '}
          <strong>CompanyPension</strong>.
        </p>
        <p>
          <strong>ATLAES GmbH</strong>
          <br />
          Kaskelstraße 46
          <br />
          10317 Berlin
          <br />
          Germany
        </p>
        <p>
          Phone: +49 30 49957826
          <br />
          Email:{' '}
          <a href="mailto:info@companypension.de">info@companypension.de</a>
        </p>
        <p>
          Managing directors (authorised representatives): Johannes Kühn and
          Anna Kliem
        </p>
        <p>
          Register court: Amtsgericht Charlottenburg
          <br />
          Register number: HRB 242004 B
          <br />
          VAT identification number: DE335357879
        </p>

        <h2>Responsible for content</h2>
        <p>
          ATLAES GmbH
          <br />
          Kaskelstraße 46
          <br />
          10317 Berlin, Germany
        </p>

        <h2>EU dispute resolution</h2>
        <p>
          The European Commission provides a platform for online dispute
          resolution (ODR):{' '}
          <a
            href="https://ec.europa.eu/consumers/odr"
            target="_blank"
            rel="noopener noreferrer"
          >
            https://ec.europa.eu/consumers/odr
          </a>
          . You can find our email address above in this imprint.
        </p>
        <p>
          We are not obliged and not willing to participate in dispute
          resolution proceedings before a consumer arbitration board.
        </p>

        <h2>Liability for content</h2>
        <p>
          As a service provider, we are responsible for our own content on these
          pages in accordance with general laws pursuant to Section 7 (1) DDG.
          In accordance with Sections 8 to 10 DDG, however, we are not obliged
          as a service provider to monitor transmitted or stored third-party
          information or to investigate circumstances that indicate illegal
          activity. Obligations to remove or block the use of information under
          general laws remain unaffected. Liability in this respect is only
          possible from the moment we become aware of a specific infringement.
          If we become aware of such infringements, we will remove the content
          in question immediately.
        </p>

        <h2>Liability for links</h2>
        <p>
          Our website contains links to external third-party websites over whose
          content we have no influence. We therefore cannot accept any liability
          for this third-party content; the respective provider or operator of
          the linked pages is always responsible for their content. The linked
          pages were checked for possible legal violations at the time of
          linking, and no illegal content was identifiable at that time.
          Permanent monitoring of the content of linked pages is not reasonable
          without concrete indications of an infringement. If we become aware of
          infringements, we will remove such links immediately.
        </p>

        <h2>Copyright</h2>
        <p>
          The content and works created by the site operator on these pages are
          subject to German copyright law. Reproduction, editing, distribution
          and any kind of exploitation outside the limits of copyright require
          the written consent of the respective author or creator. Downloads and
          copies of this site are only permitted for private, non-commercial
          use. Insofar as content on this site was not created by the operator,
          the copyrights of third parties are respected and third-party content
          is marked as such. Should you nevertheless become aware of a copyright
          infringement, please notify us; we will remove such content
          immediately upon becoming aware of any infringement.
        </p>
      </LegalArticle>
    </>
  );
}
