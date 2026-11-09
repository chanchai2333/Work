// teams.js - 团队管理（一个项目为一个团队）
// ★ 改动：成员选择改为 checkbox 勾选列表（不需要 Ctrl/Shift）
(function() {
    const TEAMS_KEY = 'ael_dwss_teams';
    const CONTRACTS_KEY = 'dwss_contracts';
    // Must match User Management key so Teams sees the same accounts
    const USERS_KEY = 'dwss_users_db';
    const USERS_KEY_LEGACY = 'ael_dwss_users';

    let teams = [];
    let contracts = [];
    let users = [];
    let editingTeamId = null;

    // 当前勾选的成员 ID 集合（normalize to number）
    let selectedMemberIds = new Set();

    function seedUsers() {
        return [
            { id: 1,  name: 'Admin', email: 'admin@ael-dwss.com', username: 'admin', organization: 'SYSTEM_VENDOR', companyName: 'AEL - Associated Engineers Ltd.', role: 'admin', department: 'System Administration', projectIds: [] },
            { id: 2,  name: 'Kenneth Daluz', email: 'kenneth.daluz@dsd.gov.hk', username: 'kenneth', organization: 'SERVICE_MANAGER', companyName: 'Drainage Services Department (DSD)', role: 'eg', department: 'Engineer Grade', projectIds: ['DE/2024/06'] },
            { id: 3,  name: 'TANG Chi Long, Gary', email: 'gcifang@dsd.gov.hk', username: 'garytang', organization: 'SERVICE_MANAGER', companyName: 'Drainage Services Department (DSD)', role: 'ig', department: 'Inspector Grade', projectIds: ['DE/2024/06'] },
            { id: 4,  name: 'FUNG Wai Ching', email: 'wcfung04@dsd.gov.hk', username: 'wcfung', organization: 'SERVICE_MANAGER', companyName: 'Drainage Services Department (DSD)', role: 'wsg', department: 'Works Supervisor Grade', projectIds: ['DE/2025/07'] },
            { id: 10, name: 'CHA Chi Ming', email: 'cmcha02@dsd.gov.hk', username: 'cmcha', organization: 'SERVICE_MANAGER', companyName: 'Drainage Services Department (DSD)', role: 'ig', department: 'Inspector Grade', projectIds: ['DE/2025/07'] },
            { id: 11, name: 'Eddie Chan', email: 'eddiechan@de202605jv.com', username: 'eddiechan', organization: 'CONTRACTOR', companyName: 'REC - AEL JV', role: 'project_admin', department: 'JV Representative (REC)', projectIds: ['DE/2026/05'] },
            { id: 12, name: 'Nelson Ng', email: 'nelsonng@de202605jv.com', username: 'nelsonng', organization: 'CONTRACTOR', companyName: 'REC - AEL JV', role: 'project_admin', department: 'JV Representative (AEL)', projectIds: ['DE/2026/05'] },
            { id: 13, name: 'Jeff Wong', email: 'jeffwong@de202605jv.com', username: 'jeffwong', organization: 'CONTRACTOR', companyName: 'REC - AEL JV', role: 'project_admin', department: 'Contract Manager, DE/2026/05', projectIds: ['DE/2026/05'] },
            { id: 14, name: 'Kan Cheung', email: 'kancheung@de202605jv.com', username: 'kancheung', organization: 'CONTRACTOR', companyName: 'REC - AEL JV', role: 'sa', department: 'Site Agent', projectIds: ['DE/2026/05'] },
            { id: 15, name: 'Alan Wong', email: 'alanwong@de202605jv.com', username: 'alanwong', organization: 'CONTRACTOR', companyName: 'REC - AEL JV', role: 'ssa', department: 'Sub-site Agent', projectIds: ['DE/2026/05'] },
            { id: 16, name: 'Marco Kong', email: 'marcokong@de202605jv.com', username: 'marcokong', organization: 'CONTRACTOR', companyName: 'REC - AEL JV', role: 'ssa', department: 'Sub-site Agent', projectIds: ['DE/2026/05'] },
            { id: 17, name: 'Wong Chi Keung', email: 'keungwong@de202605jv.com', username: 'keungwong', organization: 'CONTRACTOR', companyName: 'REC - AEL JV', role: 'ssa', department: 'Sub-site Agent', projectIds: ['DE/2026/05'] },
            { id: 18, name: 'Ivan Lee', email: 'ivanlee@de202605jv.com', username: 'ivanlee', organization: 'CONTRACTOR', companyName: 'REC - AEL JV', role: 'ssa', department: 'Sub-site Agent', projectIds: ['DE/2026/05'] },
            { id: 19, name: 'Manklin Ho', email: 'manklinho@de202605jv.com', username: 'manklinho', organization: 'CONTRACTOR', companyName: 'REC - AEL JV', role: 'rso', department: 'Safety Officer', projectIds: ['DE/2026/05'] },
            { id: 20, name: 'James Chan', email: 'jameschan@de202605jv.com', username: 'jameschan', organization: 'CONTRACTOR', companyName: 'REC - AEL JV', role: 'ssa', department: 'Contract Supporting Engineer', projectIds: ['DE/2026/05'] }
        ];
    }

    function roleLabel(role) {
        var map = {
            admin: 'System Admin',
            project_admin: 'Project Admin',
            eg: 'EG', ig: 'IG', wsg: 'WSG',
            sa: 'Site Agent', ssa: 'Sub-Site Agent', rso: 'RSO',
            subcontractor: 'Subcontractor', supplier: 'Supplier'
        };
        return map[role] || role || '—';
    }

    function getCurrentProjectId() {
        try {
            if (window.DWSS_Permissions && typeof window.DWSS_Permissions.getCurrentProject === 'function') {
                var pid = window.DWSS_Permissions.getCurrentProject();
                if (pid && pid !== 'ALL') return pid;
            }
        } catch (e) {}
        var s = sessionStorage.getItem('currentProjectId');
        return (s && s !== 'ALL') ? s : null;
    }

    function userInProject(user, projectId) {
        if (!projectId) return true;
        if (user.role === 'admin') return true;
        var pids = user.projectIds || [];
        return pids.indexOf(projectId) !== -1;
    }

    function normalizeUserId(id) {
        var n = Number(id);
        return isNaN(n) ? id : n;
    }

    function findUserById(id) {
        var nid = normalizeUserId(id);
        return users.find(function (u) {
            return normalizeUserId(u.id) === nid;
        });
    }

    // Load users from User Management storage (same key), merge seed so new CMP users always appear
    function loadUsers() {
        var byId = {};
        seedUsers().forEach(function (u) { byId[String(u.id)] = u; });

        function mergeFromKey(key) {
            var stored = localStorage.getItem(key);
            if (!stored) return;
            try {
                var parsed = JSON.parse(stored);
                if (!Array.isArray(parsed)) return;
                parsed.forEach(function (u) {
                    if (!u || u.id == null) return;
                    var id = String(u.id);
                    if (byId[id]) {
                        // Keep seed identity/role, but NEVER wipe existing project assignments from storage
                        if (!byId[id].email && u.email) byId[id].email = u.email;
                        if (!byId[id].username && u.username) byId[id].username = u.username;
                        var seedPids = byId[id].projectIds || [];
                        var storedPids = u.projectIds || [];
                        var seen = {};
                        var merged = [];
                        seedPids.concat(storedPids).forEach(function (pid) {
                            if (!pid || seen[pid]) return;
                            seen[pid] = true;
                            merged.push(pid);
                        });
                        byId[id].projectIds = merged;
                        if (u.contractNo && !byId[id].contractNo) byId[id].contractNo = u.contractNo;
                    } else {
                        byId[id] = u;
                    }
                });
            } catch (e) {}
        }

        mergeFromKey(USERS_KEY);
        mergeFromKey(USERS_KEY_LEGACY);

        users = Object.keys(byId).map(function (k) { return byId[k]; }).sort(function (a, b) {
            return normalizeUserId(a.id) - normalizeUserId(b.id);
        });


        // Testing split: non-CMP default users on other contracts (not DE/2026/05)
        var testProjectById = {
            '2': ['DE/2024/06'],
            '3': ['DE/2024/06'],
            '4': ['DE/2025/07'],
            '10': ['DE/2025/07']
        };
        users.forEach(function (u) {
            var key = String(u.id);
            if (testProjectById[key]) u.projectIds = testProjectById[key].slice();
            if (u.role === 'admin') u.projectIds = []; // admin sees all at login
        });

        // Keep both keys in sync so other pages stay consistent
        try {
            localStorage.setItem(USERS_KEY, JSON.stringify(users));
            localStorage.setItem(USERS_KEY_LEGACY, JSON.stringify(users));
        } catch (e) {}
    }

    // ---------- Contracts (1 contract can have many teams) ----------
    function loadContracts() {
        var stored = localStorage.getItem(CONTRACTS_KEY);
        if (stored) {
            try { contracts = JSON.parse(stored) || []; } catch (e) { contracts = []; }
        }
        if (!Array.isArray(contracts)) contracts = [];

        // Migrate: if teams have contractNo but contracts list empty, derive contracts
        if (!contracts.length) {
            var seen = {};
            (teams || []).forEach(function (tm) {
                var c = tm.contractNo;
                if (c && !seen[c]) {
                    seen[c] = true;
                    contracts.push({ id: c, contractNo: c, name: tm.name || c });
                }
            });
        }
        if (!contracts.length) {
            // Safe defaults — do NOT wipe user project assignments
            contracts = [
                { id: 'DE/2026/05', contractNo: 'DE/2026/05', name: 'DE202605 Main Works' },
                { id: 'DE/2024/06', contractNo: 'DE/2024/06', name: 'DE/2024/06' },
                { id: 'DE/2025/07', contractNo: 'DE/2025/07', name: 'DE/2025/07' }
            ];
        }
        // Merge existing project stores so testing contracts stay visible
        try {
            ['dwss_projects', 'projects', 'ael_dwss_projects', 'dwss_contracts'].forEach(function (key) {
                var raw = localStorage.getItem(key);
                if (!raw) return;
                var arr = JSON.parse(raw);
                if (!Array.isArray(arr)) return;
                arr.forEach(function (p) {
                    var code = p.contractNo || p.id || p.code || p.name;
                    if (!code) return;
                    if (contracts.some(function (c) { return c.contractNo === code || c.id === code; })) return;
                    contracts.push({ id: code, contractNo: code, name: p.name || code });
                });
            });
        } catch (e) {}
        // Recover contracts from every user's projectIds (other projects you assigned before)
        try {
            (users || []).forEach(function (u) {
                (u.projectIds || []).forEach(function (pid) {
                    if (!pid) return;
                    if (contracts.some(function (c) { return c.contractNo === pid || c.id === pid; })) return;
                    contracts.push({ id: pid, contractNo: pid, name: pid });
                });
            });
            // Also scan stored user DB directly
            var rawUsers = localStorage.getItem(USERS_KEY) || localStorage.getItem(USERS_KEY_LEGACY);
            if (rawUsers) {
                JSON.parse(rawUsers).forEach(function (u) {
                    (u.projectIds || []).forEach(function (pid) {
                        if (!pid) return;
                        if (contracts.some(function (c) { return c.contractNo === pid || c.id === pid; })) return;
                        contracts.push({ id: pid, contractNo: pid, name: pid });
                    });
                });
            }
        } catch (e) {}

        // Ensure default testing contracts always exist
        ['DE/2026/05|DE202605 Main Works', 'DE/2024/06|DE/2024/06', 'DE/2025/07|DE/2025/07'].forEach(function (pair) {
            var parts = pair.split('|');
            var code = parts[0], nm = parts[1];
            if (!contracts.some(function (c) { return (c.contractNo || c.id) === code; })) {
                contracts.push({ id: code, contractNo: code, name: nm });
            }
        });

        saveContracts();
    }

    function saveContracts() {
        localStorage.setItem(CONTRACTS_KEY, JSON.stringify(contracts));
        syncProjectsFromContracts();
    }

    function syncProjectsFromContracts() {
        // Project list used by User Management / login = CONTRACTS, not teams
        var list = contracts.map(function (c) {
            var code = c.contractNo || c.id;
            return { id: code, code: code, name: c.name || code, contractNo: code };
        });
        try {
            localStorage.setItem('dwss_projects', JSON.stringify(list));
            localStorage.setItem('projects', JSON.stringify(list));
            localStorage.setItem('ael_dwss_projects', JSON.stringify(list));
        } catch (e) {}
    }

    // ---------- Teams (belong to one contract) ----------
    function loadTeams() {
        const stored = localStorage.getItem(TEAMS_KEY);
        if (stored) {
            try {
                teams = JSON.parse(stored);
                teams.forEach(function (tm) {
                    if (!tm.memberIds) tm.memberIds = [];
                    // legacy: if team was created as a "contract", keep contractNo
                    if (!tm.contractNo && tm.name) {
                        // leave empty — admin can assign
                    }
                });
            } catch (e) {
                teams = [];
            }
        }
        if (!Array.isArray(teams)) teams = [];
        // Do NOT replace existing teams with a single seed — preserves test data
        if (!teams.length) {
            // CMP users (ids 11-20) assigned to one team under DE/2026/05
            teams = [
                { id: 1, name: 'CMP Main Team', contractNo: 'DE/2026/05', memberIds: [11, 12, 13, 14, 15, 16, 17, 18, 19, 20] },
                { id: 2, name: 'Site Team B', contractNo: 'DE/2026/05', memberIds: [] }
            ];
            saveTeams();
        } else {
            // Ensure CMP users sit on at least one DE/2026/05 team
            var cmpIds = [11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
            var hasCmp = teams.some(function (tm) {
                return (tm.memberIds || []).some(function (id) { return cmpIds.indexOf(Number(id)) !== -1; });
            });
            if (!hasCmp) {
                var target = teams.find(function (tm) { return tm.contractNo === 'DE/2026/05'; }) || teams[0];
                if (target) {
                    target.memberIds = (target.memberIds || []).concat(cmpIds);
                    // unique
                    var seen = {};
                    target.memberIds = target.memberIds.filter(function (id) {
                        var k = String(id);
                        if (seen[k]) return false;
                        seen[k] = true;
                        return true;
                    });
                    if (!target.contractNo) target.contractNo = 'DE/2026/05';
                    saveTeams();
                }
            }
        }
    }

    function saveTeams() {
        localStorage.setItem(TEAMS_KEY, JSON.stringify(teams));
        // Teams no longer overwrite the global project/contract list
    }

    function assignMembersToContract(memberIds, contractNo) {
        if (!contractNo || !memberIds || !memberIds.length) return;
        var changed = false;
        memberIds.forEach(function (id) {
            var u = findUserById(id);
            if (!u) return;
            if (!Array.isArray(u.projectIds)) u.projectIds = [];
            if (u.projectIds.indexOf(contractNo) === -1) {
                u.projectIds.push(contractNo);
                changed = true;
            }
            if (!u.contractNo) u.contractNo = 'Contract No. ' + contractNo;
        });
        if (changed) {
            try {
                localStorage.setItem(USERS_KEY, JSON.stringify(users));
                localStorage.setItem(USERS_KEY_LEGACY, JSON.stringify(users));
            } catch (e) {}
        }
    }


    function updateStats() {
        const total = document.getElementById('total-teams-count');
        const active = document.getElementById('active-teams-count');
        const contractsEl = document.getElementById('total-contracts-count');
        if (total) total.textContent = teams.length;
        if (active) active.textContent = teams.length;
        if (contractsEl) contractsEl.textContent = contracts.length;
    }

    // 根据成员 ID 数组返回名字列表
    function getMemberNames(memberIds) {
        if (!memberIds || !memberIds.length) return 'None';
        var names = memberIds.map(function (id) {
            var u = findUserById(id);
            if (!u) return null;
            // Do not show System Admin in members column
            if (u.role === 'admin') return null;
            var un = u.username ? ' (' + u.username + ')' : '';
            return u.name + un;
        }).filter(Boolean);
        return names.length ? names.join(', ') : 'None';
    }

    function escapeHtml(str) {
        if (!str) return '';
        return String(str).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m] || m));
    }

    /* ============================================================
       MEMBER PICKER (checkbox list)
       ============================================================ */
    function renderMemberList(filterText) {
        const listEl = document.getElementById('team-members-list');
        if (!listEl) return;

        listEl.innerHTML = '';
        const query = (filterText || '').trim().toLowerCase();
        const currentPid = getCurrentProjectId();

        // Prefer users on current project; if none, show everyone
        // Never list System Admin in team members (they have global access)
        let pool = users.filter(function (u) {
            if (u.role === 'admin') return false;
            return userInProject(u, currentPid);
        });
        if (!pool.length) {
            pool = users.filter(function (u) { return u.role !== 'admin'; });
        }

        if (!pool.length) {
            const empty = document.createElement('div');
            empty.className = 'team-picker-empty';
            empty.textContent = 'No users available. Add users in User Management first.';
            listEl.appendChild(empty);
            updateMemberCount();
            return;
        }

        let shown = 0;
        pool.forEach(function (user) {
            const name = user.name || '';
            const username = user.username || '';
            const email = user.email || '';
            const role = roleLabel(user.role);
            const pids = (user.projectIds || []).join(', ') || '—';
            if (!name && !username) return;

            const hay = (name + ' ' + username + ' ' + email + ' ' + role + ' ' + pids).toLowerCase();
            if (query && hay.indexOf(query) === -1) return;
            shown++;

            const uid = normalizeUserId(user.id);
            const label = document.createElement('label');
            if (selectedMemberIds.has(uid)) label.classList.add('checked');

            const cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.value = String(user.id);
            cb.checked = selectedMemberIds.has(uid);
            cb.addEventListener('change', function () {
                if (cb.checked) {
                    selectedMemberIds.add(uid);
                    label.classList.add('checked');
                } else {
                    selectedMemberIds.delete(uid);
                    label.classList.remove('checked');
                }
                updateMemberCount();
            });

            const nameSpan = document.createElement('span');
            nameSpan.className = 'user-name';
            nameSpan.innerHTML = (name || username) +
                (username ? ' <code style="font-size:0.75rem;color:#64748b;font-weight:500;">@' + username + '</code>' : '') +
                (email ? '<br><small style="color:#94a3b8;font-weight:400;">' + email + '</small>' : '');

            const roleSpan = document.createElement('span');
            roleSpan.className = 'user-role';
            roleSpan.textContent = role + (pids !== '—' ? ' · ' + pids : '');

            label.appendChild(cb);
            label.appendChild(nameSpan);
            label.appendChild(roleSpan);
            listEl.appendChild(label);
        });

        if (shown === 0) {
            const nm = document.createElement('div');
            nm.className = 'team-picker-empty';
            nm.textContent = 'No matching users for this search / project.';
            listEl.appendChild(nm);
        }

        updateMemberCount();
    }

    function updateMemberCount() {
        const el = document.getElementById('team-members-count');
        if (el) el.textContent = String(selectedMemberIds.size);
    }

    function clearSelectedMembers() {
        selectedMemberIds.clear();
        renderMemberList('');
    }

    function setSelectedMembers(ids) {
        selectedMemberIds = new Set((ids || []).map(normalizeUserId));
        renderMemberList('');
    }

    function getSelectedMemberIds() {
        return Array.from(selectedMemberIds);
    }

    function setupMemberPickerEvents() {
        const searchEl = document.getElementById('team-members-search');
        const allBtn   = document.getElementById('team-members-select-all');
        const clearBtn = document.getElementById('team-members-clear-all');

        if (searchEl) {
            searchEl.addEventListener('input', function () {
                renderMemberList(searchEl.value);
            });
        }

        if (allBtn) {
            allBtn.addEventListener('click', function () {
                const q = (searchEl && searchEl.value || '').toLowerCase();
                const currentPid = getCurrentProjectId();
                users.forEach(function (u) {
                    if (u.role === 'admin') return;
                    if (!userInProject(u, currentPid) && currentPid) return;
                    const name = u.name || '';
                    const username = u.username || '';
                    if (!name && !username) return;
                    const hay = (name + ' ' + username + ' ' + (u.email || '')).toLowerCase();
                    if (q && hay.indexOf(q) === -1) return;
                    selectedMemberIds.add(normalizeUserId(u.id));
                });
                renderMemberList(searchEl ? searchEl.value : '');
            });
        }

        if (clearBtn) {
            clearBtn.addEventListener('click', function () {
                selectedMemberIds.clear();
                renderMemberList(searchEl ? searchEl.value : '');
            });
        }
    }

    /* ============================================================
       TABLE RENDERING
       ============================================================ */
    function renderTeamsTable() {
        const tbody = document.getElementById('teams-table-body');
        const noResults = document.getElementById('no-results-message');
        if (!tbody) return;
        tbody.innerHTML = '';

        if (teams.length === 0) {
            if (noResults) noResults.style.display = 'block';
            return;
        }
        if (noResults) noResults.style.display = 'none';

        var viewList = teams;
        var curPid = getCurrentProjectId();
        if (curPid && !currentIsSystemAdmin()) {
            viewList = teams.filter(function (tm) { return tm.contractNo === curPid; });
        } else if (curPid && currentIsSystemAdmin()) {
            // Admin still can filter to current login contract for clarity
            viewList = teams.filter(function (tm) { return tm.contractNo === curPid; });
            // If none match, show all so admin is not stuck
            if (!viewList.length) viewList = teams;
        }

        viewList.forEach(team => {
            const row = tbody.insertRow();
            row.innerHTML = `
                <td>${team.id}</td>
                <td><code>${escapeHtml(team.contractNo || '—')}</code></td>
                <td>${escapeHtml(team.name)}</td>
                <td>${escapeHtml(getMemberNames(team.memberIds))}</td>
                <td class="action-buttons">${(function(){
                    var html = '';
                    if (currentIsSystemAdmin() || currentIsProjectAdmin()) {
                        html += '<button class="action-btn edit-team-btn" data-id="' + team.id + '"><i class="fas fa-edit"></i> Edit</button>';
                    }
                    if (currentIsSystemAdmin()) {
                        html += '<button class="action-btn delete-team-btn" data-id="' + team.id + '" style="background:linear-gradient(135deg,#e74c3c,#c0392b);color:#fff;"><i class="fas fa-trash"></i> Delete</button>';
                    }
                    return html || '<span style="color:#94a3b8;font-size:0.75rem;">—</span>';
                })()}</td>
            `;
        });

        document.querySelectorAll('.edit-team-btn').forEach(btn => {
            btn.addEventListener('click', () => openEditTeamModal(parseInt(btn.dataset.id)));
        });
        document.querySelectorAll('.delete-team-btn').forEach(btn => {
            btn.addEventListener('click', () => deleteTeam(parseInt(btn.dataset.id)));
        });
    }

    /* ============================================================
       MODAL OPEN / CLOSE
       ============================================================ */
    function currentIsSystemAdmin() {
        try {
            if (window.DWSS_Permissions && window.DWSS_Permissions.isAdmin) {
                return !!window.DWSS_Permissions.isAdmin();
            }
            if (window.DWSS_Permissions && window.DWSS_Permissions.canCreateProjects) {
                return !!window.DWSS_Permissions.canCreateProjects();
            }
            var u = window.DWSS_Permissions && window.DWSS_Permissions.getCurrentUser
                ? window.DWSS_Permissions.getCurrentUser() : null;
            return !!(u && u.role === 'admin');
        } catch (e) { return false; }
    }

    function currentIsProjectAdmin() {
        try {
            if (window.DWSS_Permissions && window.DWSS_Permissions.isProjectAdmin) {
                return !!window.DWSS_Permissions.isProjectAdmin();
            }
            var u = window.DWSS_Permissions && window.DWSS_Permissions.getCurrentUser
                ? window.DWSS_Permissions.getCurrentUser() : null;
            return !!(u && u.role === 'project_admin');
        } catch (e) { return false; }
    }


    function fillContractSelect(selected) {
        var sel = document.getElementById('team-contract-select');
        if (!sel) return;
        // Ensure contracts are loaded
        if (!contracts || !contracts.length) {
            try { loadContracts(); } catch (e) {}
        }
        sel.innerHTML = '<option value="">-- Select Contract --</option>';

        // System Admin: all contracts. Project Admin: only their assigned contracts.
        var allowed = null;
        if (!currentIsSystemAdmin() && currentIsProjectAdmin()) {
            try {
                var u = window.DWSS_Permissions && window.DWSS_Permissions.getCurrentUser
                    ? window.DWSS_Permissions.getCurrentUser() : null;
                allowed = (u && u.projectIds) ? u.projectIds.slice() : [];
            } catch (e) { allowed = []; }
        }

        var count = 0;
        contracts.forEach(function (c) {
            var code = c.contractNo || c.id;
            if (!code) return;
            if (allowed && allowed.indexOf(code) === -1) return;
            var opt = document.createElement('option');
            opt.value = code;
            opt.textContent = code + (c.name ? (' — ' + c.name) : '');
            if (selected && selected === code) opt.selected = true;
            sel.appendChild(opt);
            count++;
        });

        // Always allow choosing a contract when adding/editing a team
        sel.disabled = false;
        sel.required = true;

        if (!count) {
            var empty = document.createElement('option');
            empty.value = '';
            empty.textContent = '(No contracts yet — System Admin must add a contract first)';
            sel.appendChild(empty);
        }
    }

    function renderContractUserPicker(selectedIds) {
        var list = document.getElementById('contract-users-list');
        if (!list) return;
        selectedIds = (selectedIds || []).map(normalizeUserId);
        var selectedSet = {};
        selectedIds.forEach(function (id) { selectedSet[id] = true; });
        list.innerHTML = '';
        if (!users.length) loadUsers();
        users.forEach(function (u) {
            if (u.role === 'admin') return; // not listed
            var uid = normalizeUserId(u.id);
            var label = document.createElement('label');
            label.style.cssText = 'display:flex;align-items:center;gap:8px;padding:6px 8px;border-bottom:1px solid #f1f5f9;cursor:pointer;';
            var cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.className = 'contract-user-cb';
            cb.value = String(u.id);
            cb.checked = !!selectedSet[uid];
            var span = document.createElement('span');
            span.innerHTML = (u.name || u.username || '') +
                (u.username ? ' <code style="font-size:0.75rem;color:#64748b;">@' + u.username + '</code>' : '') +
                (u.role ? ' <small style="color:#94a3b8;">(' + roleLabel(u.role) + ')</small>' : '');
            label.appendChild(cb);
            label.appendChild(span);
            list.appendChild(label);
        });
        if (!list.children.length) {
            list.innerHTML = '<div style="padding:8px;color:#94a3b8;">No users available.</div>';
        }
    }

    function getContractSelectedUserIds() {
        var ids = [];
        document.querySelectorAll('.contract-user-cb:checked').forEach(function (cb) {
            ids.push(normalizeUserId(cb.value));
        });
        return ids;
    }

    function openAddContractModal() {
        if (!currentIsSystemAdmin()) {
            alert('Only System Admin can add a new contract.');
            return;
        }
        var modal = document.getElementById('contract-modal');
        if (!modal) return;
        document.getElementById('contract-modal-title').innerHTML = '<i class="fas fa-file-contract"></i> Add New Contract';
        document.getElementById('contract-no-input').value = '';
        document.getElementById('contract-no-input').readOnly = false;
        document.getElementById('contract-name-input').value = '';
        document.getElementById('contract-form').dataset.editing = '';
        renderContractUserPicker([]);
        modal.style.display = 'flex';
    }

    function openEditContractModal(contractNo) {
        if (!currentIsSystemAdmin()) {
            alert('Only System Admin can edit a contract.');
            return;
        }
        var c = contracts.find(function (x) { return (x.contractNo || x.id) === contractNo; });
        if (!c) return;
        document.getElementById('contract-modal-title').innerHTML = '<i class="fas fa-edit"></i> Edit Contract';
        document.getElementById('contract-no-input').value = c.contractNo || c.id;
        document.getElementById('contract-no-input').readOnly = true;
        document.getElementById('contract-name-input').value = c.name || '';
        document.getElementById('contract-form').dataset.editing = c.contractNo || c.id;
        // Pre-select users already assigned to this contract
        var assigned = users.filter(function (u) {
            return (u.projectIds || []).indexOf(contractNo) !== -1;
        }).map(function (u) { return u.id; });
        renderContractUserPicker(assigned);
        document.getElementById('contract-modal').style.display = 'flex';
    }

    function saveContract(e) {
        e.preventDefault();
        if (!currentIsSystemAdmin()) {
            alert('Only System Admin can save a contract.');
            return;
        }
        var no = document.getElementById('contract-no-input').value.trim();
        var name = document.getElementById('contract-name-input').value.trim();
        if (!no) { alert('Please enter Contract No.'); return; }
        if (!name) { alert('Please enter Contract Name.'); return; }
        var editing = document.getElementById('contract-form').dataset.editing || '';
        if (!editing) {
            if (contracts.some(function (c) { return (c.contractNo || c.id).toLowerCase() === no.toLowerCase(); })) {
                alert('Contract No. already exists: ' + no);
                return;
            }
            contracts.push({ id: no, contractNo: no, name: name });
        } else {
            var c = contracts.find(function (x) { return (x.contractNo || x.id) === editing; });
            if (c) c.name = name;
        }
        // Assign selected users to this contract (so it appears at login for them)
        var selectedUserIds = getContractSelectedUserIds();
        assignMembersToContract(selectedUserIds, no);
        // If editing, also remove contract from unchecked users? Keep additive for safety.
        saveContracts();
        renderContractsTable();
        fillContractSelect();
        document.getElementById('contract-modal').style.display = 'none';
        alert('Contract saved. ' + (selectedUserIds.length ? (selectedUserIds.length + ' user(s) assigned.') : 'No users selected.'));
    }

    function removeContractFromAllUsers(contractNo) {
        if (!contractNo) return;
        if (!users.length) loadUsers();
        var changed = false;
        users.forEach(function (u) {
            if (!u.projectIds || !u.projectIds.length) return;
            var next = u.projectIds.filter(function (pid) { return pid !== contractNo; });
            if (next.length !== u.projectIds.length) {
                u.projectIds = next;
                changed = true;
            }
        });
        if (changed) {
            try {
                localStorage.setItem(USERS_KEY, JSON.stringify(users));
                localStorage.setItem(USERS_KEY_LEGACY, JSON.stringify(users));
            } catch (e) {}
        }
        // Also scrub any other copy of users DB
        try {
            var raw = localStorage.getItem(USERS_KEY);
            if (raw) {
                var arr = JSON.parse(raw);
                arr.forEach(function (u) {
                    if (u.projectIds) u.projectIds = u.projectIds.filter(function (pid) { return pid !== contractNo; });
                });
                localStorage.setItem(USERS_KEY, JSON.stringify(arr));
                localStorage.setItem(USERS_KEY_LEGACY, JSON.stringify(arr));
            }
        } catch (e) {}
    }

    function deleteContract(contractNo) {
        if (!currentIsSystemAdmin()) {
            alert('Only System Admin can delete a contract.');
            return;
        }
        var linked = teams.filter(function (tm) { return tm.contractNo === contractNo; });
        var msg = 'Delete contract ' + contractNo + '?\n\nThis will also remove it from all users\' login project lists';
        if (linked.length) msg += '\n(' + linked.length + ' team(s) under this contract will be removed too.)';
        if (!confirm(msg)) return;

        // Remove from every user so login list updates
        removeContractFromAllUsers(contractNo);

        // Remove teams under this contract
        teams = teams.filter(function (tm) { return tm.contractNo !== contractNo; });
        saveTeams();

        contracts = contracts.filter(function (c) { return (c.contractNo || c.id) !== contractNo; });
        saveContracts();
        renderContractsTable();
        renderTeamsTable();
        fillContractSelect();
        updateStats();
        alert('Contract ' + contractNo + ' deleted and removed from all users.');
    }

    function renderContractsTable() {
        var tbody = document.getElementById('contracts-table-body');
        if (!tbody) return;
        tbody.innerHTML = '';
        var curPid = getCurrentProjectId();
        var contractView = contracts;
        if (curPid && !currentIsSystemAdmin()) {
            contractView = contracts.filter(function (c) {
                return (c.contractNo || c.id) === curPid;
            });
        }
        contractView.forEach(function (c) {
            var code = c.contractNo || c.id;
            var teamCount = teams.filter(function (tm) { return tm.contractNo === code; }).length;
            var row = tbody.insertRow();
            var actions = currentIsSystemAdmin()
                ? ('<button class="action-btn edit-contract-btn" data-cno="' + code + '"><i class="fas fa-edit"></i></button> ' +
                   '<button class="action-btn delete-contract-btn" data-cno="' + code + '" style="background:linear-gradient(135deg,#e74c3c,#c0392b);color:#fff;"><i class="fas fa-trash"></i></button>')
                : '—';
            row.innerHTML = '<td><code>' + escapeHtml(code) + '</code></td><td>' + escapeHtml(c.name || '') +
                '</td><td>' + teamCount + ' team(s)</td><td>' + actions + '</td>';
        });
        document.querySelectorAll('.edit-contract-btn').forEach(function (btn) {
            btn.addEventListener('click', function () { openEditContractModal(btn.getAttribute('data-cno')); });
        });
        document.querySelectorAll('.delete-contract-btn').forEach(function (btn) {
            btn.addEventListener('click', function () { deleteContract(btn.getAttribute('data-cno')); });
        });
    }

    function openAddTeamModal() {
        // System Admin or Project Admin can add a team under a contract
        if (!currentIsSystemAdmin() && !currentIsProjectAdmin()) {
            alert('You do not have permission to add a team.');
            return;
        }
        editingTeamId = null;
        document.getElementById('modal-title').innerHTML = '<i class="fas fa-users"></i> Add New Team';

        // Team name: always free text
        var nameInput = document.getElementById('team-name');
        if (nameInput) {
            nameInput.value = '';
            nameInput.readOnly = false;
            nameInput.disabled = false;
            nameInput.placeholder = 'e.g. Site Team A';
        }

        // Contract: choose from dropdown
        fillContractSelect('');
        var sel = document.getElementById('team-contract-select');
        if (sel) {
            sel.disabled = false;
            // If Project Admin has only one contract, pre-select it (still visible/changeable if multiple)
            if (currentIsProjectAdmin() && !currentIsSystemAdmin()) {
                try {
                    var u = window.DWSS_Permissions.getCurrentUser();
                    var pids = (u && u.projectIds) || [];
                    if (pids.length === 1) sel.value = pids[0];
                } catch (e) {}
            }
        }

        clearSelectedMembers();
        var searchEl = document.getElementById('team-members-search');
        if (searchEl) searchEl.value = '';
        document.getElementById('team-modal').style.display = 'flex';
    }

    function openEditTeamModal(teamId) {
        const team = teams.find(t => t.id === teamId);
        if (!team) return;
        if (!currentIsSystemAdmin() && !currentIsProjectAdmin()) {
            alert('You do not have permission to edit this team.');
            return;
        }
        if (currentIsProjectAdmin() && !currentIsSystemAdmin()) {
            var u = window.DWSS_Permissions.getCurrentUser();
            var pids = (u && u.projectIds) || [];
            if (team.contractNo && pids.indexOf(team.contractNo) === -1) {
                alert('You can only edit teams under your assigned contract.');
                return;
            }
        }
        editingTeamId = teamId;
        document.getElementById('modal-title').innerHTML = '<i class="fas fa-edit"></i> Edit Team';

        var nameInput = document.getElementById('team-name');
        if (nameInput) {
            nameInput.value = team.name || '';
            nameInput.readOnly = false;
            nameInput.disabled = false;
        }

        fillContractSelect(team.contractNo || '');
        var sel = document.getElementById('team-contract-select');
        if (sel) sel.disabled = false;

        setSelectedMembers(team.memberIds || []);
        var searchEl = document.getElementById('team-members-search');
        if (searchEl) searchEl.value = '';
        document.getElementById('team-modal').style.display = 'flex';
    }

    /* ============================================================
       SAVE / DELETE
       ============================================================ */
    function saveTeam(e) {
        e.preventDefault();
        // Team name = free text
        var nameEl = document.getElementById('team-name');
        var name = nameEl ? nameEl.value.trim() : '';
        // Contract = chosen from dropdown
        var sel = document.getElementById('team-contract-select');
        var contractNo = sel && !sel.disabled ? String(sel.value || '').trim() : '';
        if (!contractNo) {
            var cnoEl = document.getElementById('team-contract-no');
            if (cnoEl) contractNo = String(cnoEl.value || '').trim();
        }
        if (!contractNo) {
            alert('Please choose a contract from the list.');
            if (sel) sel.focus();
            return;
        }
        if (!name) {
            alert('Please type a team name.');
            if (nameEl) nameEl.focus();
            return;
        }

        const selectedIds = getSelectedMemberIds().filter(function (id) {
            var u = findUserById(id);
            return !u || u.role !== 'admin';
        });

        if (editingTeamId === null) {
            if (!currentIsSystemAdmin() && !currentIsProjectAdmin()) {
                alert('You do not have permission to add a team.');
                return;
            }
            const newId = teams.length ? Math.max.apply(null, teams.map(function (x) { return x.id; })) + 1 : 1;
            teams.push({ id: newId, name: name, contractNo: contractNo, memberIds: selectedIds });
            assignMembersToContract(selectedIds, contractNo);
        } else {
            if (!currentIsSystemAdmin() && !currentIsProjectAdmin()) {
                alert('You do not have permission to update this team.');
                return;
            }
            const team = teams.find(t => t.id === editingTeamId);
            if (team) {
                team.name = name;
                if (currentIsSystemAdmin()) team.contractNo = contractNo;
                team.memberIds = selectedIds;
                assignMembersToContract(selectedIds, team.contractNo || contractNo);
            }
        }

        saveTeams();
        renderTeamsTable();
        renderContractsTable();
        updateStats();
        document.getElementById('team-modal').style.display = 'none';
        alert('Team saved.');
    }

    function deleteTeam(teamId) {
        if (!currentIsSystemAdmin()) {
            alert('Only System Admin can delete a project.');
            return;
        }
        if (confirm('Are you sure you want to delete this team?')) {
            teams = teams.filter(t => t.id !== teamId);
            saveTeams();
            renderTeamsTable();
            updateStats();
            alert('Team deleted successfully.');
        }
    }

    function refreshTable() {
        loadUsers();
        loadTeams();
        loadContracts();
        renderContractsTable();
        renderTeamsTable();
        updateStats();
    }

    /* ============================================================
       SEARCH
       ============================================================ */
    function setupSearch() {
        const form = document.getElementById('search-form');
        if (!form) return;
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const keyword = form.querySelector('input').value.trim().toLowerCase();
            if (!keyword) {
                renderTeamsTable();
                return;
            }
            const filtered = teams.filter(t => t.name.toLowerCase().includes(keyword));
            const tbody = document.getElementById('teams-table-body');
            const noResults = document.getElementById('no-results-message');
            if (!tbody) return;
            tbody.innerHTML = '';
            if (filtered.length === 0) {
                if (noResults) noResults.style.display = 'block';
                return;
            }
            if (noResults) noResults.style.display = 'none';
            filtered.forEach(team => {
                const row = tbody.insertRow();
                row.innerHTML = `
                    <td>${team.id}</td>
                    <td><code>${escapeHtml(team.contractNo || '—')}</code></td>
                    <td>${escapeHtml(team.name)}</td>
                    <td>${escapeHtml(getMemberNames(team.memberIds))}</td>
                    <td class="action-buttons">${(function(){
                        var html = '';
                        if (currentIsSystemAdmin() || currentIsProjectAdmin()) {
                            html += '<button class="action-btn edit-team-btn" data-id="' + team.id + '"><i class="fas fa-edit"></i> Edit</button>';
                        }
                        if (currentIsSystemAdmin()) {
                            html += '<button class="action-btn delete-team-btn" data-id="' + team.id + '" style="background:linear-gradient(135deg,#e74c3c,#c0392b);color:#fff;"><i class="fas fa-trash"></i> Delete</button>';
                        }
                        return html || '<span style="color:#94a3b8;font-size:0.75rem;">—</span>';
                    })()}</td>
                `;
            });
            document.querySelectorAll('.edit-team-btn').forEach(btn => {
                btn.addEventListener('click', () => openEditTeamModal(parseInt(btn.dataset.id)));
            });
            document.querySelectorAll('.delete-team-btn').forEach(btn => {
                btn.addEventListener('click', () => deleteTeam(parseInt(btn.dataset.id)));
            });
        });
    }

    /* ============================================================
       INIT
       ============================================================ */
    function init() {
        loadUsers();
        loadTeams();
        loadContracts();

        setupMemberPickerEvents();
        renderMemberList('');

        renderTeamsTable();
        updateStats();
        setupSearch();

        var addTeamBtn = document.getElementById('add-team-btn');
        if (addTeamBtn) {
            if (!currentIsSystemAdmin() && !currentIsProjectAdmin()) {
                addTeamBtn.style.display = 'none';
            } else {
                addTeamBtn.addEventListener('click', openAddTeamModal);
            }
        }
        var addContractBtn = document.getElementById('add-contract-btn');
        if (addContractBtn) {
            if (!currentIsSystemAdmin()) {
                addContractBtn.style.display = 'none';
            } else {
                addContractBtn.addEventListener('click', openAddContractModal);
            }
        }
        var cancelContractBtn = document.getElementById('cancel-contract-btn');
        if (cancelContractBtn) {
            cancelContractBtn.addEventListener('click', function () {
                var m = document.getElementById('contract-modal');
                if (m) m.style.display = 'none';
            });
        }
        var contractForm = document.getElementById('contract-form');
        if (contractForm) contractForm.addEventListener('submit', saveContract);
        renderContractsTable();
        fillContractSelect();
        document.querySelector('.refresh-btn')?.addEventListener('click', refreshTable);
        document.getElementById('cancel-team-btn')?.addEventListener('click', () => {
            document.getElementById('team-modal').style.display = 'none';
        });
        document.getElementById('team-form')?.addEventListener('submit', saveTeam);

        const modal = document.getElementById('team-modal');
        if (modal) {
            modal.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; });
        }
    }

    document.addEventListener('DOMContentLoaded', init);
})();