<script lang="ts">
	interface Props {
		variant?: 'primary' | 'mono' | 'outline' | 'ghost' | 'dim';
		size?: 'sm' | 'default';
		icon?: boolean;
		disabled?: boolean;
		href?: string;
		type?: 'button' | 'submit' | 'reset';
		class?: string;
		children: import('svelte').Snippet;
		onclick?: (e: MouseEvent) => void;
	}
	let {
		variant = 'primary', size = 'default', icon = false,
		disabled = false, href, type = 'button',
		class: className = '', children,
		onclick,
	}: Props = $props();
</script>

{#if href}
	<a {href} class="kt-btn inline-flex items-center justify-center gap-2 font-medium no-underline {className}"
		class:kt-btn-primary={variant === 'primary'}
		class:kt-btn-mono={variant === 'mono'}
		class:kt-btn-outline={variant === 'outline'}
		class:kt-btn-ghost={variant === 'ghost'}
		class:kt-btn-dim={variant === 'dim'}
		class:kt-btn-sm={size === 'sm'}
		class:kt-btn-icon={icon}
		class:opacity-50={disabled}
	>
		{@render children()}
	</a>
{:else}
	<button {type} class="kt-btn inline-flex items-center justify-center gap-2 font-medium {className}"
		class:kt-btn-primary={variant === 'primary'}
		class:kt-btn-mono={variant === 'mono'}
		class:kt-btn-outline={variant === 'outline'}
		class:kt-btn-ghost={variant === 'ghost'}
		class:kt-btn-dim={variant === 'dim'}
		class:kt-btn-sm={size === 'sm'}
		class:kt-btn-icon={icon}
		class:opacity-50={disabled}
		{disabled}
		{onclick}
	>
		{@render children()}
	</button>
{/if}
