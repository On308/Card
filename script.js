/* ============================================================
   CONSTANTS
   ============================================================ */
const COLOR_PALETTE = [
    { id: 'rose',     name: '로즈',   hex: '#f67280' },
    { id: 'pink',     name: '핑크',   hex: '#f8c8dc' },
    { id: 'coral',    name: '코랄',   hex: '#f8b195' },
    { id: 'lavender', name: '퍼플',   hex: '#e2d4f0' },
    { id: 'chacol',   name: '차콜',   hex: '#b5bad3' },
    { id: 'blue',     name: '블루',   hex: '#92bef1' },
    { id: 'sky',      name: '하늘',   hex: '#c0e1fb' },
    { id: 'mint',     name: '민트',   hex: '#b8e0d2' },
    { id: 'cream',    name: '크림',   hex: '#fdf4e2' },
    { id: 'gold',     name: '골드',   hex: '#d4af37' },
];

// 🏷️ 설정집 아이콘 표시 기준 (문자 수)
//  - "100byte"를 원하시면 아래 THRESHOLD 계산을 byteLength()로 바꾸세요.
const RICH_SETTINGS_THRESHOLD = 100;

// 정렬 comparator를 클래스 밖 상수로 (매 렌더마다 객체 리터럴 생성 X)
const SORT_COMPARATORS = {
    latest:         (a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0),
    oldest_updated: (a, b) => new Date(a.updatedAt || a.createdAt || 0) - new Date(b.updatedAt || b.createdAt || 0),
    created_desc:   (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0),
    created_asc:    (a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0),
    id_asc:         (a, b) => a.id - b.id,
    id_desc:        (a, b) => b.id - a.id,
    title_asc:      (a, b) => (a.title || '').localeCompare(b.title || '', 'ko'),
    title_desc:     (a, b) => (b.title || '').localeCompare(a.title || '', 'ko'),
    chars_desc:     (a, b) => (b.totalChars || 0) - (a.totalChars || 0),
    chars_asc:      (a, b) => (a.totalChars || 0) - (b.totalChars || 0),
};

/* ============================================================
   FONT LAZY LOADER
   ============================================================ */
const FontLoader = {
    map: {
        'font-nanummyeongjo': { family: 'Nanum+Myeongjo:wght@400;700;800' },
        'font-ridibatang':    { css: 'https://cdn.jsdelivr.net/gh/ridenote/ridibatang/ridibatang.css' },
    },
    loaded: new Set(),
    ensure(fontClass) {
        const spec = this.map[fontClass];
        if (!spec || this.loaded.has(fontClass)) return;
        this.loaded.add(fontClass);
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = spec.css || `https://fonts.googleapis.com/css2?family=${spec.family}&display=swap`;
        document.head.appendChild(link);
    }
};

/* ============================================================
   TEXT CORRECTION
   ============================================================ */
function applyTextCorrections(text) {
    if (!text) return '';
    let converted = text;

    let openDouble = true;
    converted = converted.replace(/"/g, () => (openDouble = !openDouble) ? '“' : '”');

    let openSingle = true;
    converted = converted.replace(/'/g, () => (openSingle = !openSingle) ? '‘' : '’');

    converted = converted.replace(/\.{3,}/g, '……');
    converted = converted.replace(/···/g, '……');

    converted = converted.replace(/떄/g, '때');
    converted = converted.replace(/겟지/g, '겠지');
    converted = converted.replace(/겟어/g, '겠어');

    // "…" 뒤 종결 따옴표에 마침표 삽입
    converted = converted.replace(/(…)([”’])/g, '$1.$2');
    // 다/어/데/지 뒤 종결 따옴표에도 마침표 삽입
    converted = converted.replace(/([다어데지])([”’])/g, '$1.$2');

    return converted;
}

/* ============================================================
   HTML ESCAPE
   ============================================================ */
const HTML_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, c => HTML_MAP[c]);
}

/* ============================================================
   TEMPLATE HELPERS
   ============================================================ */
function renderColorGrid(name, selectedHex = '') {
    const sel = (selectedHex || '').toLowerCase();
    return COLOR_PALETTE.map(c => `
        <label class="color-opt">
            <input type="radio" name="${name}" value="${c.hex}" ${c.hex.toLowerCase() === sel ? 'checked' : ''}>
            <span class="color-dot" style="background-color:${c.hex};"></span>
            <span class="color-name">${c.name}</span>
        </label>
    `).join('');
}

function autoCorrectBlock(textareaId, uploadHandler) {
    return `
        <div style="display:flex; gap:0.5rem;">
            <button type="button" onclick="app.triggerAutoCorrect('${textareaId}')" class="gold-button">✨ 자동 교정</button>
            <label class="cyan-button" style="cursor:pointer;">
                텍스트 업로드
                <input type="file" accept=".txt" onchange="app.${uploadHandler}(event)" hidden>
            </label>
        </div>
    `;
}

/* ============================================================
   SETTINGS FLAG HELPER
   ============================================================ */
/* settings 배열이 "풍부한 설정" 기준을 넘는지 판단.
 * 기준: 모든 설정 content 길이 합 >= RICH_SETTINGS_THRESHOLD (문자 수 기준)
 */
 
function computeHasRichSettings(settings) {
    if (!Array.isArray(settings) || settings.length === 0) return false;
    const byteLength = (s) => new TextEncoder().encode(s || '').length;
    const total = settings.reduce((a, s) => a + byteLength(s.content), 0);
    return total >= RICH_SETTINGS_THRESHOLD;
}

/* ============================================================
   DATABASE (v2: meta store + content store 분리)
   ============================================================ */
class NovelDatabase {
    constructor() {
        this.dbName = 'NovelArchiveDB';
        this.metaStore = 'novel_meta';
        this.contentStore = 'novel_content';
        this.db = null;
    }

