"use client";

import { useState } from "react";

type Props = {
  /** Locality name, shown in the heading and stored against the lead. */
  localityName: string;
  /** Stored in `leads.interest_type`, e.g. "water-testing:bletchley". */
  interestType: string;
};

const REASONS = [
  { value: "private-supply", label: "Private supply, borehole or well" },
  { value: "lead-pipes", label: "Suspected lead pipes (pre-1970 property)" },
  { value: "taste-smell-colour", label: "Taste, smell or discolouration" },
  { value: "landlord-business", label: "Landlord, letting or business duty" },
  { value: "hardness-limescale", label: "Hardness / limescale" },
  { value: "peace-of-mind", label: "General peace of mind" },
] as const;

export function WaterTestEnquiryForm({ localityName, interestType }: Props) {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const reason = formData.get("reason")?.toString() ?? "";

    const payload = {
      name: formData.get("name")?.toString().trim() ?? "",
      email: formData.get("email")?.toString().trim() ?? "",
      postcode: formData.get("postcode")?.toString().trim() ?? "",
      // Reusing the existing `leads` columns — no schema change needed.
      property_age: reason,
      interest_type: interestType,
    };

    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Request failed");
      setSubmitted(true);
    } catch {
      setError("Something went wrong. Please try again in a moment.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="rounded-2xl border border-[#0891b2]/30 bg-[#0891b2]/10 p-6">
        <p className="font-semibold text-[#0f2942]">Thanks — that&apos;s with us.</p>
        <p className="mt-2 text-sm leading-relaxed text-[#334155]">
          We&apos;ll email you details of UKAS-accredited laboratories covering{" "}
          {localityName}, along with indicative prices for the type of test you
          asked about. In the meantime, contact your water supplier first if the
          issue is with mains water — they are legally obliged to investigate,
          and it costs you nothing.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="wt-name"
          className="block text-sm font-medium text-[#0f2942]"
        >
          Name
        </label>
        <input
          id="wt-name"
          name="name"
          type="text"
          required
          autoComplete="name"
          className="mt-1 w-full rounded-lg border border-[#cbd5e1] px-3 py-2 text-[#1e293b] focus:border-[#0891b2] focus:outline-none focus:ring-1 focus:ring-[#0891b2]"
        />
      </div>

      <div>
        <label
          htmlFor="wt-email"
          className="block text-sm font-medium text-[#0f2942]"
        >
          Email
        </label>
        <input
          id="wt-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="mt-1 w-full rounded-lg border border-[#cbd5e1] px-3 py-2 text-[#1e293b] focus:border-[#0891b2] focus:outline-none focus:ring-1 focus:ring-[#0891b2]"
        />
      </div>

      <div>
        <label
          htmlFor="wt-postcode"
          className="block text-sm font-medium text-[#0f2942]"
        >
          Postcode
        </label>
        <input
          id="wt-postcode"
          name="postcode"
          type="text"
          autoComplete="postal-code"
          placeholder="e.g. MK2 2BQ"
          className="mt-1 w-full rounded-lg border border-[#cbd5e1] px-3 py-2 text-[#1e293b] focus:border-[#0891b2] focus:outline-none focus:ring-1 focus:ring-[#0891b2]"
        />
      </div>

      <div>
        <label
          htmlFor="wt-reason"
          className="block text-sm font-medium text-[#0f2942]"
        >
          What do you need tested?
        </label>
        <select
          id="wt-reason"
          name="reason"
          required
          defaultValue=""
          className="mt-1 w-full rounded-lg border border-[#cbd5e1] bg-white px-3 py-2 text-[#1e293b] focus:border-[#0891b2] focus:outline-none focus:ring-1 focus:ring-[#0891b2]"
        >
          <option value="" disabled>
            Choose one…
          </option>
          {REASONS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <p className="text-sm text-[#b91c1c]" role="alert">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-lg bg-[#0891b2] px-6 py-3 font-semibold text-white transition hover:bg-[#0e7490] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? "Sending…" : "Request testing options"}
      </button>

      <p className="text-xs leading-relaxed text-[#64748b]">
        Water Directory is not a testing laboratory. We will email you details of
        UKAS-accredited labs covering {localityName} and indicative prices. We use
        your details only to answer this enquiry.
      </p>
    </form>
  );
}
