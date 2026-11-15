// scripts/auth-check.js
// ============================================================
// DWSS 權限檢查共用模組
// ============================================================

var DWSS_Auth = {
    // ============================================================
    // 用戶
    // ============================================================
    getCurrentUser: function() {
        var sessionData = sessionStorage.getItem('dwss_session');
        if (sessionData) {
            try { return JSON.parse(sessionData); } catch (e) { /* ignore */ }
        }
        var localData = sessionStorage.getItem('current_user') || localStorage.getItem('current_user');
        if (localData) {
            try { return JSON.parse(localData); } catch (e) { /* ignore */ }
        }
        return null;
    },

    isLoggedIn: function() {
        var user = this.getCurrentUser();
        return !!(user && user.isLoggedIn === true);
    },

    canChangeStatus: function() {
        var user = this.getCurrentUser();
        if (!user) return false;
        if (user.role === 'admin' || user.role === 'ig' || user.role === 'wsg') return true;
        return !!(user.permissions && user.permissions.canChangeStatus === true);
    },

    isAdmin: function() {
        var user = this.getCurrentUser();
        return !!(user && (user.userRole === 'admin' || user.role === 'admin'));
    },

    canManageUsers: function() {
        var user = this.getCurrentUser();
        if (!user) return false;
        if (user.role === 'admin') return true;
        return !!(user.permissions && user.permissions.canManageUsers === true);
    },

    getRoleName: function() {
        var user = this.getCurrentUser();
        if (!user) return 'Guest';
        var roleNames = {
            'eg': 'Engineer Grade',
            'ig': 'Inspector Grade',
            'wsg': 'Works Supervisor Grade',
            'sa': 'Site Agent',
            'ssa': 'Sub-Site Agent',
            'rso': 'Registered Safety Officer',
            'subcontractor': 'Subcontractor',
            'supplier': 'Supplier',
            'admin': 'Administrator'
        };
        return roleNames[user.role] || (user.permissions ? user.permissions.name : 'Guest');
    },

    getUserName: function() {
        var user = this.getCurrentUser();
        return user ? (user.userName || user.name || user.email || 'Guest') : 'Guest';
    },

    getUserOrganization: function() {
        var user = this.getCurrentUser();
        return user ? (user.organization || null) : null;
    },

    getUserCompanyName: function() {
        var user = this.getCurrentUser();
        return user ? (user.companyName || null) : null;
    },

    getPermissionLevel: function() {
        var user = this.getCurrentUser();
        return (user && user.permissions) ? user.permissions.level : 0;
    },

    logout: function() {
        var token = '';
        try { token = (JSON.parse(sessionStorage.getItem('dwss_session') || '{}')).sessionToken || ''; } catch (e) {}
        var done = function () {
            sessionStorage.clear();
            sessionStorage.removeItem('current_user');
            localStorage.removeItem('current_user');
            window.location.href = 'login.html';
        };
        if (!token) { done(); return; }
        fetch('/api/auth/logout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-session-token': token },
            body: JSON.stringify({ sessionToken: token }),
            keepalive: true
        }).then(done).catch(done);
    },

    requireAuth: function() {
        if (!this.isLoggedIn()) {
            window.location.href = 'login.html';
            return false;
        }
        return true;
    },

    // ============================================================
    // 項目 — 統一來源
    // ============================================================
    getProjectId: function() {
        return sessionStorage.getItem('currentProjectId') || null;
    },

    getCurrentProject: function() {
        return sessionStorage.getItem('currentProjectId') || null;
    },

    setCurrentProject: function(projectId) {
        if (!projectId) return false;
        sessionStorage.setItem('currentProjectId', projectId);
        return true;
    },

    getUserProjects: function() {
        var user = this.getCurrentUser();
        if (!user) return [];
        if (user.role === 'admin') {
            return typeof window.getAllProjects === 'function' ? window.getAllProjects() : [];
        }
        if (!user.projectIds || !Array.isArray(user.projectIds)) return [];
        return user.projectIds.map(function(pid) {
            return typeof window.getProjectById === 'function' ? window.getProjectById(pid) : null;
        }).filter(Boolean);
    },

    canAccessProject: function(projectId) {
        if (!projectId) return false;
        var user = this.getCurrentUser();
        if (!user) return false;
        if (user.role === 'admin') return true;
        if (!user.projectIds || !Array.isArray(user.projectIds)) return false;
        return user.projectIds.indexOf(projectId) !== -1;
    },

    canAccessRecord: function(record) {
        if (!record) return false;
        var pid = record.project || record.projectId;
        if (!pid) return true;
        return this.canAccessProject(pid);
    },

    // ★★★ 最關鍵的函數：只回傳屬於當前項目的記錄 ★★★
    filterByCurrentProject: function(records) {
        if (!Array.isArray(records)) return [];
        var currentPid = this.getProjectId();

        // 若沒有當前項目 → 回傳全部（寬鬆，避免畫面空白）
        if (!currentPid) return records.slice();

        return records.filter(function(r) {
            if (!r) return false;

            // 兼容 project 與 projectId 兩種欄位名稱
            var recPid = r.project || r.projectId || null;

            // 沒有項目欄位的舊資料 → 保留（寬鬆模式）
            if (!recPid) return true;

            return recPid === currentPid;
        });
    },

    autoFillProjectId: function(record) {
        if (!record) return record;
        if (record.project || record.projectId) return record;
        var pid = this.getCurrentProject();
        if (pid) {
            record.project = pid;
        } else if (typeof window.getProjectIdBySite === 'function') {
            var inferred = window.getProjectIdBySite(record.site);
            if (inferred) record.project = inferred;
        }
        return record;
    },

    // ============================================================
    // 模組權限
    // ============================================================
    canAccessModule: function(moduleId, requiredLevel) {
        if (typeof window.DWSS_UserManagement !== 'undefined') {
            return window.DWSS_UserManagement.checkPageAccess(moduleId, requiredLevel || 'view');
        }
        return true;
    },

    requireModuleAccess: function(moduleId, requiredLevel) {
        if (typeof window.DWSS_UserManagement !== 'undefined') {
            return window.DWSS_UserManagement.requirePageAccess(moduleId, requiredLevel || 'view');
        }
        return true;
    },

    // ============================================================
    // UI
    // ============================================================
    updateProjectIndicator: function() {
        var indicator = document.getElementById('current-project-indicator');
        if (!indicator) return;
        var currentPid = this.getCurrentProject();
        var project = currentPid
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
    },

    updateHeaderUser: function() {
        var user = this.getCurrentUser();
        if (!user) return;

        var displayName = user.userName || user.name || user.email || 'User';

        document.querySelectorAll('.user-btn').forEach(function(btn) {
            var span = btn.querySelector('span');
            if (!span) {
                span = document.createElement('span');
                btn.appendChild(span);
            }
            span.textContent = displayName;
        });

        ['#header-username', '.user-name', '.username', '.header-username'].forEach(function(sel) {
            document.querySelectorAll(sel).forEach(function(el) {
                if (el.hasAttribute('data-record-user')) return;
                el.textContent = displayName;
            });
        });

        var headerControls = document.querySelector('.header-controls .user-date-row');
        if (headerControls && !document.getElementById('permission-indicator')) {
            var permBadge = document.createElement('span');
            permBadge.id = 'permission-indicator';
            permBadge.style.cssText =
                'display: inline-block; padding: 4px 12px; border-radius: 20px;' +
                'font-size: 0.75rem; font-weight: 600; margin-left: 10px;';

            if (this.canChangeStatus()) {
                permBadge.style.background = '#d4edda';
                permBadge.style.color = '#155724';
                permBadge.innerHTML = '<i class="fas fa-check-circle"></i> ' + this.getRoleName();
            } else {
                permBadge.style.background = '#fff3cd';
                permBadge.style.color = '#856404';
                permBadge.innerHTML = '<i class="fas fa-minus-circle"></i> ' + this.getRoleName();
            }
            headerControls.appendChild(permBadge);
        } else if (headerControls) {
            var existingBadge = document.getElementById('permission-indicator');
            if (existingBadge) {
                existingBadge.innerHTML = '<i class="fas fa-user"></i> ' + this.getRoleName();
            }
        }

        this.updateProjectIndicator();
    },

    // ============================================================
    // 狀態更改 UI
    // ============================================================
    generateStatusSelect: function(recordId) {
        if (this.canChangeStatus()) {
            return (
                '<select class="status-change-select" data-id="' + recordId + '" title="Change Status">' +
                '<option value="">📝 Change Status</option>' +
                '<option value="draft">Draft</option>' +
                '<option value="submitted-wsg">Submitted to WSG</option>' +
                '<option value="submitted-ig">Submitted to IG</option>' +
                '<option value="closed">Closed</option>' +
                '<option value="reopen">Reopen</option>' +
                '<option value="cancelled">Cancelled</option>' +
                '</select>'
            );
        }
        return '';
    },

    generatePermissionHint: function() {
        if (!this.canChangeStatus()) {
            return '<span class="permission-lock-hint"><i class="fas fa-lock"></i> Status change requires IG/WSG permission</span>';
        }
        return '';
    },

    adjustFormStatusOptions: function(statusSelectId) {
        var statusSelect = document.getElementById(statusSelectId);
        if (!statusSelect) return;

        if (!this.canChangeStatus()) {
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

            var hint2 = document.getElementById('submit-only-hint');
            if (hint2) hint2.remove();
        }
    },

    autoFillSubmittedBy: function(inputId) {
        var input = document.getElementById(inputId);
        var user = this.getCurrentUser();
        if (input && user) input.value = user.userName;
    },

    bindStatusChangeEvents: function(getRecordCallback, saveCallback, renderCallback) {
        if (!this.canChangeStatus()) return;

        var self = this;

        function handleStatusChange(e) {
            var recordId = e.target.getAttribute('data-id');
            var newStatus = e.target.value;
            if (!newStatus) return;

            var record = getRecordCallback(recordId);
            if (!record) return;

            if (!self.canAccessRecord(record)) {
                alert('❌ You do not have permission to modify this record.');
                e.target.value = '';
                return;
            }

            var oldStatus = record.status || 'draft';
            var user = self.getCurrentUser();

            if (confirm(
                '⚠️ Change Status Confirmation\n\n' +
                'Record ID: ' + recordId + '\n' +
                'From: ' + oldStatus + '\n' +
                'To: ' + newStatus + '\n' +
                'Changed by: ' + (user ? user.userName : 'Unknown') + ' (' + self.getRoleName() + ')\n\n' +
                'Are you sure you want to change the status?'
            )) {
                record.status = newStatus;
                record.statusChangedBy = user ? user.userName : 'Unknown';
                record.statusChangedAt = new Date().toISOString();
                record.statusChangedRole = self.getRoleName();

                if (saveCallback) saveCallback();
                if (renderCallback) renderCallback();

                alert('✅ Status changed successfully!\n\n' + oldStatus + ' → ' + newStatus);
            } else {
                e.target.value = '';
            }
        }

        document.querySelectorAll('.status-change-select').forEach(function(select) {
            select.removeEventListener('change', handleStatusChange);
            select.addEventListener('change', handleStatusChange);
        });
    }
    

};

