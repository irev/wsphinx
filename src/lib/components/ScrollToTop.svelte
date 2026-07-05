<script lang="ts">
	import { onMount } from 'svelte';

	let visible = $state(false);

	onMount(() => {
		const onScroll = () => visible = window.scrollY > 300;
		window.addEventListener('scroll', onScroll, { passive: true });
		return () => window.removeEventListener('scroll', onScroll);
	});

	function goTop() {
		window.scrollTo({ top: 0, behavior: 'smooth' });
	}
</script>

<button onclick={goTop}
	class="fixed bottom-8 right-6 z-[60] size-10 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center transition-all duration-300 {visible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-3 scale-95 pointer-events-none'}"
	aria-label="Ke atas"
>
	<i class="ki-filled ki-arrow-up text-sm"></i>
</button>
