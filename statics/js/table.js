// Table rendering and pagination module
class TableManager {
    constructor() {
        this.tableData = [];
        this.currentPage = 1;
        this.rowsPerPage = 100;
        this.sortColumn = '';
        this.sortAsc = true;
    }

    setData(data) {
        this.tableData = data;
        this.currentPage = 1;
    }

    getColumnOrder(rows) {
        if (!rows.length) return [];
        const keys = Object.keys(rows[0]);
        let cols = [...keys];
        
        // Reorder work_total and trans_per_sec if they exist
        if (cols.includes('work_total') && cols.includes('trans_per_sec')) {
            cols = cols.filter(c => c !== 'work_total' && c !== 'trans_per_sec');
            const idx = keys.indexOf('trans_per_sec');
            cols.splice(idx > 0 ? idx - 1 : 0, 0, 'work_total', 'trans_per_sec');
        }
        return cols;
    }

    renderTable() {
        let data = [...this.tableData];
        if (this.sortColumn) {
            data.sort((a, b) => this.sortAsc ? 
                (a[this.sortColumn] > b[this.sortColumn]) - (a[this.sortColumn] < b[this.sortColumn]) :
                (b[this.sortColumn] > a[this.sortColumn]) - (b[this.sortColumn] < a[this.sortColumn]));
        }

        const start = (this.currentPage - 1) * this.rowsPerPage;
        const rows = data.slice(start, start + this.rowsPerPage);
        
        if (!rows.length) {
            document.getElementById('search-result').innerHTML = "<p>No data</p>";
            return;
        }

        const columns = this.getColumnOrder(rows);
        let html = `<table><thead><tr>`;
        columns.forEach(c => html += `<th onclick="tableManager.sortByColumn('${c}')">${c}</th>`);
        html += `</tr></thead><tbody>`;
        
        rows.forEach(r => {
            html += `<tr>` + columns.map(c => {
                if (c === 'work_total') {
                    return `<td>${Utils.formatWorkTotal(r[c])}</td>`;
                } else {
                    return `<td>${r[c] !== undefined ? r[c] : ''}</td>`;
                }
            }).join('') + `</tr>`;
        });
        
        html += `</tbody></table>`;
        document.getElementById('search-result').innerHTML = html;
    }

    renderPagination() {
        const pages = Math.ceil(this.tableData.length / this.rowsPerPage);
        let html = "";
        for (let i = 1; i <= pages; i++) {
            html += `<button onclick="tableManager.goToPage(${i})"${i === this.currentPage ? ' disabled' : ''}>${i}</button>`;
        }
        document.getElementById('pagination').innerHTML = html;
    }

    goToPage(page) {
        this.currentPage = page;
        this.renderTable();
        this.renderPagination();
    }

    sortByColumn(column) {
        this.sortAsc = this.sortColumn === column ? !this.sortAsc : true;
        this.sortColumn = column;
        this.renderTable();
    }

    render() {
        this.renderTable();
        this.renderPagination();
    }
}

// Export for use in other modules
window.TableManager = TableManager;
