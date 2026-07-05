<script lang="ts">
	import Badge from '$lib/components/Badge.svelte';

	const TAKE = 50;

	let ls = $state<{ data: any[]; total: number; skip: number; take: number; q: string; entity: string; action: string; loading: boolean }>({ data: [], total: 0, skip: 0, take: TAKE, q: '', entity: '', action: '', loading: true });

	let autoRefresh = $state(false);
	let refreshTimer: ReturnType<typeof setInterval> | undefined = $state();
	let searchTimer: ReturnType<typeof setTimeout> | undefined;

	async function load() {
		ls.loading = true;
		try {
			const params = new URLSearchParams({ skip: String(ls.skip), take: String(ls.take) });
			if (ls.q) params.set('q', ls.q);
			if (ls.entity) params.set('entity', ls.entity);
			if (ls.action) params.set('action', ls.action);
			const res = await fetch(`/api/audit?${params}`);
			if (res.ok) {
				const d = await res.json();
				ls.data = d.data;
				ls.total = d.total;
			}
		} catch {}
		ls.loading = false;
	}

	$effect(() => { load(); });

	$effect(() => {
		if (autoRefresh) {
			refreshTimer = setInterval(load, 30000);
			return () => clearInterval(refreshTimer);
		} else {
			clearInterval(refreshTimer);
			refreshTimer = undefined;
		}
	});

	function refresh() { load(); }

	function onSearch(e: Event) {
		ls.q = (e.target as HTMLInputElement).value;
		ls.skip = 0;
		clearTimeout(searchTimer);
		searchTimer = setTimeout(load, 300);
	}

	function prevPage() {
		if (ls.skip > 0) { ls.skip = Math.max(0, ls.skip - ls.take); load(); }
	}
	function nextPage() {
		if (ls.skip + ls.take < ls.total) { ls.skip += ls.take; load(); }
	}
	function onFilter() {
		ls.skip = 0;
		load();
	}

	function actionBadge(action: string) {
		if (action.startsWith('ticket.status')) return 'primary';
		if (action.startsWith('ticket.close')) return 'destructive';
		if (action.startsWith('ticket.note')) return 'warning';
		if (action.startsWith('ticket.create')) return 'success';
		if (action.startsWith('message')) return 'info';
		return 'outline';
	}

	function detailLabel(raw: string | null): string {
		if (!raw) return '-';
		try {
			const obj = JSON.parse(raw);
			if (obj.ticketNumber && obj.title) return `${obj.ticketNumber} — ${obj.title}`;
			if (obj.status?.from && obj.status?.to) return `${statusLabel(obj.status.from)} → ${statusLabel(obj.status.to)}`;
			if (obj.body && obj.summary) return `${obj.summary} (${Math.round((obj.confidence ?? 0) * 100)}%)`;
			if (obj.body) return obj.body.slice(0, 80);
			if (obj.note) return obj.note.slice(0, 80);
			if (obj.reason) return obj.reason.slice(0, 80);
			if (obj.summary) return obj.summary.slice(0, 80);
			if (obj.ticketNumber) return obj.ticketNumber;
			const v = Object.values(obj)[0];
			if (typeof v === 'string') return v.slice(0, 80);
			if (typeof v === 'object' && v !== null) {
				const sub = Object.values(v)[0];
				if (typeof sub === 'string') return sub.slice(0, 80);
			}
			return JSON.stringify(obj).slice(0, 120);
		} catch {
			return (raw ?? '-').slice(0, 120);
		}
	}

	function statusLabel(id: string): string {
		const map: Record<string, string> = {
			'open': 'Open', 'in_progress': 'In Progress', 'resolved': 'Resolved',
			'closed': 'Closed', 'waiting': 'Waiting', 'reopened': 'Reopened',
		};
		return map[id.toLowerCase()] || id;
	}
</script>

