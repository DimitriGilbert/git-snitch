const os = require('os');
const { execSync } = require('child_process');

/**
 * Common CSS styles used across all reports
 */
const commonStyles = `
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    line-height: 1.6;
    color: #e2e8f0;
    background: linear-gradient(135deg, #1e293b 0%, #0f172a 50%, #1e293b 100%);
    min-height: 100vh;
}

.container {
    max-width: 1400px;
    margin: 0 auto;
    padding: 20px;
    background: #1e293b;
    margin-top: 20px;
    margin-bottom: 20px;
    border-radius: 12px;
    box-shadow: 0 20px 40px rgba(0,0,0,0.3);
    border: 1px solid #334155;
}

.header {
    text-align: center;
    margin-bottom: 40px;
    padding: 30px 0;
    background: linear-gradient(135deg, #1e40af 0%, #0f172a 50%, #dc2626 100%);
    color: white;
    border-radius: 12px;
    margin: -20px -20px 40px -20px;
}

.header h1 {
    font-size: 2.5em;
    margin-bottom: 10px;
    font-weight: 700;
}

.header p {
    opacity: 0.9;
    font-size: 1.1em;
}

.stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 20px;
    margin-bottom: 40px;
}

.stat-card {
    background: #334155;
    padding: 25px;
    border-radius: 12px;
    text-align: center;
    border: 2px solid #475569;
    transition: transform 0.2s, box-shadow 0.2s;
}

.stat-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(34, 197, 94, 0.2);
    border-color: #22c55e;
}

.stat-number {
    font-size: 2.5em;
    font-weight: bold;
    color: #22c55e;
    display: block;
}

.stat-label {
    color: #94a3b8;
    font-size: 0.9em;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-top: 8px;
}

.section {
    margin-bottom: 40px;
}

.section h2 {
    font-size: 1.8em;
    margin-bottom: 20px;
    color: #f1f5f9;
    border-bottom: 3px solid #22c55e;
    padding-bottom: 10px;
    display: inline-block;
}

.tabs {
    display: flex;
    border-bottom: 2px solid #475569;
    margin-bottom: 20px;
    gap: 5px;
    flex-wrap: wrap;
}

.tab {
    padding: 12px 24px;
    background: #475569;
    color: #94a3b8;
    border: none;
    border-radius: 8px 8px 0 0;
    cursor: pointer;
    font-size: 1rem;
    font-weight: 500;
    transition: all 0.3s ease;
    border-bottom: 3px solid transparent;
    white-space: nowrap;
}

.tab:hover {
    background: #64748b;
    color: #f1f5f9;
}

.tab.active {
    background: #1e40af;
    color: white;
    border-bottom-color: #22c55e;
}

.tab-content {
    display: none;
    animation: slideIn 0.3s ease-in-out;
}

.tab-content.active {
    display: block;
}

@keyframes slideIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
}

.user-card, .project-card {
    background: #334155;
    border: 1px solid #475569;
    border-radius: 12px;
    padding: 25px;
    margin-bottom: 20px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
}

.user-header {
    display: flex;
    align-items: center;
    margin-bottom: 20px;
}

.user-avatar {
    width: 50px;
    height: 50px;
    border-radius: 50%;
    background: linear-gradient(135deg, #22c55e, #dc2626);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: bold;
    font-size: 1.2em;
    margin-right: 15px;
}

.user-info h3 {
    font-size: 1.3em;
    margin-bottom: 5px;
    color: #f1f5f9;
}

.user-email a {
    color: #94a3b8;
    text-decoration: none;
}

.user-stats, .project-stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 15px;
    margin-bottom: 20px;
}

.user-stat, .project-stat {
    text-align: center;
    padding: 15px;
    background: #475569;
    border-radius: 8px;
}

.user-stat-number, .project-stat-number {
    font-size: 1.5em;
    font-weight: bold;
    color: #22c55e;
}

.user-stat-label, .project-stat-label {
    font-size: 0.8em;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.commits-list {
    background: #475569;
    border-radius: 8px;
    padding: 20px;
    max-height: 400px;
    overflow-y: auto;
}

.commit-item {
    display: flex;
    align-items: center;
    padding: 12px 0;
    border-bottom: 1px solid #64748b;
}

.commit-item:last-child {
    border-bottom: none;
}

.commit-hash {
    font-family: 'Monaco', 'Menlo', monospace;
    background: #1e40af;
    color: white;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 0.8em;
    margin-right: 12px;
    text-decoration: none;
}

.commit-branch {
    font-family: 'Monaco', 'Menlo', monospace;
    background: #f97316;
    color: white;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 0.8em;
    margin-right: 12px;
    text-decoration: none;
    white-space: nowrap;
}

.commit-message {
    flex: 1;
    font-size: 0.9em;
    color: #e2e8f0;
}

.commit-stats {
    display: flex;
    gap: 8px;
    margin-left: 12px;
}

.commit-stat {
    font-size: 0.8em;
    padding: 2px 6px;
    border-radius: 4px;
}

.additions {
    background: #22c55e;
    color: white;
}

.deletions {
    background: #dc2626;
    color: white;
}

table {
    width: 100%;
    border-collapse: collapse;
}

th, td {
    padding: 12px 15px;
    text-align: left;
    border-bottom: 1px solid #475569;
}

th {
    background-color: #334155;
    color: #f1f5f9;
}

tr:hover {
    background-color: #475569;
}

/* Chart Containers */
.chart-container {
    background: #334155;
    border-radius: 12px;
    padding: 20px;
    margin: 20px 0;
    height: 400px;
}

.chart-container-square {
    height: 450px;
}

.chart-container-wide {
    height: 500px;
}

.charts-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
    gap: 20px;
    margin: 20px 0;
}

/* Metrics Cards */
.metrics-card {
    background: #334155;
    border-radius: 12px;
    padding: 20px;
    margin: 20px 0;
    border: 1px solid #475569;
}

.metrics-card h3 {
    color: #f1f5f9;
    margin-bottom: 15px;
    font-size: 1.3em;
}

.metric-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 0;
    border-bottom: 1px solid #475569;
}

.metric-item:last-child {
    border-bottom: none;
}

.metric-label {
    color: #94a3b8;
    font-size: 0.95em;
}

.metric-value {
    color: #22c55e;
    font-weight: bold;
    font-size: 1.1em;
}

.metric-value.warning {
    color: #f59e0b;
}

.metric-value.danger {
    color: #dc2626;
}

/* Health Score */
.health-score {
    text-align: center;
    padding: 30px;
    background: linear-gradient(135deg, #334155 0%, #1e293b 100%);
    border-radius: 12px;
    margin: 20px 0;
}

.health-score-circle {
    width: 150px;
    height: 150px;
    border-radius: 50%;
    margin: 0 auto 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 3em;
    font-weight: bold;
    border: 8px solid;
}

.health-score-label {
    font-size: 1.5em;
    margin-top: 10px;
    font-weight: bold;
}

/* Recommendations */
.recommendations {
    margin-top: 20px;
}

.recommendation-item {
    background: #475569;
    border-left: 4px solid #22c55e;
    padding: 15px;
    margin: 10px 0;
    border-radius: 4px;
}

.recommendation-item.warning {
    border-left-color: #f59e0b;
}

.recommendation-item.danger {
    border-left-color: #dc2626;
}

.recommendation-category {
    font-weight: bold;
    color: #f1f5f9;
    margin-bottom: 5px;
}

.recommendation-message {
    color: #cbd5e1;
    margin-bottom: 5px;
}

.recommendation-action {
    color: #94a3b8;
    font-style: italic;
    font-size: 0.9em;
}

/* Hotspots */
.hotspot-item {
    background: #475569;
    padding: 15px;
    margin: 10px 0;
    border-radius: 8px;
    border-left: 4px solid;
}

.hotspot-item.high-risk {
    border-left-color: #dc2626;
}

.hotspot-item.medium-risk {
    border-left-color: #f97316;
}

.hotspot-item.low-risk {
    border-left-color: #22c55e;
}

.hotspot-filename {
    font-family: monospace;
    color: #f1f5f9;
    font-weight: bold;
    margin-bottom: 5px;
}

.hotspot-stats {
    display: flex;
    gap: 15px;
    margin-top: 10px;
    font-size: 0.9em;
}

.hotspot-stat {
    color: #94a3b8;
}

.hotspot-stat strong {
    color: #f1f5f9;
}

/* Simple DataTables Dark Theme */
.dataTable-wrapper .dataTable-container {
    background: #334155;
    color: #e2e8f0;
}

.dataTable-wrapper .dataTable-table {
    border-collapse: collapse;
}

.dataTable-wrapper .dataTable-table th,
.dataTable-wrapper .dataTable-table td {
    padding: 12px 15px;
    border-bottom: 1px solid #475569;
}

.dataTable-wrapper .dataTable-table th {
    background-color: #1e293b;
    color: #f1f5f9;
    font-weight: 600;
    text-transform: uppercase;
    font-size: 0.85em;
    letter-spacing: 0.5px;
}

.dataTable-wrapper .dataTable-table tbody tr:hover {
    background-color: #475569;
}

.dataTable-wrapper .dataTable-table tbody tr.selected {
    background-color: #1e40af;
}

.dataTable-input {
    background: #475569;
    color: #e2e8f0;
    border: 1px solid #64748b;
    border-radius: 6px;
    padding: 8px 12px;
}

.dataTable-input:focus {
    outline: none;
    border-color: #22c55e;
    box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.1);
}

.dataTable-wrapper .dataTable-top,
.dataTable-wrapper .dataTable-bottom {
    background: transparent;
    color: #94a3b8;
    padding: 15px 0;
}

.dataTable-selector {
    background: #475569;
    color: #e2e8f0;
    border: 1px solid #64748b;
    border-radius: 6px;
    padding: 6px 10px;
}

.dataTable-selector:focus {
    outline: none;
    border-color: #22c55e;
}

.dataTable-pagination ul {
    padding: 0;
    margin: 0;
}

.dataTable-pagination li {
    list-style: none;
}

.dataTable-pagination a {
    background: #475569;
    color: #e2e8f0;
    border: 1px solid #64748b;
    border-radius: 6px;
    padding: 6px 12px;
    text-decoration: none;
    transition: all 0.2s;
}

.dataTable-pagination a:hover {
    background: #64748b;
    border-color: #22c55e;
}

.dataTable-pagination .active a {
    background: #22c55e;
    color: white;
    border-color: #22c55e;
}

.dataTable-info {
    color: #94a3b8;
    font-size: 0.9em;
}

.dataTable-empty {
    color: #94a3b8;
    text-align: center;
    padding: 30px;
    font-style: italic;
}

/* Light Theme */
body.light-theme {
    color: #1e293b;
    background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 50%, #f1f5f9 100%);
}

body.light-theme .container {
    background: #ffffff;
    border-color: #e2e8f0;
}

body.light-theme .header {
    background: linear-gradient(135deg, #3b82f6 0%, #1e40af 50%, #dc2626 100%);
}

body.light-theme .stat-card,
body.light-theme .user-card,
body.light-theme .project-card,
body.light-theme .metrics-card,
body.light-theme .chart-container {
    background: #f8fafc;
    border-color: #e2e8f0;
    color: #1e293b;
}

body.light-theme .stat-label,
body.light-theme .metric-label {
    color: #64748b;
}

body.light-theme .tab {
    background: #e2e8f0;
    color: #64748b;
}

body.light-theme .tab:hover {
    background: #cbd5e1;
    color: #1e293b;
}

body.light-theme .tab.active {
    background: #3b82f6;
    color: white;
}

body.light-theme th {
    background-color: #f1f5f9;
    color: #1e293b;
}

body.light-theme td {
    border-color: #e2e8f0;
}

body.light-theme tr:hover {
    background-color: #f1f5f9;
}

body.light-theme .commits-list,
body.light-theme .dataTable-wrapper .dataTable-container {
    background: #f8fafc;
    color: #1e293b;
}

body.light-theme .dataTable-input,
body.light-theme .dataTable-selector {
    background: #ffffff;
    color: #1e293b;
    border-color: #cbd5e1;
}

body.light-theme .dataTable-pagination a {
    background: #ffffff;
    color: #1e293b;
    border-color: #cbd5e1;
}

body.light-theme .commit-message,
body.light-theme .section h2 {
    color: #1e293b;
}

/* Theme Toggle Button */
.theme-toggle {
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 1000;
    background: #334155;
    border: 2px solid #475569;
    border-radius: 50px;
    padding: 10px 20px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
    transition: all 0.3s;
    color: #e2e8f0;
}

body.light-theme .theme-toggle {
    background: #ffffff;
    border-color: #cbd5e1;
    color: #1e293b;
}

.theme-toggle:hover {
    transform: scale(1.05);
}

/* Export Buttons */
.export-buttons {
    position: fixed;
    top: 20px;
    right: 140px;
    z-index: 1000;
    display: flex;
    gap: 10px;
}

.export-btn {
    background: #22c55e;
    border: none;
    border-radius: 8px;
    padding: 10px 16px;
    cursor: pointer;
    color: white;
    font-weight: 500;
    transition: all 0.3s;
}

.export-btn:hover {
    background: #16a34a;
    transform: scale(1.05);
}

/* Trend Indicators */
.trend-indicator {
    font-size: 0.75em;
    margin-left: 8px;
    padding: 2px 6px;
    border-radius: 4px;
}

.trend-up {
    color: #22c55e;
    background: rgba(34, 197, 94, 0.1);
}

.trend-down {
    color: #dc2626;
    background: rgba(220, 38, 38, 0.1);
}

.trend-neutral {
    color: #94a3b8;
    background: rgba(148, 163, 184, 0.1);
}

/* Streak Card */
.streak-card {
    background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
    color: white;
    padding: 20px;
    border-radius: 12px;
    text-align: center;
    margin: 20px 0;
}

.streak-number {
    font-size: 3em;
    font-weight: bold;
}

.streak-label {
    font-size: 1.1em;
    opacity: 0.9;
}

/* Velocity Card */
.velocity-card {
    background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
    color: white;
    padding: 20px;
    border-radius: 12px;
    text-align: center;
}

/* Ownership Matrix */
.ownership-matrix {
    overflow-x: auto;
}

.ownership-grid {
    display: grid;
    gap: 2px;
    margin: 20px 0;
}

.ownership-cell {
    padding: 8px;
    text-align: center;
    border-radius: 4px;
    font-size: 0.8em;
}`;


