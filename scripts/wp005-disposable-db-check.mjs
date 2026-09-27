import "dotenv/config";

const destination = new URL(process.env.DATABASE_URL ?? "");
if (destination.hostname !== "127.0.0.1" || destination.port !== "5432" || destination.pathname !== "/care_governance_hub_test") {
  throw new Error("WP-005 browser gate requires the named disposable local database.");
}
console.log("Disposable local database destination verified.");
