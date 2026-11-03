// login.js — DWSS Cloud Version (Two-Step Login with Project Picker)
document.addEventListener('DOMContentLoaded', function () {
    var form = document.getElementById('login-form');
    var submitBtn = form ? form.querySelector('button[type="submit"]') : null;
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.dataset.label = submitBtn.innerHTML;
        submitBtn.innerHTML = 'Loading...';
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

    let pendingUser = null;        // user returned by authenticate step
    let selectedProject = null;    // project chosen in popup
    let pendingCredentials = null; // { username, password } cached until Enter System

    const ALL_PROJECTS = ['DE/2026/05', 'DE/2025/02', 'DE/2025/09'];

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
        setTimeout(() => errorDiv.classList.remove('show'), duration || 5000);
    }

    // ==================== STEP 1: authenticate against backend ====================
    // POST /api/auth/login with mode=authenticate (no projectId yet).
    // Expected response: { ok: true, user: { ..., projectIds: [...] } }
    async function authenticateCloud(username, password) {
        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password, mode: 'authenticate' })
            });
            const body = await res.json().catch(() => ({}));

            if (body.error === 'no_database') {
                return { ok: false, message: 'Server is not connected to the database. Start it with deploy\\start-windows.bat.' };
            }
            if (res.status === 401) {
                return { ok: false, message: 'Invalid username or password.' };
            }
            if (res.status === 403 && body.error === 'disabled') {
                return { ok: false, message: 'Account is disabled. Please contact administrator.' };
            }
            if (res.status === 409 && body.error === 'already_logged_in') {
                return { ok: false, code: 'ALREADY_LOGGED_IN', message: body.message || 'User already logged in elsewhere.', body };
            }
            if (!res.ok || !body.user) {
                return { ok: false, message: 'Login failed. Please try again.' };
            }
            return { ok: true, user: body.user };
        } catch (err) {
            console.error('[Login] network error:', err);
            return { ok: false, message: 'Cannot reach server. Check your connection.' };
        }
    }

    // ==================== STEP 2: project picker ====================
    function getAccessibleProjects(user) {
        const isAdmin = (user.role === 'admin' || user.userRole === 'admin');
        if (isAdmin) {
            return (Array.isArray(user.projectIds) && user.projectIds.length)
                ? user.projectIds.slice()
                : ALL_PROJECTS.slice();
        }
        return Array.isArray(user.projectIds) ? user.projectIds.slice() : [];
    }

    function openProjectPicker(user) {
        pendingUser = user;
        selectedProject = null;

        const projects = getAccessibleProjects(user);

        pmUserInfo.style.display = projects.length ? 'flex' : 'none';
        pmUserName.textContent = user.name + ' · ' + (user.department || user.role || '');

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
    }

    function closeProjectPicker() {
        projectModal.classList.remove('show');
        pendingUser = null;
        selectedProject = null;
        pendingCredentials = null;
        pmEnterBtn.disabled = true;
    }

    // ==================== STEP 3: commit session with project ====================
    // POST /api/auth/login again, this time including projectId + mode=commit.
    // Expected response: { ok: true, user: { ..., sessionToken } }
    async function commitLogin(username, password, projectId, forceLogout) {
        pmEnterBtn.disabled = true;
        const original = pmEnterBtn.innerHTML;
        pmEnterBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing in...';

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username, password, projectId,
                    mode: 'commit', forceLogout: !!forceLogout
                })
            });
            const body = await res.json().catch(() => ({}));

            if (res.status === 401) { showError('Session expired. Please sign in again.'); closeProjectPicker(); return; }
            if (res.status === 403 && body.error === 'no_project_access') {
                showError('You do not have access to project "' + projectId + '".');
                pmEnterBtn.disabled = false; pmEnterBtn.innerHTML = original; return;
            }
            if (res.status === 409 && body.error === 'already_logged_in') {
                var msg = body.message || 'This user is already logged in elsewhere.';
                if (confirm(msg + '\n\nLog that session out and continue here?')) {
                    return commitLogin(username, password, projectId, true);
                }
                closeProjectPicker();
                showError('Login cancelled. Existing session is still active.');
                return;
            }
            if (!res.ok || !body.user) {
                showError('Login failed. Please try again.');
                pmEnterBtn.disabled = false; pmEnterBtn.innerHTML = original; return;
            }

            finishLogin(body.user, projectId);
        } catch (err) {
            console.error('[Login] commit error:', err);
            showError('Cannot reach server. Check your connection.');
            pmEnterBtn.disabled = false; pmEnterBtn.innerHTML = original;
        }
    }

    // ==================== STEP 4: write session & redirect ====================
    function finishLogin(user, projectId) {
        if (typeof DWSS_PasswordLifecycle !== 'undefined') {
            const pwdStatus = DWSS_PasswordLifecycle.enforce(user);
            if (pwdStatus.required) {
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
                window.location.href = 'change-password.html';
                return;
            }
        }

        sessionStorage.setItem('dwss_session', JSON.stringify({
            isLoggedIn: true,
            userId: user.id, username: user.username, userName: user.name,
            userEmail: user.email, userRole: user.role, role: user.role,
            organization: user.organization, companyName: user.companyName,
            contractNo: user.contractNo, userDepartment: user.department,
            projectIds: user.projectIds, permissions: user.permissions,
            sessionToken: user.sessionToken || '',
            loginTime: new Date().toISOString()
        }));
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

        window.location.href = 'index.html';
    }

    // ==================== Form submit ====================
    if (form) {
        form.addEventListener('submit', async function (e) {
            e.preventDefault();

            const username = usernameInput.value.trim();
            const password = passwordInput.value.trim();

            sessionStorage.removeItem('dwss_session');
            sessionStorage.removeItem('isLoggedIn');
            sessionStorage.removeItem('loggedUser');
            sessionStorage.removeItem('currentProjectId');

            if (!username || !password) {
                showError('Please enter username and password');
                return;
            }

            // Disable while calling
            const originalHTML = form.querySelector('button[type="submit"]').innerHTML;
            form.querySelector('button[type="submit"]').disabled = true;
            form.querySelector('button[type="submit"]').innerHTML =
                '<i class="fas fa-spinner fa-spin"></i> Verifying...';

            const result = await authenticateCloud(username, password);

            form.querySelector('button[type="submit"]').disabled = false;
            form.querySelector('button[type="submit"]').innerHTML = originalHTML;

            if (!result.ok) {
                if (result.code === 'ALREADY_LOGGED_IN') {
                    // Handle at commit step instead — but if backend blocks here, ask now:
                    if (confirm((result.message || 'User already logged in.') +
                                '\n\nLog that session out and continue here?')) {
                        pendingCredentials = { username, password };
                        // We'll need the user object from the body
                        if (result.body && result.body.user) {
                            openProjectPicker(result.body.user);
                        } else {
                            showError('Cannot continue. Please try again.');
                        }
                    } else {
                        showError('Login cancelled. Existing session is still active.');
                    }
                } else {
                    showError(result.message, 6000);
                }
                return;
            }

            // Credentials OK — cache them for the commit step
            pendingCredentials = { username, password };
            openProjectPicker(result.user);
        });
    }

    // ==================== Modal buttons ====================
    if (pmCancelBtn) pmCancelBtn.addEventListener('click', closeProjectPicker);

    if (pmEnterBtn) {
        pmEnterBtn.addEventListener('click', function () {
            if (!pendingUser || !selectedProject || !pendingCredentials) return;
            const pid = selectedProject;
            const creds = pendingCredentials;
            commitLogin(creds.username, creds.password, pid, false);
        });
    }

    if (projectModal) {
        projectModal.addEventListener('click', function (e) {
            if (e.target === projectModal) closeProjectPicker();
        });
    }

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
                <div style="margin-bottom: 4px;"><span style="color:#3498db;">●</span> <strong>AEL (System Vendor)</strong><br>
                    <code style="background:#f1f5f9;padding:1px 5px;border-radius:3px;">admin / admin123</code></div>
                <div style="margin-bottom: 4px;"><span style="color:#2c3e50;">●</span> <strong>DSD — EG</strong><br>
                    <code style="background:#f1f5f9;padding:1px 5px;border-radius:3px;">kenneth / officer123</code></div>
                <div style="margin-bottom: 4px;"><span style="color:#16a085;">●</span> <strong>DSD — IG (Gary)</strong><br>
                    <code style="background:#f1f5f9;padding:1px 5px;border-radius:3px;">garytang / aei123</code></div>
                <div style="margin-bottom: 4px;"><span style="color:#27ae60;">●</span> <strong>DSD — WSG</strong><br>
                    <code style="background:#f1f5f9;padding:1px 5px;border-radius:3px;">wcfung / wsg123</code></div>
                <div style="margin-bottom: 4px;"><span style="color:#e74c3c;">●</span> <strong>REC-AEL JV — SA (John)</strong><br>
                    <code style="background:#f1f5f9;padding:1px 5px;border-radius:3px;">john / inspector123</code></div>
                <div style="margin-bottom: 4px;"><span style="color:#c0392b;">●</span> <strong>REC-AEL JV — SSA (Sarah)</strong><br>
                    <code style="background:#f1f5f9;padding:1px 5px;border-radius:3px;">sarah / contractor123</code></div>
                <div style="margin-bottom: 4px;"><span style="color:#d35400;">●</span> <strong>REC-AEL JV — RSO</strong><br>
                    <code style="background:#f1f5f9;padding:1px 5px;border-radius:3px;">robert / rso123</code></div>
                <div style="margin-bottom: 4px;"><span style="color:#f39c12;">●</span> <strong>Subcontractor</strong><br>
                    <code style="background:#f1f5f9;padding:1px 5px;border-radius:3px;">lpwong / sub123</code></div>
                <div style="margin-bottom: 4px;"><span style="color:#9b59b6;">●</span> <strong>Supplier</strong><br>
                    <code style="background:#f1f5f9;padding:1px 5px;border-radius:3px;">emma / supplier123</code></div>
                <div style="margin-bottom: 4px;"><span style="color:#16a085;">●</span> <strong>DSD — IG (CHA)</strong><br>
                    <code style="background:#f1f5f9;padding:1px 5px;border-radius:3px;">cmcha / ig123</code></div>
            </div>
        `;
    }

    updateLoginFooter();
}