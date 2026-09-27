/**
 * editlabour.js - Labour Wage (GF527A) 編輯器
 * 架構完全參照 editdsdsitediary.js
 */
(function () {
    'use strict';

    /* ========== 配置 ========== */
    var PDF_RENDER_SCALE = 2.0;
    var DEFAULT_TOTAL_PAGES = 1;
    var STORAGE_KEY = 'labourWageData';

    /* PDF.js worker */
    if (window.pdfjsLib) {
        try {
            pdfjsLib.GlobalWorkerOptions.workerSrc =
                'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
        } catch (e) { /* ignore */ }
    }

    /* ========== 狀態 ========== */
    var currentDoc = null;
    var activePageNum = 1;
    var totalVirtualPages = DEFAULT_TOTAL_PAGES;
    var currentPageObj = null;
    var templateImageUrl = null;
    var pdfWidthCss = 0;
    var pdfHeightCss = 0;
    var pdfDoc = null;

    /* DOM */
    var pageWrapper = document.getElementById('page-wrapper');
    var loadingIndicator = document.getElementById('loading-indicator');

    /* ========== 工具 ========== */
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
        if (prevBtn) {
            prevBtn.disabled = (activePageNum <= 1);
            prevBtn.style.opacity = prevBtn.disabled ? '0.5' : '1';
            prevBtn.style.cursor = prevBtn.disabled ? 'not-allowed' : 'pointer';
        }
        if (nextBtn) {
            nextBtn.disabled = (activePageNum >= totalVirtualPages);
            nextBtn.style.opacity = nextBtn.disabled ? '0.5' : '1';
            nextBtn.style.cursor = nextBtn.disabled ? 'not-allowed' : 'pointer';
        }
        var pageInput = document.getElementById('page-input');
        if (pageInput) {
            pageInput.value = activePageNum;
            pageInput.max = totalVirtualPages;
        }
    }

    /* ========== 讀取文件 ========== */
    function loadDocumentData() {
        var sources = ['editDocument', 'currentWageRecord', 'currentRecord'];
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

    function updateDocumentInfo(doc) {
        function setText(id, val) {
            var el = document.getElementById(id);
            if (el) el.textContent = (val === undefined || val === null || val === '') ? 'N/A' : val;
        }
        setText('docId', doc.id);

        var typeText = doc.typeText;
        if (!typeText && doc.type) {
            if (doc.type === 'GF527A') typeText = 'GF527A - Return on Construction Site Employment';
            else if (doc.type === 'GF527-2003') typeText = 'GF527 (2003) - Labour Wage';
            else if (doc.type === 'GF527-2017') typeText = 'GF527 (2017) - Labour Wage';
            else typeText = doc.type;
        }
        setText('docType', typeText);
        setText('docSite', doc.site || doc.siteName);

        var periodText = doc.period;
        if (!periodText && doc.startDate && doc.endDate) {
            periodText = doc.startDate + ' to ' + doc.endDate;
        }
        setText('docPeriod', periodText);
        setText('docAuthor', doc.submittedBy || doc.author);

        var titleEl = document.getElementById('docTitle');
        if (titleEl) {
            titleEl.textContent = doc.title || typeText || 'GF527A - Return on Construction Site Employment';
        }

        var statusEl = document.getElementById('docStatus');
        if (statusEl) {
            var statusMap = {
                'draft': 'Draft', 'submitted': 'Submitted',
                'approved': 'Approved', 'rejected': 'Rejected',
                'pending': 'Pending Approval', 'cancelled': 'Cancelled'
            };
            var clsMap = {
                'draft': 'status-draft', 'submitted': 'status-submitted',
                'approved': 'status-approved', 'rejected': 'status-rejected',
                'pending': 'status-pending', 'cancelled': 'status-cancelled'
            };
            var key = doc.approvalStatus || doc.status || 'draft';
            statusEl.textContent = statusMap[key] || doc.statusText || 'Draft';
            statusEl.className = 'doc-status';
            if (clsMap[key]) statusEl.classList.add(clsMap[key]);
        }
    }

    /* ========== 載入 PDF ========== */
    function base64ToUint8(base64) {
        if (base64.indexOf('base64,') !== -1) {
            base64 = base64.split('base64,')[1];
        }
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
            // 兼容多個可能的變數名
            var data = window.LABOURWAGE_BASE64
                    || window.SITE_DIARY_TEMPLATE_BASE64
                    || window.GF527A_BASE64;

            if (!data || typeof data !== 'string' || data.length < 100) {
                reject(new Error('GF527A base64 未載入（window.LABOURWAGE_BASE64 為空）'));
                return;
            }
            try {
                var bytes = base64ToUint8(data);
                pdfjsLib.getDocument({ data: bytes }).promise.then(resolve).catch(reject);
            } catch (e) {
                reject(e);
            }
        });
    }

    function loadPdfTemplate() {
        return loadPdfFromBase64().then(function (pdf) {
            pdfDoc = pdf;
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

        pageWrapper.innerHTML = '';

        var pageDiv = document.createElement('div');
        pageDiv.className = 'pdf-page active-page';
        pageDiv.dataset.page = activePageNum;
        pageDiv.style.width = pdfWidthCss + 'px';
        pageDiv.style.height = pdfHeightCss + 'px';

        var img = document.createElement('img');
        img.src = templateImageUrl;
        img.className = 'pdf-bg';
        img.draggable = false;
        img.alt = 'GF527A Template';
        pageDiv.appendChild(img);

        pageWrapper.appendChild(pageDiv);

        currentPageObj = {
            pageNum: activePageNum,
            container: pageDiv
        };

        updatePageInfo();
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
        var pageInput = document.getElementById('page-input');

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
                    totalVirtualPages += 1;
                    if (currentDoc) {
                        currentDoc.totalPages = totalVirtualPages;
                        try {
                            sessionStorage.setItem('editDocument', JSON.stringify(currentDoc));
                            sessionStorage.setItem('currentWageRecord', JSON.stringify(currentDoc));
                            sessionStorage.setItem('currentRecord', JSON.stringify(currentDoc));
                        } catch (e) {}
                    }
                    updatePageInfo();
                    goToPage(activePageNum + 1);
                }
            });
        }
        if (pageInput) {
            pageInput.addEventListener('keydown', function (e) {
                if (e.key === 'Enter' || e.keyCode === 13) {
                    e.preventDefault();
                    var t = parseInt(pageInput.value, 10);
                    if (isNaN(t) || t < 1 || t > totalVirtualPages) {
                        alert('請輸入 1 到 ' + totalVirtualPages + ' 之間的頁碼');
                        pageInput.value = activePageNum;
                        return;
                    }
                    goToPage(t);
                    pageInput.blur();
                } else if (e.key === 'Escape' || e.keyCode === 27) {
                    e.preventDefault();
                    pageInput.value = activePageNum;
                    pageInput.blur();
                }
            });
            pageInput.addEventListener('focus', function () { try { pageInput.select(); } catch (e) {} });
        }
    }

    /* ========== 儲存 / 提交 / 審批 ========== */
    function saveChanges() {
        if (!currentDoc) { alert('No document to save.'); return; }
        currentDoc.totalPages = totalVirtualPages;

        try {
            sessionStorage.setItem('editDocument', JSON.stringify(currentDoc));
            sessionStorage.setItem('currentWageRecord', JSON.stringify(currentDoc));
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
        catch (e) { console.error('[Labour] Save failed', e); }

        alert('✅ Changes saved successfully!');
    }

    function submitDocument() {
        if (!currentDoc) { alert('No document to submit.'); return; }
        if (!confirm('Submit this document for approval?')) return;

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
        if (!confirm('Approve this document?')) return;

        currentDoc.approvalStatus = 'approved';
        currentDoc.approvedDate = new Date().toISOString();

        updateDocumentInfo(currentDoc);
        saveChanges();
        updateApprovalButtons();
        alert('✅ Document approved!');
    }

    function rejectDocument() {
        if (!currentDoc) return;
        if (!confirm('Reject this document?')) return;

        currentDoc.approvalStatus = 'rejected';
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
            if (approveBtn) approveBtn.style.display = 'inline-flex';
            if (rejectBtn) rejectBtn.style.display = 'inline-flex';
        }
        if (submitBtn) {
            var disabled = !!(currentDoc && currentDoc.approvalStatus === 'approved');
            submitBtn.disabled = disabled;
            submitBtn.style.opacity = disabled ? '0.5' : '1';
        }
    }

    function cancelEditing() {
        if (confirm('Cancel editing? All unsaved changes will be lost.')) {
            window.location.href = 'labourwage.html';
        }
    }

    function bindActionButtons() {
        var saveBtn = document.getElementById('save-btn');
        var cancelBtn = document.getElementById('cancel-btn');
        var submitBtn = document.getElementById('submit-btn');
        var approveBtn = document.getElementById('approve-btn');
        var rejectBtn = document.getElementById('reject-btn');

        if (saveBtn) saveBtn.addEventListener('click', saveChanges);
        if (cancelBtn) cancelBtn.addEventListener('click', cancelEditing);
        if (submitBtn) submitBtn.addEventListener('click', submitDocument);
        if (approveBtn) approveBtn.addEventListener('click', approveDocument);
        if (rejectBtn) rejectBtn.addEventListener('click', rejectDocument);
    }

    /* ========== 側邊欄 ========== */
    function setupSidebar() {
        function saveSidebarState() {
            var sb = document.querySelector('.sidebar');
            if (sb) localStorage.setItem('sidebarCollapsed', sb.classList.contains('collapsed') ? 'true' : 'false');
        }
        var sb = document.querySelector('.sidebar');
        if (sb && localStorage.getItem('sidebarCollapsed') === 'true') sb.classList.add('collapsed');
        var tb = document.querySelector('.toggle-btn');
        if (tb) tb.addEventListener('click', function () { setTimeout(saveSidebarState, 50); });
    }

    /* ========== 初始化 ========== */
    document.addEventListener('DOMContentLoaded', function () {
        try {
            syncGlobalDate();
            setupSidebar();

            var doc = loadDocumentData();
            if (!doc) {
                console.warn('[Labour] 沒有找到 document metadata');
                doc = {
                    id: 'GF527A-TEMP-' + Date.now(),
                    status: 'draft',
                    approvalStatus: 'pending',
                    type: 'GF527A',
                    typeText: 'GF527A - Return on Construction Site Employment'
                };
            }
            currentDoc = doc;

            var savedTotal = currentDoc.totalPages || 0;
            totalVirtualPages = Math.max(1, savedTotal);

            updateDocumentInfo(currentDoc);
            updatePageInfo();

            showLoading('Loading GF527A PDF...');
            loadPdfTemplate().then(function () {
                hideLoading();
                renderCurrentPage();
                setupNavigation();
                bindActionButtons();
                setTimeout(function () { updateApprovalButtons(); }, 500);
                console.log('[Labour] Editor ready. Total pages:', totalVirtualPages);
            }).catch(function (err) {
                console.error('[Labour] PDF load failed:', err);
                hideLoading();
                pageWrapper.innerHTML =
                    '<div style="padding:40px;text-align:center;color:#e74c3c;background:#fff;border-radius:8px;">' +
                    '<i class="fas fa-exclamation-triangle" style="font-size:32px;"></i><br><br>' +
                    '<strong>Failed to load PDF template</strong><br>' +
                    '<small>Error: ' + (err && err.message ? err.message : 'unknown') + '</small><br><br>' +
                    '<small>請確認 GF527A-data.js 已載入（window.LABOURWAGE_BASE64）</small>' +
                    '</div>';
            });

        } catch (err) {
            console.error('[Labour] Init failed:', err);
            if (pageWrapper) {
                pageWrapper.innerHTML =
                    '<div style="padding:40px;text-align:center;color:#e74c3c;">' +
                    'Init error: ' + (err && err.message ? err.message : 'unknown') +
                    '</div>';
            }
        }
    });

})();