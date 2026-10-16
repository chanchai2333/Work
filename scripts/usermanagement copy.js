// scripts/usermanagement.js
// ============================================================
// AEL DWSS User Management
// Contract No. DE/2024/12
// 跟隨 Submission of DWSS Proposal_Rev0_Revised.doc
// Section 1.3 Roles of Key Parties + Section 11.1.2 User Management
// ============================================================

(function () {
    'use strict';

    // ============================================================
    // 1. 組織定義 (Organizations) — 真實合約名稱
    // ============================================================
    var ORGANIZATIONS = {
        'SERVICE_MANAGER': {
            id: 'SERVICE_MANAGER',
            name: 'Service Manager',
            fullName: 'Drainage Services Department (DSD)',
            shortName: 'DSD',
            color: '#2c3e50',
            description: 'Drainage Services Department — EG, IG, WSG',
            contract: 'Contract No. DE/2024/12'
        },
        'CONTRACTOR': {
            id: 'CONTRACTOR',
            name: 'Contractor',
            fullName: 'REC - AEL Joint Venture',
            shortName: 'REC-AEL',
            color: '#e74c3c',
            description: 'Main Contractor — SA, SSA, RSO',
            contract: 'Contract No. DE/2024/12'
        },
        'SUBCONTRACTOR': {
            id: 'SUBCONTRACTOR',
            name: 'Subcontractor',
            fullName: 'Subcontractor',
            shortName: 'SUB',
            color: '#f39c12',
            description: 'Subcontracted parties',
            contract: 'Contract No. DE/2024/12'
        },
        'SUPPLIER': {
            id: 'SUPPLIER',
            name: 'Supplier',
            fullName: 'Supplier',
            shortName: 'SUP',
            color: '#9b59b6',
            description: 'Material & equipment suppliers',
            contract: 'Contract No. DE/2024/12'
        },
        'SYSTEM_VENDOR': {
            id: 'SYSTEM_VENDOR',
            name: 'System Vendor',
            fullName: 'AEL - Associated Engineers Ltd.',
            shortName: 'AEL',
            color: '#3498db',
            description: 'System Administrator & Platform Provider',
            contract: 'Contract No. DE/2024/12'
        }
    };

    // ============================================================
    // 2. 角色定義 (Roles) — Proposal Section 1.3
    // ============================================================
    var ROLES = {
        'eg': {
            id: 'eg',
            name: 'Engineer Grade',
            shortName: 'EG',
            organization: 'SERVICE_MANAGER',
            description: 'Receives accepted records for oversight',
            color: '#2c3e50'
        },
        'ig': {
            id: 'ig',
            name: 'Inspector Grade',
            shortName: 'IG',
            organization: 'SERVICE_MANAGER',
            description: 'Primary approver — approve, reject, cancel, close',
            color: '#16a085'
        },
        'wsg': {
            id: 'wsg',
            name: 'Works Supervisor Grade',
            shortName: 'WSG',
            organization: 'SERVICE_MANAGER',
            description: 'First-line reviewer — review, reopen',
            color: '#27ae60'
        },
        'sa': {
            id: 'sa',
            name: 'Site Agent',
            shortName: 'SA',
            organization: 'CONTRACTOR',
            description: 'Submit and revise records',
            color: '#e74c3c'
        },
        'ssa': {
            id: 'ssa',
            name: 'Sub-Site Agent',
            shortName: 'SSA',
            organization: 'CONTRACTOR',
            description: 'Submit and revise records',
            color: '#c0392b'
        },
        'rso': {
            id: 'rso',
            name: 'Registered Safety Officer',
            shortName: 'RSO',
            organization: 'CONTRACTOR',
            description: 'Submit safety inspection records',
            color: '#d35400'
        },
        'subcontractor': {
            id: 'subcontractor',
            name: 'Subcontractor User',
            shortName: 'SUB',
            organization: 'SUBCONTRACTOR',
            description: 'Read-only access to assigned modules',
            color: '#f39c12'
        },
        'supplier': {
            id: 'supplier',
            name: 'Supplier User',
            shortName: 'SUP',
            organization: 'SUPPLIER',
            description: 'Read-only access to assigned modules',
            color: '#9b59b6'
        },
        'admin': {
            id: 'admin',
            name: 'System Administrator',
            shortName: 'ADMIN',
            organization: 'SYSTEM_VENDOR',
            description: 'Full system administration',
            color: '#3498db'
        }
    };

    // ============================================================
    // 3. 功能模組定義 (Modules)
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
        'none':    { label: 'No Access',        value: 0, color: '#94a3b8' },
        'view':    { label: 'View Only',        value: 1, color: '#3498db' },
        'edit':    { label: 'Edit & Submit',    value: 2, color: '#27ae60' },
        'approve': { label: 'Edit & Approve',   value: 3, color: '#f39c12' },
        'admin':   { label: 'Full Admin',       value: 4, color: '#e74c3c' }
    };

    // ============================================================
    // 5. 角色預設模組權限 (Role Templates)
    // ============================================================
    var ROLE_TEMPLATES = {
        'eg': {
            modules: {
                dashboard: 'view', sitediary: 'view', safetyinspect: 'view',
                sitelocations: 'view', labourwage: 'view', settings: 'none',
                usermanagement: 'none', ssss: 'view'
            }
        },
        'ig': {
            modules: {
                dashboard: 'view', sitediary: 'approve', safetyinspect: 'approve',
                sitelocations: 'view', labourwage: 'approve', settings: 'none',
                usermanagement: 'none', ssss: 'view'
            }
        },
        'wsg': {
            modules: {
                dashboard: 'view', sitediary: 'approve', safetyinspect: 'view',
                sitelocations: 'view', labourwage: 'view', settings: 'none',
                usermanagement: 'none', ssss: 'view'
            }
        },
        'sa': {
            modules: {
                dashboard: 'view', sitediary: 'edit', safetyinspect: 'edit',
                sitelocations: 'edit', labourwage: 'edit', settings: 'none',
                usermanagement: 'none', ssss: 'view'
            }
        },
        'ssa': {
            modules: {
                dashboard: 'view', sitediary: 'edit', safetyinspect: 'edit',
                sitelocations: 'view', labourwage: 'edit', settings: 'none',
                usermanagement: 'none', ssss: 'view'
            }
        },
        'rso': {
            modules: {
                dashboard: 'view', sitediary: 'view', safetyinspect: 'edit',
                sitelocations: 'view', labourwage: 'view', settings: 'none',
                usermanagement: 'none', ssss: 'view'
            }
        },
        'subcontractor': {
            modules: {
                dashboard: 'view', sitediary: 'view', safetyinspect: 'view',
                sitelocations: 'view', labourwage: 'view', settings: 'none',
                usermanagement: 'none', ssss: 'none'
            }
        },
        'supplier': {
            modules: {
                dashboard: 'none', sitediary: 'none', safetyinspect: 'none',
                sitelocations: 'view', labourwage: 'view', settings: 'none',
                usermanagement: 'none', ssss: 'none'
            }
        },
        'admin': {
            modules: {
                dashboard: 'admin', sitediary: 'admin', safetyinspect: 'admin',
                sitelocations: 'admin', labourwage: 'admin', settings: 'admin',
                usermanagement: 'admin', ssss: 'admin'
            }
        }
    };

    // ============================================================
    // 6. 儲存 Keys
    // ============================================================
    var GROUPS_KEY = 'dwss_user_groups';
    var USERS_KEY = 'dwss_users_db';

    // ============================================================
    // 7. 群組 CRUD
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
    // 8. 權限檢查
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

    // ============================================================
    // 9. UserManagement Object
    // ============================================================
    var UserManagement = {

        users: [
            // === System Vendor (AEL) ===
            {
                id: 1,
                name: 'Admin',
                email: 'admin@ael-dwss.com',
                username: 'admin',
                password: 'admin123',
                organization: 'SYSTEM_VENDOR',
                companyName: 'AEL - Associated Engineers Ltd.',
                contractNo: 'Contract No. DE/2024/12',
                role: 'admin',
                department: 'System Administration',
                status: 'online',
                addedDate: '2024-01-15',
                projectIds: [],
                groupIds: [],
                passwordChanged: false,
                passwordChangedAt: null,
                passwordExpiresAt: null
            },
            // === Service Manager (DSD) ===
            {
                id: 2,
                name: 'Kenneth Daluz',
                email: 'kenneth.daluz@dsd.gov.hk',
                username: 'kenneth',
                password: 'officer123',
                organization: 'SERVICE_MANAGER',
                companyName: 'Drainage Services Department (DSD)',
                contractNo: 'Contract No. DE/2024/12',
                role: 'eg',
                department: 'Engineer Grade',
                status: 'online',
                addedDate: '2024-02-10',
                projectIds: ['PROJ-A', 'PROJ-B'],
                groupIds: [],
                passwordChanged: false,
                passwordChangedAt: null,
                passwordExpiresAt: null
            },
            {
                id: 3,
                name: 'TANG Chi Long, Gary',
                email: 'gcifang@dsd.gov.hk',
                username: 'garytang',
                password: 'aei123',
                organization: 'SERVICE_MANAGER',
                companyName: 'Drainage Services Department (DSD)',
                contractNo: 'Contract No. DE/2024/12',
                role: 'ig',
                department: 'Inspector Grade',
                status: 'online',
                addedDate: '2024-02-15',
                projectIds: ['PROJ-A'],
                groupIds: [],
                passwordChanged: false,
                passwordChangedAt: null,
                passwordExpiresAt: null
            },
            {
                id: 4,
                name: 'FUNG Wai Ching',
                email: 'wcfung04@dsd.gov.hk',
                username: 'wcfung',
                password: 'wsg123',
                organization: 'SERVICE_MANAGER',
                companyName: 'Drainage Services Department (DSD)',
                contractNo: 'Contract No. DE/2024/12',
                role: 'wsg',
                department: 'Works Supervisor Grade',
                status: 'online',
                addedDate: '2024-03-01',
                projectIds: ['PROJ-A'],
                groupIds: [],
                passwordChanged: false,
                passwordChangedAt: null,
                passwordExpiresAt: null
            },
            // === Contractor (REC-AEL JV) ===
            {
                id: 5,
                name: 'John Smith',
                email: 'john.smith@rec-ael.com',
                username: 'john',
                password: 'inspector123',
                organization: 'CONTRACTOR',
                companyName: 'REC - AEL Joint Venture',
                contractNo: 'Contract No. DE/2024/12',
                role: 'sa',
                department: 'Site Agent',
                status: 'online',
                addedDate: '2024-03-15',
                projectIds: ['PROJ-B'],
                groupIds: [],
                passwordChanged: false,
                passwordChangedAt: null,
                passwordExpiresAt: null
            },
            {
                id: 6,
                name: 'Sarah Johnson',
                email: 'sarah.j@rec-ael.com',
                username: 'sarah',
                password: 'contractor123',
                organization: 'CONTRACTOR',
                companyName: 'REC - AEL Joint Venture',
                contractNo: 'Contract No. DE/2024/12',
                role: 'ssa',
                department: 'Sub-Site Agent',
                status: 'offline',
                addedDate: '2024-04-01',
                projectIds: ['PROJ-C'],
                groupIds: [],
                passwordChanged: false,
                passwordChangedAt: null,
                passwordExpiresAt: null
            },
            {
                id: 7,
                name: 'Robert Chen',
                email: 'robert.chen@rec-ael.com',
                username: 'robert',
                password: 'rso123',
                organization: 'CONTRACTOR',
                companyName: 'REC - AEL Joint Venture',
                contractNo: 'Contract No. DE/2024/12',
                role: 'rso',
                department: 'Registered Safety Officer',
                status: 'online',
                addedDate: '2024-04-05',
                projectIds: ['PROJ-A', 'PROJ-B'],
                groupIds: [],
                passwordChanged: false,
                passwordChangedAt: null,
                passwordExpiresAt: null
            },
            // === Subcontractor ===
            {
                id: 8,
                name: 'WONG Lap Pan',
                email: 'lpwong@abc-eng.com',
                username: 'lpwong',
                password: 'sub123',
                organization: 'SUBCONTRACTOR',
                companyName: 'ABC Engineering Ltd.',
                contractNo: 'Contract No. DE/2024/12',
                role: 'subcontractor',
                department: 'Subcontractor Team A',
                status: 'online',
                addedDate: '2024-04-10',
                projectIds: ['PROJ-A'],
                groupIds: [],
                passwordChanged: false,
                passwordChangedAt: null,
                passwordExpiresAt: null
            },
            // === Supplier ===
            {
                id: 9,
                name: 'Emma Wilson',
                email: 'emma.w@xyz-supply.com',
                username: 'emma',
                password: 'supplier123',
                organization: 'SUPPLIER',
                companyName: 'XYZ Materials Supply Co.',
                contractNo: 'Contract No. DE/2024/12',
                role: 'supplier',
                department: 'Material Supplier',
                status: 'offline',
                addedDate: '2024-04-15',
                projectIds: ['PROJ-A'],
                groupIds: [],
                passwordChanged: false,
                passwordChangedAt: null,
                passwordExpiresAt: null
            },
            // === Service Manager (多一個 IG) ===
            {
                id: 10,
                name: 'CHA Chi Ming',
                email: 'cmcha02@dsd.gov.hk',
                username: 'cmcha',
                password: 'ig123',
                organization: 'SERVICE_MANAGER',
                companyName: 'Drainage Services Department (DSD)',
                contractNo: 'Contract No. DE/2024/12',
                role: 'ig',
                department: 'Inspector Grade',
                status: 'online',
                addedDate: '2024-04-20',
                projectIds: ['PROJ-A', 'PROJ-B'],
                groupIds: [],
                passwordChanged: false,
                passwordChangedAt: null,
                passwordExpiresAt: null
            }
        ],

        currentFilters: {
            organization: 'all',
            role: 'all',
            status: 'all',
            sort: 'name-asc'
        },

        currentPage: 1,
        itemsPerPage: 10,

        init: function () {
            this.loadFromStorage();
            this.renderUserTable();
            this.setupFilterEvents();
            this.setupActionButtons();
            this.updateUserStats();
            this.initModalOptions();
        },

        loadFromStorage: function () {
            try {
                var stored = localStorage.getItem(USERS_KEY);
                if (stored) {
                    var parsed = JSON.parse(stored);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        this.users = parsed;
                    }
                }
            } catch (e) {
                console.warn('[UserManagement] Failed to load:', e);
            }
        },

        saveToStorage: function () {
            try {
                localStorage.setItem(USERS_KEY, JSON.stringify(this.users));
            } catch (e) {
                console.error('[UserManagement] Failed to save:', e);
            }
        },

        escapeHtml: function (str) {
            if (!str) return '';
            return String(str).replace(/[&<>"']/g, function (m) {
                return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m];
            });
        },

        renderUserTable: function () {
            var tbody = document.getElementById('users-table-body');
            var noResults = document.getElementById('no-results-message');
            if (!tbody) return;

            tbody.innerHTML = '';
            var self = this;

            var filteredUsers = this.users.filter(function (user) {
                if (self.currentFilters.organization !== 'all' && user.organization !== self.currentFilters.organization) return false;
                if (self.currentFilters.role !== 'all' && user.role !== self.currentFilters.role) return false;
                if (self.currentFilters.status !== 'all' && user.status !== self.currentFilters.status) return false;
                return true;
            });

            filteredUsers = this.sortUsers(filteredUsers, this.currentFilters.sort);

            var totalUsers = filteredUsers.length;
            var startIndex = (this.currentPage - 1) * this.itemsPerPage;
            var endIndex = Math.min(startIndex + this.itemsPerPage, totalUsers);
            var pagedUsers = filteredUsers.slice(startIndex, endIndex);

            this.updatePaginationInfo(startIndex + 1, endIndex, totalUsers);

            if (noResults) {
                noResults.style.display = pagedUsers.length === 0 ? 'block' : 'none';
            }

            pagedUsers.forEach(function (user) {
                var row = document.createElement('tr');
                var role = ROLES[user.role];
                var org = ORGANIZATIONS[user.organization];

                var roleText = role ? role.name : user.role;
                var roleClass = 'role-' + user.role;
                var orgText = org ? org.shortName : '—';
                var orgFullName = org ? org.fullName : '—';
                var orgColor = org ? org.color : '#94a3b8';

                var statusText = user.status === 'online' ? 'Online' : 'Offline';
                var statusClass = 'status-' + user.status;

                var projectsHtml = '';
                if (user.projectIds && user.projectIds.length > 0) {
                    projectsHtml = user.projectIds.map(function (pid) {
                        return '<span class="project-tag">' + pid + '</span>';
                    }).join('');
                } else {
                    projectsHtml = '<span style="color:#999;font-size:0.75rem;">—</span>';
                }

                row.innerHTML =
                    '<td>' +
                        '<div class="user-info">' +
                            '<div class="user-name">' + self.escapeHtml(user.name) + '</div>' +
                            (user.department ? '<div class="user-department">' + self.escapeHtml(user.department) + '</div>' : '') +
                            (user.companyName ? '<div class="user-company"><i class="fas fa-building"></i> ' + self.escapeHtml(user.companyName) + '</div>' : '') +
                        '</div>' +
                    '</td>' +
                    '<td>' + self.escapeHtml(user.email) + '</td>' +
                    '<td>' +
                        '<span class="org-badge" style="background:' + orgColor + '15;color:' + orgColor + ';border:1px solid ' + orgColor + '40;">' +
                            '<strong>' + orgText + '</strong>' +
                            '<small>' + self.escapeHtml(orgFullName) + '</small>' +
                        '</span>' +
                    '</td>' +
                    '<td><span class="role-badge ' + roleClass + '">' + roleText + '</span></td>' +
                    '<td>' + projectsHtml + '</td>' +
                    '<td><span class="status-badge ' + statusClass + '">' + statusText + '</span></td>' +
                    '<td>' +
                        '<button class="action-btn edit-user-btn" data-id="' + user.id + '" title="Edit"><i class="fas fa-edit"></i></button>' +
                        '<button class="action-btn delete-user-btn" data-id="' + user.id + '" title="Delete" style="background:linear-gradient(135deg,#e74c3c,#c0392b);color:#fff;"><i class="fas fa-trash"></i></button>' +
                    '</td>';

                tbody.appendChild(row);
            });

            this.attachEventListeners();
        },

        sortUsers: function (users, sortBy) {
            return users.slice().sort(function (a, b) {
                switch (sortBy) {
                    case 'name-asc': return a.name.localeCompare(b.name);
                    case 'name-desc': return b.name.localeCompare(a.name);
                    case 'date-asc': return new Date(a.addedDate) - new Date(b.addedDate);
                    case 'date-desc': return new Date(b.addedDate) - new Date(a.addedDate);
                    case 'org-asc':
                        var orgA = ORGANIZATIONS[a.organization] ? ORGANIZATIONS[a.organization].name : '';
                        var orgB = ORGANIZATIONS[b.organization] ? ORGANIZATIONS[b.organization].name : '';
                        return orgA.localeCompare(orgB);
                    default: return 0;
                }
            });
        },

        updatePaginationInfo: function (start, end, total) {
            var pageStart = document.getElementById('page-start');
            var pageEnd = document.getElementById('page-end');
            var totalItems = document.getElementById('total-items');
            var prevBtn = document.getElementById('prev-page');
            var nextBtn = document.getElementById('next-page');

            if (pageStart) pageStart.textContent = total > 0 ? start : 0;
            if (pageEnd) pageEnd.textContent = end;
            if (totalItems) totalItems.textContent = total;
            if (prevBtn) prevBtn.disabled = this.currentPage === 1;
            if (nextBtn) nextBtn.disabled = this.currentPage * this.itemsPerPage >= total;
        },

        updateUserStats: function () {
            var total = this.users.length;
            var online = this.users.filter(function (u) { return u.status === 'online'; }).length;
            var fullAccess = this.users.filter(function (u) {
                return u.role === 'admin' || u.role === 'ig' || u.role === 'wsg';
            }).length;

            var totalEl = document.getElementById('total-users-count');
            var onlineEl = document.getElementById('online-users-count');
            var fullAccessEl = document.getElementById('admin-users-count');

            if (totalEl) totalEl.textContent = total;
            if (onlineEl) onlineEl.textContent = online;
            if (fullAccessEl) fullAccessEl.textContent = fullAccess;
        },

        initModalOptions: function () {
            var self = this;

            var orgSelect = document.getElementById('input-user-organization');
            if (orgSelect) {
                orgSelect.innerHTML = '<option value="">-- Select Organization --</option>';
                Object.keys(ORGANIZATIONS).forEach(function (k) {
                    var org = ORGANIZATIONS[k];
                    var opt = document.createElement('option');
                    opt.value = org.id;
                    opt.textContent = org.fullName;
                    orgSelect.appendChild(opt);
                });

                orgSelect.addEventListener('change', function () {
                    var org = ORGANIZATIONS[this.value];
                    self.updateRoleOptions(this.value);

                    var companyInput = document.getElementById('input-user-company');
                    if (companyInput && org) {
                        companyInput.value = org.fullName;
                    }
                });
            }

            this.updateRoleOptions('');
            this.renderModulePermissions(null);
        },

        updateRoleOptions: function (orgId) {
            var roleSelect = document.getElementById('input-user-role');
            if (!roleSelect) return;

            roleSelect.innerHTML = '<option value="">-- Select Role --</option>';

            if (!orgId) {
                roleSelect.disabled = true;
                return;
            }

            roleSelect.disabled = false;

            Object.keys(ROLES).forEach(function (k) {
                var role = ROLES[k];
                if (role.organization === orgId) {
                    var opt = document.createElement('option');
                    opt.value = role.id;
                    opt.textContent = role.name + ' (' + role.shortName + ')';
                    roleSelect.appendChild(opt);
                }
            });
        },

        renderModulePermissions: function (selectedPermissions) {
            var grid = document.getElementById('module-permissions-grid');
            if (!grid) return;

            grid.innerHTML = '';

            Object.keys(MODULES).forEach(function (moduleId) {
                var mod = MODULES[moduleId];
                var row = document.createElement('div');
                row.className = 'module-permission-row';

                var currentValue = (selectedPermissions && selectedPermissions[moduleId]) || 'none';

                var labelHtml =
                    '<div class="module-permission-label">' +
                        '<i class="fas ' + mod.icon + '"></i>' +
                        '<span>' + mod.name + '</span>' +
                    '</div>';

                var selectHtml = '<select class="module-permission-select" data-module="' + moduleId + '">';
                Object.keys(ACCESS_LEVELS).forEach(function (levelKey) {
                    var level = ACCESS_LEVELS[levelKey];
                    selectHtml += '<option value="' + levelKey + '"' +
                        (levelKey === currentValue ? ' selected' : '') + '>' +
                        level.label + '</option>';
                });
                selectHtml += '</select>';

                row.innerHTML = labelHtml + selectHtml;
                grid.appendChild(row);
            });
        },

        collectModulePermissions: function () {
            var perms = {};
            document.querySelectorAll('.module-permission-select').forEach(function (sel) {
                perms[sel.getAttribute('data-module')] = sel.value;
            });
            return perms;
        },

        setupFilterEvents: function () {
            var self = this;

            document.querySelectorAll('.filter-group').forEach(function (group) {
                var toggle = group.querySelector('.filter-toggle');
                var options = group.querySelector('.filter-options');
                if (!toggle || !options) return;

                toggle.addEventListener('click', function (e) {
                    e.stopPropagation();
                    e.preventDefault();

                    document.querySelectorAll('.filter-options').forEach(function (opt) {
                        if (opt !== options) opt.classList.remove('open', 'show');
                    });
                    options.classList.toggle('open');
                    options.classList.toggle('show');
                });

                group.querySelectorAll('.filter-option').forEach(function (option) {
                    option.addEventListener('click', function (e) {
                        e.stopPropagation();
                        e.preventDefault();

                        group.querySelectorAll('.filter-option').forEach(function (opt) {
                            opt.classList.remove('active');
                        });
                        option.classList.add('active');
                        toggle.querySelector('span').textContent = option.textContent;

                        var filterType = option.dataset.filter;
                        var filterValue = option.dataset.value;

                        UserManagement.currentFilters[filterType] = filterValue;

                        if (filterType === 'sort') UserManagement.currentPage = 1;

                        UserManagement.renderUserTable();
                        options.classList.remove('open', 'show');
                    });
                });
            });

            document.addEventListener('click', function (e) {
                if (!e.target.closest('.filter-group')) {
                    document.querySelectorAll('.filter-options').forEach(function (opt) {
                        opt.classList.remove('open', 'show');
                    });
                }
            });

            var prevBtn = document.getElementById('prev-page');
            var nextBtn = document.getElementById('next-page');

            if (prevBtn) {
                prevBtn.addEventListener('click', function () {
                    if (UserManagement.currentPage > 1) {
                        UserManagement.currentPage--;
                        UserManagement.renderUserTable();
                    }
                });
            }

            if (nextBtn) {
                nextBtn.addEventListener('click', function () {
                    var total = UserManagement.users.length;
                    var maxPage = Math.ceil(total / UserManagement.itemsPerPage);
                    if (UserManagement.currentPage < maxPage) {
                        UserManagement.currentPage++;
                        UserManagement.renderUserTable();
                    }
                });
            }
        },

        setupActionButtons: function () {
            var self = this;

            var addUserBtn = document.getElementById('add-user-btn');
            if (addUserBtn) {
                addUserBtn.addEventListener('click', function () {
                    self.openAddModal();
                });
            }

            var cancelBtn = document.getElementById('cancel-add-user');
            if (cancelBtn) {
                cancelBtn.addEventListener('click', function () {
                    self.closeModal();
                });
            }

            var refreshBtn = document.querySelector('.refresh-btn');
            if (refreshBtn) {
                refreshBtn.addEventListener('click', function () {
                    self.renderUserTable();
                });
            }

            var addForm = document.getElementById('add-user-form');
            if (addForm) {
                addForm.addEventListener('submit', function (e) {
                    e.preventDefault();
                    self.handleSubmit();
                });
            }
        },

        openAddModal: function () {
            var modalTitle = document.querySelector('#add-user-modal h3 span');
            var submitBtn = document.querySelector('#add-user-form button[type="submit"]');

            if (modalTitle) modalTitle.textContent = 'Add New User';
            if (submitBtn) {
                submitBtn.textContent = 'Add User';
                delete submitBtn.dataset.editingUserId;
            }

            var form = document.getElementById('add-user-form');
            if (form) form.reset();

            this.updateRoleOptions('');
            this.renderModulePermissions(null);

            // 重設公司名 + 合約編號
            var companyInput = document.getElementById('input-user-company');
            if (companyInput) companyInput.value = '';
            var contractInput = document.getElementById('input-user-contract');
            if (contractInput) contractInput.value = 'Contract No. DE/2024/12';

            document.querySelectorAll('.project-checkbox').forEach(function (cb) { cb.checked = false; });

            var modal = document.getElementById('add-user-modal');
            if (modal) modal.style.display = 'flex';
        },

        closeModal: function () {
            var modal = document.getElementById('add-user-modal');
            if (modal) modal.style.display = 'none';

            var form = document.getElementById('add-user-form');
            if (form) form.reset();

            var modalTitle = document.querySelector('#add-user-modal h3 span');
            var submitBtn = document.querySelector('#add-user-form button[type="submit"]');
            if (modalTitle) modalTitle.textContent = 'Add New User';
            if (submitBtn) {
                submitBtn.textContent = 'Add User';
                delete submitBtn.dataset.editingUserId;
            }
        },

        handleSubmit: function () {
            var submitBtn = document.querySelector('#add-user-form button[type="submit"]');
            var editingUserId = submitBtn ? submitBtn.dataset.editingUserId : null;

            var name = document.getElementById('input-user-name').value.trim();
            var email = document.getElementById('input-user-email').value.trim();
            var username = document.getElementById('input-user-username') ? document.getElementById('input-user-username').value.trim() : '';
            var password = document.getElementById('input-user-password') ? document.getElementById('input-user-password').value : '';
            var organization = document.getElementById('input-user-organization').value;
            var companyName = document.getElementById('input-user-company') ? document.getElementById('input-user-company').value.trim() : '';
            var contractNo = document.getElementById('input-user-contract') ? document.getElementById('input-user-contract').value.trim() : '';
            var role = document.getElementById('input-user-role').value;
            var department = document.getElementById('input-user-department').value.trim();
            var status = document.getElementById('input-user-status').value || 'online';

            if (!name) { alert('❌ Please enter Full Name.'); return; }
            if (!email) { alert('❌ Please enter Email.'); return; }
            if (!organization) { alert('❌ Please select Organization.'); return; }
            if (!role) { alert('❌ Please select Role.'); return; }

            var projectIds = [];
            document.querySelectorAll('.project-checkbox:checked').forEach(function (cb) {
                projectIds.push(cb.value);
            });

            var modulePermissions = this.collectModulePermissions();

            var groupSelect = document.getElementById('input-user-groups');
            var groupIds = [];
            if (groupSelect) {
                Array.from(groupSelect.selectedOptions).forEach(function (opt) {
                    if (opt.value) groupIds.push(opt.value);
                });
            }

            if (editingUserId) {
                var userId = parseInt(editingUserId, 10);
                var user = this.users.find(function (u) { return u.id === userId; });
                if (user) {
                    user.name = name;
                    user.email = email;
                    user.organization = organization;
                    user.companyName = companyName;
                    user.contractNo = contractNo;
                    user.role = role;
                    user.department = department;
                    user.status = status;
                    user.projectIds = projectIds;
                    user.modulePermissions = modulePermissions;
                    user.groupIds = groupIds;
                    if (username) user.username = username;
                    if (password) user.password = password;

                    alert('✅ User updated successfully!');
                }
            } else {
                var newUser = {
                    id: this.users.length ? Math.max.apply(null, this.users.map(function (u) { return u.id; })) + 1 : 1,
                    name: name,
                    email: email,
                    username: username || email.split('@')[0],
                    password: password || 'Welcome@123',
                    organization: organization,
                    companyName: companyName,
                    contractNo: contractNo,
                    role: role,
                    department: department,
                    status: status,
                    addedDate: new Date().toISOString().split('T')[0],
                    projectIds: projectIds,
                    modulePermissions: modulePermissions,
                    groupIds: groupIds,
                    passwordChanged: false,
                    passwordChangedAt: null,
                    passwordExpiresAt: null
                };
                this.users.push(newUser);

                if (window.DWSS_EmailService && typeof window.DWSS_EmailService.sendAccountIssuance === 'function') {
                    window.DWSS_EmailService.sendAccountIssuance(newUser, newUser.password).then(function (email) {
                        console.log('[UserManagement] ✓ Account email sent to', email.to);
                    });
                }

                alert('✅ User added successfully!\n\n📧 Login credentials sent to ' + email);
            }

            this.saveToStorage();
            this.renderUserTable();
            this.updateUserStats();
            this.closeModal();
        },

        attachEventListeners: function () {
            var self = this;

            document.querySelectorAll('.edit-user-btn').forEach(function (btn) {
                var newBtn = btn.cloneNode(true);
                btn.parentNode.replaceChild(newBtn, btn);

                newBtn.addEventListener('click', function () {
                    var userId = parseInt(this.getAttribute('data-id'), 10);
                    self.openEditModal(userId);
                });
            });

            document.querySelectorAll('.delete-user-btn').forEach(function (btn) {
                var newBtn = btn.cloneNode(true);
                btn.parentNode.replaceChild(newBtn, btn);

                newBtn.addEventListener('click', function () {
                    var userId = parseInt(this.getAttribute('data-id'), 10);
                    var user = self.users.find(function (u) { return u.id === userId; });
                    if (!user) return;

                    if (confirm('Are you sure you want to delete user "' + user.name + '"?\n\nThis action cannot be undone.')) {
                        self.users = self.users.filter(function (u) { return u.id !== userId; });
                        self.saveToStorage();
                        self.renderUserTable();
                        self.updateUserStats();
                        alert('✅ User deleted successfully!');
                    }
                });
            });
        },

        openEditModal: function (userId) {
            var user = this.users.find(function (u) { return u.id === userId; });
            if (!user) return;

            document.getElementById('input-user-name').value = user.name;
            document.getElementById('input-user-email').value = user.email;

            var usernameEl = document.getElementById('input-user-username');
            if (usernameEl) usernameEl.value = user.username || '';

            var passwordEl = document.getElementById('input-user-password');
            if (passwordEl) passwordEl.value = '';

            document.getElementById('input-user-organization').value = user.organization || '';
            this.updateRoleOptions(user.organization || '');
            document.getElementById('input-user-role').value = user.role || '';

            var companyInput = document.getElementById('input-user-company');
            if (companyInput) companyInput.value = user.companyName || '';

            var contractInput = document.getElementById('input-user-contract');
            if (contractInput) contractInput.value = user.contractNo || 'Contract No. DE/2024/12';

            document.getElementById('input-user-department').value = user.department || '';
            document.getElementById('input-user-status').value = user.status || 'online';

            document.querySelectorAll('.project-checkbox').forEach(function (cb) {
                cb.checked = (user.projectIds || []).indexOf(cb.value) !== -1;
            });

            this.renderModulePermissions(user.modulePermissions);

            var groupSelect = document.getElementById('input-user-groups');
            if (groupSelect) {
                Array.from(groupSelect.options).forEach(function (opt) {
                    opt.selected = (user.groupIds || []).indexOf(opt.value) !== -1;
                });
            }

            var modalTitle = document.querySelector('#add-user-modal h3 span');
            var submitBtn = document.querySelector('#add-user-form button[type="submit"]');
            if (modalTitle) modalTitle.textContent = 'Edit User';
            if (submitBtn) {
                submitBtn.textContent = 'Update User';
                submitBtn.dataset.editingUserId = userId;
            }

            var modal = document.getElementById('add-user-modal');
            if (modal) modal.style.display = 'flex';
        }
    };

    // ============================================================
    // 10. 公開 API
    // ============================================================
    window.UserManagement = UserManagement;

    window.DWSS_UserMgmt = {
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
        getRolesByOrganization: function (orgId) {
            return Object.keys(ROLES).filter(function (k) {
                return ROLES[k].organization === orgId;
            }).map(function (k) { return ROLES[k]; });
        },
        getAllModules: function () {
            return Object.keys(MODULES).map(function (k) { return MODULES[k]; });
        },

        getUserAccess: getUserAccess,
        canAccess: canAccess,

        getGroups: loadGroups,
        createGroup: createGroup,
        updateGroup: updateGroup,
        deleteGroup: deleteGroup,

        checkPageAccess: function (moduleId, requiredLevel) {
            var sessionRaw = sessionStorage.getItem('dwss_session');
            if (!sessionRaw) return false;
            var user;
            try { user = JSON.parse(sessionRaw); } catch (e) { return false; }
            return canAccess(user, moduleId, requiredLevel || 'view');
        },

        requirePageAccess: function (moduleId, requiredLevel) {
            if (!this.checkPageAccess(moduleId, requiredLevel)) {
                alert('❌ You do not have permission to access this page.');
                window.location.href = 'index.html';
                return false;
            }
            return true;
        }
    };

    console.log('[UserManagement] Loaded');
    console.log('  Organizations:', Object.keys(ORGANIZATIONS).length);
    console.log('  Roles:', Object.keys(ROLES).length);
    console.log('  Modules:', Object.keys(MODULES).length);

    document.addEventListener('DOMContentLoaded', function () {
        if (document.getElementById('users-table-body')) {
            UserManagement.init();
        }
    });

})();