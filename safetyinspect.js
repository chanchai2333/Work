document.addEventListener("DOMContentLoaded", function() {
    // 初始化資料，優先讀取 sessionStorage/localStorage
    let inspectionData = [];
    const storedInspections = sessionStorage.getItem('inspectionData') || localStorage.getItem('inspectionData');
    if (storedInspections) {
        inspectionData = JSON.parse(storedInspections);
    } else {
        inspectionData = [
            { id: "INSP-2025-1", status: "draft", statusText: "Draft", site: "Treatment Plant", date: "15-Aug-2025", inspector: "John Doe"},
            { id: "INSP-2025-2", status: "reopen", statusText: "Reopen", site: "Pipeline", date: "14-Aug-2025", inspector: "Jane Smith" },
            { id: "INSP-2025-3", status: "closed", statusText: "Closed", site: "Reservoir", date: "13-Aug-2025", inspector: "Robert Johnson"}
        ];
    }

    // 当前筛选状态
    let currentFilters = {
        site: "all",
        status: "all"
    };

    // 更新日期
    const now = new Date();
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    const dateSpan = document.getElementById('current-date');
    if (dateSpan) dateSpan.textContent = now.toLocaleDateString('en-US', options);

    // 彈窗顯示
    document.querySelector('.nav-buttons button').addEventListener('click', function() {
        document.getElementById('add-inspect-modal').style.display = 'flex';
    });

    // 彈窗取消
    document.getElementById('cancel-add-inspect').addEventListener('click', function() {
        document.getElementById('add-inspect-modal').style.display = 'none';
    });

    // 新增 inspection
    document.getElementById('add-inspect-form').addEventListener('submit', function(e) {
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
        // 儲存到 sessionStorage 和 localStorage
        sessionStorage.setItem('inspectionData', JSON.stringify(inspectionData));
        localStorage.setItem('inspectionData', JSON.stringify(inspectionData));
        document.getElementById('add-inspect-modal').style.display = 'none';
        renderInspectionTable();
    });

    // 設置篩選器事件
    function setupFilterEvents() {
        document.querySelectorAll('.filter-group').forEach(group => {
            const toggle = group.querySelector('.filter-toggle');
            const options = group.querySelector('.filter-options');
            
            // 确保筛选选项初始状态是隐藏的
            options.style.display = 'none';
            
            // Toggle dropdown on click
            toggle.addEventListener('click', function(e) {
                e.stopPropagation();
                // Close other dropdowns
                document.querySelectorAll('.filter-options').forEach(opt => {
                    if (opt !== options) {
                        opt.style.display = 'none';
                        opt.classList.remove('open');
                    }
                });
                
                // Toggle current dropdown
                if (options.style.display === 'none') {
                    options.style.display = 'block';
                    options.classList.add('open');
                } else {
                    options.style.display = 'none';
                    options.classList.remove('open');
                }
            });
            
            // Option click
            group.querySelectorAll('.filter-option').forEach(option => {
                option.addEventListener('click', function(e) {
                    e.stopPropagation();
                    // Remove active from all
                    group.querySelectorAll('.filter-option').forEach(opt => opt.classList.remove('active'));
                    option.classList.add('active');
                    toggle.querySelector('span').textContent = option.textContent;
                    const filterType = option.dataset.filter;
                    const filterValue = option.dataset.value;
                    currentFilters[filterType] = filterValue;
                    renderInspectionTable();
                    options.style.display = 'none'; // Close dropdown
                    options.classList.remove('open');
                });
            });
        });
        
        // Click outside closes all dropdowns
        document.addEventListener('click', function(e) {
            document.querySelectorAll('.filter-options').forEach(opt => {
                opt.style.display = 'none';
                opt.classList.remove('open');
            });
        });
    }

    // 渲染表格
    function renderInspectionTable() {
        const tbody = document.getElementById('inspection-table-body');
        const totalCount = document.getElementById('total-inspections-count');
        const noResults = document.getElementById('no-results-message');
        
        if (!tbody) return;
        tbody.innerHTML = '';
        
        // 筛选数据
        const filteredData = inspectionData.filter(item => {
            // 站点筛选
            if (currentFilters.site !== "all") {
                const siteValue = item.site.toLowerCase().includes('treatment') ? 'treatment' : 
                                 item.site.toLowerCase().includes('pipeline') ? 'pipeline' :
                                 item.site.toLowerCase().includes('reservoir') ? 'reservoir' :
                                 item.site.toLowerCase().includes('distribution') ? 'distribution' : 'pump';
                
                if (siteValue !== currentFilters.site) return false;
            }
            
            // 状态筛选
            if (currentFilters.status !== "all" && item.status !== currentFilters.status) {
                return false;
            }
            
            return true;
        });
        
        // 显示无结果消息
        if (filteredData.length === 0) {
            noResults.style.display = 'block';
        } else {
            noResults.style.display = 'none';
        }
        
        // 填充表格
        filteredData.forEach(item => {
            const row = document.createElement('tr');
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
            tbody.appendChild(row);
        });
        
        if (totalCount) totalCount.textContent = filteredData.length;

        // 查看功能
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const docId = this.getAttribute('data-id');
                const inspectionItem = inspectionData.find(item => item.id === docId);
                
                if (inspectionItem) {
                    // 存储当前文档数据到sessionStorage
                    sessionStorage.setItem('currentInspection', JSON.stringify({
                        id: inspectionItem.id,
                        status: inspectionItem.status,
                        statusText: inspectionItem.statusText,
                        site: inspectionItem.site,
                        date: inspectionItem.date,
                        inspector: inspectionItem.inspector
                    }));
                    
                    // 跳转到文档查看页面
                    window.location.href = 'safetyinspectdocument.html';
                }
            });
        });
        
        // 編輯功能
    // 添加查看按钮事件监听器
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const docId = this.getAttribute('data-id');
                const inspectionItem = inspectionData.find(item => item.id === docId);
                
                if (inspectionItem) {
                    // 存储当前文档数据到sessionStorage
                    sessionStorage.setItem('currentInspection', JSON.stringify({
                        id: inspectionItem.id,
                        status: inspectionItem.status,
                        statusText: inspectionItem.statusText,
                        site: inspectionItem.site,
                        date: inspectionItem.date,
                        inspector: inspectionItem.inspector
                    }));
                    
                    // 跳转到文档查看页面
                    window.location.href = 'editsafetypdf.html';
                }
            });
    });

        // 刪除功能
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const docId = this.getAttribute('data-id');
                const idx = inspectionData.findIndex(item => item.id === docId);
                if (idx !== -1) {
                    if (confirm('Are you sure you want to delete this inspection?')) {
                        inspectionData.splice(idx, 1);
                        // 更新 sessionStorage 和 localStorage
                        sessionStorage.setItem('inspectionData', JSON.stringify(inspectionData));
                        localStorage.setItem('inspectionData', JSON.stringify(inspectionData));
                        renderInspectionTable();
                    }
                }
            });
        });
    }

    // 初始化篩選器和表格
    setupFilterEvents();
    renderInspectionTable();
});