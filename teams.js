// teams.js - 团队管理（一个项目为一个团队）
(function() {
    const TEAMS_KEY = 'ael_dwss_teams';
    const USERS_KEY = 'ael_dwss_users';
    
    let teams = [];
    let users = [];
    let editingTeamId = null;
    
    function loadUsers() {
        const stored = localStorage.getItem(USERS_KEY);
        if (stored) {
            try {
                users = JSON.parse(stored);
            } catch(e) { users = []; }
        }
        if (!users.length) {
            // 默认示例用户（与 usermanagement 保持一致）
            users = [
                { id:1, name:"Admin", role:"admin" },
                { id:2, name:"Kenneth Daluz", role:"officer" },
                { id:3, name:"TANG Chi Long, Gary", role:"aei" },
                { id:4, name:"FUNG Wai Ching", role:"aei" },
                { id:5, name:"WONG Lap Pan", role:"aei" },
                { id:6, name:"CHA Chi Ming", role:"aei" },
                { id:7, name:"John Smith", role:"inspector" },
                { id:8, name:"Sarah Johnson", role:"contractor" },
                { id:9, name:"Robert Chen", role:"officer" },
                { id:10, name:"Emma Wilson", role:"inspector" }
            ];
            localStorage.setItem(USERS_KEY, JSON.stringify(users));
        }
    }
    
    function loadTeams() {
        const stored = localStorage.getItem(TEAMS_KEY);
        if (stored) {
            try {
                teams = JSON.parse(stored);
                teams.forEach(t => { if (!t.memberIds) t.memberIds = []; });
            } catch(e) { teams = []; }
        }
        if (!teams.length) {
            teams = [
                { id:1, name:"Treatment Plant Upgrade", memberIds:[1,2,3] },
                { id:2, name:"Pipeline Safety Project", memberIds:[4,5,7] },
                { id:3, name:"Reservoir Automation", memberIds:[6,9,10] }
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
    
    function getMemberNames(memberIds) {
        if (!memberIds.length) return 'None';
        return memberIds.map(id => {
            const u = users.find(u => u.id === id);
            return u ? u.name : `Unknown(${id})`;
        }).join(', ');
    }
    
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
                <td>${team.id}</span>
                <td>${escapeHtml(team.name)}</span>
                <td>${getMemberNames(team.memberIds)}</span>
                <td class="action-buttons">
                    <button class="action-btn edit-team-btn" data-id="${team.id}"><i class="fas fa-edit"></i> Edit</button>
                    <button class="action-btn delete-team-btn" data-id="${team.id}" style="background:linear-gradient(135deg,#e74c3c,#c0392b);color:#fff;"><i class="fas fa-trash"></i> Delete</button>
                </span>
            `;
        });
        document.querySelectorAll('.edit-team-btn').forEach(btn => {
            btn.addEventListener('click', () => openEditTeamModal(parseInt(btn.dataset.id)));
        });
        document.querySelectorAll('.delete-team-btn').forEach(btn => {
            btn.addEventListener('click', () => deleteTeam(parseInt(btn.dataset.id)));
        });
    }
    
    function escapeHtml(str) {
        if (!str) return '';
        return str.replace(/[&<>]/g, m => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;' }[m] || m));
    }
    
    function initMemberSelect() {
        const select = document.getElementById('team-members');
        if (!select) return;
        select.innerHTML = '';
        users.forEach(user => {
            const option = document.createElement('option');
            option.value = user.id;
            option.textContent = `${user.name} (${user.role})`;
            select.appendChild(option);
        });
    }
    
    function openAddTeamModal() {
        editingTeamId = null;
        document.getElementById('modal-title').innerHTML = '<i class="fas fa-users"></i> Add New Team';
        document.getElementById('team-name').value = '';
        const select = document.getElementById('team-members');
        if (select) Array.from(select.options).forEach(opt => opt.selected = false);
        document.getElementById('team-modal').style.display = 'flex';
    }
    
    function openEditTeamModal(teamId) {
        const team = teams.find(t => t.id === teamId);
        if (!team) return;
        editingTeamId = teamId;
        document.getElementById('modal-title').innerHTML = '<i class="fas fa-edit"></i> Edit Team';
        document.getElementById('team-name').value = team.name;
        const select = document.getElementById('team-members');
        if (select) {
            Array.from(select.options).forEach(opt => {
                opt.selected = team.memberIds.includes(parseInt(opt.value));
            });
        }
        document.getElementById('team-modal').style.display = 'flex';
    }
    
    function saveTeam(e) {
        e.preventDefault();
        const name = document.getElementById('team-name').value.trim();
        if (!name) {
            alert('Please enter a project name.');
            return;
        }
        const select = document.getElementById('team-members');
        const selectedIds = Array.from(select.selectedOptions).map(opt => parseInt(opt.value));
        if (editingTeamId === null) {
            const newId = teams.length ? Math.max(...teams.map(t => t.id)) + 1 : 1;
            teams.push({ id: newId, name, memberIds: selectedIds });
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
        }
    }
    
    function refreshTable() {
        renderTeamsTable();
        updateStats();
    }
    
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
                    <td>${team.id}</span>
                    <td>${escapeHtml(team.name)}</span>
                    <td>${getMemberNames(team.memberIds)}</span>
                    <td class="action-buttons">
                        <button class="action-btn edit-team-btn" data-id="${team.id}"><i class="fas fa-edit"></i> Edit</button>
                        <button class="action-btn delete-team-btn" data-id="${team.id}" style="background:linear-gradient(135deg,#e74c3c,#c0392b);color:#fff;"><i class="fas fa-trash"></i> Delete</button>
                    </span>
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
    
    function init() {
        loadUsers();
        loadTeams();
        initMemberSelect();
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