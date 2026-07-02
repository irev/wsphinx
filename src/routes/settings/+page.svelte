<script lang="ts">
	import Badge from '$lib/components/Badge.svelte';

	let settings = $state<any>(null);
	let loading = $state(true);

	async function load() {
		loading = true;
		const res = await fetch('/api/settings');
		if (res.ok) settings = (await res.json()).data;
		loading = false;
	}

	$effect(() => { load(); });
</script>

{#if loading}
	<div class="flex items-center justify-center py-10"><div class="size-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div></div>
{:else if settings}
	<div class="grid grid-cols-1 md:grid-cols-2 gap-5 lg:gap-7.5">
		<div class="kt-card border border-border rounded-xl shadow-sm bg-card">
			<div class="kt-card-header">
				<div class="flex items-center gap-2">
					<i class="ki-filled ki-flag text-primary"></i>
					<div class="kt-card-title text-lg font-semibold text-mono">Priorities</div>
				</div>
			</div>
			<div class="kt-card-table">
				<table class="kt-table kt-table-border w-full">
					<tbody>
						{#each settings.priorities as p}
							<tr class="hover:bg-muted/30 transition-colors">
								<td class="w-10 text-center">
									<span class="inline-block size-3 rounded-full shrink-0" style="background: {p.color || '#3b82f6'}"></span>
								</td>
								<td class="text-sm font-medium text-foreground">{p.name}</td>
								<td class="text-sm text-muted-foreground text-end">
									<span class="kt-badge kt-badge-sm kt-badge-outline">Level {p.level}</span>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>

		<div class="kt-card border border-border rounded-xl shadow-sm bg-card">
			<div class="kt-card-header">
				<div class="flex items-center gap-2">
					<i class="ki-filled ki-abstract-41 text-warning"></i>
					<div class="kt-card-title text-lg font-semibold text-mono">Statuses</div>
				</div>
			</div>
			<div class="kt-card-table">
				<table class="kt-table kt-table-border w-full">
					<tbody>
						{#each settings.statuses as s}
							<tr class="hover:bg-muted/30 transition-colors">
								<td class="w-10 text-center">
									<span class="inline-block size-3 rounded-full shrink-0" style="background: {s.color || '#6b7280'}"></span>
								</td>
								<td class="text-sm font-medium text-foreground">{s.name}</td>
								<td class="text-end">{#if s.isClosed}<Badge variant="outline" size="sm">closed</Badge>{/if}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>

		<div class="kt-card border border-border rounded-xl shadow-sm bg-card">
			<div class="kt-card-header">
				<div class="flex items-center gap-2">
					<i class="ki-filled ki-category text-success"></i>
					<div class="kt-card-title text-lg font-semibold text-mono">Categories</div>
				</div>
			</div>
			<div class="kt-card-table">
				<table class="kt-table kt-table-border w-full">
					<tbody>
						{#each settings.categories as c}
							<tr class="hover:bg-muted/30 transition-colors">
								<td class="text-sm text-foreground">{c.name}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>

		<div class="kt-card border border-border rounded-xl shadow-sm bg-card">
			<div class="kt-card-header">
				<div class="flex items-center gap-2">
					<i class="ki-filled ki-people text-info"></i>
					<div class="kt-card-title text-lg font-semibold text-mono">PIC / Teknisi</div>
				</div>
			</div>
			<div class="kt-card-table">
				<table class="kt-table kt-table-border w-full">
					<tbody>
						{#each settings.pics as pic}
							<tr class="hover:bg-muted/30 transition-colors">
								<td class="text-sm font-medium text-foreground">{pic.name}</td>
								<td class="text-sm text-muted-foreground">{pic.role}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	</div>

	<div class="kt-card border border-border rounded-xl shadow-sm bg-card">
		<div class="kt-card-header">
			<div class="flex items-center gap-2">
				<i class="ki-filled ki-messages text-primary"></i>
				<div class="kt-card-title text-lg font-semibold text-mono">WhatsApp Sources</div>
			</div>
		</div>
		{#if settings.sources?.length === 0}
			<div class="kt-card-body">
				<p class="text-sm text-muted-foreground">Belum ada sumber WhatsApp.</p>
			</div>
		{:else}
			<div class="kt-card-table">
				<table class="kt-table kt-table-border w-full">
					<thead>
						<tr>
							<th><span class="kt-table-col"><span class="kt-table-col-label">Nama</span></span></th>
							<th><span class="kt-table-col"><span class="kt-table-col-label">Tipe</span></span></th>
							<th><span class="kt-table-col"><span class="kt-table-col-label">Nomor</span></span></th>
							<th><span class="kt-table-col"><span class="kt-table-col-label">Status</span></span></th>
						</tr>
					</thead>
					<tbody>
						{#each settings.sources as src}
							<tr class="hover:bg-muted/30 transition-colors">
								<td class="text-sm font-medium text-foreground">{src.name}</td>
								<td class="text-sm text-muted-foreground">{src.type}</td>
								<td class="text-sm text-muted-foreground">{src.phone}</td>
								<td><Badge variant={src.active ? 'success' : 'outline'} size="sm">{src.active ? 'Active' : 'Inactive'}</Badge></td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</div>
{/if}
