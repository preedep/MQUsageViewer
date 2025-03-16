let tableData = [];
let currentPage = 1;
const rowsPerPage = 100;
let sortColumn = '';
let sortAsc = true;
let chartInstance = null;

// Set Default End Date
document.addEventListener('DOMContentLoaded', () => {
    const today = new Date();
    document.getElementById('end-date').value = today.toISOString().split('T')[0];
    loadMqFunctions();
});

// Token Validation
const token = localStorage.getItem('access_token');
function isTokenExpired(token) {
    if (!token) return true;
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.exp < Math.floor(Date.now() / 1000);
    } catch (e) { return true; }
}
if (!token || isTokenExpired(token)) {
    localStorage.removeItem('access_token');
    window.location.href = "/login.html";
}
document.getElementById('logout-btn').onclick = () => {
    localStorage.removeItem('access_token');
    window.location.href = "/login.html";
};

async function loadMqFunctions() {
    const sel = document.getElementById('mq-function');
    try {
        const res = await fetch('/api/v1/mq/functions', {
            headers: { Authorization: `Bearer ${token}` },
        });
        const result = await res.json();
        if (res.ok && result.success && result.data) {
            sel.innerHTML = '<option value="">-- Select MQ Function --</option>';
            result.data.forEach(f => {
                const opt = document.createElement('option');
                opt.value = f;
                opt.textContent = f;
                sel.appendChild(opt);
            });
        }
    } catch (err) {
        console.error("Load MQ function error:", err);
    }
}

async function loadSystemNames(funcName) {
    const sel = document.getElementById('system-name');
    if (!funcName) {
        sel.innerHTML = '<option value="">-- Select MQ Function First --</option>';
        return;
    }
    try {
        const res = await fetch(`/api/v1/mq/${funcName}/systems`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        const result = await res.json();
        if (res.ok && result.success && result.data) {
            sel.innerHTML = '<option value="">-- Select System Name --</option>';
            result.data.forEach(s => {
                const opt = document.createElement('option');
                opt.value = s;
                opt.textContent = s;
                sel.appendChild(opt);
            });
        }
    } catch (err) {
        console.error("Load systems error:", err);
    }
}
document.getElementById('mq-function').addEventListener('change', e => {
    loadSystemNames(e.target.value);
});

function buildIso(dateStr, isStart) {
    if (!dateStr) return null;
    return `${dateStr}T${isStart ? '00:00:00' : '23:59:59'}+07:00`;
}

async function performSearch() {
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;
    const func = document.getElementById('mq-function').value;
    const sys = document.getElementById('system-name').value;
    const payload = {
        from_datetime: buildIso(startDate, true),
        to_datetime: buildIso(endDate, false),
        mq_function_name: func,
    };
    if (sys) payload.system_name = sys;

    try {
        const res = await fetch('/api/v1/mq/search', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(payload)
        });
        const result = await res.json();
        if (res.ok && result.success && result.data) {
            tableData = result.data;
            currentPage = 1;
            renderTable();
            renderPagination();
            setActiveTab('search'); // เปิดแท็บ Search Result หลังค้นหา
            return true;
        } else {
            document.getElementById('search-result').innerHTML = `<p>Search failed: ${result.message || "Unknown error"}</p>`;
            return false;
        }
    } catch (err) {
        document.getElementById('search-result').innerHTML = `<p>Search error: ${err.message}</p>`;
        return false;
    }
}
document.getElementById('search-btn').addEventListener('click', performSearch);

