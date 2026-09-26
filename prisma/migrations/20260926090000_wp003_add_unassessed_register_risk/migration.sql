-- WP-003A: make unassessed risk explicit without changing existing assessed records.
ALTER TYPE "RegisterRiskLevel" ADD VALUE IF NOT EXISTS 'UNASSESSED';
