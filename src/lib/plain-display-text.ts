export function plainDisplayText(value: string) {
  return value.replace(/[‐‑‒–—―−]/g, "-");
}
