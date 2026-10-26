/**
 * /privacy-policy — the IT-Recht-Kanzlei Data Protection Declaration
 * ("Privacy Policy 27 AUG 2026.txt"), Stand 27.08.2026. The text is
 * licensed and must stay unmodified: this file only structures it into
 * sections (numbered H2s), sub-headings and paragraphs. Generated from the
 * source file; re-generate rather than hand-edit when a new edition arrives.
 */
export const PATH = '/privacy-policy';

export const PRIVACY_META = {
  title: 'Privacy Policy | Germany Pension Refund',
  description:
    'Privacy policy of GermanyPensionRefund.com: what personal data we process, why, how long it is stored, and your rights under the GDPR.',
};

export const PRIVACY_TITLE = 'Data Protection Declaration';

export type PrivacyBlock =
  | { t: 'p'; x: string }
  | { t: 'h3'; x: string }
  | { t: 'ul'; items: string[] };

export interface PrivacySection {
  id: string;
  n: number;
  h2: string;
  blocks: PrivacyBlock[];
}

export const PRIVACY_SECTIONS: PrivacySection[] = [
  {
    id: 'information-on-the-collection-of-personal-data-and-contact-details-of-the-controller',
    n: 1,
    h2: 'Information on the Collection of Personal Data and Contact Details of the Controller',
    blocks: [
      {
        t: 'p',
        x: '1.1 We are pleased that you are visiting our website and thank you for your interest. On the following pages, we inform you about the handling of your personal data when using our website. Personal data is all data with which you can be personally identified.',
      },
      {
        t: 'p',
        x: '1.2 The controller in charge of data processing on this website, within the meaning of the General Data Protection Regulation (GDPR), is ATLAES GmbH, Kaskelstraße 46, 10317 Berlin, Germany, Phone.: +49 30 49957826, e-mail: refund@germanypensionrefund.com. The controller in charge of the processing of personal data is the natural or legal person who alone or jointly with others determines the purposes and means of the processing of personal data.',
      },
    ],
  },
  {
    id: 'data-collection-when-you-visit-our-website',
    n: 2,
    h2: 'Data Collection When You Visit Our Website',
    blocks: [
      {
        t: 'p',
        x: '2.1 When using our website for information only, i.e. if you do not register or otherwise provide us with information, we only collect data that your browser transmits to our server (so-called "server log files"). When you visit our website, we collect the following data that is technically necessary for us to display the website to you:',
      },
      {
        t: 'ul',
        items: [
          'Our visited website',
          'Date and time at the moment of access',
          'Amount of data sent in bytes',
          'Source/reference from which you came to the page',
          'Browser used',
          'Operating system used',
          'IP address used (if applicable: in anonymized form)',
        ],
      },
      {
        t: 'p',
        x: 'Data processing is carried out in accordance with Art. 6 (1) point f GDPR on the basis of our legitimate interest in improving the stability and functionality of our website. The data will not be passed on or used in any other way. However, we reserve the right to check the server log files subsequently, if there are any concrete indications of illegal use.',
      },
      {
        t: 'p',
        x: '2.2 This website uses SSL or TLS encryption for security reasons and to protect the transmission of personal data and other confidential content (e.g. orders or inquiries to the controller). You can recognize an encrypted connection by the character string https:// and the lock symbol in your browser line.',
      },
    ],
  },
  {
    id: 'hosting-and-content-delivery-network',
    n: 3,
    h2: 'Hosting & Content Delivery Network',
    blocks: [
      {
        t: 'h3',
        x: 'Wix',
      },
      {
        t: 'p',
        x: 'For the hosting of our website and the display of the page content, we use the system of the following provider: Wix HQ, 6350671, Nemal Tel Aviv St 40, Tel Aviv-Yafo, Israel',
      },
      {
        t: 'p',
        x: 'Data is also transferred to: Wix Inc., 500 Terry A. Francois Boulevard, San Francisco, California 94158, USA',
      },
      {
        t: 'p',
        x: "All data collected on our website is processed on the provider's servers. We have concluded an order processing agreement with the provider, ensuring the protection of our site visitors' data and prohibiting unauthorised disclosure to third parties.",
      },
      {
        t: 'p',
        x: "In case of data transfer to the provider's location, an adequate level of data protection is guaranteed by an adequacy decision of the European Commission.",
      },
      {
        t: 'p',
        x: 'For data transfers to the USA, the provider participates in the EU-US Data Privacy Framework, which ensures compliance with the European level of data protection on the basis of an adequacy decision by the European Commission.',
      },
    ],
  },
  {
    id: 'cookies',
    n: 4,
    h2: 'Cookies',
    blocks: [
      {
        t: 'p',
        x: 'In order to make your visit to our website more attractive and to enable the use of certain functions, we use cookies, i.e. small text files that are stored on your end device. In some cases, these cookies are automatically deleted again after the browser is closed (so-called "session cookies"), in other cases, these cookies remain on your end device for longer and allow page settings to be saved (so-called "persistent cookies"). In the latter case, you can find the duration of the storage in the overview of the cookie settings of your web browser.',
      },
      {
        t: 'p',
        x: 'If personal data is also processed by individual cookies set by us, the processing is carried out either in accordance with Art. 6 (1) point b GDPR for the performance of the contract, in accordance with Art. 6 (1) point a GDPR in the case of consent given or in accordance with Art. 6 (1) point f GDPR to safeguard our legitimate interests in the best possible functionality of the website as well as a customer-friendly and effective design of the page visit.',
      },
      {
        t: 'p',
        x: 'You can set your browser in such a way that you are informed about the setting of cookies and you can decide individually about their acceptance or exclude the acceptance of cookies for certain cases or in general.',
      },
      {
        t: 'p',
        x: 'Please note that the functionality of our website may be limited if cookies are not accepted.',
      },
    ],
  },
  {
    id: 'contacting-us',
    n: 5,
    h2: 'Contacting Us',
    blocks: [
      {
        t: 'h3',
        x: '5.1 Wix Chat',
      },
      {
        t: 'p',
        x: 'This website uses a live chat system offered by the following provider: Wix HQ, 6350671, Nemal Tel Aviv St 40, Tel Aviv-Yafo, Israel',
      },
      {
        t: 'p',
        x: 'Data can also be transmitted to: Wix Inc., 500 Terry A. Francois Boulevard, San Francisco, California 94158, USA',
      },
      {
        t: 'p',
        x: 'The processing of personal data transmitted via chat is carried out either in accordance with Art. 6 (1) point b GDPR, to the extent necessary for the initiation or execution of the contract, or in accordance with Art. 6 (1) point f GDPR based on our legitimate interest in the effective support of our site visitors. Unless otherwise required by law, your data transmitted will be deleted once the relevant facts have been conclusively clarified. Furthermore, additional information may be collected and evaluated by means of cookies for the purpose of creating pseudonymised user profiles.',
      },
      {
        t: 'p',
        x: 'However, this information will not be used to identify you personally and will not be merged with other data records. To the extent this information has a personal reference, the processing is carried out in accordance with Art. 6 (1) point f GDPR based on our legitimate interest in the statistical analysis of user behaviour for optimisation purposes.',
      },
      {
        t: 'p',
        x: 'The placing of cookies may be prevented by appropriate browser settings. However, the functionality of our website may be restricted in such a case. You may object to the collection and storage of data for the purpose of creating a pseudonymised user profile at any time with effect for the future.',
      },
      {
        t: 'p',
        x: "We have concluded an order processing agreement with the provider, ensuring the protection of our site visitors' data and prohibiting unauthorised disclosure to third parties.",
      },
      {
        t: 'p',
        x: 'For data transfers to the USA, the provider participates in the EU-US Data Privacy Framework, which ensures compliance with the European level of data protection on the basis of an adequacy decision by the European Commission.',
      },
      {
        t: 'p',
        x: "In case of data transfer to the provider's location, an adequate level of data protection is guaranteed by an adequacy decision of the European Commission.",
      },
      {
        t: 'h3',
        x: '5.2 Our Own Evaluation Reminder',
      },
      {
        t: 'p',
        x: 'We use your e-mail address exclusively based on your express consent in accordance with Art. 6 (1) point a GDPR for a one-time reminder to submit a rating of your order. You can revoke your consent at any time by sending a message to the data controller.',
      },
      {
        t: 'h3',
        x: '5.3 Trustpilot',
      },
      {
        t: 'p',
        x: 'For rating reminders, we use the services offered by the following provider: Trustpilot A/S, Pilestræde 58, 1112 Copenhagen, Denmark',
      },
      {
        t: 'p',
        x: 'We transmit your e-mail address and, if applicable, other customer data to the provider exclusively on the basis of your express consent in accordance with Art. 6 (1) point a GDPR to allow the provider to contact you by e-mail with a rating reminder.',
      },
      {
        t: 'p',
        x: 'You can revoke your consent at any time with effect for the future vis-à-vis us or the provider.',
      },
      {
        t: 'p',
        x: "We have concluded an order processing contract with the provider, ensuring the protection of our site visitors' data and prohibiting unauthorised disclosure to third parties.",
      },
      {
        t: 'h3',
        x: '5.4 Calendly',
      },
      {
        t: 'p',
        x: 'For the provision of an online appointment booking function, we use the services of the following provider: Calendly, LLC, BB&T Tower, 271 17th St NW, Atlanta, GA 30363, USA',
      },
      {
        t: 'p',
        x: 'For the purpose of making an appointment, your first name, surname and e-mail address (and telephone number, if a telephone appointment is requested) are collected in accordance with Art. 6 (1) point b GDPR and transferred to the provider in accordance with Art. 6 (1) point f GDPR on the basis of our legitimate interest in effective customer management and efficient appointment management and stored there for the purpose of organising the appointments.',
      },
      {
        t: 'p',
        x: 'After the appointment has been held or after the agreed appointment period has expired, your data will be deleted by the provider.',
      },
      {
        t: 'p',
        x: "We have concluded an order processing agreement with the provider, which ensures the protection of our website visitors' data and prohibits unauthorised disclosure to third parties.",
      },
      {
        t: 'p',
        x: 'For data transfers to the USA, the provider participates in the EU-US Data Privacy Framework, which ensures compliance with the European level of data protection on the basis of an adequacy decision by the European Commission.',
      },
      {
        t: 'h3',
        x: '5.5 WhatsApp Business',
      },
      {
        t: 'p',
        x: 'We offer visitors to our website the opportunity to contact us via the WhatsApp news service of WhatsApp Ireland Limited, 4 Grand Canal Square, Grand Canal Harbour, Dublin 2, Ireland. For this purpose we use the so-called "Business Version" of WhatsApp.',
      },
      {
        t: 'p',
        x: 'If you contact us via WhatsApp in connection with a specific business transaction (e.g. an order placed), we will store and use the mobile telephone number you use at WhatsApp and - if provided - your first name and surname in accordance with Art. 6 para. 1 lit. b. GDPR to process and answer your request. On the basis of the same legal basis, we will ask you via WhatsApp to provide further data (order number, customer number, address or e-mail address), if necessary, in order to be able to allocate your enquiry to a specific transaction.',
      },
      {
        t: 'p',
        x: 'If you use our WhatsApp contact for general enquiries (e.g. about the range of services, availability or our website), we will store and use the mobile phone number you use at WhatsApp and - if provided - your first and last name in accordance with Art. 6 Para. 1 lit. f GDPR on the basis of our justified interest in the efficient and prompt provision of the requested information.',
      },
      {
        t: 'p',
        x: 'Your data will always be used only to answer your request via WhatsApp. Your data will not be passed on to third parties.',
      },
      {
        t: 'p',
        x: 'Please note that WhatsApp Business gains access to the address book of the mobile device we use for this purpose and automatically transfers telephone numbers stored in the address book to a server of the parent company Meta Platforms Inc. in the USA. To operate our WhatsApp Business account, we use a mobile device whose address book stores only the WhatsApp contact data of those users who have also contacted us via WhatsApp.',
      },
      {
        t: 'p',
        x: 'This ensures that each person whose WhatsApp contact data is stored in our address book has already consented to the transmission of his WhatsApp telephone number from the address books of his chat contacts in accordance with Art. 6 Para. 1 lit. a GDPR when using the app on his device for the first time by accepting the WhatsApp terms of use. The transmission of data of such users who do not use WhatsApp and/or have not contacted us via WhatsApp is therefore excluded.',
      },
      {
        t: 'p',
        x: "For the purpose and scope of data collection and the further processing and use of data by WhatsApp, as well as your rights and setting options for protecting your privacy, please refer to WhatsApp's data protection information: https://www.whatsapp.com/legal/?eea=1#privacy-policy",
      },
      {
        t: 'p',
        x: 'In the course of the above-mentioned processing, data may be transferred to servers of Meta Platforms Inc. in the USA.',
      },
      {
        t: 'p',
        x: 'For data transfers to the USA, the provider participates in the EU-US Data Privacy Framework, which ensures compliance with the European level of data protection on the basis of an adequacy decision by the European Commission.',
      },
      {
        t: 'p',
        x: '5.6 When you contact us (e.g. via contact form or e-mail), personal data is collected. Which data is collected in the case of a contact form can be seen from the respective contact form. This data is stored and used exclusively for the purpose of responding to your request or for establishing contact and for the associated technical administration.',
      },
      {
        t: 'p',
        x: 'The legal basis for processing data is our legitimate interest in responding to your request in accordance with Art. 6 (1) point f GDPR. If your contact is aimed at concluding a contract, the additional legal basis for the processing is Art. 6 (1) point b GDPR. Your data will be deleted after final processing of your enquiry; this is the case if it can be inferred from the circumstances that the facts in question have been finally clarified, provided there are no legal storage obligations to the contrary.',
      },
    ],
  },
  {
    id: 'web-analysis-services',
    n: 6,
    h2: 'Web Analysis Services',
    blocks: [
      {
        t: 'h3',
        x: '6.1 Google Analytics 4',
      },
      {
        t: 'p',
        x: 'This website uses Google Analytics 4, a service provided by Google Ireland Limited, Gordon House, 4 Barrow St, Dublin, D04 E5W5, Ireland ("Google"), which can be used to analyze the use of websites.',
      },
      {
        t: 'p',
        x: 'When using Google Analytics 4, so-called "cookies" are used as standard. Cookies are text files that are stored on your terminal device and enable an analysis of your use of a website. The information collected by cookies about your use of the website (including the IP address transmitted by your terminal device, shortened by the last digits, see below) is usually transmitted to a Google server and stored and processed there. This may also result in the transmission of information to the servers of Google LLC, a company based in the USA, where the information is further processed.',
      },
      {
        t: 'p',
        x: 'When using Google Analytics 4, the IP address transmitted by your terminal device when you use the website is always collected and processed by default and automatically only in an anonymized manner, so that a direct personal reference of the collected information is excluded. This automatic anonymization is carried out by shortening the IP address transmitted by your terminal device by Google within member states of the European Union (EU) or other contracting states of the Agreement on the European Economic Area (EEA) by the last digits.',
      },
      {
        t: 'p',
        x: 'On our behalf, Google uses this and other information to evaluate your use of the website, to compile reports (reports) on your website activities or your usage behavior and to provide us with other services related to your website usage and internet usage. In this context, the IP address transmitted and shortened by your terminal device within the scope of Google Analytics 4 will not be merged with other data from Google. The data collected in the context of the use of Google Analytics 4 will be retained for 2 months and then deleted.',
      },
      {
        t: 'p',
        x: 'Google Analytics 4 also enables the creation of statistics with statements about age, gender and interests of website users on the basis of an evaluation of interest-based advertising and with the involvement of third-party information via a special function, the so-called "demographic characteristics". This makes it possible to determine and distinguish between groups of website users for the purpose of targeting marketing measures. However, data collected via the "demographic characteristics" cannot be assigned to a specific person and thus not to you personally. This data collected via the "demographic characteristics" function is retained for two months and then deleted.',
      },
      {
        t: 'p',
        x: 'All processing described above, in particular the setting of Google Analytics cookies for the storage and reading of information on the terminal device used by you for the use of the website, will only take place if you have given us your express consent for this in accordance with Art. 6 para. 1 letter a GDPR. Without your consent, Google Analytics 4 will not be used during your use of the website.',
      },
      {
        t: 'p',
        x: 'You can revoke your consent once given at any time with effect for the future. To exercise your revocation, please deactivate this service via the "Cookie Consent Tool" provided on the website.',
      },
      {
        t: 'h3',
        x: 'Google Signals',
      },
      {
        t: 'p',
        x: 'On this website, the "Google Signals" service can also be used as an extension of Google Analytics 4. With Google Signals, cross-device reports can be created by Google (so-called "cross-device tracking"). If you have activated "personalised ads" in your Google account settings and you have linked your internet-enabled devices to your Google account, Google can analyse user behaviour across devices and create database models based on this, provided you have given your consent to the use of Google Analytics in accordance with Art. 6 para. 1 letter a GDPR (see above). The logins and device types of all page visitors who were logged into a Google account and performed a conversion are taken into account. The data shows, among other things, on which device you first clicked on an ad and on which device the associated conversion took place. Insofar as Google Signals is used, we do not receive any personal data from Google, but only statistics compiled on the basis of Google Signals. You have the option of deactivating the "personalised ads" function in the settings of your Google account and thus turning off the cross-device analysis. To do this, follow the instructions on this page: https://support.google.com/ads/answer/2662922?hl=de',
      },
      {
        t: 'p',
        x: 'Further information can be found here: https://support.google.com/analytics/answer/7532985?hl=de',
      },
      {
        t: 'h3',
        x: 'User IDs',
      },
      {
        t: 'p',
        x: 'As an extension of Google Analytics 4, the "UserIDs" function can also be used on this website. By assigning individual UserIDs, we can have Google create cross-device reports (so-called "cross-device tracking"). This means that your usage behaviour can also be analysed across devices if you have given your corresponding consent to the use of Google Analytics in accordance with Art. 6 para. 1 letter a GDPR, if you have set up a personal account by registering on this website and are logged into your personal account on different end devices with your relevant login data. The data collected in this way shows, among other things, on which end device you clicked on an ad for the first time and on which end device the relevant conversion took place.',
      },
      {
        t: 'p',
        x: 'We have concluded a so-called data processing agreement with Google for our use of Google Analytics 4, by which Google is obliged to protect the data of our website users and not to pass it on to third parties.',
      },
      {
        t: 'p',
        x: 'For data transfers to the USA, the provider participates in the EU-US Data Privacy Framework, which ensures compliance with the European level of data protection on the basis of an adequacy decision by the European Commission.',
      },
      {
        t: 'p',
        x: 'Further legal information on Google Analytics 4 can be found here: https://policies.google.com/privacy?hl=en and https://business.safety.google/privacy/',
      },
      {
        t: 'p',
        x: "Details on the processing triggered by Google Analytics 4 and Google's handling of data from websites can be found here: https://policies.google.com/technologies/partner-sites",
      },
      {
        t: 'p',
        x: '6.2 This website uses the "Google Tag Manager", a service of Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Ireland (hereinafter: "Google").',
      },
      {
        t: 'p',
        x: 'The Google Tag Manager provides a technical basis for bundling various web applications, including tracking and analysis services, and for calibrating, controlling and attaching conditions to them via a uniform user interface.',
      },
      {
        t: 'p',
        x: 'Google Tag Manager itself does not store any information on user end devices or read them. The service also does not perform any independent data analyses.',
      },
      {
        t: 'p',
        x: 'However, the Google Tag Manager transmits your IP address to Google when you visit a page and may store it there. Also a transmission to servers of Google LLC in the USA is possible.',
      },
      {
        t: 'p',
        x: 'All processing described above, in particular the reading or saving of information on the end device used, is only carried out if you have given us your express consent in accordance with Art. 6 (1) point a GDPR. You can revoke your consent at any time with effect for the future by deactivating this service in the "cookie consent tool" provided on the website.',
      },
      {
        t: 'p',
        x: "We have concluded an order processing agreement with the provider, which ensures the protection of our website visitors' data and prohibits unauthorised disclosure to third parties.",
      },
      {
        t: 'p',
        x: "Further information on Google's privacy standards can be found here: https://business.safety.google/privacy/",
      },
      {
        t: 'p',
        x: 'For data transfers to the USA, the provider participates in the EU-US Data Privacy Framework, which ensures compliance with the European level of data protection on the basis of an adequacy decision by the European Commission.',
      },
      {
        t: 'h3',
        x: '6.3 Microsoft Clarity',
      },
      {
        t: 'p',
        x: 'This website uses the web analytics service provided by the following provider: Microsoft Corporation, One Microsoft Way, Redmond, WA 98052-6399 USA',
      },
      {
        t: 'p',
        x: 'Using cookies and/or comparable technologies (tracking pixels, web beacons, algorithms for reading end device and browser information), the service collects and stores pseudonymised visitor data, including information on the end device used such as the IP address and browser information, in order to evaluate it for statistical analyses of user behaviour on our website and to create pseudonymised user profiles. Among other things, this enables the analysis of movement patterns (so-called heat maps), which show the duration of page visits and interactions with page content (e.g. text entries, scrolling, clicks and mouse-overs). Pseudonymisation generally excludes the possibility of direct personal reference. Your personal data will not be combined with data collected in any other way.',
      },
      {
        t: 'p',
        x: 'All processing described above, in particular the reading or saving of information on the end device used, is only carried out if you have given us your express consent in accordance with Art. 6 (1) point a GDPR. You can revoke your consent at any time with effect for the future by deactivating this service in the "cookie consent tool" provided on the website.',
      },
      {
        t: 'p',
        x: "We have concluded an order processing agreement with the provider, which ensures the protection of our website visitors' data and prohibits unauthorised disclosure to third parties.",
      },
      {
        t: 'p',
        x: 'For data transfers to the USA, the provider participates in the EU-US Data Privacy Framework, which ensures compliance with the European level of data protection on the basis of an adequacy decision by the European Commission.',
      },
    ],
  },
  {
    id: 'retargeting-remarketing-referral-advertising',
    n: 7,
    h2: 'Retargeting/Remarketing/ Referral Advertising',
    blocks: [
      {
        t: 'h3',
        x: '7.1 Meta Pixel',
      },
      {
        t: 'p',
        x: 'Within our online offering, we use the "Meta Pixel" service of the following provider: Meta Platforms Ireland Limited, 4 Grand Canal Square, Dublin 2, Ireland ("Meta")',
      },
      {
        t: 'p',
        x: 'If a user clicks on an advert placed by us on Facebook and/or Instagram, "Meta Pixel" is used to add a parameter to the URL of our linked page. This URL parameter is then entered into the user\'s browser after redirection by a cookie that our linked page sets itself.',
      },
      {
        t: 'p',
        x: 'This makes it possible for Meta to determine the visitors to our online offering as a target group for the display of adverts. Accordingly, we use the service to display the Facebook and/or Instagram ads placed by us only to those users who have also shown an interest in our online offering or who have certain characteristics (e.g. interests in certain topics or products determined on the basis of the websites visited), which we transmit to Meta (so-called "custom audiences").',
      },
      {
        t: 'p',
        x: 'On the other hand, the "Meta Pixel" can be used to track whether users have been redirected to our website after clicking on an advert and what actions they take there (so-called "conversion tracking").',
      },
      {
        t: 'p',
        x: 'The data collected is anonymous to us and therefore does not allow us to draw any conclusions about the identity of users. However, the data is stored and processed by Meta so that a connection to the respective user profile is possible and Meta can use the data for its own advertising purposes.',
      },
      {
        t: 'p',
        x: 'All processing described above, in particular the setting of cookies for reading information on the terminal device used, will only be carried out if you have given us your express consent to do so in accordance with Art. 6 para. 1 lit. a GDPR. You can revoke your consent at any time with effect for the future by deactivating this service in the "cookie consent tool" provided on the website.',
      },
      {
        t: 'p',
        x: 'We have concluded an order processing contract with the provider, which ensures the protection of the data of our website visitors and prohibits unauthorised disclosure to third parties.',
      },
      {
        t: 'p',
        x: 'The information generated by Meta is usually transferred to a Meta server and stored there; in this context, it may also be transferred to servers of Meta Platforms Inc. in the USA.',
      },
      {
        t: 'p',
        x: 'For data transfers to the USA, the provider has joined the EU-US Data Privacy Framework, which ensures compliance with the European level of data protection on the basis of an adequacy decision by the European Commission.',
      },
      {
        t: 'h3',
        x: '7.2 Google Ads Remarketing',
      },
      {
        t: 'p',
        x: 'This website uses the online advertising program "Google Ads" and, within the scope of Google Ads, the conversion tracking of Google Ireland Limited, Gordon House, 4 Barrow St, Dublin, D04 E5W5, Ireland ("Google"). We use Google Ads to draw attention to our attractive offers on external websites with the help of advertising media (so-called Google Adwords). We can determine how successful the individual advertising measures are in relation to the data of the advertising campaigns. In this way, we pursue the concern of showing you advertising that is of interest to you, making our website more interesting for you and achieving a fair calculation of the advertising costs incurred',
      },
      {
        t: 'p',
        x: 'The conversion tracking cookie is set when a user clicks on an ad placed by Google. Cookies are small text files that are stored on your terminal device. These cookies usually lose their validity after 30 days and are not used for personal identification. If the user visits certain pages of this website and the cookie has not yet expired, Google and we can recognize if the user has clicked on the ad and has been directed to this page. Each Google Ads customer receives a different cookie. Cookies therefore cannot be tracked across Google Ads customers’ websites. The information obtained using the conversion cookie is used to create conversion statistics for Google Ads customers who have chosen conversion tracking. Customers learn the total number of users who clicked on their ad and who were redirected to a page tagged with a conversion tracking tag. However, they do not receive any information that can be used to personally identify users. The use of Google Ads may also result in the transmission of personal data to the servers of Google LLC. in the USA.',
      },
      {
        t: 'p',
        x: "Details on the processing operations initiated by Google Ads conversion tracking and on Google's handling of data collected from websites can be found here: https://policies.google.com/technologies/partner-sites?hl=en",
      },
      {
        t: 'p',
        x: 'All processing described above, in particular the setting of cookies for the reading of information on the end device used, will only be carried out if you have given us your express consent to do so in accordance with Art. 6 (1) point a GDPR. Without this consent, Google Conversion Tracking will not be used during your visit to the website.',
      },
      {
        t: 'p',
        x: 'You can permanently disable the setting of cookies by Google Ads Conversion Tracking for advertising preferences. You may download and install the browser plug-in available at the following link: https://support.google.com/ads/answer/7395996?',
      },
      {
        t: 'p',
        x: 'Please note that certain functions of this website may not be available or may be restricted if you have deactivated the use of cookies.',
      },
      {
        t: 'p',
        x: 'Further information about Google’s privacy policy can be found here: https://www.google.com/policies/technologies/ads/ and https://business.safety.google/privacy/',
      },
      {
        t: 'p',
        x: 'For data transfers to the USA, the provider participates in the EU-US Data Privacy Framework, which ensures compliance with the European level of data protection on the basis of an adequacy decision by the European Commission.',
      },
      {
        t: 'h3',
        x: '7.3 Google Ads Conversion-Tracking',
      },
      {
        t: 'p',
        x: 'This website uses the online advertising program "Google Ads" and, within the framework of Google Ads, the conversion tracking of Google Ireland Limited, Gordon House, 4 Barrow St, Dublin, D04 E5W5, Ireland ("Google"). We use Google Ads to draw attention to our attractive offers on external websites with the help of advertising media (so-called Google Adwords). We can determine how successful the individual advertising measures are in relation to the data of the advertising campaigns. Our aim is to show you advertising that is of interest to you, to make our website more interesting for you and to achieve a fair calculation of the advertising costs incurred.',
      },
      {
        t: 'p',
        x: "The conversion tracking cookie is set when a user clicks on an ad placed by Google. Cookies are small text files that are stored on your end device. These cookies usually lose their validity after 30 days and are not used for personal identification. If the user visits certain pages of this website and the cookie has not yet expired, Google and we can recognize that the user clicked on the ad and was redirected to this page. Each Google Ads customer receives a different cookie. Cookies cannot therefore be tracked across Google Ads clients' websites. The information obtained using the conversion cookie is used to create conversion statistics for Google Ads customers who have opted in to conversion tracking. Clients learn the total number of users who clicked on their ad and were redirected to a page tagged with a conversion tracking tag. However, they do not receive any information that can be used to personally identify users. The use of Google Ads may also result in the transmission of personal data to the servers of Google LLC. in the USA.",
      },
      {
        t: 'p',
        x: "Details on the processing triggered by Google Ads Conversion Tracking and on Google's handling of data from websites can be found here: https://policies.google.com/technologies/partner-sites.",
      },
      {
        t: 'p',
        x: 'All of the processing described above, in particular the setting of cookies for reading out information on the end device used, will only be carried out if you have given us your express consent to do so in accordance with Art. 6 (1) a GDPR. You can revoke your consent at any time with effect for the future by deactivating this service in the "Cookie Consent Tool" provided on the website.',
      },
      {
        t: 'p',
        x: 'You can also permanently object to the setting of cookies by Google Ads conversion tracking by downloading and installing the Google browser plug-in available at the following link:',
      },
      {
        t: 'p',
        x: 'https://www.google.com/settings/ads/plugin?hl=en',
      },
      {
        t: 'p',
        x: 'Please note that certain functions of this website may not be available or may be restricted if you have deactivated the use of cookies.',
      },
      {
        t: 'p',
        x: "Further information on Google's privacy standards can be found here: https://policies.google.com/privacy and https://business.safety.google/privacy/",
      },
      {
        t: 'p',
        x: 'For data transfers to the USA, the provider participates in the EU-US Data Privacy Framework, which ensures compliance with the European level of data protection on the basis of an adequacy decision by the European Commission.',
      },
      {
        t: 'h3',
        x: '7.4 Google Marketing Platform',
      },
      {
        t: 'p',
        x: 'This website uses the online marketing tool Google Marketing Platform of the operator Google Ireland Limited, Gordon House, 4 Barrow St, Dublin, D04 E5W5, Ireland ("GMP").',
      },
      {
        t: 'p',
        x: 'GMP uses cookies to serve ads relevant to users, to improve campaign performance reports or to prevent a user from seeing the same ads more than once. Google uses a cookie ID to identify which ads are shown in which browser and to prevent them from being shown more than once.',
      },
      {
        t: 'p',
        x: "In addition, GMP can use cookie IDs to record so-called conversions that relate to ad requests. This is the case, for example, when a user sees a GMP advertisement and later, using the same browser, calls up the advertiser's website and makes a purchase via this website. According to Google, GMP cookies contain no personal information.",
      },
      {
        t: 'p',
        x: 'Due to the marketing tools used, your browser automatically establishes a direct connection with the Google server. We have no influence on the scope and further use of the data collected by Google through the use of these tools and therefore inform you as follows according to our state of knowledge: By integrating GMP, Google receives the information that you have called up the corresponding part of our website or clicked on an advertisement from us. If you are registered with a Google service, Google can allocate the visit to your account. Even if you are not registered with Google or have not logged in, it is possible that the provider will find out and save your IP address. In the context of the use of GMP, personal data may also be transmitted to the servers of Google LLC. in the USA.',
      },
      {
        t: 'p',
        x: 'All processing described above, in particular the reading of information on the end device used, is only carried out if you have given us your express consent to do so in accordance with Art. 6 (1) point a GPDR. Without this consent, GMP will not be used during your visit to the site.',
      },
      {
        t: 'p',
        x: 'You can revoke your consent at any time with effect for the future. To exercise your revocation, please deactivate this service in the "Cookie Consent Tool" provided on the website.',
      },
      {
        t: 'p',
        x: 'For data transfers to the USA, the provider participates in the EU-US Data Privacy Framework, which ensures compliance with the European level of data protection on the basis of an adequacy decision by the European Commission.',
      },
      {
        t: 'p',
        x: 'You can obtain further information about the data protection regulations of GMP by Google at the following Internet addresses: https://policies.google.com/privacy?gl=de&hl=en and https://business.safety.google/privacy/',
      },
      {
        t: 'h3',
        x: '7.5 Microsoft Advertising Universal Event Tracking',
      },
      {
        t: 'p',
        x: 'This website uses the conversion tracking technology of the following provider: Microsoft Corporation, One Microsoft Way, Redmond, WA 98052-6399, USA',
      },
      {
        t: 'p',
        x: "If you have accessed our website from an advertisement on the provider's domain, the success of the advertisement can be tracked with the help of cookies and/or comparable technologies (tracking pixels, web beacons, pings, or HTTP requests).",
      },
      {
        t: 'p',
        x: 'For this purpose, certain end device and browser information, including your IP address if applicable, is read via the tracking technology in order to record and evaluate user actions predefined by us (e.g., completed transactions, leads, search queries on the website, calls to product pages). This enables us to compile statistics on user behavior on our website after forwarding from an advertisement, which we use to optimize our offer.',
      },
      {
        t: 'p',
        x: 'All processing described above, in particular the setting of cookies for the reading of information on the end device used, will only be carried out if you have given us your express consent to do so in accordance with Art. 6 (1) point a GDPR. You can revoke your consent at any time with future effect by deactivating this service in the "cookie consent tool" provided on the website.',
      },
      {
        t: 'p',
        x: "We have concluded an order processing agreement with the provider, which ensures the protection of our site visitors' data and prohibits unauthorized disclosure to third parties.",
      },
      {
        t: 'p',
        x: 'For data transfers to the USA, the provider participates in the EU-US Data Privacy Framework, which ensures compliance with the European level of data protection on the basis of an adequacy decision by the European Commission.',
      },
    ],
  },
  {
    id: 'site-functionalities',
    n: 8,
    h2: 'Site functionalities',
    blocks: [
      {
        t: 'h3',
        x: '8.1 Provenexpert widget',
      },
      {
        t: 'p',
        x: 'Graphic elements of the following provider are integrated on our website to display external customer ratings and/or externally awarded quality marks: Expert Systems AG, Quedlinburger Straße 1, 10589 Berlin, Germany',
      },
      {
        t: 'p',
        x: "If you access a page of our website that contains such graphic elements, your browser establishes a direct connection to the provider's servers to load the elements properly. This involves the transmission of certain browser information, including your IP address, to the provider.",
      },
      {
        t: 'p',
        x: 'If personal data is processed in this context, this is done in accordance with Art. 6 (1) point f GDPR based on our legitimate interest in the optimal marketing of our offer and the appealing design of our website.',
      },
      {
        t: 'h3',
        x: '8.2 Google Maps',
      },
      {
        t: 'p',
        x: 'Our website uses Google Maps (AP’I) of Google Ireland Limited, Gordon House, 4 Barrow St, Dublin, D04 E5W5, Ireland (“Google”). Google Maps is a web service for displaying interactive (country) maps in order to display geographical information visually. Using this service will show you our location and will make it easier for you to find us.',
      },
      {
        t: 'p',
        x: 'When you access the sub-pages that contain the Google Maps map, information about your use of our website (such as your IP address) is transmitted to and stored by Google on servers. When using Google Maps, personal data may also be transmitted to the servers of Google LLC. in the USA. This is regardless of whether Google provides a user account that you are logged in with or whether no user account exists. If you are logged in to Google, your information will be directly associated with your account. If you do not wish to be associated with your profile on Google, you must log out before activating the button. Google saves your data (even for users who are not logged in) as usage profiles and evaluates them. Such an evaluation takes place according to Art. 6 (1) point f GDPR, on the basis of the legitimate interests of Google in the insertion of personalized advertising, market research and/or demand-oriented design of its website. You have the right to object to the creation of these user profiles. If you want to do so, you must contact Google to exercise this right.',
      },
      {
        t: 'p',
        x: 'If you do not agree to the future transmission of your data to Google in the context of using Google Maps, you may completely deactivate the Google Maps web service by switching off the JavaScript application in your browser. In this case, Google Maps as well as the map display on this website cannot be used.',
      },
      {
        t: 'p',
        x: 'The Google terms of use can be found at: https://policies.google.com/terms?hl=en. The additional terms of use can be found at: https://www.google.com/intl/en-US_US/help/terms_maps.html.',
      },
      {
        t: 'p',
        x: 'You can find detailed information on data protection in connection with the use of Google Maps on Google\'s website ("Google Privacy Policy") at: https://policies.google.com/privacy?hl=en.',
      },
      {
        t: 'p',
        x: 'To the extent required by law, we have obtained your consent to the processing of your data as described above in accordance with Art. 6 (1) point a GDPR. You can revoke your consent at any time with effect for the future. In order to exercise your revocation, please follow the procedure described above for submitting an objection.',
      },
      {
        t: 'p',
        x: 'For data transfers to the USA, the provider participates in the EU-US Data Privacy Framework, which ensures compliance with the European level of data protection on the basis of an adequacy decision by the European Commission.',
      },
      {
        t: 'p',
        x: "Further information on Google's privacy standards can be found here: https://business.safety.google/privacy/",
      },
      {
        t: 'h3',
        x: '8.3 Google reCAPTCHA',
      },
      {
        t: 'p',
        x: 'On this website, we use the CAPTCHA service of the following provider: Google Ireland Limited, Gordon House, 4 Barrow St, Dublin, D04 E5W5, Ireland',
      },
      {
        t: 'p',
        x: 'Data may also be transmitted to: Google LLC, USA. For the visual design of the CAPTCHA window, the provider uses "Google Fonts", i.e., fonts loaded from the Internet by Google. No further information is processed except that mentioned above, which is already transmitted to Google via the functionality of ReCaptcha.',
      },
      {
        t: 'p',
        x: "The service checks whether an input is made by a natural person or abusively by machine and automated processing with the aim of blocking spam, DDoS attacks and similar automated malicious attacks. To ensure whether an action is performed by a human being and not by an automated bot, the provider collects the IP address of the end device used, the recognition data of the browser, the operating system type and the date and duration of the visit and transmits these data to the provider's servers to be evaluated. This may involve the use of cookies, i.e. small text files that are stored in the browser of the end device.",
      },
      {
        t: 'p',
        x: 'If the processing described above is carried out on the basis of cookies, these will only be set if you have given us your express consent to do so in accordance with Art. 6 para. 1 lit. a GDPR. You can revoke your consent at any time with effect for the future by deactivating this service in the ‘cookie consent tool’ provided on the website.',
      },
      {
        t: 'p',
        x: 'If the processing described above is carried out without the use of cookies, the legal basis is our legitimate interest in determining individual responsibility on the Internet and avoiding misuse and spam in accordance with Art. 6 para. 1 lit. f GDPR.',
      },
      {
        t: 'p',
        x: "We have concluded an order processing contract with the provider, ensuring the protection of our site visitors' data and prohibiting unauthorized disclosure to third parties.",
      },
      {
        t: 'p',
        x: 'For data transfers to the USA, the provider participates in the EU-US Data Privacy Framework, which ensures compliance with the European level of data protection on the basis of an adequacy decision by the European Commission.',
      },
    ],
  },
  {
    id: 'tools-and-miscellaneous',
    n: 9,
    h2: 'Tools and Miscellaneous',
    blocks: [
      {
        t: 'p',
        x: 'This website uses a so-called "cookie consent tool" to obtain effective user consent for cookies and cookie-based applications that require consent. The "cookie consent tool" is displayed to users in the form of an interactive user interface when they access the page, on which consent for certain cookies and/or cookie-based applications can be given by ticking the appropriate box. Through the use of the tool, all cookies/services requiring consent are only loaded if the respective user provides the corresponding consent by ticking the corresponding box. This ensures that such cookies are only set on the respective end device of the user if consent has been granted.',
      },
      {
        t: 'p',
        x: 'The tool sets technically necessary cookies to save your cookie preferences. Personal user data is generally not processed.',
      },
      {
        t: 'p',
        x: 'If, in individual cases, personal data (such as the IP address) is processed for the purpose of storing, assigning or logging cookie settings, this is done in accordance with Art. 6 (1) point f GDPR on the basis of our legitimate interest in legally compliant, user-specific and user-friendly consent management for cookies and thus in a legally compliant design of our website.',
      },
      {
        t: 'p',
        x: 'Further legal basis for the processing is Art. 6 (1) point c GDPR. As the responsible party, we are subject to the legal obligation to make the use of technically unnecessary cookies dependent on the respective user consent.',
      },
      {
        t: 'p',
        x: 'Further information on the operator and the setting options of the cookie consent tool can be found directly in the corresponding user interface on our website.',
      },
    ],
  },
  {
    id: 'rights-of-the-data-subject',
    n: 10,
    h2: 'Rights of the Data Subject',
    blocks: [
      {
        t: 'p',
        x: '10.1 The applicable data protection law grants you the following comprehensive rights of data subjects (rights of information and intervention) vis-à-vis the data controller with regard to the processing of your personal data:',
      },
      {
        t: 'ul',
        items: [
          'Right of access by the data subject pursuant to Art. 15 GDPR;',
          'Right to rectification pursuant to Art. 16 GDPR;',
          'Right to erasure (“right to be forgotten”) pursuant to Art. 17 GDPR;',
          'Right to restriction of processing pursuant to Art. 18 GDPR;',
          'Right to be informed pursuant to Art. 19 GDPR;',
          'Right to data portability pursuant to Art. 20 GDPR;',
          'Right to withdraw a given consent pursuant to Art. 7 (3) GDPR;',
          'Right to lodge a complaint pursuant to Art. 77 GDPR.',
        ],
      },
      {
        t: 'h3',
        x: '10.2 RIGHT TO OBJECT',
      },
      {
        t: 'p',
        x: 'IF, WITHIN THE FRAMEWORK OF A CONSIDERATION OF INTERESTS, WE PROCESS YOUR PERSONAL DATA ON THE BASIS OF OUR PREDOMINANT LEGITIMATE INTEREST, YOU HAVE THE RIGHT AT ANY TIME TO OBJECT TO THIS PROCESSING WITH EFFECT FOR THE FUTURE ON THE GROUNDS THAT ARISE FROM YOUR PARTICULAR SITUATION.',
      },
      {
        t: 'p',
        x: 'IF YOU EXERCISE YOUR RIGHT TO OBJECT, WE WILL STOP PROCESSING THE DATA CONCERNED. HOWEVER, WE RESERVE THE RIGHT TO FURTHER PROCESSING IF WE CAN PROVE COMPELLING REASONS WORTHY OF PROTECTION FOR PROCESSING WHICH OUTWEIGH YOUR INTERESTS, FUNDAMENTAL RIGHTS AND FREEDOMS, OR IF THE PROCESSING SERVES TO ASSERT, EXERCISE OR DEFEND LEGAL CLAIMS.',
      },
      {
        t: 'p',
        x: 'IF WE PROCESS YOUR PERSONAL DATA FOR DIRECT MARKETING PURPOSES, YOU HAVE THE RIGHT TO OBJECT AT ANY TIME TO THE PROCESSING OF YOUR PERSONAL DATA WHICH ARE USED FOR DIRECT MARKETING PURPOSES. YOU MAY EXERCISE THE OBJECTION AS DESCRIBED ABOVE.',
      },
      {
        t: 'p',
        x: 'IF YOU EXERCISE YOUR RIGHT TO OBJECT, WE WILL STOP PROCESSING THE DATA CONCERNED FOR DIRECT ADVERTISING PURPOSES.',
      },
    ],
  },
  {
    id: 'duration-of-storage-of-personal-data',
    n: 11,
    h2: 'Duration of Storage of Personal Data',
    blocks: [
      {
        t: 'p',
        x: 'The duration of the storage of personal data is based on the respective legal basis, the purpose of processing and - if relevant – on the respective legal retention period (e.g. commercial and tax retention periods).',
      },
      {
        t: 'p',
        x: 'If personal data is processed on the basis of an express consent pursuant to Art. 6 (1) point a GDPR, this data is stored until the data subject revokes his consent.',
      },
      {
        t: 'p',
        x: 'If there are legal storage periods for data that is processed within the framework of legal or similar obligations on the basis of Art. 6 (1) point b GDPR, this data will be routinely deleted after expiry of the storage periods if it is no longer necessary for the fulfillment of the contract or the initiation of the contract and/or if we no longer have a justified interest in further storage.',
      },
      {
        t: 'p',
        x: 'When processing personal data on the basis of Art. 6 (1) point f GDPR, this data is stored until the data subject exercises his right of objection in accordance with Art. 21 (1) GDPR, unless we can provide compelling grounds for processing worthy of protection which outweigh the interests, rights and freedoms of the data subject, or the processing serves to assert, exercise or defend legal claims.',
      },
      {
        t: 'p',
        x: 'If personal data is processed for the purpose of direct marketing on the basis of Art. 6 (1) point f GDPR, this data is stored until the data subject exercises his right of objection pursuant to Art. 21 (2) GDPR.',
      },
      {
        t: 'p',
        x: 'Unless otherwise stated in the information contained in this declaration on specific processing situations, stored personal data will be deleted if it is no longer necessary for the purposes for which it was collected or otherwise processed.',
      },
    ],
  },
];

/** Licence line and edition stamp — part of the text, kept verbatim. */
export const PRIVACY_FOOT: string[] = [
  'Copyright notice: This privacy policy has been created by the specialist lawyers of IT-Recht Kanzlei and is protected by copyright (https://www.it-recht-kanzlei.de)',
  'Stand: 27.08.2026, 07:22:19',
];
