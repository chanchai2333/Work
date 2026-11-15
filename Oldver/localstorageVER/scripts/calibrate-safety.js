/**
 * calibrate-safety.js — Safety Inspection 校準工具
 * 用法：
 *   1. 打開 editsafetypdf.html（載入 Safety Inspection PDF）
 *   2. F12 → Console → 貼入以下代碼 → Enter
 *   3. 對每個項目點「左上角」同「右下角」
 *   4. 完成後按 Esc → 複製結果
 */
(function () {
    'use strict';

    var pdfPage = document.querySelector('.pdf-page');
    if (!pdfPage) {
        alert('找不到 PDF 頁面，請先載入 Safety Inspection PDF');
        return;
    }

    var old = document.getElementById('__calib_wrap');
    if (old) old.remove();

    // 十字線
    var cursorH = document.createElement('div');
    cursorH.style.cssText = 'position:fixed;pointer-events:none;background:#ef4444;z-index:99999;height:1px;left:0;right:0;display:none;';
    var cursorV = document.createElement('div');
    cursorV.style.cssText = 'position:fixed;pointer-events:none;background:#ef4444;z-index:99999;width:1px;top:0;bottom:0;display:none;';
    document.body.appendChild(cursorH);
    document.body.appendChild(cursorV);

    // 面板
    var panel = document.createElement('div');
    panel.id = '__calib_wrap';
    panel.style.cssText = 'position:fixed;top:10px;right:10px;background:#0f172a;color:#e2e8f0;padding:14px 18px;font-family:monospace;font-size:13px;z-index:100000;border-radius:8px;box-shadow:0 4px 20px rgba(0,0,0,0.5);width:400px;max-height:85vh;overflow-y:auto;';
    panel.innerHTML =
        '<div style="font-weight:bold;color:#60a5fa;margin-bottom:8px;font-size:14px;">★ Safety Inspection 校準模式</div>' +
        '<div style="color:#fbbf24;font-size:11px;line-height:1.5;margin-bottom:10px;">' +
        '點擊位置記錄座標。<b>Esc</b> 結束並複製結果。</div>' +
        '<div id="__coord_now" style="background:#1e293b;padding:6px 10px;border-radius:4px;color:#4ade80;margin-bottom:8px;font-size:12px;">X: --- % | Y: --- %</div>' +
        '<div style="background:#1e293b;padding:8px;border-radius:4px;margin-bottom:8px;font-size:11px;color:#fbbf24;line-height:1.6;">' +
        '<b>建議校準順序：</b><br>' +
        '1. Header: Type (左上/右下)<br>' +
        '2. Header: Location (左上/右下)<br>' +
        '3. Header: Date (左上/右下)<br>' +
        '4. Header: Time (左上/右下)<br>' +
        '5. Header: Task No. (左上/右下)<br>' +
        '6. Section A: 第一行「A」格 (左上/右下)<br>' +
        '7. Section A: 第一行「N/A」格 (左上/右下)<br>' +
        '8. Section A: 第二行「A」格 (左上/右下)<br>' +
        '9. Section B: 第一行「A」格 (左上/右下)<br>' +
        '10. ... 如此類推，每個 section 一行<br>' +
        '11. 簽名區 4 個 (左上/右下)<br>' +
        '12. Other Remarks (左上/右下)' +
        '</div>' +
        '<div id="__calib_log" style="background:#1e293b;padding:6px 10px;border-radius:4px;max-height:250px;overflow-y:auto;font-size:11px;line-height:1.6;color:#a5f3fc;"></div>' +
        '<button id="__copy_btn" style="margin-top:8px;padding:6px 12px;background:#3b82f6;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:12px;width:100%;">📋 複製全部座標</button>' +
        '<button id="__clear_btn" style="margin-top:4px;padding:6px 12px;background:#ef4444;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:12px;width:100%;">🗑 清除記錄</button>';
    document.body.appendChild(panel);

    var nowEl = document.getElementById('__coord_now');
    var logEl = document.getElementById('__calib_log');
    var count = 0;
    var allLogs = [];

    function getPct(e) {
        var r = pdfPage.getBoundingClientRect();
        var x = ((e.clientX - r.left) / r.width) * 100;
        var y = ((e.clientY - r.top) / r.height) * 100;
        return { x: x, y: y, inRange: (x >= 0 && x <= 100 && y >= 0 && y <= 100) };
    }

    function onMove(e) {
        var p = getPct(e);
        if (!p.inRange) {
            cursorH.style.display = 'none';
            cursorV.style.display = 'none';
            nowEl.textContent = 'X: --- % | Y: --- %';
            return;
        }
        cursorH.style.display = 'block';
        cursorH.style.top = e.clientY + 'px';
        cursorV.style.display = 'block';
        cursorV.style.left = e.clientX + 'px';
        nowEl.textContent = 'X: ' + p.x.toFixed(2) + '% | Y: ' + p.y.toFixed(2) + '%';
    }

    function onClick(e) {
        var p = getPct(e);
        if (!p.inRange) return;
        e.preventDefault();
        e.stopPropagation();
        count++;
        var line = '#' + count + '  left: ' + p.x.toFixed(2) + '%, top: ' + p.y.toFixed(2) + '%';
        allLogs.push(line);
        var div = document.createElement('div');
        div.style.cssText = 'border-bottom:1px dashed #334155;padding:2px 0;';
        div.textContent = line;
        logEl.appendChild(div);
        logEl.scrollTop = logEl.scrollHeight;
        console.log(line);
    }

    function onKey(e) {
        if (e.key === 'Escape') {
            cleanup();
            console.log('[校準模式] 結束。全部記錄：\n' + allLogs.join('\n'));
            alert('校準結束！共 ' + allLogs.length + ' 個點。\n請點「複製全部座標」按鈕，然後貼俾 AI。');
        }
    }

    function cleanup() {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('click', onClick, true);
        document.removeEventListener('keydown', onKey);
        cursorH.remove();
        cursorV.remove();
    }

    document.getElementById('__copy_btn').addEventListener('click', function () {
        var text = allLogs.join('\n');
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text).then(function () {
                alert('已複製 ' + allLogs.length + ' 筆座標！');
            });
        } else {
            var ta = document.createElement('textarea');
            ta.value = text;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            ta.remove();
            alert('已複製！');
        }
        console.log('\n===== 全部座標 =====\n' + text + '\n====================');
    });

    document.getElementById('__clear_btn').addEventListener('click', function () {
        if (confirm('確定清除所有記錄？')) {
            count = 0;
            allLogs = [];
            logEl.innerHTML = '';
        }
    });

    document.addEventListener('mousemove', onMove);
    document.addEventListener('click', onClick, true);
    document.addEventListener('keydown', onKey);

    console.log('[校準模式] 已啟動！點擊位置記錄座標，按 Esc 結束。');
})();