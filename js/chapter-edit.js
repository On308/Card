/* ============================================================
   CHAPTER EDIT: 회차 렌더/추가/수정/삭제, 자동저장, 변환, 검색
   ============================================================ */
const ChapterEditMixin = {
    /* ── 회차 번호 계산 ── */
    getNextChapterNumber() {
        const chapters = this.currentNovel?.chapters;
        if (!Array.isArray(chapters) || chapters.length === 0) return 1;
        let maxNum = 0;
        for (const ch of chapters) {
            const title = (ch && ch.title) || '';
            let m = title.match(/(\d+)\s*화/);
            if (!m) m = title.match(/^\s*(\d+)/);
            if (m) {
                const n = parseInt(m[1], 10);
                if (!Number.isNaN(n) && n > maxNum) maxNum = n;
            }
        }
        return maxNum > 0 ? maxNum + 1 : chapters.length + 1;
    },

    async renumberChapters() {
        if (!this.currentNovel) return;
        const chapters = this.currentNovel.chapters;
        if (!Array.isArray(chapters) || chapters.length === 0) return;
        if (!confirm(`모든 회차 제목을 1화부터 ${chapters.length}화까지 순서대로 재정렬합니다.\n계속할까요?`)) return;

        const nowISO = new Date().toISOString();
        chapters.forEach((ch, i) => {
            const n = i + 1;
            const title = ch.title || '';
            if (/\d+\s*화/.test(title))      ch.title = title.replace(/\d+\s*화/, `${n}화`);
            else if (/^\s*\d+/.test(title))  ch.title = title.replace(/^\s*\d+/, String(n));
            else                              ch.title = `${n}화. ${title}`.trim();
            ch.updatedAt = nowISO;
        });
        this.currentNovel.updatedAt = nowISO;
        await this.persistCurrentNovel();
        this.selectedChapterIndex = Math.min(this.selectedChapterIndex, chapters.length - 1);
        this.showToast(`회차 번호가 1화 ~ ${chapters.length}화로 정렬되었습니다.`);
        this.refreshChapterSidebar();
        this.refreshChapterContent();
    },

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
                    </div>
                `).join('')}
                <div class="sidebar-header-actions">
                    <button onclick="app.renumberChapters()" class="sidebar-renumber"
                            title="회차 번호를 1화부터 순서대로 재정렬">🔄 회차 번호 재정렬</button>
                </div>
            </div>
        `;
    },

    renderChapterContentInner(chapter) {
        const novel = this.currentNovel;
        const currentChars = chapter.content ? chapter.content.length : 0;
        const currentCharsNoSpace = this.calculateCharsWithoutSpaces(chapter.content);
        const targetChars = novel.targetChars || 5000;
        const progressPercent = Math.min(100, Math.round((currentChars / targetChars) * 100));
        const manuscriptPages = (currentChars / 200).toFixed(1);

        return `
                 <h3 class="content-title">${escapeHtml(chapter.title)}</h3>
                 <div class="content-header">
                    <div class="content-stats">
                        <span>공백 포함: <font class="highlight">${currentChars.toLocaleString()}자</font></span>
                        <span>공백 제외: <font class="mono">${currentCharsNoSpace.toLocaleString()}자</font></span>
                        <span>원고지: <font class="mono">${manuscriptPages}매</font></span>
                    </div>
					
                    <select class="toolbar-select move-select-inline"
                            onchange="app.moveChapterTo(${novel.id}, ${this.selectedChapterIndex}, this.value); this.selectedIndex=0;"
                            title="회차 순서 변경">
                        <option value="" disabled selected>↕ 회차 순서 변경</option>
                        <option value="top">⤒ 맨 위로</option>
                        <option value="up">↑ 위로</option>
                        <option value="down">↓ 아래로</option>
                        <option value="bottom">⤓ 맨 아래로</option>
                    </select>
					
                <div class="chapter-nav">
                    <button onclick="app.goToPrevChapter()" class="chapter-nav-btn"
                            ${this.selectedChapterIndex === 0 ? 'disabled' : ''}
                            title="이전 회차">‹ 이전 회차</button>
                    <span class="chapter-nav-sep">|</span>
                    <button onclick="app.goToNextChapter()" class="chapter-nav-btn"
                            ${this.selectedChapterIndex === this.currentNovel.chapters.length - 1 ? 'disabled' : ''}
                            title="다음 회차">다음 회차 ›</button>
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
                    <button onclick="app.correctCurrentChapterContent(${novel.id},${this.selectedChapterIndex})" class="btn btn-purple btn-sm">✨ 변환</button>
                    <button onclick="app.downloadCurrentChapter(${novel.id},${this.selectedChapterIndex})" class="btn btn-success btn-sm">TXT 다운</button>
                    <button onclick="app.openEditChapterModal(${novel.id},${this.selectedChapterIndex})" class="btn btn-soft btn-sm">수정</button>
                    <button onclick="app.deleteCurrentChapter(${novel.id},${this.selectedChapterIndex})" class="btn btn-danger btn-sm">삭제</button>
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
                <div>작성일: <span class="mono">${this.formatDate(chapter.createdAt)}</span></div>
                <div>수정일: <span id="updatedAtDisplay" class="mono updated">${this.formatDate(chapter.updatedAt || chapter.createdAt)}</span></div>
            </div>

            <div id="chapterContentDisplay"
                 class="content-display ${this.fontFamily}"
                 style="font-size: ${this.fontSize}pt; line-height: ${this.lineHeight};"
                 contenteditable="plaintext-only"
                 oncompositionstart="app.isComposing = true"
                 oncompositionend="app.isComposing = false; app.handleAutoSaveContent(${novel.id}, ${this.selectedChapterIndex}, this.innerText)"
                 oninput="if(!app.isComposing) app.handleAutoSaveContent(${novel.id}, ${this.selectedChapterIndex}, this.innerText)"
                 onblur="app.handleAutoSaveContent(${novel.id}, ${this.selectedChapterIndex}, this.innerText, true)"
            >${escapeHtml(chapter.content || '').trim()}</div>
			
			<div class="content-hint">💡 본문을 직접 클릭하여 수정할 수 있으며 자동 저장됩니다.</div>
			
			<div class="content-bottom">
                <div class="chapter-nav">
                    <button onclick="app.goToPrevChapter()" class="chapter-nav-btn"
                            ${this.selectedChapterIndex === 0 ? 'disabled' : ''}
                            title="이전 회차">‹ 이전 회차</button>
                    <span class="chapter-nav-sep">|</span>
                    <button onclick="app.goToNextChapter()" class="chapter-nav-btn"
                            ${this.selectedChapterIndex === this.currentNovel.chapters.length - 1 ? 'disabled' : ''}
                            title="다음 회차">다음 회차 ›</button>
                    <span class="chapter-nav-sep">|</span>
					<button onclick="window.scrollTo({top:0, behavior:'smooth'})" class="chapter-nav-btn">맨 위로</button>
                    <span class="chapter-nav-sep">|</span>
                    <button onclick="app.switchDetailTab('settings')" class="chapter-nav-btn">메모 및 설정</button>
                    <span class="chapter-nav-sep">|</span>
					<button onclick="app.goToList()" class="chapter-nav-btn">목록</button>
                    <span class="chapter-nav-sep">|</span>
                    <button onclick="app.openEditChapterModal(${novel.id},${this.selectedChapterIndex})" class="chapter-nav-btn" title="현재 회차 수정">✏️</button>
                    <span class="chapter-nav-sep">|</span>
                    <button onclick="app.deleteCurrentChapter(${novel.id},${this.selectedChapterIndex})" class="chapter-nav-btn" title="현재 회차 삭제">🗑️</button>
                    <span class="chapter-nav-sep">|</span>
                </div>
            </div>
				
            </div>
        `;
    },

    /* ── 자동저장 ── */
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
    },

    /* ── 순서 이동 ── */
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
		this.rememberPosition();
    },

    /* ── 회차 추가/수정/삭제 ── */
    openAddChapterModal(novelId) {
        const nextNum = this.getNextChapterNumber();
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
    },

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
                this.showToast('텍스트 업로드 및 자동 변환 완료');
            }
        };
        reader.readAsText(file, 'utf-8');
    },

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
    },

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
    },

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
    },

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
    },

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
    },

    /* ── 변환/검색/다운로드 ── */
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
        this.showToast('본문이 자동 변환되었습니다!');
        const meta = document.querySelector(`[data-chapter-btn][data-idx="${chapterIndex}"] .list-item-meta`);
        if (meta) meta.textContent = `${corrected.length}자`;
        const updEl = document.getElementById('updatedAtDisplay');
        if (updEl) updEl.textContent = this.formatDate(nowISO);
    },

    handleInternalSearch(query) {
        if (this.activeDetailTab !== 'chapters') return;
        const displayEl = document.getElementById('chapterContentDisplay');
        if (!displayEl || !this.currentNovel) return;
        const raw = this.currentNovel.chapters[this.selectedChapterIndex].content || '';
        if (!query.trim()) { displayEl.innerText = raw.trim(); return; }
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
    },

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
    },

    /* 작품 전체를 하나의 TXT로 다운로드 */
    downloadWholeNovel() {
        if (!this.currentNovel) return;
        const novel = this.currentNovel;
        const chapters = novel.chapters || [];
        if (chapters.length === 0) {
            this.showToast('내보낼 회차가 없습니다.', 'error');
            return;
        }

        const statusInfo = getStatusInfo(novel.status || 'ongoing');
        const header = [
            `# ${novel.title}`,
            ``,
            novel.keyword ? `키워드: ${novel.keyword}` : '',
            `상태: ${statusInfo.emoji} ${statusInfo.label}`,
            `회차: ${chapters.length}화`,
            `총 글자수: ${(novel.totalChars || 0).toLocaleString()}자`,
            `내보낸 시각: ${this.formatDate(new Date().toISOString())}`,
            ``,
            `============================================================`,
            ``,
        ].filter(Boolean).join('\n');

        const body = chapters.map((ch, i) => {
            const title = ch.title || `${i + 1}화`;
            const content = ch.content || '';
            return `${title}\n\n${content}\n\n`;
        }).join('------------------------------------------------------------\n\n');

        const fullText = header + body;

        const blob = new Blob([fullText], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const safe = (s) => s.replace(/[\\/:*?"<>|]/g, '');
        a.download = `${safe(novel.title)}_전체.txt`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        this.showToast(`${chapters.length}개 회차를 내보냈습니다.`);
    }                                  // 마지막 메서드는 쉼표 없음
};                                     // 여기서 믹신 닫기