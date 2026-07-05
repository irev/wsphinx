import { browser } from '$app/environment';
import { auth } from './auth.svelte.js';

class WaProfileStore {
	pushname = $state('');
	wid = $state('');
	phone = $state('');
	platform = $state('');
	photoPath = $state<string | null>(null);
	loaded = $state(false);
}

export const waProfile = new WaProfileStore();

let _intervalId: ReturnType<typeof setInterval> | undefined;

async function _fetch() {
	try {
		if (auth.loading || !auth.user) return;
		const res = await fetch('/api/whatsapp/me');
		if (res.ok) {
			const d = await res.json();
			if (d && d.pushname) {
				waProfile.pushname = d.pushname;
				waProfile.wid = d.wid || '';
				waProfile.phone = d.phone || '';
				waProfile.platform = d.platform || '';
				waProfile.loaded = true;
			}
		}
	} catch {
		// worker offline — keep last known values
	}
}

async function _fetchPhoto() {
	if (!waProfile.wid) return;
	try {
		const res = await fetch(`/api/whatsapp/pic/${encodeURIComponent(waProfile.wid)}`);
		if (res.ok) {
			const d = await res.json();
			if (d && d.data) waProfile.photoPath = d.data;
		}
	} catch {
		// ignore
	}
}

export function startProfilePolling(intervalMs = 10000) {
	if (!browser) return;
	stopProfilePolling();
	_fetch();
	_intervalId = setInterval(() => {
		_fetch();
		if (waProfile.wid) _fetchPhoto();
	}, intervalMs);
}

export function stopProfilePolling() {
	if (_intervalId) {
		clearInterval(_intervalId);
		_intervalId = undefined;
	}
}

export async function refreshProfile() {
	if (browser) {
		await _fetch();
		_fetchPhoto();
	}
}

if (browser) startProfilePolling();
