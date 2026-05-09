document.addEventListener('DOMContentLoaded', function() {
    // 同步日期显示
    const storedDate = sessionStorage.getItem('globalDate');
    const dateSpan = document.querySelector('.date-display span');
    if (storedDate && dateSpan) dateSpan.textContent = storedDate;
    else if (dateSpan) dateSpan.textContent = new Date().toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' });

    // 读取数据
    const inspectionData = JSON.parse(sessionStorage.getItem('currentInspection'));
    if (inspectionData) {
        document.getElementById('docId').textContent = inspectionData.id || 'N/A';
        document.getElementById('docTitle').textContent = `${inspectionData.site} - Safety Inspection`;
        document.getElementById('docSite').textContent = inspectionData.site || 'N/A';
        document.getElementById('docDate').textContent = inspectionData.date || 'N/A';
        document.getElementById('docInspector').textContent = inspectionData.inspector || 'N/A';
        
        const statusEl = document.getElementById('docStatus');
        if (statusEl) {
            statusEl.textContent = inspectionData.statusText || 'Draft';
            statusEl.className = `doc-status status-${inspectionData.status || 'draft'}`;
        }
    } else {
        console.warn('No inspection data found');
        document.getElementById('docId').textContent = 'No data';
    }

    // 按钮事件
    document.getElementById('back-to-inspection-btn').addEventListener('click', () => window.location.href = 'safetyinspect.html');
    document.getElementById('print-btn').addEventListener('click', () => window.print());
    document.getElementById('export-pdf-btn').addEventListener('click', () => alert('PDF export feature is under development.'));
});