/**
 * editsafetypdf.js - PDF 編輯頁面 (Safety Inspection)
 * 新增 Submit 功能：將 draft 狀態改為 submitted-wsg
 * ★ 格子建立方式參考 editlabour.js：
 *   - 集中式 CSS (ensureSafetyFormStyle)
 *   - buildSafetyField / buildSafetyCheckbox / buildSafetyTextField 分派
 *   - group 屬性做單選控制 (radio-like)
 *   - 使用 .pdf-checkbox / .pdf-field 統一樣式
 * ★ 修正：側邊欄展開/收起時表單格子會錯位
 *   - 新增 alignSafetyOverlay()，用 getBoundingClientRect 精確對齊 canvas
 *   - window.resize 與 ResizeObserver 都會重新對齊
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
        typeCheckboxes: [
            { key: 'weekly', left: '27.72%', top: '17.00%', width: '1.08%', height: '0.89%' },
            { key: 'daily',  left: '37.14%', top: '17.00%', width: '1.16%', height: '0.89%' },
            { key: 'adhoc',  left: '44.72%', top: '17.00%', width: '1.17%', height: '0.83%' }
        ],
        header: {
            location:  { left: '18.72%', top: '18.15%', width: '31.92%', height: '1.59%' },
            taskOrder: { left: '63.64%', top: '18.15%', width: '29.58%', height: '1.71%' },
            date:      { left: '15.89%', top: '20.00%', width: '34.75%', height: '1.59%' },
            time:      { left: '56.30%', top: '20.00%', width: '37.00%', height: '1.65%' }
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
            { letter: 'C.ii5to6', page: 2, startY: '21.40%', rowHeight: '2.18%', cellHeight: '2.18%', itemCount: 2 },
            
        ]
    };

    // 儲存表單資料
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

    function loadDocumentData() {
        const editDocStr = sessionStorage.getItem('editDocument');
        if (!editDocStr) return null;
        try {
            const doc = JSON.parse(editDocStr);
            currentDoc = doc;
            doc.submittedBy = doc.inspector || doc.submittedBy || 'N/A';
            document.getElementById('docId').textContent = doc.id || 'N/A';
            document.getElementById('docSite').textContent = doc.site || 'N/A';
            document.getElementById('docDate').textContent = doc.date || 'N/A';
            document.getElementById('docInspector').textContent = doc.inspector || 'N/A';
            document.getElementById('docTitle').textContent = doc.site ? `${doc.site} - Safety Inspection` : 'Edit Safety Inspection';

            // 显示状态
            const statusDisplay = document.getElementById('docStatusDisplay');
            if (statusDisplay) {
                statusDisplay.textContent = getStatusText(doc.status);
            }

            // 设置 Submit 按钮状态
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
            // ★ 還原已儲存嘅表單資料
            if (doc.safetyFormData) {
                safetyFormData = doc.safetyFormData;
            }
            return doc;
        } catch(e) { console.error(e); return null; }
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
            totalPagesSpan.textContent = pdf.numPages;
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
    // ★ 表單欄位 CSS（參考 editlabour.js 的 ensureCheckboxStyle）
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
            '}';
        document.head.appendChild(style);
    }

    // ========================================
    // ★ 建立格子（參考 editlabour.js 的 buildField 模式）
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

        // 還原已選
        if (typeof field.isChecked === 'function' && field.isChecked()) {
            box.classList.add('checked');
        }

        box.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();

            var willCheck = !box.classList.contains('checked');

            // group 單選：先清掉同組
            if (field.group) {
                var overlay = box.closest('.safety-form-overlay');
                if (overlay) {
                    var groupEls = overlay.querySelectorAll('.pdf-checkbox[data-group="' + field.group + '"]');
                    for (var i = 0; i < groupEls.length; i++) {
                        groupEls[i].classList.remove('checked');
                    }
                }
            }

            if (willCheck) {
                box.classList.add('checked');
            } else {
                box.classList.remove('checked');
            }

            if (typeof field.onChange === 'function') field.onChange(willCheck);
            autoSaveSafetyData();
        });

        return box;
    }

    function buildSafetyTextField(field) {
        var input = document.createElement('input');
        input.type = field.type || 'text';
        input.className = 'pdf-field';
        input.dataset.fieldId = field.id;
        if (field.label) {
            input.placeholder = field.label;
            input.title = field.label;
        }
        input.style.left = field.left;
        input.style.top = field.top;
        input.style.width = field.width || '8%';
        input.style.height = field.height || '1.8%';
        input.value = field.value || '';
        input.autocomplete = 'off';

        input.addEventListener('input', function () {
            if (typeof field.onInput === 'function') field.onInput(input.value);
            autoSaveSafetyData();
        });
        input.addEventListener('change', function () {
            if (typeof field.onInput === 'function') field.onInput(input.value);
            autoSaveSafetyData();
        });

        return input;
    }

    function buildSafetyField(field) {
        if (field.type === 'check') return buildSafetyCheckbox(field);
        return buildSafetyTextField(field);
    }

    // ========================================
    // ★ 讓 overlay 精確對齊 canvas（不受側邊欄展開/收起影響）
    // ========================================
    function alignSafetyOverlay() {
        if (!container || !canvas) return;
        var overlay = container.querySelector('.safety-form-overlay');
        if (!overlay) return;

        // 若 canvas 被隱藏（無 PDF 時），不用對齊
        if (canvas.offsetWidth === 0 && canvas.offsetHeight === 0) return;

        var canvasRect = canvas.getBoundingClientRect();
        var containerRect = container.getBoundingClientRect();

        // 相對 container 的可滾動內容座標
        var left = canvasRect.left - containerRect.left + container.scrollLeft;
        var top  = canvasRect.top  - containerRect.top  + container.scrollTop;

        overlay.style.left   = left + 'px';
        overlay.style.top    = top + 'px';
        overlay.style.width  = canvasRect.width  + 'px';
        overlay.style.height = canvasRect.height + 'px';
    }

    // ========================================
    // ★ 注入固定表單（PDF 渲染後呼叫）
    // ========================================
    function injectSafetyFormFields(pageNum) {
        if (!container) return;

        // 先移除舊嘅 overlay
        var oldOverlay = container.querySelector('.safety-form-overlay');
        if (oldOverlay) oldOverlay.remove();

        // 注入 CSS（一次性）
        ensureSafetyFormStyle();

        // 確保 container 係 relative 定位
        if (getComputedStyle(container).position === 'static') {
            container.style.position = 'relative';
        }

        var overlay = document.createElement('div');
        overlay.className = 'safety-form-overlay pdf-form-overlay';
        overlay.style.cssText =
            'position:absolute;left:0;top:0;width:0;height:0;' +
            'z-index:50;pointer-events:none;';

        // ---------- 1. 組出 fields 陣列 ----------
        var fields = [];

        // 1-1. Type checkbox（只喺 Page 1）
        if (pageNum === 1) {
            SAFETY_LAYOUT.typeCheckboxes.forEach(function (cb) {
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

            // 1-2. Header 輸入框
            var headerLabels = {
                location: 'Location',
                taskOrder: 'Task Order No.',
                date: 'Date',
                time: 'Time'
            };
            Object.keys(SAFETY_LAYOUT.header).forEach(function (key) {
                var f = SAFETY_LAYOUT.header[key];
                fields.push({
                    type: (key === 'date') ? 'date' : (key === 'time') ? 'time' : 'text',
                    id: 'header_' + key,
                    label: headerLabels[key],
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
        }

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

        // ---------- 2. 逐一 buildField 並加入 overlay ----------
        fields.forEach(function (f) {
            overlay.appendChild(buildSafetyField(f));
        });

        container.appendChild(overlay);

        // ★ 立即對齊 canvas（等 layout 完成後再對齊一次，保險）
        alignSafetyOverlay();
        requestAnimationFrame(alignSafetyOverlay);

        console.log('[SafetyEdit] ✓ 注入表單 (Page ' + pageNum + ', ' + fields.length + ' 欄位)');
    }

    // ========================================
    // ★ 自動儲存表單資料
    // ========================================
    function autoSaveSafetyData() {
        if (!currentDoc) return;
        currentDoc.safetyFormData = safetyFormData;
        try {
            sessionStorage.setItem('editDocument', JSON.stringify(currentDoc));
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

                // ★ 注入固定表單
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

    // ---------- 獲取 pdfCanvas 相對於 container 的偏移 ----------
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

    // ---------- 文本框位置更新 ----------
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

    // ---------- 鎖定/解鎖 ----------
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

    // ---------- 標註繪製 ----------
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

    // ---------- 標註操作 ----------
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

    // ---------- 坐標轉換 ----------
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

    // ---------- 檢測點是否在繪製註釋內 ----------
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

    // ---------- 拖拽繪製註釋 ----------
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

    // ---------- 滑鼠拖拽文本框 ----------
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

    // ---------- 繪製事件 ----------
    function startDrawing(e) {
        alignDrawCanvas();
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

    // ---------- 工具切換 ----------
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
    }

    // ---------- 保存/取消/返回 ----------
    function saveChanges() {
        if (!currentDoc) { alert('No document to save.'); return; }

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

        const STORAGE_KEY = 'inspectionData';
        let inspectionData = [];
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            try { inspectionData = JSON.parse(stored); } catch(e) { console.error('解析數據失敗', e); }
        }

        const index = inspectionData.findIndex(d => String(d.id) === String(currentDoc.id));

        if (index !== -1) {
            inspectionData[index].annotations = annotations;
            if (currentDoc.pdfData) {
                inspectionData[index].pdfData = currentDoc.pdfData;
            }
        } else {
            inspectionData.push(currentDoc);
        }

        localStorage.setItem(STORAGE_KEY, JSON.stringify(inspectionData));
        sessionStorage.setItem('editDocument', JSON.stringify(currentDoc));

        alert('✅ Document saved successfully!');
    }

    // ---------- Submit 功能 ----------
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

        // 先保存所有编辑
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

        // 更新状态
        currentDoc.annotations = annotations;
        currentDoc.safetyFormData = safetyFormData;
        currentDoc.status = 'submitted-wsg';

        // 更新界面
        const statusDisplay = document.getElementById('docStatusDisplay');
        if (statusDisplay) statusDisplay.textContent = 'Submitted to WSG';
        if (submitBtn) submitBtn.disabled = true;

        // 保存到 localStorage
        const STORAGE_KEY = 'inspectionData';
        let inspectionData = [];
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            try { inspectionData = JSON.parse(stored); } catch(e) { console.error('解析數據失敗', e); }
        }

        const index = inspectionData.findIndex(d => String(d.id) === String(currentDoc.id));
        if (index !== -1) {
            inspectionData[index] = currentDoc;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(inspectionData));
        } else {
            alert('Document not found in storage.');
            return;
        }

        sessionStorage.setItem('editDocument', JSON.stringify(currentDoc));
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

    // ---------- 綁定事件 ----------
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
        document.getElementById('undo-btn')?.addEventListener('click', undo);
        document.getElementById('delete-selected-btn')?.addEventListener('click', deleteSelected);
        if (lockBtn) lockBtn.addEventListener('click', toggleLock);
        if (submitBtn) submitBtn.addEventListener('click', submitDocument);

        // 【新增】綁定審批按鈕
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

    // ---------- 監聽尺寸變化（側邊欄展開/收起）----------
    // ★ 修正：側邊欄 toggle 不會重新注入 overlay，需要用 ResizeObserver 重新對齊
    window.addEventListener('resize', () => {
        alignDrawCanvas();
        updateTextPositions();
        alignSafetyOverlay();   // ★ 新增：重新對齊表單 overlay
    });

    if (window.ResizeObserver && container) {
        var _safetyResizeObserver = new ResizeObserver(function() {
            // 用 rAF 合併多次觸發，減少 layout 抖動
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
        const doc = loadDocumentData();
        if (!doc) { showError('No document data available.'); return; }

        // 【新增】如果需要默认隐藏审批按钮，取消下面两行的注释
        // if (approveBtn) approveBtn.style.display = 'none';
        // if (rejectBtn) rejectBtn.style.display = 'none';

        let pdfSrc = doc.pdfData ? 'data:application/pdf;base64,' + doc.pdfData : (doc.pdfUrl || null);

        // ★ 如果冇 pdfData，用 SafetyInspection-data.js 內嵌 PDF
        // ★ 支援新舊變數名稱（SAFETY_INSPECTION_BASE64 / SAFETY_TEMPLATE_BASE64）
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