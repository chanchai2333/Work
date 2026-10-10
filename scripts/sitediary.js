/**
 * =====================================================
 * Site Diary Page Script (整合 DWSS 權限控制 + 項目隔離)
 * 依賴: auth-check.js
 * =====================================================
 */

document.addEventListener('DOMContentLoaded', function () {

    // ==================== 權限初始化 ====================
    DWSS_Auth.updateHeaderUser();

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

    // ★ 每個項目的預設記錄（分組，方便維護）
    const DEFAULT_PROJECT_DATA = {
        'DE/2026/05': [
            { id: "SD/26/000001A", status: "draft",         site: "Treatment Plant", date: "2025-08-15", submittedBy: "John Doe",          type: "Contractor Documents",     project: "DE/2026/05", pdfData: null, annotations: [] },
            { id: "SD/26/000002A", status: "submitted-wsg", site: "Pipeline",        date: "2025-08-14", submittedBy: "Jane Smith",        type: "Contractor Documents",     project: "DE/2026/05", pdfData: null, annotations: [] },
            { id: "SD/26/000003A", status: "closed",        site: "Reservoir",       date: "2025-08-13", submittedBy: "Robert Johnson",    type: "Sub Contractor Documents", project: "DE/2026/05", pdfData: null, annotations: [] },
            { id: "SD/26/000004A", status: "reopen",        site: "Distribution",    date: "2025-08-12", submittedBy: "Sarah Williams",    type: "Sub Contractor Documents", project: "DE/2026/05", pdfData: null, annotations: [] }
        ],
        'DE/2025/02': [
            { id: "SD/25/02/000001A", status: "submitted-ig",  site: "Pump Station",    date: "2025-05-10", submittedBy: "Michael Brown",     type: "Contractor Documents",     project: "DE/2025/02", pdfData: null, annotations: [] },
            { id: "SD/25/02/000002A", status: "closed",        site: "Pipeline",        date: "2025-05-09", submittedBy: "Emma Davis",        type: "Sub Contractor Documents", project: "DE/2025/02", pdfData: null, annotations: [] },
            { id: "SD/25/02/000003A", status: "cancelled",     site: "Reservoir",       date: "2025-05-08", submittedBy: "James Miller",      type: "Contractor Documents",     project: "DE/2025/02", pdfData: null, annotations: [] }
        ],
        'DE/2025/09': [
            { id: "SD/25/09/000001A", status: "submitted-wsg", site: "Distribution",    date: "2025-09-07", submittedBy: "Olivia Garcia",     type: "Sub Contractor Documents", project: "DE/2025/09", pdfData: null, annotations: [] },
            { id: "SD/25/09/000002A", status: "reopen",        site: "Treatment Plant", date: "2025-09-06", submittedBy: "William Rodriguez", type: "Contractor Documents",     project: "DE/2025/09", pdfData: null, annotations: [] },
            { id: "SD/25/09/000003A", status: "draft",         site: "Pump Station",    date: "2025-09-05", submittedBy: "David Wilson",      type: "Contractor Documents",     project: "DE/2025/09", pdfData: null, annotations: [] },
            { id: "SD/25/09/000004A", status: "closed",        site: "Pipeline",        date: "2025-09-04", submittedBy: "Jane Smith",        type: "Sub Contractor Documents", project: "DE/2025/09", pdfData: null, annotations: [] },
            { id: "SD/25/09/000005A", status: "submitted-ig",  site: "Reservoir",       date: "2025-09-03", submittedBy: "John Doe",          type: "Contractor Documents",     project: "DE/2025/09", pdfData: null, annotations: [] }
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
    function loadData() {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            try {
                diaryData = JSON.parse(stored);
                let migrated = 0;
                diaryData.forEach(item => {
                    if (!item.hasOwnProperty('pdfData')) item.pdfData = null;
                    if (!item.hasOwnProperty('annotations')) item.annotations = [];

                    // ★ 舊資料沒有 project → 依 ID 前綴推斷項目
                    if (!item.project) {
                        if (item.id && item.id.indexOf('SD/25/02') === 0) {
                            item.project = 'DE/2025/02';
                        } else if (item.id && item.id.indexOf('SD/25/09') === 0) {
                            item.project = 'DE/2025/09';
                        } else {
                            item.project = 'DE/2026/05';
                        }
                        migrated++;
                    }
                });
                if (migrated > 0) {
                    console.log('[SiteDiary] ✓ 已為 ' + migrated + ' 筆舊記錄補上 project');
                }
                saveData();
            } catch (e) {
                console.error('[SiteDiary] 資料解析失敗，使用預設資料', e);
                diaryData = getAllDefaultRecords();
                saveData();
            }
        } else {
            console.log('[SiteDiary] ✓ 首次載入，建立 3 個項目的預設資料');
            diaryData = getAllDefaultRecords();
            saveData();
        }
    }

    function saveData() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(diaryData));
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(diaryData));
    }

    // ==================== ★ 項目過濾輔助函數 ====================
    /**
     * 從全量 diaryData 中過濾出「當前項目」的記錄
     * 回傳一個新陣列（不改動 diaryData）
     */
    function getProjectData() {
        const projectId = (typeof DWSS_Auth !== 'undefined' && DWSS_Auth.getProjectId)
            ? DWSS_Auth.getProjectId()
            : null;

        // 沒有 projectId（未登入）→ 只顯示沒有指定 project 的記錄
        if (!projectId) {
            return diaryData.filter(function (item) {
                return !item.project;
            });
        }

        // 有 projectId → 只顯示屬於該項目的記錄
        return diaryData.filter(function (item) {
            return item.project === projectId;
        });
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
        return DIARY_STATUS_MAP[status] || status;
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

    function readFileAsBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result.split(',')[1]);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    // ==================== ★ 自動生成 Diary ID ====================
    /**
     * 生成下一個 Diary ID
     *   DE/2026/05 → SD/26/000001A
     *   DE/2025/02 → SD/25/02/000001A
     *   DE/2025/09 → SD/25/09/000001A
     *   其他       → SD/XX/000001A
     * 規則：掃描「當前項目」的所有記錄，找出最大數字 +1
     */
    function generateNextDiaryId() {
        const projectId = (typeof DWSS_Auth !== 'undefined' && DWSS_Auth.getProjectId)
            ? DWSS_Auth.getProjectId()
            : null;

        // 依項目決定前綴
        let ID_PREFIX;
        if (projectId === 'DE/2026/05') {
            ID_PREFIX = 'SD/26/';
        } else if (projectId === 'DE/2025/02') {
            ID_PREFIX = 'SD/25/02/';
        } else if (projectId === 'DE/2025/09') {
            ID_PREFIX = 'SD/25/09/';
        } else {
            ID_PREFIX = 'SD/XX/';
        }

        const ID_SUFFIX = 'A';
        const ID_PAD    = 6;

        // 轉義正則特殊字元
        const escaped = ID_PREFIX.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const re = new RegExp('^' + escaped + '(\\d+)[A-Za-z]?$');

        // ★ 從「當前項目」的記錄中找最大數字
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

    // ==================== 狀態更改下拉選單生成 ====================
    function generateDiaryStatusSelect(recordId) {
        if (DWSS_Auth.canChangeStatus()) {
            return `
                <select class="status-change-select" data-id="${recordId}" title="Change Status">
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

    // ==================== 篩選器狀態 ====================
    let currentFilters = {
        site: "all",
        status: "all",
        type: "all"
    };

    // ==================== 統計 ====================
    function updateStats() {
        const totalEl = document.getElementById('total-documents-count');
        const monthEl = document.getElementById('month-count');

        // ★ 只統計「當前項目」的記錄
        const projectData = getProjectData();

        if (totalEl) totalEl.textContent = projectData.length;
        if (monthEl) {
            const currentMonth = new Date().getMonth() + 1;
            const monthCount = projectData.filter(item => {
                const itemDate = new Date(item.date);
                return itemDate.getMonth() + 1 === currentMonth;
            }).length;
            monthEl.textContent = monthCount;
        }
    }

    // ==================== 渲染表格 ====================
    function renderTable() {
        const tbody = document.getElementById('diary-table-body');
        const noResults = document.getElementById('no-results-message');
        if (!tbody) return;

        tbody.innerHTML = '';

        // ★ 先按項目過濾
        const projectData = getProjectData();

        // 再套用使用者選擇的篩選器
        const filtered = projectData.filter(item => {
            if (currentFilters.site !== "all") {
                const siteType = getSiteType(item.site);
                if (siteType !== currentFilters.site) return false;
            }
            if (currentFilters.status !== "all" && item.status !== currentFilters.status) return false;
            if (currentFilters.type !== "all" && item.type !== currentFilters.type) return false;
            return true;
        });

        if (noResults) {
            noResults.style.display = filtered.length === 0 ? 'block' : 'none';
        }

        const userCanChangeStatus = DWSS_Auth.canChangeStatus();

        filtered.forEach(item => {
            const row = document.createElement('tr');

            let actionButtons = `
                <td>
                    <button class="action-btn view-btn" data-id="${item.id}" title="View"><i class="fas fa-eye"></i></button>
                    <button class="action-btn edit-btn" data-id="${item.id}" title="Edit"><i class="fas fa-edit"></i></button>
                    ${generateDiaryStatusSelect(item.id)}
                    <button class="action-btn delete-btn" data-id="${item.id}" title="Delete"><i class="fas fa-trash"></i></button>
            `;

            if (!userCanChangeStatus) {
                actionButtons += `<span class="permission-lock-hint"><i class="fas fa-lock"></i> Status change requires higher permission</span>`;
            }

            actionButtons += `</td>`;

            // 審批狀態顯示
            var approvalDisplay = '';
            if (item.approvalStatus === 'approved') {
                approvalDisplay = '<span class="status-badge status-approved">✅ Approved</span>';
            } else if (item.approvalStatus === 'rejected') {
                approvalDisplay = '<span class="status-badge status-rejected">❌ Rejected</span>';
            } else {
                approvalDisplay = '<span class="status-badge status-pending">⏳ Pending</span>';
            }

            row.innerHTML = `
                <td>${item.id}</td>
                <td><span class="status-badge status-${item.status}">${getStatusText(item.status)}</span></td>
                <td>${approvalDisplay}</td>
                <td>${item.site}</td>
                <td>${formatDate(item.date)}</td>
                <td>${item.submittedBy}</td>
                <td>${item.type}</td>
                ${actionButtons}
            `;
            tbody.appendChild(row);
        });

        updateStats();

        if (userCanChangeStatus) {
            bindStatusChangeEvents();
        }
    }

    // ==================== 狀態更改事件 ====================
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

        // 從全量 diaryData 中找（ID 是唯一的）
        const record = diaryData.find(r => String(r.id) === String(recordId));
        if (!record) return;

        // 安全檢查：確保這筆記錄屬於當前項目
        const projectData = getProjectData();
        const belongs = projectData.some(r => String(r.id) === String(recordId));
        if (!belongs) {
            alert('❌ This record does not belong to your current project.');
            e.target.value = '';
            return;
        }

        const oldStatus = getStatusText(record.status);
        const newStatusText = getStatusText(newStatus);
        const user = DWSS_Auth.getCurrentUser();

        if (confirm(
            '⚠️ Change Status Confirmation\n\n' +
            'Diary ID: ' + recordId + '\n' +
            'From: ' + oldStatus + '\n' +
            'To: ' + newStatusText + '\n' +
            'Changed by: ' + (user ? user.userName : 'Unknown') + ' (' + DWSS_Auth.getRoleName() + ')\n\n' +
            'Are you sure you want to change the status?'
        )) {
            record.status = newStatus;
            record.statusChangedBy = user ? user.userName : 'Unknown';
            record.statusChangedAt = new Date().toISOString();
            record.statusChangedRole = DWSS_Auth.getRoleName();

            saveData();
            renderTable();

            alert('✅ Status changed successfully!\n\n' + oldStatus + ' → ' + newStatusText);
        } else {
            e.target.value = '';
        }
    }

    // ==================== 操作按鈕事件 ====================
    document.addEventListener('click', function (e) {
        const viewBtn = e.target.closest('.view-btn');
        const editBtn = e.target.closest('.edit-btn');
        const deleteBtn = e.target.closest('.delete-btn');

        if (viewBtn) {
            const id = viewBtn.dataset.id;
            const record = diaryData.find(d => String(d.id) === String(id));
            if (record) {
                const projectData = getProjectData();
                if (!projectData.some(d => String(d.id) === String(id))) {
                    alert('❌ This record does not belong to your current project.');
                    return;
                }
                sessionStorage.setItem('currentDocument', JSON.stringify({
                    id: record.id,
                    status: record.status,
                    statusText: getStatusText(record.status),
                    site: record.site,
                    date: formatDate(record.date),
                    submittedBy: record.submittedBy,
                    type: record.type,
                    project: record.project || null,
                    pdfData: record.pdfData || null,
                    annotations: record.annotations || []
                }));
                window.location.href = 'sitediarydocument.html';
            } else {
                alert('Document not found');
            }
        }

        if (editBtn) {
            const id = editBtn.dataset.id;
            const record = diaryData.find(d => String(d.id) === String(id));
            if (record) {
                const projectData = getProjectData();
                if (!projectData.some(d => String(d.id) === String(id))) {
                    alert('❌ This record does not belong to your current project.');
                    return;
                }
                sessionStorage.setItem('editDocument', JSON.stringify({
                    id: record.id,
                    status: record.status,
                    statusText: getStatusText(record.status),
                    site: record.site,
                    date: formatDate(record.date),
                    submittedBy: record.submittedBy,
                    type: record.type,
                    project: record.project || null,
                    pdfUrl: record.pdfUrl || '',
                    pdfData: record.pdfData || '',
                    annotations: record.annotations || [],
                    approvalStatus: record.approvalStatus || 'draft'
                }));
                window.location.href = 'editdiary.html';
            } else {
                alert('Document not found');
            }
        }

        if (deleteBtn) {
            const id = deleteBtn.dataset.id;
            const projectData = getProjectData();
            if (!projectData.some(d => String(d.id) === String(id))) {
                alert('❌ This record does not belong to your current project.');
                return;
            }
            if (confirm(`Are you sure you want to delete diary ${id}?`)) {
                // 從全量 diaryData 移除
                diaryData = diaryData.filter(d => String(d.id) !== String(id));
                saveData();
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

                // ★ 自動生成 Diary ID（依當前項目）
                const idInput = document.getElementById('input-diary-id');
                if (idInput) {
                    idInput.value = generateNextDiaryId();
                }

                // 根據權限調整狀態選項
                const statusSelect = document.getElementById('input-status');
                if (statusSelect) {
                    if (!DWSS_Auth.canChangeStatus()) {
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

                // 自動填充提交者
                const user = DWSS_Auth.getCurrentUser();
                const submittedByInput = document.getElementById('input-submitted-by');
                if (user && submittedByInput) {
                    submittedByInput.value = user.userName;
                }
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

                const id = document.getElementById('input-diary-id').value.trim();
                const status = document.getElementById('input-status').value;
                const site = document.getElementById('input-site').value.trim();
                const date = document.getElementById('input-date').value;
                const submittedBy = document.getElementById('input-submitted-by').value.trim();
                const type = document.getElementById('input-type').value;

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

                // ★ 取得當前項目 ID
                const projectId = (typeof DWSS_Auth !== 'undefined' && DWSS_Auth.getProjectId)
                    ? DWSS_Auth.getProjectId()
                    : null;

                const newDiary = {
                    id,
                    status,
                    site,
                    date,
                    submittedBy,
                    type,
                    project: projectId,   // ★ 綁定項目
                    pdfData: pdfData,
                    annotations: []
                };

                // ★ 寫入全量 diaryData
                diaryData.unshift(newDiary);
                saveData();
                renderTable();
                modal.style.display = 'none';
                form.reset();
                const hint = document.getElementById('submit-only-hint');
                if (hint) hint.remove();
                alert('New diary added successfully!');
            });
        }
    }

    // ==================== 日期同步 ====================
    function syncGlobalDate() {
        const storedDate = sessionStorage.getItem('globalDate');
        const dateSpan = document.querySelector('.date-display span');
        if (storedDate && dateSpan) {
            dateSpan.textContent = storedDate;
        } else if (dateSpan) {
            dateSpan.textContent = new Date().toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' });
        }
    }

    // ==================== 初始化 ====================
    function init() {
        loadData();
        renderTable();
        setupFilterEvents();
        setupAddDiaryModal();
        syncGlobalDate();
    }

    init();
});