// 在 app.js 開頭添加：
window.addEventListener('error', function(e) {
    console.error('全局錯誤:', e.error);
    // 可以顯示用戶友好的錯誤訊息
    // alert('應用程序發生錯誤，請刷新頁面重試。');
});
// ===== 全局配置系统 =====
const AppConfig = {
    defaults: {
        theme: 'light',
        language: 'en',
        dateFormat: 'mm-dd-yyyy'
    },
    
    current: {},
    
    init: function() {
        // 从 localStorage 加载设置
        this.current.theme = localStorage.getItem('ael_dwss_theme') || this.defaults.theme;
        this.current.language = localStorage.getItem('ael_dwss_language') || this.defaults.language;
        this.current.dateFormat = localStorage.getItem('ael_dwss_dateFormat') || this.defaults.dateFormat;
        
        this.applySettings();
        return this.current;
    },
    
    save: function(settings) {
        if (settings.theme) {
            this.current.theme = settings.theme;
            localStorage.setItem('ael_dwss_theme', settings.theme);
        }
        if (settings.language) {
            this.current.language = settings.language;
            localStorage.setItem('ael_dwss_language', settings.language);
        }
        if (settings.dateFormat) {
            this.current.dateFormat = settings.dateFormat;
            localStorage.setItem('ael_dwss_dateFormat', settings.dateFormat);
        }
        
        this.applySettings();
        return this.current;
    },
    
    applySettings: function() {
        // 应用主题
        if (this.current.theme === 'dark') {
            document.body.classList.add('dark-theme');
        } else {
            document.body.classList.remove('dark-theme');
        }
        
        // 更新日期显示
        this.updateDateDisplay();
    },
    
    updateDateDisplay: function() {
        const now = new Date();
        let formattedDate;
        
        switch(this.current.dateFormat) {
            case 'dd-mm-yyyy':
                formattedDate = now.toLocaleDateString('en-GB');
                break;
            case 'mm-dd-yyyy':
                formattedDate = now.toLocaleDateString('en-US');
                break;
            case 'yyyy-mm-dd':
                formattedDate = now.toISOString().split('T')[0];
                break;
            default:
                formattedDate = now.toLocaleDateString('en-US');
        }
        
        const dateElement = document.getElementById('current-date');
        if (dateElement) {
            dateElement.textContent = formattedDate;
        }
    }
};

// 页面加载时自动初始化配置
document.addEventListener('DOMContentLoaded', function() {
    AppConfig.init();
    AppConfig.updateDateDisplay();
    
    // 侧边栏切换功能
    const toggleBtn = document.querySelector('.toggle-btn');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', function() {
            document.querySelector('.sidebar').classList.toggle('collapsed');
        });
    }
});
// ===== 全局配置系统结束 =====

// 以下是原有的 app.js 代码...

// 侧边栏折叠功能
        document.querySelector('.toggle-btn').addEventListener('click', function() {
            document.querySelector('.sidebar').classList.toggle('collapsed');
        });

        // 更新当前日期
        const now = new Date();
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        document.getElementById('current-date').textContent = now.toLocaleDateString('en-US', options);

        // 在現有代碼後添加以下內容

// 引入 Chart.js 庫
const chartScript = document.createElement('script');
chartScript.src = 'https://cdn.jsdelivr.net/npm/chart.js';
document.head.appendChild(chartScript);