/**
 * Common JavaScript for tab functionality
 */
const commonScript = `
document.addEventListener('DOMContentLoaded', () => {
    const mainTabs = document.querySelector('.main-tabs');
    if (mainTabs) {
        mainTabs.addEventListener('click', e => {
            if (!e.target.matches('.tab')) return;
            
            mainTabs.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            e.target.classList.add('active');

            const targetId = e.target.dataset.tabTarget;
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            document.getElementById(targetId).classList.add('active');

            const projectTab = document.getElementById(targetId);
            if (projectTab && !projectTab.id.startsWith('overview')) {
                const firstSubTab = projectTab.querySelector('.sub-tab');
                if(firstSubTab) firstSubTab.click();
            }
        });
    }

    document.querySelectorAll('.sub-tabs').forEach(subTabs => {
        subTabs.addEventListener('click', e => {
            if (!e.target.matches('.sub-tab')) return;
            subTabs.querySelectorAll('.sub-tab').forEach(t => t.classList.remove('active'));
            e.target.classList.add('active');

            const subTargetId = e.target.dataset.subTabTarget;
            subTabs.parentElement.querySelectorAll('.sub-tab-content').forEach(c => c.classList.remove('active'));
            document.getElementById(subTargetId).classList.add('active');
        });
    });

    const firstTab = document.querySelector('.main-tabs .tab');
    if (firstTab) firstTab.click();

    // Initialize DataTables
    if (typeof simpleDatatables !== 'undefined') {
        // Initialize all tables with class 'data-table'
        document.querySelectorAll('.data-table').forEach(table => {
            new simpleDatatables.DataTable(table, {
                perPage: 50,
                perPageSelect: [25, 50, 100, 200],
                searchable: true,
                sortable: true,
                labels: {
                    placeholder: "Search...",
                    perPage: "{select} per page",
                    noRows: "No entries found",
                    info: "Showing {start} to {end} of {rows} entries"
                }
            });
        });
    }

    // Theme Toggle
    window.toggleTheme = function() {
        document.body.classList.toggle('light-theme');
        const isLight = document.body.classList.contains('light-theme');
        localStorage.setItem('git-snitch-theme', isLight ? 'light' : 'dark');
        const btn = document.querySelector('.theme-toggle');
        if (btn) btn.innerHTML = isLight ? '🌙 Dark' : '☀️ Light';
    };

    // Restore saved theme
    const savedTheme = localStorage.getItem('git-snitch-theme');
    if (savedTheme === 'light') {
        document.body.classList.add('light-theme');
        const btn = document.querySelector('.theme-toggle');
        if (btn) btn.innerHTML = '🌙 Dark';
    }

    // CSV Export Function
    window.exportToCSV = function(tableId, filename) {
        const table = document.querySelector('#' + tableId) || document.querySelector('.data-table');
        if (!table) { alert('No table found to export'); return; }

        let csv = [];
        const rows = table.querySelectorAll('tr');
        rows.forEach(row => {
            const cols = row.querySelectorAll('td, th');
            const rowData = [];
            cols.forEach(col => {
                let text = col.innerText.replace(/"/g, '""');
                rowData.push('"' + text + '"');
            });
            csv.push(rowData.join(','));
        });

        const csvContent = csv.join('\\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename || 'git-snitch-export.csv';
        link.click();
    };

    // JSON Export Function
    window.exportToJSON = function(data, filename) {
        const jsonContent = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonContent], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename || 'git-snitch-export.json';
        link.click();
    };
});`;

