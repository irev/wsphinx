<script lang="ts">
	import Card from '$lib/components/Card.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import { showToast } from '$lib/stores/toast';
	import { maskPhone } from '$lib/utils/mask';

	const TAKE_OPTIONS = [5, 10, 20, 50, 100];

	let view = $state<{ data: any[]; total: number; skip: number; take: number; q: string; sourceId: string; messageType: string; isProcessed: string; datePreset: string; loading: boolean }>({ data: [], total: 0, skip: 0, take: 20, q: '', sourceId: '', messageType: '', isProcessed: '', datePreset: '', loading: true });
	let settings = $state<any>({ categories: [], priorities: [], pics: [], sources: [] });
	let selected = $state<Set<string>>(new Set());
	let expandedClassify = $state<string | null>(null);
	let classificationCache = $state<Record<string, any>>({});
	let classifying = $state(false);
	let creating = $state(false);
	let autoRefresh = $state(false);
	let refreshTimer: ReturnType<typeof setInterval> | undefined = $state();
	let searchTimer: ReturnType<typeof setTimeout> | undefined;
	let lightboxMedia = $state<string | null>(null);

	async function load() {
		view.loading = true;
		try {
			const params = new URLSearchParams({ skip: String(view.skip), take: String(view.take) });
			if (view.q) params.set('q', view.q);
			if (view.sourceId) params.set('sourceId', view.sourceId);
			if (view.messageType) params.set('messageType', view.messageType);
			if (view.isProcessed) params.set('isProcessed', view.isProcessed);
			if (view.datePreset) {
				const now = new Date();
				if (view.datePreset === 'today') { now.setHours(0, 0, 0, 0); params.set('startDate', now.toISOString()); }
				if (view.datePreset === '7days') { now.setDate(now.getDate() - 7); params.set('startDate', now.toISOString()); }
				if (view.datePreset === '30days') { now.setDate(now.getDate() - 30); params.set('startDate', now.toISOString()); }
			}
			const [msgRes, setRes] = await Promise.all([
				fetch(`/api/messages?${params}`),
				fetch('/api/settings'),
			]);
			if (msgRes.ok) { const d = await msgRes.json(); view.data = d.data; view.total = d.total; }
			if (setRes.ok) settings = (await setRes.json()).data;
		} catch (e) { showToast('error', `Gagal load: ${(e as Error).message}`); }
		view.loading = false;
	}

	$effect(() => { load(); });

	$effect(() => {
		if (autoRefresh) {
			refreshTimer = setInterval(load, 15000);
			return () => clearInterval(refreshTimer);
		} else { clearInterval(refreshTimer); refreshTimer = undefined; }
	});

	function refresh() { load(); }
	function onSearch(e: Event) {
		view.q = (e.target as HTMLInputElement).value;
		view.skip = 0;
		clearTimeout(searchTimer);
		searchTimer = setTimeout(load, 300);
	}
	function onFilter() { view.skip = 0; load(); }
	function prevPage() { if (view.skip > 0) { view.skip = Math.max(0, view.skip - view.take); load(); } }
	function nextPage() { if (view.skip + view.take < view.total) { view.skip += view.take; load(); } }
	function onTakeChange(e: Event) {
		view.take = Number((e.target as HTMLSelectElement).value);
		view.skip = 0;
		load();
	}

	function toggleSelect(id: string) {
		if (selected.has(id)) selected.delete(id);
		else selected.add(id);
		selected = new Set(selected);
	}
	function toggleSelectAll() {
		if (selected.size === view.data.length) selected = new Set();
		else selected = new Set(view.data.map((m: any) => m.id));
	}
	function isSelected(id: string) { return selected.has(id); }

	async function batchAction(action: string) {
		const ids = Array.from(selected);
		if (ids.length === 0) return;
		try {
			const res = await fetch('/api/messages/batch', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ ids, action }),
			});
			if (res.ok) { selected = new Set(); showToast('success', `${ids.length} pesan berhasil diproses`); load(); }
			else throw new Error((await res.json()).error || 'Gagal');
		} catch (e) { showToast('error', (e as Error).message); }
	}

	async function classifySingle(id: string) {
		classifying = true;
		expandedClassify = id;
		try {
			const res = await fetch('/api/messages/classify', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ messageId: id }),
			});
			if (!res.ok) throw new Error((await res.json()).error || `HTTP ${res.status}`);
			const result = (await res.json()).data;
			classificationCache[id] = result;
			classificationCache = { ...classificationCache };
		} catch (e) { showToast('error', (e as Error).message); }
		classifying = false;
		load();
	}

	async function createTicket(msg: any) {
		const cls = classificationCache[msg.id];
		if (!cls) return;
		creating = true;
		const cat = (settings.categories || []).find((c: any) => c.name.toLowerCase() === (cls.category || '').toLowerCase());
		const prio = (settings.priorities || []).find((p: any) => p.name.toLowerCase() === (cls.priority || '').toLowerCase());
		try {
			const res = await fetch('/api/tickets', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					title: cls.summary?.substring(0, 100) || msg.body?.substring(0, 100),
					summary: cls.summary || msg.body,
					reporterName: msg.fromName || msg.fromPhone || 'Unknown',
					reporterPhone: msg.fromPhone,
					sourceId: msg.sourceId,
					categoryId: cat?.id,
					priorityId: prio?.id,
					messageIds: [msg.id],
				}),
			});
			if (!res.ok) throw new Error((await res.json()).error || `HTTP ${res.status}`);
			const ticket = (await res.json()).data;
			showToast('success', `Tiket ${ticket.ticketNumber} berhasil dibuat`);
			expandedClassify = null;
		} catch (e) { showToast('error', (e as Error).message); }
		creating = false;
		load();
	}

	async function toggleRead(msg: any) {
		try {
			await fetch(`/api/messages/${msg.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ isRead: !msg.isRead }),
			});
			load();
		} catch (e) { showToast('error', (e as Error).message); }
	}

	async function archiveMsg(msg: any) {
		try {
			await fetch(`/api/messages/${msg.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ isActive: false }),
			});
			load();
		} catch (e) { showToast('error', (e as Error).message); }
	}

	function relativeTime(d: Date): string {
		const now = Date.now();
		const diff = now - d.getTime();
		const mins = Math.floor(diff / 60000);
		if (mins < 1) return 'baru saja';
		if (mins < 60) return `${mins}m lalu`;
		const hours = Math.floor(mins / 60);
		if (hours < 24) return `${hours}j lalu`;
		const days = Math.floor(hours / 24);
		if (days === 1) return 'Kemarin';
		if (days < 7) return `${days} hari lalu`;
		return d.toLocaleDateString('id-ID');
	}

	function fullTime(d: Date): string {
		return d.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
	}

	function typeBadge(type: string) {
		const m: Record<string, string> = { new_issue: 'destructive', update: 'primary', confirmation: 'success', info_request: 'warning', escalation: 'info', noise: 'outline', general_chat: 'outline' };
		return m[type] || 'outline';
	}
	function prioBadge(p: string) {
		const m: Record<string, string> = { Critical: 'destructive', High: 'warning', Medium: 'primary', Low: 'outline' };
		return m[p] || 'outline';
	}
	function prioBorder(p: string | null) {
		const m: Record<string, string> = { Critical: 'border-red-500', High: 'border-orange-400', Medium: 'border-blue-400', Low: 'border-gray-300' };
		return m[p || ''] || '';
	}
