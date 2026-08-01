// login.js - DWSS 多用戶登錄系統
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('login-form');
    const errorDiv = document.getElementById('login-error');
    const togglePasswordBtn = document.getElementById('toggle-password');
    const passwordInput = document.getElementById('password');
    const usernameInput = document.getElementById('username');

    // ==================== 初始化用戶數據庫 ====================
    function initializeUserDatabase() {
        if (!localStorage.getItem('dwss_users_db')) {
            const defaultUsers = [
                {
                    id: 1,
                    name: "Admin",
                    email: "admin@rdrive.io",
                    username: "admin",
                    password: "admin123",
                    role: "admin",
                    department: "System Administration",
                    status: "online",
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
                    role: "officer",
                    department: "Administration",
                    status: "online",
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
                    role: "aei",
                    department: "AEI/NWNT",
                    status: "online",
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
                    role: "inspector",
                    department: "Safety Inspection",
                    status: "online",
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
                    role: "contractor",
                    department: "Contractor Team A",
                    status: "online",
                    permissions: {
                        level: 1,
                        canChangeStatus: false,
                        canManageUsers: false,
                        name: "Contractor"
                    }
                }
            ];
            localStorage.setItem('dwss_users_db', JSON.stringify(defaultUsers));
        }
    }

    // ==================== 登錄功能 ====================
    
    // 密碼顯示/隱藏切換
    if (togglePasswordBtn && passwordInput) {
        togglePasswordBtn.addEventListener('click', function() {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            this.querySelector('i').classList.toggle('fa-eye');
            this.querySelector('i').classList.toggle('fa-eye-slash');
        });
    }

    // 顯示錯誤信息
    function showError(message) {
        if (errorDiv) {
            errorDiv.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
            errorDiv.classList.add('show');
            setTimeout(() => {
                errorDiv.classList.remove('show');
            }, 3000);
        }
    }

    // 登錄驗證
    function loginUser(username, password) {
        initializeUserDatabase();
        
        const users = JSON.parse(localStorage.getItem('dwss_users_db') || '[]');
        
        // 查找用戶（可以用 username 或 email 登錄）
        const user = users.find(u => 
            (u.username.toLowerCase() === username.toLowerCase() || 
             u.email.toLowerCase() === username.toLowerCase()) && 
            u.password === password
        );
        
        if (!user) {
            showError('Invalid username or password');
            return false;
        }
        
        if (user.status === 'offline') {
            showError('Account is disabled. Please contact administrator.');
            return false;
        }
        
        // 創建會話數據
        const sessionData = {
            isLoggedIn: true,
            userId: user.id,
            userName: user.name,
            userEmail: user.email,
            userRole: user.role,
            userDepartment: user.department,
            permissions: user.permissions,
            loginTime: new Date().toISOString()
        };
        
        // 存儲會話
        sessionStorage.setItem('dwss_session', JSON.stringify(sessionData));
        sessionStorage.setItem('isLoggedIn', 'true');
        sessionStorage.setItem('loggedUser', user.name);
        
        // 同步當前用戶到 localStorage（用於其他頁面）
        localStorage.setItem('current_user', JSON.stringify({
            userId: user.id,
            userName: user.name,
            userRole: user.role,
            permissions: user.permissions
        }));
        
        return true;
    }

    // 表單提交
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const username = usernameInput.value.trim();
        const password = passwordInput.value.trim();
        
        if (!username || !password) {
            showError('Please enter username and password');
            return;
        }
        
        if (loginUser(username, password)) {
            // 登錄成功，跳轉到首頁
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
                    <div>🔴 <strong>Admin:</strong> admin / admin123</div>
                    <div>🔵 <strong>Officer:</strong> kenneth / officer123</div>
                    <div>🟢 <strong>AEI:</strong> garytang / aei123</div>
                    <div>🟡 <strong>Inspector:</strong> john / inspector123</div>
                    <div>⚫ <strong>Contractor:</strong> sarah / contractor123</div>
                </div>
                <p style="margin-top: 8px; font-size: 0.7rem; color: #e74c3c;">
                    <i class="fas fa-info-circle"></i> You can use username or email to login
                </p>
            `;
        }
    }
    
    updateLoginFooter();
});