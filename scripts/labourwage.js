// labourwage.js - Labour Wage 頁面邏輯（整合 DWSS 權限控制 + 項目隔離）
document.addEventListener("DOMContentLoaded", function () {
    // ==================== 權限初始化 ====================
    DWSS_Auth.updateHeaderUser();

    // ==================== 狀態映射 ====================
    const STATUS_TEXT_MAP = {
        'draft': 'Draft',
        'submitted': 'Submit to IG',      // 兼容舊資料
        'submitted-ig': 'Submit to IG',
        'closed': 'IG Accepted',
        'reopen': 'Reopened',
        'cancelled': 'Cancelled'
    };
    const STATUS_CLASS_MAP = {
        'draft': 'status-draft',
        'submitted': 'status-submitted',
        'submitted-ig': 'status-submitted',
        'closed': 'status-endorsed',
        'reopen': 'status-confirm',
        'cancelled': 'status-cancelled'
    };

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
                    
                    // ★ 舊資料修復：直接轉為 submitted-ig
                    if (!item.status || item.status === 'submitted') {
                        item.status = 'submitted-ig';
                    }

                    if (!item.project) {
                        if (item.id && item.id.indexOf('LRR/DE-2025-02') === 0) {
                            item.project = 'DE/2025/02';
                        } else if (item.id && item.id.indexOf('LRR/DE-2025-09') === 0) {
                            item.project = 'DE/2025/09';
                        } else if (item.id && item.id.indexOf('LRR/DE-2026-05') === 0) {
                            item.project = 'DE/2026/05';
                        } else {
                            item.project = getCurrentProjectId() || 'DE/2026/05';
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

    // ==================== 數據管理 ====================
    const STORAGE_KEY = 'wageData';

    let wageData = [];
    let currentFilters = { type: "all", status: "all", site: "all" };

    // ★ 每個項目的預設記錄
    const DEFAULT_PROJECT_DATA = {
        'DE/2026/05': [
            { id: "LRR/DE-2026-05/000001A", type: "GF527A",     typeText: "GF527A - Return on Construction Site Employment", status: "draft",     site: "Treatment Plant", period: "01-Sep-2025 to 07-Sep-2025",  submittedBy: "John Doe",   periodStart: "2025-09-01", periodEnd: "2025-09-07", project: "DE/2026/05", pdfData: null, annotations: [] },
            { id: "LRR/DE-2026-05/000002A", type: "GF527-2003", typeText: "GF527 (2003) - Labour Wage",                       status: "submitted", site: "Pipeline",        period: "01-Sep-2025 to 15-Sep-2025", submittedBy: "Jane Smith", periodStart: "2025-09-01", periodEnd: "2025-09-15", project: "DE/2026/05", pdfData: null, annotations: [] },
            { id: "LRR/DE-2026-05/000003A", type: "GF527-2017", typeText: "GF527 (2017) - Labour Wage",                       status: "endorsed",  site: "Reservoir",       period: "01-Aug-2025 to 31-Aug-2025", submittedBy: "Robert Johnson", periodStart: "2025-08-01", periodEnd: "2025-08-31", project: "DE/2026/05", pdfData: null, annotations: [] }
        ],
        'DE/2025/02': [
            { id: "LRR/DE-2025-02/000001A", type: "GF527A",     typeText: "GF527A - Return on Construction Site Employment", status: "draft",         site: "Distribution",   period: "01-Sep-2025 to 07-Sep-2025",  submittedBy: "Michael Brown", periodStart: "2025-09-01", periodEnd: "2025-09-07", project: "DE/2025/02", pdfData: null, annotations: [] },
            { id: "LRR/DE-2025-02/000002A", type: "GF527-2003", typeText: "GF527 (2003) - Labour Wage",                       status: "double-check", site: "Pump Station",   period: "01-Sep-2025 to 15-Sep-2025", submittedBy: "Emma Davis",   periodStart: "2025-09-01", periodEnd: "2025-09-15", project: "DE/2025/02", pdfData: null, annotations: [] }
        ],
        'DE/2025/09': [
            { id: "LRR/DE-2025-09/000001A", type: "GF527-2017", typeText: "GF527 (2017) - Labour Wage",                       status: "confirm",   site: "Reservoir",       period: "01-Sep-2025 to 15-Sep-2025", submittedBy: "Olivia Garcia", periodStart: "2025-09-01", periodEnd: "2025-09-15", project: "DE/2025/09", pdfData: null, annotations: [] },
            { id: "LRR/DE-2025-09/000002A", type: "GF527A",     typeText: "GF527A - Return on Construction Site Employment", status: "submitted", site: "Treatment Plant", period: "01-Sep-2025 to 07-Sep-2025",  submittedBy: "David Wilson",  periodStart: "2025-09-01", periodEnd: "2025-09-07", project: "DE/2025/09", pdfData: null, annotations: [] },
            { id: "LRR/DE-2025-09/000003A", type: "GF527-2003", typeText: "GF527 (2003) - Labour Wage",                       status: "endorsed",  site: "Pipeline",        period: "01-Aug-2025 to 31-Aug-2025", submittedBy: "James Miller",  periodStart: "2025-08-01", periodEnd: "2025-08-31", project: "DE/2025/09", pdfData: null, annotations: [] }
        ]
    };

    function getAllDefaultRecords() {
        const all = [];
        Object.keys(DEFAULT_PROJECT_DATA).forEach(function (projectId) {
            DEFAULT_PROJECT_DATA[projectId].forEach(function (rec) {
                all.push(Object.assign({}, rec));
            });
        });
        return all;
    }

    // ★★★ 統一取得當前項目 ID ★★★
    function getCurrentProjectId() {
        if (typeof DWSS_Auth !== 'undefined' && DWSS_Auth.getProjectId) {
            var pid = DWSS_Auth.getProjectId();
            if (pid) return pid;
        }
        return sessionStorage.getItem('currentProjectId') || null;
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

                    if (!item.project) {
                        if (item.id && item.id.indexOf('LRR/DE-2025-02') === 0) {
                            item.project = 'DE/2025/02';
                        } else if (item.id && item.id.indexOf('LRR/DE-2025-09') === 0) {
                            item.project = 'DE/2025/09';
                        } else if (item.id && item.id.indexOf('LRR/DE-2026-05') === 0) {
                            item.project = 'DE/2026/05';
                        } else {
                            item.project = getCurrentProjectId() || 'DE/2026/05';
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
        localStorage.setItem(STORAGE_KEY, JSON.stringify(wageData));
        localStorage.setItem('labourWageData', JSON.stringify(wageData));
    }

    // ★ 項目過濾
    function getProjectData() {
        const projectId = getCurrentProjectId();

        if (!projectId) {
            return wageData.filter(function (item) {
                return !item.project;
            });
        }
        return wageData.filter(function (item) {
            return item.project === projectId;
        });
    }

    // ★★★ 安全檢查（寬鬆模式）★★★
    function canAccessRecord(recordId) {
        const record = wageData.find(r => String(r.id) === String(recordId));
        if (!record) return false;

        const currentProject = getCurrentProjectId();
        if (!currentProject || !record.project) return true;

        return record.project === currentProject;
    }

    // ==================== 自動生成 Document ID ====================
    function generateNextLabourWageId() {
        var contractCode = getContractCode();
        var prefix = 'LRR/' + contractCode + '/';
        var ID_SUFFIX = 'A';
        var ID_PAD    = 6;

        var escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        var re = new RegExp('^' + escaped + '(\\d+)[A-Za-z]?$');

        var projectData = getProjectData();

        var maxNum = 0;
        projectData.forEach(function (item) {
            if (!item || item.id == null) return;
            var m = String(item.id).match(re);
            if (m) {
                var n = parseInt(m[1], 10);
                if (!isNaN(n) && n > maxNum) maxNum = n;
            }
        });

        return prefix + String(maxNum + 1).padStart(ID_PAD, '0') + ID_SUFFIX;
    }

    // ==================== 輔助 ====================
        const OVERDUE_DAYS = 14;

    function parseLabourDate(item) {
        if (!item) return null;
        if (item.periodStart) {
            var d = new Date(item.periodStart);
            if (!isNaN(d.getTime())) return d;
        }
        if (item.createdAt) {
            var d2 = new Date(item.createdAt);
            if (!isNaN(d2.getTime())) return d2;
        }
        return null;
    }

    function isOverdue(item) {
        if (!item || item.status !== 'draft') return false;
        var d = parseLabourDate(item);
        if (!d) return false;
        var now = new Date();
        var diffDays = (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24);
        return diffDays > OVERDUE_DAYS;
    }

    // ==================== 分類輔助 ====================
    function categorize(item) {
        var s = (item && item.status) || 'draft';
        if (s === 'draft') return isOverdue(item) ? 'overdue' : 'other';
        if (s === 'submitted-ig') return 'pending';
        if (s === 'closed' || s === 'cancelled') return 'closed';
        return 'other'; // reopen
    }

    function generateStatusSelect(recordId) {
        if (window.DWSS_Auth && DWSS_Auth.canChangeStatus()) {
            return `
                <select class="status-change-select" data-id="${recordId}" title="Change Status">
                    <option value="">📝 Change Status</option>
                    <option value="draft">Draft</option>
                    <option value="submitted-ig">Submit to IG</option>
                    <option value="closed">IG Accepted</option>
                    <option value="reopen">Reopened</option>
                    <option value="cancelled">Cancelled</option>
                </select>
            `;
        }
        return '';
    }

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
    // ==================== 渲染表格 (四分類) ====================
    function renderWageTable() {
        const CATEGORIES = ['overdue', 'pending', 'closed', 'other'];
        const TBODY_IDS = {
            overdue: 'overdue-table-body',
            pending: 'pending-table-body',
            closed:  'closed-table-body',
            other:   'other-table-body'
        };

        CATEGORIES.forEach(function (key) {
            var el = document.getElementById(TBODY_IDS[key]);
            if (el) el.innerHTML = '';
        });

        var projectFilteredData = getProjectData();

        var filtered = projectFilteredData.filter(function(item) {
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

        var buckets = { overdue: [], pending: [], closed: [], other: [] };
        filtered.forEach(function (item) {
            var key = categorize(item);
            (buckets[key] || (buckets[key] = [])).push(item);
        });

        var userCanChangeStatus = window.DWSS_Auth && DWSS_Auth.canChangeStatus();

        CATEGORIES.forEach(function (key) {
            var tbody = document.getElementById(TBODY_IDS[key]);
            if (!tbody) return;

            var items = buckets[key] || [];
            items.sort(function(a, b) {
                if (!a.periodStart) return 1;
                if (!b.periodStart) return -1;
                return b.periodStart.localeCompare(a.periodStart);
            });

            items.forEach(function(item) {
                var row = document.createElement('tr');
                var approvalDisplay = '';
                if (item.approvalStatus === 'approved') {
                    approvalDisplay = '<span class="status-badge" style="background:rgba(46,204,113,0.2);color:#27ae60;">✅ Approved</span>';
                } else if (item.approvalStatus === 'rejected') {
                    approvalDisplay = '<span class="status-badge" style="background:rgba(231,76,60,0.2);color:#c0392b;">❌ Rejected</span>';
                } else {
                    approvalDisplay = '<span class="status-badge" style="background:rgba(243,156,18,0.2);color:#d35400;">⏳ Pending</span>';
                }

                var actionButtons = `
                    <button class="action-btn view-btn" data-id="${item.id}" title="View"><i class="fas fa-eye"></i></button>
                    <button class="action-btn edit-btn" data-id="${item.id}" title="Edit"><i class="fas fa-edit"></i></button>
                    ${generateStatusSelect(item.id)}
                    <button class="action-btn delete-btn" data-id="${item.id}" title="Delete"><i class="fas fa-trash"></i></button>
                `;

                if (!userCanChangeStatus) {
                    actionButtons += `<span class="permission-lock-hint"><i class="fas fa-lock"></i> Status change requires higher permission</span>`;
                }

                row.innerHTML = `
                    <td>${item.id}</td>
                    <td>${item.typeText}</td>
                    <td><span class="status-badge ${getStatusClass(item.status)}">${getStatusText(item.status)}</span></td>
                    <td>${approvalDisplay}</td>
                    <td>${item.site}</td>
                    <td>${item.period}</td>
                    <td>${item.submittedBy}</td>
                    <td class="action-buttons">${actionButtons}</td>
                `;
                tbody.appendChild(row);
            });

            var noRes = document.getElementById(key + '-no-results');
            if (noRes) noRes.style.display = items.length === 0 ? 'block' : 'none';

            var countBadge = document.getElementById(key + '-count');
            if (countBadge) countBadge.textContent = items.length;
        });

        updateStats(projectFilteredData);
        if (userCanChangeStatus) bindStatusChangeEvents();
    }

    function generateStatusSelect(recordId) {
        if (window.DWSS_Auth && DWSS_Auth.canChangeStatus()) {
            return `
                <select class="status-change-select" data-id="${recordId}" title="Change Status">
                    <option value="">📝 Change Status</option>
                    <option value="draft">Draft</option>
                    <option value="submitted-ig">Submit to IG</option>
                    <option value="closed">Closed</option>
                    <option value="reopen">Reopened</option>
                    <option value="cancelled">Cancelled</option>
                </select>
            `;
        }
        return '';
    }

    function bindStatusChangeEvents() {
        document.querySelectorAll('.status-change-select').forEach(function(select) {
            select.removeEventListener('change', handleStatusChange);
            select.addEventListener('change', handleStatusChange);
        });
    }

    function handleStatusChange(e) {
        var recordId = e.target.getAttribute('data-id');
        var newStatus = e.target.value;
        if (!newStatus) return;

        var record = wageData.find(function(r) { return String(r.id) === String(recordId); });
        if (!record) return;

        if (!canAccessRecord(recordId)) {
            alert('❌ This record does not belong to your current project.');
            e.target.value = '';
            return;
        }

        var oldStatus = record.status || 'draft';
        var oldStatusText = getStatusText(oldStatus);
        var newStatusText = getStatusText(newStatus);
        
        var oldApproval = record.approvalStatus || 'pending';
        var newApproval = 'pending';
        if (newStatus === 'cancelled') newApproval = 'cancelled';
        if (newStatus === 'closed') newApproval = 'approved';

        var user = window.DWSS_Auth ? DWSS_Auth.getCurrentUser() : { userName: 'Unknown' };

        if (confirm(
            '⚠️ Change Status Confirmation\n\n' +
            'Document ID: ' + recordId + '\n' +
            'From: ' + oldStatusText + '\n' +
            'To: ' + newStatusText + '\n\n' +
            'Are you sure you want to change the status?'
        )) {
            var now = new Date().toISOString();
            var userName = user ? user.userName : 'Unknown';
            var roleName = window.DWSS_Auth ? DWSS_Auth.getRoleName() : '';

            if (!Array.isArray(record.statusHistory)) record.statusHistory = [];
            record.statusHistory.push({
                changedAt: now,
                from: oldStatus,
                to: newStatus,
                fromApproval: oldApproval,
                toApproval: newApproval,
                changedBy: userName,
                role: roleName
            });

            record.status = newStatus;
            record.approvalStatus = newApproval;
            record.statusChangedBy = userName;
            record.statusChangedAt = now;
            record.statusChangedRole = roleName;

            saveData();
            renderWageTable();
            alert('✅ Status changed successfully!\n\n' + oldStatusText + ' → ' + newStatusText);
        } else {
            e.target.value = '';
        }
    }
    
    function updateStats(dataToUse) {
        var projectData = dataToUse || getProjectData();

        var totalEl = document.getElementById('total-records-count');
        if (totalEl) totalEl.textContent = projectData.length;

        var monthEl = document.getElementById('month-count');
        if (monthEl) {
            var now = new Date();
            var monthCount = projectData.filter(function (r) {
                return wageInCurrentMonth(r, now);
            }).length;
            monthEl.textContent = monthCount;
        }
    }

    function wageInCurrentMonth(item, now) {
        var d = wageDate(item);
        if (!d) return false;
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    }

    function wageDate(item) {
        if (!item) return null;
        if (item.periodStart) {
            var s = new Date(item.periodStart);
            if (!isNaN(s.getTime())) return s;
        }
        if (item.createdAt) {
            var c = new Date(item.createdAt);
            if (!isNaN(c.getTime())) return c;
        }
        var text = String(item.period || '').split(' to ')[0].trim();
        var dmy = text.match(/^(\d{2})-([A-Za-z]{3})-(\d{4})$/);
        if (dmy) {
            var months = { Jan:0, Feb:1, Mar:2, Apr:3, May:4, Jun:5, Jul:6, Aug:7, Sep:8, Oct:9, Nov:10, Dec:11 };
            if (months[dmy[2]] != null) return new Date(+dmy[3], months[dmy[2]], +dmy[1]);
        }
        var iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (iso) return new Date(+iso[1], +iso[2] - 1, +iso[3]);
        var parsed = new Date(text);
        return isNaN(parsed.getTime()) ? null : parsed;
    }

    // ==================== 操作按鈕（事件委派）====================
    document.addEventListener('click', function (e) {
        const viewBtn = e.target.closest('.view-btn');
        const editBtn = e.target.closest('.edit-btn');
        const deleteBtn = e.target.closest('.delete-btn');

        if (viewBtn) {
            var wageId = viewBtn.getAttribute('data-id');
            var record = wageData.find(function(r) { return String(r.id) === String(wageId); });
            if (!record) { alert('Record not found'); return; }

            if (!canAccessRecord(wageId)) {
                alert('❌ This record does not belong to your current project.');
                return;
            }

            window.location.href = 'labourdocument.html?id=' + encodeURIComponent(record.id);
        }

        if (editBtn) {
            var wageId = editBtn.getAttribute('data-id');
            var record = wageData.find(function(r) { return String(r.id) === String(wageId); });
            if (!record) { alert('Record not found'); return; }

            if (!canAccessRecord(wageId)) {
                alert('❌ This record does not belong to your current project.');
                return;
            }

            window.location.href = 'editlabour.html?id=' + encodeURIComponent(record.id);
        }

        if (deleteBtn) {
            var wageId = deleteBtn.getAttribute('data-id');

            if (!canAccessRecord(wageId)) {
                alert('❌ This record does not belong to your current project.');
                return;
            }

            if (confirm('Are you sure you want to delete this wage record?')) {
                wageData = wageData.filter(function(r) { return String(r.id) !== String(wageId); });
                saveData();
                renderWageTable();
            }
        }
    });

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
                    newId = generateNextLabourWageId();
                    if (docIdInput) docIdInput.value = newId;
                }
                if (wageData.some(function(r) { return String(r.id) === String(newId); })) {
                    alert('Document ID already exists. Please use another ID.');
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
                    project: getCurrentProjectId(),   // ★ 統一來源
                    pdfData: pdfData,
                    annotations: []
                };

                wageData.push(newWage);
                saveData();
                var saved = false;
                try {
                    var res = await fetch('/api/record?collection=wage&id=' + encodeURIComponent(newId), {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(newWage)
                    });
                    saved = res.ok;
                } catch (err) {
                    saved = false;
                }
                if (!saved && window.DWSS_Storage && typeof window.DWSS_Storage.flush === 'function') {
                    saved = await window.DWSS_Storage.flush(STORAGE_KEY);
                }
                renderWageTable();
                modal.style.display = 'none';
                addForm.reset();
                if (!saved) {
                    alert('Wage record was not saved to the database. Please try again.');
                    return;
                }
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
    async function loadFromDatabase() {
        try {
            const res = await fetch('/api/records/wage/list', { cache: 'no-store' });
            if (!res.ok) return;
            const list = await res.json();
            if (!Array.isArray(list)) return;
            wageData = list;
            window.__dwssWageRecords = list;
            try {
                var snap = JSON.parse(sessionStorage.getItem('dwss_page_counts') || '{}');
                snap.wage = String(getProjectData().length);
                snap.wageFiltered = true;
                sessionStorage.setItem('dwss_page_counts', JSON.stringify(snap));
            } catch (e) {}
            renderWageTable();
        } catch (e) {
            console.warn('[LabourWage] Could not load from database', e);
        }
    }

    async function init() {
        if (typeof LanguageConfig !== 'undefined') LanguageConfig.init();
        await loadFromDatabase();
        if (!wageData.length) initWageData();
        setupFilterEvents();
        setupAddWageModal();
        syncGlobalDate();
        if (window.DWSS_Auth) DWSS_Auth.updateHeaderUser();
    }

    init();
});