// teams.js - 团队管理（一个项目为一个团队）
// ★ 改动：成员选择改为 checkbox 勾选列表（不需要 Ctrl/Shift）
(function() {
    const TEAMS_KEY = 'ael_dwss_teams';
    const USERS_KEY = 'ael_dwss_users';

    let teams = [];
    let users = [];
    let editingTeamId = null;

    // 当前勾选的成员 ID 集合
    let selectedMemberIds = new Set();

    // 从 localStorage 加载用户（与用户管理共享）
    function loadUsers() {
        const stored = localStorage.getItem(USERS_KEY);
        if (stored) {
            try {
                users = JSON.parse(stored);
            } catch (e) {
                users = [];
            }
        }
        // 如果没有用户数据，尝试从默认列表加载（也可避免空列表）
        if (!users.length) {
            users = [
                { id: 1,  name: "Admin",                 email: "admin@rdrive.io",           role: "admin" },
                { id: 2,  name: "Kenneth Daluz",         email: "kenneth.daluz@aster-dsd.com", role: "officer" },
                { id: 3,  name: "TANG Chi Long, Gary",   email: "gcifang@dsd.gov.hk",        role: "aei" },
                { id: 4,  name: "FUNG Wai Ching",        email: "wcfung04@dsd.gov.hk",       role: "aei" },
                { id: 5,  name: "WONG Lap Pan",          email: "ipwong02@dsd.gov.hk",       role: "aei" },
                { id: 6,  name: "CHA Chi Ming",          email: "cmcha02@dsd.gov.hk",        role: "aei" },
                { id: 7,  name: "John Smith",            email: "john.smith@ael-dwss.com",   role: "inspector" },
                { id: 8,  name: "Sarah Johnson",         email: "sarah.j@ael-dwss.com",      role: "contractor" },
                { id: 9,  name: "Robert Chen",           email: "robert.chen@dsd.gov.hk",    role: "officer" },
                { id: 10, name: "Emma Wilson",           email: "emma.w@ael-dwss.com",       role: "inspector" }
            ];
            localStorage.setItem(USERS_KEY, JSON.stringify(users));
        }
    }

    // 加载团队数据
    function loadTeams() {
        const stored = localStorage.getItem(TEAMS_KEY);
        if (stored) {
            try {
                teams = JSON.parse(stored);
                teams.forEach(t => { if (!t.memberIds) t.memberIds = []; });
            } catch (e) {
                teams = [];
            }
        }
        if (!teams.length) {
            teams = [
                { id: 1, name: "Treatment Plant Upgrade", memberIds: [1, 2, 3] },
                { id: 2, name: "Pipeline Safety Project", memberIds: [4, 5, 7] },
                { id: 3, name: "Reservoir Automation",    memberIds: [6, 9, 10] }
            ];
            saveTeams();
        }
    }

    function saveTeams() {
        localStorage.setItem(TEAMS_KEY, JSON.stringify(teams));
    }

    function updateStats() {
        const total = document.getElementById('total-teams-count');
        const active = document.getElementById('active-teams-count');
        if (total) total.textContent = teams.length;
        if (active) active.textContent = teams.length;
    }

    // 根据成员 ID 数组返回名字列表
    function getMemberNames(memberIds) {
        if (!memberIds || !memberIds.length) return 'None';
        return memberIds.map(id => {
            const u = users.find(u => u.id === id);
            return u ? u.name : `Unknown(${id})`;
        }).join(', ');
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

        if (!users.length) {
            const empty = document.createElement('div');
            empty.className = 'team-picker-empty';
            empty.textContent = 'No users available.';
            listEl.appendChild(empty);
            updateMemberCount();
            return;
        }

        let shown = 0;
        users.forEach(user => {
            const name = user.name || '';
            const role = user.role || '—';
            if (!name) return;
            if (query && name.toLowerCase().indexOf(query) === -1) return;
            shown++;

            const label = document.createElement('label');
            if (selectedMemberIds.has(user.id)) label.classList.add('checked');

            const cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.value = String(user.id);
            cb.checked = selectedMemberIds.has(user.id);
            cb.addEventListener('change', function () {
                if (cb.checked) {
                    selectedMemberIds.add(user.id);
                    label.classList.add('checked');
                } else {
                    selectedMemberIds.delete(user.id);
                    label.classList.remove('checked');
                }
                updateMemberCount();
            });

            const nameSpan = document.createElement('span');
            nameSpan.className = 'user-name';
            nameSpan.textContent = name;

            const roleSpan = document.createElement('span');
            roleSpan.className = 'user-role';
            roleSpan.textContent = role;

            label.appendChild(cb);
            label.appendChild(nameSpan);
            label.appendChild(roleSpan);
            listEl.appendChild(label);
        });

        if (shown === 0) {
            const nm = document.createElement('div');
            nm.className = 'team-picker-empty';
            nm.textContent = 'No matching names.';
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
        selectedMemberIds = new Set((ids || []).map(Number));
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
                users.forEach(u => {
                    if (!u.name) return;
                    if (q && u.name.toLowerCase().indexOf(q) === -1) return;
                    selectedMemberIds.add(u.id);
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

        teams.forEach(team => {
            const row = tbody.insertRow();
            row.innerHTML = `
                <td>${team.id}</td>
                <td>${escapeHtml(team.name)}</td>
                <td>${escapeHtml(getMemberNames(team.memberIds))}</td>
                <td class="action-buttons">
                    <button class="action-btn edit-team-btn" data-id="${team.id}"><i class="fas fa-edit"></i> Edit</button>
                    <button class="action-btn delete-team-btn" data-id="${team.id}" style="background:linear-gradient(135deg,#e74c3c,#c0392b);color:#fff;"><i class="fas fa-trash"></i> Delete</button>
                </td>
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
    function openAddTeamModal() {
        editingTeamId = null;
        document.getElementById('modal-title').innerHTML = '<i class="fas fa-users"></i> Add New Team';
        document.getElementById('team-name').value = '';
        clearSelectedMembers();
        const searchEl = document.getElementById('team-members-search');
        if (searchEl) searchEl.value = '';
        document.getElementById('team-modal').style.display = 'flex';
    }

    function openEditTeamModal(teamId) {
        const team = teams.find(t => t.id === teamId);
        if (!team) return;
        editingTeamId = teamId;
        document.getElementById('modal-title').innerHTML = '<i class="fas fa-edit"></i> Edit Team';
        document.getElementById('team-name').value = team.name;
        setSelectedMembers(team.memberIds || []);
        const searchEl = document.getElementById('team-members-search');
        if (searchEl) searchEl.value = '';
        document.getElementById('team-modal').style.display = 'flex';
    }

    /* ============================================================
       SAVE / DELETE
       ============================================================ */
    function saveTeam(e) {
        e.preventDefault();
        const name = document.getElementById('team-name').value.trim();
        if (!name) {
            alert('Please enter a project name.');
            return;
        }

        const selectedIds = getSelectedMemberIds();

        if (editingTeamId === null) {
            const newId = teams.length ? Math.max(...teams.map(t => t.id)) + 1 : 1;
            teams.push({ id: newId, name: name, memberIds: selectedIds });
        } else {
            const team = teams.find(t => t.id === editingTeamId);
            if (team) {
                team.name = name;
                team.memberIds = selectedIds;
            }
        }

        saveTeams();
        renderTeamsTable();
        updateStats();
        document.getElementById('team-modal').style.display = 'none';
    }

    function deleteTeam(teamId) {
        if (confirm('Are you sure you want to delete this team?')) {
            teams = teams.filter(t => t.id !== teamId);
            saveTeams();
            renderTeamsTable();
            updateStats();
            alert('Team deleted successfully.');
        }
    }

    function refreshTable() {
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
                    <td>${escapeHtml(team.name)}</td>
                    <td>${escapeHtml(getMemberNames(team.memberIds))}</td>
                    <td class="action-buttons">
                        <button class="action-btn edit-team-btn" data-id="${team.id}"><i class="fas fa-edit"></i> Edit</button>
                        <button class="action-btn delete-team-btn" data-id="${team.id}" style="background:linear-gradient(135deg,#e74c3c,#c0392b);color:#fff;"><i class="fas fa-trash"></i> Delete</button>
                    </td>
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

        setupMemberPickerEvents();
        renderMemberList('');

        renderTeamsTable();
        updateStats();
        setupSearch();

        document.getElementById('add-team-btn')?.addEventListener('click', openAddTeamModal);
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