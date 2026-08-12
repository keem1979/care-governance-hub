import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, Menu } from "lucide-react";

const navigation = [
  ["Services", "/services"],
  ["Platform", "/platform"],
  ["How it works", "/how-it-works"],
  ["About", "/about"],
  ["Resources", "/resources"],
] as const;

export function SiteHeader() {
  return (
    <header className="site-header">
      <Link className="site-logo" href="/" aria-label="ATOM home">
        <Image src="/atom-wordmark.png" alt="ATOM" width={142} height={53} priority unoptimized />
      </Link>
      <nav className="desktop-nav" aria-label="Main navigation">
        {navigation.map(([label, href]) => <Link key={href} href={href}>{label}</Link>)}
      </nav>
      <div className="site-actions">
        <Link className="text-link" href="/login">Client sign in</Link>
        <Link className="site-button site-button-small" href="/contact">Talk to ATOM</Link>
      </div>
      <details className="mobile-nav">
        <summary aria-label="Open navigation"><Menu aria-hidden="true" /></summary>
        <nav aria-label="Mobile navigation">
          {navigation.map(([label, href]) => <Link key={href} href={href}>{label}</Link>)}
          <Link href="/catalogue">View catalogue</Link>
          <Link href="/login">Client sign in</Link>
          <Link className="site-button" href="/contact">Talk to ATOM</Link>
        </nav>
      </details>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-grid">
        <div>
          <Image src="/atom-wordmark.png" alt="ATOM" width={152} height={57} unoptimized />
          <p>Governance, organised.</p>
          <p className="footer-copy">Quality, compliance and governance support for UK adult social care providers.</p>
        </div>
        <div><h2>Explore</h2><Link href="/services">Services</Link><Link href="/platform">Platform</Link><Link href="/how-it-works">How it works</Link><Link href="/catalogue">Catalogue</Link></div>
        <div><h2>Company</h2><Link href="/about">About ATOM</Link><Link href="/resources">Resources</Link><Link href="/contact">Contact</Link><Link href="/login">Client sign in</Link></div>
        <div><h2>Contact</h2><a href="mailto:info@atomcom.co.uk">info@atomcom.co.uk</a><a href="https://atomcom.co.uk">atomcom.co.uk</a><p>Telephone and office address coming soon.</p></div>
      </div>
      <div className="footer-bottom"><p>© {new Date().getFullYear()} ATOM. All rights reserved.</p><div><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link></div></div>
    </footer>
  );
}

export function SiteShell({ children }: { children: React.ReactNode }) {
  return <div className="atom-site"><SiteHeader />{children}<SiteFooter /></div>;
}

export function PageHero({ eyebrow, title, copy, image = false }: { eyebrow: string; title: string; copy: string; image?: boolean }) {
  return (
    <section className={`page-hero ${image ? "page-hero-image" : ""}`}>
      {image ? <Image src="/catalogue/governance-review.png" alt="Care leaders reviewing governance priorities" fill priority sizes="100vw" className="cover-image" /> : null}
      <div className="page-hero-overlay" />
      <div className="site-container page-hero-content"><p className="site-eyebrow">{eyebrow}</p><h1>{title}</h1><p>{copy}</p></div>
    </section>
  );
}

export function CTA() {
  return (
    <section className="site-cta"><div className="site-container"><p className="site-eyebrow">Start with a conversation</p><h2>Bring clarity and dependable rhythm to your governance.</h2><p>Tell us where governance feels fragmented, pressured or difficult to evidence. We will help you identify the right starting point.</p><div className="button-row"><Link className="site-button" href="/contact">Talk to ATOM <ArrowRight aria-hidden="true" /></Link><a className="site-button site-button-outline" href="mailto:info@atomcom.co.uk">Email us</a></div></div></section>
  );
}

export function CheckList({ items }: { items: readonly string[] }) {
  return <ul className="site-check-list">{items.map(item => <li key={item}><Check aria-hidden="true" /><span>{item}</span></li>)}</ul>;
}
