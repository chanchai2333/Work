// ===== 用户管理功能 =====
const UserManagement = {
    users: [
        { 
            id: 1,
            name: "Admin",
            email: "admin@rdrive.io",
            role: "admin",
            department: "System Administration",
            status: "online",  // 改为 online
            addedDate: "2024-01-15"
        },
        { 
            id: 2,
            name: "Kenneth Daluz",
            email: "kenneth.daluz@aster-dsd.com",
            role: "officer",
            department: "Administration",
            status: "online",  // 改为 online
            addedDate: "2024-02-10"
        },
        { 
            id: 3,
            name: "TANG Chi Long, Gary",
            email: "gcifang@dsd.gov.hk",
            role: "aei",
            department: "AEI/NWNT",
            status: "online",  // 改为 online
            addedDate: "2024-02-15"
        },
        { 
            id: 4,
            name: "FUNG Wai Ching",
            email: "wcfung04@dsd.gov.hk",
            role: "aei",
            department: "AEI/SWH",
            status: "online",  // 改为 online
            addedDate: "2024-03-01"
        },
        { 
            id: 5,
            name: "WONG Lap Pan",
            email: "ipwong02@dsd.gov.hk",
            role: "aei",
            department: "AEI/SWH/1",
            status: "online",  // 改为 online
            addedDate: "2024-03-05"
        },
        { 
            id: 6,
            name: "CHA Chi Ming",
            email: "cmcha02@dsd.gov.hk",
            role: "aei",
            department: "AMI/TM",
            status: "online",  // 改为 online
            addedDate: "2024-03-10"
        },
        { 
            id: 7,
            name: "John Smith",
            email: "john.smith@ael-dwss.com",
            role: "inspector",
            department: "Safety Inspection",
            status: "online",  // 改为 online
            addedDate: "2024-03-15"
        },
        { 
            id: 8,
            name: "Sarah Johnson",
            email: "sarah.j@ael-dwss.com",
            role: "contractor",
            department: "Contractor Team A",
            status: "offline",  // 改为 offline (原pending)
            addedDate: "2024-04-01"
        },
        { 
            id: 9,
            name: "Robert Chen",
            email: "robert.chen@dsd.gov.hk",
            role: "officer",
            department: "Documentation",
            status: "online",  // 改为 online
            addedDate: "2024-04-05"
        },
        { 
            id: 10,
            name: "Emma Wilson",
            email: "emma.w@ael-dwss.com",
            role: "inspector",
            department: "Quality Control",
            status: "offline",  // 改为 offline (原inactive)
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
            
            // 获取状态显示文本和样式 (改为 online/offline)
            let statusText = "";
            let statusClass = "";
            switch(user.status) {
                case "online":
                    statusText = "Online";
                    statusClass = "status-online";  // 更新类名
                    break;
                case "offline":
                    statusText = "Offline";
                    statusClass = "status-offline";  // 更新类名
                    break;
            }
            
            row.innerHTML = `
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
        const online = this.users.filter(u => u.status === 'online').length;
        const offline = this.users.filter(u => u.status === 'offline').length;
        const admin = this.users.filter(u => u.role === 'admin').length;

        // 計算正確的數字（用於調試）
        console.log(`總用戶: ${total}, 在線: ${online}, 離線: ${offline}, 管理員: ${admin}`);

        // 更新 DOM
        const totalEl = document.getElementById('total-users-count');
        const onlineEl = document.getElementById('online-users-count');
        const offlineEl = document.getElementById('offline-users-count');
        const adminEl = document.getElementById('admin-users-count');

        if (totalEl) {
            totalEl.textContent = total;
            console.log(`更新總用戶數: ${total}`);
        }

        if (onlineEl) {
            onlineEl.textContent = online;
            console.log(`更新在線用戶數: ${online}`);
        }

        if (offlineEl) {
            offlineEl.textContent = offline;
            console.log(`更新離線用戶數: ${offline}`);
        }

        if (adminEl) {
            adminEl.textContent = admin;
            console.log(`更新管理員數: ${admin}`);
        }
    },
    
    setupFilterEvents: function() {
        document.querySelectorAll('.filter-group').forEach(group => {
            const toggle = group.querySelector('.filter-toggle');
            const options = group.querySelector('.filter-options');
            
            // 修复：确保点击切换按钮时能正常打开/关闭
            toggle.addEventListener('click', function(e) {
                e.stopPropagation();
                e.preventDefault();  // 防止默认行为
                
                // 关闭其他打开的筛选器
                document.querySelectorAll('.filter-options').forEach(opt => {
                    if (opt !== options) {
                        opt.classList.remove('open');
                        opt.classList.remove('show');  // 添加 show 类处理
                    }
                });
                
                // 切换当前筛选器
                options.classList.toggle('open');
                options.classList.toggle('show');  // 添加 show 类处理
            });
            
            group.querySelectorAll('.filter-option').forEach(option => {
                option.addEventListener('click', function(e) {
                    e.stopPropagation();
                    e.preventDefault();  // 防止默认行为
                    
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
                    options.classList.remove('show');  // 移除 show 类
                });
            });
        });
        
        // 点击页面其他地方关闭筛选器
        document.addEventListener('click', function(e) {
            if (!e.target.closest('.filter-group')) {
                document.querySelectorAll('.filter-options').forEach(opt => {
                    opt.classList.remove('open');
                    opt.classList.remove('show');  // 移除 show 类
                });
            }
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
        
        // 移除全选功能，不再需要
    },
    
    setupActionButtons: function() {
        //// 添加用户按钮
        //document.getElementById('add-user-btn').addEventListener('click', function() {
        //    document.getElementById('add-user-modal').style.display = 'flex';
        //});

        // 添加用户按钮
        const addUserBtn = document.getElementById('add-user-btn');
    if (addUserBtn) {
        addUserBtn.addEventListener('click', function() {
            // 重置表单标题和按钮文本
            const modalTitle = document.querySelector('#add-user-modal h3 span');
            const submitBtn = document.querySelector('#add-user-form button[type="submit"]');
            modalTitle.textContent = 'Add New User';
            submitBtn.textContent = 'Add User';
            delete submitBtn.dataset.editingUserId;
            
            document.getElementById('add-user-modal').style.display = 'flex';
            document.getElementById('add-user-form').reset();
        });
    }
        
        // 取消按钮
        document.getElementById('cancel-add-user').addEventListener('click', function() {
            document.getElementById('add-user-modal').style.display = 'none';
            document.getElementById('add-user-form').reset();
            
            // 重置表单标题和按钮文本
            const modalTitle = document.querySelector('#add-user-modal h3 span');
            const submitBtn = document.querySelector('#add-user-form button[type="submit"]');
            modalTitle.textContent = 'Add New User';
            submitBtn.textContent = 'Add User';
            delete submitBtn.dataset.editingUserId;
        });
        
        
        // 刷新按钮
        document.querySelector('.refresh-btn').addEventListener('click', function() {
            UserManagement.renderUserTable();
        });
        
        // 添加用户表单提交
        document.getElementById('add-user-form').addEventListener('submit', function(e) {
            e.preventDefault();
            
            // 获取编辑的用户ID（如果有）
    const submitBtn = document.querySelector('#add-user-form button[type="submit"]');
    const editingUserId = submitBtn.dataset.editingUserId;
    
            if (editingUserId) {
                // 编辑现有用户
                const userId = parseInt(editingUserId);
                const user = UserManagement.users.find(u => u.id === userId);
                
                if (user) {
                    user.name = document.getElementById('input-user-name').value;
                    user.email = document.getElementById('input-user-email').value;
                    user.role = document.getElementById('input-user-role').value;
                    user.department = document.getElementById('input-user-department').value;
                    user.status = document.getElementById('input-user-status').value;
                    
                    alert('User updated successfully!');
                }
            } else {
                // 添加新用户
                const newUser = {
                    id: UserManagement.users.length + 1,
                    name: document.getElementById('input-user-name').value,
                    email: document.getElementById('input-user-email').value,
                    role: document.getElementById('input-user-role').value,
                    department: document.getElementById('input-user-department').value,
                    status: document.getElementById('input-user-status').value, // 使用表单中的状态
                    addedDate: new Date().toISOString().split('T')[0]
                };
                
                UserManagement.users.push(newUser);
                alert('User added successfully!');
            }
            
            // 刷新表格和统计
            UserManagement.renderUserTable();
            UserManagement.updateUserStats();
            
            // 关闭模态框
            document.getElementById('add-user-modal').style.display = 'none';
            this.reset();
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
                    
                    if (user) {
                        // 填充编辑表单
                        document.getElementById('input-user-name').value = user.name;
                        document.getElementById('input-user-email').value = user.email;
                        document.getElementById('input-user-role').value = user.role;
                        document.getElementById('input-user-department').value = user.department || '';
                        document.getElementById('input-user-status').value = user.status; // 填充状态
                                
                        // 修改表单标题和提交按钮文本
                        const modalTitle = document.querySelector('#add-user-modal h3 span');
                        const submitBtn = document.querySelector('#add-user-form button[type="submit"]');
                                
                        modalTitle.textContent = 'Edit User';
                        submitBtn.textContent = 'Update User';
                        submitBtn.dataset.editingUserId = userId; // 存储编辑的用户ID
                    // 显示模态框
                    document.getElementById('add-user-modal').style.display = 'flex';
                    
                    }
                    //// 修改表单标题和提交按钮文本
                    //const modalTitle = document.querySelector('#add-user-modal h3 span');
                    //const submitBtn = document.querySelector('#add-user-form button[type="submit"]');
                    //
                    //modalTitle.textContent = 'Edit User';
                    //submitBtn.textContent = 'Update User';
                    //
                    //// 临时存储正在编辑的用户ID
                    //submitBtn.dataset.editingUserId = userId;
                    
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
                        UserManagement.updateUserStats();
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

// 处理侧边栏子菜单的展开/收起
document.addEventListener('DOMContentLoaded', function() {
    // 获取所有带子菜单的菜单项
    const submenuItems = document.querySelectorAll('.menu-item-with-submenu > .submenu-toggle');
    
    submenuItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            // 获取父菜单项和子菜单
            const parentItem = this.parentElement;
            const submenu = parentItem.querySelector('.submenu');
            
            // 切换 active 类
            parentItem.classList.toggle('active');
            
            // 如果点击的是当前活动的 User Management
            if (parentItem.classList.contains('active')) {
                // 展开子菜单
                submenu.style.maxHeight = submenu.scrollHeight + 'px';
                // 旋转箭头
                const arrow = this.querySelector('.submenu-arrow');
                if (arrow) arrow.style.transform = 'rotate(180deg)';
            } else {
                // 收起子菜单
                submenu.style.maxHeight = '0';
                // 恢复箭头方向
                const arrow = this.querySelector('.submenu-arrow');
                if (arrow) arrow.style.transform = 'rotate(0deg)';
            }
            
            // 关闭其他打开的菜单
            document.querySelectorAll('.menu-item-with-submenu').forEach(otherItem => {
                if (otherItem !== parentItem && otherItem.classList.contains('active')) {
                    otherItem.classList.remove('active');
                    const otherSubmenu = otherItem.querySelector('.submenu');
                    const otherArrow = otherItem.querySelector('.submenu-arrow');
                    if (otherSubmenu) otherSubmenu.style.maxHeight = '0';
                    if (otherArrow) otherArrow.style.transform = 'rotate(0deg)';
                }
            });
        });
    });
    
    // 点击子菜单链接时，保持父菜单展开
    document.querySelectorAll('.submenu a').forEach(link => {
        link.addEventListener('click', function() {
            // 移除所有 active 类
            document.querySelectorAll('.submenu a').forEach(a => {
                a.classList.remove('active');
            });
            // 添加当前链接的 active 类
            this.classList.add('active');
            
            // 确保父菜单保持展开
            const parentItem = this.closest('.menu-item-with-submenu');
            if (parentItem) {
                parentItem.classList.add('active');
                const submenu = parentItem.querySelector('.submenu');
                const arrow = parentItem.querySelector('.submenu-arrow');
                if (submenu) submenu.style.maxHeight = submenu.scrollHeight + 'px';
                if (arrow) arrow.style.transform = 'rotate(180deg)';
            }
        });
    });
    
    // 点击页面其他区域时关闭所有子菜单（可选）
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.menu-item-with-submenu')) {
            document.querySelectorAll('.menu-item-with-submenu').forEach(item => {
                item.classList.remove('active');
                const submenu = item.querySelector('.submenu');
                const arrow = item.querySelector('.submenu-arrow');
                if (submenu) submenu.style.maxHeight = '0';
                if (arrow) arrow.style.transform = 'rotate(0deg)';
            });
        }
    });
});

// 初始化用户管理
function initUserManagement() {
    UserManagement.init();
}