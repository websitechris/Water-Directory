/** Town centres for sewage spill radius pages (WGS84). */

export type Town = {
  slug: string;
  name: string;
  lat: number;
  lng: number;
  county: string;
  /** Representative postcode: postcodes.io → LSOA → Supabase zone/chemical lookup (town water pages + fallbacks). */
  postcode: string;
};

export const TOWNS: Town[] = [
  {
    slug: "york",
    name: "York",
    lat: 53.9583,
    lng: -1.0803,
    county: "North Yorkshire",
    postcode: "YO1 7EN",
  },
  {
    slug: "medway",
    name: "Medway",
    lat: 51.388,
    lng: 0.5062,
    county: "Kent",
    postcode: "ME4 4EP",
  },
  {
    slug: "plymouth",
    name: "Plymouth",
    lat: 50.3755,
    lng: -4.1427,
    county: "Devon",
    postcode: "PL1 2AB",
  },
  {
    slug: "newcastle",
    name: "Newcastle upon Tyne",
    lat: 54.9783,
    lng: -1.6178,
    county: "Tyne and Wear",
    postcode: "NE1 4ST",
  },
  {
    slug: "bath",
    name: "Bath",
    lat: 51.3758,
    lng: -2.3599,
    county: "Somerset",
    postcode: "BA1 1LZ",
  },
  {
    slug: "oxford",
    name: "Oxford",
    lat: 51.752,
    lng: -1.2577,
    county: "Oxfordshire",
    postcode: "OX1 1ND",
  },
  {
    slug: "brighton",
    name: "Brighton",
    lat: 50.8225,
    lng: -0.1372,
    county: "East Sussex",
    postcode: "BN1 1AL",
  },
  {
    slug: "bristol",
    name: "Bristol",
    lat: 51.4545,
    lng: -2.5879,
    county: "City of Bristol",
    postcode: "BS1 5TR",
  },
  {
    slug: "manchester",
    name: "Manchester",
    lat: 53.4808,
    lng: -2.2426,
    county: "Greater Manchester",
    postcode: "M2 5WQ",
  },
  {
    slug: "southampton",
    name: "Southampton",
    lat: 50.9097,
    lng: -1.4044,
    county: "Hampshire",
    postcode: "SO14 3TJ",
  },
  {
    slug: "worthing",
    name: "Worthing",
    lat: 50.8179,
    lng: -0.3727,
    county: "West Sussex",
    postcode: "BN11 1NJ",
  },
  {
    slug: "leeds",
    name: "Leeds",
    lat: 53.8008,
    lng: -1.5491,
    county: "West Yorkshire",
    postcode: "LS1 4DY",
  },
  {
    slug: "sheffield",
    name: "Sheffield",
    lat: 53.3811,
    lng: -1.4701,
    county: "South Yorkshire",
    postcode: "S1 2HE",
  },
  {
    slug: "nottingham",
    name: "Nottingham",
    lat: 52.9548,
    lng: -1.1581,
    county: "Nottinghamshire",
    postcode: "NG1 2BY",
  },
  {
    slug: "cambridge",
    name: "Cambridge",
    lat: 52.2053,
    lng: 0.1192,
    county: "Cambridgeshire",
    postcode: "CB2 1TJ",
  },
];

export function getTownBySlug(slug: string): Town | undefined {
  return TOWNS.find((t) => t.slug === slug);
}

/** Alphabetical by display name — for hub listing pages. */
export function getTownsSortedAlphabetically(): Town[] {
  return [...TOWNS].sort((a, b) => a.name.localeCompare(b.name, "en-GB"));
}
