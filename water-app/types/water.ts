export interface SpillSite {
  name: string;
  spills: number;
  hours: number;
  year: string;
  company: string;
}

export type WaterApiResponse = {
  supplier: string;
  zoneName: string | null;
  /** Town/city from postcodes.io (admin_district) when available; null for Scottish/NI when not looked up */
  adminDistrict?: string | null;
  hasLocalSamples: boolean;
  comingSoon?: boolean;
  chemicals: {
    nitrates: number | string | null;
    lead: number | string | null;
    chlorine: number | string | null;
    fluoride: number | string | null;
    hardness: number | null;
  };
  sewageSpills?: SpillSite[];
  source: string;
  error?: string;
};
