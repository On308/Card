/* ============================================================
   DATABASE
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
                            meta.status = meta.status || 'ongoing';
							meta.isAdult = meta.isAdult === true;
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
        return { ...meta, chapters: content.chapters || [], settings: content.settings || [] };
    }
    saveNovel(novel) {
        return new Promise((resolve, reject) => {
            const { chapters, settings, ...meta } = novel;
            const chs = chapters || [];
            const sts = settings || [];
            meta.chapterCount = chs.length;
            meta.totalChars = chs.reduce((s, c) => s + ((c.content || '').length), 0);
            meta.hasRichSettings = computeHasRichSettings(sts);
			meta.status = meta.status || 'ongoing'; 
			meta.isAdult = meta.isAdult === true;

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
			meta.status = meta.status || 'ongoing';
			meta.isAdult = meta.isAdult === true;
            metaStore.put(meta);
            contentStore.put({ id: n.id, chapters: chs, settings: sts });
        }
        return new Promise((resolve, reject) => {
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    }
    async refreshRichSettingsFlags() {
        const metas = await this.getAllMetas();
        if (!metas.some(m => m.hasRichSettings === undefined)) return 0;
        let updated = 0;
        for (const meta of metas) {
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