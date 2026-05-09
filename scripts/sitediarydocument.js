// ===== Site Diary Document Viewer =====
(function() {
    function syncGlobalDate() {
        const storedDate = sessionStorage.getItem('globalDate');
        const dateSpan = document.querySelector('.date-display span');
        if (storedDate && dateSpan) {
            dateSpan.textContent = storedDate;
        }
    }

    function loadDocument() {
        const documentData = JSON.parse(sessionStorage.getItem('currentDocument'));
        if (!documentData) {
            console.warn('No document data found');
            document.getElementById('docId').textContent = 'N/A';
            return;
        }

        // PDF 查看器
        const pdfFrame = document.getElementById('pdf-viewer');
        const noPdfMsg = document.getElementById('no-pdf-message');
        if (documentData.pdfUrl && pdfFrame) {
            pdfFrame.src = documentData.pdfUrl;
            pdfFrame.style.display = 'block';
            if (noPdfMsg) noPdfMsg.style.display = 'none';
        } else {
            if (pdfFrame) pdfFrame.style.display = 'none';
            if (noPdfMsg) noPdfMsg.style.display = 'flex';
        }

        // 文档元数据
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
    }

    function bindEvents() {
        const backBtn = document.getElementById('back-to-diary-btn');
        if (backBtn) {
            backBtn.addEventListener('click', function() {
                window.location.href = 'sitediary.html';
            });
        }

        const printBtn = document.getElementById('print-btn');
        if (printBtn) {
            printBtn.addEventListener('click', function() {
                window.print();
            });
        }

        const exportBtn = document.getElementById('export-pdf-btn');
        if (exportBtn) {
            exportBtn.addEventListener('click', function() {
                alert('PDF export feature is under development.');
            });
        }
    }

    document.addEventListener('DOMContentLoaded', function() {
        syncGlobalDate();
        loadDocument();
        bindEvents();
    });
})();