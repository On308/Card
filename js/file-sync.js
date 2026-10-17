/* ============================================================
   FILE SYNC: 파일 연결/저장, JSON 백업/복원
   ============================================================ */
const FileSyncMixin = {
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
            const parsed = JSON.parse(await file.text());
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
    },

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
    },

    async loadAllFullNovels() {
        const metas = await this.db.getAllMetas();
        return Promise.all(metas.map(async m => {
            const c = await this.db.getContent(m.id);
            return { ...m, chapters: c.chapters || [], settings: c.settings || [] };
        }));
    },

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
    },

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
    },

    async persistCurrentNovel() {
        if (!this.currentNovel) return;
        const idx = this.novels.findIndex(n => n.id === this.currentNovel.id);
        const prevKeyword = idx !== -1 ? this.novels[idx].keyword : '';
        const newMeta = await this.db.saveNovel(this.currentNovel);
        if (idx !== -1) this.novels[idx] = newMeta;
        else this.novels.push(newMeta);
        if (newMeta.keyword !== prevKeyword) this.rebuildTagCache();
        this.scheduleFileSave();
    },

    scheduleFileSave() {
        if (!this.fileHandle) return;
        clearTimeout(this.fileSaveTimer);
        this.fileSaveTimer = setTimeout(() => this.saveToFile(), 10000);
    },

    async downloadJSON() {
        const fullData = await this.loadAllFullNovels();
        const blob = new Blob([JSON.stringify(fullData, null, 2)], { type: 'application/json;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const d = new Date();
        const pad = (n) => String(n).padStart(2, '0');
        a.download = `novel_archive_backup_${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        this.showToast('JSON 백업 파일이 다운로드되었습니다.');
    },

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
};