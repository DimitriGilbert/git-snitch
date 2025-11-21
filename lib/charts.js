const config = require('./config');

/**
 * Chart generation using Chart.js
 * Provides interactive, responsive charts for git analytics
 */

const CHARTJS_CDN = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';

/**
 * Generate Chart.js script tag
 */
function getChartJsScript() {
    return `<script src="${CHARTJS_CDN}"></script>`;
}

/**
 * Generate commit activity over time chart
 */
function generateCommitActivityChart(commits, chartId = 'commitActivityChart') {
    if (!commits || commits.length === 0) return '';

    // Group commits by date
    const commitsByDate = {};
    commits.forEach(c => {
        const date = c.date.toISOString().split('T')[0];
        commitsByDate[date] = (commitsByDate[date] || 0) + 1;
    });

    const dates = Object.keys(commitsByDate).sort();
    const counts = dates.map(d => commitsByDate[d]);

    return `
    <div class="chart-container">
        <canvas id="${chartId}"></canvas>
    </div>
    <script>
        (function() {
            const ctx = document.getElementById('${chartId}');
            if (!ctx) return;
            new Chart(ctx.getContext('2d'), {
                type: 'line',
                data: {
                    labels: ${JSON.stringify(dates)},
                    datasets: [{
                        label: 'Commits per Day',
                        data: ${JSON.stringify(counts)},
                        borderColor: '#22c55e',
                        backgroundColor: 'rgba(34, 197, 94, 0.1)',
                        tension: 0.4,
                        fill: true,
                        pointRadius: 3,
                        pointHoverRadius: 5
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            labels: { color: '#e2e8f0', font: { size: 12 } }
                        },
                        title: {
                            display: true,
                            text: 'Commit Activity Over Time',
                            color: '#f1f5f9',
                            font: { size: 16, weight: 'bold' }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: { color: '#94a3b8' },
                            grid: { color: 'rgba(71, 85, 105, 0.3)' }
                        },
                        x: {
                            ticks: { color: '#94a3b8', maxRotation: 45 },
                            grid: { color: 'rgba(71, 85, 105, 0.3)' }
                        }
                    }
                }
            });
        })();
    </script>`;
}

/**
 * Generate contributor pie chart
 */
function generateContributorPieChart(users, chartId = 'contributorPieChart') {
    if (!users || users.length === 0) return '';

    const names = users.map(u => u.name);
    const commits = users.map(u => u.totalCommits);
    const colors = config.getChartColors();

    return `
    <div class="chart-container chart-container-square">
        <canvas id="${chartId}"></canvas>
    </div>
    <script>
        (function() {
            const ctx = document.getElementById('${chartId}');
            if (!ctx) return;
            new Chart(ctx.getContext('2d'), {
                type: 'doughnut',
                data: {
                    labels: ${JSON.stringify(names)},
                    datasets: [{
                        data: ${JSON.stringify(commits)},
                        backgroundColor: ${JSON.stringify(colors)},
                        borderColor: '#1e293b',
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            labels: { color: '#e2e8f0', font: { size: 11 } },
                            position: 'right'
                        },
                        title: {
                            display: true,
                            text: 'Commits by Contributor',
                            color: '#f1f5f9',
                            font: { size: 16, weight: 'bold' }
                        }
                    }
                }
            });
        })();
    </script>`;
}

/**
 * Generate language distribution bar chart
 */
