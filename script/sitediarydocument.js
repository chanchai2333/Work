document.addEventListener('DOMContentLoaded', function() {
    // 从sessionStorage获取文档数据
    const documentData = JSON.parse(sessionStorage.getItem('currentDocument'));
    
    // 显示文件资料
    if (documentData) {
        // 设置PDF查看器
        if (documentData.pdfUrl) {
            document.getElementById('pdf-viewer').src = documentData.pdfUrl;
        }
        
        // 设置文档信息
        document.getElementById('docId').textContent = documentData.id || 'N/A';
        document.getElementById('docTitle').textContent = `${documentData.site} - ${documentData.type}`;
        document.getElementById('docSite').textContent = documentData.site || 'N/A';
        document.getElementById('docDate').textContent = documentData.date || 'N/A';
        document.getElementById('docAuthor').textContent = documentData.submittedBy || 'N/A';
        
        // 设置状态文本和样式
        const statusElement = document.getElementById('docStatus');
        statusElement.textContent = documentData.statusText || 'Draft';
        
        // 清除现有样式类
        statusElement.className = 'doc-status';
        
        // 添加对应状态的样式类
        if (documentData.status === 'draft') {
            statusElement.classList.add('status-draft');
        } else if (documentData.status === 'submitted-ig') {
            statusElement.classList.add('status-submitted-ig');
        } else if (documentData.status === 'submitted-wsg') {
            statusElement.classList.add('status-submitted-wsg');
        } else if (documentData.status === 'closed') {
            statusElement.classList.add('status-closed');
        } else if (documentData.status === 'reopen') {
            statusElement.classList.add('status-reopen');
        } else if (documentData.status === 'cancelled') {
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

    document.getElementById('back-to-diary-btn').addEventListener('click', function() {
                window.location.href = 'sitediary.html';
            });
            
            // 打印功能
            document.getElementById('print-btn').addEventListener('click', function() {
                window.print();
            });
            
            // 导出PDF功能
            document.getElementById('export-pdf-btn').addEventListener('click', function() {
                
            });
});
