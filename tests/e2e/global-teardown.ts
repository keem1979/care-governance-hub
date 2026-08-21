export default async function globalTeardown() {
  // The guarded global setup removes prior fictional fixtures before every run.
  // Avoid a teardown HTTP request because Playwright may already be stopping the
  // development server on Windows, which can leave fetch waiting on a dying
  // worker. Disposable CI databases are dropped by the CI environment itself.
}