function generateLanguageDistributionChart(locByLanguage, chartId = 'languageChart') {
    if (!locByLanguage || Object.keys(locByLanguage).length === 0) return '';

    const languages = Object.keys(locByLanguage);
    const lines = Object.values(locByLanguage);
    const colors = config.getChartColors();

    return `
    <div class="chart-container">
        <canvas id="${chartId}"></canvas>
    </div>
    <script>
        (function() {
            const ctx = document.getElementById('${chartId}');
            if (!ctx) return;
            new Chart(ctx.getContext('2d'), {
                type: 'bar',
                data: {
                    labels: ${JSON.stringify(languages)},
                    datasets: [{
                        label: 'Lines of Code',
                        data: ${JSON.stringify(lines)},
                        backgroundColor: ${JSON.stringify(colors.slice(0, languages.length))},
                        borderColor: '#1e293b',
                        borderWidth: 1
                    }]
                },
                options: {
                    indexAxis: 'y',
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        title: {
                            display: true,
                            text: 'Code Distribution by Language',
                            color: '#f1f5f9',
                            font: { size: 16, weight: 'bold' }
                        }
                    },
                    scales: {
                        x: {
                            ticks: { color: '#94a3b8' },
                            grid: { color: 'rgba(71, 85, 105, 0.3)' }
                        },
                        y: {
                            ticks: { color: '#94a3b8' },
                            grid: { display: false }
                        }
                    }
                }
            });
        })();
    </script>`;
}

/**
 * Generate activity heatmap (day of week × hour of day)
 */
function generateActivityHeatmap(commits, chartId = 'heatmapChart') {
    if (!commits || commits.length === 0) return '';

    // Create 7x24 grid (day of week x hour of day)
    const heatmapData = [];
    const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const hourLabels = Array.from({length: 24}, (_, i) => `${i}:00`);

    commits.forEach(c => {
        const day = c.date.getDay();
        const hour = c.date.getHours();
        heatmapData.push({ x: hour, y: day, v: 1 });
    });

    // Aggregate counts
    const aggregated = {};
    heatmapData.forEach(d => {
        const key = `${d.y}-${d.x}`;
        aggregated[key] = (aggregated[key] || 0) + 1;
    });

    const finalData = Object.entries(aggregated).map(([key, count]) => {
        const [y, x] = key.split('-').map(Number);
        return { x, y, v: count };
    });

    const maxValue = Math.max(...finalData.map(d => d.v), 1);

    return `
    <div class="chart-container chart-container-wide">
        <canvas id="${chartId}"></canvas>
    </div>
    <script>
        (function() {
            const ctx = document.getElementById('${chartId}');
            if (!ctx) return;

            const data = ${JSON.stringify(finalData)};
            const maxValue = ${maxValue};

            new Chart(ctx.getContext('2d'), {
                type: 'bubble',
                data: {
                    datasets: [{
                        label: 'Activity',
                        data: data.map(d => ({
                            x: d.x,
                            y: d.y,
                            r: Math.sqrt(d.v) * 3
                        })),
                        backgroundColor: data.map(d => {
                            const alpha = 0.3 + (d.v / maxValue) * 0.7;
                            return \`rgba(34, 197, 94, \${alpha})\`;
                        }),
                        borderColor: '#22c55e',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        title: {
                            display: true,
                            text: 'Activity Heatmap (Day × Hour)',
                            color: '#f1f5f9',
                            font: { size: 16, weight: 'bold' }
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const dataPoint = data[context.dataIndex];
                                    return ${JSON.stringify(dayLabels)}[dataPoint.y] + ' at ' +
                                           ${JSON.stringify(hourLabels)}[dataPoint.x] + ': ' +
                                           dataPoint.v + ' commits';
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            type: 'linear',
                            min: -1,
                            max: 24,
                            ticks: {
                                color: '#94a3b8',
                                callback: function(value) {
                                    return value >= 0 && value < 24 ? value + ':00' : '';
                                }
                            },
                            grid: { color: 'rgba(71, 85, 105, 0.3)' },
                            title: { display: true, text: 'Hour of Day', color: '#94a3b8' }
                        },
                        y: {
                            type: 'linear',
                            min: -0.5,
                            max: 6.5,
                            ticks: {
                                color: '#94a3b8',
                                callback: function(value) {
                                    return ${JSON.stringify(dayLabels)}[Math.round(value)] || '';
                                }
                            },
                            grid: { color: 'rgba(71, 85, 105, 0.3)' },
                            title: { display: true, text: 'Day of Week', color: '#94a3b8' }
                        }
                    }
                }
            });
        })();
    </script>`;
}

