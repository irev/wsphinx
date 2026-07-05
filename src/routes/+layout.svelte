<script lang="ts">
	import '$lib/app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { afterNavigate, goto } from '$app/navigation';
	import { auth } from '$lib/stores/auth.svelte';
	import Header from '$lib/components/Header.svelte';
	import Navbar from '$lib/components/Navbar.svelte';
	import TicketFormDrawer from '$lib/components/TicketFormDrawer.svelte';
	import Toast from '$lib/components/Toast.svelte';
	import NotificationsDrawer from '$lib/components/NotificationsDrawer.svelte';
	import ScrollToTop from '$lib/components/ScrollToTop.svelte';

	let { children } = $props();

	let ready = $state(false);

	$effect(() => {
		if (!auth.loading && auth.user) ready = true;
	});

	$effect(() => {
		if (!auth.loading && !auth.user && $page.url.pathname !== '/login') {
			goto(`/login?redirect=${encodeURIComponent($page.url.pathname)}`, { replaceState: true });
		}
	});

	onMount(() => {
		document.body.classList.add(
			'antialiased', 'flex', 'h-full', 'text-base', 'text-foreground', 'bg-background'
		);

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
    if (path === '/login') return { title: 'Login', subtitle: '' };
    if (path === '/') return { title: 'Dashboard', subtitle: 'Ringkasan kinerja support dan status koneksi WhatsApp' };
    const parts = path.split('/').filter(Boolean);
    const titles: Record<string, string> = {
      inbox: 'Pesan',
      tickets: 'Tickets',
      reports: 'Reports',
      settings: 'Settings',
      sources: 'Sources',
      audit: 'Audit',
      timeline: 'Riwayat',
    };
    const subtitles: Record<string, string> = {
      inbox: 'Pesan WhatsApp masuk yang menunggu klasifikasi dan tindakan',
      tickets: 'Kelola tiket support dari awal hingga selesai',
      reports: 'Rekap laporan support harian, mingguan, dan bulanan',
      settings: 'Pengaturan master data, koneksi WhatsApp, dan pemrosesan',
      sources: 'Daftar grup dan kontak WhatsApp untuk monitoring percakapan',
      audit: 'Riwayat perubahan dan aktivitas dalam sistem',
      timeline: 'Linimasa perubahan tiket dan aktivitas sistem',
    };
    const key = parts[0]?.toLowerCase();
    const autoTitle = parts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' / ');
    return {
      title: key ? (titles[key] || autoTitle) : autoTitle,
      subtitle: subtitles[key] || '',
    };
  });
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>{currentPage.title} — WhatsApp Tech Support</title>
</svelte:head>

{#if auth.loading}
	<div class="min-h-screen flex items-center justify-center bg-background">
		<div class="flex flex-col items-center gap-3">
			<span class="size-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></span>
			<span class="text-sm text-muted-foreground">Memeriksa session...</span>
		</div>
	</div>
{:else if $page.url.pathname === '/login'}
	{@render children()}
{:else if ready}
	<div class="flex grow flex-col in-data-[kt-sticky-header=on]:pt-(--header-height)">
		<Header currentPage={currentPage.title} />
		<Navbar />

		<div class="w-full flex px-0">
			<main class="flex flex-col grow" id="content">
				<div class="kt-container-fixed pb-7.5">
					<div class="flex flex-wrap items-center lg:items-end justify-between gap-5">
						<div class="flex flex-col justify-center gap-2">
							<h1 class="text-xl font-medium leading-none text-mono">{currentPage.title || 'Dashboard'}</h1>
							{#if currentPage.subtitle}
								<div class="text-sm font-normal text-secondary-foreground">{currentPage.subtitle}</div>
							{/if}
						</div>
					</div>
				</div>

				<div class="kt-container-fixed mb-3 lg:mb-4">
					<div class="flex flex-col gap-5 lg:gap-7.5">
						{@render children()}
					</div>
				</div>

				<footer class="mt-auto">
					<div class="kt-container-fixed">
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
	<Toast />
	<NotificationsDrawer />
	<ScrollToTop />
{/if}

<style>
	:global(.kt-menu-item.show.kt-menu-item-dropdown > .kt-menu-dropdown) {
		display: flex;
	}
</style>
