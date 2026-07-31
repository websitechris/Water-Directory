import Link from "next/link";
import { getTownsLive } from "@/lib/towns";
import { getTestingLocalitiesLive } from "@/lib/water-testing-localities";

/**
 * Site-wide footer.
 *
 * SEO purpose as much as UX: before this existed, town pages were reachable
 * only from the /water-quality hub, leaving ~52 URLs stuck in Search Console's
 * "Discovered – currently not indexed". Linking every live town from every page
 * puts them one click from anywhere on the site.
 */
export function SiteFooter() {
  const towns = getTownsLive();
  const testingLocalities = getTestingLocalitiesLive();
  const year = new Date().getFullYear();

  return (
    <footer className="mt-16 border-t border-[#0f2942]/10 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <section aria-labelledby="footer-towns">
          <h2
            id="footer-towns"
            className="text-sm font-semibold uppercase tracking-wider text-[#0f2942]"
          >
            Tap water quality by town
          </h2>
          <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3 lg:grid-cols-4">
            {towns.map((town) => (
              <li key={town.slug}>
                <Link
                  href={`/water-quality/${town.slug}`}
                  className="text-sm text-[#475569] hover:text-[#0891b2] hover:underline"
                >
                  {town.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="footer-sewage" className="mt-10">
          <h2
            id="footer-sewage"
            className="text-sm font-semibold uppercase tracking-wider text-[#0f2942]"
          >
            Sewage spills by town
          </h2>
          <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3 lg:grid-cols-4">
            {towns.map((town) => (
              <li key={town.slug}>
                <Link
                  href={`/sewage-spills/${town.slug}`}
                  className="text-sm text-[#475569] hover:text-[#0891b2] hover:underline"
                >
                  {town.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="footer-testing" className="mt-10">
          <h2
            id="footer-testing"
            className="text-sm font-semibold uppercase tracking-wider text-[#0f2942]"
          >
            Water testing by area
          </h2>
          <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3 lg:grid-cols-4">
            {testingLocalities.map((l) => (
              <li key={l.slug}>
                <Link
                  href={`/water-testing/${l.slug}`}
                  className="text-sm text-[#475569] hover:text-[#0891b2] hover:underline"
                >
                  {l.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="footer-guides" className="mt-10">
          <h2
            id="footer-guides"
            className="text-sm font-semibold uppercase tracking-wider text-[#0f2942]"
          >
            Guides
          </h2>
          <ul className="mt-4 grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { href: "/blog/hard-water-eczema-uk", label: "Hard water and eczema" },
              {
                href: "/blog/tap-water-nitrates-baby-uk",
                label: "Nitrates and infant formula",
              },
              {
                href: "/blog/water-quality-home-buying",
                label: "Water quality when buying a home",
              },
              {
                href: "/blog/sewage-spills-near-me-uk",
                label: "Sewage spills near me",
              },
            ].map(({ href, label }) => (
              <li key={href}>
                <Link
                  href={href}
                  className="text-sm text-[#475569] hover:text-[#0891b2] hover:underline"
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-[#0f2942]/10 pt-6">
          {[
            { href: "/", label: "Postcode search" },
            { href: "/water-quality", label: "Water quality" },
            { href: "/sewage-spills", label: "Sewage spills" },
            { href: "/water-testing", label: "Water testing" },
            { href: "/suppliers", label: "Water suppliers" },
            { href: "/about", label: "About" },
          ].map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="text-sm font-medium text-[#0f2942] hover:text-[#0891b2]"
            >
              {label}
            </Link>
          ))}
        </div>

        <p className="mt-6 text-xs leading-relaxed text-[#64748b]">
          Water quality data from the Drinking Water Inspectorate via licensed water
          company laboratory testing, and live storm overflow data from the
          Environment Agency. Readings vary by supply zone — always check your own
          postcode, and refer to your supplier for formal water quality reports.
        </p>
        <p className="mt-3 text-xs text-[#64748b]">
          © {year} Water Directory
        </p>
      </div>
    </footer>
  );
}
