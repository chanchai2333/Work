/// sidebar.js - 終極修復版 (將折疊按鈕獨立為全局懸浮按鈕)
function loadSidebar() {
    // 1. 注入 CSS
    if (!document.getElementById('sidebar-layout-patch')) {
        const patchStyle = document.createElement('style');
        patchStyle.id = 'sidebar-layout-patch';
        patchStyle.textContent = `
            /* 側邊欄基礎佈局 */
            .sidebar {
                position: fixed !important;
                left: 0; top: 0;
                height: 100vh !important;
                width: 240px;
                transition: width 0.3s ease !important;
                z-index: 9990 !important;
                box-shadow: 2px 0 5px rgba(0,0,0,0.1);
                display: flex !important;
                flex-direction: column !important;
                background-color: #2c3e50; 
            }
            .sidebar.collapsed { width: 64px !important; }

            /* Logo 區域 */
            .sidebar .logo {
                padding: 15px !important;
                height: 65px !important;
                display: flex !important;
                align-items: center !important;
                flex-shrink: 0 !important; 
                overflow: hidden !important;
                box-sizing: border-box !important;
            }
            .sidebar .logo-img {
                height: 35px !important; width: auto !important;
                max-width: 100% !important; margin-right: 8px !important;
            }
            .sidebar .logo h2 { font-size: 1.2rem !important; margin: 0 !important; color: white !important; }
            .sidebar.collapsed .logo { display: none !important; height: 0 !important; padding: 0 !important; margin: 0 !important; }

            /* 選單滾動區域 */
            .sidebar .menu {
                flex: 1 1 auto !important; 
                min-height: 0 !important; 
                overflow-y: auto !important; 
                overflow-x: hidden !important;
                padding: 10px 0 !important; margin: 0 !important;
                width: 100% !important; box-sizing: border-box !important;
            }
            .sidebar .menu::-webkit-scrollbar { width: 5px !important; }
            .sidebar .menu::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.3) !important; border-radius: 3px !important; }

            /* 選單項目 */
            .sidebar .menu li { margin: 0 !important; padding: 0 !important; }
            .sidebar .menu a {
                padding: 12px 20px !important; font-size: 0.95rem !important;
                display: flex !important; align-items: center !important;
                color: #ecf0f1 !important; text-decoration: none !important;
                transition: background 0.2s !important; box-sizing: border-box !important;
                white-space: nowrap !important;
            }
            .sidebar .menu a:hover { background: rgba(255, 255, 255, 0.1) !important; }
            .sidebar .menu a.active {
                background: rgba(52, 152, 219, 0.2) !important;
                border-left: 4px solid #3498db !important;
            }
            .sidebar .menu a i { font-size: 1.1rem !important; margin-right: 15px !important; width: 20px !important; text-align: center !important; }
            
            /* 折疊狀態 */
            .sidebar.collapsed .menu a { justify-content: center !important; padding: 12px 0 !important; }
            .sidebar.collapsed .menu a i { margin-right: 0 !important; }
            .sidebar.collapsed .menu-text, .sidebar.collapsed .submenu-arrow { display: none !important; }

            /* 子選單 */
            .sidebar .submenu { display: none; background: rgba(0,0,0,0.15) !important; padding: 0 !important; margin: 0 !important; list-style: none !important; }
            .sidebar .menu-item-with-submenu.active .submenu { display: block !important; }
            .sidebar .submenu a { padding: 10px 20px 10px 50px !important; font-size: 0.85rem !important; }
            .sidebar .submenu-arrow { margin-left: auto !important; transition: transform 0.3s !important; }
            .sidebar .menu-item-with-submenu.active .submenu-arrow { transform: rotate(180deg) !important; }

            /* 底部 Logout */
            .sidebar .sidebar-footer {
                flex-shrink: 0 !important; padding: 15px !important;
                border-top: 1px solid rgba(255,255,255,0.1) !important;
                background-color: #2c3e50 !important; box-sizing: border-box !important;
            }
            .sidebar .logout-btn {
                width: 100% !important; padding: 10px !important;
                background: rgba(231, 76, 60, 0.1) !important; color: #e74c3c !important;
                border: 1px solid rgba(231, 76, 60, 0.3) !important; border-radius: 6px !important;
                cursor: pointer !important; display: flex !important; align-items: center !important;
                justify-content: center !important; gap: 10px !important; font-size: 0.9rem !important;
                transition: all 0.2s !important;
            }
            .sidebar .logout-btn:hover { background: rgba(231, 76, 60, 0.2) !important; color: #c0392b !important; }
            .sidebar.collapsed .logout-btn { padding: 10px 0 !important; }
            .sidebar.collapsed .logout-btn .menu-text { display: none !important; }
            
            /* ★ 隱藏原本寫在 sidebar 裡面的按鈕 */
            .sidebar .toggle-btn { display: none !important; }

            /* ★★★ 全新獨立的折疊按鈕 (直接掛在 body 上，絕對不會被遮擋) ★★★ */
            .standalone-toggle-btn {
                position: fixed !important;
                top: 70px !important;
                left: 224px !important; /* 240 - 16 */
                width: 32px !important; height: 32px !important;
                border-radius: 50% !important; background: #3498db !important;
                color: white !important; border: none !important;
                box-shadow: 0 2px 5px rgba(0,0,0,0.2) !important;
                z-index: 9999999 !important; /* 最高層級 */
                cursor: pointer !important;
                display: flex !important; align-items: center !important; justify-content: center !important;
                transition: left 0.3s ease, background 0.2s !important;
                pointer-events: auto !important;
            }
            .standalone-toggle-btn:hover { background: #2980b9 !important; }

            /* 主內容區 */
            .main-content {
                margin-left: 240px !important; width: calc(100% - 240px) !important;
                min-height: 100vh !important; box-sizing: border-box !important;
                transition: margin-left 0.3s ease, width 0.3s ease !important;
            }
            .sidebar.collapsed + .main-content, .sidebar.collapsed ~ .main-content {
                margin-left: 64px !important; width: calc(100% - 64px) !important;
            }
            html, body { overflow-x: auto !important; }
        `;
        document.head.appendChild(patchStyle);
    }

    const existingSidebar = document.querySelector('.sidebar');
    if (existingSidebar) {
        initializeSidebar();
        return;
    }
    
    // 創建 app-container
    let appContainer = document.querySelector('.app-container');
    if (!appContainer) {
        appContainer = document.createElement('div');
        appContainer.className = 'app-container';
        document.body.insertBefore(appContainer, document.body.firstChild);
        const bodyChildren = Array.from(document.body.children);
        bodyChildren.forEach(child => { if (child !== appContainer) appContainer.appendChild(child); });
    }
    
    // 生成側邊欄 HTML（移除了 toggle-btn）
    const sidebarHTML = `
        <div class="sidebar">
            <div class="logo">
                <img src="AEL Logo.png" alt="AEL Logo" class="logo-img">
                <h2>DWSS</h2>
            </div>
            
            <ul class="menu">
                <li><a href="index.html" id="menu-dashboard"><i class="fas fa-home"></i><span class="menu-text" data-i18n="dashboard">Dashboard</span></a></li>
                <li><a href="sitediary.html" id="menu-sitediary"><i class="fas fa-book"></i><span class="menu-text" data-i18n="site.diary">Site Diary</span></a></li>
                <li><a href="safetyinspect.html" id="menu-safetyinspect"><i class="fas fa-clipboard-check"></i><span class="menu-text" data-i18n="safety.inspection">Safety Inspection</span></a></li>
                <li><a href="sitelocations.html" id="menu-sitelocations"><i class="fas fa-map-marked-alt"></i><span class="menu-text" data-i18n="site.locations">Site Locations</span></a></li>
                <li><a href="labourwage.html" id="menu-labourwage"><i class="fas fa-money-bill-wave"></i><span class="menu-text" data-i18n="labour.wage">Labour Wage</span></a></li>
                <li><a href="settings.html" id="menu-settings"><i class="fas fa-cogs"></i><span class="menu-text" data-i18n="system.settings">System Settings</span></a></li>
                <li class="menu-item-with-submenu">
                    <a href="#" class="submenu-toggle" id="menu-usermanagement">
                        <i class="fas fa-users"></i><span class="menu-text" data-i18n="user.management">User Management</span><i class="fas fa-chevron-down submenu-arrow"></i>
                    </a>
                    <ul class="submenu">
                        <li><a href="usermanagement.html" id="submenu-users"><i class="fas fa-user"></i><span class="menu-text">Users</span></a></li>
                        <li><a href="teams.html" id="submenu-teams"><i class="fas fa-user-friends"></i><span class="menu-text">Teams</span></a></li>
                    </ul>
                </li>
            </ul>
            
            <div class="sidebar-footer">
                <button id="logout-btn" class="logout-btn">
                    <i class="fas fa-sign-out-alt"></i>
                    <span class="menu-text">Logout</span>
                </button>
            </div>
        </div>    
    `;
    
    appContainer.insertAdjacentHTML('afterbegin', sidebarHTML);
    
    // ★ 動態創建獨立的按鈕並掛載到 body
    if (!document.querySelector('.standalone-toggle-btn')) {
        const btn = document.createElement('button');
        btn.className = 'standalone-toggle-btn';
        btn.innerHTML = '<i class="fas fa-chevron-left"></i>';
        document.body.appendChild(btn);
    }
    
    initializeSidebar();
}

