// scripts/usermanagement.js
// ============================================================
// AEL DWSS User Management
// Contract No. DE/2024/12
// ============================================================

(function () {
    'use strict';

    // ============================================================
    // 1. 組織定義
    // ============================================================
    var ORGANIZATIONS = {
        'SERVICE_MANAGER': {
            id: 'SERVICE_MANAGER', name: 'Service Manager',
            fullName: 'Drainage Services Department (DSD)',
            shortName: 'DSD', color: '#2c3e50',
            description: 'Drainage Services Department — EG, IG, WSG',
            contract: 'Contract No. DE/2024/12'
        },
        'CONTRACTOR': {
            id: 'CONTRACTOR', name: 'Contractor',
            fullName: 'REC - AEL Joint Venture',
            shortName: 'REC-AEL', color: '#e74c3c',
            description: 'Main Contractor — SA, SSA, RSO',
            contract: 'Contract No. DE/2024/12'
        },
        'SUBCONTRACTOR': {
            id: 'SUBCONTRACTOR', name: 'Subcontractor',
            fullName: 'Subcontractor',
            shortName: 'SUB', color: '#f39c12',
            description: 'Subcontracted parties',
            contract: 'Contract No. DE/2024/12'
        },
        'SUPPLIER': {
            id: 'SUPPLIER', name: 'Supplier',
            fullName: 'Supplier',
            shortName: 'SUP', color: '#9b59b6',
            description: 'Material & equipment suppliers',
            contract: 'Contract No. DE/2024/12'
        },
        'SYSTEM_VENDOR': {
            id: 'SYSTEM_VENDOR', name: 'System Vendor',
            fullName: 'AEL - Associated Engineers Ltd.',
            shortName: 'AEL', color: '#3498db',
            description: 'System Administrator & Platform Provider',
            contract: 'Contract No. DE/2024/12'
        }
    };

    // ============================================================
    // 2. 角色定義
    // ============================================================
    var ROLES = {
        'eg': { id: 'eg', name: 'Engineer Grade', shortName: 'EG', organization: 'SERVICE_MANAGER', description: 'Receives accepted records for oversight', color: '#2c3e50' },
        'ig': { id: 'ig', name: 'Inspector Grade', shortName: 'IG', organization: 'SERVICE_MANAGER', description: 'Primary approver', color: '#16a085' },
        'wsg': { id: 'wsg', name: 'Works Supervisor Grade', shortName: 'WSG', organization: 'SERVICE_MANAGER', description: 'First-line reviewer', color: '#27ae60' },
        'sa': { id: 'sa', name: 'Site Agent', shortName: 'SA', organization: 'CONTRACTOR', description: 'Submit and revise records', color: '#e74c3c' },
        'ssa': { id: 'ssa', name: 'Sub-Site Agent', shortName: 'SSA', organization: 'CONTRACTOR', description: 'Submit and revise records', color: '#c0392b' },
        'rso': { id: 'rso', name: 'Registered Safety Officer', shortName: 'RSO', organization: 'CONTRACTOR', description: 'Submit safety inspection records', color: '#d35400' },
        'project_admin': { id: 'project_admin', name: 'Project Admin (Project Manager)', shortName: 'PM', organization: 'CONTRACTOR', description: 'Can add people to own contract team', color: '#8e44ad' },
        'subcontractor': { id: 'subcontractor', name: 'Subcontractor User', shortName: 'SUB', organization: 'SUBCONTRACTOR', description: 'Read-only access', color: '#f39c12' },
        'supplier': { id: 'supplier', name: 'Supplier User', shortName: 'SUP', organization: 'SUPPLIER', description: 'Read-only access', color: '#9b59b6' },
        'admin': { id: 'admin', name: 'System Administrator', shortName: 'ADMIN', organization: 'SYSTEM_VENDOR', description: 'Can add new contracts and people (full system)', color: '#3498db' }
    };

    // ============================================================
    // 3. 功能模組
    // ============================================================
    var MODULES = {
        'dashboard':       { id: 'dashboard',       name: 'Dashboard',         icon: 'fa-home' },
        'sitediary':       { id: 'sitediary',       name: 'Site Diary',        icon: 'fa-book' },
        'safetyinspect':   { id: 'safetyinspect',   name: 'Safety Inspection', icon: 'fa-clipboard-check' },
        'sitelocations':   { id: 'sitelocations',   name: 'Site Locations',    icon: 'fa-map-marked-alt' },
        'labourwage':      { id: 'labourwage',      name: 'Labour Wage',       icon: 'fa-money-bill-wave' },
        'settings':        { id: 'settings',        name: 'System Settings',   icon: 'fa-cogs' },
        'usermanagement':  { id: 'usermanagement',  name: 'User Management',   icon: 'fa-users' },
        'ssss':            { id: 'ssss',            name: 'SSSS / 4S',         icon: 'fa-shield-alt' }
    };

    // ============================================================
    // 4. 存取級別
    // ============================================================
    var ACCESS_LEVELS = {
        'none':    { label: 'No Access',      value: 0, color: '#94a3b8' },
        'view':    { label: 'View Only',      value: 1, color: '#3498db' },
        'edit':    { label: 'Edit & Submit',  value: 2, color: '#27ae60' },
        'approve': { label: 'Edit & Approve', value: 3, color: '#f39c12' },
        'admin':   { label: 'Full Admin',     value: 4, color: '#e74c3c' }
    };

    // ============================================================
    // 5. 角色預設模組權限
    // ============================================================
    var ROLE_TEMPLATES = {
        'eg':   { modules: { dashboard:'view', sitediary:'view', safetyinspect:'view', sitelocations:'view', labourwage:'view', settings:'view', usermanagement:'view', ssss:'view' } },
        'ig':   { modules: { dashboard:'view', sitediary:'approve', safetyinspect:'approve', sitelocations:'view', labourwage:'approve', settings:'view', usermanagement:'view', ssss:'view' } },
        'wsg':  { modules: { dashboard:'view', sitediary:'approve', safetyinspect:'view', sitelocations:'view', labourwage:'view', settings:'view', usermanagement:'view', ssss:'view' } },
        'sa':   { modules: { dashboard:'view', sitediary:'edit', safetyinspect:'edit', sitelocations:'edit', labourwage:'edit', settings:'view', usermanagement:'view', ssss:'view' } },
        'ssa':  { modules: { dashboard:'view', sitediary:'edit', safetyinspect:'edit', sitelocations:'view', labourwage:'edit', settings:'view', usermanagement:'view', ssss:'view' } },
        'rso':  { modules: { dashboard:'view', sitediary:'view', safetyinspect:'edit', sitelocations:'view', labourwage:'view', settings:'view', usermanagement:'view', ssss:'view' } },
        'project_admin': { modules: { dashboard:'edit', sitediary:'edit', safetyinspect:'edit', sitelocations:'edit', labourwage:'edit', settings:'edit', usermanagement:'edit', ssss:'edit' } },
        'subcontractor': { modules: { dashboard:'view', sitediary:'view', safetyinspect:'view', sitelocations:'view', labourwage:'view', settings:'view', usermanagement:'view', ssss:'none' } },
        'supplier':      { modules: { dashboard:'none', sitediary:'none', safetyinspect:'none', sitelocations:'view', labourwage:'view', settings:'view', usermanagement:'view', ssss:'none' } },
        'admin':         { modules: { dashboard:'admin', sitediary:'admin', safetyinspect:'admin', sitelocations:'admin', labourwage:'admin', settings:'admin', usermanagement:'admin', ssss:'admin' } }
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
            // System Admin — can add new contracts and people
            { id: 1,  name:'Admin',              email:'admin@ael-dwss.com',      username:'admin',     password:'admin123',    organization:'SYSTEM_VENDOR',  companyName:'AEL - Associated Engineers Ltd.',    contractNo:'Contract No. DE/2026/05', role:'admin',         department:'System Administration',   status:'online',  addedDate:'2024-01-15', projectIds:[], groupIds:[], passwordChanged:false, passwordChangedAt:null, passwordExpiresAt:null },
            // DSD (existing)
            { id: 2,  name:'Kenneth Daluz',      email:'kenneth.daluz@dsd.gov.hk', username:'kenneth',  password:'officer123',  organization:'SERVICE_MANAGER', companyName:'Drainage Services Department (DSD)', contractNo:'Contract No. DE/2024/06', role:'eg',            department:'Engineer Grade',         status:'online',  addedDate:'2024-02-10', projectIds:['DE/2024/06'], groupIds:[], passwordChanged:false, passwordChangedAt:null, passwordExpiresAt:null },
            { id: 3,  name:'TANG Chi Long, Gary', email:'gcifang@dsd.gov.hk',       username:'garytang',  password:'aei123',      organization:'SERVICE_MANAGER', companyName:'Drainage Services Department (DSD)', contractNo:'Contract No. DE/2024/06', role:'ig',            department:'Inspector Grade',        status:'online',  addedDate:'2024-02-15', projectIds:['DE/2024/06'], groupIds:[], passwordChanged:false, passwordChangedAt:null, passwordExpiresAt:null },
            { id: 4,  name:'FUNG Wai Ching',     email:'wcfung04@dsd.gov.hk',      username:'wcfung',   password:'wsg123',      organization:'SERVICE_MANAGER', companyName:'Drainage Services Department (DSD)', contractNo:'Contract No. DE/2025/07', role:'wsg',           department:'Works Supervisor Grade', status:'online',  addedDate:'2024-03-01', projectIds:['DE/2025/07'], groupIds:[], passwordChanged:false, passwordChangedAt:null, passwordExpiresAt:null },
            { id: 10, name:'CHA Chi Ming',       email:'cmcha02@dsd.gov.hk',       username:'cmcha',    password:'ig123',       organization:'SERVICE_MANAGER', companyName:'Drainage Services Department (DSD)', contractNo:'Contract No. DE/2025/07', role:'ig',            department:'Inspector Grade',        status:'online',  addedDate:'2024-04-20', projectIds:['DE/2025/07'], groupIds:[], passwordChanged:false, passwordChangedAt:null, passwordExpiresAt:null },
            // ---- CMP User List (DE202605) — Contract No. DE/2026/05 ----
            // Project Admin (Project Manager): can add people to own contract team
            { id: 11, name:'Eddie Chan',         email:'eddiechan@de202605jv.com', username:'eddiechan', password:'Welcome@123', organization:'CONTRACTOR', companyName:'REC - AEL JV', contractNo:'Contract No. DE/2026/05', role:'project_admin', department:'JV Representative (REC)', status:'online', addedDate:'2026-10-26', projectIds:['DE/2026/05'], groupIds:[], passwordChanged:false, passwordChangedAt:null, passwordExpiresAt:null },
            { id: 12, name:'Nelson Ng',          email:'nelsonng@de202605jv.com',  username:'nelsonng',  password:'Welcome@123', organization:'CONTRACTOR', companyName:'REC - AEL JV', contractNo:'Contract No. DE/2026/05', role:'project_admin', department:'JV Representative (AEL)', status:'online', addedDate:'2026-10-26', projectIds:['DE/2026/05'], groupIds:[], passwordChanged:false, passwordChangedAt:null, passwordExpiresAt:null },
            { id: 13, name:'Jeff Wong',          email:'jeffwong@de202605jv.com',  username:'jeffwong',  password:'Welcome@123', organization:'CONTRACTOR', companyName:'REC - AEL JV', contractNo:'Contract No. DE/2026/05', role:'project_admin', department:'Contract Manager, DE/2026/05', status:'online', addedDate:'2026-10-26', projectIds:['DE/2026/05'], groupIds:[], passwordChanged:false, passwordChangedAt:null, passwordExpiresAt:null },
            // Site Agent (Contract Admin)
            { id: 14, name:'Kan Cheung',         email:'kancheung@de202605jv.com', username:'kancheung', password:'Welcome@123', organization:'CONTRACTOR', companyName:'REC - AEL JV', contractNo:'Contract No. DE/2026/05', role:'sa', department:'Site Agent', status:'online', addedDate:'2026-10-26', projectIds:['DE/2026/05'], groupIds:[], passwordChanged:false, passwordChangedAt:null, passwordExpiresAt:null },
            // Sub-Site Agents
            { id: 15, name:'Alan Wong',          email:'alanwong@de202605jv.com',  username:'alanwong',  password:'Welcome@123', organization:'CONTRACTOR', companyName:'REC - AEL JV', contractNo:'Contract No. DE/2026/05', role:'ssa', department:'Sub-site Agent', status:'online', addedDate:'2026-10-26', projectIds:['DE/2026/05'], groupIds:[], passwordChanged:false, passwordChangedAt:null, passwordExpiresAt:null },
            { id: 16, name:'Marco Kong',         email:'marcokong@de202605jv.com', username:'marcokong', password:'Welcome@123', organization:'CONTRACTOR', companyName:'REC - AEL JV', contractNo:'Contract No. DE/2026/05', role:'ssa', department:'Sub-site Agent', status:'online', addedDate:'2026-10-26', projectIds:['DE/2026/05'], groupIds:[], passwordChanged:false, passwordChangedAt:null, passwordExpiresAt:null },
            { id: 17, name:'Wong Chi Keung',     email:'keungwong@de202605jv.com', username:'keungwong', password:'Welcome@123', organization:'CONTRACTOR', companyName:'REC - AEL JV', contractNo:'Contract No. DE/2026/05', role:'ssa', department:'Sub-site Agent', status:'online', addedDate:'2026-10-26', projectIds:['DE/2026/05'], groupIds:[], passwordChanged:false, passwordChangedAt:null, passwordExpiresAt:null },
            { id: 18, name:'Ivan Lee',           email:'ivanlee@de202605jv.com',   username:'ivanlee',   password:'Welcome@123', organization:'CONTRACTOR', companyName:'REC - AEL JV', contractNo:'Contract No. DE/2026/05', role:'ssa', department:'Sub-site Agent', status:'online', addedDate:'2026-10-26', projectIds:['DE/2026/05'], groupIds:[], passwordChanged:false, passwordChangedAt:null, passwordExpiresAt:null },
            // Safety Officer
            { id: 19, name:'Manklin Ho',         email:'manklinho@de202605jv.com', username:'manklinho', password:'Welcome@123', organization:'CONTRACTOR', companyName:'REC - AEL JV', contractNo:'Contract No. DE/2026/05', role:'rso', department:'Safety Officer', status:'online', addedDate:'2026-10-26', projectIds:['DE/2026/05'], groupIds:[], passwordChanged:false, passwordChangedAt:null, passwordExpiresAt:null },
            // Contract Supporting Engineer
            { id: 20, name:'James Chan',         email:'jameschan@de202605jv.com', username:'jameschan', password:'Welcome@123', organization:'CONTRACTOR', companyName:'REC - AEL JV', contractNo:'Contract No. DE/2026/05', role:'ssa', department:'Contract Supporting Engineer', status:'online', addedDate:'2026-10-26', projectIds:['DE/2026/05'], groupIds:[], passwordChanged:false, passwordChangedAt:null, passwordExpiresAt:null }
        ],

        currentFilters: { organization: 'all', role: 'all', status: 'all', project: 'current', sort: 'name-asc' },

        onlineKeys: {},
        isUserOnline: function (user) {
            if (!user) return false;
            var keys = this.onlineKeys || {};
            var id = String(user.id || '').toLowerCase();
            var name = String(user.username || '').toLowerCase();
            return !!(keys[id] || keys[name]);
        },
        loadOnlineStatus: function () {
            var self = this;
            return fetch('/api/auth/online', { cache: 'no-store' })
                .then(function (res) { return res.ok ? res.json() : { online: [] }; })
                .then(function (body) {
                    var map = {};
                    (body.online || []).forEach(function (s) {
                        if (s.id) map[String(s.id).toLowerCase()] = true;
                        if (s.username) map[String(s.username).toLowerCase()] = true;
                    });
                    self.onlineKeys = map;
                })
                .catch(function () { self.onlineKeys = self.onlineKeys || {}; });
        },

        currentPage: 1,
        itemsPerPage: 10,
        selectedGroupIds: new Set(),

        // ============================================================
        // INIT
        // ============================================================
        init: function () {
            this.loadFromStorage();
            var self = this;
            this.loadFromServer().then(function () {
                self.renderUserTable();
                self.updateUserStats();
            });
            this.renderUserTable();
            this.setupFilterEvents();
            this.setupColumnSortHeaders();
            this.setupActionButtons();
            this.updateUserStats();
            this.initModalOptions();

            // ★ New pickers
            this.renderProjectCheckboxes([]);
            this.setupGroupsPicker();
            this.renderGroupsList('');
        },

        loadFromStorage: function () {
            // Seed list embedded in this.users is the source of truth for new accounts.
            var seedUsers = (this.users || []).slice();
            var byId = {};
            var byName = {};
            seedUsers.forEach(function (u) {
                byId[String(u.id)] = u;
                if (u.username) byName[String(u.username).toLowerCase()] = u;
            });
            try {
                var stored = localStorage.getItem(USERS_KEY);
                if (stored) {
                    var parsed = JSON.parse(stored);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        parsed.forEach(function (u) {
                            if (!u) return;
                            var key = String(u.id);
                            var nameKey = u.username ? String(u.username).toLowerCase() : '';
                            var seedHit = byId[key] || (nameKey && byName[nameKey]);
                            if (seedHit) {
                                // Union projectIds so testing assignments on other contracts are kept
                                var target = byId[key] || byName[nameKey];
                                var seedPids = target.projectIds || [];
                                var storedPids = u.projectIds || [];
                                var seen = {};
                                var merged = [];
                                seedPids.concat(storedPids).forEach(function (pid) {
                                    if (!pid || seen[pid]) return;
                                    seen[pid] = true;
                                    merged.push(pid);
                                });
                                target.projectIds = merged;
                                if (u.contractNo && !target.contractNo) target.contractNo = u.contractNo;
                                return;
                            }
                            byId[key] = u;
                        });
                    }
                }
            } catch (e) { console.warn('[UserManagement] Failed to load:', e); }
            this.users = Object.keys(byId).map(function (k) { return byId[k]; }).sort(function (a, b) {
                return (a.id || 0) - (b.id || 0);
            });
            // Persist merged list so refresh keeps everyone
            // Testing split for non-CMP seed users
            var testProjectById = { '2':['DE/2024/06'], '3':['DE/2024/06'], '4':['DE/2025/07'], '10':['DE/2025/07'] };
            this.users.forEach(function (u) {
                var key = String(u.id);
                if (testProjectById[key]) u.projectIds = testProjectById[key].slice();
                if (u.role === 'admin') u.projectIds = [];
            });
            this.saveToStorage();
        },

        loadFromServer: function () {
            var self = this;
            return fetch('/api/records/usersDb', { cache: 'no-store' })
                .then(function (res) { return res.ok ? res.json() : null; })
                .then(function (body) {
                    var rows = (body && (body.records || body.data || body)) || [];
                    if (!Array.isArray(rows) || !rows.length) return;
                    var byId = {};
                    self.users.forEach(function (u) { byId[String(u.id)] = u; });
                    rows.forEach(function (row) {
                        var u = row.data || row;
                        if (typeof u === 'string') {
                            try { u = JSON.parse(u); } catch (e) { return; }
                        }
                        if (!u || (!u.id && !u.username)) return;
                        var id = String(u.id != null ? u.id : u.username);
                        // Prefer server record if present; fill missing seed users stay
                        if (!byId[id]) byId[id] = u;
                        else {
                            // merge username if missing on stored
                            if (!byId[id].username && u.username) byId[id].username = u.username;
                        }
                    });
                    self.users = Object.keys(byId).map(function (k) { return byId[k]; });
                    self.saveToStorage();
                })
                .catch(function () { /* local mode */ });
        },

        saveToStorage: function () {
            try { localStorage.setItem(USERS_KEY, JSON.stringify(this.users)); }
            catch (e) { console.error('[UserManagement] Failed to save:', e); }
        },

        escapeHtml: function (str) {
            if (!str) return '';
            return String(str).replace(/[&<>"']/g, function (m) {
                return ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[m];
            });
        },

        // ============================================================
        // TABLE RENDERING
        // ============================================================
        renderUserTable: function () {
            var tbody = document.getElementById('users-table-body');
            var noResults = document.getElementById('no-results-message');
            if (!tbody) return;
            tbody.innerHTML = '';
            var self = this;

            var currentPid = null;
            try {
                if (window.DWSS_Permissions && typeof window.DWSS_Permissions.getCurrentProject === 'function') {
                    currentPid = window.DWSS_Permissions.getCurrentProject();
                } else {
                    currentPid = sessionStorage.getItem('currentProjectId');
                }
            } catch (e) { currentPid = sessionStorage.getItem('currentProjectId'); }
            if (currentPid === 'ALL') currentPid = null;

            var projectLabel = document.getElementById('current-project-label');
            if (projectLabel) projectLabel.textContent = currentPid || 'All';

            var filteredUsers = this.users.filter(function (user) {
                if (self.currentFilters.organization !== 'all' && user.organization !== self.currentFilters.organization) return false;
                if (self.currentFilters.role !== 'all' && user.role !== self.currentFilters.role) return false;
                // Project filter: current | all | specific project id
                var pf = self.currentFilters.project || 'current';
                if (pf !== 'all') {
                    var targetPid = (pf === 'current') ? currentPid : pf;
                    if (targetPid) {
                        var pids = user.projectIds || [];
                        // Admin with empty projectIds = all projects
                        if (user.role === 'admin' && (!pids || !pids.length)) {
                            // keep admin visible
                        } else if (pids.indexOf(targetPid) === -1) {
                            return false;
                        }
                    }
                }
                return true;
            });

            filteredUsers = this.sortUsers(filteredUsers, this.currentFilters.sort);

            var totalUsers = filteredUsers.length;
            var startIndex = (this.currentPage - 1) * this.itemsPerPage;
            var endIndex = Math.min(startIndex + this.itemsPerPage, totalUsers);
            var pagedUsers = filteredUsers.slice(startIndex, endIndex);

            this.updatePaginationInfo(startIndex + 1, endIndex, totalUsers);

            if (noResults) noResults.style.display = pagedUsers.length === 0 ? 'block' : 'none';

            pagedUsers.forEach(function (user) {
                var row = document.createElement('tr');
                var role = ROLES[user.role];
                var org = ORGANIZATIONS[user.organization];

                var roleText = role ? role.name : user.role;
                var roleClass = 'role-' + user.role;
                var orgText = org ? org.shortName : '—';
                var orgFullName = org ? org.fullName : '—';
                var orgColor = org ? org.color : '#94a3b8';

                var projectsHtml = '';
                if (user.projectIds && user.projectIds.length > 0) {
                    projectsHtml = user.projectIds.map(function (pid) {
                        return '<span class="project-tag">' + pid + '</span>';
                    }).join('');
                } else {
                    projectsHtml = '<span style="color:#999;font-size:0.75rem;">—</span>';
                }

                // Display name vs login username (never use current session user)
                var displayName = user.name || user.fullName || '—';
                var loginName = user.username || user.loginUsername || (user.email ? String(user.email).split('@')[0] : '—');
                if (loginName === 'admin' && user.role !== 'admin' && user.email) {
                    loginName = String(user.email).split('@')[0];
                }

                row.innerHTML =
                    '<td>' +
                        '<div class="user-info">' +
                            '<div class="user-name">' + self.escapeHtml(displayName) + '</div>' +
                            (user.department ? '<div class="user-department">' + self.escapeHtml(user.department) + '</div>' : '') +
                            (user.companyName ? '<div class="user-company"><i class="fas fa-building"></i> ' + self.escapeHtml(user.companyName) + '</div>' : '') +
                        '</div>' +
                    '</td>' +
                    '<td><code style="font-size:0.85rem;background:#f1f5f9;padding:2px 6px;border-radius:4px;">' + self.escapeHtml(loginName) + '</code>' + (user.status === 'offline' ? ' <span style="color:#b91c1c;font-size:0.7rem;">(disabled)</span>' : '') + '</td>' +
                    '<td>' + self.escapeHtml(user.email) + '</td>' +
                    '<td>' +
                        '<span class="org-badge" style="background:' + orgColor + '15;color:' + orgColor + ';border:1px solid ' + orgColor + '40;">' +
                            '<strong>' + orgText + '</strong>' +
                            '<small>' + self.escapeHtml(orgFullName) + '</small>' +
                        '</span>' +
                    '</td>' +
                    '<td><span class="role-badge ' + roleClass + '">' + roleText + '</span></td>' +
                    '<td>' + projectsHtml + '</td>' +
                    '<td>' + (function () {
                        var cu = (window.DWSS_Permissions && window.DWSS_Permissions.getCurrentUser) ? window.DWSS_Permissions.getCurrentUser() : null;
                        var isSysAdmin = cu && cu.role === 'admin';
                        var isPM = cu && cu.role === 'project_admin';
                        if (!isSysAdmin && !isPM) return '<span style="color:#94a3b8;font-size:0.75rem;">—</span>';
                        var html = '<button class="action-btn edit-user-btn" data-id="' + user.id + '" title="Edit"><i class="fas fa-edit"></i></button>';
                        if (isSysAdmin) {
                            var st = user.status === 'offline' ? 'offline' : 'online';
                            if (st === 'online') {
                                html += '<button class="action-btn disable-user-btn" data-id="' + user.id + '" title="Disable account" style="background:#f59e0b;color:#fff;"><i class="fas fa-user-slash"></i></button>';
                            } else {
                                html += '<button class="action-btn enable-user-btn" data-id="' + user.id + '" title="Enable account" style="background:#10b981;color:#fff;"><i class="fas fa-user-check"></i></button>';
                            }
                            html += '<button class="action-btn delete-user-btn" data-id="' + user.id + '" title="Delete" style="background:linear-gradient(135deg,#e74c3c,#c0392b);color:#fff;"><i class="fas fa-trash"></i></button>';
                        }
                        return html;
                    })() + '</td>';

                tbody.appendChild(row);
            });

            this.attachEventListeners();
            this.updateSortHeaderUI();
        },

        sortUsers: function (users, sortBy) {
            return users.slice().sort(function (a, b) {
                function str(v) { return String(v || '').toLowerCase(); }
                function orgName(u) {
                    var o = ORGANIZATIONS[u.organization];
                    return o ? o.name : (u.organization || '');
                }
                function roleName(u) {
                    var r = ROLES[u.role];
                    return r ? r.name : (u.role || '');
                }
                function proj(u) {
                    return (u.projectIds || []).join(',');
                }
                switch (sortBy) {
                    case 'name-asc':  return str(a.name).localeCompare(str(b.name));
                    case 'name-desc': return str(b.name).localeCompare(str(a.name));
                    case 'username-asc':  return str(a.username).localeCompare(str(b.username));
                    case 'username-desc': return str(b.username).localeCompare(str(a.username));
                    case 'email-asc':  return str(a.email).localeCompare(str(b.email));
                    case 'email-desc': return str(b.email).localeCompare(str(a.email));
                    case 'org-asc':  return str(orgName(a)).localeCompare(str(orgName(b)));
                    case 'org-desc': return str(orgName(b)).localeCompare(str(orgName(a)));
                    case 'role-asc':  return str(roleName(a)).localeCompare(str(roleName(b)));
                    case 'role-desc': return str(roleName(b)).localeCompare(str(roleName(a)));
                    case 'project-asc':  return str(proj(a)).localeCompare(str(proj(b)));
                    case 'project-desc': return str(proj(b)).localeCompare(str(proj(a)));
                    case 'date-asc':  return new Date(a.addedDate || 0) - new Date(b.addedDate || 0);
                    case 'date-desc': return new Date(b.addedDate || 0) - new Date(a.addedDate || 0);
                    default: return str(a.name).localeCompare(str(b.name));
                }
            });
        },

        /** Toggle sort when clicking a column header */
        toggleColumnSort: function (column) {
            var cur = this.currentFilters.sort || 'name-asc';
            var asc = column + '-asc';
            var desc = column + '-desc';
            if (cur === asc) this.currentFilters.sort = desc;
            else this.currentFilters.sort = asc;
            this.currentPage = 1;
            this.updateSortHeaderUI();
            this.renderUserTable();
        },

        updateSortHeaderUI: function () {
            var cur = this.currentFilters.sort || 'name-asc';
            document.querySelectorAll('#users-table thead th.sortable').forEach(function (th) {
                th.classList.remove('sort-asc', 'sort-desc');
                var col = th.getAttribute('data-sort');
                if (!col) return;
                if (cur === col + '-asc') th.classList.add('sort-asc');
                else if (cur === col + '-desc') th.classList.add('sort-desc');
            });
        },

        setupColumnSortHeaders: function () {
            var self = this;
            document.querySelectorAll('#users-table thead th.sortable').forEach(function (th) {
                th.style.cursor = 'pointer';
                th.addEventListener('click', function () {
                    var col = th.getAttribute('data-sort');
                    if (col) self.toggleColumnSort(col);
                });
            });
            this.updateSortHeaderUI();
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
            // Count users visible under current project filter (same rules as table)
            var self = this;
            var currentPid = null;
            try {
                if (window.DWSS_Permissions && typeof window.DWSS_Permissions.getCurrentProject === 'function') {
                    currentPid = window.DWSS_Permissions.getCurrentProject();
                } else {
                    currentPid = sessionStorage.getItem('currentProjectId');
                }
            } catch (e) { currentPid = sessionStorage.getItem('currentProjectId'); }
            if (currentPid === 'ALL') currentPid = null;

            var visible = this.users.filter(function (user) {
                var pf = self.currentFilters.project || 'current';
                if (pf === 'all') return true;
                var targetPid = (pf === 'current') ? currentPid : pf;
                if (!targetPid) return true;
                var pids = user.projectIds || [];
                if (user.role === 'admin' && (!pids || !pids.length)) return true;
                return pids.indexOf(targetPid) !== -1;
            });

            var total = visible.length;
            var fullAccess = visible.filter(function (u) {
                return u.role === 'admin' || u.role === 'project_admin' || u.role === 'ig' || u.role === 'wsg';
            }).length;

            var totalEl = document.getElementById('total-users-count');
            var fullAccessEl = document.getElementById('admin-users-count');
            var projectLabel = document.getElementById('current-project-label');

            if (totalEl) totalEl.textContent = total;
            if (fullAccessEl) fullAccessEl.textContent = fullAccess;
            if (projectLabel) projectLabel.textContent = currentPid || 'All';
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
                    if (companyInput && org) companyInput.value = org.fullName;
                });
            }

            this.updateRoleOptions('');
            this.renderModulePermissions(null);
        },

        updateRoleOptions: function (orgId) {
            var self = this;
            var roleSelect = document.getElementById('input-user-role');
            if (!roleSelect) return;

            roleSelect.innerHTML = '<option value="">-- Select Role --</option>';

            if (!orgId) {
                roleSelect.disabled = true;
                this.renderModulePermissions(null);
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

            // When role changes, apply that role's default module permissions
            roleSelect.onchange = function () {
                self.applyRoleModulePermissions(roleSelect.value);
            };
            // Org just changed → no role selected yet → clear modules until role is chosen
            if (!roleSelect.value) {
                self.renderModulePermissions(null);
            }
        },

        /** Fill Module Permissions grid from ROLE_TEMPLATES for the selected role */
        applyRoleModulePermissions: function (roleId) {
            var template = roleId && ROLE_TEMPLATES[roleId] ? ROLE_TEMPLATES[roleId].modules : null;
            this.renderModulePermissions(template);
            var hint = document.getElementById('module-permissions-hint');
            if (hint) {
                if (roleId && ROLES[roleId]) {
                    hint.textContent = 'Defaults for role: ' + ROLES[roleId].name + ' (you can still adjust)';
                } else {
                    hint.textContent = 'Select a role to load default module permissions';
                }
            }
        },

        renderModulePermissions: function (selectedPermissions) {
            var grid = document.getElementById('module-permissions-grid');
            if (!grid) return;

            grid.innerHTML = '';

            // Hint line
            var existingHint = document.getElementById('module-permissions-hint');
            if (!existingHint) {
                var hintEl = document.createElement('p');
                hintEl.id = 'module-permissions-hint';
                hintEl.style.cssText = 'font-size:0.8rem;color:#64748b;margin:0 0 8px 0;';
                hintEl.textContent = selectedPermissions
                    ? 'Module access based on selected role (adjustable)'
                    : 'Select a role to load default module permissions';
                grid.parentNode.insertBefore(hintEl, grid);
            }

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

        // ============================================================
        // PROJECTS (from storage with fallback)
        // ============================================================
        getProjectsFromStorage: function () {
            // Merge ALL known contracts/projects so Add User can assign any contract
            var byId = {};
            function add(id, name) {
                if (!id) return;
                id = String(id);
                if (!byId[id]) byId[id] = { id: id, name: name || id };
                else if (name && name !== id) byId[id].name = name;
            }

            // 1) Dedicated contract/project stores
            var keys = ['dwss_contracts', 'projects', 'dwss_projects', 'projectList', 'allProjects', 'ael_dwss_projects'];
            keys.forEach(function (key) {
                try {
                    var raw = localStorage.getItem(key);
                    if (!raw) return;
                    var arr = JSON.parse(raw);
                    if (!Array.isArray(arr)) return;
                    arr.forEach(function (p) {
                        var id = p.contractNo || p.id || p.code || p.name;
                        var name = p.name || p.contractNo || p.id || p.code;
                        add(id, name);
                    });
                } catch (e) {}
            });

            // 2) Any projectIds already assigned to users (recovers testing data on other contracts)
            try {
                (this.users || []).forEach(function (u) {
                    (u.projectIds || []).forEach(function (pid) { add(pid, pid); });
                });
            } catch (e) {}

            // 3) Safe defaults if still empty
            if (!Object.keys(byId).length) {
                add('DE/2026/05', 'DE202605 Main Works');
                add('DE/2024/06', 'DE/2024/06');
                add('DE/2025/07', 'DE/2025/07');
            }

            return Object.keys(byId).sort().map(function (k) { return byId[k]; });
        },

        renderProjectCheckboxes: function (checkedProjectIds) {
            var container = document.getElementById('project-checkboxes-container');
            if (!container) return;

            checkedProjectIds = (checkedProjectIds || []).map(String);
            container.innerHTML = '';

            var projects = this.getProjectsFromStorage();

            if (!projects.length) {
                container.innerHTML = '<p style="color:#64748b;font-size:0.85rem;">No contracts yet. System Admin can add contracts under Contracts &amp; Teams.</p>';
                return;
            }

            projects.forEach(function (p) {
                var label = document.createElement('label');
                label.style.cssText = 'display:block;margin:4px 0;';
                var cb = document.createElement('input');
                cb.type = 'checkbox';
                cb.className = 'project-checkbox';
                cb.value = p.id;
                cb.checked = checkedProjectIds.indexOf(String(p.id)) !== -1;

                label.appendChild(cb);
                label.appendChild(document.createTextNode(' ' + (p.name === p.id ? p.id : (p.id + ' — ' + p.name))));
                container.appendChild(label);
            });
        },

        // ============================================================
        // GROUPS (checkbox picker)
        // ============================================================
        getGroups: function () {
            return loadGroups();
        },

        setupGroupsPicker: function () {
            var self = this;
            var searchEl = document.getElementById('user-groups-search');
            var allBtn   = document.getElementById('user-groups-select-all');
            var clearBtn = document.getElementById('user-groups-clear-all');

            if (searchEl) {
                searchEl.addEventListener('input', function () {
                    self.renderGroupsList(searchEl.value);
                });
            }
            if (allBtn) {
                allBtn.addEventListener('click', function () {
                    var q = (searchEl && searchEl.value || '').toLowerCase();
                    self.getGroups().forEach(function (g) {
                        var name = (g.name || g.id || '').toLowerCase();
                        if (q && name.indexOf(q) === -1) return;
                        self.selectedGroupIds.add(g.id);
                    });
                    self.renderGroupsList(searchEl ? searchEl.value : '');
                    self.updateGroupsCount();
                });
            }
            if (clearBtn) {
                clearBtn.addEventListener('click', function () {
                    self.selectedGroupIds.clear();
                    self.renderGroupsList(searchEl ? searchEl.value : '');
                    self.updateGroupsCount();
                });
            }
        },

        renderGroupsList: function (filterText) {
            var listEl = document.getElementById('user-groups-list');
            if (!listEl) return;

            listEl.innerHTML = '';
            var groups = this.getGroups();
            var query = (filterText || '').trim().toLowerCase();

            if (!groups.length) {
                var empty = document.createElement('div');
                empty.className = 'team-picker-empty';
                empty.textContent = 'No groups defined yet.';
                listEl.appendChild(empty);
                this.updateGroupsCount();
                return;
            }

            var self = this;
            var shown = 0;
            groups.forEach(function (g) {
                var name = g.name || g.id || '';
                if (query && name.toLowerCase().indexOf(query) === -1) return;
                shown++;

                var label = document.createElement('label');
                if (self.selectedGroupIds.has(g.id)) label.classList.add('checked');

                var cb = document.createElement('input');
                cb.type = 'checkbox';
                cb.value = g.id;
                cb.checked = self.selectedGroupIds.has(g.id);
                cb.addEventListener('change', function () {
                    if (cb.checked) {
                        self.selectedGroupIds.add(g.id);
                        label.classList.add('checked');
                    } else {
                        self.selectedGroupIds.delete(g.id);
                        label.classList.remove('checked');
                    }
                    self.updateGroupsCount();
                });

                var nameSpan = document.createElement('span');
                nameSpan.className = 'user-name';
                nameSpan.textContent = name;

                var descSpan = document.createElement('span');
                descSpan.className = 'user-role';
                descSpan.textContent = (g.description || '').substring(0, 20) || 'GROUP';

                label.appendChild(cb);
                label.appendChild(nameSpan);
                label.appendChild(descSpan);
                listEl.appendChild(label);
            });

            if (shown === 0) {
                var nm = document.createElement('div');
                nm.className = 'team-picker-empty';
                nm.textContent = 'No matching groups.';
                listEl.appendChild(nm);
            }

            this.updateGroupsCount();
        },

        updateGroupsCount: function () {
            var el = document.getElementById('user-groups-count');
            if (el) el.textContent = String(this.selectedGroupIds.size);
        },

        setSelectedGroups: function (ids) {
            this.selectedGroupIds = new Set((ids || []).map(String));
            this.renderGroupsList('');
            this.updateGroupsCount();
        },

        getSelectedGroups: function () {
            return Array.from(this.selectedGroupIds);
        },

        // ============================================================
        // FILTER EVENTS
        // ============================================================
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
                        UserManagement.currentPage = 1;

                        UserManagement.renderUserTable();
                        UserManagement.updateUserStats();
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

        // ============================================================
        // ACTION BUTTONS
        // ============================================================
        setupActionButtons: function () {
            var self = this;

            var addUserBtn = document.getElementById('add-user-btn');
            if (addUserBtn) {
                var cu = window.DWSS_Permissions && window.DWSS_Permissions.getCurrentUser
                    ? window.DWSS_Permissions.getCurrentUser() : null;
                var canCreate = !!(cu && (cu.role === 'admin' || cu.role === 'project_admin'));
                if (!canCreate) {
                    addUserBtn.style.display = 'none';
                } else {
                    addUserBtn.addEventListener('click', function () { self.openAddModal(); });
                }
            }

            var cancelBtn = document.getElementById('cancel-add-user');
            if (cancelBtn) {
                cancelBtn.addEventListener('click', function () { self.closeModal(); });
            }

            var refreshBtn = document.querySelector('.refresh-btn');
            if (refreshBtn) {
                refreshBtn.addEventListener('click', function () {
                    self.loadFromStorage();
                    self.loadFromServer().then(function () {
                        self.renderUserTable();
                        self.updateUserStats();
                    });
                    self.renderUserTable();
                    self.updateUserStats();
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

        // ============================================================
        // MODAL
        // ============================================================
        openAddModal: function () {
            var currentUser = (window.DWSS_Permissions && window.DWSS_Permissions.getCurrentUser) ? window.DWSS_Permissions.getCurrentUser() : null;
            // System Admin or Project Admin can create users
            var allowed = currentUser && (currentUser.role === 'admin' || currentUser.role === 'project_admin');
            if (!allowed) {
                alert('Only System Admin or Project Admin can add a new user.');
                return;
            }

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

            var companyInput = document.getElementById('input-user-company');
            if (companyInput) companyInput.value = (currentUser && currentUser.companyName) ? currentUser.companyName : '';
            var contractInput = document.getElementById('input-user-contract');
            var defaultContract = (currentUser && currentUser.contractNo) ? currentUser.contractNo : 'Contract No. DE/2026/05';
            if (contractInput) {
                contractInput.value = defaultContract;
                if (currentUser && currentUser.role === 'project_admin') {
                    contractInput.readOnly = true;
                } else {
                    contractInput.readOnly = false;
                }
            }

            // ★ Reset pickers
            this.renderProjectCheckboxes([]);
            this.selectedGroupIds.clear();
            this.renderGroupsList('');
            this.updateGroupsCount();
            var searchEl = document.getElementById('user-groups-search');
            if (searchEl) searchEl.value = '';

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

        // ============================================================
        // SUBMIT
        // ============================================================
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

            // ★ Read pickers
            var projectIds = [];
            document.querySelectorAll('.project-checkbox:checked').forEach(function (cb) {
                projectIds.push(cb.value);
            });

            var groupIds = this.getSelectedGroups();

            var modulePermissions = this.collectModulePermissions();

            var currentUser = (window.DWSS_Permissions && window.DWSS_Permissions.getCurrentUser) ? window.DWSS_Permissions.getCurrentUser() : null;
            var isAdmin = currentUser && currentUser.role === 'admin';
            var isPM = currentUser && currentUser.role === 'project_admin';
            if (!isAdmin && !isPM) {
                alert('❌ Only System Admin or Project Admin can add or edit users.');
                return;
            }
            // Project Admin: force users onto their own contract(s) only
            if (isPM && !isAdmin) {
                var myPids = currentUser.projectIds || [];
                if (!myPids.length) {
                    alert('❌ Project Admin has no assigned contract.');
                    return;
                }
                if (!projectIds.length) projectIds = myPids.slice();
                // Keep only overlapping projects
                projectIds = projectIds.filter(function (pid) { return myPids.indexOf(pid) !== -1; });
                if (!projectIds.length) projectIds = myPids.slice();
                if (role === 'admin') {
                    alert('❌ Project Admin cannot create System Administrator accounts.');
                    return;
                }
            }
            if (!username) {
                username = email.split('@')[0];
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

            // Persist to server so login works
            var savedUser = null;
            if (editingUserId) {
                savedUser = this.users.find(function (u) { return String(u.id) === String(editingUserId); });
            } else {
                savedUser = this.users[this.users.length - 1];
            }
            if (savedUser) {
                var payload = {
                    id: savedUser.id,
                    name: savedUser.name,
                    email: savedUser.email,
                    username: savedUser.username,
                    password: savedUser.password,
                    organization: savedUser.organization,
                    companyName: savedUser.companyName,
                    contractNo: savedUser.contractNo,
                    role: savedUser.role,
                    department: savedUser.department,
                    status: savedUser.status || 'online',
                    projectIds: savedUser.projectIds || [],
                    modulePermissions: savedUser.modulePermissions || null,
                    groupIds: savedUser.groupIds || []
                };
                fetch('/api/users/upsert', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                }).then(function (res) {
                    return res.json().then(function (d) {
                        if (!res.ok) console.warn('[UserMgmt] upsert failed', d);
                        else console.log('[UserMgmt] user upserted', d);
                    });
                }).catch(function (e) { console.warn('[UserMgmt] upsert network', e); });
            }

            this.renderUserTable();
            this.updateUserStats();
            this.closeModal();
        },

        // ============================================================
        // EVENT LISTENERS FOR ROWS
        // ============================================================
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
                    var currentUser = (window.DWSS_Permissions && window.DWSS_Permissions.getCurrentUser) ? window.DWSS_Permissions.getCurrentUser() : null;
                    if (!currentUser || currentUser.role !== 'admin') {
                        alert('Only System Admin can delete users.');
                        return;
                    }

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

            function setUserStatus(userId, status) {
                var user = self.users.find(function (u) { return u.id === userId; });
                if (!user) return;
                user.status = status;
                self.saveToStorage();
                fetch('/api/users/upsert', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        id: user.id, username: user.username, name: user.name, email: user.email,
                        role: user.role, status: status, projectIds: user.projectIds || [],
                        organization: user.organization, companyName: user.companyName,
                        contractNo: user.contractNo, department: user.department
                    })
                }).catch(function () {});
                self.renderUserTable();
                self.updateUserStats();
                alert(status === 'online' ? '✅ Account enabled. User can log in.' : '✅ Account disabled. User cannot log in.');
            }
            document.querySelectorAll('.disable-user-btn').forEach(function (btn) {
                btn.addEventListener('click', function () {
                    var id = parseInt(this.getAttribute('data-id'), 10);
                    if (confirm('Disable this account? User will not be able to log in.')) setUserStatus(id, 'offline');
                });
            });
            document.querySelectorAll('.enable-user-btn').forEach(function (btn) {
                btn.addEventListener('click', function () {
                    var id = parseInt(this.getAttribute('data-id'), 10);
                    setUserStatus(id, 'online');
                });
            });
        },

        // ============================================================
        // EDIT MODAL
        // ============================================================
        openEditModal: function (userId) {
            var currentUser = (window.DWSS_Permissions && window.DWSS_Permissions.getCurrentUser) ? window.DWSS_Permissions.getCurrentUser() : null;
            if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'project_admin')) {
                alert('Only System Admin or Project Admin can edit users.');
                return;
            }
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

            // ★ Load projects — from storage, check user's
            this.renderProjectCheckboxes(user.projectIds || []);

            // ★ Load groups — check user's
            this.setSelectedGroups(user.groupIds || []);
            var searchEl = document.getElementById('user-groups-search');
            if (searchEl) searchEl.value = '';

            // Module permissions
            this.renderModulePermissions(user.modulePermissions || (ROLE_TEMPLATES[user.role] && ROLE_TEMPLATES[user.role].modules) || null);

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
    // PUBLIC API
    // ============================================================
    window.UserManagement = UserManagement;

    window.DWSS_UserMgmt = {
        ORGANIZATIONS: ORGANIZATIONS,
        ROLES: ROLES,
        MODULES: MODULES,
        ACCESS_LEVELS: ACCESS_LEVELS,
        ROLE_TEMPLATES: ROLE_TEMPLATES,

        getAllOrganizations: function () { return Object.keys(ORGANIZATIONS).map(function (k) { return ORGANIZATIONS[k]; }); },
        getAllRoles:         function () { return Object.keys(ROLES).map(function (k) { return ROLES[k]; }); },
        getRolesByOrganization: function (orgId) {
            return Object.keys(ROLES).filter(function (k) { return ROLES[k].organization === orgId; })
                                     .map(function (k) { return ROLES[k]; });
        },
        getAllModules: function () { return Object.keys(MODULES).map(function (k) { return MODULES[k]; }); },

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