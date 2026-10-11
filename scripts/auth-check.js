// scripts/auth-check.js
// ============================================================
// DWSS 權限檢查共用模組
// ============================================================

const DWSS_Auth = {
    getCurrentUser: function() {
        const sessionData = sessionStorage.getItem('dwss_session');
        if (sessionData) {
            try { return JSON.parse(sessionData); } catch(e) { return null; }
        }
        return null;
    },

    isLoggedIn: function() {
        const user = this.getCurrentUser();
        return user && user.isLoggedIn === true;
    },

    canChangeStatus: function() {
        const user = this.getCurrentUser();
        if (!user) return false;
        // 只有 IG / WSG / Admin 可以改狀態
        if (user.role === 'admin' || user.role === 'ig' || user.role === 'wsg') return true;
        return user.permissions && user.permissions.canChangeStatus === true;
    },

    isAdmin: function() {
        const user = this.getCurrentUser();
        return user && (user.userRole === 'admin' || user.role === 'admin');
    },

    canManageUsers: function() {
        const user = this.getCurrentUser();
        if (!user) return false;
        if (user.role === 'admin') return true;
        return user.permissions && user.permissions.canManageUsers === true;
    },

    getRoleName: function() {
        const user = this.getCurrentUser();
        if (!user) return 'Guest';
        // 使用新嘅 role 名稱
        var roleNames = {
            'eg': 'Engineer Grade', 'ig': 'Inspector Grade', 'wsg': 'Works Supervisor Grade',
            'sa': 'Site Agent', 'ssa': 'Sub-Site Agent', 'rso': 'Registered Safety Officer',
            'subcontractor': 'Subcontractor', 'supplier': 'Supplier', 'admin': 'Administrator'
        };
        return roleNames[user.role] || (user.permissions ? user.permissions.name : 'Guest');
    },

    getUserName: function() {
        const user = this.getCurrentUser();
        return user ? user.userName : 'Guest';
    },

    getUserOrganization: function() {
        const user = this.getCurrentUser();
        return user ? (user.organization || null) : null;
    },

    getUserCompanyName: function() {
        const user = this.getCurrentUser();
        return user ? (user.companyName || null) : null;
    },

    getPermissionLevel: function() {
        const user = this.getCurrentUser();
        return user && user.permissions ? user.permissions.level : 0;
    },

    logout: function() {
        sessionStorage.clear();
        localStorage.removeItem('current_user');
        window.location.href = 'login.html';
    },

    requireAuth: function() {
        if (!this.isLoggedIn()) {
            window.location.href = 'login.html';
            return false;
        }
        return true;
    },

    // ============================================================
    // 項目相關
    // ============================================================
    getCurrentProject: function() {
        return sessionStorage.getItem('currentProjectId') || null;
    },

    setCurrentProject: function(projectId) {
        if (!projectId) return false;
        sessionStorage.setItem('currentProjectId', projectId);
        return true;
    },

    getUserProjects: function() {
        const user = this.getCurrentUser();
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
        const user = this.getCurrentUser();
        if (!user) return false;
        if (user.role === 'admin') return true;
        if (!user.projectIds || !Array.isArray(user.projectIds)) return false;
        return user.projectIds.indexOf(projectId) !== -1;
    },

    canAccessRecord: function(record) {
        if (!record) return false;
        if (!record.projectId) return true;
        return this.canAccessProject(record.projectId);
    },

    filterByProject: function(records) {
        if (!Array.isArray(records)) return [];
        const user = this.getCurrentUser();
        if (!user) return [];
        if (user.role === 'admin') {
            const currentPid = this.getCurrentProject();
            if (currentPid && currentPid !== 'ALL') {
                return records.filter(function(r) {
                    return !r.projectId || r.projectId === currentPid;
                });
            }
            return records.slice();
        }
        const currentPid = this.getCurrentProject();
        const allowedPids = user.projectIds || [];
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
    },

    autoFillProjectId: function(record) {
        if (!record) return record;
        if (record.projectId) return record;
        var pid = this.getCurrentProject();
        if (pid && pid !== 'ALL') {
            record.projectId = pid;
        } else if (typeof window.getProjectIdBySite === 'function') {
            var inferred = window.getProjectIdBySite(record.site);
            if (inferred) record.projectId = inferred;
        }
        return record;
    },

    // ============================================================
    // 模組權限檢查（新）
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
    // UI 更新
    // ============================================================
    updateProjectIndicator: function() {
        var indicator = document.getElementById('current-project-indicator');
        if (!indicator) return;
        var currentPid = this.getCurrentProject();
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
    },

    updateHeaderUser: function() {
        const user = this.getCurrentUser();
        if (!user) return;

        const userBtnSpans = document.querySelectorAll('.user-btn span');
        userBtnSpans.forEach(span => {
            span.textContent = user.userName;
        });

        // 權限標籤
        const headerControls = document.querySelector('.header-controls .user-date-row');
        if (headerControls && !document.getElementById('permission-indicator')) {
            const permBadge = document.createElement('span');
            permBadge.id = 'permission-indicator';
            permBadge.style.cssText = `
                display: inline-block;
                padding: 4px 12px;
                border-radius: 20px;
                font-size: 0.75rem;
                font-weight: 600;
                margin-left: 10px;
            `;

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
    // 狀態更改下拉選單
    // ============================================================
    generateStatusSelect: function(recordId) {
        if (this.canChangeStatus()) {
            return `
                <select class="status-change-select" data-id="${recordId}" title="Change Status">
                    <option value="">📝 Change Status</option>
                    <option value="draft">Draft</option>
                    <option value="submitted-wsg">Submitted to WSG</option>
                    <option value="submitted-ig">Submitted to IG</option>
                    <option value="closed">Closed</option>
                    <option value="reopen">Reopen</option>
                    <option value="cancelled">Cancelled</option>
                </select>
            `;
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
        const statusSelect = document.getElementById(statusSelectId);
        if (!statusSelect) return;

        if (!this.canChangeStatus()) {
            statusSelect.innerHTML = '<option value="submitted">Submitted</option>';
            statusSelect.value = 'submitted';
            statusSelect.disabled = true;

            let hint = document.getElementById('submit-only-hint');
            if (!hint) {
                hint = document.createElement('div');
                hint.id = 'submit-only-hint';
                hint.style.cssText = 'color: #856404; background: #fff3cd; padding: 10px; border-radius: 6px; margin: 10px 0; font-size: 0.85rem;';
                hint.innerHTML = '<i class="fas fa-info-circle"></i> <strong>Submit Only Mode:</strong> You can only submit records. Status changes require IG/WSG permission.';
                statusSelect.parentNode.appendChild(hint);
            }
        } else {
            statusSelect.innerHTML = `
                <option value="draft">Draft</option>
                <option value="submitted-wsg">Submitted to WSG</option>
                <option value="submitted-ig">Submitted to IG</option>
                <option value="closed">Closed</option>
                <option value="reopen">Reopen</option>
                <option value="cancelled">Cancelled</option>
            `;
            statusSelect.disabled = false;
            const hint = document.getElementById('submit-only-hint');
            if (hint) hint.remove();
        }
    },

    autoFillSubmittedBy: function(inputId) {
        const input = document.getElementById(inputId);
        const user = this.getCurrentUser();
        if (input && user) input.value = user.userName;
    },

    bindStatusChangeEvents: function(getRecordCallback, saveCallback, renderCallback) {
        if (!this.canChangeStatus()) return;

        document.querySelectorAll('.status-change-select').forEach(function(select) {
            select.removeEventListener('change', handleStatusChange);
            select.addEventListener('change', handleStatusChange);
        });

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
    }
};

if (!window.location.pathname.includes('login.html')) {
    if (!DWSS_Auth.requireAuth()) {
        throw new Error('Authentication required');
    }
}