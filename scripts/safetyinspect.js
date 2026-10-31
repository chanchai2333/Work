// safetyinspect.js - 安全檢查頁面邏輯（整合 DWSS 權限控制 + 項目隔離 + 流程圖對齊）
document.addEventListener("DOMContentLoaded", function() {
    // ---------- 權限檢查 ----------
    DWSS_Auth.updateHeaderUser();

    // ---------- 數據管理 ----------
    const STORAGE_KEY = 'inspectionData';

    let inspectionData = [];

    // 安全檢查狀態映射（對齊流程圖：沒有 submit to WSG）
    const SAFETY_STATUS_MAP = {
        'draft': 'Draft',
        'submitted-ig': 'Submit to IG',
        'closed': 'IG Endorsed',
        'reopen': 'Reopened',
        'cancelled': 'Cancelled'
    };

    // ★ 每個項目的預設記錄
    const DEFAULT_PROJECT_DATA = {
        'DE/2026/05': [
            { id: "SSR/WSI/DE-2026-05/000001A", status: "draft",         site: "Treatment Plant", date: "2025-08-15", inspector: "John Doe",        project: "DE/2026/05", pdfData: null, annotations: [] },
            { id: "SSR/WSI/DE-2026-05/000002A", status: "submitted",     site: "Pipeline",        date: "2025-08-14", inspector: "Jane Smith",      project: "DE/2026/05", pdfData: null, annotations: [] },
            { id: "SSR/WSI/DE-2026-05/000003A", status: "closed",        site: "Reservoir",       date: "2025-08-13", inspector: "Robert Johnson",  project: "DE/2026/05", pdfData: null, annotations: [] }
        ],
        'DE/2025/02': [
            { id: "SSR/WSI/DE-2025-02/000001A", status: "reopen",     site: "Pump Station",    date: "2025-05-10", inspector: "Michael Brown",   project: "DE/2025/02", pdfData: null, annotations: [] },
            { id: "SSR/WSI/DE-2025-02/000002A", status: "closed",     site: "Pipeline",        date: "2025-05-09", inspector: "Emma Davis",      project: "DE/2025/02", pdfData: null, annotations: [] }
        ],
        'DE/2025/09': [
            { id: "SSR/WSI/DE-2025-09/000001A", status: "submitted",     site: "Distribution", date: "2025-09-07", inspector: "Olivia Garcia",  project: "DE/2025/09", pdfData: null, annotations: [] },
            { id: "SSR/WSI/DE-2025-09/000002A", status: "closed",        site: "Reservoir",    date: "2025-09-06", inspector: "David Wilson",   project: "DE/2025/09", pdfData: null, annotations: [] }
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

    // ---------- 載入 / 儲存 ----------
    function loadData() {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            try {
                inspectionData = JSON.parse(stored);
                let migrated = 0;
                inspectionData.forEach(item => {
                    if (!item.hasOwnProperty('pdfData')) item.pdfData = null;
                    if (!item.hasOwnProperty('annotations')) item.annotations = [];
                    if (!item.hasOwnProperty('statusHistory')) item.statusHistory = [];

                    // ★ 舊資料自動修復：將 submitted-wsg 轉為 submitted
                    if (item.status === 'submitted-wsg') {
                        item.status = 'submitted';
                    }

                    if (item.status === 'reopen') {
                        item.approvalStatus = 'pending';
                    } else if (item.status === 'cancelled') {
                        item.approvalStatus = 'cancelled';
                    } else if (!item.approvalStatus) {
                        item.approvalStatus = 'pending';
                    }

                    if (!item.project) {
                        if (item.id && item.id.indexOf('SSR/WSI/DE-2025-02') === 0) {
                            item.project = 'DE/2025/02';
                        } else if (item.id && item.id.indexOf('SSR/WSI/DE-2025-09') === 0) {
                            item.project = 'DE/2025/09';
                        } else if (item.id && item.id.indexOf('SSR/WSI/DE-2026-05') === 0) {
                            item.project = 'DE/2026/05';
                        } else {
                            item.project = getCurrentProjectId() || 'DE/2026/05';
                        }
                        migrated++;
                    }
                });
                if (migrated > 0) {
                    console.log('[SafetyInspect] ✓ 已為 ' + migrated + ' 筆舊記錄補上 project');
                }
                saveData();
            } catch(e) {
                console.error('[SafetyInspect] 資料解析失敗，使用預設', e);
                inspectionData = getAllDefaultRecords();
                saveData();
            }
        } else {
            var cloud = window.DWSS_Storage && window.DWSS_Storage.isCloud && window.DWSS_Storage.isCloud();
            if (cloud) {
                console.log('[SafetyInspect] Cloud mode, no records yet');
                inspectionData = [];
            } else {
                console.log('[SafetyInspect] ✓ 首次載入，建立 3 個項目的預設資料');
                inspectionData = getAllDefaultRecords();
                saveData();
            }
        }
    }

    function saveData() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(inspectionData));
        if (window.DWSS_Storage && typeof window.DWSS_Storage.flush === 'function') {
            window.DWSS_Storage.flush(STORAGE_KEY);
        }
    }

    // ★ 項目過濾輔助函數
    function getProjectData() {
        const projectId = getCurrentProjectId();
        if (!projectId) {
            return inspectionData.filter(function (item) { return !item.project; });
        }
        return inspectionData.filter(function (item) { return item.project === projectId; });
    }

    function canAccessRecord(recordId) {
        const record = inspectionData.find(r => String(r.id) === String(recordId));
        if (!record) return false;
        const currentProject = getCurrentProjectId();
        if (!currentProject || !record.project) return true;
        return record.project === currentProject;
    }

    // ---------- 輔助函數 ----------
    function formatDate(dateString) {
        if (!dateString) return '';
        if (/^\d{2}-[A-Za-z]{3}-\d{4}$/.test(dateString)) {
            const parts = dateString.split('-');
            const monthMap = { 'Jan':'01','Feb':'02','Mar':'03','Apr':'04','May':'05','Jun':'06',
                               'Jul':'07','Aug':'08','Sep':'09','Oct':'10','Nov':'11','Dec':'12' };
            const month = monthMap[parts[1]] || '01';
            return `${parts[2]}-${month}-${parts[0]}`;
        }
        const date = new Date(dateString);
        if (isNaN(date)) return dateString;
        const d = String(date.getDate()).padStart(2,'0');
        const m = String(date.getMonth() + 1).padStart(2,'0');
        const y = date.getFullYear();
        return `${y}-${m}-${d}`;
    }

    function getStatusText(status) {
        return SAFETY_STATUS_MAP[status] || status;
    }

    function getSiteType(siteName) {
        const lower = siteName.toLowerCase();
        if (lower.includes('treatment')) return 'treatment';
        if (lower.includes('pipeline')) return 'pipeline';
        if (lower.includes('reservoir')) return 'reservoir';
        if (lower.includes('distribution')) return 'distribution';
        if (lower.includes('pump')) return 'pump';
        return 'other';
    }

    function formatDisplayDate(dateString) {
        if (!dateString) return '';
        const iso = formatDate(dateString);
        const parts = iso.split('-');
        if (parts.length !== 3) return dateString;
        const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        const month = monthNames[parseInt(parts[1]) - 1] || parts[1];
        return `${parts[2]}-${month}-${parts[0]}`;
    }

    function readFileAsBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result.split(',')[1]);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    // ★ 自動生成 Safety Inspection ID
    function generateNextSafetyId() {
        var contractCode = getContractCode();
        var prefix = 'SSR/WSI/' + contractCode + '/';
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

    // ---------- 生成狀態更改下拉選單 ----------
    function generateSafetyStatusSelect(recordId) {
        if (DWSS_Auth.canChangeStatus()) {
            return `
                <select class="status-change-select" data-id="${recordId}" title="Change Status">
                    <option value="">📝 Change Status</option>
                    <option value="draft">Draft</option>
                    <option value="submitted-ig">Submitted to IG</option>
                    <option value="closed">IG Endorsed</option>
                    <option value="reopen">Reopened</option>
                    <option value="cancelled">Cancelled</option>
                </select>
            `;
        }
        return '';
    }

    // ==================== ★ 分類：Overdue / Pending / Closed / Other ====================
    const OVERDUE_DAYS = 14;

    function parseInspectionDate(item) {
        if (!item) return null;
        var isoStr = formatDate(item.date);
        if (isoStr) {
            var parts = isoStr.split('-');
            if (parts.length === 3) {
                var d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
                if (!isNaN(d.getTime())) return d;
            }
        }
        if (item.createdAt) {
            var d2 = new Date(item.createdAt);
            if (!isNaN(d2.getTime())) return d2;
        }
        return null;
    }

    function isOverdue(item) {
        if (!item || item.status !== 'draft') return false;
        var d = parseInspectionDate(item);
        if (!d) return false;
        var now = new Date();
        var diffDays = (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24);
        return diffDays > OVERDUE_DAYS;
    }

    // 替換原本的 categorize 函數
    function categorize(item) {
        var s = (item && item.status) || 'draft';
        if (s === 'draft') return isOverdue(item) ? 'overdue' : 'other';
        if (s === 'submitted-ig') return 'pending';
        if (s === 'closed' || s === 'cancelled') return 'closed';
        return 'other'; // reopen
    }

    // ---------- 渲染和統計 ----------
    let currentFilters = { site: "all", status: "all" };

    function updateStats(dataToUse) {
        const totalEl = document.getElementById('total-inspections-count');
        const monthEl = document.getElementById('month-count');
        const data = dataToUse || getProjectData();

        if (totalEl) totalEl.textContent = data.length;
        if (monthEl) {
            const now = new Date();
            const monthCount = data.filter(function (item) {
                var d = null;
                if (item.date) d = new Date(formatDate(item.date));
                if ((!d || isNaN(d.getTime())) && item.createdAt) d = new Date(item.createdAt);
                if (!d || isNaN(d.getTime())) return false;
                return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
            }).length;
            monthEl.textContent = monthCount;
        }
    }

    // ★ 行渲染
    function buildRow(item, userCanChangeStatus) {
        const row = document.createElement('tr');
        var displayStatus = item.status || 'draft';
        
        var displayApproval = item.approvalStatus || 'pending';
        if (item.status === 'reopen') displayApproval = 'pending';
        if (item.status === 'cancelled') displayApproval = 'cancelled';

        let actionButtons = `
            <td>
                <button class="action-btn view-btn" data-id="${item.id}" title="View"><i class="fas fa-eye"></i></button>
                <button class="action-btn edit-btn" data-id="${item.id}" title="Edit"><i class="fas fa-edit"></i></button>
                ${generateSafetyStatusSelect(item.id)}
                <button class="action-btn delete-btn" data-id="${item.id}" title="Delete"><i class="fas fa-trash"></i></button>
        `;

        if (!userCanChangeStatus) {
            actionButtons += `<span class="permission-lock-hint"><i class="fas fa-lock"></i> Status change requires higher permission</span>`;
        }
        actionButtons += `</td>`;

        var approvalDisplay = '';
        if (displayApproval === 'approved') {
            approvalDisplay = '<span class="status-badge status-approved">✅ Approved</span>';
        } else if (displayApproval === 'rejected') {
            approvalDisplay = '<span class="status-badge status-rejected">❌ Rejected</span>';
        } else if (displayApproval === 'cancelled') {
            approvalDisplay = '<span class="status-badge status-cancelled">🚫 Cancelled</span>';
        } else {
            approvalDisplay = '<span class="status-badge status-pending">⏳ Pending</span>';
        }

        row.innerHTML = `
            <td>${item.id}</td>
            <td><span class="status-badge status-${displayStatus}">${getStatusText(displayStatus)}</span></td>
            <td>${approvalDisplay}</td>
            <td>${item.site}</td>
            <td>${formatDisplayDate(item.date)}</td>
            <td>${item.inspector}</td>
            ${actionButtons}
        `;
        return row;
    }

    // ★ 渲染表格（四分類）
    function renderInspectionTable() {
        const CATEGORIES = ['overdue', 'pending', 'closed', 'other'];
        const TBODY_IDS = {
            overdue: 'overdue-table-body',
            pending: 'pending-table-body',
            closed:  'closed-table-body',
            other:   'other-table-body'
        };

        CATEGORIES.forEach(function (key) {
            const el = document.getElementById(TBODY_IDS[key]);
            if (el) el.innerHTML = '';
        });

        const projectFilteredData = getProjectData();

        const filtered = projectFilteredData.filter(item => {
            if (currentFilters.site !== "all") {
                const siteType = getSiteType(item.site);
                if (siteType !== currentFilters.site) return false;
            }
            if (currentFilters.status !== "all" && item.status !== currentFilters.status) return false;
            return true;
        });

        const buckets = { overdue: [], pending: [], closed: [], other: [] };
        filtered.forEach(function (item) {
            const key = categorize(item);
            (buckets[key] || (buckets[key] = [])).push(item);
        });

        const userCanChangeStatus = DWSS_Auth.canChangeStatus();

        CATEGORIES.forEach(function (key) {
            const tbody = document.getElementById(TBODY_IDS[key]);
            if (!tbody) return;

            const items = buckets[key] || [];
            items.forEach(function (item) {
                tbody.appendChild(buildRow(item, userCanChangeStatus));
            });

            const noRes = document.getElementById(key + '-no-results');
            if (noRes) noRes.style.display = items.length === 0 ? 'block' : 'none';

            const countBadge = document.getElementById(key + '-count');
            if (countBadge) countBadge.textContent = items.length;
        });

        updateStats(projectFilteredData);

        if (userCanChangeStatus) {
            bindSafetyStatusChangeEvents();
        }
    }

    // ---------- 狀態更改事件 ----------
    function bindSafetyStatusChangeEvents() {
        document.querySelectorAll('.status-change-select').forEach(select => {
            select.removeEventListener('change', handleSafetyStatusChange);
            select.addEventListener('change', handleSafetyStatusChange);
        });
    }

    function handleSafetyStatusChange(e) {
        const recordId = e.target.getAttribute('data-id');
        const newStatus = e.target.value;

        if (!newStatus) return;

        const record = inspectionData.find(r => String(r.id) === String(recordId));
        if (!record) return;

        if (!canAccessRecord(recordId)) {
            alert('❌ This record does not belong to your current project.');
            e.target.value = '';
            return;
        }

        const oldStatus = record.status || 'draft';
        const oldStatusText = getStatusText(oldStatus);
        const newStatusText = getStatusText(newStatus);
        
        let oldApproval = record.approvalStatus || 'pending';
        let newApproval = 'pending';
        if (newStatus === 'cancelled') {
            newApproval = 'cancelled';
        } else if (newStatus === 'reopen') {
            newApproval = 'pending';
        } else if (newStatus === 'closed') {
            newApproval = 'approved';
        }

        const user = DWSS_Auth.getCurrentUser();

        if (confirm(
            '⚠️ Change Status Confirmation\n\n' +
            'Inspection ID: ' + recordId + '\n' +
            'From: ' + oldStatusText + '\n' +
            'To: ' + newStatusText + '\n' +
            'Changed by: ' + (user ? user.userName : 'Unknown') + ' (' + DWSS_Auth.getRoleName() + ')\n\n' +
            'Are you sure you want to change the status?'
        )) {
            const now = new Date().toISOString();
            const userName = user ? user.userName : 'Unknown';
            const roleName = DWSS_Auth.getRoleName();

            if (!Array.isArray(record.statusHistory)) {
                record.statusHistory = [];
            }
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
            renderInspectionTable();

            alert('✅ Status changed successfully!\n\n' + oldStatusText + ' → ' + newStatusText);
        } else {
            e.target.value = '';
        }
    }

    // ---------- 操作處理 ----------
    document.addEventListener('click', function (e) {
        const viewBtn = e.target.closest('.view-btn');
        const editBtn = e.target.closest('.edit-btn');
        const deleteBtn = e.target.closest('.delete-btn');

        if (viewBtn) {
            const id = viewBtn.getAttribute('data-id');
            const doc = inspectionData.find(d => String(d.id) === String(id));
            if (!doc) { alert('Document not found'); return; }
            if (!canAccessRecord(id)) {
                alert('❌ This record does not belong to your current project.');
                return;
            }

            const fullDoc = {
                id: doc.id,
                status: doc.status,
                statusText: getStatusText(doc.status),
                approvalStatus: doc.approvalStatus || 'pending',
                site: doc.site,
                date: formatDisplayDate(doc.date),
                inspector: doc.inspector,
                project: doc.project || null,
                pdfData: doc.pdfData || null,
                annotations: doc.annotations || []
            };
            window.location.href = 'safetyinspectdocument.html?id=' + encodeURIComponent(doc.id);
        }

        if (editBtn) {
            const id = editBtn.getAttribute('data-id');
            const doc = inspectionData.find(d => String(d.id) === String(id));
            if (!doc) { alert('Document not found'); return; }
            if (!canAccessRecord(id)) {
                alert('❌ This record does not belong to your current project.');
                return;
            }

            window.location.href = 'editsafetypdf.html?id=' + encodeURIComponent(doc.id);
        }

        if (deleteBtn) {
            const id = deleteBtn.getAttribute('data-id');
            if (!canAccessRecord(id)) {
                alert('❌ This record does not belong to your current project.');
                return;
            }
            if (confirm(`Are you sure you want to delete inspection ${id}?`)) {
                inspectionData = inspectionData.filter(d => String(d.id) !== String(id));
                saveData();
                renderInspectionTable();
                updateStats();
            }
        }
    });

    // ---------- 篩選器事件 ----------
    function setupFilterEvents() {
        document.querySelectorAll('.filter-group').forEach(group => {
            const toggle = group.querySelector('.filter-toggle');
            const options = group.querySelector('.filter-options');
            if (!toggle || !options) return;

            toggle.addEventListener('click', function(e) {
                e.stopPropagation();
                document.querySelectorAll('.filter-options').forEach(opt => {
                    if (opt !== options) opt.classList.remove('open');
                });
                options.classList.toggle('open');
            });

            group.querySelectorAll('.filter-option').forEach(opt => {
                opt.addEventListener('click', function(e) {
                    e.stopPropagation();
                    group.querySelectorAll('.filter-option').forEach(o => o.classList.remove('active'));
                    opt.classList.add('active');
                    toggle.querySelector('span').textContent = opt.textContent;

                    const filterType = opt.dataset.filter;
                    const filterValue = opt.dataset.value;
                    currentFilters[filterType] = filterValue;
                    renderInspectionTable();
                    options.classList.remove('open');
                });
            });
        });

        document.addEventListener('click', function() {
            document.querySelectorAll('.filter-options').forEach(opt => opt.classList.remove('open'));
        });
    }

    // ---------- 新增檢查模態框 ----------
    function setupAddInspectionModal() {
        const addBtn = document.getElementById('add-inspection-btn');
        const modal = document.getElementById('add-inspect-modal');
        const cancelBtn = document.getElementById('cancel-add-inspect');
        const form = document.getElementById('add-inspect-form');
        const fileInput = document.getElementById('input-inspect-pdf');

        if (addBtn && modal) {
            addBtn.addEventListener('click', () => {
                modal.style.display = 'flex';
                form.reset();

                const idInput = document.getElementById('input-inspect-id');
                if (idInput) idInput.value = generateNextSafetyId();

                const statusSelect = document.getElementById('input-inspect-status');
                if (statusSelect) {
                    if (!DWSS_Auth.canChangeStatus()) {
                            statusSelect.innerHTML = '<option value="submitted-ig">Submitted to IG</option>';
                            statusSelect.value = 'submitted-ig';
                            statusSelect.disabled = true;

                        let hint = document.getElementById('submit-only-hint');
                        if (!hint) {
                            hint = document.createElement('div');
                            hint.id = 'submit-only-hint';
                            hint.style.cssText = 'color: #856404; background: #fff3cd; padding: 10px; border-radius: 6px; margin: 10px 0; font-size: 0.85rem;';
                            hint.innerHTML = '<i class="fas fa-info-circle"></i> <strong>Submit Only Mode:</strong> You can only submit inspections. Status changes require Admin/Officer/AEI permission.';
                            statusSelect.parentNode.appendChild(hint);
                        }
                        } else {
                            statusSelect.innerHTML = `
                                <option value="draft">Draft</option>
                                <option value="submitted-ig">Submitted to IG</option>
                                <option value="closed">IG Endorsed</option>
                                <option value="reopen">Reopened</option>
                                <option value="cancelled">Cancelled</option>
                            `;
                            statusSelect.disabled = false;
                        const hint = document.getElementById('submit-only-hint');
                        if (hint) hint.remove();
                    }
                }

                const user = DWSS_Auth.getCurrentUser();
                const inspectorInput = document.getElementById('input-inspect-by');
                if (user && inspectorInput) inspectorInput.value = user.userName;
            });
        }
        if (cancelBtn && modal) {
            cancelBtn.addEventListener('click', () => {
                modal.style.display = 'none';
                form?.reset();
                const hint = document.getElementById('submit-only-hint');
                if (hint) hint.remove();
            });
        }
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.style.display = 'none';
                    const hint = document.getElementById('submit-only-hint');
                    if (hint) hint.remove();
                }
            });
        }
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();

                let id = document.getElementById('input-inspect-id').value.trim();
                if (inspectionData.some(function (r) { return String(r.id) === String(id); })) {
                    id = generateNextSafetyId();
                    var idBox = document.getElementById('input-inspect-id');
                    if (idBox) idBox.value = id;
                }
                const status = document.getElementById('input-inspect-status').value;
                const site = document.getElementById('input-inspect-site').value.trim();
                const date = document.getElementById('input-inspect-date').value;
                const inspector = document.getElementById('input-inspect-by').value.trim();

                let pdfData = null;
                const file = fileInput.files[0];
                if (file) {
                    try {
                        pdfData = await readFileAsBase64(file);
                    } catch (err) {
                        alert('Failed to read PDF file.');
                        return;
                    }
                }

                let initialApproval = 'pending';
                if (status === 'cancelled') {
                    initialApproval = 'cancelled';
                } else if (status === 'closed') {
                    initialApproval = 'approved';
                }

                const newInspection = {
                    id,
                    status,
                    approvalStatus: initialApproval,
                    site,
                    date,
                    inspector,
                    project: getCurrentProjectId(),
                    pdfData: pdfData,
                    annotations: [],
                    statusHistory: []
                };
                inspectionData.unshift(newInspection);
                saveData();
                var saved = false;
                try {
                    var res = await fetch('/api/record?collection=inspection&id=' + encodeURIComponent(id), {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(newInspection)
                    });
                    saved = res.ok;
                } catch (err) {
                    saved = false;
                }
                if (!saved && window.DWSS_Storage && typeof window.DWSS_Storage.flush === 'function') {
                    saved = await window.DWSS_Storage.flush(STORAGE_KEY);
                }
                renderInspectionTable();
                updateStats();
                modal.style.display = 'none';
                form.reset();
                const hint = document.getElementById('submit-only-hint');
                if (hint) hint.remove();
                if (!saved) {
                    alert('Inspection was not saved to the database. Please try again.');
                    return;
                }
                alert('New inspection added successfully!');
            });
        }
    }

    // ---------- 日期同步 ----------
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

    // ---------- 初始化 ----------
    async function loadFromDatabase() {
        try {
            const res = await fetch('/api/records/inspection/list', { cache: 'no-store' });
            if (!res.ok) return;
            const list = await res.json();
            if (Array.isArray(list)) {
                inspectionData = list;
                window.__dwssSafetyRecords = list;
                try {
                    var snap = JSON.parse(sessionStorage.getItem('dwss_page_counts') || '{}');
                    snap.safety = String(getProjectData().length);
                    snap.safetyFiltered = true;
                    sessionStorage.setItem('dwss_page_counts', JSON.stringify(snap));
                } catch (e) {}
            }
        } catch (e) {
            console.warn('[SafetyInspect] Could not load from database', e);
        }
    }

    async function init() {
        await loadFromDatabase();
        if (!inspectionData.length) loadData();
        renderInspectionTable();
        setupFilterEvents();
        setupAddInspectionModal();
        syncGlobalDate();
    }

    init();
});