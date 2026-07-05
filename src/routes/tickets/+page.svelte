<script lang="ts">
	import Badge from '$lib/components/Badge.svelte';
	import Button from '$lib/components/Button.svelte';
	import TicketFormDialog from '$lib/components/TicketFormDialog.svelte';
	import TicketDetailDialog from '$lib/components/TicketDetailDialog.svelte';

	let tickets = $state<any[]>([]);
	let statuses = $state<any[]>([]);
	let loading = $state(true);
	let showCreateForm = $state(false);
	let showDetailId = $state<string | null>(null);

	async function load() {
		loading = true;
		const [ticketRes, settingsRes] = await Promise.all([
			fetch('/api/tickets?limit=200'),
			fetch('/api/settings'),
		]);
		if (ticketRes.ok) tickets = (await ticketRes.json()).data || [];
		if (settingsRes.ok) {
			const s = (await settingsRes.json()).data;
			statuses = s.statuses?.filter((st: any) => !st.isClosed) || [];
		}
		loading = false;
	}

	$effect(() => { load(); });

	function prioBadge(p: string) {
		const m: Record<string, string> = { Critical: 'destructive', High: 'warning', Medium: 'primary', Low: 'outline' };
		return m[p] || 'outline';
	}
</script>

{#if loading}
	<div class="flex items-center justify-center py-10"><div class="size-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div></div>
{:else}
	<div class="flex justify-end mb-4">
		<Button onclick={() => showCreateForm = true}>
			<i class="ki-filled ki-plus text-sm"></i>
			Tiket Baru
		</Button>
	</div>
	<div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 lg:gap-7.5">
		{#each statuses as status}
			<div>
				<div class="flex items-center justify-between px-3 py-2 mb-3 rounded-lg bg-muted/50">
					<div class="flex items-center gap-2">
						<span class="text-sm font-medium text-mono">{status.name}</span>
						<span class="text-2xs text-muted-foreground">{tickets.filter((t: any) => t.statusId === status.id).length}</span>
					</div>
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
							<button onclick={() => showDetailId = ticket.id} class="text-sm font-medium text-foreground leading-snug hover:text-primary transition-colors text-left cursor-pointer">{ticket.title}</button>
							<div class="flex items-center gap-2 mt-2 text-2xs text-muted-foreground">
								<span>{ticket.reporterName}</span>
								{#if ticket.category}
									<span class="kt-badge kt-badge-sm kt-badge-stroke">{ticket.category.name}</span>
								{/if}
								{#if ticket.pic}
									<span class="kt-badge kt-badge-sm kt-badge-info">{ticket.pic.name}</span>
								{/if}
							</div>
						</div>
					{/each}
					{#if tickets.filter((t: any) => t.statusId === status.id).length === 0}
						<div class="kt-empty py-6 border border-dashed border-border rounded-lg">
							<p class="kt-empty-text text-xs">Kosong</p>
						</div>
					{/if}
				</div>
			</div>
		{/each}
	</div>
{/if}

<TicketDetailDialog
	show={showDetailId !== null}
	ticketId={showDetailId}
	onClose={() => showDetailId = null}
	onChanged={() => load()}
/>

<TicketFormDialog
	show={showCreateForm}
	onClose={() => showCreateForm = false}
/>
