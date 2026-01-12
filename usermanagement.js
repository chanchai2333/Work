// ===== 用户管理功能 =====
const UserManagement = {
    users: [
        { 
            id: 1,
            name: "Admin",
            email: "admin@rdrive.io",
            role: "admin",
            department: "System Administration",
            status: "active",
            addedDate: "2024-01-15"
        },
        { 
            id: 2,
            name: "Kenneth Daluz",
            email: "kenneth.daluz@aster-dsd.com",
            role: "officer",
            department: "Administration",
            status: "active",
            addedDate: "2024-02-10"
        },
        { 
            id: 3,
            name: "TANG Chi Long, Gary",
            email: "gcifang@dsd.gov.hk",
            role: "aei",
            department: "AEI/NWNT",
            status: "active",
            addedDate: "2024-02-15"
        },
        { 
            id: 4,
            name: "FUNG Wai Ching",
            email: "wcfung04@dsd.gov.hk",
            role: "aei",
            department: "AEI/SWH",
            status: "active",
            addedDate: "2024-03-01"
        },
        { 
            id: 5,
            name: "WONG Lap Pan",
            email: "ipwong02@dsd.gov.hk",
            role: "aei",
            department: "AEI/SWH/1",
            status: "active",
            addedDate: "2024-03-05"
        },
        { 
            id: 6,
            name: "CHA Chi Ming",
            email: "cmcha02@dsd.gov.hk",
            role: "aei",
            department: "AMI/TM",
            status: "active",
            addedDate: "2024-03-10"
        },
        { 
            id: 7,
            name: "John Smith",
            email: "john.smith@ael-dwss.com",
            role: "inspector",
            department: "Safety Inspection",
            status: "active",
            addedDate: "2024-03-15"
        },
        { 
            id: 8,
            name: "Sarah Johnson",
            email: "sarah.j@ael-dwss.com",
            role: "contractor",
            department: "Contractor Team A",
            status: "pending",
            addedDate: "2024-04-01"
        },
        { 
            id: 9,
            name: "Robert Chen",
            email: "robert.chen@dsd.gov.hk",
            role: "officer",
            department: "Documentation",
            status: "active",
            addedDate: "2024-04-05"
        },
        { 
            id: 10,
            name: "Emma Wilson",
            email: "emma.w@ael-dwss.com",
            role: "inspector",
            department: "Quality Control",
            status: "inactive",
            addedDate: "2024-04-10"
        }
    ],
    
    currentFilters: {
        role: "all",
        status: "all",
        sort: "name-asc"
    },
    
    currentPage: 1,
    itemsPerPage: 10,
    
    init: function() {
        this.renderUserTable();
        this.setupFilterEvents();
        this.setupActionButtons();
        this.updateUserStats();
    },
    
    renderUserTable: function() {
        const tbody = document.getElementById('users-table-body');
        const noResults = document.getElementById('no-results-message');
        
        // 清空表格
        tbody.innerHTML = '';
        
        // 筛选数据
        let filteredUsers = this.users.filter(user => {
            // 角色筛选
            if (this.currentFilters.role !== "all" && user.role !== this.currentFilters.role) {
                return false;
            }
            
            // 状态筛选
            if (this.currentFilters.status !== "all" && user.status !== this.currentFilters.status) {
                return false;
            }
            
            return true;
        });
        
        // 排序数据
        filteredUsers = this.sortUsers(filteredUsers, this.currentFilters.sort);
        
        // 分页
        const totalUsers = filteredUsers.length;
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = Math.min(startIndex + this.itemsPerPage, totalUsers);
        const pagedUsers = filteredUsers.slice(startIndex, endIndex);
        
        // 更新分页信息
        this.updatePaginationInfo(startIndex + 1, endIndex, totalUsers);
        
        // 显示无结果消息
        if (pagedUsers.length === 0) {
            noResults.style.display = 'block';
        } else {
            noResults.style.display = 'none';
        }
        
        // 填充表格
        pagedUsers.forEach(user => {
            const row = document.createElement('tr');
            
            // 获取角色显示文本
            let roleText = "";
            switch(user.role) {
                case "admin": roleText = "Administrator"; break;
                case "officer": roleText = "Officer"; break;
                case "aei": roleText = "AEI"; break;
                case "inspector": roleText = "Inspector"; break;
                case "contractor": roleText = "Contractor"; break;
            }
            
            // 获取状态显示文本和样式
            let statusText = "";
            let statusClass = "";
            switch(user.status) {
                case "active":
                    statusText = "Active";
                    statusClass = "status-active";
                    break;
                case "inactive":
                    statusText = "Inactive";
                    statusClass = "status-inactive";
                    break;
                case "pending":
                    statusText = "Pending";
                    statusClass = "status-pending";
                    break;
            }
            
            row.innerHTML = `
                <td>
                    <input type="checkbox" class="user-checkbox" data-id="${user.id}">
                </td>
                <td>
                    <div class="user-info">
                        <div class="user-name">${user.name}</div>
                        ${user.department ? `<div class="user-department">${user.department}</div>` : ''}
                    </div>
                </td>
                <td>${user.email}</td>
                <td><span class="role-badge role-${user.role}">${roleText}</span></td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td>
                    <button class="action-btn edit-user-btn" data-id="${user.id}"><i class="fas fa-edit"></i></button>
                    <button class="action-btn delete-user-btn" data-id="${user.id}" style="background:linear-gradient(135deg,#e74c3c,#c0392b);color:#fff;"><i class="fas fa-trash"></i></button>
                </td>
            `;
            
            tbody.appendChild(row);
        });
        
        // 添加事件监听器
        this.attachEventListeners();
    },
    
    sortUsers: function(users, sortBy) {
        return [...users].sort((a, b) => {
            switch(sortBy) {
                case "name-asc":
                    return a.name.localeCompare(b.name);
                case "name-desc":
                    return b.name.localeCompare(a.name);
                case "date-asc":
                    return new Date(a.addedDate) - new Date(b.addedDate);
                case "date-desc":
                    return new Date(b.addedDate) - new Date(a.addedDate);
                default:
                    return 0;
            }
        });
    },
    
    updatePaginationInfo: function(start, end, total) {
        document.getElementById('page-start').textContent = start;
        document.getElementById('page-end').textContent = end;
        document.getElementById('total-items').textContent = total;
        
        // 更新分页按钮状态
        document.getElementById('prev-page').disabled = this.currentPage === 1;
        document.getElementById('next-page').disabled = 
            this.currentPage * this.itemsPerPage >= total;
    },
    
    updateUserStats: function() {
        const total = this.users.length;
        const active = this.users.filter(u => u.status === 'active').length;
        const pending = this.users.filter(u => u.status === 'pending').length;
        const admin = this.users.filter(u => u.role === 'admin').length;
        
        document.getElementById('total-users-count').textContent = total;
        document.getElementById('active-users-count').textContent = active;
        document.getElementById('pending-users-count').textContent = pending;
        document.getElementById('admin-users-count').textContent = admin;
    },
    
    setupFilterEvents: function() {
        document.querySelectorAll('.filter-group').forEach(group => {
            const toggle = group.querySelector('.filter-toggle');
            const options = group.querySelector('.filter-options');
            
            toggle.addEventListener('click', function(e) {
                e.stopPropagation();
                document.querySelectorAll('.filter-options').forEach(opt => {
                    if (opt !== options) opt.classList.remove('open');
                });
                options.classList.toggle('open');
            });
            
            group.querySelectorAll('.filter-option').forEach(option => {
                option.addEventListener('click', function(e) {
                    e.stopPropagation();
                    group.querySelectorAll('.filter-option').forEach(opt => opt.classList.remove('active'));
                    option.classList.add('active');
                    toggle.querySelector('span').textContent = option.textContent;
                    
                    const filterType = option.dataset.filter;
                    const filterValue = option.dataset.value;
                    
                    UserManagement.currentFilters[filterType] = filterValue;
                    
                    // 如果是排序，重置到第一页
                    if (filterType === 'sort') {
                        UserManagement.currentPage = 1;
                    }
                    
                    UserManagement.renderUserTable();
                    options.classList.remove('open');
                });
            });
        });
        
        document.addEventListener('click', function(e) {
            document.querySelectorAll('.filter-options').forEach(opt => opt.classList.remove('open'));
        });
        
        // 搜索表单
        document.getElementById('search-form').addEventListener('submit', function(e) {
            e.preventDefault();
            const searchTerm = this.querySelector('input').value.toLowerCase();
            
            if (searchTerm) {
                // 这里可以添加搜索功能
                alert(`Searching for: ${searchTerm}`);
            }
        });
        
        // 分页按钮
        document.getElementById('prev-page').addEventListener('click', function() {
            if (UserManagement.currentPage > 1) {
                UserManagement.currentPage--;
                UserManagement.renderUserTable();
            }
        });
        
        document.getElementById('next-page').addEventListener('click', function() {
            const totalUsers = UserManagement.users.length;
            const maxPage = Math.ceil(totalUsers / UserManagement.itemsPerPage);
            
            if (UserManagement.currentPage < maxPage) {
                UserManagement.currentPage++;
                UserManagement.renderUserTable();
            }
        });
        
        // 全选/取消全选
        document.getElementById('select-all-users').addEventListener('change', function() {
            const checkboxes = document.querySelectorAll('.user-checkbox');
            checkboxes.forEach(checkbox => {
                checkbox.checked = this.checked;
            });
        });
    },
    
    setupActionButtons: function() {
        // 添加用户按钮
        document.getElementById('add-user-btn').addEventListener('click', function() {
            document.getElementById('add-user-modal').style.display = 'flex';
        });
        
        // 取消添加用户
        document.getElementById('cancel-add-user').addEventListener('click', function() {
            document.getElementById('add-user-modal').style.display = 'none';
            document.getElementById('add-user-form').reset();
        });
        
        // 导出用户按钮
        document.getElementById('export-users-btn').addEventListener('click', function() {
            alert('Exporting user data...');
        });
        
        // 刷新按钮
        document.querySelector('.refresh-btn').addEventListener('click', function() {
            UserManagement.renderUserTable();
        });
        
        // 添加用户表单提交
        document.getElementById('add-user-form').addEventListener('submit', function(e) {
            e.preventDefault();
            
            const newUser = {
                id: UserManagement.users.length + 1,
                name: document.getElementById('input-user-name').value,
                email: document.getElementById('input-user-email').value,
                role: document.getElementById('input-user-role').value,
                department: document.getElementById('input-user-department').value,
                status: document.getElementById('input-user-status').value,
                addedDate: new Date().toISOString().split('T')[0]
            };
            
            UserManagement.users.push(newUser);
            UserManagement.renderUserTable();
            UserManagement.updateUserStats();
            
            document.getElementById('add-user-modal').style.display = 'none';
            this.reset();
            
            alert('User added successfully!');
        });
    },
    
    attachEventListeners: function() {
        // 编辑用户按钮
        document.querySelectorAll('.edit-user-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const userId = parseInt(this.getAttribute('data-id'));
                const user = UserManagement.users.find(u => u.id === userId);
                
                if (user) {
                    // 填充编辑表单
                    document.getElementById('input-user-name').value = user.name;
                    document.getElementById('input-user-email').value = user.email;
                    document.getElementById('input-user-role').value = user.role;
                    document.getElementById('input-user-department').value = user.department || '';
                    document.getElementById('input-user-status').value = user.status;
                    
                    // 显示模态框
                    document.getElementById('add-user-modal').style.display = 'flex';
                    
                    // 修改表单标题和提交按钮文本
                    const modalTitle = document.querySelector('#add-user-modal h3 span');
                    const submitBtn = document.querySelector('#add-user-form button[type="submit"]');
                    
                    modalTitle.textContent = 'Edit User';
                    submitBtn.textContent = 'Update User';
                    
                    // 临时存储正在编辑的用户ID
                    submitBtn.dataset.editingUserId = userId;
                    
                    // 修改表单提交事件
                    const form = document.getElementById('add-user-form');
                    const originalSubmit = form.onsubmit;
                    
                    form.onsubmit = function(e) {
                        e.preventDefault();
                        
                        // 更新用户信息
                        user.name = document.getElementById('input-user-name').value;
                        user.email = document.getElementById('input-user-email').value;
                        user.role = document.getElementById('input-user-role').value;
                        user.department = document.getElementById('input-user-department').value;
                        user.status = document.getElementById('input-user-status').value;
                        
                        UserManagement.renderUserTable();
                        document.getElementById('add-user-modal').style.display = 'none';
                        form.reset();
                        
                        // 恢复原始表单
                        modalTitle.textContent = 'Add New User';
                        submitBtn.textContent = 'Add User';
                        delete submitBtn.dataset.editingUserId;
                        form.onsubmit = originalSubmit;
                        
                        alert('User updated successfully!');
                    };
                }
            });
        });
        
        // 删除用户按钮
        document.querySelectorAll('.delete-user-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const userId = parseInt(this.getAttribute('data-id'));
                const userName = UserManagement.users.find(u => u.id === userId)?.name;
                
                if (confirm(`Are you sure you want to delete user "${userName}"?`)) {
                    UserManagement.users = UserManagement.users.filter(u => u.id !== userId);
                    UserManagement.renderUserTable();
                    UserManagement.updateUserStats();
                    alert('User deleted successfully!');
                }
            });
        });
    }
};

// 初始化用户管理
function initUserManagement() {
    UserManagement.init();
}