CREATE TYPE "MeetingStatus" AS ENUM ('DRAFT','SCHEDULED','IN_PROGRESS','AWAITING_APPROVAL','APPROVED','CANCELLED','ARCHIVED');
CREATE TYPE "MeetingAttendance" AS ENUM ('ATTENDING','ATTENDED','APOLOGY','ABSENT');
CREATE TABLE "GovernanceMeeting" (
  "id" UUID NOT NULL,"organisationId" UUID NOT NULL,"locationId" UUID,"reference" TEXT NOT NULL,"title" TEXT NOT NULL,
  "meetingType" TEXT NOT NULL,"meetingDate" TIMESTAMP(3) NOT NULL,"meetingTime" TEXT NOT NULL,"locationOrLink" TEXT NOT NULL,
  "chairId" UUID NOT NULL,"reportingPeriod" TEXT,"previousActionIds" TEXT[] DEFAULT ARRAY[]::TEXT[],"kpiReview" TEXT,
  "auditFindings" TEXT,"complaints" TEXT,"incidents" TEXT,"safeguarding" TEXT,"workforce" TEXT,"risks" TEXT,
  "qualityImprovement" TEXT,"decisions" TEXT,"minutes" TEXT,"status" "MeetingStatus" NOT NULL DEFAULT 'DRAFT',
  "approvedById" UUID,"approvalDate" TIMESTAMP(3),"nextMeetingDate" TIMESTAMP(3),"archivedAt" TIMESTAMP(3),
  "createdById" UUID NOT NULL,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GovernanceMeeting_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "MeetingAttendee" ("meetingId" UUID NOT NULL,"userId" UUID NOT NULL,"attendance" "MeetingAttendance" NOT NULL DEFAULT 'ATTENDING',CONSTRAINT "MeetingAttendee_pkey" PRIMARY KEY ("meetingId","userId"));
CREATE TABLE "MeetingAgendaItem" (
  "id" UUID NOT NULL,"meetingId" UUID NOT NULL,"topic" TEXT NOT NULL,"title" TEXT NOT NULL,"notes" TEXT,"decision" TEXT,
  "linkedActionId" UUID,"sortOrder" INTEGER NOT NULL,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,CONSTRAINT "MeetingAgendaItem_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "MeetingEvidence" ("meetingId" UUID NOT NULL,"evidenceId" UUID NOT NULL,CONSTRAINT "MeetingEvidence_pkey" PRIMARY KEY ("meetingId","evidenceId"));
CREATE UNIQUE INDEX "GovernanceMeeting_organisationId_reference_key" ON "GovernanceMeeting"("organisationId","reference");
CREATE INDEX "GovernanceMeeting_organisationId_status_meetingDate_idx" ON "GovernanceMeeting"("organisationId","status","meetingDate");
CREATE INDEX "GovernanceMeeting_locationId_idx" ON "GovernanceMeeting"("locationId");
CREATE INDEX "GovernanceMeeting_chairId_idx" ON "GovernanceMeeting"("chairId");
CREATE INDEX "MeetingAttendee_userId_idx" ON "MeetingAttendee"("userId");
CREATE UNIQUE INDEX "MeetingAgendaItem_meetingId_sortOrder_key" ON "MeetingAgendaItem"("meetingId","sortOrder");
CREATE INDEX "MeetingAgendaItem_meetingId_idx" ON "MeetingAgendaItem"("meetingId");
CREATE INDEX "MeetingAgendaItem_linkedActionId_idx" ON "MeetingAgendaItem"("linkedActionId");
CREATE INDEX "MeetingEvidence_evidenceId_idx" ON "MeetingEvidence"("evidenceId");
ALTER TABLE "GovernanceMeeting" ADD CONSTRAINT "GovernanceMeeting_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GovernanceMeeting" ADD CONSTRAINT "GovernanceMeeting_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "ServiceLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GovernanceMeeting" ADD CONSTRAINT "GovernanceMeeting_chairId_fkey" FOREIGN KEY ("chairId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GovernanceMeeting" ADD CONSTRAINT "GovernanceMeeting_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GovernanceMeeting" ADD CONSTRAINT "GovernanceMeeting_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MeetingAttendee" ADD CONSTRAINT "MeetingAttendee_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "GovernanceMeeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MeetingAttendee" ADD CONSTRAINT "MeetingAttendee_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MeetingAgendaItem" ADD CONSTRAINT "MeetingAgendaItem_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "GovernanceMeeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MeetingEvidence" ADD CONSTRAINT "MeetingEvidence_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "GovernanceMeeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MeetingEvidence" ADD CONSTRAINT "MeetingEvidence_evidenceId_fkey" FOREIGN KEY ("evidenceId") REFERENCES "Evidence"("id") ON DELETE CASCADE ON UPDATE CASCADE;
