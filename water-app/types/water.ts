export type WaterApiResponse = {
  supplier: string;
  zoneName: string | null;
  hasLocalSamples: boolean;
  chemicals: {
    nitrates: number | string | null;
    lead: number | string | null;
    chlorine: number | string | null;
    fluoride: number | string | null;
  };
  nearestSpill: {
    siteName: string;
    countedSpills: number;
    totalDurationHrs: number;
  } | null;
  source: string;
  error?: string;
};
