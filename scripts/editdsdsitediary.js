/**
 * editdsdsitediary.js - DSD Site Diary 專用 PDF 編輯器
 * 
 * 核心特色：
 * 1. 如果用戶沒有上傳 PDF，會自動使用 SiteDiaryDSD.pdf 作為模板
 * 2. 默認生成 10 頁 DSD Site Diary
 * 3. 當用戶滾動到最後一頁並繼續往下拉時，會自動追加 5 頁
 * 4. 保留 editpdf.js 的所有註解工具（Text / Highlight / Rect / Oval / Arrow / Line / Tick）
 * 5. 支援多頁瀏覽、頁面導航、每頁獨立註釋
 * 
 * 資料來源（sessionStorage）：
 * - editDocument / currentDiaryRecord / currentRecord
 * 
 * 存檔目標（localStorage）：
 * - siteDiaryData
 */
(function () {
    'use strict';

    /* ========== 配置 ========== */
    const TEMPLATE_PDF_PATH = 'SiteDiaryDSD.pdf';
    const INITIAL_PAGES = 10;              // 模板模式初始頁數
    const PAGES_TO_APPEND = 5;             // 每次追加頁數
    const RENDER_SCALE = 2.0;              // 內部渲染倍率（避免模糊）
    const SCROLL_THRESHOLD = 300;          // 距離底部多少 px 觸發追加
    const MAX_HISTORY = 20;                // Undo 歷史長度

    /* ========== 狀態 ========== */
    let sourcePdfDoc = null;               // 底層 PDF 物件
    let isTemplateMode = true;             // true = 使用 SiteDiaryDSD.pdf 模板
    let totalVirtualPages = INITIAL_PAGES; // 虛擬頁數
    let currentDoc = null;                 // 當前文件資料
    let annotations = [];                  // 所有註釋
    let pages = [];                        // [{ pageNum, container, pdfCanvas, drawCanvas, drawCtx, textLayer }]
    let activePageNum = 1;                 // 目前活動頁
    let scale = 1.0;

    /* 繪圖工具狀態 */
    let currentTool = 'select';
    let isDrawing = false;
    let lastX = 0, lastY = 0;
    let startX = 0, startY = 0;
    let currentStrokePoints = [];
    let currentColor = '#3498db';
    let currentSize = 3;
    let currentOpacity = 100;

    /* 選取 / 拖曳狀態 */
    let selectedAnnotationId = null;
    let history = [];
    let isDraggingText = false;
    let draggedAnnotationId = null;
    let dragStartX = 0, dragStartY = 0;
    let isDraggingAnnotation = false;
    let draggedAnnoId = null;
    let dragAnnoOffsetX = 0, dragAnnoOffsetY = 0;
    let isAppending = false;

    /* DOM 引用 */
    const container = document.getElementById('pdf-container');
    const pagesWrapper = document.getElementById('pages-wrapper');
    const loadingIndicator = document.getElementById('loading-indicator');
    const colorPicker = document.getElementById('color-picker');
    const sizeSlider = document.getElementById('size-slider');
    const sizeValue = document.getElementById('size-value');
    const opacitySlider = document.getElementById('opacity-slider');
    const opacityValue = document.getElementById('opacity-value');
    const lockBtn = document.getElementById('lock-btn');

    /* ========== 工具函數 ========== */
    function syncGlobalDate() {
        const dateSpan = document.querySelector('.date-display span');
        if (!dateSpan) return;
        const storedDate = sessionStorage.getItem('globalDate');
        dateSpan.textContent = storedDate || new Date().toLocaleDateString('en-US', {
            year: 'numeric', month: 'long', day: 'numeric'
        });
    }

    function showError(msg) {
        if (pagesWrapper) {
            pagesWrapper.innerHTML =
                '<div style="text-align:center;padding:40px;color:#e74c3c;">' +
                '<i class="fas fa-exclamation-circle"></i> ' + msg + '</div>';
        }
    }

    function showLoading() { if (loadingIndicator) loadingIndicator.classList.add('visible'); }
    function hideLoading() { if (loadingIndicator) loadingIndicator.classList.remove('visible'); }

    function updateTotalPagesDisplay() {
        const t = document.getElementById('total-pages');
        const c = document.getElementById('current-page');
        if (t) t.textContent = totalVirtualPages;
        if (c) c.textContent = activePageNum;
    }

    function setActivePage(n) {
        if (activePageNum === n) return;
        activePageNum = n;
        updateTotalPagesDisplay();
        pages.forEach(function (p) {
            if (p.pageNum === activePageNum) p.container.classList.add('active-page');
            else p.container.classList.remove('active-page');
        });
    }

    /* ========== 讀取文件資料 ========== */
    function loadDocumentData() {
        const sources = ['editDocument', 'currentDiaryRecord', 'currentRecord'];
        for (let i = 0; i < sources.length; i++) {
            const raw = sessionStorage.getItem(sources[i]);
            if (raw) {
                try {
                    const d = JSON.parse(raw);
                    if (d) {
                        currentDoc = d;
                        annotations = d.annotations || [];
                        updateDocumentInfo(d);
                        return d;
                    }
                } catch (e) { /* ignore */ }
            }
        }
        return null;
    }

    function updateDocumentInfo(doc) {
        const setText = function (id, val) {
            const el = document.getElementById(id);
            if (el) el.textContent = val || 'N/A';
        };
        setText('docId', doc.id);
        setText('docSite', doc.site);
        setText('docPeriod', doc.period || doc.date);
        setText('docAuthor', doc.submittedBy || doc.author);
        setText('docType', doc.typeText || doc.type || 'Site Diary (DSD)');
        setText('docTitle', doc.id ? ('Site Diary - ' + (doc.site || doc.id)) : 'Site Diary Document');

        const statusEl = document.getElementById('docStatus');
        if (statusEl) {
            const statusMap = {
                'draft': 'Draft',
                'submitted': 'Submitted',
                'submitted-wsg': 'Submitted to WSG',
                'submitted-ig': 'Submitted to IG',
                'endorsed': 'Endorsed',
                'cancelled': 'Cancelled',
                'approved': 'Approved',
                'rejected': 'Rejected',
                'pending': 'Pending Approval'
            };
            const clsMap = {
                'draft': 'status-draft',
                'submitted': 'status-submitted',
                'submitted-wsg': 'status-submitted',
                'submitted-ig': 'status-submitted',
                'endorsed': 'status-endorsed',
                'cancelled': 'status-cancelled',
                'approved': 'status-approved',
                'rejected': 'status-rejected',
                'pending': 'status-pending'
            };
            const key = doc.approvalStatus || doc.status || 'draft';
            statusEl.textContent = statusMap[key] || doc.statusText || 'Draft';
            statusEl.className = 'doc-status';
            if (clsMap[key]) statusEl.classList.add(clsMap[key]);
        }
    }

    /* ========== PDF 初始化 ========== */
    function base64ToUint8(base64Data) {
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
        return bytes;
    }

    async function initializePdf() {
        let pdfSrc;
        if (currentDoc && currentDoc.pdfData) {
            try {
                pdfSrc = { data: base64ToUint8(currentDoc.pdfData) };
                isTemplateMode = false;
            } catch (e) {
                showError('Invalid PDF data.');
                return;
            }
        } else if (currentDoc && currentDoc.pdfUrl) {
            pdfSrc = { url: currentDoc.pdfUrl };
            isTemplateMode = false;
        } else {
            // ★ 沒有上傳 PDF → 用 SiteDiaryDSD.pdf 模板
            pdfSrc = { url: TEMPLATE_PDF_PATH };
            isTemplateMode = true;
        }

        try {
            sourcePdfDoc = await pdfjsLib.getDocument(pdfSrc).promise;
        } catch (err) {
            console.error('[DSD] PDF load error:', err);
            showError('Failed to load PDF. ' + (isTemplateMode ? 'Template: ' + TEMPLATE_PDF_PATH : ''));
            return;
        }

        // 決定總頁數
        if (!isTemplateMode) {
            // 上傳的 PDF：使用原始頁數
            totalVirtualPages = sourcePdfDoc.numPages;
        } else {
            // 模板模式：INITIAL_PAGES 或已存註釋的最後頁（取較大值，並對齊到 5 的倍數）
            let maxAnnotated = 1;
            annotations.forEach(function (a) {
                if ((a.page || 1) > maxAnnotated) maxAnnotated = a.page;
            });
            const savedTotal = currentDoc.totalPages || 0;
            const needed = Math.max(INITIAL_PAGES, maxAnnotated, savedTotal);
            totalVirtualPages = Math.ceil(needed / PAGES_TO_APPEND) * PAGES_TO_APPEND;
            if (totalVirtualPages < INITIAL_PAGES) totalVirtualPages = INITIAL_PAGES;
        }

        updateTotalPagesDisplay();

        // 逐頁渲染
        showLoading();
        for (let i = 1; i <= totalVirtualPages; i++) {
            await appendPage(i);
        }
        hideLoading();

        // 重繪所有註釋
        redrawAllAnnotations();
        renderAllTextAnnotations();

        // 模板模式啟用無限滾動
        if (isTemplateMode) setupInfiniteScroll();

        // 標記活動頁
        setActivePage(1);
    }

    /* ========== 建立單一頁面 ========== */
    async function appendPage(pageNum) {
        const pageDiv = document.createElement('div');
        pageDiv.className = 'pdf-page';
        pageDiv.dataset.page = pageNum;

        const pdfCanvas = document.createElement('canvas');
        pdfCanvas.className = 'pdf-canvas';

        const drawCanvas = document.createElement('canvas');
        drawCanvas.className = 'draw-canvas';

        const textLayer = document.createElement('div');
        textLayer.className = 'text-layer';

        pageDiv.appendChild(pdfCanvas);
        pageDiv.appendChild(drawCanvas);
        pageDiv.appendChild(textLayer);

        // 來源頁：模板模式永遠用第 1 頁；上傳模式用對應頁
        const sourcePageNum = isTemplateMode ? 1 : Math.min(pageNum, sourcePdfDoc.numPages);
        const page = await sourcePdfDoc.getPage(sourcePageNum);

        const viewport = page.getViewport({ scale: scale * RENDER_SCALE });
        const cssViewport = page.getViewport({ scale: scale });

        pdfCanvas.width = viewport.width;
        pdfCanvas.height = viewport.height;
        pdfCanvas.style.width = cssViewport.width + 'px';
        pdfCanvas.style.height = cssViewport.height + 'px';

        drawCanvas.width = viewport.width;
        drawCanvas.height = viewport.height;
        drawCanvas.style.width = cssViewport.width + 'px';
        drawCanvas.style.height = cssViewport.height + 'px';

        textLayer.style.width = cssViewport.width + 'px';
        textLayer.style.height = cssViewport.height + 'px';

        const ctx = pdfCanvas.getContext('2d');
        await page.render({ canvasContext: ctx, viewport: viewport }).promise;

        const drawCtx = drawCanvas.getContext('2d');

        const pageObj = {
            pageNum: pageNum,
            container: pageDiv,
            pdfCanvas: pdfCanvas,
            drawCanvas: drawCanvas,
            drawCtx: drawCtx,
            textLayer: textLayer
        };
        pages.push(pageObj);

        bindPageEvents(pageObj);
        pagesWrapper.appendChild(pageDiv);

        // 如果此頁已有註釋，立即繪製
        redrawAnnotationsForPage(pageObj);

        return pageObj;
    }

    function bindPageEvents(pageObj) {
        const pageDiv = pageObj.container;
        pageDiv.addEventListener('mousedown', function (e) {
            setActivePage(pageObj.pageNum);
            startDrawing(e, pageObj);
        });
        pageDiv.addEventListener('mousemove', function (e) { draw(e, pageObj); });
        pageDiv.addEventListener('mouseup', function (e) { stopDrawing(e, pageObj); });
        pageDiv.addEventListener('mouseleave', function (e) { stopDrawing(e, pageObj); });
        pageDiv.addEventListener('touchstart', function (e) {
            setActivePage(pageObj.pageNum);
            startDrawing(e, pageObj);
        }, { passive: false });
        pageDiv.addEventListener('touchmove', function (e) { draw(e, pageObj); }, { passive: false });
        pageDiv.addEventListener('touchend', function (e) { stopDrawing(e, pageObj); }, { passive: false });
    }

    /* ========== 無限滾動 ========== */
    function setupInfiniteScroll() {
        container.addEventListener('scroll', function () {
            if (!isTemplateMode) return;
            if (isAppending) return;
            const nearBottom =
                container.scrollTop + container.clientHeight >=
                container.scrollHeight - SCROLL_THRESHOLD;
            if (nearBottom) appendMorePages();
        });
    }

    async function appendMorePages() {
        if (isAppending) return;
        isAppending = true;
        showLoading();

        const start = totalVirtualPages + 1;
        const end = totalVirtualPages + PAGES_TO_APPEND;
        for (let i = start; i <= end; i++) {
            await appendPage(i);
        }
        totalVirtualPages = end;
        updateTotalPagesDisplay();
        redrawAllAnnotations();
        renderAllTextAnnotations();

        hideLoading();
        isAppending = false;
    }

    /* ========== 座標取得 ========== */
    function getCanvasCoords(e, pageObj) {
        let cx, cy;
        if (e.touches && e.touches.length > 0) {
            cx = e.touches[0].clientX;
            cy = e.touches[0].clientY;
        } else {
            cx = e.clientX;
            cy = e.clientY;
        }
        const rect = pageObj.pdfCanvas.getBoundingClientRect();
        if (!rect.width || !rect.height) return { x: 0, y: 0 };
        return {
            x: (cx - rect.left) * (pageObj.pdfCanvas.width / rect.width),
            y: (cy - rect.top) * (pageObj.pdfCanvas.height / rect.height)
        };
    }

    /* ========== 開始繪圖 ========== */
    function startDrawing(e, pageObj) {
        if (currentTool === 'select') {
            startDragAnnotation(e, pageObj);
            return;
        }

        // 若點在文字框 / Tick 上，不要新建
        const target = document.elementFromPoint(e.clientX, e.clientY);
        if (target && target.closest &&
            (target.closest('.text-annotation') || target.closest('.tick-mark'))) return;

        /* --- Text --- */
        if (currentTool === 'text') {
            e.preventDefault();
            const pos = getCanvasCoords(e, pageObj);
            const newAnno = {
                type: 'text',
                color: currentColor,
                size: currentSize,
                opacity: currentOpacity,
                x: pos.x / (RENDER_SCALE * scale),
                y: pos.y / (RENDER_SCALE * scale),
                text: 'Double-click to edit',
                locked: false,
                page: pageObj.pageNum,
                _id: Date.now() + Math.random()
            };
            saveHistory();
            annotations.push(newAnno);
            renderAllTextAnnotations();
            const el = pageObj.textLayer.querySelector('[data-id="' + newAnno._id + '"]');
            if (el) {
                el.contentEditable = true;
                el.classList.add('editing');
                el.focus();
                const range = document.createRange();
                range.selectNodeContents(el);
                const sel = window.getSelection();
                sel.removeAllRanges();
                sel.addRange(range);
            }
            return;
        }

        /* --- Tick --- */
        if (currentTool === 'tick') {
            e.preventDefault();
            const pos = getCanvasCoords(e, pageObj);
            const newTick = {
                type: 'tick',
                color: currentColor,
                size: currentSize,
                opacity: currentOpacity,
                x: pos.x / (RENDER_SCALE * scale),
                y: pos.y / (RENDER_SCALE * scale),
                locked: false,
                page: pageObj.pageNum,
                _id: Date.now() + Math.random()
            };
            saveHistory();
            annotations.push(newTick);
            renderAllTextAnnotations();
            return;
        }

        /* --- Highlight（自由筆刷）--- */
        if (currentTool === 'highlight') {
            e.preventDefault();
            isDrawing = true;
            pageObj._drawingPageNum = pageObj.pageNum;
            const pos = getCanvasCoords(e, pageObj);
            lastX = pos.x; lastY = pos.y;
            startX = pos.x; startY = pos.y;
            currentStrokePoints = [{
                x: pos.x / (RENDER_SCALE * scale),
                y: pos.y / (RENDER_SCALE * scale)
            }];
            const c = pageObj.drawCtx;
            c.beginPath();
            c.moveTo(pos.x, pos.y);
            c.lineCap = 'round';
            c.lineJoin = 'round';
            c.strokeStyle = currentColor;
            c.lineWidth = currentSize * 3 * RENDER_SCALE;
            c.globalAlpha = currentOpacity / 100 * 0.4;
            c.lineTo(pos.x, pos.y);
            c.stroke();
            return;
        }

        /* --- 幾何圖形 --- */
        if (currentTool === 'rectangle' || currentTool === 'ellipse' ||
            currentTool === 'arrow' || currentTool === 'line') {
            e.preventDefault();
            isDrawing = true;
            pageObj._drawingPageNum = pageObj.pageNum;
            const pos = getCanvasCoords(e, pageObj);
            startX = pos.x / (RENDER_SCALE * scale);
            startY = pos.y / (RENDER_SCALE * scale);
            lastX = pos.x; lastY = pos.y;
            return;
        }
    }

    /* ========== 繪圖中 ========== */
    function draw(e, pageObj) {
        if (currentTool === 'select') {
            if (isDraggingAnnotation) moveDragAnnotation(e);
            return;
        }
        if (currentTool === 'text' || currentTool === 'tick') return;
        if (!isDrawing) return;
        if (pageObj._drawingPageNum !== pageObj.pageNum) return;

        e.preventDefault();
        const pos = getCanvasCoords(e, pageObj);
        const c = pageObj.drawCtx;

        if (currentTool === 'highlight') {
            c.lineTo(pos.x, pos.y);
            c.stroke();
            currentStrokePoints.push({
                x: pos.x / (RENDER_SCALE * scale),
                y: pos.y / (RENDER_SCALE * scale)
            });
            return;
        }

        // 重繪此頁註釋
        redrawAnnotationsForPage(pageObj);

        c.save();
        c.globalAlpha = currentOpacity / 100;
        c.strokeStyle = currentColor;
        c.lineWidth = currentSize * RENDER_SCALE;
        c.lineCap = 'round';
        c.lineJoin = 'round';

        const ex = pos.x / (RENDER_SCALE * scale);
        const ey = pos.y / (RENDER_SCALE * scale);
        const s = scale * RENDER_SCALE;

        switch (currentTool) {
            case 'rectangle':
                c.strokeRect(
                    Math.min(startX, ex) * s,
                    Math.min(startY, ey) * s,
                    Math.abs(ex - startX) * s,
                    Math.abs(ey - startY) * s
                );
                break;
            case 'ellipse':
                c.beginPath();
                c.ellipse(
                    (startX + ex) / 2 * s,
                    (startY + ey) / 2 * s,
                    Math.abs(ex - startX) / 2 * s,
                    Math.abs(ey - startY) / 2 * s,
                    0, 0, Math.PI * 2
                );
                c.stroke();
                break;
            case 'arrow': {
                const fx = startX * s, fy = startY * s, tx = ex * s, ty = ey * s;
                c.beginPath();
                c.moveTo(fx, fy);
                c.lineTo(tx, ty);
                c.stroke();
                const ang = Math.atan2(ty - fy, tx - fx), hl = 10 * s / 2;
                c.beginPath();
                c.moveTo(tx, ty);
                c.lineTo(tx - hl * Math.cos(ang - 0.5), ty - hl * Math.sin(ang - 0.5));
                c.moveTo(tx, ty);
                c.lineTo(tx - hl * Math.cos(ang + 0.5), ty - hl * Math.sin(ang + 0.5));
                c.stroke();
                break;
            }
            case 'line':
                c.beginPath();
                c.moveTo(startX * s, startY * s);
                c.lineTo(ex * s, ey * s);
                c.stroke();
                break;
        }
        c.restore();
        lastX = pos.x; lastY = pos.y;
    }

    /* ========== 停止繪圖 ========== */
    function stopDrawing(e, pageObj) {
        if (currentTool === 'select') {
            if (isDraggingAnnotation) endDragAnnotation();
            return;
        }
        if (currentTool === 'text' || currentTool === 'tick') return;
        if (!isDrawing) return;
        isDrawing = false;

        const pos = e ? getCanvasCoords(e, pageObj) : { x: lastX, y: lastY };
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
                    page: pageObj.pageNum,
                    _id: Date.now() + Math.random()
                };
            }
            currentStrokePoints = [];
        } else if (['rectangle', 'ellipse', 'arrow', 'line'].indexOf(currentTool) !== -1) {
            const ex = pos.x / (RENDER_SCALE * scale);
            const ey = pos.y / (RENDER_SCALE * scale);
            if (Math.abs(ex - startX) > 0.5 || Math.abs(ey - startY) > 0.5) {
                annotation = {
                    type: currentTool,
                    color: currentColor,
                    size: currentSize,
                    opacity: currentOpacity,
                    startX: startX, startY: startY,
                    endX: ex, endY: ey,
                    page: pageObj.pageNum,
                    _id: Date.now() + Math.random()
                };
            }
        }

        if (annotation) {
            saveHistory();
            annotations.push(annotation);
        }
        redrawAnnotationsForPage(pageObj);
        pageObj._drawingPageNum = null;
    }

    /* ========== 註釋繪製 ========== */
    function redrawAllAnnotations() {
        pages.forEach(function (p) { redrawAnnotationsForPage(p); });
    }

    function redrawAnnotationsForPage(pageObj) {
        if (!pageObj.drawCtx) return;
        pageObj.drawCtx.clearRect(0, 0, pageObj.drawCanvas.width, pageObj.drawCanvas.height);
        annotations.forEach(function (anno) {
            if (anno.type === 'text' || anno.type === 'tick') return;
            if ((anno.page || 1) !== pageObj.pageNum) return;
            drawAnnotationOnPage(anno, pageObj);
        });
    }

    function drawAnnotationOnPage(anno, pageObj) {
        const c = pageObj.drawCtx;
        c.save();
        c.globalAlpha = (anno.opacity || 100) / 100;
        c.strokeStyle = anno.color || '#3498db';
        c.fillStyle = anno.color || '#3498db';
        c.lineWidth = (anno.size || 3) * RENDER_SCALE;
        c.lineCap = 'round';
        c.lineJoin = 'round';
        const s = scale * RENDER_SCALE;

        switch (anno.type) {
            case 'highlight':
                if (anno.points && anno.points.length > 0) {
                    c.globalAlpha *= 0.4;
                    c.beginPath();
                    c.moveTo(anno.points[0].x * s, anno.points[0].y * s);
                    for (let i = 1; i < anno.points.length; i++) {
                        c.lineTo(anno.points[i].x * s, anno.points[i].y * s);
                    }
                    c.stroke();
                }
                break;
            case 'rectangle':
                if (anno.startX !== undefined) {
                    c.strokeRect(
                        Math.min(anno.startX, anno.endX) * s,
                        Math.min(anno.startY, anno.endY) * s,
                        Math.abs(anno.endX - anno.startX) * s,
                        Math.abs(anno.endY - anno.startY) * s
                    );
                }
                break;
            case 'ellipse':
                if (anno.startX !== undefined) {
                    c.beginPath();
                    c.ellipse(
                        (anno.startX + anno.endX) / 2 * s,
                        (anno.startY + anno.endY) / 2 * s,
                        Math.abs(anno.endX - anno.startX) / 2 * s,
                        Math.abs(anno.endY - anno.startY) / 2 * s,
                        0, 0, Math.PI * 2
                    );
                    c.stroke();
                }
                break;
            case 'arrow': {
                if (anno.startX !== undefined) {
                    const fx = anno.startX * s, fy = anno.startY * s;
                    const tx = anno.endX * s, ty = anno.endY * s;
                    c.beginPath();
                    c.moveTo(fx, fy);
                    c.lineTo(tx, ty);
                    c.stroke();
                    const ang = Math.atan2(ty - fy, tx - fx), hl = 10 * s / 2;
                    c.beginPath();
                    c.moveTo(tx, ty);
                    c.lineTo(tx - hl * Math.cos(ang - 0.5), ty - hl * Math.sin(ang - 0.5));
                    c.moveTo(tx, ty);
                    c.lineTo(tx - hl * Math.cos(ang + 0.5), ty - hl * Math.sin(ang + 0.5));
                    c.stroke();
                }
                break;
            }
            case 'line':
                if (anno.startX !== undefined) {
                    c.beginPath();
                    c.moveTo(anno.startX * s, anno.startY * s);
                    c.lineTo(anno.endX * s, anno.endY * s);
                    c.stroke();
                }
                break;
        }
        c.restore();
    }

    /* ========== 文字 / Tick 註釋 ========== */
    function renderAllTextAnnotations() {
        pages.forEach(function (p) { p.textLayer.innerHTML = ''; });
        annotations.forEach(function (anno) {
            if (anno.type !== 'text' && anno.type !== 'tick') return;
            const pageObj = pages.find(function (p) { return p.pageNum === (anno.page || 1); });
            if (!pageObj) return;
            const el = anno.type === 'text' ? createTextBoxElement(anno) : createTickElement(anno);
            if (el) pageObj.textLayer.appendChild(el);
        });
        highlightSelected();
        updateLockButtonState();
    }

    function createTextBoxElement(anno) {
        const el = document.createElement('div');
        el.className = 'text-annotation';
        el.setAttribute('data-id', anno._id);
        el.textContent = anno.text || '';
        el.style.color = anno.color;
        el.style.opacity = (anno.opacity || 100) / 100;
        el.style.left = (anno.x * scale) + 'px';
        el.style.top = (anno.y * scale) + 'px';
        el.style.fontSize = (anno.size * 4 * scale) + 'px';
        el.contentEditable = false;
        if (anno.locked) el.classList.add('locked');

        const delBtn = document.createElement('button');
        delBtn.className = 'delete-btn';
        delBtn.innerHTML = '×';
        delBtn.addEventListener('mousedown', function (e) {
            e.stopPropagation();
            e.preventDefault();
            if (!anno.locked) deleteAnnotation(anno._id);
        });
        el.appendChild(delBtn);

        el.addEventListener('dblclick', function (e) {
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

        el.addEventListener('blur', function () {
            if (el.contentEditable === 'true') {
                el.contentEditable = false;
                el.classList.remove('editing');
                const t = el.textContent.trim();
                if (t) { anno.text = t; saveHistory(); }
                else { deleteAnnotation(anno._id); }
                renderAllTextAnnotations();
            }
        });

        el.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); el.blur(); }
            if (e.key === 'Escape') el.blur();
        });

        el.addEventListener('mousedown', function (e) {
            if (e.target === delBtn) return;
            if (anno.locked) return;
            if (el.contentEditable === 'true' || el.classList.contains('editing')) return;
            e.preventDefault();
            isDraggingText = true;
            draggedAnnotationId = anno._id;
            const r = el.getBoundingClientRect();
            dragStartX = e.clientX - r.left;
            dragStartY = e.clientY - r.top;
            selectAnnotation(anno._id);
        });

        el.addEventListener('click', function (e) {
            if (e.target === delBtn) return;
            if (el.contentEditable === 'true') return;
            selectAnnotation(anno._id);
        });

        return el;
    }

    function createTickElement(anno) {
        const el = document.createElement('div');
        el.className = 'tick-mark';
        el.setAttribute('data-id', anno._id);
        el.textContent = '✓';
        el.style.left = (anno.x * scale - 12) + 'px';
        el.style.top = (anno.y * scale - 12) + 'px';
        el.style.color = anno.color || '#1a73e8';
        el.style.fontSize = ((anno.size || 3) * 6 * scale) + 'px';
        if (anno.locked) el.classList.add('locked');

        const delBtn = document.createElement('button');
        delBtn.className = 'delete-btn';
        delBtn.innerHTML = '×';
        delBtn.addEventListener('mousedown', function (e) {
            e.stopPropagation();
            e.preventDefault();
            if (!anno.locked) deleteAnnotation(anno._id);
        });
        el.appendChild(delBtn);

        el.addEventListener('mousedown', function (e) {
            if (e.target === delBtn) return;
            if (anno.locked) return;
            e.stopPropagation();
            e.preventDefault();
            selectAnnotation(anno._id);
            isDraggingText = true;
            draggedAnnotationId = anno._id;
            const r = el.getBoundingClientRect();
            dragStartX = e.clientX - r.left;
            dragStartY = e.clientY - r.top;
        });

        el.addEventListener('click', function (e) {
            if (e.target === delBtn) return;
            selectAnnotation(anno._id);
        });

        return el;
    }

    /* ========== 選取 / 鎖定 / 刪除 ========== */
    function selectAnnotation(id) {
        selectedAnnotationId = id;
        highlightSelected();
        updateLockButtonState();
    }

    function highlightSelected() {
        document.querySelectorAll('.text-annotation, .tick-mark').forEach(function (el) {
            if (el.getAttribute('data-id') == selectedAnnotationId) {
                el.style.outline = '2px solid #e74c3c';
                el.style.outlineOffset = '2px';
            } else {
                el.style.outline = 'none';
            }
        });
    }

    function updateLockButtonState() {
        if (!lockBtn) return;
        const anno = selectedAnnotationId
            ? annotations.find(function (a) { return a._id === selectedAnnotationId; })
            : null;
        if (!anno) {
            lockBtn.innerHTML = '<i class="fas fa-lock"></i> Lock';
            lockBtn.classList.remove('unlock');
            lockBtn.disabled = true;
        } else {
            lockBtn.disabled = false;
            lockBtn.innerHTML = anno.locked
                ? '<i class="fas fa-unlock"></i> Unlock'
                : '<i class="fas fa-lock"></i> Lock';
            if (anno.locked) lockBtn.classList.add('unlock');
            else lockBtn.classList.remove('unlock');
        }
    }

    function toggleLock() {
        if (selectedAnnotationId === null) return;
        const anno = annotations.find(function (a) { return a._id === selectedAnnotationId; });
        if (!anno) return;
        saveHistory();
        anno.locked = !anno.locked;
        renderAllTextAnnotations();
        redrawAllAnnotations();
    }

    function deleteAnnotation(id) {
        const idx = annotations.findIndex(function (a) { return a._id === id; });
        if (idx === -1 || annotations[idx].locked) return;
        saveHistory();
        annotations.splice(idx, 1);
        if (selectedAnnotationId === id) {
            selectedAnnotationId = null;
            updateLockButtonState();
        }
        redrawAllAnnotations();
        renderAllTextAnnotations();
    }

    function deleteSelected() {
        if (selectedAnnotationId === null) return;
        const anno = annotations.find(function (a) { return a._id === selectedAnnotationId; });
        if (anno && anno.locked) return;
        deleteAnnotation(selectedAnnotationId);
    }

    /* ========== 歷史 (Undo) ========== */
    function saveHistory() {
        history.push(JSON.parse(JSON.stringify(annotations)));
        if (history.length > MAX_HISTORY) history.shift();
    }

    function undo() {
        if (history.length === 0) return;
        annotations = history.pop();
        selectedAnnotationId = null;
        updateLockButtonState();
        redrawAllAnnotations();
        renderAllTextAnnotations();
    }

    /* ========== 拖曳圖形註釋 ========== */
    function hitTestAnnotation(anno, px, py) {
        const tol = 10 / scale;
        if (anno.startX !== undefined) {
            return px >= Math.min(anno.startX, anno.endX) - tol &&
                   px <= Math.max(anno.startX, anno.endX) + tol &&
                   py >= Math.min(anno.startY, anno.endY) - tol &&
                   py <= Math.max(anno.startY, anno.endY) + tol;
        }
        if (anno.points) {
            let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
            anno.points.forEach(function (p) {
                if (p.x < minX) minX = p.x;
                if (p.x > maxX) maxX = p.x;
                if (p.y < minY) minY = p.y;
                if (p.y > maxY) maxY = p.y;
            });
            return px >= minX - tol && px <= maxX + tol &&
                   py >= minY - tol && py <= maxY + tol;
        }
        return false;
    }

    function startDragAnnotation(e, pageObj) {
        if (currentTool !== 'select') return;
        const pos = getCanvasCoords(e, pageObj);
        const rx = pos.x / (RENDER_SCALE * scale);
        const ry = pos.y / (RENDER_SCALE * scale);

        for (let i = annotations.length - 1; i >= 0; i--) {
            const a = annotations[i];
            if (a.type === 'text' || a.type === 'tick' || a.locked) continue;
            if ((a.page || 1) !== pageObj.pageNum) continue;
            if (hitTestAnnotation(a, rx, ry)) {
                isDraggingAnnotation = true;
                draggedAnnoId = a._id;
                dragAnnoOffsetX = rx - (a.startX !== undefined ? a.startX : a.points[0].x);
                dragAnnoOffsetY = ry - (a.startY !== undefined ? a.startY : a.points[0].y);
                selectAnnotation(a._id);
                e.preventDefault();
                return;
            }
        }
    }

    function moveDragAnnotation(e) {
        if (!isDraggingAnnotation || draggedAnnoId === null) return;
        const a = annotations.find(function (x) { return x._id === draggedAnnoId; });
        if (!a || a.locked) return;
        // 用該註釋所屬頁面的座標系統
        const annoPage = pages.find(function (p) { return p.pageNum === (a.page || 1); });
        if (!annoPage) return;

        const pos = getCanvasCoords(e, annoPage);
        const rx = pos.x / (RENDER_SCALE * scale);
        const ry = pos.y / (RENDER_SCALE * scale);
        const ox = (a.startX !== undefined) ? a.startX : a.points[0].x;
        const oy = (a.startY !== undefined) ? a.startY : a.points[0].y;
        const dx = rx - dragAnnoOffsetX - ox;
        const dy = ry - dragAnnoOffsetY - oy;

        if (a.points) {
            a.points.forEach(function (p) { p.x += dx; p.y += dy; });
        } else if (a.startX !== undefined) {
            a.startX += dx; a.startY += dy;
            a.endX += dx; a.endY += dy;
        }
        redrawAnnotationsForPage(annoPage);
        e.preventDefault();
    }

    function endDragAnnotation() {
        if (isDraggingAnnotation && draggedAnnoId !== null) {
            saveHistory();
            isDraggingAnnotation = false;
            draggedAnnoId = null;
        }
    }

    /* ========== 拖曳文字 / Tick ========== */
    document.addEventListener('mousemove', function (e) {
        if (!isDraggingText || draggedAnnotationId === null) return;
        const anno = annotations.find(function (a) { return a._id === draggedAnnotationId; });
        if (!anno || anno.locked) return;
        const pageObj = pages.find(function (p) { return p.pageNum === (anno.page || 1); });
        if (!pageObj) return;
        const pageRect = pageObj.container.getBoundingClientRect();
        const newLeft = e.clientX - pageRect.left - dragStartX;
        const newTop = e.clientY - pageRect.top - dragStartY;
        const el = pageObj.textLayer.querySelector('[data-id="' + draggedAnnotationId + '"]');
        if (el) {
            el.style.left = newLeft + 'px';
            el.style.top = newTop + 'px';
        }
    });

    document.addEventListener('mouseup', function () {
        if (isDraggingText) {
            isDraggingText = false;
            const anno = annotations.find(function (a) { return a._id === draggedAnnotationId; });
            if (anno) {
                const pageObj = pages.find(function (p) { return p.pageNum === (anno.page || 1); });
                if (pageObj) {
                    const el = pageObj.textLayer.querySelector('[data-id="' + draggedAnnotationId + '"]');
                    if (el) {
                        if (anno.type === 'tick') {
                            anno.x = (parseFloat(el.style.left) + 12) / scale;
                            anno.y = (parseFloat(el.style.top) + 12) / scale;
                        } else {
                            anno.x = parseFloat(el.style.left) / scale;
                            anno.y = parseFloat(el.style.top) / scale;
                        }
                        saveHistory();
                    }
                }
            }
            draggedAnnotationId = null;
        }
        if (isDraggingAnnotation) endDragAnnotation();
    });

    /* ========== 工具設定 ========== */
    function setupTools() {
        document.querySelectorAll('.tool-btn').forEach(function (btn) {
            btn.addEventListener('click', function () {
                document.querySelectorAll('.tool-btn').forEach(function (b) { b.classList.remove('active'); });
                btn.classList.add('active');
                currentTool = btn.dataset.tool;
                pages.forEach(function (p) {
                    if (currentTool === 'select') p.pdfCanvas.style.cursor = 'default';
                    else if (currentTool === 'text') p.pdfCanvas.style.cursor = 'text';
                    else p.pdfCanvas.style.cursor = 'crosshair';
                });
                document.querySelectorAll('.text-annotation.editing').forEach(function (el) { el.blur(); });
            });
        });
        if (colorPicker) colorPicker.addEventListener('input', function (e) { currentColor = e.target.value; });
        if (sizeSlider) sizeSlider.addEventListener('input', function (e) {
            currentSize = parseInt(e.target.value, 10);
            if (sizeValue) sizeValue.textContent = currentSize + 'px';
        });
        if (opacitySlider) opacitySlider.addEventListener('input', function (e) {
            currentOpacity = parseInt(e.target.value, 10);
            if (opacityValue) opacityValue.textContent = currentOpacity + '%';
        });
    }

    /* ========== 頁面導航 ========== */
    function setupNavigation() {
        const prevBtn = document.getElementById('prev-page');
        const nextBtn = document.getElementById('next-page');
        if (prevBtn) {
            prevBtn.addEventListener('click', function () {
                if (activePageNum > 1) {
                    setActivePage(activePageNum - 1);
                    const p = pages.find(function (x) { return x.pageNum === activePageNum; });
                    if (p) p.container.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });
        }
        if (nextBtn) {
            nextBtn.addEventListener('click', async function () {
                if (activePageNum < totalVirtualPages) {
                    setActivePage(activePageNum + 1);
                    const p = pages.find(function (x) { return x.pageNum === activePageNum; });
                    if (p) p.container.scrollIntoView({ behavior: 'smooth', block: 'start' });
                } else if (isTemplateMode) {
                    await appendMorePages();
                    setActivePage(activePageNum + 1);
                    const p = pages.find(function (x) { return x.pageNum === activePageNum; });
                    if (p) p.container.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });
        }
    }

    /* ========== 儲存 / 提交 / 審批 ========== */
    function flushEditingTextBoxes() {
        document.querySelectorAll('.text-annotation.editing').forEach(function (el) {
            const id = el.getAttribute('data-id');
            const anno = annotations.find(function (a) { return a._id == id; });
            if (anno) {
                el.contentEditable = false;
                el.classList.remove('editing');
                const t = el.textContent.trim();
                if (t) anno.text = t;
                else deleteAnnotation(anno._id);
            }
        });
    }

    function saveChanges() {
        if (!currentDoc) { alert('No document to save.'); return; }
        flushEditingTextBoxes();

        currentDoc.annotations = annotations;
        currentDoc.totalPages = totalVirtualPages;
        currentDoc.usesTemplate = isTemplateMode;

        sessionStorage.setItem('editDocument', JSON.stringify(currentDoc));
        sessionStorage.setItem('currentDiaryRecord', JSON.stringify(currentDoc));

        // 更新 localStorage
        const stored = localStorage.getItem('siteDiaryData');
        if (stored) {
            try {
                const data = JSON.parse(stored);
                if (Array.isArray(data)) {
                    const idx = data.findIndex(function (d) { return d.id == currentDoc.id; });
                    if (idx !== -1) {
                        data[idx] = currentDoc;
                        localStorage.setItem('siteDiaryData', JSON.stringify(data));
                    }
                }
            } catch (e) { /* ignore */ }
        }

        alert('✅ Changes saved successfully!');
    }

    function submitDocument() {
        if (!currentDoc) { alert('No document to submit.'); return; }
        if (currentDoc.approvalStatus === 'approved') {
            alert('This document has already been approved.');
            return;
        }
        if (!confirm('Submit this document for approval?')) return;

        flushEditingTextBoxes();

        currentDoc.annotations = annotations;
        currentDoc.approvalStatus = 'pending';
        currentDoc.submittedDate = new Date().toISOString();

        const sessionData = JSON.parse(sessionStorage.getItem('dwss_session') || '{}');
        currentDoc.submittedBy = sessionData.userName || currentDoc.submittedBy || 'Unknown';

        updateDocumentInfo(currentDoc);
        saveChanges();
        updateApprovalButtons();
        alert('✅ Document submitted for approval!');
    }

    function approveDocument() {
        if (!currentDoc) return;
        const sessionData = JSON.parse(sessionStorage.getItem('dwss_session') || '{}');
        if (!sessionData.permissions || !sessionData.permissions.canChangeStatus) {
            alert('❌ You do not have permission to approve documents.');
            return;
        }
        if (currentDoc.approvalStatus === 'approved') {
            alert('This document has already been approved.');
            return;
        }
        if (!confirm('Approve this document?')) return;

        currentDoc.approvalStatus = 'approved';
        currentDoc.approvedBy = sessionData.userName || 'Unknown';
        currentDoc.approvedDate = new Date().toISOString();

        updateDocumentInfo(currentDoc);
        saveChanges();
        updateApprovalButtons();
        alert('✅ Document approved!');
    }

    function rejectDocument() {
        if (!currentDoc) return;
        const sessionData = JSON.parse(sessionStorage.getItem('dwss_session') || '{}');
        if (!sessionData.permissions || !sessionData.permissions.canChangeStatus) {
            alert('❌ You do not have permission to reject documents.');
            return;
        }
        if (!confirm('Reject this document?')) return;

        currentDoc.approvalStatus = 'rejected';
        currentDoc.rejectedBy = sessionData.userName || 'Unknown';
        currentDoc.rejectedDate = new Date().toISOString();

        updateDocumentInfo(currentDoc);
        saveChanges();
        updateApprovalButtons();
        alert('❌ Document rejected.');
    }

    function updateApprovalButtons() {
        const approveBtn = document.getElementById('approve-btn');
        const rejectBtn = document.getElementById('reject-btn');
        const submitBtn = document.getElementById('submit-btn');
        const sessionData = JSON.parse(sessionStorage.getItem('dwss_session') || '{}');
        const canApprove = sessionData.permissions && sessionData.permissions.canChangeStatus;

        if (!canApprove) {
            if (approveBtn) approveBtn.style.display = 'none';
            if (rejectBtn) rejectBtn.style.display = 'none';
        } else {
            if (approveBtn) {
                approveBtn.style.display = 'inline-flex';
                if (currentDoc && currentDoc.approvalStatus === 'approved') {
                    approveBtn.disabled = true;
                    approveBtn.style.opacity = '0.5';
                } else {
                    approveBtn.disabled = false;
                    approveBtn.style.opacity = '1';
                }
            }
            if (rejectBtn) {
                rejectBtn.style.display = 'inline-flex';
                if (currentDoc && currentDoc.approvalStatus === 'rejected') {
                    rejectBtn.disabled = true;
                    rejectBtn.style.opacity = '0.5';
                } else {
                    rejectBtn.disabled = false;
                    rejectBtn.style.opacity = '1';
                }
            }
        }

        if (submitBtn) {
            if (currentDoc && currentDoc.approvalStatus === 'approved') {
                submitBtn.disabled = true;
                submitBtn.style.opacity = '0.5';
            } else {
                submitBtn.disabled = false;
                submitBtn.style.opacity = '1';
            }
        }
    }

    function cancelEditing() {
        if (confirm('Cancel editing? All unsaved changes will be lost.')) {
            history.back();
        }
    }

    /* ========== 綁定按鈕 ========== */
    function bindActionButtons() {
        document.getElementById('save-btn')?.addEventListener('click', saveChanges);
        document.getElementById('cancel-btn')?.addEventListener('click', cancelEditing);
        document.getElementById('undo-btn')?.addEventListener('click', undo);
        document.getElementById('delete-selected-btn')?.addEventListener('click', deleteSelected);
        if (lockBtn) lockBtn.addEventListener('click', toggleLock);
        document.getElementById('submit-btn')?.addEventListener('click', submitDocument);
        document.getElementById('approve-btn')?.addEventListener('click', approveDocument);
        document.getElementById('reject-btn')?.addEventListener('click', rejectDocument);
    }

    /* ========== 初始化 ========== */
    document.addEventListener('DOMContentLoaded', async function () {
        syncGlobalDate();

        const doc = loadDocumentData();
        if (!doc) {
            showError('No document data available. Please open this editor from the Site Diary list.');
            return;
        }

        await initializePdf();

        setupTools();
        setupNavigation();
        bindActionButtons();

        history = [];
        saveHistory();
        updateLockButtonState();

        setTimeout(function () { updateApprovalButtons(); }, 500);
    });

})();