<script lang="ts">
	import Card from '$lib/components/Card.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import Button from '$lib/components/Button.svelte';

	let tickets = $state<any[]>([]);
	let statuses = $state<any[]>([]);
	let allStatuses = $state<any[]>([]);
	let loading = $state(true);
	let showCreateForm = $state(false);

	async function load() {
		loading = true;
		const [ticketRes, settingsRes] = await Promise.all([
			fetch('/api/tickets?limit=200'),
			fetch('/api/settings'),
		]);
		if (ticketRes.ok) tickets = (await ticketRes.json()).data || [];
		if (settingsRes.ok) {
			const s = (await settingsRes.json()).data;
			allStatuses = s.statuses;
			statuses = s.statuses?.filter((st: any) => !st.isClosed) || [];
		}
		loading = false;
	}

	$effect(() => { load(); });

	let form = $state({
		title: '', summary: '', reporterName: '',
		categoryId: '', priorityId: '', messageIds: [] as string[],
	});

	async function createTicket() {
		const res = await fetch('/api/tickets', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(form),
		});
		if (res.ok) {
			showCreateForm = false;
			form = { title: '', summary: '', reporterName: '', categoryId: '', priorityId: '', messageIds: [] };
			await load();
		}
	}

	function statusStyle(name: string): string {
		const m: Record<string, string> = {
			New: 'kt-badge-primary', Open: 'kt-badge-warning',
			'In Progress': 'kt-badge-info', 'Waiting User': 'kt-badge-outline',
			'Waiting Vendor': 'kt-badge-outline', Resolved: 'kt-badge-success',
			Closed: 'kt-badge-outline', 'Rejected/Invalid': 'kt-badge-destructive',
		};
		return m[name] || 'kt-badge-outline';
	}

	function prioBadge(p: string) {
		const m: Record<string, string> = { Critical: 'destructive', High: 'warning', Medium: 'primary', Low: 'outline' };
		return m[p] || 'outline';
	}
</script>

<div class="flex items-center justify-between flex-wrap gap-3 mb-5 lg:mb-7.5">
	<div>
		<h1 class="text-xl font-semibold text-mono">Tickets</h1>
		<p class="text-2sm text-muted-foreground">Manajemen tiket support</p>
	</div>
	<Button onclick={() => showCreateForm = !showCreateForm}>
		<i class="ki-filled ki-plus text-sm"></i>
		{showCreateForm ? 'Batal' : 'Tiket Baru'}
	</Button>
</div>

{#if showCreateForm}
	<Card title="Buat Tiket Baru">
		<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
			<input bind:value={form.title} placeholder="Judul tiket" class="kt-input border border-input rounded-lg px-3 py-2 text-sm" />
			<input bind:value={form.reporterName} placeholder="Nama pelapor" class="kt-input border border-input rounded-lg px-3 py-2 text-sm" />
			<textarea bind:value={form.summary} placeholder="Ringkasan masalah" class="kt-input border border-input rounded-lg px-3 py-2 text-sm md:col-span-2" rows={3}></textarea>
			<select bind:value={form.priorityId} class="kt-select border border-input rounded-lg px-3 py-2 text-sm">
				<option value="">Pilih prioritas</option>
				{#each allStatuses as s}
					<option value={s.id}>{s.name}</option>
				{/each}
			</select>
		</div>
		<div class="flex items-center gap-2 mt-4">
			<Button onclick={createTicket}><i class="ki-filled ki-check-circle text-sm"></i> Simpan</Button>
			<Button variant="outline" onclick={() => showCreateForm = false}>Batal</Button>
		</div>
	</Card>
{/if}

{#if loading}
	<div class="flex items-center justify-center py-10"><div class="size-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div></div>
{:else}
	<div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 lg:gap-7.5">
		{#each statuses as status}
			<div>
				<div class="flex items-center justify-between px-3 py-2 mb-3 rounded-lg bg-muted/50">
					<div class="flex items-center gap-2">
						<span class="text-sm font-medium text-mono">{status.name}</span>
						<span class="text-2xs text-muted-foreground">{tickets.filter((t: any) => t.statusId === status.id).length}</span>
					</div>
					<button class="kt-btn kt-btn-icon kt-btn-dim size-6" onclick={() => {}} aria-label="Add">
						<i class="ki-filled ki-plus text-xs"></i>
					</button>
				</div>
				<div class="flex flex-col gap-2.5">
					{#each tickets.filter((t: any) => t.statusId === status.id) as ticket}
						<div class="kt-card border border-border rounded-lg bg-card p-3.5 hover:shadow-sm transition-shadow">
							<div class="flex items-start justify-between mb-1.5">
								<span class="text-2xs font-mono text-muted-foreground">{ticket.ticketNumber}</span>
								{#if ticket.priority}
									<Badge variant={prioBadge(ticket.priority.name)} size="sm">{ticket.priority.name}</Badge>
								{/if}
							</div>
							<a href="/tickets/{ticket.id}" class="text-sm font-medium text-foreground leading-snug hover:text-primary transition-colors">{ticket.title}</a>
							<div class="flex items-center gap-2 mt-2 text-2xs text-muted-foreground">
								<span>{ticket.reporterName}</span>
								{#if ticket.category}
									<span class="kt-badge kt-badge-sm kt-badge-stroke">{ticket.category.name}</span>
								{/if}
							</div>
						</div>
					{/each}
					{#if tickets.filter((t: any) => t.statusId === status.id).length === 0}
						<div class="text-center py-4 text-2xs text-muted-foreground border border-dashed border-border rounded-lg">Kosong</div>
					{/if}
				</div>
			</div>
		{/each}
	</div>
{/if}
