
    let tableData = [];
    let currentPage = 1;
    const rowsPerPage = 100;
    let sortColumn = '';
    let sortAsc = true;
    let chartInstance = null;
    const token = localStorage.getItem('access_token');

    document.addEventListener('DOMContentLoaded', () => {
    const today = new Date();
    document.getElementById('end-date').value = today.toISOString().split('T')[0];
    checkTokenAndRedirect();
    loadMqFunctions();
});

    // Token Handling
    function isTokenExpired(token) {
    if (!token) return true;
    try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp < Math.floor(Date.now() / 1000);
} catch (_) {
    return true;
}
}
    function checkTokenAndRedirect() {
    if (!token || isTokenExpired(token)) {
    localStorage.removeItem('access_token');
    window.location.href = "/login.html";
}
}
    document.getElementById('logout-btn').onclick = () => {
    localStorage.removeItem('access_token');
    window.location.href = "/login.html";
};

    // Load MQ Function List
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

    // Load System Name List
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

    // Build ISO String
    function buildIso(dateStr, isStart) {
    if (!dateStr) return null;
    return `${dateStr}T${isStart ? '00:00:00' : '23:59:59'}+07:00`;
}

    // Perform Search
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
    setActiveTab('search');
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

    // Render Table
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

    // Grouping Helper
    function getSmartGroupKey(startDateStr, endDateStr, dtStr, selectedGrouping = 'monthly') {
    const start = new Date(startDateStr);
    const end = new Date(endDateStr);
    const rangeInDays = (end - start) / (1000 * 60 * 60 * 24);
    const dt = new Date(dtStr);
    let label = '';

    if (selectedGrouping === 'auto') {
    if (rangeInDays <= 2) selectedGrouping = '15min';
    else if (rangeInDays <= 60) selectedGrouping = 'daily';
    else if (rangeInDays <= 180) selectedGrouping = 'weekly';
    else selectedGrouping = 'monthly';
}

    if (selectedGrouping === '15min') {
    const year = dt.getFullYear();
    const month = String(dt.getMonth() + 1).padStart(2, '0');
    const day = String(dt.getDate()).padStart(2, '0');
    const hour = String(dt.getHours()).padStart(2, '0');
    const minuteGroup = Math.floor(dt.getMinutes() / 15) * 15;
    const minute = String(minuteGroup).padStart(2, '0');
    label = '15-Min Interval';
    return { key: `${year}-${month}-${day} ${hour}:${minute}`, label };
}

    if (selectedGrouping === 'daily') {
    label = 'Daily';
    return { key: dt.toISOString().split('T')[0], label };
}

    if (selectedGrouping === 'weekly') {
    const year = dt.getFullYear();
    const week = Math.ceil((((dt - new Date(year, 0, 1)) / 86400000) + new Date(year, 0, 1).getDay() + 1) / 7);
    label = 'Weekly';
    return { key: `${year}-W${week}`, label };
}

    if (selectedGrouping === 'monthly') {
    const year = dt.getFullYear();
    const month = String(dt.getMonth() + 1).padStart(2, '0');
    label = 'Monthly';
    return { key: `${year}-${month}`, label };
}

    return { key: dt.toISOString(), label: 'Time' };
}

    // Graph Handling (from tps summary)
    async function loadSummaryDataForGraph() {
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
    const res = await fetch('/api/v1/mq/tps/summary', {
    method: 'POST',
    headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
},
    body: JSON.stringify(payload)
});
    const result = await res.json();
    return (res.ok && result.success && result.data) ? result.data : [];
} catch (err) {
    console.error("TPS summary fetch error:", err);
    return [];
}
}

    // Render Graph
    document.getElementById('graph-btn').addEventListener('click', async () => {
    setActiveTab('graph');
    const summaryData = await loadSummaryDataForGraph();
    if (!summaryData.length) return;

    const start = document.getElementById('start-date').value;
    const end = document.getElementById('end-date').value;
    const selectedGrouping = document.getElementById('grouping')?.value || 'monthly';

    const group = {};
    let xAxisLabel = 'Month';
    let maxValue = 0;

    summaryData.forEach(row => {
    const { key, label } = getSmartGroupKey(start, end, row.date_time, selectedGrouping);
    xAxisLabel = label;
    if (!group[key]) group[key] = { sum: 0 };
    group[key].sum += row.trans_per_sec;
    if (group[key].sum > maxValue) maxValue = group[key].sum;
});

    const labels = Object.keys(group).sort();
    const values = labels.map(label => group[label].sum);

    const ctx = document.getElementById('chart').getContext('2d');
    if (chartInstance) chartInstance.destroy();
    chartInstance = new Chart(ctx, {
    type: 'line',
    data: {
    labels,
    datasets: [{
    label: `TPS Summary`,
    data: values,
    borderColor: 'rgba(0,123,255,1)',
    backgroundColor: 'rgba(0,123,255,0.2)',
    borderWidth: 2,
    tension: 0.1,
    pointRadius: 3
}]
},
    options: {
    responsive: true,
    plugins: {
    legend: { display: true },
    title: {
    display: true,
    text: `TPS Summary (${document.getElementById('mq-function').value})`,
    font: { size: 20 }
}
},
    scales: {
    x: {
    title: { display: true, text: xAxisLabel, font: { size: 16 } },
    ticks: { autoSkip: true, maxTicksLimit: 20 }
},
    y: {
    beginAtZero: true,
    suggestedMax: maxValue * 1.1,
    title: { display: true, text: 'Transactions per Second (TPS)', font: { size: 16 } }
}
}
}
});
});

    // Tabs
    document.getElementById('tab-search').addEventListener('click', () => setActiveTab('search'));
    document.getElementById('tab-graph').addEventListener('click', async () => {
    setActiveTab('graph');
    document.getElementById('graph-btn').click();
});

    function setActiveTab(tabName) {
    document.getElementById('tab-search').classList.toggle('active', tabName === 'search');
    document.getElementById('tab-graph').classList.toggle('active', tabName === 'graph');
    document.getElementById('tab-search-content').classList.toggle('active', tabName === 'search');
    document.getElementById('tab-graph-content').classList.toggle('active', tabName === 'graph');
}
