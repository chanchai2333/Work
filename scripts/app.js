/**
 * =====================================================
 * AEL DWSS - Global App Configuration
 * =====================================================
 * Scope:
 * - Global theme / language / date display
 * - Sidebar toggle
 * - Global error handler
 * 
 * IMPORTANT:
 * - DO NOT put page-specific logic here
 * - Site Diary / Filters / Tables MUST be page-level JS
 * =====================================================
 */

/* ------------------------------
 * Global Error Handling
 * ------------------------------ */
window.addEventListener('error', function (e) {
    console.error('[Global Error]', e.error || e.message);
});

/* ------------------------------
 * Global App Configuration
 * ------------------------------ */
const AppConfig = {
    defaults: {
        theme: 'light',
        language: 'en',
        dateFormat: 'dd-mm-yyyy'
    },
    current: {},

    init() {
        this.current.theme =
            localStorage.getItem('ael_dwss_theme') || this.defaults.theme;

        this.current.language =
            localStorage.getItem('ael_dwss_language') || this.defaults.language;

        this.current.dateFormat =
            localStorage.getItem('ael_dwss_dateFormat') || this.defaults.dateFormat;

        this.applyTheme();
        this.updateDateDisplay();
        // app.js 設定日期後，加這一行
        sessionStorage.setItem('globalDate', document.getElementById('current-date')?.textContent);
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

        let formatted;
        switch (this.current.dateFormat) {
            case 'yyyy-mm-dd':
                formatted = `${year}-${month}-${day}`;
                break;
            case 'mm-dd-yyyy':
                formatted = `${month}-${day}-${year}`;
                break;
            case 'dd-mm-yyyy':
            default:
                formatted = `${day}-${month}-${year}`;
        }

        el.textContent = formatted;
    }
};

/* ------------------------------
 * Sidebar Toggle
 * ------------------------------ */
function setupSidebarToggle() {
    const toggleBtn = document.querySelector('.toggle-btn');
    const sidebar = document.querySelector('.sidebar');

    if (!toggleBtn || !sidebar) return;

    toggleBtn.addEventListener('click', () => {
    sidebar.classList.toggle('collapsed');

    // === BUGFIX #1: Prevent main-content from shifting ===
    const main = document.querySelector('.main-content');
    if (main) {
        main.classList.remove(
            'main-content-expanded',
            'main-content-collapsed'
        );
        main.style.marginLeft = '0';
        main.style.transform = 'none';
    }
});
}

/* ------------------------------
 * Global Initialization
 * ------------------------------ */
document.addEventListener('DOMContentLoaded', () => {
    AppConfig.init();
    setupSidebarToggle();
});

// ==========================================
// ★ 全域 Footer 統一注入腳本
// ==========================================
(function() {
    function injectGlobalFooter() {
        // 1. 尋找頁面上是否已經有 footer
        let footer = document.querySelector('footer');
        
        // 2. 如果沒有 footer，就動態建立一個
        if (!footer) {
            footer = document.createElement('footer');
            // 嘗試放到 .main-content 裡面，若沒有則放到 body 底部
            const target = document.querySelector('.main-content') || document.body;
            target.appendChild(footer);
        }
        
        // 3. 統一覆寫 Footer 內容 (這裡改成你想要的統一版本)
        // 注意：我保留了 data-i18n 屬性，以相容你原本的語系切換功能
        footer.innerHTML = `
            <p data-i18n="copyright">&copy; AEL DWSS System. All rights reserved.</p>
            <p data-i18n="platform">AEL DWSS Platform v0.0</p>
        `;

        // 4. 如果你的 language.js 不會自動監聽 DOM 變化，需手動觸發翻譯
        // 假設你的 language.js 有暴露一個全域更新函數 (請依你實際情況修改函數名稱)
        if (typeof window.updateLanguage === 'function') {
            window.updateLanguage();
        } else if (typeof window.applyLanguage === 'function') {
            window.applyLanguage();
        }
    }

    // 確保 DOM 載入完成後執行
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', injectGlobalFooter);
    } else {
        injectGlobalFooter();
    }
})();