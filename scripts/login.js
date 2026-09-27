// login.js - DWSS 多用戶登錄系統 (with Account Lockout)
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('login-form');
    const errorDiv = document.getElementById('login-error');
    const togglePasswordBtn = document.getElementById('toggle-password');
    const passwordInput = document.getElementById('password');
    const usernameInput = document.getElementById('username');

    // ==================== 初始化用戶數據庫 ====================
    function initializeUserDatabase() {
        if (!localStorage.getItem('dwss_users_db')) {
            const defaultUsers = [
                {
                    id: 1,
                    name: "Admin",
                    email: "admin@rdrive.io",
                    username: "admin",
                    password: "admin123",
                    role: "admin",
                    department: "System Administration",
                    status: "online",
                    passwordChanged: false,
                    passwordChangedAt: null,
                    passwordExpiresAt: null,
                    permissions: {
                        level: 5,
                        canChangeStatus: true,
                        canManageUsers: true,
                        name: "Administrator"
                    }
                },
                {
                    id: 2,
                    name: "Kenneth Daluz",
                    email: "kenneth.daluz@aster-dsd.com",
                    username: "kenneth",
                    password: "officer123",
                    role: "officer",
                    department: "Administration",
                    status: "online",
                    passwordChanged: false,
                    passwordChangedAt: null,
                    passwordExpiresAt: null,
                    permissions: {
                        level: 4,
                        canChangeStatus: true,
                        canManageUsers: false,
                        name: "Administration Officer"
                    }
                },
                {
                    id: 3,
                    name: "TANG Chi Long, Gary",
                    email: "gcifang@dsd.gov.hk",
                    username: "garytang",
                    password: "aei123",
                    role: "aei",
                    department: "AEI/NWNT",
                    status: "online",
                    passwordChanged: false,
                    passwordChangedAt: null,
                    passwordExpiresAt: null,
                    permissions: {
                        level: 3,
                        canChangeStatus: true,
                        canManageUsers: false,
                        name: "AEI"
                    }
                },
                {
                    id: 4,
                    name: "John Smith",
                    email: "john.smith@ael-dwss.com",
                    username: "john",
                    password: "inspector123",
                    role: "inspector",
                    department: "Safety Inspection",
                    status: "online",
                    passwordChanged: false,
                    passwordChangedAt: null,
                    passwordExpiresAt: null,
                    permissions: {
                        level: 2,
                        canChangeStatus: false,
                        canManageUsers: false,
                        name: "Inspector"
                    }
                },
                {
                    id: 5,
                    name: "Sarah Johnson",
                    email: "sarah.j@ael-dwss.com",
                    username: "sarah",
                    password: "contractor123",
                    role: "contractor",
                    department: "Contractor Team A",
                    status: "online",
                    passwordChanged: false,
                    passwordChangedAt: null,
                    passwordExpiresAt: null,
                    permissions: {
                        level: 1,
                        canChangeStatus: false,
                        canManageUsers: false,
                        name: "Contractor"
                    }
                }
            ];
            localStorage.setItem('dwss_users_db', JSON.stringify(defaultUsers));
        }
    }

    // ==================== 密碼顯示/隱藏切換 ====================
    if (togglePasswordBtn && passwordInput) {
        togglePasswordBtn.addEventListener('click', function() {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            this.querySelector('i').classList.toggle('fa-eye');
            this.querySelector('i').classList.toggle('fa-eye-slash');
        });
    }

    // ==================== 顯示錯誤信息 ====================
    function showError(message, duration) {
        if (!errorDiv) return;
        errorDiv.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
        errorDiv.classList.add('show');
        setTimeout(() => {
            errorDiv.classList.remove('show');
        }, duration || 4000);
    }

    // ==================== 顯示鎖定信息 ====================
    function showLockedMessage(lockInfo) {
        const mins = lockInfo.remainingMinutes || 0;
        showError(
            `🔒 Account locked due to too many failed attempts. ` +
            `Please try again in ${mins} minute${mins === 1 ? '' : 's'}, ` +
            `or contact an administrator to unlock.`,
            8000
        );
    }

    // ==================== 工具：找出匹配的用戶 ====================
    function findMatchingUser(username) {
        const users = JSON.parse(localStorage.getItem('dwss_users_db') || '[]');
        const needle = String(username || '').trim().toLowerCase();
        return users.find(u =>
            (u.username && u.username.toLowerCase() === needle) ||
            (u.email && u.email.toLowerCase() === needle) ||
            (u.name && u.name.toLowerCase() === needle)
        ) || null;
    }

    // ==================== 工具：取得規範化的鎖定鍵 ====================
    // Canonical lock key = user's email (lowercased).
    // Falls back to whatever the user typed if no user matches.
    // This makes login.js and usermanagement-lockout.js agree on the key,
    // because both UserManagement.users[] and dwss_users_db[] share 'email'.
    function getLockKey(username) {
        const matched = findMatchingUser(username);
        return matched ? matched.email.toLowerCase() : String(username || '').trim().toLowerCase();
    }

    // ==================== 登錄驗證 ====================
    function loginUser(username, password) {
        initializeUserDatabase();

        // ✅ Step 1: Check if account is locked
        if (typeof DWSS_Lockout !== 'undefined') {
            const matched = findMatchingUser(username);

            // Check both the canonical email key AND whatever they typed
            const keysToCheck = [String(username).trim().toLowerCase()];
            if (matched) {
                keysToCheck.push(matched.email.toLowerCase());
                keysToCheck.push(matched.username.toLowerCase());
            }

            for (let i = 0; i < keysToCheck.length; i++) {
                const lockStatus = DWSS_Lockout.isLocked(keysToCheck[i]);
                if (lockStatus.locked) {
                    showLockedMessage(lockStatus);
                    return false;
                }
            }
        }

        const users = JSON.parse(localStorage.getItem('dwss_users_db') || '[]');

        // Find user by username OR email OR name, with matching password
        const user = users.find(u =>
            ((u.username && u.username.toLowerCase() === username.toLowerCase()) ||
             (u.email && u.email.toLowerCase() === username.toLowerCase()) ||
             (u.name && u.name.toLowerCase() === username.toLowerCase())) &&
            u.password === password
        );

        // ✅ Step 2: Handle failed login
        if (!user) {
            if (typeof DWSS_Lockout !== 'undefined') {
                const lockKey = getLockKey(username);

                DWSS_Lockout.recordFailedAttempt(lockKey);

                const remaining = DWSS_Lockout.getRemainingAttempts(lockKey);

                if (remaining <= 0) {
                    const mins = Math.ceil(DWSS_Lockout.CONFIG.lockDurationMs / 60000);
                    showError(
                        `🔒 Account locked for ${mins} minutes due to too many failed attempts.`,
                        8000
                    );
                } else {
                    showError(
                        `Invalid username or password. ` +
                        `${remaining} attempt${remaining === 1 ? '' : 's'} remaining before lockout.`,
                        5000
                    );
                }
            } else {
                showError('Invalid username or password');
            }
            return false;
        }

        // ✅ Step 3: Handle disabled account
        if (user.status === 'offline') {
            showError('Account is disabled. Please contact administrator.');
            return false;
        }

        // ✅ Step 4: Successful login — reset counter on all possible keys
        if (typeof DWSS_Lockout !== 'undefined') {
            DWSS_Lockout.recordSuccessfulAttempt(user.email.toLowerCase());
            DWSS_Lockout.recordSuccessfulAttempt(user.username.toLowerCase());
        }

        // Build session
        const sessionData = {
            isLoggedIn: true,
            userId: user.id,
            userName: user.name,
            userEmail: user.email,
            userRole: user.role,
            userDepartment: user.department,
            permissions: user.permissions,
            loginTime: new Date().toISOString()
        };

        sessionStorage.setItem('dwss_session', JSON.stringify(sessionData));
        sessionStorage.setItem('isLoggedIn', 'true');
        sessionStorage.setItem('loggedUser', user.name);

        localStorage.setItem('current_user', JSON.stringify({
            userId: user.id,
            userName: user.name,
            userRole: user.role,
            permissions: user.permissions
        }));

        return true;
    }

    // ==================== 表單提交 ====================
    form.addEventListener('submit', function(e) {
        e.preventDefault();

        const username = usernameInput.value.trim();
        const password = passwordInput.value.trim();

        if (!username || !password) {
            showError('Please enter username and password');
            return;
        }

        if (loginUser(username, password)) {
            window.location.href = 'index.html';
        }
    });

    // ==================== 更新頁面提示 ====================
    function updateLoginFooter() {
        const footer = document.querySelector('.login-footer');
        if (footer) {
            footer.innerHTML = `
                <p style="margin-bottom: 8px;">Demo Credentials:</p>
                <div style="font-size: 0.75rem; line-height: 1.8; text-align: left; display: inline-block;">
                    <div>🔴 <strong>Admin:</strong> admin / admin123</div>
                    <div>🔵 <strong>Officer:</strong> kenneth / officer123</div>
                    <div>🟢 <strong>AEI:</strong> garytang / aei123</div>
                    <div>🟡 <strong>Inspector:</strong> john / inspector123</div>
                    <div>⚫ <strong>Contractor:</strong> sarah / contractor123</div>
                </div>
                <p style="margin-top: 8px; font-size: 0.7rem; color: #e74c3c;">
                    <i class="fas fa-info-circle"></i> You can use username or email to login
                </p>
            `;
        }
    }

    updateLoginFooter();
});