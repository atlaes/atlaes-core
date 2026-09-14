import type { TemplateContext } from './template-engine';

/**
 * Test data from the client spec, section 12 ("Muster 2" = A-DIRECT,
 * addressee = provider, client payout). Verbatim.
 */
export const MUSTER_2: TemplateContext = {
  route: 'A',
  signer: 'DIRECT',
  addressee_type: 'provider',
  payout_target: 'client',
  send_copy: false,
  letter_date: '07.09.2026',
  letter_year: '2026',
  client_gender: 'f',
  client_full_name: 'Emily Carter',
  client_dob: '03.10.1986',
  client_address_block: '42 Maple Avenue\nLatham, NY 12110\nUSA',
  client_address_inline: '42 Maple Avenue, Latham, NY 12110, USA',
  client_city: 'Latham',
  client_email: 'emily.carter@example.com',
  client_signature: '[Unterschrift]',
  de_departure_date: '15.03.2021',
  residence_country: 'den USA',
  tax_id: '98 765 432 109',
  de_health_insurance_end_date: '15.03.2021',
  foreign_health_insurance_proof: true,
  employer_name: 'Beispielbank AG',
  employment_end_date: '28.02.2021',
  provider_name: 'BVV Versicherungsverein des Bankgewerbes a.G.',
  durchfuehrungsweg: 'Pensionskasse',
  contract_reference_label: 'Vertrags-Nr.',
  contract_reference: '1234567-8-9012',
  recipient_name: 'BVV Versicherungsverein des Bankgewerbes a.G.',
  recipient_department: '',
  recipient_street: 'Straße der Pariser Kommune 8',
  recipient_postal_code: '10243',
  recipient_city: 'Berlin',
  drv_office: 'Deutsche Rentenversicherung Bund',
  drv_decision_date: '02.07.2026',
  account_holder: 'Emily Carter',
  account_holder_is_client: true,
  iban: 'BE19 9056 9182 3912',
  bic: 'TRWIBEB1XXX',
  bank_name: 'Wise Europe SA',
  bank_address: 'Rue du Trône 100, 1050 Brüssel, Belgien',
  provider_form_enclosed: true,
  provider_form_title: 'Antrag auf Abfindung einer Rentenanwartschaft',
  employer_consent_enclosed: true,
  employment_end_proof: false,
  last_statement_enclosed: false,
  bank_proof: false,
};

/**
 * Expected A-DIRECT render of MUSTER_2, derived by hand from the template
 * and the rendering rules in spec section 2. To be cross-checked against
 * the client's reference PDF (CP_bAV_Abfindung_Musterschreiben_v1.0.pdf,
 * Muster 2) once we have it in the repo.
 */
