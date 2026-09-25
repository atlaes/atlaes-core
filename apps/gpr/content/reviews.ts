/**
 * Homepage review cards — the "current cards (10)" snapshot from the
 * Homepage Build Sheet (8 Sep 2026). On the new platform this becomes the
 * scheduled reviews snapshot; until then the ten cards live here verbatim.
 * Fields per card: country flag, reviewer name + profile link, date, title,
 * text, source link. Review links use clean canonical URLs.
 */
export interface ReviewCard {
  flag: string;
  name: string;
  profileUrl: string;
  /** ISO date (YYYY-MM-DD). */
  date: string;
  title: string;
  text: string;
  sourceLabel: string;
  sourceUrl: string;
}

const GOOGLE = 'Google Reviews';

export const REVIEWS: ReviewCard[] = [
  {
    flag: '🇮🇳',
    name: 'Sai Vardhan (varu)',
    profileUrl:
      'https://www.google.com/maps/contrib/112822694425034960928/reviews',
    date: '2026-08-20',
    title: 'A pleasure having assistance',
    text: 'Thank you for your support. It was pleasure having assistance from you to get my pension fund .',
    sourceLabel: GOOGLE,
    sourceUrl: 'https://maps.app.goo.gl/8x7W18F8cKeWv5fX9',
  },
  {
    flag: '🇵🇭',
    name: 'arjay mendoza',
    profileUrl:
      'https://www.google.com/maps/contrib/114034781296192099338/reviews',
    date: '2026-08-18',
    title: 'Fast, efficient, extremely happy',
    text: "⭐⭐⭐⭐⭐ Excellent Service! I'm extremely happy with the service I received from Germany Pension Refund. The entire process was fast, efficient, and professional from start to finish. Everything was handled smoothly, and their team was always helpful and responsive whenever I had questions. I'm very grateful for their support and for making the whole refund process so easy and stress-free. I highly recommend their service to anyone looking for a reliable and professional company. Thank you very much for your excellent service! 🙏",
    sourceLabel: GOOGLE,
    sourceUrl: 'https://maps.app.goo.gl/rxWsTDpiPSbMQz3S6',
  },
  {
    flag: '🇮🇳',
    name: 'Rahul Sawant',
    profileUrl:
      'https://www.google.com/maps/contrib/101506118942059282551/reviews',
    date: '2026-08-10',
    title: 'Very smooth, faster than I expected',
    text: 'Excellent service and a very smooth experience with my Germany pension refund. The entire process was hassle-free and well coordinated. Christian was extremely helpful, communicated clearly, and provided timely updates throughout. The process was also completed much faster than I expected. Really happy with the service and would definitely recommend it to anyone looking for assistance with their pension refund.',
    sourceLabel: GOOGLE,
    sourceUrl: 'https://maps.app.goo.gl/jxoQ81RoXFDsN8YdA',
  },
  {
    flag: '🇮🇷',
    name: 'Ghazaal Sheikhi',
    profileUrl:
      'https://www.google.com/maps/contrib/113485435746883147483/reviews',
    date: '2026-08-06',
    title: 'I always felt looked after',
    text: 'From start to finish, the process was straightforward thanks to their support and efforts. Julia is skilled, knowledgeable, and responsive, and I always felt well looked after. Highly recommended.',
    sourceLabel: GOOGLE,
    sourceUrl: 'https://maps.app.goo.gl/VcJ6aNybK9t6asEC7',
  },
  {
    flag: '🇺🇸',
    name: 'Nikonn Prod',
    profileUrl:
      'https://www.google.com/maps/contrib/117240758507549133823/reviews',
    date: '2026-08-20',
    title: 'Very professional',
    text: 'Very professional, recommended',
    sourceLabel: GOOGLE,
    sourceUrl: 'https://maps.app.goo.gl/zR7ahgDtXc2MRTxDA',
  },
  {
    flag: '🇳🇬',
    name: 'Kingsley Nnorom',
    profileUrl:
      'https://www.google.com/maps/contrib/107129579622303337767/reviews',
    date: '2026-08-17',
    title: 'Amazing, exceptional',
    text: 'Julia was amazing! Dealt with all questions professionally. When there was a mistake on the documentation, they refiled it at no extra charge. Refund was successfully processed. These guys are exceptional and I highly recommend them.',
    sourceLabel: GOOGLE,
    sourceUrl: 'https://maps.app.goo.gl/74XekSqUhhgEsMz66',
  },
  {
    flag: '🇧🇷',
    name: 'Beethoven Costa',
    profileUrl:
      'https://www.google.com/maps/contrib/105852830577156517696/reviews',
    date: '2026-08-07',
    title: '100% recommend',
    text: 'Johannes and his team have been very polite and professional since our first chat. He has set the correct expectations and after a couple of months my wife and me got the refund with the right amount. 100% recommended.',
    sourceLabel: GOOGLE,
    sourceUrl: 'https://maps.app.goo.gl/w3K2nBr3ENHLHtY66',
  },
  {
    flag: '🇮🇩',
    name: 'Laksita Gayuhaningtyas',
    profileUrl:
      'https://www.google.com/maps/contrib/109292870585236850143/reviews',
    date: '2026-08-20',
    title: 'Proactive',
    text: 'very professional and proactively following up to the related counter party.',
    sourceLabel: GOOGLE,
    sourceUrl: 'https://maps.app.goo.gl/Pgrv8A9BbJr1W4wSA',
  },
  {
    flag: '🇪🇬',
    name: 'Ashraf Kasem',
    profileUrl:
      'https://www.google.com/maps/contrib/108442187089131143428/reviews',
    date: '2026-08-15',
    title: 'Refund in 1 month, highly recommend',
    text: 'Highly recommended. I am outside Germany now, contacted them with hesitant, but honestly since the first reply arrived i felt the high level of professionality. I got my total refund in almost 1 month. the support and information i got from the them in the end-to-end process is top notch. their pricing was very clear upfront, nothing hidden. I highly recommend them without any reservations.',
    sourceLabel: GOOGLE,
    sourceUrl: 'https://maps.app.goo.gl/wSuLmLiyJGWACTjE9',
  },
  {
    flag: '🇮🇳',
    name: 'Rahul Karmarkar',
    profileUrl:
      'https://www.google.com/maps/contrib/105178843718177377303/reviews',
    date: '2026-08-06',
    title: 'Well organized, excellent',
    text: 'Excellent service provided by the team! I was associated with Julia, who guided me through every step of the process with great professionalism. The entire process was well organized, the documentation requirements were simple, and everything was handled efficiently. It was completely hassle-free process, and I received my pension refund much faster than I had expected. I never imagined that claiming my German pension refund could be such a smooth and stress-free experience. The "GermanPensionRefund" team made the entire process easy and transparent from start to finish. Thank you once again to Julia and the entire team for your outstanding support and for ensuring a quick refund with zero stress. I highly recommend your services to anyone seeking assistance with their German pension refund.',
    sourceLabel: GOOGLE,
    sourceUrl: 'https://maps.app.goo.gl/MuvMLMds85UuzA5w6',
  },
];

const MONTHS_SHORT = [
  'JAN',
  'FEB',
  'MAR',
  'APR',
  'MAY',
  'JUN',
  'JUL',
  'AUG',
  'SEP',
  'OCT',
  'NOV',
  'DEC',
];

/** `2026-08-20` → `AUG/20/2026` (the card date format of the sheet). */
export function reviewDateLabel(iso: string): string {
  const parts = iso.split('-');
  const month = MONTHS_SHORT[Number(parts[1]) - 1] || parts[1];
  return month + '/' + parts[2] + '/' + parts[0];
}
