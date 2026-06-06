// login.js - 登录逻辑
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('login-form');
    const errorDiv = document.getElementById('login-error');
    const togglePasswordBtn = document.getElementById('toggle-password');
    const passwordInput = document.getElementById('password');

    // 密码显示/隐藏切换
    if (togglePasswordBtn && passwordInput) {
        togglePasswordBtn.addEventListener('click', function() {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            this.querySelector('i').classList.toggle('fa-eye');
            this.querySelector('i').classList.toggle('fa-eye-slash');
        });
    }

    // 表单提交
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value.trim();
        
        // 简单验证：用户名 admin，密码 12345678
        if (username === 'admin' && password === '12345678') {
            // 登录成功，可以存储简单的登录标记（可选）
            sessionStorage.setItem('isLoggedIn', 'true');
            sessionStorage.setItem('loggedUser', username);
            // 跳转到首页
            window.location.href = 'index.html';
        } else {
            // 显示错误信息
            errorDiv.classList.add('show');
            // 3秒后自动隐藏
            setTimeout(() => {
                errorDiv.classList.remove('show');
            }, 3000);
        }
    });
});