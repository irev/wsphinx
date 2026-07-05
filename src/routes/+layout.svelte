<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { afterNavigate } from '$app/navigation';
	import Header from '$lib/components/Header.svelte';
	import Navbar from '$lib/components/Navbar.svelte';
	import TicketFormDrawer from '$lib/components/TicketFormDrawer.svelte';
	import Toast from '$lib/components/Toast.svelte';
	import NotificationsDrawer from '$lib/components/NotificationsDrawer.svelte';
	import ScrollToTop from '$lib/components/ScrollToTop.svelte';

	let { children } = $props();

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
		if (path === '/') return 'Dashboard';
		const parts = path.split('/').filter(Boolean);
		return parts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' / ');
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>WhatsApp Tech Support</title>
</svelte:head>

<div class="flex grow flex-col in-data-[kt-sticky-header=on]:pt-(--header-height)">
	<Header {currentPage} />
	<Navbar />

	<div class="w-full flex px-0">
		<main class="flex flex-col grow" id="content">
			<div class="mb-3 lg:mb-4">
				<div class="kt-container-fixed flex items-center justify-between flex-wrap gap-3">
					<h1 class="font-medium text-base text-mono">{currentPage || 'Dashboard'}</h1>
				</div>
			</div>

			<div class="kt-container-fixed">
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

<style>
	:global(.kt-menu-item.show.kt-menu-item-dropdown > .kt-menu-dropdown) {
		display: flex;
	}
</style>