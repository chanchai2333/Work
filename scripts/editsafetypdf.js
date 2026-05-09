document.addEventListener("DOMContentLoaded", function() {
    // 同步日期
    const storedDate = sessionStorage.getItem('globalDate');
    const dateSpan = document.querySelector('.date-display span');
    if (storedDate && dateSpan) dateSpan.textContent = storedDate;
    else if (dateSpan) dateSpan.textContent = new Date().toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' });

    // 读取要编辑的文档数据
    const editDoc = JSON.parse(sessionStorage.getItem('editDocument'));
    if (editDoc) {
        document.getElementById('docId').textContent = editDoc.id || 'N/A';
        document.getElementById('docSite').textContent = editDoc.site || 'N/A';
        document.getElementById('docDate').textContent = editDoc.date || 'N/A';
        document.getElementById('docInspector').textContent = editDoc.inspector || 'N/A';
        document.getElementById('docTitle').textContent = `Safety Inspection - ${editDoc.id}`;
        const statusEl = document.getElementById('docStatus');
        if (statusEl) {
            statusEl.textContent = editDoc.statusText || 'Editing';
            statusEl.className = `doc-status status-${editDoc.status || 'draft'}`;
        }
        // 如果有 PDF URL，可尝试加载（示例中未提供，可忽略）
        if (editDoc.pdfUrl) console.log('PDF URL:', editDoc.pdfUrl);
    } else {
        console.error("No edit document found");
        document.getElementById('docId').textContent = 'No data';
    }

    // 按钮事件
    document.getElementById('save-btn').addEventListener('click', () => {
        alert('Changes saved (demo).');
        window.location.href = 'safetyinspect.html';
    });
    document.getElementById('cancel-btn').addEventListener('click', () => {
        if (confirm('Cancel editing? Changes will be lost.')) window.location.href = 'safetyinspect.html';
    });
    document.getElementById('back-btn').addEventListener('click', () => window.location.href = 'safetyinspect.html');

    // 简单的工具按钮切换（仅样式）
    document.querySelectorAll('.tool-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
        });
    });
});