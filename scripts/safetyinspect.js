// safetyinspect.js - 安全檢查頁面邏輯（整合 DWSS 權限控制 + 項目隔離）
document.addEventListener("DOMContentLoaded", function() {
    // ---------- 權限檢查 ----------
    DWSS_Auth.updateHeaderUser();

    // ---------- 數據管理 ----------
    const STORAGE_KEY = 'inspectionData';

    let inspectionData = [];

    // 安全檢查狀態映射
    const SAFETY_STATUS_MAP = {
        'draft': 'Draft',
        'submitted-wsg': 'Submitted to WSG',
        'submitted-ig': 'Submitted to IG',
        'closed': 'Closed',
        'reopen': 'Reopen',
        'cancelled': 'Cancelled'
    };

    // ★ 每個項目的預設記錄（平均分配）
    const DEFAULT_PROJECT_DATA = {
        'DE/2026/05': [
            { id: "SSR/WSI/26/000001A", status: "draft",         site: "Treatment Plant", date: "2025-08-15", inspector: "John Doe",        project: "DE/2026/05", pdfData: null, annotations: [] },
            { id: "SSR/WSI/26/000002A", status: "submitted-wsg", site: "Pipeline",        date: "2025-08-14", inspector: "Jane Smith",      project: "DE/2026/05", pdfData: null, annotations: [] },
            { id: "SSR/WSI/26/000003A", status: "closed",        site: "Reservoir",       date: "2025-08-13", inspector: "Robert Johnson",  project: "DE/2026/05", pdfData: null, annotations: [] }
        ],
        'DE/2025/02': [
            { id: "SSR/WSI/25/02/000001A", status: "reopen",     site: "Pump Station",    date: "2025-05-10", inspector: "Michael Brown",   project: "DE/2025/02", pdfData: null, annotations: [] },
            { id: "SSR/WSI/25/02/000002A", status: "closed",     site: "Pipeline",        date: "2025-05-09", inspector: "Emma Davis",      project: "DE/2025/02", pdfData: null, annotations: [] }
        ],
        'DE/2025/09': [
            { id: "SSR/WSI/25/09/000001A", status: "submitted-wsg", site: "Distribution", date: "2025-09-07", inspector: "Olivia Garcia",  project: "DE/2025/09", pdfData: null, annotations: [] },
            { id: "SSR/WSI/25/09/000002A", status: "closed",        site: "Reservoir",    date: "2025-09-06", inspector: "David Wilson",   project: "DE/2025/09", pdfData: null, annotations: [] }
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

                    // ★ 舊資料沒有 project → 依 ID 前綴推斷
                    if (!item.project) {
                        if (item.id && item.id.indexOf('SSR/WSI/25/02') === 0) {
                            item.project = 'DE/2025/02';
                        } else if (item.id && item.id.indexOf('SSR/WSI/25/09') === 0) {
                            item.project = 'DE/2025/09';
                        } else {
                            item.project = 'DE/2026/05';
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
            console.log('[SafetyInspect] ✓ 首次載入，建立 3 個項目的預設資料');
            inspectionData = getAllDefaultRecords();
            saveData();
        }
    }

    function saveData() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(inspectionData));
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(inspectionData));
    }

    // ★ 項目過濾輔助函數
    function getProjectData() {
        const projectId = (typeof DWSS_Auth !== 'undefined' && DWSS_Auth.getProjectId)
            ? DWSS_Auth.getProjectId()
            : null;

        if (!projectId) {
            return inspectionData.filter(function (item) {
                return !item.project;
            });
        }
        return inspectionData.filter(function (item) {
            return item.project === projectId;
        });
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

    // ★ 自動生成 Safety Inspection ID（依項目）
    function generateNextSafetyId() {
        const projectId = (typeof DWSS_Auth !== 'undefined' && DWSS_Auth.getProjectId)
            ? DWSS_Auth.getProjectId()
            : null;

        let ID_PREFIX;
        if (projectId === 'DE/2026/05') {
            ID_PREFIX = 'SSR/WSI/26/';
        } else if (projectId === 'DE/2025/02') {
            ID_PREFIX = 'SSR/WSI/25/02/';
        } else if (projectId === 'DE/2025/09') {
            ID_PREFIX = 'SSR/WSI/25/09/';
        } else {
            ID_PREFIX = 'SSR/WSI/XX/';
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

    // ---------- 生成狀態更改下拉選單 ----------
    function generateSafetyStatusSelect(recordId) {
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

    // ---------- 渲染和統計 ----------
    let currentFilters = { site: "all", status: "all" };

    function updateStats() {
        const totalEl = document.getElementById('total-inspections-count');
        const monthEl = document.getElementById('month-count');

        // ★ 只統計「當前項目」
        const projectData = getProjectData();

        if (totalEl) totalEl.textContent = projectData.length;
        if (monthEl) {
            const currentMonth = new Date().getMonth() + 1;
            const monthCount = projectData.filter(item => {
                const isoDate = formatDate(item.date);
                const dateObj = new Date(isoDate);
                return dateObj.getMonth() + 1 === currentMonth;
            }).length;
            monthEl.textContent = monthCount;
        }
    }

    function renderInspectionTable() {
    const tbody = document.getElementById('inspection-table-body');
    const noResults = document.getElementById('no-results-message');
    if (!tbody) return;

    // ★ 先按項目過濾
    const projectData = getProjectData();

    const filtered = projectData.filter(item => {
        if (currentFilters.site !== "all") {
            const siteType = getSiteType(item.site);
            if (siteType !== currentFilters.site) return false;
        }
        if (currentFilters.status !== "all" && item.status !== currentFilters.status) return false;
        return true;
    });

    tbody.innerHTML = '';
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
                ${generateSafetyStatusSelect(item.id)}
                <button class="action-btn delete-btn" data-id="${item.id}" title="Delete"><i class="fas fa-trash"></i></button>
        `;

        if (!userCanChangeStatus) {
            actionButtons += `<span class="permission-lock-hint"><i class="fas fa-lock"></i> Status change requires higher permission</span>`;
        }

        actionButtons += `</td>`;

        // ★ 審批狀態顯示（新增）
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
            <td>${formatDisplayDate(item.date)}</td>
            <td>${item.inspector}</td>
            ${actionButtons}
        `;
        tbody.appendChild(row);
    });

    attachActionEvents();
    updateStats();

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

        // ★ 安全檢查：確保屬於當前項目
        const projectData = getProjectData();
        if (!projectData.some(r => String(r.id) === String(recordId))) {
            alert('❌ This record does not belong to your current project.');
            e.target.value = '';
            return;
        }

        const oldStatus = getStatusText(record.status);
        const newStatusText = getStatusText(newStatus);
        const user = DWSS_Auth.getCurrentUser();

        if (confirm(
            '⚠️ Change Status Confirmation\n\n' +
            'Inspection ID: ' + recordId + '\n' +
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
            renderInspectionTable();

            alert('✅ Status changed successfully!\n\n' + oldStatus + ' → ' + newStatusText);
        } else {
            e.target.value = '';
        }
    }

    function attachActionEvents() {
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.removeEventListener('click', handleView);
            btn.addEventListener('click', handleView);
        });
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.removeEventListener('click', handleEdit);
            btn.addEventListener('click', handleEdit);
        });
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.removeEventListener('click', handleDelete);
            btn.addEventListener('click', handleDelete);
        });
    }

    // ---------- 操作處理 ----------
    function handleView(e) {
        const id = e.currentTarget.getAttribute('data-id');
        const doc = inspectionData.find(d => String(d.id) === String(id));
        if (!doc) { alert('Document not found'); return; }

        // ★ 安全檢查
        const projectData = getProjectData();
        if (!projectData.some(d => String(d.id) === String(id))) {
            alert('❌ This record does not belong to your current project.');
            return;
        }

        const fullDoc = {
            id: doc.id,
            status: doc.status,
            statusText: getStatusText(doc.status),
            site: doc.site,
            date: formatDisplayDate(doc.date),
            inspector: doc.inspector,
            project: doc.project || null,
            pdfData: doc.pdfData || null,
            annotations: doc.annotations || []
        };
        sessionStorage.setItem('currentDocument', JSON.stringify(fullDoc));
        window.location.href = 'safetyinspectdocument.html';
    }

    function handleEdit(e) {
        const id = e.currentTarget.getAttribute('data-id');
        const doc = inspectionData.find(d => String(d.id) === String(id));
        if (!doc) { alert('Document not found'); return; }

        const projectData = getProjectData();
        if (!projectData.some(d => String(d.id) === String(id))) {
            alert('❌ This record does not belong to your current project.');
            return;
        }

        sessionStorage.setItem('editDocument', JSON.stringify({
            id: doc.id,
            status: doc.status,
            statusText: getStatusText(doc.status),
            site: doc.site,
            date: formatDisplayDate(doc.date),
            inspector: doc.inspector,
            submittedBy: doc.inspector,
            type: 'Safety Inspection',
            project: doc.project || null,
            pdfData: doc.pdfData || '',
            annotations: doc.annotations || []
        }));
        window.location.href = 'editsafetypdf.html';
    }

    function handleDelete(e) {
        const id = e.currentTarget.getAttribute('data-id');

        const projectData = getProjectData();
        if (!projectData.some(d => String(d.id) === String(id))) {
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

    // ---------- 篩選器事件 ----------
    function setupFilterEvents() {
        document.querySelectorAll('.filter-group').forEach(group => {
            const toggle = group.querySelector('.filter-toggle');
            const options = group.querySelector('.filter-options');
            if (!toggle || !options) return;

            toggle.removeEventListener('click', toggleHandler);
            toggle.addEventListener('click', toggleHandler);

            function toggleHandler(e) {
                e.stopPropagation();
                document.querySelectorAll('.filter-options').forEach(opt => {
                    if (opt !== options) opt.classList.remove('open');
                });
                options.classList.toggle('open');
            }

            group.querySelectorAll('.filter-option').forEach(opt => {
                opt.removeEventListener('click', optionHandler);
                opt.addEventListener('click', optionHandler);
            });

            function optionHandler(e) {
                e.stopPropagation();
                const option = e.currentTarget;
                group.querySelectorAll('.filter-option').forEach(o => o.classList.remove('active'));
                option.classList.add('active');
                toggle.querySelector('span').textContent = option.textContent;

                const filterType = option.dataset.filter;
                const filterValue = option.dataset.value;
                currentFilters[filterType] = filterValue;
                renderInspectionTable();
                options.classList.remove('open');
            }
        });

        document.removeEventListener('click', outsideClickListener);
        document.addEventListener('click', outsideClickListener);
        function outsideClickListener() {
            document.querySelectorAll('.filter-options').forEach(opt => opt.classList.remove('open'));
        }
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

                // ★ 自動生成 Inspection ID（依項目）
                const idInput = document.getElementById('input-inspect-id');
                if (idInput) {
                    idInput.value = generateNextSafetyId();
                }

                // ★ 根據權限調整狀態選項
                const statusSelect = document.getElementById('input-inspect-status');
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
                            hint.innerHTML = '<i class="fas fa-info-circle"></i> <strong>Submit Only Mode:</strong> You can only submit inspections. Status changes require Admin/Officer/AEI permission.';
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

                // 自動填充檢查員名稱
                const user = DWSS_Auth.getCurrentUser();
                const inspectorInput = document.getElementById('input-inspect-by');
                if (user && inspectorInput) {
                    inspectorInput.value = user.userName;
                }
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

                const id = document.getElementById('input-inspect-id').value.trim();
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

                // ★ 取得當前項目
                const projectId = (typeof DWSS_Auth !== 'undefined' && DWSS_Auth.getProjectId)
                    ? DWSS_Auth.getProjectId()
                    : null;

                const newInspection = {
                    id,
                    status,
                    site,
                    date,
                    inspector,
                    approvalStatus: 'pending',
                    project: projectId,   // ★ 綁定項目
                    pdfData: pdfData,
                    annotations: []
                };
                inspectionData.unshift(newInspection);
                saveData();
                renderInspectionTable();
                updateStats();
                modal.style.display = 'none';
                form.reset();
                const hint = document.getElementById('submit-only-hint');
                if (hint) hint.remove();
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
    function init() {
        loadData();
        renderInspectionTable();
        setupFilterEvents();
        setupAddInspectionModal();
        syncGlobalDate();
    }

    init();
});