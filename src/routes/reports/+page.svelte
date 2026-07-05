<script lang="ts">
	import Button from '$lib/components/Button.svelte';
	import Card from '$lib/components/Card.svelte';
	import { showToast } from '$lib/stores/toast';

	let reports = $state<any[]>([]);
	let loading = $state(true);
	let generating = $state(false);
	let reportContent = $state<string | null>(null);
	let reportRaw = $state<any>(null);

	let periodType = $state('daily');
	let periodDate = $state(new Date().toISOString().slice(0, 10));

	async function load() {
		loading = true;
		const res = await fetch('/api/reports');
		if (res.ok) reports = (await res.json()).data || [];
		loading = false;
	}

	$effect(() => { load(); });

	async function generate() {
		generating = true;
		reportContent = null;
		reportRaw = null;
		const res = await fetch('/api/reports/support/generate', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ periodType }),
		});
		if (res.ok) {
			const data = await res.json();
			if (data.data) {
				reportRaw = JSON.parse(data.data.content);
				reportContent = formatReport(reportRaw);
			}
		} else {
			showToast('error', 'Gagal generate laporan');
		}
		generating = false;
		await load();
	}

	function formatReport(content: any): string {
		const s = content.summary;
		let text = `# Rekap Technical Support\n\n`;
		text += `Periode: ${content.period?.start?.substring(0, 10)} — ${content.period?.end?.substring(0, 10)}\n\n`;
		text += `## Ringkasan\n`;
		text += `- Total laporan: ${s.totalLaporan}\n- Tiket baru: ${s.tiketBaru}\n- Tiket selesai: ${s.tiketSelesai}\n`;
		text += `- Tiket masih open: ${s.tiketOpen}\n- Tiket kritikal: ${s.tiketKritikal}\n`;
		text += `- Masalah dominan: ${s.masalahDominan}\n- PIC tersibuk: ${s.picTersibuk}\n\n`;
		if (content.openTickets?.length) {
			text += `## Tiket Perlu Follow-up\n`;
			text += `| Ticket | Masalah | Status |\n|---|---|---|\n`;
			for (const t of content.openTickets) {
				text += `| ${t.ticketNumber} | ${t.title} | ${t.status} |\n`;
			}
		}
		return text;
	}

	async function copyReport() {
		if (reportContent) {
			await navigator.clipboard.writeText(reportContent);
			showToast('success', 'Tersalin ke clipboard');
		}
	}

	function downloadReport() {
		if (!reportContent) return;
		const blob = new Blob([reportContent], { type: 'text/markdown' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `rekap-${periodType}-${periodDate}.md`;
		a.click();
		URL.revokeObjectURL(url);
	}

	const periodLabels: Record<string, string> = {
		daily: 'Harian', weekly: 'Mingguan', monthly: 'Bulanan',
	};
</script>

<Card title="Generate Laporan" subtitle="Pilih periode dan buat laporan rekap support">
	<div class="flex flex-col gap-4">
		<div class="flex items-center gap-3 flex-wrap">
			<select bind:value={periodType} class="wt-filter-select w-auto">
				<option value="daily">Daily</option>
				<option value="weekly">Weekly</option>
				<option value="monthly">Monthly</option>
			</select>
			<input type="date" bind:value={periodDate} class="wt-filter-input w-36" />
			<Button onclick={generate} disabled={generating}>
				<i class="ki-filled ki-calendar-tick text-sm"></i>
				{generating ? 'Generating...' : 'Generate Laporan'}
			</Button>
		</div>

		{#if reportRaw}
			{@const s = reportRaw.summary}
			<div class="rounded-lg border border-border p-5 space-y-4">
				<div class="flex items-center justify-between">
					<div>
						<h3 class="text-sm font-semibold text-mono">Laporan {periodLabels[periodType]}</h3>
						<p class="text-2xs text-muted-foreground">
							{reportRaw.period?.start?.substring(0, 10)} — {reportRaw.period?.end?.substring(0, 10)}
						</p>
					</div>
					<div class="flex items-center gap-2">
						<Button variant="dim" size="sm" onclick={copyReport}>
							<i class="ki-filled ki-copy text-sm"></i> Copy
						</Button>
						<Button variant="dim" size="sm" onclick={downloadReport}>
							<i class="ki-filled ki-exit-down text-sm"></i> Download
						</Button>
					</div>
				</div>

				<div class="grid grid-cols-2 md:grid-cols-4 gap-4">
					<div class="text-center p-3 rounded-lg bg-muted/30">
						<div class="text-lg font-bold text-primary">{s.totalLaporan}</div>
						<div class="text-2xs text-muted-foreground">Total Laporan</div>
					</div>
					<div class="text-center p-3 rounded-lg bg-muted/30">
						<div class="text-lg font-bold text-primary">{s.tiketBaru}</div>
						<div class="text-2xs text-muted-foreground">Tiket Baru</div>
					</div>
					<div class="text-center p-3 rounded-lg bg-muted/30">
						<div class="text-lg font-bold text-success">{s.tiketSelesai}</div>
						<div class="text-2xs text-muted-foreground">Tiket Selesai</div>
					</div>
					<div class="text-center p-3 rounded-lg bg-muted/30">
						<div class="text-lg font-bold text-destructive">{s.tiketKritikal}</div>
						<div class="text-2xs text-muted-foreground">Kritikal</div>
					</div>
				</div>

				<div class="grid grid-cols-2 gap-4 text-xs text-secondary-foreground">
					<div class="flex items-center gap-2 p-2 rounded-lg bg-muted/20">
						<i class="ki-filled ki-folder text-primary text-sm"></i>
						<span>Masalah dominan: <strong class="text-foreground">{s.masalahDominan}</strong></span>
					</div>
					<div class="flex items-center gap-2 p-2 rounded-lg bg-muted/20">
						<i class="ki-filled ki-people text-primary text-sm"></i>
						<span>PIC tersibuk: <strong class="text-foreground">{s.picTersibuk}</strong></span>
					</div>
				</div>

				{#if reportRaw.openTickets?.length}
					<div>
						<h4 class="text-xs font-semibold text-mono mb-2">Tiket Perlu Follow-up</h4>
						<div class="overflow-x-auto">
							<table class="kt-table kt-table-border text-xs w-full">
								<thead>
									<tr>
										<th class="w-20">Ticket</th>
										<th>Masalah</th>
										<th class="w-20">Status</th>
									</tr>
								</thead>
								<tbody>
									{#each reportRaw.openTickets as t}
										<tr class="hover:bg-muted/30 transition-colors">
											<td class="font-mono text-foreground">{t.ticketNumber}</td>
											<td class="text-foreground">{t.title}</td>
											<td>{t.status}</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					</div>
				{/if}

				<details class="text-xs text-muted-foreground">
					<summary class="cursor-pointer hover:text-foreground">Lihat mentah laporan</summary>
					<pre class="mt-2 p-3 rounded-lg bg-muted font-mono text-xs whitespace-pre-wrap max-h-40 overflow-auto">{reportContent}</pre>
				</details>
			</div>
		{/if}
	</div>
</Card>

{#if loading}
	<div class="flex items-center justify-center py-10"><div class="wt-spinner-ring size-6"></div></div>
{:else}
	<Card title="Laporan Tersimpan" subtitle="Riwayat report yang sudah di-generate">
		{#if reports.length === 0}
			<div class="wt-empty">
				<i class="ki-filled ki-chart-simple wt-empty-icon text-3xl"></i>
				<p class="wt-empty-text">Belum ada laporan tersimpan</p>
			</div>
		{:else}
			<div class="kt-scrollable-x-auto">
				<table class="kt-table kt-table-border w-full">
					<thead>
						<tr>
							<th><span class="kt-table-col"><span class="kt-table-col-label">Judul</span></span></th>
							<th><span class="kt-table-col"><span class="kt-table-col-label">Tipe</span></span></th>
							<th><span class="kt-table-col"><span class="kt-table-col-label">Tanggal</span></span></th>
							<th class="w-20"><span class="kt-table-col justify-center"><span class="kt-table-col-label">Aksi</span></span></th>
						</tr>
					</thead>
					<tbody>
						{#each reports as report}
							<tr class="hover:bg-muted/30 transition-colors">
								<td class="text-sm font-medium text-foreground">{report.title}</td>
								<td><span class="kt-badge kt-badge-sm kt-badge-outline uppercase">{report.periodType}</span></td>
								<td class="text-sm text-muted-foreground">{new Date(report.generatedAt).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}</td>
								<td class="text-center">
									<button onclick={() => {
										if (report.data?.content) {
											try {
												const c = JSON.parse(report.data.content);
												reportRaw = c;
												reportContent = formatReport(c);
											} catch {}
										}
									}} class="kt-btn kt-btn-icon kt-btn-sm" aria-label="Lihat laporan">
										<i class="ki-filled ki-eye text-sm text-muted-foreground"></i>
									</button>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</Card>
{/if}