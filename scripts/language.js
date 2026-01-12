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
            'automatic.downloads': 'Automatic Downloads',
            'save.path.settings': 'Save Path Settings',
            'open.download.folder': 'Open Download Folder',
            
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
            'this.month': 'This Month',
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
            'platform': 'AEL DWSS Platform',
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
            'automatic.downloads': '自动下载',
            'save.path.settings': '保存路径设置',
            'open.download.folder': '打开下载文件夹',
            
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

            
            'site.diary.document': 'Site Diary Document',

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
            'this.month': '本月',
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
        }
    },

    // 当前语言
    currentLanguage: 'en',

    // 初始化
    init: function() {
        // 从 localStorage 加载语言设置
        this.currentLanguage = localStorage.getItem('ael_dwss_language') || 'en';
        
        // 应用当前语言
        this.applyLanguage();
        
        return this.currentLanguage;
    },

    // 设置语言
    setLanguage: function(lang) {
        if (this.translations[lang]) {
            this.currentLanguage = lang;
            localStorage.setItem('ael_dwss_language', lang);
            this.applyLanguage();
            return true;
        }
        return false;
    },

    // 应用语言到页面
    applyLanguage: function() {
        const texts = this.translations[this.currentLanguage];
        if (!texts) return;

        // 更新所有带有 data-i18n 属性的元素
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            if (texts[key]) {
                let text = texts[key];
                // 处理动态文本（如更新时间）
                if (key === 'updated.min.ago') {
                    const minutes = element.textContent.match(/\d+/)?.[0] || '2';
                    text = text.replace('{minutes}', minutes);
                }
                element.textContent = text;
            }
        });

        // 更新所有带有 data-i18n-placeholder 属性的元素
        document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
            const key = element.getAttribute('data-i18n-placeholder');
            if (texts[key]) {
                element.placeholder = texts[key];
            }
        });

        // 更新所有带有 data-i18n-title 属性的元素
        document.querySelectorAll('[data-i18n-title]').forEach(element => {
            const key = element.getAttribute('data-i18n-title');
            if (texts[key]) {
                element.title = texts[key];
            }
        });

        // 更新所有带有 data-i18n-value 属性的元素
        document.querySelectorAll('[data-i18n-value]').forEach(element => {
            const key = element.getAttribute('data-i18n-value');
            if (texts[key]) {
                element.value = texts[key];
            }
        });

        // 更新页面方向（RTL/LTR）
        document.documentElement.dir = this.currentLanguage === 'ar' ? 'rtl' : 'ltr';
        document.documentElement.lang = this.currentLanguage;
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
    }
};

// 页面加载时自动初始化语言配置
document.addEventListener('DOMContentLoaded', function() {
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