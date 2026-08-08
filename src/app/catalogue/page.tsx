import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  CalendarCheck2,
  Check,
  CircleAlert,
  ClipboardCheck,
  Clock3,
  FileCheck2,
  FileStack,
  FolderCheck,
  HeartHandshake,
  Layers3,
  ListChecks,
  MonitorCheck,
  Network,
  Radar,
  ShieldCheck,
  Sparkles,
  Target,
  UsersRound,
} from "lucide-react";
import {
  BackToTop,
  CatalogueNavigation,
  FAQ,
  PrintCatalogueButton,
} from "@/components/catalogue/catalogue-interactions";
import "./catalogue.css";

export const metadata: Metadata = {
  title: "ATOM — Your Outsourced Quality, Compliance & Governance Department",
  description:
    "Technology, dedicated governance expertise and continuous quality assurance in one managed service for UK adult social care providers.",
  alternates: { canonical: "/catalogue" },
  openGraph: {
    title: "ATOM — Your Outsourced Quality, Compliance & Governance Department",
    description: "Technology, dedicated governance expertise and continuous quality assurance in one managed service.",
    type: "website",
    images: [{ url: "/og.png", width: 1680, height: 945, alt: "ATOM outsourced quality, compliance and governance department" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "ATOM — Your Outsourced Quality, Compliance & Governance Department",
    description: "Technology, governance expertise and continuous assurance for UK adult social care.",
    images: ["/og.png"],
  },
};

const systemModules = [
  ["Compliance dashboard", MonitorCheck],
  ["Evidence Library", FolderCheck],
  ["Policy Library", BookOpenCheck],
  ["Audit Centre", ClipboardCheck],
  ["Risk Register", ShieldCheck],
  ["Action Tracker", ListChecks],
  ["Governance meetings", UsersRound],
  ["Compliance Calendar", CalendarCheck2],
  ["Workforce compliance", Network],
  ["KPI dashboard", BarChart3],
  ["Inspection Centre", FileCheck2],
  ["Executive reports", FileStack],
] as const;

const packages = [
  {
    name: "Compliance Foundation",
    price: "£995",
    cadence: "per month",
    summary:
      "For small providers that need one organised place for governance evidence and structured monthly compliance support.",
    suited: "New agencies, small domiciliary care providers and single-location services.",
    cta: "Choose Compliance Foundation",
    popular: false,
    features: [
      "ATOM Compliance Support System",
      "Organisation, location, user and permission setup",
      "Policy and Evidence Library structure",
      "Risk Register, Action Tracker and Audit Centre",
      "Compliance Calendar and Governance Meetings",
      "KPI and inspection-readiness workspace",
      "Monthly compliance and action-tracker review",
      "Monthly governance report",
      "One consultancy meeting each month",
      "Email compliance support",
    ],
  },
  {
    name: "Managed Governance",
    price: "£1,995",
    cadence: "per month",
    summary:
      "For providers that need help maintaining the compliance system and monitoring governance actions throughout the month.",
    suited: "Growing providers, inspection preparation and services with limited internal compliance capacity.",
    cta: "Choose Managed Governance",
    popular: true,
    features: [
      "Everything in Compliance Foundation",
      "Assigned Governance Coordinator",
      "Initial evidence and compliance-gap review",
      "Ongoing evidence organisation support",
      "Weekly system and action-tracker review",
      "Overdue audit, policy, risk and evidence monitoring",
      "Monthly KPI review and governance meeting pack",
      "Monthly executive governance report",
      "Agenda and management discussion support",
      "Two management-support meetings each month",
      "Telephone and email support",
    ],
  },
  {
    name: "Complete Governance Department",
    price: "From £4,995",
    cadence: "per month",
    summary:
      "For providers that want ATOM to operate as their outsourced Quality, Compliance and Governance Department.",
    suited: "Medium-sized, multi-location or higher-risk services requiring continuous management assurance.",
    cta: "Request an Enterprise Proposal",
    popular: false,
    features: [
      "Everything in Managed Governance",
      "Dedicated Governance Manager",
      "Daily review of agreed care-monitoring records",
      "Medication, handover and documentation review",
      "Record-integrity and visit-status monitoring",
      "Clinical and safeguarding concern identification",
      "Daily management alerts for urgent findings",
      "Daily or agreed-frequency QA reports",
      "Weekly governance, safeguarding and risk packs",
      "Monthly board-level governance reporting",
      "Leadership and Registered Manager support",
      "Continuous inspection-readiness monitoring",
      "Quarterly mock-inspection review",
    ],
  },
] as const;

const comparison = [
  ["Monthly price", "£995", "£1,995", "From £4,995"],
  ["Compliance Support System", "Included", "Included", "Included"],
  ["System configuration", "Included", "Included", "Included"],
  ["Monthly compliance review", "Included", "Included", "Included"],
  ["Monthly governance report", "Included", "Included", "Included"],
  ["Weekly system review", "Not included", "Included", "Included"],
  ["Assigned governance professional", "Consultant support", "Governance Coordinator", "Governance Manager"],
  ["Evidence organisation support", "Initial structure", "Ongoing support", "Fully managed"],
  ["Weekly action monitoring", "Not included", "Included", "Included"],
  ["Daily care-record monitoring", "Not included", "Not included", "Included"],
  ["Medication and documentation review", "Not included", "Not included", "Included"],
  ["Clinical and safeguarding alerts", "Not included", "Not included", "Included"],
  ["Weekly governance pack", "Not included", "Not included", "Included"],
  ["Monthly reporting", "Standard", "Executive", "Board-level"],
  ["Inspection readiness", "System supported", "Ongoing support", "Continuous oversight"],
] as const;

const faqs = [
  {
    question: "Is ATOM a care-management system?",
    answer:
      "No. ATOM is a Quality, Compliance and Governance Support System and managed governance service. It is not a care-planning system or eMAR.",
  },
  {
    question: "Does ATOM replace the Registered Manager?",
    answer:
      "No. ATOM supports the Registered Manager and leadership team with structure, evidence and oversight. Provider management retains accountability for the service.",
  },
  {
    question: "Does using ATOM guarantee a Good or Outstanding CQC rating?",
    answer:
      "No. ATOM supports governance, evidence organisation and inspection readiness, but it cannot guarantee or predict an official regulatory outcome.",
  },
  {
    question: "Can ATOM monitor our daily care records?",
    answer:
      "Yes, under the Complete Governance Department package, subject to an agreed scope, secure data transfer, appropriate data-processing arrangements and provider validation of findings.",
  },
  {
    question: "Will ATOM make safeguarding decisions for us?",
    answer:
      "No. ATOM may identify record-based indicators that require management attention. The provider must apply its safeguarding procedures and make the appropriate referrals and notifications.",
  },
  {
    question: "Can ATOM maintain the system for us?",
    answer:
      "Yes. Managed Governance includes a Governance Coordinator, while the Complete Governance Department includes a dedicated Governance Manager.",
  },
  {
    question: "Can ATOM support more than one location?",
    answer:
      "Yes. Multi-location requirements are scoped during discovery, and the final proposal may reflect additional volume, complexity and governance risk.",
  },
  {
    question: "Is client data protected?",
    answer:
      "ATOM is designed around role-based access, location controls, secure sessions and private file storage. Contractual, hosting and data-protection arrangements are confirmed for the agreed service; ATOM does not make unverified certification claims.",
  },
];

function SectionHeading({
  eyebrow,
  title,
  copy,
  align = "left",
}: {
  eyebrow: string;
  title: string;
  copy?: string;
  align?: "left" | "centre";
}) {
  return (
    <div className={`catalogue-section-heading ${align === "centre" ? "is-centred" : ""}`}>
      <p className="catalogue-eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
      {copy ? <p className="catalogue-lead">{copy}</p> : null}
    </div>
  );
}

function CheckList({ items }: { items: readonly string[] }) {
  return (
    <ul className="catalogue-check-list">
      {items.map((item) => (
        <li key={item}>
          <Check aria-hidden="true" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export default function CataloguePage() {
  return (
    <main id="catalogue-top" className="catalogue-page">
      <header className="catalogue-header">
        <a className="catalogue-brand" href="#catalogue-top" aria-label="ATOM catalogue home">
          <Image src="/atom-logo.png" alt="ATOM" width={58} height={58} priority unoptimized />
          <span>
            <strong>ATOM</strong>
            <small>Governance, organised.</small>
          </span>
        </a>
        <CatalogueNavigation />
        <div className="catalogue-header-actions">
          <PrintCatalogueButton />
          <a className="button button-small button-copper" href="#contact">
            Book a discovery call
          </a>
        </div>
      </header>

      <section className="catalogue-hero catalogue-print-page">
        <Image
          src="/catalogue/atom-leadership-hero.png"
          alt="A diverse adult social care leadership team reviewing governance information together"
          fill
          priority
          sizes="100vw"
          className="catalogue-hero-image"
        />
        <div className="catalogue-hero-overlay" />
        <div className="catalogue-hero-content reveal">
          <p className="catalogue-kicker">Technology · Governance expertise · Continuous assurance</p>
          <h1>
            <span>ATOM</span>
            Your Outsourced Quality, Compliance &amp; Governance Department
          </h1>
          <p>
            Helping care providers organise evidence, strengthen oversight, manage improvement and remain inspection-ready every day.
          </p>
          <div className="catalogue-hero-actions">
            <a className="button button-copper" href="#contact">
              Book a Governance Discovery Call <ArrowRight aria-hidden="true" />
            </a>
            <a className="button button-ghost" href="#packages">
              Explore Our Packages
            </a>
          </div>
        </div>
        <div className="catalogue-value-strip">
          {[
            [FolderCheck, "One place", "for governance evidence"],
            [HeartHandshake, "Dedicated", "professional support"],
            [Radar, "Continuous", "quality assurance"],
          ].map(([Icon, title, copy]) => (
            <div key={String(title)}>
              <Icon aria-hidden="true" />
              <p><strong>{String(title)}</strong><span>{String(copy)}</span></p>
            </div>
          ))}
        </div>
      </section>

      <section className="catalogue-section film-section" id="film" aria-labelledby="film-heading">
        <div className="catalogue-container film-grid">
          <div className="film-copy">
            <p className="catalogue-eyebrow">Meet ATOM</p>
            <h2 id="film-heading">Your governance department, working alongside your service.</h2>
            <p>
              See how ATOM brings the system, professional oversight and quality assurance together to help care providers stay organised, act earlier and remain ready for scrutiny.
            </p>
            <a className="button button-copper" href="#packages">
              Explore support packages <ArrowRight aria-hidden="true" />
            </a>
          </div>
          <div className="film-frame">
            <video
              controls
              playsInline
              preload="metadata"
              poster="/catalogue/atom-leadership-hero.png"
              aria-label="ATOM: Your Outsourced Governance Department"
            >
              <source src="/catalogue/atom-outsourced-governance-department.mp4" type="video/mp4" />
              Your browser cannot play this video. You can download the ATOM film using the link below.
            </video>
            <a className="film-download" href="/catalogue/atom-outsourced-governance-department.mp4" download>
              Download the ATOM film
            </a>
          </div>
        </div>
      </section>

      <section className="catalogue-section challenge-section catalogue-print-page" id="challenge">
        <div className="catalogue-container challenge-grid">
          <div>
            <SectionHeading
              eyebrow="The provider challenge"
              title="Registered Managers are expected to manage everything."
              copy="Safety, staffing and care delivery do not pause while audits, evidence, actions and reports are being assembled."
            />
            <div className="challenge-quote">
              <span>“</span>
              <p>The problem is not always a lack of knowledge. It is often a lack of time, structure and dedicated governance capacity.</p>
            </div>
            <p className="catalogue-body-copy">
              ATOM gives providers the system, people and oversight required to turn governance into an organised daily function.
            </p>
          </div>
          <div className="pressure-map" aria-label="Responsibilities commonly managed by a Registered Manager">
            {[
              "Service-user safety", "Staffing", "Medication concerns", "Safeguarding", "Complaints", "Audits", "Training", "Policies", "Supervisions", "Incidents", "Evidence", "Governance meetings", "Inspection preparation",
            ].map((item, index) => <span key={item} style={{ "--order": index } as React.CSSProperties}>{item}</span>)}
            <div className="pressure-map-centre"><strong>Registered<br />Manager</strong><small>Accountable across the service</small></div>
          </div>
        </div>
      </section>

      <section className="catalogue-section solution-section" id="solution">
        <div className="catalogue-container">
          <SectionHeading
            eyebrow="The ATOM solution"
            title="One complete governance support model"
            copy="Technology, dedicated governance expertise and continuous quality assurance in one managed service."
            align="centre"
          />
          <div className="pillar-grid">
            {[
              {
                number: "01",
                icon: Layers3,
                title: "Compliance Support System",
                copy: "One organised digital home for policies, evidence, audits, registers, risks, actions, workforce compliance, meetings, deadlines, KPIs and inspection evidence.",
              },
              {
                number: "02",
                icon: UsersRound,
                title: "Assigned Governance Support",
                copy: "Structured consultancy, an assigned Governance Coordinator or a dedicated Governance Manager—matched to the support your service needs.",
              },
              {
                number: "03",
                icon: Radar,
                title: "Continuous Quality Assurance",
                copy: "Agreed operational records are reviewed for concerns, weak escalation, incomplete visits, documentation quality, supervision needs and recurring themes.",
              },
            ].map((pillar) => (
              <article key={pillar.title} className="pillar-card reveal">
                <span className="pillar-number">{pillar.number}</span>
                <pillar.icon aria-hidden="true" />
                <h3>{pillar.title}</h3>
                <p>{pillar.copy}</p>
              </article>
            ))}
          </div>
          <div className="operating-model-line" aria-hidden="true"><span /><span /><span /></div>
        </div>
      </section>

      <section className="catalogue-section platform-section catalogue-print-page" id="platform">
        <div className="catalogue-container platform-intro">
          <div>
            <SectionHeading
              eyebrow="Compliance Support System"
              title="Your governance evidence, organised in one place"
              copy="Authorised managers can maintain governance records, identify gaps, monitor deadlines, track improvement and produce traceable reports from real evidence."
            />
            <div className="module-grid">
              {systemModules.map(([label, Icon]) => (
                <div key={label} className="module-chip"><Icon aria-hidden="true" /><span>{label}</span></div>
              ))}
            </div>
          </div>
          <DashboardMockup />
        </div>
        <div className="catalogue-container boundary-panel">
          <div><CircleAlert aria-hidden="true" /><h3>Important boundaries</h3></div>
          <ul>
            <li>Not a care-planning system or eMAR.</li>
            <li>Does not predict or guarantee a CQC rating.</li>
            <li>Supports professional judgement rather than replacing it.</li>
            <li>Provider management remains responsible for operational and regulatory decisions.</li>
          </ul>
        </div>
      </section>

      <section className="catalogue-section process-section" id="process">
        <div className="catalogue-container">
          <SectionHeading
            eyebrow="How the service works"
            title="From fragmented records to continuous governance"
            align="centre"
          />
          <ol className="process-timeline">
            {[
              ["Discover", "Review structure, risks, evidence and support needs."],
              ["Configure", "Set up the organisation, locations and access."],
              ["Organise", "Structure policies, audits, risks, actions and evidence."],
              ["Monitor", "Review agreed governance information and records."],
              ["Report", "Deliver the reports included in the selected package."],
              ["Improve", "Track actions, verify evidence and review recurring risk."],
            ].map(([title, copy], index) => (
              <li key={title}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <h3>{title}</h3>
                <p>{copy}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="catalogue-section packages-section catalogue-print-page" id="packages">
        <div className="catalogue-container">
          <SectionHeading
            eyebrow="MVP packages"
            title="Choose the level of governance support your service needs"
            copy="Three clear service levels—from organised foundations to a fully managed outsourced department."
            align="centre"
          />
          <div className="pricing-grid">
            {packages.map((item) => (
              <article key={item.name} className={`pricing-card ${item.popular ? "is-popular" : ""}`}>
                {item.popular ? <p className="popular-badge">Most popular</p> : null}
                <p className="pricing-tier">ATOM service package</p>
                <h3>{item.name}</h3>
                <p className="pricing-summary">{item.summary}</p>
                <div className="price"><strong>{item.price}</strong><span>{item.cadence}</span></div>
                <CheckList items={item.features} />
                <div className="pricing-fit"><strong>Best suited to</strong><p>{item.suited}</p></div>
                <a className={`button ${item.popular ? "button-copper" : "button-navy"}`} href="#contact">
                  {item.cta} <ArrowRight aria-hidden="true" />
                </a>
              </article>
            ))}
          </div>
          <p className="pricing-note">
            Complete Governance Department pricing depends on service users, locations, monitoring volume, care complexity, review frequency and current governance risk.
          </p>
        </div>
      </section>

      <section className="catalogue-section comparison-section catalogue-print-page" aria-labelledby="comparison-heading">
        <div className="catalogue-container">
          <SectionHeading eyebrow="Compare packages" title="A clear view of what each service includes" align="centre" />
          <div className="comparison-scroll" tabIndex={0} aria-label="Scrollable package comparison">
            <table>
              <caption id="comparison-heading">ATOM package comparison</caption>
              <thead><tr><th scope="col">Feature</th><th scope="col">Compliance Foundation</th><th scope="col">Managed Governance</th><th scope="col">Complete Governance Department</th></tr></thead>
              <tbody>{comparison.map((row) => <tr key={row[0]}>{row.map((cell, index) => index === 0 ? <th key={cell} scope="row">{cell}</th> : <td key={`${row[0]}-${cell}-${index}`} data-included={cell !== "Not included"}>{cell}</td>)}</tr>)}</tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="catalogue-section daily-section catalogue-print-page">
        <div className="catalogue-container daily-grid">
          <div className="photo-panel">
            <Image
              src="/catalogue/governance-review.png"
              alt="A Registered Manager and governance consultant reviewing an action plan"
              fill
              sizes="(max-width: 900px) 100vw, 50vw"
              className="object-cover"
            />
            <div className="photo-panel-caption"><Activity aria-hidden="true" /><span>Daily governance in practice</span></div>
          </div>
          <div>
            <SectionHeading
              eyebrow="Complete-service monitoring"
              title="Know what happened yesterday before today’s risks grow"
              copy="ATOM reviews the agreed operational records, brings urgent indicators to management attention and keeps the resulting actions visible."
            />
            <ol className="compact-steps">
              {[
                "The provider securely submits the agreed monitoring export.",
                "ATOM conducts a structured evidence review.",
                "Urgent risks are highlighted for management attention.",
                "Named staff and clients are linked using appropriate confidentiality controls.",
                "Actions are recorded, assigned and monitored.",
                "Trends are reviewed in weekly and monthly governance reports.",
              ].map((item, index) => <li key={item}><span>{index + 1}</span><p>{item}</p></li>)}
            </ol>
            <div className="caution-note">
              <ShieldCheck aria-hidden="true" />
              <p>Record-based concerns are indicators requiring management validation. They must not be treated as proven misconduct without appropriate investigation.</p>
            </div>
          </div>
        </div>
        <div className="catalogue-container report-preview-grid">
          {[
            "Daily QA and Governance Report",
            "Medication Governance Review",
            "Clinical and Safeguarding Alert Summary",
            "Staff Supervision Follow-up Report",
            "Immediate Action Tracker",
            "Weekly Governance Readiness Pack",
            "Monthly Executive Governance Report",
          ].map((title, index) => <ReportPreview key={title} title={title} variant={index % 3} />)}
        </div>
      </section>

      <section className="catalogue-section difference-section" id="benefits">
        <div className="catalogue-container">
          <SectionHeading eyebrow="Why ATOM is different" title="More than software. More than consultancy." align="centre" />
          <div className="difference-grid">
            {[
              [Sparkles, "Technology plus people", "Providers receive a governance platform and professional support—not only a software licence."],
              [HeartHandshake, "Support, not another burden", "ATOM can help maintain the framework, monitor gaps and keep actions moving."],
              [Clock3, "Daily operational visibility", "The complete package brings yesterday’s risk indicators to management attention today."],
              [Target, "Evidence-led accountability", "Findings connect to named actions, owners, dates, evidence and verification."],
              [UsersRound, "Designed for adult social care", "The operating model reflects the practical realities facing Registered Managers and care leaders."],
              [Radar, "Continuous inspection readiness", "Evidence and governance are maintained as a discipline, not assembled only after notice."],
            ].map(([Icon, title, copy]) => (
              <article key={String(title)}><Icon aria-hidden="true" /><h3>{String(title)}</h3><p>{String(copy)}</p></article>
            ))}
          </div>
        </div>
      </section>

      <section className="catalogue-section benefits-section catalogue-print-page">
        <div className="catalogue-container">
          <SectionHeading
            eyebrow="Executive benefits"
            title="What changes when governance is properly supported?"
            copy="ATOM is designed to create the conditions for earlier action, clearer assurance and more dependable oversight. Outcomes still depend on provider leadership and implementation."
            align="centre"
          />
          <div className="stakeholder-grid">
            {[
              ["Registered Managers", ["Less time searching for evidence", "Clear priorities and organised actions", "Better meeting preparation", "Stronger management assurance"]],
              ["Nominated Individuals & Directors", ["Better organisational visibility", "Reliable executive reports", "Clear risk ownership", "Performance trends and evidence of oversight"]],
              ["Quality & Compliance Teams", ["Structured governance workflows", "One evidence index", "Audit and action coordination", "Reliable reporting and accountability"]],
              ["People receiving care", ["Earlier identification of potential risks", "Better escalation and learning", "More consistent oversight", "A stronger basis for service quality"]],
            ].map(([title, items]) => <article key={title as string}><h3>{title as string}</h3><CheckList items={items as string[]} /></article>)}
          </div>
        </div>
      </section>

      <section className="catalogue-section rhythm-section">
        <div className="catalogue-container">
          <SectionHeading eyebrow="Governance rhythm" title="A dependable cadence for oversight and improvement" align="centre" />
          <div className="rhythm-grid">
            {[
              ["Daily", "01", "Monitoring · Risk identification · Alerts · Immediate actions"],
              ["Weekly", "07", "Governance pack · Safeguarding and clinical-risk review · Action monitoring"],
              ["Monthly", "30", "Executive report · KPI review · Governance meeting · Compliance position"],
              ["Quarterly", "90", "Strategic review · Inspection readiness · Mock inspection · Priorities"],
            ].map(([title, day, copy]) => <article key={title}><span>{day}</span><h3>{title}</h3><p>{copy}</p></article>)}
          </div>
          <p className="core-promise">Every day, you know what is happening in your service, what requires attention, who must act and whether governance is improving.</p>
        </div>
      </section>

      <section className="catalogue-section onboarding-section catalogue-print-page">
        <div className="catalogue-container">
          <SectionHeading eyebrow="Client onboarding" title="A structured path to becoming governance-ready" align="centre" />
          <div className="onboarding-grid">
            {[
              ["Week 1", "Discovery and Scoping", ["Organisation review", "Locations and users", "Governance priorities", "Data and evidence requirements"]],
              ["Week 2", "System Configuration", ["Account setup", "Permissions and modules", "Compliance Calendar", "Governance structure"]],
              ["Week 3", "Evidence Organisation", ["Initial evidence upload", "Policy structure", "Risks and actions", "Gap identification"]],
              ["Week 4", "Managed Service Launch", ["Reporting begins", "Governance rhythm starts", "Roles are agreed", "Initial management review"]],
            ].map(([week, title, items]) => <article key={week as string}><p>{week as string}</p><h3>{title as string}</h3><CheckList items={items as string[]} /></article>)}
          </div>
          <p className="timeline-caveat">Timelines may vary according to data quality, provider availability, service size and organisational complexity.</p>
        </div>
      </section>

      <section className="catalogue-section faq-section" id="faq">
        <div className="catalogue-container faq-grid">
          <SectionHeading
            eyebrow="Frequently asked questions"
            title="Clear answers before you begin"
            copy="Discovery confirms the service scope, information-sharing arrangements, responsibilities and the package that best fits your organisation."
          />
          <FAQ items={faqs} />
        </div>
      </section>

      <section className="catalogue-cta catalogue-print-page" id="contact">
        <Image src="/catalogue/atom-leadership-hero.png" alt="Care leaders working together around governance information" fill sizes="100vw" className="object-cover" />
        <div className="catalogue-cta-overlay" />
        <div className="catalogue-cta-content">
          <p className="catalogue-eyebrow">Begin with discovery</p>
          <h2>Build a service that is ready every day—not only when an inspector calls.</h2>
          <p>Bring your governance evidence, compliance activity, management reporting and quality oversight into one structured operating model.</p>
          <div className="catalogue-hero-actions">
            <a className="button button-copper" href="mailto:[INSERT EMAIL]">Book a Governance Discovery Call</a>
            <a className="button button-ghost" href="mailto:[INSERT EMAIL]?subject=Request%20the%20ATOM%20Catalogue">Request the ATOM Catalogue</a>
          </div>
          <dl className="contact-list"><div><dt>Email</dt><dd>[INSERT EMAIL]</dd></div><div><dt>Telephone</dt><dd>[INSERT TELEPHONE]</dd></div><div><dt>Website</dt><dd>[INSERT WEBSITE]</dd></div></dl>
        </div>
      </section>

      <footer className="catalogue-footer">
        <div className="catalogue-footer-main">
          <div className="catalogue-brand catalogue-brand-footer">
            <Image src="/atom-logo.png" alt="ATOM" width={72} height={72} unoptimized />
            <span><strong>ATOM</strong><small>Your Outsourced Quality, Compliance &amp; Governance Department</small></span>
          </div>
          <div><p>[INSERT EMAIL]</p><p>[INSERT TELEPHONE]</p><p>[INSERT WEBSITE]</p></div>
          <nav aria-label="Legal"><a href="#contact">Privacy</a><a href="#contact">Terms</a><Link href="/login">Client sign in</Link></nav>
        </div>
        <div className="catalogue-footer-legal">
          <p>ATOM provides quality assurance, compliance support, governance systems and independent consultancy. It does not provide an official CQC assessment, guarantee regulatory outcomes, replace legal or clinical advice, or assume the provider’s statutory and operational responsibilities.</p>
          <p>Prices exclude VAT where applicable. Package scope and final fees are confirmed following discovery and may vary according to service size, locations, monitoring volume, complexity and regulatory risk.</p>
          <p>© {new Date().getFullYear()} ATOM. All rights reserved. This catalogue is confidential commercial information intended for prospective clients and authorised recipients.</p>
        </div>
      </footer>
      <BackToTop />
    </main>
  );
}

function DashboardMockup() {
  return (
    <div className="dashboard-mockup" aria-label="Illustrative ATOM governance dashboard preview">
      <div className="dashboard-topbar"><span className="dashboard-logo">A</span><div><strong>Governance overview</strong><small>All services · Current month</small></div><span className="status-pill">Evidence live</span></div>
      <div className="dashboard-body">
        <aside>{["Overview", "Evidence", "Audits", "Risks", "Actions", "Reports"].map((item, index) => <span key={item} className={index === 0 ? "active" : ""}>{item}</span>)}</aside>
        <div className="dashboard-content">
          <div className="dashboard-cards"><article><small>Actions due</small><strong>08</strong><span>3 high priority</span></article><article><small>Evidence position</small><strong>86%</strong><span>12 items to review</span></article><article><small>Audit programme</small><strong>92%</strong><span>On schedule</span></article></div>
          <div className="dashboard-chart"><div><small>Governance trend</small><strong>Improving evidence position</strong></div><div className="chart-bars">{[45, 58, 53, 66, 72, 69, 81, 86].map((height, index) => <span key={index} style={{ height: `${height}%` }} />)}</div></div>
          <div className="dashboard-lower"><article><small>Priority queue</small>{["Medication audit review", "Policy approval", "Safeguarding follow-up"].map((item, index) => <p key={item}><i className={index === 0 ? "urgent" : ""} />{item}<span>{index + 1}d</span></p>)}</article><article className="dashboard-ring"><div><span>74</span><small>items ready</small></div><p>Inspection evidence index</p></article></div>
        </div>
      </div>
    </div>
  );
}

function ReportPreview({ title, variant }: { title: string; variant: number }) {
  return (
    <article className={`report-preview variant-${variant}`}>
      <div className="report-preview-top"><span>ATOM</span><small>Governance report</small></div>
      <h3>{title}</h3>
      <div className="report-rule" />
      <div className="report-metrics"><span /><span /><span /></div>
      <div className="report-lines"><span /><span /><span /><span /></div>
      <p>Evidence-led management information</p>
    </article>
  );
}
