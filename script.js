const COLOR_PALETTE = [
    { id: 'rose', name: '로즈', hex: '#f67280' },
    { id: 'pink', name: '핑크', hex: '#f8c8dc' },
    { id: 'coral', name: '코랄', hex: '#f8b195' },
    { id: 'lavender', name: '퍼플', hex: '#e2d4f0' },
    { id: 'chacol', name: '차콜', hex: '#b5bad3' },
    { id: 'blue', name: '블루', hex: '#92bef1' },
    { id: 'sky', name: '하늘', hex: '#c0e1fb' },
    { id: 'mint', name: '민트', hex: '#b8e0d2' },
    { id: 'cream', name: '크림', hex: '#fdf4e2' },
    { id: 'gold', name: '골드', hex: '#d4af37' }
];

function applyTextCorrections(text) {
    if (!text) return '';
    let converted = text;

    let openDouble = true;
    converted = converted.replace(/"/g, () => {
        const res = openDouble ? '“' : '”';
        openDouble = !openDouble;
        return res;
    });

    let openSingle = true;
    converted = converted.replace(/'/g, () => {
        const res = openSingle ? '‘' : '’'; 
        openSingle = !openSingle;
        return res;
    });

    converted = converted.replace(/\.{3,}/g, '……');
    converted = converted.replace(/···/g, '……');

    converted = converted.replace(/떄/g, '때');
    converted = converted.replace(/겟지/g, '겠지');
    converted = converted.replace(/겟어/g, '겠어');

    converted = converted.replace(/…”/g, '….”');
    converted = converted.replace(/…’/g, '….’');
    converted = converted.replace(/다”/g, '다.”');
    converted = converted.replace(/다’/g, '다.’');
    converted = converted.replace(/어”/g, '어.”');
    converted = converted.replace(/어’/g, '어.’');
    converted = converted.replace(/데”/g, '데.”');
    converted = converted.replace(/데’/g, '데.’');
    converted = converted.replace(/지”/g, '지.”');
    converted = converted.replace(/지’/g, '지.’');

    return converted;
}

class NovelDatabase {
    constructor() {
        this.dbName = 'NovelArchiveDB';
        this.storeName = 'novels';
        this.db = null;
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, 1);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(this.storeName)) {
                    db.createObjectStore(this.storeName, { keyPath: 'id' });
                }
            };
        });
    }

    async getAllNovels() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(this.storeName, 'readonly');
            const store = transaction.objectStore(this.storeName);
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    }

    async saveAllNovels(novels) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(this.storeName, 'readwrite');
            const store = transaction.objectStore(this.storeName);
            store.clear();
            novels.forEach(novel => store.put(novel));
            transaction.oncomplete = () => resolve(true);
            transaction.onerror = () => reject(transaction.error);
        });
    }
}

class NovelArchiveApp {
    executeSearch() {
        const input = document.getElementById('searchInput');
        if (input) {
            this.searchQuery = input.value.toLowerCase();
            if (this.currentView === 'list') this.render();
        }
    }

    resetSearch() {
        this.searchQuery = '';
        this.selectedTag = '전체';
        const input = document.getElementById('searchInput');
        if (input) input.value = '';
        if (this.currentView === 'list') this.render();
    }

    constructor() {
        this.db = new NovelDatabase();
        this.novels = [];
        this.currentView = 'list';
        this.selectedNovelId = null;
        this.selectedChapterIndex = 0;
        this.selectedSettingIndex = 0;
        this.activeDetailTab = 'chapters';
        this.searchQuery = '';
        this.selectedTag = '전체';
        this.sortOrder = 'latest';
        this.isDarkMode = true;
        this.fontSize = 13;
        this.fontFamily = 'font-nanumgothic';
        this.lineHeight = '180%';
        
        this.lastInput = { color: '#f8c8dc', title: '', keyword: '' };
        this.autoSaveTimer = null;
        this.fileHandle = null;

        this.initTheme();
        this.initPreferences();
        this.initApp();
        this.initGlobalKeyEvents();
    }

    initPreferences() {
        const savedFont = localStorage.getItem('novel_archive_fontsize');
        if (savedFont) this.fontSize = parseInt(savedFont, 10);

        const savedFontFamily = localStorage.getItem('novel_archive_fontfamily');
        if (savedFontFamily) this.fontFamily = savedFontFamily;

        const savedLineHeight = localStorage.getItem('novel_archive_lineheight');
        if (savedLineHeight) this.lineHeight = savedLineHeight;
    }

