export type Rule = { validate: (v: unknown) => boolean; msg: string };

export const required = (msg?: string): Rule => ({
	validate: (v) => typeof v === 'string' && v.trim().length > 0,
	msg: msg || 'Wajib diisi',
});

export const min = (n: number, msg?: string): Rule => ({
	validate: (v) => typeof v === 'string' && v.trim().length >= n,
	msg: msg || `Minimal ${n} karakter`,
});

export const max = (n: number, msg?: string): Rule => ({
	validate: (v) => typeof v === 'string' && v.trim().length <= n,
	msg: msg || `Maksimal ${n} karakter`,
});

export const phone = (msg?: string): Rule => ({
	validate: (v) => {
		if (!v || typeof v !== 'string') return true;
		return /^[\d\s+\-()]{6,20}$/.test(v.trim());
	},
	msg: msg || 'Format nomor telepon tidak valid',
});

export function validate(rules: Record<string, Rule[]>, data: Record<string, unknown>): Record<string, string> {
	const errors: Record<string, string> = {};
	for (const [field, fieldRules] of Object.entries(rules)) {
		for (const rule of fieldRules) {
			if (!rule.validate(data[field])) {
				errors[field] = rule.msg;
				break;
			}
		}
	}
	return errors;
}