# CODEX MASTER BUILD BRIEF

## Care Governance Hub — MVP

You are the lead full-stack software engineer, product designer and quality-assurance engineer responsible for building a production-quality MVP called **Care Governance Hub**.

The product is a secure, multi-tenant compliance and governance platform for UK adult social care providers, Registered Managers, Quality Managers and nominated individuals.

The application must help users organise compliance evidence, maintain registers, complete audits, monitor overdue requirements and produce inspection-ready reports.

The MVP must feel as simple as using folders, document cards and Excel-style registers. It must not become a complex care-planning or rostering platform.

---

# 1. Product Objective

Build a secure web application that allows a care provider to answer:

> “If CQC inspected our service today, what evidence do we have, what is missing and what needs urgent attention?”

The system must provide:

* One organised compliance hub.
* Simple document upload and management.
* Built-in audit forms.
* Excel-style governance registers.
* Compliance reminders.
* Action tracking.
* Dashboard summaries.
* Inspection-ready evidence exports.
* Role-based access.
* Full audit history.

---

# 2. MVP Boundaries

## Include

* Authentication.
* Organisation and service-location setup.
* User roles and permissions.
* Dashboard.
* Policy library.
* Evidence library.
* Audit centre.
* Registers.
* Risk register.
* Action tracker.
* Governance meetings.
* Compliance calendar.
* KPI summaries.
* Inspection-readiness centre.
* Template library.
* PDF, CSV and Excel exports.
* Activity log.
* Document version history.
* Basic notifications and reminders.

## Exclude from the MVP

Do not build:

* Care planning.
* Electronic MAR.
* Rostering.
* Payroll.
* Invoicing.
* Staff scheduling.
* Family portals.
* Service-user daily notes.
* AI document analysis.
* Automated claims about CQC ratings.
* Integration with CQC systems.
* Native mobile applications.
* Complex workflow automation.
* External training delivery.

The application should be mobile-responsive, but the primary experience is desktop and tablet.

---

# 3. Recommended Technology

Use the following stack unless the repository already specifies an approved alternative:

## Application

* Next.js with TypeScript.
* React.
* Tailwind CSS.
* A consistent accessible component library.
* PostgreSQL.
* Prisma ORM.
* Secure object storage for uploaded files.
* Server-side authentication.
* Zod validation.
* React Hook Form for forms.
* TanStack Table for spreadsheet-style registers.
* Recharts for simple dashboard charts.
* Vitest or Jest for unit tests.
* Playwright for end-to-end tests.

## Deployment

Structure the application so it can be deployed using:

* Vercel or an equivalent frontend/application host.
* Managed PostgreSQL.
* S3-compatible object storage.

All environment-specific values must use environment variables.

Provide:

* `.env.example`
* database migration scripts
* seed data
* local development instructions
* production deployment instructions

---

# 4. Architecture Requirements

The application must be multi-tenant.

Every business record must belong to:

1. An organisation.
2. A service location where relevant.

A user must never be able to access another organisation’s records.

Apply organisation filtering on the server. Do not rely only on frontend filtering.

Use a modular architecture with clear domain boundaries:

* Authentication.
* Organisations.
* Locations.
* Users and roles.
* Documents.
* Policies.
* Evidence.
* Audits.
* Registers.
* Risks.
* Actions.
* Meetings.
* Calendar.
* KPIs.
* Inspection readiness.
* Templates.
* Reports.
* Activity log.

Avoid one oversized file or one oversized route.

---

# 5. User Roles

Create these default roles:

## Organisation Owner

Can:

* Manage the organisation.
* Manage subscriptions later.
* Add and remove users.
* Access all locations.
* View all reports.
* Configure organisation settings.

## Nominated Individual

Can:

* View all governance records.
* Review dashboards.
* Approve reports.
* View risks and actions.
* Access all service locations assigned to them.

## Registered Manager

Can:

* Manage records for assigned service locations.
* Upload documents.
* maintain policies.
* complete audits.
* update registers.
* assign actions.
* run reports.
* maintain governance meetings.

