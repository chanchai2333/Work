// scripts/user-display.js
// 從 dwss_session 讀取登入者名字，動態更新所有 .user-btn
(function () {
    'use strict';

    function getLoggedInName() {
        try {
            var raw = sessionStorage.getItem('dwss_session');
            if (!raw) return null;
            var s = JSON.parse(raw);
            return s.userName || s.userEmail || null;
        } catch (e) { return null; }
    }

    var applying = false;
    function applyUserName() {
        if (applying) return;
        var name = getLoggedInName();
        if (!name) return;

        applying = true;
        try {
            document.querySelectorAll('.user-btn').forEach(function (btn) {
                var currentText = (btn.textContent || '').replace(/\s+/g, ' ').trim();
                if (currentText.indexOf(name) !== -1) return;

                // 若有 <span>，只改 span 內容（保留結構）
                var span = btn.querySelector('span');
                if (span) {
                    span.textContent = name;
                    span.removeAttribute('data-i18n'); // 防止 language.js 覆蓋
                    return;
                }

                // 若無 span，保留 <i> 圖示，只替換文字節點
                Array.from(btn.childNodes).forEach(function (node) {
                    if (node.nodeType === Node.TEXT_NODE) node.remove();
                });
                btn.appendChild(document.createTextNode(' ' + name));
            });
        } finally {
            applying = false;
        }
    }

    function start() {
        applyUserName();
        // 多時間點執行：覆蓋 language.js / 其他延遲腳本的覆蓋
        [100, 400, 800, 1500, 3000].forEach(function (t) {
            setTimeout(applyUserName, t);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start);
    } else {
        start();
    }
})();