</script>

{#snippet headerActions()}
	<div class="flex items-center gap-2">
		<label class="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none shrink-0">
			<input type="checkbox" bind:checked={autoRefresh} class="kt-checkbox" />
			Auto
		</label>
		<button onclick={refresh} class="kt-btn kt-btn-outline kt-btn-sm" aria-label="Refresh">
			<i class="ki-filled ki-arrows-circle"></i>
		</button>
	</div>
{/snippet}

<Card title="Inbox WhatsApp" subtitle="Pesan masuk dari WhatsApp — klasifikasi lalu buat tiket" {headerActions}>
	<!-- Filters bar -->
	<div class="flex items-center gap-2 flex-wrap px-5 pt-3 pb-2 border-b border-border max-sm:flex-col max-sm:items-stretch">
		<select bind:value={view.sourceId} onchange={onFilter}
			class="kt-filter-select w-auto"
		>
			<option value="">Semua Grup</option>
			{#each settings.sources || [] as src}
				<option value={src.id}>{src.name}{src.active ? '' : ' (nonaktif)'}</option>
			{/each}
		</select>
		<select bind:value={view.messageType} onchange={onFilter}
			class="kt-filter-select"
		>
			<option value="">Semua Type</option>
			<option value="new_issue">new_issue</option>
			<option value="update">update</option>
			<option value="confirmation">confirmation</option>
			<option value="info_request">info_request</option>
			<option value="escalation">escalation</option>
			<option value="noise">noise</option>
			<option value="general_chat">general_chat</option>
		</select>
		<select bind:value={view.isProcessed} onchange={onFilter}
			class="kt-filter-select"
		>
			<option value="">Semua Status</option>
			<option value="true">Telah diproses</option>
			<option value="false">Belum diproses</option>
		</select>
		<select bind:value={view.datePreset} onchange={onFilter}
			class="kt-filter-select"
		>
			<option value="">Semua Waktu</option>
			<option value="today">Hari Ini</option>
			<option value="7days">7 Hari</option>
			<option value="30days">30 Hari</option>
		</select>
		<input type="search" placeholder="Cari..." oninput={onSearch}
			class="kt-filter-input w-28 lg:w-36"
		/>
		<select onchange={onTakeChange} value={view.take}
			class="kt-filter-select"
		>
			{#each TAKE_OPTIONS as opt}
				<option value={opt}>{opt} per halaman</option>
			{/each}
		</select>
	</div>

	<!-- Table -->
	{#if view.loading}
		<div class="flex items-center justify-center py-10"><div class="kt-spinner-ring size-6"></div></div>
	{:else if view.data.length === 0}
		<div class="kt-empty">
			<i class="ki-filled ki-messages kt-empty-icon text-4xl"></i>
			<p class="kt-empty-text">Belum ada pesan</p>
			<p class="kt-empty-sub">Import pesan atau jalankan WhatsApp worker</p>
		</div>
	{:else}
		<div class="kt-scrollable-x-auto">
			<table class="kt-table kt-table-border w-full">
				<thead>
					<tr>
						<th class="w-10"><input type="checkbox" onchange={toggleSelectAll} checked={selected.size === view.data.length && view.data.length > 0} class="kt-checkbox" aria-label="Pilih semua" /></th>
						<th><span class="kt-table-col"><span class="kt-table-col-label">Pengirim</span></span></th>
						<th><span class="kt-table-col"><span class="kt-table-col-label">Pesan</span></span></th>
						<th class="w-[100px] hidden md:table-cell"><span class="kt-table-col"><span class="kt-table-col-label">Waktu</span></span></th>
						<th class="w-[130px] hidden lg:table-cell"><span class="kt-table-col"><span class="kt-table-col-label">Klasifikasi</span></span></th>
						<th class="w-[140px] text-end hidden md:table-cell"><span class="kt-table-col justify-end"><span class="kt-table-col-label">Aksi</span></span></th>
					</tr>
				</thead>
				<tbody>
					{#each view.data as msg}
						<tr class="hover:bg-muted/30 transition-colors {!msg.isRead ? 'font-medium' : ''} {expandedClassify === msg.id ? 'bg-muted/40' : ''}" onclick={() => { if (window.innerWidth < 768) expandedClassify = expandedClassify === msg.id ? null : msg.id; }}>
							<td onclick={(e) => e.stopPropagation()}><input type="checkbox" checked={isSelected(msg.id)} onchange={() => toggleSelect(msg.id)} class="kt-checkbox" aria-label="Pilih pesan" /></td>
							<td class="whitespace-nowrap">
								<div class="flex items-center gap-2">
									<div class="kt-avatar size-8">
										<div class="kt-avatar-image rounded-full bg-muted flex items-center justify-center text-xs font-semibold text-muted-foreground">
											{(msg.fromName || msg.fromPhone || '?').charAt(0).toUpperCase()}
										</div>
									</div>
									<div class="flex flex-col">
										<span class="text-sm text-foreground {!msg.isRead ? 'font-semibold' : 'font-normal'}">{msg.fromName || maskPhone(msg.fromPhone)}</span>
										{#if msg.source}
											<span class="text-2xs text-muted-foreground hidden md:inline">{msg.source.name}</span>
										{/if}
									</div>
								</div>
							</td>
							<td class="max-w-xs md:max-w-sm">
								{#if msg.mediaPath}
									<div class="flex items-center gap-2">
										{#if msg.mediaType?.startsWith('image/')}
											<button onclick={(e) => { e.stopPropagation(); lightboxMedia = `/media/${msg.mediaPath}`; }} class="shrink-0">
												<img src={`/media/${msg.mediaPath}`} alt="media" class="size-10 object-cover rounded-lg border border-border hover:opacity-80 transition-opacity cursor-pointer" loading="lazy" />
											</button>
										{:else if msg.mediaType?.startsWith('video/')}
											<div class="size-10 shrink-0 flex items-center justify-center rounded-lg bg-muted border border-border"><i class="ki-filled ki-video text-base text-muted-foreground"></i></div>
										{:else}
											<div class="size-10 shrink-0 flex items-center justify-center rounded-lg bg-muted border border-border"><i class="ki-filled ki-file text-base text-muted-foreground"></i></div>
										{/if}
										<p class="text-sm text-secondary-foreground line-clamp-2 md:truncate" title={msg.body}>{msg.body}</p>
									</div>
								{:else}
									<p class="text-sm text-secondary-foreground line-clamp-2 md:truncate" title={msg.body}>{msg.body}</p>
								{/if}
							</td>
							<td class="whitespace-nowrap text-sm text-muted-foreground hidden md:table-cell" title={fullTime(new Date(msg.timestamp))}>
								{relativeTime(new Date(msg.timestamp))}
							</td>
							<td class="hidden lg:table-cell">
								<div class="flex items-center gap-1 flex-wrap">
									{#if msg.messageType}
										<Badge variant={typeBadge(msg.messageType)} size="sm">{msg.messageType}</Badge>
										<Badge variant={prioBadge(msg.priority)} size="sm">{msg.priority}</Badge>
										{#if msg.confidence != null}
											<span class="text-2xs text-muted-foreground">{(msg.confidence * 100).toFixed(0)}%</span>
										{/if}
									{:else}
										<span class="text-2xs text-muted-foreground">-</span>
									{/if}
								</div>
							</td>
							<td class="text-end hidden md:table-cell">
								<div class="flex items-center justify-end gap-1">
									<button onclick={(e) => { e.stopPropagation(); toggleRead(msg); }} class="kt-btn kt-btn-icon kt-btn-sm" aria-label={msg.isRead ? 'Tandai belum dibaca' : 'Tandai sudah dibaca'}>
										<i class="ki-filled ki-{msg.isRead ? 'eye-slash' : 'eye'} text-sm text-muted-foreground"></i>
									</button>
									<button onclick={(e) => { e.stopPropagation(); archiveMsg(msg); }} class="kt-btn kt-btn-icon kt-btn-sm" aria-label="Arsipkan">
										<i class="ki-filled ki-archive-tick text-sm text-muted-foreground"></i>
									</button>
									<button onclick={(e) => { e.stopPropagation(); classifySingle(msg.id); }} disabled={classifying && expandedClassify === msg.id} class="kt-btn kt-btn-dim kt-btn-sm">
										{classifying && expandedClassify === msg.id ? '...' : 'Classify'}
									</button>
									{#if classificationCache[msg.id] && classificationCache[msg.id].is_support_related !== false}
										<button onclick={(e) => { e.stopPropagation(); createTicket(msg); }} disabled={creating} class="kt-btn kt-btn-mono kt-btn-sm">
											{creating ? '...' : 'Tiket'}
										</button>
									{/if}
								</div>
							</td>
							<td class="md:hidden text-end">
								<button onclick={(e) => { e.stopPropagation(); expandedClassify = expandedClassify === msg.id ? null : msg.id; }} class="kt-btn kt-btn-icon kt-btn-sm" aria-label="Detail">
									<i class="ki-filled ki-menu text-sm text-muted-foreground"></i>
								</button>
							</td>
						</tr>
						{#if expandedClassify === msg.id && classificationCache[msg.id]}
							{@const cls = classificationCache[msg.id]}
							<tr class="bg-muted/30">
								<td colspan="6" class="p-0">
									<div class="border-l-4 {prioBorder(cls.priority)} mx-3 mb-2 p-2.5 rounded-r-lg bg-card shadow-sm">
										<div class="flex items-center justify-between gap-2 mb-1.5">
											<div class="flex items-center gap-2 text-xs">
												<span class="font-medium text-mono">✅ Klasifikasi ({(cls.confidence * 100).toFixed(0)}%)</span>
{#if cls.is_support_related}<span class="text-success">support related</span>{:else}<span class="text-muted-foreground">non-support</span>{/if}
											</div>
											<button onclick={() => { expandedClassify = null; }} class="kt-btn kt-btn-icon kt-btn-sm" aria-label="Tutup">
												<i class="ki-filled ki-cross text-xs text-muted-foreground"></i>
											</button>
										</div>
										<div class="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-1 text-xs text-secondary-foreground mb-1">
											<div><span class="font-medium text-mono">Type:</span> {cls.message_type}</div>
											<div><span class="font-medium text-mono">Kategori:</span> {cls.category}</div>
											<div><span class="font-medium text-mono">Prioritas:</span> {cls.priority}</div>
											<div><span class="font-medium text-mono">Keyakinan:</span> {(cls.confidence * 100).toFixed(0)}%</div>
											<div class="md:col-span-4"><span class="font-medium text-mono">Ringkasan:</span> {cls.summary}</div>
										</div>
										{#if cls.evidence?.length}
											<div class="text-xs text-secondary-foreground mb-0.5"><span class="font-medium text-mono">Evidence:</span> {cls.evidence.join('; ')}</div>
										{/if}
										{#if cls.uncertainty?.length}
											<div class="text-xs text-warning"><span class="font-medium">Uncertainty:</span> {cls.uncertainty.join('; ')}</div>
										{/if}
									</div>
								</td>
							</tr>
						{/if}
					{/each}
				</tbody>
			</table>
		</div>
	{/if}

	<!-- Batch action bar -->
	{#if selected.size > 0}
		<div class="flex items-center gap-3 px-5 py-2.5 border-t border-border bg-primary/5">
			<span class="text-xs font-medium text-mono">{selected.size} dipilih</span>
			<button onclick={() => batchAction('classify')} class="kt-btn kt-btn-dim kt-btn-sm"><i class="ki-filled ki-abstract-26 text-sm"></i> Classify</button>
			<button onclick={() => batchAction('markRead')} class="kt-btn kt-btn-outline kt-btn-sm"><i class="ki-filled ki-eye text-sm"></i> Read</button>
			<button onclick={() => batchAction('markUnread')} class="kt-btn kt-btn-outline kt-btn-sm"><i class="ki-filled ki-eye-slash text-sm"></i> Unread</button>
			<button onclick={() => batchAction('archive')} class="kt-btn kt-btn-outline kt-btn-sm"><i class="ki-filled ki-archive-tick text-sm"></i> Arsip</button>
		</div>
	{/if}

	<!-- Pagination footer -->
	<div class="flex items-center justify-between gap-4 px-5 py-3 text-sm font-medium border-t border-border">
		<div class="flex items-center gap-2 text-secondary-foreground">
			Menampilkan <span class="font-medium text-mono">{view.data.length > 0 ? view.skip + 1 : 0}–{Math.min(view.skip + view.take, view.total)}</span>
			dari <span class="font-medium text-mono">{view.total}</span>
		</div>
		<div class="flex items-center gap-2">
			<button onclick={prevPage} disabled={view.skip <= 0}
				class="kt-btn kt-btn-sm px-2 py-1 rounded-lg text-xs font-medium disabled:opacity-30 disabled:pointer-events-none hover:bg-muted/30 transition-colors"
			>
				<i class="ki-filled ki-black-arrow-left"></i> Prev
			</button>
			<button onclick={nextPage} disabled={view.skip + view.take >= view.total}
				class="kt-btn kt-btn-sm px-2 py-1 rounded-lg text-xs font-medium disabled:opacity-30 disabled:pointer-events-none hover:bg-muted/30 transition-colors"
			>
				Next <i class="ki-filled ki-black-arrow-right"></i>
			</button>
		</div>
	</div>
</Card>

{#if lightboxMedia}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
		onclick={() => lightboxMedia = null}
		onkeydown={(e) => e.key === 'Escape' && (lightboxMedia = null)}
		role="presentation"
	>
		<div class="relative max-w-3xl max-h-[90vh]" onclick={(e) => e.stopPropagation()} role="presentation">
			<button class="absolute -top-3 -right-3 size-8 flex items-center justify-center rounded-full bg-card shadow-md text-muted-foreground hover:text-foreground transition-colors z-10"
				onclick={() => lightboxMedia = null} aria-label="Tutup"
			>
				<i class="ki-filled ki-cross text-sm"></i>
			</button>
			<img src={lightboxMedia} alt="Preview" class="max-w-full max-h-[85vh] rounded-xl shadow-2xl" />
		</div>
	</div>
{/if}