## Quality or Compliance Manager

Can:

* View and edit governance records.
* complete audits.
* create actions.
* review evidence.
* produce reports.
* view multiple assigned locations.

## Auditor or Consultant

Can:

* Access assigned organisations or locations.
* complete audits.
* add findings and recommendations.
* create actions.
* upload evidence.
* produce audit reports.

## Staff Contributor

Can:

* Upload requested evidence.
* complete assigned tasks.
* view only records assigned to them.
* submit information for review.

## Read-Only Viewer

Can:

* View authorised records and reports.
* Export where permitted.
* Make no changes.

Implement permissions centrally. Do not scatter role checks inconsistently across pages.

---

# 6. Main Navigation

Create a clean left-hand navigation menu:

* Dashboard
* Policies
* Evidence Library
* Audit Centre
* Registers
* Risk Register
* Action Tracker
* Governance Meetings
* Compliance Calendar
* KPI Dashboard
* Inspection Centre
* Templates
* Reports
* Activity Log
* Settings

The navigation must collapse on smaller screens.

---

# 7. Dashboard

The dashboard should immediately show the organisation’s current position.

## Header

Display:

* Organisation name.
* Selected service location.
* Current reporting month.
* Inspection-readiness status.
* Overall completion percentage.

Do not describe the score as an official CQC rating.

Use wording such as:

* Strong evidence position.
* Generally inspection-ready.
* Improvement required.
* Significant evidence gaps.

## Summary Cards

Show:

* Policies due for review.
* Overdue audits.
* Open high-risk actions.
* Training or competency evidence expiring.
* Open complaints.
* Open safeguarding matters.
* Incidents awaiting review.
* Risks overdue for review.
* Governance meetings due.
* Documents expiring within 30 days.

## Dashboard Sections

Include:

* Compliance by module.
* Recent activity.
* Upcoming deadlines.
* Overdue actions.
* High and critical risks.
* Audit completion trend.
* Quick actions.

## Quick Actions

* Upload evidence.
* Add policy.
* Start audit.
* Add register entry.
* Create action.
* Schedule governance meeting.
* Generate monthly report.

---

# 8. Policy Library

Create a card and table view.

Each policy record must contain:

* Policy title.
* Category.
* Policy owner.
* Version number.
* Effective date.
* Last review date.
* Next review date.
* Approval status.
* Approved by.
* Approval date.
* Current document.
* Previous versions.
* Tags.
* Related compliance areas.
* Notes.
* Status.

Statuses:

* Draft.
* Under review.
* Approved.
* Due for review.
* Overdue.
* Archived.

Functions:

* Add a policy.
* Upload Word or PDF documents.
* Replace the current version.
* Preserve previous versions.
* Preview supported files.
* Download.
* Archive.
* Restore.
* Filter.
* Search.
* Export policy register.
* View policy history.
* Record approval.

Create policy categories including:

* Safeguarding.
* Medicines.
* Recruitment.
* Workforce.
* Health and safety.
* Infection prevention and control.
* Mental Capacity Act.
* Complaints.
* Whistleblowing.
* Governance.
* Information governance.
* Equality and diversity.
* Business continuity.
* Care delivery.
* Consent.
* Duty of Candour.

---

# 9. Evidence Library

The Evidence Library is the central document repository.

Use card and folder-style views without creating a confusing file manager.

Each evidence item must contain:

* Title.
* Description.
* Category.
* Evidence type.
* File.
* Organisation.
* Service location.
* Record owner.
* Date created.
* Evidence date.
* Review or expiry date.
* Tags.
* Related module.
* Related audit.
* Related action.
* Confidentiality level.
* Current status.
* Uploaded by.
* Version.
* Notes.

Evidence categories:

