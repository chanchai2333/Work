// scripts/language.js - 多语言支持
const LanguageConfig = {
    // 翻译文本
    translations: {
        en: {
            // 导航和标题
            'system.settings': 'System Settings',
            'system.configuration': 'System Configuration',
            'configure.preferences': 'Configure system preferences, appearance, and integration settings. Changes will be applied system-wide.',
            'pending.close': 'Pending Close',
            
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
            'naming.original': 'Keep original filename',
            'naming.timestamp': 'Timestamp prefix (YYYYMMDD_HHMMSS_)',
            'naming.site': 'Site code prefix',
            'automatic.downloads': 'Automatic Downloads',
            'auto.download.reports': 'Auto-download generated reports',
            'auto.download.backups': 'Auto-download system backups',
            'save.path.settings': 'Save Path Settings',
            'open.download.folder': 'Open Download Folder',

            // Folder Structure options
            'folder.structure.flat': 'Flat Structure (all files in one folder)',
            'folder.structure.by.date': 'Organize by Date (YYYY/MM/DD)',
            'folder.structure.by.type': 'Organize by Document Type',
            'folder.structure.by.site': 'Organize by Site',
            
            // 搜索
            'search.placeholder': 'Search settings...',
            'search': 'Search',
            
            // 页脚
            'copyright': '© 2025 AEL DWSS System. All rights reserved.',
            'platform': 'AEL DWSS Platform',

            // 导航菜单
            'dashboard': 'Dashboard',
            'site.diary': 'Site Diary',
            'safety.inspection': 'Safety Inspection',
            'site.locations': 'Site Locations',
            'labour.wage': 'Labour Wage',
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
            'pdf.preview.will.appear': 'The PDF preview will appear here when available',

            // Dashboard 页面特定文本
            'process': 'Process',
            'closed': 'Closed',
            'last.submitted': 'Last Submitted',
            'last.passed': 'Last Passed',
            'percent.pending.close': '% Pending Close',
            'updated.min.ago': 'Updated {minutes} min ago',
            'user.name': 'John Doe',

            // Site Diary 页面特定文本
            'site.diary.management': 'Site Diary Management',
            'add.new.diary': 'Add New Diary',
            'diary.id': 'Diary ID',
            'diary.entries': 'Site Diary Entries',
            'total.documents': 'Total Documents',
            'this.month': 'This Month',
            'all.sites': 'All Sites',
            'all.statuses': 'All Statuses',
            'all.document.types': 'All Document Types',
            'site.diary.document': 'Site Diary Document',
            'back.to.diary': 'Back to Diary',
            'date': 'Date',
            'no.matching.documents': 'No matching documents found. Please try different filters.',

            // 站点类型
            'site.treatment': 'Treatment Plant',
            'site.pipeline': 'Pipeline',
            'site.reservoir': 'Reservoir',
            'site.distribution': 'Distribution',
            'site.pump': 'Pump Station',

            // 状态类型
            'status.draft': 'Draft',
            'status.submitted.wsg': 'Submitted to WSG',
            'status.submitted.ig': 'Submitted to IG',
            'status.closed': 'Closed',
            'status.reopen': 'Reopen',
            'status.cancelled': 'Cancelled',

            // 文档类型
            'document.type.contractor': 'Contractor Documents',
            'document.type.subcontractor': 'Sub Contractor Documents',

            'safety.inspection.management': 'Safety Inspection Management',
            'add.new.inspection': 'Add New Inspection',
            'inspection.id': 'Inspection ID',
            'inspector': 'Inspector',
            'inspection.entries': 'Safety Inspection Entries',
            'total.inspections': 'Total Inspections',
            'back.to.inspection': 'Back to Inspection',
            'safety.inspection.document': 'Safety Inspection Document',
            'edit.safety.pdf': 'Edit Safety Inspection PDF',
            'search.inspections': 'Search inspections, reports, or data...',
            'site.locations.management': 'Site Locations Management',
            'search.sites': 'Search sites, reports, or data...',
            'site.list': 'Site List',
            'search.sites.placeholder': 'Search sites...',
            'last.updated': 'Last updated',
            'interactive.map': 'Interactive Map Would Appear Here',
            'system.title': 'DWSS Management System',
            'all.rights.reserved': 'All rights reserved.',
            'period.start': 'Period Start',
            'period.end': 'Period End',
            'page': 'Page',
            'of': 'of'
        },
        zh: {
            // 导航和标题
            'system.settings': '系统设置',
            'pending.close': '待关闭',
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
            'naming.original': '保留原始文件名',
            'naming.timestamp': '时间戳前缀 (YYYYMMDD_HHMMSS_)',
            'naming.site': '站点代码前缀',
            'automatic.downloads': '自动下载',
            'auto.download.reports': '自动下载生成报告',
            'auto.download.backups': '自动下载系统备份',
            'save.path.settings': '保存路径设置',
            'open.download.folder': '打开下载文件夹',

            // Folder Structure options - 中文
            'folder.structure.flat': '扁平结构（所有文件在一个文件夹中）',
            'folder.structure.by.date': '按日期组织（年/月/日）',
            'folder.structure.by.type': '按文档类型组织',
            'folder.structure.by.site': '按站点组织',
            
            // 搜索
            'search.placeholder': '搜索设置...',
            'search': '搜索',
            
            // 页脚
            'copyright': '© 2025 AEL DWSS 系统。保留所有权利。',
            'platform': 'AEL DWSS 平台',

            // 导航菜单
            'dashboard': '仪表板',
            'site.diary': '现场日记',
            'safety.inspection': '安全检查',
            'site.locations': '站点位置',
            'labour.wage': '劳动工资',
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
            'pdf.preview.will.appear': 'PDF预览将在可用时显示在此处',

            // Dashboard 页面特定文本
            'process': '流程',
            'closed': '已关闭',
            'last.submitted': '最后提交',
            'last.passed': '最后通过',
            'percent.pending.close': '% 待关闭',
            'updated.min.ago': '更新于 {minutes} 分钟前',
            'user.name': '张三',

            // Site Diary 页面特定文本
            'site.diary.management': '现场日记管理',
            'add.new.diary': '添加新日记',
            'diary.id': '日记ID',
            'diary.entries': '现场日记条目',
            'total.documents': '总文档数',
            'this.month': '本月',
            'all.sites': '所有站点',
            'all.statuses': '所有状态',
            'site.diary.document': '现场日记文档',
            'back.to.diary': '返回日记',
            'date': '日期',
            'all.document.types': '所有文档类型',
            'no.matching.documents': '未找到匹配的文档。请尝试不同的筛选条件。',

            // 站点类型
            'site.treatment': '处理厂',
            'site.pipeline': '管道',
            'site.reservoir': '水库',
            'site.distribution': '分配系统',
            'site.pump': '泵站',

            // 状态类型
            'status.draft': '草稿',
            'status.submitted.wsg': '已提交至WSG',
            'status.submitted.ig': '已提交至IG',
            'status.closed': '已关闭',
            'status.reopen': '重新打开',
            'status.cancelled': '已取消',

            // 文档类型
            'document.type.contractor': '承包商文档',
            'document.type.subcontractor': '分包商文档',

            'safety.inspection.management': '安全检查管理',
            'add.new.inspection': '添加新检查',
            'inspection.id': '检查ID',
            'inspector': '检查员',
            'inspection.entries': '安全检查条目',
            'total.inspections': '总检查数',
            'back.to.inspection': '返回检查',
            'safety.inspection.document': '安全检查文档',
            'edit.safety.pdf': '编辑安全检查PDF',
            'search.inspections': '搜索检查、报告或数据...',
            'site.locations.management': '站点位置管理',
            'search.sites': '搜索站点、报告或数据...',
            'site.list': '站点列表',
            'search.sites.placeholder': '搜索站点...',
            'last.updated': '最后更新',
            'interactive.map': '交互式地图将在此显示',
            'system.title': 'DWSS 管理系统',
            'all.rights.reserved': '保留所有权利。',
            'period.start': '期间开始',
            'period.end': '期间结束',
            'page': '页',
            'of': '的'
        }
    },

    // 当前语言
    currentLanguage: 'en',

    // 初始化
    init: function() {
        console.log('LanguageConfig initializing...');
        
        // 从 localStorage 加载语言设置
        const savedLang = localStorage.getItem('ael_dwss_language');
        this.currentLanguage = savedLang || 'en';
        
        console.log('Current language loaded:', this.currentLanguage);
        
        // 应用当前语言
        this.applyLanguage();
        
        return this.currentLanguage;
    },

    // 设置语言
    setLanguage: function(lang) {
        console.log('Attempting to set language to:', lang);
        
        if (this.translations[lang]) {
            this.currentLanguage = lang;
            localStorage.setItem('ael_dwss_language', lang);
            
            console.log('Language set successfully:', lang);
            
            // 应用新语言
            this.applyLanguage();
            
            // 触发自定义事件，通知其他组件语言已更改
            const event = new CustomEvent('languageChanged', { 
                detail: { language: lang } 
            });
            document.dispatchEvent(event);
            
            return true;
        }
        
        console.error('Language not found:', lang);
        return false;
    },

    // 应用语言到页面
    applyLanguage: function() {
        console.log('Applying language:', this.currentLanguage);
        
        const texts = this.translations[this.currentLanguage];
        if (!texts) {
            console.error('No translations found for language:', this.currentLanguage);
            return;
        }

        // 记录翻译数量
        console.log('Available translations:', Object.keys(texts).length);

        // 1. 更新所有带有 data-i18n 属性的元素
        const elements = document.querySelectorAll('[data-i18n]');
        console.log('Found elements with data-i18n:', elements.length);
        
        elements.forEach(element => {
            const key = element.getAttribute('data-i18n');
            if (texts[key]) {
                let text = texts[key];
                // 处理动态文本（如更新时间）
                if (key === 'updated.min.ago') {
                    const minutes = element.textContent.match(/\d+/)?.[0] || '2';
                    text = text.replace('{minutes}', minutes);
                }
                element.textContent = text;
            } else {
                console.warn('Missing translation for key:', key, 'in', this.currentLanguage);
            }
        });

        // 2. 更新所有带有 data-i18n-placeholder 属性的元素
        document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
            const key = element.getAttribute('data-i18n-placeholder');
            if (texts[key]) {
                element.placeholder = texts[key];
            }
        });

        // 3. 更新所有带有 data-i18n-title 属性的元素
        document.querySelectorAll('[data-i18n-title]').forEach(element => {
            const key = element.getAttribute('data-i18n-title');
            if (texts[key]) {
                element.title = texts[key];
            }
        });

        // 4. 更新所有带有 data-i18n-value 属性的元素
        document.querySelectorAll('[data-i18n-value]').forEach(element => {
            const key = element.getAttribute('data-i18n-value');
            if (texts[key]) {
                element.value = texts[key];
            }
        });

        // 5. 更新所有带有 data-i18n-html 属性的元素
        document.querySelectorAll('[data-i18n-html]').forEach(element => {
            const key = element.getAttribute('data-i18n-html');
            if (texts[key]) {
                element.innerHTML = texts[key];
            }
        });

        // 更新页面方向（RTL/LTR）
        document.documentElement.dir = this.currentLanguage === 'ar' ? 'rtl' : 'ltr';
        document.documentElement.lang = this.currentLanguage;
        
        console.log('Language applied successfully');
    },

    // 获取翻译文本
    getText: function(key) {
        const texts = this.translations[this.currentLanguage];
        return texts[key] || key;
    },

    // 获取当前语言
    getCurrentLanguage: function() {
        return this.currentLanguage;
    },

    // 获取可用语言列表
    getAvailableLanguages: function() {
        return Object.keys(this.translations);
    },
    
    // 动态更新翻译
    updateTranslations: function(newTranslations, lang) {
        if (this.translations[lang] && newTranslations) {
            this.translations[lang] = { ...this.translations[lang], ...newTranslations };
            if (this.currentLanguage === lang) {
                this.applyLanguage();
            }
            return true;
        }
        return false;
    }
};