function renderTable() {
    let data = [...tableData];
    if (sortColumn) {
        data.sort((a, b) => sortAsc ? (a[sortColumn] > b[sortColumn]) - (a[sortColumn] < b[sortColumn])
            : (b[sortColumn] > a[sortColumn]) - (b[sortColumn] < a[sortColumn]));
    }
    const start = (currentPage - 1) * rowsPerPage;
    const rows = data.slice(start, start + rowsPerPage);
    if (!rows.length) return document.getElementById('search-result').innerHTML = "<p>No data</p>";
    let html = `<table><thead><tr>`;
    Object.keys(rows[0]).forEach(c => html += `<th onclick="sortByColumn('${c}')">${c}</th>`);
    html += `</tr></thead><tbody>`;
    rows.forEach(r => {
        html += `<tr>${Object.values(r).map(v => `<td>${v}</td>`).join('')}</tr>`;
    });
    html += `</tbody></table>`;
    document.getElementById('search-result').innerHTML = html;
}

function renderPagination() {
    const pages = Math.ceil(tableData.length / rowsPerPage);
    let html = "";
    for (let i = 1; i <= pages; i++) {
        html += `<button onclick="goToPage(${i})"${i === currentPage ? ' disabled' : ''}>${i}</button>`;
    }
    document.getElementById('pagination').innerHTML = html;
}

function goToPage(p) {
    currentPage = p;
    renderTable();
    renderPagination();
}

function sortByColumn(c) {
    sortAsc = sortColumn === c ? !sortAsc : true;
    sortColumn = c;
    renderTable();
}

window.goToPage = goToPage;
window.sortByColumn = sortByColumn;

function getGroupKey(start, end, dtStr) {
    const startDt = new Date(start), endDt = new Date(end), range = (endDt - startDt) / (1000 * 60 * 60 * 24);
    const dt = new Date(dtStr);
    if (range <= 7) return dt.toISOString().split('T')[0];
    else if (range <= 60) {
        const week = Math.ceil((((dt - new Date(dt.getFullYear(), 0, 1)) / 86400000) + new Date(dt.getFullYear(), 0, 1).getDay() + 1) / 7);
        return `${dt.getFullYear()}-W${week}`;
    } else return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
}

document.getElementById('graph-btn').addEventListener('click', async () => {
    if (!tableData.length) {
        const ok = await performSearch();
        if (!ok) return;
    }
    setActiveTab('graph'); // เปิดแท็บ Graph ทันที

    const start = document.getElementById('start-date').value;
    const end = document.getElementById('end-date').value;
    const group = {};
    tableData.forEach(row => {
        const key = getGroupKey(start, end, row.date_time);
        group[key] = (group[key] || 0) + row.trans_per_sec;
    });
    const labels = Object.keys(group).sort();
    const values = labels.map(l => group[l]);

    const ctx = document.getElementById('chart').getContext('2d');
    if (chartInstance) chartInstance.destroy();
    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: 'Total Trans/sec',
                data: values,
                borderWidth: 2,
                borderColor: 'rgba(75,192,192,1)',
                fill: false,
                tension: 0.3
            }]
        },
        options: {
            responsive: true,
            scales: {
                x: { title: { display: true, text: 'Date Group' } },
                y: { title: { display: true, text: 'Total Trans/sec' }, beginAtZero: true }
            }
        }
    });
});

// Tab Control Buttons
document.getElementById('tab-search').addEventListener('click', () => {
    setActiveTab('search');
});
document.getElementById('tab-graph').addEventListener('click', async () => {
    setActiveTab('graph');
    if (!tableData.length) await performSearch();
    document.getElementById('graph-btn').click();
});

// ⭐ Function to set active tab
function setActiveTab(tabName) {
    const tabSearchBtn = document.getElementById('tab-search');
    const tabGraphBtn = document.getElementById('tab-graph');
    const tabSearchContent = document.getElementById('tab-search-content');
    const tabGraphContent = document.getElementById('tab-graph-content');

    if (tabName === 'search') {
        tabSearchBtn.classList.add('active');
        tabGraphBtn.classList.remove('active');
        tabSearchContent.classList.add('active');
        tabGraphContent.classList.remove('active');
    } else if (tabName === 'graph') {
        tabGraphBtn.classList.add('active');
        tabSearchBtn.classList.remove('active');
        tabGraphContent.classList.add('active');
        tabSearchContent.classList.remove('active');
    }
}