* Registration.
* Insurance.
* Policies.
* Recruitment.
* Training.
* Supervision.
* Competencies.
* Audits.
* Governance meetings.
* Complaints.
* Safeguarding.
* Incidents.
* Medicines.
* Health and safety.
* Infection control.
* Business continuity.
* Service-user feedback.
* Staff feedback.
* Quality improvement.
* CQC notifications.
* Certificates.
* Other.

Functions:

* Drag-and-drop upload.
* Multiple-file upload.
* Search.
* Filter.
* Tag.
* Preview.
* Download.
* Replace version.
* Archive.
* Link to another record.
* Export an evidence index.

Restrict accepted files to configurable safe formats and sizes.

Sanitise filenames and prevent executable uploads.

---

# 10. Audit Centre

Create reusable audit templates and completed audit instances.

## Initial Audit Templates

Build the following:

* Governance audit.
* Policy audit.
* Staff-file audit.
* Recruitment audit.
* Training audit.
* Supervision audit.
* Care-record audit.
* Medicines audit.
* MAR audit.
* Infection-control audit.
* Health-and-safety audit.
* Complaints audit.
* Safeguarding audit.
* Incident audit.
* Risk-management audit.
* Business-continuity audit.
* CQC notification audit.
* Service-user feedback audit.
* Staff engagement audit.
* Data-protection audit.

## Audit Template Structure

Each template must support:

* Sections.
* Questions.
* Guidance text.
* Evidence expected.
* Response type.
* Weighting.
* Mandatory questions.
* Conditional comments.
* Required evidence attachment.
* Automatic finding generation.
* Version control.

Question response types:

* Compliant.
* Partially compliant.
* Non-compliant.
* Not applicable.
* Yes or no.
* Text.
* Number.
* Date.
* File upload.
* Multiple choice.

## Completed Audit

Each completed audit must record:

* Audit title.
* Template version.
* Auditor.
* Location.
* Audit date.
* Period reviewed.
* Scope.
* Responses.
* Evidence.
* Findings.
* Strengths.
* Risks.
* Recommendations.
* Overall score.
* Section scores.
* Actions created.
* Sign-off.
* Review date.
* Status.

Statuses:

* Draft.
* In progress.
* Awaiting review.
* Completed.
* Closed.
* Archived.

Any non-compliant answer should allow the user to create an action immediately.

Provide a professional PDF audit report.

---

# 11. Registers

Create a common reusable register framework.

All registers should provide:

* Add entry.
* Edit entry.
* View entry.
* Search.
* Filters.
* Sorting.
* Pagination.
* Column selection.
* Status.
* Attach evidence.
* Link actions.
* Export CSV.
* Export Excel.
* Export PDF.
* Record history.

Build these registers:

* Complaints.
* Compliments.
* Incidents.
* Accidents.
* Near misses.
* Safeguarding.
* Whistleblowing.
* CQC notifications.
* Medicines errors.
* Falls.
* Pressure damage.
* Hospital admissions.
* Missed visits.
* Late visits.
* Staff concerns.
* Service-user feedback.
* Staff feedback.
* Training exceptions.
* Supervision exceptions.
* Data breaches.

Each register may have specialised fields, but all must use the same design pattern.

## Example Complaint Fields

* Reference.
* Date received.
* Complainant.
* Person affected.
* Complaint category.
* Summary.
* Risk level.
* Investigator.
* Acknowledgement date.
* Target response date.
* Outcome.
* Duty of Candour required.
* External referral.
* Learning identified.
* Actions.
* Closure date.
* Status.
* Evidence.

## Example Incident Fields

* Reference.
* Incident date and time.
* Date reported.
* Location.
* Person affected.
* Incident type.
* Description.
* Immediate response.
* Injury or harm level.
* Emergency services involved.
* Family notified.
* Safeguarding referral required.
* CQC notification required.
* Duty of Candour required.
* Investigation owner.
* Root cause.
* Learning.
* Actions.
* Status.
* Closure date.

Use first name and internal reference fields rather than encouraging unnecessary personal data.

---

# 12. Risk Register

Fields:

* Risk reference.
* Risk title.
* Description.
* Risk category.
* Location.
* Existing controls.
* Likelihood.
* Impact.
* Initial risk score.
* Further controls required.
* Action owner.
* Target date.
* Residual likelihood.
* Residual impact.
* Residual risk score.
* Review frequency.
* Last review date.
* Next review date.
* Risk status.
* Evidence.
* Review history.

Use a 1–5 likelihood and 1–5 impact matrix.

Calculate score automatically.

Provide configurable levels:

* Low.
* Moderate.
* High.
* Critical.

Display a risk heat map.

Do not allow a high or critical risk to be closed without:

* a closure rationale;
* named approval;
* closure date.

---

# 13. Action Tracker

Actions can originate from:

* Audits.
* Complaints.
* Incidents.
* Safeguarding.
* Risks.
* Governance meetings.
* Policy reviews.
* Manual entries.

Fields:

* Action reference.
* Action title.
* Description.
* Source.
* Source record.
* Owner.
* Priority.
* Due date.
* Status.
* Progress note.
* Evidence required.
* Evidence attached.
* Completion date.
* Verified by.
* Verification date.
* Closure note.

Statuses:

* Open.
* In progress.
* Awaiting evidence.
* Awaiting verification.
* Completed.
* Overdue.
* Cancelled.

Priorities:

* Low.
* Medium.
* High.
* Critical.

An action is not fully closed until evidence is attached or a permitted evidence-waiver explanation is recorded.

---

# 14. Governance Meetings

Create structured meeting records.

Fields:

* Meeting title.
* Meeting type.
* Date.
* Time.
* Location or video link.
* Chair.
* Attendees.
* Apologies.
* Reporting period.
* Agenda.
* Previous actions.
* KPI review.
* Audit findings.
* Complaints.
* Incidents.
* Safeguarding.
* Workforce.
* Risks.
* Quality improvement.
* Decisions.
* New actions.
* Minutes.
* Attachments.
* Approval status.
* Approved by.
* Approval date.
* Next meeting date.

Meeting types:

* Monthly governance.
* Quality and safety.
* Medicines governance.
* Health and safety.
* Senior leadership.
* Staff meeting.
* Lessons learned.
* Emergency review.
* Board review.

Provide:

* Meeting agenda export.
* Minutes export.
* Action extraction.
* Previous-action rollover.

---

# 15. Compliance Calendar

Show:

* Policy review dates.
* Audit due dates.
* Governance meetings.
* Risk reviews.
* Action deadlines.
* Certificate expiries.
* Insurance expiries.
* Training evidence expiries.
* Supervision deadlines.
* Appraisal deadlines.
* Service review dates.
* Business-continuity test dates.

Views:

* Month.
* Week.
* Agenda list.

Filters:

* Location.
* Owner.
* Record type.
* Risk level.
* Status.

Allow users to create reminders:

* 90 days before.
* 60 days before.
* 30 days before.
* 14 days before.
* 7 days before.
* On due date.
* Overdue.

For the MVP, in-app reminders are sufficient. Design notification services so email reminders can be added later.

---

# 16. KPI Dashboard

Create monthly KPI entry and reporting.

Initial KPIs:

* Care hours delivered.
* Missed visits.
* Late visits.
* Medication errors.
* Falls.
* Pressure damage.
* Hospital admissions.
* Complaints.
* Compliments.
* Safeguarding referrals.
* Incidents.
* Near misses.
* Staff turnover.
* Staff sickness.
* Vacancies.
* Training compliance.
* Supervision compliance.
* Appraisal compliance.
* Spot-check compliance.
* Care-plan reviews.
* Risk assessments reviewed.
* Service-user satisfaction.
* Staff satisfaction.
* Open actions.
* Overdue actions.
* Audit completion.
* Policy compliance.

Allow:

* Manual entry.
* Target setting.
* Monthly actuals.
* RAG thresholds.
* Notes.
* Evidence attachment.
* Trend chart.
* Location comparison.
* CSV import.
* CSV and PDF export.

