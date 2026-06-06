// sidebar.js - 修复子菜单展开/收起问题
function loadSidebar() {
    // 先检查是否已经有侧边栏
    const existingSidebar = document.querySelector('.sidebar');
    if (existingSidebar) {
        console.log('Sidebar already exists, initializing...');
        initializeSidebar();
        return;
    }
    
    console.log('Loading sidebar...');
    
    // 创建 app-container
    let appContainer = document.querySelector('.app-container');
    if (!appContainer) {
        appContainer = document.createElement('div');
        appContainer.className = 'app-container';
        
        // 将 app-container 添加到 body 的开头
        document.body.insertBefore(appContainer, document.body.firstChild);
        
        // 将 body 的所有子元素（除了新创建的 app-container）移到 app-container 中
        const bodyChildren = Array.from(document.body.children);
        bodyChildren.forEach(child => {
            if (child !== appContainer) {
                appContainer.appendChild(child);
            }
        });
    }
    
    // 侧边栏HTML - 只保留 Users 和 Teams
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
                <li class="menu-item-with-submenu">
                    <a href="#" class="submenu-toggle" id="menu-usermanagement">
                        <i class="fas fa-users"></i>
                        <span class="menu-text" data-i18n="user.management">User Management</span>
                        <i class="fas fa-chevron-down submenu-arrow"></i>
                    </a>
                    <ul class="submenu">
                        <li>
                            <a href="usermanagement.html" id="submenu-users">
                                <i class="fas fa-user"></i>
                                <span class="menu-text">Users</span>
                            </a>    
                        </li>
                        <li>
                            <a href="teams.html" id="submenu-teams">
                                <i class="fas fa-user-friends"></i>
                                <span class="menu-text">Teams</span>
                            </a>
                        </li>
                    </ul>
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
    console.log('Initializing sidebar functionality...');
    
    const toggleBtn = document.querySelector('.toggle-btn');
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');
    
    // 检查保存的侧边栏状态（主侧边栏折叠/展开）
    const savedState = localStorage.getItem('sidebarState');
    const isCollapsed = savedState === 'collapsed';
    
    // 应用保存的状态
    if (isCollapsed && sidebar) {
        sidebar.classList.add('collapsed');
        updateMainContentLayout();
    }
    
    // 设置主侧边栏切换按钮事件
    if (toggleBtn && sidebar) {
        // 移除现有的事件监听器
        const newToggleBtn = toggleBtn.cloneNode(true);
        toggleBtn.parentNode.replaceChild(newToggleBtn, toggleBtn);
        
        newToggleBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            console.log('Toggle button clicked');
            
            sidebar.classList.toggle('collapsed');
            
            // 保存状态到 localStorage
            if (sidebar.classList.contains('collapsed')) {
                localStorage.setItem('sidebarState', 'collapsed');
            } else {
                localStorage.setItem('sidebarState', 'expanded');
            }
            
            updateMainContentLayout();
            updateToggleButtonIcon();
        });
        
        // 更新按钮图标
        updateToggleButtonIcon();
    }
    
    // 子菜单切换功能 - 只切换 active 类，不手动设置样式，完全依赖 CSS
    const submenuToggle = document.querySelector('.submenu-toggle');
    if (submenuToggle) {
        // 移除可能存在的旧事件，使用新的事件
        const newToggle = submenuToggle.cloneNode(true);
        submenuToggle.parentNode.replaceChild(newToggle, submenuToggle);
        
        newToggle.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            const parentLi = this.parentElement;
            if (parentLi) {
                parentLi.classList.toggle('active');
                // 可选：保存子菜单展开状态到 localStorage（如果需要持久化）
                // 这里不保存，保持简单
            }
        });
    }
    
    // 高亮当前页面菜单项（会同时处理父菜单展开）
    highlightCurrentPage();
    
    // 确保当点击子菜单链接时，父菜单保持展开（高亮当前页面时会处理，但以防万一）
    document.querySelectorAll('.submenu a').forEach(link => {
        link.addEventListener('click', function(e) {
            // 允许正常跳转
            const parentItem = this.closest('.menu-item-with-submenu');
            if (parentItem && !parentItem.classList.contains('active')) {
                // 如果父菜单未展开，则展开（但跳转后页面会重新加载，高亮函数会处理）
                // 这里不主动展开，因为跳转后新页面会调用 highlightCurrentPage
            }
        });
    });
}

