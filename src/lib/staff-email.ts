export function isSccbStaffEmail(value: string) {
  return /^[^@\s]+@sccb\.ac\.uk$/i.test(value.trim());
}
