/** Parse numeric chemical values for comparisons (mirrors WaterScorecard parseVal). */
export function parseChemNumber(val: number | string | null | undefined): number | null {
  if (val == null || (typeof val === "number" && isNaN(val))) return null;
  if (typeof val === "string") {
    const cleaned = val.replace(/</g, "").trim();
    const n = parseFloat(cleaned);
    return isNaN(n) ? null : n;
  }
  return typeof val === "number" ? val : null;
}

export function formatChemDisplay(val: number | string | null | undefined): string {
  const n = parseChemNumber(val);
  if (n === null) return "—";
  if (typeof val === "string" && String(val).includes("<")) return val;
  return n.toFixed(2);
}

export function getHardnessCategory(
  val: number
): "soft" | "moderate" | "hard" | "veryhard" {
  if (val <= 100) return "soft";
  if (val <= 200) return "moderate";
  if (val <= 300) return "hard";
  return "veryhard";
}

export function hardnessLabel(cat: ReturnType<typeof getHardnessCategory>): string {
  const labels = {
    soft: "Soft",
    moderate: "Moderately hard",
    hard: "Hard",
    veryhard: "Very hard",
  };
  return labels[cat];
}
