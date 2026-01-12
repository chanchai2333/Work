document.addEventListener("DOMContentLoaded", function() {
    // 1. 讀取 inspectionData
    let inspectionData = JSON.parse(localStorage.getItem('inspectionData'));
    if (!inspectionData || !Array.isArray(inspectionData)) {
        inspectionData = [
            { id: "INSP-2025-1", status: "draft", statusText: "Draft", site: "Treatment Plant", date: "15-Aug-2025", inspector: "John Doe", pdfUrl: "" },
            { id: "INSP-2025-2", status: "submitted", statusText: "Submitted", site: "Pipeline", date: "14-Aug-2025", inspector: "Jane Smith", pdfUrl: "" },
            { id: "INSP-2025-3", status: "closed", statusText: "Closed", site: "Reservoir", date: "13-Aug-2025", inspector: "Robert Johnson", pdfUrl: "" }
        ];
    }

    // 2. 從 sessionStorage 取得當前 inspection 數據
    const currentDoc = JSON.parse(sessionStorage.getItem('editDocument')) || 
                       JSON.parse(sessionStorage.getItem('currentInspection'));

    if (currentDoc) {
        document.getElementById('docId').textContent = currentDoc.id || 'N/A';
        document.getElementById('docSite').textContent = currentDoc.site || 'N/A';
        document.getElementById('docDate').textContent = currentDoc.date || 'N/A';
        document.getElementById('docInspector').textContent = currentDoc.inspector || 'N/A';
        document.getElementById('docTitle').textContent = `Safety Inspection - ${currentDoc.id}`;

        // 設置狀態
        const statusElement = document.getElementById('docStatus');
        if (statusElement) {
            statusElement.textContent = currentDoc.statusText || 'Editing';
            statusElement.className = 'doc-status';
            
            // 添加状态样式类
            if (currentDoc.status) {
                statusElement.classList.add(`status-${currentDoc.status}`);
            }
        }

        // PDF 預覽
        if (currentDoc.pdfUrl) {
            loadPDF(currentDoc.pdfUrl);
        } else {
            console.log("No PDF URL provided for this inspection");
            // 可以在这里显示一个默认的PDF或提示信息
        }
    } else {
        console.error("找不到對應的檢查文件！");
        alert("No inspection document found. Please select an inspection first.");
        window.location.href = 'safetyinspect.html';
    }

    // 設定日期
    const today = new Date();
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('current-date').textContent = today.toLocaleDateString('en-US', options);

    // 取得用戶名
    const user = JSON.parse(localStorage.getItem('user'));
    if (user) {
        const userBtn = document.querySelector('.user-btn');
        if (userBtn) {
            const icon = userBtn.querySelector('i') ? userBtn.querySelector('i').outerHTML : '<i class="fas fa-user"></i>';
            userBtn.innerHTML = `${icon} ${user.name}`;
        }
    }

    // 工具欄與導航
    setupToolButtons();
    setupNavigation();

    // 按鈕事件
    document.getElementById('save-btn').addEventListener('click', saveChanges);
    document.getElementById('cancel-btn').addEventListener('click', cancelEditing);
    document.getElementById('back-btn').addEventListener('click', goBackToInspection);

    // 加载PDF文档
    function loadPDF(url) {
        if (!url) {
            console.error("No PDF URL provided");
            return;
        }
        
        // 检查是否已加载PDF.js库
        if (typeof pdfjsLib === 'undefined') {
            console.error("PDF.js library not loaded");
            // 动态加载PDF.js
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js';
            script.onload = function() {
                // 设置PDF.js worker
                pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
                loadPDF(url);
            };
            document.head.appendChild(script);
            return;
        }

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
        if (!thumbnailsContainer) return;
        
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
        
        if (sizeSlider && sizeValue) {
            sizeSlider.addEventListener('input', function() {
                sizeValue.textContent = this.value + 'px';
            });
        }
        
        if (opacitySlider && opacityValue) {
            opacitySlider.addEventListener('input', function() {
                opacityValue.textContent = this.value + '%';
            });
        }
    }

    // 激活工具
    function activateTool(tool) {
        const annotationLayer = document.getElementById('annotation-layer');
        
        // 清除之前的工具状态
        if (annotationLayer) {
            annotationLayer.classList.remove('active');
        }
        
        // 根据选择的工具设置注释层
        switch(tool) {
            case 'select':
                // 选择工具逻辑
                break;
            case 'text':
                if (annotationLayer) annotationLayer.classList.add('active');
                setupTextTool();
                break;
            case 'highlight':
                if (annotationLayer) annotationLayer.classList.add('active');
                setupHighlightTool();
                break;
            case 'draw':
                if (annotationLayer) annotationLayer.classList.add('active');
                setupDrawTool();
                break;
            case 'shape':
                if (annotationLayer) annotationLayer.classList.add('active');
                setupShapeTool();
                break;
            case 'stamp':
                if (annotationLayer) annotationLayer.classList.add('active');
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
        const prevBtn = document.getElementById('prev-page');
        const nextBtn = document.getElementById('next-page');
        
        if (prevBtn) {
            prevBtn.addEventListener('click', function() {
                if (window.currentPage > 1) {
                    renderPage(window.currentPage - 1);
                }
            });
        }
        
        if (nextBtn) {
            nextBtn.addEventListener('click', function() {
                if (window.pdfDoc && window.currentPage < window.pdfDoc.numPages) {
                    renderPage(window.currentPage + 1);
                }
            });
        }
        
        // 缩放控制
        const zoomInBtn = document.getElementById('zoom-in');
        const zoomOutBtn = document.getElementById('zoom-out');
        const fitWidthBtn = document.getElementById('fit-width');
        const fitPageBtn = document.getElementById('fit-page');
        
        if (zoomInBtn) {
            zoomInBtn.addEventListener('click', function() {
                // 实现放大功能
                console.log('Zoom in');
            });
        }
        
        if (zoomOutBtn) {
            zoomOutBtn.addEventListener('click', function() {
                // 实现缩小功能
                console.log('Zoom out');
            });
        }
        
        if (fitWidthBtn) {
            fitWidthBtn.addEventListener('click', function() {
                // 实现适应宽度功能
                console.log('Fit width');
            });
        }
        
        if (fitPageBtn) {
            fitPageBtn.addEventListener('click', function() {
                // 实现适应页面功能
                console.log('Fit page');
            });
        }
    }

    // 保存更改
    function saveChanges() {
        // 实现保存功能
        alert('Changes saved successfully!');
        goBackToInspection();
    }

    // 取消编辑
    function cancelEditing() {
        if (confirm('Are you sure you want to cancel? All changes will be lost.')) {
            goBackToInspection();
        }
    }
    
    // 返回 Safety Inspection 頁面
    function goBackToInspection() {
        window.location.href = 'safetyinspect.html';
    }
});