// 等待 Chart.js 加載完成
chartScript.onload = function() {
    // 生成過去30天的日期標籤
    const dates = [];
    for (let i = 29; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        dates.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
    }

    // Site Diary 數據 (示例數據)
    const siteDiaryData = {
        labels: dates,
        datasets: [{
            label: 'Submitted',
            data: Array.from({length: 30}, () => Math.floor(Math.random() * 10) + 2),
            borderColor: '#3498db',
            backgroundColor: 'rgba(52, 152, 219, 0.1)',
            tension: 0.3,
            fill: true
        }, {
            label: 'Approved',
            data: Array.from({length: 30}, () => Math.floor(Math.random() * 8) + 1),
            borderColor: '#2ecc71',
            backgroundColor: 'rgba(46, 204, 113, 0.1)',
            tension: 0.3,
            fill: true
        }]
    };

    // Safety Inspection 數據 (示例數據)
    const safetyInspectionData = {
        labels: dates,
        datasets: [{
            label: 'Inspections',
            data: Array.from({length: 30}, () => Math.floor(Math.random() * 15) + 5),
            borderColor: '#e74c3c',
            backgroundColor: 'rgba(231, 76, 60, 0.1)',
            tension: 0.3,
            fill: true
        }, {
            label: 'Passed',
            data: Array.from({length: 30}, () => Math.floor(Math.random() * 12) + 3),
            borderColor: '#f39c12',
            backgroundColor: 'rgba(243, 156, 18, 0.1)',
            tension: 0.3,
            fill: true
        }]
    };
    // Labour Wage 數據配置
    const labourWageData = {
        labels: dates,
         datasets: [
        {
            label: 'total wages',
            data: Array.from({length: 30}, () => Math.floor(Math.random() * 50000) + 20000), // 範例數據
            borderColor: '#9b59b6',
            backgroundColor: 'rgba(155, 89, 182, 0.1)',
            borderWidth: 2,
            tension: 0.3,
            fill: true,
            yAxisID: 'y'
        },
        {
            label: 'working time (hours)',
            data: Array.from({length: 30}, () => Math.floor(Math.random() * 80) + 20), // 範例數據
            borderColor: '#1abc9c',
            backgroundColor: 'rgba(26, 188, 156, 0.1)',
            borderWidth: 2,
            tension: 0.3,
            fill: true,
            yAxisID: 'y1'
        }
    ]
};
    // 創建 Site Diary 趨勢圖
    const siteDiaryCtx = document.getElementById('siteDiaryChart').getContext('2d');
    new Chart(siteDiaryCtx, {
        type: 'line',
        data: siteDiaryData,
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top',
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Number of Diaries'
                    }
                }
            }
        }
    });

    // 創建 Safety Inspection 趨勢圖
    const safetyInspectionCtx = document.getElementById('safetyInspectionChart').getContext('2d');
    new Chart(safetyInspectionCtx, {
        type: 'line',
        data: safetyInspectionData,
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top',
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Number of Inspections'
                    }
                }
            }
        }
    });
    // 創建趨勢圖
const ctx = document.getElementById('labourWageChart').getContext('2d');
new Chart(ctx, {
    type: 'line',
    data: labourWageData,
    options: {
        responsive: true,
        maintainAspectRatio: false, // 禁用默認寬高比
        plugins: {
            legend: {
                position: 'top',
                labels: {
                    boxWidth: 12,
                    padding: 20,
                    font: {
                        size: 12
                    }
                }
            },
            tooltip: {
                mode: 'index',
                intersect: false,
                callbacks: {
                    label: function(context) {
                        let label = context.dataset.label || '';
                        if (context.datasetIndex === 0) {
                            return `${label}: $${context.parsed.y.toLocaleString()}`;
                        } else {
                            return `${label}: ${context.parsed.y1} hours`;
                        }
                    }
                }
            }
        },
        scales: {
            y: {
                type: 'linear',
                position: 'left',
                title: {
                    display: true,
                    text: 'Total wages',
                    font: {
                        weight: 'bold',
                        size: 12
                    }
                },
                min: 0,
                grid: {
                    color: 'rgba(155, 89, 182, 0.1)'
                },
                ticks: {
                    callback: function(value) {
                        return '$' + value.toLocaleString();
                    }
                }
            },
            y1: {
                type: 'linear',
                position: 'right',
                title: {
                    display: true,
                    text: 'working time (hours)',
                    font: {
                        weight: 'bold',
                        size: 12
                    }
                },
                min: 0,
                grid: {
                    drawOnChartArea: false // 不在圖表區繪製網格線
                },
                // 動態調整比例避免數據重疊
                afterDataLimits: (scale) => {
                    scale.max = Math.max(...labourWageData.datasets[1].data) * 1.5;
                }
            },
            x: {
                grid: {
                    display: false
                }
            }
        },
        interaction: {
            mode: 'nearest',
            axis: 'x'
        }
    }
});

};

