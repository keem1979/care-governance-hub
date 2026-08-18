# Retention, restriction and secure deletion

QCGMS does not silently delete governed records. Ordinary workflows archive
records so chronology, approvals and linked evidence remain traceable. The data
controller must approve a category-specific retention schedule before live use;
the product must not invent a universal retention period for all care providers.

For each category record: purpose, lawful basis/Article 9 condition where needed,
source, owner, retention trigger, period, review authority, legal-hold rule,
disposal method, processor copies and evidence of disposal. Cover client and care
plans; incidents/safeguarding; audits, risks, actions and meetings; policies;
workforce; files; security logs; support/contract records; and backups.

## Deletion workflow

1. Record and identity-check the request or scheduled disposal batch.
2. Freeze deletion where safeguarding, litigation, investigation or statutory
   preservation applies.
3. Find the subject across organisation-scoped tables, files, exports,
   integrations and backups; confirm similar people are not merged.
4. Decide whether to correct, restrict, anonymise, archive or delete each item and
   record the reason and approving role.
5. Use a controlled maintenance job with peer approval—never an ordinary UI
   delete—to remove approved data and dependent private files.
6. Verify counts and tenant boundaries, issue a disposal certificate, and record
   when expiring backups will remove remaining copies.

No deletion should erase evidence needed to explain a safety decision or conceal
an incident. Configurable retention automation requires a later controlled build,
preview, approval and rollback plan.
