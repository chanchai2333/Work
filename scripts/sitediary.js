/**
 * =====================================================
 * Site Diary Page Script (整合 DWSS 權限控制 + 項目隔離)
 * 依賴: auth-check.js, cloud-storage.js
 * =====================================================
 */

document.addEventListener('DOMContentLoaded', function () {

    // ==================== 權限初始化 ====================
    DWSS_Auth.updateHeaderUser();

    // ==================== ★ 安全取值 Helper ====================
    function safe(v, fallback) {
        if (v === undefined || v === null || v === '' || v === 'undefined' || v === 'null') return fallback;
        return v;
    }

    function currentUserName() {
        try {
            var u = (DWSS_Auth && DWSS_Auth.getCurrentUser) ? DWSS_Auth.getCurrentUser() : null;
            if (!u) return 'Unknown';
            return safe(u.userName, safe(u.username, safe(u.name, safe(u.user_name, 'Unknown'))));
        } catch (e) { return 'Unknown'; }
    }

    function currentRoleName() {
        try {
            var r = (DWSS_Auth && DWSS_Auth.getRoleName) ? DWSS_Auth.getRoleName() : null;
            return safe(r, 'N/A');
        } catch (e) { return 'N/A'; }
    }

    function canChangeStatusSafe() {
        try {
            return !!(DWSS_Auth && DWSS_Auth.canChangeStatus && DWSS_Auth.canChangeStatus());
        } catch (e) { return false; }
    }

    // ==================== 狀態映射 ====================
    const DIARY_STATUS_MAP = {
        'draft': 'Draft',
        'submitted-wsg': 'Submitted to WSG',
        'submitted-ig': 'Submitted to IG',
        'closed': 'Closed',
        'reopen': 'Reopen',
        'cancelled': 'Cancelled'
    };

    // ==================== 數據管理 ====================
    const STORAGE_KEY = 'siteDiaryData';
    let diaryData = [];

    // ★★★ 統一取得當前項目 ID ★★★
    function getCurrentProjectId() {
        if (typeof DWSS_Auth !== 'undefined' && DWSS_Auth.getProjectId) {
            var pid = DWSS_Auth.getProjectId();
            if (pid) return pid;
        }
        return sessionStorage.getItem('currentProjectId') || null;
    }

    // ==================== ★ 記錄正規化 ====================
    function normalizeRecord(item) {
        if (!item || typeof item !== 'object') return null;

        if (item.submittedBy === undefined || item.submittedBy === null || item.submittedBy === '') {
            item.submittedBy = safe(item.submitted_by, safe(item.submittedByName, safe(item.submitted_by_name, '')));
        }
        if (item.site === undefined || item.site === null || item.site === '') {
            item.site = safe(item.site_name, safe(item.siteName, ''));
        }
        if (item.type === undefined || item.type === null || item.type === '') {
            item.type = safe(item.document_type, safe(item.documentType, ''));
        }
        if (item.date === undefined || item.date === null || item.date === '') {
            item.date = safe(item.period, safe(item.startDate, ''));
        }

        if (!item.endDate && item.period) {
            var p = String(item.period);
            if (p.indexOf('~') !== -1) {
                var ep = p.split('~')[1];
                if (ep) {
                    var s = ep.trim();
                    var m1 = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
                    if (m1) item.endDate = m1[1] + '-' + m1[2] + '-' + m1[3];
                    if (!item.endDate) {
                        var m2 = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
                        if (m2) item.endDate = m2[3] + '-' + m2[2] + '-' + m2[1];
                    }
                }
            }
        }

        if (!item.status) item.status = 'draft';
        if (item.status === 'reopen') item.approvalStatus = 'pending';
        else if (item.status === 'cancelled') item.approvalStatus = 'cancelled';
        else if (!item.approvalStatus) item.approvalStatus = 'pending';

        if (!Array.isArray(item.annotations)) item.annotations = [];
        if (!Array.isArray(item.statusHistory)) item.statusHistory = [];
        if (!item.hasOwnProperty('pdfData')) item.pdfData = null;

        if (!item.project) {
            if (item.id && item.id.indexOf('SD/DE-2025-02') === 0) item.project = 'DE/2025/02';
            else if (item.id && item.id.indexOf('SD/DE-2025-09') === 0) item.project = 'DE/2025/09';
            else if (item.id && item.id.indexOf('SD/DE-2026-05') === 0) item.project = 'DE/2026/05';
            else item.project = getCurrentProjectId() || 'DE/2026/05';
        }

        return item;
    }

    // ==================== 載入 / 儲存 ====================
    // ★ 從 API 讀取完整資料（確保包含 sorItem, ceNo, statusHistory 等）
    async function loadFromDatabase() {
        try {
            const res = await fetch('/api/records/siteDiary', { cache: 'no-store' });
            if (!res.ok) return;
            const list = await res.json();
            if (!Array.isArray(list)) return;
            diaryData = list.map(normalizeRecord).filter(Boolean);
            window.__dwssDiaryRecords = diaryData;
            console.log('[SiteDiary] 從 API 載入資料筆數:', diaryData.length);
        } catch (e) {
            console.warn('[SiteDiary] Could not load from database', e);
        }
    }

    // ★ saveData：寫入 cache + 觸發 bulk 同步
    function saveData() {
        try {
            if (window.DWSS_Storage && typeof DWSS_Storage.getCache === 'function') {
                var cacheArr = DWSS_Storage.getCache(STORAGE_KEY);
                if (Array.isArray(cacheArr)) {
                    var verMap = {};
                    cacheArr.forEach(function (c) {
                        if (c && c.id != null && c._version != null) {
                            verMap[String(c.id)] = c._version;
                        }
                    });
                    diaryData.forEach(function (d) {
                        if (d && d.id != null && verMap[String(d.id)] != null) {
                            d._version = verMap[String(d.id)];
                        }
                    });
                }
            }
        } catch (e) {}

        localStorage.setItem(STORAGE_KEY, JSON.stringify(diaryData));
        if (window.DWSS_Storage && typeof window.DWSS_Storage.flush === 'function') {
            return window.DWSS_Storage.flush(STORAGE_KEY);
        }
        return Promise.resolve(true);
    }

    // ==================== ★ 項目過濾（放寬匹配規則）====================
    function getProjectData() {
        const projectId = getCurrentProjectId();
        if (!projectId) {
            console.log('[SiteDiary] 未指定 Project ID，返回所有數據');
            return diaryData.slice();
        }

        const filtered = diaryData.filter(function (item) {
            if (!item.project) return true;
            var p1 = String(item.project).trim();
            var p2 = String(projectId).trim();
            // 允許精確匹配或互相包含（例如 "Contract No. DE/2026/05" 包含 "DE/2026/05"）
            return p1 === p2 || p1.includes(p2) || p2.includes(p1);
        });

        console.log('[SiteDiary] Project ID:', projectId, '| 總數據:', diaryData.length, '| 過濾後:', filtered.length);
        return filtered;
    }

    function canAccessRecord(recordId) {
        const record = diaryData.find(r => String(r.id) === String(recordId));
        if (!record) return false;
        const currentProject = getCurrentProjectId();
        if (!currentProject || !record.project) return true;
        return record.project === currentProject || String(record.project).includes(currentProject) || currentProject.includes(String(record.project));
    }

    // ==================== 輔助函數 ====================
    function formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        if (isNaN(date)) return dateString;
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        return `${day}-${month}-${year}`;
    }

    function getStatusText(status) {
        return DIARY_STATUS_MAP[status] || safe(status, '');
    }

    function getSiteType(siteName) {
        const lower = String(siteName || '').toLowerCase();
        if (lower.includes('treatment')) return 'treatment';
        if (lower.includes('pipeline')) return 'pipeline';
        if (lower.includes('reservoir')) return 'reservoir';
        if (lower.includes('distribution')) return 'distribution';
        if (lower.includes('pump')) return 'pump';
        return 'other';
    }

    function readFileAsBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result.split(',')[1]);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    // ==================== 自動生成 ID ====================
    function generateNextDiaryId() {
        var contractCode = getContractCode();
        var prefix = 'SD/' + contractCode + '/';
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

    // ==================== 狀態更改下拉選單 ====================
    function generateDiaryStatusSelect(recordId) {
        if (canChangeStatusSafe()) {
            return `
                <select class="status-change-select" data-id="${safe(recordId, '')}" title="Change Status">
                    <option value="">📝 Change Status</option>
                    <option value="draft">Draft</option>
                    <option value="submitted-wsg">Submitted to WSG</option>
                    <option value="submitted-ig">Submitted to IG</option>
                    <option value="closed">Closed</option>
                    <option value="reopen">Reopen</option>
                    <option value="cancelled">Cancelled</option>
                </select>
            `;
        }
        return '';
    }

    // ==================== ★ 分類 ====================
    const OVERDUE_DAYS = 14;

    function parseDiaryEndDate(item) {
        if (!item) return null;
        if (item.endDate) {
            var d1 = new Date(item.endDate);
            if (!isNaN(d1.getTime())) return d1;
        }
        var dateStr = item.period || item.date;
        if (dateStr) {
            var s = String(dateStr).trim();
            if (s.indexOf('~') !== -1) {
                var parts = s.split('~');
                var endPart = parts[1] ? parts[1].trim() : '';
                var m1 = endPart.match(/^(\d{4})-(\d{2})-(\d{2})/);
                if (m1) return new Date(parseInt(m1[1], 10), parseInt(m1[2], 10) - 1, parseInt(m1[3], 10));
                var m2 = endPart.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
                if (m2) return new Date(parseInt(m2[3], 10), parseInt(m2[2], 10) - 1, parseInt(m2[1], 10));
            }
            var m3 = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
            if (m3) return new Date(parseInt(m3[1], 10), parseInt(m3[2], 10) - 1, parseInt(m3[3], 10));
            var m4 = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
            if (m4) return new Date(parseInt(m4[3], 10), parseInt(m4[2], 10) - 1, parseInt(m4[1], 10));
            var d2 = new Date(s);
            if (!isNaN(d2.getTime())) return d2;
        }
        if (item.createdAt) {
            var d3 = new Date(item.createdAt);
            if (!isNaN(d3.getTime())) return d3;
        }
        return null;
    }

    function isOverdue(item) {
        if (!item || item.status !== 'draft') return false;
        var endDate = parseDiaryEndDate(item);
        if (!endDate) return false;
        var now = new Date();
        var end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
        var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        var diffDays = (today.getTime() - end.getTime()) / (1000 * 60 * 60 * 24);
        return diffDays > OVERDUE_DAYS;
    }

    function categorize(item) {
        var s = (item && item.status) || 'draft';
        if (s === 'draft') return isOverdue(item) ? 'overdue' : 'open';
        if (s === 'submitted-wsg' || s === 'submitted-ig') return 'pending';
        if (s === 'closed' || s === 'cancelled') return 'closed';
        return 'open';
    }

    // ==================== 篩選器 ====================
    let currentFilters = { status: "all", type: "all" };

    function updateStats(dataToUse) {
        const totalEl = document.getElementById('total-documents-count');
        const monthEl = document.getElementById('month-count');
        const data = dataToUse || getProjectData();
        if (totalEl) totalEl.textContent = data.length;
        if (monthEl) {
            const now = new Date();
            const monthCount = data.filter(function (item) { return isInCurrentMonth(item, now); }).length;
            monthEl.textContent = monthCount;
        }
    }

    function isInCurrentMonth(item, now) {
        var d = diaryDate(item);
        if (!d) return false;
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    }

    function diaryDate(item) {
        if (!item) return null;
        if (item.startDate) {
            var s = new Date(item.startDate);
            if (!isNaN(s.getTime())) return s;
        }
        if (item.createdAt) {
            var c = new Date(item.createdAt);
            if (!isNaN(c.getTime())) return c;
        }
        var raw = item.date || item.period || '';
        var text = String(raw).split('~')[0].trim();
        var iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (iso) return new Date(+iso[1], +iso[2] - 1, +iso[3]);
        var dmy = text.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})/);
        if (dmy) return new Date(+dmy[3], +dmy[2] - 1, +dmy[1]);
        var parsed = new Date(text);
        return isNaN(parsed.getTime()) ? null : parsed;
    }

    // ==================== 行渲染 ====================
    function buildRow(item, userCanChangeStatus) {
        const row = document.createElement('tr');
        var displayStatus = item.status || 'draft';
        var displayApproval = item.approvalStatus || 'pending';
        if (item.status === 'reopen') displayApproval = 'pending';
        if (item.status === 'cancelled') displayApproval = 'cancelled';
        var safeId = safe(item.id, '');

        let actionButtons = `
            <td>
                <button class="action-btn view-btn" data-id="${safeId}" title="View"><i class="fas fa-eye"></i></button>
                <button class="action-btn edit-btn" data-id="${safeId}" title="Edit"><i class="fas fa-edit"></i></button>
                ${item.approvalStatus === 'rejected' ? `<button class="action-btn view-comment-btn" data-id="${safeId}" title="View Rejection Comment" style="background: linear-gradient(135deg, #f39c12, #d35400); color: white;"><i class="fas fa-comment-dots"></i></button>` : ''}
                ${generateDiaryStatusSelect(safeId)}
                <button class="action-btn delete-btn" data-id="${safeId}" title="Delete"><i class="fas fa-trash"></i></button>
        `;
        if (!userCanChangeStatus) {
            actionButtons += `<span class="permission-lock-hint"><i class="fas fa-lock"></i> Status change requires higher permission</span>`;
        }
        actionButtons += `</td>`;

        var approvalDisplay = '';
        if (displayApproval === 'approved') approvalDisplay = '<span class="status-badge status-approved">✅ Approved</span>';
        else if (displayApproval === 'rejected') approvalDisplay = '<span class="status-badge status-rejected">❌ Rejected</span>';
        else if (displayApproval === 'cancelled') approvalDisplay = '<span class="status-badge status-cancelled">🚫 Cancelled</span>';
        else approvalDisplay = '<span class="status-badge status-pending">⏳ Pending</span>';

        row.innerHTML = `
            <td>${safe(item.id, '—')}</td>
            <td><span class="status-badge status-${safe(displayStatus, 'draft')}">${getStatusText(displayStatus)}</span></td>
            <td>${approvalDisplay}</td>
            <td>${safe(item.site, '—')}</td>
            <td>${safe(formatDate(item.date), '—')}</td>
            <td>${safe(item.submittedBy, '—')}</td>
            <td>${safe(item.type, '—')}</td>
            ${actionButtons}
        `;
        return row;
    }

    // ==================== 渲染表格 ====================
    function renderTable() {
        const CATEGORIES = ['open', 'pending', 'overdue', 'closed'];
        const TBODY_IDS = {
            open:    'open-table-body',
            pending: 'pending-table-body',
            overdue: 'overdue-table-body',
            closed:  'closed-table-body'
        };

        CATEGORIES.forEach(function (key) {
            const el = document.getElementById(TBODY_IDS[key]);
            if (el) el.innerHTML = '';
        });

        const projectFilteredData = getProjectData();
        const filtered = projectFilteredData.filter(item => {
            if (currentFilters.status !== "all" && item.status !== currentFilters.status) return false;
            if (currentFilters.type !== "all" && item.type !== currentFilters.type) return false;
            return true;
        });

        const buckets = { overdue: [], pending: [], closed: [], other: [], open: [] };
        filtered.forEach(function (item) {
            const key = categorize(item);
            (buckets[key] || (buckets[key] = [])).push(item);
        });

        const userCanChangeStatus = canChangeStatusSafe();

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
        if (userCanChangeStatus) bindStatusChangeEvents();

        document.querySelectorAll('.category-search').forEach(function(input) {
            if (input.value.trim() !== '') {
                input.dispatchEvent(new Event('input', { bubbles: true }));
            }
        });
    }

    // ==================== 狀態更改 ====================
    function bindStatusChangeEvents() {
        document.querySelectorAll('.status-change-select').forEach(select => {
            select.removeEventListener('change', handleStatusChange);
            select.addEventListener('change', handleStatusChange);
        });
    }

    function handleStatusChange(e) {
        const recordId = e.target.getAttribute('data-id');
        const newStatus = e.target.value;
        if (!newStatus) return;

        const record = diaryData.find(r => String(r.id) === String(recordId));
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
        if (newStatus === 'cancelled') newApproval = 'cancelled';
        else if (newStatus === 'reopen') newApproval = 'pending';

        const userName = (function () {
            var n = currentUserName();
            if (n && n !== 'Unknown') return n;
            try {
                var sess = JSON.parse(sessionStorage.getItem('dwss_session') || '{}');
                n = sess.name || sess.userName || sess.username || sess.user_name || '';
                if (n) return n;
            } catch (e) {}
            console.warn('[SiteDiary] status change: could not resolve user name');
            return 'Unknown';
        })();
        const roleName = currentRoleName();

        if (confirm(
            '⚠️ Change Status Confirmation\n\n' +
            'Diary ID: ' + recordId + '\n' +
            'From: ' + oldStatusText + '\n' +
            'To: ' + newStatusText + '\n' +
            'Changed by: ' + userName + ' (' + roleName + ')\n\n' +
            'Are you sure you want to change the status?'
        )) {
            const now = new Date().toISOString();
            if (!Array.isArray(record.statusHistory)) record.statusHistory = [];
            record.statusHistory.push({
                changedAt: now, from: oldStatus, to: newStatus,
                fromApproval: oldApproval, toApproval: newApproval,
                changedBy: userName, role: roleName
            });

            record.status = newStatus;
            record.approvalStatus = newApproval;
            record.statusChangedBy = userName;
            record.statusChangedAt = now;
            record.statusChangedRole = roleName;

            saveData();       // ← 會觸發 bulk 同步到 DB
            renderTable();
            alert('✅ Status changed successfully!\n\n' + oldStatusText + ' → ' + newStatusText);
        } else {
            e.target.value = '';
        }
    }

    // ==================== 操作按鈕 ====================
    document.addEventListener('click', function (e) {
        const viewBtn = e.target.closest('.view-btn');
        const editBtn = e.target.closest('.edit-btn');
        const deleteBtn = e.target.closest('.delete-btn');
        const viewCommentBtn = e.target.closest('.view-comment-btn');

        if (viewCommentBtn) {
            const id = viewCommentBtn.dataset.id;
            fetch('/api/record?collection=siteDiary&id=' + encodeURIComponent(id), { cache: 'no-store' })
                .then(res => res.ok ? res.json() : null)
                .then(record => {
                    if (!record) { alert('Could not load document details.'); return; }
                    let comment = '';
                    if (Array.isArray(record.statusHistory)) {
                        for (let i = record.statusHistory.length - 1; i >= 0; i--) {
                            if (record.statusHistory[i].action === 'reject') { comment = record.statusHistory[i].comment; break; }
                        }
                    }
                    if (!comment) comment = "No specific comment provided.";
                    const textEl = document.getElementById('reject-comment-view-text');
                    if (textEl) textEl.textContent = comment;
                    const modal = document.getElementById('reject-comment-view-modal');
                    if (modal) modal.style.display = 'flex';
                })
                .catch(() => alert('Failed to load rejection comment.'));
            return;
        }

        if (viewBtn) {
            const id = viewBtn.dataset.id;
            const record = diaryData.find(d => String(d.id) === String(id));
            if (record) {
                if (!canAccessRecord(id)) { alert('❌ This record does not belong to your current project.'); return; }
                window.location.href = 'sitediarydocument.html?id=' + encodeURIComponent(record.id);
            } else { alert('Document not found'); }
        }

        if (editBtn) {
            const id = editBtn.dataset.id;
            const record = diaryData.find(d => String(d.id) === String(id));
            if (record) {
                if (!canAccessRecord(id)) { alert('❌ This record does not belong to your current project.'); return; }
                window.location.href = 'editdiary.html?id=' + encodeURIComponent(record.id);
            } else { alert('Document not found'); }
        }

        if (deleteBtn) {
            const id = deleteBtn.dataset.id;
            if (!canAccessRecord(id)) { alert('❌ This record does not belong to your current project.'); return; }
            if (confirm(`Are you sure you want to delete diary ${id}?`)) {
                diaryData = diaryData.filter(d => String(d.id) !== String(id));
                saveData();     // ← 從 cache 移除 → bulk 時 DB 也會刪除
                renderTable();
            }
        }
    });

    // ==================== 篩選器事件 ====================
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
                    renderTable();
                    options.classList.remove('open');
                });
            });
        });

        document.addEventListener('click', function() {
            document.querySelectorAll('.filter-options').forEach(opt => opt.classList.remove('open'));
        });
    }

    // ==================== 新增日記模態框 ====================
    function setupAddDiaryModal() {
        const addBtn = document.getElementById('add-diary-btn');
        const modal = document.getElementById('add-diary-modal');
        const cancelBtn = document.getElementById('cancel-add-diary');
        const form = document.getElementById('add-diary-form');
        const fileInput = document.getElementById('input-pdf');

        if (addBtn && modal) {
            addBtn.addEventListener('click', () => {
                modal.style.display = 'flex';
                form.reset();

                const idInput = document.getElementById('input-diary-id');
                if (idInput) idInput.value = generateNextDiaryId();

                const statusSelect = document.getElementById('input-status');
                if (statusSelect) {
                    if (!canChangeStatusSafe()) {
                        statusSelect.innerHTML = '<option value="submitted-wsg">Submitted to WSG</option>';
                        statusSelect.value = 'submitted-wsg';
                        statusSelect.disabled = true;
                        let hint = document.getElementById('submit-only-hint');
                        if (!hint) {
                            hint = document.createElement('div');
                            hint.id = 'submit-only-hint';
                            hint.style.cssText = 'color: #856404; background: #fff3cd; padding: 10px; border-radius: 6px; margin: 10px 0; font-size: 0.85rem;';
                            hint.innerHTML = '<i class="fas fa-info-circle"></i> <strong>Submit Only Mode:</strong> You can only submit diaries. Status changes require Admin/Officer/AEI permission.';
                            statusSelect.parentNode.appendChild(hint);
                        }
                    } else {
                        statusSelect.innerHTML = `
                            <option value="draft">Draft</option>
                            <option value="submitted-wsg">Submitted to WSG</option>
                            <option value="submitted-ig">Submitted to IG</option>
                            <option value="closed">Closed</option>
                            <option value="reopen">Reopen</option>
                            <option value="cancelled">Cancelled</option>
                        `;
                        statusSelect.disabled = false;
                        const hint = document.getElementById('submit-only-hint');
                        if (hint) hint.remove();
                    }
                }

                const uname = currentUserName();
                const submittedByInput = document.getElementById('input-submitted-by');
                if (uname && uname !== 'Unknown' && submittedByInput) submittedByInput.value = uname;
            });
        }

        if (cancelBtn && modal) {
            cancelBtn.addEventListener('click', () => {
                modal.style.display = 'none';
                form.reset();
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

                let id = document.getElementById('input-diary-id').value.trim();
                const status = document.getElementById('input-status').value;
                const site = document.getElementById('input-site').value.trim();
                const sorItem = document.getElementById('input-sor').value.trim();
                const ceNo = document.getElementById('input-ce-no').value.trim();
                const startDate = (document.getElementById('input-date-start') || {}).value || '';
                const endDate = (document.getElementById('input-date-end') || {}).value || '';
                const submittedBy = document.getElementById('input-submitted-by').value.trim();
                const type = document.getElementById('input-type').value;

                if (!id) { alert('Please enter Diary ID.'); return; }
                if (!site) { alert('Please enter Site.'); return; }
                if (!startDate || !endDate) { alert('Please select the period.'); return; }
                if (startDate > endDate) { alert('Period start must be on or before the end date.'); return; }
                if (!submittedBy) { alert('Please enter Submitted By.'); return; }
                if (diaryData.some(d => String(d.id) === String(id))) {
                    id = generateNextDiaryId();
                    var idInput = document.getElementById('input-diary-id');
                    if (idInput) idInput.value = id;
                }
                if (diaryData.some(d => String(d.id) === String(id))) {
                    alert('Diary ID "' + id + '" already exists.');
                    return;
                }

                let pdfData = null;
                const file = fileInput && fileInput.files[0];
                if (file) {
                    try { pdfData = await readFileAsBase64(file); }
                    catch (err) { alert('Failed to read PDF file.'); return; }
                }

                let initialApproval = 'pending';
                if (status === 'cancelled') initialApproval = 'cancelled';

                const periodStr = startDate.split('-').reverse().join('/') + ' ~ ' + endDate.split('-').reverse().join('/');
                const newDiary = {
                    id: id, status: status, approvalStatus: initialApproval,
                    site: site, sorItem: sorItem, ceNo: ceNo, date: periodStr,
                    startDate: startDate, endDate: endDate, period: periodStr,
                    submittedBy: submittedBy, type: type, project: getCurrentProjectId(),
                    pdfData: pdfData, annotations: [], statusHistory: [],
                    usesTemplate: !pdfData, createdAt: new Date().toISOString()
                };

                var saved = false, failText = '';
                try {
                    var res = await fetch('/api/record?collection=siteDiary&id=' + encodeURIComponent(id), {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(newDiary)
                    });
                    saved = res.ok;
                    if (!saved) failText = await res.text();
                } catch (err) {
                    saved = false;
                    failText = err && err.message ? err.message : 'network error';
                }
                if (!saved) {
                    alert('Diary was not saved to the database.\n' + failText);
                    return;
                }

                diaryData.unshift(newDiary);
                saveData();
                window.__dwssDiaryRecords = diaryData;
                renderTable();
                modal.style.display = 'none';
                form.reset();
                const hint = document.getElementById('submit-only-hint');
                if (hint) hint.remove();

                window.location.href = 'editdsdsitediary.html?id=' + encodeURIComponent(id);
            });
        }
    }

    // ==================== 日期同步 ====================
    function syncGlobalDate() {
        const storedDate = sessionStorage.getItem('globalDate');
        const dateSpan = document.querySelector('.date-display span');
        if (storedDate && dateSpan) dateSpan.textContent = storedDate;
        else if (dateSpan) dateSpan.textContent = new Date().toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' });
    }

    // ==================== ★ 初始化 ====================
    async function init() {
        // 1. 優先直接從 API 拿完整資料（確保不受 cloud-storage 載入時機影響）
        await loadFromDatabase();

        // 2. 如果 API 沒資料，可能是首次初始化，等 1 秒後再試一次
        if (diaryData.length === 0) {
            await new Promise(r => setTimeout(r, 1000));
            await loadFromDatabase();
        }

        // 3. 如果還是沒資料，嘗試從 cache 讀取（最後兜底）
        if (diaryData.length === 0 && window.DWSS_Storage && typeof DWSS_Storage.getCache === 'function') {
            var cacheArr = DWSS_Storage.getCache(STORAGE_KEY);
            if (Array.isArray(cacheArr)) {
                diaryData = cacheArr.map(normalizeRecord).filter(Boolean);
            }
        }

        window.__dwssDiaryRecords = diaryData;

        try {
            var snap = JSON.parse(sessionStorage.getItem('dwss_page_counts') || '{}');
            snap.diary = String(getProjectData().length);
            snap.diaryFiltered = true;
            sessionStorage.setItem('dwss_page_counts', JSON.stringify(snap));
        } catch (e) {}

        renderTable();
        setupFilterEvents();
        setupAddDiaryModal();
        syncGlobalDate();
    }

    init();
});