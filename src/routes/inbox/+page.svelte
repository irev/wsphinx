<script lang="ts">
	import Card from '$lib/components/Card.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import Button from '$lib/components/Button.svelte';

	let messages = $state<any[]>([]);
	let loading = $state(true);

	async function load() {
		loading = true;
		const res = await fetch('/api/messages?limit=100');
		if (res.ok) messages = (await res.json()).data || [];
		loading = false;
	}

	$effect(() => { load(); });

	let selected = $state<string | null>(null);
	let classification = $state<any>(null);
	let classifying = $state(false);

	async function classify(id: string) {
		classifying = true;
		selected = id;
		const res = await fetch('/api/messages/classify', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ messageId: id }),
		});
		if (res.ok) classification = (await res.json()).data;
		classifying = false;
		await load();
	}

	function typeBadge(type: string) {
		const m: Record<string, string> = {
			new_issue: 'destructive', update: 'primary', confirmation: 'success',
			info_request: 'warning', escalation: 'info', noise: 'outline', general_chat: 'outline',
		};
		return m[type] || 'outline';
	}

	function prioBadge(p: string) {
		const m: Record<string, string> = { Critical: 'destructive', High: 'warning', Medium: 'primary', Low: 'outline' };
		return m[p] || 'outline';
	}
</script>

<Card title="Inbox WhatsApp" subtitle="Pesan masuk dari WhatsApp">
	{#if loading}
		<div class="flex items-center justify-center py-10"><div class="size-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div></div>
	{:else if messages.length === 0}
		<div class="flex flex-col items-center justify-center py-10 text-center">
			<i class="ki-filled ki-messages text-4xl text-muted-foreground/30 mb-3"></i>
			<p class="text-sm text-muted-foreground">Belum ada pesan</p>
			<p class="text-2xs text-muted-foreground mt-1">Import pesan atau jalankan WhatsApp worker</p>
		</div>
	{:else}
		<div class="kt-scrollable-x-auto">
			<table class="kt-table kt-table-border w-full">
				<thead>
					<tr>
						<th>
							<span class="kt-table-col">
								<span class="kt-table-col-label">Pengirim</span>
							</span>
						</th>
						<th>
							<span class="kt-table-col">
								<span class="kt-table-col-label">Pesan</span>
							</span>
						</th>
						<th>
							<span class="kt-table-col">
								<span class="kt-table-col-label">Waktu</span>
							</span>
						</th>
						<th>
							<span class="kt-table-col">
								<span class="kt-table-col-label">Klasifikasi</span>
							</span>
						</th>
						<th class="w-[100px] text-end">
							<span class="kt-table-col justify-end">
								<span class="kt-table-col-label">Aksi</span>
							</span>
						</th>
					</tr>
				</thead>
				<tbody>
					{#each messages as msg}
						<tr class="hover:bg-muted/30 transition-colors {msg.isSupportRelated ? 'bg-primary/5' : ''}">
							<td class="whitespace-nowrap">
								<div class="flex items-center gap-2">
									<div class="kt-avatar size-8">
										<div class="kt-avatar-image rounded-full bg-muted flex items-center justify-center text-xs font-semibold text-muted-foreground">
											{(msg.fromName || msg.fromPhone || '?').charAt(0).toUpperCase()}
										</div>
									</div>
									<div class="flex flex-col">
										<span class="text-sm font-medium text-foreground">{msg.fromName || msg.fromPhone}</span>
										{#if msg.source}
											<span class="text-2xs text-muted-foreground">{msg.source.name}</span>
										{/if}
									</div>
								</div>
							</td>
							<td class="max-w-xs">
								<p class="text-sm text-secondary-foreground truncate">{msg.body}</p>
							</td>
							<td class="whitespace-nowrap text-sm text-muted-foreground">
								{new Date(msg.timestamp).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}
							</td>
							<td>
								<div class="flex items-center gap-1.5 flex-wrap">
									{#if msg.messageType}
										<Badge variant={typeBadge(msg.messageType)} size="sm">{msg.messageType}</Badge>
										<Badge variant={prioBadge(msg.priority)} size="sm">{msg.priority}</Badge>
										{#if msg.confidence != null}
											<span class="text-2xs text-muted-foreground">{(msg.confidence * 100).toFixed(0)}%</span>
										{/if}
									{:else}
										<span class="text-2xs text-muted-foreground">-</span>
									{/if}
								</div>
							</td>
							<td class="text-end">
								<Button variant="dim" size="sm" disabled={classifying && selected === msg.id} onclick={() => classify(msg.id)}>
									<i class="ki-filled ki-abstract-26 text-sm"></i>
									{classifying && selected === msg.id ? '...' : 'Classify'}
								</Button>
							</td>
						</tr>
						{#if classification && selected === msg.id}
							<tr class="bg-muted">
								<td colspan="5" class="px-4 py-3">
									<div class="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs text-secondary-foreground">
										<div><span class="font-medium text-mono">Type:</span> {classification.message_type}</div>
										<div><span class="font-medium text-mono">Category:</span> {classification.category}</div>
										<div><span class="font-medium text-mono">Priority:</span> {classification.priority}</div>
										{#if classification.confidence != null}
											<div><span class="font-medium text-mono">Confidence:</span> {(classification.confidence * 100).toFixed(0)}%</div>
										{/if}
										<div class="md:col-span-4"><span class="font-medium text-mono">Summary:</span> {classification.summary}</div>
										{#if classification.evidence?.length}
											<div class="md:col-span-4"><span class="font-medium text-mono">Evidence:</span> {classification.evidence.join('; ')}</div>
										{/if}
										{#if classification.uncertainty?.length}
											<div class="md:col-span-4 text-warning"><span class="font-medium">Uncertainty:</span> {classification.uncertainty.join('; ')}</div>
										{/if}
									</div>
								</td>
							</tr>
						{/if}
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</Card>
