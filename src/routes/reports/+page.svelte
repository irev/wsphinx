<script lang="ts">
	import Button from '$lib/components/Button.svelte';

	let reports = $state<any[]>([]);
	let loading = $state(true);
	let generating = $state(false);
	let reportContent = $state<string | null>(null);

	async function load() {
		loading = true;
		const res = await fetch('/api/reports');
		if (res.ok) reports = (await res.json()).data || [];
		loading = false;
	}

	$effect(() => { load(); });

	async function generate(periodType: string) {
		generating = true;
		reportContent = null;
		const res = await fetch('/api/reports/support/generate', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ periodType }),
		});
		if (res.ok) {
			const data = await res.json();
			if (data.data) {
				const content = JSON.parse(data.data.content);
				reportContent = formatReport(content);
			}
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
		if (reportContent) await navigator.clipboard.writeText(reportContent);
	}
</script>

<div class="kt-card border border-border rounded-xl shadow-sm bg-card">
	<div class="kt-card-header">
		<div class="flex flex-col gap-0.5">
			<div class="kt-card-title text-lg font-semibold text-mono">Reports</div>
			<div class="kt-card-subtitle text-2sm text-muted-foreground">Generate dan lihat laporan rekap</div>
		</div>
	</div>
	<div class="kt-card-body">
		<div class="flex items-center gap-2 flex-wrap">
			<Button onclick={() => generate('daily')} disabled={generating}>
				<i class="ki-filled ki-calendar-tick text-sm"></i>
				{generating ? 'Generating...' : 'Daily'}
			</Button>
			<Button variant="outline" onclick={() => generate('weekly')} disabled={generating}>
				<i class="ki-filled ki-calendar-search text-sm"></i> Weekly
			</Button>
			<Button variant="outline" onclick={() => generate('monthly')} disabled={generating}>
				<i class="ki-filled ki-calendar text-sm"></i> Monthly
			</Button>
		</div>
	</div>
</div>

{#if reportContent}
	<div class="kt-card border border-border rounded-xl shadow-sm bg-card">
		<div class="kt-card-header">
			<div class="flex flex-col gap-0.5">
				<div class="kt-card-title text-lg font-semibold text-mono">Generated Report</div>
				<div class="kt-card-subtitle text-2sm text-muted-foreground">Hasil generate rekap</div>
			</div>
			<div class="flex items-center gap-2 shrink-0">
				<Button variant="dim" size="sm" onclick={copyReport}>
					<i class="ki-filled ki-copy text-sm"></i> Copy
				</Button>
			</div>
		</div>
		<div class="kt-card-body">
			<pre class="text-sm text-secondary-foreground whitespace-pre-wrap font-mono bg-muted rounded-lg p-4 max-h-[500px] overflow-auto">{reportContent}</pre>
		</div>
	</div>
{/if}

{#if loading}
	<div class="flex items-center justify-center py-10"><div class="kt-spinner-ring size-6"></div></div>
{:else}
	<div class="kt-card border border-border rounded-xl shadow-sm bg-card">
		<div class="kt-card-header">
			<div class="flex flex-col gap-0.5">
				<div class="kt-card-title text-lg font-semibold text-mono">Laporan Tersimpan</div>
				<div class="kt-card-subtitle text-2sm text-muted-foreground">Riwayat report yang sudah di-generate</div>
			</div>
		</div>
		{#if reports.length === 0}
			<div class="kt-card-body">
				<div class="kt-empty">
					<i class="ki-filled ki-chart-simple kt-empty-icon text-3xl"></i>
					<p class="kt-empty-text">Belum ada laporan tersimpan</p>
				</div>
			</div>
		{:else}
			<div class="kt-scrollable-x-auto">
				<table class="kt-table kt-table-border w-full">
					<thead>
						<tr>
							<th><span class="kt-table-col"><span class="kt-table-col-label">Judul</span></span></th>
							<th><span class="kt-table-col"><span class="kt-table-col-label">Tipe</span></span></th>
							<th><span class="kt-table-col"><span class="kt-table-col-label">Tanggal</span></span></th>
						</tr>
					</thead>
					<tbody>
						{#each reports as report}
							<tr class="hover:bg-muted/30 transition-colors">
								<td class="text-sm font-medium text-foreground">{report.title}</td>
								<td><span class="kt-badge kt-badge-sm kt-badge-outline uppercase">{report.periodType}</span></td>
								<td class="text-sm text-muted-foreground">{new Date(report.generatedAt).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</div>
{/if}
