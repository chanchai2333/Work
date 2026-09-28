/**
 * editlabour.js - Labour Wage 編輯器
 *   - 支援多頁 PDF 模板顯示（修正：原本只渲染第 1 頁）
 *   - GF527A / GF527-2003 / GF527-2017 皆走同一套多頁 PDF 渲染
 *   - GF527-2017 額外提供 Download / Upload Excel 按鈕
 *   - 已移除 GF527-2017 overlay 疊加格子功能（避免畫面雜亂）
 */
(function () {
    'use strict';

    var PDF_RENDER_SCALE = 2.0;
    var DEFAULT_TOTAL_PAGES = 1;
    var STORAGE_KEY = 'labourWageData';

    var TEMPLATE_FILES = {
        'GF527A':     null,
        'GF527-2003': 'gf527_rev_1_2003_protected_r1 (July 26).xls',
        'GF527-2017': null  // 使用內嵌 base64（GF5272017-data.js）
    };

    if (window.pdfjsLib) {
        try {
            pdfjsLib.GlobalWorkerOptions.workerSrc =
                'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
        } catch (e) {}
    }

    var currentDoc = null;
    var activePageNum = 1;
    var totalVirtualPages = DEFAULT_TOTAL_PAGES;
    var currentPageObj = null;
    var pdfDoc = null;

    // ★ 每頁各自的圖片與尺寸
    var templateImages = [];   // templateImages[i] = dataURL
    var pageCssSizes   = [];   // pageCssSizes[i]   = { w, h }

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
            prevBtn.style.cursor  = prevBtn.disabled ? 'not-allowed' : 'pointer';
        }
        if (nextBtn) {
            nextBtn.disabled = (activePageNum >= totalVirtualPages);
            nextBtn.style.opacity = nextBtn.disabled ? '0.5' : '1';
            nextBtn.style.cursor  = nextBtn.disabled ? 'not-allowed' : 'pointer';
        }
        var pageInput = document.getElementById('page-input');
        if (pageInput) {
            pageInput.value = activePageNum;
            pageInput.max   = totalVirtualPages;
        }
    }

    function loadDocumentData() {
        var sources = ['editDocument', 'currentWageRecord', 'currentRecord'];
        for (var i = 0; i < sources.length; i++) {
            var raw = sessionStorage.getItem(sources[i]);
            if (!raw) continue;
            try {
                var d = JSON.parse(raw);
                if (d && typeof d === 'object' && d.id) return d;
            } catch (e) {}
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
        if (titleEl) titleEl.textContent = doc.title || typeText || 'Labour Wage Document';

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

        /* GF527-2017 專用：顯示/隱藏 Excel 按鈕 */
        var dlBtn = document.getElementById('download-excel-btn');
        var ulBtn = document.getElementById('upload-excel-btn');
        if (doc.type === 'GF527-2017') {
            if (dlBtn) dlBtn.classList.add('visible');
            if (ulBtn) ulBtn.classList.add('visible');
        } else {
            if (dlBtn) dlBtn.classList.remove('visible');
            if (ulBtn) ulBtn.classList.remove('visible');
        }
    }

    function base64ToUint8(base64) {
        if (base64.indexOf('base64,') !== -1) base64 = base64.split('base64,')[1];
        var binaryString = atob(base64);
        var len = binaryString.length;
        var bytes = new Uint8Array(len);
        for (var i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
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

    /* ========== 取得 PDF 模板 base64 ========== */
    function getTemplateBase64() {
        return new Promise(function (resolve, reject) {
            var docType = (currentDoc && currentDoc.type) || 'GF527A';
            console.log('[Labour] 取得 PDF 模板，類型 =', docType);

            var fromSession = sessionStorage.getItem('labour_template_' + docType);
            if (fromSession && fromSession.length > 100) {
                console.log('[Labour] ✓ 使用 sessionStorage 快取模板:', docType);
                resolve(fromSession);
                return;
            }

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

            if (docType === 'GF527-2017') {
                var embedded2017 = window.GF527_2017_BASE64
                                || window.GF527_REV_1_2017_PROTECTED_FONT_SIZE_26_BASE64;
                if (embedded2017 && embedded2017.length > 100) {
                    console.log('[Labour] ✓ 使用內嵌 GF527-2017 PDF base64');
                    resolve(embedded2017);
                    return;
                }
            }

            var defaultTpl = sessionStorage.getItem('DEFAULT_PDF_TEMPLATE');
            if (defaultTpl && defaultTpl.length > 100) {
                console.log('[Labour] ✓ 使用 DEFAULT_PDF_TEMPLATE');
                resolve(defaultTpl);
                return;
            }

            var file = TEMPLATE_FILES[docType];
            if (!file) {
                reject(new Error('沒有對應的模板檔案（' + docType + '）'));
                return;
            }

            console.log('[Labour] 從檔案載入 PDF 模板:', file);
            fetch(file).then(function (res) {
                if (!res.ok) throw new Error('HTTP ' + res.status);
                return res.arrayBuffer();
            }).then(function (buf) {
                var b64 = arrayBufferToBase64(buf);
                try { sessionStorage.setItem('labour_template_' + docType, b64); } catch (e) {}
                resolve(b64);
            }).catch(reject);
        });
    }

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

    /* ========== ★ 核心修正：渲染全部頁面 ========== */
    function loadPdfTemplate() {
        return loadPdfFromBase64().then(function (pdf) {
            pdfDoc = pdf;
            totalVirtualPages = pdf.numPages;  // ★ 從 PDF 讀出實際頁數（例如 4）
            templateImages = [];
            pageCssSizes   = [];

            console.log('[Labour] PDF 載入完成，共 ' + pdf.numPages + ' 頁');

            // 依序渲染每一頁，避免同時佔用大量 canvas
            var chain = Promise.resolve();
            for (var i = 1; i <= pdf.numPages; i++) {
                (function (pageNum) {
                    chain = chain.then(function () {
                        return pdf.getPage(pageNum).then(function (page) {
                            var viewport = page.getViewport({ scale: PDF_RENDER_SCALE });
                            var canvas = document.createElement('canvas');
                            canvas.width  = viewport.width;
                            canvas.height = viewport.height;
                            var ctx = canvas.getContext('2d');
                            return page.render({ canvasContext: ctx, viewport: viewport }).promise
                                .then(function () {
                                    templateImages[pageNum - 1] = canvas.toDataURL('image/png');
                                    pageCssSizes[pageNum - 1] = {
                                        w: viewport.width  / PDF_RENDER_SCALE,
                                        h: viewport.height / PDF_RENDER_SCALE
                                    };
                                    console.log('[Labour] ✓ 第 ' + pageNum + ' 頁渲染完成');
                                    // 釋放 canvas
                                    canvas.width = 0;
                                    canvas.height = 0;
                                });
                        });
                    });
                })(i);
            }
            return chain;
        });
    }

    /* ========== 渲染 ========== */
    function loadTemplate() {
        var type = currentDoc && currentDoc.type;
        console.log('[Labour] 載入模板：' + type);
        return loadPdfTemplate();
    }

    function renderCurrentPage() {
        var idx = activePageNum - 1;
        var imgData = templateImages[idx];
        var size = pageCssSizes[idx];
        if (!imgData || !size) {
            console.warn('[Labour] 第 ' + activePageNum + ' 頁尚未渲染');
            return;
        }

        pageWrapper.innerHTML = '';

        var pageDiv = document.createElement('div');
        pageDiv.className = 'pdf-page active-page';
        pageDiv.dataset.page = activePageNum;
        pageDiv.style.width  = size.w + 'px';
        pageDiv.style.height = size.h + 'px';

        var img = document.createElement('img');
        img.src = imgData;
        img.className = 'pdf-bg';
        img.draggable = false;
        img.alt = 'Labour Wage Template - Page ' + activePageNum;
        pageDiv.appendChild(img);

        pageWrapper.appendChild(pageDiv);

        currentPageObj = { pageNum: activePageNum, container: pageDiv };
        updatePageInfo();
    }

    function goToPage(n) {
        if (n < 1 || n > totalVirtualPages) return;
        activePageNum = n;
        renderCurrentPage();
    }

    function setupNavigation() {
        var prevBtn  = document.getElementById('prev-page');
        var nextBtn  = document.getElementById('next-page');
        var pageInput = document.getElementById('page-input');

        if (prevBtn) prevBtn.addEventListener('click', function () {
            if (activePageNum > 1) goToPage(activePageNum - 1);
        });

        if (nextBtn) nextBtn.addEventListener('click', function () {
            if (activePageNum < totalVirtualPages) {
                goToPage(activePageNum + 1);
            }
        });

        if (pageInput) pageInput.addEventListener('keydown', function (e) {
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

        if (pageInput) pageInput.addEventListener('focus', function () {
            try { pageInput.select(); } catch (e) {}
        });
    }

    /* ========== 儲存 / 提交 / 審批 ========== */
    function saveChanges() {
        if (!currentDoc) { alert('No document to save.'); return; }
        currentDoc.totalPages = totalVirtualPages;

        try {
            sessionStorage.setItem('editDocument', JSON.stringify(currentDoc));
            sessionStorage.setItem('currentWageRecord', JSON.stringify(currentDoc));
            sessionStorage.setItem('currentRecord', JSON.stringify(currentDoc));
        } catch (e) {
            console.warn('[Labour] sessionStorage 儲存失敗');
        }

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
        try {
            if (idx !== -1) data[idx] = currentDoc;
            else data.push(currentDoc);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch (e) {
            console.error('[Labour] localStorage 儲存失敗', e);
        }

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
        var rejectBtn  = document.getElementById('reject-btn');
        var submitBtn  = document.getElementById('submit-btn');
        var sessionData = {};
        try { sessionData = JSON.parse(sessionStorage.getItem('dwss_session') || '{}'); } catch (e) {}
        var canApprove = sessionData.permissions && sessionData.permissions.canChangeStatus;

        if (!canApprove) {
            if (approveBtn) approveBtn.style.display = 'none';
            if (rejectBtn)  rejectBtn.style.display  = 'none';
        } else {
            if (approveBtn) approveBtn.style.display = 'inline-flex';
            if (rejectBtn)  rejectBtn.style.display  = 'inline-flex';
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

    /* ========== Excel 下載 / 上傳（僅 GF527-2017） ========== */
    function bindExcelButtons() {
        var dlBtn  = document.getElementById('download-excel-btn');
        var ulBtn  = document.getElementById('upload-excel-btn');
        var ulInput = document.getElementById('upload-excel-input');

        if (dlBtn) {
            dlBtn.addEventListener('click', function () {
                try {
                    var b64 = (currentDoc && currentDoc.excelData && currentDoc.excelData.length > 100)
                        ? currentDoc.excelData
                        : (window.GF527_REV_1_2017_PROTECTED_FONT_SIZE_26_BASE64 || null);

                    if (!b64) {
                        alert('此文件沒有可下載的 Excel 檔案');
                        return;
                    }

                    var bytes = base64ToUint8(b64);
                    var blob = new Blob([bytes], {
                        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                    });
                    var url = URL.createObjectURL(blob);
                    var a = document.createElement('a');
                    a.href = url;
                    a.download = (currentDoc.id || 'GF527-2017') + '.xlsx';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    setTimeout(function () { URL.revokeObjectURL(url); }, 60000);

                    dlBtn.innerHTML = '<i class="fas fa-check"></i> 已下載';
                    setTimeout(function () {
                        dlBtn.innerHTML = '<i class="fas fa-file-excel"></i> Download Excel';
                    }, 2000);
                } catch (e) {
                    console.error('[GF527] 下載失敗:', e);
                    alert('下載失敗：' + (e && e.message ? e.message : e));
                }
            });
        }

        if (ulBtn && ulInput) {
            ulBtn.addEventListener('click', function () {
                ulInput.value = '';
                ulInput.click();
            });
            ulInput.addEventListener('change', function (e) {
                var file = e.target.files[0];
                if (!file) return;
                if (!/\.(xlsx|xls)$/i.test(file.name)) {
                    alert('僅接受 .xlsx / .xls 檔案');
                    return;
                }

                ulBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 讀取中...';
                ulBtn.disabled = true;

                var reader = new FileReader();
                reader.onload = function (ev) {
                    var b64 = ev.target.result.split(',')[1];
                    if (!currentDoc) return;
                    currentDoc.excelData = b64;
                    currentDoc.excelFileName = file.name;
                    currentDoc.excelUploadedAt = new Date().toISOString();

                    try {
                        sessionStorage.setItem('editDocument', JSON.stringify(currentDoc));
                        sessionStorage.setItem('currentWageRecord', JSON.stringify(currentDoc));
                    } catch (err) {}

                    ulBtn.innerHTML = '<i class="fas fa-check"></i> 已上傳: ' + file.name;
                    ulBtn.disabled = false;
                    setTimeout(function () {
                        ulBtn.innerHTML = '<i class="fas fa-upload"></i> Upload Excel';
                    }, 3000);
                    alert('✅ 已載入：' + file.name + '\n（請按「Save Changes」保存到系統）');
                };
                reader.onerror = function () {
                    ulBtn.innerHTML = '<i class="fas fa-upload"></i> Upload Excel';
                    ulBtn.disabled = false;
                    alert('讀取檔案失敗');
                };
                reader.readAsDataURL(file);
            });
        }
    }

    function bindActionButtons() {
        var saveBtn    = document.getElementById('save-btn');
        var cancelBtn  = document.getElementById('cancel-btn');
        var submitBtn  = document.getElementById('submit-btn');
        var approveBtn = document.getElementById('approve-btn');
        var rejectBtn  = document.getElementById('reject-btn');

        if (saveBtn)    saveBtn.addEventListener('click', saveChanges);
        if (cancelBtn)  cancelBtn.addEventListener('click', cancelEditing);
        if (submitBtn)  submitBtn.addEventListener('click', submitDocument);
        if (approveBtn) approveBtn.addEventListener('click', approveDocument);
        if (rejectBtn)  rejectBtn.addEventListener('click', rejectDocument);

        bindExcelButtons();
    }

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

            // 初始值（載入 PDF 後會被實際頁數覆蓋）
            totalVirtualPages = 1;

            updateDocumentInfo(currentDoc);
            updatePageInfo();

            var loadingMsg = 'Loading ' + (currentDoc.type || 'GF527A') + ' template...';
            showLoading(loadingMsg);

            loadTemplate().then(function () {
                hideLoading();
                renderCurrentPage();
                setupNavigation();
                bindActionButtons();
                updatePageInfo();   // ★ 顯示正確的「of N」
                setTimeout(function () { updateApprovalButtons(); }, 500);
                console.log('[Labour] Editor ready. Type:', currentDoc.type,
                            'Total pages:', totalVirtualPages);
            }).catch(function (err) {
                console.error('[Labour] Template load failed:', err);
                hideLoading();
                pageWrapper.innerHTML =
                    '<div style="padding:40px;text-align:center;color:#e74c3c;background:#fff;border-radius:8px;">' +
                    '<i class="fas fa-exclamation-triangle" style="font-size:32px;"></i><br><br>' +
                    '<strong>Failed to load template</strong><br>' +
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