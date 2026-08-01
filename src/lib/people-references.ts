export function formatPersonReference(prefix: "CLI" | "STF", number: number) {
  if (!Number.isInteger(number) || number < 1) throw new Error("Person number must be a positive integer.");
  return `${prefix}-${String(number).padStart(6, "0")}`;
}
