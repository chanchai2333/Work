// safetyinspect.js - 安全检查页面逻辑（与 sitediary 功能对齐）
document.addEventListener("DOMContentLoaded", function() {
    // ---------- 数据管理 ----------
    let inspectionData = [];
    const STORAGE_KEY = 'inspectionData';

    // 默认数据（含 pdfData 和 annotations 字段）
    const defaultInspections = [
        { id: "INSP-2025-1", status: "draft", site: "Treatment Plant", date: "2025-08-15", inspector: "John Doe", pdfData: null, annotations: [] },
        { id: "INSP-2025-2", status: "reopen", site: "Pipeline", date: "2025-08-14", inspector: "Jane Smith", pdfData: null, annotations: [] },
        { id: "INSP-2025-3", status: "closed", site: "Reservoir", date: "2025-08-13", inspector: "Robert Johnson", pdfData: null, annotations: [] }
    ];

    function loadData() {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            try {
                inspectionData = JSON.parse(stored);
                // 确保每条记录都有 pdfData 和 annotations 字段
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

    // ---------- 辅助函数 ----------
    function formatDate(dateString) {
        if (!dateString) return '';
        // 如果已经是 "dd-mmm-yyyy" 格式（旧数据），转换为 ISO
        if (/^\d{2}-[A-Za-z]{3}-\d{4}$/.test(dateString)) {
            const parts = dateString.split('-');
            const monthMap = { 'Jan':'01','Feb':'02','Mar':'03','Apr':'04','May':'05','Jun':'06',
                               'Jul':'07','Aug':'08','Sep':'09','Oct':'10','Nov':'11','Dec':'12' };
            const month = monthMap[parts[1]] || '01';
            return `${parts[2]}-${month}-${parts[0]}`;
        }
        // 否则假设是 ISO 格式
        const date = new Date(dateString);
        if (isNaN(date)) return dateString;
        const d = String(date.getDate()).padStart(2,'0');
        const m = String(date.getMonth() + 1).padStart(2,'0');
        const y = date.getFullYear();
        return `${y}-${m}-${d}`;
    }

    function getStatusText(status) {
        const map = {
            'draft': 'Draft',
            'submitted-wsg': 'Submitted to WSG',
            'submitted-ig': 'Submitted to IG',
            'closed': 'Closed',
            'reopen': 'Reopen',
            'cancelled': 'Cancelled'
        };
        return map[status] || status;
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

    // ---------- 读取文件为 Base64 ----------
    function readFileAsBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result.split(',')[1]);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    // ---------- 渲染和统计 ----------
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

        filtered.forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${item.id}</td>
                <td><span class="status-badge status-${item.status}">${getStatusText(item.status)}</span></td>
                <td>${item.site}</td>
                <td>${formatDisplayDate(item.date)}</td>
                <td>${item.inspector}</td>
                <td>
                    <button class="action-btn view-btn" data-id="${item.id}"><i class="fas fa-eye"></i></button>
                    <button class="action-btn edit-btn" data-id="${item.id}"><i class="fas fa-edit"></i></button>
                    <button class="action-btn delete-btn" data-id="${item.id}"><i class="fas fa-trash"></i></button>
                </td>
            `;
            tbody.appendChild(row);
        });

        attachActionEvents();
        updateStats();
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

    // ---------- 操作处理 ----------
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
            window.location.href = 'safetyinspectdocument.html'; // 需自行创建对应查看页面
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
                submittedBy: doc.inspector,  // editpdf 使用 submittedBy 字段
                type: 'Safety Inspection',   // 固定类型，或可从数据中读取
                pdfData: doc.pdfData || '',
                annotations: doc.annotations || []
            }));
            // 已修復：將原先的 'editpdf.html' 更改為 'editsafetypdf.html'
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

    // ---------- 筛选器事件 ----------
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

    // ---------- 新增检查模态框 ----------
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
            });
        }
        if (cancelBtn && modal) {
            cancelBtn.addEventListener('click', () => {
                modal.style.display = 'none';
                form?.reset();
            });
        }
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) modal.style.display = 'none';
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
                    date,  // ISO 格式
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