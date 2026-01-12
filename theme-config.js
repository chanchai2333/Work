// scripts/theme-config.js - 修复版本
const ThemeConfig = {
    defaults: {
        theme: 'light',
        language: 'en',
        dateFormat: 'mm-dd-yyyy'
    },
    
    current: {},
    
    // 翻译文本
    translations: {
        en: {
            // 导航和标题
            'system.settings': 'System Settings',
            'system.configuration': 'System Configuration',
            'configure.preferences': 'Configure system preferences, appearance, and integration settings. Changes will be applied system-wide.',
            
            // 显示设置
            'display.settings': 'Display Settings',
            'active': 'Active',
            'theme': 'Theme',
            'light.theme': 'Light Theme',
            'dark.theme': 'Dark Theme',
            'language': 'Language',
            'english': 'English',
            'chinese': '中文',
            'date.format': 'Date Format',
            'results.per.page': 'Results Per Page',
            'save.display.settings': 'Save Display Settings',
            'reset.to.default': 'Reset to Default',
            
            // PDF上传
            'initial.pdf.upload': 'Initial PDF Upload',
            'required': 'Required',
            'current.pdf.files': 'Current PDF Files',
            'upload.new.pdf': 'Upload New PDF',
            'drag.drop.pdf': 'Drag & drop PDF files here or click to browse',
            'select.files': 'Select Files',
            'auto.process.settings': 'Auto-process Settings',
            'auto.process.pdfs': 'Automatically process uploaded PDFs',
            'overwrite.existing': 'Overwrite existing files with same name',
            'upload.process': 'Upload & Process',
            'refresh.list': 'Refresh List',
            
            // 邮件设置
            'email.settings': 'Email Settings',
            'configured': 'Configured',
            'smtp.server': 'SMTP Server',
            'smtp.port': 'SMTP Port',
            'email.username': 'Email Username',
            'email.password': 'Email Password',
            'from.address': 'From Address',
            'from.name': 'From Name',
            'email.notifications': 'Email Notifications',
            'notify.diary': 'Site diary submissions',
            'notify.safety': 'Safety inspection alerts',
            'notify.system': 'System updates',
            'save.email.settings': 'Save Email Settings',
            'test.configuration': 'Test Configuration',
            
            // 下载设置
            'download.path.settings': 'Download Path Settings',
            'needs.review': 'Needs Review',
            'default.download.path': 'Default Download Path',
            'browse': 'Browse',
            'folder.structure': 'Folder Structure',
            'file.naming.convention': 'File Naming Convention',
            'automatic.downloads': 'Automatic Downloads',
            'save.path.settings': 'Save Path Settings',
            'open.download.folder': 'Open Download Folder',
            
            // 搜索
            'search.placeholder': 'Search settings...',
            
            // 页脚
            'copyright': '© 2025 AEL DWSS System. All rights reserved.',
            'platform': 'AEL DWSS Platform',

                    // 导航菜单
        'dashboard': 'Dashboard',
        'site.diary': 'Site Diary',
        'safety.inspection': 'Safety Inspection',
        'site.locations': 'Site Locations',
        'labour.wage': 'Labour Wage',
        'system.settings': 'System Settings',
        'user.management': 'User Management',
        
        // 通用按钮和文本
        'save': 'Save',
        'cancel': 'Cancel',
        'edit': 'Edit',
        'delete': 'Delete',
        'view': 'View',
        'back': 'Back',
        'print': 'Print',
        'export': 'Export',
        'download': 'Download',
        
        // Labour Wage 页面特定文本
        'labour.wage.management': 'Labour Wage Management',
        'add.new.wage': 'Add New Wage',
        'document.id': 'Document ID',
        'document.type': 'Document Type',
        'site': 'Site',
        'period': 'Period',
        'submitted.by': 'Submitted By',
        'total.amount': 'Total Amount',
        'status': 'Status',
        'actions': 'Actions',
        'search.wage.records': 'Search wage records...',
        
        // Edit Labour 页面特定文本
        'edit.labour.wage': 'Edit Labour Wage Record',
        'edit.record.details': 'Edit Record Details',
        'record.details': 'Record Details',
        'pdf.editor': 'PDF Editor',
        'annotation.tools': 'Annotation Tools',
        'select': 'Select',
        'text': 'Text',
        'highlight': 'Highlight',
        'draw': 'Draw',
        'shapes': 'Shapes',
        'stamp': 'Stamp',
        'properties': 'Properties',
        'color': 'Color',
        'size': 'Size',
        'opacity': 'Opacity',
        'pages': 'Pages',
        
        // Labour Wage Document 页面特定文本
        'labour.wage.document': 'Labour Wage Document',
        'export.pdf': 'Export PDF',
        'back.to.wage': 'Back to Labour Wage',
        'zoom.in': 'Zoom In',
        'zoom.out': 'Zoom Out',
        'fit.width': 'Fit Width',
        'fit.page': 'Fit Page',
        'no.pdf.available': 'No PDF document available for this wage record',
        'pdf.preview.will.appear': 'The PDF preview will appear here when available'
        },
        zh: {
            // 导航和标题
            'system.settings': '系统设置',
            'system.configuration': '系统配置',
            'configure.preferences': '配置系统偏好、外观和集成设置。更改将应用于整个系统。',
            
            // 显示设置
            'display.settings': '显示设置',
            'active': '已激活',
            'theme': '主题',
            'light.theme': '浅色主题',
            'dark.theme': '深色主题',
            'language': '语言',
            'english': 'English',
            'chinese': '中文',
            'date.format': '日期格式',
            'results.per.page': '每页结果数',
            'save.display.settings': '保存显示设置',
            'reset.to.default': '重置为默认',
            
            // PDF上传
            'initial.pdf.upload': '初始PDF上传',
            'required': '必需',
            'current.pdf.files': '当前PDF文件',
            'upload.new.pdf': '上传新PDF',
            'drag.drop.pdf': '将PDF文件拖放到此处或点击浏览',
            'select.files': '选择文件',
            'auto.process.settings': '自动处理设置',
            'auto.process.pdfs': '自动处理上传的PDF文件',
            'overwrite.existing': '覆盖同名现有文件',
            'upload.process': '上传并处理',
            'refresh.list': '刷新列表',
            
            // 邮件设置
            'email.settings': '邮件设置',
            'configured': '已配置',
            'smtp.server': 'SMTP服务器',
            'smtp.port': 'SMTP端口',
            'email.username': '邮件用户名',
            'email.password': '邮件密码',
            'from.address': '发件人地址',
            'from.name': '发件人名称',
            'email.notifications': '邮件通知',
            'notify.diary': '现场日记提交',
            'notify.safety': '安全检查提醒',
            'notify.system': '系统更新',
            'save.email.settings': '保存邮件设置',
            'test.configuration': '测试配置',
            
            // 下载设置
            'download.path.settings': '下载路径设置',
            'needs.review': '需要审核',
            'default.download.path': '默认下载路径',
            'browse': '浏览',
            'folder.structure': '文件夹结构',
            'file.naming.convention': '文件命名约定',
            'automatic.downloads': '自动下载',
            'save.path.settings': '保存路径设置',
            'open.download.folder': '打开下载文件夹',
            
            // 搜索
            'search.placeholder': '搜索设置...',
            
            // 页脚
            'copyright': '© 2025 AEL DWSS 系统。保留所有权利。',
            'platform': 'AEL DWSS 平台',

                    // 导航菜单
        'dashboard': '仪表板',
        'site.diary': '现场日记',
        'safety.inspection': '安全检查',
        'site.locations': '站点位置',
        'labour.wage': '劳动工资',
        'system.settings': '系统设置',
        'user.management': '用户管理',
        
        // 通用按钮和文本
        'save': '保存',
        'cancel': '取消',
        'edit': '编辑',
        'delete': '删除',
        'view': '查看',
        'back': '返回',
        'print': '打印',
        'export': '导出',
        'download': '下载',
        
        // Labour Wage 页面特定文本
        'labour.wage.management': '劳动工资管理',
        'add.new.wage': '添加工资记录',
        'document.id': '文档ID',
        'document.type': '文档类型',
        'site': '站点',
        'period': '期间',
        'submitted.by': '提交人',
        'total.amount': '总金额',
        'status': '状态',
        'actions': '操作',
        'search.wage.records': '搜索工资记录...',
        
        // Edit Labour 页面特定文本
        'edit.labour.wage': '编辑劳动工资记录',
        'edit.record.details': '编辑记录详情',
        'record.details': '记录详情',
        'pdf.editor': 'PDF编辑器',
        'annotation.tools': '注释工具',
        'select': '选择',
        'text': '文本',
        'highlight': '高亮',
        'draw': '绘图',
        'shapes': '形状',
        'stamp': '印章',
        'properties': '属性',
        'color': '颜色',
        'size': '大小',
        'opacity': '透明度',
        'pages': '页面',
        
        // Labour Wage Document 页面特定文本
        'labour.wage.document': '劳动工资文档',
        'export.pdf': '导出PDF',
        'back.to.wage': '返回劳动工资',
        'zoom.in': '放大',
        'zoom.out': '缩小',
        'fit.width': '适应宽度',
        'fit.page': '适应页面',
        'no.pdf.available': '此工资记录暂无PDF文档',
        'pdf.preview.will.appear': 'PDF预览将在可用时显示在此处'
        }
    },

    init: function() {
        // 从 localStorage 加载设置
        this.current.theme = localStorage.getItem('ael_dwss_theme') || this.defaults.theme;
        this.current.language = localStorage.getItem('ael_dwss_language') || this.defaults.language;
        this.current.dateFormat = localStorage.getItem('ael_dwss_dateFormat') || this.defaults.dateFormat;
        
        // 应用当前设置
        this.applyTheme();
        this.updateLanguage();
        
        return this.current;
    },
    
    // 保存设置
    save: function(settings) {
        if (settings.theme) {
            this.current.theme = settings.theme;
            localStorage.setItem('ael_dwss_theme', settings.theme);
            this.applyTheme();
        }
        
        if (settings.language) {
            this.current.language = settings.language;
            localStorage.setItem('ael_dwss_language', settings.language);
            this.updateLanguage();
        }
        
        if (settings.dateFormat) {
            this.current.dateFormat = settings.dateFormat;
            localStorage.setItem('ael_dwss_dateFormat', settings.dateFormat);
        }
    },
    
    // 应用主题
    applyTheme: function() {
        if (this.current.theme === 'dark') {
            document.body.classList.add('dark-theme');
            this.applyDarkThemeStyles();
        } else {
            document.body.classList.remove('dark-theme');
            this.removeDarkThemeStyles();
        }
    },

    // 更新语言
    updateLanguage: function() {
        const lang = this.current.language;
        const texts = this.translations[lang];
        
        if (!texts) return;
        
        // 更新页面标题
        document.title = 'System Settings - AEL DWSS System';
        
        // 更新主标题和描述
        this.updateText('.main-content h1', texts['system.settings']);
        this.updateText('.dashboard h2', texts['system.configuration']);
        this.updateText('.dashboard p', texts['configure.preferences']);
        this.updatePlaceholder('input[placeholder]', texts['search.placeholder']);
        
        // 更新显示设置卡片
        this.updateText('.display-settings .card-title span', texts['display.settings']);
        this.updateLabel('.display-settings', 'theme', texts['theme']);
        this.updateLabel('.display-settings', 'language', texts['language']);
        this.updateLabel('.display-settings', 'date-format', texts['date.format']);
        this.updateLabel('.display-settings', 'results-per-page', texts['results.per.page']);
        this.updateButtonText('.display-settings .btn-primary', texts['save.display.settings']);
        this.updateButtonText('.display-settings .btn-secondary', texts['reset.to.default']);
        this.updateText('.display-settings .card-badge', texts['active']);
        
        // 更新其他卡片
        this.updateText('.pdf-upload .card-title span', texts['initial.pdf.upload']);
        this.updateText('.pdf-upload .card-badge', texts['required']);
        this.updateLabel('.pdf-upload', 'pdf-upload', texts['upload.new.pdf']);
        this.updateText('.pdf-upload .upload-area p', texts['drag.drop.pdf']);
        this.updateButtonText('.pdf-upload .btn-outline', texts['select.files']);
        this.updateButtonText('.pdf-upload .btn-primary', texts['upload.process']);
        this.updateButtonText('.pdf-upload .btn-secondary', texts['refresh.list']);
        
        this.updateText('.email-settings .card-title span', texts['email.settings']);
        this.updateText('.email-settings .card-badge', texts['configured']);
        
        this.updateText('.download-settings .card-title span', texts['download.path.settings']);
        this.updateText('.download-settings .card-badge', texts['needs.review']);
        
        // 更新页脚
        this.updateText('footer p:first-child', texts['copyright']);
        this.updateText('footer p:last-child', texts['platform']);
    },

    // 辅助方法
    updateText: function(selector, text) {
        const element = document.querySelector(selector);
        if (element && text) {
            element.textContent = text;
        }
    },

    updateLabel: function(cardSelector, inputId, text) {
        const label = document.querySelector(`${cardSelector} label[for="${inputId}"]`);
        if (label && text) {
            label.textContent = text;
        }
    },

    updatePlaceholder: function(selector, text) {
        const element = document.querySelector(selector);
        if (element && text) {
            element.placeholder = text;
        }
    },

    updateButtonText: function(selector, text) {
        const button = document.querySelector(selector);
        if (button && text) {
            // 保持按钮中的图标，只更新文本
            const icon = button.querySelector('i');
            if (icon) {
                // 移除现有文本，保留图标
                Array.from(button.childNodes).forEach(node => {
                    if (node.nodeType === Node.TEXT_NODE) {
                        node.remove();
                    }
                });
                // 添加新文本
                button.appendChild(document.createTextNode(' ' + text));
            } else {
                button.textContent = text;
            }
        }
    },

    applyDarkThemeStyles: function() {
        // 动态添加暗色主题样式
        if (!document.getElementById('dark-theme-styles')) {
            const style = document.createElement('style');
            style.id = 'dark-theme-styles';
            style.textContent = `
                body.dark-theme {
                    background-color: #1e1e1e;
                    color: #f0f0f0;
                }
                
                /* Edit PDF 页面特定样式 - 新增 */
body.dark-theme .edit-pdf-page {
    background-color: #2a2a2a !important;
    color: #ffffff !important;
}

body.dark-theme .document-header {
    background-color: #2a2a2a !important;
    color: #ffffff !important;
    border-bottom-color: #555 !important;
}

body.dark-theme .document-header h2 {
    color: #ffffff !important;
}

body.dark-theme .document-meta {
    background-color: #3a3a3a !important;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2) !important;
}

body.dark-theme .meta-label {
    color: #bbbbbb !important;
}

body.dark-theme .meta-value {
    background-color: #2a2a2a !important;
    color: #ffffff !important;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3) !important;
    border: 1px solid #555 !important;
}

/* PDF 编辑工具栏样式 */
body.dark-theme .pdf-toolbar {
    background-color: #3a3a3a !important;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2) !important;
    border-color: #555 !important;
}

body.dark-theme .pdf-toolbar h3 {
    color: #ffffff !important;
}

body.dark-theme .tool-btn {
    background-color: #2a2a2a !important;
    color: #e0e0e0 !important;
    border-color: #555 !important;
}

body.dark-theme .tool-btn.active,
body.dark-theme .tool-btn:hover {
    background-color: #3498db !important;
    color: white !important;
    border-color: #3498db !important;
}

body.dark-theme .property-controls label {
    color: #e0e0e0 !important;
}

body.dark-theme .property-group span {
    color: #ffffff !important;
}

body.dark-theme input[type="color"],
body.dark-theme input[type="range"] {
    background-color: #2a2a2a !important;
    border-color: #555 !important;
}

body.dark-theme input[type="color"]:focus,
body.dark-theme input[type="range"]:focus {
    border-color: #3498db !important;
    box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.2) !important;
}

/* PDF 控制区域样式 */
body.dark-theme .pdf-controls {
    background-color: #3a3a3a !important;
    border-color: #555 !important;
}

body.dark-theme .nav-btn,
body.dark-theme .zoom-btn {
    background-color: #2a2a2a !important;
    color: #ffffff !important;
    border-color: #555 !important;
}

body.dark-theme .nav-btn:hover,
body.dark-theme .zoom-btn:hover {
    background-color: #3498db !important;
    border-color: #3498db !important;
}

body.dark-theme .page-info {
    color: #ffffff !important;
}

body.dark-theme .zoom-level {
    color: #ffffff !important;
}

/* PDF 画布容器 */
body.dark-theme .pdf-canvas-container {
    background-color: #1e1e1e !important;
    border-color: #555 !important;
}

body.dark-theme .page-thumbnails {
    background-color: transparent !important;
}

body.dark-theme .page-thumb {
    border-color: #555 !important;
}

body.dark-theme .page-thumb:hover {
    border-color: #3498db !important;
}

body.dark-theme .page-thumb.active {
    border-color: #3498db !important;
    box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.3) !important;
}

/* 按钮样式 */
body.dark-theme .document-actions .btn {
    background: linear-gradient(135deg, #3498db, #2980b9) !important;
    color: white !important;
    border: none !important;
    box-shadow: 0 2px 5px rgba(52, 152, 219, 0.3) !important;
}

body.dark-theme .document-actions .btn:hover {
    background: linear-gradient(135deg, #2980b9, #2471a3) !important;
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(52, 152, 219, 0.4) !important;
}

/* 状态标签在暗色主题下的样式 */
body.dark-theme .status-draft {
    background: rgba(149, 165, 166, 0.3) !important;
    color: #e0e0e0 !important;
}

body.dark-theme .status-submitted {
    background: rgba(52, 152, 219, 0.3) !important;
    color: #e0e0e0 !important;
}

body.dark-theme .status-endorsed {
    background: rgba(46, 204, 113, 0.3) !important;
    color: #e0e0e0 !important;
}

body.dark-theme .status-cancelled {
    background: rgba(231, 76, 60, 0.3) !important;
    color: #e0e0e0 !important;
}

body.dark-theme .status-confirm {
    background: rgba(155, 89, 182, 0.3) !important;
    color: #e0e0e0 !important;
}

body.dark-theme .status-double-check {
    background: rgba(243, 156, 18, 0.3) !important;
    color: #e0e0e0 !important;
}

/* 工具按钮图标 */
body.dark-theme .tool-btn i {
    color: #ffffff !important;
}

body.dark-theme .tool-btn.active i {
    color: white !important;
}

/* Labour Wage 页面样式 - 调整为与其他页面相同的深色 */
body.dark-theme .labour-wage-page {
    background-color: #2a2a2a !important;
    color: #e8e8e8 !important;
}

body.dark-theme .content-section {
    background-color: #2a2a2a !important;
    color: #e8e8e8 !important;
}

body.dark-theme .labour-wage-page h2,
body.dark-theme .table-title {
    color: #ffffff !important;
}

/* 主内容区域背景 */
body.dark-theme .main-content {
    background-color: #1e1e1e !important;
}

/* 头部样式 */
body.dark-theme .header {
    border-bottom-color: #444 !important;
}

body.dark-theme .header h1 {
    color: #ffffff !important;
}

body.dark-theme .date-display {
    background-color: #3a3a3a !important;
    color: #e0e0e0 !important;
}

/* 搜索框和按钮样式 */
body.dark-theme #search-form input {
    background-color: #3a3a3a !important;
    color: #ffffff !important;
    border-color: #555 !important;
}

body.dark-theme #search-form input::placeholder {
    color: #aaaaaa !important;
}

body.dark-theme #search-form input:focus {
    border-color: #3498db !important;
    box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.2) !important;
}

body.dark-theme #search-form button {
    background: linear-gradient(135deg, #3498db, #2980b9) !important;
    color: white !important;
    border-color: #3498db !important;
}

body.dark-theme #search-form button:hover {
    background: linear-gradient(135deg, #2980b9, #2471a3) !important;
}

/* 筛选器样式 */
body.dark-theme .filter-toggle {
    background-color: #3a3a3a !important;
    color: #ffffff !important;
    border-color: #555 !important;
}

body.dark-theme .filter-toggle:hover {
    background-color: #4a4a4a !important;
    border-color: #666 !important;
}

body.dark-theme .filter-options {
    background-color: #3a3a3a !important;
    border-color: #555 !important;
    color: #ffffff !important;
}

body.dark-theme .filter-option {
    color: #ffffff !important;
    background-color: #3a3a3a !important;
}

body.dark-theme .filter-option:hover {
    background-color: #4a4a4a !important;
}

body.dark-theme .filter-option.active {
    background-color: #3498db !important;
    color: white !important;
}

/* 表格样式 */
body.dark-theme .wage-table,
body.dark-theme .wage-table th,
body.dark-theme .wage-table td {
    background-color: #2a2a2a !important;
    color: #e8e8e8 !important;
    border-color: #555 !important;
}

body.dark-theme .wage-table th {
    background-color: #2a2a2a !important;
    color: #ffffff !important;
}

body.dark-theme .wage-table tr:hover td {
    background-color: #4a4a4a !important;
}

/* 统计卡片样式 */
body.dark-theme .stat-card {
    background: linear-gradient(135deg, #9b59b6, #8e44ad) !important;
}

/* 添加按钮样式 */
body.dark-theme #add-wage-btn {
    background: linear-gradient(135deg, #3498db, #2980b9) !important;
    color: white !important;
}

body.dark-theme #add-wage-btn:hover {
    background: linear-gradient(135deg, #2980b9, #2471a3) !important;
}

/* 模态框样式 */
body.dark-theme .modal-content {
    background-color: #2a2a2a !important;
    color: #ffffff !important;
}

body.dark-theme .modal-content label {
    color: #ffffff !important;
}

body.dark-theme .modal-content input,
body.dark-theme .modal-content select {
    background-color: #3a3a3a !important;
    color: #ffffff !important;
    border-color: #555 !important;
}

body.dark-theme .modal-content input:focus,
body.dark-theme .modal-content select:focus {
    border-color: #3498db !important;
    box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.2) !important;
}

/* 无结果消息 */
body.dark-theme .no-results {
    background-color: #3a3a3a !important;
    color: #aaaaaa !important;
}

/* 页脚样式 */
body.dark-theme footer {
    color: #aaaaaa !important;
    border-top-color: #555 !important;
}

/* 操作按钮样式 */
body.dark-theme .action-btn {
    box-shadow: 0 3px 8px rgba(0, 0, 0, 0.3) !important;
}

body.dark-theme .view-btn {
    background: linear-gradient(135deg, #3498db, #2980b9) !important;
}

body.dark-theme .view-btn:hover {
    background: linear-gradient(135deg, #2980b9, #2471a3) !important;
}

body.dark-theme .edit-btn {
    background: linear-gradient(135deg, #2ecc71, #27ae60) !important;
}

body.dark-theme .edit-btn:hover {
    background: linear-gradient(135deg, #27ae60, #219653) !important;
}

body.dark-theme .delete-btn {
    background: linear-gradient(135deg, #e74c3c, #c0392b) !important;
}

body.dark-theme .delete-btn:hover {
    background: linear-gradient(135deg, #c0392b, #e74c3c) !important;
}

/* 用户按钮样式 */
body.dark-theme .user-btn {
    background: #2563eb !important;
    color: #fff !important;
}

body.dark-theme .user-btn:hover {
    background: #1746a2 !important;
}

/* 导航按钮样式 */
body.dark-theme .nav-buttons button {
    background: #3498db !important;
    color: white !important;
}

body.dark-theme .nav-buttons button:hover {
    background: #2980b9 !important;
}

/* 表格头部样式 */
body.dark-theme .table-header {
    border-bottom-color: #555 !important;
}

/* Labour Wage Document 页面暗色主题样式 */
body.dark-theme .document-view-page {
    background-color: #2a2a2a !important;
    color: #e8e8e8 !important;
}

body.dark-theme .document-view-page h2 {
    color: #ffffff !important;
}

body.dark-theme .document-meta {
    background-color: #3a3a3a !important;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2) !important;
}

body.dark-theme .meta-label {
    color: #bbbbbb !important;
}

body.dark-theme .meta-value {
    background-color: #2a2a2a !important;
    color: #ffffff !important;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3) !important;
    border: 1px solid #555 !important;
}

body.dark-theme .pdf-viewer-container {
    background-color: #3a3a3a !important;
    border-color: #555 !important;
}

body.dark-theme .pdf-viewer-content {
    background-color: #2a2a2a !important;
    border-color: #555 !important;
}

body.dark-theme .pdf-control-btn {
    background: #3498db !important;
    color: white !important;
    border: none !important;
}

body.dark-theme .pdf-control-btn:hover {
    background: #2980b9 !important;
}

body.dark-theme .no-pdf-message {
    color: #aaaaaa !important;
}

body.dark-theme .no-pdf-message i {
    color: #666 !important;
}

/* Edit Labour 页面暗色主题样式 */
body.dark-theme .edit-labour-page {
    background-color: #2a2a2a !important;
    color: #e8e8e8 !important;
}

body.dark-theme .edit-labour-page h2,
body.dark-theme .edit-labour-page h3 {
    color: #ffffff !important;
}

body.dark-theme .edit-form {
    background-color: #3a3a3a !important;
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2) !important;
}

body.dark-theme .form-group label {
    color: #e0e0e0 !important;
}

body.dark-theme .form-group input,
body.dark-theme .form-group select {
    background-color: #2a2a2a !important;
    color: #ffffff !important;
    border-color: #555 !important;
}

body.dark-theme .form-group input:focus,
body.dark-theme .form-group select:focus {
    border-color: #3498db !important;
    box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.2) !important;
}

body.dark-theme .pdf-toolbar {
    background-color: #3a3a3a !important;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2) !important;
}

body.dark-theme .pdf-toolbar h3 {
    color: #ffffff !important;
}

body.dark-theme .tool-btn {
    background-color: #2a2a2a !important;
    color: #e0e0e0 !important;
    border-color: #555 !important;
}

body.dark-theme .tool-btn.active,
body.dark-theme .tool-btn:hover {
    background-color: #3498db !important;
    color: white !important;
    border-color: #3498db !important;
}

body.dark-theme .property-controls label {
    color: #e0e0e0 !important;
}

body.dark-theme .property-group span {
    color: #ffffff !important;
}

body.dark-theme input[type="color"],
body.dark-theme input[type="range"] {
    background-color: #2a2a2a !important;
    border-color: #555 !important;
}

body.dark-theme input[type="color"]:focus,
body.dark-theme input[type="range"]:focus {
    border-color: #3498db !important;
    box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.2) !important;
}

body.dark-theme .pdf-controls {
    background-color: #3a3a3a !important;
    border-color: #555 !important;
}

body.dark-theme .nav-btn,
body.dark-theme .zoom-btn {
    background-color: #2a2a2a !important;
    color: #ffffff !important;
    border-color: #555 !important;
}

body.dark-theme .nav-btn:hover,
body.dark-theme .zoom-btn:hover {
    background-color: #3498db !important;
    border-color: #3498db !important;
}

body.dark-theme .page-info {
    color: #ffffff !important;
}

body.dark-theme .zoom-level {
    color: #ffffff !important;
}

body.dark-theme .pdf-canvas-container {
    background-color: #1e1e1e !important;
    border-color: #555 !important;
}

body.dark-theme .page-thumbnails {
    background-color: transparent !important;
}

body.dark-theme .page-thumb {
    border-color: #555 !important;
}

body.dark-theme .page-thumb:hover {
    border-color: #3498db !important;
}

body.dark-theme .page-thumb.active {
    border-color: #3498db !important;
    box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.3) !important;
}

/* 标签页样式 */
body.dark-theme .tab-headers {
    border-bottom-color: #555 !important;
}

body.dark-theme .tab-header {
    color: #aaaaaa !important;
    background-color: #3a3a3a !important;
}

body.dark-theme .tab-header.active {
    color: #3498db !important;
    border-bottom-color: #3498db !important;
    background-color: #2a2a2a !important;
}

/* 表单中的小提示文字 */
body.dark-theme .form-group small {
    color: #999 !important;
}

/* 工具按钮图标 */
body.dark-theme .tool-btn i {
    color: #ffffff !important;
}

body.dark-theme .tool-btn.active i {
    color: white !important;
}

/* 响应式设计 */
@media (max-width: 768px) {
    body.dark-theme .labour-wage-page {
        background-color: #2a2a2a !important;
    }
    
    body.dark-theme .content-section {
        background-color: #2a2a2a !important;
    }
}

/* 响应式设计保持原有样式 */
@media (max-width: 768px) {
    body.dark-theme .document-header {
        border-bottom-color: #555 !important;
    }
    
    body.dark-theme .document-meta {
        background-color: #3a3a3a !important;
    }
    
    body.dark-theme .pdf-controls {
        background-color: #3a3a3a !important;
    }
}
                /* 添加其他暗色主题样式... */
            `;
            document.head.appendChild(style);
        }
    },

    removeDarkThemeStyles: function() {
        const darkStyles = document.getElementById('dark-theme-styles');
        if (darkStyles) {
            darkStyles.remove();
        }
    }
};

// 页面加载时自动初始化主题配置
document.addEventListener('DOMContentLoaded', function() {
    ThemeConfig.init();
});

