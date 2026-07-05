<script lang="ts">
  import { login, auth } from "$lib/stores/auth.svelte";
  import { goto } from "$app/navigation";
  import { page } from "$app/stores";

  let phone = $state("");
  let password = $state("");
  let error = $state("");
  let loading = $state(false);
  let showPassword = $state(false);

  $effect(() => {
    if (!auth.loading && auth.user) {
      const redirect = $page.url.searchParams.get("redirect") || "/";
      goto(redirect, { replaceState: true });
    }
  });

  async function handleSubmit(e: Event) {
    e.preventDefault();
    error = "";
    loading = true;
    const result = await login(phone, password);
    loading = false;
    if (!result.ok) {
      error = result.error || "Login gagal";
    }
  }
</script>

<div class="min-h-screen w-full flex bg-background">
  <!-- Brand Panel -->
  <div class="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-blue-600 to-blue-700">
    <div class="absolute inset-0 opacity-[0.07] bg-[radial-gradient(ellipse_at_top_right,_white_0%,_transparent_60%),radial-gradient(ellipse_at_bottom_left,_white_0%,_transparent_50%)]"></div>

    <!-- Subtle grid pattern overlay -->
    <div class="absolute inset-0 opacity-[0.04] bg-[linear-gradient(rgba(255,255,255,0.3)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.3)_1px,transparent_1px)] bg-[length:48px_48px]"></div>

    <!-- Chat Bubbles Animation -->
    <div class="absolute inset-0 flex items-center justify-center">
      <div class="relative w-80">
        <!-- Bubble 1 -->
        <div class="flex justify-start mb-3 opacity-0 animate-float-up" style="animation-delay: 0.2s">
          <div class="bg-white/15 backdrop-blur-sm text-white/90 text-sm rounded-2xl rounded-bl-sm px-4 py-2.5 max-w-[220px] shadow-lg">
            "Aplikasi error pas login"
          </div>
        </div>
        <!-- Bubble 2 -->
        <div class="flex justify-end mb-3 opacity-0 animate-float-up" style="animation-delay: 1.2s">
          <div class="bg-white/20 backdrop-blur-sm text-white text-sm rounded-2xl rounded-br-sm px-4 py-2.5 max-w-[200px] shadow-lg">
            Sudah dicoba restart?
          </div>
        </div>
        <!-- Bubble 3 -->
        <div class="flex justify-start mb-3 opacity-0 animate-float-up" style="animation-delay: 2.2s">
          <div class="bg-white/15 backdrop-blur-sm text-white/90 text-sm rounded-2xl rounded-bl-sm px-4 py-2.5 max-w-[240px] shadow-lg">
            Iya, masih tetap error
          </div>
        </div>
        <!-- Bubble 4 (typing indicator) -->
        <div class="flex justify-end opacity-0 animate-float-up" style="animation-delay: 3.5s">
          <div class="bg-white/20 backdrop-blur-sm rounded-2xl rounded-br-sm px-4 py-3 shadow-lg">
            <div class="flex gap-1.5">
              <span class="size-2 bg-white/60 rounded-full animate-typing-dot" style="animation-delay: 0s"></span>
              <span class="size-2 bg-white/60 rounded-full animate-typing-dot" style="animation-delay: 0.2s"></span>
              <span class="size-2 bg-white/60 rounded-full animate-typing-dot" style="animation-delay: 0.4s"></span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Brand Text at Bottom -->
    <div class="absolute bottom-10 left-10 right-10">
      <div class="flex items-center gap-2.5 mb-2">
        <div class="size-9 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
          <svg class="size-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
          </svg>
        </div>
        <span class="text-white/90 font-semibold text-sm tracking-wide">WHATSAPP TECH SUPPORT</span>
      </div>
      <h2 class="text-white text-xl font-semibold leading-tight">Sistem Manajemen Laporan Teknis</h2>
      <p class="text-white/60 text-sm mt-1">Pantau, kelola, dan selesaikan laporan support dari WhatsApp</p>
    </div>
  </div>

  <!-- Form Panel -->
  <div class="flex-1 flex items-center justify-center px-4 py-8">
    <div class="w-full max-w-sm">
      <!-- Mobile-only brand header -->
      <div class="lg:hidden text-center mb-8">
        <div class="size-9 rounded-xl bg-white/20 backdrop-blur-sm mx-auto mb-3 flex items-center justify-center">
          <svg class="size-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
          </svg>
        </div>
        <h1 class="text-xl font-bold text-foreground">WhatsApp Tech Support</h1>
        <p class="text-sm text-muted-foreground mt-0.5">Masuk ke panel admin</p>
      </div>

      <form onsubmit={handleSubmit} class="kt-card animate-slide-up">
        <div class="kt-card-content p-8 space-y-5">
          {#if error}
            <div class="rounded-lg bg-destructive/10 text-destructive text-sm px-3.5 py-2.5 border border-destructive/20 flex items-start gap-2">
              <svg class="size-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              <span>{error}</span>
            </div>
          {/if}

          <div class="space-y-1.5">
            <label for="phone" class="kt-form-label">Nomor Telepon</label>
            <input
              id="phone"
              type="text"
              bind:value={phone}
              placeholder="6281111111111"
              required
              class="wt-input w-full"
            />
          </div>

          <div class="space-y-1.5">
            <div class="flex items-center justify-between">
              <label for="password" class="kt-form-label">Password</label>
            </div>
            <div class="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                bind:value={password}
                placeholder="••••••••"
                required
                class="wt-input w-full pr-10"
              />
              <button type="button" onclick={() => showPassword = !showPassword} class="absolute end-2 top-1/2 -translate-y-1/2 size-7 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors" tabindex="-1" aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}>
                {#if showPassword}
                  <svg class="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                  </svg>
                {:else}
                  <svg class="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                {/if}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading} class="kt-btn kt-btn-primary w-full justify-center h-10">
            {#if loading}
              <span class="inline-block size-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            {:else}
              Masuk
            {/if}
          </button>
        </div>
      </form>

      <p class="text-center text-xs text-muted-foreground mt-5">
        Hubungi admin jika lupa password
      </p>
    </div>
  </div>
</div>

<style>
  @keyframes float-up {
    0% { opacity: 0; transform: translateY(16px); }
    15% { opacity: 1; transform: translateY(0); }
    85% { opacity: 1; transform: translateY(0); }
    100% { opacity: 0; transform: translateY(-8px); }
  }
  @keyframes typing-dot {
    0%, 80%, 100% { opacity: 0.4; transform: scale(0.8); }
    40% { opacity: 1; transform: scale(1); }
  }
  .animate-float-up {
    animation: float-up 5s ease-out infinite;
  }
  .animate-typing-dot {
    animation: typing-dot 1.4s ease-in-out infinite;
  }
</style>