/**
 * Generate HTML document structure
 */
function generateHTMLDocument(title, content, customStyles = '', additionalScripts = '') {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <link href="https://cdn.jsdelivr.net/npm/simple-datatables@latest/dist/style.css" rel="stylesheet" type="text/css">
    <style>
        ${commonStyles}
        ${customStyles}
    </style>
</head>
<body>
    ${additionalScripts}
    ${content}
    <script src="https://cdn.jsdelivr.net/npm/simple-datatables@latest" type="text/javascript"></script>
    <script>
        ${commonScript}
    </script>
</body>
</html>`;
}

/**
 * Generate header section
 */
function generateHeader(title, subtitle) {
    return `
    <div class="header">
        <h1>${title}</h1>
        <p>${subtitle}</p>
    </div>`;
}

/**
 * Generate stats grid
 */
function generateStatsGrid(stats) {
    return `
    <div class="stats-grid">
        ${stats.map(stat => `
            <div class="stat-card">
                <span class="stat-number ${stat.class || ''}">${stat.value}</span>
                <div class="stat-label">${stat.label}</div>
            </div>
        `).join('')}
    </div>`;
}

/**
 * Open file in browser
 */
function openInBrowser(filePath) {
    const platform = os.platform();
    let command;
    switch (platform) {
        case "darwin": command = `open "${filePath}"`; break;
        case "win32": command = `start "" "${filePath}"`; break;
        default: command = `xdg-open "${filePath}"`;
    }
    try {
        execSync(command);
        return true;
    } catch (error) {
        return false;
    }
}

module.exports = {
    commonStyles,
    commonScript,
    generateHTMLDocument,
    generateHeader,
    generateStatsGrid,
    openInBrowser
};