/**
 * editsafetypdf.js - PDF 編輯頁面 (Safety Inspection)
 * 新增 Submit 功能：將 draft 狀態改為 submitted-wsg
 * ★ 格子建立方式參考 editlabour.js
 * ★ 修正：側邊欄展開/收起時表單格子會錯位
 * ★ Type checkbox 與 Header 都改為「按頁碼 (page)」配置
 * ★ Header 支援 '*' 通用欄位 + 單頁覆蓋
 * ★ Header 欄位支援多行輸入 (multiline: true → textarea)
 * ★ Header 欄位支援手寫簽名 (sign: true → 點擊彈出 modal 手寫)
 * ★ Header 欄位支援圖片上傳 (image: true → 點擊選檔，自動壓縮)
 * ★ 修正 Save：參考 editdsdsitediary.js
 *   - saveChanges 同步多個 sessionStorage key + 更新 localStorage 陣列
 *   - loadDocumentData 從 localStorage 補全 sessionStorage 缺失的欄位
 *     （避免列表頁覆蓋 editDocument 導致編輯內容讀不回來）
 */
(function() {
    'use strict';

    // ---------- 全局變量 ----------
    let pdfDoc = null;
    let currentPage = 1;
    let scale = 1.0;
    const renderScale = 2.0;
    let totalPages = 0;
    let currentTool = 'select';
    let isDrawing = false;
    let lastX = 0, lastY = 0;
    let startX = 0, startY = 0;

    let annotations = [];
    let currentDoc = null;
    let selectedAnnotationId = null;
    let history = [];
    let textBoxElements = [];

    // DOM 引用
    const canvas = document.getElementById('pdf-canvas');
    const drawCanvas = document.getElementById('draw-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    const drawCtx = drawCanvas ? drawCanvas.getContext('2d') : null;
    const container = document.getElementById('pdf-container');
    const colorPicker = document.getElementById('color-picker');
    const sizeSlider = document.getElementById('size-slider');
    const sizeValue = document.getElementById('size-value');
    const opacitySlider = document.getElementById('opacity-slider');
    const opacityValue = document.getElementById('opacity-value');
    const currentPageSpan = document.getElementById('current-page');
    const totalPagesSpan = document.getElementById('total-pages');
    const zoomLevelSpan = document.querySelector('.zoom-level');
    const lockBtn = document.getElementById('lock-btn');
    const submitBtn = document.getElementById('submit-btn');
    const approveBtn = document.getElementById('approve-btn');
    const rejectBtn = document.getElementById('reject-btn');

    // ========================================
    // ★ Safety Inspection 固定表單 Layout
    // ========================================
    var SAFETY_LAYOUT = {
        typeCheckboxes: {
            1: [
                { key: 'weekly', left: '27.72%', top: '17.00%', width: '1.08%', height: '0.89%' },
                { key: 'daily',  left: '37.14%', top: '17.00%', width: '1.16%', height: '0.89%' },
                { key: 'adhoc',  left: '44.72%', top: '17.00%', width: '1.17%', height: '0.83%' }
            ],
        },
        header: {
            '*': {
                Project:    { left: '55.00%', top: '4.50%',  width: '33.00%', height: '6.30%', multiline: true },
                ContractNo: { left: '61.64%', top: '11.00%', width: '29.58%', height: '1.71%' },
            },
            1: {
                location:  { left: '18.72%', top: '18.15%', width: '31.92%', height: '1.59%' },
                taskOrder: { left: '63.64%', top: '18.15%', width: '29.58%', height: '1.71%' },
                date:      { left: '15.89%', top: '20.00%', width: '34.75%', height: '1.59%' },
                time:      { left: '56.30%', top: '20.00%', width: '37.00%', height: '1.65%' },
            },
            7: {
                Detail:  { left: '10.72%', top: '52.15%', width: '80.92%', height: '25.59%', multiline: true},
                Inspectedbyname1:  { left: '17.72%', top: '86.15%', width: '10.92%', height: '2.59%'},
                Inspectedbypos1:   { left: '18.72%', top: '90.0%',  width: '10.92%', height: '2.59%'},
                Inspectedbysign1:  { left: '19.72%', top: '92.5%', width: '10.92%', height: '4.5%', sign: true },
                Inspectedbyname2:  { left: '47.72%', top: '86.15%', width: '10.92%', height: '2.59%'},
                Inspectedbypos2:   { left: '48.72%', top: '90.0%',  width: '10.92%', height: '2.59%'},
                Inspectedbysign2:  { left: '49.72%', top: '92.5%', width: '10.92%', height: '4.5%', sign: true },
                Witnessbyname1:    { left: '77.72%', top: '86.15%', width: '10.92%', height: '2.59%'},
                Witnessbypos1:     { left: '78.72%', top: '90.0%',  width: '10.92%', height: '2.59%'},
                Witnessbysign1:    { left: '79.72%', top: '92.5%', width: '10.92%', height: '4.5%', sign: true },
            },
            8: {
                PhotoNo1a: { left: '74.64%', top: '19.00%', width: '18.58%', height: '1.71%' },
                location1: { left: '64.00%', top: '21.00%', width: '24.58%', height: '1.71%' },
                Description1: { left: '64.00%', top: '23.00%',  width: '30.00%', height: '13.30%', multiline: true },
                PhotoNo1b: { left: '74.64%', top: '37.00%', width: '18.58%', height: '1.71%' },
                Action1: { left: '64.00%', top: '39.00%',  width: '30.00%', height: '5.30%', multiline: true },
                Reportedby1: { left: '64.00%', top: '45.50%', width: '24.58%', height: '1.71%' },
                Completiondate1: { left: '64.00%', top: '48.00%',  width: '30.00%', height: '5.30%', multiline: true },
                PhotoNo2a: { left: '74.64%', top: '56.00%', width: '18.58%', height: '1.71%' },
                location2: { left: '64.00%', top: '58.00%', width: '24.58%', height: '1.71%' },
                Description2: { left: '64.00%', top: '60.00%',  width: '30.00%', height: '13.30%', multiline: true },
                PhotoNo2b: { left: '74.64%', top: '74.00%', width: '18.58%', height: '1.71%' },
                Action2: { left: '64.00%', top: '76.00%',  width: '30.00%', height: '5.30%', multiline: true },
                Reportedby2: { left: '64.00%', top: '82.50%', width: '24.58%', height: '1.71%' },
                Completiondate2: { left: '64.00%', top: '85.00%',  width: '30.00%', height: '5.30%', multiline: true },
                Photo1: { left: '11.00%', top: '18.50%', width: '38.00%', height: '18.00%', image: true },
                Photo2: { left: '11.00%', top: '36.50%', width: '38.00%', height: '16.00%', image: true },
                Photo3: { left: '11.00%', top: '55.70%', width: '38.00%', height: '18.00%', image: true },
                Photo4: { left: '11.00%', top: '74.00%', width: '38.00%', height: '16.00%', image: true },
            }
        },
        ratingColumns: {
            A:     { left: '67.67%', width: '5.00%' },
            B:     { left: '73.95%', width: '5.00%' },
            C:     { left: '80.03%', width: '5.00%' },
            'N/A': { left: '86.91%', width: '5.00%' }
        },
        sections: [
            { letter: 'A',   page: 1, startY: '26.95%', rowHeight: '2.18%', cellHeight: '2.40%', itemCount: 13 },
            { letter: 'B',   page: 1, startY: '58.40%', rowHeight: '2.18%', cellHeight: '2.18%', itemCount: 9 },
            { letter: 'C.i1to3', page: 1, startY: '81.80%', rowHeight: '2.18%', cellHeight: '2.12%', itemCount: 3 },
            { letter: 'C.i4', page: 1, startY: '89.92%', rowHeight: '2.18%', cellHeight: '2.12%', itemCount: 1 },
            { letter: 'C.i5', page: 1, startY: '93.00%', rowHeight: '2.18%', cellHeight: '2.12%', itemCount: 1 },
            { letter: 'C.i6', page: 2, startY: '14.50%', rowHeight: '2.18%', cellHeight: '2.12%', itemCount: 1 },
            { letter: 'C.ii1to4', page: 2, startY: '18.40%', rowHeight: '2.18%', cellHeight: '2.18%', itemCount: 4 },
            { letter: 'C.ii5to6', page: 2, startY: '28.40%', rowHeight: '4.18%', cellHeight: '2.18%', itemCount: 2 },
            { letter: 'C.ii7to8', page: 2, startY: '36.20%', rowHeight: '2.18%', cellHeight: '2.18%', itemCount: 2 },
            { letter: 'C.ii9', page: 2, startY: '41.20%', rowHeight: '2.18%', cellHeight: '2.18%', itemCount: 1 },
            { letter: 'C.iii1to2', page: 2, startY: '48.20%', rowHeight: '2.18%', cellHeight: '2.18%', itemCount: 2 },
            { letter: 'C.iii3', page: 2, startY: '54.20%', rowHeight: '2.18%', cellHeight: '2.18%', itemCount: 1 },
            { letter: 'C.iii4to7', page: 2, startY: '57.20%', rowHeight: '2.18%', cellHeight: '2.18%', itemCount: 4 },
            { letter: 'C.iii8', page: 2, startY: '67.20%', rowHeight: '2.18%', cellHeight: '2.18%', itemCount: 1 },
            { letter: 'C.iii9to10', page: 2, startY: '71.20%', rowHeight: '2.18%', cellHeight: '2.18%', itemCount: 2 },
            { letter: 'D.1to4', page: 2, startY: '79.20%', rowHeight: '2.18%', cellHeight: '2.18%', itemCount: 4 },
            { letter: 'D.5', page: 2, startY: '89.20%', rowHeight: '2.18%', cellHeight: '2.18%', itemCount: 1 },
            { letter: 'D.6to7', page: 2, startY: '92.20%', rowHeight: '2.18%', cellHeight: '2.18%', itemCount: 2 },
            { letter: 'D.8to12', page: 3, startY: '14.10%', rowHeight: '2.18%', cellHeight: '2.18%', itemCount: 5 },
            { letter: 'D.13to14', page: 3, startY: '26.20%', rowHeight: '5.18%', cellHeight: '2.18%', itemCount: 2 },
            { letter: 'E.1to4', page: 3, startY: '40.80%', rowHeight: '4.18%', cellHeight: '2.18%', itemCount: 4 },
            { letter: 'E.5to6', page: 3, startY: '56.80%', rowHeight: '2.18%', cellHeight: '2.18%', itemCount: 2 },
            { letter: 'E.7', page: 3, startY: '62.80%', rowHeight: '2.18%', cellHeight: '2.18%', itemCount: 1 },
            { letter: 'E.8to10', page: 3, startY: '66.00%', rowHeight: '2.18%', cellHeight: '2.18%', itemCount: 3 },
            { letter: 'E.11', page: 3, startY: '74.00%', rowHeight: '2.18%', cellHeight: '2.18%', itemCount: 1 },
            { letter: 'E.12', page: 3, startY: '76.80%', rowHeight: '2.18%', cellHeight: '2.18%', itemCount: 1 },
            { letter: 'E.13to16', page: 3, startY: '80.80%', rowHeight: '4.18%', cellHeight: '2.18%', itemCount: 4 },
            { letter: 'F.1to2', page: 4, startY: '18.00%', rowHeight: '2.18%', cellHeight: '2.18%', itemCount: 2 },
            { letter: 'F.3', page: 4, startY: '24.00%', rowHeight: '2.18%', cellHeight: '2.18%', itemCount: 1 },
            { letter: 'F.4to8', page: 4, startY: '27.00%', rowHeight: '2.18%', cellHeight: '2.18%', itemCount: 5 },
            { letter: 'F.9', page: 4, startY: '39.00%', rowHeight: '2.18%', cellHeight: '2.18%', itemCount: 1 },
            { letter: 'G.1', page: 4, startY: '49.00%', rowHeight: '2.18%', cellHeight: '15.18%', itemCount: 1 },
            { letter: 'G.2to3', page: 4, startY: '69.00%', rowHeight: '2.18%', cellHeight: '2.18%', itemCount: 2 },
            { letter: 'G.4', page: 4, startY: '75.00%', rowHeight: '2.18%', cellHeight: '2.18%', itemCount: 1 },
            { letter: 'G.5', page: 4, startY: '80.00%', rowHeight: '2.18%', cellHeight: '2.18%', itemCount: 1 },
            { letter: 'G.6', page: 4, startY: '84.00%', rowHeight: '2.18%', cellHeight: '2.18%', itemCount: 1 },
            { letter: 'H.1to4', page: 5, startY: '17.20%', rowHeight: '2.18%', cellHeight: '2.18%', itemCount: 4 },
            { letter: 'H.5', page: 5, startY: '27.00%', rowHeight: '2.18%', cellHeight: '2.18%', itemCount: 1 },
            { letter: 'H.6', page: 5, startY: '30.50%', rowHeight: '2.18%', cellHeight: '2.18%', itemCount: 1 },
            { letter: 'I.1to10', page: 5, startY: '36.20%', rowHeight: '2.18%', cellHeight: '2.18%', itemCount: 10 },
            { letter: 'J.1to5', page: 5, startY: '61.20%', rowHeight: '2.18%', cellHeight: '2.18%', itemCount: 6 },
            { letter: 'J.7', page: 5, startY: '75.80%', rowHeight: '2.18%', cellHeight: '2.18%', itemCount: 1 },
            { letter: 'J.8', page: 5, startY: '78.80%', rowHeight: '2.18%', cellHeight: '2.18%', itemCount: 1 },
            { letter: 'J.9', page: 5, startY: '81.80%', rowHeight: '2.18%', cellHeight: '2.18%', itemCount: 1 },
            { letter: 'J.10', page: 5, startY: '85.50%', rowHeight: '2.18%', cellHeight: '2.18%', itemCount: 1 },
            { letter: 'K.1to3', page: 6, startY: '18.50%', rowHeight: '4.18%', cellHeight: '2.18%', itemCount: 3 },
            { letter: 'K.4', page: 6, startY: '30.50%', rowHeight: '2.18%', cellHeight: '2.18%', itemCount: 1 },
            { letter: 'L.1to2', page: 6, startY: '36.50%', rowHeight: '4.18%', cellHeight: '2.18%', itemCount: 2 },
            { letter: 'L.3to6', page: 6, startY: '44.50%', rowHeight: '2.18%', cellHeight: '2.18%', itemCount: 4 },
            { letter: 'M.1', page: 6, startY: '57.50%', rowHeight: '2.18%', cellHeight: '2.18%', itemCount: 1 },
            { letter: 'M.2to5', page: 6, startY: '60.70%', rowHeight: '2.18%', cellHeight: '2.18%', itemCount: 4 },
            { letter: 'N.1to6', page: 6, startY: '73.70%', rowHeight: '2.18%', cellHeight: '2.18%', itemCount: 6 },
            { letter: 'O.1to5', page: 7, startY: '17.70%', rowHeight: '2.18%', cellHeight: '2.18%', itemCount: 5 },
            { letter: 'P.1to7', page: 7, startY: '31.70%', rowHeight: '2.18%', cellHeight: '2.18%', itemCount: 7 },
        ]
    };

    var safetyFormData = {
        type: '',
        header: {},
        ratings: {}
    };

    let currentColor = '#3498db';
    let currentSize = 3;
    let currentOpacity = 100;
    let currentStrokePoints = [];
    let isDraggingText = false;
    let dragStartX = 0, dragStartY = 0;
    let draggedAnnotationId = null;

    let isDraggingAnnotation = false;
    let dragAnnoStartX = 0, dragAnnoStartY = 0;
    let draggedAnnoId = null;
    let dragAnnoOffsetX = 0, dragAnnoOffsetY = 0;

    // ---------- 輔助函數 ----------
    function syncGlobalDate() {
        const storedDate = sessionStorage.getItem('globalDate');
        const dateSpan = document.querySelector('.date-display span');
        if (storedDate && dateSpan) dateSpan.textContent = storedDate;
        else if (dateSpan) dateSpan.textContent = new Date().toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' });
    }

    function getStatusText(status) {
        const map = {
            'draft': 'Draft',
            'submitted-wsg': 'Submitted to WSG',
            'submitted-ig': 'Submitted to IG',
            'closed': 'Closed',
            'reopen': 'Reopen',
            'cancelled': 'Cancelled'
        };
        return map[status] || status || 'Draft';
    }

    // ========================================
    // ★ 讀取文件（參考 editdsdsitediary.js）
    //   - 從多個 sessionStorage key 讀
    //   - 用 localStorage 裡的完整記錄補全缺失字段
    //     （避免列表頁只寫摘要到 editDocument 導致編輯內容讀不回來）
    // ========================================
    function loadDocumentData() {
        var sources = ['editDocument', 'currentInspectionRecord', 'currentRecord'];
        var doc = null;
        for (var i = 0; i < sources.length; i++) {
            var raw = sessionStorage.getItem(sources[i]);
            if (!raw) continue;
            try {
                var d = JSON.parse(raw);
                if (d && typeof d === 'object' && d.id) { doc = d; break; }
            } catch (e) {}
        }
        if (!doc) return null;

        // ★ 從 localStorage 找同一份記錄，補全 sessionStorage 缺少的字段
        try {
            var stored = localStorage.getItem('inspectionData');
            if (stored) {
                var list = JSON.parse(stored);
                if (Array.isArray(list)) {
                    var full = null;
                    for (var k = 0; k < list.length; k++) {
                        if (String(list[k].id) === String(doc.id)) { full = list[k]; break; }
                    }
                    if (full) {
                        // ★ 合併策略：doc（sessionStorage 當前編輯態）優先；
                        //   如果 doc 某個字段是 undefined / null，才用 full（localStorage）的值補上
                        var merged = Object.assign({}, full);
                        Object.keys(doc).forEach(function (key) {
                            if (doc[key] !== undefined && doc[key] !== null) {
                                merged[key] = doc[key];
                            }
                        });
                        // ★ 針對關鍵字段，若 doc 沒有具體值則用 full
                        if (!merged.safetyFormData && full.safetyFormData) {
                            merged.safetyFormData = full.safetyFormData;
                        }
                        doc = merged;
                    }
                }
            }
        } catch (e) { console.warn('[SafetyEdit] merge from localStorage failed', e); }

        currentDoc = doc;
        doc.submittedBy = doc.inspector || doc.submittedBy || 'N/A';

        var idEl = document.getElementById('docId');
        if (idEl) idEl.textContent = doc.id || 'N/A';
        var siteEl = document.getElementById('docSite');
        if (siteEl) siteEl.textContent = doc.site || 'N/A';
        var dateEl = document.getElementById('docDate');
        if (dateEl) dateEl.textContent = doc.date || 'N/A';
        var insEl = document.getElementById('docInspector');
        if (insEl) insEl.textContent = doc.inspector || 'N/A';
        var titleEl = document.getElementById('docTitle');
        if (titleEl) titleEl.textContent = doc.site ? `${doc.site} - Safety Inspection` : 'Edit Safety Inspection';

        const statusDisplay = document.getElementById('docStatusDisplay');
        if (statusDisplay) {
            statusDisplay.textContent = getStatusText(doc.status);
        }

        if (submitBtn) {
            if (doc.status && doc.status !== 'draft') {
                submitBtn.disabled = true;
                submitBtn.title = 'Document already submitted';
            } else {
                submitBtn.disabled = false;
                submitBtn.title = 'Submit this document to WSG';
            }
        }

        annotations = doc.annotations || [];
        annotations.forEach((a, idx) => a._id = a._id || Date.now() + idx);
        if (doc.safetyFormData) {
            safetyFormData = doc.safetyFormData;
        }
        return doc;
    }

    function showError(msg) {
        if (container) container.innerHTML = `<div style="text-align:center;padding:40px;color:#e74c3c;"><i class="fas fa-exclamation-circle"></i> ${msg}</div>`;
    }

    // ---------- PDF 加載 ----------
    function loadPDF(url) {
        let pdfSource;
        if (url.startsWith('data:application/pdf;base64,')) {
            const base64Data = url.split(',')[1];
            try {
                const binaryString = atob(base64Data);
                const bytes = new Uint8Array(binaryString.length);
                for (let i=0; i<binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
                pdfSource = { data: bytes };
            } catch(e) { showError('Invalid PDF data.'); return; }
        } else {
            pdfSource = { url: url };
        }
        pdfjsLib.getDocument(pdfSource).promise.then(pdf => {
            pdfDoc = pdf;
            totalPages = pdf.numPages;
            if (totalPagesSpan) totalPagesSpan.textContent = pdf.numPages;
            currentPage = 1;
            renderPage(currentPage);
        }).catch(err => {
            console.error('PDF加載失敗:', err);
            showError('Failed to load PDF. You can still add annotations.');
            canvas.style.display = 'none';
            drawCanvas.style.display = 'block';
            drawCanvas.width = 800 * renderScale;
            drawCanvas.height = 1000 * renderScale;
            drawCanvas.style.width = '800px';
            drawCanvas.style.height = '1000px';
            drawCtx.fillStyle = '#ffffff';
            drawCtx.fillRect(0, 0, drawCanvas.width, drawCanvas.height);
            drawCtx.fillStyle = '#666';
            drawCtx.font = `${20 * renderScale}px Arial`;
            drawCtx.fillText('PDF could not be loaded. You can still annotate.', 30 * renderScale, 100 * renderScale);
        });
    }

    // ========================================
    // ★ 表單欄位 CSS
    // ========================================
    function ensureSafetyFormStyle() {
        if (document.getElementById('safety-pdf-form-style')) return;
        var style = document.createElement('style');
        style.id = 'safety-pdf-form-style';
        style.textContent =
            '.safety-form-overlay .pdf-checkbox {' +
                'position: absolute;border:1px solid rgba(52,152,219,0.4);' +
                'background: rgba(255,255,255,0.2);cursor:pointer;box-sizing:border-box;' +
                'display:flex;align-items:center;justify-content:center;user-select:none;' +
                'line-height:1;border-radius:2px;pointer-events:auto;' +
                'transition: background 0.12s ease, box-shadow 0.12s ease;' +
            '}' +
            '.safety-form-overlay .pdf-checkbox:hover {background:rgba(52,152,219,0.15);box-shadow:inset 0 0 0 1px #3498db;}' +
            '.safety-form-overlay .pdf-checkbox.checked {background:rgba(46,204,113,0.15);border-color:#27ae60;}' +
            '.safety-form-overlay .pdf-checkbox .tick {display:none;color:#0a1a5c;font-weight:bold;font-size:0.9em;}' +
            '.safety-form-overlay .pdf-checkbox.checked .tick {display:inline-block;}' +
            '.safety-form-overlay .pdf-field {' +
                'position: absolute;border:1px solid rgba(52,152,219,0.4);' +
                'background: rgba(255,255,255,0.6);outline:none;' +
                'font-family: Arial;color:#0a1a5c;font-size:11px;' +
                'padding:1px 4px;box-sizing:border-box;pointer-events:auto;border-radius:2px;' +
            '}' +
            '.safety-form-overlay .pdf-field:focus {' +
                'background: rgba(255,251,234,0.98);box-shadow: inset 0 0 0 2px #3498db;' +
            '}' +
            '.safety-form-overlay textarea.pdf-field {' +
                'resize: none;white-space: pre-wrap;word-wrap: break-word;' +
                'overflow: auto;line-height: 1.3;padding: 2px 4px;' +
            '}' +
            '.safety-form-overlay .pdf-sign {' +
                'position: absolute;border:1px dashed rgba(52,152,219,0.6);' +
                'background: rgba(255,255,255,0.4);box-sizing:border-box;' +
                'pointer-events: auto;border-radius: 2px;overflow: hidden;' +
                'cursor: pointer;display: flex;align-items: center;justify-content: center;' +
                'transition: background 0.12s ease, box-shadow 0.12s ease;' +
            '}' +
            '.safety-form-overlay .pdf-sign:hover {' +
                'background: rgba(52,152,219,0.12);box-shadow: inset 0 0 0 1px #3498db;' +
            '}' +
            '.safety-form-overlay .pdf-sign .signature-img {' +
                'max-width: 100%;max-height: 100%;width: 100%;height: 100%;' +
                'object-fit: contain;pointer-events: none;display: block;transform: scale(1.15);' +
            '}' +
            '.safety-form-overlay .pdf-sign .signature-placeholder {' +
                'font-size: 9px;color: #cbd5e1;font-style: italic;user-select: none;pointer-events: none;' +
            '}' +
            '.safety-form-overlay .pdf-sign .pdf-sign-clear {' +
                'position: absolute;top: 1px;right: 1px;width: 14px;height: 14px;' +
                'border: none;border-radius: 50%;background: #e74c3c;color: #fff;' +
                'font-size: 11px;line-height: 12px;text-align: center;padding: 0;' +
                'cursor: pointer;display: none;z-index: 2;' +
            '}' +
            '.safety-form-overlay .pdf-sign:hover .pdf-sign-clear {display: block;}' +
            '.safety-form-overlay .pdf-image {' +
                'position: absolute;border:1px dashed rgba(52,152,219,0.6);' +
                'background: rgba(255,255,255,0.4);box-sizing:border-box;' +
                'pointer-events: auto;border-radius: 2px;overflow: hidden;' +
                'cursor: pointer;display: flex;align-items: center;justify-content: center;' +
                'transition: background 0.12s ease, box-shadow 0.12s ease;' +
            '}' +
            '.safety-form-overlay .pdf-image:hover {' +
                'background: rgba(52,152,219,0.12);box-shadow: inset 0 0 0 1px #3498db;' +
            '}' +
            '.safety-form-overlay .pdf-image .image-preview {' +
                'max-width: 100%;max-height: 100%;width: 100%;height: 100%;' +
                'object-fit: contain;pointer-events: none;display: block;' +
            '}' +
            '.safety-form-overlay .pdf-image .image-placeholder {' +
                'font-size: 9px;color: #94a3b8;font-style: italic;user-select: none;' +
                'pointer-events: none;display: flex;flex-direction: column;align-items: center;' +
                'gap: 2px;line-height: 1.1;' +
            '}' +
            '.safety-form-overlay .pdf-image .image-placeholder i {font-size: 14px;color: #60a5fa;}' +
            '.safety-form-overlay .pdf-image .pdf-image-clear {' +
                'position: absolute;top: 1px;right: 1px;width: 16px;height: 16px;' +
                'border: none;border-radius: 50%;background: #e74c3c;color: #fff;' +
                'font-size: 12px;line-height: 14px;text-align: center;padding: 0;' +
                'cursor: pointer;display: none;z-index: 2;' +
            '}' +
            '.safety-form-overlay .pdf-image:hover .pdf-image-clear {display: block;}' +
            '.safety-form-overlay .pdf-image .pdf-image-loading {' +
                'position: absolute;inset: 0;display: flex;align-items: center;' +
                'justify-content: center;background: rgba(255,255,255,0.8);' +
                'font-size: 10px;color: #3498db;z-index: 3;' +
            '}';
        document.head.appendChild(style);
    }

    // ========================================
    // ★ 建立格子
    // ========================================
    function buildSafetyCheckbox(field) {
        var box = document.createElement('div');
        box.className = 'pdf-checkbox';
        box.dataset.fieldId = field.id;
        if (field.group) box.dataset.group = field.group;
        if (field.label) box.title = field.label;
        box.style.left = field.left;
        box.style.top = field.top;
        box.style.width = field.width || '2%';
        box.style.height = field.height || '1.8%';

        var tick = document.createElement('span');
        tick.className = 'tick';
        tick.textContent = '✓';
        box.appendChild(tick);

        if (typeof field.isChecked === 'function' && field.isChecked()) {
            box.classList.add('checked');
        }

        box.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();

            var willCheck = !box.classList.contains('checked');

            if (field.group) {
                var overlay = box.closest('.safety-form-overlay');
                if (overlay) {
                    var groupEls = overlay.querySelectorAll('.pdf-checkbox[data-group="' + field.group + '"]');
                    for (var i = 0; i < groupEls.length; i++) {
                        groupEls[i].classList.remove('checked');
                    }
                }
            }

            if (willCheck) box.classList.add('checked');
            else box.classList.remove('checked');

            if (typeof field.onChange === 'function') field.onChange(willCheck);
            autoSaveSafetyData();
        });

        return box;
    }

    function buildSafetyTextField(field) {
        var el;
        if (field.type === 'textarea') {
            el = document.createElement('textarea');
            el.rows = field.rows || 3;
        } else {
            el = document.createElement('input');
            el.type = field.type || 'text';
        }

        el.className = 'pdf-field';
        el.dataset.fieldId = field.id;

        if (field.label) {
            el.placeholder = field.label;
            el.title = field.label;
        }
        el.style.left = field.left;
        el.style.top = field.top;
        el.style.width = field.width || '8%';
        el.style.height = field.height || '1.8%';
        el.value = field.value || '';
        el.autocomplete = 'off';

        el.addEventListener('input', function () {
            if (typeof field.onInput === 'function') field.onInput(el.value);
            autoSaveSafetyData();
        });
        el.addEventListener('change', function () {
            if (typeof field.onInput === 'function') field.onInput(el.value);
            autoSaveSafetyData();
        });

        return el;
    }

    // ========================================
    // ★ 簽名欄位
    // ========================================
    function buildSafetySignature(field) {
        var wrap = document.createElement('div');
        wrap.className = 'pdf-sign';
        wrap.dataset.fieldId = field.id;
        wrap.title = '點擊以簽名';
        wrap.style.left = field.left;
        wrap.style.top = field.top;
        wrap.style.width = field.width || '10%';
        wrap.style.height = field.height || '3%';

        wrap._safetyField = field;

        renderSignatureCellContent(wrap, field.value, field);

        wrap.addEventListener('mousedown', function (e) { e.stopPropagation(); });
        wrap.addEventListener('touchstart', function (e) { e.stopPropagation(); }, { passive: true });

        wrap.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            openSafetySignModal(field, wrap);
        });

        return wrap;
    }

    function renderSignatureCellContent(cell, value, field) {
        cell.innerHTML = '';

        if (value && typeof value === 'string' && value.indexOf('data:image') === 0) {
            var img = document.createElement('img');
            img.src = value;
            img.className = 'signature-img';
            img.alt = '簽名';
            cell.appendChild(img);
        } else {
            var span = document.createElement('span');
            span.className = 'signature-placeholder';
            span.textContent = '點擊簽名';
            cell.appendChild(span);
        }

        var clearBtn = document.createElement('button');
        clearBtn.type = 'button';
        clearBtn.className = 'pdf-sign-clear';
        clearBtn.innerHTML = '×';
        clearBtn.title = '清除簽名';
        clearBtn.addEventListener('mousedown', function (e) {
            e.preventDefault();
            e.stopPropagation();
        });
        clearBtn.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            if (field) {
                field.value = '';
                if (typeof field.onInput === 'function') field.onInput('');
                autoSaveSafetyData();
            }
            renderSignatureCellContent(cell, '', field);
        });
        cell.appendChild(clearBtn);
    }

    // ========================================
    // ★ 圖片欄位
    // ========================================
    function buildSafetyImageField(field) {
        var wrap = document.createElement('div');
        wrap.className = 'pdf-image';
        wrap.dataset.fieldId = field.id;
        wrap.title = '點擊上傳圖片（自動壓縮至 < 1MB）';
        wrap.style.left = field.left;
        wrap.style.top = field.top;
        wrap.style.width = field.width || '10%';
        wrap.style.height = field.height || '5%';

        wrap._safetyField = field;

        renderImageCellContent(wrap, field.value, field);

        wrap.addEventListener('mousedown', function (e) { e.stopPropagation(); });
        wrap.addEventListener('touchstart', function (e) { e.stopPropagation(); }, { passive: true });

        wrap.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();

            var input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.style.display = 'none';

            input.addEventListener('change', function () {
                if (!input.files || !input.files[0]) return;
                var file = input.files[0];

                var loading = document.createElement('div');
                loading.className = 'pdf-image-loading';
                loading.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 壓縮中...';
                wrap.appendChild(loading);

                compressImage(file, 1600, 0.85, function (dataUrl) {
                    if (loading.parentNode) loading.parentNode.removeChild(loading);
                    if (!dataUrl) {
                        alert('❌ 圖片處理失敗，請重新選擇。');
                        return;
                    }
                    field.value = dataUrl;
                    if (typeof field.onInput === 'function') field.onInput(dataUrl);
                    renderImageCellContent(wrap, dataUrl, field);
                    autoSaveSafetyData();
                });
            });

            document.body.appendChild(input);
            input.click();
            setTimeout(function () {
                if (input.parentNode) input.parentNode.removeChild(input);
            }, 60000);
        });

        return wrap;
    }

    function renderImageCellContent(cell, value, field) {
        cell.innerHTML = '';

        if (value && typeof value === 'string' && value.indexOf('data:image') === 0) {
            var img = document.createElement('img');
            img.src = value;
            img.className = 'image-preview';
            img.alt = '照片';
            cell.appendChild(img);
        } else {
            var span = document.createElement('span');
            span.className = 'image-placeholder';
            span.innerHTML = '<i class="fas fa-image"></i><span>點擊上傳</span>';
            cell.appendChild(span);
        }

        var clearBtn = document.createElement('button');
        clearBtn.type = 'button';
        clearBtn.className = 'pdf-image-clear';
        clearBtn.innerHTML = '×';
        clearBtn.title = '清除圖片';
        clearBtn.addEventListener('mousedown', function (e) {
            e.preventDefault();
            e.stopPropagation();
        });
        clearBtn.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            if (field) {
                field.value = '';
                if (typeof field.onInput === 'function') field.onInput('');
                autoSaveSafetyData();
            }
            renderImageCellContent(cell, '', field);
        });
        cell.appendChild(clearBtn);
    }

    // ========================================
    // ★ 圖片壓縮：目標 < 1MB
    // ========================================
    function compressImage(file, maxDim, startQuality, callback) {
        if (file.size <= 1024 * 1024) {
            var readerSmall = new FileReader();
            readerSmall.onload = function (e) { callback(e.target.result); };
            readerSmall.onerror = function () { callback(''); };
            readerSmall.readAsDataURL(file);
            return;
        }

        var reader = new FileReader();
        reader.onload = function (e) {
            var img = new Image();
            img.onload = function () {
                var w = img.width, h = img.height;

                if (w > maxDim || h > maxDim) {
                    var ratio = Math.min(maxDim / w, maxDim / h);
                    w = Math.round(w * ratio);
                    h = Math.round(h * ratio);
                }

                var cv = document.createElement('canvas');
                cv.width = w;
                cv.height = h;
                var c2d = cv.getContext('2d');

                c2d.fillStyle = '#ffffff';
                c2d.fillRect(0, 0, w, h);
                c2d.drawImage(img, 0, 0, w, h);

                var maxLen = Math.round(1024 * 1024 * 1.37);
                var q = startQuality;
                var output = cv.toDataURL('image/jpeg', q);

                var iter = 0;
                while (output.length > maxLen && iter < 6 && q > 0.25) {
                    q -= 0.15;
                    output = cv.toDataURL('image/jpeg', q);
                    iter++;
                }

                callback(output);
            };
            img.onerror = function () {
                console.error('[SafetyEdit] Failed to load image');
                callback('');
            };
            img.src = e.target.result;
        };
        reader.onerror = function () {
            console.error('[SafetyEdit] Failed to read file');
            callback('');
        };
        reader.readAsDataURL(file);
    }

    function buildSafetyField(field) {
        if (field.type === 'check') return buildSafetyCheckbox(field);
        if (field.type === 'sign')  return buildSafetySignature(field);
        if (field.type === 'image') return buildSafetyImageField(field);
        return buildSafetyTextField(field);
    }

    // ========================================
    // ★ 手寫簽名 Modal
    // ========================================
    var _safetySigModal = null;
    var _safetySigCanvas = null;
    var _safetySigCtx = null;
    var _safetySigDrawing = false;
    var _safetySigLastX = 0, _safetySigLastY = 0;
    var _safetySigTargetField = null;
    var _safetySigTargetCell = null;

    function initSafetySignModal() {
        _safetySigModal = document.getElementById('safety-signature-modal-overlay');
        _safetySigCanvas = document.getElementById('safety-signature-canvas');
        if (!_safetySigModal || !_safetySigCanvas) {
            console.warn('[SafetyEdit] Signature modal not found');
            return;
        }

        _safetySigCtx = _safetySigCanvas.getContext('2d');
        _safetySigCtx.lineWidth = 7;
        _safetySigCtx.lineCap = 'round';
        _safetySigCtx.lineJoin = 'round';
        _safetySigCtx.strokeStyle = '#0a1a5c';

        _safetySigCanvas.addEventListener('mousedown', safetySigStart);
        _safetySigCanvas.addEventListener('mousemove', safetySigMove);
        _safetySigCanvas.addEventListener('mouseup', safetySigEnd);
        _safetySigCanvas.addEventListener('mouseleave', safetySigEnd);
        _safetySigCanvas.addEventListener('touchstart', safetySigStart, { passive: false });
        _safetySigCanvas.addEventListener('touchmove', safetySigMove, { passive: false });
        _safetySigCanvas.addEventListener('touchend', safetySigEnd, { passive: false });

        var closeBtn = document.getElementById('safety-signature-close-btn');
        var cancelBtn = document.getElementById('safety-signature-cancel-btn');
        var clearBtn = document.getElementById('safety-signature-clear-btn');
        var saveBtn = document.getElementById('safety-signature-save-btn');

        if (closeBtn) closeBtn.addEventListener('click', closeSafetySignModal);
        if (cancelBtn) cancelBtn.addEventListener('click', closeSafetySignModal);
        if (clearBtn) clearBtn.addEventListener('click', clearSafetySignCanvas);
        if (saveBtn) saveBtn.addEventListener('click', saveSafetySign);

        _safetySigModal.addEventListener('click', function (e) {
            if (e.target === _safetySigModal) closeSafetySignModal();
        });
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && _safetySigModal.classList.contains('visible')) {
                closeSafetySignModal();
            }
        });
    }

    function safetySigGetCoords(e) {
        var rect = _safetySigCanvas.getBoundingClientRect();
        var cx, cy;
        if (e.touches && e.touches.length > 0) {
            cx = e.touches[0].clientX; cy = e.touches[0].clientY;
        } else {
            cx = e.clientX; cy = e.clientY;
        }
        return {
            x: (cx - rect.left) * (_safetySigCanvas.width / rect.width),
            y: (cy - rect.top) * (_safetySigCanvas.height / rect.height)
        };
    }

    function safetySigStart(e) {
        e.preventDefault();
        _safetySigDrawing = true;
        var p = safetySigGetCoords(e);
        _safetySigLastX = p.x; _safetySigLastY = p.y;
        _safetySigCtx.beginPath();
        _safetySigCtx.moveTo(p.x, p.y);
        _safetySigCtx.lineTo(p.x + 0.1, p.y + 0.1);
        _safetySigCtx.stroke();
    }

    function safetySigMove(e) {
        if (!_safetySigDrawing) return;
        e.preventDefault();
        var p = safetySigGetCoords(e);
        _safetySigCtx.beginPath();
        _safetySigCtx.moveTo(_safetySigLastX, _safetySigLastY);
        _safetySigCtx.lineTo(p.x, p.y);
        _safetySigCtx.stroke();
        _safetySigLastX = p.x; _safetySigLastY = p.y;
    }

    function safetySigEnd(e) {
        if (!_safetySigDrawing) return;
        if (e && e.preventDefault) e.preventDefault();
        _safetySigDrawing = false;
    }

    function clearSafetySignCanvas() {
        if (!_safetySigCtx) return;
        _safetySigCtx.clearRect(0, 0, _safetySigCanvas.width, _safetySigCanvas.height);
    }

    function loadExistingSafetySign(base64) {
        if (!base64 || typeof base64 !== 'string' || base64.indexOf('data:image') !== 0) {
            clearSafetySignCanvas();
            return;
        }
        var img = new Image();
        img.onload = function () {
            _safetySigCtx.clearRect(0, 0, _safetySigCanvas.width, _safetySigCanvas.height);
            var ratio = Math.min(_safetySigCanvas.width / img.width, _safetySigCanvas.height / img.height);
            var w = img.width * ratio, h = img.height * ratio;
            var x = (_safetySigCanvas.width - w) / 2;
            var y = (_safetySigCanvas.height - h) / 2;
            _safetySigCtx.drawImage(img, x, y, w, h);
        };
        img.onerror = function () { clearSafetySignCanvas(); };
        img.src = base64;
    }

    function openSafetySignModal(field, cell) {
        if (!_safetySigModal) return;
        _safetySigTargetField = field;
        _safetySigTargetCell = cell;
        clearSafetySignCanvas();
        if (field.value) loadExistingSafetySign(field.value);
        _safetySigModal.classList.add('visible');
        document.body.style.overflow = 'hidden';
    }

    function closeSafetySignModal() {
        if (!_safetySigModal) return;
        _safetySigModal.classList.remove('visible');
        document.body.style.overflow = '';
        clearSafetySignCanvas();
        _safetySigTargetField = null;
        _safetySigTargetCell = null;
    }

    function isSafetySigCanvasBlank() {
        if (!_safetySigCanvas || !_safetySigCtx) return true;
        try {
            var data = _safetySigCtx.getImageData(0, 0, _safetySigCanvas.width, _safetySigCanvas.height).data;
            for (var i = 0; i < data.length; i += 4) {
                if (data[i + 3] !== 0) return false;
            }
        } catch (e) { return false; }
        return true;
    }

    function saveSafetySign() {
        if (!_safetySigTargetField || !_safetySigTargetCell) {
            closeSafetySignModal();
            return;
        }

        var base64 = '';
        if (!isSafetySigCanvasBlank()) {
            base64 = _safetySigCanvas.toDataURL('image/png');
        }

        var field = _safetySigTargetField;
        var cell = _safetySigTargetCell;

        field.value = base64;
        if (typeof field.onInput === 'function') field.onInput(base64);

        renderSignatureCellContent(cell, base64, field);
        autoSaveSafetyData();
        closeSafetySignModal();
    }

    // ========================================
    // ★ 讓 overlay 精確對齊 canvas
    // ========================================
    function alignSafetyOverlay() {
        if (!container || !canvas) return;
        var overlay = container.querySelector('.safety-form-overlay');
        if (!overlay) return;

        if (canvas.offsetWidth === 0 && canvas.offsetHeight === 0) return;

        var canvasRect = canvas.getBoundingClientRect();
        var containerRect = container.getBoundingClientRect();

        var left = canvasRect.left - containerRect.left + container.scrollLeft;
        var top  = canvasRect.top  - containerRect.top  + container.scrollTop;

        overlay.style.left   = left + 'px';
        overlay.style.top    = top + 'px';
        overlay.style.width  = canvasRect.width  + 'px';
        overlay.style.height = canvasRect.height + 'px';
    }

    // ========================================
    // ★ 注入固定表單
    // ========================================
    function injectSafetyFormFields(pageNum) {
        if (!container) return;

        var oldOverlay = container.querySelector('.safety-form-overlay');
        if (oldOverlay) oldOverlay.remove();

        ensureSafetyFormStyle();

        if (getComputedStyle(container).position === 'static') {
            container.style.position = 'relative';
        }

        var overlay = document.createElement('div');
        overlay.className = 'safety-form-overlay pdf-form-overlay';
        overlay.style.cssText =
            'position:absolute;left:0;top:0;width:0;height:0;' +
            'z-index:50;pointer-events:none;';

        var fields = [];

        // 1-1. Type checkbox
        var pageTypeCbs = SAFETY_LAYOUT.typeCheckboxes[pageNum] || [];
        pageTypeCbs.forEach(function (cb) {
            fields.push({
                type: 'check',
                id: 'type_' + cb.key,
                label: cb.key,
                group: 'safety-type',
                left: cb.left,
                top: cb.top,
                width: cb.width,
                height: cb.height,
                isChecked: function () { return safetyFormData.type === cb.key; },
                onChange: function (checked) {
                    safetyFormData.type = checked ? cb.key : '';
                }
            });
        });

        // 1-2. Header
        var pageHeaderDefaults = SAFETY_LAYOUT.header['*'] || {};
        var pageHeaderOverride = SAFETY_LAYOUT.header[pageNum] || {};
        var pageHeader = Object.assign({}, pageHeaderDefaults, pageHeaderOverride);
        var headerLabels = {
            location: 'Location',
            taskOrder: 'Task Order No.',
            date: 'Date',
            time: 'Time'
        };
        Object.keys(pageHeader).forEach(function (key) {
            var f = pageHeader[key];
            var fieldType;
            if (f.sign === true || f.type === 'sign') {
                fieldType = 'sign';
            } else if (f.image === true || f.type === 'image') {
                fieldType = 'image';
            } else if (f.multiline) {
                fieldType = 'textarea';
            } else if (key === 'date') {
                fieldType = 'date';
            } else if (key === 'time') {
                fieldType = 'time';
            } else {
                fieldType = 'text';
            }
            fields.push({
                type: fieldType,
                id: 'header_' + key,
                label: headerLabels[key] || key,
                left: f.left,
                top: f.top,
                width: f.width,
                height: f.height,
                value: safetyFormData.header[key] || '',
                onInput: function (val) {
                    safetyFormData.header[key] = val;
                }
            });
        });

        // 1-3. 評分格
        var ratingKeys = ['A', 'B', 'C', 'N/A'];
        SAFETY_LAYOUT.sections.forEach(function (section) {
            if (section.page !== pageNum) return;

            var startY = parseFloat(section.startY);
            var rowH = parseFloat(section.rowHeight);
            var cellH = parseFloat(section.cellHeight);

            for (var i = 0; i < section.itemCount; i++) {
                (function (idx) {
                    var top = (startY + idx * rowH) + '%';
                    var rowKey = section.letter + '_' + idx;

                    ratingKeys.forEach(function (rating) {
                        var col = SAFETY_LAYOUT.ratingColumns[rating];
                        fields.push({
                            type: 'check',
                            id: 'rating_' + rowKey + '_' + rating,
                            label: rowKey + ' - ' + rating,
                            group: 'safety-rating-' + rowKey,
                            left: col.left,
                            top: top,
                            width: col.width,
                            height: cellH + '%',
                            isChecked: function () { return safetyFormData.ratings[rowKey] === rating; },
                            onChange: function (checked) {
                                if (checked) {
                                    safetyFormData.ratings[rowKey] = rating;
                                } else {
                                    delete safetyFormData.ratings[rowKey];
                                }
                            }
                        });
                    });
                })(i);
            }
        });

        fields.forEach(function (f) {
            overlay.appendChild(buildSafetyField(f));
        });

        container.appendChild(overlay);

        alignSafetyOverlay();
        requestAnimationFrame(alignSafetyOverlay);

        console.log('[SafetyEdit] ✓ 注入表單 (Page ' + pageNum + ', ' + fields.length + ' 欄位)');
    }

    // ========================================
    // ★ 自動儲存表單資料（僅 sessionStorage）
    // ========================================
    function autoSaveSafetyData() {
        if (!currentDoc) return;
        currentDoc.safetyFormData = safetyFormData;
        try {
            sessionStorage.setItem('editDocument', JSON.stringify(currentDoc));
            sessionStorage.setItem('currentInspectionRecord', JSON.stringify(currentDoc));
            sessionStorage.setItem('currentRecord', JSON.stringify(currentDoc));
        } catch (e) {}
    }

    // ---------- 核心渲染函數 ----------
    function renderPage(pageNum) {
        if (!pdfDoc) {
            drawCanvas.width = 800 * renderScale;
            drawCanvas.height = 1000 * renderScale;
            drawCanvas.style.width = '800px';
            drawCanvas.style.height = '1000px';
            drawCtx.fillStyle = '#ffffff';
            drawCtx.fillRect(0, 0, drawCanvas.width, drawCanvas.height);
            updateZoomLevel();
            renderTextAnnotations();
            return;
        }
        pdfDoc.getPage(pageNum).then(page => {
            const viewport = page.getViewport({ scale: scale * renderScale });
            const cssViewport = page.getViewport({ scale: scale });

            canvas.width = viewport.width;
            canvas.height = viewport.height;
            drawCanvas.width = viewport.width;
            drawCanvas.height = viewport.height;

            canvas.style.width = cssViewport.width + 'px';
            canvas.style.height = cssViewport.height + 'px';
            drawCanvas.style.width = cssViewport.width + 'px';
            drawCanvas.style.height = cssViewport.height + 'px';

            const renderContext = { canvasContext: ctx, viewport: viewport };
            page.render(renderContext).promise.then(() => {
                alignDrawCanvas();
                currentPageSpan.textContent = pageNum;
                currentPage = pageNum;

                redrawAnnotations();
                renderTextAnnotations();
                if (container) {
                    container.scrollTop = 0;
                    container.scrollLeft = 0;
                }
                requestAnimationFrame(() => {
                    alignDrawCanvas();
                    updateTextPositions();
                });

                updateZoomLevel();

                var pageInput = document.getElementById('page-input');
                if (pageInput) pageInput.value = pageNum;

                injectSafetyFormFields(pageNum);
            });
        });
    }

    function alignDrawCanvas() {
        if (!canvas || !drawCanvas) return;
        drawCanvas.style.position = 'absolute';
        drawCanvas.style.left = canvas.offsetLeft + 'px';
        drawCanvas.style.top = canvas.offsetTop + 'px';
    }

    function updateZoomLevel() {
        if (zoomLevelSpan) zoomLevelSpan.textContent = Math.round(scale * 100) + '%';
    }

    function getCanvasOffset() {
        const targetCanvas = (canvas && canvas.offsetWidth > 0) ? canvas : drawCanvas;
        if (!targetCanvas || !container) return { offsetX: 0, offsetY: 0 };
        const canvasRect = targetCanvas.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        return {
            offsetX: canvasRect.left - containerRect.left + container.scrollLeft,
            offsetY: canvasRect.top - containerRect.top + container.scrollTop
        };
    }

    function updateTextPositions() {
        const { offsetX, offsetY } = getCanvasOffset();

        textBoxElements.forEach(el => {
            const id = el.dataset.id;
            const anno = annotations.find(a => a._id == id);
            if (!anno) return;
            el.style.left = (anno.x * scale + offsetX) + 'px';
            el.style.top = (anno.y * scale + offsetY) + 'px';
            el.style.fontSize = (anno.size * 4 * scale) + 'px';
        });
    }

    function renderTextAnnotations() {
        textBoxElements.forEach(el => { if (el.parentNode) el.parentNode.removeChild(el); });
        textBoxElements = [];

        const textAnnos = annotations.filter(a => a.type === 'text' && (a.page === currentPage || (a.page === undefined && currentPage === 1)));

        textAnnos.forEach(anno => {
            const el = createTextBoxElement(anno);
            container.appendChild(el);
            textBoxElements.push(el);
        });
        updateLockButtonState();
        selectedAnnotationId = null;
        highlightSelected();
        updateTextPositions();
    }

    function createTextBoxElement(anno) {
        const el = document.createElement('div');
        el.className = 'text-annotation';
        el.dataset.id = anno._id;

        el.textContent = anno.text || '';
        el.style.color = anno.color;
        el.style.opacity = (anno.opacity || 100) / 100;
        el.contentEditable = false;
        el.draggable = false;

        if (anno.locked) {
            el.classList.add('locked');
        }

        const delBtn = document.createElement('button');
        delBtn.className = 'delete-btn';
        delBtn.innerHTML = '×';
        delBtn.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            if (anno.locked) return;
            deleteAnnotation(anno._id);
        });
        el.appendChild(delBtn);

        el.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            if (anno.locked || currentTool !== 'text') return;
            el.contentEditable = true;
            el.classList.add('editing');
            el.focus();
            const range = document.createRange();
            range.selectNodeContents(el);
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);
        });

        el.addEventListener('blur', () => {
            if (el.contentEditable === 'true') {
                el.contentEditable = false;
                el.classList.remove('editing');
                const newText = el.textContent.trim();
                if (newText) {
                    anno.text = newText;
                    saveHistory();
                } else {
                    deleteAnnotation(anno._id);
                }
                redrawAnnotations();
                renderTextAnnotations();
            }
        });

        el.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                el.blur();
            }
            if (e.key === 'Escape') el.blur();
        });

        el.addEventListener('mousedown', (e) => {
            if (e.target === delBtn) return;
            if (anno.locked || el.contentEditable === 'true') return;
            e.preventDefault();
            isDraggingText = true;
            draggedAnnotationId = anno._id;
            const rect = el.getBoundingClientRect();
            dragStartX = e.clientX - rect.left;
            dragStartY = e.clientY - rect.top;
            selectAnnotation(anno._id);
        });

        el.addEventListener('click', (e) => {
            if (e.target === delBtn) return;
            if (el.contentEditable === 'true') return;
            selectAnnotation(anno._id);
        });

        return el;
    }

    function selectAnnotation(id) {
        selectedAnnotationId = id;
        highlightSelected();
        updateLockButtonState();
    }

    function highlightSelected() {
        document.querySelectorAll('.text-annotation').forEach(el => {
            if (el.dataset.id == selectedAnnotationId) {
                el.style.border = '2px solid #3498db';
                el.style.background = 'rgba(52,152,219,0.1)';
            } else {
                el.style.border = '1px solid transparent';
                el.style.background = 'transparent';
            }
        });
    }

    function toggleLock() {
        if (selectedAnnotationId === null) return;
        const anno = annotations.find(a => a._id === selectedAnnotationId);
        if (!anno) return;
        saveHistory();
        anno.locked = !anno.locked;
        redrawAnnotations();
        renderTextAnnotations();
    }

    function updateLockButtonState() {
        if (!lockBtn) return;
        const anno = selectedAnnotationId ? annotations.find(a => a._id === selectedAnnotationId) : null;
        if (!anno) {
            lockBtn.innerHTML = '<i class="fas fa-lock"></i> Lock';
            lockBtn.classList.remove('unlock');
            lockBtn.disabled = true;
        } else {
            lockBtn.disabled = false;
            if (anno.locked) {
                lockBtn.innerHTML = '<i class="fas fa-unlock"></i> Unlock';
                lockBtn.classList.add('unlock');
            } else {
                lockBtn.innerHTML = '<i class="fas fa-lock"></i> Lock';
                lockBtn.classList.remove('unlock');
            }
        }
    }

    function redrawAnnotations() {
        if (!drawCtx) return;
        drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);

        annotations.forEach(anno => {
            if (anno.type === 'text') return;
            if (anno.page !== undefined && anno.page !== currentPage) return;
            if (anno.page === undefined && currentPage !== 1) return;

            drawAnnotation(anno);
        });
    }

    function drawAnnotation(anno) {
        if (!drawCtx) return;
        const ctx = drawCtx;
        ctx.save();
        ctx.globalAlpha = (anno.opacity || 100) / 100;
        ctx.strokeStyle = anno.color || '#3498db';
        ctx.fillStyle = anno.color || '#3498db';
        ctx.lineWidth = (anno.size || 3) * renderScale;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        const s = scale * renderScale;

        switch (anno.type) {
            case 'highlight':
                if (anno.points && anno.points.length > 0) {
                    ctx.globalAlpha = (anno.opacity || 100) / 100 * 0.4;
                    ctx.beginPath();
                    const first = anno.points[0];
                    ctx.moveTo(first.x * s, first.y * s);
                    for (let i = 1; i < anno.points.length; i++) {
                        ctx.lineTo(anno.points[i].x * s, anno.points[i].y * s);
                    }
                    ctx.stroke();
                }
                break;
            case 'rectangle':
                if (anno.startX !== undefined && anno.endX !== undefined) {
                    const x = Math.min(anno.startX, anno.endX) * s;
                    const y = Math.min(anno.startY, anno.endY) * s;
                    const w = Math.abs(anno.endX - anno.startX) * s;
                    const h = Math.abs(anno.endY - anno.startY) * s;
                    ctx.strokeRect(x, y, w, h);
                }
                break;
            case 'ellipse':
                if (anno.startX !== undefined && anno.endX !== undefined) {
                    const cx = (anno.startX + anno.endX) / 2 * s;
                    const cy = (anno.startY + anno.endY) / 2 * s;
                    const rx = Math.abs(anno.endX - anno.startX) / 2 * s;
                    const ry = Math.abs(anno.endY - anno.startY) / 2 * s;
                    ctx.beginPath();
                    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
                    ctx.stroke();
                }
                break;
            case 'arrow':
                if (anno.startX !== undefined && anno.endX !== undefined) {
                    const fromX = anno.startX * s;
                    const fromY = anno.startY * s;
                    const toX = anno.endX * s;
                    const toY = anno.endY * s;
                    ctx.beginPath();
                    ctx.moveTo(fromX, fromY);
                    ctx.lineTo(toX, toY);
                    ctx.stroke();
                    const angle = Math.atan2(toY - fromY, toX - fromX);
                    const headLen = 10 * s / 2;
                    ctx.beginPath();
                    ctx.moveTo(toX, toY);
                    ctx.lineTo(toX - headLen * Math.cos(angle - 0.5), toY - headLen * Math.sin(angle - 0.5));
                    ctx.moveTo(toX, toY);
                    ctx.lineTo(toX - headLen * Math.cos(angle + 0.5), toY - headLen * Math.sin(angle + 0.5));
                    ctx.stroke();
                }
                break;
            case 'line':
                if (anno.startX !== undefined && anno.endX !== undefined) {
                    ctx.beginPath();
                    ctx.moveTo(anno.startX * s, anno.startY * s);
                    ctx.lineTo(anno.endX * s, anno.endY * s);
                    ctx.stroke();
                }
                break;
        }
        ctx.restore();
    }

    function deleteAnnotation(id) {
        const idx = annotations.findIndex(a => a._id === id);
        if (idx === -1) return;
        if (annotations[idx].locked) return;
        saveHistory();
        annotations.splice(idx, 1);
        if (selectedAnnotationId === id) {
            selectedAnnotationId = null;
            updateLockButtonState();
        }
        redrawAnnotations();
        renderTextAnnotations();
    }

    function undo() {
        if (history.length === 0) return;
        annotations = history.pop();
        selectedAnnotationId = null;
        updateLockButtonState();
        redrawAnnotations();
        renderTextAnnotations();
        if (currentDoc) {
            currentDoc.annotations = annotations;
            sessionStorage.setItem('editDocument', JSON.stringify(currentDoc));
        }
    }

    function saveHistory() {
        history.push(JSON.parse(JSON.stringify(annotations)));
        if (history.length > 20) history.shift();
    }

    function deleteSelected() {
        if (selectedAnnotationId === null) return;
        const anno = annotations.find(a => a._id === selectedAnnotationId);
        if (anno && anno.locked) return;
        deleteAnnotation(selectedAnnotationId);
    }

    function getCanvasCoords(e) {
        let clientX, clientY;
        if (e.touches && e.touches.length > 0) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }

        const targetCanvas = (canvas && canvas.offsetWidth > 0) ? canvas : drawCanvas;
        const rect = targetCanvas.getBoundingClientRect();
        if (!rect.width || !rect.height) return { x: 0, y: 0 };

        const scaleX = targetCanvas.width / rect.width;
        const scaleY = targetCanvas.height / rect.height;
        let x = (clientX - rect.left) * scaleX;
        let y = (clientY - rect.top) * scaleY;

        x = Math.min(Math.max(0, x), targetCanvas.width);
        y = Math.min(Math.max(0, y), targetCanvas.height);
        return { x, y };
    }

    function hitTestAnnotation(anno, px, py) {
        const s = scale * renderScale;
        const tolerance = 10 / scale;
        switch (anno.type) {
            case 'highlight':
                if (anno.points && anno.points.length > 0) {
                    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
                    anno.points.forEach(p => {
                        if (p.x < minX) minX = p.x;
                        if (p.x > maxX) maxX = p.x;
                        if (p.y < minY) minY = p.y;
                        if (p.y > maxY) maxY = p.y;
                    });
                    return px >= minX - tolerance && px <= maxX + tolerance &&
                           py >= minY - tolerance && py <= maxY + tolerance;
                }
                return false;
            case 'rectangle':
            case 'ellipse':
            case 'arrow':
            case 'line':
                if (anno.startX !== undefined && anno.endX !== undefined) {
                    const minX = Math.min(anno.startX, anno.endX) - tolerance;
                    const maxX = Math.max(anno.startX, anno.endX) + tolerance;
                    const minY = Math.min(anno.startY, anno.endY) - tolerance;
                    const maxY = Math.max(anno.startY, anno.endY) + tolerance;
                    return px >= minX && px <= maxX && py >= minY && py <= maxY;
                }
                return false;
            default:
                return false;
        }
    }

    function startDragAnnotation(e) {
        if (currentTool !== 'select') return;
        const pos = getCanvasCoords(e);
        const rawX = pos.x / (renderScale * scale);
        const rawY = pos.y / (renderScale * scale);
        for (let i = annotations.length - 1; i >= 0; i--) {
            const anno = annotations[i];
            if (anno.type === 'text' || anno.locked) continue;
            if (anno.page !== undefined && anno.page !== currentPage) continue;
            if (anno.page === undefined && currentPage !== 1) continue;

            if (hitTestAnnotation(anno, rawX, rawY)) {
                isDraggingAnnotation = true;
                draggedAnnoId = anno._id;
                dragAnnoOffsetX = rawX - (anno.startX !== undefined ? anno.startX : anno.points[0].x);
                dragAnnoOffsetY = rawY - (anno.startY !== undefined ? anno.startY : anno.points[0].y);
                selectAnnotation(anno._id);
                e.preventDefault();
                return;
            }
        }
    }

    function moveDragAnnotation(e) {
        if (!isDraggingAnnotation || draggedAnnoId === null) return;
        const pos = getCanvasCoords(e);
        const rawX = pos.x / (renderScale * scale);
        const rawY = pos.y / (renderScale * scale);
        const anno = annotations.find(a => a._id === draggedAnnoId);
        if (!anno || anno.locked) return;

        const currentOriginX = (anno.startX !== undefined) ? anno.startX : anno.points[0].x;
        const currentOriginY = (anno.startY !== undefined) ? anno.startY : anno.points[0].y;

        const deltaX = rawX - dragAnnoOffsetX - currentOriginX;
        const deltaY = rawY - dragAnnoOffsetY - currentOriginY;

        if (anno.points) {
            anno.points.forEach(p => { p.x += deltaX; p.y += deltaY; });
        } else if (anno.startX !== undefined) {
            anno.startX += deltaX;
            anno.startY += deltaY;
            anno.endX += deltaX;
            anno.endY += deltaY;
        }

        redrawAnnotations();
        e.preventDefault();
    }

    function endDragAnnotation() {
        if (isDraggingAnnotation && draggedAnnoId !== null) {
            saveHistory();
            isDraggingAnnotation = false;
            draggedAnnoId = null;
        }
    }

    document.addEventListener('mousemove', (e) => {
        if (!isDraggingText || draggedAnnotationId === null) return;
        const anno = annotations.find(a => a._id === draggedAnnotationId);
        if (!anno || anno.locked) return;
        const containerRect = container.getBoundingClientRect();
        const { offsetX, offsetY } = getCanvasOffset();

        let visualX = e.clientX - containerRect.left + container.scrollLeft - dragStartX;
        let visualY = e.clientY - containerRect.top + container.scrollTop - dragStartY;

        let newRawX = (visualX - offsetX) / scale;
        let newRawY = (visualY - offsetY) / scale;
        newRawX = Math.max(0, newRawX);
        newRawY = Math.max(0, newRawY);

        const el = textBoxElements.find(el => el.dataset.id == draggedAnnotationId);
        if (el) {
            el.style.left = (newRawX * scale + offsetX) + 'px';
            el.style.top = (newRawY * scale + offsetY) + 'px';
        }
    });

    document.addEventListener('mouseup', () => {
        if (isDraggingText) {
            isDraggingText = false;
            const anno = annotations.find(a => a._id === draggedAnnotationId);
            if (anno && !anno.locked) {
                const el = textBoxElements.find(el => el.dataset.id == draggedAnnotationId);
                if (el) {
                    const { offsetX, offsetY } = getCanvasOffset();
                    const left = parseFloat(el.style.left) - offsetX;
                    const top = parseFloat(el.style.top) - offsetY;
                    anno.x = left / scale;
                    anno.y = top / scale;
                    saveHistory();
                }
            }
            draggedAnnotationId = null;
        }
        if (isDraggingAnnotation) {
            endDragAnnotation();
        }
    });

    if (container) {
        container.addEventListener('scroll', updateTextPositions);
    }

    function startDrawing(e) {
        alignDrawCanvas();

        var tgt = e.target;
        if (tgt && tgt.closest) {
            if (tgt.closest('.pdf-sign') ||
                tgt.closest('.pdf-image') ||
                tgt.closest('.pdf-field') ||
                tgt.closest('.pdf-checkbox')) {
                return;
            }
        }

        if (currentTool === 'select') {
            startDragAnnotation(e);
            return;
        }

        if (currentTool === 'text') {
            e.preventDefault();
            const pos = getCanvasCoords(e);
            const clickedEl = document.elementFromPoint(e.clientX, e.clientY);
            if (clickedEl && clickedEl.closest && clickedEl.closest('.text-annotation')) return;

            const rawX = pos.x / (renderScale * scale);
            const rawY = pos.y / (renderScale * scale);
            const newAnno = {
                type: 'text',
                color: currentColor,
                size: currentSize,
                opacity: currentOpacity,
                x: rawX,
                y: rawY,
                text: 'Click to edit',
                locked: false,
                page: currentPage,
                _id: Date.now() + Math.random()
            };
            saveHistory();
            annotations.push(newAnno);
            redrawAnnotations();
            renderTextAnnotations();
            const newEl = textBoxElements.find(el => el.dataset.id == newAnno._id);
            if (newEl) {
                newEl.contentEditable = true;
                newEl.classList.add('editing');
                newEl.focus();
                const range = document.createRange();
                range.selectNodeContents(newEl);
                const sel = window.getSelection();
                sel.removeAllRanges();
                sel.addRange(range);
            }
            return;
        }

        if (currentTool === 'highlight') {
            e.preventDefault();
            isDrawing = true;
            const pos = getCanvasCoords(e);
            lastX = pos.x; lastY = pos.y;
            startX = pos.x; startY = pos.y;
            currentStrokePoints = [{x: pos.x / (renderScale * scale), y: pos.y / (renderScale * scale)}];

            drawCtx.beginPath();
            drawCtx.moveTo(pos.x, pos.y);
            drawCtx.lineCap = 'round';
            drawCtx.lineJoin = 'round';
            drawCtx.strokeStyle = currentColor;
            drawCtx.lineWidth = currentSize * 3 * renderScale;
            drawCtx.globalAlpha = currentOpacity / 100 * 0.4;
            drawCtx.lineTo(pos.x, pos.y);
            drawCtx.stroke();
            return;
        }

        if (currentTool === 'rectangle' || currentTool === 'ellipse' || currentTool === 'arrow' || currentTool === 'line') {
            e.preventDefault();
            isDrawing = true;
            const pos = getCanvasCoords(e);
            startX = pos.x / (renderScale * scale);
            startY = pos.y / (renderScale * scale);
            lastX = pos.x;
            lastY = pos.y;
            return;
        }
    }

    function draw(e) {
        if (currentTool === 'select' || currentTool === 'text') {
            if (currentTool === 'select' && isDraggingAnnotation) {
                moveDragAnnotation(e);
            }
            return;
        }
        if (!isDrawing) return;
        e.preventDefault();
        const pos = getCanvasCoords(e);

        if (currentTool === 'highlight') {
            drawCtx.lineTo(pos.x, pos.y);
            drawCtx.stroke();
            currentStrokePoints.push({x: pos.x / (renderScale * scale), y: pos.y / (renderScale * scale)});
        }

        if (currentTool === 'rectangle' || currentTool === 'ellipse' || currentTool === 'arrow' || currentTool === 'line') {
            redrawAnnotations();
            drawCtx.save();
            drawCtx.globalAlpha = currentOpacity / 100;
            drawCtx.strokeStyle = currentColor;
            drawCtx.lineWidth = currentSize * renderScale;
            drawCtx.lineCap = 'round';
            drawCtx.lineJoin = 'round';

            const endX = pos.x / (renderScale * scale);
            const endY = pos.y / (renderScale * scale);
            const s = scale * renderScale;

            switch (currentTool) {
                case 'rectangle':
                    const rx = Math.min(startX, endX) * s;
                    const ry = Math.min(startY, endY) * s;
                    const rw = Math.abs(endX - startX) * s;
                    const rh = Math.abs(endY - startY) * s;
                    drawCtx.strokeRect(rx, ry, rw, rh);
                    break;
                case 'ellipse':
                    const cx = (startX + endX) / 2 * s;
                    const cy = (startY + endY) / 2 * s;
                    const rx2 = Math.abs(endX - startX) / 2 * s;
                    const ry2 = Math.abs(endY - startY) / 2 * s;
                    drawCtx.beginPath();
                    drawCtx.ellipse(cx, cy, rx2, ry2, 0, 0, Math.PI * 2);
                    drawCtx.stroke();
                    break;
                case 'arrow':
                    const fromX = startX * s;
                    const fromY = startY * s;
                    const toX = endX * s;
                    const toY = endY * s;
                    drawCtx.beginPath();
                    drawCtx.moveTo(fromX, fromY);
                    drawCtx.lineTo(toX, toY);
                    drawCtx.stroke();
                    const angle = Math.atan2(toY - fromY, toX - fromX);
                    const headLen = 10 * s / 2;
                    drawCtx.beginPath();
                    drawCtx.moveTo(toX, toY);
                    drawCtx.lineTo(toX - headLen * Math.cos(angle - 0.5), toY - headLen * Math.sin(angle - 0.5));
                    drawCtx.moveTo(toX, toY);
                    drawCtx.lineTo(toX - headLen * Math.cos(angle + 0.5), toY - headLen * Math.sin(angle + 0.5));
                    drawCtx.stroke();
                    break;
                case 'line':
                    drawCtx.beginPath();
                    drawCtx.moveTo(startX * s, startY * s);
                    drawCtx.lineTo(endX * s, endY * s);
                    drawCtx.stroke();
                    break;
            }
            drawCtx.restore();
        }

        lastX = pos.x; lastY = pos.y;
    }

    function stopDrawing(e) {
        if (currentTool === 'select' || currentTool === 'text') {
            if (currentTool === 'select' && isDraggingAnnotation) {
                endDragAnnotation();
            }
            return;
        }
        if (!isDrawing) return;
        isDrawing = false;
        const pos = e ? getCanvasCoords(e) : {x: lastX, y: lastY};
        let annotation = null;

        if (currentTool === 'highlight') {
            if (currentStrokePoints.length === 1) {
                currentStrokePoints.push({ ...currentStrokePoints[0] });
            }
            if (currentStrokePoints.length > 1) {
                annotation = {
                    type: 'highlight',
                    color: currentColor,
                    size: currentSize * 3,
                    opacity: currentOpacity,
                    points: currentStrokePoints.slice(),
                    page: currentPage,
                    _id: Date.now() + Math.random()
                };
            }
            drawCtx.beginPath();
            currentStrokePoints = [];
        }

        if (currentTool === 'rectangle' || currentTool === 'ellipse' || currentTool === 'arrow' || currentTool === 'line') {
            const endX = pos.x / (renderScale * scale);
            const endY = pos.y / (renderScale * scale);
            if (Math.abs(endX - startX) > 0.5 || Math.abs(endY - startY) > 0.5) {
                annotation = {
                    type: currentTool,
                    color: currentColor,
                    size: currentSize,
                    opacity: currentOpacity,
                    startX: startX,
                    startY: startY,
                    endX: endX,
                    endY: endY,
                    page: currentPage,
                    _id: Date.now() + Math.random()
                };
            }
        }

        if (annotation) {
            saveHistory();
            annotations.push(annotation);
        }
        redrawAnnotations();
    }

    function setupTools() {
        const toolBtns = document.querySelectorAll('.tool-btn');
        toolBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                toolBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentTool = btn.dataset.tool;
                if (currentTool === 'select') {
                    drawCanvas.style.cursor = 'default';
                } else if (currentTool === 'text') {
                    drawCanvas.style.cursor = 'text';
                } else {
                    drawCanvas.style.cursor = 'crosshair';
                }
                document.querySelectorAll('.text-annotation.editing').forEach(el => el.blur());
            });
        });
        if (colorPicker) colorPicker.addEventListener('input', e => currentColor = e.target.value);
        if (sizeSlider) {
            sizeSlider.addEventListener('input', e => {
                currentSize = parseInt(e.target.value);
                sizeValue.textContent = currentSize + 'px';
            });
        }
        if (opacitySlider) {
            opacitySlider.addEventListener('input', e => {
                currentOpacity = parseInt(e.target.value);
                opacityValue.textContent = currentOpacity + '%';
            });
        }
    }

    // ---------- 導航 ----------
    function setupNavigation() {
        document.getElementById('prev-page')?.addEventListener('click', () => {
            if (pdfDoc && currentPage > 1) renderPage(currentPage - 1);
        });
        document.getElementById('next-page')?.addEventListener('click', () => {
            if (pdfDoc && currentPage < pdfDoc.numPages) renderPage(currentPage + 1);
        });

        var pageInput = document.getElementById('page-input');
        if (pageInput) {
            pageInput.addEventListener('keydown', function (e) {
                if (e.key === 'Enter' || e.keyCode === 13) {
                    e.preventDefault();
                    var target = parseInt(pageInput.value, 10);
                    if (isNaN(target) || target < 1 || target > totalPages) {
                        alert('請輸入 1 到 ' + totalPages + ' 之間的頁碼');
                        pageInput.value = currentPage;
                        return;
                    }
                    renderPage(target);
                    pageInput.blur();
                } else if (e.key === 'Escape' || e.keyCode === 27) {
                    e.preventDefault();
                    pageInput.value = currentPage;
                    pageInput.blur();
                }
            });
            pageInput.addEventListener('blur', function () {
                pageInput.value = currentPage;
            });
            pageInput.addEventListener('focus', function () {
                try { pageInput.select(); } catch (e) {}
            });
        }
    }

    // ========================================
    // ★ 保存（參考 editdsdsitediary.js）
    //   - 同步所有編輯到 currentDoc
    //   - 寫入多個 sessionStorage key
    //   - 更新 localStorage 陣列
    // ========================================
    function saveChanges() {
        if (!currentDoc) { alert('No document to save.'); return; }

        // 保存正在編輯的文本框
        document.querySelectorAll('.text-annotation.editing').forEach(el => {
            const id = el.dataset.id;
            const anno = annotations.find(a => a._id == id);
            if (anno) {
                el.contentEditable = false;
                el.classList.remove('editing');
                const newText = el.textContent.trim();
                if (newText) {
                    anno.text = newText;
                } else {
                    deleteAnnotation(anno._id);
                }
            }
        });

        // ★ 同步所有編輯到 currentDoc
        currentDoc.annotations = annotations;
        currentDoc.safetyFormData = safetyFormData;

        // ★ 同步到多個 sessionStorage key（跟 editdsdsitediary.js 一樣）
        try {
            sessionStorage.setItem('editDocument', JSON.stringify(currentDoc));
            sessionStorage.setItem('currentInspectionRecord', JSON.stringify(currentDoc));
            sessionStorage.setItem('currentRecord', JSON.stringify(currentDoc));
        } catch (e) { /* ignore */ }

        // ★ localStorage 更新（用陣列方式，參考 editdsdsitediary.js）
        var STORAGE_KEY = 'inspectionData';
        var data = [];
        var stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            try {
                var parsed = JSON.parse(stored);
                if (Array.isArray(parsed)) data = parsed;
            } catch (e) { data = []; }
        }
        var idx = -1;
        for (var i = 0; i < data.length; i++) {
            if (String(data[i].id) === String(currentDoc.id)) { idx = i; break; }
        }
        if (idx !== -1) data[idx] = currentDoc;
        else data.push(currentDoc);

        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }
        catch (e) { console.error('[SafetyEdit] Save failed', e); }

        alert('✅ Document saved successfully!');
    }

    function submitDocument() {
        if (!currentDoc) {
            alert('No document to submit.');
            return;
        }
        if (currentDoc.status !== 'draft') {
            alert('This document has already been submitted.');
            return;
        }
        if (!confirm('Submit this document to WSG? The status will change to "Submitted to WSG".')) {
            return;
        }

        document.querySelectorAll('.text-annotation.editing').forEach(el => {
            const id = el.dataset.id;
            const anno = annotations.find(a => a._id == id);
            if (anno) {
                el.contentEditable = false;
                el.classList.remove('editing');
                const newText = el.textContent.trim();
                if (newText) {
                    anno.text = newText;
                } else {
                    deleteAnnotation(anno._id);
                }
            }
        });

        currentDoc.annotations = annotations;
        currentDoc.safetyFormData = safetyFormData;
        currentDoc.status = 'submitted-wsg';

        const statusDisplay = document.getElementById('docStatusDisplay');
        if (statusDisplay) statusDisplay.textContent = 'Submitted to WSG';
        if (submitBtn) submitBtn.disabled = true;

        var STORAGE_KEY = 'inspectionData';
        var data = [];
        var stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            try {
                var parsed = JSON.parse(stored);
                if (Array.isArray(parsed)) data = parsed;
            } catch (e) { data = []; }
        }
        var idx = -1;
        for (var i = 0; i < data.length; i++) {
            if (String(data[i].id) === String(currentDoc.id)) { idx = i; break; }
        }
        if (idx !== -1) data[idx] = currentDoc;
        else data.push(currentDoc);

        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }
        catch (e) { console.error('[SafetyEdit] Save failed', e); }

        try {
            sessionStorage.setItem('editDocument', JSON.stringify(currentDoc));
            sessionStorage.setItem('currentInspectionRecord', JSON.stringify(currentDoc));
            sessionStorage.setItem('currentRecord', JSON.stringify(currentDoc));
        } catch (e) {}

        alert('✅ Document submitted to WSG successfully!');
        window.location.href = 'safetyinspect.html';
    }

    function cancelEditing() {
        if (confirm('Cancel editing? All unsaved changes will be lost.')) {
            window.location.href = 'safetyinspect.html';
        }
    }

    function goBack() {
        window.location.href = 'safetyinspect.html';
    }

    function bindDrawingEvents() {
        if (!container) return;
        container.removeEventListener('mousedown', startDrawing);
        container.removeEventListener('mousemove', draw);
        container.removeEventListener('mouseup', stopDrawing);
        container.removeEventListener('mouseleave', stopDrawing);
        container.addEventListener('mousedown', startDrawing);
        container.addEventListener('mousemove', draw);
        container.addEventListener('mouseup', stopDrawing);
        container.addEventListener('mouseleave', stopDrawing);
        container.removeEventListener('touchstart', startDrawing);
        container.removeEventListener('touchmove', draw);
        container.removeEventListener('touchend', stopDrawing);
        container.addEventListener('touchstart', startDrawing, { passive: false });
        container.addEventListener('touchmove', draw, { passive: false });
        container.addEventListener('touchend', stopDrawing, { passive: false });
    }

    function bindActionButtons() {
        document.getElementById('save-btn')?.addEventListener('click', saveChanges);
        document.getElementById('cancel-btn')?.addEventListener('click', cancelEditing);
        document.getElementById('back-btn')?.addEventListener('click', goBack);

        if (submitBtn) submitBtn.addEventListener('click', submitDocument);

        if (approveBtn) {
            approveBtn.addEventListener('click', function() {
                alert('Approve functionality not yet implemented.');
            });
        }
        if (rejectBtn) {
            rejectBtn.addEventListener('click', function() {
                alert('Reject functionality not yet implemented.');
            });
        }
    }

    window.addEventListener('resize', () => {
        alignDrawCanvas();
        updateTextPositions();
        alignSafetyOverlay();
    });

    if (window.ResizeObserver && container) {
        var _safetyResizeObserver = new ResizeObserver(function() {
            if (window.requestAnimationFrame) {
                requestAnimationFrame(alignSafetyOverlay);
            } else {
                alignSafetyOverlay();
            }
        });
        _safetyResizeObserver.observe(container);
        if (canvas) _safetyResizeObserver.observe(canvas);
    }

    // ---------- 初始化 ----------
    document.addEventListener('DOMContentLoaded', () => {
        syncGlobalDate();
        initSafetySignModal();
        const doc = loadDocumentData();
        if (!doc) { showError('No document data available.'); return; }

        let pdfSrc = doc.pdfData ? 'data:application/pdf;base64,' + doc.pdfData : (doc.pdfUrl || null);

        var safetyB64 = window.SAFETY_INSPECTION_BASE64 || window.SAFETY_TEMPLATE_BASE64;
        if (!pdfSrc && safetyB64) {
            console.log('[SafetyEdit] 使用 SafetyInspection-data.js 內嵌 PDF 模板');
            pdfSrc = 'data:application/pdf;base64,' + safetyB64;
        }
        if (pdfSrc) loadPDF(pdfSrc);
        else {
            canvas.style.display = 'none';
            drawCanvas.style.display = 'block';
            drawCanvas.width = 800 * renderScale;
            drawCanvas.height = 1000 * renderScale;
            drawCanvas.style.width = '800px';
            drawCanvas.style.height = '1000px';
            drawCtx.fillStyle = '#ffffff';
            drawCtx.fillRect(0, 0, drawCanvas.width, drawCanvas.height);
            drawCtx.fillStyle = '#666';
            drawCtx.font = `${20 * renderScale}px Arial`;
            drawCtx.fillText('No PDF attached. You can still add annotations.', 30 * renderScale, 100 * renderScale);
        }
        drawCanvas.style.pointerEvents = 'none';
        setupTools();
        bindDrawingEvents();
        setupNavigation();
        bindActionButtons();
        history = [];
        saveHistory();
        updateLockButtonState();
    });
})();