// ★ 全局事件代理：只處理子選單和登出
document.addEventListener('click', function(e) {
    var submenuBtn = e.target.closest('.submenu-toggle');
    if (submenuBtn) {
        e.preventDefault();
        e.stopPropagation();
        var parentLi = submenuBtn.parentElement;
        if (parentLi) parentLi.classList.toggle('active');
        return;
    }

    var logoutBtn = e.target.closest('.logout-btn');
    if (logoutBtn) {
        e.preventDefault();
        e.stopPropagation();
        if (window.DWSS_Auth && typeof window.DWSS_Auth.logout === 'function') {
            window.DWSS_Auth.logout();
            return;
        }
        var token = '';
        try { token = (JSON.parse(sessionStorage.getItem('dwss_session') || '{}')).sessionToken || ''; } catch (err) {}
        var done = function () {
            sessionStorage.clear();
            window.location.href = 'login.html';
        };
        if (!token) { done(); return; }
        fetch('/api/auth/logout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionToken: token }),
            keepalive: true
        }).then(done).catch(done);
    }
});

function initializeSidebar() {
    const savedState = localStorage.getItem('sidebarState');
    if (savedState === 'collapsed') {
        const sb = document.querySelector('.sidebar');
        if (sb) sb.classList.add('collapsed');
        updateMainContentLayout();
    }
    updateToggleButtonIcon();
    highlightCurrentPage();
    
    // ★ 綁定獨立按鈕的點擊事件
    const btn = document.querySelector('.standalone-toggle-btn');
    if (btn) {
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        
        newBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            const sidebar = document.querySelector('.sidebar');
            sidebar.classList.toggle('collapsed');
            localStorage.setItem('sidebarState', sidebar.classList.contains('collapsed') ? 'collapsed' : 'expanded');
            updateMainContentLayout();
            updateToggleButtonIcon();
        });
    }
}

