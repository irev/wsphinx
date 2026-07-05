<script lang="ts">
	import { onMount } from 'svelte';

	let { currentPage = '' } = $props();

	let waStatus = $state<string>('unknown');
	let unreadCount = $state(0);

	async function checkUnread() {
		try {
			const res = await fetch('/api/messages?isRead=false&limit=1');
			if (res.ok) {
				const data = await res.json();
				unreadCount = data.total || 0;
			}
		} catch {}
	}

	onMount(() => {
		checkUnread();
		const interval = setInterval(checkUnread, 30000);
		return () => clearInterval(interval);
	});

	function statusColor(s: string) {
		if (s === 'connected') return 'bg-success';
		if (s === 'scanning_qr' || s === 'reconnecting') return 'bg-warning';
		if (s === 'expired') return 'bg-destructive';
		if (s === 'worker_offline') return 'bg-destructive';
		if (s === 'initializing') return 'bg-warning';
		return 'bg-muted-foreground/30';
	}

	function statusTitle(s: string) {
		const m: Record<string, string> = {
			connected: 'WhatsApp terhubung',
			scanning_qr: 'Scan QR code',
			reconnecting: 'Menghubungkan ulang...',
			expired: 'Sesi expired',
			disconnected: 'Terputus',
			initializing: 'Menghubungkan ke WhatsApp...',
			worker_offline: 'Worker tidak berjalan',
		};
		return m[s] || 'Worker tidak berjalan';
	}

	onMount(() => {
		const fn = async () => {
			try {
				const res = await fetch('/api/whatsapp/status');
				if (res.ok) waStatus = (await res.json()).status || 'unknown';
			} catch {}
		};
		fn();
		const interval = setInterval(fn, 10000);
		return () => clearInterval(interval);
	});
</script>

<header
	class="flex items-center transition-[height] shrink-0 bg-background h-(--header-height)"
	data-kt-sticky="true"
	data-kt-sticky-class="transition-[height] fixed z-10 top-0 left-0 right-0 shadow-xs backdrop-blur-md bg-background/70 border border-border"
	data-kt-sticky-name="header"
	data-kt-sticky-offset="100px"
	id="header"
>
	<div class="kt-container-fixed flex lg:justify-between items-center gap-2.5">
		<div class="flex items-center gap-1 lg:w-[400px] grow lg:grow-0">
			<button class="kt-btn kt-btn-icon kt-btn-ghost -ms-2.5 lg:hidden" data-kt-drawer-toggle="#navbar" aria-label="Toggle navbar">
				<i class="ki-filled ki-menu"></i>
			</button>
			<div class="flex items-center gap-2">
				<a class="flex items-center shrink-0" href="/">
					<img class="dark:hidden w-8 shrink-0" src="/assets/media/app/mini-logo-circle.svg" alt="WATS" />
					<img class="hidden dark:inline-block w-8 shrink-0" src="/assets/media/app/mini-logo-circle-dark.svg" alt="WATS" />
				</a>
				<h3 class="text-mono text-lg font-medium hidden md:block">WhatsApp Tech Support</h3>
			</div>
		</div>
		<div class="flex items-center gap-2 lg:gap-3.5 lg:w-[400px] justify-end">
			<button class="kt-btn kt-btn-outline" data-kt-drawer-toggle="#ticket_form_drawer">
				<i class="ki-filled ki-badge"></i>
				<span class="hidden md:inline">Tiket Baru</span>
			</button>
			<div class="flex items-center gap-1">
				<button class="kt-btn kt-btn-ghost kt-btn-icon size-9 rounded-full hover:bg-transparent hover:[&_i]:text-primary relative" data-kt-drawer-toggle="#notifications_drawer" aria-label="Notifications">
					<i class="ki-filled ki-notification-status text-lg"></i>
					{#if unreadCount > 0}
						<span class="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-[10px] font-semibold text-primary-foreground leading-none">
							{unreadCount > 99 ? '99+' : unreadCount}
						</span>
					{/if}
				</button>
				<div class="flex items-center gap-2 ps-2 lg:ps-4 border-s border-border" title={statusTitle(waStatus)}>
				<div class="kt-avatar-image size-[34px] rounded-full bg-primary flex items-center justify-center text-white text-xs font-semibold">R</div>
				<div class="hidden lg:flex flex-col">
					<span class="text-sm font-medium text-foreground leading-none flex items-center gap-1.5">
						<span class="size-2 rounded-full {statusColor(waStatus)} {waStatus === 'connected' ? 'animate-ping' : ''}"></span>
						PIC Satu
					</span>
						<span class="text-2xs font-normal text-muted-foreground mt-0.5">Teknisi</span>
					</div>
				</div>
			</div>
		</div>
	</div>
</header>