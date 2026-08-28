import { configuredUnits } from "@/lib/learning-catalog";

const configuredUnitCodes = new Set(configuredUnits.map(unit => unit.code));

export function isConfiguredUnitCode(value: unknown): value is string {
  return typeof value === "string" && configuredUnitCodes.has(value);
}

