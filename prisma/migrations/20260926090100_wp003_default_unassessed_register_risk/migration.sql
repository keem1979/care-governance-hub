-- New canonical register entries have no professional risk judgement until one is recorded.
ALTER TABLE "RegisterEntry" ALTER COLUMN "riskLevel" SET DEFAULT 'UNASSESSED';
