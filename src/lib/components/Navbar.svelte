<script lang="ts">
	import { page } from '$app/stores';

	let currentPath = $derived($page.url.pathname);
	let openMenu = $state<string | null>(null);
	let openTimer: ReturnType<typeof setTimeout> | undefined = $state();
	let closeTimer: ReturnType<typeof setTimeout> | undefined = $state();

	function isActive(path: string) { return currentPath === path; }
	function isInGroup(paths: string[]) { return paths.some(p => currentPath === p || currentPath.startsWith(p + '/')); }

	function linkClass(path: string) {
		return [
			'kt-menu-link lg:py-3.5 border-b border-b-transparent text-foreground kt-menu-item-hover:text-mono kt-menu-item-here:text-mono',
			isActive(path) ? 'kt-menu-item-active:border-b-mono kt-menu-item-active:text-mono' : '',
		].join(' ');
	}

	function groupClass(paths: string[]) {
		return [
			'kt-menu-link lg:py-3.5 border-b border-b-transparent text-foreground kt-menu-item-hover:text-mono kt-menu-item-here:text-mono',
			isInGroup(paths) ? 'kt-menu-item-active:border-b-mono kt-menu-item-active:text-mono' : '',
		].join(' ');
	}

	function open(name: string) {
		if (closeTimer) clearTimeout(closeTimer);
		closeTimer = undefined;
		if (!openTimer) {
			openTimer = setTimeout(() => {
				openMenu = name;
				openTimer = undefined;
			}, 80);
		}
	}

	function scheduleClose() {
		if (openTimer) clearTimeout(openTimer);
		openTimer = undefined;
		closeTimer = setTimeout(() => {
			openMenu = null;
			closeTimer = undefined;
		}, 250);
	}

	function toggle(name: string) {
		if (openTimer) clearTimeout(openTimer);
		openTimer = undefined;
		if (closeTimer) clearTimeout(closeTimer);
		closeTimer = undefined;
		openMenu = openMenu === name ? null : name;
	}
</script>

<div
	class="bg-muted hidden lg:flex lg:items-stretch border-y border-input lg:mb-5 [--kt-drawer-enable:true] lg:[--kt-drawer-enable:false]"
	data-kt-drawer="true"
	data-kt-drawer-class="kt-drawer kt-drawer-start fixed z-40 top-0 bottom-0 w-full me-5 max-w-[300px] p-5 lg:p-0 overflow-auto"
	id="navbar"
>
	<div class="flex lg:hidden items-center justify-between mb-4 px-1">
		<span class="text-sm font-semibold text-mono">Menu</span>
		<button class="kt-btn kt-btn-sm kt-btn-icon kt-btn-dim" data-kt-drawer-dismiss="true" aria-label="Tutup menu">
			<i class="ki-filled ki-cross"></i>
		</button>
	</div>
	<div class="kt-container-fixed lg:flex lg:flex-wrap lg:justify-between lg:items-center gap-2 px-0 lg:px-7.5">
		<div class="kt-menu items-stretch flex-col lg:flex-row gap-5 lg:gap-7.5 grow lg:grow-0" id="mega_menu">

			<!-- Dashboard -->
			<div class="kt-menu-item {isActive('/') ? 'active' : ''}">
				<a class={linkClass('/')} href="/">
					<span class="kt-menu-title font-medium text-foreground text-sm">Dashboard</span>
				</a>
			</div>

			<!-- Pesan — hover dropdown desktop, click accordion mobile -->
			<div
				class="kt-menu-item relative {isInGroup(['/inbox', '/timeline']) ? 'active' : ''}"
				class:show={openMenu === 'pesan'}
				class:kt-menu-item-dropdown={openMenu === 'pesan'}
				onmouseenter={() => { if (window.innerWidth >= 1024) open('pesan'); }}
				onmouseleave={() => { if (window.innerWidth >= 1024) scheduleClose(); }}
				role="none"
			>
				<a class={groupClass(['/inbox', '/timeline'])} href="/inbox"
					onclick={(e) => { if (window.innerWidth < 1024) { e.preventDefault(); toggle('pesan'); } }}
				>
					<span class="kt-menu-title font-medium text-foreground text-sm">Pesan</span>
					<!-- Desktop dropdown chevron -->
					<span class="hidden lg:flex kt-menu-arrow ms-1.5 transition-transform duration-200"
						class:rotate-180={openMenu === 'pesan'}
					>
						<i class="ki-filled ki-chevron-down text-2xs text-secondary-foreground"></i>
					</span>
					<!-- Mobile accordion plus/minus -->
					<span class="flex lg:hidden kt-menu-arrow ms-auto">
						<span class:flex={openMenu !== 'pesan'} class:hidden={openMenu === 'pesan'}>
							<i class="ki-filled ki-plus text-xs text-secondary-foreground"></i>
						</span>
						<span class:hidden={openMenu !== 'pesan'} class:inline-flex={openMenu === 'pesan'}>
							<i class="ki-filled ki-minus text-xs text-secondary-foreground"></i>
						</span>
					</span>
				</a>
				<div class="kt-menu-dropdown kt-menu-default gap-0 min-w-[220px] absolute top-full start-1/2 -translate-x-1/2 z-50 mt-2">
					<div class="kt-menu-item w-full {isActive('/inbox') ? 'active' : ''}">
						<a class="kt-menu-link" href="/inbox">
							<span class="kt-menu-icon"><i class="ki-filled ki-messages"></i></span>
							<span class="kt-menu-title">Inbox</span>
						</a>
					</div>
					<div class="kt-menu-item w-full {isActive('/timeline') ? 'active' : ''}">
						<a class="kt-menu-link" href="/timeline">
							<span class="kt-menu-icon"><i class="ki-filled ki-clock"></i></span>
							<span class="kt-menu-title">Timeline</span>
						</a>
					</div>
				</div>
			</div>

			<!-- Tickets — direct link -->
			<div class="kt-menu-item {isActive('/tickets') ? 'active' : ''}">
				<a class={linkClass('/tickets')} href="/tickets">
					<span class="kt-menu-title font-medium text-foreground text-sm">Tickets</span>
				</a>
			</div>

			<!-- Contacts / Sources -->
			<div class="kt-menu-item {isActive('/sources') ? 'active' : ''}">
				<a class={linkClass('/sources')} href="/sources">
					<span class="kt-menu-title font-medium text-foreground text-sm">Kontak</span>
				</a>
			</div>

			<!-- Reports -->
			<div class="kt-menu-item {isActive('/reports') ? 'active' : ''}">
				<a class={linkClass('/reports')} href="/reports">
					<span class="kt-menu-title font-medium text-foreground text-sm">Reports</span>
				</a>
			</div>

			<!-- Settings -->
			<div class="kt-menu-item {isActive('/settings') ? 'active' : ''}">
				<a class={linkClass('/settings')} href="/settings">
					<span class="kt-menu-title font-medium text-foreground text-sm">Settings</span>
				</a>
			</div>

			<!-- Audit Log -->
			<div class="kt-menu-item {isActive('/audit') ? 'active' : ''}">
				<a class={linkClass('/audit')} href="/audit">
					<span class="kt-menu-title font-medium text-foreground text-sm">Audit Log</span>
				</a>
			</div>

		</div>
	</div>
</div>