    initGlobalKeyEvents() {
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.closeModal();

            if (this.currentView === 'detail') {
                if (e.key === 'Home') {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                } else if (e.key === 'End') {
                    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
                }
            }
        });
    }

    async initApp() {
        try {
            await this.db.init();
            this.novels = await this.db.getAllNovels();
            
            if (this.novels.length === 0) {
                const nowISO = new Date().toISOString();
                this.novels = [
                    {
                        id: 1,
                        color: '#f8c8dc',
                        title: '환생한 대마법사의 은밀한 백업',
                        keyword: '판타지, 회귀, 아카데미, 먼치킨',
                        targetChars: 5000,
                        settings: [
                            { title: '세계관 요약', content: '### 세계관 개요\n- **마법 제국 아르카시아**\n- 서클 시스템 폐지 후 심상 마법 대중화' },
                            { title: '주요 인물', content: '### 루카스\n- **나이**: 17세\n- **특징**: 전대 대마법사 회귀자' }
                        ],
                        chapters: [
                            { title: '1. 바란다면, 너의 검이 되어주겠다', content: '눈을 떠보니 소설 속 삼류 악당의 몸이었다.', createdAt: nowISO, updatedAt: nowISO }
                        ],
                        createdAt: nowISO,
                        updatedAt: nowISO
                    }
                ];
                await this.db.saveAllNovels(this.novels);
            } else {
                this.novels.forEach(n => {
                    if (!n.settings && n.worldbuilding) {
                        n.settings = [{ title: '세계관 및 설정', content: n.worldbuilding }];
                    } else if (!n.settings) {
                        n.settings = [{ title: '기본 설정', content: '설정 없음' }];
                    }
                    if (!n.createdAt) n.createdAt = new Date().toISOString();
                    if (!n.updatedAt) n.updatedAt = n.createdAt;
                    if (n.chapters) {
                        n.chapters.forEach(ch => {
                            if (!ch.createdAt) ch.createdAt = n.createdAt;
                            if (!ch.updatedAt) ch.updatedAt = ch.createdAt;
                        });
                    }
                });
            }
            
            const lastMem = localStorage.getItem('novel_archive_last_input');
            if (lastMem) this.lastInput = JSON.parse(lastMem);

            this.render();
        } catch (e) {
            console.error('초기화 실패:', e);
        }
    }

    async connectFile() {
        if (!window.showOpenFilePicker) {
            this.showToast('이 브라우저는 File System Access API를 지원하지 않습니다.', 'error');
            return;
        }
        try {
            const [handle] = await window.showOpenFilePicker({
                types: [{
                    description: 'JSON Files',
                    accept: { 'application/json': ['.json'] }
                }],
                multiple: false
            });
            this.fileHandle = handle;
            
            const file = await handle.getFile();
            const text = await file.text();
            const parsed = JSON.parse(text);
            if (Array.isArray(parsed)) {
                this.novels = parsed;
                await this.db.saveAllNovels(this.novels);
                this.render();
                this.updateFileButtonsState(true, file.name);
                this.showToast(`'${file.name}' 파일이 연결 및 로드되었습니다.`);
            }
        } catch (err) {
            if (err.name !== 'AbortError') {
                console.error(err);
                this.showToast('파일 연결 중 오류가 발생했습니다.', 'error');
            }
        }
    }

    async saveToFile() {
        if (!this.fileHandle) {
            await this.saveAsNewFile();
            return;
        }
        try {
            if ((await this.fileHandle.queryPermission({ mode: 'readwrite' })) !== 'granted') {
                if ((await this.fileHandle.requestPermission({ mode: 'readwrite' })) !== 'granted') {
                    this.showToast('파일 쓰기 권한이 거부되었습니다.', 'error');
                    return;
                }
            }
            const writable = await this.fileHandle.createWritable();
            await writable.write(JSON.stringify(this.novels, null, 2));
            await writable.close();
            this.showToast('연결된 파일에 성공적으로 저장되었습니다.');
        } catch (err) {
            console.error(err);
            this.showToast('파일 저장 중 오류가 발생했습니다.', 'error');
        }
    }

    async saveAsNewFile() {
        if (!window.showSaveFilePicker) {
            this.downloadJSON();
            return;
        }
        try {
            const handle = await window.showSaveFilePicker({
                suggestedName: 'novel_archive_data.json',
                types: [{
                    description: 'JSON Files',
                    accept: { 'application/json': ['.json'] }
                }]
            });
            this.fileHandle = handle;
            const writable = await handle.createWritable();
            await writable.write(JSON.stringify(this.novels, null, 2));
            await writable.close();
            const file = await handle.getFile();
            this.updateFileButtonsState(true, file.name);
            this.showToast(`새 파일('${file.name}')에 저장 및 연결되었습니다.`);
        } catch (err) {
            if (err.name !== 'AbortError') {
                console.error(err);
            }
        }
    }

    updateFileButtonsState(isConnected, fileName = '') {
        const connectBtn = document.getElementById('connectFileBtn');
        const saveBtn = document.getElementById('saveFileBtn');
        if (isConnected) {
            if (connectBtn) {
                connectBtn.innerText = `📁 ${fileName}`;
                connectBtn.className = "flex items-center gap-1.5 px-3.5 py-2 bg-[#b8e0d2] text-[#2c5446] rounded-lg text-sm font-medium transition border border-[#b8e0d2] truncate max-w-[180px]";
                connectBtn.title = `연결된 파일: ${fileName} (클릭하여 다른 파일로 교체)`;
                connectBtn.onclick = () => this.connectFile();
            }
            if (saveBtn) {
                saveBtn.classList.remove('hidden');
            }
        }
    }

    async persistNovels() {
        await this.db.saveAllNovels(this.novels);
        if (this.fileHandle) {
            try {
                if ((await this.fileHandle.queryPermission({ mode: 'readwrite' })) !== 'granted') {
                    await this.fileHandle.requestPermission({ mode: 'readwrite' });
                }
                const writable = await this.fileHandle.createWritable();
                await writable.write(JSON.stringify(this.novels, null, 2));
                await writable.close();
            } catch (e) {
                console.error('파일 자동 백업 실패:', e);
                this.showToast('파일 백업 권한이 유실되었거나 저장에 실패했습니다.', 'error');
            }
        }
    }

    initTheme() {
        const savedTheme = localStorage.getItem('novel_archive_theme');
        this.isDarkMode = savedTheme ? savedTheme === 'dark' : true;
        this.applyTheme();
    }

    toggleDarkMode() {
        this.isDarkMode = !this.isDarkMode;
        localStorage.setItem('novel_archive_theme', this.isDarkMode ? 'dark' : 'light');
        this.applyTheme();
    }

    applyTheme() {
        const htmlEl = document.documentElement;
        const btn = document.getElementById('themeToggleBtn');
        if (this.isDarkMode) {
            htmlEl.classList.add('dark');
            if (btn) btn.innerHTML = `☀️`;
        } else {
            htmlEl.classList.remove('dark');
            if (btn) btn.innerHTML = `🌙 `;
        }
    }

    showToast(message, type = 'success') {
        const container = document.getElementById('toastContainer');
        if (!container) return;
        const toast = document.createElement('div');
        const bgColor = type === 'success' ? 'bg-[#b8e0d2] text-[#2c5446]' : 'bg-[#f67280] text-white';
        toast.className = `${bgColor} px-4 py-3 rounded-xl shadow-xl text-sm font-medium transition transform translate-y-2 opacity-0 border border-[#f0e6ed]`;
        toast.innerText = message;
        container.appendChild(toast);
        setTimeout(() => toast.classList.remove('translate-y-2', 'opacity-0'), 10);
        setTimeout(() => {
            toast.classList.add('translate-y-2', 'opacity-0');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    formatDate(isoString) {
        if (!isoString) return '-';
        const d = new Date(isoString);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        const hh = String(d.getHours()).padStart(2, '0');
        const min = String(d.getMinutes()).padStart(2, '0');
        const ss = String(d.getSeconds()).padStart(2, '0');
        return `${yyyy}.${mm}.${dd} ${hh}:${min}:${ss}`;
    }

    calculateTotalChars(novel) {
        if (!novel.chapters || novel.chapters.length === 0) return 0;
        return novel.chapters.reduce((acc, ch) => acc + (ch.content ? ch.content.length : 0), 0);
    }

    calculateCharsWithoutSpaces(text) {
        if (!text) return 0;
        return text.replace(/\s+/g, '').length;
    }

    hasValidSettings(novel) {
        if (!novel.settings || !Array.isArray(novel.settings)) return false;
        const totalSettingChars = novel.settings.reduce((acc, st) => acc + (st.content ? st.content.length : 0), 0);
        return totalSettingChars >= 100;
    }

    parseMarkdown(text) {
        if (!text) return '';
        let escaped = escapeHtml(text);
        escaped = escaped.replace(/^###\s+(.*)$/gm, '<h3 class="text-lg font-bold my-2 text-[#f67280] dark:text-[#e5c07b]">$1</h3>');
        escaped = escaped.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-[#3d3b40] dark:text-white">$1</strong>');
        return escaped;
    }

    getFilteredNovels() {
        let filtered = this.novels.filter(n => {
            const matchesSearch = !this.searchQuery || 
                n.title.toLowerCase().includes(this.searchQuery) || 
                (n.keyword && n.keyword.toLowerCase().includes(this.searchQuery)) ||
                n.chapters.some(c => c.content.toLowerCase().includes(this.searchQuery));
            
            if (!matchesSearch) return false;

            if (this.selectedTag !== '전체') {
                const tags = (n.keyword || '').split(',').map(t => t.trim());
                if (!tags.includes(this.selectedTag)) return false;
            }
            return true;
        });

        filtered.sort((a, b) => {
            switch (this.sortOrder) {
                case 'latest':
                    return new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime();
                case 'oldest_updated':
                    return new Date(a.updatedAt || a.createdAt || 0).getTime() - new Date(b.updatedAt || b.createdAt || 0).getTime();
                case 'created_desc':
                    return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
                case 'created_asc':
                    return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
                case 'id_asc':
                    return a.id - b.id;
                case 'id_desc':
                    return b.id - a.id;
                case 'title_asc':
                    return (a.title || '').localeCompare(b.title || '', 'ko');
                case 'title_desc':
                    return (b.title || '').localeCompare(a.title || '', 'ko');
                case 'chars_desc':
                    return this.calculateTotalChars(b) - this.calculateTotalChars(a);
                case 'chars_asc':
                    return this.calculateTotalChars(a) - this.calculateTotalChars(b);
                default:
                    return 0;
            }
        });

        return filtered;
    }

    render() {
        const viewContainer = document.getElementById('appView');
        if (!viewContainer) return;
        if (this.currentView === 'list') {
            viewContainer.innerHTML = this.renderListView();
        } else if (this.currentView === 'detail') {
            viewContainer.innerHTML = this.renderDetailView();
        }
        this.applyTheme();
    }

    goToList() {
        this.currentView = 'list';
        this.selectedNovelId = null;
        this.render();
    }

    goToDetail(novelId) {
        this.currentView = 'detail';
        this.selectedNovelId = novelId;
        this.selectedChapterIndex = 0;
        this.selectedSettingIndex = 0;
        this.activeDetailTab = 'chapters';
        this.render();
    }

    goToPrevNovel() {
        const filteredList = this.getFilteredNovels();
        const currentIndex = filteredList.findIndex(n => n.id === this.selectedNovelId);
        if (currentIndex > 0) {
            this.goToDetail(filteredList[currentIndex - 1].id);
        } else {
            this.showToast('이전 작품이 없습니다.', 'error');
        }
    }

    goToNextNovel() {
        const filteredList = this.getFilteredNovels();
        const currentIndex = filteredList.findIndex(n => n.id === this.selectedNovelId);
        if (currentIndex !== -1 && currentIndex < filteredList.length - 1) {
            this.goToDetail(filteredList[currentIndex + 1].id);
        } else {
            this.showToast('다음 작품이 없습니다.', 'error');
        }
    }

    handleSearch(query) {
        this.searchQuery = query.toLowerCase();
        if (this.currentView === 'list') this.render();
    }

    handleInternalSearch(query) {
        const displayEl = document.getElementById('chapterContentDisplay');
        if (!displayEl) return;
        
        const novel = this.novels.find(n => n.id === this.selectedNovelId);
        if (!novel || !novel.chapters[this.selectedChapterIndex]) return;
        const rawContent = novel.chapters[this.selectedChapterIndex].content || '';

        if (!query.trim()) {
            displayEl.innerText = rawContent.trim();
            return;
        }

        const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(${escapedQuery})`, 'gi');
        const parsedHtml = escapeHtml(rawContent).replace(regex, '<span class="search-highlight">$1</span>');
        
        displayEl.innerHTML = parsedHtml;

        const highlightEl = displayEl.querySelector('.search-highlight');
        if (highlightEl) {
            highlightEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            this.showToast(`'${query}' 검색 완료`, 'success');
        } else {
            this.showToast('일치하는 단어가 없습니다.', 'error');
        }
    }

    filterByTag(tag) {
        this.selectedTag = tag;
        this.render();
    }

    changeSort(order) {
        this.sortOrder = order;
        this.render();
    }

    renderListView() {
        let tagCounts = {};
        this.novels.forEach(n => {
            if (n.keyword) {
                n.keyword.split(',').forEach(t => {
                    const trimmed = t.trim();
                    if (trimmed) {
                        tagCounts[trimmed] = (tagCounts[trimmed] || 0) + 1;
                    }
                });
            }
        });

        const allTags = Object.keys(tagCounts).sort((a, b) => {
            if (tagCounts[b] !== tagCounts[a]) {
                return tagCounts[b] - tagCounts[a];
            }
            return a.localeCompare(b, 'ko');
        });

        const filtered = this.getFilteredNovels();

        return `
            <div class="flex flex-col space-y-6">
                <div class="pastel-panel rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
                    <div class="flex items-center gap-3 flex-wrap">
                        <span class="text-sm font-medium text-gray-600 dark:text-gray-300">총 작품수: <strong class="text-gray-900 dark:text-white">${this.novels.length}</strong>개</span>
                        <button onclick="app.toggleSelectAll(this)" class="text-xs px-3 py-1.5 bg-white dark:bg-[#21252b] hover:bg-gray-100 text-gray-700 dark:text-gray-300 rounded-lg transition border border-[#f0e6ed] dark:border-gray-700">전체 선택</button>
                        <button onclick="app.openBatchTagModal()" class="text-xs px-3 py-1.5 bg-[#e2d4f0]/60 dark:bg-purple-900/40 hover:bg-[#e2d4f0] text-[#4a3d54] dark:text-purple-300 rounded-lg transition border border-[#e2d4f0] dark:border-purple-800/50">일괄 태그 관리</button>
                        <button onclick="app.deleteSelectedNovels()" class="text-xs px-3 py-1.5 bg-rose-50 dark:bg-rose-900/40 hover:bg-rose-100 text-rose-600 dark:text-rose-300 rounded-lg transition border border-rose-200 dark:border-rose-800/50">선택 삭제</button>
                    </div>
                    <div class="flex flex-wrap items-center gap-2">
                        <button onclick="app.openNewPostModal()" class="flex items-center gap-2 bg-gradient-to-r from-[#f8b195] to-[#f67280] text-white px-4 py-2 rounded-lg text-sm font-medium transition shadow-md">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>새 게시글
                        </button>
                        <select onchange="app.filterByTag(this.value)" class="bg-white dark:bg-[#21252b] border border-[#f0e6ed] dark:border-gray-700 text-sm rounded-lg px-3 py-2 text-gray-700 dark:text-gray-200 focus:outline-none">
                            <option value="전체" ${this.selectedTag === '전체' ? 'selected' : ''}>모든 태그 전체보기</option>
                            ${allTags.map(t => `<option value="${escapeHtml(t)}" ${this.selectedTag === t ? 'selected' : ''}>#${escapeHtml(t)} (${tagCounts[t]})</option>`).join('')}
                        </select>
                    </div>
                </div>

                <div class="pastel-panel rounded-xl overflow-hidden shadow-md">
                    <div class="overflow-x-auto">
                        <table class="w-full text-left border-collapse">
                            <thead>
                                <tr class="bg-[#fceae6]/60 dark:bg-[#282c34] border-b border-[#f0e6ed] dark:border-gray-800 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    <th class="p-4 w-12 text-center">#</th>
                                    <th class="p-4 w-16 text-center">No</th>
                                    <th class="p-4 text-center">제목</th>
                                    <th class="p-4 text-center">키워드</th>
                                    <th class="p-4 w-24 text-center">회차</th>
                                    <th class="p-4 w-32 text-right">총 글자수</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-[#f0e6ed] dark:divide-gray-800 text-sm">
                                ${filtered.length === 0 ? `
                                    <tr>
                                        <td colspan="6" class="p-12 text-center text-gray-400 dark:text-gray-500">조건에 일치하는 작품이 없습니다.</td>
                                    </tr>
                                ` : filtered.map((novel) => {
                                    const totalChars = this.calculateTotalChars(novel);
                                    const chapterCount = novel.chapters ? novel.chapters.length : 0;
                                    const tags = novel.keyword ? novel.keyword.split(',').map(t => t.trim()).filter(Boolean) : [];
                                    const hasSettings = this.hasValidSettings(novel);
                                    return `
                                        <tr class="hover:bg-[#fceae6]/20 dark:hover:bg-[#282c34]/50 transition group">
                                            <td class="p-4 text-center">
                                                <input type="checkbox" data-id="${novel.id}" class="novel-checkbox rounded bg-white dark:bg-[#21252b] border-gray-300 dark:border-gray-700 text-[#f67280] focus:ring-0 cursor-pointer w-4 h-4">
                                            </td>
                                            <td class="p-4 font-mono text-gray-500 dark:text-gray-400 text-center">${novel.id}</td>
                                            <td class="p-4">
                                                <a href="javascript:void(0)" onclick="app.goToDetail(${novel.id})" class="text-[#3d3b40] dark:text-gray-100 hover:text-[#f67280] dark:hover:text-[#e5c07b] transition flex items-center gap-2 font-medium">
                                                <div class="w-4 h-4 rounded-full shadow-sm" style="background-color: ${novel.color || '#f8c8dc'};"></div>
                                                    ${escapeHtml(novel.title)}
                                                    ${hasSettings ? '<span title="설정집 100자 이상 등록됨" class="text-sm">🏷️</span>' : ''}
                                                </a>
                                            </td>
                                            <td class="p-4 text-gray-500 dark:text-gray-400 text-xs text-center">
                                                <div class="flex flex-wrap justify-center gap-1">
                                                    ${tags.length > 0 ? tags.map(t => `<span onclick="event.stopPropagation(); app.filterByTag('${escapeHtml(t)}')" class="cursor-pointer hover:text-[#f67280] transition">*${escapeHtml(t)}</span>`).join(' ') : '-'}
                                                </div>
                                            </td>
                                            <td class="p-4 text-center font-medium text-[#f67280] dark:text-[#e5c07b]">${chapterCount}화</td>
                                            <td class="p-4 text-right font-mono text-gray-700 dark:text-gray-300">${totalChars.toLocaleString()}자</td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div class="pastel-panel rounded-xl p-4 flex flex-col gap-3">
                    <div class="flex flex-wrap items-center justify-between gap-3">
                        <div class="flex items-center gap-2 flex-1 min-w-[320px]">
                            <input type="text" id="searchInput" placeholder="🔍 제목, 태그 또는 본문 내용 검색" value="${escapeHtml(this.searchQuery)}" onkeydown="if(event.key==='Enter') app.executeSearch()" class="flex-1 bg-white dark:bg-[#21252b] border border-[#f0e6ed] dark:border-gray-700 text-sm rounded-lg px-4 py-2 text-gray-900 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:border-[#f8b195]">
                            <button onclick="app.executeSearch()" class="px-4 py-2 bg-[#f8b195] hover:bg-[#f67280] text-white text-sm font-medium rounded-lg shrink-0 transition shadow">검색</button>
                            <button onclick="app.resetSearch()" class="px-4 py-2 bg-white dark:bg-[#21252b] hover:bg-gray-100 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg shrink-0 transition border border-[#f0e6ed] dark:border-gray-700">초기화</button>
                        </div>

                        <div class="flex items-center gap-2">
                            <select onchange="app.changeSort(this.value)" class="bg-white dark:bg-[#21252b] border border-[#f0e6ed] dark:border-gray-700 text-sm rounded-lg px-3 py-2 text-gray-700 dark:text-gray-200 focus:outline-none">
                                <optgroup label="업데이트순">
                                    <option value="latest" ${this.sortOrder === 'latest' ? 'selected' : ''}>업데이트순 (최신순)</option>
                                    <option value="oldest_updated" ${this.sortOrder === 'oldest_updated' ? 'selected' : ''}>업데이트순 (오래된순)</option>
                                </optgroup>
                                <optgroup label="등록순">
                                    <option value="created_desc" ${this.sortOrder === 'created_desc' ? 'selected' : ''}>등록순 (최근 등록순)</option>
                                    <option value="created_asc" ${this.sortOrder === 'created_asc' ? 'selected' : ''}>등록순 (오래된 등록순)</option>
                                </optgroup>
                                <optgroup label="번호순">
                                    <option value="id_asc" ${this.sortOrder === 'id_asc' ? 'selected' : ''}>번호순 (오름차순)</option>
                                    <option value="id_desc" ${this.sortOrder === 'id_desc' ? 'selected' : ''}>번호순 (내림차순)</option>
                                </optgroup>
                                <optgroup label="제목순">
                                    <option value="title_asc" ${this.sortOrder === 'title_asc' ? 'selected' : ''}>제목순 (가나다순)</option>
                                    <option value="title_desc" ${this.sortOrder === 'title_desc' ? 'selected' : ''}>제목순 (역가나다순)</option>
                                </optgroup>
                                <optgroup label="글자수 순">
                                    <option value="chars_desc" ${this.sortOrder === 'chars_desc' ? 'selected' : ''}>글자수 순 (많은순)</option>
                                    <option value="chars_asc" ${this.sortOrder === 'chars_asc' ? 'selected' : ''}>글자수 순 (적은순)</option>
                                </optgroup>
                            </select>
                        </div>
                    </div>

                    <div class="flex flex-wrap items-center gap-2 text-sm pt-1">
                        <span class="text-gray-500 dark:text-gray-400 font-medium text-xs">🏷️ 태그 필터:</span>
                        <button onclick="app.filterByTag('전체')" class="px-3 py-1 rounded-full text-xs font-medium transition ${this.selectedTag === '전체' ? 'bg-[#f67280] text-white shadow' : 'bg-white dark:bg-[#21252b] text-gray-700 dark:text-gray-300 hover:bg-gray-100 border border-[#f0e6ed] dark:border-gray-700'}">전체</button>
                        ${allTags.map(tag => `
                            <button onclick="app.filterByTag('${escapeHtml(tag)}')" class="px-3 py-1 rounded-full text-xs font-medium transition ${this.selectedTag === tag ? 'bg-[#f67280] text-white shadow' : 'bg-white dark:bg-[#21252b] text-gray-700 dark:text-gray-300 hover:bg-gray-100 border border-[#f0e6ed] dark:border-gray-700'}">${escapeHtml(tag)}</button>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    toggleSelectAll(btn) {
        const checkboxes = document.querySelectorAll('.novel-checkbox');
        const allChecked = Array.from(checkboxes).every(cb => cb.checked);
        checkboxes.forEach(cb => cb.checked = !allChecked);
        btn.textContent = allChecked ? '전체 선택' : '선택 해제';
    }

    openBatchTagModal() {
        const checkboxes = document.querySelectorAll('.novel-checkbox:checked');
        if (checkboxes.length === 0) {
            this.showToast('태그를 관리할 작품을 체크박스로 선택해주세요.', 'error');
            return;
        }

        let allTagsSet = new Set();
        this.novels.forEach(n => {
            if (n.keyword) {
                n.keyword.split(',').forEach(t => {
                    const trimmed = t.trim();
                    if (trimmed) allTagsSet.add(trimmed);
                });
            }
        });
        const allTags = Array.from(allTagsSet);

        const modal = document.getElementById('modalOverlay');
        const content = document.getElementById('modalContent');

        content.innerHTML = `
            <div class="bg-[#fceae6] dark:bg-[#282c34] px-6 py-4 border-b border-[#f0e6ed] dark:border-gray-800 flex items-center justify-between">
                <h3 class="font-bold text-lg text-gray-900 dark:text-white">선택한 작품 일괄 태그 관리 (${checkboxes.length}개 작품)</h3>
                <button onclick="app.closeModal()" class="text-gray-400 hover:text-gray-600 dark:hover:text-white transition">✕</button>
            </div>
            <div class="p-6 space-y-6 overflow-y-auto max-h-[80vh]">
                <div class="bg-white dark:bg-[#181a1f] p-4 rounded-xl border border-[#f0e6ed] dark:border-gray-800 space-y-3">
                    <h4 class="text-sm font-bold text-gray-900 dark:text-white">➕ 일괄 태그 추가</h4>
                    <p class="text-xs text-gray-400">선택한 작품들에 추가할 태그를 쉼표(,)로 구분하여 입력하세요.</p>
                    <div class="flex gap-2">
                        <input type="text" id="batchAddTagInput" placeholder="예: 해피엔딩, 애절물" class="w-full bg-[#fdf8f5] dark:bg-[#21252b] border border-[#f0e6ed] dark:border-gray-700 rounded-lg px-4 py-2.5 text-sm text-gray-900 dark:text-gray-100 flex-1">
                        <button onclick="app.handleBatchAddTag()" class="px-4 py-2 bg-[#f8b195] hover:bg-[#f67280] text-white rounded-lg text-sm font-medium shrink-0">추가하기</button>
                    </div>
                </div>

                <div class="bg-white dark:bg-[#181a1f] p-4 rounded-xl border border-[#f0e6ed] dark:border-gray-800 space-y-3">
                    <h4 class="text-sm font-bold text-gray-900 dark:text-white">➖ 특정 태그 일괄 삭제</h4>
                    <p class="text-xs text-gray-400">선택한 작품들에서 제거할 태그를 선택하세요.</p>
                    <div class="flex gap-2">
                        <select id="batchRemoveTagSelect" class="w-full bg-[#fdf8f5] dark:bg-[#21252b] border border-[#f0e6ed] dark:border-gray-700 rounded-lg px-4 py-2.5 text-sm text-gray-900 dark:text-gray-100 flex-1">
                            <option value="">삭제할 태그 선택...</option>
                            ${allTags.map(t => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join('')}
                        </select>
                        <button onclick="app.handleBatchRemoveTag()" class="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-sm font-medium shrink-0">삭제하기</button>
                    </div>
                </div>
            </div>
            <div class="bg-[#fceae6]/50 dark:bg-[#282c34] px-6 py-3 border-t border-[#f0e6ed] dark:border-gray-800 flex justify-end">
                <button type="button" onclick="app.closeModal()" class="px-4 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg text-sm border border-[#f0e6ed] dark:border-gray-700">닫기</button>
            </div>
        `;
        modal.classList.remove('hidden');
    }

    async handleBatchAddTag() {
        const inputVal = document.getElementById('batchAddTagInput').value.trim();
        if (!inputVal) {
            this.showToast('추가할 태그를 입력해주세요.', 'error');
            return;
        }
        const newTags = inputVal.split(',').map(t => t.trim()).filter(Boolean);
        const checkboxes = document.querySelectorAll('.novel-checkbox:checked');
        const ids = Array.from(checkboxes).map(cb => parseInt(cb.dataset.id));

        const nowISO = new Date().toISOString();
        this.novels.forEach(n => {
            if (ids.includes(n.id)) {
                let existingTags = n.keyword ? n.keyword.split(',').map(t => t.trim()).filter(Boolean) : [];
                newTags.forEach(nt => {
                    if (!existingTags.includes(nt)) existingTags.push(nt);
                });
                n.keyword = existingTags.join(', ');
                n.updatedAt = nowISO;
            }
        });

        await this.persistNovels();
        this.closeModal();
        this.showToast('선택한 작품에 태그가 일괄 추가되었습니다.');
        this.render();
    }

    async handleBatchRemoveTag() {
        const tagToRemove = document.getElementById('batchRemoveTagSelect').value;
        if (!tagToRemove) {
            this.showToast('삭제할 태그를 선택해주세요.', 'error');
            return;
        }
        const checkboxes = document.querySelectorAll('.novel-checkbox:checked');
        const ids = Array.from(checkboxes).map(cb => parseInt(cb.dataset.id));

        const nowISO = new Date().toISOString();
        this.novels.forEach(n => {
            if (ids.includes(n.id) && n.keyword) {
                let existingTags = n.keyword.split(',').map(t => t.trim()).filter(Boolean);
                existingTags = existingTags.filter(t => t !== tagToRemove);
                n.keyword = existingTags.join(', ');
                n.updatedAt = nowISO;
            }
        });

        await this.persistNovels();
        this.closeModal();
        this.showToast(`선택한 작품에서 '${tagToRemove}' 태그가 삭제되었습니다.`);
        this.render();
    }

    async deleteSelectedNovels() {
        const checkboxes = document.querySelectorAll('.novel-checkbox:checked');
        if (checkboxes.length === 0) {
            this.showToast('삭제할 작품을 선택해주세요.', 'error');
            return;
        }
        if (!confirm(`선택한 ${checkboxes.length}개의 작품을 삭제하시겠습니까?`)) return;

        const idsToDelete = Array.from(checkboxes).map(cb => parseInt(cb.dataset.id));
        this.novels = this.novels.filter(n => !idsToDelete.includes(n.id));
        await this.persistNovels();
        this.showToast('선택한 작품이 삭제되었습니다.');
        this.render();
    }

    downloadJSON() {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(this.novels, null, 2));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", `novel_archive_backup_${new Date().toISOString().slice(0,10)}.json`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
        this.showToast('JSON 백업 파일이 다운로드되었습니다.');
    }

    restoreJSON(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const parsed = JSON.parse(e.target.result);
                if (Array.isArray(parsed)) {
                    if (confirm(`불러온 백업 데이터로 덮어쓰시겠습니까?`)) {
                        this.novels = parsed;
                        await this.persistNovels();
                        this.showToast('성공적으로 복원되었습니다.');
                        this.render();
                    }
                }
            } catch (err) {
                this.showToast('JSON 파일을 파싱하는 중 오류가 발생했습니다.', 'error');
            }
        };
        reader.readAsText(file);
        event.target.value = '';
    }

    triggerAutoCorrect(textareaId) {
        const el = document.getElementById(textareaId);
        if (el) {
            el.value = applyTextCorrections(el.value);
            this.showToast('부호 및 오타가 자동으로 교정되었습니다.');
        }
    }

    openNewPostModal() {
        const modal = document.getElementById('modalOverlay');
        const content = document.getElementById('modalContent');
        const defColor = this.lastInput.color || '#f8c8dc';

        content.innerHTML = `
            <div class="bg-[#fceae6] dark:bg-[#282c34] px-6 py-4 border-b border-[#f0e6ed] dark:border-gray-800 flex items-center justify-between">
                <h3 class="font-bold text-lg text-gray-900 dark:text-white">새 작품 등록</h3>
                <button onclick="app.closeModal()" class="text-gray-400 hover:text-gray-600 dark:hover:text-white transition">✕</button>
            </div>
            <form onsubmit="app.handleCreatePost(event)" class="p-6 space-y-5 overflow-y-auto max-h-[80vh]">
                <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">색상 라벨</label>
                    <div class="grid grid-cols-5 gap-2.5">
                        ${COLOR_PALETTE.map(c => `
                            <label class="flex items-center gap-2 p-2 rounded-lg cursor-pointer">
                                <input type="radio" name="postColor" value="${c.hex}" ${c.hex === defColor ? 'checked' : ''} class="text-[#f67280]">
                                <span class="w-4 h-4 rounded-full shadow-sm" style="background-color: ${c.hex};"></span>
                                <span class="text-xs text-gray-700 dark:text-gray-300">${c.name}</span>
                            </label>
                        `).join('')}
                    </div>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">제목</label>
                    <input type="text" id="postTitle" placeholder="작품 제목" class="w-full bg-[#fdf8f5] dark:bg-[#181a1f] border border-[#f0e6ed] dark:border-gray-700 rounded-lg px-4 py-2.5 text-sm text-gray-900 dark:text-gray-100" required>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">키워드 (쉼표로 구분)</label>
                    <input type="text" id="postKeyword" placeholder="예: 로맨스, 피폐물" class="w-full bg-[#fdf8f5] dark:bg-[#181a1f] border border-[#f0e6ed] dark:border-gray-700 rounded-lg px-4 py-2.5 text-sm text-gray-900 dark:text-gray-100">
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">첫 회차 제목</label>
                        <input type="text" id="postChapterTitle" value="1화." class="w-full bg-[#fdf8f5] dark:bg-[#181a1f] border border-[#f0e6ed] dark:border-gray-700 rounded-lg px-4 py-2.5 text-sm text-gray-900 dark:text-gray-100" required>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">회차당 목표 글자수</label>
                        <input type="number" id="postTargetChars" value="5000" step="500" class="w-full bg-[#fdf8f5] dark:bg-[#181a1f] border border-[#f0e6ed] dark:border-gray-700 rounded-lg px-4 py-2.5 text-sm text-gray-900 dark:text-gray-100">
                    </div>
                </div>
                <div>
                    <div class="flex items-center justify-between mb-1">
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">본문 내용</label>
                        <div class="flex items-center gap-2">
                            <button type="button" onclick="app.triggerAutoCorrect('postContent')" class="gold-button">✨ 자동 교정/부호 변환</button>
                            <label class="cyan-button">
                                텍스트파일 업로드 (.txt)
                                <input type="file" accept=".txt" onchange="app.handleTextFileUpload(event)" class="hidden">
                            </label>
                        </div>
                    </div>
                    <textarea id="postContent" rows="16" placeholder="본문 내용을 입력하거나 텍스트 파일을 업로드하세요." class="w-full bg-[#fdf8f5] dark:bg-[#181a1f] border border-[#f0e6ed] dark:border-gray-700 rounded-lg p-4 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-[#f8b195] text-sm novel-content ${this.fontFamily}" style="line-height: ${this.lineHeight};"></textarea>
                </div>
                <div class="px-6 py-3 flex justify-end gap-3">
                    <button type="button" onclick="app.closeModal()" class="px-4 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg text-sm border border-[#f0e6ed] dark:border-gray-700">취소</button>
                    <button type="submit" class="px-5 py-2 bg-[#f8b195] hover:bg-[#f67280] text-white rounded-lg text-sm font-medium shadow">등록하기</button>
                </div>
            </form>
        `;
        modal.classList.remove('hidden');
    }

    handleTextFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        const fileNameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
        const chTitleInput = document.getElementById('postChapterTitle');
        if (chTitleInput && (!chTitleInput.value || chTitleInput.value.startsWith('1화'))) {
            chTitleInput.value = fileNameWithoutExt;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            const textarea = document.getElementById('postContent');
            if (textarea) {
                textarea.value = applyTextCorrections((e.target.result || '').trim());
                this.showToast('텍스트 파일 업로드 및 자동 교정 완료');
            }
        };
        reader.readAsText(file, 'utf-8');
    }

    async handleCreatePost(event) {
        event.preventDefault();
        const selectedRadio = document.querySelector('input[name="postColor"]:checked');
        let color = selectedRadio ? selectedRadio.value : '#f8c8dc';
        let title = document.getElementById('postTitle').value.trim() || '무제 작품';
        let keyword = document.getElementById('postKeyword').value.trim() || '';
        let targetChars = parseInt(document.getElementById('postTargetChars').value) || 5000;
        let chTitle = document.getElementById('postChapterTitle').value.trim() || '1화';
        let content = applyTextCorrections((document.getElementById('postContent').value || '').trim());

        this.lastInput = { color, title, keyword };
        localStorage.setItem('novel_archive_last_input', JSON.stringify(this.lastInput));

        const nowISO = new Date().toISOString();
        const newId = this.novels.length > 0 ? Math.max(...this.novels.map(n => n.id)) + 1 : 1;
        const newNovel = {
            id: newId,
            color,
            title,
            keyword,
            targetChars,
            settings: [{ title: '세계관 및 설정', content: '설정을 입력하세요.', createdAt: nowISO, updatedAt: nowISO }],
            chapters: [{ title: chTitle, content: content, createdAt: nowISO, updatedAt: nowISO }],
            createdAt: nowISO,
            updatedAt: nowISO
        };

        this.novels.unshift(newNovel);
        await this.persistNovels();
        this.closeModal();
        this.showToast('새 작품이 등록되었습니다.');
        this.render();
    }

    openEditNovelModal(novelId) {
        const modal = document.getElementById('modalOverlay');
        const content = document.getElementById('modalContent');
        const novel = this.novels.find(n => n.id === novelId);
        if (!novel) return;

        content.innerHTML = `
            <div class="bg-[#fceae6] dark:bg-[#282c34] px-6 py-4 border-b border-[#f0e6ed] dark:border-gray-800 flex items-center justify-between">
                <h3 class="font-bold text-lg text-gray-900 dark:text-white">작품 정보 수정</h3>
                <button onclick="app.closeModal()" class="text-gray-400 hover:text-gray-600 dark:hover:text-white transition">✕</button>
            </div>
            <form onsubmit="app.handleEditNovelSubmit(event, ${novelId})" class="p-6 space-y-5 overflow-y-auto max-h-[80vh]">
                <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">색상 라벨</label>
                    <div class="grid grid-cols-5 gap-2.5">
                        ${COLOR_PALETTE.map(c => `
                            <label class="flex items-center gap-2 p-2 rounded-lg cursor-pointer">
                                <input type="radio" name="editNovelColor" value="${c.hex}" ${c.hex.toLowerCase() === (novel.color || '').toLowerCase() ? 'checked' : ''} class="text-[#f67280]">
                                <span class="w-4 h-4 rounded-full shadow-sm" style="background-color: ${c.hex};"></span>
                                <span class="text-xs text-gray-700 dark:text-gray-300">${c.name}</span>
                            </label>
                        `).join('')}
                    </div>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">제목</label>
                    <input type="text" id="editNovelTitle" value="${escapeHtml(novel.title)}" class="w-full bg-[#fdf8f5] dark:bg-[#181a1f] border border-[#f0e6ed] dark:border-gray-700 rounded-lg px-4 py-2.5 text-sm text-gray-900 dark:text-gray-100" required>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">키워드</label>
                    <input type="text" id="editNovelKeyword" value="${escapeHtml(novel.keyword || '')}" class="w-full bg-[#fdf8f5] dark:bg-[#181a1f] border border-[#f0e6ed] dark:border-gray-700 rounded-lg px-4 py-2.5 text-sm text-gray-900 dark:text-gray-100">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">회차당 목표 글자수</label>
                    <input type="number" id="editNovelTarget" value="${novel.targetChars || 5000}" step="500" class="w-full bg-[#fdf8f5] dark:bg-[#181a1f] border border-[#f0e6ed] dark:border-gray-700 rounded-lg px-4 py-2.5 text-sm text-gray-900 dark:text-gray-100">
                </div>
                <div class="px-6 py-3 flex justify-end gap-3">
                    <button type="button" onclick="app.closeModal()" class="px-4 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg text-sm border border-[#f0e6ed] dark:border-gray-700">취소</button>
                    <button type="submit" class="px-5 py-2 bg-[#e2d4f0] text-[#4a3d54] hover:bg-[#f8c8dc] rounded-lg text-sm font-medium shadow transition">수정 완료</button>
                </div>
            </form>
        `;
        modal.classList.remove('hidden');
    }

    async handleEditNovelSubmit(event, novelId) {
        event.preventDefault();
        const color = document.querySelector('input[name="editNovelColor"]:checked').value;
        const title = document.getElementById('editNovelTitle').value.trim();
        const keyword = document.getElementById('editNovelKeyword').value.trim();
        const targetChars = parseInt(document.getElementById('editNovelTarget').value) || 5000;

        const novel = this.novels.find(n => n.id === novelId);
        if (novel) {
            novel.color = color;
            novel.title = title;
            novel.keyword = keyword;
            novel.targetChars = targetChars;
            novel.updatedAt = new Date().toISOString();
            await this.persistNovels();
            this.closeModal();
            this.showToast('작품 정보가 수정되었습니다.');
            this.render();
        }
    }

    closeModal() {
        document.getElementById('modalOverlay').classList.add('hidden');
    }

    renderDetailView() {
        const novel = this.novels.find(n => n.id === this.selectedNovelId);
        if (!novel) return `<div class="text-center py-20"><button onclick="app.goToList()">목록으로</button></div>`;
        const nowISO = new Date().toISOString();
        if (!novel.chapters || novel.chapters.length === 0) novel.chapters = [{ title: '1화', content: '', createdAt: nowISO, updatedAt: nowISO }];
        if (!novel.settings || novel.settings.length === 0) novel.settings = [{ title: '기본 설정', content: '', createdAt: nowISO, updatedAt: nowISO }];
        
        if (this.selectedChapterIndex >= novel.chapters.length) this.selectedChapterIndex = 0;
        if (this.selectedSettingIndex >= novel.settings.length) this.selectedSettingIndex = 0;

        const currentChapter = novel.chapters[this.selectedChapterIndex];
        const currentSetting = novel.settings[this.selectedSettingIndex];
        
        const totalChars = this.calculateTotalChars(novel);
        const currentChars = currentChapter && currentChapter.content ? currentChapter.content.length : 0;
        const currentCharsNoSpace = this.calculateCharsWithoutSpaces(currentChapter ? currentChapter.content : '');
        const targetChars = novel.targetChars || 5000;
        const progressPercent = Math.min(100, Math.round((currentChars / targetChars) * 100));
        const manuscriptPages = (currentChars / 200).toFixed(1);
        const tags = novel.keyword ? novel.keyword.split(',').map(t => t.trim()).filter(Boolean) : [];
        const hasSettings = this.hasValidSettings(novel);

        return `
            <div class="flex flex-col space-y-6">
                <div class="pastel-panel rounded-2xl p-6 flex flex-col gap-4">
                    <div class="flex items-center justify-between flex-wrap gap-4">
                        <div class="flex items-center gap-3">
                            <div class="w-4 h-4 rounded-full shadow-sm" style="background-color: ${novel.color || '#f8c8dc'};"></div>
                            <h2 class="text-xl md:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2 font-gowunbatang">
                                ${escapeHtml(novel.title)}
                                ${hasSettings ? '<span title="설정집 100자 이상 등록됨" class="text-base">🏷️</span>' : ''}
                            </h2>
                        </div>
                        <div class="flex items-center gap-2">
                            <button onclick="app.goToList()" class="px-3.5 py-2 bg-white dark:bg-[#21252b] hover:bg-gray-100 text-gray-700 dark:text-gray-300 rounded-lg text-sm border border-[#f0e6ed] dark:border-gray-700 transition shadow-sm">목록으로</button>
                            <button onclick="app.goToPrevNovel()" class="px-3.5 py-2 bg-white dark:bg-[#21252b] hover:bg-gray-100 text-gray-700 dark:text-gray-300 rounded-lg text-sm border border-[#f0e6ed] dark:border-gray-700 transition shadow-sm">▲ 이전글</button>
                            <button onclick="app.goToNextNovel()" class="px-3.5 py-2 bg-white dark:bg-[#21252b] hover:bg-gray-100 text-gray-700 dark:text-gray-300 rounded-lg text-sm border border-[#f0e6ed] dark:border-gray-700 transition shadow-sm">▼ 다음글</button>
                            <button onclick="app.openEditNovelModal(${novel.id})" class="px-3.5 py-2 bg-[#e2d4f0] hover:bg-[#f8c8dc] text-[#4a3d54] rounded-lg text-sm transition font-medium shadow-sm">정보 수정</button>
                        </div>
                    </div>

                    <div class="flex items-center gap-2 border-b border-[#f0e6ed] dark:border-gray-800 pb-3">
                        <button onclick="app.switchDetailTab('chapters')" class="px-4 py-2 rounded-lg text-sm font-semibold transition ${this.activeDetailTab === 'chapters' ? 'bg-[#f67280] text-white shadow' : 'bg-white dark:bg-[#21252b] text-gray-600 dark:text-gray-400 hover:bg-gray-100 border border-[#f0e6ed] dark:border-gray-700'}">연재 소설 본문</button>
                        <button onclick="app.switchDetailTab('settings')" class="px-4 py-2 rounded-lg text-sm font-semibold transition ${this.activeDetailTab === 'settings' ? 'bg-[#f67280] text-white shadow' : 'bg-white dark:bg-[#21252b] text-gray-600 dark:text-gray-400 hover:bg-gray-100 border border-[#f0e6ed] dark:border-gray-700'}">설정집 및 메모 ${hasSettings ? '🏷️' : ''}</button>
                    </div>

                    <div class="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div class="flex items-center gap-2">
                            <span class="text-gray-400">키워드:</span>
                            ${tags.length > 0 ? tags.map(t => `<span class="px-2 py-0.5 rounded bg-[#fff9ed] dark:bg-[#21252b] text-[#8a6d3b] dark:text-amber-300 border border-[#faebcc] dark:border-gray-700">#${escapeHtml(t)}</span>`).join('') : '<span class="text-gray-400">없음</span>'}
                        </div>
                        <div class="text-gray-400">총 누적 글자수: <strong class="text-[#f67280] dark:text-[#e5c07b] font-mono">${totalChars.toLocaleString()}자</strong></div>
                    </div>
                </div>

                ${this.activeDetailTab === 'settings' ? `
                    <div class="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
                        <div class="pastel-panel rounded-2xl p-4 lg:sticky lg:top-24">
                            <div class="flex items-center justify-between mb-3 px-2">
                                <h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wider">설정 목록 (${novel.settings.length}개)</h3>
                                <button onclick="app.openAddSettingModal(${novel.id})" class="text-xs text-[#f67280] dark:text-[#e5c07b] font-bold hover:underline">+ 설정 추가</button>
                            </div>
                            <div class="space-y-1.5 max-h-[55vh] overflow-y-auto pr-1">
                                ${novel.settings.map((st, idx) => `
                                    <div class="flex items-center gap-1.5 w-full">
                                        <button onclick="app.selectSetting(${idx})" class="flex-1 min-w-0 text-left px-3 py-2.5 rounded-xl text-sm font-medium transition flex items-center justify-between gap-2 ${idx === this.selectedSettingIndex ? 'bg-[#f67280] text-white shadow' : 'bg-[#fdf8f5] dark:bg-[#181a1f] text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#282c34] border border-[#f0e6ed] dark:border-gray-800'}">
                                            <span class="truncate leading-tight">${escapeHtml(st.title)}</span>
                                            <span class="text-[11px] opacity-75 font-mono shrink-0 whitespace-nowrap">${st.content ? st.content.length : 0}자</span>
                                        </button>
                                        <select onchange="app.moveSettingTo(${novel.id}, ${idx}, this.value); this.selectedIndex=0;" class="text-[11px] bg-white dark:bg-[#21252b] border border-[#f0e6ed] dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded px-1.5 py-2.5 focus:outline-none cursor-pointer shrink-0" title="순서 이동 설정">
                                            <option value="" disabled selected>⚙️</option>
                                            <option value="top">맨위</option>
                                            <option value="up">↑</option>
                                            <option value="down">↓</option>
                                            <option value="bottom">맨밑</option>
                                        </select>
                                    </div>
                                `).join('')}
                            </div>
                        </div>

                        <div class="pastel-panel rounded-2xl p-6 md:p-8 lg:col-span-3 flex flex-col min-h-[550px]">
                            <div class="pb-4 mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-[#f0e6ed] dark:border-gray-800">
                                <div>
                                    <h3 class="text-lg font-bold text-gray-900 dark:text-white">${escapeHtml(currentSetting.title)}</h3>
                                    <div class="text-xs text-gray-400 mt-0.5 font-mono">글자수: ${currentSetting.content ? currentSetting.content.length.toLocaleString() : 0}자 (### 제목, **굵은글씨** 마크다운 지원)</div>
                                </div>
                                <div class="flex items-center gap-2">
                                    <button onclick="app.openEditSettingModal(${novel.id},${this.selectedSettingIndex})" class="px-3.5 py-1.5 bg-white dark:bg-[#21252b] hover:bg-gray-100 text-gray-700 dark:text-gray-200 rounded-lg text-xs border border-[#f0e6ed] dark:border-gray-700 shadow-sm">설정 수정</button>
                                    <button onclick="app.deleteCurrentSetting(${novel.id},${this.selectedSettingIndex})" class="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-xs border border-rose-200">삭제</button>
                                </div>
                            </div>

                            <div class="flex-1 text-gray-800 dark:text-gray-200 novel-content markdown-render whitespace-pre-wrap select-text ${this.fontFamily}" style="font-size: ${this.fontSize}pt; line-height: ${this.lineHeight};">${this.parseMarkdown(currentSetting.content || '설정 내용이 없습니다.')}</div>
                            <div class="text-right text-[10px] text-gray-400 mt-2">💡 [설정 수정] 버튼을 눌러 제목과 내용을 수정할 수 있습니다.</div>
                        </div>
                    </div>
                ` : `
                    <div class="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
                        <div class="pastel-panel rounded-2xl p-4 lg:sticky lg:top-24">
                            <div class="flex items-center justify-between mb-3 px-2">
                                <h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wider">회차 목록 (${novel.chapters.length}화)</h3>
                                <button onclick="app.openAddChapterModal(${novel.id})" class="text-xs text-[#f67280] dark:text-[#e5c07b] font-bold hover:underline">+ 회차 추가</button>
                            </div>
                            <div class="space-y-1.5 max-h-[55vh] overflow-y-auto pr-1">
                                ${novel.chapters.map((ch, idx) => `
                                    <div class="flex items-center gap-1.5 w-full">
                                        <button onclick="app.selectChapter(${idx})" class="flex-1 min-w-0 text-left px-3 py-2.5 rounded-xl text-sm font-medium transition flex items-center justify-between gap-2 ${idx === this.selectedChapterIndex ? 'bg-[#f67280] text-white shadow' : 'bg-[#fdf8f5] dark:bg-[#181a1f] text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#282c34] border border-[#f0e6ed] dark:border-gray-800'}">
                                            <span class="truncate leading-tight">${escapeHtml(ch.title)}</span>
                                            <span class="text-[11px] opacity-75 font-mono shrink-0 whitespace-nowrap">${ch.content ? ch.content.length : 0}자</span>
                                        </button>
                                        <select onchange="app.moveChapterTo(${novel.id}, ${idx}, this.value); this.selectedIndex=0;" class="text-[11px] bg-white dark:bg-[#21252b] border border-[#f0e6ed] dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded px-1.5 py-2.5 focus:outline-none cursor-pointer shrink-0" title="순서 이동 설정">
                                            <option value="" disabled selected>⚙️</option>
                                            <option value="top">맨위</option>
                                            <option value="up">↑</option>
                                            <option value="down">↓</option>
                                            <option value="bottom">맨밑</option>
                                        </select>
                                    </div>
                                `).join('')}
                            </div>
                        </div>

                        <div class="pastel-panel rounded-2xl p-6 md:p-8 lg:col-span-3 flex flex-col w-full">
                            <div class="pb-4 mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-[#f0e6ed] dark:border-gray-800">
                                <div>
                                    <h3 class="text-lg font-bold text-gray-900 dark:text-white">${escapeHtml(currentChapter.title)}</h3>
                                    <div class="flex items-center gap-3 mt-1 text-xs text-gray-400">
                                        <span>공백 포함: <font class="text-[#f67280] dark:text-[#e5c07b] font-mono">${currentChars.toLocaleString()}자</font></span>
                                        <span>공백 제외: <font class="text-gray-600 dark:text-gray-300 font-mono">${currentCharsNoSpace.toLocaleString()}자</font></span>
                                        <span>원고지: <font class="text-gray-600 dark:text-gray-300 font-mono">${manuscriptPages}매</font></span>
                                    </div>
                                </div>
                            </div>

                            <div class="flex flex-wrap items-center justify-between gap-2.5 mb-4 w-full">
                                <div class="flex flex-wrap items-center gap-2">
                                    <select onchange="app.changeFontFamily(this.value)" class="h-9 bg-white dark:bg-[#21252b] border border-[#f0e6ed] dark:border-gray-700 text-xs rounded-lg px-2.5 text-gray-700 dark:text-gray-200 focus:outline-none shadow-sm">
                                        <option value="font-nanumgothic" ${this.fontFamily === 'font-nanumgothic' ? 'selected' : ''}>나눔고딕</option>
                                        <option value="font-malgungothic" ${this.fontFamily === 'font-malgungothic' ? 'selected' : ''}>맑은고딕</option>
                                        <option value="font-nanummyeongjo" ${this.fontFamily === 'font-nanummyeongjo' ? 'selected' : ''}>나눔명조</option>
                                        <option value="font-ridibatang" ${this.fontFamily === 'font-ridibatang' ? 'selected' : ''}>리디바탕</option>
                                    </select>

                                    <select onchange="app.changeLineHeight(this.value)" class="h-9 bg-white dark:bg-[#21252b] border border-[#f0e6ed] dark:border-gray-700 text-xs rounded-lg px-2.5 text-gray-700 dark:text-gray-200 focus:outline-none shadow-sm">
                                        <option value="150%" ${this.lineHeight === '150%' ? 'selected' : ''}>줄간격 150%</option>
                                        <option value="180%" ${this.lineHeight === '180%' ? 'selected' : ''}>줄간격 180%</option>
                                        <option value="200%" ${this.lineHeight === '200%' ? 'selected' : ''}>줄간격 200%</option>
                                        <option value="240%" ${this.lineHeight === '240%' ? 'selected' : ''}>줄간격 240%</option>
                                    </select>

                                    <div class="h-9 flex items-center bg-white dark:bg-[#21252b] rounded-lg border border-[#f0e6ed] dark:border-gray-700 px-3 text-xs text-gray-700 dark:text-gray-200 shadow-sm">
                                        <span class="text-gray-400 mr-2">크기</span>
                                        <button onclick="app.changeFontSize(-1)" class="px-1.5 font-bold hover:text-[#f67280]">-</button>
                                        <span class="px-1 font-mono">${this.fontSize}pt</span>
                                        <button onclick="app.changeFontSize(1)" class="px-1.5 font-bold hover:text-[#f67280]">+</button>
                                    </div>

                                    <div class="relative flex items-center h-9">
                                        <input type="text" id="internalSearchInput" placeholder="본문 검색" onkeydown="if(event.key==='Enter') app.handleInternalSearch(this.value)" class="h-9 bg-white dark:bg-[#21252b] border border-[#f0e6ed] dark:border-gray-700 text-xs rounded-lg px-3 pr-8 text-gray-900 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:border-[#f8b195] w-32 shadow-sm">
                                        <button onclick="app.handleInternalSearch(document.getElementById('internalSearchInput').value)" class="absolute right-2.5 text-gray-400 hover:text-[#f67280] text-xs">🔍</button>
                                    </div>
                                </div>

                                <div class="flex items-center gap-2">
                                    <button onclick="app.correctCurrentChapterContent(${novel.id},${this.selectedChapterIndex})" class="h-9 px-3.5 bg-[#f8b195] hover:bg-[#f67280] text-white rounded-lg text-xs transition flex items-center shadow-sm">✨ 교정</button>
                                    <button onclick="app.downloadCurrentChapter(${novel.id},${this.selectedChapterIndex})" class="h-9 px-3.5 bg-[#b8e0d2] text-[#2c5446] hover:bg-[#a0d4c3] rounded-lg text-xs font-medium transition flex items-center shadow-sm">TXT 다운</button>
                                    <button onclick="app.openEditChapterModal(${novel.id},${this.selectedChapterIndex})" class="h-9 px-3.5 bg-white dark:bg-[#21252b] hover:bg-gray-100 text-gray-700 dark:text-gray-200 rounded-lg text-xs border border-[#f0e6ed] dark:border-gray-700 transition flex items-center shadow-sm">수정</button>
                                    <button onclick="app.deleteCurrentChapter(${novel.id},${this.selectedChapterIndex})" class="h-9 px-3.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-xs border border-rose-200 transition flex items-center">삭제</button>
                                </div>
                            </div>

                            <div class="mb-4 bg-[#fdf8f5] dark:bg-[#181a1f] p-3 rounded-xl border border-[#f0e6ed] dark:border-gray-800 flex flex-col gap-1.5 w-full">
                                <div class="flex justify-between text-xs font-medium text-gray-500 dark:text-gray-400">
                                    <span>목표 글자수 달성률 (${targetChars.toLocaleString()}자 기준)</span>
                                    <span class="text-[#f67280] dark:text-[#e5c07b] font-mono">${progressPercent}%</span>
                                </div>
                                <div class="w-full bg-[#e2d4f0]/40 dark:bg-gray-800 h-2 rounded-full overflow-hidden">
                                    <div class="bg-gradient-to-r from-[#f8b195] to-[#f67280] h-full transition-all duration-300" style="width: ${progressPercent}%;"></div>
                                </div>
                            </div>

                            <div class="flex flex-wrap items-center justify-between text-[11px] text-gray-400 dark:text-gray-400 mb-2 px-1 w-full">
                                <div>작성 날짜: <span class="font-mono">${this.formatDate(currentChapter.createdAt)}</span></div>
                                <div>수정 날짜: <span id="updatedAtDisplay_${this.selectedChapterIndex}" class="font-mono text-[#f67280] dark:text-[#e5c07b]">${this.formatDate(currentChapter.updatedAt || currentChapter.createdAt)}</span></div>
                            </div>

                            <div id="chapterContentDisplay" class="flex-1 text-gray-800 dark:text-gray-200 novel-content whitespace-pre-wrap select-text focus:outline-none p-4 bg-[#d9e7e2]/60 dark:bg-[#1e2422]/60 rounded-xl border border-[#b8e0d2] dark:border-gray-800 w-full ${this.fontFamily}" style="font-size: ${this.fontSize}pt; line-height: ${this.lineHeight};" contenteditable="true" oninput="app.handleAutoSaveContent(${novel.id}, ${this.selectedChapterIndex}, this.innerText)">${escapeHtml(currentChapter.content || '').trim()}</div>
                            <div class="text-right text-[10px] text-gray-400 mt-2">💡 본문 상자를 직접 클릭하여 자유롭게 수정할 수 있으며 자동 저장됩니다.</div>
                        </div>
                    </div>
                `}
            </div>
        `;
    }

    async correctCurrentChapterContent(novelId, chapterIndex) {
        const novel = this.novels.find(n => n.id === novelId);
        if (!novel || !novel.chapters[chapterIndex]) return;
        
        const displayEl = document.getElementById('chapterContentDisplay');
        const rawContent = displayEl ? displayEl.innerText : novel.chapters[chapterIndex].content;
        const corrected = applyTextCorrections(rawContent);

        if (displayEl) displayEl.innerText = corrected;
        
        novel.chapters[chapterIndex].content = corrected;
        novel.chapters[chapterIndex].updatedAt = new Date().toISOString();
        novel.updatedAt = novel.chapters[chapterIndex].updatedAt;
        
        await this.persistNovels();
        this.showToast('본문 부호 및 오타가 자동 교정되었습니다!');
        this.render();
    }

    switchDetailTab(tabName) {
        this.activeDetailTab = tabName;
        this.render();
    }

    changeFontSize(delta) {
        this.fontSize = Math.max(10, Math.min(22, this.fontSize + delta));
        localStorage.setItem('novel_archive_fontsize', this.fontSize);
        this.render();
    }

    changeFontFamily(fontClass) {
        this.fontFamily = fontClass;
        localStorage.setItem('novel_archive_fontfamily', this.fontFamily);
        this.render();
    }

    changeLineHeight(heightVal) {
        this.lineHeight = heightVal;
        localStorage.setItem('novel_archive_lineheight', this.lineHeight);
        this.render();
    }

    selectChapter(index) {
        this.selectedChapterIndex = index;
        this.render();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    selectSetting(index) {
        this.selectedSettingIndex = index;
        this.render();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    handleAutoSaveContent(novelId, chapterIndex, newContent) {
        clearTimeout(this.autoSaveTimer);
        this.autoSaveTimer = setTimeout(async () => {
            const novel = this.novels.find(n => n.id === novelId);
            if (novel && novel.chapters[chapterIndex]) {
                const nowISO = new Date().toISOString();
                novel.chapters[chapterIndex].content = newContent;
                novel.chapters[chapterIndex].updatedAt = nowISO;
                novel.updatedAt = nowISO;
                await this.persistNovels();
                
                const updateEl = document.getElementById(`updatedAtDisplay_${chapterIndex}`);
                if (updateEl) {
                    updateEl.innerText = this.formatDate(nowISO);
                }
            }
        }, 1000);
    }

    async moveChapterTo(novelId, index, action) {
        const novel = this.novels.find(n => n.id === novelId);
        if (!novel) return;
        
        const chapters = novel.chapters;
        const targetChapter = chapters.splice(index, 1)[0];
        
        let newIndex = index;
        if (action === 'top') {
            newIndex = 0;
        } else if (action === 'up') {
            newIndex = Math.max(0, index - 1);
        } else if (action === 'down') {
            newIndex = Math.min(chapters.length, index + 1);
        } else if (action === 'bottom') {
            newIndex = chapters.length;
        }
        
        chapters.splice(newIndex, 0, targetChapter);
        this.selectedChapterIndex = newIndex;
        
        const nowISO = new Date().toISOString();
        novel.updatedAt = nowISO;
        await this.persistNovels();
        this.showToast(`"${targetChapter.title}" 회차 순서가 변경되었습니다.`);
        this.render();
    }

    async moveSettingTo(novelId, index, action) {
        const novel = this.novels.find(n => n.id === novelId);
        if (!novel) return;
        
        const settings = novel.settings;
        const targetSetting = settings.splice(index, 1)[0];
        
        let newIndex = index;
        if (action === 'top') {
            newIndex = 0;
        } else if (action === 'up') {
            newIndex = Math.max(0, index - 1);
        } else if (action === 'down') {
            newIndex = Math.min(settings.length, index + 1);
        } else if (action === 'bottom') {
            newIndex = settings.length;
        }
        
        settings.splice(newIndex, 0, targetSetting);
        this.selectedSettingIndex = newIndex;
        
        const nowISO = new Date().toISOString();
        novel.updatedAt = nowISO;
        await this.persistNovels();
        this.showToast(`"${targetSetting.title}" 설정 순서가 변경되었습니다.`);
        this.render();
    }

    openAddChapterModal(novelId) {
        const modal = document.getElementById('modalOverlay');
        const content = document.getElementById('modalContent');
        const novel = this.novels.find(n => n.id === novelId);
        const nextNum = novel.chapters.length + 1;

        content.innerHTML = `
            <div class="bg-[#fceae6] dark:bg-[#282c34] px-6 py-4 border-b border-[#f0e6ed] dark:border-gray-800 flex items-center justify-between">
                <h3 class="font-bold text-lg text-gray-900 dark:text-white">새 회차 추가</h3>
                <button onclick="app.closeModal()" class="text-gray-400 hover:text-gray-600 dark:hover:text-white transition">✕</button>
            </div>
            <form onsubmit="app.handleAddChapterSubmit(event, ${novelId})" class="p-6 space-y-5 overflow-y-auto max-h-[80vh]">
                <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">회차 제목</label>
                    <input type="text" id="chapTitle" value="${nextNum}화." class="w-full bg-[#fdf8f5] dark:bg-[#181a1f] border border-[#f0e6ed] dark:border-gray-700 rounded-lg px-4 py-2.5 text-sm text-gray-900 dark:text-gray-100" required>
                </div>
                <div>
                    <div class="flex items-center justify-between mb-1">
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">본문 내용</label>
                        <div class="flex items-center gap-2">
                            <button type="button" onclick="app.triggerAutoCorrect('chapContent')" class="gold-button">✨ 자동 교정/부호 변환</button>
                            <label class="cyan-button">
                                텍스트파일 업로드 (.txt)
                                <input type="file" accept=".txt" onchange="app.handleChapTextFileUpload(event)" class="hidden">
                            </label>
                        </div>
                    </div>
                    <textarea id="chapContent" rows="8" placeholder="본문 내용을 입력하거나 텍스트 파일을 업로드하세요." class="w-full bg-[#fdf8f5] dark:bg-[#181a1f] border border-[#f0e6ed] dark:border-gray-700 rounded-lg p-4 text-gray-900 dark:text-gray-100 text-sm novel-content ${this.fontFamily}" style="line-height: ${this.lineHeight};"></textarea>
                </div>
                <div class="bg-[#fceae6]/50 dark:bg-[#282c34] px-6 py-3 border-t border-[#f0e6ed] dark:border-gray-800 flex justify-end gap-3">
                    <button type="button" onclick="app.closeModal()" class="px-4 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg text-sm border border-[#f0e6ed] dark:border-gray-700">취소</button>
                    <button type="submit" class="px-5 py-2 bg-[#f8b195] hover:bg-[#f67280] text-white rounded-lg text-sm font-medium shadow">추가하기</button>
                </div>
            </form>
        `;
        modal.classList.remove('hidden');
    }

    openAddSettingModal(novelId) {
        const modal = document.getElementById('modalOverlay');
        const content = document.getElementById('modalContent');

        content.innerHTML = `
            <div class="bg-[#fceae6] dark:bg-[#282c34] px-6 py-4 border-b border-[#f0e6ed] dark:border-gray-800 flex items-center justify-between">
                <h3 class="font-bold text-lg text-gray-900 dark:text-white">새 설정 노트 추가</h3>
                <button onclick="app.closeModal()" class="text-gray-400 hover:text-gray-600 dark:hover:text-white transition">✕</button>
            </div>
            <form onsubmit="app.handleAddSettingSubmit(event, ${novelId})" class="p-6 space-y-5 overflow-y-auto max-h-[80vh]">
                <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">설정 제목</label>
                    <input type="text" id="settingTitle" placeholder="예: 주요 인물 소개, 세력 및 단체" class="w-full bg-[#fdf8f5] dark:bg-[#181a1f] border border-[#f0e6ed] dark:border-gray-700 rounded-lg px-4 py-2.5 text-sm text-gray-900 dark:text-gray-100" required>
                </div>
                <div>
                    <div class="flex items-center justify-between mb-1">
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">설정 내용 (### 제목, **굵은글씨** 마크다운 사용 가능)</label>
                        <label class="cyan-button">
                            텍스트파일 업로드 (.txt)
                            <input type="file" accept=".txt" onchange="app.handleSettingTextFileUpload(event)" class="hidden">
                        </label>
                    </div>
                    <textarea id="settingContent" rows="8" placeholder="설정 내용을 입력하거나 텍스트 파일을 업로드하세요." class="w-full bg-[#fdf8f5] dark:bg-[#181a1f] border border-[#f0e6ed] dark:border-gray-700 rounded-lg p-4 text-gray-900 dark:text-gray-100 text-sm novel-content ${this.fontFamily}" style="line-height: ${this.lineHeight};"></textarea>
                </div>
                <div class="bg-[#fceae6]/50 dark:bg-[#282c34] px-6 py-3 border-t border-[#f0e6ed] dark:border-gray-800 flex justify-end gap-3">
                    <button type="button" onclick="app.closeModal()" class="px-4 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg text-sm border border-[#f0e6ed] dark:border-gray-700">취소</button>
                    <button type="submit" class="px-5 py-2 bg-[#f8b195] hover:bg-[#f67280] text-white rounded-lg text-sm font-medium shadow">추가하기</button>
                </div>
            </form>
        `;
        modal.classList.remove('hidden');
    }

    handleChapTextFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        const fileNameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
        const titleInput = document.getElementById('chapTitle');
        if (titleInput && (!titleInput.value || titleInput.value.endsWith('.'))) {
            titleInput.value = fileNameWithoutExt;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            const textarea = document.getElementById('chapContent');
            if (textarea) {
                textarea.value = applyTextCorrections((e.target.result || '').trim());
                this.showToast('텍스트 파일 업로드 및 자동 교정 완료');
            }
        };
        reader.readAsText(file, 'utf-8');
    }

    handleSettingTextFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        const fileNameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
        const titleInput = document.getElementById('settingTitle');
        if (titleInput && !titleInput.value) {
            titleInput.value = fileNameWithoutExt;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            const textarea = document.getElementById('settingContent');
            if (textarea) {
                textarea.value = (e.target.result || '').trim();
                this.showToast('텍스트 파일이 적용되었습니다.');
            }
        };
        reader.readAsText(file, 'utf-8');
    }

    async handleAddChapterSubmit(event, novelId) {
        event.preventDefault();
        const title = document.getElementById('chapTitle').value.trim();
        const content = applyTextCorrections((document.getElementById('chapContent').value || '').trim());

        const novel = this.novels.find(n => n.id === novelId);
        if (novel) {
            const nowISO = new Date().toISOString();
            novel.chapters.push({ title, content, createdAt: nowISO, updatedAt: nowISO });
            novel.updatedAt = nowISO;
            await this.persistNovels();
            this.closeModal();
            this.showToast('새 회차가 추가되었습니다.');
            this.selectedChapterIndex = novel.chapters.length - 1;
            this.render();
        }
    }

    async handleAddSettingSubmit(event, novelId) {
        event.preventDefault();
        const title = document.getElementById('settingTitle').value.trim();
        const content = (document.getElementById('settingContent').value || '').trim();

        const novel = this.novels.find(n => n.id === novelId);
        if (novel) {
            const nowISO = new Date().toISOString();
            novel.settings.push({ title, content, createdAt: nowISO, updatedAt: nowISO });
            novel.updatedAt = nowISO;
            await this.persistNovels();
            this.closeModal();
            this.showToast('새 설정 노트가 추가되었습니다.');
            this.selectedSettingIndex = novel.settings.length - 1;
            this.render();
        }
    }

    openEditChapterModal(novelId, chapterIndex) {
        const modal = document.getElementById('modalOverlay');
        const content = document.getElementById('modalContent');
        const novel = this.novels.find(n => n.id === novelId);
        const chapter = novel.chapters[chapterIndex];

        content.innerHTML = `
            <div class="bg-[#fceae6] dark:bg-[#282c34] px-6 py-4 border-b border-[#f0e6ed] dark:border-gray-800 flex items-center justify-between">
                <h3 class="font-bold text-lg text-gray-900 dark:text-white">회차 수정</h3>
                <button onclick="app.closeModal()" class="text-gray-400 hover:text-gray-600 dark:hover:text-white transition">✕</button>
            </div>
            <form onsubmit="app.handleEditChapterSubmit(event, ${novelId}, ${chapterIndex})" class="p-6 space-y-5 overflow-y-auto max-h-[80vh]">
                <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">회차 제목</label>
                    <input type="text" id="editChapTitle" value="${escapeHtml(chapter.title)}" class="w-full bg-[#fdf8f5] dark:bg-[#181a1f] border border-[#f0e6ed] dark:border-gray-700 rounded-lg px-4 py-2.5 text-sm text-gray-900 dark:text-gray-100" required>
                </div>
                <div>
                    <div class="flex items-center justify-between mb-1">
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">본문 내용</label>
                        <div class="flex items-center gap-2">
                            <button type="button" onclick="app.triggerAutoCorrect('editChapContent')" class="gold-button">✨ 자동 교정/부호 변환</button>
                            <label class="cyan-button">
                                텍스트파일 교체 (.txt)
                                <input type="file" accept=".txt" onchange="app.handleEditChapTextFileUpload(event)" class="hidden">
                            </label>
                        </div>
                    </div>
                    <textarea id="editChapContent" rows="24" class="w-full bg-[#fdf8f5] dark:bg-[#181a1f] border border-[#f0e6ed] dark:border-gray-700 rounded-lg p-4 text-gray-900 dark:text-gray-100 text-sm novel-content ${this.fontFamily}" style="line-height: ${this.lineHeight};">${escapeHtml(chapter.content)}</textarea>
                </div>
                <div class="px-6 py-3 flex justify-end gap-3">
                    <button type="button" onclick="app.closeModal()" class="px-4 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg text-sm border border-[#f0e6ed] dark:border-gray-700">취소</button>
                    <button type="submit" class="px-5 py-2 bg-[#f8b195] hover:bg-[#f67280] text-white rounded-lg text-sm font-medium shadow">저장하기</button>
                </div>
            </form>
        `;
        modal.classList.remove('hidden');
    }

    openEditSettingModal(novelId, settingIndex) {
        const modal = document.getElementById('modalOverlay');
        const content = document.getElementById('modalContent');
        const novel = this.novels.find(n => n.id === novelId);
        if (!novel || !novel.settings[settingIndex]) return;
        const setting = novel.settings[settingIndex];

        content.innerHTML = `
            <div class="bg-[#fceae6] dark:bg-[#282c34] px-6 py-4 border-b border-[#f0e6ed] dark:border-gray-800 flex items-center justify-between">
                <h3 class="font-bold text-lg text-gray-900 dark:text-white">설정 노트 수정</h3>
                <button onclick="app.closeModal()" class="text-gray-400 hover:text-gray-600 dark:hover:text-white transition">✕</button>
            </div>
            <form onsubmit="app.handleEditSettingSubmit(event, ${novelId}, ${settingIndex})" class="p-6 space-y-5 overflow-y-auto max-h-[80vh]">
                <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">설정 제목</label>
                    <input type="text" id="editSettingTitle" value="${escapeHtml(setting.title)}" class="w-full bg-[#fdf8f5] dark:bg-[#181a1f] border border-[#f0e6ed] dark:border-gray-700 rounded-lg px-4 py-2.5 text-sm text-gray-900 dark:text-gray-100" required>
                </div>
                <div>
                    <div class="flex items-center justify-between mb-1">
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">설정 내용</label>
                        <label class="cyan-button">
                            텍스트파일 교체 (.txt)
                            <input type="file" accept=".txt" onchange="app.handleEditSettingTextFileUpload(event)" class="hidden">
                        </label>
                    </div>
                    <textarea id="editSettingContent" rows="24" class="w-full bg-[#fdf8f5] dark:bg-[#181a1f] border border-[#f0e6ed] dark:border-gray-700 rounded-lg p-4 text-gray-900 dark:text-gray-100 text-sm novel-content ${this.fontFamily}" style="line-height: ${this.lineHeight};">${escapeHtml(setting.content)}</textarea>
                </div>
                <div class="px-6 py-3 flex justify-end gap-3">
                    <button type="button" onclick="app.closeModal()" class="px-4 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg text-sm border border-[#f0e6ed] dark:border-gray-700">취소</button>
                    <button type="submit" class="px-5 py-2 bg-[#f8b195] hover:bg-[#f67280] text-white rounded-lg text-sm font-medium shadow">저장하기</button>
                </div>
            </form>
        `;
        modal.classList.remove('hidden');
    }

    handleEditChapTextFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            const textarea = document.getElementById('editChapContent');
            if (textarea) {
                textarea.value = applyTextCorrections((e.target.result || '').trim());
                this.showToast('텍스트 파일 교체 및 자동 교정 완료');
            }
        };
        reader.readAsText(file, 'utf-8');
    }

    handleEditSettingTextFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            const textarea = document.getElementById('editSettingContent');
            if (textarea) {
                textarea.value = (e.target.result || '').trim();
                this.showToast('텍스트 파일 내용으로 교체되었습니다.');
            }
        };
        reader.readAsText(file, 'utf-8');
    }

    async handleEditChapterSubmit(event, novelId, chapterIndex) {
        event.preventDefault();
        const title = document.getElementById('editChapTitle').value.trim();
        const content = applyTextCorrections((document.getElementById('editChapContent').value || '').trim());

        const novel = this.novels.find(n => n.id === novelId);
        if (novel && novel.chapters[chapterIndex]) {
            const nowISO = new Date().toISOString();
            novel.chapters[chapterIndex].title = title;
            novel.chapters[chapterIndex].content = content;
            novel.chapters[chapterIndex].updatedAt = nowISO;
            novel.updatedAt = nowISO;
            await this.persistNovels();
            this.closeModal();
            this.showToast('회차가 수정되었습니다.');
            this.render();
        }
    }

    async handleEditSettingSubmit(event, novelId, settingIndex) {
        event.preventDefault();
        const title = document.getElementById('editSettingTitle').value.trim();
        const content = (document.getElementById('editSettingContent').value || '').trim();

        const novel = this.novels.find(n => n.id === novelId);
        if (novel && novel.settings[settingIndex]) {
            const nowISO = new Date().toISOString();
            novel.settings[settingIndex].title = title;
            novel.settings[settingIndex].content = content;
            novel.settings[settingIndex].updatedAt = nowISO;
            novel.updatedAt = nowISO;
            await this.persistNovels();
            this.closeModal();
            this.showToast('설정 노트가 수정되었습니다.');
            this.render();
        }
    }

    async deleteCurrentChapter(novelId, chapterIndex) {
        const novel = this.novels.find(n => n.id === novelId);
        if (!novel) return;
        if (novel.chapters.length <= 1) {
            this.showToast('최소 1개의 회차는 유지되어야 합니다.', 'error');
            return;
        }
        if (!confirm(`"${novel.chapters[chapterIndex].title}" 회차를 삭제하시겠습니까?`)) return;

        novel.chapters.splice(chapterIndex, 1);
        novel.updatedAt = new Date().toISOString();
        await this.persistNovels();
        this.showToast('회차가 삭제되었습니다.');
        this.selectedChapterIndex = Math.max(0, chapterIndex - 1);
        this.render();
    }

    async deleteCurrentSetting(novelId, settingIndex) {
        const novel = this.novels.find(n => n.id === novelId);
        if (!novel) return;
        if (novel.settings.length <= 1) {
            this.showToast('최소 1개의 설정 노트는 유지되어야 합니다.', 'error');
            return;
        }
        if (!confirm(`"${novel.settings[settingIndex].title}" 설정을 삭제하시겠습니까?`)) return;

        novel.settings.splice(settingIndex, 1);
        novel.updatedAt = new Date().toISOString();
        await this.persistNovels();
        this.showToast('설정 노트가 삭제되었습니다.');
        this.selectedSettingIndex = Math.max(0, settingIndex - 1);
        this.render();
    }

    downloadCurrentChapter(novelId, chapterIndex) {
        const novel = this.novels.find(n => n.id === novelId);
        if (!novel || !novel.chapters[chapterIndex]) return;
        const chapter = novel.chapters[chapterIndex];
        const fileContent = `${chapter.title}\n\n${chapter.content || ''}`;
        const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8'  });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${novel.title.replace(/[\\/:*?"<>|]/g, '')}_${chapter.title.replace(/[\\/:*?"<>|]/g, '')}.txt`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        this.showToast('회차가 다운로드되었습니다.');
    }
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

const app = new NovelArchiveApp();