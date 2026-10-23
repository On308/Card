/* ============================================================
   SETTING EDIT: 설정 렌더/추가/수정/삭제/순서 이동
   ============================================================ */
const SettingEditMixin = {
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
                    </div>
                `).join('')}
            </div>
        `;
    },

    renderSettingContentInner(setting) {
        const novel = this.currentNovel;
        const isFirstSetting = this.selectedSettingIndex === 0;
        const isLastSetting  = this.selectedSettingIndex === novel.settings.length - 1;

        return `
                    <h3 class="content-title">${escapeHtml(setting.title)}</h3>
            <div class="content-header">
                    <div class="content-subtitle">글자수: ${(setting.content || '').length.toLocaleString()}자</div>
                    <div class="chapter-nav">
                        <button onclick="app.goToPrevSetting()" class="chapter-nav-btn"
                                ${isFirstSetting ? 'disabled' : ''}
                                title="이전 설정">‹ 이전 설정</button>
                        <span class="chapter-nav-sep">|</span>
                        <button onclick="app.goToNextSetting()" class="chapter-nav-btn"
                                ${isLastSetting ? 'disabled' : ''}
                                title="다음 설정">다음 설정 ›</button>
                    </div>
					
                <div class="content-header-right">
                    <div class="toolbar-actions">
                        <select class="toolbar-select move-select-inline"
                                onchange="app.moveSettingTo(${novel.id}, ${this.selectedSettingIndex}, this.value); this.selectedIndex=0;"
                                title="설정 순서 변경">
                            <option value="" disabled selected>↕ 설정 순서 변경</option>
                            <option value="top">⤒ 맨 위로</option>
                            <option value="up">↑ 위로</option>
                            <option value="down">↓ 아래로</option>
                            <option value="bottom">⤓ 맨 아래로</option>
                        </select>
						
                        <button onclick="app.openEditSettingModal(${novel.id},${this.selectedSettingIndex})" class="btn btn-soft btn-sm">설정 수정</button>
                        <button onclick="app.deleteCurrentSetting(${novel.id},${this.selectedSettingIndex})" class="btn btn-danger btn-sm">삭제</button>
                    </div>
                </div>
            </div>
			
            <div id="settingContentDisplay"
                 class="content-display markdown-render setting-display ${this.fontFamily}"
                 style="font-size: ${this.fontSize}pt; line-height: ${this.lineHeight};">${this.parseMarkdown(setting.content || '설정 내용이 없습니다.')}</div>
			
			<div class="content-hint">📌 마크다운 : # 제목, ## 소제목, **굵은글씨**, *기울임*, &#96;형광펜&#96;, ~~취소선~~, --- 구분선<br>- 리스트, > 인용, | 표 |, |:좌측정렬|, |:중앙정렬:|, |우측정렬:|, ![이미지](http url)</div>
			<div class="content-bottom">
                <div class="chapter-nav">
				
                        <button onclick="app.goToPrevSetting()" class="chapter-nav-btn"
                                ${isFirstSetting ? 'disabled' : ''}
                                title="이전 설정">‹ 이전 설정</button>
                        <span class="chapter-nav-sep">|</span>
                        <button onclick="app.goToNextSetting()" class="chapter-nav-btn"
                                ${isLastSetting ? 'disabled' : ''}
                                title="다음 설정">다음 설정 ›</button>
						<span class="chapter-nav-sep">|</span>
						<button onclick="window.scrollTo({top:0})" class="chapter-nav-btn">맨 위로</button>
						<span class="chapter-nav-sep">|</span>
						<button onclick="app.switchDetailTab('chapters')" class="chapter-nav-btn">소설 본문</button>
						<span class="chapter-nav-sep">|</span>
						<button onclick="app.goToList()" class="chapter-nav-btn">목록</button>
						<span class="chapter-nav-sep">|</span>
						<button onclick="app.openAddSettingModal(${novel.id})" class="chapter-nav-btn" title="새 설정 작성">+ 설정 추가</button>
						<span class="chapter-nav-sep">|</span>
						<button onclick="app.openEditSettingModal(${novel.id},${this.selectedSettingIndex})" class="chapter-nav-btn" title="설정 수정">✏️</button>
						<span class="chapter-nav-sep">|</span>
						<button onclick="app.deleteCurrentSetting(${novel.id},${this.selectedSettingIndex})" class="chapter-nav-btn" title="설정 삭제">🗑️</button>
                </div>
			</div>
        `;
    },

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
		this.rememberPosition();
    },

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
                        <div style="display:flex; gap:0.5rem;">
                            <button type="button"
                                    onclick="app.insertImageMarkdown('settingContent')"
                                    class="purple-button">🖼️ 이미지 url 추가</button>
                            <label class="cyan-button" style="cursor:pointer;">
                                텍스트 업로드
                                <input type="file" accept=".txt" onchange="app.handleSettingTextFileUpload(event)" hidden>
                            </label>
                        </div>
                    </div>
                    <textarea id="settingContent" class="textarea" rows="24"></textarea>
					<div class="content-hint">📌 마크다운 : # 제목, ## 소제목, **굵은글씨**, *기울임*, &#96;형광펜&#96;, ~~취소선~~, --- 구분선, - 리스트, > 인용, | 표 |, ![이미지](http url)</div>
                </div>
            `,
        });
        document.getElementById('modalOverlay').classList.remove('hidden');
    },

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
    },

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
    },

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
                        <div style="display:flex; gap:0.5rem;">
                            <button type="button"
                                    onclick="app.insertImageMarkdown('editSettingContent')"
                                    class="purple-button">🖼️ 이미지 url 추가</button>
                            <label class="cyan-button" style="cursor:pointer;">
                                텍스트 교체
                                <input type="file" accept=".txt" onchange="app.handleEditSettingTextFileUpload(event)" hidden>
                            </label>
                        </div>
                    </div>
                    <textarea id="editSettingContent" class="textarea" rows="24">${escapeHtml(st.content)}</textarea>
					<div class="content-hint">📌 마크다운 : # 제목, ## 소제목, **굵은글씨**, *기울임*, &#96;형광펜&#96;, ~~취소선~~, --- 구분선, - 리스트, > 인용, | 표 |, ![이미지](http url)</div>
                </div>
            `,
        });
        document.getElementById('modalOverlay').classList.remove('hidden');
    },

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
    },
	    /* ── 커서 위치에 이미지 마크다운 삽입 ── */
    insertImageMarkdown(textareaId) {
        const ta = document.getElementById(textareaId);
        if (!ta) {
            this.showToast('입력창을 찾을 수 없습니다.', 'error');
            return;
        }

        // URL 입력 프롬프트
        const url = prompt('이미지 URL을 입력하세요.\n예: https://example.com/image.png');
        if (!url) return;                       // 취소
        const trimmed = url.trim();

        // 스킴 검사 (http(s), data:image, 상대경로 허용)
        if (!/^(https?:\/\/|data:image\/|\/|\.\/|\.\.\/)/i.test(trimmed)) {
            this.showToast('http(s):// 또는 data:image/ 로 시작하는 URL만 사용할 수 있습니다.', 'error');
            return;
        }

        // 대체 텍스트 입력 (선택)
        const alt = (prompt('대체 텍스트(alt)를 입력하세요. 비워두셔도 됩니다.', '이미지') || '').trim();

        // 삽입할 마크다운: 이미지 단독 라인이 되도록 앞뒤로 개행을 붙인다
        const md = `\n![${alt}](${trimmed})\n`;

        // ── 커서 위치 삽입 ──
        const start = ta.selectionStart ?? ta.value.length;
        const end   = ta.selectionEnd   ?? ta.value.length;
        const before = ta.value.slice(0, start);
        const after  = ta.value.slice(end);

        ta.value = before + md + after;

        // 커서를 삽입한 이미지 마크다운 뒤로 이동
        const newPos = start + md.length;
        ta.focus();
        ta.setSelectionRange(newPos, newPos);

        // input 이벤트를 강제로 발생시켜 필요 시 다른 로직도 반응
        ta.dispatchEvent(new Event('input', { bubbles: true }));

        this.showToast('이미지 마크다운이 삽입되었습니다.');
    },

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
    },

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
};