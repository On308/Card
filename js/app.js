/* ============================================================
   APP 부트스트랩
   - 각 모듈(mixin)을 NovelArchiveApp.prototype 에 병합
   - 하나의 app 인스턴스 생성
   ============================================================ */

// 병합 대상 mixin들 (로드 순서는 상관 없음 — 모두 prototype 확장만 하므로)
const MIXINS = [
    PreferencesMixin,
    FileSyncMixin,
    ModalMixin,
    ListViewMixin,
    DetailViewMixin,
    ChapterEditMixin,
    SettingEditMixin,
];

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
		
		this.currentPage = 1;          // 현재 페이지 (1부터 시작)
        this.itemsPerPage = 16;        // 페이지당 항목 수
		
        this.searchQuery = '';
        this.selectedTag = '전체';
		this.selectedStatus = 'all';
		this.selectedAdult = 'all';
        this.sortOrder = 'latest';

        this.isDarkMode = false;
        this.fontSize = 13;
        this.fontFamily = 'font-nanumgothic';
        this.lineHeight = '180%';
		this.contentPadding = 16;

        this.lastInput = { color: '#f8c8dc', title: '', keyword: '' };

        this.tagCache = { counts: {}, allTags: [] };
        this._lastFilteredIds = null;

        this.autoSaveTimer = null;
        this.fileSaveTimer = null;
        this.isComposing = false;

        this.fileHandle = null;

        // 초기화 (initApp은 async지만 await 없이 진행 — 기존과 동일)
        this.initTheme();
        this.initPreferences();
        this.initEventDelegation();
        this.initApp();
        this.initGlobalKeyEvents();
        this.initVisibilitySave();
		this.initLiveClock();
    }
	
	/* 최근 본 작품/회차 위치 기억 */
    rememberPosition() {
        try {
            if (this.selectedNovelId) {
                localStorage.setItem('novel_archive_last_novel', String(this.selectedNovelId));
                localStorage.setItem('novel_archive_last_chapter', String(this.selectedChapterIndex));
            }
        } catch (e) {}
    }

    /* ---------------- 앱 초기화 (mixin에 없는 것만 여기에) ---------------- */
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
                        { title: '세계관 설정', content: '# 제목1\n## 제목2\n### 제목3\n#### 제목4\n**굵은 글씨**는 이렇게 뜹니다.\n*기울임*은 이렇게 뜹니다.\n`형광펜`은 이렇게 뜹니다.\n> 인용은 이렇게\n---\n|번호|내용|설명|\n|:---:|:---:|---|\n|표는|이렇게|작성할 수 있습니다|' },
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
                for (const m of allMetas) {
                    if (m.chapterCount === undefined) m.chapterCount = 0;
                    if (m.totalChars === undefined) m.totalChars = 0;
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
			this.updateGlobalStats();

            setTimeout(() => this._migrateRichSettingsFlags(), 0);
        } catch (e) {
            console.error('초기화 실패:', e);
        }
    }

    async _migrateRichSettingsFlags() {
        try {
            const updated = await this.db.refreshRichSettingsFlags();
            if (updated > 0) {
                this.novels = await this.db.getAllMetas();
                for (const m of this.novels) {
                    if (m.hasRichSettings === undefined) m.hasRichSettings = false;
                    if (m.chapterCount === undefined) m.chapterCount = 0;
                    if (m.totalChars === undefined) m.totalChars = 0;
                }
                if (this.currentView === 'list') this.render();
                console.log(`[마이그레이션] 🏷️ hasRichSettings 갱신: ${updated}개`);
            }
        } catch (e) {
            console.error('hasRichSettings 마이그레이션 실패:', e);
        }
    }
}

/* ── mixin 병합 ── */
for (const mixin of MIXINS) {
    for (const key of Object.keys(mixin)) {
        NovelArchiveApp.prototype[key] = mixin[key];
    }
}

/* ── 부트스트랩 ── */
const app = new NovelArchiveApp();