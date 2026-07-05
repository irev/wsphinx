<script lang="ts">
	import { page } from '$app/stores';
	import Badge from '$lib/components/Badge.svelte';
	import Button from '$lib/components/Button.svelte';
	import { maskPhone } from '$lib/utils/mask';

	let ticket = $state<any>(null);
	let loading = $state(true);
	let settings = $state<any>({ categories: [], priorities: [], pics: [], statuses: [] });

	let editCategory = $state('');
	let editPriority = $state('');
	let editPic = $state('');
	let editStatus = $state('');
	let editNote = $state('');
	let saving = $state(false);

	async function load() {
		loading = true;
		const [ticketRes, setRes] = await Promise.all([
			fetch(`/api/tickets/${$page.params.id}`),
			fetch('/api/settings'),
		]);
		if (ticketRes.ok) {
			ticket = (await ticketRes.json()).data;
			editCategory = ticket.categoryId || '';
			editPriority = ticket.priorityId || '';
			editPic = ticket.picId || '';
			editStatus = ticket.statusId || '';
		}
		if (setRes.ok) settings = (await setRes.json()).data;
		loading = false;
	}

	$effect(() => { load(); });

	async function save() {
		saving = true;
		const body: Record<string, string> = {};
		if (editCategory !== ticket.categoryId) body.categoryId = editCategory;
		if (editPriority !== ticket.priorityId) body.priorityId = editPriority;
		if (editPic !== ticket.picId) body.picId = editPic;
		if (editStatus !== ticket.statusId) body.statusId = editStatus;

		if (Object.keys(body).length > 0 || editNote) {
			if (editNote) body.note = editNote;
			await fetch(`/api/tickets/${$page.params.id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body),
			});
		}
		saving = false;
		editNote = '';
		await load();
	}

	let closeReason = $state('');

	async function doClose() {
		await fetch(`/api/tickets/${$page.params.id}/close`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ reason: closeReason }),
		});
		await load();
		closeReason = '';
	}

	function prioBadge(p: string) {
		const m: Record<string, string> = { Critical: 'destructive', High: 'warning', Medium: 'primary', Low: 'outline' };
		return m[p] || 'outline';
	}

	function statusVariant(s: string): string {
		const m: Record<string, string> = {
			New: 'primary', Open: 'warning', 'In Progress': 'info',
			'Waiting User': 'outline', 'Waiting Vendor': 'outline',
			Resolved: 'success', Closed: 'outline', 'Rejected/Invalid': 'destructive',
		};
		return m[s] || 'outline';
	}
</script>

<a href="/tickets" class="kt-link kt-link-underlined text-2sm flex items-center gap-1 mb-5 lg:mb-7.5">
	<i class="ki-filled ki-black-left text-sm"></i> Kembali ke Tickets
</a>

{#if loading}
	<div class="flex items-center justify-center py-10"><div class="kt-spinner-ring size-6"></div></div>
{:else if ticket}
	<div class="grid grid-cols-1 lg:grid-cols-3 gap-5 lg:gap-7.5">
		<div class="lg:col-span-2 flex flex-col gap-5 lg:gap-7.5">
			<div class="kt-card border border-border rounded-xl shadow-sm bg-card">
				<div class="px-5 lg:px-7.5 pt-5 lg:pt-7.5">
					<div class="flex items-center gap-2 mb-1">
						<span class="text-xs font-mono text-muted-foreground">{ticket.ticketNumber}</span>
						<Badge variant={statusVariant(ticket.status?.name)} size="sm">{ticket.status?.name}</Badge>
					</div>
					<h1 class="text-xl font-semibold text-mono">{ticket.title}</h1>
				</div>
				<div class="kt-card-body">
					<div class="grid grid-cols-2 md:grid-cols-4 gap-5">
						<div>
							<span class="text-2xs text-muted-foreground">Pelapor</span>
							<p class="text-sm font-medium text-foreground">{ticket.reporterName}</p>
							{#if ticket.reporterPhone}<p class="text-2xs text-muted-foreground">{maskPhone(ticket.reporterPhone)}</p>{/if}
						</div>
						<div>
							<span class="text-2xs text-muted-foreground">Kategori</span>
							<select bind:value={editCategory} class="kt-select border border-input rounded-lg px-2 py-1 text-sm w-full mt-0.5">
								<option value="">-</option>
								{#each settings.categories as cat}
									<option value={cat.id}>{cat.name}</option>
								{/each}
							</select>
						</div>
						<div>
							<span class="text-2xs text-muted-foreground">Prioritas</span>
							<select bind:value={editPriority} class="kt-select border border-input rounded-lg px-2 py-1 text-sm w-full mt-0.5">
								<option value="">-</option>
								{#each settings.priorities as p}
									<option value={p.id}>{p.name}</option>
								{/each}
							</select>
						</div>
						<div>
							<span class="text-2xs text-muted-foreground">PIC</span>
							<select bind:value={editPic} class="kt-select border border-input rounded-lg px-2 py-1 text-sm w-full mt-0.5">
								<option value="">-</option>
								{#each settings.pics as pic}
									<option value={pic.id}>{pic.name}</option>
								{/each}
							</select>
						</div>
						<div>
							<span class="text-2xs text-muted-foreground">Status</span>
							<select bind:value={editStatus} class="kt-select border border-input rounded-lg px-2 py-1 text-sm w-full mt-0.5">
								{#each settings.statuses as st}
									<option value={st.id}>{st.name}</option>
								{/each}
							</select>
						</div>
						<div>
							<span class="text-2xs text-muted-foreground">Dibuat</span>
							<p class="text-sm text-foreground">{new Date(ticket.createdAt).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}</p>
						</div>
						{#if ticket.resolvedAt}
							<div>
								<span class="text-2xs text-muted-foreground">Selesai</span>
								<p class="text-sm text-foreground">{new Date(ticket.resolvedAt).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}</p>
							</div>
						{/if}
					</div>

					<div class="flex items-center gap-2 mt-4">
						<Button onclick={save} disabled={saving}>
							<i class="ki-filled ki-check-circle text-sm"></i> {saving ? '...' : 'Simpan Perubahan'}
						</Button>
						<input bind:value={editNote} placeholder="Catatan perubahan (opsional)" class="kt-input border border-input rounded-lg px-3 py-2 text-sm flex-1" />
					</div>

					<div class="mt-5">
						<h3 class="text-sm font-semibold text-mono mb-2">Ringkasan</h3>
						<p class="text-sm text-secondary-foreground whitespace-pre-wrap">{ticket.summary}</p>
						{#if ticket.notes}
							<h3 class="text-sm font-semibold text-mono mt-4 mb-2">Catatan</h3>
							<p class="text-sm text-secondary-foreground whitespace-pre-wrap">{ticket.notes}</p>
						{/if}
					</div>

					{#if ticket.messages?.length}
						<div class="mt-5">
							<h3 class="text-sm font-semibold text-mono mb-3">Pesan Terkait ({ticket.messages.length})</h3>
							<div class="flex flex-col gap-2">
								{#each ticket.messages as tm}
									<div class="bg-muted rounded-lg p-3 text-sm">
										<p class="text-2xs text-muted-foreground mb-1">{tm.message.fromName || maskPhone(tm.message.fromPhone)} — {new Date(tm.message.timestamp).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}</p>
										<p class="text-secondary-foreground">{tm.message.body}</p>
									</div>
								{/each}
							</div>
						</div>
					{/if}
				</div>
			</div>
		</div>

		<div class="flex flex-col gap-5 lg:gap-7.5">
			<div class="kt-card border border-border rounded-xl shadow-sm bg-card">
				<div class="kt-card-header">
					<div class="flex flex-col gap-0.5">
						<div class="kt-card-title text-lg font-semibold text-mono">Riwayat</div>
						<div class="kt-card-subtitle text-2sm text-muted-foreground">{ticket.updates?.length + ' update'}</div>
					</div>
				</div>
				<div class="kt-card-body">
					{#if ticket.updates?.length}
						<div class="flex flex-col gap-3">
							{#each ticket.updates as update}
								<div class="relative ps-4 before:absolute before:start-0 before:top-1 before:size-2 before:rounded-full before:bg-border">
									<p class="text-2xs text-muted-foreground">{update.user?.name || 'System'} — {new Date(update.createdAt).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}</p>
									{#if update.fromStatus && update.toStatus && update.fromStatus !== update.toStatus}
										<p class="text-sm text-foreground mt-0.5">
											<span class="kt-badge kt-badge-sm kt-badge-stroke">{update.fromStatus}</span>
											<i class="ki-filled ki-black-right text-xs text-muted-foreground mx-1"></i>
											<span class="kt-badge kt-badge-sm kt-badge-stroke">{update.toStatus}</span>
										</p>
									{/if}
									{#if update.note}
										<p class="text-sm text-secondary-foreground mt-0.5">{update.note}</p>
									{/if}
								</div>
							{/each}
						</div>
					{:else}
						<p class="text-sm text-muted-foreground">Belum ada update</p>
					{/if}
				</div>
			</div>

			{#if ticket.status?.name !== 'Closed' && ticket.status?.name !== 'Rejected/Invalid'}
				<div class="kt-card border border-border rounded-xl shadow-sm bg-card">
					<div class="kt-card-header">
						<div class="flex flex-col gap-0.5">
							<div class="kt-card-title text-lg font-semibold text-mono">Tutup Tiket</div>
							<div class="kt-card-subtitle text-2sm text-muted-foreground">Tandai tiket selesai</div>
						</div>
					</div>
					<div class="kt-card-body">
						<div class="flex flex-col gap-3">
							<input bind:value={closeReason} placeholder="Alasan penutupan (opsional)" class="kt-input border border-input rounded-lg px-3 py-2 text-sm" />
							<Button variant="mono" onclick={doClose}><i class="ki-filled ki-check-circle text-sm"></i> Tutup Tiket</Button>
						</div>
					</div>
				</div>
			{/if}
		</div>
	</div>
{/if}
