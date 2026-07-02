<script lang="ts">
	import { onMount } from 'svelte';

	let { currentPage = '' } = $props();

	let openMenu = $state<string | null>(null);

	function toggle(menu: string, e: Event) {
		e.stopPropagation();
		openMenu = openMenu === menu ? null : menu;
	}

	function menuClass(menu: string) {
		return openMenu === menu ? 'kt-menu-item-show' : '';
	}

	onMount(() => {
		function onOutside(e: MouseEvent) {
			if (openMenu) {
				const target = e.target as HTMLElement;
				if (!target.closest('.kt-menu-item')) {
					openMenu = null;
				}
			}
		}
		window.addEventListener('mousedown', onOutside);
		return () => window.removeEventListener('mousedown', onOutside);
	});
</script>

<header
	class="flex items-center transition-[height] shrink-0 bg-background h-(--header-height)"
	data-kt-sticky="true"
	data-kt-sticky-class="transition-[height] fixed z-10 top-0 left-0 right-0 shadow-xs backdrop-blur-md bg-white/70 dark:bg-background/70 border-b border-border"
	data-kt-sticky-name="header"
	data-kt-sticky-offset="100px"
	id="header"
>
	<div class="kt-container-fluid flex flex-wrap justify-between items-center lg:gap-4" id="header_container">
		<div class="flex items-center gap-2 lg:gap-5">
			<button class="kt-btn kt-btn-icon kt-btn-ghost -ms-2 lg:hidden" data-kt-drawer-toggle="#sidebar" aria-label="Toggle sidebar">
				<i class="ki-filled ki-menu"></i>
			</button>
			<a href="/">
				<img class="dark:hidden min-h-[34px]" src="/assets/media/app/mini-logo-circle.svg" alt="WATS" />
				<img class="hidden dark:inline-block min-h-[34px]" src="/assets/media/app/mini-logo-circle-dark.svg" alt="WATS" />
			</a>
			<div class="hidden lg:flex items-center">
				<div class="kt-menu kt-menu-default">
					<div class="kt-menu-item {menuClass('pages')}">
						<button class="kt-menu-toggle text-mono text-sm font-medium" onclick={(e) => toggle('pages', e)}>
							{currentPage || 'Dashboard'}
							<span class="kt-menu-arrow">
								<i class="ki-filled ki-down"></i>
							</span>
						</button>
						{#if openMenu === 'pages'}
							<div class="kt-menu-dropdown w-48 py-2">
								<div class="kt-menu-item">
									<a class="kt-menu-link" href="/" tabindex="0">
										<span class="kt-menu-icon"><i class="ki-filled ki-element-11"></i></span>
										<span class="kt-menu-title">Dashboard</span>
									</a>
								</div>
								<div class="kt-menu-item">
									<a class="kt-menu-link" href="/inbox" tabindex="0">
										<span class="kt-menu-icon"><i class="ki-filled ki-messages"></i></span>
										<span class="kt-menu-title">Inbox</span>
									</a>
								</div>
								<div class="kt-menu-item">
									<a class="kt-menu-link" href="/tickets" tabindex="0">
										<span class="kt-menu-icon"><i class="ki-filled ki-badge"></i></span>
										<span class="kt-menu-title">Tickets</span>
									</a>
								</div>
								<div class="kt-menu-item">
									<a class="kt-menu-link" href="/reports" tabindex="0">
										<span class="kt-menu-icon"><i class="ki-filled ki-chart-simple"></i></span>
										<span class="kt-menu-title">Reports</span>
									</a>
								</div>
							</div>
						{/if}
					</div>
				</div>
				<span class="text-sm text-muted-foreground font-medium px-2.5 hidden md:inline">/</span>
				<div class="kt-menu kt-menu-default">
					<div class="kt-menu-item {menuClass('settings')}">
						<button class="kt-menu-toggle text-secondary-foreground text-sm font-medium" onclick={(e) => toggle('settings', e)}>
							Pengaturan
							<span class="kt-menu-arrow"><i class="ki-filled ki-down"></i></span>
						</button>
						{#if openMenu === 'settings'}
							<div class="kt-menu-dropdown w-48 py-2">
								<div class="kt-menu-item">
									<a class="kt-menu-link" href="/settings" tabindex="0">
										<span class="kt-menu-icon"><i class="ki-filled ki-setting-2"></i></span>
										<span class="kt-menu-title">Settings</span>
									</a>
								</div>
								<div class="kt-menu-item">
									<a class="kt-menu-link" href="/audit" tabindex="0">
										<span class="kt-menu-icon"><i class="ki-filled ki-security-user"></i></span>
										<span class="kt-menu-title">Audit Log</span>
									</a>
								</div>
							</div>
						{/if}
					</div>
				</div>
				<span class="text-sm text-muted-foreground font-medium px-2.5">/</span>
				<div class="kt-menu kt-menu-default">
					<div class="kt-menu-item {menuClass('whatsapp')}">
						<button class="kt-menu-toggle text-secondary-foreground text-sm font-medium" onclick={(e) => toggle('whatsapp', e)}>
							WhatsApp
							<span class="kt-menu-arrow"><i class="ki-filled ki-down"></i></span>
						</button>
						{#if openMenu === 'whatsapp'}
							<div class="kt-menu-dropdown w-48 py-2">
								<div class="kt-menu-item">
									<a class="kt-menu-link" href="/inbox" tabindex="0">
										<span class="kt-menu-icon"><i class="ki-filled ki-messages"></i></span>
										<span class="kt-menu-title">Pesan Masuk</span>
									</a>
								</div>
								<div class="kt-menu-item">
									<a class="kt-menu-link" href="/tickets" tabindex="0">
										<span class="kt-menu-icon"><i class="ki-filled ki-badge"></i></span>
										<span class="kt-menu-title">Tiket Terbuka</span>
									</a>
								</div>
							</div>
						{/if}
					</div>
				</div>
			</div>
		</div>
		<div class="flex items-center gap-3">
			<button class="kt-btn kt-btn-outline" data-kt-drawer-toggle="#ticket_form_drawer">
				<i class="ki-filled ki-badge"></i>
				<span class="hidden md:inline">Tiket Baru</span>
			</button>
			<div class="flex items-center gap-1">
				<button class="kt-btn kt-btn-ghost kt-btn-icon size-9 rounded-full hover:bg-transparent hover:[&_i]:text-primary" data-kt-drawer-toggle="#notifications_drawer" aria-label="Notifications">
					<i class="ki-filled ki-notification-status text-lg"></i>
				</button>
				<div class="flex items-center gap-2 ps-2 lg:ps-4 border-s border-border">
					<div class="kt-avatar" data-kt-indicator="online">
						<div class="kt-avatar-image size-[34px] rounded-full bg-primary flex items-center justify-center text-white text-xs font-semibold">R</div>
					</div>
					<div class="hidden lg:flex flex-col">
						<span class="text-sm font-medium text-foreground leading-none">PIC Satu</span>
						<span class="text-2xs font-normal text-muted-foreground mt-0.5">Teknisi</span>
					</div>
				</div>
			</div>
		</div>
	</div>
</header>
