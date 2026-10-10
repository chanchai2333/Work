// login.js - DWSS 多用戶登錄系統 (with Account Lockout + Project Selection)
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('login-form');
    const errorDiv = document.getElementById('login-error');
    const togglePasswordBtn = document.getElementById('toggle-password');
    const passwordInput = document.getElementById('password');
    const usernameInput = document.getElementById('username');

    // ==================== 初始化用戶數據庫 ====================
    function initializeUserDatabase() {
        const stored = localStorage.getItem('dwss_users_db');

        // 每個用戶的預設 projects（用於補全舊資料）
        const defaultProjectsMap = {
            'admin':    ["DE/2026/05", "DE/2025/02", "DE/2025/09"],
            'kenneth':  ["DE/2026/05", "DE/2025/02", "DE/2025/09"],
            'garytang': ["DE/2026/05"],
            'john':     ["DE/2025/02"],
            'sarah':    ["DE/2025/09"]
        };

        // ★ 情況 1：DB 不存在 → 建立完整預設用戶
        if (!stored) {
            const defaultUsers = [
                {
                    id: 1,
                    name: "Admin",
                    email: "admin@rdrive.io",
                    username: "admin",
                    password: "admin123",
                    projects: ["DE/2026/05", "DE/2025/02", "DE/2025/09"],
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
                    projects: ["DE/2026/05", "DE/2025/02", "DE/2025/09"],
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
                    projects: ["DE/2026/05"],
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
                    projects: ["DE/2025/02"],
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
                    projects: ["DE/2025/09"],
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
            console.log('[Login] ✓ 建立預設用戶資料庫');
            return;
        }

        // ★ 情況 2：DB 已存在 → 檢查是否有舊用戶缺 projects 欄位，補上
        try {
            const users = JSON.parse(stored);
            if (!Array.isArray(users)) return;

            let patched = 0;
            users.forEach(u => {
                if (!Array.isArray(u.projects) || u.projects.length === 0) {
                    // 從 map 裡找對應的 projects，找不到就給全部
                    const key = (u.username || '').toLowerCase();
                    u.projects = defaultProjectsMap[key] || ["DE/2026/05", "DE/2025/02", "DE/2025/09"];
                    patched++;
                }
            });

            if (patched > 0) {
                localStorage.setItem('dwss_users_db', JSON.stringify(users));
                console.log('[Login] ✓ 已為 ' + patched + ' 個舊用戶補上 projects 欄位');
            }
        } catch (e) {
            console.warn('[Login] DB 解析失敗，重建預設用戶', e);
            localStorage.removeItem('dwss_users_db');
            initializeUserDatabase();
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
    function getLockKey(username) {
        const matched = findMatchingUser(username);
        return matched ? matched.email.toLowerCase() : String(username || '').trim().toLowerCase();
    }

    // ==================== 登錄驗證 ====================
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

        console.log('[Login] ✓ 找到用戶:', user.name);

        // ---------- Step 4: 項目權限檢查（用戶存在後才檢查）----------
        if (!Array.isArray(user.projects) || !user.projects.includes(projectId)) {
            console.log('[Login] ✗ 無此項目權限:', projectId, '| 用戶可用項目:', user.projects);
            showError('You do not have access to this project.');
            return false;
        }

        console.log('[Login] ✓ 項目權限通過:', projectId);

        // ---------- Step 5: 帳號被停用 ----------
        if (user.status === 'offline') {
            console.log('[Login] ✗ 帳號已停用');
            showError('Account is disabled. Please contact administrator.');
            return false;
        }

        // ---------- Step 6: 成功登入 → 重置鎖定計數 ----------
        if (typeof DWSS_Lockout !== 'undefined') {
            DWSS_Lockout.recordSuccessfulAttempt(user.email.toLowerCase());
            DWSS_Lockout.recordSuccessfulAttempt(user.username.toLowerCase());
        }

        // ---------- Step 7: 建立 session ----------
        const sessionData = {
            isLoggedIn: true,
            userId: user.id,
            userName: user.name,
            userEmail: user.email,
            userRole: user.role,
            userDepartment: user.department,
            permissions: user.permissions,
            projectId: projectId,
            projectName: projectId,
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

        console.log('[Login] ✓✓ 登入成功，session 已建立');
        return true;
    }

    // ==================== 表單提交 ====================
    form.addEventListener('submit', function(e) {
        e.preventDefault();

        const username = usernameInput.value.trim();
        const password = passwordInput.value.trim();
        const projectId = document.getElementById('project').value;

        // 先清掉舊的 session（避免殘留）
        sessionStorage.removeItem('dwss_session');
        sessionStorage.removeItem('isLoggedIn');
        sessionStorage.removeItem('loggedUser');

        if (!username || !password) {
            showError('Please enter username and password');
            return;
        }

        if (!projectId) {
            showError('Please select a project');
            return;
        }

        if (loginUser(username, password, projectId)) {
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
                    <div>🔴 <strong>Admin:</strong> admin / admin123 (全部項目)</div>
                    <div>🔵 <strong>Officer:</strong> kenneth / officer123 (全部項目)</div>
                    <div>🟢 <strong>AEI:</strong> garytang / aei123 (DE/2026/05)</div>
                    <div>🟡 <strong>Inspector:</strong> john / inspector123 (DE/2025/02)</div>
                    <div>⚫ <strong>Contractor:</strong> sarah / contractor123 (DE/2025/09)</div>
                </div>
                <p style="margin-top: 8px; font-size: 0.7rem; color: #e74c3c;">
                    <i class="fas fa-info-circle"></i> You can use username or email to login
                </p>
            `;
        }
    }

    updateLoginFooter();
});