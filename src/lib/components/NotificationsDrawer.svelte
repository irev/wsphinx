<script lang="ts">
	import { onMount } from 'svelte';

	type Notification = {
		id: string;
		tab: 'pesan' | 'tiket' | 'sistem';
		icon: string;
		iconBg: string;
		title: string;
		description: string;
		timestamp: Date;
	};

	let activeTab = $state<'all' | 'pesan' | 'tiket' | 'sistem'>('all');
	let notifications = $state<Notification[]>([]);
	let unreadCount = $state(0);

	function relativeTime(d: Date): string {
		const now = Date.now();
		const diff = now - d.getTime();
		const mins = Math.floor(diff / 60000);
		if (mins < 1) return 'baru saja';
		if (mins < 60) return `${mins}m`;
		const hours = Math.floor(mins / 60);
		if (hours < 24) return `${hours}j`;
		const days = Math.floor(hours / 24);
		if (days === 1) return 'kemarin';
		if (days < 7) return `${days}hari`;
		return d.toLocaleDateString('id-ID');
	}

	function formatAuditAction(log: any): string {
		const actions: Record<string, string> = {
			'ticket.create': 'Tiket baru',
			'ticket.status_change': 'Status tiket',
			'ticket.close': 'Tiket ditutup',
			'ticket.note_added': 'Catatan tiket',
			'message.classify': 'Pesan diklasifikasi',
		};
		return actions[log.action] || log.action;
	}

	function formatAuditDesc(log: any): string {
		const detail = (() => { try { return JSON.parse(log.detail); } catch { return null; } })();
		if (log.action === 'ticket.create') return `Tiket dibuat oleh ${log.user?.name || 'Sistem'}`;
		if (log.action === 'ticket.status_change' && detail?.status) {
			return `${detail.status.from || '-'} → ${detail.status.to}`;
		}
		if (log.action === 'ticket.close') return `Ditutup oleh ${log.user?.name || 'Sistem'}${detail?.reason ? ': ' + detail.reason : ''}`;
		if (log.action === 'ticket.note_added') return `${log.user?.name || 'Sistem'} menambahkan catatan`;
		if (log.action === 'message.classify' && detail?.summary) return detail.summary;
		return log.detail || '';
	}

	async function fetchAll() {
		try {
			const [msgRes, auditRes] = await Promise.all([
				fetch('/api/messages?isRead=false&isActive=true&limit=20'),
				fetch('/api/audit?limit=30'),
			]);

			const items: Notification[] = [];
			let unread = 0;

			if (msgRes.ok) {
				const msgData = await msgRes.json();
				const msgs = msgData.data || [];
				unread += msgData.total || 0;
				for (const m of msgs.slice(0, 15)) {
					items.push({
						id: `msg-${m.id}`,
						tab: 'pesan',
						icon: 'ki-filled ki-messages',
						iconBg: 'bg-success/10 text-success',
						title: `Pesan dari ${m.fromName || m.fromPhone}`,
						description: m.body?.substring(0, 100) || '(media)',
						timestamp: new Date(m.timestamp),
					});
				}
			}

			if (auditRes.ok) {
				const auditData = await auditRes.json();
				const logs = auditData.data || [];
				unread += logs.length;
				for (const log of logs) {
					let tab: 'tiket' | 'sistem';
					let icon: string;
					let iconBg: string;

					if (['ticket.create', 'ticket.status_change', 'ticket.close', 'ticket.note_added'].includes(log.action)) {
						tab = 'tiket';
						icon = 'ki-filled ki-badge';
						if (log.action === 'ticket.create') iconBg = 'bg-primary/10 text-primary';
						else if (log.action === 'ticket.close') iconBg = 'bg-success/10 text-success';
						else if (log.action === 'ticket.note_added') iconBg = 'bg-info/10 text-info';
						else iconBg = 'bg-warning/10 text-warning';
					} else {
						tab = 'sistem';
						icon = 'ki-filled ki-abstract-26';
						iconBg = 'bg-muted/50 text-muted-foreground';
					}

					items.push({
						id: `audit-${log.id}`,
						tab,
						icon,
						iconBg,
						title: formatAuditAction(log),
						description: formatAuditDesc(log),
						timestamp: new Date(log.createdAt),
					});
				}
			}

			items.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
			notifications = items;
			unreadCount = unread;
		} catch {
			// silent
		}
	}

	onMount(() => {
		fetchAll();
		const interval = setInterval(fetchAll, 15000);
		return () => clearInterval(interval);
	});

	let filtered = $derived(
		activeTab === 'all' ? notifications : notifications.filter((n) => n.tab === activeTab)
	);

	function tabClass(tab: string) {
		return activeTab === tab
			? 'kt-btn kt-btn-sm rounded-full'
			: 'kt-btn kt-btn-sm kt-btn-soft rounded-full text-muted-foreground';
	}
