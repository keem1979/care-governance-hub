CREATE TYPE "CreditPayerType" AS ENUM ('LOCAL_AUTHORITY','NHS_ICB','PRIVATE_SELF_FUNDER','FAMILY_THIRD_PARTY','CHARITY','OTHER');
CREATE TYPE "CreditInvoiceStatus" AS ENUM ('OPEN','PART_PAID','DISPUTED','PAYMENT_PLAN','PAID','WRITTEN_OFF','CANCELLED');
CREATE TYPE "CreditRiskRating" AS ENUM ('LOW','MEDIUM','HIGH','CRITICAL');
CREATE TYPE "CreditContactMethod" AS ENUM ('PHONE','EMAIL','PAYER_PORTAL','LETTER','MEETING','OTHER');

CREATE TABLE "CreditAccount" (
  "id" UUID NOT NULL, "organisationId" UUID NOT NULL, "locationId" UUID,
  "payerType" "CreditPayerType" NOT NULL, "payerName" TEXT NOT NULL, "accountReference" TEXT NOT NULL,
  "contactName" TEXT, "contactEmail" TEXT, "contactPhone" TEXT, "paymentTermsDays" INTEGER NOT NULL DEFAULT 30,
  "creditLimitPence" INTEGER, "riskRating" "CreditRiskRating" NOT NULL DEFAULT 'LOW', "riskReason" TEXT,
  "portalOrRoute" TEXT, "active" BOOLEAN NOT NULL DEFAULT true, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "CreditAccount_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "CreditInvoice" (
  "id" UUID NOT NULL, "organisationId" UUID NOT NULL, "locationId" UUID, "accountId" UUID NOT NULL,
  "invoiceNumber" TEXT NOT NULL, "serviceReference" TEXT, "servicePeriodStart" TIMESTAMP(3), "servicePeriodEnd" TIMESTAMP(3),
  "invoiceDate" TIMESTAMP(3) NOT NULL, "dueDate" TIMESTAMP(3) NOT NULL, "amountPence" INTEGER NOT NULL,
  "status" "CreditInvoiceStatus" NOT NULL DEFAULT 'OPEN', "disputeReason" TEXT, "purchaseOrderRef" TEXT,
  "ownerId" UUID NOT NULL, "nextActionDate" TIMESTAMP(3), "nextAction" TEXT, "continuityRisk" BOOLEAN NOT NULL DEFAULT false,
  "createdById" UUID NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CreditInvoice_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "CreditPayment" (
  "id" UUID NOT NULL, "organisationId" UUID NOT NULL, "invoiceId" UUID NOT NULL, "amountPence" INTEGER NOT NULL,
  "receivedAt" TIMESTAMP(3) NOT NULL, "reference" TEXT, "recordedById" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "CreditPayment_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "CreditContact" (
  "id" UUID NOT NULL, "organisationId" UUID NOT NULL, "invoiceId" UUID NOT NULL, "contactedAt" TIMESTAMP(3) NOT NULL,
  "method" "CreditContactMethod" NOT NULL, "outcome" TEXT NOT NULL, "promiseDate" TIMESTAMP(3), "promisePence" INTEGER,
  "nextAction" TEXT, "recordedById" UUID NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CreditContact_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CreditAccount_organisationId_accountReference_key" ON "CreditAccount"("organisationId","accountReference");
CREATE INDEX "CreditAccount_organisationId_payerType_active_idx" ON "CreditAccount"("organisationId","payerType","active");
CREATE INDEX "CreditAccount_locationId_idx" ON "CreditAccount"("locationId");
CREATE UNIQUE INDEX "CreditInvoice_organisationId_invoiceNumber_key" ON "CreditInvoice"("organisationId","invoiceNumber");
CREATE INDEX "CreditInvoice_organisationId_status_dueDate_idx" ON "CreditInvoice"("organisationId","status","dueDate");
CREATE INDEX "CreditInvoice_accountId_dueDate_idx" ON "CreditInvoice"("accountId","dueDate");
CREATE INDEX "CreditInvoice_ownerId_nextActionDate_idx" ON "CreditInvoice"("ownerId","nextActionDate");
CREATE INDEX "CreditInvoice_locationId_idx" ON "CreditInvoice"("locationId");
CREATE INDEX "CreditPayment_organisationId_receivedAt_idx" ON "CreditPayment"("organisationId","receivedAt");
CREATE INDEX "CreditPayment_invoiceId_idx" ON "CreditPayment"("invoiceId");
CREATE INDEX "CreditContact_organisationId_contactedAt_idx" ON "CreditContact"("organisationId","contactedAt");
CREATE INDEX "CreditContact_invoiceId_contactedAt_idx" ON "CreditContact"("invoiceId","contactedAt");

ALTER TABLE "CreditAccount" ADD CONSTRAINT "CreditAccount_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CreditAccount" ADD CONSTRAINT "CreditAccount_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "ServiceLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CreditInvoice" ADD CONSTRAINT "CreditInvoice_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CreditInvoice" ADD CONSTRAINT "CreditInvoice_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "ServiceLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CreditInvoice" ADD CONSTRAINT "CreditInvoice_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "CreditAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CreditInvoice" ADD CONSTRAINT "CreditInvoice_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CreditInvoice" ADD CONSTRAINT "CreditInvoice_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CreditPayment" ADD CONSTRAINT "CreditPayment_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CreditPayment" ADD CONSTRAINT "CreditPayment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "CreditInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CreditPayment" ADD CONSTRAINT "CreditPayment_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CreditContact" ADD CONSTRAINT "CreditContact_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CreditContact" ADD CONSTRAINT "CreditContact_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "CreditInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CreditContact" ADD CONSTRAINT "CreditContact_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
