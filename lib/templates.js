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
});`;

/**
 * Generate HTML document structure
 */
function generateHTMLDocument(title, content, customStyles = '') {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        ${commonStyles}
        ${customStyles}
    </style>
</head>
<body>
    ${content}
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