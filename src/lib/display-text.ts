export function capitaliseFirst(value: string) {
  const trimmed = value.trim();
  const firstLetter = trimmed.search(/[A-Za-z]/);
  if (firstLetter < 0) return trimmed;
  return `${trimmed.slice(0, firstLetter)}${trimmed.charAt(firstLetter).toLocaleUpperCase("en-GB")}${trimmed.slice(firstLetter + 1)}`;
}