</script>

<div
	class="hidden kt-drawer kt-drawer-end card flex-col max-w-[90%] w-[450px] top-5 bottom-5 end-5 rounded-xl border border-border"
	data-kt-drawer="true"
	data-kt-drawer-container="body"
	id="notifications_drawer"
	role="dialog"
	aria-modal="true"
	aria-label="Notifications"
>
	<div class="flex items-center justify-between gap-2.5 text-sm text-mono font-semibold px-5 py-2.5 border-b border-b-border shrink-0">
		Notifications
		<button class="kt-btn kt-btn-sm kt-btn-icon kt-btn-dim shrink-0" data-kt-drawer-dismiss="true" aria-label="Tutup notifikasi">
			<i class="ki-filled ki-cross"></i>
		</button>
	</div>

	<div class="flex items-center gap-1.5 px-5 pt-3 pb-2 border-b border-border shrink-0">
		<button class={tabClass('all')} onclick={() => activeTab = 'all'}>All</button>
		<button class={tabClass('pesan')} onclick={() => activeTab = 'pesan'}>Pesan</button>
		<button class={tabClass('tiket')} onclick={() => activeTab = 'tiket'}>Tiket</button>
		<button class={tabClass('sistem')} onclick={() => activeTab = 'sistem'}>Sistem</button>
	</div>

	<div class="grow overflow-y-auto min-h-0">
		{#if filtered.length === 0}
			<div class="flex flex-col items-center justify-center text-center px-5 py-12">
				<div class="flex items-center justify-center size-12 rounded-full bg-primary/10 mb-3">
					<i class="ki-filled ki-notification-status text-2xl text-primary"></i>
				</div>
				<p class="text-sm font-medium text-foreground">Belum ada notifikasi</p>
				<p class="text-2sm text-muted-foreground mt-1">Notifikasi akan muncul saat ada pesan atau tiket baru</p>
			</div>
		{:else}
			{#each filtered as item}
				<div class="flex items-start gap-3 px-5 py-3 border-b border-border/50 hover:bg-muted/20 transition-colors">
					<div class="size-8 rounded-full {item.iconBg} flex items-center justify-center shrink-0">
						<i class="{item.icon} text-xs"></i>
					</div>
					<div class="flex-1 min-w-0">
						<div class="flex items-center justify-between gap-2">
							<span class="text-xs font-medium text-foreground truncate">{item.title}</span>
							<span class="text-2xs text-muted-foreground shrink-0">{relativeTime(item.timestamp)}</span>
						</div>
						<p class="text-2xs text-muted-foreground mt-0.5 line-clamp-2">{item.description}</p>
					</div>
				</div>
			{/each}
		{/if}
	</div>

	{#if filtered.length > 0}
		<div class="flex items-center justify-center px-5 py-2.5 border-t border-border shrink-0">
			<span class="text-2xs text-muted-foreground">{filtered.length} notifikasi</span>
		</div>
	{/if}
</div>
