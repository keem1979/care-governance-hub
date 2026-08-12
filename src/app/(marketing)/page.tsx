import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BarChart3, ClipboardCheck, FolderCheck, HeartHandshake, Radar, ShieldCheck } from "lucide-react";
import { CTA, CheckList, SiteShell } from "@/components/atom-website";

export const metadata: Metadata = { title: "ATOM | Governance, organised", description: "Technology, governance expertise and continuous assurance for UK adult social care providers." };

export default function HomePage() {
  return <SiteShell><main>
    <section className="home-hero">
      <Image src="/catalogue/atom-leadership-hero.png" alt="Adult social care leaders reviewing governance information" fill priority sizes="100vw" className="cover-image" />
      <div className="home-overlay" />
      <div className="site-container home-content"><p className="site-eyebrow">Governance, organised.</p><h1>Your outsourced quality, compliance and governance department.</h1><p>ATOM combines a structured governance platform with dedicated professional support, helping care providers organise evidence, strengthen oversight and remain ready for scrutiny every day.</p><div className="button-row"><Link className="site-button" href="/contact">Talk to ATOM <ArrowRight aria-hidden="true" /></Link><Link className="site-button site-button-outline" href="/catalogue">View the catalogue</Link></div></div>
      <div className="hero-proof"><div><strong>One place</strong><span>for governance evidence</span></div><div><strong>Dedicated people</strong><span>working alongside your service</span></div><div><strong>Continuous assurance</strong><span>not last-minute preparation</span></div></div>
    </section>
    <section className="home-film" aria-labelledby="home-film-title">
      <div className="site-container home-film-grid">
        <div className="home-film-copy">
          <p className="site-eyebrow">Meet ATOM</p>
          <h2 id="home-film-title">See how your outsourced governance department works.</h2>
          <p>In a few minutes, discover how ATOM brings the platform, professional support and continuous assurance together around your care service.</p>
          <div className="button-row"><Link className="site-button" href="/services">Explore our services <ArrowRight aria-hidden="true" /></Link><Link className="site-button site-button-outline" href="/contact">Talk to ATOM</Link></div>
        </div>
        <div className="home-film-player">
          <video autoPlay muted loop controls playsInline preload="metadata" poster="/catalogue/atom-leadership-hero.png" aria-label="ATOM outsourced governance department introduction">
            <source src="/catalogue/atom-outsourced-governance-department.mp4" type="video/mp4" />
            Your browser cannot play this video.
          </video>
          <p>ATOM: Your Outsourced Quality, Compliance and Governance Department</p>
        </div>
      </div>
    </section>
    <section className="site-section intro-section"><div className="site-container split"><div><p className="site-eyebrow">The provider challenge</p><h2>Care leaders carry accountability across the whole service.</h2></div><div><p className="lead-copy">Safety, staffing and care delivery do not pause while audits, policies, evidence and reports are assembled. ATOM creates an organised governance function around your leadership team.</p><Link className="arrow-link" href="/how-it-works">See how the service works <ArrowRight aria-hidden="true" /></Link></div></div></section>
    <section className="site-section service-preview"><div className="site-container"><div className="section-heading"><p className="site-eyebrow">One complete model</p><h2>Technology, people and oversight working together.</h2></div><div className="three-grid">{[[FolderCheck,"Governance platform","One structured home for evidence, policies, audits, risks, actions, workforce assurance, KPIs and reports."],[HeartHandshake,"Professional support","Consultancy, coordination or a dedicated Governance Manager matched to your organisation’s needs."],[Radar,"Continuous assurance","A dependable rhythm of monitoring, escalation, action tracking and management reporting."]].map(([Icon,title,copy]) => <article className="feature-card" key={String(title)}><Icon aria-hidden="true" /><h3>{String(title)}</h3><p>{String(copy)}</p></article>)}</div></div></section>
    <section className="site-section platform-preview"><div className="site-container split align-centre"><div><p className="site-eyebrow">The ATOM platform</p><h2>Know what is ready, missing and requiring attention.</h2><p className="lead-copy">Authorised managers can organise real governance records, assign actions, monitor deadlines and produce traceable management information.</p><CheckList items={["Evidence and Policy Libraries","Audit Centre and Risk Register","Action Tracker and Compliance Calendar","Workforce, KPI and inspection-readiness tools"]}/><Link className="arrow-link" href="/platform">Explore the platform <ArrowRight aria-hidden="true" /></Link></div><div className="visual-panel"><div className="metric-row"><article><span>Evidence</span><strong>Organised</strong></article><article><span>Actions</span><strong>Visible</strong></article><article><span>Oversight</span><strong>Continuous</strong></article></div><div className="visual-chart"><BarChart3 aria-hidden="true" /><div><strong>Governance overview</strong><p>Evidence-led management information in one clear view.</p></div></div><div className="visual-list"><span><ShieldCheck /> Risks and controls</span><span><ClipboardCheck /> Audits and assurance</span><span><FolderCheck /> Evidence and policies</span></div></div></div></section>
    <section className="site-section package-preview"><div className="site-container"><div className="section-heading centred"><p className="site-eyebrow">Support packages</p><h2>Start with the level of support your service needs.</h2></div><div className="three-grid packages-mini">{[["Compliance Foundation","£995","Organised foundations and structured monthly compliance support."],["Managed Governance","£1,995","Ongoing coordination, weekly monitoring and executive reporting."],["Complete Governance Department","From £4,995","Dedicated management, continuous monitoring and board-level oversight."]].map(([title,price,copy]) => <article key={title}><h3>{title}</h3><strong>{price}<small> / month</small></strong><p>{copy}</p><Link href="/services">View service details <ArrowRight /></Link></article>)}</div></div></section>
    <CTA />
  </main></SiteShell>;
}
