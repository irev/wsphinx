<script lang="ts">
	import Card from '$lib/components/Card.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import { showToast } from '$lib/stores/toast';

	let tab = $state<'pending' | 'sent' | 'failed' | 'all'>('pending');
	let items = $state<any[]>([]);
	let stats = $state<{ pending: number; sent: number; failed: number; blocked: number } | null>(null);
	let loading = $state(true);
	let retrying = $state<Set<string>>(new Set());

	async function load() {
		loading = true;
		try {
			const res = await fetch(`/api/whatsapp/outbox?status=${tab}&limit=100`);
			if (!res.ok) throw new Error((await res.json()).error || 'Gagal load');
			const d = await res.json();
			items = d.data.items || [];
			stats = d.data.stats || null;
		} catch (e) {
			showToast('error', (e as Error).message);
		}
		loading = false;
	}

	async function retryItem(id: string) {
		retrying.add(id);
		try {
			const res = await fetch('/api/whatsapp/outbox/retry', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ id }),
			});
			if (!res.ok) throw new Error('Gagal retry');
			const item = items.find((i) => i.id === id);
			if (item) item.status = 'pending';
			showToast('success', 'Retry dikirim');
		} catch (e) {
			showToast('error', (e as Error).message);
		}
		retrying.delete(id);
	}

	function statusVariant(s: string) {
		if (s === 'sent') return 'success';
		if (s === 'failed') return 'destructive';
		if (s === 'blocked') return 'warning';
		return 'outline';
	}

	function formatTime(d: string) {
		return new Date(d).toLocaleString('id-ID');
	}

	function truncate(s: string, n: number) {
		return s.length > n ? s.slice(0, n) + '...' : s;
	}

	$effect(() => { load(); });
</script>

<Card title="Antrian Outbound WhatsApp" subtitle="Monitoring pesan keluar — pending, terkirim, gagal, diblokir" bodyClass="p-0">
	{#snippet headerActions()}
		<div class="flex items-center gap-2">
			<button onclick={load} disabled={loading} class="kt-btn kt-btn-outline kt-btn-sm">
				<i class="ki-filled ki-arrows-circle {loading ? 'animate-spin' : ''}"></i>
				{loading ? 'Memuat...' : 'Refresh'}
			</button>
		</div>
	{/snippet}

	<div class="p-3 border-b border-border shrink-0">
		<div class="flex items-center justify-between">
			<div class="wt-segmented">
				<button onclick={() => { tab = 'pending'; load(); }}
					class={'wt-segmented-item ' + (tab === 'pending' ? 'active' : '')}>
					Pending {stats ? `(${stats.pending})` : ''}
				</button>
				<button onclick={() => { tab = 'sent'; load(); }}
					class={'wt-segmented-item ' + (tab === 'sent' ? 'active' : '')}>
					Terkirim {stats ? `(${stats.sent})` : ''}
				</button>
				<button onclick={() => { tab = 'failed'; load(); }}
					class={'wt-segmented-item ' + (tab === 'failed' ? 'active' : '')}>
					Gagal {stats ? `(${stats.failed})` : ''}
				</button>
				<button onclick={() => { tab = 'all'; load(); }}
					class={'wt-segmented-item ' + (tab === 'all' ? 'active' : '')}>
					Semua
				</button>
			</div>
		</div>
	</div>

	<div class="overflow-x-auto">
		{#if loading}
			<div class="flex items-center justify-center py-10"><div class="wt-spinner-ring size-6"></div></div>
		{:else if items.length === 0}
			<div class="wt-empty py-10">
				<i class="ki-filled ki-send wt-empty-icon text-3xl"></i>
				<p class="wt-empty-text">Tidak ada pesan {tab}</p>
			</div>
		{:else}
			<table class="wt-table w-full">
				<thead>
					<tr>
						<th>Status</th>
						<th>Chat ID</th>
						<th>Pesan</th>
						<th>Source</th>
						<th>Retry</th>
						<th>Error</th>
						<th>Dibuat</th>
						<th>Terkirim</th>
						<th>Aksi</th>
					</tr>
				</thead>
				<tbody>
					{#each items as item}
						<tr class="wt-table-row">
							<td><Badge size="sm" variant={statusVariant(item.status)}>{item.status}</Badge></td>
							<td class="font-mono text-xs max-w-[120px] truncate" title={item.chatId}>{item.chatId}</td>
							<td class="max-w-[200px]" title={item.message}>
								<span class="text-xs text-secondary-foreground">{truncate(item.message, 60)}</span>
							</td>
							<td><Badge size="sm" variant="outline">{item.source || '-'}</Badge></td>
							<td class="text-xs text-muted-foreground">{item.retryCount}/{item.maxRetries}</td>
							<td class="max-w-[150px]">
								{#if item.errorMessage}
									<span class="text-xs text-destructive truncate block" title={item.errorMessage}>{truncate(item.errorMessage, 40)}</span>
								{:else}
									<span class="text-xs text-muted-foreground">-</span>
								{/if}
							</td>
							<td class="text-xs text-muted-foreground whitespace-nowrap">{formatTime(item.createdAt)}</td>
							<td class="text-xs text-muted-foreground whitespace-nowrap">{item.sentAt ? formatTime(item.sentAt) : '-'}</td>
							<td>
								{#if item.status === 'failed'}
									<button onclick={() => retryItem(item.id)} disabled={retrying.has(item.id)}
										class="kt-btn kt-btn-dim kt-btn-xs"
									>
										{retrying.has(item.id) ? '...' : 'Retry'}
									</button>
								{/if}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
	</div>
</Card>
