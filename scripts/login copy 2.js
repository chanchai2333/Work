// login.js - DWSS 多用戶登錄系統 (with Project Selection)
document.addEventListener('DOMContentLoaded', function() {
    var form = document.getElementById('login-form');
    var submitBtn = form ? form.querySelector('button[type="submit"]') : null;
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.dataset.label = submitBtn.innerHTML;
        submitBtn.innerHTML = 'Loading accounts...';
    }

    function enableLogin() {
        if (!submitBtn) return;
        submitBtn.disabled = false;
        submitBtn.innerHTML = submitBtn.dataset.label || 'Sign In';
    }

    function start() {
        initLoginPage();
        enableLogin();
    }

    if (window.DWSS_Storage && typeof window.DWSS_Storage.whenReady === 'function') {
        window.DWSS_Storage.whenReady(start);
    } else {
        start();
    }
    setTimeout(enableLogin, 3000);
});

function initLoginPage() {

    const form = document.getElementById('login-form');
    const errorDiv = document.getElementById('login-error');
    const togglePasswordBtn = document.getElementById('toggle-password');
    const passwordInput = document.getElementById('password');
    const usernameInput = document.getElementById('username');

    // 系统支持的项目列表
    const ALL_PROJECTS = ['DE/2026/05', 'DE/2025/02', 'DE/2025/09'];

    // ==================== 初始化用戶數據庫 ====================
    function initializeUserDatabase() {
        // Seed defaults if missing or empty (cloud mode may have stored [])
        const existing = localStorage.getItem('dwss_users_db');
        if (existing) {
            try {
                const parsed = JSON.parse(existing);
                if (Array.isArray(parsed) && parsed.length > 0) return;
            } catch (e) { /* corrupt → re-seed */ }
        }

        const defaultUsers = [
            // ============ SYSTEM VENDOR (AEL) ============
            {
                id: 1,
                name: "Admin",
                email: "admin@ael-dwss.com",
                username: "admin",
                password: "admin123",
                organization: "SYSTEM_VENDOR",
                companyName: "AEL - Associated Engineers Ltd.",
                contractNo: "Contract No. DE/2024/12",
                role: "admin",
                department: "System Administration",
                status: "online",
                projectIds: ["DE/2026/05", "DE/2025/02", "DE/2025/09"],  // ← Admin 全部项目
                permissions: { level: 5, canChangeStatus: true, canManageUsers: true, name: "Administrator" },
                passwordChanged: false,
                passwordChangedAt: null,
                passwordExpiresAt: null
            },
            // ============ SERVICE MANAGER (DSD) ============
            {
                id: 2,
                name: "Kenneth Daluz",
                email: "kenneth.daluz@dsd.gov.hk",
                username: "kenneth",
                password: "officer123",
                organization: "SERVICE_MANAGER",
                companyName: "Drainage Services Department (DSD)",
                contractNo: "Contract No. DE/2024/12",
                role: "eg",
                department: "Engineer Grade",
                status: "online",
                projectIds: ["DE/2026/05", "DE/2025/02"],
                permissions: { level: 4, canChangeStatus: false, canManageUsers: false, name: "Engineer Grade" },
                passwordChanged: false,
                passwordChangedAt: null,
                passwordExpiresAt: null
            },
            {
                id: 3,
                name: "TANG Chi Long, Gary",
                email: "gcifang@dsd.gov.hk",
                username: "garytang",
                password: "aei123",
                organization: "SERVICE_MANAGER",
                companyName: "Drainage Services Department (DSD)",
                contractNo: "Contract No. DE/2024/12",
                role: "ig",
                department: "Inspector Grade",
                status: "online",
                projectIds: ["DE/2026/05"],
                permissions: { level: 3, canChangeStatus: true, canManageUsers: false, name: "Inspector Grade" },
                passwordChanged: false,
                passwordChangedAt: null,
                passwordExpiresAt: null
            },
            {
                id: 4,
                name: "FUNG Wai Ching",
                email: "wcfung04@dsd.gov.hk",
                username: "wcfung",
                password: "wsg123",
                organization: "SERVICE_MANAGER",
                companyName: "Drainage Services Department (DSD)",
                contractNo: "Contract No. DE/2024/12",
                role: "wsg",
                department: "Works Supervisor Grade",
                status: "online",
                projectIds: ["DE/2026/05"],
                permissions: { level: 3, canChangeStatus: true, canManageUsers: false, name: "Works Supervisor Grade" },
                passwordChanged: false,
                passwordChangedAt: null,
                passwordExpiresAt: null
            },
            {
                id: 10,
                name: "CHA Chi Ming",
                email: "cmcha02@dsd.gov.hk",
                username: "cmcha",
                password: "ig123",
                organization: "SERVICE_MANAGER",
                companyName: "Drainage Services Department (DSD)",
                contractNo: "Contract No. DE/2024/12",
                role: "ig",
                department: "Inspector Grade",
                status: "online",
                projectIds: ["DE/2025/02", "DE/2025/09"],
                permissions: { level: 3, canChangeStatus: true, canManageUsers: false, name: "Inspector Grade" },
                passwordChanged: false,
                passwordChangedAt: null,
                passwordExpiresAt: null
            },
            // ============ CONTRACTOR (REC-AEL JV) ============
            {
                id: 5,
                name: "John Smith",
                email: "john.smith@rec-ael.com",
                username: "john",
                password: "inspector123",
                organization: "CONTRACTOR",
                companyName: "REC - AEL Joint Venture",
                contractNo: "Contract No. DE/2024/12",
                role: "sa",
                department: "Site Agent",
                status: "online",
                projectIds: ["DE/2025/02"],
                permissions: { level: 2, canChangeStatus: false, canManageUsers: false, name: "Site Agent" },
                passwordChanged: false,
                passwordChangedAt: null,
                passwordExpiresAt: null
            },
            {
                id: 6,
                name: "Sarah Johnson",
                email: "sarah.j@rec-ael.com",
                username: "sarah",
                password: "contractor123",
                organization: "CONTRACTOR",
                companyName: "REC - AEL Joint Venture",
                contractNo: "Contract No. DE/2024/12",
                role: "ssa",
                department: "Sub-Site Agent",
                status: "online",
                projectIds: ["DE/2025/09"],
                permissions: { level: 2, canChangeStatus: false, canManageUsers: false, name: "Sub-Site Agent" },
                passwordChanged: false,
                passwordChangedAt: null,
                passwordExpiresAt: null
            },
            {
                id: 7,
                name: "Robert Chen",
                email: "robert.chen@rec-ael.com",
                username: "robert",
                password: "rso123",
                organization: "CONTRACTOR",
                companyName: "REC - AEL Joint Venture",
                contractNo: "Contract No. DE/2024/12",
                role: "rso",
                department: "Registered Safety Officer",
                status: "online",
                projectIds: ["DE/2026/05", "DE/2025/02"],
                permissions: { level: 2, canChangeStatus: false, canManageUsers: false, name: "Registered Safety Officer" },
                passwordChanged: false,
                passwordChangedAt: null,
                passwordExpiresAt: null
            },
            // ============ SUBCONTRACTOR ============
            {
                id: 8,
                name: "WONG Lap Pan",
                email: "lpwong@abc-eng.com",
                username: "lpwong",
                password: "sub123",
                organization: "SUBCONTRACTOR",
                companyName: "ABC Engineering Ltd.",
                contractNo: "Contract No. DE/2024/12",
                role: "subcontractor",
                department: "Subcontractor Team A",
                status: "online",
                projectIds: ["DE/2026/05"],
                permissions: { level: 1, canChangeStatus: false, canManageUsers: false, name: "Subcontractor" },
                passwordChanged: false,
                passwordChangedAt: null,
                passwordExpiresAt: null
            },
            // ============ SUPPLIER ============
            {
                id: 9,
                name: "Emma Wilson",
                email: "emma.w@xyz-supply.com",
                username: "emma",
                password: "supplier123",
                organization: "SUPPLIER",
                companyName: "XYZ Materials Supply Co.",
                contractNo: "Contract No. DE/2024/12",
                role: "supplier",
                department: "Material Supplier",
                status: "online",
                projectIds: ["DE/2026/05"],
                permissions: { level: 1, canChangeStatus: false, canManageUsers: false, name: "Supplier" },
                passwordChanged: false,
                passwordChangedAt: null,
                passwordExpiresAt: null
            }
        ];

        localStorage.setItem('dwss_users_db', JSON.stringify(defaultUsers));
        if (window.DWSS_Storage && typeof window.DWSS_Storage.flush === 'function') {
            window.DWSS_Storage.flush('dwss_users_db');
        }
        console.log('[Login] ✓ 建立預設用戶資料庫（' + defaultUsers.length + ' 個用戶）');
    }

    // ==================== 密碼顯示/隱藏 ====================
    if (togglePasswordBtn && passwordInput) {
        togglePasswordBtn.addEventListener('click', function() {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            this.querySelector('i').classList.toggle('fa-eye');
            this.querySelector('i').classList.toggle('fa-eye-slash');
        });
    }

    // ==================== 顯示錯誤 ====================
    function showError(message, duration) {
        if (!errorDiv) return;
        errorDiv.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
        errorDiv.classList.add('show');
        setTimeout(() => {
            errorDiv.classList.remove('show');
        }, duration || 4000);
    }

    function showLockedMessage(lockInfo) {
        const mins = lockInfo.remainingMinutes || 0;
        showError(
            `🔒 Account locked due to too many failed attempts. ` +
            `Please try again in ${mins} minute${mins === 1 ? '' : 's'}, ` +
            `or contact an administrator to unlock.`,
            8000
        );
    }

    // ==================== 工具 ====================
    function findMatchingUser(username) {
        const users = JSON.parse(localStorage.getItem('dwss_users_db') || '[]');
        const needle = String(username || '').trim().toLowerCase();
        return users.find(u =>
            (u.username && u.username.toLowerCase() === needle) ||
            (u.email && u.email.toLowerCase() === needle) ||
            (u.name && u.name.toLowerCase() === needle)
        ) || null;
    }

    function getLockKey(username) {
        const matched = findMatchingUser(username);
        return matched ? matched.email.toLowerCase() : String(username || '').trim().toLowerCase();
    }

    // ==================== 登錄 ====================
    function loginUser(username, password, projectId) {
        console.log('[Login] 嘗試登入:', { username: username, projectId: projectId });

        initializeUserDatabase();

        // ---------- Step 1: 檢查帳號是否被鎖定 ----------
        if (typeof DWSS_Lockout !== 'undefined') {
            const matched = findMatchingUser(username);
            const keysToCheck = [String(username).trim().toLowerCase()];
            if (matched) {
                keysToCheck.push(matched.email.toLowerCase());
                keysToCheck.push(matched.username.toLowerCase());
            }
            for (let i = 0; i < keysToCheck.length; i++) {
                const lockStatus = DWSS_Lockout.isLocked(keysToCheck[i]);
                if (lockStatus.locked) {
                    console.log('[Login] ✗ 帳號被鎖定:', keysToCheck[i]);
                    showLockedMessage(lockStatus);
                    return false;
                }
            }
        }

        const users = JSON.parse(localStorage.getItem('dwss_users_db') || '[]');

        // ---------- Step 2: 找匹配的用戶（含密碼驗證）----------
        const user = users.find(u =>
            ((u.username && u.username.toLowerCase() === username.toLowerCase()) ||
             (u.email && u.email.toLowerCase() === username.toLowerCase()) ||
             (u.name && u.name.toLowerCase() === username.toLowerCase())) &&
            u.password === password
        );

        // ---------- Step 3: 用戶不存在 / 密碼錯誤 ----------
        if (!user) {
            console.log('[Login] ✗ 用戶不存在或密碼錯誤');
            if (typeof DWSS_Lockout !== 'undefined') {
                const lockKey = getLockKey(username);
                DWSS_Lockout.recordFailedAttempt(lockKey);
                const remaining = DWSS_Lockout.getRemainingAttempts(lockKey);
                if (remaining <= 0) {
                    const mins = Math.ceil(DWSS_Lockout.CONFIG.lockDurationMs / 60000);
                    showError(`🔒 Account locked for ${mins} minutes due to too many failed attempts.`, 8000);
                } else {
                    showError(`Invalid username or password. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining before lockout.`, 5000);
                }
            } else {
                showError('Invalid username or password');
            }
            return false;
        }

        console.log('[Login] ✓ 找到用戶:', user.name, '| role:', user.role);

        // ---------- Step 4: 項目權限檢查 ----------
        const isAdmin = (user.role === 'admin' || user.userRole === 'admin');

        if (!isAdmin) {
            // 非 admin 用戶必須有 projectIds
            if (!Array.isArray(user.projectIds) || user.projectIds.length === 0) {
                console.log('[Login] ✗ 用戶無任何項目權限');
                showError('Your account has no assigned projects. Please contact administrator.');
                return false;
            }
            // 檢查用戶是否有該項目權限
            if (!user.projectIds.includes(projectId)) {
                console.log('[Login] ✗ 無此項目權限:', projectId, '| 用戶可用項目:', user.projectIds);
                showError(`You do not have access to project "${projectId}". Your projects: ${user.projectIds.join(', ')}`);
                return false;
            }
        } else {
            console.log('[Login] ✓ Admin 用戶，跳過項目權限檢查');
        }

        console.log('[Login] ✓ 項目權限通過:', projectId);

        // ---------- Step 5: 帳號被停用 ----------
        if (user.status === 'offline') {
            console.log('[Login] ✗ 帳號已停用');
            showError('Account is disabled. Please contact administrator.');
            return false;
        }

        // ---------- Step 6: 成功登入 → 重置鎖定計數 ----------
        // ---------- Step 6: 成功登入 → 重置鎖定計數 ----------
        if (typeof DWSS_Lockout !== 'undefined') {
            DWSS_Lockout.recordSuccessfulAttempt(user.email.toLowerCase());
            DWSS_Lockout.recordSuccessfulAttempt(user.username.toLowerCase());
        }

        // ---------- Step 6.5: ★ 檢查密碼生命週期（首次登入 / 密碼過期）----------
        if (typeof DWSS_PasswordLifecycle !== 'undefined') {
            var pwdStatus = DWSS_PasswordLifecycle.enforce(user);
            console.log('[Login] 密碼狀態:', pwdStatus);

            // 需要改密碼（首次登入 或 密碼已過期）
            if (pwdStatus.required) {
                sessionStorage.setItem('password_change_user', JSON.stringify(user));
                sessionStorage.setItem('dwss_session', JSON.stringify({
                    isLoggedIn: true,
                    userId: user.id,
                    username: user.username,
                    userName: user.name,
                    userEmail: user.email,
                    userRole: user.role,
                    role: user.role,
                    organization: user.organization,
                    companyName: user.companyName,
                    contractNo: user.contractNo,
                    userDepartment: user.department,
                    projectIds: user.projectIds,
                    permissions: user.permissions,
                    loginTime: new Date().toISOString(),
                    pendingPasswordChange: true
                }));
                sessionStorage.setItem('currentProjectId', projectId);

                console.log('[Login] Password change required, waiting for account list to be stored');
                var go = function () { window.location.href = 'change-password.html'; };
                if (window.DWSS_Storage && typeof window.DWSS_Storage.flush === 'function') {
                    window.DWSS_Storage.flush('dwss_users_db').then(go).catch(go);
                } else {
                    go();
                }
                return 'PASSWORD_CHANGE_REQUIRED';
            }

            // 密碼即將到期（不強制，只提醒）
            if (pwdStatus.reason === 'expiring_soon') {
                setTimeout(function () {
                    alert('⚠️ Your password will expire in ' + pwdStatus.daysLeft + ' day(s).\n\nPlease change it soon to avoid login issues.');
                }, 500);

                if (typeof DWSS_EmailService !== 'undefined') {
                    DWSS_EmailService.sendPasswordExpiryReminder(user, pwdStatus.daysLeft);
                }
            }
        }

        // ---------- Step 7: 建立 session ----------
        const sessionData = {
            isLoggedIn: true,
            userId: user.id,
            userName: user.name,
            userEmail: user.email,
            userRole: user.role,
            role: user.role,
            organization: user.organization,
            companyName: user.companyName,
            contractNo: user.contractNo,
            userDepartment: user.department,
            projectIds: user.projectIds,
            permissions: user.permissions,
            loginTime: new Date().toISOString()
        };

        sessionStorage.setItem('dwss_session', JSON.stringify(sessionData));
        sessionStorage.setItem('isLoggedIn', 'true');
        sessionStorage.setItem('loggedUser', user.name);

        // ★★★ 保存當前選中的項目 ★★★
        sessionStorage.setItem('currentProjectId', projectId);

        sessionStorage.setItem('current_user', JSON.stringify({
            userId: user.id,
            userName: user.name,
            userRole: user.role,
            organization: user.organization,
            companyName: user.companyName,
            projectIds: user.projectIds,
            permissions: user.permissions
        }));

        console.log('[Login] ✓✓ 登入成功，currentProjectId =', projectId);
        return true;
    }

    function finishLogin(user, projectId) {
        if (typeof DWSS_Lockout !== 'undefined') {
            if (user.email) DWSS_Lockout.recordSuccessfulAttempt(user.email.toLowerCase());
            if (user.username) DWSS_Lockout.recordSuccessfulAttempt(user.username.toLowerCase());
        }
        if (typeof DWSS_PasswordLifecycle !== 'undefined') {
            var pwdStatus = DWSS_PasswordLifecycle.enforce(user);
            if (pwdStatus.required) {
                sessionStorage.setItem('dwss_session', JSON.stringify({
                    isLoggedIn: true,
                    userId: user.id,
                    username: user.username,
                    userName: user.name,
                    userEmail: user.email,
                    userRole: user.role,
                    role: user.role,
                    organization: user.organization,
                    companyName: user.companyName,
                    contractNo: user.contractNo,
                    userDepartment: user.department,
                    projectIds: user.projectIds,
                    permissions: user.permissions,
                    loginTime: new Date().toISOString(),
                    pendingPasswordChange: true
                }));
                sessionStorage.setItem('currentProjectId', projectId);
                window.location.href = 'change-password.html';
                return;
            }
        }
        sessionStorage.setItem('dwss_session', JSON.stringify({
            isLoggedIn: true,
            userId: user.id,
            userName: user.name,
            userEmail: user.email,
            userRole: user.role,
            role: user.role,
            organization: user.organization,
            companyName: user.companyName,
            contractNo: user.contractNo,
            userDepartment: user.department,
            projectIds: user.projectIds,
            permissions: user.permissions,
            sessionToken: user.sessionToken || '',
            loginTime: new Date().toISOString()
        }));
        sessionStorage.setItem('isLoggedIn', 'true');
        sessionStorage.setItem('loggedUser', user.name);
        sessionStorage.setItem('currentProjectId', projectId);
        window.location.href = 'index.html';
    }

    async function loginAgainstDatabase(username, password, projectId, forceLogout) {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, projectId, forceLogout: !!forceLogout })
        });
        const body = await res.json().catch(function () { return {}; });
        if (body.error === 'no_database') {
            showError('The server is not connected to the database. Start it with deploy\\start-windows.bat so the admin account is available.');
            return;
        }
        if (res.status === 401) {
            showError('Invalid username or password. For a fresh install use admin / admin123. If you already changed it on first login, use the new password.');
            return;
        }
        if (res.status === 403 && body.error === 'disabled') {
            showError('Account is disabled. Please contact administrator.');
            return;
        }
        if (res.status === 403 && body.error === 'no_project_access') {
            showError('You do not have access to project "' + projectId + '".');
            return;
        }
        if (res.status === 409 && body.error === 'already_logged_in') {
            var msg = body.message || 'This user is already logged in from another browser or computer.';
            var ok = confirm(msg + '\n\nLog that session out and continue here?');
            if (ok) return loginAgainstDatabase(username, password, projectId, true);
            showError('Login cancelled. The existing session is still active.');
            return;
        }
        if (!res.ok || !body.user) {
            showError('Login failed. Please try again.');
            return;
        }
        finishLogin(body.user, projectId);
    }

    // ==================== 表單提交 ====================
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();

            const username = usernameInput.value.trim();
            const password = passwordInput.value.trim();
            const projectId = document.getElementById('project').value;

            sessionStorage.removeItem('dwss_session');
            sessionStorage.removeItem('isLoggedIn');
            sessionStorage.removeItem('loggedUser');
            sessionStorage.removeItem('currentProjectId');

            if (!username || !password) {
                showError('Please enter username and password');
                return;
            }
            if (!projectId) {
                showError('Please select a project');
                return;
            }

            loginAgainstDatabase(username, password, projectId);
        });
    }

    // ==================== 更新頁面提示 ====================
    function updateLoginFooter() {
        const footer = document.querySelector('.login-footer');
        if (footer) {
            footer.innerHTML = `
                <p style="margin-bottom: 8px; font-weight: 600; color: #2c3e50;">Demo Credentials</p>
                <div style="font-size: 0.72rem; line-height: 1.7; text-align: left; display: inline-block;">
                    <div style="margin-bottom: 4px;">
                        <span style="color:#3498db;">●</span> <strong>AEL (System Vendor)</strong><br>
                        <code style="background:#f1f5f9;padding:1px 5px;border-radius:3px;">admin / admin123</code> (全部項目)
                    </div>
                    <div style="margin-bottom: 4px;">
                        <span style="color:#2c3e50;">●</span> <strong>DSD — EG</strong><br>
                        <code style="background:#f1f5f9;padding:1px 5px;border-radius:3px;">kenneth / officer123</code> (DE/2026/05, DE/2025/02)
                    </div>
                    <div style="margin-bottom: 4px;">
                        <span style="color:#16a085;">●</span> <strong>DSD — IG (Gary)</strong><br>
                        <code style="background:#f1f5f9;padding:1px 5px;border-radius:3px;">garytang / aei123</code> (DE/2026/05)
                    </div>
                    <div style="margin-bottom: 4px;">
                        <span style="color:#27ae60;">●</span> <strong>DSD — WSG</strong><br>
                        <code style="background:#f1f5f9;padding:1px 5px;border-radius:3px;">wcfung / wsg123</code> (DE/2026/05)
                    </div>
                    <div style="margin-bottom: 4px;">
                        <span style="color:#e74c3c;">●</span> <strong>REC-AEL JV — SA (John)</strong><br>
                        <code style="background:#f1f5f9;padding:1px 5px;border-radius:3px;">john / inspector123</code> (DE/2025/02)
                    </div>
                    <div style="margin-bottom: 4px;">
                        <span style="color:#c0392b;">●</span> <strong>REC-AEL JV — SSA (Sarah)</strong><br>
                        <code style="background:#f1f5f9;padding:1px 5px;border-radius:3px;">sarah / contractor123</code> (DE/2025/09)
                    </div>
                    <div style="margin-bottom: 4px;">
                        <span style="color:#d35400;">●</span> <strong>REC-AEL JV — RSO</strong><br>
                        <code style="background:#f1f5f9;padding:1px 5px;border-radius:3px;">robert / rso123</code> (DE/2026/05, DE/2025/02)
                    </div>
                    <div style="margin-bottom: 4px;">
                        <span style="color:#f39c12;">●</span> <strong>Subcontractor</strong><br>
                        <code style="background:#f1f5f9;padding:1px 5px;border-radius:3px;">lpwong / sub123</code> (DE/2026/05)
                    </div>
                    <div style="margin-bottom: 4px;">
                        <span style="color:#9b59b6;">●</span> <strong>Supplier</strong><br>
                        <code style="background:#f1f5f9;padding:1px 5px;border-radius:3px;">emma / supplier123</code> (DE/2026/05)
                    </div>
                    <div style="margin-bottom: 4px;">
                        <span style="color:#16a085;">●</span> <strong>DSD — IG (CHA)</strong><br>
                        <code style="background:#f1f5f9;padding:1px 5px;border-radius:3px;">cmcha / ig123</code> (DE/2025/02, DE/2025/09)
                    </div>
                </div>
                <p style="margin-top: 10px; font-size: 0.7rem; color: #e74c3c;">
                    <i class="fas fa-info-circle"></i> You can use username or email to login
                </p>
                <p style="margin-top: 4px; font-size: 0.65rem; color: #94a3b8;">
                    Contract No. DE/2024/12
                </p>
            `;
        }
    }

    updateLoginFooter();
}