"use client";

import Link from "next/link";
import { useState } from "react";

const linkClass = "text-[#1e293b] hover:text-[#0891b2]";
const homeClass = "font-semibold text-[#0f2942] hover:text-[#0891b2]";

const navLinks = [
  { href: "/water-quality", label: "Water Quality" },
  { href: "/sewage-spills", label: "Sewage Spills" },
  { href: "/suppliers", label: "Water Suppliers" },
  { href: "/about", label: "About" },
] as const;

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="border-b border-[#0f2942]/10 bg-white px-4 py-3">
      <nav
        className="mx-auto flex max-w-4xl items-center justify-between gap-4"
        aria-label="Main"
      >
        <Link
          href="/"
          className={`${homeClass} shrink-0`}
          onClick={() => setMenuOpen(false)}
        >
          Water Directory
        </Link>

        <div className="hidden items-center gap-6 md:flex">
          {navLinks.map(({ href, label }) => (
            <Link key={href} href={href} className={linkClass}>
              {label}
            </Link>
          ))}
        </div>

        <button
          type="button"
          className="inline-flex shrink-0 items-center justify-center rounded-lg p-2 text-[#0f2942] hover:bg-[#0f2942]/5 md:hidden"
          aria-expanded={menuOpen}
          aria-controls="mobile-nav"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          onClick={() => setMenuOpen((o) => !o)}
        >
          {menuOpen ? (
            <svg
              className="size-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          ) : (
            <svg
              className="size-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          )}
        </button>
      </nav>

      {menuOpen ? (
        <div
          id="mobile-nav"
          className="mx-auto max-w-4xl border-t border-[#0f2942]/10 px-4 py-3 md:hidden"
        >
          <div className="flex flex-col gap-3">
            {navLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`${linkClass} py-1 text-base`}
                onClick={() => setMenuOpen(false)}
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </header>
  );
}
