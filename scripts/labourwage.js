// labourwage.js - Labour Wage 頁面邏輯
document.addEventListener("DOMContentLoaded", function () {
    // ==================== 權限初始化 ====================
    DWSS_Auth.updateHeaderUser();

    // ==================== 狀態映射 ====================
    const STATUS_TEXT_MAP = {
        'draft': 'Draft',
        'submitted-ig': 'Submit to IG',
        'closed': 'IG Accepted',
        'reopen': 'Reopened',
        'cancelled': 'Cancelled'
    };
    const STATUS_CLASS_MAP = {
        'draft': 'status-draft',
        'submitted-ig': 'status-submitted-ig',
        'closed': 'status-closed',
        'reopen': 'status-reopen',
        'cancelled': 'status-cancelled'
    };

    // ==================== 數據管理 ====================
    const STORAGE_KEY = 'wageData';

    let wageData = [];
    let currentFilters = { type: "all", status: "all", site: "all" };

    // ★ 每個項目的預設記錄
    const DEFAULT_PROJECT_DATA = {
        'DE/2026/05': [
            { id: "LRR/DE-2026-05/000001A", type: "GF527A",     typeText: "GF527A - Return on Construction Site Employment", status: "draft",     site: "Treatment Plant", period: "01-Sep-2025 to 07-Sep-2025",  submittedBy: "John Doe",   project: "DE/2026/05", pdfData: null, annotations: [] },
            { id: "LRR/DE-2026-05/000002A", type: "GF527-2003", typeText: "GF527 (2003) - Labour Wage",                       status: "submitted-ig", site: "Pipeline",        period: "01-Sep-2025 to 15-Sep-2025", submittedBy: "Jane Smith", project: "DE/2026/05", pdfData: null, annotations: [] },
            { id: "LRR/DE-2026-05/000003A", type: "GF527-2017", typeText: "GF527 (2017) - Labour Wage",                       status: "closed",  site: "Reservoir",       period: "01-Aug-2025 to 31-Aug-2025", submittedBy: "Robert Johnson", project: "DE/2026/05", pdfData: null, annotations: [] }
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
                    if (!item.hasOwnProperty('statusHistory')) item.statusHistory = [];
                    if (!item.status) item.status = 'draft';
                    
                    if (!item.project) {
                        if (item.id && item.id.indexOf('LRR/DE-2025-02') === 0) item.project = 'DE/2025/02';
                        else if (item.id && item.id.indexOf('LRR/DE-2025-09') === 0) item.project = 'DE/2025/09';
                        else if (item.id && item.id.indexOf('LRR/DE-2026-05') === 0) item.project = 'DE/2026/05';
                        else item.project = getCurrentProjectId() || 'DE/2026/05';
                        migrated++;
                    }
                });
                if (migrated > 0) saveData();
            } catch(e) {
                console.error('[LabourWage] 資料解析失敗', e);
                wageData = getAllDefaultRecords();
                saveData();
            }
        } else {
            wageData = getAllDefaultRecords();
            saveData();
        }
        renderWageTable();
    }

    function saveData() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(wageData));
        localStorage.setItem('labourWageData', JSON.stringify(wageData));
    }

    function getProjectData() {
        const projectId = getCurrentProjectId();
        if (!projectId) return wageData.filter(item => !item.project);
        return wageData.filter(item => item.project === projectId);
    }

    function canAccessRecord(recordId) {
        const record = wageData.find(r => String(r.id) === String(recordId));
        if (!record) return false;
        const currentProject = getCurrentProjectId();
        if (!currentProject || !record.project) return true;
        return record.project === currentProject;
    }

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
        if (item.period) {
            var parts = String(item.period).split(' to ');
            if (parts.length > 0) {
                var d2 = new Date(parts[0].trim());
                if (!isNaN(d2.getTime())) return d2;
            }
        }
        if (item.createdAt) {
            var d3 = new Date(item.createdAt);
            if (!isNaN(d3.getTime())) return d3;
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

    function categorize(item) {
        var s = (item && item.status) || 'draft';
        if (s === 'draft') return isOverdue(item) ? 'overdue' : 'open';
        if (s === 'submitted-ig') return 'pending';
        if (s === 'closed' || s === 'cancelled') return 'closed';
        return 'open'; // reopen
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

    function readFileAsBase64(file) {
        return new Promise(function(resolve, reject) {
            var reader = new FileReader();
            reader.onload = function() { resolve(reader.result.split(',')[1]); };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    // ==================== 渲染表格 (四分類) ====================
    function renderWageTable() {
        const CATEGORIES = ['open', 'pending', 'overdue', 'closed'];
        const TBODY_IDS = {
            open:    'open-table-body',
            pending: 'pending-table-body',
            overdue: 'overdue-table-body',
            closed:  'closed-table-body'
        };

        CATEGORIES.forEach(function (key) {
            var el = document.getElementById(TBODY_IDS[key]);
            if (el) el.innerHTML = '';
        });

        var projectFilteredData = getProjectData();

        var filtered = projectFilteredData.filter(function(item) {
            if (currentFilters.type !== "all" && item.type !== currentFilters.type) return false;
            if (currentFilters.status !== "all") {
                if (currentFilters.status === 'submitted-ig') {
                    if (item.status !== 'submitted-ig') return false;
                } else {
                    if (item.status !== currentFilters.status) return false;
                }
            }
            return true;
        });

        var buckets = { open: [], pending: [], overdue: [], closed: [] };
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
                var da = parseLabourDate(a) || new Date(0);
                var db = parseLabourDate(b) || new Date(0);
                return db - da;
            });

            items.forEach(function(item) {
                var row = document.createElement('tr');
                var approvalDisplay = '';
                if (item.approvalStatus === 'approved') {
                    approvalDisplay = '<span class="status-badge status-approved">✅ Approved</span>';
                } else if (item.approvalStatus === 'rejected') {
                    approvalDisplay = '<span class="status-badge status-rejected">❌ Rejected</span>';
                } else if (item.approvalStatus === 'cancelled') {
                    approvalDisplay = '<span class="status-badge status-cancelled">🚫 Cancelled</span>';
                } else {
                    approvalDisplay = '<span class="status-badge status-pending">⏳ Pending</span>';
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
                    <td>${item.typeText || item.type}</td>
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
        
        // 重新觸發搜尋過濾
        document.querySelectorAll('.category-search').forEach(function(input) {
            if (input.value.trim() !== '') {
                input.dispatchEvent(new Event('input', { bubbles: true }));
            }
        });
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
                var d = parseLabourDate(r);
                return d && d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
            }).length;
            monthEl.textContent = monthCount;
        }
    }

    // ==================== 操作按鈕 ====================
    document.addEventListener('click', function (e) {
        const viewBtn = e.target.closest('.view-btn');
        const editBtn = e.target.closest('.edit-btn');
        const deleteBtn = e.target.closest('.delete-btn');

        if (viewBtn) {
            var wageId = viewBtn.getAttribute('data-id');
            var record = wageData.find(function(r) { return String(r.id) === String(wageId); });
            if (!record) { alert('Record not found'); return; }
            if (!canAccessRecord(wageId)) { alert('❌ This record does not belong to your current project.'); return; }
            window.location.href = 'labourdocument.html?id=' + encodeURIComponent(record.id);
        }

        if (editBtn) {
            var wageId = editBtn.getAttribute('data-id');
            var record = wageData.find(function(r) { return String(r.id) === String(wageId); });
            if (!record) { alert('Record not found'); return; }
            if (!canAccessRecord(wageId)) { alert('❌ This record does not belong to your current project.'); return; }
            window.location.href = 'editlabour.html?id=' + encodeURIComponent(record.id);
        }

        if (deleteBtn) {
            var wageId = deleteBtn.getAttribute('data-id');
            if (!canAccessRecord(wageId)) { alert('❌ This record does not belong to your current project.'); return; }
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
        var copyFromSelect = document.getElementById('input-copy-from');

        if (addWageBtn && modal) {
            addWageBtn.addEventListener('click', function() {
                modal.style.display = 'flex';
                addForm.reset();

                // 重置 Copy from 下拉選單
                if (copyFromSelect) {
                    copyFromSelect.innerHTML = '<option value="">-- Do not copy --</option>';
                    var projectData = getProjectData();
                    projectData.sort(function(a, b) {
                        var da = parseLabourDate(a) || new Date(0);
                        var db = parseLabourDate(b) || new Date(0);
                        return db - da;
                    });
                    projectData.forEach(function(r) {
                        var opt = document.createElement('option');
                        opt.value = r.id;
                        opt.textContent = r.id + ' (' + (r.typeText || r.type) + ' - ' + r.site + ')';
                        copyFromSelect.appendChild(opt);
                    });
                }

                // 自動生成 Document ID
                var docIdInput = document.getElementById('input-doc-id');
                if (docIdInput) {
                    docIdInput.value = generateNextLabourWageId();
                }

                // 權限處理與自動填入
                if (window.DWSS_Auth) {
                    DWSS_Auth.adjustFormStatusOptions('input-status');
                    DWSS_Auth.autoFillSubmittedBy('input-submitted-by');
                }

                // ★ 額外兜底：如果還是 undefined，強制從 sessionStorage 抓
                var submitInput = document.getElementById('input-submitted-by');
                if (submitInput && (!submitInput.value || submitInput.value === 'undefined')) {
                    try {
                        var session = JSON.parse(sessionStorage.getItem('dwss_session') || '{}');
                        submitInput.value = session.userName || session.fullName || 'Admin User';
                    } catch(e) {
                        submitInput.value = 'Admin User';
                    }
                }
                
                // 設定預設年份
                var currYear = new Date().getFullYear();
                var yearInput = document.getElementById('input-period-year');
                if (yearInput) yearInput.value = currYear;
            });
        }

        // 監聽 Copy from 選擇
        if (copyFromSelect) {
            copyFromSelect.addEventListener('change', function() {
                var selectedId = this.value;
                if (!selectedId) return;

                var source = wageData.find(function(r) { return String(r.id) === String(selectedId); });
                if (!source) return;

                if (source.type) document.getElementById('input-type').value = source.type;
                if (source.site) document.getElementById('input-site').value = source.site;
                if (source.submittedBy) document.getElementById('input-submitted-by').value = source.submittedBy;

                // ★ 解析 Period 並填入單一月份與年份
                if (source.period) {
                    const parts = source.period.split(' to ');
                    if (parts.length > 0) {
                        const d = new Date(parts[0].trim());
                        if (!isNaN(d)) {
                            document.getElementById('input-period-year').value = d.getFullYear();
                            document.getElementById('input-period-month').value = String(d.getMonth() + 1).padStart(2, '0');
                        }
                    }
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
                var site = document.getElementById('input-site').value.trim();
                var submittedBy = document.getElementById('input-submitted-by').value;
                
                // ★ 讀取單一月份與年份
                var targetMonth = document.getElementById('input-period-month').value;
                var targetYear = document.getElementById('input-period-year').value;

                // 組合出 YYYY-MM-DD
                var periodStart = targetYear + '-' + targetMonth + '-01';
                // 計算所選月份的最後一天
                var endDay = new Date(targetYear, parseInt(targetMonth), 0).getDate();
                var periodEnd = targetYear + '-' + targetMonth + '-' + String(endDay).padStart(2, '0');

                var pdfData = null;
                var copiedFormData = {};
                
                // ★ 關鍵修正：處理 PDF 與表單數據複製
                var file = fileInput.files[0];
                if (file) {
                    // 使用者有上傳新檔案
                    try { pdfData = await readFileAsBase64(file); }
                    catch (err) { alert('Failed to read PDF file.'); return; }
                } else if (copyFromSelect && copyFromSelect.value) {
                    // 使用者選擇從舊文件複製
                    var sourceId = copyFromSelect.value;
                    try {
                        // 必須向後端請求「完整」的單筆資料，因為列表 API 沒有 formData
                        var detailRes = await fetch('/api/records/wage/' + encodeURIComponent(sourceId), { cache: 'no-store' });
                        if (detailRes.ok) {
                            var sourceRecord = await detailRes.json();
                            if (sourceRecord.pdfData) {
                                pdfData = sourceRecord.pdfData;
                            }
                            if (sourceRecord.formData) {
                                copiedFormData = JSON.parse(JSON.stringify(sourceRecord.formData));

                                // ★ 強制清空 GF527A 的簽名與名字區塊 (ai27 ~ ai30)
                                if (copiedFormData['ai27'] !== undefined) copiedFormData['ai27'] = '';
                                if (copiedFormData['ai28'] !== undefined) copiedFormData['ai28'] = '';
                                if (copiedFormData['ai29'] !== undefined) copiedFormData['ai29'] = '';
                                if (copiedFormData['ai30'] !== undefined) copiedFormData['ai30'] = '';

                                // ★ 強制清空 GF527-2017 的 Completed by 區塊 (g17_1451 ~ g17_1459)
                                if (copiedFormData['g17_1451'] !== undefined) copiedFormData['g17_1451'] = '';
                                if (copiedFormData['g17_1452'] !== undefined) copiedFormData['g17_1452'] = '';
                                if (copiedFormData['g17_1453'] !== undefined) copiedFormData['g17_1453'] = '';
                                if (copiedFormData['g17_1454'] !== undefined) copiedFormData['g17_1454'] = '';
                                if (copiedFormData['g17_1455'] !== undefined) copiedFormData['g17_1455'] = '';
                                if (copiedFormData['g17_1456'] !== undefined) copiedFormData['g17_1456'] = '';
                                if (copiedFormData['g17_1457'] !== undefined) copiedFormData['g17_1457'] = '';
                                if (copiedFormData['g17_1458'] !== undefined) copiedFormData['g17_1458'] = '';
                                if (copiedFormData['g17_1459'] !== undefined) copiedFormData['g17_1459'] = '';

                                // ★ 強制清空 GF527-2003 的 Completed by 區塊 (gf_1913 ~ gf_1922)
                                if (copiedFormData['gf_1913'] !== undefined) copiedFormData['gf_1913'] = '';
                                if (copiedFormData['gf_1914'] !== undefined) copiedFormData['gf_1914'] = '';
                                if (copiedFormData['gf_1915'] !== undefined) copiedFormData['gf_1915'] = '';
                                if (copiedFormData['gf_1916'] !== undefined) copiedFormData['gf_1916'] = '';
                                if (copiedFormData['gf_1917'] !== undefined) copiedFormData['gf_1917'] = '';
                                if (copiedFormData['gf_1918'] !== undefined) copiedFormData['gf_1918'] = '';
                                if (copiedFormData['gf_1919'] !== undefined) copiedFormData['gf_1919'] = '';
                                if (copiedFormData['gf_1920'] !== undefined) copiedFormData['gf_1920'] = '';
                                if (copiedFormData['gf_1921'] !== undefined) copiedFormData['gf_1921'] = '';
                                if (copiedFormData['gf_1922'] !== undefined) copiedFormData['gf_1922'] = '';
                    
                            }
                        }
                    } catch (err) {
                        console.error('無法取得來源文件詳細資料:', err);
                    }
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

                // 格式化 Period 字串 (ex: 01-Sep-2025 to 30-Sep-2025)
                function fmt(dStr) {
                    var d = new Date(dStr);
                    var day = String(d.getDate()).padStart(2, '0');
                    var month = d.toLocaleString('en-US', { month: 'short' });
                    var year = d.getFullYear();
                    return day + '-' + month + '-' + year;
                }
                var periodStr = fmt(periodStart) + ' to ' + fmt(periodEnd);

                var newWage = {
                    id: newId,
                    type: type,
                    typeText: typeText,
                    status: status,
                    site: site,
                    period: periodStr, 
                    submittedBy: submittedBy,
                    project: getCurrentProjectId(),
                    pdfData: pdfData,
                    formData: copiedFormData, // ★ 這裡就會有完整的表單內容了
                    annotations: [],
                    statusHistory: [],
                    createdAt: new Date().toISOString()
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
                } catch (err) { saved = false; }
                
                if (!saved && window.DWSS_Storage && typeof window.DWSS_Storage.flush === 'function') {
                    saved = await window.DWSS_Storage.flush(STORAGE_KEY);
                }
                
                modal.style.display = 'none';
                addForm.reset();
                
                if (!saved) {
                    alert('Wage record was not saved to the database. Please try again.');
                    return;
                }
                
                // ★ 新增成功後，直接跳轉到編輯頁面
                window.location.href = 'editlabour.html?id=' + encodeURIComponent(newId);
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