Do not invent data when no KPI entry exists. Show “No data recorded.”

---

# 17. Inspection Centre

The Inspection Centre is an evidence-readiness tool, not an official CQC rating predictor.

Organise evidence under the five CQC key questions:

* Safe.
* Effective.
* Caring.
* Responsive.
* Well-led.

Also allow mapping to configurable quality statements.

Each evidence requirement must show:

* Requirement title.
* Explanation.
* Evidence examples.
* Documents linked.
* Audits linked.
* Register entries linked.
* Actions linked.
* Owner.
* Review date.
* Evidence status.
* Confidence note.

Evidence statuses:

* No evidence.
* Limited evidence.
* Evidence available.
* Evidence reviewed.
* Improvement required.

Provide:

* Evidence-gap view.
* Overdue-evidence view.
* Inspection checklist.
* Inspection pack export.
* Evidence index.
* Readiness summary.

Add a permanent disclaimer:

> “This readiness assessment is an internal governance tool. It is not an official CQC assessment, rating or guarantee of inspection outcome.”

---

# 18. Template Library

Provide downloadable and duplicable templates.

Initial template categories:

* Policies.
* Audit forms.
* Risk assessments.
* Governance meetings.
* Action plans.
* Investigation forms.
* Complaints.
* Incident management.
* Safeguarding.
* Recruitment.
* Supervision.
* Competency assessments.
* Quality improvement.
* Business continuity.
* Reports.
* Letters.
* Checklists.

For the MVP, seed representative example templates and make it easy for administrators to add more.

Template fields:

* Title.
* Category.
* Description.
* File.
* Version.
* Review date.
* Author.
* Tags.
* Status.

Users must be able to:

* Preview.
* Download.
* Copy into their organisation’s evidence library.
* Archive organisation-specific templates.

---

# 19. Reports

Create these reports:

* Monthly governance report.
* Quality assurance report.
* Audit report.
* Risk report.
* Action status report.
* Complaints report.
* Incident report.
* Safeguarding report.
* Policy compliance report.
* KPI report.
* Inspection-readiness report.
* Evidence index.
* Board summary report.

Reports must allow:

* Date range.
* Location.
* Status.
* Category.
* Include or exclude appendices.
* Generated by.
* Generation date.
* PDF export.
* CSV or Excel export where suitable.

Generated reports must contain only real database records. Do not use placeholder findings in production reports.

---

# 20. Activity Log and Audit Trail

Record:

* User.
* Date and time.
* Organisation.
* Location.
* Action performed.
* Record type.
* Record identifier.
* Before value where appropriate.
* After value where appropriate.
* IP or session information where legally and technically appropriate.

Track at minimum:

* Creation.
* Editing.
* Deletion or archiving.
* File upload.
* File download.
* Approval.
* Status changes.
* Action closure.
* Report generation.
* User and permission changes.

The activity log must not be editable by ordinary users.

Use soft deletion for governance records unless permanent deletion is specifically authorised.

---

# 21. Security and Information Governance

Build security into the MVP.

Requirements:

* Secure password handling.
* Session expiration.
* Role-based access.
* Server-side tenant isolation.
* Secure file URLs.
* Time-limited file downloads where supported.
* Input validation.
* Output escaping.
* CSRF protections where applicable.
* Rate limiting on authentication.
* No secrets committed to source control.
* Sensitive error details hidden in production.
* Database backups documented.
* Restore procedure documented.
* File-size limits.
* File-type validation.
* Malware-scanning integration point.
* Data retention settings.
* Account deactivation.
* Export of organisation data.
* Audit trail.

Add privacy-conscious interface text. Avoid collecting unnecessary special-category data.

Do not claim that the product itself makes a provider GDPR-compliant or CQC-compliant.

---

# 22. Accessibility and User Experience

The users may have limited technical confidence.

The interface must be:

* Simple.
* Clear.
* Professional.
* Calm.
* Accessible.
* Responsive.
* Consistent.

Requirements:

