<script lang="ts">
	import { showToast } from '$lib/stores/toast';
	import { sanitizeForm } from '$lib/utils/sanitize';
	import { required, validate } from '$lib/utils/validate';

	interface Props {
		show: boolean;
		onClose: () => void;
		prefill?: {
			title?: string;
			summary?: string;
			reporterName?: string;
			reporterPhone?: string;
			categoryName?: string;
			priorityName?: string;
			sourceId?: string;
			messageIds?: string[];
		};
	}
	let { show, onClose, prefill = {} }: Props = $props();

	let categories = $state<any[]>([]);
	let priorities = $state<any[]>([]);
	let pics = $state<any[]>([]);
	let sources = $state<any[]>([]);
	let loading = $state(true);
	let submitting = $state(false);
	let error = $state('');

	let form = $state({
		title: '', summary: '', reporterName: '', reporterPhone: '',
		sourceId: '', categoryId: '', priorityId: '', picId: '',
	});

	$effect(() => {
		if (!show) return;
		loading = true;
		error = '';
		async function init() {
			const res = await fetch('/api/settings');
			if (res.ok) {
				const d = (await res.json()).data;
				categories = d.categories || [];
				priorities = d.priorities || [];
				pics = d.pics || [];
				sources = d.sources || [];
			}
			const cat = categories.find((c: any) => c.name.toLowerCase() === (prefill.categoryName || '').toLowerCase());
			const prio = priorities.find((p: any) => p.name.toLowerCase() === (prefill.priorityName || '').toLowerCase());
			form = {
				title: prefill.title || '',
				summary: prefill.summary || '',
				reporterName: prefill.reporterName || '',
				reporterPhone: prefill.reporterPhone || '',
				sourceId: prefill.sourceId || (sources[0]?.id || ''),
				categoryId: cat?.id || '',
				priorityId: prio?.id || '',
				picId: '',
			};
			loading = false;
		}
		init();
	});

	async function submit() {
		const errs = validate({
			title: [required()],
			summary: [required()],
			reporterName: [required()],
		}, form);
		if (Object.keys(errs).length) {
			error = Object.values(errs).join(', ');
			return;
		}
		submitting = true;
		error = '';
		const body = sanitizeForm({
			title: form.title,
			summary: form.summary,
			reporterName: form.reporterName,
			reporterPhone: form.reporterPhone || undefined,
			sourceId: form.sourceId || undefined,
			categoryId: form.categoryId || undefined,
			priorityId: form.priorityId || undefined,
			picId: form.picId || undefined,
			messageIds: prefill.messageIds || [],
		});
		try {
			const res = await fetch('/api/tickets', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body),
			});
			if (res.ok) {
				const ticket = (await res.json()).data;
				showToast('success', `Tiket ${ticket.ticketNumber} berhasil dibuat`);
				onClose();
			} else {
				const err = await res.json();
				error = err.error || 'Gagal membuat tiket';
			}
		} catch (e) {
			error = (e as Error).message;
		}
		submitting = false;
	}
</script>

