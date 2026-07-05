<script lang="ts">
	import { subscribe, removeToast, type ToastItem } from '$lib/stores/toast';

	let items = $state<ToastItem[]>([]);

	$effect(() => {
		return subscribe((t) => { items = t; });
	});

	function icon(type: string) {
		if (type === 'success') return 'ki-check-circle';
		if (type === 'error') return 'ki-cross-circle';
		return 'ki-information';
	}

	function bg(type: string) {
		if (type === 'success') return 'bg-success/10 text-success border-success/20';
		if (type === 'error') return 'bg-destructive/10 text-destructive border-destructive/20';
		return 'bg-info/10 text-info border-info/20';
	}
</script>

{#if items.length > 0}
	<div class="fixed top-[calc(var(--header-height,64px)+0.75rem)] end-4 z-[9999] flex flex-col gap-2 max-w-sm">
		{#each items as item (item.id)}
			<div class="flex items-center gap-2.5 px-4 py-3 rounded-lg border shadow-md text-sm font-medium animate-in slide-in-from-right animate-out fade-out {bg(item.type)}">
				<i class="ki-filled {icon(item.type)} text-base"></i>
				<span class="flex-1">{item.message}</span>
				<button class="kt-btn kt-btn-icon kt-btn-dim size-5 shrink-0" onclick={() => removeToast(item.id)} aria-label="Tutup">
					<i class="ki-filled ki-cross text-xs"></i>
				</button>
			</div>
		{/each}
	</div>
{/if}

<style>
	@keyframes slide-in-from-right {
		from { transform: translateX(100%); opacity: 0; }
		to { transform: translateX(0); opacity: 1; }
	}
	@keyframes fade-out {
		from { opacity: 1; }
		to { opacity: 0; }
	}
	.animate-in { animation: slide-in-from-right 0.3s ease-out; }
	.animate-out { animation: fade-out 0.3s ease-in forwards; }
</style>
