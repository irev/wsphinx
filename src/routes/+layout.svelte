<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { afterNavigate } from '$app/navigation';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import Header from '$lib/components/Header.svelte';
	import TicketFormDrawer from '$lib/components/TicketFormDrawer.svelte';

	let { children } = $props();

	onMount(() => {
		function loadScript(src: string) {
			return new Promise<void>((resolve, reject) => {
				const s = document.createElement('script');
				s.src = src;
				s.onload = () => resolve();
				s.onerror = () => reject();
				document.body.appendChild(s);
			});
		}

		async function initMetronic() {
			try {
				await loadScript('assets/vendor/ktui/ktui.min.js');
				await loadScript('assets/js/core.bundle.js');
				if (typeof KTComponents !== 'undefined') {
					KTComponents.init();
				}
			} catch {
				// silently fail if scripts not available
			}
		}

		initMetronic();

		afterNavigate(() => {
			if (typeof KTComponents !== 'undefined') {
				KTComponents.init();
			}
		});
	});

	let currentPage = $derived.by(() => {
		const path = $page.url.pathname;
		if (path === '/') return 'Dashboard';
		const parts = path.split('/').filter(Boolean);
		return parts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' / ');
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>WhatsApp Tech Support</title>
</svelte:head>

<div class="flex grow flex-col in-data-kt-[sticky-header=on]:pt-(--header-height)">
	<Header {currentPage} />

	<div class="flex grow lg:flex-row flex-col">
		<Sidebar />

		<main class="flex flex-col grow" id="content">
			<div class="mb-5 lg:mb-7.5">
				<div class="kt-container-fluid flex items-center justify-between flex-wrap gap-5">
					<div class="flex items-center flex-wrap gap-1 lg:gap-5">
						<h1 class="font-medium text-lg text-mono">{currentPage || 'Dashboard'}</h1>
					</div>
				</div>
			</div>

			<div class="kt-container-fluid">
				<div class="grid gap-5 lg:gap-7.5">
					{@render children()}
				</div>
			</div>

			<footer class="footer mt-auto">
				<div class="kt-container-fluid">
					<div class="flex flex-col md:flex-row justify-center md:justify-between items-center gap-3 py-5">
						<div class="flex order-2 md:order-1 gap-2 font-normal text-sm">
							<span class="text-muted-foreground">{new Date().getFullYear()}&copy;</span>
							<a class="text-secondary-foreground hover:text-primary" href="/">WhatsApp Tech Support</a>
						</div>
						<nav class="flex order-1 md:order-2 gap-4 font-normal text-sm text-secondary-foreground">
							<a class="hover:text-primary" href="/">Dashboard</a>
							<a class="hover:text-primary" href="/inbox">Inbox</a>
							<a class="hover:text-primary" href="/tickets">Tickets</a>
							<a class="hover:text-primary" href="/reports">Reports</a>
						</nav>
					</div>
				</div>
			</footer>
		</main>
	</div>
</div>

<TicketFormDrawer />

<div class="hidden kt-drawer kt-drawer-end card flex-col max-w-[90%] w-[450px] top-5 bottom-5 end-5 rounded-xl border border-border" data-kt-drawer="true" data-kt-drawer-container="body" id="notifications_drawer">
	<div class="flex items-center justify-between gap-2.5 text-sm text-mono font-semibold px-5 py-2.5 border-b border-b-border">
		Notifications
		<button class="kt-btn kt-btn-sm kt-btn-icon kt-btn-dim shrink-0" data-kt-drawer-dismiss="true" aria-label="Tutup notifikasi">
			<i class="ki-filled ki-cross"></i>
		</button>
	</div>
	<div class="flex items-center gap-1.5 px-5 pt-3 pb-2 border-b border-border">
		<button class="kt-btn kt-btn-sm rounded-full">All</button>
		<button class="kt-btn kt-btn-sm kt-btn-soft rounded-full text-muted-foreground">Pesan</button>
		<button class="kt-btn kt-btn-sm kt-btn-soft rounded-full text-muted-foreground">Tiket</button>
		<button class="kt-btn kt-btn-sm kt-btn-soft rounded-full text-muted-foreground">Sistem</button>
	</div>
	<div class="grow flex flex-col items-center justify-center text-center px-5">
		<div class="flex items-center justify-center size-16 rounded-full bg-primary/10 mb-3">
			<i class="ki-filled ki-notification-status text-2xl text-primary"></i>
		</div>
		<p class="text-sm font-medium text-foreground">Belum ada notifikasi</p>
		<p class="text-2sm text-muted-foreground mt-1">Notifikasi akan muncul saat ada pesan atau tiket baru</p>
	</div>
</div>

<style>
	/* Override Metronic CSS for Svelte-controlled dropdowns & accordions */
	:global(.kt-menu-item.kt-menu-item-show > .kt-menu-dropdown) {
		display: flex !important;
	}
	:global(.kt-menu-item.kt-menu-item-show > .kt-menu-accordion) {
		display: flex !important;
	}
</style>
