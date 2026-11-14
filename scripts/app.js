/**
 * =====================================================
 * AEL DWSS - Global App Configuration
 * =====================================================
 */
console.log('[DWSS] app.js 正在載入...');

window.addEventListener('error', function (e) {
    console.error('[Global Error]', e.error || e.message);
});

const AppConfig = {
    defaults: { theme: 'light', language: 'en', dateFormat: 'dd-mm-yyyy' },
    current: {},

    init() {
        this.current.theme = localStorage.getItem('ael_dwss_theme') || this.defaults.theme;
        this.current.language = localStorage.getItem('ael_dwss_language') || this.defaults.language;
        this.current.dateFormat = localStorage.getItem('ael_dwss_dateFormat') || this.defaults.dateFormat;

        this.applyTheme();
        this.updateDateDisplay();
        
        var dateEl = document.getElementById('current-date');
        if (dateEl) {
            sessionStorage.setItem('globalDate', dateEl.textContent);
        }
    },

    applyTheme() {
        if (this.current.theme === 'dark') {
            document.body.classList.add('dark-theme');
        } else {
            document.body.classList.remove('dark-theme');
        }
    },

    updateDateDisplay() {
        const el = document.getElementById('current-date');
        if (!el) return;
        const now = new Date();
        const day = String(now.getDate()).padStart(2, '0');
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const year = now.getFullYear();
        let formatted = `${day}-${month}-${year}`;
        switch (this.current.dateFormat) {
            case 'yyyy-mm-dd': formatted = `${year}-${month}-${day}`; break;
            case 'mm-dd-yyyy': formatted = `${month}-${day}-${year}`; break;
        }
        el.textContent = formatted;
    }
};

function setupSidebarToggle() {
    const toggleBtn = document.querySelector('.toggle-btn');
    const sidebar = document.querySelector('.sidebar');
    if (!toggleBtn || !sidebar) return;

    toggleBtn.addEventListener('click', () => {
        sidebar.classList.toggle('collapsed');
        const main = document.querySelector('.main-content');
        if (main) {
            main.classList.remove('main-content-expanded', 'main-content-collapsed');
            main.style.marginLeft = '0';
            main.style.transform = 'none';
        }
    });
}

// ==========================================
// ★ 全域 Footer 統一注入腳本
// ==========================================
(function() {
    function enforceFooter() {
        let footers = document.querySelectorAll('footer');
        
        if (footers.length === 0) {
            let footer = document.createElement('footer');
            const target = document.querySelector('.main-content') || document.body;
            target.appendChild(footer);
            footers = [footer];
        }

        footers.forEach(footer => {
            // 這裡可以改成你想要的任何文字！
            footer.innerHTML = `
                <p data-i18n="copyright">&copy; 2026 AEL DWSS System. All rights reserved. </p>
                <p data-i18n="platform">AEL DWSS Platform v0.0.0</p>
            `;
        });
        
        // 確保語系翻譯有套用上去
        if (typeof window.updateLanguage === 'function') window.updateLanguage();
        else if (typeof window.applyLanguage === 'function') window.applyLanguage();
        
        console.log('[DWSS] Footer 已成功替換！');
    }

    // 等網頁完全載入後執行，避免被其他腳本覆蓋
    window.addEventListener('load', function() {
        enforceFooter();
        // 500毫秒後再執行一次，確保 language.js 不會蓋掉
        setTimeout(enforceFooter, 500); 
    });
    
    // 如果 DOM 已經載入完成，直接執行
    if (document.readyState === 'complete') {
        enforceFooter();
        setTimeout(enforceFooter, 500);
    }

    // 綁定其他初始化
    document.addEventListener('DOMContentLoaded', () => {
        AppConfig.init();
        setupSidebarToggle();
    });
})();