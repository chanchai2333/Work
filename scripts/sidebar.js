// sidebar.js - 修复和简化版本
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
    
    // 侧边栏HTML
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
                            <a href="usermanagement.html">
                                <i class="fas fa-user"></i>
                                <span class="menu-text">Users</span>
                            </a>    
                        </li>
                        <li>
                            <a href="teams.html">
                                <i class="fas fa-user-friends"></i>
                                <span class="menu-text">Teams</span>
                            </a>
                        </li>
                        <li>
                            <a href="presets.html">
                                <i class="fas fa-sliders-h"></i>
                                <span class="menu-text">Presets</span>
                            </a>
                        </li>
                        <li>
                            <a href="subscriptions.html">
                                <i class="fas fa-credit-card"></i>
                                <span class="menu-text">Subscriptions</span>
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
    
    // 检查保存的侧边栏状态
    const savedState = localStorage.getItem('sidebarState');
    const isCollapsed = savedState === 'collapsed';
    
    // 应用保存的状态
    if (isCollapsed && sidebar) {
        sidebar.classList.add('collapsed');
        updateMainContentLayout();
    }
    
    // 设置切换按钮事件
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
    
    // 子菜单切换功能
    document.querySelectorAll('.submenu-toggle').forEach(toggle => {
        toggle.addEventListener('click', function(e) {
            e.preventDefault();
            const parentLi = this.parentElement;
            parentLi.classList.toggle('active');
        });
    });
    
    // 高亮当前页面菜单项
    highlightCurrentPage();
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
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    
    // 移除所有菜单项的 active 类
    document.querySelectorAll('.menu a').forEach(link => {
        link.classList.remove('active');
        link.parentElement.classList.remove('active');
    });
    
    // 移除子菜单项中的 active 类
    document.querySelectorAll('.submenu a').forEach(link => {
        link.classList.remove('active');
    });
    
    // 根据当前页面高亮对应菜单项
    let menuItemId = '';
    let isSubmenu = false;
    
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
        case 'teams.html':
        case 'presets.html':
        case 'subscriptions.html':
            menuItemId = 'menu-usermanagement';
            isSubmenu = true;
            break;
    }
    
    if (menuItemId) {
        const activeLink = document.getElementById(menuItemId);
        if (activeLink) {
            if (isSubmenu) {
                activeLink.parentElement.classList.add('active');
                // 高亮子菜单中的当前页面
                const currentSubmenuLink = activeLink.parentElement.querySelector(`a[href="${currentPage}"]`);
                if (currentSubmenuLink) {
                    currentSubmenuLink.classList.add('active');
                }
            } else {
                activeLink.classList.add('active');
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
