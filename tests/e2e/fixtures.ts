export const E2E_USERS = {
  organisationOwner: { name: "Olivia Fictional Organisation Owner", email: "e2e-org-owner@release-gate.invalid", password: "E2E-Olivia-Only!2026", roleKey: "organisation-owner", mfaSecret: "N5WGKZLTOQXW4ZJAN5WGKZLTOQXW4ZJA" },
  riskOwner: { name: "Avery Fictional Risk Owner", email: "e2e-risk-owner@release-gate.invalid", password: "E2E-Avery-Only!2026", roleKey: "quality-compliance-manager", mfaSecret: "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP" },
  registeredManager: { name: "Blair Fictional RM", email: "e2e-rm@release-gate.invalid", password: "E2E-Blair-Only!2026", roleKey: "registered-manager", mfaSecret: "KRSXG5DSNFXGOIDBNZQW2ZLBNZQW2ZLB" },
  nominatedIndividual: { name: "Casey Fictional Nominated Individual", email: "e2e-ni@release-gate.invalid", password: "E2E-Casey-Only!2026", roleKey: "nominated-individual", mfaSecret: "MFRGGZDFMZTWQ2LKMFRGGZDFMZTWQ2LK" },
  viewer: { name: "Drew Fictional Viewer", email: "e2e-viewer@release-gate.invalid", password: "E2E-Drew-Only!2026", roleKey: "read-only-viewer", mfaSecret: "ONSWG4TFOQXW4ZJAN5XGK3LQN5XGK3LQ" },
  locationRestricted: { name: "Ellis Fictional Location RM", email: "e2e-location-rm@release-gate.invalid", password: "E2E-Ellis-Only!2026", roleKey: "registered-manager", mfaSecret: "ORSXG5AAMV4GC3LQORSXG5AAMV4GC3LQ", allLocations: false },
  otherTenant: { name: "Finley Fictional Other Tenant RM", email: "e2e-other-rm@release-gate.invalid", password: "E2E-Finley-Only!2026", roleKey: "registered-manager", mfaSecret: "MZXW6YTBOIMZXW6YTBOIMZXW6YTBOIMZ", tenant: "other" },
} as const;
export const E2E_USER = E2E_USERS.riskOwner;
export type E2EUser = (typeof E2E_USERS)[keyof typeof E2E_USERS];
export const E2E_MFA_SECRET = E2E_USER.mfaSecret;
export const E2E_SESSION_SECRET = "e2e-only-secret-with-at-least-thirty-two-characters";
export const E2E_SETUP_TOKEN = "e2e-fixture-setup-token-not-used-outside-playwright";
export const E2E_SOURCE_REFERENCE = "E2E-SRC-001";
