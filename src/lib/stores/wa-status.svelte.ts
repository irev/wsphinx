import { browser } from '$app/environment';
import { auth } from './auth.svelte.js';

export type WaConnectionStatus =
	| 'loading'
	| 'initializing'
	| 'disconnected'
	| 'scanning_qr'
	| 'connected'
	| 'expired'
	| 'reconnecting'
	| 'worker_offline';

class WaStatusStore {
	status = $state<WaConnectionStatus>('loading');
	qrCode = $state<string | null>(null);
}

export const waStatus = new WaStatusStore();

let _intervalId: ReturnType<typeof setInterval> | undefined;

async function _fetch() {
	try {
		if (auth.loading || !auth.user) return;
		const res = await fetch('/api/whatsapp/status');
		if (res.ok) {
			const d = await res.json();
			waStatus.status = d.status || 'worker_offline';
			waStatus.qrCode = d.qrCode || null;
		} else {
			waStatus.status = 'worker_offline';
			waStatus.qrCode = null;
		}
	} catch {
		waStatus.status = 'worker_offline';
		waStatus.qrCode = null;
	}
}

export function startPolling(intervalMs = 5000) {
	if (!browser) return;
	stopPolling();
	_fetch();
	_intervalId = setInterval(_fetch, intervalMs);
}

export function stopPolling() {
	if (_intervalId) {
		clearInterval(_intervalId);
		_intervalId = undefined;
	}
}

export function refreshNow() {
	if (browser) _fetch();
}

if (browser) startPolling();