// 页面加载时自动初始化语言配置
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing LanguageConfig...');
    LanguageConfig.init();
});

// 全局函数，方便在其他脚本中调用
window.changeLanguage = function(lang) {
    return LanguageConfig.setLanguage(lang);
};

window.getCurrentLanguage = function() {
    return LanguageConfig.getCurrentLanguage();
};

window.getText = function(key) {
    return LanguageConfig.getText(key);
};

// 监听主题变化，重新应用语言（如果主题改变了语言）
document.addEventListener('themeChanged', function(e) {
    if (e.detail && e.detail.language) {
        LanguageConfig.setLanguage(e.detail.language);
    }
});

// 监听语言选择器的变化
document.addEventListener('languageSelectorChange', function(e) {
    if (e.detail && e.detail.language) {
        LanguageConfig.setLanguage(e.detail.language);
    }
});

// 添加调试函数
window.debugLanguage = function() {
    console.log('=== Language Debug Info ===');
    console.log('Current language:', LanguageConfig.getCurrentLanguage());
    console.log('Available languages:', LanguageConfig.getAvailableLanguages());
    console.log('Translations count:', Object.keys(LanguageConfig.translations[LanguageConfig.currentLanguage] || {}).length);
    
    // 检查特定键
    const testKeys = ['system.settings', 'display.settings', 'initial.pdf.upload', 'email.settings'];
    testKeys.forEach(key => {
        console.log(`${key}:`, LanguageConfig.getText(key));
    });
    
    // 检查元素数量
    console.log('data-i18n elements:', document.querySelectorAll('[data-i18n]').length);
    console.log('data-i18n-placeholder elements:', document.querySelectorAll('[data-i18n-placeholder]').length);
};