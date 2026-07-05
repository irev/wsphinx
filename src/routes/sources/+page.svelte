<script lang="ts">
	import Card from '$lib/components/Card.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import { showToast } from '$lib/stores/toast';
	import { maskPhone } from '$lib/utils/mask';

	let tab = $state<'all' | 'group' | 'contact' | 'archived'>('all');
	let search = $state('');
	let sources = $state<any[]>([]);
	let groups = $state<any[]>([]);
	let contacts = $state<any[]>([]);
	let loading = $state(true);
	let syncing = $state(false);
	let searchTimer: ReturnType<typeof setTimeout> | undefined;

	let selectedSource = $state<any | null>(null);
	let selectedChatInfo = $state<any | null>(null);
	let messages = $state<any[]>([]);
	let messagesLoading = $state(false);
	let syncingMessages = $state(false);

	let dateRange = $state('7days');
	let chatSearch = $state('');
	let chatSearchTimer: ReturnType<typeof setTimeout> | undefined;

	let selectedMsgIds = $state<Set<string>>(new Set());
	let replyText = $state('');
	let sending = $state(false);

	let analyzeResult = $state<any | null>(null);
	let analyzing = $state(false);
	let creating = $state(false);

	let mobilePanel = $state<'left' | 'right'>('left');
	let isMobile = $state(false);
	let isTablet = $state(false);

	function updateViewport() {
		isMobile = window.innerWidth < 768;
		isTablet = window.innerWidth < 1024;
	}

	$effect(() => {
		updateViewport();
		function onResize() { updateViewport(); }
		window.addEventListener('resize', onResize);
		return () => window.removeEventListener('resize', onResize);
	});

	let mergedList = $derived.by(() => {
		let items: any[] = [];

		for (const s of sources) {
			let wa: any | undefined;
			if (s.chatId) {
				wa = [...groups, ...contacts].find((g: any) => g.chatId === s.chatId);
			}

			const lastMsg = s.messages?.[0] || null;
			const unreadCount = 0;

			items.push({
				id: s.id,
				chatId: s.chatId,
				name: s.name,
				type: s.type,
				isActive: s.active,
				photoPath: s.photoPath,
				unreadCount: wa?.unreadCount || unreadCount,
				lastMessage: wa?.lastMessage || lastMsg?.body || null,
				timestamp: wa?.timestamp || (lastMsg?.timestamp ? new Date(lastMsg.timestamp) : null),
				phone: s.phone,
				description: s.description || wa?.description || null,
				source: s,
			});
		}

		for (const g of groups) {
			if (!items.some((i) => i.chatId === g.chatId)) {
				items.push({
					id: null,
					chatId: g.chatId,
					name: g.name,
					type: 'group',
					isActive: false,
					photoPath: null,
					unreadCount: g.unreadCount,
					lastMessage: g.lastMessage,
					timestamp: g.timestamp,
					phone: g.chatId.split('@')[0],
					description: g.description,
					source: null,
				});
			}
		}

		for (const c of contacts) {
			if (!items.some((i) => i.chatId === c.chatId)) {
				items.push({
					id: null,
					chatId: c.chatId,
					name: c.name || c.pushname || c.phone,
					type: 'contact',
					isActive: false,
					photoPath: null,
					unreadCount: c.unreadCount,
					lastMessage: c.lastMessage,
					timestamp: c.timestamp,
					phone: c.phone,
					description: c.about,
					source: null,
				});
			}
		}

		function toDate(v: unknown): Date | null {
			if (!v) return null;
			if (v instanceof Date) return v;
			const d = new Date(v as string);
			return isNaN(d.getTime()) ? null : d;
		}

		items.sort((a, b) => {
			const ta = toDate(a.timestamp);
			const tb = toDate(b.timestamp);
			if (ta && tb) return tb.getTime() - ta.getTime();
			if (ta) return -1;
			if (tb) return 1;
			return (a.name || '').localeCompare(b.name || '');
		});

		return items;
	});

	let filteredList = $derived.by(() => {
		let items = mergedList;
		if (tab === 'group') items = items.filter((i) => i.type === 'group');
		else if (tab === 'contact') items = items.filter((i) => i.type === 'contact');
		else if (tab === 'archived') items = items.filter((i) => !i.isActive);
		else items = items.filter((i) => i.isActive || i.type === 'group' || i.type === 'contact');

		if (search) {
			const q = search.toLowerCase();
			items = items.filter((i) => i.name?.toLowerCase().includes(q) || i.phone?.includes(q) || i.description?.toLowerCase().includes(q));
		}
		return items;
	});

	async function loadAll() {
		loading = true;
		try {
			const [srcRes, grpRes, conRes] = await Promise.all([
				fetch('/api/settings/sources?take=200'),
				fetch('/api/whatsapp/groups'),
				fetch('/api/whatsapp/contacts'),
			]);
			if (srcRes.ok) {
				const d = await srcRes.json();
				sources = d.data || [];
			}
			if (grpRes.ok) {
				const d = await grpRes.json();
				groups = d.data || [];
			}
			if (conRes.ok) {
				const d = await conRes.json();
				contacts = d.data || [];
			}
		} catch (e) {
			showToast('error', `Gagal load: ${(e as Error).message}`);
		}
		loading = false;
	}

	async function syncFromWA() {
		syncing = true;
		try {
			const [grpRes, conRes] = await Promise.all([
				fetch('/api/whatsapp/groups'),
				fetch('/api/whatsapp/contacts'),
			]);
			if (grpRes.ok) groups = (await grpRes.json()).data || [];
			if (conRes.ok) contacts = (await conRes.json()).data || [];

			const srcRes = await fetch('/api/settings/sources?take=200');
			if (srcRes.ok) sources = (await srcRes.json()).data || [];

			showToast('success', 'Data WA berhasil disinkronisasi');
		} catch (e) {
			showToast('error', (e as Error).message);
		}
		syncing = false;
	}

	async function toggleActive(item: any, e: Event) {
		e.stopPropagation();
		if (!item.source?.id) return;
		const newActive = !item.source.active;
		try {
			const res = await fetch(`/api/settings/sources/${item.source.id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ active: newActive }),
			});
			if (!res.ok) throw new Error('Gagal update');
			item.source.active = newActive;
			item.isActive = newActive;
			showToast('success', `${item.name} ${newActive ? 'diaktifkan' : 'dinonaktifkan'}`);
		} catch (e) {
			showToast('error', (e as Error).message);
		}
	}

	async function toggleReadMsg(msg: any, e: Event) {
		e.stopPropagation();
		const newRead = !msg.isRead;
		try {
			const res = await fetch(`/api/messages/${msg.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ isRead: newRead }),
			});
			if (!res.ok) throw new Error('Gagal update');
			msg.isRead = newRead;
		} catch (e) {
			showToast('error', (e as Error).message);
		}
	}

	async function batchMarkRead(ids: string[], read: boolean) {
		if (ids.length === 0) return;
		try {
			const res = await fetch('/api/messages/batch', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ ids, action: read ? 'markRead' : 'markUnread' }),
			});
			if (!res.ok) throw new Error('Gagal update batch');
			for (const msg of messages) {
				if (ids.includes(msg.id)) msg.isRead = read;
			}
			selectedMsgIds = new Set();
			showToast('success', `${ids.length} pesan ditandai ${read ? 'dibaca' : 'belum dibaca'}`);
		} catch (e) {
			showToast('error', (e as Error).message);
		}
	}

	async function selectChat(item: any) {
		selectedSource = item;
		selectedMsgIds = new Set();
		replyText = '';
		mobilePanel = 'right';

		const wa = [...groups, ...contacts].find((g: any) => g.chatId === item.chatId);
		selectedChatInfo = wa || null;

		await loadMessages(item);

		// auto-mark unread messages as read from this source
		const unread = messages.filter((m) => !m.isRead);
		if (unread.length > 0) {
			const ids = unread.map((m) => m.id);
			try {
				await fetch('/api/messages/batch', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ ids, action: 'markRead' }),
				});
				for (const m of messages) m.isRead = true;
			} catch {}
		}
	}

	async function loadMessages(item: any) {
		messagesLoading = true;
		messages = [];

		if (item.id) {
			const params = new URLSearchParams({ sourceId: item.id, take: '500' });
			const now = new Date();
			if (dateRange === 'today') {
				now.setHours(0, 0, 0, 0);
				params.set('startDate', now.toISOString());
			} else if (dateRange === '7days') {
				now.setDate(now.getDate() - 7);
				params.set('startDate', now.toISOString());
			}
			if (chatSearch) params.set('q', chatSearch);

			try {
				const res = await fetch(`/api/messages?${params}`);
				if (res.ok) {
					const d = await res.json();
					messages = d.data || [];
				}
			} catch (e) {
				showToast('error', `Gagal load pesan: ${(e as Error).message}`);
			}
		}
		messagesLoading = false;
	}

	async function syncMessages() {
		if (!selectedSource || !selectedSource.chatId || !selectedSource.id) return;
		syncingMessages = true;
		try {
			const res = await fetch(`/api/whatsapp/chat/${encodeURIComponent(selectedSource.chatId)}?sourceId=${selectedSource.id}&limit=200`);
			if (!res.ok) throw new Error((await res.json()).error || 'Gagal sync');
			showToast('success', 'Pesan berhasil disinkronisasi');
			await loadMessages(selectedSource);
		} catch (e) {
			showToast('error', (e as Error).message);
		}
		syncingMessages = false;
	}

	function onSearch(e: Event) {
		search = (e.target as HTMLInputElement).value;
	}

	function onChatSearch(e: Event) {
		chatSearch = (e.target as HTMLInputElement).value;
		clearTimeout(chatSearchTimer);
		chatSearchTimer = setTimeout(() => {
			if (selectedSource) loadMessages(selectedSource);
		}, 300);
	}

	function onDateRangeChange() {
		if (selectedSource) loadMessages(selectedSource);
	}

	function toggleSelect(id: string) {
		const next = new Set(selectedMsgIds);
		if (next.has(id)) next.delete(id);
		else next.add(id);
		selectedMsgIds = next;
	}

	function toggleSelectAll() {
		if (selectedMsgIds.size === messages.length) {
			selectedMsgIds = new Set();
		} else {
			selectedMsgIds = new Set(messages.map((m: any) => m.id));
		}
	}

	function isSelected(id: string) {
		return selectedMsgIds.has(id);
	}

	function goBack() {
		mobilePanel = 'left';
		selectedSource = null;
		selectedMsgIds = new Set();
	}

	async function sendReply() {
		if (!replyText.trim() || !selectedSource?.chatId) return;
		sending = true;
		try {
			const res = await fetch('/api/whatsapp/send', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ chatId: selectedSource.chatId, text: replyText.trim() }),
			});
			if (!res.ok) throw new Error((await res.json()).error || 'Gagal kirim');
			replyText = '';
			showToast('success', 'Pesan terkirim');
		} catch (e) {
			showToast('error', (e as Error).message);
		}
		sending = false;
	}

	function onReplyKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			sendReply();
		}
	}

	async function analyzeMessages() {
		const ids = Array.from(selectedMsgIds);
		if (ids.length === 0) return;
		analyzing = true;
		analyzeResult = null;
		try {
			const res = await fetch('/api/chat/analyze', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ messageIds: ids, sourceId: selectedSource?.id }),
			});
			if (!res.ok) throw new Error((await res.json()).error || 'Gagal analisa');
			analyzeResult = (await res.json()).data;
		} catch (e) {
			showToast('error', (e as Error).message);
		}
		analyzing = false;
	}

	async function createTicketFromAnalysis() {
		if (!analyzeResult || !selectedSource) return;
		creating = true;
		const ids = Array.from(selectedMsgIds);

		try {
			const setRes = await fetch('/api/settings');
			if (!setRes.ok) throw new Error('Gagal load settings');
			const settings = (await setRes.json()).data;

			const cat = (settings.categories || []).find((c: any) => c.name.toLowerCase() === (analyzeResult.category || '').toLowerCase());
			const prio = (settings.priorities || []).find((p: any) => p.name.toLowerCase() === (analyzeResult.priority || '').toLowerCase());

			const res = await fetch('/api/tickets', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					title: analyzeResult.summary?.substring(0, 100) || 'Dari analisa chat',
					summary: analyzeResult.summary || '',
					reporterName: selectedSource.name || selectedSource.phone || 'Unknown',
					reporterPhone: selectedSource.phone,
					sourceId: selectedSource.id,
					categoryId: cat?.id,
					priorityId: prio?.id,
					messageIds: ids,
				}),
			});
			if (!res.ok) throw new Error((await res.json()).error || `HTTP ${res.status}`);
			const ticket = (await res.json()).data;
			showToast('success', `Tiket ${ticket.ticketNumber} berhasil dibuat`);
			analyzeResult = null;
			selectedMsgIds = new Set();
		} catch (e) {
			showToast('error', (e as Error).message);
		}
		creating = false;
	}

	function relativeTime(d: Date | null): string {
		if (!d) return '';
		const now = Date.now();
		const diff = now - d.getTime();
		const mins = Math.floor(diff / 60000);
		if (mins < 1) return 'baru saja';
		if (mins < 60) return `${mins}m lalu`;
		const hours = Math.floor(mins / 60);
		if (hours < 24) return `${hours}j lalu`;
		const days = Math.floor(hours / 24);
		if (days === 1) return 'Kemarin';
		if (days < 7) return `${days} hari lalu`;
		return d.toLocaleDateString('id-ID');
	}

	function formatTime(d: Date): string {
		return d.toLocaleString('id-ID', { hour: '2-digit', minute: '2-digit' });
	}

	function formatDate(d: Date): string {
		const now = new Date();
		const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
		const yesterday = new Date(today.getTime() - 86400000);
		const msgDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());

		if (msgDate.getTime() === today.getTime()) return 'Hari Ini';
		if (msgDate.getTime() === yesterday.getTime()) return 'Kemarin';
		return d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short' });
	}

	function groupByDate(msgs: any[]): [string, any[]][] {
		const groups = new Map<string, any[]>();
		for (const m of msgs) {
			const key = formatDate(new Date(m.timestamp));
			if (!groups.has(key)) groups.set(key, []);
			groups.get(key)!.push(m);
		}
		return Array.from(groups.entries());
	}

	$effect(() => {
		loadAll();
	});
