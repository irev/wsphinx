export function maskPhone(phone: string | null | undefined): string {
  if (!phone) return '';
  if (phone.length <= 4) return phone;
  const visible = phone.slice(-4);
  return '*'.repeat(phone.length - 4) + visible;
}

export function maskInApi(obj: Record<string, unknown>, fields: string[]): Record<string, unknown> {
  const out = { ...obj };
  for (const field of fields) {
    if (out[field] && typeof out[field] === 'string') {
      out[field] = maskPhone(out[field] as string);
    }
  }
  return out;
}

export function maskApiArray(arr: Record<string, unknown>[], fields: string[]): Record<string, unknown>[] {
  return arr.map((item) => maskInApi(item, fields));
}
