const htmlTagRe = /<[^>]*>/g;
const multiSpaceRe = /\s+/g;

export function sanitize(val: unknown): unknown {
	if (typeof val === 'string') {
		return val.replace(htmlTagRe, '').replace(multiSpaceRe, ' ').trim();
	}
	if (Array.isArray(val)) {
		return val.map(sanitize);
	}
	if (val && typeof val === 'object') {
		const out: Record<string, unknown> = {};
		for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
			out[k] = sanitize(v);
		}
		return out;
	}
	return val;
}

export function sanitizeForm<T extends Record<string, unknown>>(obj: T): T {
	return sanitize(obj) as T;
}