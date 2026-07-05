<script lang="ts">
	import Card from '$lib/components/Card.svelte';
	import Badge from '$lib/components/Badge.svelte';

	let tickets = $state<any[]>([]);
	let settings = $state<any>(null);
	let loading = $state(true);

	async function loadData() {
		loading = true;
		const [ticketRes, settingsRes] = await Promise.all([
			fetch('/api/tickets?limit=100'),
			fetch('/api/settings'),
		]);
		if (ticketRes.ok) tickets = (await ticketRes.json()).data || [];
		if (settingsRes.ok) settings = (await settingsRes.json()).data;
		loading = false;
	}

	$effect(() => { loadData(); });

	let totalToday = $derived(
		tickets.filter((t: any) => {
			const d = new Date(t.createdAt);
			const now = new Date();
			return d.toDateString() === now.toDateString();
		}).length
	);

	let openTickets = $derived(tickets.filter((t: any) => !t.status?.isClosed).length);
	let criticalTickets = $derived(tickets.filter((t: any) => t.priority?.name === 'Critical').length);
	let resolvedTickets = $derived(tickets.filter((t: any) =>
		t.status?.name === 'Resolved' || t.status?.name === 'Closed'
	).length);

	let categoryCounts = $derived(() => {
		const counts: Record<string, number> = {};
		for (const t of tickets) {
			const name = t.category?.name || 'Lainnya';
			counts[name] = (counts[name] || 0) + 1;
		}
		return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
	});

	let kpis = $derived([
		{ label: 'Tiket Hari Ini', value: totalToday, icon: 'ki-calendar-tick', kt: 'primary' },
		{ label: 'Open', value: openTickets, icon: 'ki-abstract-41', kt: 'warning' },
		{ label: 'Critical', value: criticalTickets, icon: 'ki-abstract-42', kt: 'destructive' },
		{ label: 'Selesai', value: resolvedTickets, icon: 'ki-abstract-43', kt: 'success' },
	]);
</script>

{#if loading}
	<div class="kt-spinner py-20">
		<div class="flex flex-col items-center gap-3">
			<div class="kt-spinner-ring size-8"></div>
			<span class="text-sm text-muted-foreground">Memuat data...</span>
		</div>
	</div>
{:else}
	<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-7.5">
		{#each kpis as kpi}
			<div class="kt-card border border-border rounded-xl shadow-sm bg-card px-5 lg:px-7.5 py-5 lg:py-7.5">
				<div class="flex items-center justify-between">
					<div class="flex flex-col gap-0.5">
						<span class="text-2sm font-medium text-muted-foreground">{kpi.label}</span>
						<span class="text-3xl font-semibold text-mono">{kpi.value}</span>
					</div>
					<span class="kt-badge kt-badge-{kpi.kt} inline-flex items-center justify-center size-[46px] rounded-lg">
						<i class="ki-filled {kpi.icon} text-xl text-white"></i>
					</span>
				</div>
			</div>
		{/each}
	</div>

	<div class="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-7.5">
		<Card title="Masalah Terbanyak" subtitle="5 kategori tiket tertinggi">
			<div class="flex flex-col gap-px">
				{#each categoryCounts() as [cat, count], i}
					<div class="flex items-center justify-between py-3 px-5 lg:px-7.5 not-last:border-b border-border">
						<div class="flex items-center gap-2.5">
							<span class="flex items-center justify-center size-6 rounded-lg bg-muted text-2xs font-semibold text-muted-foreground">{i + 1}</span>
							<span class="text-sm text-foreground">{cat}</span>
						</div>
						<Badge variant="primary"><span class="font-semibold">{count}</span></Badge>
					</div>
				{/each}
			</div>
		</Card>

		<Card title="Aktivitas Terbaru" subtitle="Tiket terakhir masuk">
			<div class="flex flex-col gap-px">
				{#each tickets.slice(0, 5) as ticket}
					<a href="/tickets/{ticket.id}" class="flex items-center justify-between py-3 px-5 lg:px-7.5 not-last:border-b border-border hover:bg-muted/30 transition-colors">
						<div class="flex flex-col gap-0.5 min-w-0">
							<div class="flex items-center gap-2">
								<span class="text-sm font-medium text-primary">{ticket.ticketNumber}</span>
								{#if ticket.priority}
									<Badge variant={ticket.priority.name === 'Critical' ? 'destructive' : ticket.priority.name === 'High' ? 'warning' : 'primary'} size="sm">{ticket.priority.name}</Badge>
								{/if}
							</div>
							<span class="text-2sm text-muted-foreground truncate">{ticket.title}</span>
						</div>
						<i class="ki-filled ki-black-right text-muted-foreground text-sm shrink-0"></i>
					</a>
				{/each}
			</div>
		</Card>
	</div>
{/if}