/**
 * Generate commit type breakdown pie chart
 */
function generateCommitTypeChart(commitTypeBreakdown, chartId = 'commitTypeChart') {
    if (!commitTypeBreakdown || Object.keys(commitTypeBreakdown).length === 0) return '';

    const types = Object.keys(commitTypeBreakdown);
    const counts = Object.values(commitTypeBreakdown);
    const colors = config.getChartColors();

    return `
    <div class="chart-container chart-container-square">
        <canvas id="${chartId}"></canvas>
    </div>
    <script>
        (function() {
            const ctx = document.getElementById('${chartId}');
            if (!ctx) return;
            new Chart(ctx.getContext('2d'), {
                type: 'pie',
                data: {
                    labels: ${JSON.stringify(types.map(t => t.charAt(0).toUpperCase() + t.slice(1)))},
                    datasets: [{
                        data: ${JSON.stringify(counts)},
                        backgroundColor: ${JSON.stringify(colors)},
                        borderColor: '#1e293b',
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            labels: { color: '#e2e8f0', font: { size: 11 } },
                            position: 'right'
                        },
                        title: {
                            display: true,
                            text: 'Commit Type Distribution',
                            color: '#f1f5f9',
                            font: { size: 16, weight: 'bold' }
                        }
                    }
                }
            });
        })();
    </script>`;
}

/**
 * Generate additions vs deletions over time
 */
function generateAdditionsVsDeletionsChart(commits, chartId = 'addDelChart') {
    if (!commits || commits.length === 0) return '';

    // Group by date
    const byDate = {};
    commits.forEach(c => {
        const date = c.date.toISOString().split('T')[0];
        if (!byDate[date]) {
            byDate[date] = { additions: 0, deletions: 0 };
        }
        byDate[date].additions += c.additions || 0;
        byDate[date].deletions += c.deletions || 0;
    });

    const dates = Object.keys(byDate).sort();
    const additions = dates.map(d => byDate[d].additions);
    const deletions = dates.map(d => byDate[d].deletions);

    return `
    <div class="chart-container">
        <canvas id="${chartId}"></canvas>
    </div>
    <script>
        (function() {
            const ctx = document.getElementById('${chartId}');
            if (!ctx) return;
            new Chart(ctx.getContext('2d'), {
                type: 'bar',
                data: {
                    labels: ${JSON.stringify(dates)},
                    datasets: [{
                        label: 'Additions',
                        data: ${JSON.stringify(additions)},
                        backgroundColor: 'rgba(34, 197, 94, 0.7)',
                        borderColor: '#22c55e',
                        borderWidth: 1
                    }, {
                        label: 'Deletions',
                        data: ${JSON.stringify(deletions)},
                        backgroundColor: 'rgba(220, 38, 38, 0.7)',
                        borderColor: '#dc2626',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            labels: { color: '#e2e8f0' }
                        },
                        title: {
                            display: true,
                            text: 'Code Changes Over Time',
                            color: '#f1f5f9',
                            font: { size: 16, weight: 'bold' }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: { color: '#94a3b8' },
                            grid: { color: 'rgba(71, 85, 105, 0.3)' }
                        },
                        x: {
                            ticks: { color: '#94a3b8', maxRotation: 45 },
                            grid: { color: 'rgba(71, 85, 105, 0.3)' }
                        }
                    }
                }
            });
        })();
    </script>`;
}

module.exports = {
    getChartJsScript,
    generateCommitActivityChart,
    generateContributorPieChart,
    generateLanguageDistributionChart,
    generateActivityHeatmap,
    generateCommitTypeChart,
    generateAdditionsVsDeletionsChart
};
