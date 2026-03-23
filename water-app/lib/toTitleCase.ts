/** Known water-industry acronyms — keep uppercase in site names. */
const ACRONYMS = new Set([
  "CSO",
  "SPS",
  "STW",
  "WWTW",
  "STP",
  "WTW",
]);

/**
 * Convert EA-style ALL CAPS site names to Title Case, preserving acronyms.
 * e.g. "WOOLWORTHS CSO" → "Woolworths CSO"
 */
export function toTitleCase(siteName: string): string {
  if (!siteName.trim()) return siteName;
  return siteName
    .trim()
    .split(/\s+/)
    .map((word) => {
      const upper = word.toUpperCase().replace(/[^A-Z0-9]/g, "");
      if (ACRONYMS.has(upper)) return upper;
      // Preserve simple numeric tokens
      if (/^\d+$/.test(word)) return word;
      // Hyphenated: Title-Case each part
      if (word.includes("-")) {
        return word
          .split("-")
          .map((part) => {
            const pU = part.toUpperCase().replace(/[^A-Z0-9]/g, "");
            if (ACRONYMS.has(pU)) return pU;
            if (!part) return part;
            return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
          })
          .join("-");
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

export type SpillSeverity = "critical" | "high" | "moderate" | "low";

export function spillSeverity(spills: number): SpillSeverity {
  if (spills > 100) return "critical";
  if (spills >= 50) return "high";
  if (spills >= 10) return "moderate";
  return "low";
}

export function severityDotClass(severity: SpillSeverity): string {
  switch (severity) {
    case "critical":
      return "bg-[#dc2626]";
    case "high":
      return "bg-[#d97706]";
    case "moderate":
      return "bg-[#0891b2]";
    default:
      return "bg-[#64748b]";
  }
}

export function durationTextClass(hours: number): string {
  if (hours > 2000) return "text-[#dc2626] font-semibold";
  if (hours > 1000) return "text-[#d97706] font-medium";
  return "text-[#1e293b]";
}
