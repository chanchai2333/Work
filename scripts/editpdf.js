/**
 * editpdf.js - PDF 编辑页面（坐标统一存储原始值，缩放精确跟随）
 * 修复内容：
 *  1. 高亮/印章坐标存储为原始坐标（除以 scale），避免缩放后错位。
 *  2. 所有注释绘制时按当前 scale 渲染。
 *  3. 文本拖动时考虑容器滚动偏移量。
 *  4. 高亮颜色跟随颜色选择器（不再硬编码黄色）。
 *  5. 优化缩放、适应宽度等功能。
 */
(function() {
    'use strict';

    // ---------- 全局变量 ----------
    let pdfDoc = null;
    let currentPage = 1;
    let scale = 1.0;
    let totalPages = 0;
    let currentTool = 'text';
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
    
    let currentColor = '#3498db';
    let currentSize = 3;
    let currentOpacity = 100;
    let currentStrokePoints = [];
    let isDraggingText = false;
    let dragStartX = 0, dragStartY = 0;
    let draggedAnnotationId = null;

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
            // 设置 canvas 像素尺寸
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            drawCanvas.width = viewport.width;
            drawCanvas.height = viewport.height;
            // 设置 CSS 尺寸（与像素一致）
            canvas.style.width = viewport.width + 'px';
            canvas.style.height = viewport.height + 'px';
            drawCanvas.style.width = viewport.width + 'px';
            drawCanvas.style.height = viewport.height + 'px';
            
            // 渲染 PDF
            const renderContext = { canvasContext: ctx, viewport: viewport };
            page.render(renderContext);
            
            // 重绘非文本标注
            redrawAnnotations();
            // 重新创建文本框（同步位置）
            renderTextAnnotations();
            
            currentPageSpan.textContent = pageNum;
            currentPage = pageNum;
            updateZoomLevel();
            if (container) container.scrollTop = 0;
        });
    }

    function updateZoomLevel() {
        if (zoomLevelSpan) zoomLevelSpan.textContent = Math.round(scale * 100) + '%';
    }

    // ---------- 标注绘制（高亮/印章）-- 所有坐标使用原始值 * 当前 scale ----------
    function redrawAnnotations() {
        if (!drawCtx) return;
        drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
        annotations.forEach(anno => {
            if (anno.type === 'text') return; // 文本由 DOM 渲染
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
                    ctx.beginPath();
                    const first = anno.points[0];
                    ctx.moveTo(first.x * scale, first.y * scale);
                    for (let i = 1; i < anno.points.length; i++) {
                        ctx.lineTo(anno.points[i].x * scale, anno.points[i].y * scale);
                    }
                    ctx.stroke();
                }
                break;
            case 'stamp':
                // 字体大小也按比例缩放
                ctx.font = `${anno.size * 8 * scale}px Arial`;
                ctx.fillText(anno.text || '✓', anno.x * scale, anno.y * scale);
                break;
        }
        ctx.restore();
    }

    // ---------- 文本框 DOM 管理 ----------
    function renderTextAnnotations() {
        // 清除旧的文本框
        textBoxElements.forEach(el => { if (el.parentNode) el.parentNode.removeChild(el); });
        textBoxElements = [];
        
        const textAnnos = annotations.filter(a => a.type === 'text');
        textAnnos.forEach(anno => {
            const el = createTextBoxElement(anno);
            container.appendChild(el);
            textBoxElements.push(el);
        });
        selectedAnnotationId = null;
    }

    function createTextBoxElement(anno) {
        const el = document.createElement('div');
        el.className = 'text-annotation';
        el.dataset.id = anno._id;
        
        // 缩放后的位置和字体大小（原始坐标 * scale）
        const scaledX = anno.x * scale;
        const scaledY = anno.y * scale;
        const scaledFontSize = anno.size * 4 * scale;
        el.style.left = scaledX + 'px';
        el.style.top = scaledY + 'px';
        el.style.fontSize = scaledFontSize + 'px';
        el.style.color = anno.color;
        el.style.opacity = (anno.opacity || 100) / 100;
        el.textContent = anno.text || '';
        el.contentEditable = false;
        el.draggable = false;
        
        // 删除按钮
        const delBtn = document.createElement('button');
        delBtn.className = 'delete-btn';
        delBtn.innerHTML = '×';
        delBtn.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            deleteAnnotation(anno._id);
        });
        el.appendChild(delBtn);
        
        // 双击编辑（仅文本工具）
        el.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            if (currentTool === 'text') {
                el.contentEditable = true;
                el.classList.add('editing');
                el.focus();
                const range = document.createRange();
                range.selectNodeContents(el);
                const sel = window.getSelection();
                sel.removeAllRanges();
                sel.addRange(range);
            }
        });
        
        // 失去焦点保存
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
        
        // 鼠标拖动
        el.addEventListener('mousedown', (e) => {
            if (e.target === delBtn) return;
            if (el.contentEditable === 'true') return;
            e.preventDefault();
            isDraggingText = true;
            draggedAnnotationId = anno._id;
            const rect = el.getBoundingClientRect();
            dragStartX = e.clientX - rect.left;
            dragStartY = e.clientY - rect.top;
            selectedAnnotationId = anno._id;
            highlightSelected();
        });
        
        el.addEventListener('click', (e) => {
            if (e.target === delBtn) return;
            if (el.contentEditable === 'true') return;
            selectedAnnotationId = anno._id;
            highlightSelected();
        });
        
        return el;
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

    // ---------- 标注操作 ----------
    function deleteAnnotation(id) {
        const idx = annotations.findIndex(a => a._id === id);
        if (idx === -1) return;
        saveHistory();
        annotations.splice(idx, 1);
        if (selectedAnnotationId === id) selectedAnnotationId = null;
        redrawAnnotations();
        renderTextAnnotations();
    }

    function undo() {
        if (history.length === 0) return;
        annotations = history.pop();
        selectedAnnotationId = null;
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
        deleteAnnotation(selectedAnnotationId);
    }

    // ---------- 鼠标坐标转换（返回 drawCanvas 上的像素坐标）----------
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

    // ---------- 鼠标拖拽移动（更新原始坐标，考虑容器滚动）----------
    document.addEventListener('mousemove', (e) => {
        if (!isDraggingText || draggedAnnotationId === null) return;
        const anno = annotations.find(a => a._id === draggedAnnotationId);
        if (!anno) return;
        const containerRect = container.getBoundingClientRect();
        // 计算在容器中的像素位置（加上滚动偏移）
        let newLeft = e.clientX - containerRect.left + container.scrollLeft - dragStartX;
        let newTop = e.clientY - containerRect.top + container.scrollTop - dragStartY;
        // 限制在容器内
        const maxLeft = drawCanvas.width - 20;
        const maxTop = drawCanvas.height - 20;
        newLeft = Math.max(0, Math.min(newLeft, maxLeft));
        newTop = Math.max(0, Math.min(newTop, maxTop));
        // 实时更新 DOM
        const el = textBoxElements.find(el => el.dataset.id == draggedAnnotationId);
        if (el) {
            el.style.left = newLeft + 'px';
            el.style.top = newTop + 'px';
        }
    });

    document.addEventListener('mouseup', () => {
        if (isDraggingText) {
            isDraggingText = false;
            const anno = annotations.find(a => a._id === draggedAnnotationId);
            if (anno) {
                const el = textBoxElements.find(el => el.dataset.id == draggedAnnotationId);
                if (el) {
                    const left = parseFloat(el.style.left);
                    const top = parseFloat(el.style.top);
                    // 转换为原始坐标（除以 scale）
                    anno.x = left / scale;
                    anno.y = top / scale;
                    saveHistory();
                }
            }
            draggedAnnotationId = null;
        }
    });

    // ---------- 画布点击：创建新文本 / 高亮 / 印章 ----------
    function startDrawing(e) {
        if (currentTool === 'text') {
            e.preventDefault();
            const pos = getCanvasCoords(e);
            // 检查点击位置是否在现有文本框上
            const clickedEl = document.elementFromPoint(e.clientX, e.clientY);
            if (clickedEl && clickedEl.closest && clickedEl.closest('.text-annotation')) {
                return;
            }
            // 原始坐标 = 像素坐标 / scale
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
                _id: Date.now() + Math.random()
            };
            saveHistory();
            annotations.push(newAnno);
            redrawAnnotations();
            renderTextAnnotations();
            // 自动进入编辑模式
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
        
        // 高亮/印章（非文本工具）
        if (currentTool === 'select') return;
        e.preventDefault();
        isDrawing = true;
        const pos = getCanvasCoords(e);
        lastX = pos.x; lastY = pos.y;
        startX = pos.x; startY = pos.y;
        // 存储原始坐标（除以 scale）
        currentStrokePoints = [{x: pos.x / scale, y: pos.y / scale}];
        if (currentTool === 'highlight') {
            drawCtx.beginPath();
            drawCtx.moveTo(pos.x, pos.y);
            drawCtx.lineCap = 'round';
            drawCtx.lineJoin = 'round';
            drawCtx.strokeStyle = currentColor; // 使用用户选择的颜色
            drawCtx.lineWidth = currentSize * 3;
            drawCtx.globalAlpha = currentOpacity / 100 * 0.5; // 半透明预览
            drawCtx.lineTo(pos.x, pos.y);
            drawCtx.stroke();
        }
    }

    function draw(e) {
        if (currentTool === 'text' || currentTool === 'select') return;
        if (!isDrawing) return;
        e.preventDefault();
        const pos = getCanvasCoords(e);
        if (currentTool === 'highlight') {
            drawCtx.lineTo(pos.x, pos.y);
            drawCtx.stroke();
            // 记录原始坐标点
            currentStrokePoints.push({x: pos.x / scale, y: pos.y / scale});
        }
        lastX = pos.x; lastY = pos.y;
    }

    function stopDrawing(e) {
        if (currentTool === 'text' || currentTool === 'select') return;
        if (!isDrawing) return;
        isDrawing = false;
        const pos = e ? getCanvasCoords(e) : {x: lastX, y: lastY};
        let annotation = null;
        if (currentTool === 'highlight') {
            if (currentStrokePoints.length > 1) {
                annotation = {
                    type: 'highlight',
                    color: currentColor,        // 使用颜色选择器
                    size: currentSize * 3,
                    opacity: currentOpacity,
                    points: currentStrokePoints.slice(), // 已是原始坐标
                    _id: Date.now() + Math.random()
                };
            }
        } else if (currentTool === 'stamp') {
            const stampText = prompt('Enter stamp text (e.g., APPROVED):', '✓');
            if (stampText) {
                annotation = {
                    type: 'stamp',
                    color: currentColor,
                    size: currentSize,
                    opacity: currentOpacity,
                    x: startX / scale,   // 原始坐标
                    y: startY / scale,
                    text: stampText,
                    _id: Date.now() + Math.random()
                };
                // 临时绘制印章预览（不存储，redrawAnnotations 后会重绘）
            }
        }
        if (annotation) {
            saveHistory();
            annotations.push(annotation);
            redrawAnnotations();
        }
        // 重置路径和临时点
        drawCtx.beginPath();
        currentStrokePoints = [];
    }

    // ---------- 工具切换 ----------
    function setupTools() {
        const toolBtns = document.querySelectorAll('.tool-btn');
        toolBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                toolBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentTool = btn.dataset.tool;
                drawCanvas.style.cursor = currentTool === 'select' ? 'default' : 'crosshair';
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

    // ---------- 页面导航和缩放 ----------
    function setupNavigation() {
        document.getElementById('prev-page')?.addEventListener('click', () => {
            if (pdfDoc && currentPage > 1) renderPage(currentPage - 1);
        });
        document.getElementById('next-page')?.addEventListener('click', () => {
            if (pdfDoc && currentPage < pdfDoc.numPages) renderPage(currentPage + 1);
        });
        document.getElementById('zoom-in')?.addEventListener('click', () => {
            scale = Math.min(scale + 0.3, 3.0);
            if (pdfDoc) renderPage(currentPage);
            updateZoomLevel();
        });
        document.getElementById('zoom-out')?.addEventListener('click', () => {
            scale = Math.max(scale - 0.3, 0.3);
            if (pdfDoc) renderPage(currentPage);
            updateZoomLevel();
        });
        
        // fit-width：基于页面原始宽度
        document.getElementById('fit-width')?.addEventListener('click', () => {
            if (!pdfDoc || !container) return;
            pdfDoc.getPage(currentPage).then(page => {
                const viewport = page.getViewport({ scale: 1 });
                const originalWidth = viewport.width;
                const containerWidth = container.clientWidth - 20; // 减去一些内边距
                if (containerWidth > 0 && originalWidth > 0) {
                    scale = containerWidth / originalWidth;
                    renderPage(currentPage);
                    updateZoomLevel();
                }
            });
        });
        
        // fit-page：基于页面原始宽高
        document.getElementById('fit-page')?.addEventListener('click', () => {
            if (!pdfDoc || !container) return;
            pdfDoc.getPage(currentPage).then(page => {
                const viewport = page.getViewport({ scale: 1 });
                const containerWidth = container.clientWidth - 20;
                const containerHeight = container.clientHeight - 20;
                const scaleX = containerWidth / viewport.width;
                const scaleY = containerHeight / viewport.height;
                const newScale = Math.min(scaleX, scaleY);
                if (newScale > 0.1) {
                    scale = newScale;
                    renderPage(currentPage);
                    updateZoomLevel();
                }
            });
        });
    }

    // ---------- 保存/取消/返回 ----------
    function saveChanges() {
        if (!currentDoc) { alert('No document to save.'); return; }
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
        alert('Annotations saved successfully!');
        window.location.href = 'sitediary.html';
    }
    function cancelEditing() {
        if (confirm('Cancel editing? All unsaved changes will be lost.')) window.location.href = 'sitediary.html';
    }
    function goBack() { window.location.href = 'sitediary.html'; }

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
        saveHistory(); // 保存初始状态
    });
})();