</script>

<svelte:head>
	<title>Kontak & Grup WhatsApp — Support App</title>
</svelte:head>

<Card title="Kontak & Grup WhatsApp" subtitle="Daftar kontak dan grup dari WhatsApp — pilih untuk melihat percakapan" bodyClass="p-0" class="sources-card">
		{#snippet headerActions()}
			<div class="flex items-center gap-2">
				<button onclick={syncFromWA} disabled={syncing} class="kt-btn kt-btn-outline kt-btn-sm">
					<i class="ki-filled ki-arrows-circle {syncing ? 'animate-spin' : ''}"></i>
					{syncing ? 'Sync...' : 'Sync WA'}
				</button>
			</div>
		{/snippet}

		<!-- Split panel -->
		<div class="flex sources-panel-wrapper">
			<!-- Left panel -->
			<div class="sources-left-panel border-b lg:border-b-0 border-border flex flex-col overflow-hidden"
				class:hidden={mobilePanel === 'right' && isTablet}
			>
				<!-- Tabs + Search -->
				<div class="p-3 border-b border-border shrink-0">
					<div class="kt-segmented mb-2.5">
						<button onclick={() => { tab = 'all'; }}
							class={'kt-segmented-item ' + (tab === 'all' ? 'active' : '')}
						>Semua</button>
						<button onclick={() => { tab = 'group'; }}
							class={'kt-segmented-item ' + (tab === 'group' ? 'active' : '')}
						>Grup</button>
						<button onclick={() => { tab = 'contact'; }}
							class={'kt-segmented-item ' + (tab === 'contact' ? 'active' : '')}
						>Kontak</button>
						<button onclick={() => { tab = 'archived'; }}
							class={'kt-segmented-item ' + (tab === 'archived' ? 'active' : '')}
						>Arsip</button>
					</div>
					<input type="search" placeholder="Cari nama atau nomor..." oninput={onSearch}
						class="kt-filter-input w-full"
					/>
				</div>

				<!-- List -->
				<div class="overflow-y-auto flex-1 min-h-0">
					{#if loading}
						<div class="flex items-center justify-center py-10"><div class="kt-spinner-ring size-6"></div></div>
					{:else if filteredList.length === 0}
						<div class="kt-empty">
							<i class="ki-filled ki-two-phone kt-empty-icon text-4xl"></i>
							<p class="kt-empty-text">Tidak ada kontak/grup</p>
							<p class="kt-empty-sub">Pastikan worker WhatsApp sudah terhubung</p>
						</div>
					{:else}
						{#each filteredList as item}
						<button onclick={() => selectChat(item)}
							class={'w-full text-left flex items-center gap-2.5 px-3 py-2.5 hover:bg-muted/30 transition-colors border-b border-border/50 last:border-b-0' + (selectedSource?.chatId === item.chatId ? ' bg-primary/5' : '') + (!item.isActive && item.source?.id ? ' opacity-50' : '')}
						>
								<div class="relative shrink-0">
									{#if item.photoPath}
										<img src={item.photoPath} alt={item.name} class="size-10 rounded-full object-cover border border-border" />
									{:else}
										<div class="size-10 rounded-full bg-muted flex items-center justify-center text-sm font-semibold text-muted-foreground border border-border">
											{(item.name || '?').charAt(0).toUpperCase()}
										</div>
									{/if}
								</div>
								<div class="flex-1 min-w-0">
									<div class="flex items-center justify-between gap-1">
										<span class="text-sm font-medium text-foreground truncate">{item.name}</span>
										<span class="text-2xs text-muted-foreground shrink-0">{relativeTime(item.timestamp)}</span>
									</div>
									<div class="flex items-center gap-1.5 mt-0.5">
										<Badge size="sm" variant={item.type === 'group' ? 'primary' : 'info'}>{item.type}</Badge>
										{#if item.lastMessage}
											<span class="text-xs text-muted-foreground truncate">{item.lastMessage}</span>
										{/if}
									</div>
								</div>
								<div class="flex items-center gap-1 shrink-0" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()} role="none">
									{#if item.source?.id}
										<input type="checkbox" checked={item.isActive} onchange={(e) => toggleActive(item, e)}
											class="kt-switch-sm" aria-label={item.isActive ? 'Nonaktifkan' : 'Aktifkan'}
										/>
									{/if}
								</div>
							</button>
						{/each}
					{/if}
				</div>
			</div>

			<!-- Right panel — Chat viewer -->
			<div class="sources-right-panel flex flex-col overflow-hidden"
				class:hidden={!selectedSource && isTablet}
			>
				{#if selectedSource}
					<!-- Chat header -->
					<div class="flex items-center gap-3 px-3 lg:px-4 py-2.5 border-b border-border bg-card/50 shrink-0">
						<button onclick={goBack} class="lg:hidden kt-btn kt-btn-icon kt-btn-sm" aria-label="Kembali">
							<i class="ki-filled ki-black-arrow-left text-sm"></i>
						</button>
						{#if selectedSource.photoPath}
							<img src={selectedSource.photoPath} alt={selectedSource.name} class="size-8 rounded-full object-cover border border-border shrink-0" />
						{:else}
							<div class="size-8 rounded-full bg-muted flex items-center justify-center text-xs font-semibold text-muted-foreground border border-border shrink-0">
								{(selectedSource.name || '?').charAt(0).toUpperCase()}
							</div>
						{/if}
						<div class="flex-1 min-w-0">
							<div class="flex items-center gap-1.5">
								<span class="text-sm font-medium text-foreground truncate">{selectedSource.name}</span>
								{#if selectedSource.source?.id}
									<span class="text-2xs font-medium {selectedSource.isActive ? 'text-success' : 'text-destructive'}">{selectedSource.isActive ? 'Aktif' : 'Nonaktif'}</span>
								{/if}
							</div>
							<div class="text-2xs text-muted-foreground">{selectedSource.phone}</div>
						</div>
						<div class="flex items-center gap-1">
							{#if selectedSource.source?.id}
								<input type="checkbox" checked={selectedSource.isActive} onchange={(e) => toggleActive(selectedSource, e)}
									class="kt-switch-sm" aria-label={selectedSource.isActive ? 'Nonaktifkan' : 'Aktifkan'}
								/>
							{/if}
							<button onclick={syncMessages} disabled={syncingMessages} class="kt-btn kt-btn-icon kt-btn-sm kt-btn-ghost text-muted-foreground" title="Sync pesan dari WA">
								<i class="ki-filled ki-arrows-circle {syncingMessages ? 'animate-spin' : ''} text-sm"></i>
							</button>
						</div>
					</div>

					<!-- Message filters -->
					<div class="flex items-center gap-2 px-3 lg:px-4 py-2 border-b border-border/50 shrink-0">
						<select bind:value={dateRange} onchange={onDateRangeChange}
							class="kt-filter-select"
						>
							<option value="today">Hari Ini</option>
							<option value="7days">7 Hari</option>
							<option value="30days">30 Hari</option>
						</select>
						<input type="search" placeholder="Cari pesan..." oninput={onChatSearch}
							class="kt-filter-input flex-1 min-w-0"
						/>
					</div>

					<!-- Messages -->
					<div class="overflow-y-auto px-3 lg:px-4 flex-1 min-h-0">
						{#if messagesLoading}
							<div class="flex items-center justify-center py-10"><div class="kt-spinner-ring size-5"></div></div>
						{:else if messages.length === 0}
							<div class="kt-empty">
								<i class="ki-filled ki-messages kt-empty-icon text-3xl"></i>
								<p class="kt-empty-text">Belum ada pesan</p>
								<button onclick={syncMessages} disabled={syncingMessages} class="mt-2 kt-btn kt-btn-dim kt-btn-xs">
									{syncingMessages ? 'Sync...' : 'Sync dari WA'}
								</button>
							</div>
						{:else}
							{#each groupByDate(messages) as [dateLabel, msgs]}
								<div class="text-center my-3">
									<span class="px-2.5 py-0.5 text-2xs font-medium text-muted-foreground bg-muted/50 rounded-full">{dateLabel}</span>
								</div>
								{#each msgs as msg}
									<div class="flex items-start gap-2 py-1.5 border-b border-border/30 last:border-b-0 {isSelected(msg.id) ? 'bg-primary/5 -mx-3 lg:-mx-4 px-3 lg:px-4' : ''} {!msg.isRead ? 'font-medium' : ''}">
										<input type="checkbox" checked={isSelected(msg.id)} onchange={() => toggleSelect(msg.id)}
											class="kt-checkbox mt-1 shrink-0" aria-label="Pilih pesan"
										/>
										<div class="flex-1 min-w-0">
											<div class="flex items-center gap-1.5">
												<span class="text-xs font-semibold text-mono {!msg.isRead ? 'font-semibold' : 'font-normal'}">{msg.fromName || maskPhone(msg.fromPhone)}</span>
												<span class="text-2xs text-muted-foreground">{formatTime(new Date(msg.timestamp))}</span>
												<button onclick={(e) => toggleReadMsg(msg, e)} class="kt-btn kt-btn-icon kt-btn-xs ml-auto" aria-label={msg.isRead ? 'Tandai belum dibaca' : 'Tandai sudah dibaca'}>
													<i class="ki-filled ki-{msg.isRead ? 'eye-slash' : 'eye'} text-xs text-muted-foreground"></i>
												</button>
											</div>
											<p class="text-xs text-secondary-foreground mt-0.5 whitespace-pre-wrap break-words {!msg.isRead ? 'font-medium' : ''}">{msg.body}</p>
										</div>
									</div>
								{/each}
							{/each}
						{/if}
					</div>

					<!-- Batch actions -->
					{#if selectedMsgIds.size > 0}
						<div class="flex items-center gap-2 px-3 lg:px-4 py-2 border-t border-border bg-primary/5 shrink-0">
							<span class="text-xs font-medium text-mono">{selectedMsgIds.size} dipilih</span>
							<button onclick={analyzeMessages} disabled={analyzing} class="kt-btn kt-btn-dim kt-btn-xs">
								<i class="ki-filled ki-abstract-26 text-xs"></i>
								{analyzing ? '...' : 'Analisa AI'}
							</button>
							<button onclick={() => batchMarkRead(Array.from(selectedMsgIds), true)} class="kt-btn kt-btn-outline kt-btn-xs">
								<i class="ki-filled ki-eye text-xs"></i> Read
							</button>
							<button onclick={() => batchMarkRead(Array.from(selectedMsgIds), false)} class="kt-btn kt-btn-outline kt-btn-xs">
								<i class="ki-filled ki-eye-slash text-xs"></i> Unread
							</button>
							<button onclick={() => { selectedMsgIds = new Set(); }} class="kt-btn kt-btn-outline kt-btn-xs">
								Batal
							</button>
						</div>
					{/if}

					<!-- Reply input -->
					<div class="flex items-end gap-2 px-3 lg:px-4 py-2.5 border-t border-border bg-card/50 shrink-0">
						<textarea bind:value={replyText} onkeydown={onReplyKeydown} rows="1"
							placeholder="Ketik balasan... (Enter kirim, Shift+Enter baris baru)"
							class="flex-1 min-w-0 px-2.5 py-1.5 border border-input rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 bg-transparent resize-none max-h-20"
						></textarea>
						<button onclick={sendReply} disabled={sending || !replyText.trim() || !selectedSource?.chatId}
							class="kt-btn kt-btn-mono kt-btn-sm shrink-0"
						>
							{#if sending}
								<i class="ki-filled ki-arrows-circle animate-spin"></i>
							{:else}
								<i class="ki-filled ki-send"></i>
							{/if}
							Kirim
						</button>
					</div>

				{:else}
					<!-- Empty state -->
					<div class="kt-empty py-20">
						<i class="ki-filled ki-two-phone kt-empty-icon text-5xl"></i>
						<p class="kt-empty-text">Pilih kontak atau grup dari daftar di samping</p>
						<p class="kt-empty-sub">Untuk melihat percakapan dan mengirim balasan</p>
					</div>
				{/if}
			</div>
		</div>
	</Card>

<!-- Analyze result modal -->
{#if analyzeResult}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
		onclick={() => analyzeResult = null} role="button" tabindex="-1"
		onkeydown={(e) => e.key === 'Escape' && (analyzeResult = null)}
	>
		<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_noninteractive_element_interactions -->
		<div class="rounded-xl border border-border/40 w-full max-w-lg" onclick={(e) => e.stopPropagation()} role="presentation" style="background: var(--card); box-shadow: 0 25px 50px -12px rgba(0,0,0,0.35);">
			<div class="flex items-center justify-between px-5 py-3 border-b border-border">
				<h3 class="text-sm font-semibold text-mono">Hasil Analisa</h3>
				<button onclick={() => analyzeResult = null} class="kt-btn kt-btn-icon kt-btn-sm kt-btn-ghost text-muted-foreground" aria-label="Tutup">
					<i class="ki-filled ki-cross text-sm"></i>
				</button>
			</div>
			<div class="p-5 space-y-2.5">
				<div class="flex items-center gap-2">
					<span class="text-xs text-mono font-medium">✅ Klasifikasi ({(analyzeResult.confidence * 100).toFixed(0)}%)</span>
					<Badge size="sm" variant={analyzeResult.is_support_related ? 'success' : 'outline'}>
						{analyzeResult.is_support_related ? 'Support Related' : 'Non-Support'}
					</Badge>
				</div>
				<div class="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-secondary-foreground">
					<div><span class="text-mono font-medium">Type:</span> {analyzeResult.message_type}</div>
					<div><span class="text-mono font-medium">Kategori:</span> {analyzeResult.category}</div>
					<div><span class="text-mono font-medium">Prioritas:</span> {analyzeResult.priority}</div>
					<div><span class="text-mono font-medium">Keyakinan:</span> {(analyzeResult.confidence * 100).toFixed(0)}%</div>
				</div>
				<div class="text-xs text-secondary-foreground"><span class="text-mono font-medium">Ringkasan:</span> {analyzeResult.summary}</div>
				{#if analyzeResult.evidence?.length}
					<div class="text-xs text-secondary-foreground"><span class="text-mono font-medium">Evidence:</span> {analyzeResult.evidence.join('; ')}</div>
				{/if}
				{#if analyzeResult.uncertainty?.length}
					<div class="text-xs text-warning"><span class="font-medium">Uncertainty:</span> {analyzeResult.uncertainty.join('; ')}</div>
				{/if}
			</div>
			<div class="flex items-center justify-end gap-2 px-5 py-3 border-t border-border">
				<button onclick={() => analyzeResult = null} class="kt-btn kt-btn-outline kt-btn-sm">Tutup</button>
				<button onclick={createTicketFromAnalysis} disabled={creating || !analyzeResult.is_support_related}
					class="kt-btn kt-btn-mono kt-btn-sm"
				>
					{creating ? '...' : 'Buat Tiket'}
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.sources-panel-wrapper {
		display: flex;
		gap: 0;
		flex: 1;
		min-height: 0;
	}
	.sources-left-panel {
		width: 100%;
		flex-shrink: 0;
	}
	.sources-right-panel {
		flex: 1;
		min-width: 0;
	}
	@media (min-width: 1024px) {
		.sources-panel-wrapper {
			gap: 1.25rem;
		}
		.sources-left-panel {
			width: 360px;
			border-right: 1px solid var(--border);
		}
		.sources-right-panel.hidden {
			display: none;
		}
	}

	:global(.sources-card) {
		display: flex;
		flex-direction: column;
		min-height: calc(100vh - 280px);
	}
	:global(.sources-card .kt-card-body) {
		display: flex;
		flex-direction: column;
		min-height: 0;
		flex: 1;
	}
</style>
