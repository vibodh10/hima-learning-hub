export function capitaliseFirst(value: string) {
  const trimmed = value.trim();
  return trimmed ? `${trimmed.charAt(0).toLocaleUpperCase("en-GB")}${trimmed.slice(1)}` : trimmed;
}