    init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, 2);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => { this.db = request.result; resolve(this.db); };
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                const tx = event.target.transaction;
                const oldVersion = event.oldVersion;

                if (!db.objectStoreNames.contains(this.metaStore)) {
                    db.createObjectStore(this.metaStore, { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains(this.contentStore)) {
                    db.createObjectStore(this.contentStore, { keyPath: 'id' });
                }

                if (oldVersion < 2 && db.objectStoreNames.contains('novels')) {
                    const oldStore = tx.objectStore('novels');
                    const metaStore = tx.objectStore(this.metaStore);
                    const contentStore = tx.objectStore(this.contentStore);
                    const req = oldStore.getAll();
                    req.onsuccess = () => {
                        (req.result || []).forEach(n => {
                            const { chapters, settings, ...meta } = n;
                            const chs = chapters || [];
                            const sts = settings || [];
                            meta.chapterCount = chs.length;
                            meta.totalChars = chs.reduce((s, c) => s + ((c.content || '').length), 0);
                            meta.hasRichSettings = computeHasRichSettings(sts);
                            metaStore.put(meta);
                            contentStore.put({ id: n.id, chapters: chs, settings: sts });
                        });
                    };
                }
            };
        });
    }

    _tx(storeName, mode) {
        return this.db.transaction(storeName, mode).objectStore(storeName);
    }

    getAllMetas() {
        return new Promise((resolve, reject) => {
            const req = this._tx(this.metaStore, 'readonly').getAll();
            req.onsuccess = () => resolve(req.result || []);
            req.onerror = () => reject(req.error);
        });
    }

    getMeta(id) {
        return new Promise((resolve, reject) => {
            const req = this._tx(this.metaStore, 'readonly').get(id);
            req.onsuccess = () => resolve(req.result || null);
            req.onerror = () => reject(req.error);
        });
    }

    getContent(id) {
        return new Promise((resolve, reject) => {
            const req = this._tx(this.contentStore, 'readonly').get(id);
            req.onsuccess = () => resolve(req.result || { chapters: [], settings: [] });
            req.onerror = () => reject(req.error);
        });
    }

    async getNovelById(id) {
        const [meta, content] = await Promise.all([this.getMeta(id), this.getContent(id)]);
        if (!meta) return null;
        return {
            ...meta,
            chapters: content.chapters || [],
            settings: content.settings || [],
        };
    }

    saveNovel(novel) {
        return new Promise((resolve, reject) => {
            const { chapters, settings, ...meta } = novel;
            const chs = chapters || [];
            const sts = settings || [];
            meta.chapterCount = chs.length;
            meta.totalChars = chs.reduce((s, c) => s + ((c.content || '').length), 0);
            meta.hasRichSettings = computeHasRichSettings(sts);

            const tx = this.db.transaction([this.metaStore, this.contentStore], 'readwrite');
            tx.objectStore(this.metaStore).put(meta);
            tx.objectStore(this.contentStore).put({ id: novel.id, chapters: chs, settings: sts });
            tx.oncomplete = () => resolve(meta);
            tx.onerror = () => reject(tx.error);
        });
    }

    deleteNovel(id) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction([this.metaStore, this.contentStore], 'readwrite');
            tx.objectStore(this.metaStore).delete(id);
            tx.objectStore(this.contentStore).delete(id);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    }

    // 복원 / 마이그레이션 용도
    saveAllNovels(novels) {
        const tx = this.db.transaction([this.metaStore, this.contentStore], 'readwrite');
        const metaStore = tx.objectStore(this.metaStore);
        const contentStore = tx.objectStore(this.contentStore);
        metaStore.clear();
        contentStore.clear();
        for (const n of novels) {
            const { chapters, settings, ...meta } = n;
            const chs = chapters || [];
            const sts = settings || [];
            meta.chapterCount = chs.length;
            meta.totalChars = chs.reduce((s, c) => s + ((c.content || '').length), 0);
            meta.hasRichSettings = computeHasRichSettings(sts);
            metaStore.put(meta);
            contentStore.put({ id: n.id, chapters: chs, settings: sts });
        }
        return new Promise((resolve, reject) => {
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    }

    /* ============================================================
       🏷️ 마이그레이션: hasRichSettings 플래그 재계산
       -----------------------------------------------------------
       - meta 스토어의 모든 항목을 검사
       - 본문(chapters)은 건드리지 않고 settings만 읽어 판정
       - 값이 이미 존재하고 정확하면 write 하지 않음
       - 한 번 실행 후에는 모든 meta가 플래그를 갖게 되어,
         다음 실행부터는 즉시 no-op 으로 종료됨

       @returns {Promise<number>} 갱신된 작품 수
       ============================================================ */
    async refreshRichSettingsFlags() {
        const metas = await this.getAllMetas();

        // 모든 meta가 이미 플래그를 갖고 있으면 스킵 (일반적 재시작 시 즉시 반환)
        if (!metas.some(m => m.hasRichSettings === undefined)) return 0;

        let updated = 0;
        for (const meta of metas) {
            // content 스토어에서 settings만 읽음 (chapters는 무시)
            const content = await this.getContent(meta.id);
            const hasRichSettings = computeHasRichSettings(content.settings);

            if (meta.hasRichSettings !== hasRichSettings) {
                meta.hasRichSettings = hasRichSettings;
                await new Promise((resolve, reject) => {
                    const tx = this.db.transaction(this.metaStore, 'readwrite');
                    tx.objectStore(this.metaStore).put(meta);
                    tx.oncomplete = resolve;
                    tx.onerror = () => reject(tx.error);
                });
                updated++;
            }
        }
        return updated;
    }
}

/* ============================================================
   APP
   ============================================================ */
class NovelArchiveApp {
    constructor() {
        this.db = new NovelDatabase();

        this.novels = [];
        this.currentNovel = null;

        this.currentView = 'list';
        this.selectedNovelId = null;
        this.selectedChapterIndex = 0;
        this.selectedSettingIndex = 0;
        this.activeDetailTab = 'chapters';

        this.searchQuery = '';
        this.selectedTag = '전체';
        this.sortOrder = 'latest';

        this.isDarkMode = false;
        this.fontSize = 13;
        this.fontFamily = 'font-nanumgothic';
        this.lineHeight = '180%';

        this.lastInput = { color: '#f8c8dc', title: '', keyword: '' };

        this.tagCache = { counts: {}, allTags: [] };
        this._lastFilteredIds = null;

        this.autoSaveTimer = null;
        this.fileSaveTimer = null;
        this.isComposing = false;

        this.fileHandle = null;

        this.initTheme();
        this.initPreferences();
        this.initEventDelegation();
        this.initApp();
        this.initGlobalKeyEvents();
        this.initVisibilitySave();
    }

    /* ---------------- 초기화 ---------------- */
    initPreferences() {
        const fs = localStorage.getItem('novel_archive_fontsize');
        if (fs) this.fontSize = parseInt(fs, 10);
        const ff = localStorage.getItem('novel_archive_fontfamily');
        if (ff) {
            this.fontFamily = ff;
            FontLoader.ensure(ff);
        }
        const lh = localStorage.getItem('novel_archive_lineheight');
        if (lh) this.lineHeight = lh;
    }

    initEventDelegation() {
        document.addEventListener('click', (e) => {
            const pill = e.target.closest('[data-action="filter-tag"]');
            if (pill) {
                e.stopPropagation();
                this.filterByTag(pill.dataset.tag);
            }
        });
    }

    initGlobalKeyEvents() {
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.closeModal();
            if (this.currentView === 'detail') {
                if (e.key === 'Home') window.scrollTo({ top: 0, behavior: 'smooth' });
                else if (e.key === 'End') window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
            }
        });
    }

    initVisibilitySave() {
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden' && this.fileHandle) {
                clearTimeout(this.fileSaveTimer);
                this.saveToFile();
            }
        });
    }

    async initApp() {
        try {
            await this.db.init();
            let allMetas = await this.db.getAllMetas();

            if (allMetas.length === 0) {
                const nowISO = new Date().toISOString();
                const seed = [{
                    id: 1,
                    color: '#f8c8dc',
                    title: '샘플 텍스트',
                    keyword: '장르, 테마',
                    targetChars: 5000,
                    settings: [
                        { title: '세계관 설정', content: '### 제목\n**굵은 글씨는 이렇게 뜹니다.**\n서식 없으면 이렇게 뜹니다.' },
                        { title: '기타 메모', content: '### 메모 작성 가능\n- **굵은 글씨**: 서식 없는 글씨 혼용도 가능\n- **추가 내용**: 메모든 설정이든 간편하게 작성 가능합니다.' },
                    ],
                    chapters: [{
                        title: '1. 시작',
                        content: '내용을 작성하십시오.',
                        createdAt: nowISO, updatedAt: nowISO,
                    }],
                    createdAt: nowISO, updatedAt: nowISO,
                }];
                await this.db.saveAllNovels(seed);
                allMetas = await this.db.getAllMetas();
            } else {
                // 인메모리 보정 (UI 안전장치)
                for (const m of allMetas) {
                    if (m.chapterCount === undefined) m.chapterCount = 0;
                    if (m.totalChars === undefined) m.totalChars = 0;
                    // 주의: hasRichSettings 여기서 false로 덮지 않음 → 마이그레이션이 판단
                    if (m.hasRichSettings === undefined) m.hasRichSettings = false;
                    if (!m.createdAt) m.createdAt = new Date().toISOString();
                    if (!m.updatedAt) m.updatedAt = m.createdAt;
                }
            }

            this.novels = allMetas;
            this.rebuildTagCache();

            const lastMem = localStorage.getItem('novel_archive_last_input');
            if (lastMem) this.lastInput = JSON.parse(lastMem);

            this.render();

            // 🏷️ 옛 데이터의 hasRichSettings 플래그를 백그라운드에서 한 번 정리
            //    - 렌더를 막지 않도록 다음 태스크로 미룸
            //    - 이미 플래그가 다 있으면 즉시 no-op
            setTimeout(() => this._migrateRichSettingsFlags(), 0);

        } catch (e) {
            console.error('초기화 실패:', e);
        }
    }

    /**
     * 🏷️ 옛 데이터(hasRichSettings 필드가 없던 시절 저장된 항목)의
     *    플래그를 계산해서 meta 스토어에 반영한다.
     *    - 본문은 로드하지 않고 settings만 읽음
     *    - 변경된 항목이 있으면 목록 화면일 때만 다시 그림
     */
    async _migrateRichSettingsFlags() {
        try {
            const updated = await this.db.refreshRichSettingsFlags();
            if (updated > 0) {
                // meta 스토어에서 다시 읽어 인메모리 상태 갱신
                this.novels = await this.db.getAllMetas();
                for (const m of this.novels) {
                    if (m.hasRichSettings === undefined) m.hasRichSettings = false;
                    if (m.chapterCount === undefined) m.chapterCount = 0;
                    if (m.totalChars === undefined) m.totalChars = 0;
                }
                // 태그는 안 바뀌었으므로 rebuildTagCache 불필요
                if (this.currentView === 'list') this.render();
                console.log(`[마이그레이션] 🏷️ hasRichSettings 갱신: ${updated}개`);
            }
        } catch (e) {
            console.error('hasRichSettings 마이그레이션 실패:', e);
        }
    }

    /* ---------------- 캐시 ---------------- */
    rebuildTagCache() {
        const counts = {};
        for (const n of this.novels) {
            if (!n.keyword) continue;
            n.keyword.split(',').forEach(t => {
                const trimmed = t.trim();
                if (trimmed) counts[trimmed] = (counts[trimmed] || 0) + 1;
            });
        }
        const allTags = Object.keys(counts).sort((a, b) =>
            counts[b] !== counts[a] ? counts[b] - counts[a] : a.localeCompare(b, 'ko')
        );
        this.tagCache = { counts, allTags };
    }

    /* ---------------- 파일 연결 ---------------- */
    async connectFile() {
        if (!window.showOpenFilePicker) {
            this.showToast('이 브라우저는 File System Access API를 지원하지 않습니다.', 'error');
            return;
        }
        try {
            const [handle] = await window.showOpenFilePicker({
                types: [{ description: 'JSON Files', accept: { 'application/json': ['.json'] } }],
                multiple: false,
            });
            this.fileHandle = handle;
            const file = await handle.getFile();
            const text = await file.text();
            const parsed = JSON.parse(text);
            if (Array.isArray(parsed)) {
                await this.db.saveAllNovels(parsed);
                this.novels = await this.db.getAllMetas();
                this.rebuildTagCache();
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
        if (!this.fileHandle) { await this.saveAsNewFile(); return; }
        try {
            if ((await this.fileHandle.queryPermission({ mode: 'readwrite' })) !== 'granted') {
                if ((await this.fileHandle.requestPermission({ mode: 'readwrite' })) !== 'granted') {
                    this.showToast('파일 쓰기 권한이 거부되었습니다.', 'error');
                    return;
                }
            }
            const fullData = await this.loadAllFullNovels();
            const writable = await this.fileHandle.createWritable();
            await writable.write(JSON.stringify(fullData, null, 2));
            await writable.close();
            this.fileSaveTimer = null;
            this.showToast('연결된 파일에 저장되었습니다.');
        } catch (err) {
            console.error(err);
            this.showToast('파일 저장 중 오류가 발생했습니다.', 'error');
        }
    }

    async loadAllFullNovels() {
        const metas = await this.db.getAllMetas();
        return Promise.all(metas.map(async m => {
            const c = await this.db.getContent(m.id);
            return { ...m, chapters: c.chapters || [], settings: c.settings || [] };
        }));
    }

    async saveAsNewFile() {
        if (!window.showSaveFilePicker) { this.downloadJSON(); return; }
        try {
            const handle = await window.showSaveFilePicker({
                suggestedName: 'novel_archive_data.json',
                types: [{ description: 'JSON Files', accept: { 'application/json': ['.json'] } }],
            });
            this.fileHandle = handle;
            const fullData = await this.loadAllFullNovels();
            const writable = await handle.createWritable();
            await writable.write(JSON.stringify(fullData, null, 2));
            await writable.close();
            const file = await handle.getFile();
            this.updateFileButtonsState(true, file.name);
            this.showToast(`새 파일('${file.name}')에 저장 및 연결되었습니다.`);
        } catch (err) {
            if (err.name !== 'AbortError') console.error(err);
        }
    }

    updateFileButtonsState(isConnected, fileName = '') {
        const connectBtn = document.getElementById('connectFileBtn');
        const saveBtn = document.getElementById('saveFileBtn');
        if (!isConnected) return;
        if (connectBtn) {
            connectBtn.innerText = `📁 ${fileName}`;
            connectBtn.title = `연결된 파일: ${fileName} (클릭하여 다른 파일로 교체)`;
            connectBtn.style.maxWidth = '180px';
            connectBtn.style.overflow = 'hidden';
            connectBtn.style.textOverflow = 'ellipsis';
        }
        if (saveBtn) saveBtn.classList.remove('hidden');
    }

    /* ---------------- 저장 흐름 ---------------- */
    async persistCurrentNovel() {
        if (!this.currentNovel) return;
        const idx = this.novels.findIndex(n => n.id === this.currentNovel.id);
        const prevKeyword = idx !== -1 ? this.novels[idx].keyword : '';

        const newMeta = await this.db.saveNovel(this.currentNovel);

        if (idx !== -1) this.novels[idx] = newMeta;
        else this.novels.push(newMeta);

        // 키워드가 실제로 바뀐 경우에만 태그 캐시 재계산
        if (newMeta.keyword !== prevKeyword) this.rebuildTagCache();

        this.scheduleFileSave();
    }

    scheduleFileSave() {
        if (!this.fileHandle) return;
        clearTimeout(this.fileSaveTimer);
        this.fileSaveTimer = setTimeout(() => this.saveToFile(), 10000);
    }

    /* ---------------- 테마 ---------------- */
    initTheme() {
        const saved = localStorage.getItem('novel_archive_theme');
        this.isDarkMode = saved ? saved === 'dark' : false;
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
            if (btn) btn.innerHTML = '☀️';
        } else {
            htmlEl.classList.remove('dark');
            if (btn) btn.innerHTML = '🌙';
        }
    }

    /* ---------------- Toast ---------------- */
    showToast(message, type = 'success') {
        const container = document.getElementById('toastContainer');
        if (!container) return;
        const toast = document.createElement('div');
        toast.className = `toast ${type === 'error' ? 'error' : 'success'}`;
        toast.innerText = message;
        container.appendChild(toast);
        requestAnimationFrame(() => toast.classList.add('show'));
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    /* ---------------- 유틸 ---------------- */
    formatDate(isoString) {
        if (!isoString) return '-';
        const d = new Date(isoString);
        const pad = (n) => String(n).padStart(2, '0');
        return `${d.getFullYear()}.${pad(d.getMonth()+1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    }
    calculateCharsWithoutSpaces(text) {
        if (!text) return 0;
        return text.replace(/\s+/g, '').length;
    }
    hasValidSettings(novel) {
        return computeHasRichSettings(novel.settings);
    }
    parseMarkdown(text) {
        if (!text) return '';
        let out = escapeHtml(text);
        out = out.replace(/^###\s+(.*)$/gm, '<h3>$1</h3>');
        out = out.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        return out;
    }

    /* ---------------- 필터/정렬 ---------------- */
    getFilteredNovels() {
        const q = this.searchQuery;
        const sel = this.selectedTag;
        const filtered = this.novels.filter(n => {
            if (q) {
                const inTitle = (n.title || '').toLowerCase().includes(q);
                const inKeyword = (n.keyword || '').toLowerCase().includes(q);
                if (!inTitle && !inKeyword) return false;
            }
            if (sel !== '전체') {
                const tags = (n.keyword || '').split(',').map(t => t.trim());
                if (!tags.includes(sel)) return false;
            }
            return true;
        });

        const cmp = SORT_COMPARATORS[this.sortOrder];
        if (cmp) filtered.sort(cmp);
        return filtered;
    }

    /* ---------------- 라우팅 ---------------- */
    render() {
        const view = document.getElementById('appView');
        if (!view) return;
        if (this.currentView === 'list') {
            view.innerHTML = this.renderListView();
            this._lastFilteredIds = this.getFilteredNovels().map(n => n.id);
        } else if (this.currentView === 'detail') {
            view.innerHTML = this.renderDetailView();
        }
    }

    goToList() {
        this.currentView = 'list';
        this.selectedNovelId = null;
        this.currentNovel = null;
        this.render();
    }

    async goToDetail(novelId) {
        const novel = await this.db.getNovelById(novelId);
        if (!novel) { this.showToast('작품을 찾을 수 없습니다.', 'error'); return; }
        this.currentNovel = novel;
        this.currentView = 'detail';
        this.selectedNovelId = novelId;
        this.selectedChapterIndex = 0;
        this.selectedSettingIndex = 0;
        this.activeDetailTab = 'chapters';
        this.render();
    }

    async goToPrevNovel() {
        const list = this._lastFilteredIds || this.getFilteredNovels().map(n => n.id);
        const i = list.indexOf(this.selectedNovelId);
        if (i > 0) await this.goToDetail(list[i - 1]);
        else this.showToast('이전 작품이 없습니다.', 'error');
    }
    async goToNextNovel() {
        const list = this._lastFilteredIds || this.getFilteredNovels().map(n => n.id);
        const i = list.indexOf(this.selectedNovelId);
        if (i !== -1 && i < list.length - 1) await this.goToDetail(list[i + 1]);
        else this.showToast('다음 작품이 없습니다.', 'error');
    }

    /* ============================================================
       LIST VIEW
       ============================================================ */
    renderListView() {
        const { counts: tagCounts, allTags } = this.tagCache;
        const filtered = this.getFilteredNovels();

        return `
            <div class="list-view">
                <div class="panel list-controls">
                    <div class="list-controls-left">
                        <span class="total-count">총 작품수: <strong>${this.novels.length}</strong>개</span>
                        <button onclick="app.toggleSelectAll(this)" class="btn btn-xs btn-soft">전체 선택</button>
                        <button onclick="app.openBatchTagModal()" class="btn btn-xs btn-purple">일괄 태그 관리</button>
                        <button onclick="app.deleteSelectedNovels()" class="btn btn-xs btn-danger">선택 삭제</button>
                    </div>
                    <div class="list-controls-right">
                        <button onclick="app.openNewPostModal()" class="btn btn-primary">
                            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                            </svg>새 게시글
                        </button>
                        <select onchange="app.filterByTag(this.value)" class="select" style="width:auto;">
                            <option value="전체" ${this.selectedTag === '전체' ? 'selected' : ''}>모든 태그 전체보기</option>
                            ${allTags.map(t => `<option value="${escapeHtml(t)}" ${this.selectedTag === t ? 'selected' : ''}>#${escapeHtml(t)} (${tagCounts[t]})</option>`).join('')}
                        </select>
                    </div>
                </div>

                <div class="panel table-wrap">
                    <table class="novel-table">
                        <thead>
                            <tr>
                                <th style="width:3rem;">#</th>
                                <th style="width:4rem;">No</th>
                                <th>제목</th>
                                <th>키워드</th>
                                <th style="width:6rem;">회차</th>
                                <th style="width:8rem; text-align:right;">총 글자수</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${filtered.length === 0
                                ? `<tr class="empty-row"><td colspan="6">조건에 일치하는 작품이 없습니다.</td></tr>`
                                : filtered.map(novel => this.renderNovelRow(novel)).join('')
                            }
                        </tbody>
                    </table>
                </div>

                <div class="panel search-panel">
                    <div class="search-row">
                        <div class="search-input-wrap">
                            <input type="text" id="searchInput" class="input search-input"
                                   placeholder="🔍 제목 또는 태그 검색"
                                   value="${escapeHtml(this.searchQuery)}"
                                   onkeydown="if(event.key==='Enter') app.executeSearch()">
                            <div class="search-actions">
                                <button onclick="app.executeSearch()" class="btn btn-accent btn-sm">검색</button>
                                <button onclick="app.resetSearch()" class="btn btn-soft btn-sm">초기화</button>
                            </div>
                        </div>
                        <select onchange="app.changeSort(this.value)" class="select sort-select">
                            <optgroup label="업데이트순">
                                <option value="latest" ${this.sortOrder === 'latest' ? 'selected' : ''}>업데이트순 (최신순)</option>
                                <option value="oldest_updated" ${this.sortOrder === 'oldest_updated' ? 'selected' : ''}>업데이트순 (오래된순)</option>
                            </optgroup>
                            <optgroup label="등록순">
                                <option value="created_desc" ${this.sortOrder === 'created_desc' ? 'selected' : ''}>등록순 (최근)</option>
                                <option value="created_asc" ${this.sortOrder === 'created_asc' ? 'selected' : ''}>등록순 (오래된)</option>
                            </optgroup>
                            <optgroup label="번호순">
                                <option value="id_asc" ${this.sortOrder === 'id_asc' ? 'selected' : ''}>번호 ↑</option>
                                <option value="id_desc" ${this.sortOrder === 'id_desc' ? 'selected' : ''}>번호 ↓</option>
                            </optgroup>
                            <optgroup label="제목순">
                                <option value="title_asc" ${this.sortOrder === 'title_asc' ? 'selected' : ''}>가나다순</option>
                                <option value="title_desc" ${this.sortOrder === 'title_desc' ? 'selected' : ''}>역가나다순</option>
                            </optgroup>
                            <optgroup label="글자수 순">
                                <option value="chars_desc" ${this.sortOrder === 'chars_desc' ? 'selected' : ''}>많은순</option>
                                <option value="chars_asc" ${this.sortOrder === 'chars_asc' ? 'selected' : ''}>적은순</option>
                            </optgroup>
                        </select>
                    </div>

                    <div class="tag-filter-row">
                        <span class="tag-filter-label">🏷️ 태그 필터:</span>
                        <button data-action="filter-tag" data-tag="전체" class="tag-pill ${this.selectedTag === '전체' ? 'active' : ''}">전체</button>
                        ${allTags.map(tag => `
                            <button data-action="filter-tag" data-tag="${escapeHtml(tag)}"
                                    class="tag-pill ${this.selectedTag === tag ? 'active' : ''}">
                                ${escapeHtml(tag)}
                            </button>`).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    renderNovelRow(novel) {
        const tags = novel.keyword ? novel.keyword.split(',').map(t => t.trim()).filter(Boolean) : [];
        const hasSettings = novel.hasRichSettings === true;   // meta 스토어 기반 🏷️
        const totalChars = novel.totalChars || 0;
        const chapterCount = novel.chapterCount || 0;
        return `
            <tr>
                <td class="cell-center">
                    <input type="checkbox" data-id="${novel.id}" class="novel-checkbox">
                </td>
                <td class="cell-center id-cell">${novel.id}</td>
                <td class="cell-title">
                    <a href="javascript:void(0)" onclick="app.goToDetail(${novel.id})" class="title-link">
                        <span class="color-dot" style="background-color:${novel.color || '#f8c8dc'};"></span>
                        ${escapeHtml(novel.title)}
                        ${hasSettings ? '<span class="badge-icon" title="설정집 100자 이상">🏷️</span>' : ''}
                    </a>
                </td>
                <td class="tag-cell">
                    ${tags.length
                        ? tags.map(t => `<span class="tag-inline" data-action="filter-tag" data-tag="${escapeHtml(t)}">*${escapeHtml(t)}</span>`).join(' ')
                        : '-'}
                </td>
                <td class="cell-center chapter-count">${chapterCount}화</td>
                <td class="cell-right char-count">${totalChars.toLocaleString()}자</td>
            </tr>
        `;
    }

    toggleSelectAll(btn) {
        const boxes = document.querySelectorAll('.novel-checkbox');
        const allChecked = Array.from(boxes).every(cb => cb.checked);
        boxes.forEach(cb => cb.checked = !allChecked);
        btn.textContent = allChecked ? '전체 선택' : '선택 해제';
    }

    /* ---------------- 검색 / 필터 / 정렬 ---------------- */
    executeSearch() {
        const input = document.getElementById('searchInput');
        if (input) this.searchQuery = input.value.toLowerCase();
        if (this.currentView === 'list') this.render();
    }
    resetSearch() {
        this.searchQuery = '';
        this.selectedTag = '전체';
        const input = document.getElementById('searchInput');
        if (input) input.value = '';
        if (this.currentView === 'list') this.render();
    }
    filterByTag(tag) {
        this.selectedTag = tag;
        this.render();
    }
    changeSort(order) {
        this.sortOrder = order;
        this.render();
    }

    /* ---------------- 배치 태그 ---------------- */
    openBatchTagModal() {
        const checked = document.querySelectorAll('.novel-checkbox:checked');
        if (checked.length === 0) {
            this.showToast('태그를 관리할 작품을 체크해주세요.', 'error');
            return;
        }
        const allTags = this.tagCache.allTags;
        const content = document.getElementById('modalContent');
        content.innerHTML = `
            <div class="modal-header">
                <h3 class="modal-title">선택한 작품 일괄 태그 관리 (${checked.length}개)</h3>
                <button onclick="app.closeModal()" class="modal-close">✕</button>
            </div>
            <div class="modal-body">
                <div class="panel panel-pad">
                    <h4 style="font-weight:700; margin-bottom:0.5rem;">➕ 일괄 태그 추가</h4>
                    <p style="font-size:0.75rem; color:var(--text-faint); margin-bottom:0.75rem;">쉼표(,)로 구분</p>
                    <div style="display:flex; gap:0.5rem;">
                        <input type="text" id="batchAddTagInput" class="input" placeholder="예: 해피엔딩, 애절물">
                        <button onclick="app.handleBatchAddTag()" class="btn btn-primary">추가</button>
                    </div>
                </div>
                <div class="panel panel-pad">
                    <h4 style="font-weight:700; margin-bottom:0.5rem;">➖ 특정 태그 일괄 삭제</h4>
                    <p style="font-size:0.75rem; color:var(--text-faint); margin-bottom:0.75rem;">선택한 작품들에서 제거할 태그</p>
                    <div style="display:flex; gap:0.5rem;">
                        <select id="batchRemoveTagSelect" class="select">
                            <option value="">삭제할 태그 선택...</option>
                            ${allTags.map(t => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join('')}
                        </select>
                        <button onclick="app.handleBatchRemoveTag()" class="btn btn-danger">삭제</button>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button onclick="app.closeModal()" class="btn btn-soft">닫기</button>
            </div>
        `;
        document.getElementById('modalOverlay').classList.remove('hidden');
    }

    async handleBatchAddTag() {
        const v = document.getElementById('batchAddTagInput').value.trim();
        if (!v) { this.showToast('추가할 태그를 입력하세요.', 'error'); return; }
        const newTags = v.split(',').map(t => t.trim()).filter(Boolean);
        const ids = Array.from(document.querySelectorAll('.novel-checkbox:checked')).map(cb => parseInt(cb.dataset.id));

        const nowISO = new Date().toISOString();
        const metas = await Promise.all(ids.map(id => this.db.getMeta(id)));

        const tx = this.db.db.transaction(this.db.metaStore, 'readwrite');
        const store = tx.objectStore(this.db.metaStore);

        for (const meta of metas) {
            if (!meta) continue;
            const existing = meta.keyword ? meta.keyword.split(',').map(t => t.trim()).filter(Boolean) : [];
            newTags.forEach(nt => { if (!existing.includes(nt)) existing.push(nt); });
            meta.keyword = existing.join(', ');
            meta.updatedAt = nowISO;
            store.put(meta);
            const idx = this.novels.findIndex(n => n.id === meta.id);
            if (idx !== -1) this.novels[idx] = meta;
        }

        await new Promise((res, rej) => {
            tx.oncomplete = res;
            tx.onerror = () => rej(tx.error);
        });

        this.rebuildTagCache();
        this.closeModal();
        this.showToast('태그가 일괄 추가되었습니다.');
        this.render();
    }

    async handleBatchRemoveTag() {
        const tag = document.getElementById('batchRemoveTagSelect').value;
        if (!tag) { this.showToast('삭제할 태그를 선택하세요.', 'error'); return; }
        const ids = Array.from(document.querySelectorAll('.novel-checkbox:checked')).map(cb => parseInt(cb.dataset.id));
        const nowISO = new Date().toISOString();

        const metas = await Promise.all(ids.map(id => this.db.getMeta(id)));

        const tx = this.db.db.transaction(this.db.metaStore, 'readwrite');
        const store = tx.objectStore(this.db.metaStore);

        for (const meta of metas) {
            if (!meta || !meta.keyword) continue;
            let existing = meta.keyword.split(',').map(t => t.trim()).filter(Boolean);
            existing = existing.filter(t => t !== tag);
            meta.keyword = existing.join(', ');
            meta.updatedAt = nowISO;
            store.put(meta);
            const idx = this.novels.findIndex(n => n.id === meta.id);
            if (idx !== -1) this.novels[idx] = meta;
        }

        await new Promise((res, rej) => {
            tx.oncomplete = res;
            tx.onerror = () => rej(tx.error);
        });

        this.rebuildTagCache();
        this.closeModal();
        this.showToast(`'${tag}' 태그가 삭제되었습니다.`);
        this.render();
    }

    async deleteSelectedNovels() {
        const checked = document.querySelectorAll('.novel-checkbox:checked');
        if (checked.length === 0) { this.showToast('삭제할 작품을 선택하세요.', 'error'); return; }
        if (!confirm(`선택한 ${checked.length}개의 작품을 삭제하시겠습니까?`)) return;
        const ids = Array.from(checked).map(cb => parseInt(cb.dataset.id));
        await Promise.all(ids.map(id => this.db.deleteNovel(id)));
        this.novels = await this.db.getAllMetas();
        this.rebuildTagCache();
        this.showToast('선택한 작품이 삭제되었습니다.');
        this.render();
    }

    /* ---------------- JSON ---------------- */
    async downloadJSON() {
        const fullData = await this.loadAllFullNovels();
        const blob = new Blob([JSON.stringify(fullData, null, 2)], { type: 'application/json;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `novel_archive_backup_${new Date().toISOString().slice(0,10)}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        this.showToast('JSON 백업 파일이 다운로드되었습니다.');
    }

    restoreJSON(event) {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const parsed = JSON.parse(e.target.result);
                if (Array.isArray(parsed) && confirm('불러온 백업 데이터로 덮어쓰시겠습니까?')) {
                    await this.db.saveAllNovels(parsed);
                    this.novels = await this.db.getAllMetas();
                    this.rebuildTagCache();
                    this.showToast('성공적으로 복원되었습니다.');
                    this.render();
                }
            } catch {
                this.showToast('JSON 파싱 중 오류가 발생했습니다.', 'error');
            }
        };
        reader.readAsText(file);
        event.target.value = '';
    }

    /* ============================================================
       MODAL 공통
       ============================================================ */
    closeModal() {
        document.getElementById('modalOverlay').classList.add('hidden');
    }

    triggerAutoCorrect(textareaId) {
        const el = document.getElementById(textareaId);
        if (el) {
            el.value = applyTextCorrections(el.value);
            this.showToast('부호 및 오타가 자동 교정되었습니다.');
        }
    }

    _renderModalShell({ title, formId, onsubmit, body, submitLabel = '등록', submitClass = 'btn btn-primary' }) {
        return `
            <div class="modal-header">
                <h3 class="modal-title">${title}</h3>
                <button onclick="app.closeModal()" class="modal-close">✕</button>
            </div>
            <form id="${formId}" class="modal-body" onsubmit="${onsubmit}">
                ${body}
            </form>
            <div class="modal-footer">
                <button type="button" onclick="app.closeModal()" class="btn btn-soft">취소</button>
                <button type="submit" form="${formId}" class="${submitClass}">${submitLabel}</button>
            </div>
        `;
    }

    /* ============================================================
       새 작품 등록
       ============================================================ */
    openNewPostModal() {
        const defColor = this.lastInput.color || '#f8c8dc';
        document.getElementById('modalContent').innerHTML = this._renderModalShell({
            title: '새 작품 등록',
            formId: 'formNewPost',
            onsubmit: 'app.handleCreatePost(event)',
            submitLabel: '등록하기',
            body: `
                <div class="form-group">
                    <label class="form-label">색상 라벨</label>
                    <div class="color-grid">${renderColorGrid('postColor', defColor)}</div>
                </div>
                <div class="form-group">
                    <label class="form-label">제목</label>
                    <input type="text" id="postTitle" class="input" placeholder="작품 제목" required>
                </div>
                <div class="form-group">
                    <label class="form-label">키워드 (쉼표로 구분)</label>
                    <input type="text" id="postKeyword" class="input" placeholder="예: 로맨스, 피폐물">
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">첫 회차 제목</label>
                        <input type="text" id="postChapterTitle" class="input" value="1화." required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">회차당 목표 글자수</label>
                        <input type="number" id="postTargetChars" class="input" value="5000" step="500">
                    </div>
                </div>
                <div class="form-group">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.25rem;">
                        <label class="form-label" style="margin:0;">본문 내용</label>
                        ${autoCorrectBlock('postContent', 'handleTextFileUpload')}
                    </div>
                    <textarea id="postContent" class="textarea" rows="16" placeholder="본문을 입력하거나 텍스트 파일을 업로드하세요."></textarea>
                </div>
            `,
        });
        document.getElementById('modalOverlay').classList.remove('hidden');
    }

    handleTextFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        const baseName = file.name.replace(/\.[^/.]+$/, '');
        const chInput = document.getElementById('postChapterTitle');
        if (chInput && (!chInput.value || chInput.value.startsWith('1화'))) chInput.value = baseName;
        const reader = new FileReader();
        reader.onload = (e) => {
            const ta = document.getElementById('postContent');
            if (ta) {
                ta.value = applyTextCorrections((e.target.result || '').trim());
                this.showToast('텍스트 업로드 및 자동 교정 완료');
            }
        };
        reader.readAsText(file, 'utf-8');
    }

    async handleCreatePost(event) {
        event.preventDefault();
        const color = (document.querySelector('input[name="postColor"]:checked') || {}).value || '#f8c8dc';
        const title = document.getElementById('postTitle').value.trim() || '무제 작품';
        const keyword = document.getElementById('postKeyword').value.trim();
        const targetChars = parseInt(document.getElementById('postTargetChars').value) || 5000;
        const chTitle = document.getElementById('postChapterTitle').value.trim() || '1화';
        const content = applyTextCorrections((document.getElementById('postContent').value || '').trim());

        this.lastInput = { color, title, keyword };
        localStorage.setItem('novel_archive_last_input', JSON.stringify(this.lastInput));

        const nowISO = new Date().toISOString();
        const newId = this.novels.length > 0 ? Math.max(...this.novels.map(n => n.id)) + 1 : 1;

        const newNovel = {
            id: newId, color, title, keyword, targetChars,
            settings: [{ title: '기본 설정', content: '내용 없음', createdAt: nowISO, updatedAt: nowISO }],
            chapters: [{ title: chTitle, content, createdAt: nowISO, updatedAt: nowISO }],
            createdAt: nowISO, updatedAt: nowISO,
        };

        const meta = await this.db.saveNovel(newNovel);
        this.novels.push(meta);
        this.rebuildTagCache();
        this.closeModal();
        this.showToast('새 작품이 등록되었습니다.');
        this.render();
    }

    /* ============================================================
       작품 정보 수정
       ============================================================ */
    openEditNovelModal(novelId) {
        const novel = this.currentNovel;
        if (!novel) return;
        document.getElementById('modalContent').innerHTML = this._renderModalShell({
            title: '작품 정보 수정',
            formId: 'formEditNovel',
            onsubmit: `app.handleEditNovelSubmit(event, ${novelId})`,
            submitLabel: '수정 완료',
            submitClass: 'btn btn-purple',
            body: `
                <div class="form-group">
                    <label class="form-label">색상 라벨</label>
                    <div class="color-grid">${renderColorGrid('editNovelColor', novel.color)}</div>
                </div>
                <div class="form-group">
                    <label class="form-label">제목</label>
                    <input type="text" id="editNovelTitle" class="input" value="${escapeHtml(novel.title)}" required>
                </div>
                <div class="form-group">
                    <label class="form-label">키워드</label>
                    <input type="text" id="editNovelKeyword" class="input" value="${escapeHtml(novel.keyword || '')}">
                </div>
                <div class="form-group">
                    <label class="form-label">회차당 목표 글자수</label>
                    <input type="number" id="editNovelTarget" class="input" value="${novel.targetChars || 5000}" step="500">
                </div>
            `,
        });
        document.getElementById('modalOverlay').classList.remove('hidden');
    }

    async handleEditNovelSubmit(event, novelId) {
        event.preventDefault();
        if (!this.currentNovel) return;
        this.currentNovel.color = document.querySelector('input[name="editNovelColor"]:checked').value;
        this.currentNovel.title = document.getElementById('editNovelTitle').value.trim();
        this.currentNovel.keyword = document.getElementById('editNovelKeyword').value.trim();
        this.currentNovel.targetChars = parseInt(document.getElementById('editNovelTarget').value) || 5000;
        this.currentNovel.updatedAt = new Date().toISOString();

        await this.persistCurrentNovel();
        this.closeModal();
        this.showToast('작품 정보가 수정되었습니다.');
        this.render();
    }

    /* ============================================================
       DETAIL VIEW
       ============================================================ */
    renderDetailView() {
        const novel = this.currentNovel;
        if (!novel) return `<div style="text-align:center; padding:5rem;"><button onclick="app.goToList()" class="btn btn-soft">목록으로</button></div>`;

        const nowISO = new Date().toISOString();
        if (!novel.chapters || novel.chapters.length === 0) novel.chapters = [{ title: '1화', content: '', createdAt: nowISO, updatedAt: nowISO }];
        if (!novel.settings || novel.settings.length === 0) novel.settings = [{ title: '기본 설정', content: '', createdAt: nowISO, updatedAt: nowISO }];

        if (this.selectedChapterIndex >= novel.chapters.length) this.selectedChapterIndex = 0;
        if (this.selectedSettingIndex >= novel.settings.length) this.selectedSettingIndex = 0;

        const tags = novel.keyword ? novel.keyword.split(',').map(t => t.trim()).filter(Boolean) : [];
        const hasSettings = this.hasValidSettings(novel);
        const totalChars = novel.totalChars || 0;

        return `
            <div class="detail-view">
                <div class="panel detail-header">
                    <div class="detail-title-row">
                        <div class="detail-title-wrap">
                            <span class="color-dot" style="background-color:${novel.color || '#f8c8dc'};"></span>
                            <h2 class="detail-title">
                                ${escapeHtml(novel.title)}
                                ${hasSettings ? '<span class="badge-icon" title="설정집 100자 이상">🏷️</span>' : ''}
                            </h2>
                        </div>
                        <div class="detail-actions">
                            <button onclick="app.goToList()" class="btn btn-soft btn-sm">목록으로</button>
                            <button onclick="app.goToPrevNovel()" class="btn btn-soft btn-sm">▲ 이전글</button>
                            <button onclick="app.goToNextNovel()" class="btn btn-soft btn-sm">▼ 다음글</button>
                            <button onclick="app.openEditNovelModal(${novel.id})" class="btn btn-purple btn-sm">정보 수정</button>
                        </div>
                    </div>

                    <div class="detail-tabs">
                        <button onclick="app.switchDetailTab('chapters')" class="tab-btn ${this.activeDetailTab === 'chapters' ? 'active' : ''}">연재 소설 본문</button>
                        <button onclick="app.switchDetailTab('settings')" class="tab-btn ${this.activeDetailTab === 'settings' ? 'active' : ''}">설정집 및 메모 ${hasSettings ? '🏷️' : ''}</button>
                    </div>

                    <div class="keyword-row">
                        <div class="keyword-list">
                            <span class="label">키워드:</span>
                            ${tags.length
                                ? tags.map(t => `<span class="keyword-badge">#${escapeHtml(t)}</span>`).join('')
                                : '<span class="label">없음</span>'}
                        </div>
                        <div class="detail-stats">총 누적 글자수: <strong>${totalChars.toLocaleString()}자</strong></div>
                    </div>
                </div>

                ${this.activeDetailTab === 'settings'
                    ? this.renderSettingsPanel()
                    : this.renderChaptersPanel()}
            </div>
        `;
    }

    /* ---------------- 회차 패널 ---------------- */
    renderChaptersPanel() {
        const chapter = this.currentNovel.chapters[this.selectedChapterIndex];
        return `
            <div class="detail-grid">
                <div class="panel sidebar" id="chapterSidebar">
                    ${this.renderChapterSidebarInner()}
                </div>
                <div class="panel content-panel" id="chapterContentPanel">
                    ${this.renderChapterContentInner(chapter)}
                </div>
            </div>
        `;
    }

    renderChapterSidebarInner() {
        const novel = this.currentNovel;
        return `
            <div class="sidebar-header">
                <h3 class="sidebar-title">회차 목록 (${novel.chapters.length}화)</h3>
                <button onclick="app.openAddChapterModal(${novel.id})" class="sidebar-add">+ 회차 추가</button>
            </div>
            <div class="sidebar-list">
                ${novel.chapters.map((ch, idx) => `
                    <div class="list-item-row">
                        <button data-chapter-btn data-idx="${idx}" onclick="app.selectChapter(${idx})"
                                class="list-item ${idx === this.selectedChapterIndex ? 'active' : ''}">
                            <span class="list-item-title">${escapeHtml(ch.title)}</span>
                            <span class="list-item-meta">${(ch.content || '').length}자</span>
                        </button>
                        <select class="move-select" onchange="app.moveChapterTo(${novel.id}, ${idx}, this.value); this.selectedIndex=0;">
                            <option value="" disabled selected>⚙️</option>
                            <option value="top">맨위</option>
                            <option value="up">↑</option>
                            <option value="down">↓</option>
                            <option value="bottom">맨밑</option>
                        </select>
                    </div>
                `).join('')}
            </div>
        `;
    }

    renderChapterContentInner(chapter) {
        const novel = this.currentNovel;
        const currentChars = chapter.content ? chapter.content.length : 0;
        const currentCharsNoSpace = this.calculateCharsWithoutSpaces(chapter.content);
        const targetChars = novel.targetChars || 5000;
        const progressPercent = Math.min(100, Math.round((currentChars / targetChars) * 100));
        const manuscriptPages = (currentChars / 200).toFixed(1);

        return `
            <div class="content-header">
                <div>
                    <h3 class="content-title">${escapeHtml(chapter.title)}</h3>
                    <div class="content-stats">
                        <span>공백 포함: <font class="highlight">${currentChars.toLocaleString()}자</font></span>
                        <span>공백 제외: <font class="mono">${currentCharsNoSpace.toLocaleString()}자</font></span>
                        <span>원고지: <font class="mono">${manuscriptPages}매</font></span>
                    </div>
                </div>
            </div>

            <div class="content-toolbar">
                <div class="toolbar-group">
                    <select onchange="app.changeFontFamily(this.value)" class="toolbar-select">
                        <option value="font-nanumgothic" ${this.fontFamily === 'font-nanumgothic' ? 'selected' : ''}>나눔고딕</option>
                        <option value="font-nanummyeongjo" ${this.fontFamily === 'font-nanummyeongjo' ? 'selected' : ''}>나눔명조</option>
                        <option value="font-ridibatang" ${this.fontFamily === 'font-ridibatang' ? 'selected' : ''}>리디바탕</option>
                    </select>
                    <select onchange="app.changeLineHeight(this.value)" class="toolbar-select">
                        <option value="150%" ${this.lineHeight === '150%' ? 'selected' : ''}>줄간격 150%</option>
                        <option value="180%" ${this.lineHeight === '180%' ? 'selected' : ''}>줄간격 180%</option>
                        <option value="200%" ${this.lineHeight === '200%' ? 'selected' : ''}>줄간격 200%</option>
                        <option value="240%" ${this.lineHeight === '240%' ? 'selected' : ''}>줄간격 240%</option>
                    </select>
                    <div class="font-size-control">
                        <span class="label">크기</span>
                        <button onclick="app.changeFontSize(-1)">-</button>
                        <span class="value" id="fontSizeLabel">${this.fontSize}pt</span>
                        <button onclick="app.changeFontSize(1)">+</button>
                    </div>
                    <div class="search-inline">
                        <input type="text" id="internalSearchInput" placeholder="본문 검색"
                               onkeydown="if(event.key==='Enter') app.handleInternalSearch(this.value)">
                        <button onclick="app.handleInternalSearch(document.getElementById('internalSearchInput').value)">🔍</button>
                    </div>
                </div>
                <div class="toolbar-actions">
                    <button onclick="app.correctCurrentChapterContent(${novel.id},${this.selectedChapterIndex})" class="btn-toolbar btn-accent">✨ 교정</button>
                    <button onclick="app.downloadCurrentChapter(${novel.id},${this.selectedChapterIndex})" class="btn-toolbar btn-success">TXT 다운</button>
                    <button onclick="app.openEditChapterModal(${novel.id},${this.selectedChapterIndex})" class="btn-toolbar btn-soft">수정</button>
                    <button onclick="app.deleteCurrentChapter(${novel.id},${this.selectedChapterIndex})" class="btn-toolbar btn-danger">삭제</button>
                </div>
            </div>

            <div class="progress-wrap">
                <div class="progress-label">
                    <span>목표 글자수 달성률 (${targetChars.toLocaleString()}자 기준)</span>
                    <span class="pct" id="progressPct">${progressPercent}%</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" id="progressFill" style="width: ${progressPercent}%;"></div>
                </div>
            </div>

            <div class="meta-row">
                <div>작성: <span class="mono">${this.formatDate(chapter.createdAt)}</span></div>
                <div>수정: <span id="updatedAtDisplay" class="mono updated">${this.formatDate(chapter.updatedAt || chapter.createdAt)}</span></div>
            </div>

            <div id="chapterContentDisplay"
                 class="content-display ${this.fontFamily}"
                 style="font-size: ${this.fontSize}pt; line-height: ${this.lineHeight};"
                 contenteditable="true"
                 oncompositionstart="app.isComposing = true"
                 oncompositionend="app.isComposing = false; app.handleAutoSaveContent(${novel.id}, ${this.selectedChapterIndex}, this.innerText)"
                 oninput="if(!app.isComposing) app.handleAutoSaveContent(${novel.id}, ${this.selectedChapterIndex}, this.innerText)"
                 onblur="app.handleAutoSaveContent(${novel.id}, ${this.selectedChapterIndex}, this.innerText, true)"
            >${escapeHtml(chapter.content || '').trim()}</div>
            <div class="content-hint">💡 본문을 직접 클릭하여 수정할 수 있으며 자동 저장됩니다.</div>
        `;
    }

    /* ---------------- 설정 패널 ---------------- */
    renderSettingsPanel() {
        const setting = this.currentNovel.settings[this.selectedSettingIndex];
        return `
            <div class="detail-grid">
                <div class="panel sidebar" id="settingSidebar">
                    ${this.renderSettingSidebarInner()}
                </div>
                <div class="panel content-panel" id="settingContentPanel">
                    ${this.renderSettingContentInner(setting)}
                </div>
            </div>
        `;
    }

    renderSettingSidebarInner() {
        const novel = this.currentNovel;
        return `
            <div class="sidebar-header">
                <h3 class="sidebar-title">설정 목록 (${novel.settings.length}개)</h3>
                <button onclick="app.openAddSettingModal(${novel.id})" class="sidebar-add">+ 설정 추가</button>
            </div>
            <div class="sidebar-list">
                ${novel.settings.map((st, idx) => `
                    <div class="list-item-row">
                        <button data-setting-btn data-idx="${idx}" onclick="app.selectSetting(${idx})"
                                class="list-item ${idx === this.selectedSettingIndex ? 'active' : ''}">
                            <span class="list-item-title">${escapeHtml(st.title)}</span>
                            <span class="list-item-meta">${(st.content || '').length}자</span>
                        </button>
                        <select class="move-select" onchange="app.moveSettingTo(${novel.id}, ${idx}, this.value); this.selectedIndex=0;">
                            <option value="" disabled selected>⚙️</option>
                            <option value="top">맨위</option>
                            <option value="up">↑</option>
                            <option value="down">↓</option>
                            <option value="bottom">맨밑</option>
                        </select>
                    </div>
                `).join('')}
            </div>
        `;
    }

    renderSettingContentInner(setting) {
        const novel = this.currentNovel;
        return `
            <div class="content-header">
                <div>
                    <h3 class="content-title">${escapeHtml(setting.title)}</h3>
                    <div class="content-subtitle">글자수: ${(setting.content || '').length.toLocaleString()}자 (### 제목, **굵은글씨** 마크다운 지원)</div>
                </div>
                <div class="toolbar-actions">
                    <button onclick="app.openEditSettingModal(${novel.id},${this.selectedSettingIndex})" class="btn btn-soft btn-sm">설정 수정</button>
                    <button onclick="app.deleteCurrentSetting(${novel.id},${this.selectedSettingIndex})" class="btn btn-danger btn-sm">삭제</button>
                </div>
            </div>
            <div id="settingContentDisplay"
                 class="content-display markdown-render setting-display ${this.fontFamily}"
                 style="font-size: ${this.fontSize}pt; line-height: ${this.lineHeight};">${this.parseMarkdown(setting.content || '설정 내용이 없습니다.')}</div>
        `;
    }

    /* ============================================================
       부분 DOM 갱신
       ============================================================ */
    refreshChapterSidebar() {
        const el = document.getElementById('chapterSidebar');
        if (el) el.innerHTML = this.renderChapterSidebarInner();
    }
    refreshChapterContent() {
        const el = document.getElementById('chapterContentPanel');
        if (el && this.currentNovel) {
            el.innerHTML = this.renderChapterContentInner(this.currentNovel.chapters[this.selectedChapterIndex]);
        }
    }
    refreshSettingSidebar() {
        const el = document.getElementById('settingSidebar');
        if (el) el.innerHTML = this.renderSettingSidebarInner();
    }
    refreshSettingContent() {
        const el = document.getElementById('settingContentPanel');
        if (el && this.currentNovel) {
            el.innerHTML = this.renderSettingContentInner(this.currentNovel.settings[this.selectedSettingIndex]);
        }
    }

    applyContentStyles() {
        const el = document.getElementById('chapterContentDisplay');
        if (el) {
            el.style.fontSize = `${this.fontSize}pt`;
            el.style.lineHeight = this.lineHeight;
            el.className = `content-display ${this.fontFamily}`;
        }
        const setEl = document.getElementById('settingContentDisplay');
        if (setEl) {
            setEl.style.fontSize = `${this.fontSize}pt`;
            setEl.style.lineHeight = this.lineHeight;
            setEl.className = `content-display markdown-render setting-display ${this.fontFamily}`;
        }
        const label = document.getElementById('fontSizeLabel');
        if (label) label.textContent = `${this.fontSize}pt`;
    }

    /* ============================================================
       탭 / 폰트 / 크기 / 줄간격
       ============================================================ */
    switchDetailTab(tab) {
        this.activeDetailTab = tab;
        this.render();
    }
    changeFontSize(delta) {
        this.fontSize = Math.max(10, Math.min(22, this.fontSize + delta));
        localStorage.setItem('novel_archive_fontsize', this.fontSize);
        this.applyContentStyles();
    }
    changeFontFamily(cls) {
        FontLoader.ensure(cls);
        this.fontFamily = cls;
        localStorage.setItem('novel_archive_fontfamily', this.fontFamily);
        this.applyContentStyles();
    }
    changeLineHeight(lh) {
        this.lineHeight = lh;
        localStorage.setItem('novel_archive_lineheight', this.lineHeight);
        this.applyContentStyles();
    }

    selectChapter(idx) {
        if (this.selectedChapterIndex === idx) return;
        this.selectedChapterIndex = idx;
        document.querySelectorAll('[data-chapter-btn]').forEach(btn => {
            btn.classList.toggle('active', parseInt(btn.dataset.idx) === idx);
        });
        this.refreshChapterContent();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    selectSetting(idx) {
        if (this.selectedSettingIndex === idx) return;
        this.selectedSettingIndex = idx;
        document.querySelectorAll('[data-setting-btn]').forEach(btn => {
            btn.classList.toggle('active', parseInt(btn.dataset.idx) === idx);
        });
        this.refreshSettingContent();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    /* ============================================================
       자동저장 (IME 안전 / IndexedDB만 / 파일은 디바운스)
       ============================================================ */
    handleAutoSaveContent(novelId, chapterIndex, newContent, immediate = false) {
        clearTimeout(this.autoSaveTimer);
        const doSave = async () => {
            if (!this.currentNovel || !this.currentNovel.chapters[chapterIndex]) return;
            const nowISO = new Date().toISOString();
            this.currentNovel.chapters[chapterIndex].content = newContent;
            this.currentNovel.chapters[chapterIndex].updatedAt = nowISO;
            this.currentNovel.updatedAt = nowISO;

            await this.persistCurrentNovel();

            const updateEl = document.getElementById('updatedAtDisplay');
            if (updateEl) updateEl.textContent = this.formatDate(nowISO);

            const sidebarBtn = document.querySelector(`[data-chapter-btn][data-idx="${chapterIndex}"] .list-item-meta`);
            if (sidebarBtn) sidebarBtn.textContent = `${newContent.length}자`;

            const targetChars = this.currentNovel.targetChars || 5000;
            const pct = Math.min(100, Math.round((newContent.length / targetChars) * 100));
            const fill = document.getElementById('progressFill');
            const pctEl = document.getElementById('progressPct');
            if (fill) fill.style.width = `${pct}%`;
            if (pctEl) pctEl.textContent = `${pct}%`;
        };
        if (immediate) doSave();
        else this.autoSaveTimer = setTimeout(doSave, 1000);
    }

    /* ============================================================
       순서 이동
       ============================================================ */
    async moveChapterTo(novelId, index, action) {
        if (!this.currentNovel) return;
        const arr = this.currentNovel.chapters;
        const item = arr.splice(index, 1)[0];
        let newIndex = index;
        if (action === 'top') newIndex = 0;
        else if (action === 'up') newIndex = Math.max(0, index - 1);
        else if (action === 'down') newIndex = Math.min(arr.length, index + 1);
        else if (action === 'bottom') newIndex = arr.length;
        arr.splice(newIndex, 0, item);
        this.selectedChapterIndex = newIndex;
        this.currentNovel.updatedAt = new Date().toISOString();
        await this.persistCurrentNovel();
        this.showToast(`"${item.title}" 순서 변경`);
        this.refreshChapterSidebar();
        this.refreshChapterContent();
    }

    async moveSettingTo(novelId, index, action) {
        if (!this.currentNovel) return;
        const arr = this.currentNovel.settings;
        const item = arr.splice(index, 1)[0];
        let newIndex = index;
        if (action === 'top') newIndex = 0;
        else if (action === 'up') newIndex = Math.max(0, index - 1);
        else if (action === 'down') newIndex = Math.min(arr.length, index + 1);
        else if (action === 'bottom') newIndex = arr.length;
        arr.splice(newIndex, 0, item);
        this.selectedSettingIndex = newIndex;
        this.currentNovel.updatedAt = new Date().toISOString();
        await this.persistCurrentNovel();
        this.showToast(`"${item.title}" 순서 변경`);
        this.refreshSettingSidebar();
        this.refreshSettingContent();
    }

    /* ============================================================
       회차 추가/수정/삭제
       ============================================================ */
    openAddChapterModal(novelId) {
        const nextNum = this.currentNovel.chapters.length + 1;
        document.getElementById('modalContent').innerHTML = this._renderModalShell({
            title: '새 회차 추가',
            formId: 'formAddChapter',
            onsubmit: `app.handleAddChapterSubmit(event, ${novelId})`,
            submitLabel: '추가',
            body: `
                <div class="form-group">
                    <label class="form-label">회차 제목</label>
                    <input type="text" id="chapTitle" class="input" value="${nextNum}화." required>
                </div>
                <div class="form-group">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.25rem;">
                        <label class="form-label" style="margin:0;">본문</label>
                        ${autoCorrectBlock('chapContent', 'handleChapTextFileUpload')}
                    </div>
                    <textarea id="chapContent" class="textarea" rows="8"></textarea>
                </div>
            `,
        });
        document.getElementById('modalOverlay').classList.remove('hidden');
    }

    handleChapTextFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        const baseName = file.name.replace(/\.[^/.]+$/, '');
        const t = document.getElementById('chapTitle');
        if (t && (!t.value || t.value.endsWith('.'))) t.value = baseName;
        const reader = new FileReader();
        reader.onload = (e) => {
            const ta = document.getElementById('chapContent');
            if (ta) {
                ta.value = applyTextCorrections((e.target.result || '').trim());
                this.showToast('텍스트 업로드 및 자동 교정 완료');
            }
        };
        reader.readAsText(file, 'utf-8');
    }

    async handleAddChapterSubmit(event, novelId) {
        event.preventDefault();
        const title = document.getElementById('chapTitle').value.trim();
        const content = applyTextCorrections((document.getElementById('chapContent').value || '').trim());
        if (!this.currentNovel) return;
        const nowISO = new Date().toISOString();
        this.currentNovel.chapters.push({ title, content, createdAt: nowISO, updatedAt: nowISO });
        this.currentNovel.updatedAt = nowISO;
        await this.persistCurrentNovel();
        this.selectedChapterIndex = this.currentNovel.chapters.length - 1;
        this.closeModal();
        this.showToast('새 회차가 추가되었습니다.');
        this.refreshChapterSidebar();
        this.refreshChapterContent();
    }

    openEditChapterModal(novelId, chapterIndex) {
        const ch = this.currentNovel.chapters[chapterIndex];
        document.getElementById('modalContent').innerHTML = this._renderModalShell({
            title: '회차 수정',
            formId: 'formEditChapter',
            onsubmit: `app.handleEditChapterSubmit(event, ${novelId}, ${chapterIndex})`,
            submitLabel: '저장',
            body: `
                <div class="form-group">
                    <label class="form-label">회차 제목</label>
                    <input type="text" id="editChapTitle" class="input" value="${escapeHtml(ch.title)}" required>
                </div>
                <div class="form-group">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.25rem;">
                        <label class="form-label" style="margin:0;">본문</label>
                        ${autoCorrectBlock('editChapContent', 'handleEditChapTextFileUpload')}
                    </div>
                    <textarea id="editChapContent" class="textarea" rows="24">${escapeHtml(ch.content)}</textarea>
                </div>
            `,
        });
        document.getElementById('modalOverlay').classList.remove('hidden');
    }

    handleEditChapTextFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            const ta = document.getElementById('editChapContent');
            if (ta) {
                ta.value = applyTextCorrections((e.target.result || '').trim());
                this.showToast('텍스트 교체 완료');
            }
        };
        reader.readAsText(file, 'utf-8');
    }

    async handleEditChapterSubmit(event, novelId, chapterIndex) {
        event.preventDefault();
        const title = document.getElementById('editChapTitle').value.trim();
        const content = applyTextCorrections((document.getElementById('editChapContent').value || '').trim());
        if (!this.currentNovel || !this.currentNovel.chapters[chapterIndex]) return;
        const nowISO = new Date().toISOString();
        Object.assign(this.currentNovel.chapters[chapterIndex], { title, content, updatedAt: nowISO });
        this.currentNovel.updatedAt = nowISO;
        await this.persistCurrentNovel();
        this.closeModal();
        this.showToast('회차가 수정되었습니다.');
        this.refreshChapterSidebar();
        this.refreshChapterContent();
    }

    async deleteCurrentChapter(novelId, chapterIndex) {
        if (!this.currentNovel) return;
        if (this.currentNovel.chapters.length <= 1) {
            this.showToast('최소 1개의 회차는 유지되어야 합니다.', 'error'); return;
        }
        if (!confirm(`"${this.currentNovel.chapters[chapterIndex].title}" 회차를 삭제하시겠습니까?`)) return;
        this.currentNovel.chapters.splice(chapterIndex, 1);
        this.currentNovel.updatedAt = new Date().toISOString();
        await this.persistCurrentNovel();
        this.selectedChapterIndex = Math.max(0, chapterIndex - 1);
        this.showToast('회차가 삭제되었습니다.');
        this.refreshChapterSidebar();
        this.refreshChapterContent();
    }

    /* ============================================================
       설정 추가/수정/삭제
       ============================================================ */
    openAddSettingModal(novelId) {
        document.getElementById('modalContent').innerHTML = this._renderModalShell({
            title: '새 설정 노트 추가',
            formId: 'formAddSetting',
            onsubmit: `app.handleAddSettingSubmit(event, ${novelId})`,
            submitLabel: '추가',
            body: `
                <div class="form-group">
                    <label class="form-label">설정 제목</label>
                    <input type="text" id="settingTitle" class="input" placeholder="예: 주요 인물 소개" required>
                </div>
                <div class="form-group">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.25rem;">
                        <label class="form-label" style="margin:0;">설정 내용 (마크다운 지원)</label>
                        <label class="cyan-button" style="cursor:pointer;">
                            텍스트 업로드
                            <input type="file" accept=".txt" onchange="app.handleSettingTextFileUpload(event)" hidden>
                        </label>
                    </div>
                    <textarea id="settingContent" class="textarea" rows="8"></textarea>
                </div>
            `,
        });
        document.getElementById('modalOverlay').classList.remove('hidden');
    }

    handleSettingTextFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        const baseName = file.name.replace(/\.[^/.]+$/, '');
        const t = document.getElementById('settingTitle');
        if (t && !t.value) t.value = baseName;
        const reader = new FileReader();
        reader.onload = (e) => {
            const ta = document.getElementById('settingContent');
            if (ta) {
                ta.value = (e.target.result || '').trim();
                this.showToast('텍스트 파일이 적용되었습니다.');
            }
        };
        reader.readAsText(file, 'utf-8');
    }

    async handleAddSettingSubmit(event, novelId) {
        event.preventDefault();
        const title = document.getElementById('settingTitle').value.trim();
        const content = (document.getElementById('settingContent').value || '').trim();
        if (!this.currentNovel) return;
        const nowISO = new Date().toISOString();
        this.currentNovel.settings.push({ title, content, createdAt: nowISO, updatedAt: nowISO });
        this.currentNovel.updatedAt = nowISO;
        await this.persistCurrentNovel();
        this.selectedSettingIndex = this.currentNovel.settings.length - 1;
        this.closeModal();
        this.showToast('새 설정 노트가 추가되었습니다.');
        this.refreshSettingSidebar();
        this.refreshSettingContent();
    }

    openEditSettingModal(novelId, settingIndex) {
        const st = this.currentNovel && this.currentNovel.settings[settingIndex];
        if (!st) return;
        document.getElementById('modalContent').innerHTML = this._renderModalShell({
            title: '설정 노트 수정',
            formId: 'formEditSetting',
            onsubmit: `app.handleEditSettingSubmit(event, ${novelId}, ${settingIndex})`,
            submitLabel: '저장',
            body: `
                <div class="form-group">
                    <label class="form-label">설정 제목</label>
                    <input type="text" id="editSettingTitle" class="input" value="${escapeHtml(st.title)}" required>
                </div>
                <div class="form-group">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.25rem;">
                        <label class="form-label" style="margin:0;">설정 내용</label>
                        <label class="cyan-button" style="cursor:pointer;">
                            텍스트 교체
                            <input type="file" accept=".txt" onchange="app.handleEditSettingTextFileUpload(event)" hidden>
                        </label>
                    </div>
                    <textarea id="editSettingContent" class="textarea" rows="24">${escapeHtml(st.content)}</textarea>
                </div>
            `,
        });
        document.getElementById('modalOverlay').classList.remove('hidden');
    }

    handleEditSettingTextFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            const ta = document.getElementById('editSettingContent');
            if (ta) {
                ta.value = (e.target.result || '').trim();
                this.showToast('텍스트 내용으로 교체되었습니다.');
            }
        };
        reader.readAsText(file, 'utf-8');
    }

    async handleEditSettingSubmit(event, novelId, settingIndex) {
        event.preventDefault();
        const title = document.getElementById('editSettingTitle').value.trim();
        const content = (document.getElementById('editSettingContent').value || '').trim();
        if (!this.currentNovel || !this.currentNovel.settings[settingIndex]) return;
        const nowISO = new Date().toISOString();
        Object.assign(this.currentNovel.settings[settingIndex], { title, content, updatedAt: nowISO });
        this.currentNovel.updatedAt = nowISO;
        await this.persistCurrentNovel();
        this.closeModal();
        this.showToast('설정 노트가 수정되었습니다.');
        this.refreshSettingSidebar();
        this.refreshSettingContent();
    }

    async deleteCurrentSetting(novelId, settingIndex) {
        if (!this.currentNovel) return;
        if (this.currentNovel.settings.length <= 1) {
            this.showToast('최소 1개의 설정 노트는 유지되어야 합니다.', 'error'); return;
        }
        if (!confirm(`"${this.currentNovel.settings[settingIndex].title}" 설정을 삭제하시겠습니까?`)) return;
        this.currentNovel.settings.splice(settingIndex, 1);
        this.currentNovel.updatedAt = new Date().toISOString();
        await this.persistCurrentNovel();
        this.selectedSettingIndex = Math.max(0, settingIndex - 1);
        this.showToast('설정 노트가 삭제되었습니다.');
        this.refreshSettingSidebar();
        this.refreshSettingContent();
    }

    /* ============================================================
       본문 교정 / 검색 / 다운로드
       ============================================================ */
    async correctCurrentChapterContent(novelId, chapterIndex) {
        if (!this.currentNovel || !this.currentNovel.chapters[chapterIndex]) return;
        const displayEl = document.getElementById('chapterContentDisplay');
        const raw = displayEl ? displayEl.innerText : this.currentNovel.chapters[chapterIndex].content;
        const corrected = applyTextCorrections(raw);

        if (displayEl) displayEl.innerText = corrected;
        const nowISO = new Date().toISOString();
        this.currentNovel.chapters[chapterIndex].content = corrected;
        this.currentNovel.chapters[chapterIndex].updatedAt = nowISO;
        this.currentNovel.updatedAt = nowISO;

        await this.persistCurrentNovel();
        this.showToast('본문이 자동 교정되었습니다!');

        const meta = document.querySelector(`[data-chapter-btn][data-idx="${chapterIndex}"] .list-item-meta`);
        if (meta) meta.textContent = `${corrected.length}자`;
        const updEl = document.getElementById('updatedAtDisplay');
        if (updEl) updEl.textContent = this.formatDate(nowISO);
    }

    handleInternalSearch(query) {
        if (this.activeDetailTab !== 'chapters') return;
        const displayEl = document.getElementById('chapterContentDisplay');
        if (!displayEl || !this.currentNovel) return;
        const raw = this.currentNovel.chapters[this.selectedChapterIndex].content || '';

        if (!query.trim()) {
            displayEl.innerText = raw.trim();
            return;
        }
        const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(${escaped})`, 'gi');
        const html = escapeHtml(raw).replace(regex, '<span class="search-highlight">$1</span>');
        displayEl.innerHTML = html;

        const hl = displayEl.querySelector('.search-highlight');
        if (hl) {
            hl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            this.showToast(`'${query}' 검색 완료`);
        } else {
            this.showToast('일치하는 단어가 없습니다.', 'error');
        }
    }

    downloadCurrentChapter(novelId, chapterIndex) {
        if (!this.currentNovel || !this.currentNovel.chapters[chapterIndex]) return;
        const ch = this.currentNovel.chapters[chapterIndex];
        const content = `${ch.title}\n\n${ch.content || ''}`;
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const safe = (s) => s.replace(/[\\/:*?"<>|]/g, '');
        a.download = `${safe(this.currentNovel.title)}_${safe(ch.title)}.txt`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        this.showToast('회차가 다운로드되었습니다.');
    }
}

/* 앱 부트스트랩 */
const app = new NovelArchiveApp();