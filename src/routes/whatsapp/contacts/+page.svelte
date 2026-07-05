<script lang="ts">
	import Card from '$lib/components/Card.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import { showToast } from '$lib/stores/toast';
	import { maskPhone } from '$lib/utils/mask';

	let policies = $state<any[]>([]);
	let loading = $state(true);
	let search = $state('');

	let filtered = $derived.by(() => {
		if (!search) return policies;
		const q = search.toLowerCase();
		return policies.filter((p) =>
			p.phone?.toLowerCase().includes(q) ||
			p.displayName?.toLowerCase().includes(q) ||
			p.chatId?.toLowerCase().includes(q)
		);
	});

	async function load() {
		loading = true;
		try {
			const res = await fetch('/api/whatsapp/contacts/policy');
			if (!res.ok) throw new Error((await res.json()).error || 'Gagal load');
			const d = await res.json();
			policies = d.data || [];
		} catch (e) {
			showToast('error', (e as Error).message);
		}
		loading = false;
	}

	function formatTime(d: string | null) {
		if (!d) return '-';
		return new Date(d).toLocaleString('id-ID');
	}

	$effect(() => { load(); });
</script>

<Card title="Kebijakan Kontak WhatsApp" subtitle="Status opt-in, opt-out, block, dan riwayat kontak untuk safety outbound" bodyClass="p-0">
	{#snippet headerActions()}
		<div class="flex items-center gap-2">
			<button onclick={load} disabled={loading} class="kt-btn kt-btn-outline kt-btn-sm">
				<i class="ki-filled ki-arrows-circle {loading ? 'animate-spin' : ''}"></i>
				{loading ? 'Memuat...' : 'Refresh'}
			</button>
		</div>
	{/snippet}

	<div class="p-3 border-b border-border shrink-0">
		<input type="search" bind:value={search} placeholder="Cari nomor, nama, atau chatId..."
			class="wt-filter-input w-full max-w-sm"
		/>
	</div>

	<div class="overflow-x-auto">
		{#if loading}
			<div class="flex items-center justify-center py-10"><div class="wt-spinner-ring size-6"></div></div>
		{:else if filtered.length === 0}
			<div class="wt-empty py-10">
				<i class="ki-filled ki-shield-slash wt-empty-icon text-3xl"></i>
				<p class="wt-empty-text">{search ? 'Tidak cocok dengan pencarian' : 'Belum ada data kebijakan kontak'}</p>
				<p class="wt-empty-sub">Kebijakan kontak dibuat otomatis saat ada pesan masuk atau keluar</p>
			</div>
		{:else}
			<table class="wt-table w-full">
				<thead>
					<tr>
						<th>Nomor</th>
						<th>Nama</th>
						<th>Status</th>
						<th>Inbound</th>
						<th>Opt-in</th>
						<th>Opt-out</th>
						<th>Block</th>
						<th>Alasan Opt-out</th>
						<th>Terakhir Inbound</th>
						<th>Terakhir Terkirim</th>
					</tr>
				</thead>
				<tbody>
					{#each filtered as p}
						<tr class="wt-table-row">
							<td class="font-mono text-xs">{maskPhone(p.phone)}</td>
							<td class="text-xs text-secondary-foreground">{p.displayName || '-'}</td>
							<td>
								{#if p.isBlocked}
									<Badge size="sm" variant="destructive">Blocked</Badge>
								{:else if p.isOptedOut}
									<Badge size="sm" variant="warning">Opt-out</Badge>
								{:else if p.isOptedIn}
									<Badge size="sm" variant="success">Opt-in</Badge>
								{:else}
									<Badge size="sm" variant="outline">Unknown</Badge>
								{/if}
							</td>
							<td class="text-center">
								{#if p.hasInboundHistory}
									<i class="ki-filled ki-check-circle text-success text-sm"></i>
								{:else}
									<i class="ki-filled ki-cross-circle text-muted-foreground text-sm"></i>
								{/if}
							</td>
							<td class="text-center">
								{#if p.isOptedIn}
									<i class="ki-filled ki-check-circle text-success text-sm"></i>
								{:else}
									<i class="ki-filled ki-minus-circle text-muted-foreground text-sm"></i>
								{/if}
							</td>
							<td class="text-center">
								{#if p.isOptedOut}
									<i class="ki-filled ki-check-circle text-warning text-sm"></i>
								{:else}
									<i class="ki-filled ki-minus-circle text-muted-foreground text-sm"></i>
								{/if}
							</td>
							<td class="text-center">
								{#if p.isBlocked}
									<i class="ki-filled ki-check-circle text-destructive text-sm"></i>
								{:else}
									<i class="ki-filled ki-minus-circle text-muted-foreground text-sm"></i>
								{/if}
							</td>
							<td class="text-xs text-muted-foreground">{p.optedOutReason || '-'}</td>
							<td class="text-xs text-muted-foreground whitespace-nowrap">{formatTime(p.lastInboundAt)}</td>
							<td class="text-xs text-muted-foreground whitespace-nowrap">{formatTime(p.lastSentAt)}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
	</div>
</Card>
