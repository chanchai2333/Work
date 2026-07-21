// ===== Site Diary Document Viewer (PDF.js + Annotations) =====
// 完全使用 DOM 渲染文本框，与 editpdf.html 保持一致，固定 scale=1
(function() {
    'use strict';

    // ---------- 全局变量 ----------
    let pdfDoc = null;
    let currentPage = 1;
    let totalPages = 0;
    let annotations = [];
    let currentDocId = null;
    const scale = 1.0; // 固定缩放为 1

    // ---------- DOM 引用 ----------
    const pdfCanvas = document.getElementById('pdf-canvas');
    const annoCanvas = document.getElementById('annotation-canvas');
    const textContainer = document.getElementById('text-annotation-container');
    const ctx = pdfCanvas.getContext('2d');
    const annoCtx = annoCanvas.getContext('2d');
    const loadingEl = document.getElementById('pdf-loading');
    const errorEl = document.getElementById('pdf-error');
    const noPdfEl = document.getElementById('no-pdf-message');
    const controlsEl = document.getElementById('pdf-controls');
    const currentPageSpan = document.getElementById('pdf-current-page');
    const totalPagesSpan = document.getElementById('pdf-total-pages');
    const zoomLevelSpan = document.getElementById('pdf-zoom-level');
    const printBtn = document.getElementById('print-pdf-btn');
    const downloadBtn = document.getElementById('download-pdf-btn');

    // ---------- 辅助函数 ----------
    function syncGlobalDate() {
        const stored = sessionStorage.getItem('globalDate');
        const span = document.querySelector('.date-display span');
        if (stored && span) span.textContent = stored;
        else if (span) {
            span.textContent = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        }
    }

    function loadAnnotationsFromStorage(docId) {
        const STORAGE_KEY = 'siteDiaryData';
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return [];
        try {
            const diaryData = JSON.parse(stored);
            const doc = diaryData.find(d => d.id === docId);
            return doc && doc.annotations ? doc.annotations : [];
        } catch (e) {
            console.error('Failed to load annotations:', e);
            return [];
        }
    }

    // ---------- 绘制非文本注释（高亮、形状等） ----------
    function drawAnnotation(anno, scale) {
        if (!annoCtx) return;
        const ctx = annoCtx;

        switch (anno.type) {
            case 'highlight':
                ctx.save();
                ctx.globalAlpha = (anno.opacity || 100) / 100 * 0.4;
                ctx.strokeStyle = anno.color || '#3498db';
                ctx.lineWidth = anno.size || 3;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                if (anno.points && anno.points.length > 1) {
                    ctx.beginPath();
                    const first = anno.points[0];
                    ctx.moveTo(first.x * scale, first.y * scale);
                    for (let i = 1; i < anno.points.length; i++) {
                        ctx.lineTo(anno.points[i].x * scale, anno.points[i].y * scale);
                    }
                    ctx.stroke();
                }
                ctx.restore();
                break;
            case 'rectangle':
                ctx.save();
                ctx.globalAlpha = (anno.opacity || 100) / 100;
                ctx.strokeStyle = anno.color || '#3498db';
                ctx.lineWidth = anno.size || 3;
                if (anno.startX !== undefined && anno.endX !== undefined) {
                    const x = Math.min(anno.startX, anno.endX) * scale;
                    const y = Math.min(anno.startY, anno.endY) * scale;
                    const w = Math.abs(anno.endX - anno.startX) * scale;
                    const h = Math.abs(anno.endY - anno.startY) * scale;
                    ctx.strokeRect(x, y, w, h);
                }
                ctx.restore();
                break;
            case 'ellipse':
                ctx.save();
                ctx.globalAlpha = (anno.opacity || 100) / 100;
                ctx.strokeStyle = anno.color || '#3498db';
                ctx.lineWidth = anno.size || 3;
                if (anno.startX !== undefined && anno.endX !== undefined) {
                    const cx = (anno.startX + anno.endX) / 2 * scale;
                    const cy = (anno.startY + anno.endY) / 2 * scale;
                    const rx = Math.abs(anno.endX - anno.startX) / 2 * scale;
                    const ry = Math.abs(anno.endY - anno.startY) / 2 * scale;
                    ctx.beginPath();
                    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
                    ctx.stroke();
                }
                ctx.restore();
                break;
            case 'arrow':
                ctx.save();
                ctx.globalAlpha = (anno.opacity || 100) / 100;
                ctx.strokeStyle = anno.color || '#3498db';
                ctx.fillStyle = anno.color || '#3498db';
                ctx.lineWidth = anno.size || 3;
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
                ctx.restore();
                break;
            case 'line':
                ctx.save();
                ctx.globalAlpha = (anno.opacity || 100) / 100;
                ctx.strokeStyle = anno.color || '#3498db';
                ctx.lineWidth = anno.size || 3;
                if (anno.startX !== undefined && anno.endX !== undefined) {
                    ctx.beginPath();
                    ctx.moveTo(anno.startX * scale, anno.startY * scale);
                    ctx.lineTo(anno.endX * scale, anno.endY * scale);
                    ctx.stroke();
                }
                ctx.restore();
                break;
            default:
                break;
        }
    }

    function redrawAnnotations(scale) {
        if (!annoCtx) return;
        annoCtx.clearRect(0, 0, annoCanvas.width, annoCanvas.height);
        annotations.forEach(anno => {
            if (anno.type !== 'text') {
                drawAnnotation(anno, scale);
            }
        });
    }

    // ---------- 渲染文本框（DOM 方式） ----------
    function renderTextAnnotations(scale) {
        // 清空容器
        textContainer.innerHTML = '';
        const textAnnos = annotations.filter(a => a.type === 'text');
        textAnnos.forEach(anno => {
            const el = document.createElement('div');
            el.className = 'text-annotation-view';
            el.textContent = anno.text || '';
            el.style.color = anno.color || '#000000';
            el.style.opacity = (anno.opacity || 100) / 100;
            el.style.fontSize = (anno.size * 4 * scale) + 'px';
            el.style.left = (anno.x * scale) + 'px';
            el.style.top = (anno.y * scale) + 'px';
            // 与 editpdf.html 完全相同的样式
            textContainer.appendChild(el);
        });
    }

    // ---------- 适应宽度（固定 scale=1，仅用于首次定位） ----------
    function fitToWidth() {
        // 固定 scale=1，不做缩放
        zoomLevelSpan.textContent = '100%';
        return Promise.resolve();
    }

    // ---------- 渲染单页 ----------
    function renderPage(pageNum) {
        if (!pdfDoc) return Promise.reject('No PDF document');
        return pdfDoc.getPage(pageNum).then(page => {
            const viewport = page.getViewport({ scale: 1.0 });
            // 设置 Canvas 的像素尺寸
            pdfCanvas.width = viewport.width;
            pdfCanvas.height = viewport.height;
            annoCanvas.width = viewport.width;
            annoCanvas.height = viewport.height;

            // 设置 CSS 尺寸为像素值，防止缩放
            const widthPx = viewport.width + 'px';
            const heightPx = viewport.height + 'px';
            pdfCanvas.style.width = widthPx;
            pdfCanvas.style.height = heightPx;
            annoCanvas.style.width = widthPx;
            annoCanvas.style.height = heightPx;
            // 文本容器尺寸与父容器一致（由 CSS 控制）

            // 渲染 PDF
            const renderContext = { canvasContext: ctx, viewport: viewport };
            return page.render(renderContext).promise;
        }).then(() => {
            // 绘制非文本注释
            redrawAnnotations(1.0);
            // 渲染文本框
            renderTextAnnotations(1.0);
            currentPageSpan.textContent = pageNum;
            currentPage = pageNum;
            zoomLevelSpan.textContent = '100%';
        }).catch(err => {
            console.error('Render page error:', err);
            throw err;
        });
    }

    // ---------- 加载文档 ----------
    function loadDocument() {
        const documentDataRaw = sessionStorage.getItem('currentDocument');
        if (!documentDataRaw) {
            console.warn('No document data found in sessionStorage');
            loadingEl.style.display = 'none';
            errorEl.textContent = 'No document data available. Please go back and select a record.';
            errorEl.style.display = 'block';
            return;
        }

        let documentData;
        try {
            documentData = JSON.parse(documentDataRaw);
        } catch (e) {
            loadingEl.style.display = 'none';
            errorEl.textContent = 'Invalid document data.';
            errorEl.style.display = 'block';
            return;
        }

        currentDocId = documentData.id;
        document.getElementById('docId').textContent = documentData.id || 'N/A';
        document.getElementById('docTitle').textContent = `${documentData.site || ''} - ${documentData.type || ''}`;
        document.getElementById('docSite').textContent = documentData.site || 'N/A';
        document.getElementById('docDate').textContent = documentData.date || 'N/A';
        document.getElementById('docAuthor').textContent = documentData.submittedBy || 'N/A';
        const statusEl = document.getElementById('docStatus');
        if (statusEl) {
            statusEl.textContent = documentData.statusText || 'Draft';
            statusEl.className = 'doc-status';
        }

        annotations = loadAnnotationsFromStorage(currentDocId);
        console.log('Loaded annotations count:', annotations.length);

        let pdfSrc = documentData.pdfData || documentData.pdfUrl || null;
        if (!pdfSrc) {
            loadingEl.style.display = 'none';
            noPdfEl.style.display = 'block';
            printBtn.style.display = 'none';
            downloadBtn.style.display = 'none';
            return;
        }

        let pdfSource;
        if (typeof pdfSrc === 'string' && pdfSrc.startsWith('data:application/pdf;base64,')) {
            pdfSource = { url: pdfSrc };
        } else if (typeof pdfSrc === 'string' && pdfSrc.length > 1000 && !pdfSrc.startsWith('http')) {
            try {
                const binary = atob(pdfSrc);
                const bytes = new Uint8Array(binary.length);
                for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
                pdfSource = { data: bytes };
                console.log('PDF source from Base64, size:', bytes.length);
            } catch (e) {
                loadingEl.style.display = 'none';
                errorEl.textContent = 'Invalid PDF data (Base64 decode failed).';
                errorEl.style.display = 'block';
                return;
            }
        } else {
            pdfSource = { url: pdfSrc };
            console.log('PDF source from URL:', pdfSrc);
        }

        loadingEl.style.display = 'flex';
        errorEl.style.display = 'none';
        noPdfEl.style.display = 'none';
        printBtn.style.display = 'none';
        downloadBtn.style.display = 'none';

        pdfjsLib.getDocument(pdfSource).promise.then(pdf => {
            pdfDoc = pdf;
            totalPages = pdf.numPages;
            totalPagesSpan.textContent = totalPages;
            currentPage = 1;
            controlsEl.style.display = 'flex';
            loadingEl.style.display = 'none';
            printBtn.style.display = 'inline-flex';
            downloadBtn.style.display = 'inline-flex';

            return fitToWidth().then(() => renderPage(currentPage));
        }).catch(err => {
            console.error('PDF loading error:', err);
            loadingEl.style.display = 'none';
            errorEl.textContent = 'Failed to load PDF: ' + (err.message || 'Unknown error');
            errorEl.style.display = 'block';
            printBtn.style.display = 'none';
            downloadBtn.style.display = 'none';
        });
    }

    // ---------- 打印与下载 ----------
    function printPDF() {
        if (!pdfDoc) { alert('No PDF loaded.'); return; }
        pdfDoc.getData().then(data => {
            const blob = new Blob([data], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            const win = window.open(url, '_blank');
            if (win) {
                win.onload = function() { win.print(); };
            } else {
                alert('Please allow pop-ups to print.');
            }
        }).catch(err => {
            alert('Print error: ' + err.message);
        });
    }

    function downloadPDF() {
        const wrapper = document.getElementById('pdf-canvas-wrapper');
        if (!wrapper) { alert('PDF content not available.'); return; }
        html2canvas(wrapper, { scale: 2, useCORS: true, backgroundColor: '#ffffff' })
            .then(canvas => {
                const imgData = canvas.toDataURL('image/png');
                const { jsPDF } = window.jspdf;
                const imgWidth = 210;
                const pageHeight = 297;
                const imgHeight = (canvas.height * imgWidth) / canvas.width;
                let heightLeft = imgHeight;
                let position = 0;
                const pdf = new jsPDF('p', 'mm', 'a4');
                pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                heightLeft -= pageHeight;
                while (heightLeft > 0) {
                    position = heightLeft - imgHeight;
                    pdf.addPage();
                    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                    heightLeft -= pageHeight;
                }
                pdf.save('document_with_annotations.pdf');
            })
            .catch(err => {
                alert('Download failed: ' + err.message);
            });
    }

    // ---------- 导航（移除缩放） ----------
    function setupControls() {
        document.getElementById('pdf-prev').addEventListener('click', () => {
            if (currentPage > 1) renderPage(currentPage - 1);
        });
        document.getElementById('pdf-next').addEventListener('click', () => {
            if (currentPage < totalPages) renderPage(currentPage + 1);
        });
        // 缩放按钮已移除，无需处理
        // 窗口 resize 时保持固定 scale=1，不做自适应
    }

    // ---------- 按钮事件 ----------
    function bindEvents() {
        const backBtn = document.getElementById('back-to-diary-btn');
        if (backBtn) {
            backBtn.addEventListener('click', function(e) {
                e.preventDefault();
                window.location.href = 'sitediary.html';
            });
        }
        if (printBtn) printBtn.addEventListener('click', printPDF);
        if (downloadBtn) downloadBtn.addEventListener('click', downloadPDF);
    }

    // ---------- 初始化 ----------
    document.addEventListener('DOMContentLoaded', function() {
        syncGlobalDate();
        loadDocument();
        setupControls();
        bindEvents();
    });
})();