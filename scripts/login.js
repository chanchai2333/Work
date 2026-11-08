// login.js - Force Logout & Project Picker Handler
document.addEventListener('DOMContentLoaded', function () {
    var form = document.getElementById('login-form');
    if (form) {
        form.addEventListener('submit', handleLogin);
    }

    const projectModal = document.getElementById('project-modal');
    const projectListEl = document.getElementById('project-list');
    const pmEnterBtn = document.getElementById('pm-enter');
    const pmCancelBtn = document.getElementById('pm-cancel');
    
    let pendingCredentials = null;
    let selectedProject = null;

    async function handleLogin(e) {
        if (e) e.preventDefault();
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value.trim();
        const submitBtn = form.querySelector('button[type="submit"]');
        const errorDiv = document.getElementById('login-error');
        
        if (!username || !password) return showError('Enter username and password');

        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verifying...';
        if (errorDiv) errorDiv.classList.remove('show');
        sessionStorage.clear();

        try {
            // 1. Try to login
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            
            const data = await res.json().catch(() => ({}));

            // 2. Handle the "Already Logged In" lock
            if (res.status === 409 && data.error === 'already_logged_in') {
                // Ask the user
                const doForce = confirm("This account is already logged in from another browser or computer.\n\nDo you want to log out that session and log in here?");
                
                if (doForce) {
                    // Send the request again WITH forceLogout: true
                    return retryWithForce(username, password);
                } else {
                    showError('Login cancelled.');
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Sign In';
                    return;
                }
            }

            if (!res.ok || !data.user) {
            var msg = 'Invalid username or password.';
            if (data && data.error === 'no_project_access') {
                msg = 'You do not have access to the selected project.';
            } else if (data && data.error === 'no_projects_assigned') {
                msg = 'No projects have been assigned to your account. Please contact the administrator.';
            } else if (data && data.error === 'disabled') {
                msg = 'This account is disabled. Please contact the administrator.';
            } else if (data && data.message) {
                msg = data.message;
            }
            showError(msg);
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Sign In';
            return;
        }

            // 3. Success! Show project picker
            pendingCredentials = { username, password };
            showProjectPicker(data.user);

        } catch (err) {
            showError('Cannot connect to server.');
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Sign In';
        }
    }

    async function retryWithForce(username, password) {
        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password, forceLogout: true })
            });
            const data = await res.json();
            if (res.ok && data.user) {
                pendingCredentials = { username, password };
                showProjectPicker(data.user);
            } else {
                showError(data.message || 'Force login failed.');
                document.querySelector('button[type="submit"]').disabled = false;
                document.querySelector('button[type="submit"]').innerHTML = 'Sign In';
            }
        } catch (err) {
            showError('Network error.');
        }
    }

    function loadContractNameMap() {
        var map = {};
        // Always include testing defaults
        ['DE/2026/05', 'DE/2024/06', 'DE/2025/07'].forEach(function (id) {
            map[id] = id;
        });
        ['dwss_contracts', 'dwss_projects', 'projects', 'ael_dwss_projects'].forEach(function (key) {
            try {
                var arr = JSON.parse(localStorage.getItem(key) || '[]');
                if (!Array.isArray(arr)) return;
                arr.forEach(function (p) {
                    var id = p.contractNo || p.id || p.code;
                    if (id) map[id] = p.name || id;
                });
            } catch (e) {}
        });
        return map;
    }

    function findLocalUser(user) {
        if (!user) return null;
        try {
            var keys = ['dwss_users_db', 'ael_dwss_users'];
            for (var i = 0; i < keys.length; i++) {
                var arr = JSON.parse(localStorage.getItem(keys[i]) || '[]');
                if (!Array.isArray(arr)) continue;
                var found = arr.find(function (u) {
                    if (!u) return false;
                    if (user.username && u.username && String(u.username).toLowerCase() === String(user.username).toLowerCase()) return true;
                    if (user.id != null && u.id != null && String(u.id) === String(user.id)) return true;
                    return false;
                });
                if (found) return found;
            }
        } catch (e) {}
        return null;
    }

    function resolveLoginProjects(user) {
        var isAdmin = user && (user.role === 'admin' || user.userRole === 'admin');
        var contractMap = loadContractNameMap();

        // System Admin: every contract currently in local contract store
        if (isAdmin) {
            var all = Object.keys(contractMap);
            return all.sort();
        }

        // Prefer localStorage user (updated when admin assigns/deletes contracts)
        var local = findLocalUser(user);
        var pids = [];
        if (local && Array.isArray(local.projectIds) && local.projectIds.length) {
            pids = local.projectIds.slice();
        } else if (user && Array.isArray(user.projectIds)) {
            pids = user.projectIds.slice();
        }

        // Only show contracts that still exist (deleted contracts disappear)
        pids = pids.filter(function (pid) { return pid && contractMap[pid]; });
        return pids;
    }

    function showProjectPicker(user) {
        document.getElementById('pm-user-name').textContent = user.name;
        const nameMap = loadContractNameMap();
        const projects = resolveLoginProjects(user);
        
        projectListEl.innerHTML = '';
        projects.forEach(pid => {
            const div = document.createElement('div');
            div.className = 'project-option';
            div.style.cssText = 'padding: 12px; border: 2px solid #e2e8f0; border-radius: 8px; margin-bottom: 8px; cursor: pointer; font-weight: 600;';
            const label = nameMap[pid] && nameMap[pid] !== pid ? (pid + ' — ' + nameMap[pid]) : pid;
            div.innerHTML = `<span>${label}</span><span class="po-check" style="float:right; opacity:0;"><i class="fas fa-check"></i></span>`;
            
            div.onclick = () => {
                projectListEl.querySelectorAll('.project-option').forEach(el => {
                    el.style.borderColor = '#e2e8f0';
                    el.style.background = 'white';
                    el.querySelector('.po-check').style.opacity = '0';
                });
                div.style.borderColor = '#667eea';
                div.style.background = '#eef2ff';
                div.querySelector('.po-check').style.opacity = '1';
                selectedProject = pid;
                pmEnterBtn.disabled = false;
                pmEnterBtn.style.opacity = '1';
            };
            projectListEl.appendChild(div);
        });

        if (projects.length === 0) {
            projectListEl.innerHTML = '<p style="text-align:center;">No projects assigned. Ask System Admin to assign you to a contract.</p>';
            pmEnterBtn.disabled = true;
        } else {
            pmEnterBtn.disabled = true;
            pmEnterBtn.style.opacity = '0.5';
        }

        document.getElementById('pm-user-info').style.display = 'flex';
        projectModal.style.display = 'flex';
        
        document.querySelector('button[type="submit"]').disabled = false;
        document.querySelector('button[type="submit"]').innerHTML = '<i class="fas fa-sign-in-alt"></i> Sign In';
    }

    if (pmCancelBtn) {
        pmCancelBtn.addEventListener('click', () => {
            projectModal.style.display = 'none';
            selectedProject = null;
        });
    }

    if (pmEnterBtn) {
        pmEnterBtn.addEventListener('click', async () => {
            if (!pendingCredentials || !selectedProject) return;
            pmEnterBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Entering...';
            
            try {
                const res = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        username: pendingCredentials.username, 
                        password: pendingCredentials.password, 
                        projectId: selectedProject,
                        forceLogout: true // Ensure it forces here too
                    })
                });
                
                const data = await res.json();
                if (res.ok && data.user) {
                    sessionStorage.setItem('dwss_session', JSON.stringify({ ...data.user, isLoggedIn: true }));
                    sessionStorage.setItem('current_user', JSON.stringify(data.user));
                    sessionStorage.setItem('currentProjectId', selectedProject);
                    window.location.href = 'index.html';
                } else {
                    alert('Login failed.');
                    pmEnterBtn.innerHTML = 'Enter System';
                }
            } catch (err) {
                alert('Network error.');
                pmEnterBtn.innerHTML = 'Enter System';
            }
        });
    }

    function showError(msg) {
        const err = document.getElementById('login-error');
        if (err) {
            err.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${msg}`;
            err.classList.add('show');
        }
    }
});
// Add near the bottom of login.html or in login.js
document.addEventListener('DOMContentLoaded', function () {
    var toggleBtn = document.getElementById('toggle-password');
    var pwdInput  = document.getElementById('password');
    if (toggleBtn && pwdInput) {
        toggleBtn.addEventListener('click', function (e) {
            e.preventDefault();
            var isPwd = pwdInput.type === 'password';
            pwdInput.type = isPwd ? 'text' : 'password';
            var icon = toggleBtn.querySelector('i');
            if (icon) {
                icon.classList.toggle('fa-eye', !isPwd);
                icon.classList.toggle('fa-eye-slash', isPwd);
            }
        });
    }
});