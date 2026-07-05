<script lang="ts">
	import Badge from '$lib/components/Badge.svelte';
	import Card from '$lib/components/Card.svelte';
	import { maskPhone } from '$lib/utils/mask';
	import { showToast } from '$lib/stores/toast';

	const TAKE_SMALL = 50;
	const TAKE_LARGE = 10;

	let pr = $state<{ data: any[]; total: number; skip: number; take: number; q: string; loading: boolean }>({ data: [], total: 0, skip: 0, take: TAKE_SMALL, q: '', loading: true });
	let st = $state<{ data: any[]; total: number; skip: number; take: number; q: string; loading: boolean }>({ data: [], total: 0, skip: 0, take: TAKE_SMALL, q: '', loading: true });
	let ct = $state<{ data: any[]; total: number; skip: number; take: number; q: string; loading: boolean }>({ data: [], total: 0, skip: 0, take: TAKE_SMALL, q: '', loading: true });
	let us = $state<{ data: any[]; total: number; skip: number; take: number; q: string; loading: boolean }>({ data: [], total: 0, skip: 0, take: TAKE_LARGE, q: '', loading: true });
	let sr = $state<{ data: any[]; total: number; skip: number; take: number; q: string; loading: boolean }>({ data: [], total: 0, skip: 0, take: TAKE_LARGE, q: '', loading: true });

	let prEl: HTMLInputElement | undefined = $state();
	let stEl: HTMLInputElement | undefined = $state();
	let ctEl: HTMLInputElement | undefined = $state();
	let usEl: HTMLInputElement | undefined = $state();
	let srEl: HTMLInputElement | undefined = $state();

	// ── Load helpers ──
	async function loadEntity(entity: string, state: typeof pr, el?: HTMLInputElement) {
		state.loading = true;
		try {
			const params = new URLSearchParams({ skip: String(state.skip), take: String(state.take) });
			if (state.q) params.set('q', state.q);
			const res = await fetch(`/api/settings/${entity}?${params}`);
			if (res.ok) {
				const d = await res.json();
				state.data = d.data;
				state.total = d.total;
			}
		} catch (e) {
			showToast('error', `Gagal load ${entity}: ${(e as Error).message}`);
		}
		state.loading = false;
		if (el) el.value = '';
	}

	function onSearch(entity: string, state: typeof pr, el?: HTMLInputElement) {
		return (e: Event) => {
			state.q = (e.target as HTMLInputElement).value;
			state.skip = 0;
			loadEntity(entity, state, el);
		};
	}

	function prevPage(state: typeof pr) {
		if (state.skip > 0) { state.skip = Math.max(0, state.skip - state.take); }
	}
	function nextPage(state: typeof pr) {
		if (state.skip + state.take < state.total) { state.skip += state.take; }
	}

	// ── Dialog state ──
	type DialogMode = 'add' | 'edit';
	let dialogEntity = $state('');
	let dialogMode = $state<DialogMode>('add');
	let dialogId = $state<string | null>(null);
	let dialogShow = $state(false);
	let dialogSaving = $state(false);
	let dialogError = $state('');
	let dialogForm = $state<Record<string, any>>({});

	function openAdd(entity: string) {
		dialogEntity = entity;
		dialogMode = 'add';
		dialogId = null;
		dialogForm = defaultForm(entity);
		dialogError = '';
		dialogShow = true;
	}

	function openEdit(entity: string, item: any) {
		dialogEntity = entity;
		dialogMode = 'edit';
		dialogId = item.id;
		dialogForm = formFromItem(entity, item);
		dialogError = '';
		dialogShow = true;
	}

	function defaultForm(entity: string): Record<string, any> {
		switch (entity) {
			case 'priorities': return { name: '', level: 5, color: '#6b7280', description: '' };
			case 'statuses': return { name: '', sortOrder: 0, color: '#6b7280', isClosed: false, description: '' };
			case 'categories': return { name: '', description: '', sortOrder: 0, active: true };
			case 'users': return { name: '', phone: '', email: '', role: 'pic', active: true, password: '' };
			case 'sources': return { name: '', type: 'group', phone: '', description: '', autoReply: false, replyTemplate: '' };
			default: return {};
		}
	}

	function formFromItem(entity: string, item: any): Record<string, any> {
		switch (entity) {
			case 'priorities': return { name: item.name, level: item.level, color: item.color || '#6b7280', description: item.description || '' };
			case 'statuses': return { name: item.name, sortOrder: item.sortOrder, color: item.color || '#6b7280', isClosed: item.isClosed, description: item.description || '' };
			case 'categories': return { name: item.name, description: item.description || '', sortOrder: item.sortOrder, active: item.active };
			case 'users': return { name: item.name, phone: item.phone, email: item.email || '', role: item.role, active: item.active, password: '' };
			case 'sources': return { name: item.name, type: item.type, phone: item.phone, description: item.description || '', autoReply: item.autoReply ?? false, replyTemplate: item.replyTemplate || '' };
			default: return {};
		}
	}

	async function dialogSave() {
		dialogSaving = true;
		dialogError = '';
		const url = dialogId ? `/api/settings/${dialogEntity}/${dialogId}` : `/api/settings/${dialogEntity}`;
		const method = dialogId ? 'PUT' : 'POST';
		try {
			const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dialogForm) });
			if (res.ok) {
				dialogShow = false;
				showToast('success', dialogId ? 'Data berhasil diubah' : 'Data berhasil ditambah');
				await refreshEntity(dialogEntity);
			} else {
				const err = await res.json();
				dialogError = err.error || `Gagal (${res.status})`;
			}
		} catch {
			dialogError = 'Gagal menyimpan data';
		}
		dialogSaving = false;
	}

	// ── Delete state ──
	let deleteEntity = $state('');
	let deleteId = $state<string | null>(null);

	function confirmDelete(entity: string, id: string) {
		deleteEntity = entity;
		deleteId = id;
	}

	async function doDelete() {
		if (!deleteId) return;
		try {
			const res = await fetch(`/api/settings/${deleteEntity}/${deleteId}`, { method: 'DELETE' });
			if (res.ok) {
				deleteId = null;
				showToast('success', 'Data berhasil dihapus');
				await refreshEntity(deleteEntity);
			} else {
				const err = await res.json();
				showToast('error', err.error || 'Gagal hapus');
				deleteId = null;
			}
		} catch {
			showToast('error', 'Gagal menghapus');
			deleteId = null;
		}
	}

	// ── Toggle helpers ──
	async function toggleItem(entity: string, id: string, field: string, current: boolean) {
		const res = await fetch(`/api/settings/${entity}/${id}`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ [field]: !current }),
		});
		if (res.ok) {
			const state = entityStateRef(entity);
			if (state) {
				const item = state.data.find((d: any) => d.id === id);
				if (item) item[field] = !current;
			}
		} else {
			showToast('error', 'Gagal mengubah status');
		}
	}

	let activeMenu = $state<string>('priorities');
	let actionMenuId = $state<string | null>(null);

	const ABORT_TIMEOUT = 5000;
	function fetchWithTimeout(url: string, opts: RequestInit = {}): Promise<Response> {
		const ctrl = new AbortController();
		const id = setTimeout(() => ctrl.abort(), ABORT_TIMEOUT);
		return fetch(url, { ...opts, signal: ctrl.signal }).finally(() => clearTimeout(id));
	}

	import { waStatus, refreshNow } from '$lib/stores/wa-status.svelte';
	import { waProfile, refreshProfile } from '$lib/stores/wa-profile.svelte';

	// ── WA Connection ──
	let waHealth = $state<{ worker: string; status: string; latency: number | null; uptime: number; reconnectAttempts: number; maxReconnectAttempts: number } | null>(null);
	let waHealthTimestamp = $state<number | null>(null);
	let waHealthLoading = $state(false);
	let waDisconnectLoading = $state(false);
	let waReconnectLoading = $state(false);
	let waQrImage = $state<string | null>(null);
	let waSessionInfo = $state<{ exists: boolean; createdAt: string | null; size: number | null }>({ exists: false, createdAt: null, size: null });
	let waSessionLoading = $state(false);
	let waClearConfirm = $state(false);
	let waLogoutConfirm = $state(false);
	let waPrevStatus = $state<string>('loading');
	let waQrInterval: ReturnType<typeof setInterval> | undefined;

	// ── Worker Management ──
	let workerInfo = $state<{ running: boolean; pid: number | null; uptime: number; startTime: number; workerUrl: string } | null>(null);
	let workerLoading = $state(false);
	let workerStarting = $state(false);
	let workerStopping = $state(false);

	async function fetchWorkerInfo() {
		try {
			const res = await fetch('/api/whatsapp/worker');
			if (res.ok) workerInfo = (await res.json()).data;
		} catch { /* ignore */ }
	}

	async function startWorker() {
		workerStarting = true;
		try {
			const res = await fetch('/api/whatsapp/worker/start', { method: 'POST' });
			const d = await res.json();
			if (res.ok) {
				showToast('success', 'Worker started');
				await fetchWorkerInfo();
			} else {
				showToast('error', d.error || 'Gagal start worker');
			}
		} catch {
			showToast('error', 'Gagal start worker');
		}
		workerStarting = false;
	}

	async function stopWorker() {
		workerStopping = true;
		try {
			const res = await fetch('/api/whatsapp/worker/stop', { method: 'POST' });
			const d = await res.json();
			if (res.ok) {
				showToast('success', 'Worker stopped');
				workerInfo = null;
			} else {
				showToast('error', d.error || 'Gagal stop worker');
			}
		} catch {
			showToast('error', 'Gagal stop worker');
		}
		workerStopping = false;
	}

	// ── Stats ──
	let waStats = $state<{
		today: { messages: number; classified: number; supportRelated: number; ticketsCreated: number };
		week: { messages: number; classified: number; ticketsCreated: number };
		unprocessed: number;
		avgConfidence: number | null;
	} | null>(null);
	let waStatsLoading = $state(false);

	async function fetchWaStats() {
		waStatsLoading = true;
		try {
			const res = await fetch('/api/whatsapp/stats');
			if (res.ok) waStats = (await res.json()).data;
		} catch { /* ignore */ }
		waStatsLoading = false;
	}

	// ── Test Send ──
	let testSendChatId = $state('');
	let testSendText = $state('');
	let testSending = $state(false);

	async function sendTestMessage() {
		if (!testSendChatId || !testSendText) return;
		testSending = true;
		try {
			const res = await fetch('/api/whatsapp/send', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ chatId: testSendChatId, text: testSendText }),
			});
			if (res.ok) {
				showToast('success', 'Pesan test terkirim');
				testSendText = '';
			} else {
				const d = await res.json();
				showToast('error', d.error || 'Gagal kirim');
			}
		} catch {
			showToast('error', 'Gagal kirim — worker unreachable');
		}
		testSending = false;
	}

	// ── Log Viewer ──
	let logLines = $state<string[]>([]);
	let logDate = $state(new Date().toISOString().slice(0, 10));
	let logLoading = $state(false);
	let logExpanded = $state(false);

	async function fetchLogs() {
		logLoading = true;
		try {
			const res = await fetch(`/api/whatsapp/worker/logs?lines=100&date=${logDate}`);
			if (res.ok) logLines = (await res.json()).data.lines;
		} catch { /* ignore */ }
		logLoading = false;
	}

	// ── Latency Chart ──
	let latencyHistory = $state<{ ts: number; latency: number; status: string }[]>([]);
	let latLoading = $state(false);
	let latExpanded = $state(false);

	async function fetchLatency() {
		latLoading = true;
		try {
			const res = await fetch('/api/whatsapp/worker/latency');
			if (res.ok) latencyHistory = (await res.json()).data;
		} catch { /* ignore */ }
		latLoading = false;
	}

	// ── Worker crash notification polling ──
	let prevWorkerStatus = $state<string>('');
	let notificationInterval: ReturnType<typeof setInterval> | null = null;

	$effect(() => {
		if (activeMenu === 'wa-connection') {
			if (!notificationInterval) {
				notificationInterval = setInterval(async () => {
					try {
						const res = await fetch('/api/whatsapp/worker');
						if (!res.ok) return;
						const d = await res.json();
						const current = d.data.running ? 'running' : 'stopped';
						if (prevWorkerStatus && prevWorkerStatus === 'running' && current === 'stopped') {
							showToast('error', 'Worker telah berhenti!');
							if ('Notification' in window && Notification.permission === 'granted') {
								new Notification('WhatsApp Worker', { body: 'Worker telah berhenti!', icon: '/favicon.png' });
							}
						}
						prevWorkerStatus = current;
					} catch { /* ignore */ }
				}, 30000);
			}
		} else {
			if (notificationInterval) {
				clearInterval(notificationInterval);
				notificationInterval = null;
			}
		}

		return () => {
			if (notificationInterval) clearInterval(notificationInterval);
		};
	});

	function isStatusInitializing(s: string) { return s === 'initializing'; }

	let waQrError = $state(false);

	async function fetchWaQr() {
		waQrError = false;
		try {
			const res = await fetchWithTimeout('/api/whatsapp/qr-image');
			if (res.ok) {
				const d = await res.json();
				waQrImage = d.qrImage || null;
				waQrError = d.qrImage == null;
			} else {
				waQrImage = null;
				waQrError = true;
			}
		} catch {
			waQrImage = null;
			waQrError = true;
		}
	}

	async function checkWaHealth() {
		waHealthLoading = true;
		try {
			const res = await fetchWithTimeout('/api/whatsapp/health');
			const d = await res.json();
			if (d && typeof d.worker === 'string' && typeof d.uptime === 'number') {
				waHealth = d;
			} else {
				waHealth = { worker: 'invalid_response', status: 'error', latency: null, uptime: 0, reconnectAttempts: 0, maxReconnectAttempts: 10 };
				showToast('info', 'Health response tidak sesuai format');
			}
			waHealthTimestamp = Date.now();
		} catch {
			waHealth = { worker: 'unreachable', status: 'error', latency: null, uptime: 0, reconnectAttempts: 0, maxReconnectAttempts: 10 };
			waHealthTimestamp = Date.now();
			showToast('error', 'Health check — worker unreachable');
		}
		waHealthLoading = false;
	}

	async function waDisconnect() {
		waDisconnectLoading = true;
		try {
			const res = await fetchWithTimeout('/api/whatsapp/disconnect', { method: 'POST' });
			if (res.ok) {
				showToast('success', 'WhatsApp disconnected');
				waQrImage = null;
			} else showToast('error', 'Gagal disconnect');
		} catch {
			showToast('error', 'Worker unreachable');
		}
		refreshNow();
		await fetchSessionInfo();
		waDisconnectLoading = false;
	}

	async function waDisconnectAndClear() {
		waDisconnectLoading = true;
		try {
			const res = await fetchWithTimeout('/api/whatsapp/session/clear', { method: 'POST' });
			if (res.ok) {
				showToast('success', 'Logged out — session cleared');
				waSessionInfo = { exists: false, createdAt: null, size: null };
				waQrImage = null;
			} else showToast('error', 'Gagal logout');
		} catch {
			showToast('error', 'Worker unreachable');
		}
		waLogoutConfirm = false;
		refreshNow();
		await fetchSessionInfo();
		waDisconnectLoading = false;
	}

	async function waReconnect() {
		waReconnectLoading = true;
		try {
			const res = await fetchWithTimeout('/api/whatsapp/reconnect', { method: 'POST' });
			if (res.ok) {
				const d = await res.json();
				showToast('success', 'WhatsApp reconnecting...');
				if (d.status === 'scanning_qr') await fetchWaQr();
			} else showToast('error', 'Gagal reconnect');
		} catch {
			showToast('error', 'Worker unreachable');
		}
		await fetchSessionInfo();
		waReconnectLoading = false;
	}

	async function fetchSessionInfo() {
		try {
			const res = await fetchWithTimeout('/api/whatsapp/session/info');
			if (res.ok) {
				const d = await res.json();
				waSessionInfo = { exists: d.exists || false, createdAt: d.createdAt || null, size: d.size || null };
			} else {
				waSessionInfo = { exists: false, createdAt: null, size: null };
			}
		} catch {
			waSessionInfo = { exists: false, createdAt: null, size: null };
		}
	}

	async function waClearSession() {
		waSessionLoading = true;
		try {
			const res = await fetchWithTimeout('/api/whatsapp/session/clear', { method: 'POST' });
			if (res.ok) {
				showToast('success', 'Session cleared. Scan QR again to login.');
				waSessionInfo = { exists: false, createdAt: null, size: null };
				waStatus.status = 'disconnected';
				waStatus.qrCode = null;
			} else showToast('error', 'Gagal clear session');
		} catch {
			showToast('error', 'Worker unreachable');
		}
		waSessionLoading = false;
		waClearConfirm = false;
	}

	$effect(() => {
		if (activeMenu === 'wa-connection') {
			refreshNow();
			if (waStatus.status === 'scanning_qr') fetchWaQr();
			fetchSessionInfo();
			fetchWorkerInfo();
			const workerInterval = setInterval(fetchWorkerInfo, 10000);
			waQrInterval = setInterval(() => {
				if (waStatus.status === 'scanning_qr') fetchWaQr();
			}, 15000);
			return () => {
				clearInterval(workerInterval);
				if (waQrInterval) clearInterval(waQrInterval);
			};
		}
	});

	$effect(() => {
		if (activeMenu !== 'wa-connection') return;
		const current = waStatus.status;
		if (current === 'scanning_qr' && waPrevStatus !== 'scanning_qr') {
			fetchWaQr();
		}
		waPrevStatus = current;
	});

	function formatDuration(seconds: number): string {
		if (seconds < 60) return `${Math.round(seconds)}s`;
		if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
		return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
	}

	function timeAgo(timestamp: number): string {
		const diff = Math.floor((Date.now() - timestamp) / 1000);
		if (diff < 5) return 'just now';
		if (diff < 60) return `${diff}s ago`;
		if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
		return `${Math.floor(diff / 3600)}h ago`;
	}

	// ── WA App Settings ──
	let waSettings = $state<Record<string, string>>({});
	let waSettingsLoading = $state(true);
	let waSettingsSaving = $state(false);

	async function loadWaSettings() {
		waSettingsLoading = true;
		try {
			const res = await fetch('/api/settings/app');
			if (res.ok) waSettings = await res.json();
		} catch { /* ignore */ }
		waSettingsLoading = false;
	}

	async function saveWaSetting(key: string, value: string) {
		waSettingsSaving = true;
		try {
			const res = await fetch('/api/settings/app', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ key, value }),
			});
			if (res.ok) {
				waSettings[key] = value;
				showToast('success', 'Disimpan');
			} else showToast('error', 'Gagal menyimpan');
		} catch {
			showToast('error', 'Gagal menyimpan');
		}
		waSettingsSaving = false;
	}

	$effect(() => {
		if (activeMenu === 'wa-connection' || activeMenu === 'wa-autoreply' || activeMenu === 'wa-processing') loadWaSettings();
		if (activeMenu === 'wa-connection') {
			fetchWaStats();
			fetchLogs();
			fetchLatency();
		}
	});

	function entityStateRef(entity: string) {
		const map: Record<string, typeof pr> = { priorities: pr, statuses: st, categories: ct, users: us, sources: sr };
		return map[entity];
	}

	function refreshEntity(entity: string) {
		const ref = entityStateRef(entity);
		const elMap: Record<string, HTMLInputElement | undefined> = { priorities: prEl, statuses: stEl, categories: ctEl, users: usEl, sources: srEl };
		if (ref) loadEntity(entity, ref, elMap[entity]);
	}

	// ── Initial load ──
	$effect(() => {
		loadEntity('priorities', pr, prEl);
		loadEntity('statuses', st, stEl);
		loadEntity('categories', ct, ctEl);
		loadEntity('users', us, usEl);
		loadEntity('sources', sr, srEl);
	});

	// ── Export/Import ──
	async function doExport() {
		try {
			const res = await fetch('/api/settings/export');
			if (!res.ok) { showToast('error', 'Gagal export'); return; }
			const blob = await res.blob();
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `settings-export-${new Date().toISOString().slice(0, 10)}.json`;
			a.click();
			URL.revokeObjectURL(url);
			showToast('success', 'Export berhasil');
		} catch {
			showToast('error', 'Gagal export');
		}
	}

	let importShow = $state(false);
	let importFile = $state<File | null>(null);
	let importData = $state<any>(null);
	let importPreview = $state<Record<string, number> | null>(null);
	let importing = $state(false);

	function onImportFile(e: Event) {
		const file = (e.target as HTMLInputElement).files?.[0];
		if (!file) return;
		importFile = file;
		const reader = new FileReader();
		reader.onload = () => {
			try {
				const data = JSON.parse(reader.result as string);
				importData = data;
				importPreview = {
					categories: data.categories?.length || 0,
					priorities: data.priorities?.length || 0,
					statuses: data.statuses?.length || 0,
					users: data.users?.length || 0,
					sources: data.sources?.length || 0,
				};
			} catch {
				importPreview = null;
			}
		};
		reader.readAsText(file);
	}

	async function doImport() {
		if (!importData) { showToast('error', 'Pilih file JSON terlebih dahulu'); return; }
		importing = true;
		try {
			const res = await fetch('/api/settings/import', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(importData),
			});
			if (res.ok) {
				const result = await res.json();
				showToast('success', 'Import berhasil');
				importShow = false;
				importFile = null;
				importData = null;
				importPreview = null;
				// Refresh all entities
				refreshEntity('priorities');
				refreshEntity('statuses');
				refreshEntity('categories');
				refreshEntity('users');
				refreshEntity('sources');
			} else {
				const err = await res.json();
				showToast('error', err.error || 'Gagal import');
			}
		} catch {
			showToast('error', 'Gagal import');
		}
		importing = false;
	}

	// ── Debounce search ──
	let searchTimers: Record<string, ReturnType<typeof setTimeout>> = {};
	function debounceSearch(entity: string, state: typeof pr, el?: HTMLInputElement) {
		return (e: Event) => {
			const val = (e.target as HTMLInputElement).value;
			state.q = val;
			if (searchTimers[entity]) clearTimeout(searchTimers[entity]);
			searchTimers[entity] = setTimeout(() => {
				state.skip = 0;
				loadEntity(entity, state, el);
			}, 300);
		};
	}

	const entityLabels: Record<string, string> = {
		priorities: 'Prioritas', statuses: 'Status', categories: 'Kategori', users: 'User', sources: 'Source'
	};

	function parseBusinessHours(json: string | undefined, day: string): { start: string; end: string } {
		try {
			const h = JSON.parse(json || '{}');
			return h[day] || { start: '08:00', end: '17:00' };
		} catch {
			return { start: '08:00', end: '17:00' };
		}
	}

	function updateBusinessHour(day: string, field: 'start' | 'end', value: string) {
		try {
			const h = JSON.parse(waSettings.wa_business_hours || '{}');
			if (!h[day]) h[day] = { start: '08:00', end: '17:00' };
			h[day][field] = value;
			waSettings.wa_business_hours = JSON.stringify(h);
		} catch {
			const h: Record<string, any> = {};
			h[day] = { start: '08:00', end: '17:00' };
			h[day][field] = value;
			waSettings.wa_business_hours = JSON.stringify(h);
		}
	}