{#if show}
	<div class="dialog-overlay" role="presentation" onclick={onClose} onkeydown={(e) => e.key === 'Escape' && onClose()}>
		<div class="dialog-card" role="dialog" tabindex="-1" onclick={(e) => e.stopPropagation()} onkeydown={() => {}}>
			<div class="dialog-header">
				<span class="dialog-title">Buat Tiket Baru</span>
				<button class="dialog-close" onclick={onClose} aria-label="Tutup">
					<i class="ki-filled ki-cross"></i>
				</button>
			</div>
			<div class="dialog-body">
				{#if loading}
					<div class="flex items-center justify-center py-8">
						<div class="kt-spinner-ring size-6"></div>
					</div>
				{:else}
					<form class="flex flex-col gap-4" onsubmit={(e) => { e.preventDefault(); submit(); }}>
						<div>
							<label for="tfd_title" class="text-2xs font-medium text-muted-foreground uppercase tracking-wider mb-1 block">Judul Tiket <span class="text-destructive">*</span></label>
							<input id="tfd_title" bind:value={form.title} required placeholder="Judul tiket"
								class="kt-input w-full border border-input rounded-lg px-3 py-2 text-sm placeholder:text-muted-foreground/50" />
						</div>
						<div>
							<label for="tfd_summary" class="text-2xs font-medium text-muted-foreground uppercase tracking-wider mb-1 block">Ringkasan Masalah <span class="text-destructive">*</span></label>
							<textarea id="tfd_summary" bind:value={form.summary} required placeholder="Deskripsi masalah"
								class="kt-input w-full border border-input rounded-lg px-3 py-2 text-sm placeholder:text-muted-foreground/50" rows={4}></textarea>
						</div>
						<div class="grid grid-cols-2 gap-3">
							<div>
								<label for="tfd_reporter" class="text-2xs font-medium text-muted-foreground uppercase tracking-wider mb-1 block">Nama Pelapor <span class="text-destructive">*</span></label>
								<input id="tfd_reporter" bind:value={form.reporterName} required placeholder="Nama"
									class="kt-input w-full border border-input rounded-lg px-3 py-2 text-sm placeholder:text-muted-foreground/50" />
							</div>
							<div>
								<label for="tfd_phone" class="text-2xs font-medium text-muted-foreground uppercase tracking-wider mb-1 block">No. Telepon</label>
								<input id="tfd_phone" bind:value={form.reporterPhone} placeholder="08xxxx"
									class="kt-input w-full border border-input rounded-lg px-3 py-2 text-sm placeholder:text-muted-foreground/50" />
							</div>
						</div>
						<div class="grid grid-cols-2 gap-3">
							<div>
								<label for="tfd_category" class="text-2xs font-medium text-muted-foreground uppercase tracking-wider mb-1 block">Kategori</label>
								<select id="tfd_category" bind:value={form.categoryId}
									class="kt-input w-full border border-input rounded-lg px-3 py-2 text-sm">
									<option value="">Pilih kategori</option>
									{#each categories as cat}
										<option value={cat.id}>{cat.name}</option>
									{/each}
								</select>
							</div>
							<div>
								<label for="tfd_priority" class="text-2xs font-medium text-muted-foreground uppercase tracking-wider mb-1 block">Prioritas</label>
								<select id="tfd_priority" bind:value={form.priorityId}
									class="kt-input w-full border border-input rounded-lg px-3 py-2 text-sm">
									<option value="">Pilih prioritas</option>
									{#each priorities as pri}
										<option value={pri.id}>{pri.name}</option>
									{/each}
								</select>
							</div>
						</div>
						<div class="grid grid-cols-2 gap-3">
							<div>
								<label for="tfd_pic" class="text-2xs font-medium text-muted-foreground uppercase tracking-wider mb-1 block">PIC</label>
								<select id="tfd_pic" bind:value={form.picId}
									class="kt-input w-full border border-input rounded-lg px-3 py-2 text-sm">
									<option value="">Pilih PIC</option>
									{#each pics as pic}
										<option value={pic.id}>{pic.name}</option>
									{/each}
								</select>
							</div>
							<div>
								<label for="tfd_source" class="text-2xs font-medium text-muted-foreground uppercase tracking-wider mb-1 block">Sumber WhatsApp</label>
								<select id="tfd_source" bind:value={form.sourceId}
									class="kt-input w-full border border-input rounded-lg px-3 py-2 text-sm">
									<option value="">Pilih sumber</option>
									{#each sources as src}
										<option value={src.id}>{src.name}</option>
									{/each}
								</select>
							</div>
						</div>
						{#if error}
							<div class="text-2sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</div>
						{/if}
						<div class="flex items-center justify-end gap-2 pt-2 border-t border-border">
							<button type="button" class="kt-btn kt-btn-outline" onclick={onClose}>Batal</button>
							<button type="submit" disabled={submitting} class="kt-btn kt-btn-primary">
								{#if submitting}
									<div class="size-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
								{:else}
									<i class="ki-filled ki-check-circle text-sm"></i>
								{/if}
								Simpan
							</button>
						</div>
					</form>
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
	}
	.dialog-card {
		width: 100%;
		max-width: 500px;
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
</style>