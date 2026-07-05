<script lang="ts">
	import { showToast } from '$lib/stores/toast';

	let { open = $bindable(false) } = $props();

	let oldPassword = $state('');
	let newPassword = $state('');
	let confirmPassword = $state('');
	let saving = $state(false);
	let error = $state('');

	function reset() {
		oldPassword = '';
		newPassword = '';
		confirmPassword = '';
		error = '';
	}

	async function handleSubmit() {
		error = '';
		if (!oldPassword || !newPassword || !confirmPassword) {
			error = 'Semua field harus diisi';
			return;
		}
		if (newPassword.length < 4) {
			error = 'Password baru minimal 4 karakter';
			return;
		}
		if (newPassword !== confirmPassword) {
			error = 'Konfirmasi password tidak cocok';
			return;
		}

		saving = true;
		try {
			const res = await fetch('/api/auth/password', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ oldPassword, newPassword }),
			});
			if (res.ok) {
				showToast('success', 'Password berhasil diubah');
				open = false;
				reset();
			} else {
				const d = await res.json();
				error = d.error || 'Gagal mengubah password';
			}
		} catch {
			error = 'Network error';
		}
		saving = false;
	}
</script>

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
{#if open}
	<div class="fixed inset-0 z-[9998]" onclick={() => open = false} onkeydown={(e) => e.key === 'Escape' && (open = false)} role="presentation"></div>
	<div class="fixed flex items-start justify-center p-4" style="inset:0;z-index:9999;padding-top:15vh;pointer-events:none" role="dialog" aria-modal="true" tabindex="0">
		<div class="bg-card border border-border rounded-xl shadow-xl w-full max-w-sm" style="pointer-events:auto">
			<div class="flex items-center justify-between px-5 py-4 border-b border-border">
				<h2 class="text-sm font-semibold text-foreground">Ganti Password</h2>
				<button class="kt-btn kt-btn-icon kt-btn-dim size-7" onclick={() => { open = false; reset(); }} aria-label="Tutup">
					<i class="ki-filled ki-cross text-base"></i>
				</button>
			</div>

			<form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }} class="p-5 space-y-3">
				{#if error}
					<div class="rounded-lg text-destructive text-sm px-3 py-2 border" style="background:color-mix(in srgb,var(--destructive) 10%,transparent);border-color:color-mix(in srgb,var(--destructive) 20%,transparent)">{error}</div>
				{/if}

				<div class="space-y-1">
					<label for="cp-old" class="kt-form-label">Password Lama</label>
					<input id="cp-old" type="password" bind:value={oldPassword} placeholder="Password saat ini" required class="wt-input w-full" />
				</div>
				<div class="space-y-1">
					<label for="cp-new" class="kt-form-label">Password Baru</label>
					<input id="cp-new" type="password" bind:value={newPassword} placeholder="Min 4 karakter" required class="wt-input w-full" />
				</div>
				<div class="space-y-1">
					<label for="cp-confirm" class="kt-form-label">Konfirmasi Password Baru</label>
					<input id="cp-confirm" type="password" bind:value={confirmPassword} placeholder="Ketik ulang password baru" required class="wt-input w-full" />
				</div>

				<button type="submit" disabled={saving} class="kt-btn kt-btn-primary w-full justify-center h-9 mt-2">
					{#if saving}
						<span class="inline-block size-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
					{:else}
						Simpan Password
					{/if}
				</button>
			</form>
		</div>
	</div>
{/if}
