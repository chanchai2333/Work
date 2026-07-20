/**
 * editpdf.js - PDF 编辑页面（移除 Underline/Strikeout）
 * 保留：Select、Text、Highlight、矩形、椭圆、箭头、线条
 */
(function() {
    'use strict';

    // ---------- 全局变量 ----------
    let pdfDoc = null;
    let currentPage = 1;
    let scale = 1.0;
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
    
    let currentColor = '#3498db';
    let currentSize = 3;
    let currentOpacity = 100;
    let currentStrokePoints = [];
    let isDraggingText = false;
    let dragStartX = 0, dragStartY = 0;
    let draggedAnnotationId = null;

    // 拖拽绘制注释
    let isDraggingAnnotation = false;
    let dragAnnoStartX = 0, dragAnnoStartY = 0;
    let draggedAnnoId = null;
    let dragAnnoOffsetX = 0, dragAnnoOffsetY = 0;

    // ---------- 辅助函数 ----------
    function syncGlobalDate() {
        const storedDate = sessionStorage.getItem('globalDate');
        const dateSpan = document.querySelector('.date-display span');
        if (storedDate && dateSpan) dateSpan.textContent = storedDate;
        else if (dateSpan) dateSpan.textContent = new Date().toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' });
    }

    function loadDocumentData() {
        const editDocStr = sessionStorage.getItem('editDocument');
        if (!editDocStr) return null;
        try {
            const doc = JSON.parse(editDocStr);
            currentDoc = doc;
            document.getElementById('docId').textContent = doc.id || 'N/A';
            document.getElementById('docSite').textContent = doc.site || 'N/A';
            document.getElementById('docDate').textContent = doc.date || 'N/A';
            document.getElementById('docSubmittedBy').textContent = doc.submittedBy || 'N/A';
            document.getElementById('docTitle').textContent = doc.site ? `${doc.site} - ${doc.type || 'Diary'}` : 'Edit Document';
            annotations = doc.annotations || [];
            annotations.forEach((a, idx) => a._id = a._id || Date.now() + idx);
            return doc;
        } catch(e) { console.error(e); return null; }
    }

    function showError(msg) {
        if (container) container.innerHTML = `<div style="text-align:center;padding:40px;color:#e74c3c;"><i class="fas fa-exclamation-circle"></i> ${msg}</div>`;
    }

    // ---------- PDF 加载 ----------
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
            console.error('PDF加载失败:', err);
            showError('Failed to load PDF. You can still add annotations.');
            canvas.style.display = 'none';
            drawCanvas.style.display = 'block';
            drawCanvas.width = 800;
            drawCanvas.height = 1000;
            drawCtx.fillStyle = '#ffffff';
            drawCtx.fillRect(0, 0, 800, 1000);
            drawCtx.fillStyle = '#666';
            drawCtx.font = '20px Arial';
            drawCtx.fillText('PDF could not be loaded. You can still annotate.', 30, 100);
        });
    }

    // ---------- 核心渲染函数 ----------
    function renderPage(pageNum) {
        if (!pdfDoc) {
            drawCanvas.width = 800; drawCanvas.height = 1000;
            drawCtx.fillStyle = '#ffffff'; drawCtx.fillRect(0,0,800,1000);
            updateZoomLevel();
            renderTextAnnotations();
            return;
        }
        pdfDoc.getPage(pageNum).then(page => {
            const viewport = page.getViewport({ scale: scale });
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            drawCanvas.width = viewport.width;
            drawCanvas.height = viewport.height;
            canvas.style.width = viewport.width + 'px';
            canvas.style.height = viewport.height + 'px';
            drawCanvas.style.width = viewport.width + 'px';
            drawCanvas.style.height = viewport.height + 'px';
            
            const renderContext = { canvasContext: ctx, viewport: viewport };
            page.render(renderContext);
            
            redrawAnnotations();
            renderTextAnnotations();
            if (container) {
                container.scrollTop = 0;
                container.scrollLeft = 0;
            }
            requestAnimationFrame(() => {
                updateTextPositions();
            });
            
            currentPageSpan.textContent = pageNum;
            currentPage = pageNum;
            updateZoomLevel();
        });
    }

    function updateZoomLevel() {
        if (zoomLevelSpan) zoomLevelSpan.textContent = Math.round(scale * 100) + '%';
    }

    // ---------- 文本框位置更新 ----------
    function updateTextPositions() {
        const scrollLeft = container ? container.scrollLeft : 0;
        const scrollTop = container ? container.scrollTop : 0;
        
        textBoxElements.forEach(el => {
            const id = el.dataset.id;
            const anno = annotations.find(a => a._id == id);
            if (!anno) return;
            el.style.left = (anno.x * scale - scrollLeft) + 'px';
            el.style.top = (anno.y * scale - scrollTop) + 'px';
            el.style.fontSize = (anno.size * 4 * scale) + 'px';
        });
    }

    function renderTextAnnotations() {
        textBoxElements.forEach(el => { if (el.parentNode) el.parentNode.removeChild(el); });
        textBoxElements = [];
        
        const textAnnos = annotations.filter(a => a.type === 'text');
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

    // ---------- 锁定/解锁 ----------
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

    // ---------- 标注绘制（移除 underline/strikeout） ----------
    function redrawAnnotations() {
        if (!drawCtx) return;
        drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
        annotations.forEach(anno => {
            if (anno.type === 'text') return;
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
        ctx.lineWidth = anno.size || 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        switch (anno.type) {
            case 'highlight':
                if (anno.points && anno.points.length > 1) {
                    ctx.globalAlpha = (anno.opacity || 100) / 100 * 0.4;
                    ctx.beginPath();
                    const first = anno.points[0];
                    ctx.moveTo(first.x * scale, first.y * scale);
                    for (let i = 1; i < anno.points.length; i++) {
                        ctx.lineTo(anno.points[i].x * scale, anno.points[i].y * scale);
                    }
                    ctx.stroke();
                }
                break;
            case 'rectangle':
                if (anno.startX !== undefined && anno.endX !== undefined) {
                    const x = Math.min(anno.startX, anno.endX) * scale;
                    const y = Math.min(anno.startY, anno.endY) * scale;
                    const w = Math.abs(anno.endX - anno.startX) * scale;
                    const h = Math.abs(anno.endY - anno.startY) * scale;
                    ctx.strokeRect(x, y, w, h);
                }
                break;
            case 'ellipse':
                if (anno.startX !== undefined && anno.endX !== undefined) {
                    const cx = (anno.startX + anno.endX) / 2 * scale;
                    const cy = (anno.startY + anno.endY) / 2 * scale;
                    const rx = Math.abs(anno.endX - anno.startX) / 2 * scale;
                    const ry = Math.abs(anno.endY - anno.startY) / 2 * scale;
                    ctx.beginPath();
                    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
                    ctx.stroke();
                }
                break;
            case 'arrow':
                if (anno.startX !== undefined && anno.endX !== undefined) {
                    const fromX = anno.startX * scale;
                    const fromY = anno.startY * scale;
                    const toX = anno.endX * scale;
                    const toY = anno.endY * scale;
                    ctx.beginPath();
                    ctx.moveTo(fromX, fromY);
                    ctx.lineTo(toX, toY);
                    ctx.stroke();
                    const angle = Math.atan2(toY - fromY, toX - fromX);
                    const headLen = 10 * scale / 2;
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
                    ctx.moveTo(anno.startX * scale, anno.startY * scale);
                    ctx.lineTo(anno.endX * scale, anno.endY * scale);
                    ctx.stroke();
                }
                break;
        }
        ctx.restore();
    }

    // ---------- 标注操作 ----------
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

    // ---------- 鼠标坐标转换 ----------
    function getCanvasCoords(e) {
        const rect = drawCanvas.getBoundingClientRect();
        const scaleX = drawCanvas.width / rect.width;
        const scaleY = drawCanvas.height / rect.height;
        let clientX, clientY;
        if (e.touches) { clientX = e.touches[0].clientX; clientY = e.touches[0].clientY; }
        else { clientX = e.clientX; clientY = e.clientY; }
        let x = (clientX - rect.left) * scaleX;
        let y = (clientY - rect.top) * scaleY;
        x = Math.min(Math.max(0, x), drawCanvas.width);
        y = Math.min(Math.max(0, y), drawCanvas.height);
        return { x, y };
    }

    // ---------- 检测点是否在绘制注释内 ----------
    function hitTestAnnotation(anno, px, py) {
        const tolerance = 10 / scale;
        switch (anno.type) {
            case 'highlight':
                if (anno.points && anno.points.length > 1) {
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

    // ---------- 拖拽绘制注释 ----------
    function startDragAnnotation(e) {
        if (currentTool !== 'select') return;
        const pos = getCanvasCoords(e);
        const rawX = pos.x / scale;
        const rawY = pos.y / scale;
        for (let i = annotations.length - 1; i >= 0; i--) {
            const anno = annotations[i];
            if (anno.type === 'text' || anno.locked) continue;
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
        const rawX = pos.x / scale;
        const rawY = pos.y / scale;
        const anno = annotations.find(a => a._id === draggedAnnoId);
        if (!anno || anno.locked) return;

        const deltaX = rawX - (anno.startX !== undefined ? anno.startX : anno.points[0].x) - dragAnnoOffsetX;
        const deltaY = rawY - (anno.startY !== undefined ? anno.startY : anno.points[0].y) - dragAnnoOffsetY;

        if (anno.points) {
            anno.points.forEach(p => { p.x += deltaX; p.y += deltaY; });
        } else if (anno.startX !== undefined) {
            anno.startX += deltaX;
            anno.startY += deltaY;
            anno.endX += deltaX;
            anno.endY += deltaY;
        }
        if (anno.points) {
            dragAnnoOffsetX += deltaX;
            dragAnnoOffsetY += deltaY;
        } else {
            dragAnnoOffsetX += deltaX;
            dragAnnoOffsetY += deltaY;
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

    // ---------- 鼠标拖拽文本框 ----------
    document.addEventListener('mousemove', (e) => {
        if (!isDraggingText || draggedAnnotationId === null) return;
        const anno = annotations.find(a => a._id === draggedAnnotationId);
        if (!anno || anno.locked) return;
        const containerRect = container.getBoundingClientRect();
        let visualX = e.clientX - containerRect.left + container.scrollLeft - dragStartX;
        let visualY = e.clientY - containerRect.top + container.scrollTop - dragStartY;
        let newRawX = visualX / scale;
        let newRawY = visualY / scale;
        newRawX = Math.max(0, Math.min(newRawX, (drawCanvas.width / scale) - 20));
        newRawY = Math.max(0, Math.min(newRawY, (drawCanvas.height / scale) - 20));
        
        const el = textBoxElements.find(el => el.dataset.id == draggedAnnotationId);
        if (el) {
            el.style.left = (newRawX * scale - container.scrollLeft) + 'px';
            el.style.top = (newRawY * scale - container.scrollTop) + 'px';
        }
    });

    document.addEventListener('mouseup', () => {
        if (isDraggingText) {
            isDraggingText = false;
            const anno = annotations.find(a => a._id === draggedAnnotationId);
            if (anno && !anno.locked) {
                const el = textBoxElements.find(el => el.dataset.id == draggedAnnotationId);
                if (el) {
                    const left = parseFloat(el.style.left) + container.scrollLeft;
                    const top = parseFloat(el.style.top) + container.scrollTop;
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

    // ---------- 绘制事件 ----------
    function startDrawing(e) {
        if (currentTool === 'select') {
            startDragAnnotation(e);
            return;
        }

        if (currentTool === 'text') {
            e.preventDefault();
            const pos = getCanvasCoords(e);
            const clickedEl = document.elementFromPoint(e.clientX, e.clientY);
            if (clickedEl && clickedEl.closest && clickedEl.closest('.text-annotation')) return;
            
            const rawX = pos.x / scale;
            const rawY = pos.y / scale;
            const newAnno = {
                type: 'text',
                color: currentColor,
                size: currentSize,
                opacity: currentOpacity,
                x: rawX,
                y: rawY,
                text: 'Click to edit',
                locked: false,
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
        
        // 高亮 - 自由绘制
        if (currentTool === 'highlight') {
            e.preventDefault();
            isDrawing = true;
            const pos = getCanvasCoords(e);
            lastX = pos.x; lastY = pos.y;
            startX = pos.x; startY = pos.y;
            currentStrokePoints = [{x: pos.x / scale, y: pos.y / scale}];
            
            drawCtx.beginPath();
            drawCtx.moveTo(pos.x, pos.y);
            drawCtx.lineCap = 'round';
            drawCtx.lineJoin = 'round';
            drawCtx.strokeStyle = currentColor;
            drawCtx.lineWidth = currentSize * 3;
            drawCtx.globalAlpha = currentOpacity / 100 * 0.4;
            drawCtx.lineTo(pos.x, pos.y);
            drawCtx.stroke();
            return;
        }
        
        // 矩形、椭圆、箭头、线条 - 拖拽绘制
        if (currentTool === 'rectangle' || currentTool === 'ellipse' || currentTool === 'arrow' || currentTool === 'line') {
            e.preventDefault();
            isDrawing = true;
            const pos = getCanvasCoords(e);
            startX = pos.x / scale;
            startY = pos.y / scale;
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
        
        // 高亮 - 自由绘制
        if (currentTool === 'highlight') {
            drawCtx.lineTo(pos.x, pos.y);
            drawCtx.stroke();
            currentStrokePoints.push({x: pos.x / scale, y: pos.y / scale});
        }
        
        // 拖拽绘制类 - 实时预览
        if (currentTool === 'rectangle' || currentTool === 'ellipse' || currentTool === 'arrow' || currentTool === 'line') {
            redrawAnnotations();
            drawCtx.save();
            drawCtx.globalAlpha = currentOpacity / 100;
            drawCtx.strokeStyle = currentColor;
            drawCtx.lineWidth = currentSize;
            drawCtx.lineCap = 'round';
            drawCtx.lineJoin = 'round';
            
            const endX = pos.x / scale;
            const endY = pos.y / scale;
            
            switch (currentTool) {
                case 'rectangle':
                    const rx = Math.min(startX, endX) * scale;
                    const ry = Math.min(startY, endY) * scale;
                    const rw = Math.abs(endX - startX) * scale;
                    const rh = Math.abs(endY - startY) * scale;
                    drawCtx.strokeRect(rx, ry, rw, rh);
                    break;
                case 'ellipse':
                    const cx = (startX + endX) / 2 * scale;
                    const cy = (startY + endY) / 2 * scale;
                    const rx2 = Math.abs(endX - startX) / 2 * scale;
                    const ry2 = Math.abs(endY - startY) / 2 * scale;
                    drawCtx.beginPath();
                    drawCtx.ellipse(cx, cy, rx2, ry2, 0, 0, Math.PI * 2);
                    drawCtx.stroke();
                    break;
                case 'arrow':
                    const fromX = startX * scale;
                    const fromY = startY * scale;
                    const toX = endX * scale;
                    const toY = endY * scale;
                    drawCtx.beginPath();
                    drawCtx.moveTo(fromX, fromY);
                    drawCtx.lineTo(toX, toY);
                    drawCtx.stroke();
                    const angle = Math.atan2(toY - fromY, toX - fromX);
                    const headLen = 10 * scale / 2;
                    drawCtx.beginPath();
                    drawCtx.moveTo(toX, toY);
                    drawCtx.lineTo(toX - headLen * Math.cos(angle - 0.5), toY - headLen * Math.sin(angle - 0.5));
                    drawCtx.moveTo(toX, toY);
                    drawCtx.lineTo(toX - headLen * Math.cos(angle + 0.5), toY - headLen * Math.sin(angle + 0.5));
                    drawCtx.stroke();
                    break;
                case 'line':
                    drawCtx.beginPath();
                    drawCtx.moveTo(startX * scale, startY * scale);
                    drawCtx.lineTo(endX * scale, endY * scale);
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
        
        // 高亮 - 自由绘制
        if (currentTool === 'highlight') {
            if (currentStrokePoints.length > 1) {
                annotation = {
                    type: 'highlight',
                    color: currentColor,
                    size: currentSize * 3,
                    opacity: currentOpacity,
                    points: currentStrokePoints.slice(),
                    _id: Date.now() + Math.random()
                };
            }
            drawCtx.beginPath();
            currentStrokePoints = [];
        }
        
        // 拖拽绘制类
        if (currentTool === 'rectangle' || currentTool === 'ellipse' || currentTool === 'arrow' || currentTool === 'line') {
            const endX = pos.x / scale;
            const endY = pos.y / scale;
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
                    _id: Date.now() + Math.random()
                };
            }
        }
        
        if (annotation) {
            saveHistory();
            annotations.push(annotation);
            redrawAnnotations();
        }
    }

    // ---------- 工具切换 ----------
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

    // ---------- 导航 ----------
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
        alert('✅ Annotations saved successfully!');
    }

    function cancelEditing() {
        if (confirm('Cancel editing? All unsaved changes will be lost.')) {
            window.location.href = 'sitediary.html';
        }
    }

    function goBack() {
        window.location.href = 'sitediary.html';
    }

    // ---------- 绑定事件 ----------
    function bindDrawingEvents() {
        if (!drawCanvas) return;
        drawCanvas.addEventListener('mousedown', startDrawing);
        drawCanvas.addEventListener('mousemove', draw);
        drawCanvas.addEventListener('mouseup', stopDrawing);
        drawCanvas.addEventListener('mouseleave', stopDrawing);
        drawCanvas.addEventListener('touchstart', startDrawing);
        drawCanvas.addEventListener('touchmove', draw);
        drawCanvas.addEventListener('touchend', stopDrawing);
    }

    function bindActionButtons() {
        document.getElementById('save-btn')?.addEventListener('click', saveChanges);
        document.getElementById('cancel-btn')?.addEventListener('click', cancelEditing);
        document.getElementById('back-btn')?.addEventListener('click', goBack);
        document.getElementById('undo-btn')?.addEventListener('click', undo);
        document.getElementById('delete-selected-btn')?.addEventListener('click', deleteSelected);
        if (lockBtn) lockBtn.addEventListener('click', toggleLock);
    }

    // ---------- 初始化 ----------
    document.addEventListener('DOMContentLoaded', () => {
        syncGlobalDate();
        const doc = loadDocumentData();
        if (!doc) { showError('No document data available.'); return; }
        let pdfSrc = doc.pdfData ? 'data:application/pdf;base64,' + doc.pdfData : (doc.pdfUrl || null);
        if (pdfSrc) loadPDF(pdfSrc);
        else {
            canvas.style.display = 'none';
            drawCanvas.style.display = 'block';
            drawCanvas.width = 800;
            drawCanvas.height = 1000;
            drawCtx.fillStyle = '#ffffff';
            drawCtx.fillRect(0, 0, 800, 1000);
            drawCtx.fillStyle = '#666';
            drawCtx.font = '20px Arial';
            drawCtx.fillText('No PDF attached. You can still add annotations.', 30, 100);
        }
        setupTools();
        bindDrawingEvents();
        setupNavigation();
        bindActionButtons();
        history = [];
        saveHistory();
        updateLockButtonState();
    });
})();