function updateMainContentLayout() {
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');
    
    if (!sidebar || !mainContent) {
        console.warn('Sidebar or main content not found');
        return;
    }
    
    if (sidebar.classList.contains('collapsed')) {
        mainContent.style.marginLeft = '70px';
        mainContent.style.width = 'calc(100% - 70px)';
    } else {
        mainContent.style.marginLeft = '260px';
        mainContent.style.width = 'calc(100% - 260px)';
    }
    
    console.log('Main content layout updated:', {
        collapsed: sidebar.classList.contains('collapsed'),
        marginLeft: mainContent.style.marginLeft,
        width: mainContent.style.width
    });
}

function updateToggleButtonIcon() {
    const toggleBtn = document.querySelector('.toggle-btn');
    const sidebar = document.querySelector('.sidebar');
    
    if (!toggleBtn || !sidebar) return;
    
    if (sidebar.classList.contains('collapsed')) {
        toggleBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
    } else {
        toggleBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
    }
}

function highlightCurrentPage() {
    // 获取当前页面文件名
    let currentPage = window.location.pathname.split('/').pop();
    if (!currentPage || currentPage === '') currentPage = 'index.html';
    
    // 移除所有菜单项的 active 类
    document.querySelectorAll('.menu a').forEach(link => {
        link.classList.remove('active');
    });
    document.querySelectorAll('.submenu a').forEach(link => {
        link.classList.remove('active');
    });
    // 移除所有父菜单的 active 类（因为需要根据当前页面重新设置）
    document.querySelectorAll('.menu-item-with-submenu').forEach(item => {
        item.classList.remove('active');
    });
    
    // 根据当前页面高亮对应菜单项
    let mainMenuItemId = '';
    let isSubmenu = false;
    let submenuParentId = '';
    
    switch(currentPage) {
        case 'index.html':
            mainMenuItemId = 'menu-dashboard';
            break;
        case 'sitediary.html':
            mainMenuItemId = 'menu-sitediary';
            break;
        case 'safetyinspect.html':
            mainMenuItemId = 'menu-safetyinspect';
            break;
        case 'sitelocations.html':
            mainMenuItemId = 'menu-sitelocations';
            break;
        case 'labourwage.html':
            mainMenuItemId = 'menu-labourwage';
            break;
        case 'settings.html':
            mainMenuItemId = 'menu-settings';
            break;
        case 'usermanagement.html':
            mainMenuItemId = 'submenu-users';
            isSubmenu = true;
            submenuParentId = 'menu-usermanagement';
            break;
        case 'teams.html':
            mainMenuItemId = 'submenu-teams';
            isSubmenu = true;
            submenuParentId = 'menu-usermanagement';
            break;
        // 其他页面可继续添加
    }
    
    if (mainMenuItemId) {
        const activeLink = document.getElementById(mainMenuItemId);
        if (activeLink) {
            activeLink.classList.add('active');
            if (isSubmenu && submenuParentId) {
                const parentMenu = document.getElementById(submenuParentId);
                if (parentMenu) {
                    const parentLi = parentMenu.closest('.menu-item-with-submenu');
                    if (parentLi) {
                        // 添加 active 类以展开子菜单（CSS 会负责显示）
                        parentLi.classList.add('active');
                    }
                }
            }
        }
    }
}

// 主入口点
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, loading sidebar...');
    loadSidebar();
});

// 响应式处理
window.addEventListener('resize', function() {
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');
    
    if (sidebar && mainContent) {
        if (window.innerWidth <= 900 && !sidebar.classList.contains('collapsed')) {
            // 在小屏幕上，强制折叠侧边栏
            sidebar.classList.add('collapsed');
            localStorage.setItem('sidebarState', 'collapsed');
            updateMainContentLayout();
            updateToggleButtonIcon();
        }
    }
});