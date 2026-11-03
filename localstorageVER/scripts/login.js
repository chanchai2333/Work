// login.js — DWSS Local Version (Two-Step Login with Project Picker)
document.addEventListener('DOMContentLoaded', function () {
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

    const projectModal = document.getElementById('project-modal');
    const projectListEl = document.getElementById('project-list');
    const pmUserInfo = document.getElementById('pm-user-info');
    const pmUserName = document.getElementById('pm-user-name');
    const pmCancelBtn = document.getElementById('pm-cancel');
    const pmEnterBtn = document.getElementById('pm-enter');

    let pendingUser = null;        // user object authenticated at step 1
    let selectedProject = null;    // project chosen in modal

    // ==================== Initialize user DB ====================
    function initializeUserDatabase() {
        const existing = localStorage.getItem('dwss_users_db');
        if (existing) {
            try {
                const parsed = JSON.parse(existing);
                if (Array.isArray(parsed) && parsed.length > 0) return;
            } catch (e) { /* corrupt → re-seed */ }
        }

        const defaultUsers = [
            { id:1, name:"Admin", email:"admin@ael-dwss.com", username:"admin", password:"admin123",
              organization:"SYSTEM_VENDOR", companyName:"AEL - Associated Engineers Ltd.",
              contractNo:"Contract No. DE/2024/12", role:"admin", department:"System Administration",
              status:"online", projectIds:["DE/2026/05","DE/2025/02","DE/2025/09"],
              permissions:{level:5,canChangeStatus:true,canManageUsers:true,name:"Administrator"},
              passwordChanged:false, passwordChangedAt:null, passwordExpiresAt:null },
            { id:2, name:"Kenneth Daluz", email:"kenneth.daluz@dsd.gov.hk", username:"kenneth", password:"officer123",
              organization:"SERVICE_MANAGER", companyName:"Drainage Services Department (DSD)",
              contractNo:"Contract No. DE/2024/12", role:"eg", department:"Engineer Grade",
              status:"online", projectIds:["DE/2026/05","DE/2025/02"],
              permissions:{level:4,canChangeStatus:false,canManageUsers:false,name:"Engineer Grade"},
              passwordChanged:false, passwordChangedAt:null, passwordExpiresAt:null },
            { id:3, name:"TANG Chi Long, Gary", email:"gcifang@dsd.gov.hk", username:"garytang", password:"aei123",
              organization:"SERVICE_MANAGER", companyName:"Drainage Services Department (DSD)",
              contractNo:"Contract No. DE/2024/12", role:"ig", department:"Inspector Grade",
              status:"online", projectIds:["DE/2026/05"],
              permissions:{level:3,canChangeStatus:true,canManageUsers:false,name:"Inspector Grade"},
              passwordChanged:false, passwordChangedAt:null, passwordExpiresAt:null },
            { id:4, name:"FUNG Wai Ching", email:"wcfung04@dsd.gov.hk", username:"wcfung", password:"wsg123",
              organization:"SERVICE_MANAGER", companyName:"Drainage Services Department (DSD)",
              contractNo:"Contract No. DE/2024/12", role:"wsg", department:"Works Supervisor Grade",
              status:"online", projectIds:["DE/2026/05"],
              permissions:{level:3,canChangeStatus:true,canManageUsers:false,name:"Works Supervisor Grade"},
              passwordChanged:false, passwordChangedAt:null, passwordExpiresAt:null },
            { id:10, name:"CHA Chi Ming", email:"cmcha02@dsd.gov.hk", username:"cmcha", password:"ig123",
              organization:"SERVICE_MANAGER", companyName:"Drainage Services Department (DSD)",
              contractNo:"Contract No. DE/2024/12", role:"ig", department:"Inspector Grade",
              status:"online", projectIds:["DE/2025/02","DE/2025/09"],
              permissions:{level:3,canChangeStatus:true,canManageUsers:false,name:"Inspector Grade"},
              passwordChanged:false, passwordChangedAt:null, passwordExpiresAt:null },
            { id:5, name:"John Smith", email:"john.smith@rec-ael.com", username:"john", password:"inspector123",
              organization:"CONTRACTOR", companyName:"REC - AEL Joint Venture",
              contractNo:"Contract No. DE/2024/12", role:"sa", department:"Site Agent",
              status:"online", projectIds:["DE/2025/02"],
              permissions:{level:2,canChangeStatus:false,canManageUsers:false,name:"Site Agent"},
              passwordChanged:false, passwordChangedAt:null, passwordExpiresAt:null },
            { id:6, name:"Sarah Johnson", email:"sarah.j@rec-ael.com", username:"sarah", password:"contractor123",
              organization:"CONTRACTOR", companyName:"REC - AEL Joint Venture",
              contractNo:"Contract No. DE/2024/12", role:"ssa", department:"Sub-Site Agent",
              status:"online", projectIds:["DE/2025/09"],
              permissions:{level:2,canChangeStatus:false,canManageUsers:false,name:"Sub-Site Agent"},
              passwordChanged:false, passwordChangedAt:null, passwordExpiresAt:null },
            { id:7, name:"Robert Chen", email:"robert.chen@rec-ael.com", username:"robert", password:"rso123",
              organization:"CONTRACTOR", companyName:"REC - AEL Joint Venture",
              contractNo:"Contract No. DE/2024/12", role:"rso", department:"Registered Safety Officer",
              status:"online", projectIds:["DE/2026/05","DE/2025/02"],
              permissions:{level:2,canChangeStatus:false,canManageUsers:false,name:"Registered Safety Officer"},
              passwordChanged:false, passwordChangedAt:null, passwordExpiresAt:null },
            { id:8, name:"WONG Lap Pan", email:"lpwong@abc-eng.com", username:"lpwong", password:"sub123",
              organization:"SUBCONTRACTOR", companyName:"ABC Engineering Ltd.",
              contractNo:"Contract No. DE/2024/12", role:"subcontractor", department:"Subcontractor Team A",
              status:"online", projectIds:["DE/2026/05"],
              permissions:{level:1,canChangeStatus:false,canManageUsers:false,name:"Subcontractor"},
              passwordChanged:false, passwordChangedAt:null, passwordExpiresAt:null },
            { id:9, name:"Emma Wilson", email:"emma.w@xyz-supply.com", username:"emma", password:"supplier123",
              organization:"SUPPLIER", companyName:"XYZ Materials Supply Co.",
              contractNo:"Contract No. DE/2024/12", role:"supplier", department:"Material Supplier",
              status:"online", projectIds:["DE/2026/05"],
              permissions:{level:1,canChangeStatus:false,canManageUsers:false,name:"Supplier"},
              passwordChanged:false, passwordChangedAt:null, passwordExpiresAt:null }
        ];

        localStorage.setItem('dwss_users_db', JSON.stringify(defaultUsers));
        if (window.DWSS_Storage && typeof window.DWSS_Storage.flush === 'function') {
            window.DWSS_Storage.flush('dwss_users_db');
        }
        console.log('[Login] ✓ Seeded ' + defaultUsers.length + ' default users');
    }

    // ==================== Password show/hide ====================
    if (togglePasswordBtn && passwordInput) {
        togglePasswordBtn.addEventListener('click', function () {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            this.querySelector('i').classList.toggle('fa-eye');
            this.querySelector('i').classList.toggle('fa-eye-slash');
        });
    }

    // ==================== Error helpers ====================
    function showError(message, duration) {
        if (!errorDiv) return;
        errorDiv.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
        errorDiv.classList.add('show');
        setTimeout(() => errorDiv.classList.remove('show'), duration || 4000);
    }

    function showLockedMessage(lockInfo) {
        const mins = lockInfo.remainingMinutes || 0;
        showError(
            `🔒 Account locked. Try again in ${mins} minute${mins === 1 ? '' : 's'}, ` +
            `or contact an administrator to unlock.`, 8000);
    }

    // ==================== User lookup ====================
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

    // ==================== STEP 1: Credential check ====================
    // Returns: { ok: true, user }  OR  { ok: false, message }
    function authenticate(username, password) {
        initializeUserDatabase();

        // Lockout check
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
                    return { ok: false, message: 'LOCKED', lockInfo: lockStatus };
                }
            }
        }

        const users = JSON.parse(localStorage.getItem('dwss_users_db') || '[]');
        const user = users.find(u =>
            ((u.username && u.username.toLowerCase() === username.toLowerCase()) ||
             (u.email && u.email.toLowerCase() === username.toLowerCase()) ||
             (u.name && u.name.toLowerCase() === username.toLowerCase())) &&
            u.password === password
        );

        if (!user) {
            if (typeof DWSS_Lockout !== 'undefined') {
                const lockKey = getLockKey(username);
                DWSS_Lockout.recordFailedAttempt(lockKey);
                const remaining = DWSS_Lockout.getRemainingAttempts(lockKey);
                if (remaining <= 0) {
                    const mins = Math.ceil(DWSS_Lockout.CONFIG.lockDurationMs / 60000);
                    return { ok: false, message: `🔒 Account locked for ${mins} minutes.` };
                }
                return { ok: false, message: `Invalid username or password. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.` };
            }
            return { ok: false, message: 'Invalid username or password' };
        }

        if (user.status === 'offline') {
            return { ok: false, message: 'Account is disabled. Please contact administrator.' };
        }

        // Success → reset lock counters
        if (typeof DWSS_Lockout !== 'undefined') {
            DWSS_Lockout.recordSuccessfulAttempt(user.email.toLowerCase());
            DWSS_Lockout.recordSuccessfulAttempt(user.username.toLowerCase());
        }

        return { ok: true, user: user };
    }

    // ==================== STEP 2: Project picker modal ====================
    function getAccessibleProjects(user) {
        // Admin / userRole admin → all projects
        const isAdmin = (user.role === 'admin' || user.userRole === 'admin');
        if (isAdmin) {
            return ['DE/2026/05', 'DE/2025/02', 'DE/2025/09'];
        }
        return Array.isArray(user.projectIds) ? user.projectIds.slice() : [];
    }

    function openProjectPicker(user) {
        pendingUser = user;
        selectedProject = null;

        const projects = getAccessibleProjects(user);

        // Header info
        if (projects.length === 0) {
            pmUserInfo.style.display = 'none';
        } else {
            pmUserInfo.style.display = 'flex';
            pmUserName.textContent = user.name + ' · ' + (user.department || user.role || '');
        }

        // Build list
        projectListEl.innerHTML = '';
        if (projects.length === 0) {
            projectListEl.innerHTML =
                '<div class="pm-empty">Your account has no assigned projects.<br>Please contact the administrator.</div>';
            pmEnterBtn.disabled = true;
        } else {
            projects.forEach(function (pid) {
                const opt = document.createElement('div');
                opt.className = 'project-option';
                opt.dataset.projectId = pid;
                opt.innerHTML = `<span>${pid}</span><span class="po-check"><i class="fas fa-check"></i></span>`;
                opt.addEventListener('click', function () {
                    projectListEl.querySelectorAll('.project-option')
                        .forEach(el => el.classList.remove('selected'));
                    opt.classList.add('selected');
                    selectedProject = pid;
                    pmEnterBtn.disabled = false;
                });
                projectListEl.appendChild(opt);
            });
            pmEnterBtn.disabled = true;
        }

        projectModal.classList.add('show');
        setTimeout(function () {
            const first = projectListEl.querySelector('.project-option');
            if (first) first.focus();
        }, 50);
    }

    function closeProjectPicker() {
        projectModal.classList.remove('show');
        pendingUser = null;
        selectedProject = null;
        pmEnterBtn.disabled = true;
    }

    // ==================== STEP 3: Finish login with project ====================
    function finishLogin(user, projectId) {
        // Password lifecycle check (first login / expired)
        if (typeof DWSS_PasswordLifecycle !== 'undefined') {
            const pwdStatus = DWSS_PasswordLifecycle.enforce(user);
            if (pwdStatus.required) {
                sessionStorage.setItem('password_change_user', JSON.stringify(user));
                sessionStorage.setItem('dwss_session', JSON.stringify({
                    isLoggedIn: true,
                    userId: user.id, username: user.username, userName: user.name,
                    userEmail: user.email, userRole: user.role, role: user.role,
                    organization: user.organization, companyName: user.companyName,
                    contractNo: user.contractNo, userDepartment: user.department,
                    projectIds: user.projectIds, permissions: user.permissions,
                    loginTime: new Date().toISOString(),
                    pendingPasswordChange: true
                }));
                sessionStorage.setItem('currentProjectId', projectId);

                var go = function () { window.location.href = 'change-password.html'; };
                if (window.DWSS_Storage && typeof window.DWSS_Storage.flush === 'function') {
                    window.DWSS_Storage.flush('dwss_users_db').then(go).catch(go);
                } else {
                    go();
                }
                return;
            }
            if (pwdStatus.reason === 'expiring_soon') {
                setTimeout(function () {
                    alert('⚠️ Your password will expire in ' + pwdStatus.daysLeft +
                          ' day(s). Please change it soon.');
                }, 500);
                if (typeof DWSS_EmailService !== 'undefined') {
                    DWSS_EmailService.sendPasswordExpiryReminder(user, pwdStatus.daysLeft);
                }
            }
        }

        // Build session
        const sessionData = {
            isLoggedIn: true,
            userId: user.id, username: user.username, userName: user.name,
            userEmail: user.email, userRole: user.role, role: user.role,
            organization: user.organization, companyName: user.companyName,
            contractNo: user.contractNo, userDepartment: user.department,
            projectIds: user.projectIds, permissions: user.permissions,
            loginTime: new Date().toISOString()
        };

        sessionStorage.setItem('dwss_session', JSON.stringify(sessionData));
        sessionStorage.setItem('isLoggedIn', 'true');
        sessionStorage.setItem('loggedUser', user.name);
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

        console.log('[Login] ✓ Logged in:', user.name, '→ project:', projectId);
        window.location.href = 'index.html';
    }

    // ==================== Form submit ====================
    if (form) {
        form.addEventListener('submit', function (e) {
            e.preventDefault();

            const username = usernameInput.value.trim();
            const password = passwordInput.value.trim();

            // Clear stale session
            sessionStorage.removeItem('dwss_session');
            sessionStorage.removeItem('isLoggedIn');
            sessionStorage.removeItem('loggedUser');
            sessionStorage.removeItem('currentProjectId');

            if (!username || !password) {
                showError('Please enter username and password');
                return;
            }

            const result = authenticate(username, password);

            if (!result.ok) {
                if (result.message === 'LOCKED') {
                    showLockedMessage(result.lockInfo);
                } else {
                    showError(result.message, 6000);
                }
                return;
            }

            // Credentials OK → open project picker
            console.log('[Login] ✓ Credentials OK for', result.user.name);
            openProjectPicker(result.user);
        });
    }

    // ==================== Modal buttons ====================
    if (pmCancelBtn) {
        pmCancelBtn.addEventListener('click', function () {
            closeProjectPicker();
        });
    }

    if (pmEnterBtn) {
        pmEnterBtn.addEventListener('click', function () {
            if (!pendingUser || !selectedProject) return;
            const user = pendingUser;
            const pid = selectedProject;
            closeProjectPicker();
            finishLogin(user, pid);
        });
    }

    // Close on overlay click
    if (projectModal) {
        projectModal.addEventListener('click', function (e) {
            if (e.target === projectModal) closeProjectPicker();
        });
    }

    // ESC to close
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && projectModal && projectModal.classList.contains('show')) {
            closeProjectPicker();
        }
    });

    // ==================== Demo credentials footer ====================
    function updateLoginFooter() {
        const footer = document.querySelector('.login-footer');
        if (!footer) return;
        footer.innerHTML = `
            <p style="margin-bottom: 8px; font-weight: 600; color: #2c3e50;">Demo Credentials</p>
            <div style="font-size: 0.72rem; line-height: 1.7; text-align: left; display: inline-block;">
                <div style="margin-bottom: 4px;">
                    <span style="color:#3498db;">●</span> <strong>AEL (System Vendor)</strong><br>
                    <code style="background:#f1f5f9;padding:1px 5px;border-radius:3px;">admin / admin123</code>
                </div>
                <div style="margin-bottom: 4px;">
                    <span style="color:#2c3e50;">●</span> <strong>DSD — EG</strong><br>
                    <code style="background:#f1f5f9;padding:1px 5px;border-radius:3px;">kenneth / officer123</code>
                </div>
                <div style="margin-bottom: 4px;">
                    <span style="color:#16a085;">●</span> <strong>DSD — IG (Gary)</strong><br>
                    <code style="background:#f1f5f9;padding:1px 5px;border-radius:3px;">garytang / aei123</code>
                </div>
                <div style="margin-bottom: 4px;">
                    <span style="color:#27ae60;">●</span> <strong>DSD — WSG</strong><br>
                    <code style="background:#f1f5f9;padding:1px 5px;border-radius:3px;">wcfung / wsg123</code>
                </div>
                <div style="margin-bottom: 4px;">
                    <span style="color:#e74c3c;">●</span> <strong>REC-AEL JV — SA (John)</strong><br>
                    <code style="background:#f1f5f9;padding:1px 5px;border-radius:3px;">john / inspector123</code>
                </div>
                <div style="margin-bottom: 4px;">
                    <span style="color:#c0392b;">●</span> <strong>REC-AEL JV — SSA (Sarah)</strong><br>
                    <code style="background:#f1f5f9;padding:1px 5px;border-radius:3px;">sarah / contractor123</code>
                </div>
                <div style="margin-bottom: 4px;">
                    <span style="color:#d35400;">●</span> <strong>REC-AEL JV — RSO</strong><br>
                    <code style="background:#f1f5f9;padding:1px 5px;border-radius:3px;">robert / rso123</code>
                </div>
                <div style="margin-bottom: 4px;">
                    <span style="color:#f39c12;">●</span> <strong>Subcontractor</strong><br>
                    <code style="background:#f1f5f9;padding:1px 5px;border-radius:3px;">lpwong / sub123</code>
                </div>
                <div style="margin-bottom: 4px;">
                    <span style="color:#9b59b6;">●</span> <strong>Supplier</strong><br>
                    <code style="background:#f1f5f9;padding:1px 5px;border-radius:3px;">emma / supplier123</code>
                </div>
                <div style="margin-bottom: 4px;">
                    <span style="color:#16a085;">●</span> <strong>DSD — IG (CHA)</strong><br>
                    <code style="background:#f1f5f9;padding:1px 5px;border-radius:3px;">cmcha / ig123</code>
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

    updateLoginFooter();
}