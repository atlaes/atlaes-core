export const PUBLIC_PENSION_PROVIDERS_BY_STATE: Record<string, string[]> = {
  'Baden-Württemberg': ['ZVK (KVBW)', 'VBL'],
  Bavaria: ['VBL', 'ZVK (BayZVK / BVK)'],
  'Berlin (West)': ['VBL'],
  Bremen: ['VBL'],
  Hesse: ['VBL', 'ZVK Darmstadt', 'ZVK Kassel (KVK)'],
  'Lower Saxony': ['VBL'],
  'North Rhine-Westphalia': ['RZVK Köln', 'VBL'],
  'Rhineland-Palatinate': ['RZVK Köln', 'ZVK Darmstadt', 'VBL'],
  Saarland: ['VBL', 'RZVK Saar'],
  'Schleswig-Holstein': ['VBL'],
};

export const PUBLIC_FEDERAL_STATES = Object.keys(
  PUBLIC_PENSION_PROVIDERS_BY_STATE
);
