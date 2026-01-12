// editpdf.js
document.addEventListener("DOMContentLoaded", function() {
    // 先嘗試從 localStorage 讀取
    let diaryDataedit = JSON.parse(localStorage.getItem('diaryDataedit'));
    if (!diaryDataedit || !Array.isArray(diaryDataedit)) {
        // 如果沒有就用預設資料
    diaryDataedit = [
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
    
    // 2. 從 URL 參數或 sessionStorage 獲取當前文檔 ID（可選）
    const urlParams = new URLSearchParams(window.location.search);
    const docId = urlParams.get('id') || JSON.parse(sessionStorage.getItem('editDocument'))?.id;

    // 3. 找到對應的文檔並顯示在頁面上
    const currentDoc = diaryDataedit.find(doc => doc.id === docId);
    
    if (currentDoc) {
        document.getElementById('docId').textContent = currentDoc.id;
        document.getElementById('docSite').textContent = currentDoc.site;
        document.getElementById('docDate').textContent = currentDoc.date;
        document.getElementById('docSubmittedBy').textContent = currentDoc.submittedBy;
        
        // 如果有 PDF 預覽功能
        if (currentDoc.pdfUrl) {
            const pdfViewer = document.getElementById('pdfViewer');
            pdfViewer.setAttribute('data', currentDoc.pdfUrl);
        }
    } else {
        console.error("找不到對應的文檔！");
    }
});
    
    // 设置当前日期
    const today = new Date();
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('current-date').textContent = today.toLocaleDateString('en-US', options);
    
    // 从localStorage获取用户名
    const user = JSON.parse(localStorage.getItem('user'));
    if (user) {
        document.getElementById('username').textContent = user.name;
    }
    
    // 添加工具按钮事件
    setupToolButtons();
    
    // 添加页面导航事件
    setupNavigation();

// 添加按钮事件监听
    document.getElementById('save-btn').addEventListener('click', saveChanges);
    document.getElementById('cancel-btn').addEventListener('click', cancelEditing);
    document.getElementById('back-btn').addEventListener('click', goBackToDiary);

// 加载PDF文档
function loadPDF(url) {
    // 使用PDF.js加载PDF
    const loadingTask = pdfjsLib.getDocument(url);
    
    loadingTask.promise.then(function(pdf) {
        window.pdfDoc = pdf;
        document.getElementById('total-pages').textContent = pdf.numPages;
        
        // 显示第一页
        renderPage(1);
        
        // 生成页面缩略图
        generateThumbnails(pdf);
    }).catch(function(error) {
        console.error('Error loading PDF:', error);
        alert('Failed to load PDF document');
    });
}

// 渲染PDF页面
function renderPage(pageNum) {
    if (!window.pdfDoc) return;
    
    window.pdfDoc.getPage(pageNum).then(function(page) {
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = document.getElementById('pdf-canvas');
        const context = canvas.getContext('2d');
        
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        // 更新当前页面信息
        document.getElementById('current-page').textContent = pageNum;
        window.currentPage = pageNum;
        
        const renderContext = {
            canvasContext: context,
            viewport: viewport
        };
        
        page.render(renderContext);
    });
}

// 生成页面缩略图
function generateThumbnails(pdf) {
    const thumbnailsContainer = document.getElementById('page-thumbnails');
    thumbnailsContainer.innerHTML = '';
    
    for (let i = 1; i <= pdf.numPages; i++) {
        pdf.getPage(i).then(function(page) {
            const viewport = page.getViewport({ scale: 0.2 });
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            canvas.className = 'page-thumb';
            
            if (i === 1) {
                canvas.classList.add('active');
            }
            
            canvas.addEventListener('click', function() {
                document.querySelectorAll('.page-thumb').forEach(thumb => {
                    thumb.classList.remove('active');
                });
                this.classList.add('active');
                renderPage(i);
            });
            
            const renderContext = {
                canvasContext: context,
                viewport: viewport
            };
            
            page.render(renderContext);
            thumbnailsContainer.appendChild(canvas);
        });
    }
}

// 设置工具按钮
function setupToolButtons() {
    const toolButtons = document.querySelectorAll('.tool-btn');
    
    toolButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            toolButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            const tool = this.dataset.tool;
            activateTool(tool);
        });
    });
    
    // 设置属性控件
    const sizeSlider = document.getElementById('size-slider');
    const sizeValue = document.getElementById('size-value');
    const opacitySlider = document.getElementById('opacity-slider');
    const opacityValue = document.getElementById('opacity-value');
    
    sizeSlider.addEventListener('input', function() {
        sizeValue.textContent = this.value + 'px';
    });
    
    opacitySlider.addEventListener('input', function() {
        opacityValue.textContent = this.value + '%';
    });
}

// 激活工具
function activateTool(tool) {
    const annotationLayer = document.getElementById('annotation-layer');
    
    // 清除之前的工具状态
    annotationLayer.classList.remove('active');
    
    // 根据选择的工具设置注释层
    switch(tool) {
        case 'select':
            // 选择工具逻辑
            break;
        case 'text':
            annotationLayer.classList.add('active');
            setupTextTool();
            break;
        case 'highlight':
            annotationLayer.classList.add('active');
            setupHighlightTool();
            break;
        case 'draw':
            annotationLayer.classList.add('active');
            setupDrawTool();
            break;
        case 'shape':
            annotationLayer.classList.add('active');
            setupShapeTool();
            break;
        case 'stamp':
            annotationLayer.classList.add('active');
            setupStampTool();
            break;
    }
}

// 设置文本工具
function setupTextTool() {
    // 实现文本注释功能
    console.log('Text tool activated');
}

// 设置高亮工具
function setupHighlightTool() {
    // 实现高亮注释功能
    console.log('Highlight tool activated');
}

// 设置绘图工具
function setupDrawTool() {
    // 实现绘图功能
    console.log('Draw tool activated');
}

// 设置形状工具
function setupShapeTool() {
    // 实现形状注释功能
    console.log('Shape tool activated');
}

// 设置印章工具
function setupStampTool() {
    // 实现印章功能
    console.log('Stamp tool activated');
}

// 设置页面导航
function setupNavigation() {
    document.getElementById('prev-page').addEventListener('click', function() {
        if (window.currentPage > 1) {
            renderPage(window.currentPage - 1);
        }
    });
    
    document.getElementById('next-page').addEventListener('click', function() {
        if (window.currentPage < window.pdfDoc.numPages) {
            renderPage(window.currentPage + 1);
        }
    });
    
    // 缩放控制
    document.getElementById('zoom-in').addEventListener('click', function() {
        // 实现放大功能
        console.log('Zoom in');
    });
    
    document.getElementById('zoom-out').addEventListener('click', function() {
        // 实现缩小功能
        console.log('Zoom out');
    });
    
    document.getElementById('fit-width').addEventListener('click', function() {
        // 实现适应宽度功能
        console.log('Fit width');
    });
    
    document.getElementById('fit-page').addEventListener('click', function() {
        // 实现适应页面功能
        console.log('Fit page');
    });
}

// 保存更改
function saveChanges() {
    // 实现保存功能
    alert('Changes saved successfully!');
    goBackToDiary();
}

// 取消编辑
function cancelEditing() {
    if (confirm('Are you sure you want to cancel? All changes will be lost.')) {
        goBackToDiary();
    }
}

// 返回日记页面
function goBackToDiary() {
    window.location.href = 'sitediary.html';
}

 // 添加按钮事件监听（备用方法）
            document.getElementById('back-btn').addEventListener('click', function(e) {
                e.preventDefault();
                console.log('Back button event listener triggered');
                window.goBackToDiary();
            });
