// scripts/permissions.js
// ============================================================
// DWSS Permissions & Auth Module
// 合併 auth-check.js + user-management.js
// Contract No. DE/2024/12
// ============================================================

(function () {
    'use strict';

    // ============================================================
    // 1. 組織定義 (Organizations)
    // ============================================================
    var ORGANIZATIONS = {
        'SERVICE_MANAGER': {
            id: 'SERVICE_MANAGER', name: 'Service Manager',
            fullName: 'Drainage Services Department (DSD)',
            shortName: 'DSD', color: '#2c3e50', level: 5
        },
        'CONTRACTOR': {
            id: 'CONTRACTOR', name: 'Contractor',
            fullName: 'REC - AEL Joint Venture',
            shortName: 'REC-AEL', color: '#e74c3c', level: 4
        },
        'SUBCONTRACTOR': {
            id: 'SUBCONTRACTOR', name: 'Subcontractor',
            fullName: 'Subcontractor',
            shortName: 'SUB', color: '#f39c12', level: 2
        },
        'SUPPLIER': {
            id: 'SUPPLIER', name: 'Supplier',
            fullName: 'Supplier',
            shortName: 'SUP', color: '#9b59b6', level: 1
        },
        'SYSTEM_VENDOR': {
            id: 'SYSTEM_VENDOR', name: 'System Vendor',
            fullName: 'AEL - Associated Engineers Ltd.',
            shortName: 'AEL', color: '#3498db', level: 5
        }
    };

    // ============================================================
    // 2. 角色定義 (Roles)
    // ============================================================
    var ROLES = {
        'eg': { id: 'eg', name: 'Engineer Grade', shortName: 'EG', organization: 'SERVICE_MANAGER' },
        'ig': { id: 'ig', name: 'Inspector Grade', shortName: 'IG', organization: 'SERVICE_MANAGER' },
        'wsg': { id: 'wsg', name: 'Works Supervisor Grade', shortName: 'WSG', organization: 'SERVICE_MANAGER' },
        'sa': { id: 'sa', name: 'Site Agent', shortName: 'SA', organization: 'CONTRACTOR' },
        'ssa': { id: 'ssa', name: 'Sub-Site Agent', shortName: 'SSA', organization: 'CONTRACTOR' },
        'rso': { id: 'rso', name: 'Registered Safety Officer', shortName: 'RSO', organization: 'CONTRACTOR' },
        'subcontractor': { id: 'subcontractor', name: 'Subcontractor User', shortName: 'SUB', organization: 'SUBCONTRACTOR' },
        'supplier': { id: 'supplier', name: 'Supplier User', shortName: 'SUP', organization: 'SUPPLIER' },
        'admin': { id: 'admin', name: 'System Administrator', shortName: 'ADMIN', organization: 'SYSTEM_VENDOR' }
    };

    // ============================================================
    // 3. 模組定義 (Modules)
    // ============================================================
    var MODULES = {
        'dashboard':       { id: 'dashboard',       name: 'Dashboard',           icon: 'fa-home' },
        'sitediary':       { id: 'sitediary',       name: 'Site Diary',          icon: 'fa-book' },
        'safetyinspect':   { id: 'safetyinspect',   name: 'Safety Inspection',   icon: 'fa-clipboard-check' },
        'sitelocations':   { id: 'sitelocations',   name: 'Site Locations',      icon: 'fa-map-marked-alt' },
        'labourwage':      { id: 'labourwage',      name: 'Labour Wage',         icon: 'fa-money-bill-wave' },
        'settings':        { id: 'settings',        name: 'System Settings',     icon: 'fa-cogs' },
        'usermanagement':  { id: 'usermanagement',  name: 'User Management',     icon: 'fa-users' },
        'ssss':            { id: 'ssss',            name: 'SSSS / 4S',           icon: 'fa-shield-alt' }
    };

    // ============================================================
    // 4. 存取級別 (Access Levels)
    // ============================================================
    var ACCESS_LEVELS = {
        'none':    { label: 'No Access',      value: 0 },
        'view':    { label: 'View Only',      value: 1 },
        'edit':    { label: 'Edit',           value: 2 },
        'approve': { label: 'Edit & Approve', value: 3 },
        'admin':   { label: 'Full Admin',     value: 4 }
    };

    // ============================================================
    // 5. 角色預設權限 (Role Templates)
    // ============================================================
    var ROLE_TEMPLATES = {
        'eg': { modules: { dashboard:'view', sitediary:'view', safetyinspect:'view', sitelocations:'view', labourwage:'view', settings:'none', usermanagement:'none', ssss:'view' } },
        'ig': { modules: { dashboard:'view', sitediary:'approve', safetyinspect:'approve', sitelocations:'view', labourwage:'approve', settings:'none', usermanagement:'none', ssss:'view' } },
        'wsg': { modules: { dashboard:'view', sitediary:'approve', safetyinspect:'view', sitelocations:'view', labourwage:'view', settings:'none', usermanagement:'none', ssss:'view' } },
        'sa': { modules: { dashboard:'view', sitediary:'edit', safetyinspect:'edit', sitelocations:'edit', labourwage:'edit', settings:'none', usermanagement:'none', ssss:'view' } },
        'ssa': { modules: { dashboard:'view', sitediary:'edit', safetyinspect:'edit', sitelocations:'view', labourwage:'edit', settings:'none', usermanagement:'none', ssss:'view' } },
        'rso': { modules: { dashboard:'view', sitediary:'view', safetyinspect:'edit', sitelocations:'view', labourwage:'view', settings:'none', usermanagement:'none', ssss:'view' } },
        'subcontractor': { modules: { dashboard:'view', sitediary:'view', safetyinspect:'view', sitelocations:'view', labourwage:'view', settings:'none', usermanagement:'none', ssss:'none' } },
        'supplier': { modules: { dashboard:'none', sitediary:'none', safetyinspect:'none', sitelocations:'view', labourwage:'view', settings:'none', usermanagement:'none', ssss:'none' } },
        'admin': { modules: { dashboard:'admin', sitediary:'admin', safetyinspect:'admin', sitelocations:'admin', labourwage:'admin', settings:'admin', usermanagement:'admin', ssss:'admin' } }
    };

    var GROUPS_KEY = 'dwss_user_groups';

    // ============================================================
    // 6. Session 管理（來自 auth-check.js）
    // ============================================================
    function getCurrentUser() {
        var sessionData = sessionStorage.getItem('dwss_session');
        if (sessionData) {
            try { return JSON.parse(sessionData); } catch (e) { return null; }
        }
        return null;
    }

    function isLoggedIn() {
        var user = getCurrentUser();
        return user && user.isLoggedIn === true;
    }

    function requireAuth() {
        if (!isLoggedIn()) {
            window.location.href = 'login.html';
            return false;
        }
        return true;
    }

    function logout() {
        sessionStorage.clear();
        localStorage.removeItem('current_user');
        window.location.href = 'login.html';
    }

    // ============================================================
    // 7. 權限檢查
    // ============================================================
    function getUserAccess(user, moduleId) {
        if (!user) return 'none';
        if (user.modulePermissions && user.modulePermissions[moduleId]) {
            return user.modulePermissions[moduleId];
        }
        var template = ROLE_TEMPLATES[user.role];
        if (template && template.modules && template.modules[moduleId]) {
            return template.modules[moduleId];
        }
        return 'none';
    }

    function canAccess(user, moduleId, requiredLevel) {
        var access = getUserAccess(user, moduleId);
        var accessValue = ACCESS_LEVELS[access] ? ACCESS_LEVELS[access].value : 0;
        var requiredValue = ACCESS_LEVELS[requiredLevel || 'view'] ? ACCESS_LEVELS[requiredLevel || 'view'].value : 1;
        return accessValue >= requiredValue;
    }

    function checkPageAccess(moduleId, requiredLevel) {
        var user = getCurrentUser();
        if (!user) return false;
        return canAccess(user, moduleId, requiredLevel || 'view');
    }

    function requirePageAccess(moduleId, requiredLevel) {
        if (!checkPageAccess(moduleId, requiredLevel)) {
            alert('❌ You do not have permission to access this page.');
            window.location.href = 'index.html';
            return false;
        }
        return true;
    }

    // ============================================================
    // 8. 角色檢查（來自 auth-check.js）
    // ============================================================
    function canChangeStatus() {
        var user = getCurrentUser();
        if (!user) return false;
        // IG / WSG / Admin 可以改狀態
        if (user.role === 'admin' || user.role === 'ig' || user.role === 'wsg') return true;
        // 或按模組權限
        return canAccess(user, 'sitediary', 'approve') ||
               canAccess(user, 'safetyinspect', 'approve') ||
               canAccess(user, 'labourwage', 'approve');
    }

    function isAdmin() {
        var user = getCurrentUser();
        return user && (user.role === 'admin' || user.userRole === 'admin');
    }

    function canManageUsers() {
        var user = getCurrentUser();
        if (!user) return false;
        if (user.role === 'admin') return true;
        return canAccess(user, 'usermanagement', 'admin');
    }

    function getRoleName() {
        var user = getCurrentUser();
        if (!user) return 'Guest';
        var role = ROLES[user.role];
        return role ? role.name : (user.permissions ? user.permissions.name : 'Guest');
    }

    function getUserName() {
        var user = getCurrentUser();
        return user ? user.userName : 'Guest';
    }

    function getOrganization() {
        var user = getCurrentUser();
        return user ? (user.organization || null) : null;
    }

    function getCompanyName() {
        var user = getCurrentUser();
        return user ? (user.companyName || null) : null;
    }

    // ============================================================
    // 9. 項目管理
    // ============================================================
    function getCurrentProject() {
        return sessionStorage.getItem('currentProjectId') || null;
    }

    function setCurrentProject(projectId) {
        if (!projectId) return false;
        sessionStorage.setItem('currentProjectId', projectId);
        return true;
    }

    function canAccessProject(projectId) {
        if (!projectId) return false;
        var user = getCurrentUser();
        if (!user) return false;
        if (user.role === 'admin') return true;
        if (!user.projectIds || !Array.isArray(user.projectIds)) return false;
        return user.projectIds.indexOf(projectId) !== -1;
    }

    function canAccessRecord(record) {
        if (!record) return false;
        if (!record.projectId) return true;
        return canAccessProject(record.projectId);
    }

    function filterByProject(records) {
        if (!Array.isArray(records)) return [];
        var user = getCurrentUser();
        if (!user) return [];
        if (user.role === 'admin') {
            var currentPid = getCurrentProject();
            if (currentPid && currentPid !== 'ALL') {
                return records.filter(function(r) {
                    return !r.projectId || r.projectId === currentPid;
                });
            }
            return records.slice();
        }
        var currentPid = getCurrentProject();
        var allowedPids = user.projectIds || [];
        return records.filter(function(r) {
            if (!r.projectId) {
                if (typeof window.getProjectIdBySite === 'function') {
                    var inferred = window.getProjectIdBySite(r.site);
                    if (inferred) return allowedPids.indexOf(inferred) !== -1;
                }
                return false;
            }
            if (currentPid && currentPid !== 'ALL') {
                return r.projectId === currentPid;
            }
            return allowedPids.indexOf(r.projectId) !== -1;
        });
    }

    function autoFillProjectId(record) {
        if (!record) return record;
        if (record.projectId) return record;
        var pid = getCurrentProject();
        if (pid && pid !== 'ALL') {
            record.projectId = pid;
        } else if (typeof window.getProjectIdBySite === 'function') {
            var inferred = window.getProjectIdBySite(record.site);
            if (inferred) record.projectId = inferred;
        }
        return record;
    }

    /**
     * 把项目 ID (DE/2026/05) 转换成 URL-safe 的项目码 (DE-2026-05)
     * 用于嵌入 ID 中
     */
    function getContractCode() {
        var pid = sessionStorage.getItem('currentProjectId');
        if (!pid) return 'UNKNOWN';
        // 把 / 换成 -
        return String(pid).replace(/\//g, '-');
    }

    /**
     * 反向：从 ID 中提取项目 ID
     * 例如 SSR/WSI/DE-2026-05/000001A → DE/2026/05
     */
    function extractProjectFromId(id) {
        var m = String(id).match(/\/(DE-\d{4}-\d{2})\//);
        if (!m) return null;
        return m[1].replace(/-/g, '/');
    }

    // ============================================================
    // 10. 群組 CRUD
    // ============================================================
    function loadGroups() {
        try {
            var raw = localStorage.getItem(GROUPS_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch (e) { return []; }
    }

    function saveGroups(groups) {
        localStorage.setItem(GROUPS_KEY, JSON.stringify(groups));
    }

    function createGroup(name, permissions, description) {
        var groups = loadGroups();
        var newGroup = {
            id: 'GRP-' + Date.now(),
            name: name,
            description: description || '',
            permissions: permissions || {},
            createdAt: new Date().toISOString()
        };
        groups.push(newGroup);
        saveGroups(groups);
        return newGroup;
    }

    function updateGroup(groupId, updates) {
        var groups = loadGroups();
        var idx = groups.findIndex(function (g) { return g.id === groupId; });
        if (idx === -1) return null;
        Object.assign(groups[idx], updates);
        saveGroups(groups);
        return groups[idx];
    }

    function deleteGroup(groupId) {
        var groups = loadGroups();
        groups = groups.filter(function (g) { return g.id !== groupId; });
        saveGroups(groups);
        return true;
    }

    // ============================================================
    // 11. UI 更新（來自 auth-check.js）
    // ============================================================
    function updateProjectIndicator() {
        var indicator = document.getElementById('current-project-indicator');
        if (!indicator) return;

        var currentPid = getCurrentProject();
        var project = currentPid && currentPid !== 'ALL'
            ? (typeof window.getProjectById === 'function' ? window.getProjectById(currentPid) : null)
            : null;

        if (project) {
            indicator.innerHTML =
                '<i class="fas fa-folder-open"></i> ' +
                '<span class="project-name">' + project.name + '</span>' +
                '<span class="project-code" style="background:' + project.color + '">' + project.code + '</span>';
            indicator.style.borderLeftColor = project.color;
        } else {
            indicator.innerHTML = '<i class="fas fa-globe"></i> <span class="project-name">All Projects</span>';
            indicator.style.borderLeftColor = '#95a5a6';
        }
    }

    function updateHeaderUser() {
        var user = getCurrentUser();
        if (!user) return;

        var userBtnSpans = document.querySelectorAll('.user-btn span');
        userBtnSpans.forEach(function(span) {
            span.textContent = user.userName;
        });

        var headerControls = document.querySelector('.header-controls .user-date-row');
        if (headerControls && !document.getElementById('permission-indicator')) {
            var permBadge = document.createElement('span');
            permBadge.id = 'permission-indicator';
            permBadge.style.cssText = 'display:inline-block;padding:4px 12px;border-radius:20px;font-size:0.75rem;font-weight:600;margin-left:10px;';

            if (canChangeStatus()) {
                permBadge.style.background = '#d4edda';
                permBadge.style.color = '#155724';
                permBadge.innerHTML = '<i class="fas fa-check-circle"></i> ' + getRoleName();
            } else {
                permBadge.style.background = '#fff3cd';
                permBadge.style.color = '#856404';
                permBadge.innerHTML = '<i class="fas fa-minus-circle"></i> ' + getRoleName();
            }

            headerControls.appendChild(permBadge);
        } else if (headerControls) {
            var existingBadge = document.getElementById('permission-indicator');
            if (existingBadge) {
                existingBadge.innerHTML = '<i class="fas fa-user"></i> ' + getRoleName();
            }
        }

        updateProjectIndicator();
    }

    // ============================================================
    // 12. 狀態更改（來自 auth-check.js）
    // ============================================================
    function generateStatusSelect(recordId) {
        if (canChangeStatus()) {
            return '<select class="status-change-select" data-id="' + recordId + '" title="Change Status">' +
                '<option value="">📝 Change Status</option>' +
                '<option value="draft">Draft</option>' +
                '<option value="submitted-wsg">Submitted to WSG</option>' +
                '<option value="submitted-ig">Submitted to IG</option>' +
                '<option value="closed">Closed</option>' +
                '<option value="reopen">Reopen</option>' +
                '<option value="cancelled">Cancelled</option>' +
                '</select>';
        }
        return '';
    }

    function generatePermissionHint() {
        if (!canChangeStatus()) {
            return '<span class="permission-lock-hint"><i class="fas fa-lock"></i> Status change requires IG/WSG permission</span>';
        }
        return '';
    }

    function autoFillSubmittedBy(inputId) {
        var input = document.getElementById(inputId);
        var user = getCurrentUser();
        if (input && user) input.value = user.userName;
    }

    function adjustFormStatusOptions(statusSelectId) {
        var statusSelect = document.getElementById(statusSelectId);
        if (!statusSelect) return;

        if (!canChangeStatus()) {
            statusSelect.innerHTML = '<option value="submitted">Submitted</option>';
            statusSelect.value = 'submitted';
            statusSelect.disabled = true;

            var hint = document.getElementById('submit-only-hint');
            if (!hint) {
                hint = document.createElement('div');
                hint.id = 'submit-only-hint';
                hint.style.cssText = 'color: #856404; background: #fff3cd; padding: 10px; border-radius: 6px; margin: 10px 0; font-size: 0.85rem;';
                hint.innerHTML = '<i class="fas fa-info-circle"></i> <strong>Submit Only Mode:</strong> You can only submit records. Status changes require IG/WSG permission.';
                statusSelect.parentNode.appendChild(hint);
            }
        } else {
            statusSelect.innerHTML =
                '<option value="draft">Draft</option>' +
                '<option value="submitted-wsg">Submitted to WSG</option>' +
                '<option value="submitted-ig">Submitted to IG</option>' +
                '<option value="closed">Closed</option>' +
                '<option value="reopen">Reopen</option>' +
                '<option value="cancelled">Cancelled</option>';
            statusSelect.disabled = false;
            var hint = document.getElementById('submit-only-hint');
            if (hint) hint.remove();
        }
    }

    function bindStatusChangeEvents(getRecordCallback, saveCallback, renderCallback) {
        if (!canChangeStatus()) return;

        document.querySelectorAll('.status-change-select').forEach(function(select) {
            select.removeEventListener('change', handleStatusChange);
            select.addEventListener('change', handleStatusChange);
        });

        function handleStatusChange(e) {
            var recordId = e.target.getAttribute('data-id');
            var newStatus = e.target.value;
            if (!newStatus) return;

            var record = getRecordCallback(recordId);
            if (!record) return;

            if (!canAccessRecord(record)) {
                alert('❌ You do not have permission to modify this record.');
                e.target.value = '';
                return;
            }

            var oldStatus = record.status || 'draft';
            var user = getCurrentUser();

            if (confirm(
                '⚠️ Change Status Confirmation\n\n' +
                'Record ID: ' + recordId + '\n' +
                'From: ' + oldStatus + '\n' +
                'To: ' + newStatus + '\n' +
                'Changed by: ' + (user ? user.userName : 'Unknown') + ' (' + getRoleName() + ')\n\n' +
                'Are you sure you want to change the status?'
            )) {
                record.status = newStatus;
                record.statusChangedBy = user ? user.userName : 'Unknown';
                record.statusChangedAt = new Date().toISOString();
                record.statusChangedRole = getRoleName();

                if (saveCallback) saveCallback();
                if (renderCallback) renderCallback();

                alert('✅ Status changed successfully!\n\n' + oldStatus + ' → ' + newStatus);
            } else {
                e.target.value = '';
            }
        }
    }

    // ============================================================
    // 13. 公開 API
    // ============================================================
    window.DWSS_Permissions = {
        // Constants
        ORGANIZATIONS: ORGANIZATIONS,
        ROLES: ROLES,
        MODULES: MODULES,
        ACCESS_LEVELS: ACCESS_LEVELS,
        ROLE_TEMPLATES: ROLE_TEMPLATES,

        getAllOrganizations: function () {
            return Object.keys(ORGANIZATIONS).map(function (k) { return ORGANIZATIONS[k]; });
        },
        getAllRoles: function () {
            return Object.keys(ROLES).map(function (k) { return ROLES[k]; });
        },
        getAllModules: function () {
            return Object.keys(MODULES).map(function (k) { return MODULES[k]; });
        },

        // Session
        getCurrentUser: getCurrentUser,
        isLoggedIn: isLoggedIn,
        requireAuth: requireAuth,
        logout: logout,

        // Permissions
        getUserAccess: getUserAccess,
        canAccess: canAccess,
        checkPageAccess: checkPageAccess,
        requirePageAccess: requirePageAccess,
        canChangeStatus: canChangeStatus,
        isAdmin: isAdmin,
        canManageUsers: canManageUsers,
        getRoleName: getRoleName,
        getUserName: getUserName,
        getOrganization: getOrganization,
        getCompanyName: getCompanyName,

        // Project
        getCurrentProject: getCurrentProject,
        setCurrentProject: setCurrentProject,
        canAccessProject: canAccessProject,
        canAccessRecord: canAccessRecord,
        filterByProject: filterByProject,
        autoFillProjectId: autoFillProjectId,

        filterByCurrentProject: function(records) {
            if (!Array.isArray(records)) return [];
            var currentProjectId = getCurrentProject();

            if (!currentProjectId) {
                console.warn('[Permissions] No current project selected, showing all records');
                return records;
            }

            // 兼容模式：如果数据完全没有 project 字段，显示全部
            var hasAnyProject = records.some(function(r) {
                return r.project && r.project !== '';
            });

            if (!hasAnyProject) {
                console.warn('[Permissions] 數據無 project 欄位，顯示全部（相容模式）');
                return records;
            }

            return records.filter(function(record) {
                return record.project === currentProjectId;
            });
        },

        // Groups
        getGroups: loadGroups,
        createGroup: createGroup,
        updateGroup: updateGroup,
        deleteGroup: deleteGroup,

        // UI
        updateHeaderUser: updateHeaderUser,
        updateProjectIndicator: updateProjectIndicator,
        generateStatusSelect: generateStatusSelect,
        generatePermissionHint: generatePermissionHint,
        autoFillSubmittedBy: autoFillSubmittedBy,
        adjustFormStatusOptions: adjustFormStatusOptions,
        bindStatusChangeEvents: bindStatusChangeEvents,
    };

    // ============================================================
    // 14. 向後兼容（保留舊 API 名）
    // ============================================================
    window.DWSS_Auth = window.DWSS_Permissions;
    window.DWSS_UserManagement = window.DWSS_Permissions;

    console.log('[Permissions] Module loaded');
    console.log('  - Organizations:', Object.keys(ORGANIZATIONS).length);
    console.log('  - Roles:', Object.keys(ROLES).length);
    console.log('  - Modules:', Object.keys(MODULES).length);
    console.log('  - Access Levels:', Object.keys(ACCESS_LEVELS).length);

    // ============================================================
    // 15. 自動 Auth 檢查
    // ============================================================
    if (!window.location.pathname.includes('login.html') &&
        !window.location.pathname.includes('change-password.html') &&
        !window.location.pathname.includes('project-select.html')) {
        if (!requireAuth()) {
            throw new Error('Authentication required');
        }
    }

})();