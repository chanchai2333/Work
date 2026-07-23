/**
 * editpdf.js - PDF 编辑页面（修复坐标同步和右半部分问题）
 * 统一使用 pdfCanvas 的边界计算所有坐标，确保一致性
 */
(function() {
    'use strict';

    // ---------- 全局变量 ----------
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

    // ---------- 核心渲染函数 ----------
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
            page.render(renderContext);
            
            currentPageSpan.textContent = pageNum;
            currentPage = pageNum;
            
            redrawAnnotations();
            renderTextAnnotations();
            if (container) {
                container.scrollTop = 0;
                container.scrollLeft = 0;
            }
            requestAnimationFrame(() => {
                updateTextPositions();
            });
            
            updateZoomLevel();
        });
    }

    function updateZoomLevel() {
        if (zoomLevelSpan) zoomLevelSpan.textContent = Math.round(scale * 100) + '%';
    }

    // ---------- 获取 pdfCanvas 相对于 container 的偏移（统一使用 getBoundingClientRect） ----------
    function getCanvasOffset() {
        if (!canvas || !container) return { offsetX: 0, offsetY: 0 };
        const canvasRect = canvas.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        return {
            offsetX: canvasRect.left - containerRect.left,
            offsetY: canvasRect.top - containerRect.top
        };
    }

    // ---------- 文本框位置更新 ----------
    function updateTextPositions() {
        const { offsetX, offsetY } = getCanvasOffset();
        const scrollLeft = container ? container.scrollLeft : 0;
        const scrollTop = container ? container.scrollTop : 0;
        
        textBoxElements.forEach(el => {
            const id = el.dataset.id;
            const anno = annotations.find(a => a._id == id);
            if (!anno) return;
            // 位置 = 原始坐标 * scale + offset - 滚动
            el.style.left = (anno.x * scale + offsetX - scrollLeft) + 'px';
            el.style.top = (anno.y * scale + offsetY - scrollTop) + 'px';
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

    // ---------- 标注绘制 ----------
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
                if (anno.points && anno.points.length > 1) {
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

    // ---------- 坐标转换（使用 pdfCanvas 边界，返回物理像素） ----------
    function getCanvasCoords(e) {
        let clientX, clientY;
        if (e.touches && e.touches.length > 0) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }

        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        let x = (clientX - rect.left) * scaleX;
        let y = (clientY - rect.top) * scaleY;
        x = Math.min(Math.max(0, x), canvas.width);
        y = Math.min(Math.max(0, y), canvas.height);
        return { x, y };
    }

    // ---------- 检测点是否在绘制注释内 ----------
    function hitTestAnnotation(anno, px, py) {
        const s = scale * renderScale;
        const tolerance = 10 * renderScale / s;
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
        const { offsetX, offsetY } = getCanvasOffset();
        
        let visualX = e.clientX - containerRect.left + container.scrollLeft - dragStartX;
        let visualY = e.clientY - containerRect.top + container.scrollTop - dragStartY;
        
        let newRawX = (visualX - offsetX) / scale;
        let newRawY = (visualY - offsetY) / scale;
        newRawX = Math.max(0, newRawX);
        newRawY = Math.max(0, newRawY);
        
        const el = textBoxElements.find(el => el.dataset.id == draggedAnnotationId);
        if (el) {
            el.style.left = (newRawX * scale + offsetX - container.scrollLeft) + 'px';
            el.style.top = (newRawY * scale + offsetY - container.scrollTop) + 'px';
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
                    const left = parseFloat(el.style.left) + container.scrollLeft - offsetX;
                    const top = parseFloat(el.style.top) + container.scrollTop - offsetY;
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