export function maskPhone(phone: string | null | undefined): string {
  if (!phone) return '';
  if (phone.length <= 4) return phone;
  const visible = phone.slice(-4);
  return '*'.repeat(phone.length - 4) + visible;
}
