// safetyinspect.js - 安全檢查頁面邏輯（整合 DWSS 權限控制 & 自動生成 ID）
document.addEventListener("DOMContentLoaded", function() {
    // ---------- 權限檢查 ----------
    DWSS_Auth.updateHeaderUser();
    
    // ---------- 數據管理 ----------
    let inspectionData = [];
    const STORAGE_KEY = 'inspectionData';

    // 安全檢查狀態映射
    const SAFETY_STATUS_MAP = {
        'draft': 'Draft',
        'submitted-wsg': 'Submitted to WSG',
        'submitted-ig': 'Submitted to IG',
        'closed': 'Closed',
        'reopen': 'Reopen',
        'cancelled': 'Cancelled'
    };

    // 預設資料（為展示新格式，這裡也更新了 ID 格式）
    const defaultInspections = [
        { id: "SSR/WSI/000001A", status: "draft", site: "Treatment Plant", date: "2025-08-15", inspector: "John Doe", pdfData: null, annotations: [] },
        { id: "SSR/WSI/000002A", status: "reopen", site: "Pipeline", date: "2025-08-14", inspector: "Jane Smith", pdfData: null, annotations: [] },
        { id: "SSR/WSI/000003A", status: "closed", site: "Reservoir", date: "2025-08-13", inspector: "Robert Johnson", pdfData: null, annotations: [] }
    ];

    function loadData() {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            try {
                inspectionData = JSON.parse(stored);
                inspectionData.forEach(item => {
                    if (!item.hasOwnProperty('pdfData')) item.pdfData = null;
                    if (!item.hasOwnProperty('annotations')) item.annotations = [];
                });
            } catch(e) {
                inspectionData = [...defaultInspections];
            }
        } else {
            inspectionData = [...defaultInspections];
            saveData();
        }
    }

    function saveData() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(inspectionData));
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(inspectionData));
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

    // ==================== ★ 自動生成 Inspection ID ====================
    function generateNextSafetyId() {
        const ID_PREFIX = 'SSR/WSI/'; // 前綴
        const ID_SUFFIX = 'A';        // 後綴
        const ID_PAD    = 6;          // 數字補零位數

        // 轉義正則特殊字元
        const escaped = ID_PREFIX.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const re = new RegExp('^' + escaped + '(\\d+)[A-Za-z]?$');

        // 從 localStorage 讀取最新數據，避免 inspectionData 快取過舊
        let records = [];
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            const parsed = raw ? JSON.parse(raw) : [];
            records = Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            records = inspectionData || [];
        }

        // 找最大數字
        let maxNum = 0;
        records.forEach(function (item) {
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

    // ---------- 生成狀態更改下拉選單（安全檢查專用） ----------
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
        if (totalEl) totalEl.textContent = inspectionData.length;
        if (monthEl) {
            const currentMonth = new Date().getMonth() + 1;
            const monthCount = inspectionData.filter(item => {
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

        const filtered = inspectionData.filter(item => {
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
            
            row.innerHTML = `
                <td>${item.id}</td>
                <td><span class="status-badge status-${item.status}">${getStatusText(item.status)}</span></td>
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
        
        const record = inspectionData.find(r => r.id === recordId);
        if (!record) return;
        
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
        const doc = inspectionData.find(d => d.id === id);
        if (doc) {
            const fullDoc = {
                id: doc.id,
                status: doc.status,
                statusText: getStatusText(doc.status),
                site: doc.site,
                date: formatDisplayDate(doc.date),
                inspector: doc.inspector,
                pdfData: doc.pdfData || null,
                annotations: doc.annotations || []
            };
            sessionStorage.setItem('currentDocument', JSON.stringify(fullDoc));
            window.location.href = 'safetyinspectdocument.html';
        } else {
            alert('Document not found');
        }
    }

    function handleEdit(e) {
        const id = e.currentTarget.getAttribute('data-id');
        const doc = inspectionData.find(d => d.id === id);
        if (doc) {
            sessionStorage.setItem('editDocument', JSON.stringify({
                id: doc.id,
                status: doc.status,
                statusText: getStatusText(doc.status),
                site: doc.site,
                date: formatDisplayDate(doc.date),
                inspector: doc.inspector,
                submittedBy: doc.inspector,
                type: 'Safety Inspection',
                pdfData: doc.pdfData || '',
                annotations: doc.annotations || []
            }));
            window.location.href = 'editsafetypdf.html'; 
        } else {
            alert('Document not found');
        }
    }

    function handleDelete(e) {
        const id = e.currentTarget.getAttribute('data-id');
        if (confirm(`Are you sure you want to delete inspection ${id}?`)) {
            const index = inspectionData.findIndex(d => d.id === id);
            if (index !== -1) {
                inspectionData.splice(index, 1);
                saveData();
                renderInspectionTable();
                updateStats();
            }
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

    // ---------- 新增檢查模態框（整合權限 & 自動生成 ID） ----------
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
                
                // ★ 自動生成 Inspection ID
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

                const newInspection = {
                    id,
                    status,
                    site,
                    date,
                    inspector,
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