* Plain English labels.
* Keyboard navigation.
* Visible focus states.
* Appropriate colour contrast.
* Labels for all form controls.
* Helpful empty states.
* Confirmation before destructive actions.
* Clear validation messages.
* Autosave for long audits where practical.
* Unsaved-change warnings.
* Loading states.
* Error states.
* Success messages.

Avoid excessive animations and crowded dashboards.

Use traffic-light colours only alongside text or icons, never as the sole status indicator.

---

# 23. Suggested Data Model

Create and document entities for:

* User.
* Organisation.
* OrganisationMembership.
* ServiceLocation.
* Role.
* Permission.
* Document.
* DocumentVersion.
* EvidenceItem.
* Policy.
* PolicyVersion.
* AuditTemplate.
* AuditTemplateSection.
* AuditQuestion.
* AuditInstance.
* AuditResponse.
* AuditFinding.
* RegisterDefinition.
* RegisterEntry.
* Complaint.
* Incident.
* SafeguardingRecord.
* NotificationRecord.
* Risk.
* RiskReview.
* Action.
* ActionUpdate.
* GovernanceMeeting.
* MeetingAttendee.
* MeetingAgendaItem.
* KPI.
* KPIEntry.
* ComplianceRequirement.
* EvidenceMapping.
* CalendarItem.
* Template.
* Report.
* ActivityLog.
* Notification.
* Comment.
* Attachment.

Use specialised tables when a domain has important structured data. Do not force every record into an unstructured JSON blob.

JSON may be used for configurable template definitions where justified, but core searchable and reportable fields must be relational.

---

# 24. Seed Data

Create a demo organisation:

**Meadow View Home Care Ltd**

Create one service location:

**Basingstoke Branch**

Create demo users for each major role.

Seed realistic but fictional records:

* 20 policies.
* 10 policy review dates.
* 5 audits.
* 12 actions.
* 8 risks.
* 5 complaints.
* 8 incidents.
* 3 safeguarding entries.
* 3 governance meetings.
* 12 months of selected KPI data.
* Evidence records.
* Inspection-centre requirements.

Clearly label all seeded records as fictional demonstration data.

Do not use real personal information.

---

# 25. Testing Requirements

Create automated tests for:

## Authentication

* Successful login.
* Failed login.
* Unauthenticated route protection.
* Session expiry.

## Multi-Tenancy

* User cannot access another organisation.
* User cannot retrieve another organisation’s files.
* Cross-tenant record identifiers are rejected.

## Permissions

* Read-only user cannot edit.
* Registered Manager cannot manage unauthorised organisations.
* Organisation Owner can manage members.
* Auditor can access only assigned locations.

## Core Workflows

* Upload policy.
* Add new policy version.
* Complete audit.
* Generate action from non-compliance.
* Add complaint.
* Add incident.
* Add risk.
* Review risk.
* Close action with evidence.
* Create governance meeting.
* Enter KPI.
* Generate report.
* Export register.
* Link evidence to inspection requirement.

## Validation

* Required fields.
* Invalid dates.
* File restrictions.
* Risk score calculation.
* Overdue status calculation.
* KPI RAG calculation.

Run:

* Type checking.
* Linting.
* Unit tests.
* Integration tests.
* End-to-end tests.
* Production build.

All must pass before declaring a milestone complete.

---

# 26. Documentation

Create:

* `README.md`
* `AGENTS.md`
* `ARCHITECTURE.md`
* `SECURITY.md`
* `DATA_MODEL.md`
* `DEPLOYMENT.md`
* `TESTING.md`
* `PRODUCT_SCOPE.md`
* `CHANGELOG.md`

The `AGENTS.md` file must tell future coding agents:

* Project purpose.
* Technology stack.
* Repository structure.
* Coding conventions.
* Database conventions.
* Security rules.
* Tenant-isolation rules.
* Required tests.
* Commands to run.
* Definition of done.
* Features that are deliberately out of scope.

---

# 27. Definition of Done

