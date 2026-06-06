// teams.js - 团队管理（一个项目为一个团队）
(function() {
    const TEAMS_KEY = 'ael_dwss_teams';
    const USERS_KEY = 'ael_dwss_users';
    
    let teams = [];
    let users = [];
    let editingTeamId = null;
    
    // 从 localStorage 加载用户（与用户管理共享）
    function loadUsers() {
        const stored = localStorage.getItem(USERS_KEY);
        if (stored) {
            try {
                users = JSON.parse(stored);
            } catch(e) {
                users = [];
            }
        }
        // 如果没有用户数据，尝试从默认列表加载（也可避免空列表）
        if (!users.length) {
            // 默认用户（与 usermanagement 保持一致）
            users = [
                { id:1, name:"Admin", email:"admin@rdrive.io", role:"admin" },
                { id:2, name:"Kenneth Daluz", email:"kenneth.daluz@aster-dsd.com", role:"officer" },
                { id:3, name:"TANG Chi Long, Gary", email:"gcifang@dsd.gov.hk", role:"aei" },
                { id:4, name:"FUNG Wai Ching", email:"wcfung04@dsd.gov.hk", role:"aei" },
                { id:5, name:"WONG Lap Pan", email:"ipwong02@dsd.gov.hk", role:"aei" },
                { id:6, name:"CHA Chi Ming", email:"cmcha02@dsd.gov.hk", role:"aei" },
                { id:7, name:"John Smith", email:"john.smith@ael-dwss.com", role:"inspector" },
                { id:8, name:"Sarah Johnson", email:"sarah.j@ael-dwss.com", role:"contractor" },
                { id:9, name:"Robert Chen", email:"robert.chen@dsd.gov.hk", role:"officer" },
                { id:10, name:"Emma Wilson", email:"emma.w@ael-dwss.com", role:"inspector" }
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
            } catch(e) {
                teams = [];
            }
        }
        if (!teams.length) {
            // 默认示例团队
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
    
    // 根据成员 ID 数组返回名字列表
    function getMemberNames(memberIds) {
        if (!memberIds.length) return 'None';
        return memberIds.map(id => {
            const u = users.find(u => u.id === id);
            return u ? u.name : `Unknown(${id})`;
        }).join(', ');
    }
    
    function escapeHtml(str) {
        if (!str) return '';
        return str.replace(/[&<>]/g, m => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;' }[m] || m));
    }
    
    // 渲染团队表格
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
        // 绑定编辑和删除事件
        document.querySelectorAll('.edit-team-btn').forEach(btn => {
            btn.addEventListener('click', () => openEditTeamModal(parseInt(btn.dataset.id)));
        });
        document.querySelectorAll('.delete-team-btn').forEach(btn => {
            btn.addEventListener('click', () => deleteTeam(parseInt(btn.dataset.id)));
        });
    }
    
    // 初始化团队成员选择下拉框（从 users 填充）
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
    
    // 打开添加团队模态框
    function openAddTeamModal() {
        editingTeamId = null;
        document.getElementById('modal-title').innerHTML = '<i class="fas fa-users"></i> Add New Team';
        document.getElementById('team-name').value = '';
        const select = document.getElementById('team-members');
        if (select) Array.from(select.options).forEach(opt => opt.selected = false);
        document.getElementById('team-modal').style.display = 'flex';
    }
    
    // 打开编辑团队模态框
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
    
    // 保存团队（新增或编辑）
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
            // 新增
            const newId = teams.length ? Math.max(...teams.map(t => t.id)) + 1 : 1;
            teams.push({ id: newId, name, memberIds: selectedIds });
        } else {
            // 编辑
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
    
    // 删除团队
    function deleteTeam(teamId) {
        if (confirm('Are you sure you want to delete this team?')) {
            teams = teams.filter(t => t.id !== teamId);
            saveTeams();
            renderTeamsTable();
            updateStats();
        }
    }
    
    // 刷新表格
    function refreshTable() {
        renderTeamsTable();
        updateStats();
    }
    
    // 搜索功能（按项目名）
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
            // 重新绑定事件
            document.querySelectorAll('.edit-team-btn').forEach(btn => {
                btn.addEventListener('click', () => openEditTeamModal(parseInt(btn.dataset.id)));
            });
            document.querySelectorAll('.delete-team-btn').forEach(btn => {
                btn.addEventListener('click', () => deleteTeam(parseInt(btn.dataset.id)));
            });
        });
    }
    
    // 初始化
    function init() {
        loadUsers();         // 先加载用户列表
        loadTeams();         // 加载团队
        initMemberSelect();  // 填充成员下拉框
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