<div class="kt-card kt-card-grid border border-border rounded-xl shadow-sm bg-card">
	<div class="kt-card-header">
		<div class="flex flex-col gap-0.5">
			<div class="kt-card-title text-lg font-semibold text-mono">Audit Log</div>
			<div class="kt-card-subtitle text-2sm text-muted-foreground">Riwayat perubahan dan aktivitas sistem</div>
		</div>
		<div class="flex items-center gap-3 flex-wrap">
			<select
				onchange={onFilter} bind:value={ls.entity}
				class="kt-filter-select"
			>
				<option value="">Semua Entity</option>
				<option value="ticket">Ticket</option>
				<option value="message">Message</option>
				<option value="report">Report</option>
				<option value="user">User</option>
			</select>
			<select
				onchange={onFilter} bind:value={ls.action}
				class="kt-filter-select"
			>
				<option value="">Semua Action</option>
				<option value="ticket.create">ticket.create</option>
				<option value="ticket.status_change">ticket.status_change</option>
				<option value="ticket.close">ticket.close</option>
				<option value="ticket.note_added">ticket.note_added</option>
				<option value="message.classify">message.classify</option>
			</select>
			<input
				type="search" placeholder="Cari..." oninput={onSearch}
				class="kt-filter-input w-32 lg:w-40"
			/>
			<label class="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none shrink-0">
				<input type="checkbox" bind:checked={autoRefresh} class="kt-checkbox" />
				Auto
			</label>
			<button onclick={refresh} class="kt-btn kt-btn-outline kt-btn-sm" aria-label="Refresh">
				<i class="ki-filled ki-arrows-circle"></i>
			</button>
		</div>
	</div>
	{#if ls.loading}
		<div class="kt-card-body">
			<div class="flex items-center justify-center py-10"><div class="kt-spinner-ring size-6"></div></div>
		</div>
	{:else if ls.data.length === 0}
		<div class="kt-card-body">
			<div class="kt-empty">
				<i class="ki-filled ki-security-user kt-empty-icon text-3xl"></i>
				<p class="kt-empty-text">Belum ada log</p>
			</div>
		</div>
	{:else}
		<div class="kt-card-table">
			<div class="kt-scrollable-x-auto">
				<table class="kt-table kt-table-border w-full">
					<thead>
						<tr>
							<th class="w-[140px]"><span class="kt-table-col"><span class="kt-table-col-label">Waktu</span></span></th>
							<th class="w-[100px]"><span class="kt-table-col"><span class="kt-table-col-label">User</span></span></th>
							<th class="w-[110px]"><span class="kt-table-col"><span class="kt-table-col-label">Action</span></span></th>
							<th class="w-[120px]"><span class="kt-table-col"><span class="kt-table-col-label">Entity</span></span></th>
							<th><span class="kt-table-col"><span class="kt-table-col-label">Detail</span></span></th>
						</tr>
					</thead>
					<tbody>
						{#each ls.data as log}
							<tr class="hover:bg-muted/30 transition-colors">
								<td class="text-sm text-foreground whitespace-nowrap">{new Date(log.createdAt).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}</td>
								<td class="text-sm text-foreground">{log.user?.name || '-'}</td>
								<td><Badge variant={actionBadge(log.action)} size="sm">{log.action}</Badge></td>
								<td class="text-sm text-foreground">{log.entity} <span class="text-xs text-muted-foreground">#{log.entityId?.substring(0, 7) || ''}</span></td>
								<td class="text-sm text-muted-foreground max-w-xs truncate" title={log.detail || '-'}>{detailLabel(log.detail)}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	{/if}
	<div class="kt-card-footer flex items-center justify-between gap-4 px-5 py-3 text-sm text-secondary-foreground font-medium border-t border-border">
		<div class="flex items-center gap-2">
			Menampilkan <span class="font-medium text-mono">{ls.data.length > 0 ? ls.skip + 1 : 0}–{Math.min(ls.skip + ls.take, ls.total)}</span>
			dari <span class="font-medium text-mono">{ls.total}</span> entri
		</div>
		<div class="flex items-center gap-2">
			<button onclick={prevPage} disabled={ls.skip <= 0}
				class="kt-btn kt-btn-sm px-2 py-1 rounded-lg text-xs font-medium disabled:opacity-30 disabled:pointer-events-none hover:bg-muted/30 transition-colors"
			>
				<i class="ki-filled ki-black-arrow-left"></i> Prev
			</button>
			<button onclick={nextPage} disabled={ls.skip + ls.take >= ls.total}
				class="kt-btn kt-btn-sm px-2 py-1 rounded-lg text-xs font-medium disabled:opacity-30 disabled:pointer-events-none hover:bg-muted/30 transition-colors"
			>
				Next <i class="ki-filled ki-black-arrow-right"></i>
			</button>
		</div>
	</div>
</div>


