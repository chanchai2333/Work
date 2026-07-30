/**
 * editpdf.js - 共用 PDF 編輯器
 * 支援 Site Diary、Safety Inspection、Labour Wage 等模組
 * 
 * 讀取邏輯：
 * 1. 優先讀取 sessionStorage 嘅 "editDocument" 或 "currentWageRecord"
 * 2. 如果 record 有 pdfData/pdfUrl 就用
 * 3. 如果 sessionStorage 有 "DEFAULT_PDF_TEMPLATE" 就用（各模組自己設定）
 * 4. 否則顯示空白 canvas
 */
(function() {
    'use strict';

    // ---------- 全域變數 ----------
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
    
    // DOM
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
    const lockBtn = document.getElementById('lock-btn');
    const submitBtn = document.getElementById('submit-btn');
    
    let currentColor = '#3498db';
    let currentSize = 3;
    let currentOpacity = 100;
    let currentStrokePoints = [];
    let isDraggingText = false;
    let dragStartX = 0, dragStartY = 0;
    let draggedAnnotationId = null;
    let isDraggingAnnotation = false;
    let draggedAnnoId = null;
    let dragAnnoOffsetX = 0, dragAnnoOffsetY = 0;

    // ---------- 輔助函數 ----------
    function syncGlobalDate() {
        const storedDate = sessionStorage.getItem('globalDate');
        const dateSpan = document.querySelector('.date-display span');
        if (storedDate && dateSpan) dateSpan.textContent = storedDate;
        else if (dateSpan) dateSpan.textContent = new Date().toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' });
    }

    function loadDocumentData() {
        const docStr = sessionStorage.getItem('editDocument') || sessionStorage.getItem('currentWageRecord');
        if (!docStr) return null;
        
        try {
            const doc = JSON.parse(docStr);
            currentDoc = doc;
            
            const docIdEl = document.getElementById('docId');
            const docSiteEl = document.getElementById('docSite');
            const docPeriodEl = document.getElementById('docPeriod');
            const docAuthorEl = document.getElementById('docAuthor');
            const docTypeEl = document.getElementById('docType');
            const docTitleEl = document.getElementById('docTitle');
            const docStatusEl = document.getElementById('docStatus');
            
            if (docIdEl) docIdEl.textContent = doc.id || 'N/A';
            if (docSiteEl) docSiteEl.textContent = doc.site || 'N/A';
            if (docPeriodEl) docPeriodEl.textContent = doc.period || doc.date || 'N/A';
            if (docAuthorEl) docAuthorEl.textContent = doc.submittedBy || doc.author || 'N/A';
            if (docTypeEl) docTypeEl.textContent = doc.typeText || doc.type || 'N/A';
            if (docTitleEl) docTitleEl.textContent = doc.site ? `${doc.typeText || doc.type || 'Document'} - ${doc.site}` : 'Edit Document';
            // 显示状态
            const statusDisplay = document.getElementById('docStatusDisplay');
            if (statusDisplay) {
                const statusMap = {
                    'draft': 'Draft',
                    'submitted-wsg': 'Submitted to WSG',
                    'submitted-ig': 'Submitted to IG',
                    'closed': 'Closed',
                    'reopen': 'Reopen',
                    'cancelled': 'Cancelled'
                };
                statusDisplay.textContent = statusMap[doc.status] || doc.status || 'N/A';
            }
            // 如果状态不是 draft，禁用 submit 按钮
            if (submitBtn) {
                if (doc.status && doc.status !== 'draft') {
                    submitBtn.disabled = true;
                    submitBtn.title = 'Document already submitted';
                } else {
                    submitBtn.disabled = false;
                    submitBtn.title = 'Submit this document';
                }
            }
            
            if (docStatusEl) {
                docStatusEl.textContent = doc.statusText || 'Draft';
                docStatusEl.className = 'doc-status';
                const sm = { draft:'status-draft', submitted:'status-submitted', endorsed:'status-endorsed', cancelled:'status-cancelled', confirm:'status-confirm', 'double-check':'status-double-check' };
                if (sm[doc.status]) docStatusEl.classList.add(sm[doc.status]);
            }
            
            annotations = doc.annotations || [];
            annotations.forEach((a, idx) => a._id = a._id || Date.now() + idx);
            return doc;
        } catch(e) {
            console.error('loadDocumentData error:', e);
            return null;
        }
    }

    function showError(msg) {
        if (container) container.innerHTML = `<div style="text-align:center;padding:40px;color:#e74c3c;"><i class="fas fa-exclamation-circle"></i> ${msg}</div>`;
    }

    // ---------- PDF 載入 ----------
    function loadPDF(url) {
        let pdfSource;
        if (url.startsWith('data:application/pdf;base64,')) {
            const base64Data = url.split(',')[1];
            try {
                const binaryString = atob(base64Data);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
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
            console.error('PDF load failed:', err);
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

    // ---------- 渲染 ----------
    function renderPage(pageNum) {
        if (!pdfDoc) {
            drawCanvas.width = 800 * renderScale; 
            drawCanvas.height = 1000 * renderScale;
            drawCanvas.style.width = '800px'; 
            drawCanvas.style.height = '1000px';
            drawCtx.fillStyle = '#ffffff'; 
            drawCtx.fillRect(0, 0, drawCanvas.width, drawCanvas.height);
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
                if (currentPageSpan) currentPageSpan.textContent = pageNum;
                currentPage = pageNum;
                redrawAnnotations();
                renderTextAnnotations();
                if (container) { container.scrollTop = 0; container.scrollLeft = 0; }
                requestAnimationFrame(() => { alignDrawCanvas(); updateTextPositions(); });
            });
        });
    }

    function alignDrawCanvas() {
        if (!canvas || !drawCanvas) return;
        drawCanvas.style.position = 'absolute';
        drawCanvas.style.left = canvas.offsetLeft + 'px';
        drawCanvas.style.top = canvas.offsetTop + 'px';
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
            const id = el.getAttribute('data-id');
            const anno = annotations.find(a => a._id == id);
            if (!anno) return;
            if (anno.type === 'tick') {
                el.style.left = (anno.x * scale + offsetX - 12) + 'px';
                el.style.top = (anno.y * scale + offsetY - 12) + 'px';
            } else {
                el.style.left = (anno.x * scale + offsetX) + 'px';
                el.style.top = (anno.y * scale + offsetY) + 'px';
                el.style.fontSize = (anno.size * 4 * scale) + 'px';
            }
        });
    }

    function renderTextAnnotations() {
        textBoxElements.forEach(el => { if (el.parentNode) el.parentNode.removeChild(el); });
        textBoxElements = [];
        
        // 文字框
        const textAnnos = annotations.filter(a => a.type === 'text' && (a.page === currentPage || (a.page === undefined && currentPage === 1)));
        textAnnos.forEach(anno => {
            const el = createTextBoxElement(anno);
            container.appendChild(el);
            textBoxElements.push(el);
        });
        
        // ★ Tick marks
        const tickAnnos = annotations.filter(a => a.type === 'tick' && (a.page === currentPage || (a.page === undefined && currentPage === 1)));
        tickAnnos.forEach(anno => {
            const el = createTickElement(anno);
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
        el.setAttribute('data-id', anno._id);
        el.textContent = anno.text || '';
        el.style.color = anno.color;
        el.style.opacity = (anno.opacity || 100) / 100;
        el.contentEditable = false;
        if (anno.locked) el.classList.add('locked');
        
        const delBtn = document.createElement('button');
        delBtn.className = 'delete-btn';
        delBtn.innerHTML = '×';
        delBtn.addEventListener('mousedown', (e) => { e.stopPropagation(); if (!anno.locked) deleteAnnotation(anno._id); });
        el.appendChild(delBtn);
        
        el.addEventListener('dblclick', function(e) { 
            e.stopPropagation(); 
            if (anno.locked || currentTool !== 'text') return; 
                el.contentEditable = true; 
                el.classList.add('editing'); 
                el.focus();
                // ★ 全選現有文字，方便用戶直接覆寫
                var range = document.createRange();
                range.selectNodeContents(el);
                var sel = window.getSelection();
                sel.removeAllRanges();
                sel.addRange(range);
            });
        el.addEventListener('blur', () => {
            if (el.contentEditable === 'true') { el.contentEditable = false; el.classList.remove('editing'); const t = el.textContent.trim(); if (t) { anno.text = t; saveHistory(); } else { deleteAnnotation(anno._id); } redrawAnnotations(); renderTextAnnotations(); }
        });
        el.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); el.blur(); } if (e.key === 'Escape') el.blur(); });
        el.addEventListener('mousedown', function(e) { 
    if (e.target === delBtn) return; 
    if (anno.locked) return;
    // ★ 如果正在編輯，允許正常滑鼠點擊定位
    if (el.contentEditable === 'true' || el.classList.contains('editing')) return;
    e.preventDefault(); 
    isDraggingText = true; 
    draggedAnnotationId = anno._id; 
    var r = el.getBoundingClientRect(); 
    dragStartX = e.clientX - r.left; 
    dragStartY = e.clientY - r.top; 
    selectAnnotation(anno._id); 
});
        el.addEventListener('click', (e) => { if (e.target === delBtn) return; if (el.contentEditable === 'true') return; selectAnnotation(anno._id); });
        return el;
    }

    // ★ Tick 元素
    function createTickElement(anno) {
        const el = document.createElement('div');
        el.className = 'tick-mark';
        el.setAttribute('data-id', anno._id);
        el.textContent = '✓';
        el.style.position = 'absolute';
        el.style.color = anno.color || '#1a73e8';
        el.style.fontSize = ((anno.size || 3) * 6 * scale) + 'px';
        el.style.fontWeight = 'bold';
        el.style.cursor = anno.locked ? 'default' : 'move';
        el.style.zIndex = '25';
        el.style.userSelect = 'none';
        el.style.width = '24px';
        el.style.height = '24px';
        el.style.display = 'flex';
        el.style.alignItems = 'center';
        el.style.justifyContent = 'center';
        if (anno.locked) el.classList.add('locked');

        const delBtn = document.createElement('button');
        delBtn.className = 'delete-btn';
        delBtn.innerHTML = '×';
        delBtn.addEventListener('mousedown', function(ev) {
            ev.stopPropagation();
            ev.preventDefault();
            if (!anno.locked) deleteAnnotation(anno._id);
        });
        el.appendChild(delBtn);

        el.addEventListener('mousedown', function(ev) {
            if (ev.target === delBtn) return;
            if (anno.locked) return;
            ev.stopPropagation();
            ev.preventDefault();
            selectAnnotation(anno._id);
            isDraggingText = true;
            draggedAnnotationId = anno._id;
            const r = el.getBoundingClientRect();
            dragStartX = ev.clientX - r.left;
            dragStartY = ev.clientY - r.top;
        });

        el.addEventListener('click', function(ev) {
            if (ev.target === delBtn) return;
            selectAnnotation(anno._id);
        });

        return el;
    }

    function selectAnnotation(id) { selectedAnnotationId = id; highlightSelected(); updateLockButtonState(); }

    function highlightSelected() {
        document.querySelectorAll('.text-annotation, .tick-mark').forEach(el => {
            if (el.getAttribute('data-id') == selectedAnnotationId) {
                el.style.outline = '2px solid #e74c3c';
                el.style.outlineOffset = '2px';
            } else {
                el.style.outline = 'none';
            }
        });
    }

    function toggleLock() { if (selectedAnnotationId === null) return; const anno = annotations.find(a => a._id === selectedAnnotationId); if (!anno) return; saveHistory(); anno.locked = !anno.locked; redrawAnnotations(); renderTextAnnotations(); }

    function updateLockButtonState() {
        if (!lockBtn) return;
        const anno = selectedAnnotationId ? annotations.find(a => a._id === selectedAnnotationId) : null;
        if (!anno) { lockBtn.innerHTML = '<i class="fas fa-lock"></i> Lock'; lockBtn.classList.remove('unlock'); lockBtn.disabled = true; }
        else { lockBtn.disabled = false; lockBtn.innerHTML = anno.locked ? '<i class="fas fa-unlock"></i> Unlock' : '<i class="fas fa-lock"></i> Lock'; if (anno.locked) lockBtn.classList.add('unlock'); else lockBtn.classList.remove('unlock'); }
    }

    function redrawAnnotations() {
        if (!drawCtx) return;
        drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
        annotations.forEach(anno => {
            if (anno.type === 'text' || anno.type === 'tick') return;
            if (anno.page !== undefined && anno.page !== currentPage) return;
            if (anno.page === undefined && currentPage !== 1) return;
            drawAnnotation(anno);
        });
    }

    function drawAnnotation(anno) {
        if (!drawCtx) return;
        const c = drawCtx;
        c.save(); c.globalAlpha = (anno.opacity || 100) / 100; c.strokeStyle = anno.color || '#3498db'; c.fillStyle = anno.color || '#3498db'; c.lineWidth = (anno.size || 3) * renderScale; c.lineCap = 'round'; c.lineJoin = 'round';
        const s = scale * renderScale;
        switch (anno.type) {
            case 'highlight': if (anno.points && anno.points.length > 0) { c.globalAlpha *= 0.4; c.beginPath(); c.moveTo(anno.points[0].x*s, anno.points[0].y*s); for (let i=1; i<anno.points.length; i++) c.lineTo(anno.points[i].x*s, anno.points[i].y*s); c.stroke(); } break;
            case 'rectangle': if (anno.startX !== undefined) { c.strokeRect(Math.min(anno.startX,anno.endX)*s, Math.min(anno.startY,anno.endY)*s, Math.abs(anno.endX-anno.startX)*s, Math.abs(anno.endY-anno.startY)*s); } break;
            case 'ellipse': if (anno.startX !== undefined) { c.beginPath(); c.ellipse((anno.startX+anno.endX)/2*s, (anno.startY+anno.endY)/2*s, Math.abs(anno.endX-anno.startX)/2*s, Math.abs(anno.endY-anno.startY)/2*s, 0, 0, Math.PI*2); c.stroke(); } break;
            case 'arrow': if (anno.startX !== undefined) { const fx=anno.startX*s, fy=anno.startY*s, tx=anno.endX*s, ty=anno.endY*s; c.beginPath(); c.moveTo(fx,fy); c.lineTo(tx,ty); c.stroke(); const ang=Math.atan2(ty-fy,tx-fx), hl=10*s/2; c.beginPath(); c.moveTo(tx,ty); c.lineTo(tx-hl*Math.cos(ang-0.5),ty-hl*Math.sin(ang-0.5)); c.moveTo(tx,ty); c.lineTo(tx-hl*Math.cos(ang+0.5),ty-hl*Math.sin(ang+0.5)); c.stroke(); } break;
            case 'line': if (anno.startX !== undefined) { c.beginPath(); c.moveTo(anno.startX*s,anno.startY*s); c.lineTo(anno.endX*s,anno.endY*s); c.stroke(); } break;
            // ★ Tick 繪製
            case 'tick':
                var tx = anno.x * s;
                var ty = anno.y * s;
                var sz = 10 * (anno.size || 3) / 3;
                c.beginPath();
                c.moveTo(tx - sz * 0.5, ty);
                c.lineTo(tx, ty + sz * 0.6);
                c.lineTo(tx + sz, ty - sz * 0.5);
                c.stroke();
                break;
        }
        c.restore();
    }

    function deleteAnnotation(id) {
        const idx = annotations.findIndex(a => a._id === id);
        if (idx === -1 || annotations[idx].locked) return;
        saveHistory();
        annotations.splice(idx, 1);
        if (selectedAnnotationId === id) { selectedAnnotationId = null; updateLockButtonState(); }
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
            sessionStorage.setItem('currentWageRecord', JSON.stringify(currentDoc));
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
        let cx, cy;
        if (e.touches && e.touches.length > 0) { cx = e.touches[0].clientX; cy = e.touches[0].clientY; }
        else { cx = e.clientX; cy = e.clientY; }
        const targetCanvas = (canvas && canvas.offsetWidth > 0) ? canvas : drawCanvas;
        const rect = targetCanvas.getBoundingClientRect();
        if (!rect.width || !rect.height) return { x: 0, y: 0 };
        return {
            x: (cx - rect.left) * (targetCanvas.width / rect.width),
            y: (cy - rect.top) * (targetCanvas.height / rect.height)
        };
    }

    function hitTestAnnotation(anno, px, py) {
        const tolerance = 10 / scale;
        // ★ Tick hit test
        if (anno.type === 'tick') {
            return px >= anno.x - tolerance && px <= anno.x + tolerance + 1 &&
                   py >= anno.y - tolerance - 0.5 && py <= anno.y + tolerance + 0.5;
        }
        if (anno.startX !== undefined) {
            const minX = Math.min(anno.startX, anno.endX) - tolerance;
            const maxX = Math.max(anno.startX, anno.endX) + tolerance;
            const minY = Math.min(anno.startY, anno.endY) - tolerance;
            const maxY = Math.max(anno.startY, anno.endY) + tolerance;
            return px >= minX && px <= maxX && py >= minY && py <= maxY;
        }
        if (anno.points) {
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
    }

    function startDragAnnotation(e) {
        if (currentTool !== 'select') return;
        const pos = getCanvasCoords(e);
        const rx = pos.x / (renderScale * scale);
        const ry = pos.y / (renderScale * scale);
        for (let i = annotations.length - 1; i >= 0; i--) {
            const a = annotations[i];
            if (a.type === 'text' || a.type === 'tick' || a.locked) continue;
            if (a.page !== undefined && a.page !== currentPage) continue;
            if (a.page === undefined && currentPage !== 1) continue;
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
        const pos = getCanvasCoords(e);
        const rx = pos.x / (renderScale * scale);
        const ry = pos.y / (renderScale * scale);
        const a = annotations.find(x => x._id === draggedAnnoId);
        if (!a || a.locked) return;
        const currentOriginX = (a.startX !== undefined) ? a.startX : a.points[0].x;
        const currentOriginY = (a.startY !== undefined) ? a.startY : a.points[0].y;
        const deltaX = rx - dragAnnoOffsetX - currentOriginX;
        const deltaY = ry - dragAnnoOffsetY - currentOriginY;
        if (a.points) {
            a.points.forEach(p => { p.x += deltaX; p.y += deltaY; });
        } else if (a.startX !== undefined) {
            a.startX += deltaX; a.startY += deltaY;
            a.endX += deltaX; a.endY += deltaY;
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

    // ---------- 繪圖事件 ----------
    function startDrawing(e) {
        alignDrawCanvas();
        if (currentTool === 'select') { startDragAnnotation(e); return; }
        if (currentTool === 'text') {
            text: '',
            e.preventDefault();
            var clickedEl = document.elementFromPoint(e.clientX, e.clientY);
            if (clickedEl && clickedEl.closest && clickedEl.closest('.text-annotation')) return;
            const pos = getCanvasCoords(e);
            const newAnno = {
                type: 'text',
                color: currentColor,
                size: currentSize,
                opacity: currentOpacity,
                x: pos.x / (renderScale * scale),
                y: pos.y / (renderScale * scale),
                text: 'Double-click to edit',
                locked: false,
                page: currentPage,
                _id: Date.now() + Math.random()
            };
            saveHistory();
            annotations.push(newAnno);
            redrawAnnotations();
            renderTextAnnotations();
            const nel = textBoxElements.find(el => el.getAttribute('data-id') == newAnno._id);
            if (nel) { nel.contentEditable = true; nel.classList.add('editing'); nel.focus(); }
            return;
        }
        // ★ Tick 工具
        if (currentTool === 'tick') {
            e.preventDefault();
            var clickedEl = document.elementFromPoint(e.clientX, e.clientY);
            if (clickedEl && clickedEl.closest && (clickedEl.closest('.text-annotation') || clickedEl.closest('.tick-mark'))) return;
            const pos = getCanvasCoords(e);
            const newTick = {
                type: 'tick',
                color: currentColor,
                size: currentSize,
                opacity: currentOpacity,
                x: pos.x / (renderScale * scale),
                y: pos.y / (renderScale * scale),
                locked: false,
                page: currentPage,
                _id: Date.now() + Math.random()
            };
            saveHistory();
            annotations.push(newTick);
            redrawAnnotations();
            renderTextAnnotations();
            return;
        }
        if (currentTool === 'highlight') {
            e.preventDefault();
            isDrawing = true;
            const pos = getCanvasCoords(e);
            lastX = pos.x; lastY = pos.y;
            startX = pos.x; startY = pos.y;
            currentStrokePoints = [{ x: pos.x / (renderScale * scale), y: pos.y / (renderScale * scale) }];
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
        if (currentTool === 'select') { if (isDraggingAnnotation) moveDragAnnotation(e); return; }
        if (currentTool === 'text' || currentTool === 'tick') return;
        if (!isDrawing) return;
        e.preventDefault();
        const pos = getCanvasCoords(e);
        if (currentTool === 'highlight') {
            drawCtx.lineTo(pos.x, pos.y);
            drawCtx.stroke();
            currentStrokePoints.push({ x: pos.x / (renderScale * scale), y: pos.y / (renderScale * scale) });
            return;
        }
        redrawAnnotations();
        drawCtx.save();
        drawCtx.globalAlpha = currentOpacity / 100;
        drawCtx.strokeStyle = currentColor;
        drawCtx.lineWidth = currentSize * renderScale;
        drawCtx.lineCap = 'round';
        drawCtx.lineJoin = 'round';
        const ex = pos.x / (renderScale * scale);
        const ey = pos.y / (renderScale * scale);
        const s = scale * renderScale;
        switch (currentTool) {
            case 'rectangle':
                const rx = Math.min(startX, ex) * s;
                const ry = Math.min(startY, ey) * s;
                const rw = Math.abs(ex - startX) * s;
                const rh = Math.abs(ey - startY) * s;
                drawCtx.strokeRect(rx, ry, rw, rh);
                break;
            case 'ellipse':
                const cx = (startX + ex) / 2 * s;
                const cy = (startY + ey) / 2 * s;
                const rx2 = Math.abs(ex - startX) / 2 * s;
                const ry2 = Math.abs(ey - startY) / 2 * s;
                drawCtx.beginPath();
                drawCtx.ellipse(cx, cy, rx2, ry2, 0, 0, Math.PI * 2);
                drawCtx.stroke();
                break;
            case 'arrow':
                const fromX = startX * s;
                const fromY = startY * s;
                const toX = ex * s;
                const toY = ey * s;
                drawCtx.beginPath();
                drawCtx.moveTo(fromX, fromY);
                drawCtx.lineTo(toX, toY);
                drawCtx.stroke();
                const ang = Math.atan2(toY - fromY, toX - fromX);
                const headLen = 10 * s / 2;
                drawCtx.beginPath();
                drawCtx.moveTo(toX, toY);
                drawCtx.lineTo(toX - headLen * Math.cos(ang - 0.5), toY - headLen * Math.sin(ang - 0.5));
                drawCtx.moveTo(toX, toY);
                drawCtx.lineTo(toX - headLen * Math.cos(ang + 0.5), toY - headLen * Math.sin(ang + 0.5));
                drawCtx.stroke();
                break;
            case 'line':
                drawCtx.beginPath();
                drawCtx.moveTo(startX * s, startY * s);
                drawCtx.lineTo(ex * s, ey * s);
                drawCtx.stroke();
                break;
        }
        drawCtx.restore();
        lastX = pos.x; lastY = pos.y;
    }

    function stopDrawing(e) {
        if (currentTool === 'select') { if (isDraggingAnnotation) endDragAnnotation(); return; }
        if (currentTool === 'text' || currentTool === 'tick') return;
        if (!isDrawing) return;
        isDrawing = false;
        const pos = e ? getCanvasCoords(e) : { x: lastX, y: lastY };
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
        } else if (currentTool === 'rectangle' || currentTool === 'ellipse' || currentTool === 'arrow' || currentTool === 'line') {
            const ex = pos.x / (renderScale * scale);
            const ey = pos.y / (renderScale * scale);
            if (Math.abs(ex - startX) > 0.5 || Math.abs(ey - startY) > 0.5) {
                annotation = {
                    type: currentTool,
                    color: currentColor,
                    size: currentSize,
                    opacity: currentOpacity,
                    startX: startX,
                    startY: startY,
                    endX: ex,
                    endY: ey,
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

    // ---------- 滑鼠拖動事件 ----------
    document.addEventListener('mousemove', (e) => {
        if (!isDraggingText || draggedAnnotationId === null) return;
        const anno = annotations.find(a => a._id === draggedAnnotationId);
        if (!anno || anno.locked) return;
        const el = textBoxElements.find(x => x.getAttribute('data-id') == draggedAnnotationId);
        if (el) {
            el.style.left = (e.clientX - container.getBoundingClientRect().left + container.scrollLeft - dragStartX) + 'px';
            el.style.top = (e.clientY - container.getBoundingClientRect().top + container.scrollTop - dragStartY) + 'px';
        }
    });

    document.addEventListener('mouseup', () => {
        if (isDraggingText) {
            isDraggingText = false;
            const anno = annotations.find(a => a._id === draggedAnnotationId);
            if (anno) {
                const el = textBoxElements.find(x => x.getAttribute('data-id') == draggedAnnotationId);
                if (el) {
                    const off = getCanvasOffset();
                    if (anno.type === 'tick') {
                        anno.x = (parseFloat(el.style.left) + 12 - off.offsetX) / scale;
                        anno.y = (parseFloat(el.style.top) + 12 - off.offsetY) / scale;
                    } else {
                        anno.x = (parseFloat(el.style.left) - off.offsetX) / scale;
                        anno.y = (parseFloat(el.style.top) - off.offsetY) / scale;
                    }
                    saveHistory();
                }
            }
            draggedAnnotationId = null;
        }
        if (isDraggingAnnotation) endDragAnnotation();
    });

    if (container) container.addEventListener('scroll', updateTextPositions);

    // ---------- 工具設定 ----------
    function setupTools() {
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentTool = btn.dataset.tool;
                if (currentTool === 'select') {
                    drawCanvas.style.cursor = 'default';
                } else if (currentTool === 'text') {
                    drawCanvas.style.cursor = 'text';
                } else if (currentTool === 'tick') {
                    drawCanvas.style.cursor = 'crosshair';
                } else {
                    drawCanvas.style.cursor = 'crosshair';
                }
                document.querySelectorAll('.text-annotation.editing').forEach(el => el.blur());
            });
        });
        if (colorPicker) colorPicker.addEventListener('input', e => currentColor = e.target.value);
        if (sizeSlider) sizeSlider.addEventListener('input', e => {
            currentSize = parseInt(e.target.value);
            if (sizeValue) sizeValue.textContent = currentSize + 'px';
        });
        if (opacitySlider) opacitySlider.addEventListener('input', e => {
            currentOpacity = parseInt(e.target.value);
            if (opacityValue) opacityValue.textContent = currentOpacity + '%';
        });
    }

    function setupNavigation() {
        document.getElementById('prev-page')?.addEventListener('click', () => {
            if (pdfDoc && currentPage > 1) renderPage(currentPage - 1);
        });
        document.getElementById('next-page')?.addEventListener('click', () => {
            if (pdfDoc && currentPage < pdfDoc.numPages) renderPage(currentPage + 1);
        });
    }

    function saveChanges() {
        if (!currentDoc) { alert('No document to save.'); return; }
       
        document.querySelectorAll('.text-annotation.editing').forEach(el => {
            const id = el.getAttribute('data-id');
            const anno = annotations.find(a => a._id == id);
            if (anno) {
                el.contentEditable = false;
                el.classList.remove('editing');
                const t = el.textContent.trim();
                if (t) anno.text = t;
                else deleteAnnotation(anno._id);
            }
        });
        currentDoc.annotations = annotations;
        const STORAGE_KEY = 'siteDiaryData';
        let diaryData = [];
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) try { diaryData = JSON.parse(stored); } catch(e) {}
        const index = diaryData.findIndex(d => d.id === currentDoc.id);
        if (index !== -1) {
            diaryData[index].annotations = annotations;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(diaryData));
        } else {
            alert('Document not found in storage.');
            return;
        }
        sessionStorage.setItem('editDocument', JSON.stringify(currentDoc));
        sessionStorage.setItem('currentWageRecord', JSON.stringify(currentDoc));
        
        var storageKeys = ['labourWageData', 'siteDiaryData', 'safetyInspectionData'];
        storageKeys.forEach(function(key) {
            var stored = localStorage.getItem(key);
            if (stored) {
                try {
                    var data = JSON.parse(stored);
                    if (Array.isArray(data)) {
                        var idx = data.findIndex(function(d) { return d.id == currentDoc.id; });
                        if (idx !== -1) { data[idx] = currentDoc; localStorage.setItem(key, JSON.stringify(data)); }
                    }
                } catch(e) {}
            }
        });
        
        alert('✅ Changes saved successfully!');
    }

    // ---------- Submit 功能 ----------
    function submitDocument() {
        if (!currentDoc) {
            alert('No document to submit.');
            return;
        }
        // 检查状态是否为 draft
        if (currentDoc.status !== 'draft') {
            alert('This document has already been submitted.');
            return;
        }
        // 确认提交
        if (!confirm('Submit this document to WSG? The status will change to "Submitted to WSG".')) {
            return;
        }
        // 先保存注释
        document.querySelectorAll('.text-annotation.editing').forEach(el => {
            const id = el.getAttribute('data-id');
            const anno = annotations.find(a => a._id == id);
            if (anno) {
                el.contentEditable = false;
                el.classList.remove('editing');
                const t = el.textContent.trim();
                if (t) anno.text = t;
                else deleteAnnotation(anno._id);
            }
        });
        // 更新 currentDoc
        currentDoc.annotations = annotations;
        // 保持原有状态不变（不修改 status）
        
        sessionStorage.setItem('editDocument', JSON.stringify(currentDoc));
        alert('✅ Annotations saved successfully!');
    }

    function cancelEditing() {
        if (confirm('Cancel editing? All unsaved changes will be lost.')) {
            history.back();
        }
    }

    function goBack() {
        history.back();
    }

    function bindDrawingEvents() {
        if (!container) return;
        container.addEventListener('mousedown', startDrawing);
        container.addEventListener('mousemove', draw);
        container.addEventListener('mouseup', stopDrawing);
        container.addEventListener('mouseleave', stopDrawing);
        container.addEventListener('touchstart', startDrawing, { passive: false });
        container.addEventListener('touchmove', draw, { passive: false });
        container.addEventListener('touchend', stopDrawing, { passive: false });
    }

    function bindActionButtons() {
        document.getElementById('save-btn')?.addEventListener('click', saveChanges);
        document.getElementById('cancel-btn')?.addEventListener('click', cancelEditing);
        document.getElementById('back-btn')?.addEventListener('click', goBack);
        document.getElementById('back-to-wage-btn')?.addEventListener('click', function() {
            window.location.href = 'labourwage.html';
        });
        document.getElementById('undo-btn')?.addEventListener('click', undo);
        document.getElementById('delete-selected-btn')?.addEventListener('click', deleteSelected);
        if (lockBtn) lockBtn.addEventListener('click', toggleLock);
        if (submitBtn) submitBtn.addEventListener('click', submitDocument);
    }

    window.addEventListener('resize', () => { alignDrawCanvas(); updateTextPositions(); });

    // ---------- 初始化 ----------
    document.addEventListener('DOMContentLoaded', () => {
        syncGlobalDate();
        const doc = loadDocumentData();
        if (!doc) { showError('No document data available.'); return; }
        
        var pdfSrc = null;
        
        if (doc.pdfData) {
            pdfSrc = 'data:application/pdf;base64,' + doc.pdfData;
        }
        else if (doc.pdfUrl) {
            pdfSrc = doc.pdfUrl;
        }
        else {
            var defaultTemplate = sessionStorage.getItem('DEFAULT_PDF_TEMPLATE');
            if (defaultTemplate && defaultTemplate.length > 100) {
                pdfSrc = 'data:application/pdf;base64,' + defaultTemplate;
                console.log('Using default PDF template from sessionStorage');
            }
        }
        
        if (pdfSrc) {
            loadPDF(pdfSrc);
        } else {
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