</script>

<svelte:window onclick={() => actionMenuId = null} />

<div class="flex items-center justify-end gap-2">
	<button onclick={doExport} class="kt-btn kt-btn-sm kt-btn-outline">
		<i class="ki-filled ki-exit-down text-sm"></i>
		Export
	</button>
	<button onclick={() => { importShow = true; importFile = null; importData = null; importPreview = null; }} class="kt-btn kt-btn-sm kt-btn-outline">
		<i class="ki-filled ki-exit-up text-sm"></i>
		Import
	</button>
</div>

<div class="flex flex-col lg:flex-row gap-5 lg:gap-7.5">
	<aside class="w-full lg:w-[230px] shrink-0 rounded-xl border border-border bg-card">
		<div class="p-4">
			<span class="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-2 px-3">Master Data</span>
			<nav class="flex flex-col gap-0.5">
				<button onclick={() => activeMenu = 'priorities'} class="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors {activeMenu === 'priorities' ? 'bg-primary/10 text-primary font-medium' : 'text-foreground hover:bg-muted'}">
					<i class="ki-filled ki-flag text-sm shrink-0"></i>
					Priorities
				</button>
				<button onclick={() => activeMenu = 'statuses'} class="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors {activeMenu === 'statuses' ? 'bg-primary/10 text-primary font-medium' : 'text-foreground hover:bg-muted'}">
					<i class="ki-filled ki-check-circle text-sm shrink-0"></i>
					Statuses
				</button>
				<button onclick={() => activeMenu = 'categories'} class="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors {activeMenu === 'categories' ? 'bg-primary/10 text-primary font-medium' : 'text-foreground hover:bg-muted'}">
					<i class="ki-filled ki-folder text-sm shrink-0"></i>
					Categories
				</button>
				<button onclick={() => activeMenu = 'users'} class="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors {activeMenu === 'users' ? 'bg-primary/10 text-primary font-medium' : 'text-foreground hover:bg-muted'}">
					<i class="ki-filled ki-people text-sm shrink-0"></i>
					PIC / Teknisi
				</button>
				<button onclick={() => activeMenu = 'sources'} class="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors {activeMenu === 'sources' ? 'bg-primary/10 text-primary font-medium' : 'text-foreground hover:bg-muted'}">
					<i class="ki-filled ki-messages text-sm shrink-0"></i>
					WhatsApp Sources
				</button>
			</nav>
		</div>
		<div class="border-t border-border mx-4 my-2"></div>
		<div class="p-4 pt-0">
			<span class="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-2 px-3">WhatsApp</span>
			<nav class="flex flex-col gap-0.5">
				<button onclick={() => activeMenu = 'wa-connection'} class="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors {activeMenu === 'wa-connection' ? 'bg-primary/10 text-primary font-medium' : 'text-foreground hover:bg-muted'}">
					<i class="ki-filled ki-check-circle text-sm shrink-0"></i>
					Connection
					<span class="ml-auto inline-block size-2 rounded-full {waStatus.status === 'connected' ? 'bg-success' : waStatus.status === 'scanning_qr' || waStatus.status === 'reconnecting' ? 'bg-warning' : waStatus.status === 'initializing' ? 'bg-info animate-pulse' : waStatus.status === 'loading' || waStatus.status === 'worker_offline' ? 'bg-muted-foreground' : 'bg-destructive'}"></span>
				</button>
				<button onclick={() => activeMenu = 'wa-autoreply'} class="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors {activeMenu === 'wa-autoreply' ? 'bg-primary/10 text-primary font-medium' : 'text-foreground hover:bg-muted'}">
					<i class="ki-filled ki-messages text-sm shrink-0"></i>
					Auto Reply
				</button>
				<button onclick={() => activeMenu = 'wa-processing'} class="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors {activeMenu === 'wa-processing' ? 'bg-primary/10 text-primary font-medium' : 'text-foreground hover:bg-muted'}">
					<i class="ki-filled ki-menu text-sm shrink-0"></i>
					Processing
				</button>
			</nav>
		</div>
	</aside>

	<div class="grow min-w-0">
		{#key activeMenu}
	{#if activeMenu === 'priorities'}
		<Card title="Priorities" subtitle="{pr.total} item" class="overflow-hidden">
			{#snippet headerActions()}
				<div class="flex items-center gap-2">
					<input bind:this={prEl} type="search" placeholder="Cari..." oninput={debounceSearch('priorities', pr)}
						class="wt-filter-input w-28 sm:w-44 lg:w-56" />
					<button onclick={() => openAdd('priorities')} class="kt-btn kt-btn-primary kt-btn-sm" aria-label="Tambah Prioritas">
						<i class="ki-filled ki-plus"></i>
					</button>
				</div>
			{/snippet}
			<div class="kt-scrollable-x-auto">
				<table class="kt-table align-middle text-sm w-full">
					<thead>
						<tr>
							<th class="w-10"></th>
							<th>Nama</th>
							<th class="w-16 text-center">Level</th>
							<th class="w-20 text-end">Aksi</th>
						</tr>
					</thead>
					<tbody>
						{#each pr.data as p}
							<tr class="hover:bg-muted/30 transition-colors">
								<td class="text-center"><span class="inline-block size-4 rounded-full shrink-0" style="background:{p.color}"></span></td>
								<td class="font-medium text-foreground">{p.name}</td>
								<td class="text-center"><span class="kt-badge kt-badge-sm kt-badge-outline">Lv.{p.level}</span></td>
								<td class="text-end relative">
									<button onclick={(e) => { e.stopPropagation(); actionMenuId = actionMenuId === `pri-${p.id}` ? null : `pri-${p.id}`; }} class="kt-btn kt-btn-sm kt-btn-icon kt-btn-ghost" aria-label="Aksi">
										<i class="ki-filled ki-dots-vertical text-sm text-muted-foreground"></i>
									</button>
									{#if actionMenuId === `pri-${p.id}`}
										<div class="absolute end-0 top-full mt-1 z-50 min-w-[130px] rounded-lg border border-border bg-popover shadow-lg py-1" onclick={(e) => e.stopPropagation()} role="none">
											<button onclick={() => { openEdit('priorities', p); actionMenuId = null; }} class="w-full text-left px-3 py-1.5 text-xs text-foreground hover:bg-muted flex items-center gap-2"><i class="ki-filled ki-pencil text-sm"></i> Edit</button>
											<button onclick={() => { confirmDelete('priorities', p.id); actionMenuId = null; }} class="w-full text-left px-3 py-1.5 text-xs text-red-500 hover:bg-muted flex items-center gap-2"><i class="ki-filled ki-trash text-sm"></i> Hapus</button>
										</div>
									{/if}
								</td>
							</tr>
						{/each}
						{#if pr.data.length === 0 && !pr.loading}
							<tr><td colspan="4"><div class="wt-empty py-4"><p class="wt-empty-text text-xs">Belum ada data</p></div></td></tr>
						{/if}
					</tbody>
				</table>
			</div>
			{#snippet footer()}
				{@render PaginationControls({ state: pr, onprev: () => { prevPage(pr); loadEntity('priorities', pr); }, onnext: () => { nextPage(pr); loadEntity('priorities', pr); } })}
			{/snippet}
		</Card>
	{:else if activeMenu === 'statuses'}
		<Card title="Statuses" subtitle="{st.total} item" class="overflow-hidden">
			{#snippet headerActions()}
				<div class="flex items-center gap-2">
					<input bind:this={stEl} type="search" placeholder="Cari..." oninput={debounceSearch('statuses', st)}
						class="wt-filter-input w-28 sm:w-44 lg:w-56" />
					<button onclick={() => openAdd('statuses')} class="kt-btn kt-btn-primary kt-btn-sm" aria-label="Tambah Status">
						<i class="ki-filled ki-plus"></i>
					</button>
				</div>
			{/snippet}
			<div class="kt-scrollable-x-auto">
				<table class="kt-table align-middle text-sm w-full">
					<thead>
						<tr>
							<th class="w-10"></th>
							<th>Nama</th>
							<th class="w-14 text-center">Closed</th>
							<th class="w-16 text-center">Sort</th>
							<th class="w-20 text-end">Aksi</th>
						</tr>
					</thead>
					<tbody>
						{#each st.data as s}
							<tr class="hover:bg-muted/30 transition-colors">
								<td class="text-center"><span class="inline-block size-4 rounded-full shrink-0" style="background:{s.color}"></span></td>
								<td class="font-medium text-foreground">{s.name}</td>
								<td class="text-center">{#if s.isClosed}<Badge variant="outline" size="sm">closed</Badge>{/if}</td>
								<td class="text-center text-xs text-muted-foreground">{s.sortOrder}</td>
								<td class="text-end relative">
									<button onclick={(e) => { e.stopPropagation(); actionMenuId = actionMenuId === `sta-${s.id}` ? null : `sta-${s.id}`; }} class="kt-btn kt-btn-sm kt-btn-icon kt-btn-ghost" aria-label="Aksi">
										<i class="ki-filled ki-dots-vertical text-sm text-muted-foreground"></i>
									</button>
									{#if actionMenuId === `sta-${s.id}`}
										<div class="absolute end-0 top-full mt-1 z-50 min-w-[130px] rounded-lg border border-border bg-popover shadow-lg py-1" onclick={(e) => e.stopPropagation()} role="none">
											<button onclick={() => { openEdit('statuses', s); actionMenuId = null; }} class="w-full text-left px-3 py-1.5 text-xs text-foreground hover:bg-muted flex items-center gap-2"><i class="ki-filled ki-pencil text-sm"></i> Edit</button>
											<button onclick={() => { confirmDelete('statuses', s.id); actionMenuId = null; }} class="w-full text-left px-3 py-1.5 text-xs text-red-500 hover:bg-muted flex items-center gap-2"><i class="ki-filled ki-trash text-sm"></i> Hapus</button>
										</div>
									{/if}
								</td>
							</tr>
						{/each}
						{#if st.data.length === 0 && !st.loading}
							<tr><td colspan="5"><div class="wt-empty py-4"><p class="wt-empty-text text-xs">Belum ada data</p></div></td></tr>
						{/if}
					</tbody>
				</table>
			</div>
			{#snippet footer()}
				{@render PaginationControls({ state: st, onprev: () => { prevPage(st); loadEntity('statuses', st); }, onnext: () => { nextPage(st); loadEntity('statuses', st); } })}
			{/snippet}
		</Card>
	{:else if activeMenu === 'categories'}
		<Card title="Categories" subtitle="{ct.total} item" class="overflow-hidden">
			{#snippet headerActions()}
				<div class="flex items-center gap-2">
					<input bind:this={ctEl} type="search" placeholder="Cari..." oninput={debounceSearch('categories', ct)}
						class="wt-filter-input w-28 sm:w-44 lg:w-56" />
					<button onclick={() => openAdd('categories')} class="kt-btn kt-btn-primary kt-btn-sm" aria-label="Tambah Kategori">
						<i class="ki-filled ki-plus"></i>
					</button>
				</div>
			{/snippet}
			<div class="kt-scrollable-x-auto">
				<table class="kt-table align-middle text-sm w-full">
					<thead>
						<tr>
							<th>Nama</th>
							<th class="w-14 text-center">Sort</th>
							<th class="w-10 text-center">Aktif</th>
							<th class="w-20 text-end">Aksi</th>
						</tr>
					</thead>
					<tbody>
						{#each ct.data as c}
							<tr class="hover:bg-muted/30 transition-colors">
								<td class="font-medium text-foreground">{c.name}</td>
								<td class="text-center text-xs text-muted-foreground">{c.sortOrder}</td>
								<td class="text-center">
									<input type="checkbox" checked={c.active} onchange={() => toggleItem('categories', c.id, 'active', c.active)} class="wt-switch wt-switch-sm" />
								</td>
								<td class="text-end relative">
									<button onclick={(e) => { e.stopPropagation(); actionMenuId = actionMenuId === `cat-${c.id}` ? null : `cat-${c.id}`; }} class="kt-btn kt-btn-sm kt-btn-icon kt-btn-ghost" aria-label="Aksi">
										<i class="ki-filled ki-dots-vertical text-sm text-muted-foreground"></i>
									</button>
									{#if actionMenuId === `cat-${c.id}`}
										<div class="absolute end-0 top-full mt-1 z-50 min-w-[130px] rounded-lg border border-border bg-popover shadow-lg py-1" onclick={(e) => e.stopPropagation()} role="none">
											<button onclick={() => { openEdit('categories', c); actionMenuId = null; }} class="w-full text-left px-3 py-1.5 text-xs text-foreground hover:bg-muted flex items-center gap-2"><i class="ki-filled ki-pencil text-sm"></i> Edit</button>
											<button onclick={() => { confirmDelete('categories', c.id); actionMenuId = null; }} class="w-full text-left px-3 py-1.5 text-xs text-red-500 hover:bg-muted flex items-center gap-2"><i class="ki-filled ki-trash text-sm"></i> Hapus</button>
										</div>
									{/if}
								</td>
							</tr>
						{/each}
						{#if ct.data.length === 0 && !ct.loading}
							<tr><td colspan="4"><div class="wt-empty py-4"><p class="wt-empty-text text-xs">Belum ada data</p></div></td></tr>
						{/if}
					</tbody>
				</table>
			</div>
			{#snippet footer()}
				{@render PaginationControls({ state: ct, onprev: () => { prevPage(ct); loadEntity('categories', ct); }, onnext: () => { nextPage(ct); loadEntity('categories', ct); } })}
			{/snippet}
		</Card>
	{:else if activeMenu === 'users'}
		<Card title="PIC / Teknisi" subtitle="{us.total} orang" class="overflow-hidden">
			{#snippet headerActions()}
				<div class="flex items-center gap-2">
					<input bind:this={usEl} type="search" placeholder="Cari..." oninput={debounceSearch('users', us)}
						class="wt-filter-input w-28 sm:w-44 lg:w-56" />
					<button onclick={() => openAdd('users')} class="kt-btn kt-btn-primary kt-btn-sm" aria-label="Tambah User">
						<i class="ki-filled ki-plus"></i>
					</button>
				</div>
			{/snippet}
			<div class="kt-scrollable-x-auto">
				<table class="kt-table align-middle text-sm w-full">
					<thead>
						<tr>
							<th>Nama</th>
							<th class="w-28">Telepon</th>
							<th class="w-16">Role</th>
							<th class="w-10 text-center">Aktif</th>
							<th class="w-20 text-end">Aksi</th>
						</tr>
					</thead>
					<tbody>
						{#each us.data as u}
							<tr class="hover:bg-muted/30 transition-colors">
								<td class="font-medium text-foreground">{u.name}</td>
								<td class="text-sm text-muted-foreground">{maskPhone(u.phone)}</td>
								<td><Badge variant={u.role === 'admin' ? 'info' : u.role === 'pic' ? 'primary' : 'outline'} size="sm">{u.role}</Badge></td>
								<td class="text-center">
									<input type="checkbox" checked={u.active} onchange={() => toggleItem('users', u.id, 'active', u.active)} class="wt-switch wt-switch-sm" />
								</td>
								<td class="text-end relative">
									<button onclick={(e) => { e.stopPropagation(); actionMenuId = actionMenuId === `usr-${u.id}` ? null : `usr-${u.id}`; }} class="kt-btn kt-btn-sm kt-btn-icon kt-btn-ghost" aria-label="Aksi">
										<i class="ki-filled ki-dots-vertical text-sm text-muted-foreground"></i>
									</button>
									{#if actionMenuId === `usr-${u.id}`}
										<div class="absolute end-0 top-full mt-1 z-50 min-w-[130px] rounded-lg border border-border bg-popover shadow-lg py-1" onclick={(e) => e.stopPropagation()} role="none">
											<button onclick={() => { openEdit('users', u); actionMenuId = null; }} class="w-full text-left px-3 py-1.5 text-xs text-foreground hover:bg-muted flex items-center gap-2"><i class="ki-filled ki-pencil text-sm"></i> Edit</button>
											<button onclick={() => { confirmDelete('users', u.id); actionMenuId = null; }} class="w-full text-left px-3 py-1.5 text-xs text-red-500 hover:bg-muted flex items-center gap-2"><i class="ki-filled ki-trash text-sm"></i> Hapus</button>
										</div>
									{/if}
								</td>
							</tr>
						{/each}
						{#if us.data.length === 0 && !us.loading}
							<tr><td colspan="5"><div class="wt-empty py-4"><p class="wt-empty-text text-xs">Belum ada data</p></div></td></tr>
						{/if}
					</tbody>
				</table>
			</div>
			{#snippet footer()}
				{@render PaginationControls({ state: us, onprev: () => { prevPage(us); loadEntity('users', us); }, onnext: () => { nextPage(us); loadEntity('users', us); } })}
			{/snippet}
		</Card>
	{:else if activeMenu === 'wa-connection'}
		<Card title="WhatsApp Connection">
			{#snippet headerActions()}
				<button onclick={refreshNow} class="kt-btn kt-btn-sm kt-btn-ghost" aria-label="Refresh status">
					<i class="ki-filled ki-arrows-loop text-sm"></i>
				</button>
			{/snippet}
			<div class="px-5 py-4 space-y-5 lg:space-y-0">
				{#if waStatus.status === 'loading'}
					<div class="wt-spinner"><div class="wt-spinner-ring"></div></div>
				{:else}
					<!-- Status indicator -->
					{@const statusDot = waStatus.status === 'connected' ? 'bg-success' : waStatus.status === 'scanning_qr' || waStatus.status === 'reconnecting' ? 'bg-warning' : waStatus.status === 'initializing' ? 'bg-info' : waStatus.status === 'worker_offline' ? 'bg-muted-foreground' : 'bg-destructive'}
					{@const statusLabel = waStatus.status === 'worker_offline' ? 'Worker Offline' : waStatus.status === 'scanning_qr' ? 'Scan QR' : waStatus.status === 'initializing' ? 'Initializing\u2026' : waStatus.status}
					<div class="lg:grid lg:grid-cols-2 lg:gap-5">
						<div class="space-y-5">
							<div class="flex items-center gap-3">
								<span class="inline-block size-3 rounded-full {statusDot} {waStatus.status === 'initializing' ? 'animate-pulse' : ''}"></span>
								<div>
									<span class="font-medium text-foreground text-sm capitalize">{statusLabel}</span>
									{#if waStatus.status === 'connected'}
										<span class="text-xs text-success ml-2"><i class="ki-filled ki-check-circle"></i> Terhubung</span>
									{/if}
									{#if waStatus.status === 'reconnecting' && waHealth}
										<span class="text-xs text-warning ml-2">({waHealth.reconnectAttempts}/{waHealth.maxReconnectAttempts})</span>
									{/if}
								</div>
							</div>

							<!-- QR Code (auto-refresh tiap 15 detik) -->
							{#if waStatus.status === 'scanning_qr'}
								<div class="flex justify-center py-2">
									{#if waQrImage}
										<img src={waQrImage} alt="QR Code" class="size-56 border border-border rounded-xl" />
										<p class="text-2xs text-muted-foreground text-center mt-1">QR expired dalam ~20 detik, auto-refresh tiap 15 detik</p>
									{:else if waQrError}
										<div class="text-center">
											<p class="text-xs text-destructive mb-1">Gagal memuat QR code</p>
											<button onclick={fetchWaQr} class="kt-btn kt-btn-xs kt-btn-outline">Coba Lagi</button>
										</div>
									{:else}
										<div class="wt-spinner"><div class="wt-spinner-ring"></div></div>
									{/if}
								</div>
							{/if}

							<!-- Connected Profile -->
							{#if waStatus.status === 'connected' && waProfile.loaded}
								<div class="rounded-lg bg-muted/30 p-3 flex items-center gap-3">
									{#if waProfile.photoPath}
										<img src={waProfile.photoPath} alt={waProfile.pushname} class="size-12 rounded-full object-cover" />
									{:else}
										<div class="size-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-lg">{(waProfile.pushname || '?')[0].toUpperCase()}</div>
									{/if}
									<div class="flex flex-col gap-0.5 min-w-0">
										<span class="text-sm font-medium text-foreground truncate">{waProfile.pushname}</span>
										<span class="text-xs text-muted-foreground">{waProfile.phone}</span>
										<span class="text-2xs text-muted-foreground/60">{waProfile.wid}{waProfile.platform ? ' · ' + waProfile.platform : ''}</span>
									</div>
								</div>
							{/if}

							<!-- Connection info grid -->
							<div class="grid grid-cols-2 gap-4 text-sm">
								<div class="flex flex-col gap-1">
									<span class="text-xs text-muted-foreground">Status</span>
									<span class="font-medium text-foreground capitalize">{statusLabel}</span>
								</div>
								<div class="flex flex-col gap-1">
									<span class="text-xs text-muted-foreground">Last Health Check</span>
									<span class="font-medium text-foreground">{waHealthTimestamp ? timeAgo(waHealthTimestamp) : '—'}</span>
								</div>
								<div class="flex flex-col gap-1">
									<span class="text-xs text-muted-foreground">Latency</span>
									<span class="font-medium text-foreground">{waHealth?.latency != null ? waHealth.latency + 'ms' : '—'}</span>
								</div>
								<div class="flex flex-col gap-1">
									<span class="text-xs text-muted-foreground">Reconnect</span>
									<span class="font-medium text-foreground">{waHealth?.reconnectAttempts ?? 0}/{waHealth?.maxReconnectAttempts ?? 10}</span>
								</div>
							</div>

							<!-- Session Persistence Toggle -->
							{#if !waSettingsLoading}
								<label class="flex items-center gap-3 cursor-pointer rounded-lg bg-muted/30 p-3">
									<input type="checkbox" checked={waSettings.wa_session_persistence !== 'false'} onchange={() => saveWaSetting('wa_session_persistence', waSettings.wa_session_persistence === 'false' ? 'true' : 'false')} class="wt-switch" />
									<div>
										<span class="text-sm font-medium text-foreground">Session Persistence</span>
										<p class="text-xs text-muted-foreground">Simpan sesi login agar tidak perlu scan QR ulang saat restart</p>
									</div>
								</label>
							{/if}

							<!-- Session Info -->
							<div class="rounded-lg bg-muted/30 p-3 text-xs space-y-1.5">
								<div class="flex items-center justify-between">
									<span class="text-muted-foreground">Saved Session</span>
									<span class="inline-flex items-center gap-1.5 font-medium {waSessionInfo.exists ? 'text-success' : 'text-muted-foreground'}">
										<span class="inline-block size-2 rounded-full {waSessionInfo.exists ? 'bg-success' : 'bg-muted-foreground'}"></span>
										{waSessionInfo.exists ? 'Available' : 'None'}
									</span>
								</div>
								{#if waSessionInfo.exists}
									<div class="flex justify-between">
										<span class="text-muted-foreground">Created</span>
										<span class="font-medium text-foreground">{waSessionInfo.createdAt ? new Date(waSessionInfo.createdAt).toLocaleString('id-ID') : '—'}</span>
									</div>
									<div class="flex justify-between">
										<span class="text-muted-foreground">Size</span>
										<span class="font-medium text-foreground">{waSessionInfo.size ? (waSessionInfo.size / 1024).toFixed(1) + ' KB' : '—'}</span>
									</div>
								{/if}
							</div>

							<!-- Action buttons -->
							<div class="flex flex-wrap gap-2 pt-1">
								<button onclick={checkWaHealth} disabled={waHealthLoading} class="kt-btn kt-btn-sm kt-btn-outline">
									{#if waHealthLoading}<span class="inline-block size-3 border-2 border-primary border-t-transparent rounded-full animate-spin mr-1"></span>{/if}
									<i class="ki-filled ki-electricity text-sm"></i>
									Health Check
								</button>
								<button onclick={waReconnect} disabled={waReconnectLoading || waStatus.status === 'worker_offline' || waStatus.status === 'initializing'} class="kt-btn kt-btn-sm kt-btn-outline">
									{#if waReconnectLoading}<span class="inline-block size-3 border-2 border-primary border-t-transparent rounded-full animate-spin mr-1"></span>{/if}
									<i class="ki-filled ki-arrows-loop text-sm"></i>
									Reconnect
								</button>
								<button onclick={waDisconnect} disabled={waDisconnectLoading || waStatus.status === 'disconnected' || waStatus.status === 'worker_offline' || waStatus.status === 'initializing'} class="kt-btn kt-btn-sm kt-btn-ghost">
									<i class="ki-filled ki-switch text-sm"></i>
									Disconnect
								</button>
								{#if waStatus.status === 'connected' || waStatus.status === 'disconnected' || waStatus.status === 'scanning_qr'}
									{#if waLogoutConfirm}
										<div class="flex items-center gap-1.5 w-full pt-1">
											<span class="text-xs text-destructive font-medium">Logout & clear session?</span>
											<button onclick={waDisconnectAndClear} disabled={waDisconnectLoading} class="kt-btn kt-btn-xs kt-btn-danger">Yes, Logout</button>
											<button onclick={() => waLogoutConfirm = false} class="kt-btn kt-btn-xs kt-btn-ghost">Cancel</button>
										</div>
									{:else}
										<button onclick={() => waLogoutConfirm = true} class="kt-btn kt-btn-sm kt-btn-danger">
											<i class="ki-filled ki-exit-left text-sm"></i>
											Logout
										</button>
									{/if}
								{/if}
								{#if waSessionInfo.exists && !waLogoutConfirm}
									{#if waClearConfirm}
										<div class="flex items-center gap-1.5 w-full pt-1">
											<span class="text-xs text-destructive font-medium">Clear saved session?</span>
											<button onclick={waClearSession} disabled={waSessionLoading} class="kt-btn kt-btn-xs kt-btn-danger">Yes, Clear</button>
											<button onclick={() => waClearConfirm = false} class="kt-btn kt-btn-xs kt-btn-ghost">Cancel</button>
										</div>
									{:else}
										<button onclick={() => waClearConfirm = true} class="kt-btn kt-btn-sm kt-btn-ghost text-destructive">
											<i class="ki-filled ki-trash text-sm"></i>
											Clear Session
										</button>
									{/if}
								{/if}
							</div>

							<!-- Health details -->
							{#if waHealth}
								<div class="rounded-lg bg-muted/30 p-3 text-xs space-y-1">
									<div class="flex justify-between"><span class="text-muted-foreground">Worker</span><span class="font-medium text-foreground">{waHealth.worker}</span></div>
									<div class="flex justify-between"><span class="text-muted-foreground">Uptime</span><span class="font-medium text-foreground">{formatDuration((waHealth.uptime ?? 0) / 1000)}</span></div>
									<div class="flex justify-between"><span class="text-muted-foreground">Reconnect attempts</span><span class="font-medium text-foreground">{waHealth.reconnectAttempts ?? 0}/{waHealth.maxReconnectAttempts ?? 10}</span></div>
								</div>
							{/if}

							<!-- Test Send -->
							<div class="rounded-lg bg-muted/30 p-3">
								<div class="text-xs font-semibold text-foreground mb-2">Test Send Message</div>
								<div class="flex flex-col gap-2">
									<input placeholder="Chat ID (e.g. 628xxx@c.us)" bind:value={testSendChatId} class="wt-input text-xs" />
									<div class="flex gap-2">
										<input placeholder="Teks pesan..." bind:value={testSendText} class="wt-input text-xs flex-1" onkeydown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendTestMessage(); } }} />
										<button onclick={sendTestMessage} disabled={testSending || !testSendChatId || !testSendText} class="kt-btn kt-btn-sm kt-btn-primary shrink-0">
											{#if testSending}<span class="inline-block size-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-1"></span>{/if}
											Kirim
										</button>
									</div>
								</div>
							</div>
						</div>

						<div class="space-y-5">
							<!-- Worker Status Card -->
							<div class="rounded-lg border border-border p-3 space-y-2">
								<div class="flex items-center justify-between">
									<span class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Worker Process</span>
									<span class="inline-flex items-center gap-1.5 text-xs">
										<span class="inline-block size-2 rounded-full {workerInfo?.running ? 'bg-success' : 'bg-muted-foreground'}"></span>
										{workerInfo?.running ? 'Running' : 'Stopped'}
									</span>
								</div>
								{#if workerInfo?.running}
									<div class="text-xs text-muted-foreground space-y-0.5">
										<div class="flex justify-between"><span>PID</span><span class="font-mono text-foreground">{workerInfo.pid}</span></div>
										<div class="flex justify-between"><span>Uptime</span><span class="text-foreground">{formatDuration(workerInfo.uptime / 1000)}</span></div>
										<div class="flex justify-between"><span>Worker URL</span><span class="font-mono text-foreground">{workerInfo.workerUrl}</span></div>
									</div>
								{/if}
								<div class="flex gap-2 pt-1">
									<button onclick={startWorker} disabled={workerStarting || workerInfo?.running} class="kt-btn kt-btn-xs kt-btn-primary">
										{#if workerStarting}<span class="inline-block size-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-1"></span>{/if}
										Start
									</button>
									<button onclick={stopWorker} disabled={workerStopping || !workerInfo?.running} class="kt-btn kt-btn-xs kt-btn-ghost">
										{#if workerStopping}<span class="inline-block size-3 border-2 border-primary border-t-transparent rounded-full animate-spin mr-1"></span>{/if}
										Stop
									</button>
								</div>
							</div>

							<!-- Worker Settings -->
							<div class="rounded-lg border border-border p-3 space-y-3">
								<span class="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">Worker Settings</span>
								{#if waSettingsLoading}
									<div class="wt-spinner py-2"><div class="wt-spinner-ring"></div></div>
								{:else}
									<div class="space-y-3">
										<div class="space-y-1">
											<label for="wa_worker_url" class="text-xs text-muted-foreground">Worker API URL</label>
											<input id="wa_worker_url" type="text" bind:value={waSettings.wa_worker_url} class="wt-input text-xs font-mono w-full" placeholder="http://127.0.0.1:3457" />
											<button onclick={() => saveWaSetting('wa_worker_url', waSettings.wa_worker_url)} disabled={waSettingsSaving} class="kt-btn kt-btn-xs kt-btn-primary mt-1">Simpan URL</button>
										</div>
										<label class="flex items-center gap-3 cursor-pointer">
											<input type="checkbox" checked={waSettings.wa_worker_auto_restart !== 'false'} onchange={() => saveWaSetting('wa_worker_auto_restart', waSettings.wa_worker_auto_restart === 'false' ? 'true' : 'false')} class="wt-switch wt-switch-sm" />
											<div>
												<span class="text-xs font-medium text-foreground">Auto Restart Worker</span>
												<p class="text-2xs text-muted-foreground">Restart otomatis jika worker crash</p>
											</div>
										</label>
										<div class="grid grid-cols-2 gap-3">
											<div class="space-y-1">
												<label for="wa_worker_max_reconnect" class="text-xs text-muted-foreground">Max Reconnect</label>
												<input id="wa_worker_max_reconnect" type="number" min="1" max="50" bind:value={waSettings.wa_worker_max_reconnect}
													onchange={() => saveWaSetting('wa_worker_max_reconnect', waSettings.wa_worker_max_reconnect)}
													class="wt-input text-xs w-full" />
											</div>
											<div class="space-y-1">
												<label for="wa_worker_qr_interval" class="text-xs text-muted-foreground">QR Refresh (detik)</label>
												<input id="wa_worker_qr_interval" type="number" min="5" max="60" bind:value={waSettings.wa_worker_qr_interval}
													onchange={() => saveWaSetting('wa_worker_qr_interval', waSettings.wa_worker_qr_interval)}
													class="wt-input text-xs w-full" />
											</div>
										</div>
									</div>
								{/if}
							</div>

							<!-- Stats -->
							{#if waStats}
								<div class="rounded-lg bg-muted/30 p-3">
									<div class="text-xs font-semibold text-foreground mb-2">Stats</div>
									<div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
										<div class="text-center">
											<div class="text-lg font-bold text-primary">{waStats.today.messages}</div>
											<div class="text-2xs text-muted-foreground">Pesan Hari Ini</div>
										</div>
										<div class="text-center">
											<div class="text-lg font-bold text-primary">{waStats.today.classified}</div>
											<div class="text-2xs text-muted-foreground">Terkelaskan Hari Ini</div>
										</div>
										<div class="text-center">
											<div class="text-lg font-bold text-info">{waStats.today.supportRelated}</div>
											<div class="text-2xs text-muted-foreground">Support Related</div>
										</div>
										<div class="text-center">
											<div class="text-lg font-bold text-success">{waStats.today.ticketsCreated}</div>
											<div class="text-2xs text-muted-foreground">Tickets Baru</div>
										</div>
										<div class="text-center">
											<div class="text-lg font-bold text-foreground">{waStats.week.messages}</div>
											<div class="text-2xs text-muted-foreground">Minggu Ini</div>
										</div>
										<div class="text-center">
											<div class="text-lg font-bold text-foreground">{waStats.week.classified}</div>
											<div class="text-2xs text-muted-foreground">Terkelaskan</div>
										</div>
										<div class="text-center text-warning">
											<div class="text-lg font-bold">{waStats.unprocessed}</div>
											<div class="text-2xs text-muted-foreground">Belum Diproses</div>
										</div>
										<div class="text-center">
											<div class="text-lg font-bold text-foreground">{waStats.avgConfidence != null ? (waStats.avgConfidence * 100).toFixed(0) + '%' : '—'}</div>
											<div class="text-2xs text-muted-foreground">Rata-rata Confidence</div>
										</div>
									</div>
								</div>
							{/if}

							<!-- Latency Chart (collapsible) -->
							<button onclick={() => { latExpanded = !latExpanded; if (latExpanded) fetchLatency(); }} class="flex items-center justify-between w-full rounded-lg bg-muted/30 p-3 text-xs font-semibold text-foreground hover:bg-muted/50 transition-colors cursor-pointer">
								<span>Connection Quality</span>
								<span class="text-muted-foreground">{latExpanded ? '−' : '+'}</span>
							</button>
							{#if latExpanded}
								<div class="rounded-lg bg-muted/30 p-3 -mt-1">
									{#if latLoading}
										<div class="wt-spinner py-4"><div class="wt-spinner-ring"></div></div>
									{:else if latencyHistory.length === 0}
										<p class="text-xs text-muted-foreground text-center py-4">Belum ada data latency. Lakukan health check terlebih dahulu.</p>
									{:else}
										{@const maxLat = Math.max(...latencyHistory.map(p => p.latency), 1)}
										<div class="flex items-end gap-0.5 h-20">
											{#each latencyHistory.slice(-60) as point}
												<div class="flex-1 relative group">
													<div
														title="{point.status} — {point.latency}ms"
														class="w-full rounded-sm transition-all cursor-pointer"
														style="height: {(point.latency / maxLat) * 100}%; background: {point.status === 'connected' ? 'var(--color-success, #22c55e)' : 'var(--color-destructive, #ef4444)'}; min-height: 2px"
													></div>
												</div>
											{/each}
										</div>
										<div class="flex justify-between text-2xs text-muted-foreground mt-1">
											<span>60 data points terakhir</span>
											<span>↑{maxLat}ms</span>
										</div>
									{/if}
								</div>
							{/if}

							<!-- Worker Logs (collapsible) -->
							<button onclick={() => { logExpanded = !logExpanded; if (logExpanded) fetchLogs(); }} class="flex items-center justify-between w-full rounded-lg bg-muted/30 p-3 text-xs font-semibold text-foreground hover:bg-muted/50 transition-colors cursor-pointer">
								<span>Worker Live Logs</span>
								<span class="text-muted-foreground">{logExpanded ? '−' : '+'}</span>
							</button>
							{#if logExpanded}
								<div class="rounded-lg bg-muted/30 p-3 -mt-1">
									<div class="flex items-center gap-2 mb-2">
										<input type="date" bind:value={logDate} onchange={fetchLogs} class="wt-input text-2xs flex-1" />
										<button onclick={fetchLogs} disabled={logLoading} class="kt-btn kt-btn-xs kt-btn-outline shrink-0">Refresh</button>
									</div>
									{#if logLoading}
										<div class="wt-spinner py-4"><div class="wt-spinner-ring"></div></div>
									{:else if logLines.length === 0}
										<p class="text-xs text-muted-foreground text-center py-4">Tidak ada log untuk tanggal ini.</p>
									{:else}
										<div class="bg-black/80 text-green-400 text-[10px] font-mono leading-relaxed rounded p-2 max-h-80 overflow-y-auto whitespace-pre-wrap break-all">
											{#each logLines as line}
												<div class="hover:bg-white/5">{line}</div>
											{/each}
										</div>
									{/if}
								</div>
							{/if}
						</div>
					</div>
				{/if}
			</div>
		</Card>

	{:else if activeMenu === 'wa-autoreply'}
		<Card title="Auto Reply">
			<div class="px-5 py-4 space-y-4">
				{#if waSettingsLoading}
					<div class="wt-spinner"><div class="wt-spinner-ring"></div></div>
				{:else}
					<label class="flex items-center gap-3 cursor-pointer">
						<input type="checkbox" checked={waSettings.wa_auto_reply_global === 'true'} onchange={() => saveWaSetting('wa_auto_reply_global', waSettings.wa_auto_reply_global === 'true' ? 'false' : 'true')} class="wt-switch" />
						<div>
							<span class="text-sm font-medium text-foreground">Aktifkan Auto Reply</span>
							<p class="text-xs text-muted-foreground">Balas otomatis setiap pesan support yang masuk</p>
						</div>
					</label>

					<div class="border-t border-border pt-4">
						<label for="ar-template" class="block text-xs font-medium text-foreground mb-1.5">Template Balasan</label>
						<textarea id="ar-template" bind:value={waSettings.wa_auto_reply_template} rows="4" class="wt-input font-mono text-xs"></textarea>
						<p class="text-2xs text-muted-foreground mt-1">Variables: {'{name}'} {'{ticket}'} {'{summary}'} {'{body}'}</p>
					</div>

					<div class="flex justify-end pt-2">
						<button onclick={() => saveWaSetting('wa_auto_reply_template', waSettings.wa_auto_reply_template)} disabled={waSettingsSaving} class="kt-btn kt-btn-sm kt-btn-primary">
							{#if waSettingsSaving}<span class="inline-block size-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-1"></span>{/if}
							Simpan
						</button>
					</div>
				{/if}
			</div>
		</Card>

	{:else if activeMenu === 'wa-processing'}
		<Card title="Message Processing">
			<div class="px-5 py-4 space-y-5">
				{#if waSettingsLoading}
					<div class="wt-spinner"><div class="wt-spinner-ring"></div></div>
				{:else}
					<div class="space-y-3">
						<label class="flex items-center gap-3 cursor-pointer">
							<input type="checkbox" checked={waSettings.wa_classification_enabled !== 'false'} onchange={() => saveWaSetting('wa_classification_enabled', waSettings.wa_classification_enabled === 'false' ? 'true' : 'false')} class="wt-switch" />
							<div>
								<span class="text-sm font-medium text-foreground">Klasifikasi Otomatis</span>
								<p class="text-xs text-muted-foreground">Klasifikasikan pesan sebagai support/non-support via AI</p>
							</div>
						</label>
						<label class="flex items-center gap-3 cursor-pointer">
							<input type="checkbox" checked={waSettings.wa_auto_ticket_enabled !== 'false'} onchange={() => saveWaSetting('wa_auto_ticket_enabled', waSettings.wa_auto_ticket_enabled === 'false' ? 'true' : 'false')} class="wt-switch" />
							<div>
								<span class="text-sm font-medium text-foreground">Buat Tiket Otomatis</span>
								<p class="text-xs text-muted-foreground">Buat tiket support otomatis dari pesan terklasifikasi</p>
							</div>
						</label>
						<label class="flex items-center gap-3 cursor-pointer">
							<input type="checkbox" checked={waSettings.wa_auto_reply_enabled !== 'false'} onchange={() => saveWaSetting('wa_auto_reply_enabled', waSettings.wa_auto_reply_enabled === 'false' ? 'true' : 'false')} class="wt-switch" />
							<div>
								<span class="text-sm font-medium text-foreground">Balas Otomatis</span>
								<p class="text-xs text-muted-foreground">Kirim balasan otomatis ke pesan support</p>
							</div>
						</label>
						<label class="flex items-center gap-3 cursor-pointer border-t border-border pt-3">
							<input type="checkbox" checked={waSettings.wa_llm_consent !== 'false'} onchange={() => saveWaSetting('wa_llm_consent', waSettings.wa_llm_consent === 'false' ? 'true' : 'false')} class="wt-switch" />
							<div>
								<span class="text-sm font-medium text-foreground">Kirim Data ke AI</span>
								<p class="text-xs text-muted-foreground">Izinkan kirim body pesan ke AI lokal (Ollama) untuk klasifikasi. Nomor telepon akan dianonimkan. Nonaktifkan jika data bersifat rahasia.</p>
							</div>
						</label>
					</div>

					<div class="border-t border-border pt-4">
						<label for="ignore-keys" class="block text-xs font-medium text-foreground mb-1.5">Abaikan Kata Kunci</label>
						<input id="ignore-keys" type="text" bind:value={waSettings.wa_ignore_keywords} class="wt-input text-xs" placeholder="spam, promo, info" />
						<p class="text-2xs text-muted-foreground mt-1">Pisahkan dengan koma. Pesan yang mengandung kata ini tidak diproses.</p>
					</div>

					<div class="border-t border-border pt-4">
						<span class="text-xs font-medium text-foreground block mb-2">Jam Operasional</span>
						<div class="space-y-2 text-sm">
							{#each ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as day}
								{@const dayLabel = { monday: 'Senin', tuesday: 'Selasa', wednesday: 'Rabu', thursday: 'Kamis', friday: 'Jumat', saturday: 'Sabtu' }[day]}
								{@const hours = parseBusinessHours(waSettings.wa_business_hours, day)}
								<div class="flex items-center gap-1 sm:gap-2">
									<span class="w-14 sm:w-16 text-xs text-muted-foreground">{dayLabel}</span>
									<input type="time" value={hours.start} onchange={(e) => updateBusinessHour(day, 'start', (e.target as HTMLInputElement).value)} class="wt-input w-24 sm:w-28 text-xs" />
									<span class="text-xs text-muted-foreground">—</span>
									<input type="time" value={hours.end} onchange={(e) => updateBusinessHour(day, 'end', (e.target as HTMLInputElement).value)} class="wt-input w-24 sm:w-28 text-xs" />
								</div>
							{/each}
							<p class="text-2xs text-muted-foreground mt-1">Di luar jam operasional, pesan tetap diterima tapi tidak otomatis dibalas.</p>
						</div>
					</div>

					<div class="flex justify-end pt-2">
						<button onclick={() => saveWaSetting('wa_ignore_keywords', waSettings.wa_ignore_keywords)} disabled={waSettingsSaving} class="kt-btn kt-btn-sm kt-btn-primary">
							{#if waSettingsSaving}<span class="inline-block size-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-1"></span>{/if}
							Simpan Filter
						</button>
					</div>
				{/if}
			</div>
		</Card>

	{:else if activeMenu === 'sources'}
		<Card title="WhatsApp Sources" subtitle="{sr.total} sumber" class="overflow-hidden">
			{#snippet headerActions()}
				<div class="flex items-center gap-2">
					<input bind:this={srEl} type="search" placeholder="Cari..." oninput={debounceSearch('sources', sr)}
						class="wt-filter-input w-36 sm:w-52 lg:w-64" />
					<button onclick={() => openAdd('sources')} class="kt-btn kt-btn-primary kt-btn-sm">
						<i class="ki-filled ki-plus"></i>
						Tambah
					</button>
				</div>
			{/snippet}
			<div class="kt-scrollable-x-auto">
				<table class="kt-table align-middle text-sm w-full">
					<thead>
						<tr>
							<th>Nama</th>
							<th class="w-16">Tipe</th>
							<th class="w-36">Chat ID</th>
							<th class="w-24 text-center">Auto Reply</th>
							<th class="w-16 text-center">Aktif</th>
							<th class="w-20 text-end">Aksi</th>
						</tr>
					</thead>
					<tbody>
						{#each sr.data as src}
							<tr class="hover:bg-muted/30 transition-colors">
								<td class="font-medium text-foreground">
									{src.name}
									{#if src.chatId}<span class="text-xs text-success ml-1" title={src.chatId}><i class="ki-filled ki-check-circle"></i></span>{/if}
								</td>
								<td><Badge variant="outline" size="sm">{src.type}</Badge></td>
								<td class="text-xs text-muted-foreground font-mono truncate max-w-[140px]" title={src.chatId || src.phone}>{src.chatId || maskPhone(src.phone)}</td>
								<td class="text-center">
									<input type="checkbox" checked={src.autoReply} onchange={() => toggleItem('sources', src.id, 'autoReply', src.autoReply)} class="wt-switch wt-switch-sm" />
								</td>
								<td class="text-center">
									<input type="checkbox" checked={src.active} onchange={() => toggleItem('sources', src.id, 'active', src.active)} class="wt-switch wt-switch-sm" />
								</td>
								<td class="text-end relative">
									<button onclick={(e) => { e.stopPropagation(); actionMenuId = actionMenuId === `src-${src.id}` ? null : `src-${src.id}`; }} class="kt-btn kt-btn-sm kt-btn-icon kt-btn-ghost" aria-label="Aksi">
										<i class="ki-filled ki-dots-vertical text-sm text-muted-foreground"></i>
									</button>
									{#if actionMenuId === `src-${src.id}`}
										<div class="absolute end-0 top-full mt-1 z-50 min-w-[130px] rounded-lg border border-border bg-popover shadow-lg py-1" onclick={(e) => e.stopPropagation()} role="none">
											<button onclick={() => { openEdit('sources', src); actionMenuId = null; }} class="w-full text-left px-3 py-1.5 text-xs text-foreground hover:bg-muted flex items-center gap-2"><i class="ki-filled ki-pencil text-sm"></i> Edit</button>
											<button onclick={() => { confirmDelete('sources', src.id); actionMenuId = null; }} class="w-full text-left px-3 py-1.5 text-xs text-red-500 hover:bg-muted flex items-center gap-2"><i class="ki-filled ki-trash text-sm"></i> Hapus</button>
										</div>
									{/if}
								</td>
							</tr>
						{/each}
						{#if sr.data.length === 0 && !sr.loading}
							<tr><td colspan="6"><div class="wt-empty py-4"><p class="wt-empty-text text-xs">Belum ada sumber WhatsApp. Jalankan worker untuk sinkronisasi grup.</p></div></td></tr>
						{/if}
					</tbody>
				</table>
			</div>
			{#snippet footer()}
				{@render PaginationControls({ state: sr, onprev: () => { prevPage(sr); loadEntity('sources', sr); }, onnext: () => { nextPage(sr); loadEntity('sources', sr); } })}
			{/snippet}
		</Card>
	{/if}
{/key}
	</div>
</div>

<!-- Pagination Controls Component -->
{#snippet PaginationControls({ state, onprev, onnext }: { state: typeof pr; onprev: () => void; onnext: () => void })}
	<div class="flex items-center justify-between text-xs text-muted-foreground">
		<span>Menampilkan {state.total > 0 ? state.skip + 1 : 0}-{Math.min(state.skip + state.take, state.total)} dari {state.total}</span>
		<div class="flex items-center gap-1">
			<button onclick={onprev} disabled={state.skip === 0} class="kt-btn kt-btn-sm kt-btn-ghost px-2 disabled:opacity-30">Prev</button>
			<button onclick={onnext} disabled={state.skip + state.take >= state.total} class="kt-btn kt-btn-sm kt-btn-ghost px-2 disabled:opacity-30">Next</button>
		</div>
	</div>
{/snippet}

<!-- ──────────────── Add/Edit Dialog ──────────────── -->
{#if dialogShow}
	<div class="wt-overlay" onclick={() => { if (!dialogSaving) dialogShow = false; }} onkeydown={(e) => { if (e.key === 'Escape') dialogShow = false; }} tabindex="0" role="button">
		<div class="wt-modal-card max-w-sm" onclick={(e) => e.stopPropagation()} role="none">
			<div class="flex items-center justify-between px-5 pt-5 pb-3">
				<h3 class="text-base font-semibold text-foreground">{dialogMode === 'add' ? 'Tambah' : 'Edit'} {entityLabels[dialogEntity] || dialogEntity}</h3>
				<button onclick={() => dialogShow = false} disabled={dialogSaving} class="text-muted-foreground hover:text-foreground transition-colors" aria-label="Tutup"><i class="ki-filled ki-cross text-lg"></i></button>
			</div>

			{#if dialogError}
				<div class="mx-5 mb-3 p-2.5 rounded-lg bg-destructive/5 border border-destructive/10 text-xs text-destructive">{dialogError}</div>
			{/if}

			<form onsubmit={(e) => { e.preventDefault(); dialogSave(); }} class="px-5 pb-5 space-y-3">
				{#if dialogEntity === 'priorities'}
				<div>
					<label for="prio-name" class="block text-xs font-medium text-foreground mb-1">Nama</label>
						<input id="prio-name" type="text" bind:value={dialogForm.name} required class="wt-input" />
				</div>
					<div class="grid grid-cols-2 gap-3">
				<div>
					<label for="prio-level" class="block text-xs font-medium text-foreground mb-1">Level</label>
							<input id="prio-level" type="number" bind:value={dialogForm.level} min="1" max="99" class="wt-input" />
				</div>
				<div>
					<label for="prio-color" class="block text-xs font-medium text-foreground mb-1">Warna</label>
							<input id="prio-color" type="color" bind:value={dialogForm.color} class="w-full h-8 px-1 border border-input rounded-lg cursor-pointer" />
				</div>
					</div>
				<div>
					<label for="prio-desc" class="block text-xs font-medium text-foreground mb-1">Deskripsi</label>
						<textarea id="prio-desc" bind:value={dialogForm.description} rows="2" class="wt-input"></textarea>
				</div>

				{:else if dialogEntity === 'statuses'}
				<div>
					<label for="st-name" class="block text-xs font-medium text-foreground mb-1">Nama</label>
						<input id="st-name" type="text" bind:value={dialogForm.name} required class="wt-input" />
				</div>
					<div class="grid grid-cols-2 gap-3">
				<div>
					<label for="st-sort" class="block text-xs font-medium text-foreground mb-1">Sort Order</label>
							<input id="st-sort" type="number" bind:value={dialogForm.sortOrder} min="0" class="wt-input" />
				</div>
				<div>
					<label for="st-color" class="block text-xs font-medium text-foreground mb-1">Warna</label>
							<input id="st-color" type="color" bind:value={dialogForm.color} class="w-full h-8 px-1 border border-input rounded-lg cursor-pointer" />
				</div>
					</div>
					<label class="flex items-center gap-2 text-sm cursor-pointer">
						<input type="checkbox" bind:checked={dialogForm.isClosed} class="wt-switch" />
						<span class="text-foreground">Status tertutup (Closed)</span>
					</label>
				<div>
					<label for="st-desc" class="block text-xs font-medium text-foreground mb-1">Deskripsi</label>
						<textarea id="st-desc" bind:value={dialogForm.description} rows="2" class="wt-input"></textarea>
				</div>

				{:else if dialogEntity === 'categories'}
				<div>
					<label for="cat-name" class="block text-xs font-medium text-foreground mb-1">Nama</label>
						<input id="cat-name" type="text" bind:value={dialogForm.name} required class="wt-input" />
				</div>
				<div>
					<label for="cat-desc" class="block text-xs font-medium text-foreground mb-1">Deskripsi</label>
						<textarea id="cat-desc" bind:value={dialogForm.description} rows="2" class="wt-input"></textarea>
				</div>
					<div class="grid grid-cols-2 gap-3">
				<div>
					<label for="cat-sort" class="block text-xs font-medium text-foreground mb-1">Sort Order</label>
							<input id="cat-sort" type="number" bind:value={dialogForm.sortOrder} min="0" class="wt-input" />
				</div>
						<label class="flex items-center gap-2 text-sm cursor-pointer self-end pb-2">
							<input type="checkbox" bind:checked={dialogForm.active} class="wt-switch" />
							<span class="text-foreground">Aktif</span>
						</label>
					</div>

				{:else if dialogEntity === 'users'}
				<div>
					<label for="u-name" class="block text-xs font-medium text-foreground mb-1">Nama</label>
						<input id="u-name" type="text" bind:value={dialogForm.name} required class="wt-input" />
				</div>
					<div class="grid grid-cols-2 gap-3">
				<div>
					<label for="u-phone" class="block text-xs font-medium text-foreground mb-1">Telepon</label>
							<input id="u-phone" type="text" bind:value={dialogForm.phone} required class="wt-input" />
				</div>
				<div>
					<label for="u-role" class="block text-xs font-medium text-foreground mb-1">Role</label>
							<select id="u-role" bind:value={dialogForm.role} class="wt-select">
								<option value="admin">Admin</option>
								<option value="pic">PIC</option>
								<option value="user">User</option>
							</select>
				</div>
					</div>
				<div>
					<label for="u-email" class="block text-xs font-medium text-foreground mb-1">Email</label>
						<input id="u-email" type="email" bind:value={dialogForm.email} class="wt-input" />
				</div>
				<div>
					<label for="u-password" class="block text-xs font-medium text-foreground mb-1">Password {dialogMode === 'edit' ? '(kosongkan jika tidak diubah)' : ''}</label>
						<input id="u-password" type="password" bind:value={dialogForm.password} class="wt-input" placeholder="{dialogMode === 'add' ? 'Min 4 karakter' : 'Biarkan kosong'}" />
				</div>
					<label class="flex items-center gap-2 text-sm cursor-pointer">
						<input type="checkbox" bind:checked={dialogForm.active} class="wt-switch" />
						<span class="text-foreground">Aktif</span>
					</label>

				{:else if dialogEntity === 'sources'}
				<div>
					<label for="s-name" class="block text-xs font-medium text-foreground mb-1">Nama</label>
						<input id="s-name" type="text" bind:value={dialogForm.name} required class="wt-input" />
				</div>
					<div class="grid grid-cols-2 gap-3">
				<div>
					<label for="s-type" class="block text-xs font-medium text-foreground mb-1">Tipe</label>
							<select id="s-type" bind:value={dialogForm.type} class="wt-select">
								<option value="group">Group</option>
								<option value="contact">Contact</option>
								<option value="broadcast">Broadcast</option>
							</select>
				</div>
				<div>
					<label for="s-phone" class="block text-xs font-medium text-foreground mb-1">Telepon</label>
							<input id="s-phone" type="text" bind:value={dialogForm.phone} class="wt-input" />
				</div>
					</div>
				<div>
					<label for="s-desc" class="block text-xs font-medium text-foreground mb-1">Deskripsi</label>
						<textarea id="s-desc" bind:value={dialogForm.description} rows="2" class="wt-input"></textarea>
				</div>
					<label class="flex items-center gap-2 text-sm cursor-pointer">
						<input type="checkbox" bind:checked={dialogForm.autoReply} class="wt-switch" />
						<span class="text-foreground">Auto Reply</span>
					</label>
					{#if dialogForm.autoReply}
				<div>
					<label for="s-tpl" class="block text-xs font-medium text-foreground mb-1">Template Balasan</label>
							<textarea id="s-tpl" bind:value={dialogForm.replyTemplate} rows="2" placeholder="Halo {name}, laporan Anda telah diterima..."
								class="wt-input"></textarea>
							<p class="text-2xs text-muted-foreground mt-0.5">{'{name}'} {'{ticket}'} {'{summary}'} {'{body}'}</p>
				</div>
					{/if}
				{/if}

				<div class="flex justify-end gap-2 pt-2">
					<button type="button" onclick={() => dialogShow = false} class="kt-btn kt-btn-sm kt-btn-light" disabled={dialogSaving}>Batal</button>
					<button type="submit" class="kt-btn kt-btn-sm kt-btn-primary" disabled={dialogSaving}>
						{#if dialogSaving}<span class="inline-block size-3.5 border-2 border-white border-t-transparent rounded-full animate-spin mr-1"></span>{/if}
						{dialogMode === 'add' ? 'Tambah' : 'Simpan'}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- ──────────────── Delete Confirmation ──────────────── -->
{#if deleteId}
	<div class="wt-overlay" onclick={() => deleteId = null} onkeydown={(e) => { if (e.key === 'Escape') deleteId = null; }} tabindex="0" role="button">
		<div class="wt-modal-card max-w-xs p-5" onclick={(e) => e.stopPropagation()} role="none">
			<div class="flex items-center gap-3 mb-4">
				<div class="size-9 rounded-full bg-red-100 flex items-center justify-center shrink-0">
					<i class="ki-filled ki-trash text-red-500 text-sm"></i>
				</div>
				<div>
					<h3 class="text-base font-semibold text-foreground">Hapus {entityLabels[deleteEntity] || deleteEntity}</h3>
					<p class="text-xs text-muted-foreground">Yakin ingin menghapus? Tindakan ini tidak bisa dibatalkan.</p>
				</div>
			</div>
			<div class="flex justify-end gap-2">
				<button onclick={() => deleteId = null} class="kt-btn kt-btn-sm kt-btn-light">Batal</button>
				<button onclick={doDelete} class="kt-btn kt-btn-sm kt-btn-danger">Hapus</button>
			</div>
		</div>
	</div>
{/if}

<!-- ──────────────── Import Modal ──────────────── -->
{#if importShow}
	<div class="wt-overlay" onclick={() => { if (!importing) importShow = false; }} onkeydown={(e) => { if (e.key === 'Escape') importShow = false; }} tabindex="0" role="button">
		<div class="wt-modal-card max-w-sm p-5" onclick={(e) => e.stopPropagation()} role="none">
			<div class="flex items-center justify-between mb-4">
				<h3 class="text-base font-semibold text-foreground">Import Settings</h3>
				<button onclick={() => importShow = false} disabled={importing} class="text-muted-foreground hover:text-foreground transition-colors" aria-label="Tutup"><i class="ki-filled ki-cross text-lg"></i></button>
			</div>

			<div class="space-y-3">
				<div>
					<label for="import-file" class="block text-sm font-medium text-foreground mb-1">File JSON</label>
					<input id="import-file" type="file" accept=".json" onchange={onImportFile} class="w-full text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-primary file:text-white hover:file:bg-primary/90" />
				</div>

				{#if importPreview}
					<div class="p-3 rounded-lg bg-muted/50 text-xs space-y-1.5">
						<p class="font-medium text-foreground">Pratinjau data:</p>
						{#each Object.entries(importPreview) as [key, count]}
							<div class="flex justify-between"><span class="text-muted-foreground capitalize">{key}</span><span class="font-medium">{count} item</span></div>
						{/each}
					</div>
					<p class="text-xs text-warning">Import akan menambah/memperbarui data yang ada. Data tidak bisa dikembalikan.</p>
				{/if}

				<div class="flex justify-end gap-2 pt-2">
					<button onclick={() => importShow = false} class="kt-btn kt-btn-sm kt-btn-light" disabled={importing}>Batal</button>
					<button onclick={doImport} disabled={!importData || importing} class="kt-btn kt-btn-sm kt-btn-primary">
						{#if importing}<span class="inline-block size-3.5 border-2 border-white border-t-transparent rounded-full animate-spin mr-1"></span>{/if}
						Import
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

<!-- ──────────────── FormField Snippet ──────────────── -->


