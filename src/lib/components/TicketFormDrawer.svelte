<script lang="ts">
	let categories = $state<any[]>([]);
	let priorities = $state<any[]>([]);
	let sources = $state<any[]>([]);
	let loading = $state(true);
	let submitting = $state(false);
	let error = $state('');

	let form = $state({
		title: '', summary: '', reporterName: '', reporterPhone: '',
		sourceId: '', categoryId: '', priorityId: '',
	});

	$effect(() => {
		async function load() {
			loading = true;
			const res = await fetch('/api/settings');
			if (res.ok) {
				const d = (await res.json()).data;
				categories = d.categories || [];
				priorities = d.priorities || [];
				sources = d.sources || [];
			}
			loading = false;
		}
		load();
	});

	async function submit() {
		submitting = true;
		error = '';
		const body = {
			title: form.title,
			summary: form.summary,
			reporterName: form.reporterName,
			reporterPhone: form.reporterPhone || undefined,
			sourceId: form.sourceId || undefined,
			categoryId: form.categoryId || undefined,
			priorityId: form.priorityId || undefined,
			messageIds: [],
		};
		const res = await fetch('/api/tickets', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body),
		});
		submitting = false;
		if (res.ok) {
			form = { title: '', summary: '', reporterName: '', reporterPhone: '', sourceId: '', categoryId: '', priorityId: '' };
			const dismiss = document.querySelector<HTMLElement>('#ticket_form_drawer [data-kt-drawer-dismiss]');
			dismiss?.click();
		} else {
			const err = await res.json();
			error = err.error || 'Gagal membuat tiket';
		}
	}
</script>

<div class="hidden kt-drawer kt-drawer-end card flex-col max-w-[90%] w-[500px] top-5 bottom-5 end-5 rounded-xl border border-border" data-kt-drawer="true" data-kt-drawer-container="body" id="ticket_form_drawer">
	<div class="flex items-center justify-between gap-2.5 text-sm text-mono font-semibold px-5 py-2.5 border-b border-b-border">
		Buat Tiket Baru
		<button class="kt-btn kt-btn-sm kt-btn-icon kt-btn-dim shrink-0" data-kt-drawer-dismiss="true" aria-label="Tutup">
			<i class="ki-filled ki-cross"></i>
		</button>
	</div>
	<div class="grow overflow-y-auto px-5 py-4">
		{#if loading}
			<div class="flex items-center justify-center py-10">
				<div class="size-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
			</div>
		{:else}
			<form class="flex flex-col gap-4" onsubmit={(e) => { e.preventDefault(); submit(); }}>
				<div>
					<label for="tfd_title" class="text-2xs font-medium text-muted-foreground uppercase tracking-wider mb-1 block">Judul Tiket <span class="text-destructive">*</span></label>
					<input id="tfd_title" bind:value={form.title} required placeholder="Judul tiket" class="kt-input w-full border border-input rounded-lg px-3 py-2 text-sm placeholder:text-muted-foreground/50" />
				</div>
				<div>
					<label for="tfd_summary" class="text-2xs font-medium text-muted-foreground uppercase tracking-wider mb-1 block">Ringkasan Masalah <span class="text-destructive">*</span></label>
					<textarea id="tfd_summary" bind:value={form.summary} required placeholder="Deskripsi masalah" class="kt-input w-full border border-input rounded-lg px-3 py-2 text-sm placeholder:text-muted-foreground/50" rows={4}></textarea>
				</div>
				<div class="grid grid-cols-2 gap-3">
					<div>
						<label for="tfd_reporter" class="text-2xs font-medium text-muted-foreground uppercase tracking-wider mb-1 block">Nama Pelapor <span class="text-destructive">*</span></label>
						<input id="tfd_reporter" bind:value={form.reporterName} required placeholder="Nama" class="kt-input w-full border border-input rounded-lg px-3 py-2 text-sm placeholder:text-muted-foreground/50" />
					</div>
					<div>
						<label for="tfd_phone" class="text-2xs font-medium text-muted-foreground uppercase tracking-wider mb-1 block">No. Telepon</label>
						<input id="tfd_phone" bind:value={form.reporterPhone} placeholder="08xxxx" class="kt-input w-full border border-input rounded-lg px-3 py-2 text-sm placeholder:text-muted-foreground/50" />
					</div>
				</div>
				<div class="grid grid-cols-2 gap-3">
					<div>
						<label for="tfd_category" class="text-2xs font-medium text-muted-foreground uppercase tracking-wider mb-1 block">Kategori</label>
						<select id="tfd_category" bind:value={form.categoryId} class="kt-select w-full border border-input rounded-lg px-3 py-2 text-sm">
							<option value="">Pilih kategori</option>
							{#each categories as cat}
								<option value={cat.id}>{cat.name}</option>
							{/each}
						</select>
					</div>
					<div>
						<label for="tfd_priority" class="text-2xs font-medium text-muted-foreground uppercase tracking-wider mb-1 block">Prioritas</label>
						<select id="tfd_priority" bind:value={form.priorityId} class="kt-select w-full border border-input rounded-lg px-3 py-2 text-sm">
							<option value="">Pilih prioritas</option>
							{#each priorities as pri}
								<option value={pri.id}>{pri.name}</option>
							{/each}
						</select>
					</div>
				</div>
				<div>
					<label for="tfd_source" class="text-2xs font-medium text-muted-foreground uppercase tracking-wider mb-1 block">Sumber WhatsApp</label>
					<select id="tfd_source" bind:value={form.sourceId} class="kt-select w-full border border-input rounded-lg px-3 py-2 text-sm">
						<option value="">Pilih sumber</option>
						{#each sources as src}
							<option value={src.id}>{src.name}</option>
						{/each}
					</select>
				</div>
				{#if error}
					<div class="text-2sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</div>
				{/if}
				<div class="flex items-center gap-2 pt-2 border-t border-border">
					<button type="submit" disabled={submitting} class="kt-btn kt-btn-primary">
						{#if submitting}
							<div class="size-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
						{:else}
							<i class="ki-filled ki-check-circle text-sm"></i>
						{/if}
						Simpan
					</button>
					<button type="button" class="kt-btn kt-btn-outline" data-kt-drawer-dismiss="true">Batal</button>
				</div>
			</form>
		{/if}
	</div>
</div>
