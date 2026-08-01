/**
 * =====================================================
 * Site Diary Page Script
 * =====================================================
 */

document.addEventListener('DOMContentLoaded', function () {

    let diaryData = JSON.parse(
        sessionStorage.getItem('diaryData') ||
        localStorage.getItem('diaryDataedit')
    ) || [
        {
            id: "SD-2025-001",
            status: "draft",
            site: "Treatment Plant",
            date: "15-Aug-2025",
            submittedBy: "John Doe",
            type: "Contractor Documents"
        },
        {
            id: "SD-2025-002",
            status: "submitted-wsg",
            site: "Pipeline",
            date: "14-Aug-2025",
            submittedBy: "Jane Smith",
            type: "Contractor Documents"
        }
    ];

    function saveData() {
        sessionStorage.setItem('diaryData', JSON.stringify(diaryData));
        localStorage.setItem('diaryDataedit', JSON.stringify(diaryData));
    }

    function renderTable() {
        const tbody = document.getElementById('diary-table-body');
        if (!tbody) return;

        tbody.innerHTML = '';

        diaryData.forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${item.id}</td>
                <td><span class="status-badge status-${item.status}">${item.status}</span></td>
                <td>${item.site}</td>
                <td>${item.date}</td>
                <td>${item.submittedBy}</td>
                <td>${item.type}</td>
                <td>
                    <button class="action-btn view-btn" data-id="${item.id}">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="action-btn edit-btn" data-id="${item.id}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn delete-btn" data-id="${item.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    // Action buttons (event delegation)
    document.addEventListener('click', function (e) {

        const viewBtn = e.target.closest('.view-btn');
        const editBtn = e.target.closest('.edit-btn');
        const deleteBtn = e.target.closest('.delete-btn');

        
        if (viewBtn) {
           const id = viewBtn.dataset.id;
           const record = diaryData.find(d => d.id === id);
        
           sessionStorage.setItem('currentDocument', JSON.stringify(record));
           window.location.href = 'sitediarydocument.html';
        }

        if (editBtn) {
           const id = editBtn.dataset.id;
           const record = diaryData.find(d => d.id === id);
        
           sessionStorage.setItem('editDocument', JSON.stringify(record));
           window.location.href = 'editpdf.html';
        }


        if (deleteBtn) {
            const id = deleteBtn.dataset.id;
            if (confirm('Delete this diary?')) {
                diaryData = diaryData.filter(d => d.id !== id);
                saveData();
                renderTable();
            }
        }
    });

    renderTable();
});