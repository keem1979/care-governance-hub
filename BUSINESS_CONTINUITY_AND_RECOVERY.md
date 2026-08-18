# Business continuity, backup and recovery plan

The subscribing provider must define its maximum tolerable outage, recovery-time
and recovery-point objectives after assessing care and governance dependencies.
Until those values and restore evidence are approved, QCGMS must not be the only
place staff can obtain time-critical care instructions.

Required controls are managed encrypted database backups and point-in-time
recovery where available; private-file recoverability; named technical, customer,
governance and safety contacts; approved downtime forms; quarterly isolated
restore tests; and an annual end-to-end exercise.

Restore the chosen point into an isolated environment; deploy the compatible
application and migrations; verify table/file counts; run negative tenant tests;
sample current versions, actions, history and attachments; reconcile downtime
changes; obtain technical, business and clinical approval; and record actual
recovery times, gaps and actions. Destroy the isolated copy under retention rules.

Access recovery uses MFA recovery codes and session revocation. If all factors are
lost, support must identity-check out of band, record dual approval, reset the
factor, revoke every session and notify the owner. Support must never request a
password or authenticator code.
