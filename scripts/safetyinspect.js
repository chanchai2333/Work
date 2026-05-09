// safetyinspect.js - 安全检查页面逻辑
document.addEventListener("DOMContentLoaded", function() {
    // 初始化资料，优先读取 sessionStorage/localStorage
    let inspectionData = [];
    const storedInspections = sessionStorage.getItem('inspectionData') || localStorage.getItem('inspectionData');
    if (storedInspections) {
        try {
            inspectionData = JSON.parse(storedInspections);
        } catch(e) { inspectionData = []; }
    }
    if (!inspectionData.length) {
        inspectionData = [
            { id: "INSP-2025-1", status: "draft", statusText: "Draft", site: "Treatment Plant", date: "15-Aug-2025", inspector: "John Doe"},
            { id: "INSP-2025-2", status: "reopen", statusText: "Reopen", site: "Pipeline", date: "14-Aug-2025", inspector: "Jane Smith" },
            { id: "INSP-2025-3", status: "closed", statusText: "Closed", site: "Reservoir", date: "13-Aug-2025", inspector: "Robert Johnson"}
        ];
        localStorage.setItem('inspectionData', JSON.stringify(inspectionData));
        sessionStorage.setItem('inspectionData', JSON.stringify(inspectionData));
    }

    let currentFilters = { site: "all", status: "all" };

    // 更新日期
    const dateSpan = document.getElementById('current-date');
    if (dateSpan) {
        const now = new Date();
        dateSpan.textContent = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    }

    // 新增模态框
    const addBtn = document.querySelector('.nav-buttons button');
    if (addBtn) addBtn.addEventListener('click', () => document.getElementById('add-inspect-modal').style.display = 'flex');
    const cancelBtn = document.getElementById('cancel-add-inspect');
    if (cancelBtn) cancelBtn.addEventListener('click', () => document.getElementById('add-inspect-modal').style.display = 'none');
    const addForm = document.getElementById('add-inspect-form');
    if (addForm) {
        addForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const newInspection = {
                id: document.getElementById('input-inspect-id').value,
                status: document.getElementById('input-inspect-status').value,
                statusText: document.getElementById('input-inspect-status').selectedOptions[0].text,
                site: document.getElementById('input-inspect-site').value,
                date: new Date(document.getElementById('input-inspect-date').value).toLocaleDateString('en-GB', {day:'2-digit',month:'short',year:'numeric'}),
                inspector: document.getElementById('input-inspect-by').value,
            };
            inspectionData.push(newInspection);
            sessionStorage.setItem('inspectionData', JSON.stringify(inspectionData));
            localStorage.setItem('inspectionData', JSON.stringify(inspectionData));
            document.getElementById('add-inspect-modal').style.display = 'none';
            renderInspectionTable();
        });
    }

    function setupFilterEvents() {
        document.querySelectorAll('.filter-group').forEach(group => {
            const toggle = group.querySelector('.filter-toggle');
            const options = group.querySelector('.filter-options');
            if (!toggle || !options) return;
            options.style.display = 'none';
            toggle.addEventListener('click', (e) => {
                e.stopPropagation();
                document.querySelectorAll('.filter-options').forEach(opt => opt !== options && (opt.style.display = 'none'));
                options.style.display = options.style.display === 'none' ? 'block' : 'none';
            });
            group.querySelectorAll('.filter-option').forEach(opt => {
                opt.addEventListener('click', (e) => {
                    e.stopPropagation();
                    group.querySelectorAll('.filter-option').forEach(o => o.classList.remove('active'));
                    opt.classList.add('active');
                    toggle.querySelector('span').textContent = opt.textContent;
                    currentFilters[opt.dataset.filter] = opt.dataset.value;
                    renderInspectionTable();
                    options.style.display = 'none';
                });
            });
        });
        document.addEventListener('click', () => document.querySelectorAll('.filter-options').forEach(opt => opt.style.display = 'none'));
    }

    function renderInspectionTable() {
        const tbody = document.getElementById('inspection-table-body');
        const totalCount = document.getElementById('total-inspections-count');
        const noResults = document.getElementById('no-results-message');
        if (!tbody) return;
        const filtered = inspectionData.filter(item => {
            if (currentFilters.site !== "all") {
                const siteVal = item.site.toLowerCase().includes('treatment') ? 'treatment' :
                                item.site.toLowerCase().includes('pipeline') ? 'pipeline' :
                                item.site.toLowerCase().includes('reservoir') ? 'reservoir' :
                                item.site.toLowerCase().includes('distribution') ? 'distribution' : 'pump';
                if (siteVal !== currentFilters.site) return false;
            }
            if (currentFilters.status !== "all" && item.status !== currentFilters.status) return false;
            return true;
        });
        tbody.innerHTML = '';
        if (filtered.length === 0) {
            noResults.style.display = 'block';
        } else {
            noResults.style.display = 'none';
            filtered.forEach(item => {
                const row = tbody.insertRow();
                row.innerHTML = `
                    <td>${item.id}</td>
                    <td><span class="status-badge status-${item.status}">${item.statusText}</span></td>
                    <td>${item.site}</td>
                    <td>${item.date}</td>
                    <td>${item.inspector}</td>
                    <td class="action-buttons">
                        <button class="action-btn view-btn" data-id="${item.id}"><i class="fas fa-eye"></i></button>
                        <button class="action-btn edit-btn" data-id="${item.id}"><i class="fas fa-edit"></i></button>
                        <button class="action-btn delete-btn" data-id="${item.id}"><i class="fas fa-trash"></i></button>
                    </td>
                `;
            });
        }
        if (totalCount) totalCount.textContent = filtered.length;

        // 绑定按钮事件
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

    function handleView(e) {
        const id = e.currentTarget.getAttribute('data-id');
        const doc = inspectionData.find(d => d.id === id);
        if (doc) {
            sessionStorage.setItem('currentInspection', JSON.stringify({
                id: doc.id, status: doc.status, statusText: doc.statusText,
                site: doc.site, date: doc.date, inspector: doc.inspector
            }));
            window.location.href = 'safetyinspectdocument.html';
        } else alert('Document not found');
    }

    function handleEdit(e) {
        const id = e.currentTarget.getAttribute('data-id');
        const doc = inspectionData.find(d => d.id === id);
        if (doc) {
            sessionStorage.setItem('editDocument', JSON.stringify({
                id: doc.id, status: doc.status, statusText: doc.statusText,
                site: doc.site, date: doc.date, inspector: doc.inspector, pdfUrl: doc.pdfUrl || ''
            }));
            window.location.href = 'editsafetypdf.html';
        } else alert('Document not found');
    }

    function handleDelete(e) {
        const id = e.currentTarget.getAttribute('data-id');
        if (confirm('Delete this inspection?')) {
            const idx = inspectionData.findIndex(d => d.id === id);
            if (idx !== -1) {
                inspectionData.splice(idx, 1);
                sessionStorage.setItem('inspectionData', JSON.stringify(inspectionData));
                localStorage.setItem('inspectionData', JSON.stringify(inspectionData));
                renderInspectionTable();
            }
        }
    }

    setupFilterEvents();
    renderInspectionTable();
});