A feature is complete only when:

* The interface is implemented.
* Server-side logic is implemented.
* Database schema and migration exist.
* Validation exists.
* Permissions are enforced.
* Tenant isolation is enforced.
* Loading, empty and error states exist.
* Audit logging is implemented where required.
* Unit or integration tests exist.
* Relevant end-to-end workflow passes.
* Documentation is updated.
* Type checking passes.
* Linting passes.
* All tests pass.
* Production build succeeds.

Do not mark a feature complete because only the page design exists.

---

# 28. Build Sequence

Complete the work in the following milestones.

## Milestone 1 — Foundation

Build:

* Repository setup.
* Authentication.
* Database.
* Organisation model.
* Service locations.
* Users.
* Roles.
* Permissions.
* Multi-tenant protections.
* Application shell.
* Navigation.
* Demo seed data.
* Core documentation.

Stop and provide:

* Files changed.
* Architecture summary.
* Commands run.
* Test results.
* Known limitations.

## Milestone 2 — Documents and Policies

Build:

* File storage abstraction.
* Evidence Library.
* Policy Library.
* Version history.
* Search and filtering.
* Expiry dates.
* Document preview and download.
* Activity logging.
* Tests.

## Milestone 3 — Registers and Risks

Build:

* Shared register framework.
* Complaints.
* Incidents.
* Safeguarding.
* CQC notifications.
* Risk register.
* Action tracker.
* Exports.
* Tests.

## Milestone 4 — Audits

Build:

* Audit templates.
* Audit builder structure.
* Audit completion workflow.
* Audit scoring.
* Findings.
* Evidence upload.
* Automatic action creation.
* Audit PDF report.
* Tests.

## Milestone 5 — Governance and Calendar

Build:

* Governance meetings.
* Meeting minutes.
* Action rollover.
* Compliance calendar.
* Due-date engine.
* In-app reminders.
* Tests.

## Milestone 6 — KPIs and Dashboard

Build:

* KPI definitions.
* Monthly KPI entry.
* Targets.
* RAG rules.
* Trend charts.
* Dashboard.
* Tests.

## Milestone 7 — Inspection Centre and Reports

Build:

* Evidence requirements.
* Evidence mapping.
* Gap analysis.
* Inspection checklist.
* Inspection pack.
* Monthly governance report.
* Board summary.
* Evidence index.
* Tests.

## Milestone 8 — Hardening

Complete:

* Accessibility review.
* Security review.
* Tenant-isolation tests.
* Permission tests.
* Performance review.
* Error handling.
* Backup and restore documentation.
* Deployment documentation.
* Production build.
* Final end-to-end test suite.

---

# 29. Instructions for How to Work

Before coding:

1. Inspect the repository.
2. Read all documentation.
3. Identify what already exists.
4. Create an implementation plan.
5. Record assumptions.
6. Do not overwrite working functionality without justification.

During development:

* Work one milestone at a time.
* Keep commits logically separated.
* Avoid unrelated refactoring.
* Do not create fake integrations.
* Do not hard-code tenant IDs.
* Do not bypass permissions for convenience.
* Keep schema migrations reversible where practical.
* Update documentation continuously.
* Show progress after meaningful stages.
* Run tests after each significant feature.

When requirements are ambiguous:

* Choose the simplest safe implementation consistent with this brief.
* Record the decision in `ARCHITECTURE.md`.
* Do not introduce large new dependencies without explaining why.

At the end of each milestone, provide:

* What was completed.
* Important implementation decisions.
* Database changes.
* Security controls added.
* Tests added.
* Commands executed.
* Test output summary.
* Remaining limitations.
* Recommended next milestone.

---

# 30. First Assignment

Start with **Milestone 1 only**.

Do not attempt all milestones at once.

Create the project foundation, authentication, tenant model, roles, permissions, service locations, application layout, navigation, seed data and core documentation.

Before writing code, present a concise implementation plan based on the actual repository.

After implementation, run all available checks and provide the milestone completion report.

