import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BarChart3, ClipboardCheck, FolderCheck, HeartHandshake, Radar, ShieldCheck } from "lucide-react";
import { CTA, CheckList, SiteShell } from "@/components/atom-website";

export const metadata: Metadata = { title: "ATOM | Continuous assurance for adult social care", description: "Know what is unsafe, overdue or unverified and demonstrate that improvement has been completed and sustained." };

export default function HomePage() {
  return <SiteShell><main>
    <section className="home-hero">
      <Image src="/catalogue/atom-leadership-hero.png" alt="Adult social care leaders reviewing governance information" fill priority sizes="100vw" className="cover-image" />
      <div className="home-overlay" />
      <div className="site-container home-content"><p className="site-eyebrow">Continuous assurance for adult social care</p><h1>Know what is unsafe, overdue or unverified—before scrutiny begins.</h1><p>ATOM QCGMS connects findings, risks, actions, evidence and management oversight, helping care leaders prove that improvement was completed and sustained.</p><div className="button-row"><Link className="site-button" href="/contact">Talk to ATOM <ArrowRight aria-hidden="true" /></Link><Link className="site-button site-button-outline" href="/platform">Explore QCGMS</Link></div></div>
      <div className="hero-proof"><div><strong>Every finding</strong><span>has ownership and a deadline</span></div><div><strong>Every closure</strong><span>is supported and verified</span></div><div><strong>Every improvement</strong><span>can be traced and reviewed</span></div></div>
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
    <section className="site-section intro-section"><div className="site-container split"><div><p className="site-eyebrow">The provider challenge</p><h2>Good work is difficult to prove when governance is scattered.</h2></div><div><p className="lead-copy">Actions sit in spreadsheets, evidence in folders and important decisions in email. QCGMS gives managers one traceable assurance chain from the original issue to evidence, verification and sustained improvement.</p><Link className="arrow-link" href="/how-it-works">See how the service works <ArrowRight aria-hidden="true" /></Link></div></div></section>
    <section className="site-section service-preview"><div className="site-container"><div className="section-heading"><p className="site-eyebrow">One complete model</p><h2>Technology, people and oversight working together.</h2></div><div className="three-grid">{[[FolderCheck,"Governance platform","One structured home for evidence, policies, audits, risks, actions, workforce assurance, KPIs and reports."],[HeartHandshake,"Professional support","Consultancy, coordination or a dedicated Governance Manager matched to your organisation’s needs."],[Radar,"Continuous assurance","A dependable rhythm of monitoring, escalation, action tracking and management reporting."]].map(([Icon,title,copy]) => <article className="feature-card" key={String(title)}><Icon aria-hidden="true" /><h3>{String(title)}</h3><p>{String(copy)}</p></article>)}</div></div></section>
    <section className="site-section platform-preview"><div className="site-container split align-centre"><div><p className="site-eyebrow">The QCGMS platform</p><h2>Prove that action was taken—and that it worked.</h2><p className="lead-copy">Authorised managers can connect findings to risks, owners, deadlines, evidence, independent verification and effectiveness review without rebuilding the story for every inspection.</p><CheckList items={["Evidence and Policy Libraries","Audits, registers and risk controls","Evidence-backed action closure","Workforce, KPI and inspection-readiness tools"]}/><Link className="arrow-link" href="/platform">Explore the platform <ArrowRight aria-hidden="true" /></Link></div><div className="visual-panel"><div className="metric-row"><article><span>Findings</span><strong>Owned</strong></article><article><span>Closures</span><strong>Verified</strong></article><article><span>Improvement</span><strong>Traceable</strong></article></div><div className="visual-chart"><BarChart3 aria-hidden="true" /><div><strong>Management assurance</strong><p>See what needs a decision and follow the evidence to source.</p></div></div><div className="visual-list"><span><ShieldCheck /> Risks and immediate controls</span><span><ClipboardCheck /> Actions and effectiveness</span><span><FolderCheck /> Evidence and provenance</span></div></div></div></section>
    <section className="site-section package-preview"><div className="site-container"><div className="section-heading centred"><p className="site-eyebrow">Support packages</p><h2>Start with the level of support your service needs.</h2></div><div className="three-grid packages-mini">{[["Compliance Foundation","£995","Organised foundations and structured monthly compliance support."],["Managed Governance","£1,995","Ongoing coordination, weekly monitoring and executive reporting."],["Complete Governance Department","From £4,995","Dedicated management, continuous monitoring and board-level oversight."]].map(([title,price,copy]) => <article key={title}><h3>{title}</h3><strong>{price}<small> / month</small></strong><p>{copy}</p><Link href="/services">View service details <ArrowRight /></Link></article>)}</div></div></section>
    <CTA />
  </main></SiteShell>;
}
