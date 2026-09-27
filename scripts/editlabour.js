/**
 * editlabour.js - Labour Wage 編輯器
 * 支援多模板類型：
 *   - GF527A     → 內嵌 base64（GF527A-data.js）
 *   - GF527-2003 → Excel 轉 PDF
 *   - GF527-2017 → Excel 轉 PDF
 */
(function () {
    'use strict';

    /* ========== 配置 ========== */
    var PDF_RENDER_SCALE = 2.0;
    var DEFAULT_TOTAL_PAGES = 1;
    var STORAGE_KEY = 'labourWageData';

    /* 模板檔案映射（依類型） */
    var TEMPLATE_FILES = {
        'GF527A':     null,  // 使用內嵌 base64
        'GF527-2003': 'gf527_rev_1_2003_protected_r1 (July 26).xls',
        'GF527-2017': 'GF527_Rev_1_2017_protected_font_size_26.xlsx'
    };

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
            titleEl.textContent = doc.title || typeText || 'Labour Wage Document';
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

    /* ========== base64 工具 ========== */
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

    function arrayBufferToBase64(buf) {
        var binary = '';
        var bytes = new Uint8Array(buf);
        var CHUNK = 0x8000;
        for (var i = 0; i < bytes.length; i += CHUNK) {
            var chunk = bytes.subarray(i, i + CHUNK);
            binary += String.fromCharCode.apply(null, chunk);
        }
        return btoa(binary);
    }

    /* ========== XLS/XLSX → PDF base64 ========== */
    function xlsToPdfBase64(url) {
        return new Promise(function (resolve, reject) {
            if (!window.XLSX) { reject(new Error('XLSX 庫未載入')); return; }
            if (!window.html2canvas) { reject(new Error('html2canvas 未載入')); return; }
            if (!window.jspdf) { reject(new Error('jsPDF 未載入')); return; }

            fetch(url).then(function (res) {
                if (!res.ok) throw new Error('HTTP ' + res.status + ' - ' + url);
                return res.arrayBuffer();
            }).then(function (buf) {
                var wb = XLSX.read(buf, { type: 'array' });
                if (!wb.SheetNames.length) throw new Error('無工作表');
                var sheet = wb.Sheets[wb.SheetNames[0]];
                var html = XLSX.utils.sheet_to_html(sheet);

                var container = document.createElement('div');
                container.innerHTML = html;
                container.style.cssText =
                    'position:fixed;left:-99999px;top:0;background:#ffffff;padding:10px;' +
                    'font-family:Arial,sans-serif;';
                document.body.appendChild(container);

                var table = container.querySelector('table');
                if (table) {
                    table.style.borderCollapse = 'collapse';
                    table.style.fontSize = '10px';
                    var cells = table.querySelectorAll('td, th');
                    for (var i = 0; i < cells.length; i++) {
                        cells[i].style.border = '1px solid #999999';
                        cells[i].style.padding = '2px 4px';
                        cells[i].style.whiteSpace = 'nowrap';
                    }
                }

                return new Promise(function (r) { setTimeout(r, 100); })
                    .then(function () {
                        return html2canvas(container, {
                            scale: 2,
                            backgroundColor: '#ffffff',
                            logging: false,
                            windowWidth: container.scrollWidth,
                            windowHeight: container.scrollHeight
                        });
                    })
                    .then(function (canvas) {
                        if (container.parentNode) container.parentNode.removeChild(container);

                        var imgData = canvas.toDataURL('image/jpeg', 0.92);
                        var isLandscape = canvas.width > canvas.height;
                        var jsPDFCtor = window.jspdf.jsPDF;
                        var pdf = new jsPDFCtor({
                            orientation: isLandscape ? 'landscape' : 'portrait',
                            unit: 'mm',
                            format: 'a4',
                            compress: true
                        });

                        var pageW = pdf.internal.pageSize.getWidth();
                        var pageH = pdf.internal.pageSize.getHeight();
                        var margin = 4;
                        var imgW = pageW - margin * 2;
                        var imgH = imgW * canvas.height / canvas.width;
                        if (imgH > pageH - margin * 2) {
                            imgH = pageH - margin * 2;
                            imgW = imgH * canvas.width / canvas.height;
                        }

                        pdf.addImage(
                            imgData, 'JPEG',
                            (pageW - imgW) / 2, (pageH - imgH) / 2,
                            imgW, imgH
                        );

                        var dataUri = pdf.output('datauristring');
                        resolve(dataUri.split(',')[1]);
                    });
            }).catch(reject);
        });
    }

    /* ========== 依類型取得模板 base64 ========== */
    function getTemplateBase64() {
        return new Promise(function (resolve, reject) {
            var docType = (currentDoc && currentDoc.type) || 'GF527A';
            console.log('[Labour] 取得模板，類型 =', docType);

            // ① 優先：labourwage.html 已轉好放進 sessionStorage 的快取
            var fromSession = sessionStorage.getItem('labour_template_' + docType);
            if (fromSession && fromSession.length > 100) {
                console.log('[Labour] ✓ 使用 sessionStorage 快取模板:', docType);
                resolve(fromSession);
                return;
            }

            // ② 次：labourwage.html 設的通用 DEFAULT_PDF_TEMPLATE
            var defaultTpl = sessionStorage.getItem('DEFAULT_PDF_TEMPLATE');
            if (defaultTpl && defaultTpl.length > 100) {
                console.log('[Labour] ✓ 使用 DEFAULT_PDF_TEMPLATE');
                resolve(defaultTpl);
                return;
            }

            // ③ 內嵌 GF527A base64（只有 GF527A 有）
            if (docType === 'GF527A') {
                var embedded = window.LABOURWAGE_BASE64
                            || window.SITE_DIARY_TEMPLATE_BASE64
                            || window.GF527A_BASE64;
                if (embedded && embedded.length > 100) {
                    console.log('[Labour] ✓ 使用內嵌 GF527A base64');
                    resolve(embedded);
                    return;
                }
            }

            // ④ 從檔案路徑直接讀（xlsx/xls 需先轉 PDF）
            var file = TEMPLATE_FILES[docType];
            if (!file) {
                reject(new Error('沒有對應的模板檔案（' + docType + '）'));
                return;
            }

            console.log('[Labour] 從檔案載入模板:', file);
            if (/\.pdf$/i.test(file)) {
                fetch(file).then(function (res) {
                    if (!res.ok) throw new Error('HTTP ' + res.status);
                    return res.arrayBuffer();
                }).then(function (buf) {
                    var b64 = arrayBufferToBase64(buf);
                    sessionStorage.setItem('labour_template_' + docType, b64);
                    resolve(b64);
                }).catch(reject);
            } else {
                xlsToPdfBase64(file).then(function (b64) {
                    sessionStorage.setItem('labour_template_' + docType, b64);
                    resolve(b64);
                }).catch(reject);
            }
        });
    }

    /* ========== 載入 PDF ========== */
    function loadPdfFromBase64() {
        return new Promise(function (resolve, reject) {
            getTemplateBase64().then(function (data) {
                if (!data || typeof data !== 'string' || data.length < 100) {
                    reject(new Error('無法取得模板 base64'));
                    return;
                }
                try {
                    var bytes = base64ToUint8(data);
                    pdfjsLib.getDocument({ data: bytes }).promise
                        .then(resolve).catch(reject);
                } catch (e) {
                    reject(e);
                }
            }).catch(reject);
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
        img.alt = 'Labour Wage Template';
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

            window.location.href = 'labourwage.html';
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
                console.warn('[Labour] 沒有找到 document metadata，使用預設 GF527A');
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

            var loadingMsg = 'Loading ' + (currentDoc.type || 'GF527A') + ' template...';
            showLoading(loadingMsg);

            loadPdfTemplate().then(function () {
                hideLoading();
                renderCurrentPage();
                setupNavigation();
                bindActionButtons();
                setTimeout(function () { updateApprovalButtons(); }, 500);
                console.log('[Labour] Editor ready. Type:', currentDoc.type, 'Total pages:', totalVirtualPages);
            }).catch(function (err) {
                console.error('[Labour] PDF load failed:', err);
                hideLoading();
                pageWrapper.innerHTML =
                    '<div style="padding:40px;text-align:center;color:#e74c3c;background:#fff;border-radius:8px;">' +
                    '<i class="fas fa-exclamation-triangle" style="font-size:32px;"></i><br><br>' +
                    '<strong>Failed to load PDF template</strong><br>' +
                    '<small>Type: ' + ((currentDoc && currentDoc.type) || 'GF527A') + '</small><br>' +
                    '<small>Error: ' + (err && err.message ? err.message : 'unknown') + '</small>' +
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