// ★★★ 掛到 window，讓所有頁面都能存取 ★★★
window.DWSS_Auth = DWSS_Auth;

// ============================================================
// 自動初始化 header
// ============================================================
function initHeaderUser() {
    try {
        if (window.DWSS_Auth && typeof window.DWSS_Auth.updateHeaderUser === 'function') {
            window.DWSS_Auth.updateHeaderUser();
        }
    } catch (err) {
        console.warn('[DWSS_Auth] updateHeaderUser failed:', err);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHeaderUser);
} else {
    initHeaderUser();
}

(function installSessionGuard() {
    if (window.__dwssSessionGuard) return;
    window.__dwssSessionGuard = true;

    function currentToken() {
        try {
            return (JSON.parse(sessionStorage.getItem('dwss_session') || '{}')).sessionToken || '';
        } catch (e) {
            return '';
        }
    }

    function forceToLogin(message) {
        if (window.__dwssLoggingOut) return;
        window.__dwssLoggingOut = true;
        try { sessionStorage.clear(); } catch (e) {}
        try { sessionStorage.removeItem('dwss_session'); } catch (e) {}
        try { sessionStorage.removeItem('isLoggedIn'); } catch (e) {}
        try { sessionStorage.removeItem('loggedUser'); } catch (e) {}
        alert(message || 'You have been logged out because this account signed in from another browser or computer.\n\nPlease log in again.');
        window.location.href = 'login.html';
    }

    // Attach the session token to every same-origin API call
    var originalFetch = window.fetch.bind(window);
    window.fetch = function (input, init) {
        init = init || {};
        var url = (typeof input === 'string') ? input : (input && input.url) || '';
        if (url.indexOf('/api/') === 0 || url.indexOf(location.origin + '/api/') === 0) {
            var token = currentToken();
            if (token) {
                var headers = new Headers(init.headers || (input && input.headers) || {});
                if (!headers.has('x-session-token')) headers.set('x-session-token', token);
                init.headers = headers;
            }
        }
        return originalFetch(input, init).then(function (res) {
            if (res && (res.status === 401) && url.indexOf('/api/') !== -1 && url.indexOf('/api/auth/login') === -1) {
                res.clone().json().then(function (body) {
                    var msg = (body && body.message) || 'You have been logged out because this account signed in from another browser or computer.';
                    forceToLogin(msg + '\n\nPlease log in again.');
                }).catch(function () {
                    forceToLogin();
                });
            }
            return res;
        });
    };

    function heartbeat() {
        if (window.location.pathname.indexOf('login.html') !== -1) return;
        var token = currentToken();
        if (!token) return;
        originalFetch('/api/auth/heartbeat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-session-token': token },
            body: JSON.stringify({ sessionToken: token })
        }).then(function (res) {
            if (res.status === 401) {
                return res.json().catch(function () { return {}; }).then(function (body) {
                    forceToLogin((body && body.message) || 'You have been logged out because this account signed in from another browser or computer.\n\nPlease log in again.');
                });
            }
        }).catch(function () {});
    }

    // Check soon, then every 15 seconds so a forced logout is noticed quickly
    setTimeout(heartbeat, 2000);
    setInterval(heartbeat, 15000);
})();

// 登入檢查（不 throw，讓頁面其他邏輯仍可執行）
if (!window.location.pathname.includes('login.html')) {
    if (window.DWSS_Auth && !window.DWSS_Auth.isLoggedIn()) {
        console.warn('[DWSS_Auth] User not logged in');
    }
}

document.addEventListener('languageChanged', function () {
    try { if (window.DWSS_Auth) window.DWSS_Auth.updateHeaderUser(); } catch (e) {}
});
setTimeout(function () {
    try { if (window.DWSS_Auth) window.DWSS_Auth.updateHeaderUser(); } catch (e) {}
}, 300);
