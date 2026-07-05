<script lang="ts">
	import Card from '$lib/components/Card.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import Button from '$lib/components/Button.svelte';
	import TicketFormDialog from '$lib/components/TicketFormDialog.svelte';
	import { showToast } from '$lib/stores/toast';
	import { maskPhone } from '$lib/utils/mask';

	let messages = $state<any[]>([]);
	let loading = $state(true);
	let settings = $state<any>({ sources: [], categories: [], priorities: [], pics: [] });

	let filterSource = $state('');
	let filterDate = $state('today');
	let filterStart = $state('');
	let filterEnd = $state('');
	let filterType = $state('all');
	let autoRefresh = $state(true);
	let expandedGroups = $state<Record<string, boolean>>({});
	let showTicketDialog = $state(false);
	let ticketPrefill = $state<any>(null);

	function todayStr() {
		const d = new Date();
		return d.toISOString().substring(0, 10);
	}

	function buildQuery(): string {
		const p = new URLSearchParams();
		p.set('limit', '200');
		if (filterSource) p.set('sourceId', filterSource);
		if (filterType === 'support') p.set('support', 'true');
		if (filterDate === 'today') {
			p.set('startDate', todayStr() + 'T00:00:00.000Z');
		} else if (filterDate === '7days') {
			const d = new Date();
			d.setDate(d.getDate() - 7);
			p.set('startDate', d.toISOString());
		} else if (filterDate === '30days') {
			const d = new Date();
			d.setDate(d.getDate() - 30);
			p.set('startDate', d.toISOString());
		} else if (filterDate === 'custom') {
			if (filterStart) p.set('startDate', filterStart + 'T00:00:00.000Z');
			if (filterEnd) p.set('endDate', filterEnd + 'T23:59:59.999Z');
		}
		return p.toString();
	}

	async function loadMessages() {
		try {
			const res = await fetch(`/api/messages?${buildQuery()}`);
			if (res.ok) {
				const all = (await res.json()).data || [];
				messages = all;
			}
		} catch {}
	}

	async function loadSettings() {
		try {
			const res = await fetch('/api/settings');
			if (res.ok) settings = (await res.json()).data || settings;
		} catch {}
	}

	$effect(() => {
		loadSettings();
		loadMessages().finally(() => loading = false);
	});

	$effect(() => {
		if (!autoRefresh) return;
		const id = setInterval(() => {
			loadMessages();
		}, 5000);
		return () => clearInterval(id);
	});

	function applyDatePreset(preset: string) {
		filterDate = preset;
		if (preset !== 'custom') { filterStart = ''; filterEnd = ''; }
		loading = true;
		loadMessages().finally(() => loading = false);
	}

	function applyFilter() {
		loading = true;
		loadMessages().finally(() => loading = false);
	}

	interface MessageGroup {
		fromPhone: string;
		fromName: string | null;
		source: any;
		messages: any[];
	}

	function groupMessages(msgs: any[]): MessageGroup[] {
		const sorted = [...msgs].sort((a, b) =>
			new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
		);
		const groups: MessageGroup[] = [];
		for (const msg of sorted) {
			const prev = groups[groups.length - 1];
			if (
				prev &&
				prev.fromPhone === msg.fromPhone &&
				prev.source?.id === msg.source?.id &&
				Math.abs(
					new Date(prev.messages[0].timestamp).getTime() -
					new Date(msg.timestamp).getTime()
				) < 300000
			) {
				prev.messages.push(msg);
			} else {
				groups.push({
					fromPhone: msg.fromPhone,
					fromName: msg.fromName,
					source: msg.source,
					messages: [msg],
				});
			}
		}
		return groups;
	}

	let groups = $derived(groupMessages(messages));

	function dateLabel(dateStr: string): string {
		const d = new Date(dateStr);
		const now = new Date();
		const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
		const yesterday = new Date(today);
		yesterday.setDate(yesterday.getDate() - 1);
		const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
		if (target.getTime() === today.getTime()) return 'Hari Ini';
		if (target.getTime() === yesterday.getTime()) return 'Kemarin';
		return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
	}

	function groupDate(g: MessageGroup): string {
		return g.messages[0]?.timestamp || '';
	}

	let daySections = $derived(() => {
		const map = new Map<string, MessageGroup[]>();
		for (const g of groups) {
			const key = dateLabel(groupDate(g));
			const arr = map.get(key) || [];
			arr.push(g);
			map.set(key, arr);
		}
		return [...map.entries()];
	});

	function timeStr(d: any): string {
		return new Date(d).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' });
	}

	function groupTimeRange(g: MessageGroup): string {
		const times = g.messages.map(m => timeStr(m.timestamp));
		if (times.length === 1) return times[0];
		return `${times[times.length - 1]} - ${times[0]}`;
	}

	let classifying = $state<string | null>(null);
	let classifications = $state<Map<string, any>>(new Map());

	async function classifyGroup(groupKey: string) {
		classifying = groupKey;
		const g = groups.find((_, i) => `g_${i}` === groupKey);
		if (!g) { classifying = null; return; }
		const combinedBody = g.messages.map(m => m.body).join('\n');
		try {
			const res = await fetch('/api/messages/classify', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					body: combinedBody,
					fromName: g.fromName || g.fromPhone,
					previousMessages: [],
				}),
			});
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const data = (await res.json()).data;
			classifications = new Map(classifications.set(groupKey, data));
			await loadMessages();
		} catch (e) {
			showToast('error', 'Gagal klasifikasi grup: ' + (e as Error).message);
		}
		classifying = null;
	}

	function typeBadge(type: string) {
		const m: Record<string, string> = {
			new_issue: 'destructive', update: 'primary', confirmation: 'success',
			info_request: 'warning', escalation: 'info', noise: 'outline', general_chat: 'outline',
		};
		return m[type] || 'outline';
	}

	function prioBadge(p: string) {
		const m: Record<string, string> = { Critical: 'destructive', High: 'warning', Medium: 'primary', Low: 'outline' };
		return m[p] || 'outline';
	}

	function openTicketDialog(groupKey: string) {
		const cls = classifications.get(groupKey);
		if (!cls) return;
		const g = groups.find((_, i) => `g_${i}` === groupKey);
		if (!g) return;
		ticketPrefill = {
			title: cls.summary?.substring(0, 100) || g.messages[0]?.body?.substring(0, 100),
			summary: cls.summary || g.messages.map((m: any) => m.body).join('\n'),
			reporterName: g.fromName || g.fromPhone || 'Unknown',
			reporterPhone: g.fromPhone,
			categoryName: cls.category,
			priorityName: cls.priority,
			sourceId: g.source?.id,
			messageIds: g.messages.map((m: any) => m.id),
		};
		showTicketDialog = true;
	}

	function initial(name: string | null | undefined, phone: string): string {
		return (name || phone || '?').charAt(0).toUpperCase();
	}