function updateMainContentLayout() {
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');
    if (!sidebar || !mainContent) return;
    
    requestAnimationFrame(() => {
        const isCollapsed = sidebar.classList.contains('collapsed');
        const targetWidth = isCollapsed ? 64 : 240;
        
        mainContent.style.setProperty('margin-left', targetWidth + 'px', 'important');
        mainContent.style.setProperty('width', `calc(100% - ${targetWidth}px)`, 'important');
        mainContent.style.setProperty('box-sizing', 'border-box', 'important');
        mainContent.style.setProperty('transition', 'margin-left 0.3s ease, width 0.3s ease', 'important');
    });
}

function updateToggleButtonIcon() {
    const btn = document.querySelector('.standalone-toggle-btn');
    const sidebar = document.querySelector('.sidebar');
    if (!btn || !sidebar) return;
    
    if (sidebar.classList.contains('collapsed')) {
        btn.innerHTML = '<i class="fas fa-chevron-right"></i>';
        btn.style.setProperty('left', '48px', 'important'); // 64 - 16
    } else {
        btn.innerHTML = '<i class="fas fa-chevron-left"></i>';
        btn.style.setProperty('left', '224px', 'important'); // 240 - 16
    }
}

function highlightCurrentPage() {
    let currentPage = window.location.pathname.split('/').pop();
    if (!currentPage || currentPage === '') currentPage = 'index.html';
    
    document.querySelectorAll('.menu a').forEach(link => link.classList.remove('active'));
    document.querySelectorAll('.submenu a').forEach(link => link.classList.remove('active'));
    document.querySelectorAll('.menu-item-with-submenu').forEach(item => item.classList.remove('active'));
    
    let mainMenuItemId = '';
    let isSubmenu = false;
    let submenuParentId = '';
    
    switch(currentPage) {
        case 'index.html': mainMenuItemId = 'menu-dashboard'; break;
        case 'sitediary.html': mainMenuItemId = 'menu-sitediary'; break;
        case 'safetyinspect.html': mainMenuItemId = 'menu-safetyinspect'; break;
        case 'sitelocations.html': mainMenuItemId = 'menu-sitelocations'; break;
        case 'labourwage.html': mainMenuItemId = 'menu-labourwage'; break;
        case 'settings.html': mainMenuItemId = 'menu-settings'; break;
        case 'usermanagement.html': mainMenuItemId = 'submenu-users'; isSubmenu = true; submenuParentId = 'menu-usermanagement'; break;
        case 'teams.html': mainMenuItemId = 'submenu-teams'; isSubmenu = true; submenuParentId = 'menu-usermanagement'; break;
    }
    
    if (mainMenuItemId) {
        const activeLink = document.getElementById(mainMenuItemId);
        if (activeLink) {
            activeLink.classList.add('active');
            if (isSubmenu && submenuParentId) {
                const parentMenu = document.getElementById(submenuParentId);
                if (parentMenu) {
                    const parentLi = parentMenu.closest('.menu-item-with-submenu');
                    if (parentLi) parentLi.classList.add('active');
                }
            }
        }
    }
}

document.addEventListener('DOMContentLoaded', function() {
    loadSidebar();
});