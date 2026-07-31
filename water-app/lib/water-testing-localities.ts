/**
 * Localities for /water-testing/[slug].
 *
 * These are NOT the same places as `TOWNS`. Search Console shows a distinct,
 * commercial-intent cluster — "water testing <place> buckinghamshire" — landing
 * on Milton Keynes *suburbs* (Bletchley, Fenny Stratford, Wolverton, Stony
 * Stratford, Newport Pagnell, Olney) and on Tyneside. 162 impressions in July
 * 2026, zero clicks, because the only pages we had answered a different
 * question: "what is in my water", not "who can test my water".
 *
 * Impressions recorded per query (2–30 Jul 2026) are noted against each entry
 * so the list can be pruned or extended from evidence rather than guesswork.
 */

export type TestingLocality = {
  slug: string;
  name: string;
  /** Ceremonial county — also drives the geology hardness estimate. */
  county: string;
  /** Display grouping and internal-link cluster. */
  area: string;
  /** Statutory water supplier for the area. */
  supplier: string;
  /** Existing /water-quality/[slug] page to cross-link, where one exists. */
  parentTownSlug?: string;
  /** Show in the hub listing. */
  live: boolean;
  /** GSC impressions for the matching "water testing …" query, Jul 2026. */
  observedImpressions?: number;
};

export const TESTING_LOCALITIES: TestingLocality[] = [
  // --- Milton Keynes / Buckinghamshire cluster (~146 impressions) ---
  {
    slug: "milton-keynes",
    name: "Milton Keynes",
    county: "Buckinghamshire",
    area: "Milton Keynes",
    supplier: "Anglian Water",
    parentTownSlug: "milton-keynes",
    live: true,
    observedImpressions: 14,
  },
  {
    slug: "fenny-stratford",
    name: "Fenny Stratford",
    county: "Buckinghamshire",
    area: "Milton Keynes",
    supplier: "Anglian Water",
    parentTownSlug: "milton-keynes",
    live: true,
    observedImpressions: 31,
  },
  {
    slug: "bletchley",
    name: "Bletchley",
    county: "Buckinghamshire",
    area: "Milton Keynes",
    supplier: "Anglian Water",
    parentTownSlug: "milton-keynes",
    live: true,
    observedImpressions: 36,
  },
  {
    slug: "wolverton",
    name: "Wolverton",
    county: "Buckinghamshire",
    area: "Milton Keynes",
    supplier: "Anglian Water",
    parentTownSlug: "milton-keynes",
    live: true,
    observedImpressions: 24,
  },
  {
    slug: "olney",
    name: "Olney",
    county: "Buckinghamshire",
    area: "Milton Keynes",
    supplier: "Anglian Water",
    parentTownSlug: "milton-keynes",
    live: true,
    observedImpressions: 16,
  },
  {
    slug: "newport-pagnell",
    name: "Newport Pagnell",
    county: "Buckinghamshire",
    area: "Milton Keynes",
    supplier: "Anglian Water",
    parentTownSlug: "milton-keynes",
    live: true,
    observedImpressions: 11,
  },
  {
    slug: "stony-stratford",
    name: "Stony Stratford",
    county: "Buckinghamshire",
    area: "Milton Keynes",
    supplier: "Anglian Water",
    parentTownSlug: "milton-keynes",
    live: true,
    observedImpressions: 9,
  },
  // Long-tail neighbours in the same cluster — no impressions yet, but the
  // pattern is established and these share the supplier and geology.
  {
    slug: "buckingham",
    name: "Buckingham",
    county: "Buckinghamshire",
    area: "Milton Keynes",
    supplier: "Anglian Water",
    parentTownSlug: "milton-keynes",
    live: true,
  },
  {
    slug: "woburn-sands",
    name: "Woburn Sands",
    county: "Buckinghamshire",
    area: "Milton Keynes",
    supplier: "Anglian Water",
    parentTownSlug: "milton-keynes",
    live: true,
  },

  // --- Tyne and Wear cluster (~48 impressions) ---
  {
    slug: "newcastle-upon-tyne",
    name: "Newcastle upon Tyne",
    county: "Tyne and Wear",
    area: "Tyne and Wear",
    supplier: "Northumbrian Water",
    parentTownSlug: "newcastle",
    live: true,
    observedImpressions: 40,
  },
  {
    slug: "ryton",
    name: "Ryton",
    county: "Tyne and Wear",
    area: "Tyne and Wear",
    supplier: "Northumbrian Water",
    parentTownSlug: "newcastle",
    live: true,
    observedImpressions: 1,
  },
  {
    slug: "gateshead",
    name: "Gateshead",
    county: "Tyne and Wear",
    area: "Tyne and Wear",
    supplier: "Northumbrian Water",
    parentTownSlug: "newcastle",
    live: true,
  },
  {
    slug: "sunderland",
    name: "Sunderland",
    county: "Tyne and Wear",
    area: "Tyne and Wear",
    supplier: "Northumbrian Water",
    parentTownSlug: "newcastle",
    live: true,
  },
];

export function getTestingLocalityBySlug(
  slug: string
): TestingLocality | undefined {
  return TESTING_LOCALITIES.find((l) => l.slug === slug);
}

export function getTestingLocalitiesLive(): TestingLocality[] {
  return TESTING_LOCALITIES.filter((l) => l.live);
}

/**
 * The testing page to cross-link from a /water-quality/[slug] town page.
 * Prefers an exact slug match, then any locality claiming that town as parent.
 */
export function getTestingLocalityForTown(
  townSlug: string
): TestingLocality | undefined {
  const live = getTestingLocalitiesLive();
  return (
    live.find((l) => l.slug === townSlug) ??
    live.find((l) => l.parentTownSlug === townSlug)
  );
}

/** Grouped by `area`, preserving first-seen area order. */
export function getTestingLocalitiesByArea(): {
  area: string;
  localities: TestingLocality[];
}[] {
  const order: string[] = [];
  const map = new Map<string, TestingLocality[]>();
  for (const l of getTestingLocalitiesLive()) {
    if (!map.has(l.area)) {
      map.set(l.area, []);
      order.push(l.area);
    }
    map.get(l.area)!.push(l);
  }
  return order.map((area) => ({ area, localities: map.get(area)! }));
}
