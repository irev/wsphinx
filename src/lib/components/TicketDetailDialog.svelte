<script lang="ts">
	import Badge from '$lib/components/Badge.svelte';
	import Button from '$lib/components/Button.svelte';
	import { showToast } from '$lib/stores/toast';
	import { maskPhone } from '$lib/utils/mask';
	import { sanitize, sanitizeForm } from '$lib/utils/sanitize';
	import { required, validate } from '$lib/utils/validate';

	interface Props {
		show: boolean;
		ticketId: string | null;
		onClose: () => void;
		onChanged?: () => void;
	}
	let { show, ticketId, onClose, onChanged = () => {} }: Props = $props();

	let ticket = $state<any>(null);
	let loading = $state(true);
	let settings = $state<any>({ categories: [], priorities: [], pics: [], statuses: [] });

	let editCategory = $state('');
	let editPriority = $state('');
	let editPic = $state('');
	let editStatus = $state('');
	let editNote = $state('');
	let saving = $state(false);

	$effect(() => {
		if (!show || !ticketId) return;
		async function load() {
			loading = true;
			ticket = null;
			const [ticketRes, setRes] = await Promise.all([
				fetch(`/api/tickets/${ticketId}`),
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
		load();
	});

	async function save() {
		if (editNote.length > 1000) {
			showToast('error', 'Catatan maksimal 1000 karakter');
			return;
		}
		saving = true;
		const body: Record<string, string> = {};
		if (editCategory !== ticket.categoryId) body.categoryId = editCategory;
		if (editPriority !== ticket.priorityId) body.priorityId = editPriority;
		if (editPic !== ticket.picId) body.picId = editPic;
		if (editStatus !== ticket.statusId) body.statusId = editStatus;
		if (Object.keys(body).length > 0 || editNote) {
			if (editNote) body.note = sanitize(editNote) as string;
			Object.assign(body, sanitizeForm(body));
			const res = await fetch(`/api/tickets/${ticketId}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body),
			});
			if (res.ok) {
				showToast('success', 'Tiket berhasil diupdate');
				onChanged();
			}
		}
		saving = false;
		editNote = '';
		const ticketRes = await fetch(`/api/tickets/${ticketId}`);
		if (ticketRes.ok) {
			ticket = (await ticketRes.json()).data;
			editCategory = ticket.categoryId || '';
			editPriority = ticket.priorityId || '';
			editPic = ticket.picId || '';
			editStatus = ticket.statusId || '';
		}
	}

	let closeReason = $state('');

	async function doClose() {
		if (!closeReason.trim()) {
			if (!confirm('Tutup tiket tanpa alasan?')) return;
		}
		const res = await fetch(`/api/tickets/${ticketId}/close`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ reason: sanitize(closeReason) }),
		});
		if (res.ok) {
			showToast('success', 'Tiket ditutup');
			onChanged();
		}
		closeReason = '';
		const ticketRes = await fetch(`/api/tickets/${ticketId}`);
		if (ticketRes.ok) {
			ticket = (await ticketRes.json()).data;
			editCategory = ticket.categoryId || '';
			editPriority = ticket.priorityId || '';
			editPic = ticket.picId || '';
			editStatus = ticket.statusId || '';
		}
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

{#if show}
	<div class="dialog-overlay" role="presentation" onclick={onClose} onkeydown={(e) => e.key === 'Escape' && onClose()}>
		<div class="dialog-card" role="dialog" tabindex="-1" onclick={(e) => e.stopPropagation()} onkeydown={() => {}}>
			<div class="dialog-header">
				<span class="dialog-title">
					{#if ticket}
						{ticket.ticketNumber} — {ticket.title?.substring(0, 60)}{ticket.title?.length > 60 ? '...' : ''}
					{:else}
						Detail Tiket
					{/if}
				</span>
				<button class="dialog-close" onclick={onClose} aria-label="Tutup">
					<i class="ki-filled ki-cross"></i>
				</button>
			</div>
			<div class="dialog-body">
				{#if loading}
					<div class="flex items-center justify-center py-10"><div class="kt-spinner-ring size-6"></div></div>
				{:else if ticket}
					<div class="dialog-grid">
						<div class="dialog-main">
							<div class="flex items-center gap-2 mb-4">
								<span class="text-xs font-mono text-muted-foreground">{ticket.ticketNumber}</span>
								<Badge variant={statusVariant(ticket.status?.name)} size="sm">{ticket.status?.name}</Badge>
								{#if ticket.priority}
									<Badge variant={prioBadge(ticket.priority.name)} size="sm">{ticket.priority.name}</Badge>
								{/if}
							</div>

							<div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
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

							<div class="flex items-center gap-2 mb-2">
								<Button onclick={save} disabled={saving || !ticketId}>
									<i class="ki-filled ki-check-circle text-sm"></i> {saving ? '...' : 'Simpan Perubahan'}
								</Button>
							</div>
							<textarea bind:value={editNote} placeholder="Catatan perubahan (opsional)" class="kt-input w-full border border-input rounded-lg px-3 py-2 text-sm placeholder:text-muted-foreground/50 mb-4" rows={3}></textarea>

							<div class="mb-4">
								<h3 class="text-sm font-semibold text-mono mb-2">Ringkasan</h3>
								<p class="text-sm text-secondary-foreground whitespace-pre-wrap">{ticket.summary}</p>
								{#if ticket.notes}
									<h3 class="text-sm font-semibold text-mono mt-4 mb-2">Catatan</h3>
									<p class="text-sm text-secondary-foreground whitespace-pre-wrap">{ticket.notes}</p>
								{/if}
							</div>

							{#if ticket.messages?.length}
								<div class="mb-4">
									<h3 class="text-sm font-semibold text-mono mb-3">Pesan Terkait ({ticket.messages.length})</h3>
									<div class="flex flex-col gap-2 max-h-48 overflow-y-auto">
										{#each ticket.messages as tm}
											<div class="bg-muted rounded-lg p-3 text-sm">
												<p class="text-2xs text-muted-foreground mb-1">{tm.message.fromName || maskPhone(tm.message.fromPhone)} — {new Date(tm.message.timestamp).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}</p>
												<p class="text-secondary-foreground">{tm.message.body}</p>
											</div>
										{/each}
									</div>
								</div>
							{/if}

							{#if ticket.status?.name !== 'Closed' && ticket.status?.name !== 'Rejected/Invalid'}
								<div class="flex items-center gap-2">
									<input bind:value={closeReason} placeholder="Alasan penutupan (opsional)" class="kt-input border border-input rounded-lg px-3 py-2 text-sm flex-1 min-w-0" />
									<Button variant="mono" onclick={doClose}><i class="ki-filled ki-check-circle text-sm"></i> Tutup Tiket</Button>
								</div>
							{/if}
						</div>

						<div class="dialog-sidebar">
							<h3 class="text-sm font-semibold text-mono mb-3">Riwayat</h3>
							{#if ticket.updates?.length}
								<div class="flex flex-col gap-3 max-h-80 overflow-y-auto">
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
				{/if}
			</div>
		</div>
	</div>
{/if}

<style>
	.dialog-overlay {
		position: fixed;
		inset: 0;
		z-index: 100;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0.75rem;
	}
	.dialog-card {
		width: 100%;
		max-width: 1024px;
		max-height: calc(100vh - 3rem);
		overflow: hidden;
		display: flex;
		flex-direction: column;
		border-radius: var(--radius, 0.75rem);
		border: 1px solid var(--border);
		background: var(--popover, #fff);
		color: var(--popover-foreground);
		box-shadow: 0 20px 60px rgba(0,0,0,0.3), 0 4px 16px rgba(0,0,0,0.12);
	}
	.dialog-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		padding: 1rem 1.25rem;
		border-bottom: 1px solid var(--border);
	}
	.dialog-close {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 1.75rem;
		height: 1.75rem;
		flex-shrink: 0;
		border-radius: 0.375rem;
		border: none;
		background: transparent;
		color: var(--muted-foreground);
		cursor: pointer;
	}
	.dialog-close:hover {
		background: var(--muted, #f1f5f9);
		color: var(--foreground);
	}
	.dialog-title {
		font-size: 0.9375rem;
		font-weight: 600;
		color: var(--mono);
	}
	.dialog-body {
		overflow-y: auto;
		padding: 1.25rem;
	}
	.dialog-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: 1.25rem;
	}
	@media (min-width: 768px) {
		.dialog-grid {
			grid-template-columns: 1fr 280px;
		}
		.dialog-sidebar {
			border-left: 1px solid var(--border);
			padding-left: 1.25rem;
		}
	}
	@media (max-width: 767px) {
		.dialog-overlay {
			padding: 0;
		}
		.dialog-card {
			max-height: 100vh;
			border-radius: 0;
			border: none;
		}
		.dialog-header, .dialog-body {
			padding: 0.75rem 1rem;
		}
		.dialog-sidebar {
			border-top: 1px solid var(--border);
			padding-top: 1rem;
			margin-top: 0.5rem;
		}
		.dialog-title {
			font-size: 0.8125rem;
		}
	}
</style>