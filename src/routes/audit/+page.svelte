<script lang="ts">
	import Badge from '$lib/components/Badge.svelte';

	let logs = $state<any[]>([]);
	let loading = $state(true);

	async function load() {
		loading = true;
		const res = await fetch('/api/audit?limit=100');
		if (res.ok) logs = (await res.json()).data || [];
		loading = false;
	}

	$effect(() => { load(); });

	function actionBadge(action: string) {
		if (action.startsWith('ticket.')) return 'primary';
		if (action.startsWith('message.')) return 'info';
		if (action.includes('close')) return 'destructive';
		return 'outline';
	}
</script>

<div class="kt-card kt-card-grid border border-border rounded-xl shadow-sm bg-card">
	<div class="kt-card-header">
		<div class="flex flex-col gap-0.5">
			<div class="kt-card-title text-lg font-semibold text-mono">Audit Log</div>
			<div class="kt-card-subtitle text-2sm text-muted-foreground">Riwayat perubahan dan aktivitas sistem</div>
		</div>
		<div class="kt-input max-w-48">
			<i class="ki-filled ki-magnifier"></i>
			<input placeholder="Cari log..." type="text" />
		</div>
	</div>
	{#if loading}
		<div class="kt-card-body">
			<div class="flex items-center justify-center py-10"><div class="size-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div></div>
		</div>
	{:else if logs.length === 0}
		<div class="kt-card-body">
			<div class="flex flex-col items-center py-10 text-center">
				<i class="ki-filled ki-security-user text-3xl text-muted-foreground/30 mb-2"></i>
				<p class="text-sm text-muted-foreground">Belum ada log</p>
			</div>
		</div>
	{:else}
		<div class="kt-card-table">
			<div class="grid" data-kt-datatable="true" id="audit_datatable">
				<div class="kt-scrollable-x-auto">
					<table class="kt-table kt-table-border table-fixed w-full" data-kt-datatable-table="true">
						<thead>
							<tr>
								<th class="w-[160px]">
									<span class="kt-table-col">
										<span class="kt-table-col-label">Waktu</span>
										<span class="kt-table-col-sort"></span>
									</span>
								</th>
								<th class="w-[120px]">
									<span class="kt-table-col">
										<span class="kt-table-col-label">User</span>
										<span class="kt-table-col-sort"></span>
									</span>
								</th>
								<th class="w-[120px]">
									<span class="kt-table-col">
										<span class="kt-table-col-label">Action</span>
										<span class="kt-table-col-sort"></span>
									</span>
								</th>
								<th class="w-[130px]">
									<span class="kt-table-col">
										<span class="kt-table-col-label">Entity</span>
										<span class="kt-table-col-sort"></span>
									</span>
								</th>
								<th>
									<span class="kt-table-col">
										<span class="kt-table-col-label">Detail</span>
										<span class="kt-table-col-sort"></span>
									</span>
								</th>
							</tr>
						</thead>
						<tbody>
							{#each logs as log}
								<tr class="hover:bg-muted/30 transition-colors">
									<td class="text-sm text-foreground whitespace-nowrap">{new Date(log.createdAt).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}</td>
									<td class="text-sm text-foreground">{log.user?.name || '-'}</td>
									<td><Badge variant={actionBadge(log.action)} size="sm">{log.action}</Badge></td>
									<td class="text-sm text-foreground">{log.entity} {log.entityId ? `#${log.entityId.substring(0, 8)}` : ''}</td>
									<td class="text-sm text-muted-foreground truncate">{log.detail}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
				<div class="kt-card-footer justify-center md:justify-between flex-col md:flex-row gap-5 text-secondary-foreground text-sm font-medium">
					<div class="flex items-center gap-2 order-2 md:order-1">
						Menampilkan <span class="font-medium text-mono">{logs.length}</span> entri
					</div>
					<div class="flex items-center gap-4 order-1 md:order-2">
						<span class="text-muted-foreground">Halaman 1 dari 1</span>
					</div>
				</div>
			</div>
		</div>
	{/if}
</div>