// 窗口大小改變時重新計算圖表比例
window.addEventListener('resize', function() {
    // 獲取所有圖表實例
    const charts = [
        Chart.getChart("siteDiaryChart"),
        Chart.getChart("safetyInspectionChart"),
        Chart.getChart("labourWageChart")
    ];
    
    // 重新計算比例
    charts.forEach(chart => {
        if (chart) {
            // 特別處理 Labour Wage 的右軸
            if (chart.canvas.id === 'labourWageChart') {
                const overtimeData = chart.data.datasets[1].data;
                chart.options.scales.y1.max = Math.max(...overtimeData) * 1.3;
            }
            chart.update();
        }
    });
});
// 文档数据
// 文档数据
let diaryData = [];
const storedDiaries = sessionStorage.getItem('diaryData') || localStorage.getItem('diaryDataedit');
if (storedDiaries) {
    diaryData = JSON.parse(storedDiaries);
} else {
        diaryData = [
    { 
        id: "SD-2025-1", 
        status: "draft", 
        statusText: "Draft",
        site: "Treatment Plant", 
        date: "15-Aug-2025", 
        submittedBy: "John Doe",
        type: "Contractor Documents",
        pdfUrl: "pdfs/site-diary-1.pdf"
    },
    { 
        id: "SD-2025-2", 
        status: "submitted-ig", 
        statusText: "Submitted to IG",
        site: "Pipeline", 
        date: "14-Aug-2025", 
        submittedBy: "Jane Smith",
        type: "Contractor Documents",
        pdfUrl: "pdfs/site-diary-2.pdf"
    },
    { 
        id: "SD-2025-3", 
        status: "cancelled", 
        statusText: "Cancelled",
        site: "Reservoir", 
        date: "13-Aug-2025", 
        submittedBy: "Robert Johnson",
        type: "Sub Contractor Documents",
        pdfUrl: "pdfs/site-diary-3.pdf"
    },
    { 
        id: "SD-2025-4", 
        status: "reopen", 
        statusText: "Reopen",
        site: "Distribution", 
        date: "12-Aug-2025", 
        submittedBy: "Sarah Williams",
        type: "Sub Contractor Documents",
        pdfUrl: "pdfs/site-diary-4.pdf"
    },
    { 
        id: "SD-2025-5", 
        status: "submitted-wsg", 
        statusText: "Submitted to WSG",
        site: "Pump Station", 
        date: "11-Aug-2025", 
        submittedBy: "Michael Brown",
        type: "Contractor Documents",
        pdfUrl: "pdfs/site-diary-5.pdf"
    },
    { 
        id: "SD-2025-6", 
        status: "closed", 
        statusText: "Closed",
        site: "Reservoir", 
        date: "10-Aug-2025", 
        submittedBy: "David Wilson",
        type: "Sub Contractor Documents",
        pdfUrl: "pdfs/site-diary-6.pdf"
    },
    { 
        id: "SD-2025-7", 
        status: "draft", 
        statusText: "Draft",
        site: "Treatment Plant", 
        date: "09-Aug-2025", 
        submittedBy: "Emma Davis",
        type: "Sub Contractor Documents",
        pdfUrl: "pdfs/site-diary-7.pdf"
    },
    { 
        id: "SD-2025-8", 
        status: "submitted-ig", 
        statusText: "Submitted to IG",
        site: "Distribution", 
        date: "08-Aug-2025", 
        submittedBy: "James Miller",
        type: "Contractor Documents",
        pdfUrl: "pdfs/site-diary-8.pdf"
    },
    { 
        id: "SD-2025-9", 
        status: "closed", 
        statusText: "Closed",
        site: "Pump Station", 
        date: "07-Aug-2025", 
        submittedBy: "Olivia Garcia",
        type: "Sub Contractor Documents",
        pdfUrl: "pdfs/site-diary-9.pdf"
    },
    { 
        id: "SD-2025-10", 
        status: "reopen", 
        statusText: "Reopen",
        site: "Pipeline", 
        date: "06-Aug-2025", 
        submittedBy: "William Rodriguez",
        type: "Sub Contractor Documents",
        pdfUrl: "pdfs/site-diary-10.pdf"
    }
];
}
        
        // 当前筛选状态
        let currentFilters = {
            site: "all",
            status: "all",
            type: "all"
        };
        
        //// 初始化页面
        //document.addEventListener('DOMContentLoaded', function() {
        //    // 初始化表格
        //    renderDiaryTable();
        //    
        //    // 设置筛选器事件
        //    setupFilterEvents();
        //});
        
        // 渲染表格函数
        //function renderDiaryTable() {
        //    const tbody = document.getElementById('diary-table-body');
        //    const noResults = document.getElementById('no-results-message');
        //    // 更新總數
        //    document.getElementById('total-documents-count').textContent = diaryData.length;
        function renderDiaryTable() {
            const tbody = document.getElementById('diary-table-body');
            const noResults = document.getElementById('no-results-message');
            const totalCount = document.getElementById('total-documents-count');

            // 如果元素不存在，退出函數
            if (!tbody) {
                console.warn('日記表格元素不存在');
                return;
            }

            // 更新總數（如果元素存在）
            if (totalCount) {
                totalCount.textContent = diaryData.length;
            }
            // 清空表格
            tbody.innerHTML = '';
            
            // 筛选数据
            const filteredData = diaryData.filter(item => {
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
                
                // 文档类型筛选
                if (currentFilters.type !== "all" && item.type !== currentFilters.type) {
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
            // 填充表格
    filteredData.forEach(item => {
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td>${item.id}</td>
            <td><span class="status-badge status-${item.status}">${item.statusText}</span></td>
            <td>${item.site}</td>
            <td>${item.date}</td>
            <td>${item.submittedBy}</td>
            <td>${item.type}</td>
            <td>
                <button class="action-btn view-btn" data-id="${item.id}"><i class="fas fa-eye"></i></button>
                <button class="action-btn edit-btn" data-id="${item.id}"><i class="fas fa-edit"></i></button>
                <button class="action-btn delete-btn" data-id="${item.id}" style="background:linear-gradient(135deg,#e74c3c,#c0392b);color:#fff;"><i class="fas fa-trash"></i></button>
            </td>
        `;
        
        tbody.appendChild(row);
    });
    
    // Attach event listeners after rows are created
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const docId = this.getAttribute('data-id');
            const diaryItem = diaryData.find(item => item.id === docId);
            if (diaryItem) {
                sessionStorage.setItem('currentDocument', JSON.stringify(diaryItem));
                sessionStorage.setItem('diaryData', JSON.stringify(diaryData));
                window.location.href = 'sitediarydocument.html';
            }
        });
    });
    
    // 添加查看按钮事件监听器
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const docId = this.getAttribute('data-id');
            const diaryItem = diaryData.find(item => item.id === docId);
            
            if (diaryItem) {
                // 存储当前文档数据到sessionStorage
                sessionStorage.setItem('currentDocument', JSON.stringify({
                    id: diaryItem.id,
                    status: diaryItem.status,
                    statusText: diaryItem.statusText,
                    site: diaryItem.site,
                    date: diaryItem.date,
                    submittedBy: diaryItem.submittedBy,
                    type: diaryItem.type,
                    pdfUrl: diaryItem.pdfUrl
                }));
                
                // 跳转到文档查看页面
                window.location.href = 'sitediarydocument.html';
            }
        });
    });


    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const docId = this.getAttribute('data-id');
            const diaryItem = diaryData.find(item => item.id === docId);
            if (diaryItem) {
                sessionStorage.setItem('editDocument', JSON.stringify(diaryItem));
                sessionStorage.setItem('diaryData', JSON.stringify(diaryData));
                window.location.href = 'editpdf.html';
            }
        });
    });
    
    // 添加查看按钮事件监听器
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const docId = this.getAttribute('data-id');
            const diaryItem = diaryData.find(item => item.id === docId);
            
            if (diaryItem) {
                // 存储当前文档数据到sessionStorage
                sessionStorage.setItem('editDocument', JSON.stringify({
                    id: diaryItem.id,
                    status: diaryItem.status,
                    statusText: diaryItem.statusText,
                    site: diaryItem.site,
                    date: diaryItem.date,
                    submittedBy: diaryItem.submittedBy,
                    type: diaryItem.type,
                    pdfUrl: diaryItem.pdfUrl
                }));
                
                // 跳转到文档查看页面
                window.location.href = 'editpdf.html';
            }
        });
    });
    //deletebdiary
    document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        const docId = this.getAttribute('data-id');
        // 刪除 diaryData 中對應項
        const idx = diaryData.findIndex(item => item.id === docId);
        if (idx !== -1) {
            if (confirm('Are you sure you want to delete this diary?')) {
                diaryData.splice(idx, 1);
                // 更新 sessionStorage 和 localStorage
                sessionStorage.setItem('diaryData', JSON.stringify(diaryData));
                localStorage.setItem('diaryDataedit', JSON.stringify(diaryData));
                // 重新渲染表格
                renderDiaryTable();
            }
        }
    });
});
} 
        

function setupFilterEvents() {
document.querySelectorAll('.filter-group').forEach(group => {
    const toggle = group.querySelector('.filter-toggle');
    const options = group.querySelector('.filter-options');
    
    // Toggle dropdown on click
    toggle.addEventListener('click', function(e) {
        e.stopPropagation();
        // Close other dropdowns
        document.querySelectorAll('.filter-options').forEach(opt => {
            if (opt !== options) opt.classList.remove('open');
        });
        options.classList.toggle('open');
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
            renderDiaryTable();
            options.classList.remove('open'); // Close dropdown
        });
    });
});
// Click outside closes all dropdowns
document.addEventListener('click', function(e) {
    document.querySelectorAll('.filter-options').forEach(opt => opt.classList.remove('open'));
});
}


// 在 app.js 的末尾添加
document.addEventListener('DOMContentLoaded', function() {
    // 初始化表格
    renderDiaryTable();
    
    // 设置筛选器事件
    setupFilterEvents();
    
    // 添加按钮事件监听
    setupActionButtons();
});

// 添加按钮事件监听的函数
//function setupActionButtons() {
//    // 查看按钮事件
//    document.querySelectorAll('.view-btn').forEach(btn => {
//        btn.addEventListener('click', function() {
//            const docId = this.getAttribute('data-id');
//            const diaryItem = diaryData.find(item => item.id === docId);
//            
//            if (diaryItem) {
//                sessionStorage.setItem('currentDocument', JSON.stringify({
//                    id: diaryItem.id,
//                    status: diaryItem.status,
//                    statusText: diaryItem.statusText,
//                    site: diaryItem.site,
//                    date: diaryItem.date,
//                    submittedBy: diaryItem.submittedBy,
//                    type: diaryItem.type,
//                    pdfUrl: diaryItem.pdfUrl
//                }));
//                
//                window.location.href = 'sitediarydocument.html';
//            }
//        });
//    });
//    
    //document.querySelectorAll('.edit-btn').forEach(btn => {
    //    btn.addEventListener('click', function() {
    //        const docId = btn.dataset.id;
    //        const doc = diaryData.find(item => item.id === docId);
    //        // Store the entire diaryData array
    //        sessionStorage.setItem('diaryData', JSON.stringify(diaryData));
    //        // Store the selected document
    //        sessionStorage.setItem('editDocument', JSON.stringify(doc));
    //        window.location.href = 'editpdf.html';
    //    });
    //});

    //add new diary//
    // ...existing code...

// 彈窗顯示
//document.querySelector('.nav-buttons button').addEventListener('click', function() {
//    document.getElementById('add-diary-modal').style.display = 'flex';
//});
const addDiaryBtn = document.querySelector('.nav-buttons button');
if (addDiaryBtn) {
    addDiaryBtn.addEventListener('click', function() {
        const modal = document.getElementById('add-diary-modal');
        if (modal) modal.style.display = 'flex';
    });
}

// 彈窗取消
document.getElementById('cancel-add-diary').addEventListener('click', function() {
    document.getElementById('add-diary-modal').style.display = 'none';
});

// 表單提交
document.getElementById('add-diary-form').addEventListener('submit', function(e) {
    e.preventDefault();
    // 收集資料
    const newDiary = {
        id: document.getElementById('input-diary-id').value,
        status: document.getElementById('input-status').value,
        statusText: document.getElementById('input-status').selectedOptions[0].text,
        site: document.getElementById('input-site').value,
        date: new Date(document.getElementById('input-date').value).toLocaleDateString('en-GB', {day:'2-digit',month:'short',year:'numeric'}),
        submittedBy: document.getElementById('input-submitted-by').value,
        type: document.getElementById('input-type').value,
        pdfUrl: "" // 可選
    };
    // 加入 diaryData
    diaryData.push(newDiary);
    // 儲存到 sessionStorage
    sessionStorage.setItem('diaryData', JSON.stringify(diaryData));
    // 關閉彈窗
    document.getElementById('add-diary-modal').style.display = 'none';
    // 重新渲染表格
    renderDiaryTable();

    // 儲存到 editpdf.js 用的 diaryDataedit（localStorage 或 sessionStorage）
    localStorage.setItem('diaryDataedit', JSON.stringify(diaryData));

    // 页面加载时初始化主题配置
    document.addEventListener('DOMContentLoaded', function() {
        ThemeConfig.init();
    });
});

// 添加到你的app.js文件中
document.addEventListener('DOMContentLoaded', function() {
    // ... 其他初始化代码 ...
    
    // 处理子菜单展开/折叠
    const submenuToggles = document.querySelectorAll('.submenu-toggle');
    submenuToggles.forEach(toggle => {
        toggle.addEventListener('click', function(e) {
            e.preventDefault();
            const parentItem = this.closest('.menu-item-with-submenu');
            parentItem.classList.toggle('active');
        });
    });
    
    // 如果当前页面在子菜单中，自动展开父菜单
    const activeSubmenuItem = document.querySelector('.submenu a.active');
    if (activeSubmenuItem) {
        const parentMenu = activeSubmenuItem.closest('.menu-item-with-submenu');
        if (parentMenu) {
            parentMenu.classList.add('active');
        }
    }
});