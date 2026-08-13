import "server-only";

import { getPolicyFile } from "@/lib/policy-storage";

export type TemplateBrand = {
  name: string;
  policyBrandName: string | null;
  policyRegistrationNumber: string | null;
  policyAddress: string | null;
  policyEmail: string | null;
  policyPhone: string | null;
  policyWebsite: string | null;
  policyPrimaryColour: string;
  policyLogoStorageKey: string | null;
  policyLogoContentType: string | null;
};

type DocumentSection = { heading: string; lines: string[] };

function escape(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function isHeading(value: string): boolean {
  return /^[A-Z0-9 /&(),'-]{4,}$/.test(value);
}

function splitField(value: string): { label: string; choices: string[] } {
  const separator = value.indexOf(":");
  const label = separator === -1 ? value : value.slice(0, separator);
  const answer = separator === -1 ? "" : value.slice(separator + 1).trim();
  const choices = answer.includes("/") ? answer.split("/").map((item) => item.trim()).filter(Boolean) : [];
  return { label, choices: choices.length > 1 && choices.length <= 8 ? choices : [] };
}

function checkbox(label: string): string {
  return `<span class="choice"><span class="box" aria-hidden="true"></span>${escape(label)}</span>`;
}

function responseCell(choices: string[]): string {
  if (choices.length) return `<div class="choices">${choices.map(checkbox).join("")}</div>`;
  return '<div class="write-lines"><span></span><span></span></div>';
}

function fieldRows(lines: string[], includeCheck = false): string {
  return lines.map((line, index) => {
    const field = splitField(line);
    return `<tr>${includeCheck ? `<td class="check-cell"><span class="box" aria-label="Complete item ${index + 1}"></span></td>` : ""}<th scope="row">${escape(field.label)}</th><td>${responseCell(field.choices)}</td></tr>`;
  }).join("");
}

function sectionOutcome(): string {
  return `<div class="section-outcome"><strong>Section assurance</strong><div class="choices">${["Assured", "Partially assured", "Not assured", "Not applicable"].map(checkbox).join("")}</div><div class="evidence-ref"><span>Evidence reference(s)</span><i></i></div></div>`;
}

function actionTable(): string {
  const rows = Array.from({ length: 5 }, (_, index) => `<tr><td>${index + 1}</td><td></td><td></td><td></td><td></td><td><span class="box"></span></td></tr>`).join("");
  return `<p class="section-help">Record each improvement separately. An action is complete only when the evidence has been checked and its effectiveness confirmed.</p><div class="table-wrap"><table class="action-table"><thead><tr><th>No.</th><th>Improvement action and intended outcome</th><th>Owner</th><th>Priority / due date</th><th>Closure evidence and effectiveness check</th><th>Closed</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

function managementAssurance(lines: string[]): string {
  const remaining = lines.filter((line) => !line.toLowerCase().startsWith("overall assurance:"));
  return `<div class="assurance-panel"><strong>Overall assurance judgement</strong><div class="choices">${["Assured", "Partially assured", "Not assured"].map(checkbox).join("")}</div></div><div class="table-wrap"><table class="form-table"><thead><tr><th>Management review</th><th>Decision, rationale and evidence</th></tr></thead><tbody>${fieldRows(remaining)}</tbody></table></div>`;
}

function renderSection(section: DocumentSection): string {
  const heading = section.heading.toUpperCase();
  if (heading === "PURPOSE AND EXPECTED OUTCOME") {
    return `<section class="document-section purpose"><h2>${escape(section.heading)}</h2>${section.lines.map((line) => `<p>${escape(line)}</p>`).join("")}</section>`;
  }
  if (heading === "DOCUMENT CONTROL") {
    return `<section class="document-section"><h2>${escape(section.heading)}</h2><div class="table-wrap"><table class="form-table control-table"><thead><tr><th>Controlled field</th><th>Completion details</th></tr></thead><tbody>${fieldRows(section.lines)}</tbody></table></div></section>`;
  }
  if (heading === "ACTION AND VERIFICATION") {
    return `<section class="document-section page-break"><h2>${escape(section.heading)}</h2>${actionTable()}</section>`;
  }
  if (heading === "MANAGEMENT ASSURANCE AND SIGN-OFF") {
    return `<section class="document-section page-break"><h2>${escape(section.heading)}</h2>${managementAssurance(section.lines)}</section>`;
  }
  return `<section class="document-section"><h2>${escape(section.heading)}</h2><div class="table-wrap"><table class="form-table review-table"><thead><tr><th class="check-column">Check</th><th>Review requirement or field</th><th>Evidence, decision or response</th></tr></thead><tbody>${fieldRows(section.lines, true)}</tbody></table></div>${sectionOutcome()}</section>`;
}

function parseDocument(body: string, title: string): { subtitle: string | null; sections: DocumentSection[] } {
  const lines = body.replaceAll("\\r\\n", "\n").replaceAll("\\n", "\n").split(/\r?\n/).map((line) => line.trim());
  while (!lines[0]) lines.shift();
  if (lines[0]?.toLowerCase() === title.trim().toLowerCase()) lines.shift();
  const subtitle = lines[0] && !isHeading(lines[0]) ? lines.shift() ?? null : null;
  const sections: DocumentSection[] = [];
  let current: DocumentSection | null = null;
  for (const line of lines) {
    if (!line) continue;
    if (isHeading(line)) {
      current = { heading: line, lines: [] };
      sections.push(current);
    } else if (current) current.lines.push(line);
  }
  return { subtitle, sections };
}

function bodyMarkup(body: string, title: string): string {
  const parsed = parseDocument(body, title);
  return `${parsed.subtitle ? `<div class="document-status"><span class="status-dot"></span>${escape(parsed.subtitle)}</div>` : ""}${parsed.sections.map(renderSection).join("")}`;
}

export async function templateLogoDataUrl(brand: TemplateBrand): Promise<string | null> {
  if (!brand.policyLogoStorageKey || !brand.policyLogoContentType) return null;
  const file = await getPolicyFile(brand.policyLogoStorageKey);
  if (!file) return null;
  const bytes = new Uint8Array(await new Response(file).arrayBuffer());
  return `data:${brand.policyLogoContentType};base64,${Buffer.from(bytes).toString("base64")}`;
}

export function brandedTemplateHtml(input: { title: string; category: string; version: string; bodyText: string; brand: TemplateBrand; logoDataUrl: string | null }): string {
  const displayName = input.brand.policyBrandName?.trim() || input.brand.name;
  const colour = /^#[0-9a-f]{6}$/i.test(input.brand.policyPrimaryColour) ? input.brand.policyPrimaryColour : "#0f766e";
  const contact = [input.brand.policyRegistrationNumber, input.brand.policyEmail, input.brand.policyPhone, input.brand.policyWebsite].filter(Boolean).map(String).join(" · ");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escape(input.title)} | ${escape(displayName)}</title><style>
  @page{size:A4;margin:13mm}*{box-sizing:border-box}body{margin:0;background:#e8efed;color:#15221f;font:12.5px/1.45 Arial,sans-serif}.page{width:min(210mm,100%);min-height:297mm;margin:24px auto;background:#fff;box-shadow:0 18px 50px #102a2430}.brand{display:grid;grid-template-columns:142px 1fr;gap:25px;align-items:center;padding:25px 30px;background:${colour};color:#fff}.brand img{width:132px;height:80px;object-fit:contain;background:#fff;border-radius:10px;padding:9px}.brand .name{font-size:10px;font-weight:800;letter-spacing:.15em;text-transform:uppercase}.brand h1{margin:7px 0 0;font-size:25px;line-height:1.15}.meta{display:flex;flex-wrap:wrap;gap:7px 20px;padding:10px 30px;border-bottom:1px solid #ccd9d5;background:#f4f8f7;color:#4d5e59;font-size:10px}.content{padding:18px 30px 34px}.document-status{display:inline-flex;align-items:center;gap:7px;margin-bottom:8px;padding:5px 9px;border:1px solid #b8d5ce;border-radius:999px;background:#eef8f5;color:${colour};font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em}.status-dot{width:7px;height:7px;border-radius:50%;background:${colour}}.document-section{margin:14px 0 20px}.document-section h2{margin:0;padding:8px 11px;background:${colour};color:#fff;font-size:12px;letter-spacing:.07em;text-transform:uppercase}.purpose{border:1px solid #cddbd7;border-radius:5px;overflow:hidden;background:#f8fbfa}.purpose p{margin:0;padding:8px 11px}.purpose p+p{padding-top:0;color:#4f615c}.table-wrap{overflow:hidden;border:1px solid #aebfba;border-top:0}.form-table,.action-table{width:100%;border-collapse:collapse;table-layout:fixed}.form-table thead th,.action-table thead th{padding:7px 8px;background:#eaf3f0;color:#243a34;font-size:9.5px;text-align:left;text-transform:uppercase;letter-spacing:.04em}.form-table th,.form-table td,.action-table th,.action-table td{border-right:1px solid #bdcbc7;border-bottom:1px solid #bdcbc7;vertical-align:top}.form-table tr:last-child>*,.action-table tr:last-child>*{border-bottom:0}.form-table tr>*:last-child,.action-table tr>*:last-child{border-right:0}.form-table tbody th{width:32%;padding:8px 9px;background:#f7faf9;text-align:left;font-size:11px}.form-table tbody td{height:43px;padding:7px 9px}.control-table tbody th{width:34%}.review-table .check-column{width:8%}.review-table thead th:nth-child(2){width:33%}.review-table .check-cell{width:8%;padding:11px;text-align:center}.box{display:inline-block;flex:0 0 13px;width:13px;height:13px;border:1.5px solid #344b45;border-radius:2px;background:#fff}.choices{display:flex;flex-wrap:wrap;gap:7px 13px}.choice{display:inline-flex;align-items:center;gap:5px;white-space:nowrap;font-size:10.5px}.write-lines{display:grid;gap:11px;padding-top:5px}.write-lines span{display:block;border-bottom:1px dotted #91a29d}.section-outcome{display:grid;grid-template-columns:auto 1fr;gap:8px 15px;align-items:center;padding:9px 11px;border:1px solid #aebfba;border-top:0;background:#f8fbfa}.section-outcome strong{font-size:10px;text-transform:uppercase;color:${colour}}.evidence-ref{grid-column:1/-1;display:flex;align-items:end;gap:9px;font-size:10px}.evidence-ref i{flex:1;border-bottom:1px solid #788984}.section-help{margin:0;padding:8px 11px;border:1px solid #aebfba;border-bottom:0;background:#f8fbfa;color:#425650}.action-table th:nth-child(1){width:5%}.action-table th:nth-child(2){width:30%}.action-table th:nth-child(3){width:14%}.action-table th:nth-child(4){width:16%}.action-table th:nth-child(5){width:29%}.action-table th:nth-child(6){width:6%}.action-table td{height:55px;padding:7px;text-align:left}.action-table td:first-child,.action-table td:last-child{text-align:center}.assurance-panel{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:9px;padding:10px 11px;border:1px solid #aebfba;border-bottom:0;background:#eaf3f0}.assurance-panel strong{color:${colour};text-transform:uppercase;font-size:10px}.footer{margin:0 30px;padding:12px 0 20px;border-top:1px solid #ccd9d5;color:#60716c;font-size:9px}.page-number{float:right;font-weight:700}@media(max-width:720px){.brand{grid-template-columns:1fr}.brand img{width:110px}.content{padding:15px}.meta{padding:10px 15px}.table-wrap{overflow-x:auto}.form-table,.action-table{min-width:650px}.section-outcome{grid-template-columns:1fr}.evidence-ref{grid-column:auto}}@media print{body{background:#fff}.page{width:auto;min-height:auto;margin:0;box-shadow:none}.brand,.document-section h2,.form-table thead th,.action-table thead th,.assurance-panel{-webkit-print-color-adjust:exact;print-color-adjust:exact}.document-section{break-inside:avoid}.page-break{break-before:auto}}
  </style></head><body><article class="page"><header class="brand">${input.logoDataUrl ? `<img src="${input.logoDataUrl}" alt="${escape(displayName)} logo">` : `<div class="name">${escape(displayName)}</div>`}<div><div class="name">${escape(input.category)} · Controlled template v${escape(input.version)}</div><h1>${escape(input.title)}</h1></div></header><div class="meta"><span><strong>Organisation:</strong> ${escape(displayName)}</span>${contact ? `<span>${escape(contact)}</span>` : ""}<span><strong>Generated:</strong> ${new Intl.DateTimeFormat("en-GB", { dateStyle: "long", timeZone: "Europe/London" }).format(new Date())}</span></div><main class="content">${bodyMarkup(input.bodyText, input.title)}</main><footer class="footer">Controlled working document generated by QCGMS. Complete every applicable field, reference objective evidence, protect personal information and obtain the required approval before filing in the Evidence Library.<span class="page-number">QCGMS controlled document</span></footer></article></body></html>`;
}
