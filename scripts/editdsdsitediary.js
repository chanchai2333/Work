/**
 * editdsdsitediary.js - DSD Site Diary 編輯器
 *
 * 特色：
 * 1. 使用 PDF.js 載入真實的 SiteDiaryDSD.pdf
 * 2. 預設 50 頁（共用同一份 PDF 模板）
 * 3. 頁面切換用 Page X of Y 按鈕（不用滾輪）
 * 4. 「+5」按鈕手動加頁
 * 5. 每頁獨立註釋
 */
(function () {
    'use strict';

    /* ========== 配置 ========== */
    var PDF_PATH = 'SiteDiaryDSD.pdf';
    var PDF_RENDER_SCALE = 2.0;     // 內部渲染倍率（高清）
    var DEFAULT_TOTAL_PAGES = 50;   // 預設頁數
    var PAGES_TO_ADD = 5;           // 每次點「+5」增加頁數
    var MAX_HISTORY = 20;
    var STORAGE_KEY = 'siteDiaryData';

    /* PDF.js worker 設定（避免載入失敗） */
    if (window.pdfjsLib) {
        try {
            pdfjsLib.GlobalWorkerOptions.workerSrc =
                'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
        } catch (e) { /* ignore */ }
    }

    /* ========== 狀態 ========== */
    var currentDoc = null;
    var annotations = [];
    var activePageNum = 1;
    var totalVirtualPages = DEFAULT_TOTAL_PAGES;
    var currentPageObj = null;       // { container, drawCanvas, drawCtx, textLayer }
    var templateImageUrl = null;     // PDF 第一頁的 dataURL（共用底圖）
    var pdfWidthCss = 0;             // PDF 顯示寬度（css px）
    var pdfHeightCss = 0;            // PDF 顯示高度（css px）

    var currentTool = 'select';
    var isDrawing = false;
    var lastX = 0, lastY = 0;
    var startX = 0, startY = 0;
    var currentStrokePoints = [];
    var currentColor = '#3498db';
    var currentSize = 3;
    var currentOpacity = 100;

    var selectedAnnotationId = null;
    var history = [];
    var isDraggingText = false;
    var draggedAnnotationId = null;
    var dragStartX = 0, dragStartY = 0;
    var isDraggingAnnotation = false;
    var draggedAnnoId = null;
    var dragAnnoOffsetX = 0, dragAnnoOffsetY = 0;

    /* DOM */
    var container = document.getElementById('pdf-container');
    var pageWrapper = document.getElementById('page-wrapper');
    var loadingIndicator = document.getElementById('loading-indicator');
    var colorPicker = document.getElementById('color-picker');
    var sizeSlider = document.getElementById('size-slider');
    var sizeValue = document.getElementById('size-value');
    var opacitySlider = document.getElementById('opacity-slider');
    var opacityValue = document.getElementById('opacity-value');
    var lockBtn = document.getElementById('lock-btn');

    /* ========== 工具 ========== */
    function uid() {
        return 'a_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    function syncGlobalDate() {
        var dateSpan = document.querySelector('.date-display span');
        if (!dateSpan) return;
        var storedDate = sessionStorage.getItem('globalDate');
        dateSpan.textContent = storedDate || new Date().toLocaleDateString('en-US', {
            year: 'numeric', month: 'long', day: 'numeric'
        });
    }

    function showLoading(msg) {
        if (!loadingIndicator) return;
        loadingIndicator.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ' + (msg || 'Loading...');
        loadingIndicator.classList.add('visible');
    }
    function hideLoading() {
        if (loadingIndicator) loadingIndicator.classList.remove('visible');
    }

    function updatePageInfo() {
        var t = document.getElementById('total-pages');
        var c = document.getElementById('current-page');
        if (t) t.textContent = totalVirtualPages;
        if (c) c.textContent = activePageNum;

        var prevBtn = document.getElementById('prev-page');
        var nextBtn = document.getElementById('next-page');
        if (prevBtn) prevBtn.disabled = (activePageNum <= 1);
        if (nextBtn) nextBtn.disabled = false;
    }

    /* ========== 讀取/建立文件 ========== */
    function loadDocumentData() {
        var sources = ['editDocument', 'currentDiaryRecord', 'currentRecord'];
        for (var i = 0; i < sources.length; i++) {
            var raw = sessionStorage.getItem(sources[i]);
            if (!raw) continue;
            try {
                var d = JSON.parse(raw);
                if (d && typeof d === 'object' && d.id) return d;
            } catch (e) { /* ignore */ }
        }
        return null;
    }

    function buildDefaultDoc() {
        return {
            id: 'DSD-TEMP-' + Date.now(),
            status: 'draft',
            approvalStatus: 'pending',
            site: 'N/A',
            date: new Date().toISOString().slice(0, 10),
            submittedBy: 'Unknown',
            type: 'Contractor Documents',
            annotations: [],
            totalPages: DEFAULT_TOTAL_PAGES,
            usesTemplate: true
        };
    }

    function updateDocumentInfo(doc) {
        function setText(id, val) {
            var el = document.getElementById(id);
            if (el) el.textContent = (val === undefined || val === null || val === '') ? 'N/A' : val;
        }
        setText('docId', doc.id);
        setText('docSite', doc.site);
        setText('docPeriod', doc.period || doc.date);
        setText('docAuthor', doc.submittedBy || doc.author);
        setText('docType', doc.typeText || doc.type || 'Site Diary (DSD)');
        setText('docTitle', doc.id ? ('Site Diary - ' + (doc.site || doc.id)) : 'Site Diary Document');

        var statusEl = document.getElementById('docStatus');
        if (!statusEl) return;

        var statusMap = {
            'draft': 'Draft', 'submitted': 'Submitted',
            'submitted-wsg': 'Submitted to WSG', 'submitted-ig': 'Submitted to IG',
            'endorsed': 'Endorsed', 'cancelled': 'Cancelled',
            'approved': 'Approved', 'rejected': 'Rejected', 'pending': 'Pending Approval'
        };
        var clsMap = {
            'draft': 'status-draft', 'submitted': 'status-submitted',
            'submitted-wsg': 'status-submitted', 'submitted-ig': 'status-submitted',
            'endorsed': 'status-approved', 'cancelled': 'status-cancelled',
            'approved': 'status-approved', 'rejected': 'status-rejected', 'pending': 'status-pending'
        };
        var key = doc.approvalStatus || doc.status || 'draft';
        statusEl.textContent = statusMap[key] || doc.statusText || 'Draft';
        statusEl.className = 'doc-status';
        if (clsMap[key]) statusEl.classList.add(clsMap[key]);
    }

    /* ========== 載入 PDF 模板 ========== */
        
    function base64ToUint8(base64) {
        var binaryString = atob(base64);
        var len = binaryString.length;
        var bytes = new Uint8Array(len);
        for (var i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes;
    }

    function loadPdfFromBase64() {
        return new Promise(function (resolve, reject) {
            var data = window.SITE_DIARY_TEMPLATE_BASE64;
            if (!data || typeof data !== 'string' || data.length < 100) {
                reject(new Error('No base64 template available'));
                return;
            }
            try {
                if (data.indexOf('base64,') !== -1) {
                    data = data.split('base64,')[1];
                }
                var bytes = base64ToUint8(data);
                pdfjsLib.getDocument({ data: bytes }).promise.then(resolve).catch(reject);
            } catch (e) {
                reject(e);
            }
        });
    }

    function loadPdfFromUrl(url) {
        return new Promise(function (resolve, reject) {
            pdfjsLib.getDocument(url).promise.then(resolve).catch(reject);
        });
    }

    function loadPdfTemplate() {
        // 優先：base64 內嵌（無 CORS 問題）
        return loadPdfFromBase64()
            .catch(function (err) {
                console.warn('[DSD] base64 not available, trying URL:', err.message);
                // 備用：直接從 URL 載入（需要 http:// 或 localhost）
                return loadPdfFromUrl(PDF_PATH);
            })
            .then(function (pdf) {
                return pdf.getPage(1).then(function (page) {
                    var viewport = page.getViewport({ scale: PDF_RENDER_SCALE });
                    var canvas = document.createElement('canvas');
                    canvas.width = viewport.width;
                    canvas.height = viewport.height;
                    var ctx = canvas.getContext('2d');
                    return page.render({ canvasContext: ctx, viewport: viewport }).promise.then(function () {
                        templateImageUrl = canvas.toDataURL('image/png');
                        pdfWidthCss = viewport.width / PDF_RENDER_SCALE;
                        pdfHeightCss = viewport.height / PDF_RENDER_SCALE;
                    });
                });
            });
    }

    /* ========== 渲染當前頁 ========== */
    function renderCurrentPage() {
        if (!templateImageUrl) return;

        // 清空
        pageWrapper.innerHTML = '';

        // 建立新頁
        var pageDiv = document.createElement('div');
        pageDiv.className = 'pdf-page active-page';
        pageDiv.dataset.page = activePageNum;
        pageDiv.style.width = pdfWidthCss + 'px';
        pageDiv.style.height = pdfHeightCss + 'px';

        // 背景圖（PDF 模板）
        var img = document.createElement('img');
        img.src = templateImageUrl;
        img.className = 'pdf-bg';
        img.draggable = false;
        img.alt = 'Site Diary Template';
        pageDiv.appendChild(img);

        // 註釋 canvas
        var drawCanvas = document.createElement('canvas');
        drawCanvas.className = 'draw-canvas';
        drawCanvas.width = pdfWidthCss * PDF_RENDER_SCALE;
        drawCanvas.height = pdfHeightCss * PDF_RENDER_SCALE;
        drawCanvas.style.width = pdfWidthCss + 'px';
        drawCanvas.style.height = pdfHeightCss + 'px';
        pageDiv.appendChild(drawCanvas);
        var drawCtx = drawCanvas.getContext('2d');

        // 文字層
        var textLayer = document.createElement('div');
        textLayer.className = 'text-layer';
        textLayer.style.width = pdfWidthCss + 'px';
        textLayer.style.height = pdfHeightCss + 'px';
        pageDiv.appendChild(textLayer);

        pageWrapper.appendChild(pageDiv);

        currentPageObj = {
            pageNum: activePageNum,
            container: pageDiv,
            drawCanvas: drawCanvas,
            drawCtx: drawCtx,
            textLayer: textLayer
        };

        bindPageEvents(currentPageObj);
        redrawAnnotationsForPage(currentPageObj);
        renderTextAnnotationsForPage(currentPageObj);

        // 切換頁面時清空選取
        selectedAnnotationId = null;
        updateLockButtonState();

        updatePageInfo();
    }

    /* ========== 頁面事件 ========== */
    function bindPageEvents(pageObj) {
        var pageDiv = pageObj.container;

        pageDiv.addEventListener('mousedown', function (e) {
            startDrawing(e, pageObj);
        });
        pageDiv.addEventListener('mousemove', function (e) { draw(e, pageObj); });
        pageDiv.addEventListener('mouseup', function (e) { stopDrawing(e, pageObj); });
        pageDiv.addEventListener('mouseleave', function (e) { stopDrawing(e, pageObj); });

        pageDiv.addEventListener('touchstart', function (e) {
            startDrawing(e, pageObj);
        }, { passive: false });
        pageDiv.addEventListener('touchmove', function (e) { draw(e, pageObj); }, { passive: false });
        pageDiv.addEventListener('touchend', function (e) { stopDrawing(e, pageObj); }, { passive: false });
    }

    /* ========== 座標 ========== */
    function getCanvasCoords(e, pageObj) {
        var cx, cy;
        if (e.touches && e.touches.length > 0) {
            cx = e.touches[0].clientX;
            cy = e.touches[0].clientY;
        } else {
            cx = e.clientX;
            cy = e.clientY;
        }
        var rect = pageObj.drawCanvas.getBoundingClientRect();
        if (!rect.width || !rect.height) return { x: 0, y: 0 };
        return {
            x: (cx - rect.left) * (pageObj.drawCanvas.width / rect.width),
            y: (cy - rect.top) * (pageObj.drawCanvas.height / rect.height)
        };
    }

    /* ========== 開始繪圖 ========== */
    function startDrawing(e, pageObj) {
        if (currentTool === 'select') {
            startDragAnnotation(e, pageObj);
            return;
        }

        var target = document.elementFromPoint(e.clientX, e.clientY);
        if (target && target.closest &&
            (target.closest('.text-annotation') || target.closest('.tick-mark'))) return;

        if (currentTool === 'text') {
            e.preventDefault();
            var pos = getCanvasCoords(e, pageObj);
            var newAnno = {
                type: 'text',
                color: currentColor,
                size: currentSize,
                opacity: currentOpacity,
                x: pos.x / PDF_RENDER_SCALE,
                y: pos.y / PDF_RENDER_SCALE,
                text: 'Double-click to edit',
                locked: false,
                page: pageObj.pageNum,
                _id: uid()
            };
            saveHistory();
            annotations.push(newAnno);
            renderTextAnnotationsForPage(pageObj);
            var el = pageObj.textLayer.querySelector('[data-id="' + newAnno._id + '"]');
            if (el) {
                el.contentEditable = true;
                el.classList.add('editing');
                el.focus();
                var range = document.createRange();
                range.selectNodeContents(el);
                var sel = window.getSelection();
                sel.removeAllRanges();
                sel.addRange(range);
            }
            return;
        }

        if (currentTool === 'tick') {
            e.preventDefault();
            var p2 = getCanvasCoords(e, pageObj);
            var newTick = {
                type: 'tick',
                color: currentColor,
                size: currentSize,
                opacity: currentOpacity,
                x: p2.x / PDF_RENDER_SCALE,
                y: p2.y / PDF_RENDER_SCALE,
                locked: false,
                page: pageObj.pageNum,
                _id: uid()
            };
            saveHistory();
            annotations.push(newTick);
            renderTextAnnotationsForPage(pageObj);
            return;
        }

        if (currentTool === 'highlight') {
            e.preventDefault();
            isDrawing = true;
            pageObj._drawingPageNum = pageObj.pageNum;
            var p3 = getCanvasCoords(e, pageObj);
            lastX = p3.x; lastY = p3.y;
            startX = p3.x; startY = p3.y;
            currentStrokePoints = [{
                x: p3.x / PDF_RENDER_SCALE,
                y: p3.y / PDF_RENDER_SCALE
            }];
            var c = pageObj.drawCtx;
            c.beginPath();
            c.moveTo(p3.x, p3.y);
            c.lineCap = 'round';
            c.lineJoin = 'round';
            c.strokeStyle = currentColor;
            c.lineWidth = currentSize * 3 * PDF_RENDER_SCALE;
            c.globalAlpha = currentOpacity / 100 * 0.4;
            c.lineTo(p3.x, p3.y);
            c.stroke();
            return;
        }

        if (currentTool === 'rectangle' || currentTool === 'ellipse' ||
            currentTool === 'arrow' || currentTool === 'line') {
            e.preventDefault();
            isDrawing = true;
            pageObj._drawingPageNum = pageObj.pageNum;
            var p4 = getCanvasCoords(e, pageObj);
            startX = p4.x / PDF_RENDER_SCALE;
            startY = p4.y / PDF_RENDER_SCALE;
            lastX = p4.x;
            lastY = p4.y;
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
        var pos = getCanvasCoords(e, pageObj);
        var c = pageObj.drawCtx;

        if (currentTool === 'highlight') {
            c.lineTo(pos.x, pos.y);
            c.stroke();
            currentStrokePoints.push({
                x: pos.x / PDF_RENDER_SCALE,
                y: pos.y / PDF_RENDER_SCALE
            });
            return;
        }

        redrawAnnotationsForPage(pageObj);
        c.save();
        c.globalAlpha = currentOpacity / 100;
        c.strokeStyle = currentColor;
        c.lineWidth = currentSize * PDF_RENDER_SCALE;
        c.lineCap = 'round';
        c.lineJoin = 'round';

        var ex = pos.x / PDF_RENDER_SCALE;
        var ey = pos.y / PDF_RENDER_SCALE;
        var s = PDF_RENDER_SCALE;

        if (currentTool === 'rectangle') {
            c.strokeRect(
                Math.min(startX, ex) * s, Math.min(startY, ey) * s,
                Math.abs(ex - startX) * s, Math.abs(ey - startY) * s
            );
        } else if (currentTool === 'ellipse') {
            c.beginPath();
            c.ellipse(
                (startX + ex) / 2 * s, (startY + ey) / 2 * s,
                Math.abs(ex - startX) / 2 * s, Math.abs(ey - startY) / 2 * s,
                0, 0, Math.PI * 2
            );
            c.stroke();
        } else if (currentTool === 'arrow') {
            var fx = startX * s, fy = startY * s, tx = ex * s, ty = ey * s;
            c.beginPath();
            c.moveTo(fx, fy);
            c.lineTo(tx, ty);
            c.stroke();
            var ang = Math.atan2(ty - fy, tx - fx), hl = 10 * s / 2;
            c.beginPath();
            c.moveTo(tx, ty);
            c.lineTo(tx - hl * Math.cos(ang - 0.5), ty - hl * Math.sin(ang - 0.5));
            c.moveTo(tx, ty);
            c.lineTo(tx - hl * Math.cos(ang + 0.5), ty - hl * Math.sin(ang + 0.5));
            c.stroke();
        } else if (currentTool === 'line') {
            c.beginPath();
            c.moveTo(startX * s, startY * s);
            c.lineTo(ex * s, ey * s);
            c.stroke();
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

        var pos = e ? getCanvasCoords(e, pageObj) : { x: lastX, y: lastY };
        var annotation = null;

        if (currentTool === 'highlight') {
            if (currentStrokePoints.length === 1) {
                currentStrokePoints.push({
                    x: currentStrokePoints[0].x,
                    y: currentStrokePoints[0].y
                });
            }
            if (currentStrokePoints.length > 1) {
                annotation = {
                    type: 'highlight',
                    color: currentColor,
                    size: currentSize * 3,
                    opacity: currentOpacity,
                    points: currentStrokePoints.slice(),
                    page: pageObj.pageNum,
                    _id: uid()
                };
            }
            currentStrokePoints = [];
        } else if (['rectangle', 'ellipse', 'arrow', 'line'].indexOf(currentTool) !== -1) {
            var ex = pos.x / PDF_RENDER_SCALE;
            var ey = pos.y / PDF_RENDER_SCALE;
            if (Math.abs(ex - startX) > 0.5 || Math.abs(ey - startY) > 0.5) {
                annotation = {
                    type: currentTool,
                    color: currentColor,
                    size: currentSize,
                    opacity: currentOpacity,
                    startX: startX, startY: startY,
                    endX: ex, endY: ey,
                    page: pageObj.pageNum,
                    _id: uid()
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

    /* ========== 註釋渲染 ========== */
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
        var c = pageObj.drawCtx;
        c.save();
        c.globalAlpha = (anno.opacity || 100) / 100;
        c.strokeStyle = anno.color || '#3498db';
        c.fillStyle = anno.color || '#3498db';
        c.lineWidth = (anno.size || 3) * PDF_RENDER_SCALE;
        c.lineCap = 'round';
        c.lineJoin = 'round';
        var s = PDF_RENDER_SCALE;

        if (anno.type === 'highlight') {
            if (anno.points && anno.points.length > 0) {
                c.globalAlpha *= 0.4;
                c.beginPath();
                c.moveTo(anno.points[0].x * s, anno.points[0].y * s);
                for (var i = 1; i < anno.points.length; i++) {
                    c.lineTo(anno.points[i].x * s, anno.points[i].y * s);
                }
                c.stroke();
            }
        } else if (anno.type === 'rectangle') {
            if (anno.startX !== undefined) {
                c.strokeRect(
                    Math.min(anno.startX, anno.endX) * s,
                    Math.min(anno.startY, anno.endY) * s,
                    Math.abs(anno.endX - anno.startX) * s,
                    Math.abs(anno.endY - anno.startY) * s
                );
            }
        } else if (anno.type === 'ellipse') {
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
        } else if (anno.type === 'arrow') {
            if (anno.startX !== undefined) {
                var fx = anno.startX * s, fy = anno.startY * s;
                var tx = anno.endX * s, ty = anno.endY * s;
                c.beginPath();
                c.moveTo(fx, fy);
                c.lineTo(tx, ty);
                c.stroke();
                var ang = Math.atan2(ty - fy, tx - fx), hl = 10 * s / 2;
                c.beginPath();
                c.moveTo(tx, ty);
                c.lineTo(tx - hl * Math.cos(ang - 0.5), ty - hl * Math.sin(ang - 0.5));
                c.moveTo(tx, ty);
                c.lineTo(tx - hl * Math.cos(ang + 0.5), ty - hl * Math.sin(ang + 0.5));
                c.stroke();
            }
        } else if (anno.type === 'line') {
            if (anno.startX !== undefined) {
                c.beginPath();
                c.moveTo(anno.startX * s, anno.startY * s);
                c.lineTo(anno.endX * s, anno.endY * s);
                c.stroke();
            }
        }
        c.restore();
    }

    /* ========== 文字 / Tick 渲染 ========== */
    function renderTextAnnotationsForPage(pageObj) {
        pageObj.textLayer.innerHTML = '';
        annotations.forEach(function (anno) {
            if (anno.type !== 'text' && anno.type !== 'tick') return;
            if ((anno.page || 1) !== pageObj.pageNum) return;
            var el = anno.type === 'text' ? createTextBoxElement(anno) : createTickElement(anno);
            if (el) pageObj.textLayer.appendChild(el);
        });
    }

    function createTextBoxElement(anno) {
        var el = document.createElement('div');
        el.className = 'text-annotation';
        el.setAttribute('data-id', anno._id);
        el.textContent = anno.text || '';
        el.style.color = anno.color || '#3498db';
        el.style.opacity = (anno.opacity || 100) / 100;
        el.style.left = (anno.x) + 'px';
        el.style.top = (anno.y) + 'px';
        el.style.fontSize = ((anno.size || 3) * 4) + 'px';
        el.contentEditable = false;
        if (anno.locked) el.classList.add('locked');

        var delBtn = document.createElement('button');
        delBtn.className = 'delete-btn';
        delBtn.innerHTML = '×';
        delBtn.addEventListener('mousedown', function (e) {
            e.stopPropagation(); e.preventDefault();
            if (!anno.locked) deleteAnnotation(anno._id);
        });
        el.appendChild(delBtn);

        el.addEventListener('dblclick', function (e) {
            e.stopPropagation();
            if (anno.locked || currentTool !== 'text') return;
            el.contentEditable = true;
            el.classList.add('editing');
            el.focus();
            var range = document.createRange();
            range.selectNodeContents(el);
            var sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);
        });

        el.addEventListener('blur', function () {
            if (el.contentEditable === 'true') {
                el.contentEditable = false;
                el.classList.remove('editing');
                var t = el.textContent.trim();
                if (t) { anno.text = t; saveHistory(); }
                else { deleteAnnotation(anno._id); }
                if (currentPageObj) renderTextAnnotationsForPage(currentPageObj);
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
            var r = el.getBoundingClientRect();
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
        var el = document.createElement('div');
        el.className = 'tick-mark';
        el.setAttribute('data-id', anno._id);
        el.textContent = '✓';
        el.style.left = (anno.x - 12) + 'px';
        el.style.top = (anno.y - 12) + 'px';
        el.style.color = anno.color || '#1a73e8';
        el.style.fontSize = ((anno.size || 3) * 6) + 'px';
        if (anno.locked) el.classList.add('locked');

        var delBtn = document.createElement('button');
        delBtn.className = 'delete-btn';
        delBtn.innerHTML = '×';
        delBtn.addEventListener('mousedown', function (e) {
            e.stopPropagation(); e.preventDefault();
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
            var r = el.getBoundingClientRect();
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
        var els = document.querySelectorAll('.text-annotation, .tick-mark');
        for (var i = 0; i < els.length; i++) {
            if (els[i].getAttribute('data-id') === selectedAnnotationId) {
                els[i].style.outline = '2px solid #e74c3c';
                els[i].style.outlineOffset = '2px';
            } else {
                els[i].style.outline = 'none';
            }
        }
    }

    function updateLockButtonState() {
        if (!lockBtn) return;
        var anno = null;
        if (selectedAnnotationId) {
            for (var i = 0; i < annotations.length; i++) {
                if (annotations[i]._id === selectedAnnotationId) {
                    anno = annotations[i];
                    break;
                }
            }
        }
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
        if (!selectedAnnotationId) return;
        var anno = null;
        for (var i = 0; i < annotations.length; i++) {
            if (annotations[i]._id === selectedAnnotationId) {
                anno = annotations[i];
                break;
            }
        }
        if (!anno) return;
        saveHistory();
        anno.locked = !anno.locked;
        if (currentPageObj) {
            renderTextAnnotationsForPage(currentPageObj);
            redrawAnnotationsForPage(currentPageObj);
        }
    }

    function deleteAnnotation(id) {
        var idx = -1;
        for (var i = 0; i < annotations.length; i++) {
            if (annotations[i]._id === id) {
                idx = i;
                break;
            }
        }
        if (idx === -1 || annotations[idx].locked) return;
        saveHistory();
        annotations.splice(idx, 1);
        if (selectedAnnotationId === id) {
            selectedAnnotationId = null;
            updateLockButtonState();
        }
        if (currentPageObj) {
            redrawAnnotationsForPage(currentPageObj);
            renderTextAnnotationsForPage(currentPageObj);
        }
    }

    function deleteSelected() {
        if (!selectedAnnotationId) return;
        var anno = null;
        for (var i = 0; i < annotations.length; i++) {
            if (annotations[i]._id === selectedAnnotationId) {
                anno = annotations[i];
                break;
            }
        }
        if (anno && anno.locked) return;
        deleteAnnotation(selectedAnnotationId);
    }

    /* ========== Undo ========== */
    function saveHistory() {
        history.push(JSON.parse(JSON.stringify(annotations)));
        if (history.length > MAX_HISTORY) history.shift();
    }

    function undo() {
        if (history.length === 0) return;
        annotations = history.pop();
        selectedAnnotationId = null;
        updateLockButtonState();
        if (currentPageObj) {
            redrawAnnotationsForPage(currentPageObj);
            renderTextAnnotationsForPage(currentPageObj);
        }
    }

    /* ========== 拖曳圖形 ========== */
    function hitTestAnnotation(anno, px, py) {
        var tol = 10;
        if (anno.startX !== undefined) {
            return px >= Math.min(anno.startX, anno.endX) - tol &&
                   px <= Math.max(anno.startX, anno.endX) + tol &&
                   py >= Math.min(anno.startY, anno.endY) - tol &&
                   py <= Math.max(anno.startY, anno.endY) + tol;
        }
        if (anno.points) {
            var minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
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
        var pos = getCanvasCoords(e, pageObj);
        var rx = pos.x / PDF_RENDER_SCALE;
        var ry = pos.y / PDF_RENDER_SCALE;

        for (var i = annotations.length - 1; i >= 0; i--) {
            var a = annotations[i];
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
        if (!isDraggingAnnotation || !draggedAnnoId) return;
        var a = null;
        for (var i = 0; i < annotations.length; i++) {
            if (annotations[i]._id === draggedAnnoId) {
                a = annotations[i];
                break;
            }
        }
        if (!a || a.locked) return;
        if (!currentPageObj) return;

        var pos = getCanvasCoords(e, currentPageObj);
        var rx = pos.x / PDF_RENDER_SCALE;
        var ry = pos.y / PDF_RENDER_SCALE;
        var ox = (a.startX !== undefined) ? a.startX : a.points[0].x;
        var oy = (a.startY !== undefined) ? a.startY : a.points[0].y;
        var dx = rx - dragAnnoOffsetX - ox;
        var dy = ry - dragAnnoOffsetY - oy;

        if (a.points) {
            a.points.forEach(function (p) { p.x += dx; p.y += dy; });
        } else if (a.startX !== undefined) {
            a.startX += dx; a.startY += dy;
            a.endX += dx; a.endY += dy;
        }
        redrawAnnotationsForPage(currentPageObj);
        e.preventDefault();
    }

    function endDragAnnotation() {
        if (isDraggingAnnotation && draggedAnnoId) {
            saveHistory();
            isDraggingAnnotation = false;
            draggedAnnoId = null;
        }
    }

    /* ========== 拖曳文字/Tick ========== */
    document.addEventListener('mousemove', function (e) {
        if (!isDraggingText || !draggedAnnotationId) return;
        var anno = null;
        for (var i = 0; i < annotations.length; i++) {
            if (annotations[i]._id === draggedAnnotationId) {
                anno = annotations[i];
                break;
            }
        }
        if (!anno || anno.locked) return;
        if (!currentPageObj) return;
        var pageRect = currentPageObj.container.getBoundingClientRect();
        var newLeft = e.clientX - pageRect.left - dragStartX;
        var newTop = e.clientY - pageRect.top - dragStartY;
        var el = currentPageObj.textLayer.querySelector('[data-id="' + draggedAnnotationId + '"]');
        if (el) {
            el.style.left = newLeft + 'px';
            el.style.top = newTop + 'px';
        }
    });

    document.addEventListener('mouseup', function () {
        if (isDraggingText) {
            isDraggingText = false;
            var anno = null;
            for (var i = 0; i < annotations.length; i++) {
                if (annotations[i]._id === draggedAnnotationId) {
                    anno = annotations[i];
                    break;
                }
            }
            if (anno && currentPageObj) {
                var el = currentPageObj.textLayer.querySelector('[data-id="' + draggedAnnotationId + '"]');
                if (el) {
                    if (anno.type === 'tick') {
                        anno.x = parseFloat(el.style.left) + 12;
                        anno.y = parseFloat(el.style.top) + 12;
                    } else {
                        anno.x = parseFloat(el.style.left);
                        anno.y = parseFloat(el.style.top);
                    }
                    saveHistory();
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
                document.querySelectorAll('.tool-btn').forEach(function (b) {
                    b.classList.remove('active');
                });
                btn.classList.add('active');
                currentTool = btn.dataset.tool;
                if (currentPageObj) {
                    if (currentTool === 'select') currentPageObj.container.style.cursor = 'default';
                    else if (currentTool === 'text') currentPageObj.container.style.cursor = 'text';
                    else currentPageObj.container.style.cursor = 'crosshair';
                }
                document.querySelectorAll('.text-annotation.editing').forEach(function (el) {
                    el.blur();
                });
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
    function goToPage(n) {
        if (n < 1 || n > totalVirtualPages) return;
        activePageNum = n;
        renderCurrentPage();
    }

    function setupNavigation() {
        var prevBtn = document.getElementById('prev-page');
        var nextBtn = document.getElementById('next-page');
        var addBtn = document.getElementById('add-pages-btn');

        if (prevBtn) {
            prevBtn.addEventListener('click', function () {
                if (activePageNum > 1) goToPage(activePageNum - 1);
            });
        }
        if (nextBtn) {
            nextBtn.addEventListener('click', function () {
                if (activePageNum < totalVirtualPages) {
                    goToPage(activePageNum + 1);
                } else {
                    // 到最後一頁 → 自動加 5 頁再前往
                    totalVirtualPages += PAGES_TO_ADD;
                    updatePageInfo();
                    goToPage(activePageNum + 1);
                }
            });
        }
        if (addBtn) {
            addBtn.addEventListener('click', function () {
                totalVirtualPages += PAGES_TO_ADD;
                updatePageInfo();
                // 短暫提示
                addBtn.style.background = '#047857';
                setTimeout(function () { addBtn.style.background = ''; }, 300);
            });
        }
    }

    /* ========== 儲存 / 提交 / 審批 ========== */
    function flushEditingTextBoxes() {
        document.querySelectorAll('.text-annotation.editing').forEach(function (el) {
            var id = el.getAttribute('data-id');
            var anno = null;
            for (var i = 0; i < annotations.length; i++) {
                if (annotations[i]._id === id) { anno = annotations[i]; break; }
            }
            if (anno) {
                el.contentEditable = false;
                el.classList.remove('editing');
                var t = el.textContent.trim();
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
        currentDoc.usesTemplate = true;

        try {
            sessionStorage.setItem('editDocument', JSON.stringify(currentDoc));
            sessionStorage.setItem('currentDiaryRecord', JSON.stringify(currentDoc));
        } catch (e) { /* ignore */ }

        var stored = localStorage.getItem(STORAGE_KEY);
        var data = [];
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
        catch (e) { console.error('[DSD] Save failed', e); }

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

        var sessionData = {};
        try { sessionData = JSON.parse(sessionStorage.getItem('dwss_session') || '{}'); } catch (e) {}
        currentDoc.submittedBy = sessionData.userName || currentDoc.submittedBy || 'Unknown';

        updateDocumentInfo(currentDoc);
        saveChanges();
        updateApprovalButtons();
        alert('✅ Document submitted for approval!');
    }

    function approveDocument() {
        if (!currentDoc) return;
        var sessionData = {};
        try { sessionData = JSON.parse(sessionStorage.getItem('dwss_session') || '{}'); } catch (e) {}
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
        var sessionData = {};
        try { sessionData = JSON.parse(sessionStorage.getItem('dwss_session') || '{}'); } catch (e) {}
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
        var approveBtn = document.getElementById('approve-btn');
        var rejectBtn = document.getElementById('reject-btn');
        var submitBtn = document.getElementById('submit-btn');
        var sessionData = {};
        try { sessionData = JSON.parse(sessionStorage.getItem('dwss_session') || '{}'); } catch (e) {}
        var canApprove = sessionData.permissions && sessionData.permissions.canChangeStatus;

        if (!canApprove) {
            if (approveBtn) approveBtn.style.display = 'none';
            if (rejectBtn) rejectBtn.style.display = 'none';
        } else {
            if (approveBtn) {
                approveBtn.style.display = 'inline-flex';
                approveBtn.disabled = !!(currentDoc && currentDoc.approvalStatus === 'approved');
                approveBtn.style.opacity = approveBtn.disabled ? '0.5' : '1';
            }
            if (rejectBtn) {
                rejectBtn.style.display = 'inline-flex';
                rejectBtn.disabled = !!(currentDoc && currentDoc.approvalStatus === 'rejected');
                rejectBtn.style.opacity = rejectBtn.disabled ? '0.5' : '1';
            }
        }

        if (submitBtn) {
            var disabled = !!(currentDoc && currentDoc.approvalStatus === 'approved');
            submitBtn.disabled = disabled;
            submitBtn.style.opacity = disabled ? '0.5' : '1';
        }
    }

    function cancelEditing() {
        if (confirm('Cancel editing? All unsaved changes will be lost.')) {
            history.back();
        }
    }

    function bindActionButtons() {
        var saveBtn = document.getElementById('save-btn');
        var cancelBtn = document.getElementById('cancel-btn');
        var undoBtn = document.getElementById('undo-btn');
        var delBtn = document.getElementById('delete-selected-btn');
        var submitBtn = document.getElementById('submit-btn');
        var approveBtn = document.getElementById('approve-btn');
        var rejectBtn = document.getElementById('reject-btn');

        if (saveBtn) saveBtn.addEventListener('click', saveChanges);
        if (cancelBtn) cancelBtn.addEventListener('click', cancelEditing);
        if (undoBtn) undoBtn.addEventListener('click', undo);
        if (delBtn) delBtn.addEventListener('click', deleteSelected);
        if (lockBtn) lockBtn.addEventListener('click', toggleLock);
        if (submitBtn) submitBtn.addEventListener('click', submitDocument);
        if (approveBtn) approveBtn.addEventListener('click', approveDocument);
        if (rejectBtn) rejectBtn.addEventListener('click', rejectDocument);
    }

    /* ========== 初始化 ========== */
    document.addEventListener('DOMContentLoaded', function () {
        try {
            syncGlobalDate();

            var doc = loadDocumentData();
            if (!doc) {
                doc = buildDefaultDoc();
                try { sessionStorage.setItem('editDocument', JSON.stringify(doc)); } catch (e) {}
            }
            currentDoc = doc;
            annotations = Array.isArray(doc.annotations) ? doc.annotations : [];

            updateDocumentInfo(currentDoc);

            // 決定總頁數
            var maxAnnotated = 1;
            annotations.forEach(function (a) {
                if ((a.page || 1) > maxAnnotated) maxAnnotated = a.page;
            });
            var savedTotal = currentDoc.totalPages || 0;
            var needed = Math.max(DEFAULT_TOTAL_PAGES, maxAnnotated, savedTotal);
            totalVirtualPages = Math.ceil(needed / PAGES_TO_ADD) * PAGES_TO_ADD;
            if (totalVirtualPages < DEFAULT_TOTAL_PAGES) totalVirtualPages = DEFAULT_TOTAL_PAGES;

            updatePageInfo();

            showLoading('Loading SiteDiaryDSD.pdf...');
            loadPdfTemplate().then(function () {
                hideLoading();
                renderCurrentPage();
                setupTools();
                setupNavigation();
                bindActionButtons();
                history = [];
                saveHistory();
                updateLockButtonState();
                setTimeout(function () { updateApprovalButtons(); }, 500);
                console.log('[DSD] Editor ready. Total pages:', totalVirtualPages);
            }).catch(function (err) {
                console.error('[DSD] PDF load failed:', err);
                hideLoading();
                pageWrapper.innerHTML =
                    '<div style="padding:40px;text-align:center;color:#e74c3c;background:#fff;border-radius:8px;">' +
                    '<i class="fas fa-exclamation-triangle" style="font-size:32px;"></i><br><br>' +
                    '<strong>Failed to load ' + PDF_PATH + '</strong><br>' +
                    '<small>Error: ' + (err && err.message ? err.message : 'unknown') + '</small><br><br>' +
                    '<small>請確認 SiteDiaryDSD.pdf 與 editdsdsitediary.html 在同一目錄</small>' +
                    '</div>';
            });

        } catch (err) {
            console.error('[DSD] Init failed:', err);
            if (pageWrapper) {
                pageWrapper.innerHTML =
                    '<div style="padding:40px;text-align:center;color:#e74c3c;">' +
                    'Init error: ' + (err && err.message ? err.message : 'unknown') +
                    '</div>';
            }
        }
    });

})();