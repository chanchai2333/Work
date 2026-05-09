/**
 * editpdf.js - PDF 编辑页面逻辑 + 绘图工具
 */
(function() {
    // ---------- 全局变量 ----------
    let pdfDoc = null;
    let currentPage = 1;
    let scale = 1.5;
    let currentTool = 'select';
    let isDrawing = false;
    let lastX = 0, lastY = 0;
    let startX = 0, startY = 0; // 用于矩形/形状
    let annotations = [];        // 存储所有绘制内容（简单存储）
    
    // DOM 元素
    const canvas = document.getElementById('pdf-canvas');
    const drawCanvas = document.getElementById('draw-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    const drawCtx = drawCanvas ? drawCanvas.getContext('2d') : null;
    const colorPicker = document.getElementById('color-picker');
    const sizeSlider = document.getElementById('size-slider');
    const sizeValue = document.getElementById('size-value');
    const opacitySlider = document.getElementById('opacity-slider');
    const opacityValue = document.getElementById('opacity-value');
    const currentPageSpan = document.getElementById('current-page');
    const totalPagesSpan = document.getElementById('total-pages');
    
    // 当前工具参数
    let currentColor = '#3498db';
    let currentSize = 3;
    let currentOpacity = 100; // 百分比
    
    // ---------- 同步全局日期 ----------
    function syncGlobalDate() {
        const storedDate = sessionStorage.getItem('globalDate');
        const dateSpan = document.querySelector('.date-display span');
        if (storedDate && dateSpan) {
            dateSpan.textContent = storedDate;
        } else {
            const today = new Date();
            const options = { year: 'numeric', month: 'long', day: 'numeric' };
            if (dateSpan) dateSpan.textContent = today.toLocaleDateString('en-US', options);
        }
    }
    
    // ---------- 加载文档元数据 ----------
    function loadDocumentData() {
        const editDocStr = sessionStorage.getItem('editDocument');
        if (!editDocStr) {
            console.warn('No editDocument data');
            return null;
        }
        try {
            const doc = JSON.parse(editDocStr);
            document.getElementById('docId').textContent = doc.id || 'N/A';
            document.getElementById('docSite').textContent = doc.site || 'N/A';
            document.getElementById('docDate').textContent = doc.date || 'N/A';
            document.getElementById('docSubmittedBy').textContent = doc.submittedBy || 'N/A';
            document.getElementById('docTitle').textContent = doc.site ? `${doc.site} - ${doc.type || 'Diary'}` : 'Edit Document';
            return doc;
        } catch (e) {
            console.error(e);
            return null;
        }
    }
    
    // ---------- PDF 加载和渲染 (使用PDF.js) ----------
    function loadPDF(url) {
        const loadingTask = pdfjsLib.getDocument(url);
        loadingTask.promise.then(pdf => {
            pdfDoc = pdf;
            totalPagesSpan.textContent = pdf.numPages;
            renderPage(currentPage);
        }).catch(err => {
            console.error('PDF加载失败:', err);
            // 如果没有PDF文件，显示提示
            canvas.style.display = 'none';
            drawCanvas.style.display = 'none';
            document.querySelector('.pdf-canvas-container').innerHTML += '<p style="text-align:center;padding:40px">No PDF available for editing. You can still use annotation tools on a blank canvas.</p>';
        });
    }
    
    function renderPage(pageNum) {
        if (!pdfDoc) return;
        pdfDoc.getPage(pageNum).then(page => {
            const viewport = page.getViewport({ scale: scale });
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            drawCanvas.width = viewport.width;
            drawCanvas.height = viewport.height;
            
            // 渲染 PDF 内容
            const renderContext = {
                canvasContext: ctx,
                viewport: viewport
            };
            page.render(renderContext);
            
            // 清除绘制层并重新绘制已保存的注释（本页面简单实现，未跨页保存）
            drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
            // 可以在此处加载之前保存的 annotations（可选）
            
            currentPageSpan.textContent = pageNum;
            currentPage = pageNum;
            
            // 调整容器滚动位置
            const container = document.querySelector('.pdf-canvas-container');
            if (container) container.scrollTop = 0;
        });
    }
    
    // ---------- 绘图工具核心 ----------
    function getCanvasCoords(e) {
        const rect = drawCanvas.getBoundingClientRect();
        const scaleX = drawCanvas.width / rect.width;
        const scaleY = drawCanvas.height / rect.height;
        let clientX, clientY;
        if (e.touches) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }
        let x = (clientX - rect.left) * scaleX;
        let y = (clientY - rect.top) * scaleY;
        x = Math.min(Math.max(0, x), drawCanvas.width);
        y = Math.min(Math.max(0, y), drawCanvas.height);
        return { x, y };
    }
    
    function startDrawing(e) {
        if (currentTool === 'select') return;
        e.preventDefault();
        isDrawing = true;
        const { x, y } = getCanvasCoords(e);
        lastX = x;
        lastY = y;
        startX = x;
        startY = y;
        
        // 画笔/高亮初始点
        if (currentTool === 'draw' || currentTool === 'highlight') {
            drawCtx.beginPath();
            drawCtx.moveTo(x, y);
            drawCtx.lineCap = 'round';
            drawCtx.lineJoin = 'round';
            drawCtx.strokeStyle = currentColor;
            drawCtx.lineWidth = currentSize;
            if (currentTool === 'highlight') {
                drawCtx.globalAlpha = currentOpacity / 100 * 0.5;
                drawCtx.strokeStyle = '#ffeb3b'; // 高亮黄色
            } else {
                drawCtx.globalAlpha = currentOpacity / 100;
            }
            drawCtx.lineTo(x, y);
            drawCtx.stroke();
            drawCtx.beginPath();
            drawCtx.moveTo(x, y);
        }
    }
    
    function draw(e) {
        if (!isDrawing) return;
        e.preventDefault();
        const { x, y } = getCanvasCoords(e);
        
        if (currentTool === 'draw') {
            drawCtx.globalAlpha = currentOpacity / 100;
            drawCtx.strokeStyle = currentColor;
            drawCtx.lineWidth = currentSize;
            drawCtx.lineTo(x, y);
            drawCtx.stroke();
            drawCtx.beginPath();
            drawCtx.moveTo(x, y);
        } 
        else if (currentTool === 'highlight') {
            drawCtx.globalAlpha = currentOpacity / 100 * 0.4;
            drawCtx.strokeStyle = '#ffeb3b';
            drawCtx.lineWidth = currentSize * 3;
            drawCtx.lineTo(x, y);
            drawCtx.stroke();
            drawCtx.beginPath();
            drawCtx.moveTo(x, y);
        }
        lastX = x;
        lastY = y;
    }
    
    function stopDrawing(e) {
        if (!isDrawing) return;
        isDrawing = false;
        
        // 处理形状（矩形/圆）
        if (currentTool === 'shape') {
            const { x, y } = getCanvasCoords(e);
            const width = x - startX;
            const height = y - startY;
            drawCtx.globalAlpha = currentOpacity / 100;
            drawCtx.strokeStyle = currentColor;
            drawCtx.fillStyle = 'transparent';
            drawCtx.lineWidth = currentSize;
            drawCtx.strokeRect(startX, startY, width, height);
        }
        else if (currentTool === 'text') {
            // 文本工具：弹出输入框
            const { x, y } = getCanvasCoords(e);
            const text = prompt('Enter text annotation:', 'Note');
            if (text) {
                drawCtx.font = `${currentSize * 4}px Arial`;
                drawCtx.fillStyle = currentColor;
                drawCtx.globalAlpha = currentOpacity / 100;
                drawCtx.fillText(text, x, y);
            }
        }
        else if (currentTool === 'stamp') {
            const { x, y } = getCanvasCoords(e);
            drawCtx.font = `${currentSize * 8}px "Font Awesome 6 Free"`;
            drawCtx.fillStyle = currentColor;
            drawCtx.globalAlpha = currentOpacity / 100;
            drawCtx.fillText('✓', x, y); // 简单印章符号
        }
        
        drawCtx.beginPath(); // 重置路径
    }
    
    // 绑定绘图事件
    function bindDrawingEvents() {
        if (!drawCanvas) return;
        drawCanvas.addEventListener('mousedown', startDrawing);
        drawCanvas.addEventListener('mousemove', draw);
        drawCanvas.addEventListener('mouseup', stopDrawing);
        drawCanvas.addEventListener('mouseleave', stopDrawing);
        // 触摸屏支持
        drawCanvas.addEventListener('touchstart', startDrawing);
        drawCanvas.addEventListener('touchmove', draw);
        drawCanvas.addEventListener('touchend', stopDrawing);
    }
    
    // ---------- 工具按钮逻辑 ----------
    function setupTools() {
        const toolBtns = document.querySelectorAll('.tool-btn');
        toolBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                toolBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentTool = btn.dataset.tool;
                
                // 鼠标样式
                if (drawCanvas) {
                    if (currentTool === 'select') {
                        drawCanvas.style.cursor = 'default';
                    } else {
                        drawCanvas.style.cursor = 'crosshair';
                    }
                }
                console.log(`Tool activated: ${currentTool}`);
            });
        });
        
        // 属性绑定
        if (colorPicker) {
            colorPicker.addEventListener('input', e => currentColor = e.target.value);
        }
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
    
    // ---------- 导航和缩放 ----------
    function setupNavigation() {
        document.getElementById('prev-page')?.addEventListener('click', () => {
            if (pdfDoc && currentPage > 1) renderPage(currentPage - 1);
        });
        document.getElementById('next-page')?.addEventListener('click', () => {
            if (pdfDoc && currentPage < pdfDoc.numPages) renderPage(currentPage + 1);
        });
        document.getElementById('zoom-in')?.addEventListener('click', () => {
            scale += 0.2;
            if (pdfDoc) renderPage(currentPage);
        });
        document.getElementById('zoom-out')?.addEventListener('click', () => {
            scale = Math.max(0.6, scale - 0.2);
            if (pdfDoc) renderPage(currentPage);
        });
        // fit-width 和 fit-page 可简易实现
        document.getElementById('fit-width')?.addEventListener('click', () => {
            const container = document.querySelector('.pdf-canvas-container');
            if (container && canvas) {
                scale = container.clientWidth / canvas.width;
                if (pdfDoc) renderPage(currentPage);
            }
        });
        document.getElementById('fit-page')?.addEventListener('click', () => {
            scale = 1.2;
            if (pdfDoc) renderPage(currentPage);
        });
    }
    
    // ---------- 按钮：保存/取消/返回 ----------
    function bindActionButtons() {
        document.getElementById('save-btn')?.addEventListener('click', () => {
            // 简单保存：这里可以转换为图片并保存，或只提示成功
            alert('Changes saved (demo). In production, you would export the annotated PDF.');
            window.location.href = 'sitediary.html';
        });
        document.getElementById('cancel-btn')?.addEventListener('click', () => {
            if (confirm('Cancel editing? All changes will be lost.'))
                window.location.href = 'sitediary.html';
        });
        document.getElementById('back-btn')?.addEventListener('click', () => {
            window.location.href = 'sitediary.html';
        });
    }
    
    // 初始化
    document.addEventListener('DOMContentLoaded', () => {
        syncGlobalDate();
        const doc = loadDocumentData();
        
        // 如果有 PDF URL 则加载，否则显示占位
        if (doc && doc.pdfUrl) {
            loadPDF(doc.pdfUrl);
        } else {
            // 无 PDF，但仍可绘制空白画布
            canvas.style.display = 'block';
            drawCanvas.style.display = 'block';
            canvas.width = 800;
            canvas.height = 1000;
            drawCanvas.width = 800;
            drawCanvas.height = 1000;
            ctx.fillStyle = '#f0f0f0';
            ctx.fillRect(0, 0, 800, 1000);
            ctx.fillStyle = '#666';
            ctx.font = '20px Arial';
            ctx.fillText('No PDF document attached. You can still use annotation tools.', 30, 100);
        }
        
        setupTools();
        bindDrawingEvents();
        setupNavigation();
        bindActionButtons();
    });
})();