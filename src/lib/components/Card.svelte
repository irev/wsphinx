<script lang="ts">
	interface Props {
		title?: string;
		subtitle?: string;
		grid?: boolean;
		class?: string;
		children?: import('svelte').Snippet;
		headerActions?: import('svelte').Snippet;
		headerClass?: string;
		bodyClass?: string;
		footer?: import('svelte').Snippet;
	}
	let { title, subtitle, grid = false, class: className = '', children, headerActions, headerClass = '', bodyClass = '', footer }: Props = $props();
</script>

<div class="kt-card border border-border rounded-xl shadow-sm bg-card text-card-foreground {grid ? 'kt-card-grid' : ''} {className}">
	{#if title}
		<div class="kt-card-header flex items-center justify-between flex-wrap gap-3 px-5 lg:px-7.5 pt-5 lg:pt-7.5 pb-4 {headerClass}">
			<div class="flex flex-col gap-0.5">
				<div class="kt-card-title text-lg font-semibold text-mono">{title}</div>
				{#if subtitle}
					<div class="kt-card-subtitle text-2sm text-muted-foreground">{subtitle}</div>
				{/if}
			</div>
			{#if headerActions}
				<div class="flex items-center gap-2 shrink-0">{@render headerActions()}</div>
			{/if}
		</div>
	{/if}
	{#if children}
		{#if grid}
			<div class="kt-card-table">
				{@render children()}
			</div>
		{:else}
			<div class="kt-card-body {bodyClass}">
				{@render children()}
			</div>
		{/if}
	{/if}
	{#if footer}
		<div class="kt-card-footer border-t border-border px-5 lg:px-7.5 py-4">
			{@render footer()}
		</div>
	{/if}
</div>
