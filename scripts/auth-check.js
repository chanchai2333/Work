// ============================================
// DWSS 權限檢查共用模組
// 所有頁面都可以引用這個文件
// ============================================

const DWSS_Auth = {
    // 獲取當前登錄用戶
    getCurrentUser: function() {
        const sessionData = sessionStorage.getItem('dwss_session');
        if (sessionData) {
            try {
                return JSON.parse(sessionData);
            } catch(e) {
                return null;
            }
        }
        return null;
    },

    // 檢查是否已登錄
    isLoggedIn: function() {
        const user = this.getCurrentUser();
        return user && user.isLoggedIn === true;
    },

    // 檢查是否可以更改狀態（Admin/Officer/AEI）
    canChangeStatus: function() {
        const user = this.getCurrentUser();
        return user && user.permissions && user.permissions.canChangeStatus === true;
    },

    // 檢查是否可以管理用戶（Admin only）
    canManageUsers: function() {
        const user = this.getCurrentUser();
        return user && user.permissions && user.permissions.canManageUsers === true;
    },

    // 獲取用戶角色名稱
    getRoleName: function() {
        const user = this.getCurrentUser();
        return user && user.permissions ? user.permissions.name : 'Guest';
    },

    // 獲取用戶名
    getUserName: function() {
        const user = this.getCurrentUser();
        return user ? user.userName : 'Guest';
    },

    // 獲取權限級別
    getPermissionLevel: function() {
        const user = this.getCurrentUser();
        return user && user.permissions ? user.permissions.level : 0;
    },

    // 登出
    logout: function() {
        sessionStorage.clear();
        localStorage.removeItem('current_user');
        window.location.href = 'login.html';
    },

    // 要求登錄（未登錄則跳轉到登錄頁面）
    requireAuth: function() {
        if (!this.isLoggedIn()) {
            window.location.href = 'login.html';
            return false;
        }
        return true;
    },

    // 更新頁面標頭（顯示用戶名和權限標籤）
    updateHeaderUser: function() {
        const user = this.getCurrentUser();
        if (!user) return;

        // 更新用戶名顯示
        const userBtnSpans = document.querySelectorAll('.user-btn span');
        userBtnSpans.forEach(span => {
            span.textContent = user.userName;
        });

        // 添加權限標籤
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
                permBadge.innerHTML = '<i class="fas fa-check-circle"></i> Full Access';
            } else {
                permBadge.style.background = '#fff3cd';
                permBadge.style.color = '#856404';
                permBadge.innerHTML = '<i class="fas fa-minus-circle"></i> Submit Only';
            }
            
            headerControls.appendChild(permBadge);
        }
    },

    // 生成狀態更改下拉選單（僅高級用戶）
    generateStatusSelect: function(recordId) {
        if (this.canChangeStatus()) {
            return `
                <select class="status-change-select" data-id="${recordId}" title="Change Status">
                    <option value="">📝 Change Status</option>
                    <option value="draft">Draft</option>
                    <option value="submitted">Submitted</option>
                    <option value="endorsed">Endorsed</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="confirm">Client's Site Representative to Confirm</option>
                    <option value="double-check">Contractor/Contractor's Agent Double Check</option>
                </select>
            `;
        }
        return '';
    },

    // 生成權限提示（僅低級用戶）
    generatePermissionHint: function() {
        if (!this.canChangeStatus()) {
            return '<span class="permission-lock-hint"><i class="fas fa-lock"></i> Status change requires higher permission</span>';
        }
        return '';
    },

    // 根據權限調整新增表單的狀態選項
    adjustFormStatusOptions: function(statusSelectId) {
        const statusSelect = document.getElementById(statusSelectId);
        if (!statusSelect) return;

        if (!this.canChangeStatus()) {
            // 低級用戶：只能提交
            statusSelect.innerHTML = '<option value="submitted">Submitted</option>';
            statusSelect.value = 'submitted';
            statusSelect.disabled = true;
            
            // 添加提示
            let hint = document.getElementById('submit-only-hint');
            if (!hint) {
                hint = document.createElement('div');
                hint.id = 'submit-only-hint';
                hint.style.cssText = 'color: #856404; background: #fff3cd; padding: 10px; border-radius: 6px; margin: 10px 0; font-size: 0.85rem;';
                hint.innerHTML = '<i class="fas fa-info-circle"></i> <strong>Submit Only Mode:</strong> You can only submit records. Status changes require Admin/Officer/AEI permission.';
                statusSelect.parentNode.appendChild(hint);
            }
        } else {
            // 高級用戶：可以選擇任何狀態
            statusSelect.innerHTML = `
                <option value="draft">Draft</option>
                <option value="submitted">Submitted</option>
                <option value="endorsed">Endorsed</option>
                <option value="cancelled">Cancelled</option>
                <option value="confirm">Client's Site Representative to Confirm</option>
                <option value="double-check">Contractor/Contractor's Agent Double Check</option>
            `;
            statusSelect.disabled = false;
            
            const hint = document.getElementById('submit-only-hint');
            if (hint) hint.remove();
        }
    },

    // 自動填充提交者名稱
    autoFillSubmittedBy: function(inputId) {
        const input = document.getElementById(inputId);
        const user = this.getCurrentUser();
        if (input && user) {
            input.value = user.userName;
        }
    },

    // 綁定狀態更改事件
    bindStatusChangeEvents: function(getRecordCallback, saveCallback, renderCallback) {
        if (!this.canChangeStatus()) return;

        document.querySelectorAll('.status-change-select').forEach(function(select) {
            select.removeEventListener('change', handleStatusChange);
            select.addEventListener('change', handleStatusChange);
        });

        // 保存 this 引用
        var self = this;

        function handleStatusChange(e) {
            var recordId = e.target.getAttribute('data-id');
            var newStatus = e.target.value;
            
            if (!newStatus) return;
            
            var record = getRecordCallback(recordId);
            if (!record) return;
            
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

// 頁面加載時自動檢查登錄狀態（除了登錄頁面）
if (!window.location.pathname.includes('login.html')) {
    if (!DWSS_Auth.requireAuth()) {
        throw new Error('Authentication required');
    }
}