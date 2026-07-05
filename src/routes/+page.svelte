<script lang="ts">
	import Card from '$lib/components/Card.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import { waStatus } from '$lib/stores/wa-status.svelte';

	let tickets = $state<any[]>([]);
	let settings = $state<any>(null);
	let stats = $state<any>(null);
	let loading = $state(true);
	let waQrImage = $state<string | null>(null);
	let waQrError = $state(false);

	async function loadData() {
		loading = true;
		const [ticketRes, settingsRes, statsRes] = await Promise.all([
			fetch('/api/tickets?limit=100'),
			fetch('/api/settings'),
			fetch('/api/whatsapp/stats'),
		]);
		if (ticketRes.ok) tickets = (await ticketRes.json()).data || [];
		if (settingsRes.ok) settings = (await settingsRes.json()).data;
		if (statsRes.ok) stats = (await statsRes.json()).data;
		loading = false;
	}

	async function fetchWaQr() {
		waQrError = false;
		try {
			const res = await fetch('/api/whatsapp/qr-image');
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

	async function startWorker() {
		try {
			const res = await fetch('/api/whatsapp/worker/start', { method: 'POST' });
			if (res.ok) {
				fetchWaQr();
			}
		} catch { /* ignore */ }
	}

	$effect(() => { loadData(); });
	$effect(() => { if (waStatus.status === 'scanning_qr') fetchWaQr(); });

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

	let categoryCounts = $derived.by(() => {
		const counts: Record<string, number> = {};
		for (const t of tickets) {
			const name = t.category?.name || 'Lainnya';
			counts[name] = (counts[name] || 0) + 1;
		}
		return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
	});

	let isFirstTime = $derived(tickets.length === 0);

	let kpis = $derived([
		{ label: 'Tiket Hari Ini', value: totalToday, icon: 'ki-calendar-tick', kt: 'primary', accentClass: 'bg-primary' },
		{ label: 'Open', value: openTickets, icon: 'ki-abstract-41', kt: 'warning', accentClass: 'bg-warning' },
		{ label: 'Critical', value: criticalTickets, icon: 'ki-abstract-42', kt: 'destructive', accentClass: 'bg-destructive' },
		{ label: 'Selesai', value: resolvedTickets, icon: 'ki-abstract-43', kt: 'success', accentClass: 'bg-success' },
	]);
</script>

{#if loading}
	<div class="wt-spinner py-20">
		<div class="flex flex-col items-center gap-3">
			<div class="wt-spinner-ring size-8"></div>
			<span class="text-sm text-muted-foreground">Memuat data...</span>
		</div>
	</div>
{:else if waStatus.status === 'scanning_qr' || waStatus.status === 'worker_offline' || waStatus.status === 'disconnected' || waStatus.status === 'initializing'}
	<div class="flex flex-col items-center justify-center py-20 gap-4">
		{#if waStatus.status === 'worker_offline'}
			<div class="flex flex-col items-center gap-3">
				<i class="ki-filled ki-phone text-4xl text-muted-foreground"></i>
				<p class="text-sm text-muted-foreground">Worker WhatsApp belum aktif</p>
				<button onclick={startWorker} class="kt-btn kt-btn-primary">Aktifkan Worker</button>
			</div>
		{:else if waStatus.status === 'scanning_qr'}
			<p class="text-sm text-muted-foreground">Scan QR code dengan WhatsApp untuk menghubungkan</p>
			{#if waQrImage}
				<img src={waQrImage} alt="QR Code" class="size-56 border border-border rounded-xl" />
			{:else if waQrError}
				<div class="flex flex-col items-center gap-2">
					<p class="text-xs text-destructive">Gagal memuat QR code</p>
					<button onclick={fetchWaQr} class="kt-btn kt-btn-xs kt-btn-outline">Coba Lagi</button>
				</div>
			{:else}
				<div class="wt-spinner"><div class="wt-spinner-ring"></div></div>
			{/if}
		{:else}
			<div class="flex flex-col items-center gap-2">
				<div class="wt-spinner-ring size-6"></div>
				<p class="text-sm text-muted-foreground">Menghubungkan ke WhatsApp...</p>
			</div>
		{/if}
	</div>
{:else}
	<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-7.5 items-stretch">
		{#each kpis as kpi}
			<div class="kt-card border border-border rounded-xl shadow-sm bg-card overflow-hidden">
				<div class="h-1 w-full {kpi.accentClass}"></div>
				<div class="px-5 lg:px-7.5 py-5 lg:py-7.5">
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
			</div>
		{/each}
	</div>

	{#if isFirstTime}
		<Card title="Selamat Datang" subtitle="Mulai kelola laporan support dari WhatsApp">
			<div class="flex flex-col items-center py-6 px-4 text-center">
				<i class="ki-filled ki-hand-wave text-4xl text-primary mb-3"></i>
				<p class="text-sm text-foreground font-medium mb-4">Belum ada tiket masuk. Ikuti langkah berikut:</p>
				<ol class="text-left space-y-3 text-sm text-muted-foreground">
					<li class="flex items-start gap-2.5">
						<span class="flex items-center justify-center size-6 rounded-full bg-primary/10 text-primary font-semibold text-xs shrink-0 mt-0.5">1</span>
						<span><strong class="text-foreground">Hubungkan WhatsApp</strong> — Scan QR code di menu Settings → Connection</span>
					</li>
					<li class="flex items-start gap-2.5">
						<span class="flex items-center justify-center size-6 rounded-full bg-primary/10 text-primary font-semibold text-xs shrink-0 mt-0.5">2</span>
						<span><strong class="text-foreground">Tunggu pesan masuk</strong> — Pesan akan muncul di Inbox dan otomatis diklasifikasi</span>
					</li>
					<li class="flex items-start gap-2.5">
						<span class="flex items-center justify-center size-6 rounded-full bg-primary/10 text-primary font-semibold text-xs shrink-0 mt-0.5">3</span>
						<span><strong class="text-foreground">Buat & kelola Tiket</strong> — Konfirmasi klasifikasi, assign PIC, dan pantau status</span>
					</li>
				</ol>
				<a href="/settings" class="kt-btn kt-btn-primary mt-5">Buka Settings →</a>
			</div>
		</Card>
	{/if}

	{#if stats}
		<Card title="WhatsApp Hari Ini" subtitle="Statistik pesan masuk hari ini">
			<div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
				<div class="flex flex-col items-center gap-1 p-3 rounded-lg bg-muted/40">
					<span class="text-2xl font-semibold text-mono">{stats.today.messages}</span>
					<span class="text-2xs text-muted-foreground text-center">Pesan Masuk</span>
				</div>
				<div class="flex flex-col items-center gap-1 p-3 rounded-lg bg-muted/40">
					<span class="text-2xl font-semibold text-mono">{stats.today.classified}</span>
					<span class="text-2xs text-muted-foreground text-center">Terklasifikasi</span>
				</div>
				<div class="flex flex-col items-center gap-1 p-3 rounded-lg bg-muted/40">
					<span class="text-2xl font-semibold text-mono text-warning">{stats.today.supportRelated}</span>
					<span class="text-2xs text-muted-foreground text-center">Support</span>
				</div>
				<div class="flex flex-col items-center gap-1 p-3 rounded-lg bg-muted/40">
					<span class="text-2xl font-semibold text-mono text-primary">{stats.today.ticketsCreated}</span>
					<span class="text-2xs text-muted-foreground text-center">Tiket Dibuat</span>
				</div>
				<div class="flex flex-col items-center gap-1 p-3 rounded-lg bg-muted/40">
					<span class="text-2xl font-semibold text-mono">{stats.unprocessed}</span>
					<span class="text-2xs text-muted-foreground text-center">Belum Diproses</span>
				</div>
				<div class="flex flex-col items-center gap-1 p-3 rounded-lg bg-muted/40">
					<span class="text-2xl font-semibold text-mono">{stats.avgConfidence != null ? (stats.avgConfidence * 100).toFixed(0) + '%' : '—'}</span>
					<span class="text-2xs text-muted-foreground text-center">Rerata Confidence</span>
				</div>
			</div>
		</Card>
	{/if}

	<div class="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-7.5 items-stretch">
		<Card title="Masalah Terbanyak" subtitle="5 kategori tiket tertinggi">
			<div class="flex flex-col gap-px">
				{#each categoryCounts as [cat, count], i}
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
			<a href="/tickets" class="flex items-center justify-center gap-1 py-2.5 text-xs font-medium text-muted-foreground hover:text-foreground border-t border-border transition-colors">
				Lihat Semua <i class="ki-filled ki-black-right text-xs"></i>
			</a>
		</Card>
	</div>
{/if}
