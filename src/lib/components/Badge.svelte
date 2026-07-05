<script lang="ts">
	interface Props {
		variant?: 'primary' | 'success' | 'warning' | 'destructive' | 'info' | 'outline' | 'stroke' | (string & {});
		size?: 'sm' | 'default';
		children?: import('svelte').Snippet;
	}
	let { variant = 'primary', size = 'default', children }: Props = $props();
</script>

{#if children}
	<span class="kt-badge inline-flex items-center gap-1"
		class:kt-badge-sm={size === 'sm'}
		class:kt-badge-primary={variant === 'primary'}
		class:kt-badge-success={variant === 'success'}
		class:kt-badge-warning={variant === 'warning'}
		class:kt-badge-destructive={variant === 'destructive'}
		class:kt-badge-info={variant === 'info'}
		class:kt-badge-outline={variant === 'outline'}
		class:wt-badge-stroke={variant === 'stroke'}
	>
		{@render children()}
	</span>
{/if}
