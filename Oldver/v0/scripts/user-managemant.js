// scripts/user-management.js
// ============================================================
// DWSS User Management Core Module
// Spec 1.37.3(4)
// ============================================================

(function () {
    'use strict';

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

    var MODULES = {
        'dashboard':      { id: 'dashboard',      name: 'Dashboard',         icon: 'fa-home' },
        'sitediary':      { id: 'sitediary',      name: 'Site Diary',        icon: 'fa-book' },
        'safetyinspect':  { id: 'safetyinspect',  name: 'Safety Inspection', icon: 'fa-clipboard-check' },
        'sitelocations':  { id: 'sitelocations',  name: 'Site Locations',    icon: 'fa-map-marked-alt' },
        'labourwage':     { id: 'labourwage',     name: 'Labour Wage',       icon: 'fa-money-bill-wave' },
        'settings':       { id: 'settings',       name: 'System Settings',   icon: 'fa-cogs' },
        'usermanagement': { id: 'usermanagement', name: 'User Management',   icon: 'fa-users' },
        'ssss':           { id: 'ssss',           name: 'SSSS / 4S',         icon: 'fa-shield-alt' }
    };

    var ACCESS_LEVELS = {
        'none':    { label: 'No Access',      value: 0 },
        'view':    { label: 'View Only',      value: 1 },
        'edit':    { label: 'Edit',           value: 2 },
        'approve': { label: 'Edit & Approve', value: 3 },
        'admin':   { label: 'Full Admin',     value: 4 }
    };

    var ROLE_TEMPLATES = {
        'admin': {
            modules: {
                dashboard: 'admin', sitediary: 'admin', safetyinspect: 'admin',
                sitelocations: 'admin', labourwage: 'admin', settings: 'admin',
                usermanagement: 'admin', ssss: 'admin'
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
        'eg': {
            modules: {
                dashboard: 'view', sitediary: 'view', safetyinspect: 'view',
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
        }
    };

    var GROUPS_KEY = 'dwss_user_groups';

    function loadGroups() {
        try {
            var raw = localStorage.getItem(GROUPS_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch (e) { return []; }
    }

    function saveGroups(groups) {
        localStorage.setItem(GROUPS_KEY, JSON.stringify(groups));
    }

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
        var requiredValue = ACCESS_LEVELS[requiredLevel] ? ACCESS_LEVELS[requiredLevel].value : 0;
        return accessValue >= requiredValue;
    }

    function getGroupPermissions(groupId) {
        var groups = loadGroups();
        var group = groups.find(function (g) { return g.id === groupId; });
        return group ? group.permissions : {};
    }

    function getUserGroupPermissions(user) {
        if (!user || !user.groupIds || !Array.isArray(user.groupIds)) return {};
        var merged = {};
        user.groupIds.forEach(function (gid) {
            var groupPerms = getGroupPermissions(gid);
            Object.keys(groupPerms).forEach(function (moduleId) {
                var existing = merged[moduleId];
                var newPerm = groupPerms[moduleId];
                if (!existing || ACCESS_LEVELS[newPerm].value > ACCESS_LEVELS[existing].value) {
                    merged[moduleId] = newPerm;
                }
            });
        });
        return merged;
    }

    window.DWSS_UserManagement = {
        ORGANIZATIONS: ORGANIZATIONS,
        MODULES: MODULES,
        ACCESS_LEVELS: ACCESS_LEVELS,
        ROLE_TEMPLATES: ROLE_TEMPLATES,

        getAllOrganizations: function () {
            return Object.keys(ORGANIZATIONS).map(function (k) { return ORGANIZATIONS[k]; });
        },
        getAllModules: function () {
            return Object.keys(MODULES).map(function (k) { return MODULES[k]; });
        },
        getOrganization: function (orgId) { return ORGANIZATIONS[orgId] || null; },
        getModule: function (moduleId) { return MODULES[moduleId] || null; },

        getUserAccess: getUserAccess,
        canAccess: canAccess,

        getEffectivePermissions: function (user) {
            var perms = {};
            Object.keys(MODULES).forEach(function (moduleId) {
                perms[moduleId] = getUserAccess(user, moduleId);
            });
            return perms;
        },

        getGroups: loadGroups,

        createGroup: function (name, permissions, description) {
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
        },

        updateGroup: function (groupId, updates) {
            var groups = loadGroups();
            var idx = groups.findIndex(function (g) { return g.id === groupId; });
            if (idx === -1) return false;
            Object.assign(groups[idx], updates);
            saveGroups(groups);
            return groups[idx];
        },

        deleteGroup: function (groupId) {
            var groups = loadGroups();
            groups = groups.filter(function (g) { return g.id !== groupId; });
            saveGroups(groups);
            return true;
        },

        getGroup: function (groupId) {
            var groups = loadGroups();
            return groups.find(function (g) { return g.id === groupId; }) || null;
        },

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

    console.log('[UserManagement] Core module loaded');
    console.log('  - Organizations:', Object.keys(ORGANIZATIONS).length);
    console.log('  - Modules:', Object.keys(MODULES).length);
    console.log('  - Access levels:', Object.keys(ACCESS_LEVELS).length);

})();