</script>

<div class="flex flex-col gap-5 lg:gap-7.5">
	<Card bodyClass="p-4 lg:p-5">
		<div class="flex flex-col gap-3">
			<div class="flex items-center justify-between gap-2">
			<div class="wt-segmented">
				<button
					class="wt-segmented-item {filterDate === 'today' ? 'active' : ''}"
					onclick={() => applyDatePreset('today')}
				>Hari Ini</button>
				<button
					class="wt-segmented-item {filterDate === '7days' ? 'active' : ''}"
					onclick={() => applyDatePreset('7days')}
				>7 Hari</button>
				<button
					class="wt-segmented-item {filterDate === '30days' ? 'active' : ''}"
					onclick={() => applyDatePreset('30days')}
				>30 Hari</button>
				<button
					class="wt-segmented-item {filterDate === 'custom' ? 'active' : ''}"
					onclick={() => applyDatePreset('custom')}
				>Custom</button>
			</div>
				<button
					class="kt-btn kt-btn-sm kt-btn-icon {autoRefresh ? 'kt-btn-primary' : 'kt-btn-dim'}"
					title={autoRefresh ? 'Auto-refresh ON (5 detik)' : 'Auto-refresh OFF'}
					onclick={() => autoRefresh = !autoRefresh}
				>
					<i class="ki-filled ki-arrows-circle {autoRefresh ? 'animate-spin' : ''}"></i>
				</button>
			</div>
			<div class="border-t border-border/50"></div>
			<div class="flex flex-wrap items-center gap-x-4 gap-y-2">
				<div class="flex items-center gap-1.5">
					<i class="ki-filled ki-folder text-sm text-muted-foreground/70 shrink-0"></i>
					<select class="wt-filter-select" bind:value={filterSource} onchange={applyFilter}>
						<option value="">Semua Sumber</option>
						{#each settings.sources || [] as s}
							<option value={s.id}>{s.name}</option>
						{/each}
					</select>
				</div>
				<div class="flex items-center gap-1.5">
					<i class="ki-filled ki-category text-sm text-muted-foreground/70 shrink-0"></i>
					<select class="wt-filter-select" bind:value={filterType} onchange={applyFilter}>
						<option value="all">Semua Pesan</option>
						<option value="support">Support Related</option>
					</select>
				</div>
				{#if filterDate === 'custom'}
					<div class="hidden md:block w-px h-5 bg-border/60 shrink-0"></div>
					<div class="flex items-center gap-2">
						<i class="ki-filled ki-calendar text-sm text-muted-foreground/70 shrink-0 hidden md:block"></i>
						<input type="date"
							class="wt-filter-input w-[145px]"
							bind:value={filterStart} onchange={applyFilter}
						/>
						<span class="text-xs text-muted-foreground/60">—</span>
						<input type="date"
							class="wt-filter-input w-[145px]"
							bind:value={filterEnd} onchange={applyFilter}
						/>
					</div>
				{/if}
			</div>
		</div>
	</Card>

	{#if loading}
		<div class="flex items-center justify-center py-16">
			<div class="flex flex-col items-center gap-3">
				<div class="wt-spinner-ring size-8"></div>
				<span class="text-sm text-muted-foreground">Memuat timeline...</span>
			</div>
		</div>
	{:else if daySections().length === 0}
		<div class="wt-empty">
			<i class="ki-filled ki-messages wt-empty-icon"></i>
			<p class="wt-empty-text">Belum ada pesan</p>
			<p class="wt-empty-sub">Import pesan atau jalankan WhatsApp worker</p>
		</div>
	{:else}
		<div class="flex flex-col gap-5 lg:gap-7.5">
			{#each daySections() as [label, sectionGroups]}
				<div>
					<div class="flex items-center gap-3 py-3">
						<span class="h-px flex-1 bg-border"></span>
						<span class="text-2xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
						<span class="h-px flex-1 bg-border"></span>
					</div>
					<div class="flex flex-col gap-3">
						{#each sectionGroups as g, gi}
							{@const gk = `g_${gi}`}
							{@const cls = classifications.get(gk)}
							{@const expanded = expandedGroups[gk] ?? false}
							{@const visible = expanded ? g.messages : g.messages.slice(0, 3)}
							<div class="kt-card border border-border rounded-xl shadow-sm bg-card">
								<div class="flex items-center gap-2.5 px-5 pt-4 pb-1.5">
									<div class="kt-avatar size-9 rounded-full bg-muted flex items-center justify-center text-xs font-semibold text-muted-foreground shrink-0">
										{initial(g.fromName, g.fromPhone)}
									</div>
									<div class="flex flex-col min-w-0">
										<span class="text-sm font-medium text-foreground truncate">{g.fromName || maskPhone(g.fromPhone)}</span>
										{#if g.source}
											<span class="text-2xs text-muted-foreground">{g.source.name}</span>
										{/if}
									</div>
									<span class="ms-auto text-2xs text-muted-foreground shrink-0">{groupTimeRange(g)}</span>
								</div>
								<div class="px-5 py-1.5">
									{#each visible as msg, mi}
										<div class="flex items-start gap-2 py-0.5">
											<span class="text-muted-foreground/40 mt-0.5 shrink-0 text-xs">◀</span>
											<p class="text-sm text-foreground flex-1 min-w-0">{msg.body}</p>
											<span class="text-2xs text-muted-foreground shrink-0 whitespace-nowrap">{timeStr(msg.timestamp)}</span>
										</div>
									{/each}
									{#if g.messages.length > 3}
										<button class="text-2xs text-primary hover:text-primary/80 transition-colors mt-1"
											aria-label={expanded ? 'Sembunyikan' : `Tampilkan ${g.messages.length - 3} pesan lagi`}
											onclick={() => { expandedGroups = { ...expandedGroups, [gk]: !expanded }; }}>
											{expanded ? 'Sembunyikan' : `+${g.messages.length - 3} pesan lagi`}
										</button>
									{/if}
								</div>
								{#if cls || g.messages.some((m: any) => m.messageType)}
									{@const best = cls || g.messages.find((m: any) => m.messageType) || {}}
									<div class="flex items-center justify-between px-5 pb-4 pt-2.5 border-t border-border">
										<div class="flex items-center gap-1.5 flex-wrap">
											{#if best.messageType}
												<Badge variant={typeBadge(best.messageType)} size="sm">{best.messageType}</Badge>
											{/if}
											{#if best.priority}
												<Badge variant={prioBadge(best.priority)} size="sm">{best.priority}</Badge>
											{/if}
											{#if best.confidence != null}
												<span class="text-2xs text-muted-foreground">{(best.confidence * 100).toFixed(0)}%</span>
											{/if}
										</div>
										<div class="flex items-center gap-1.5">
											<Button variant="dim" size="sm" disabled={classifying === gk} onclick={() => classifyGroup(gk)}>
												<i class="ki-filled ki-abstract-26 text-sm"></i>
												{classifying === gk ? '...' : 'Classify'}
											</Button>
											{#if cls && cls.is_support_related !== false}
												<Button variant="mono" size="sm" onclick={() => openTicketDialog(gk)}>
													<i class="ki-filled ki-badge text-sm"></i>
													Buat Tiket
												</Button>
											{/if}
										</div>
									</div>
								{:else}
									<div class="flex items-center justify-end px-5 pb-4 pt-2.5 border-t border-border">
										<Button variant="dim" size="sm" disabled={classifying === gk} onclick={() => classifyGroup(gk)}>
											<i class="ki-filled ki-abstract-26 text-sm"></i>
											{classifying === gk ? '...' : 'Classify'}
										</Button>
									</div>
								{/if}
							</div>
						{/each}
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<TicketFormDialog
	show={showTicketDialog}
	onClose={() => { showTicketDialog = false; ticketPrefill = null; }}
	prefill={ticketPrefill}
/>