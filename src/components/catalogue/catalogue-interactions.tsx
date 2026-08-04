"use client";

import { ChevronDown, Menu, Printer, X } from "lucide-react";
import { useState } from "react";

const navItems = [
  ["Solution", "solution"],
  ["Platform", "platform"],
  ["How it works", "process"],
  ["Packages", "packages"],
  ["Benefits", "benefits"],
  ["FAQ", "faq"],
] as const;

export function CatalogueNavigation() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="catalogue-menu-button"
        aria-expanded={open}
        aria-controls="catalogue-mobile-navigation"
        onClick={() => setOpen((value) => !value)}
      >
        {open ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
        <span className="sr-only">{open ? "Close navigation" : "Open navigation"}</span>
      </button>
      <nav
        id="catalogue-mobile-navigation"
        className={`catalogue-nav-links ${open ? "is-open" : ""}`}
        aria-label="Catalogue sections"
      >
        {navItems.map(([label, id]) => (
          <a key={id} href={`#${id}`} onClick={() => setOpen(false)}>
            {label}
          </a>
        ))}
      </nav>
    </>
  );
}

export function PrintCatalogueButton() {
  return (
    <button className="catalogue-print-button" type="button" onClick={() => window.print()}>
      <Printer aria-hidden="true" size={17} />
      Print / save PDF
    </button>
  );
}

export function BackToTop() {
  return (
    <a className="back-to-top" href="#catalogue-top" aria-label="Back to the top of the catalogue">
      <ChevronDown aria-hidden="true" />
    </a>
  );
}

export function FAQ({ items }: { items: Array<{ question: string; answer: string }> }) {
  return (
    <div className="faq-list">
      {items.map((item, index) => (
        <details key={item.question} open={index === 0}>
          <summary>
            <span>{item.question}</span>
            <ChevronDown aria-hidden="true" />
          </summary>
          <p>{item.answer}</p>
        </details>
      ))}
    </div>
  );
}
