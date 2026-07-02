<script lang="ts">
	import { page } from '$app/stores';

	let currentPath = $derived($page.url.pathname);
	let openAccordions = $state<Set<string>>(new Set());

	function isActive(path: string): boolean {
		return currentPath === path;
	}

	function isInGroup(paths: string[]): boolean {
		return paths.some(p => currentPath === p || currentPath.startsWith(p + '/'));
	}

	$effect(() => {
		for (const acc of accordions) {
			if (isInGroup(acc.paths)) {
				openAccordions.add(acc.label);
			}
		}
	});

	function toggleAccordion(label: string) {
		if (openAccordions.has(label)) {
			const next = new Set(openAccordions);
			next.delete(label);
			openAccordions = next;
		} else {
			openAccordions = new Set([...openAccordions, label]);
		}
	}

	interface NavAccordion {
		label: string;
		icon: string;
		paths: string[];
		children: { label: string; href: string }[];
	}

	const accordions: NavAccordion[] = [
		{
			label: 'Pesan',
			icon: 'ki-messages',
			paths: ['/inbox', '/messages'],
			children: [{ label: 'Inbox', href: '/inbox' }],
		},
		{
			label: 'Tickets',
			icon: 'ki-badge',
			paths: ['/tickets'],
			children: [{ label: 'Board', href: '/tickets' }],
		},
	];
</script>

<div
	class="w-(--sidebar-width) shrink-0 hidden lg:flex items-start [--kt-drawer-enable:true] lg:[--kt-drawer-enable:false]"
	data-kt-drawer="true"
	data-kt-drawer-class="kt-drawer kt-drawer-start flex top-0 bottom-0"
	id="sidebar"
>
	<div
		class="w-(--sidebar-width) z-5 lg:top-[80px] top-0 bottom-0 lg:right-auto lg:start-auto shrink-0 py-3 lg:py-0 bg-background"
		data-kt-sticky="true"
		data-kt-sticky-class="fixed"
		data-kt-sticky-name="sidebar"
		data-kt-sticky-offset="150px"
	>
		<div
			class="kt-scrollable-y-auto"
			data-kt-scrollable="true"
			data-kt-scrollable-dependencies="#header"
			data-kt-scrollable-height="auto"
			data-kt-scrollable-offset="10px"
			id="sidebar_scrollable"
		>
			<div class="kt-menu flex flex-col w-full px-2.5 gap-0.5" id="sidebar_menu">
				<div class="kt-menu-item">
					<a
						class="kt-menu-link py-1.5 ps-2.5 pe-2.5 rounded-md border border-transparent {isActive('/') ? 'kt-menu-item-active:border-border kt-menu-item-active:bg-background' : 'kt-menu-link-hover:bg-background kt-menu-link-hover:border-border'}"
						href="/"
					>
						<span class="kt-menu-icon w-[20px]">
							<i class="ki-filled ki-element-11 text-sm"></i>
						</span>
						<span class="kt-menu-title text-sm text-foreground {isActive('/') ? 'font-medium text-primary' : ''}">Dashboard</span>
					</a>
				</div>

				{#each accordions as acc}
					<div class="kt-menu-item" class:kt-menu-item-show={openAccordions.has(acc.label)}>
						<button class="kt-menu-link py-1.5 ps-2.5 pe-2.5 rounded-md border border-transparent w-full flex items-center gap-2.5" onclick={() => toggleAccordion(acc.label)}>
							<span class="kt-menu-icon w-[20px]">
								<i class="ki-filled {acc.icon} text-sm"></i>
							</span>
							<span class="kt-menu-title text-sm text-foreground kt-menu-item-here:text-mono kt-menu-item-show:text-mono kt-menu-link-hover:text-mono">
								{acc.label}
							</span>
							<span class="kt-menu-arrow text-muted-foreground">
								<span class="inline-flex kt-menu-item-show:hidden"><i class="ki-filled ki-down text-xs"></i></span>
								<span class="hidden kt-menu-item-show:inline-flex"><i class="ki-filled ki-up text-xs"></i></span>
							</span>
						</button>
						{#if openAccordions.has(acc.label)}
							<div class="kt-menu-accordion gap-px">
								{#each acc.children as child}
									<div class="kt-menu-item">
										<a
											class="kt-menu-link py-1.5 ps-5 pe-2.5 rounded-md border border-transparent {isActive(child.href) ? 'kt-menu-item-active:border-border kt-menu-item-active:bg-background' : 'kt-menu-link-hover:bg-background kt-menu-link-hover:border-border'}"
											href={child.href}
										>
											<span class="kt-menu-title text-sm text-foreground {isActive(child.href) ? 'font-medium text-primary' : ''}">{child.label}</span>
										</a>
									</div>
								{/each}
							</div>
						{/if}
					</div>
				{/each}

				<div class="kt-menu-item">
					<a
						class="kt-menu-link py-1.5 ps-2.5 pe-2.5 rounded-md border border-transparent {isActive('/reports') ? 'kt-menu-item-active:border-border kt-menu-item-active:bg-background' : 'kt-menu-link-hover:bg-background kt-menu-link-hover:border-border'}"
						href="/reports"
					>
						<span class="kt-menu-icon w-[20px]">
							<i class="ki-filled ki-chart-simple text-sm"></i>
						</span>
						<span class="kt-menu-title text-sm text-foreground {isActive('/reports') ? 'font-medium text-primary' : ''}">Reports</span>
					</a>
				</div>

				<div class="kt-menu-item">
					<a
						class="kt-menu-link py-1.5 ps-2.5 pe-2.5 rounded-md border border-transparent {isActive('/settings') ? 'kt-menu-item-active:border-border kt-menu-item-active:bg-background' : 'kt-menu-link-hover:bg-background kt-menu-link-hover:border-border'}"
						href="/settings"
					>
						<span class="kt-menu-icon w-[20px]">
							<i class="ki-filled ki-setting-2 text-sm"></i>
						</span>
						<span class="kt-menu-title text-sm text-foreground {isActive('/settings') ? 'font-medium text-primary' : ''}">Settings</span>
					</a>
				</div>

				<div class="kt-menu-item">
					<a
						class="kt-menu-link py-1.5 ps-2.5 pe-2.5 rounded-md border border-transparent {isActive('/audit') ? 'kt-menu-item-active:border-border kt-menu-item-active:bg-background' : 'kt-menu-link-hover:bg-background kt-menu-link-hover:border-border'}"
						href="/audit"
					>
						<span class="kt-menu-icon w-[20px]">
							<i class="ki-filled ki-security-user text-sm"></i>
						</span>
						<span class="kt-menu-title text-sm text-foreground {isActive('/audit') ? 'font-medium text-primary' : ''}">Audit Log</span>
					</a>
				</div>
			</div>
		</div>
	</div>
</div>