export const MUSTER_2_A_DIRECT_EXPECTED = `Emily Carter
42 Maple Avenue
Latham, NY 12110
USA
E-Mail: emily.carter@example.com

BVV Versicherungsverein des Bankgewerbes a.G.
Straße der Pariser Kommune 8
10243 Berlin
Deutschland

Latham, den 07.09.2026

Antrag auf Abfindung meiner unverfallbaren Anwartschaft nach § 3 Abs. 3 BetrAVG nach erfolgter Erstattung der Beiträge zur gesetzlichen Rentenversicherung

Name: Emily Carter, geb. 03.10.1986
Vertrags-Nr.: 1234567-8-9012
Ehemaliger Arbeitgeber: Beispielbank AG

Sehr geehrte Damen und Herren,

mein Arbeitsverhältnis mit Beispielbank AG endete zum 28.02.2021. Aus diesem Arbeitsverhältnis besteht eine unverfallbare Anwartschaft auf Leistungen der betrieblichen Altersversorgung (Pensionskasse über BVV Versicherungsverein des Bankgewerbes a.G., Vertrags-Nr. 1234567-8-9012).

Die Deutsche Rentenversicherung hat mir auf meinen Antrag die Beiträge zur gesetzlichen Rentenversicherung nach § 210 SGB VI erstattet (Bescheid vom 02.07.2026, Deutsche Rentenversicherung Bund). Den Erstattungsbescheid füge ich in Kopie bei.

Hiermit verlange ich gemäß § 3 Abs. 3 BetrAVG die Abfindung meiner unverfallbaren Anwartschaft durch einmalige Kapitalzahlung.

Nach § 3 Abs. 3 BetrAVG ist die Anwartschaft auf Verlangen des Arbeitnehmers abzufinden, wenn die Beiträge zur gesetzlichen Rentenversicherung erstattet worden sind. Diese Voraussetzung ist erfüllt. Die Abfindung steht in diesem Fall nicht im Ermessen des Arbeitgebers oder des Versorgungsträgers; auf die Wertgrenzen des § 3 Abs. 2 BetrAVG kommt es nicht an. Die Vorschrift ist zwingendes Recht (§ 17 Abs. 3 Satz 3 BetrAVG) und kann weder durch die Versorgungsordnung noch durch Versicherungs- oder Satzungsbedingungen zu meinen Lasten abbedungen werden.

Die Höhe der Abfindung bemisst sich nach § 3 Abs. 5 i. V. m. § 4 Abs. 5 BetrAVG und entspricht dem im Zeitpunkt der Abfindung gebildeten Kapital. Die Abfindung ist gesondert auszuweisen und einmalig zu zahlen (§ 3 Abs. 6 BetrAVG). Ich bitte um Übersendung einer nachvollziehbaren Berechnung des Abfindungsbetrages.

Das von Ihnen vorgesehene Antragsformular „Antrag auf Abfindung einer Rentenanwartschaft“ habe ich ausgefüllt und unterschrieben beigefügt.

Soweit Sie für die Durchführung der Abfindung eine Erklärung meines ehemaligen Arbeitgebers vorsehen, ist diese beigefügt.

Bitte überweisen Sie den Abfindungsbetrag auf folgendes Konto:
Kontoinhaber: Emily Carter
IBAN: BE19 9056 9182 3912
BIC: TRWIBEB1XXX
Bank: Wise Europe SA, Rue du Trône 100, 1050 Brüssel, Belgien
Das Konto lautet auf meinen Namen.

Steuerliche Hinweise: Ich habe meinen Wohnsitz und gewöhnlichen Aufenthalt seit 15.03.2021 in den USA und bin in Deutschland nicht unbeschränkt steuerpflichtig. Meine steuerliche Identifikationsnummer lautet 98 765 432 109. Soweit die Abfindung dem Lohnsteuerabzug unterliegt, bitte ich um Prüfung, ob die Voraussetzungen der Tarifermäßigung nach § 34 Abs. 1, Abs. 2 Nr. 4 EStG vorliegen, und um gesonderten Ausweis der Abfindung als Vergütung für eine mehrjährige Tätigkeit in der Lohnsteuerbescheinigung. Bitte übersenden Sie mir nach Auszahlung eine Abrechnung über den Abfindungsbetrag und die einbehaltenen Abzüge sowie die Lohnsteuerbescheinigung bzw. die Leistungsmitteilung nach § 22 Nr. 5 EStG.

Krankenversicherung: Ich bin seit 15.03.2021 nicht mehr in der deutschen gesetzlichen Krankenversicherung versichert. Beiträge zur gesetzlichen Kranken- und Pflegeversicherung aus dem Abfindungsbetrag (§ 229 SGB V) sind daher nicht einzubehalten; einen Nachweis über meine Krankenversicherung in den USA füge ich bei.

Korrespondenz: Da ich im Ausland lebe, bitte ich Sie, sämtliche Korrespondenz in dieser Angelegenheit – insbesondere Eingangsbestätigung, Rückfragen, Abrechnung, Bescheid über die Abfindung und die steuerlichen Bescheinigungen – an meine Postempfangsbevollmächtigte zu richten:

Frau Anna Kliem
Kaskelstraße 46
10317 Berlin
Deutschland
E-Mail: assistenz.kliem@gmail.com

Die Postempfangsvollmacht ist beigefügt. Rückfragen können auch per E-Mail an Frau Kliem gerichtet werden oder direkt an mich (emily.carter@example.com).

Bitte bestätigen Sie den Eingang dieses Antrags sowie den voraussichtlichen Auszahlungstermin innerhalb von vier Wochen nach Zugang dieses Schreibens. Sollten Sie für die Bearbeitung weitere Unterlagen oder eigene Formulare benötigen, bitte ich um umgehende Mitteilung.

Mit freundlichen Grüßen

[Unterschrift]
Emily Carter

Anlagen
1. Erstattungsbescheid der Deutschen Rentenversicherung vom 02.07.2026 (Kopie)
2. Postempfangsvollmacht (Original)
3. Kopie Reisepass
4. Antragsformular „Antrag auf Abfindung einer Rentenanwartschaft“ (ausgefüllt und unterschrieben)
5. Zustimmungserklärung des ehemaligen Arbeitgebers
6. Nachweis der Krankenversicherung in den USA`;
