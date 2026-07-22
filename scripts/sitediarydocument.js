// ===== Site Diary Document Viewer (PDF.js + Annotations) =====
// 完全使用 DOM 渲染文本框，與 editpdf.html 保持一致
(function() {
    'use strict';

    // ---------- 全局变量 ----------
    let pdfDoc = null;
    let currentPage = 1;
    let totalPages = 0;
    let annotations = [];
    let currentDocId = null;
    
    // 雙重縮放設定：保持 CSS 視覺佈局 1.0，內部渲染像素改為 2.0 
    // 2.0 已經達到 Retina 螢幕的高清標準，能有效節省記憶體並縮小最終檔案體積
    const baseScale = 1.0; 
    const renderScale = 2.0;

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

    // ---------- 绘制非文本注释 ----------
    function drawAnnotation(anno, scale) {
        if (!annoCtx) return;
        const ctx = annoCtx;

        switch (anno.type) {
            case 'highlight':
                ctx.save();
                ctx.globalAlpha = (anno.opacity || 100) / 100 * 0.4;
                ctx.strokeStyle = anno.color || '#3498db';
                ctx.lineWidth = (anno.size || 3) * scale;
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
                ctx.lineWidth = (anno.size || 3) * scale;
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
                ctx.lineWidth = (anno.size || 3) * scale;
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
                ctx.lineWidth = (anno.size || 3) * scale;
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
                ctx.lineWidth = (anno.size || 3) * scale;
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
                // 過濾：只繪製屬於當前頁面的標註
                if (anno.page !== undefined && anno.page !== currentPage) return;
                if (anno.page === undefined && currentPage !== 1) return;
                
                drawAnnotation(anno, scale);
            }
        });
    }

    // ---------- 渲染文本框 ----------
    function renderTextAnnotations(scale) {
        textContainer.innerHTML = '';
        
        // 過濾：只顯示屬於當前頁面的文本標註
        const textAnnos = annotations.filter(a => a.type === 'text' && (a.page === currentPage || (a.page === undefined && currentPage === 1)));
        
        textAnnos.forEach(anno => {
            const el = document.createElement('div');
            el.className = 'text-annotation-view';
            el.textContent = anno.text || '';
            el.style.color = anno.color || '#000000';
            el.style.opacity = (anno.opacity || 100) / 100;
            el.style.fontSize = (anno.size * 4 * scale) + 'px';
            el.style.left = (anno.x * scale) + 'px';
            el.style.top = (anno.y * scale) + 'px';
            textContainer.appendChild(el);
        });
    }

    // ---------- 适应宽度 ----------
    function fitToWidth() {
        return Promise.resolve();
    }

    // ---------- 渲染单页 ----------
    function renderPage(pageNum) {
        if (!pdfDoc) return Promise.reject('No PDF document');
        return pdfDoc.getPage(pageNum).then(page => {
            const viewport = page.getViewport({ scale: renderScale });
            const cssViewport = page.getViewport({ scale: baseScale });
            
            pdfCanvas.width = viewport.width;
            pdfCanvas.height = viewport.height;
            annoCanvas.width = viewport.width;
            annoCanvas.height = viewport.height;

            const widthPx = cssViewport.width + 'px';
            const heightPx = cssViewport.height + 'px';
            
            pdfCanvas.style.width = widthPx;
            pdfCanvas.style.height = heightPx;
            annoCanvas.style.width = widthPx;
            annoCanvas.style.height = heightPx;

            const renderContext = { canvasContext: ctx, viewport: viewport };
            return page.render(renderContext).promise;
        }).then(() => {
            const offsetX = pdfCanvas.offsetLeft || 0;
            const offsetY = pdfCanvas.offsetTop || 0;
            
            annoCanvas.style.left = offsetX + 'px';
            annoCanvas.style.top = offsetY + 'px';
            
            textContainer.style.left = offsetX + 'px';
            textContainer.style.top = offsetY + 'px';
            textContainer.style.width = pdfCanvas.style.width;
            textContainer.style.height = pdfCanvas.style.height;

            currentPageSpan.textContent = pageNum;
            currentPage = pageNum;

            redrawAnnotations(renderScale);
            renderTextAnnotations(baseScale);
            
        }).catch(err => {
            console.error('Render page error:', err);
            throw err;
        });
    }

    // ---------- 加载文档 ----------
    function loadDocument() {
        const documentDataRaw = sessionStorage.getItem('currentDocument');
        if (!documentDataRaw) {
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
            } catch (e) {
                loadingEl.style.display = 'none';
                errorEl.textContent = 'Invalid PDF data (Base64 decode failed).';
                errorEl.style.display = 'block';
                return;
            }
        } else {
            pdfSource = { url: pdfSrc };
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

    // ---------- 生成包含注释的 PDF（高質量壓縮，維持清晰度並大幅減小體積） ----------
    function generateAnnotatedPDF() {
        const wrapper = document.getElementById('pdf-canvas-wrapper');
        if (!wrapper) { 
            alert('PDF content not available.');
            return Promise.reject('No wrapper');
        }
        
        // 使用 2.0 縮放，足以保持視覺清晰度，同時大幅度減少像素總數
        return html2canvas(wrapper, { 
            scale: 2.0, 
            useCORS: true, 
            backgroundColor: '#ffffff',
            logging: false
        }).then(canvas => {
            // 使用 JPEG 並設定 0.85 質量，這是畫質與體積的最佳平衡點
            const imgData = canvas.toDataURL('image/jpeg', 0.85);
            const { jsPDF } = window.jspdf;
            
            // 啟用 jsPDF 的內建壓縮，進一步縮小體積
            const pdf = new jsPDF({
                orientation: 'p',
                unit: 'mm',
                format: 'a4',
                compress: true
            });
            
            const imgWidth = 210;
            const pageHeight = 297;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            let heightLeft = imgHeight;
            let position = 0;
            
            // 恢復使用 'FAST' 寫入圖片
            pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
            heightLeft -= pageHeight;
            
            while (heightLeft > 0) {
                position = heightLeft - imgHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
                heightLeft -= pageHeight;
            }
            return pdf;
        });
    }

    // ---------- 另存为（使用 File System Access API，支持时弹出保存对话框） ----------
    async function saveAsPDF(pdf) {
        if (window.showSaveFilePicker) {
            try {
                const blob = pdf.output('blob');
                const handle = await window.showSaveFilePicker({
                    suggestedName: 'document_with_annotations.pdf',
                    types: [{
                        description: 'PDF Document',
                        accept: { 'application/pdf': ['.pdf'] }
                    }]
                });
                const writable = await handle.createWritable();
                await writable.write(blob);
                await writable.close();
                return;
            } catch (err) {
                console.warn('Save file picker failed, falling back to default download.', err);
            }
        }
        pdf.save('document_with_annotations.pdf');
    }

    // ---------- 打印 ----------
    function printPDF() {
        generateAnnotatedPDF().then(pdf => {
            const pdfBlob = pdf.output('blob');
            const url = URL.createObjectURL(pdfBlob);
            const win = window.open(url, '_blank');
            if (win) {
                win.onload = function() {
                    win.print();
                };
            } else {
                alert('Please allow pop-ups to print.');
            }
        }).catch(err => {
            alert('Print failed: ' + err.message);
        });
    }

    // ---------- 下载（使用另存为） ----------
    function downloadPDF() {
        generateAnnotatedPDF().then(pdf => {
            saveAsPDF(pdf);
        }).catch(err => {
            alert('Download failed: ' + err.message);
        });
    }

    // ---------- 导航 ----------
    function setupControls() {
        document.getElementById('pdf-prev').addEventListener('click', () => {
            if (currentPage > 1) renderPage(currentPage - 1);
        });
        document.getElementById('pdf-next').addEventListener('click', () => {
            if (currentPage < totalPages) renderPage(currentPage + 1);
        });
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