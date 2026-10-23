/* ============================================================
   TEXT CORRECTION / ESCAPE / TEMPLATE HELPERS
   ============================================================ */
function applyTextCorrections(text) {
    if (!text) return '';
    let converted = text;

    let openDouble = false;
    converted = converted.replace(/"/g, () => (openDouble = !openDouble) ? '“' : '”');

    let openSingle = false;
    converted = converted.replace(/'/g, () => (openSingle = !openSingle) ? '‘' : '’');

    converted = converted.replace(/\.{3,}/g, '……');
    converted = converted.replace(/···/g, '……');
    converted = converted.replace(/　“/g, '“');
    converted = converted.replace(/　‘/g, '‘');
    converted = converted.replace(/떄/g, '때');
    converted = converted.replace(/겟지/g, '겠지');
    converted = converted.replace(/겟어/g, '겠어');
    converted = converted.replace(/(…)([”’])/g, '$1.$2');
    converted = converted.replace(/([다어데지])([”])/g, '$1.$2');

    return converted;
}

const HTML_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, c => HTML_MAP[c]);
}

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
            <button type="button" onclick="app.triggerAutoCorrect('${textareaId}')" class="gold-button">✨ 자동 변환</button>
            <label class="cyan-button" style="cursor:pointer;">
                텍스트 업로드
                <input type="file" accept=".txt" onchange="app.${uploadHandler}(event)" hidden>
            </label>
        </div>
    `;
}

function computeHasRichSettings(settings) {
    if (!Array.isArray(settings) || settings.length === 0) return false;
    const byteLength = (s) => new TextEncoder().encode(s || '').length;
    const total = settings.reduce((a, s) => a + byteLength(s.content), 0);
    return total >= RICH_SETTINGS_THRESHOLD;
}