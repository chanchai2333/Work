document.addEventListener('DOMContentLoaded', function() {
    // 从sessionStorage获取文档数据
    const inspectionData = JSON.parse(sessionStorage.getItem('currentInspection'));
    
    // 显示文件资料
    if (inspectionData) {
        // 设置文档信息
        document.getElementById('docId').textContent = inspectionData.id || 'N/A';
        document.getElementById('docTitle').textContent = `${inspectionData.site} Safety Inspection`;
        document.getElementById('docSite').textContent = inspectionData.site || 'N/A';
        document.getElementById('docDate').textContent = inspectionData.date || 'N/A';
        document.getElementById('docInspector').textContent = inspectionData.inspector || 'N/A';
        
        // 设置状态文本和样式
        const statusElement = document.getElementById('docStatus');
        statusElement.textContent = inspectionData.statusText || 'Draft';
        
        // 清除现有样式类
        statusElement.className = 'doc-status';
        
        // 添加对应状态的样式类
        if (inspectionData.status === 'draft') {
            statusElement.classList.add('status-draft');
        } else if (inspectionData.status === 'submitted-ig') {
            statusElement.classList.add('status-submitted-ig');
        } else if (inspectionData.status === 'submitted-wsg') {
            statusElement.classList.add('status-submitted-wsg');
        } else if (inspectionData.status === 'closed') {
            statusElement.classList.add('status-closed');
        } else if (inspectionData.status === 'reopen') {
            statusElement.classList.add('status-reopen');
        } else if (inspectionData.status === 'cancelled') {
            statusElement.classList.add('status-cancelled');
        }
    }
    
    // 从localStorage获取用户名
    const user = JSON.parse(localStorage.getItem('user'));
    if (user) {
        document.getElementById('username').textContent = user.name;
    }
    
    // 设置当前日期
    const today = new Date();
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('current-date').textContent = today.toLocaleDateString('en-US', options);

    document.getElementById('back-to-inspection-btn').addEventListener('click', function() {
        window.location.href = 'safetyinspect.html';
    });
    
    // 打印功能
    document.getElementById('print-btn').addEventListener('click', function() {
        window.print();
    });
    
    // 导出PDF功能
    document.getElementById('export-pdf-btn').addEventListener('click', function() {
        alert('PDF export functionality would be implemented here.');
    });
});