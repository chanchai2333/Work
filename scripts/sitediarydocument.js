// ===== Site Diary Document Viewer (PDF.js) =====
(function() {
    // ---------- 全局变量 ----------
    let pdfDoc = null;
    let currentPage = 1;
    let scale = 1.0;
    let totalPages = 0;
    let pdfData = null;

    // ---------- DOM 引用 ----------
    const canvas = document.getElementById('pdf-canvas');
    const ctx = canvas.getContext('2d');
    const loadingEl = document.getElementById('pdf-loading');
    const errorEl = document.getElementById('pdf-error');
    const noPdfEl = document.getElementById('no-pdf-message');
    const controlsEl = document.getElementById('pdf-controls');
    const currentPageSpan = document.getElementById('pdf-current-page');
    const totalPagesSpan = document.getElementById('pdf-total-pages');
    const zoomLevelSpan = document.getElementById('pdf-zoom-level');
    const printBtn = document.getElementById('print-pdf-btn');

    // ---------- 同步全局日期 ----------
    function syncGlobalDate() {
        const storedDate = sessionStorage.getItem('globalDate');
        const dateSpan = document.querySelector('.date-display span');
        if (storedDate && dateSpan) {
            dateSpan.textContent = storedDate;
        } else if (dateSpan) {
            const now = new Date();
            dateSpan.textContent = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        }
    }

    // ---------- 加载并渲染 PDF ----------
    function loadDocument() {
        const documentData = JSON.parse(sessionStorage.getItem('currentDocument'));
        if (!documentData) {
            console.warn('No document data found');
            document.getElementById('docId').textContent = 'N/A';
            loadingEl.style.display = 'none';
            errorEl.textContent = 'No document data available.';
            errorEl.style.display = 'block';
            return;
        }

        // 填充元数据
        document.getElementById('docId').textContent = documentData.id || 'N/A';
        const titleSpan = document.getElementById('docTitle');
        if (titleSpan) titleSpan.textContent = `${documentData.site || ''} - ${documentData.type || ''}`;
        document.getElementById('docSite').textContent = documentData.site || 'N/A';
        document.getElementById('docDate').textContent = documentData.date || 'N/A';
        document.getElementById('docAuthor').textContent = documentData.submittedBy || 'N/A';

        // 状态
        const statusEl = document.getElementById('docStatus');
        if (statusEl) {
            statusEl.textContent = documentData.statusText || 'Draft';
            statusEl.className = 'doc-status';
            const statusMap = {
                'draft': 'status-draft',
                'submitted-ig': 'status-submitted-ig',
                'submitted-wsg': 'status-submitted-wsg',
                'closed': 'status-closed',
                'reopen': 'status-reopen',
                'cancelled': 'status-cancelled'
            };
            if (statusMap[documentData.status]) {
                statusEl.classList.add(statusMap[documentData.status]);
            }
        }

        // 获取 PDF 来源
        let pdfSrc = documentData.pdfUrl || null;

        // 如果没有 PDF 数据，显示无 PDF 消息
        if (!pdfSrc) {
            loadingEl.style.display = 'none';
            noPdfEl.style.display = 'block';
            printBtn.style.display = 'none';
            return;
        }

        // 显示加载中
        loadingEl.style.display = 'flex';
        errorEl.style.display = 'none';
        noPdfEl.style.display = 'none';

        // 判断是 Data URL 还是普通 URL
        let pdfSource;
        if (pdfSrc.startsWith('data:application/pdf;base64,')) {
            // 提取 base64 字符串
            const base64Data = pdfSrc.split(',')[1];
            try {
                // 解码 base64 为 Uint8Array
                const binaryString = atob(base64Data);
                const len = binaryString.length;
                const bytes = new Uint8Array(len);
                for (let i = 0; i < len; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }
                pdfSource = { data: bytes };
                console.log('Loading PDF from Base64 data, size:', len);
            } catch (e) {
                console.error('Base64 decode error:', e);
                loadingEl.style.display = 'none';
                errorEl.textContent = 'Invalid PDF data (Base64 decode failed).';
                errorEl.style.display = 'block';
                return;
            }
        } else {
            // 普通 URL
            pdfSource = { url: pdfSrc };
            console.log('Loading PDF from URL:', pdfSrc);
        }

        // 使用 pdf.js 加载
        pdfjsLib.getDocument(pdfSource).promise.then(pdf => {
            pdfDoc = pdf;
            totalPages = pdf.numPages;
            totalPagesSpan.textContent = totalPages;
            currentPage = 1;
            controlsEl.style.display = 'flex';
            loadingEl.style.display = 'none';
            printBtn.style.display = 'inline-flex';
            // 自动适应宽度
            fitToWidth();
            renderPage(currentPage);
        }).catch(err => {
            console.error('PDF loading error:', err);
            loadingEl.style.display = 'none';
            let errorMsg = 'Failed to load PDF document.';
            if (err.message) {
                errorMsg += ' Error: ' + err.message;
            }
            errorEl.textContent = errorMsg;
            errorEl.style.display = 'block';
            printBtn.style.display = 'none';
        });
    }

    // ---------- 适应宽度 ----------
    function fitToWidth() {
        if (!pdfDoc) return;
        const container = document.querySelector('.pdf-viewer-container');
        const containerWidth = container.clientWidth - 40; // 减去 padding
        pdfDoc.getPage(currentPage).then(page => {
            const viewport = page.getViewport({ scale: 1 });
            scale = containerWidth / viewport.width;
            // 限制最小和最大缩放
            scale = Math.min(Math.max(scale, 0.3), 3.0);
            zoomLevelSpan.textContent = Math.round(scale * 100) + '%';
        });
    }

    // ---------- 渲染单页 ----------
    function renderPage(pageNum) {
        if (!pdfDoc) return;
        pdfDoc.getPage(pageNum).then(page => {
            const viewport = page.getViewport({ scale: scale });
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            const renderContext = {
                canvasContext: ctx,
                viewport: viewport
            };
            page.render(renderContext);
            currentPageSpan.textContent = pageNum;
            currentPage = pageNum;
            zoomLevelSpan.textContent = Math.round(scale * 100) + '%';
        }).catch(err => {
            console.error('Page render error:', err);
            errorEl.textContent = 'Error rendering page: ' + err.message;
            errorEl.style.display = 'block';
        });
    }

    // ---------- 打印 PDF（完整文档） ----------
    function printPDF() {
        if (!pdfDoc) {
            alert('No PDF document loaded.');
            return;
        }
        // 获取原始 PDF 数据
        pdfDoc.getData().then(data => {
            // 创建 Blob
            const blob = new Blob([data], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            // 在新窗口打开并自动打印
            const printWindow = window.open(url, '_blank');
            if (printWindow) {
                printWindow.onload = function() {
                    printWindow.print();
                };
            } else {
                alert('Please allow pop-ups to print the PDF.');
            }
        }).catch(err => {
            console.error('Print error:', err);
            alert('Failed to print PDF. Error: ' + err.message);
        });
    }

    // ---------- 页面导航 ----------
    function setupControls() {
        document.getElementById('pdf-prev').addEventListener('click', () => {
            if (currentPage > 1) renderPage(currentPage - 1);
        });
        document.getElementById('pdf-next').addEventListener('click', () => {
            if (currentPage < totalPages) renderPage(currentPage + 1);
        });
        document.getElementById('pdf-zoom-in').addEventListener('click', () => {
            scale = Math.min(scale + 0.2, 3.0);
            renderPage(currentPage);
        });
        document.getElementById('pdf-zoom-out').addEventListener('click', () => {
            scale = Math.max(scale - 0.2, 0.4);
            renderPage(currentPage);
        });
        // 窗口大小变化时重新适应宽度
        window.addEventListener('resize', () => {
            if (pdfDoc) {
                fitToWidth();
                renderPage(currentPage);
            }
        });
    }

    // ---------- 返回按钮 ----------
    function bindEvents() {
        const backBtn = document.getElementById('back-to-diary-btn');
        if (backBtn) {
            backBtn.addEventListener('click', function() {
                window.location.href = 'sitediary.html';
            });
        }
        // Print PDF 按钮
        if (printBtn) {
            printBtn.addEventListener('click', printPDF);
        }
    }

    // ---------- 初始化 ----------
    document.addEventListener('DOMContentLoaded', function() {
        syncGlobalDate();
        loadDocument();
        setupControls();
        bindEvents();
    });
})();