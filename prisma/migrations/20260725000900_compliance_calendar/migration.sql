CREATE TYPE "CalendarItemStatus" AS ENUM ('PENDING','COMPLETED','CANCELLED','ARCHIVED');
CREATE TYPE "CalendarItemType" AS ENUM ('CERTIFICATE_EXPIRY','INSURANCE_EXPIRY','TRAINING_EXPIRY','SUPERVISION_DEADLINE','APPRAISAL_DEADLINE','SERVICE_REVIEW','BUSINESS_CONTINUITY_TEST','OTHER');
CREATE TABLE "CalendarItem" (
  "id" UUID NOT NULL,"organisationId" UUID NOT NULL,"locationId" UUID,"title" TEXT NOT NULL,"description" TEXT,
  "itemType" "CalendarItemType" NOT NULL,"dueDate" TIMESTAMP(3) NOT NULL,"ownerId" UUID,"riskLevel" TEXT,
  "status" "CalendarItemStatus" NOT NULL DEFAULT 'PENDING',"archivedAt" TIMESTAMP(3),"createdById" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CalendarItem_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "CalendarReminder" (
  "id" UUID NOT NULL,"organisationId" UUID NOT NULL,"userId" UUID NOT NULL,"eventKey" TEXT NOT NULL,"offsetDays" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,CONSTRAINT "CalendarReminder_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CalendarReminder_offset_check" CHECK ("offsetDays" IN (-1,0,7,14,30,60,90))
);
CREATE INDEX "CalendarItem_organisationId_dueDate_status_idx" ON "CalendarItem"("organisationId","dueDate","status");
CREATE INDEX "CalendarItem_locationId_idx" ON "CalendarItem"("locationId");
CREATE INDEX "CalendarItem_ownerId_idx" ON "CalendarItem"("ownerId");
CREATE UNIQUE INDEX "CalendarReminder_userId_eventKey_offsetDays_key" ON "CalendarReminder"("userId","eventKey","offsetDays");
CREATE INDEX "CalendarReminder_organisationId_userId_idx" ON "CalendarReminder"("organisationId","userId");
ALTER TABLE "CalendarItem" ADD CONSTRAINT "CalendarItem_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CalendarItem" ADD CONSTRAINT "CalendarItem_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "ServiceLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CalendarItem" ADD CONSTRAINT "CalendarItem_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CalendarItem" ADD CONSTRAINT "CalendarItem_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CalendarReminder" ADD CONSTRAINT "CalendarReminder_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CalendarReminder" ADD CONSTRAINT "CalendarReminder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
