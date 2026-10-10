// labourwage.js - Labour Wage 頁面邏輯（整合 DWSS 權限控制 + 項目隔離）
document.addEventListener("DOMContentLoaded", function () {
    // ==================== 權限初始化 ====================
    DWSS_Auth.updateHeaderUser();

    // ==================== 狀態映射 ====================
    const STATUS_TEXT_MAP = {
        'draft': 'Draft',
        'submitted': 'Submitted',
        'submitted-wsg': 'Submitted to WSG',
        'submitted-ig': 'Submitted to IG',
        'endorsed': 'Endorsed',
        'cancelled': 'Cancelled',
        'confirm': "Client's Site Representative to Confirm",
        'double-check': "Contractor/Contractor's Agent Double Check"
    };
    const STATUS_CLASS_MAP = {
        'draft': 'status-draft',
        'submitted': 'status-submitted',
        'submitted-wsg': 'status-submitted',
        'submitted-ig': 'status-submitted',
        'endorsed': 'status-endorsed',
        'cancelled': 'status-cancelled',
        'confirm': 'status-confirm',
        'double-check': 'status-double-check'
    };

    // ==================== 數據管理 ====================
    const STORAGE_KEY = 'wageData';

    let wageData = [];
    let currentFilters = { type: "all", status: "all", site: "all" };

    // ★ 每個項目的預設記錄（平均分配）
    const DEFAULT_PROJECT_DATA = {
        'DE/2026/05': [
            { id: "LRR/XX/26/000001A", type: "GF527A",     typeText: "GF527A - Return on Construction Site Employment", status: "draft",     site: "Treatment Plant", period: "01-Sep-2025 to 07-Sep-2025",  submittedBy: "John Doe",   periodStart: "2025-09-01", periodEnd: "2025-09-07", project: "DE/2026/05", pdfData: null, annotations: [] },
            { id: "LRR/XX/26/000002A", type: "GF527-2003", typeText: "GF527 (2003) - Labour Wage",                       status: "submitted", site: "Pipeline",        period: "01-Sep-2025 to 15-Sep-2025", submittedBy: "Jane Smith", periodStart: "2025-09-01", periodEnd: "2025-09-15", project: "DE/2026/05", pdfData: null, annotations: [] },
            { id: "LRR/XX/26/000003A", type: "GF527-2017", typeText: "GF527 (2017) - Labour Wage",                       status: "endorsed",  site: "Reservoir",       period: "01-Aug-2025 to 31-Aug-2025", submittedBy: "Robert Johnson", periodStart: "2025-08-01", periodEnd: "2025-08-31", project: "DE/2026/05", pdfData: null, annotations: [] }
        ],
        'DE/2025/02': [
            { id: "LRR/XX/25/02/000001A", type: "GF527A",     typeText: "GF527A - Return on Construction Site Employment", status: "draft",         site: "Distribution",   period: "01-Sep-2025 to 07-Sep-2025",  submittedBy: "Michael Brown", periodStart: "2025-09-01", periodEnd: "2025-09-07", project: "DE/2025/02", pdfData: null, annotations: [] },
            { id: "LRR/XX/25/02/000002A", type: "GF527-2003", typeText: "GF527 (2003) - Labour Wage",                       status: "double-check", site: "Pump Station",   period: "01-Sep-2025 to 15-Sep-2025", submittedBy: "Emma Davis",   periodStart: "2025-09-01", periodEnd: "2025-09-15", project: "DE/2025/02", pdfData: null, annotations: [] }
        ],
        'DE/2025/09': [
            { id: "LRR/XX/25/09/000001A", type: "GF527-2017", typeText: "GF527 (2017) - Labour Wage",                       status: "confirm",   site: "Reservoir",       period: "01-Sep-2025 to 15-Sep-2025", submittedBy: "Olivia Garcia", periodStart: "2025-09-01", periodEnd: "2025-09-15", project: "DE/2025/09", pdfData: null, annotations: [] },
            { id: "LRR/XX/25/09/000002A", type: "GF527A",     typeText: "GF527A - Return on Construction Site Employment", status: "submitted", site: "Treatment Plant", period: "01-Sep-2025 to 07-Sep-2025",  submittedBy: "David Wilson",  periodStart: "2025-09-01", periodEnd: "2025-09-07", project: "DE/2025/09", pdfData: null, annotations: [] },
            { id: "LRR/XX/25/09/000003A", type: "GF527-2003", typeText: "GF527 (2003) - Labour Wage",                       status: "endorsed",  site: "Pipeline",        period: "01-Aug-2025 to 31-Aug-2025", submittedBy: "James Miller",  periodStart: "2025-08-01", periodEnd: "2025-08-31", project: "DE/2025/09", pdfData: null, annotations: [] }
        ]
    };

    // ★ 把所有項目的預設記錄攤平
    function getAllDefaultRecords() {
        const all = [];
        Object.keys(DEFAULT_PROJECT_DATA).forEach(function (projectId) {
            DEFAULT_PROJECT_DATA[projectId].forEach(function (rec) {
                all.push(Object.assign({}, rec));
            });
        });
        return all;
    }

    // ==================== 載入 / 儲存 ====================
    function initWageData() {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored && stored !== 'null' && stored !== '[]') {
            try {
                wageData = JSON.parse(stored);
                let migrated = 0;
                wageData.forEach(item => {
                    if (!item.hasOwnProperty('pdfData')) item.pdfData = null;
                    if (!item.hasOwnProperty('annotations')) item.annotations = [];
                    if (!item.status) item.status = 'draft';

                    // ★ 舊資料沒有 project → 依 ID 前綴推斷
                    if (!item.project) {
                        if (item.id && item.id.indexOf('LRR/XX/25/02') === 0) {
                            item.project = 'DE/2025/02';
                        } else if (item.id && item.id.indexOf('LRR/XX/25/09') === 0) {
                            item.project = 'DE/2025/09';
                        } else {
                            item.project = 'DE/2026/05';
                        }
                        migrated++;
                    }
                });
                if (migrated > 0) {
                    console.log('[LabourWage] ✓ 已為 ' + migrated + ' 筆舊記錄補上 project');
                }
                saveData();
            } catch(e) {
                console.error('[LabourWage] 資料解析失敗，使用預設', e);
                wageData = getAllDefaultRecords();
                saveData();
            }
        } else {
            console.log('[LabourWage] ✓ 首次載入，建立 3 個項目的預設資料');
            wageData = getAllDefaultRecords();
            saveData();
        }
        renderWageTable();
    }

    function saveData() {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(wageData));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(wageData));
        localStorage.setItem('labourWageData', JSON.stringify(wageData));
    }

    // ★ 項目過濾輔助函數
    function getProjectData() {
        const projectId = (typeof DWSS_Auth !== 'undefined' && DWSS_Auth.getProjectId)
            ? DWSS_Auth.getProjectId()
            : null;

        if (!projectId) {
            return wageData.filter(function (item) {
                return !item.project;
            });
        }
        return wageData.filter(function (item) {
            return item.project === projectId;
        });
    }

    // ==================== 自動生成 Document ID ====================
    function generateNextLabourWageId() {
        const projectId = (typeof DWSS_Auth !== 'undefined' && DWSS_Auth.getProjectId)
            ? DWSS_Auth.getProjectId()
            : null;

        let ID_PREFIX;
        if (projectId === 'DE/2026/05') {
            ID_PREFIX = 'LRR/XX/26/';
        } else if (projectId === 'DE/2025/02') {
            ID_PREFIX = 'LRR/XX/25/02/';
        } else if (projectId === 'DE/2025/09') {
            ID_PREFIX = 'LRR/XX/25/09/';
        } else {
            ID_PREFIX = 'LRR/XX/';
        }

        const ID_SUFFIX = 'A';
        const ID_PAD    = 6;

        const escaped = ID_PREFIX.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const re = new RegExp('^' + escaped + '(\\d+)[A-Za-z]?$');

        const projectData = getProjectData();
        let maxNum = 0;
        projectData.forEach(function (item) {
            if (!item || item.id == null) return;
            const m = String(item.id).match(re);
            if (m) {
                const n = parseInt(m[1], 10);
                if (!isNaN(n) && n > maxNum) maxNum = n;
            }
        });

        const next = maxNum + 1;
        return ID_PREFIX + String(next).padStart(ID_PAD, '0') + ID_SUFFIX;
    }

    // ==================== 輔助 ====================
    function getStatusClass(status) { return STATUS_CLASS_MAP[status] || 'status-draft'; }
    function getStatusText(status) { return STATUS_TEXT_MAP[status] || status || 'Draft'; }

    function sortByDateDesc(data) {
        return data.slice().sort(function(a, b) {
            if (!a.periodStart) return 1;
            if (!b.periodStart) return -1;
            return b.periodStart.localeCompare(a.periodStart);
        });
    }

    function getSiteType(siteName) {
        if (!siteName) return 'other';
        var lower = siteName.toLowerCase();
        if (lower.includes('treatment')) return 'treatment';
        if (lower.includes('pipeline')) return 'pipeline';
        if (lower.includes('reservoir')) return 'reservoir';
        if (lower.includes('distribution')) return 'distribution';
        if (lower.includes('pump')) return 'pump';
        return 'other';
    }

    function readFileAsBase64(file) {
        return new Promise(function(resolve, reject) {
            var reader = new FileReader();
            reader.onload = function() { resolve(reader.result.split(',')[1]); };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    // ==================== 渲染 ====================
    function renderWageTable() {
        var tbody = document.getElementById('wage-table-body');
        var noResults = document.getElementById('no-results-message');
        if (!tbody) return;
        tbody.innerHTML = '';

        // ★ 先按項目過濾
        const projectData = getProjectData();

        var filtered = projectData.filter(function(item) {
            if (currentFilters.type !== "all" && item.type !== currentFilters.type) return false;
            if (currentFilters.status !== "all") {
                if (currentFilters.status === 'submitted') {
                    if (!item.status || !item.status.startsWith('submitted')) return false;
                } else {
                    if (item.status !== currentFilters.status) return false;
                }
            }
            if (currentFilters.site !== "all") {
                if (getSiteType(item.site) !== currentFilters.site) return false;
            }
            return true;
        });

        var sortedData = sortByDateDesc(filtered);

        if (sortedData.length === 0) {
            if (noResults) noResults.style.display = 'block';
            tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:40px; color:#999;">No records found</td></tr>';
        } else {
            if (noResults) noResults.style.display = 'none';
            sortedData.forEach(function(item) {
                var row = document.createElement('tr');
                var approvalDisplay = '';
                if (item.approvalStatus === 'approved') {
                    approvalDisplay = '<span class="status-badge" style="background:rgba(46,204,113,0.2);color:#27ae60;">✅ Approved</span>';
                } else if (item.approvalStatus === 'rejected') {
                    approvalDisplay = '<span class="status-badge" style="background:rgba(231,76,60,0.2);color:#c0392b;">❌ Rejected</span>';
                } else {
                    approvalDisplay = '<span class="status-badge" style="background:rgba(243,156,18,0.2);color:#d35400;">⏳ Pending</span>';
                }

                row.innerHTML = `
                    <td>${item.id}</td>
                    <td>${item.typeText}</td>
                    <td><span class="status-badge ${getStatusClass(item.status)}">${getStatusText(item.status)}</span></td>
                    <td>${approvalDisplay}</td>
                    <td>${item.site}</td>
                    <td>${item.period}</td>
                    <td>${item.submittedBy}</td>
                    <td class="action-buttons">
                        <button class="action-btn view-btn" data-id="${item.id}" title="View"><i class="fas fa-eye"></i></button>
                        <button class="action-btn edit-btn" data-id="${item.id}" title="Edit"><i class="fas fa-edit"></i></button>
                        ${window.DWSS_Auth ? DWSS_Auth.generateStatusSelect(item.id) : ''}
                        <button class="action-btn delete-btn" data-id="${item.id}" title="Delete"><i class="fas fa-trash"></i></button>
                        ${window.DWSS_Auth ? DWSS_Auth.generatePermissionHint() : ''}
                    </td>
                `;
                tbody.appendChild(row);
            });
        }

        updateStats();
        bindActionButtons();

        if (window.DWSS_Auth) {
            DWSS_Auth.bindStatusChangeEvents(
                function(id) { return wageData.find(function(r) { return String(r.id) === String(id); }); },
                function() { saveData(); },
                function() { renderWageTable(); }
            );
        }
    }

    function updateStats() {
        // ★ 只統計「當前項目」
        const projectData = getProjectData();

        var totalEl = document.getElementById('total-records-count');
        if (totalEl) totalEl.textContent = projectData.length;

        var monthEl = document.getElementById('month-count');
        if (monthEl) {
            var now = new Date();
            var currMonth = now.getMonth(), currYear = now.getFullYear();
            var monthCount = 0;
            projectData.forEach(function(r) {
                if (r.periodStart) {
                    try {
                        var d = new Date(r.periodStart);
                        if (d.getMonth() === currMonth && d.getFullYear() === currYear) monthCount++;
                    } catch(e) {}
                }
            });
            monthEl.textContent = monthCount;
        }
    }

    // ==================== 操作按鈕 ====================
    function bindActionButtons() {
        document.querySelectorAll('.view-btn').forEach(function(btn) {
            btn.removeEventListener('click', handleView);
            btn.addEventListener('click', handleView);
        });
        document.querySelectorAll('.edit-btn').forEach(function(btn) {
            btn.removeEventListener('click', handleEdit);
            btn.addEventListener('click', handleEdit);
        });
        document.querySelectorAll('.delete-btn').forEach(function(btn) {
            btn.removeEventListener('click', handleDelete);
            btn.addEventListener('click', handleDelete);
        });
    }

    function handleView(e) {
        var wageId = e.currentTarget.getAttribute('data-id');
        var record = wageData.find(function(r) { return String(r.id) === String(wageId); });
        if (!record) { alert('Record not found'); return; }

        // ★ 安全檢查
        const projectData = getProjectData();
        if (!projectData.some(r => String(r.id) === String(wageId))) {
            alert('❌ This record does not belong to your current project.');
            return;
        }

        sessionStorage.setItem('currentWageRecord', JSON.stringify(record));
        sessionStorage.setItem('viewDocument', JSON.stringify(record));
        window.location.href = 'labourdocument.html';
    }

    function handleEdit(e) {
        var wageId = e.currentTarget.getAttribute('data-id');
        var record = wageData.find(function(r) { return String(r.id) === String(wageId); });
        if (!record) { alert('Record not found'); return; }

        const projectData = getProjectData();
        if (!projectData.some(r => String(r.id) === String(wageId))) {
            alert('❌ This record does not belong to your current project.');
            return;
        }

        var btn = e.currentTarget;
        var originalHtml = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        btn.disabled = true;

        // 從 sessionStorage 取得模板
        var templateCacheKey = 'labour_template_' + record.type;
        var cached = sessionStorage.getItem(templateCacheKey);

        var finalize = function() {
            sessionStorage.setItem('currentWageRecord', JSON.stringify(record));
            window.location.href = 'editlabour.html';
        };

        if (cached) {
            finalize();
        } else {
            // 沒有快取也直接跳，讓 editlabour.js 自己處理
            finalize();
        }
    }

    function handleDelete(e) {
        var wageId = e.currentTarget.getAttribute('data-id');

        const projectData = getProjectData();
        if (!projectData.some(r => String(r.id) === String(wageId))) {
            alert('❌ This record does not belong to your current project.');
            return;
        }

        if (confirm('Are you sure you want to delete this wage record?')) {
            wageData = wageData.filter(function(r) { return String(r.id) !== String(wageId); });
            saveData();
            renderWageTable();
        }
    }

    // ==================== 篩選器 ====================
    function setupFilterEvents() {
        document.querySelectorAll('.filter-group').forEach(function(group) {
            var toggle = group.querySelector('.filter-toggle');
            var options = group.querySelector('.filter-options');
            if (!toggle || !options) return;

            toggle.addEventListener('click', function(e) {
                e.stopPropagation();
                document.querySelectorAll('.filter-options').forEach(function(opt) {
                    if (opt !== options) opt.classList.remove('open');
                });
                options.classList.toggle('open');
            });

            group.querySelectorAll('.filter-option').forEach(function(opt) {
                opt.addEventListener('click', function(e) {
                    e.stopPropagation();
                    group.querySelectorAll('.filter-option').forEach(function(o) { o.classList.remove('active'); });
                    opt.classList.add('active');
                    toggle.querySelector('span').textContent = opt.textContent;
                    currentFilters[opt.dataset.filter] = opt.dataset.value;
                    renderWageTable();
                    options.classList.remove('open');
                });
            });
        });

        document.addEventListener('click', function() {
            document.querySelectorAll('.filter-options').forEach(function(opt) { opt.classList.remove('open'); });
        });
    }

    // ==================== 新增 Wage 模態框 ====================
    function setupAddWageModal() {
        var addWageBtn = document.getElementById('add-wage-btn');
        var modal = document.getElementById('add-wage-modal');
        var cancelBtn = document.getElementById('cancel-add-wage');
        var addForm = document.getElementById('add-wage-form');
        var fileInput = document.getElementById('input-pdf');

        if (addWageBtn && modal) {
            addWageBtn.addEventListener('click', function() {
                modal.style.display = 'flex';
                addForm.reset();

                // ★ 自動生成 Document ID（依項目）
                var docIdInput = document.getElementById('input-doc-id');
                if (docIdInput) {
                    docIdInput.value = generateNextLabourWageId();
                }

                if (window.DWSS_Auth) {
                    DWSS_Auth.adjustFormStatusOptions('input-status');
                    DWSS_Auth.autoFillSubmittedBy('input-submitted-by');
                }
            });
        }

        if (cancelBtn && modal) {
            cancelBtn.addEventListener('click', function() {
                modal.style.display = 'none';
                addForm.reset();
            });
        }

        if (modal) {
            modal.addEventListener('click', function(e) {
                if (e.target === modal) {
                    modal.style.display = 'none';
                    addForm.reset();
                }
            });
        }

        if (addForm) {
            addForm.addEventListener('submit', async function(e) {
                e.preventDefault();

                var type = document.getElementById('input-type').value;
                var status = document.getElementById('input-status').value;
                var site = document.getElementById('input-site').value;
                var periodStart = document.getElementById('input-period-start').value;
                var periodEnd = document.getElementById('input-period-end').value;
                var submittedBy = document.getElementById('input-submitted-by').value;

                var pdfData = null;
                var file = fileInput.files[0];
                if (file) {
                    try { pdfData = await readFileAsBase64(file); }
                    catch (err) { alert('Failed to read PDF file.'); return; }
                }

                var docIdInput = document.getElementById('input-doc-id');
                var newId = (docIdInput && docIdInput.value.trim())
                    ? docIdInput.value.trim()
                    : generateNextLabourWageId();

                if (wageData.some(function(r) { return String(r.id) === String(newId); })) {
                    alert('Document ID 已存在，請使用其他 ID。');
                    return;
                }

                var typeText = "";
                if (type === "GF527A") {
                    typeText = "GF527A - Return on Construction Site Employment";
                } else if (type === "GF527-2003") {
                    typeText = "GF527 (2003) - Labour Wage";
                } else {
                    typeText = "GF527 (2017) - Labour Wage";
                }

                function fmt(d) {
                    var date = new Date(d);
                    return date.getDate().toString().padStart(2, '0') + '-' +
                           date.toLocaleString('en-US', { month: 'short' }) + '-' +
                           date.getFullYear();
                }

                // ★ 取得當前項目
                var projectId = (typeof DWSS_Auth !== 'undefined' && DWSS_Auth.getProjectId)
                    ? DWSS_Auth.getProjectId()
                    : null;

                var newWage = {
                    id: newId,
                    type: type,
                    typeText: typeText,
                    status: status,
                    site: site,
                    period: fmt(periodStart) + ' to ' + fmt(periodEnd),
                    submittedBy: submittedBy,
                    periodStart: periodStart,
                    periodEnd: periodEnd,
                    project: projectId,   // ★ 綁定項目
                    pdfData: pdfData,
                    annotations: []
                };

                wageData.push(newWage);
                saveData();
                renderWageTable();

                modal.style.display = 'none';
                addForm.reset();
                alert('Wage record added successfully!\n\nNew ID: ' + newId);
            });
        }
    }

    // ==================== 日期同步 ====================
    function syncGlobalDate() {
        var storedDate = sessionStorage.getItem('globalDate');
        var dateSpan = document.querySelector('.date-display span');
        if (storedDate && dateSpan) {
            dateSpan.textContent = storedDate;
        } else if (dateSpan) {
            dateSpan.textContent = new Date().toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' });
        }
    }

    // ==================== 初始化 ====================
    function init() {
        if (typeof LanguageConfig !== 'undefined') LanguageConfig.init();
        initWageData();
        setupFilterEvents();
        setupAddWageModal();
        syncGlobalDate();
        if (window.DWSS_Auth) DWSS_Auth.updateHeaderUser();
    }

    init();
});