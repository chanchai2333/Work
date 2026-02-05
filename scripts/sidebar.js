// 在 loadSidebar() 函数中修改，将侧边栏插入到 app-container 中
function loadSidebar() {
    // 先检查是否已经有 app-container
    let appContainer = document.querySelector('.app-container');
    
    if (!appContainer) {
        // 创建 app-container
        appContainer = document.createElement('div');
        appContainer.className = 'app-container';
        
        // 获取主内容区域
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
            // 将主内容移动到 app-container 中
            document.body.appendChild(appContainer);
            appContainer.appendChild(mainContent);
        } else {
            // 如果没有主内容，直接添加到 body
            document.body.appendChild(appContainer);
        }
    }
    // 直接插入HTML，不通过fetch
    const sidebarHTML = `
        <div class="sidebar">
            <div class="logo">
                <div class="logo-icon">
                    <i class="fas fa-water"></i>
                </div>
                <h2>AEL DWSS</h2>
            </div>
            
            <button class="toggle-btn">
                <i class="fas fa-chevron-left"></i>
            </button>
            
            <ul class="menu">
                <li>
                    <a href="index.html" id="menu-dashboard">
                        <i class="fas fa-home"></i>
                        <span class="menu-text" data-i18n="dashboard">Dashboard</span>
                    </a>
                </li>
                <li>
                    <a href="sitediary.html" id="menu-sitediary">
                        <i class="fas fa-book"></i>
                        <span class="menu-text" data-i18n="site.diary">Site Diary</span>
                    </a>
                </li>
                <li>
                    <a href="safetyinspect.html" id="menu-safetyinspect">
                        <i class="fas fa-clipboard-check"></i>
                        <span class="menu-text" data-i18n="safety.inspection">Safety Inspection</span>
                    </a>
                </li>
                <li>
                    <a href="sitelocations.html" id="menu-sitelocations">
                        <i class="fas fa-map-marked-alt"></i>
                        <span class="menu-text" data-i18n="site.locations">Site Locations</span>
                    </a>
                </li>
                <li>
                    <a href="labourwage.html" id="menu-labourwage">
                        <i class="fas fa-money-bill-wave"></i>
                        <span class="menu-text" data-i18n="labour.wage">Labour Wage</span>
                    </a>
                </li>
                <li>
                    <a href="settings.html" id="menu-settings">
                        <i class="fas fa-cogs"></i>
                        <span class="menu-text" data-i18n="system.settings">System Settings</span>
                    </a>
                </li>
                <li>
                    <a href="usermanagement.html" id="menu-usermanagement">
                        <i class="fas fa-user-circle"></i>
                        <span class="menu-text" data-i18n="user.management">User Management</span>
                    </a>
                </li>
            </ul>
        </div>
    `;
    
     // 将侧边栏插入到 app-container 的开头
    appContainer.insertAdjacentHTML('afterbegin', sidebarHTML);
    
    // 初始化侧边栏
    initializeSidebar();
}

function initializeSidebar() {
    // 添加侧边栏切换功能
    const toggleBtn = document.querySelector('.toggle-btn');
    const sidebar = document.querySelector('.sidebar');
    
    if (toggleBtn && sidebar) {
        toggleBtn.addEventListener('click', function() {
            sidebar.classList.toggle('collapsed');
        });
    }
    
    // 高亮当前页面菜单项
    highlightCurrentPage();
}

function highlightCurrentPage() {
    // 获取当前页面文件名
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    
    // 移除所有菜单项的 active 类
    document.querySelectorAll('.menu a').forEach(link => {
        link.classList.remove('active');
    });
    
    // 根据当前页面高亮对应菜单项
    let menuItemId = '';
    switch(currentPage) {
        case 'index.html':
            menuItemId = 'menu-dashboard';
            break;
        case 'sitediary.html':
            menuItemId = 'menu-sitediary';
            break;
        case 'safetyinspect.html':
            menuItemId = 'menu-safetyinspect';
            break;
        case 'sitelocations.html':
            menuItemId = 'menu-sitelocations';
            break;
        case 'labourwage.html':
            menuItemId = 'menu-labourwage';
            break;
        case 'settings.html':
            menuItemId = 'menu-settings';
            break;
        case 'usermanagement.html':
            menuItemId = 'menu-usermanagement';
            break;
    }
    
    if (menuItemId) {
        const activeLink = document.getElementById(menuItemId);
        if (activeLink) {
            activeLink.classList.add('active');
        }
    }
}

// 页面加载完成后加载侧边栏
document.addEventListener('DOMContentLoaded', loadSidebar);