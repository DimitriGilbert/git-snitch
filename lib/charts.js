const config = require('./config');

/**
 * Chart generation using Chart.js
 * Provides interactive, responsive charts for git analytics
 */

const CHARTJS_CDN = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';

/**
 * Generate Chart.js script tag with initialization helper
 */
function getChartJsScript() {
    return `<script src="${CHARTJS_CDN}"></script>
    <script>
        // Queue for chart initializations
        window.chartInitQueue = window.chartInitQueue || [];
        window.chartsReady = false;

        // Wait for Chart.js to load
        function waitForCharts(callback) {
            if (typeof Chart !== 'undefined') {
                callback();
            } else {
                window.chartInitQueue.push(callback);
            }
        }

        // Process queue when Chart.js is loaded
        window.addEventListener('load', function() {
            if (typeof Chart !== 'undefined') {
                window.chartsReady = true;
                while (window.chartInitQueue.length > 0) {
                    const init = window.chartInitQueue.shift();
                    init();
                }
            }
        });
    </script>`;
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
        waitForCharts(function() {
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
        });
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
        waitForCharts(function() {
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
        });
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
        waitForCharts(function() {
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
        });
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
        waitForCharts(function() {
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
        });
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
        waitForCharts(function() {
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
        });
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
        waitForCharts(function() {
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
        });
    </script>`;
}

/**
 * Generate commit size distribution histogram
 */
function generateCommitSizeDistribution(commits, chartId = 'commitSizeDistribution') {
    if (!commits || commits.length === 0) return '';

    // Define size buckets
    const buckets = {
        'Tiny (1-10)': 0,
        'Small (11-50)': 0,
        'Medium (51-100)': 0,
        'Large (101-300)': 0,
        'Huge (301+)': 0
    };

    commits.forEach(commit => {
        const size = commit.additions + commit.deletions;
        if (size <= 10) buckets['Tiny (1-10)']++;
        else if (size <= 50) buckets['Small (11-50)']++;
        else if (size <= 100) buckets['Medium (51-100)']++;
        else if (size <= 300) buckets['Large (101-300)']++;
        else buckets['Huge (301+)']++;
    });

    const labels = Object.keys(buckets);
    const data = Object.values(buckets);

    return `
    <div class="chart-container">
        <canvas id="${chartId}"></canvas>
    </div>
    <script>
        waitForCharts(function() {
            const ctx = document.getElementById('${chartId}');
            if (!ctx) return;
            new Chart(ctx.getContext('2d'), {
                type: 'bar',
                data: {
                    labels: ${JSON.stringify(labels)},
                    datasets: [{
                        label: 'Number of Commits',
                        data: ${JSON.stringify(data)},
                        backgroundColor: [
                            '#22c55e', // Tiny - green (good)
                            '#1e40af', // Small - blue (good)
                            '#f59e0b', // Medium - amber (ok)
                            '#f97316', // Large - orange (warning)
                            '#dc2626'  // Huge - red (bad)
                        ],
                        borderColor: '#1e293b',
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        },
                        title: {
                            display: true,
                            text: 'Commit Size Distribution',
                            color: '#f1f5f9',
                            font: { size: 16, weight: 'bold' }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                color: '#94a3b8',
                                precision: 0
                            },
                            grid: { color: 'rgba(71, 85, 105, 0.3)' }
                        },
                        x: {
                            ticks: { color: '#94a3b8' },
                            grid: { color: 'rgba(71, 85, 105, 0.3)' }
                        }
                    }
                }
            });
        });
    </script>`;
}

/**
 * Generate weekly activity bar chart (commits by day of week)
 */
function generateWeeklyActivityChart(commits, chartId = 'weeklyActivityChart') {
    if (!commits || commits.length === 0) return '';

    const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayCounts = [0, 0, 0, 0, 0, 0, 0];

    commits.forEach(commit => {
        const day = commit.date.getDay();
        dayCounts[day]++;
    });

    return `
    <div class="chart-container">
        <canvas id="${chartId}"></canvas>
    </div>
    <script>
        waitForCharts(function() {
            const ctx = document.getElementById('${chartId}');
            if (!ctx) return;
            new Chart(ctx.getContext('2d'), {
                type: 'bar',
                data: {
                    labels: ${JSON.stringify(weekdays)},
                    datasets: [{
                        label: 'Commits by Day',
                        data: ${JSON.stringify(dayCounts)},
                        backgroundColor: [
                            '#dc2626', // Sunday - red
                            '#22c55e', // Monday - green
                            '#22c55e', // Tuesday - green
                            '#22c55e', // Wednesday - green
                            '#22c55e', // Thursday - green
                            '#22c55e', // Friday - green
                            '#f59e0b'  // Saturday - amber
                        ],
                        borderColor: '#1e293b',
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        },
                        title: {
                            display: true,
                            text: 'Commits by Day of Week',
                            color: '#f1f5f9',
                            font: { size: 16, weight: 'bold' }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                color: '#94a3b8',
                                precision: 0
                            },
                            grid: { color: 'rgba(71, 85, 105, 0.3)' }
                        },
                        x: {
                            ticks: { color: '#94a3b8' },
                            grid: { color: 'rgba(71, 85, 105, 0.3)' }
                        }
                    }
                }
            });
        });
    </script>`;
}

/**
 * Generate projects comparison bar chart
 */
function generateProjectsComparisonChart(projects, chartId = 'projectsComparisonChart') {
    if (!projects || projects.length === 0) return '';

    const labels = projects.map(p => p.repo.name);
    const commits = projects.map(p => p.stats.totalCommits);
    const additions = projects.map(p => p.stats.totalAdditions);
    const deletions = projects.map(p => p.stats.totalDeletions);

    return `
    <div class="chart-container-wide">
        <canvas id="${chartId}"></canvas>
    </div>
    <script>
        waitForCharts(function() {
            const ctx = document.getElementById('${chartId}');
            if (!ctx) return;
            new Chart(ctx.getContext('2d'), {
                type: 'bar',
                data: {
                    labels: ${JSON.stringify(labels)},
                    datasets: [
                        {
                            label: 'Commits',
                            data: ${JSON.stringify(commits)},
                            backgroundColor: '#22c55e',
                            borderColor: '#22c55e',
                            borderWidth: 1
                        },
                        {
                            label: 'Additions',
                            data: ${JSON.stringify(additions)},
                            backgroundColor: '#1e40af',
                            borderColor: '#1e40af',
                            borderWidth: 1
                        },
                        {
                            label: 'Deletions',
                            data: ${JSON.stringify(deletions)},
                            backgroundColor: '#dc2626',
                            borderColor: '#dc2626',
                            borderWidth: 1
                        }
                    ]
                },
                options: {
                    indexAxis: 'y',
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            labels: { color: '#e2e8f0', font: { size: 12 } }
                        },
                        title: {
                            display: true,
                            text: 'Projects Comparison',
                            color: '#f1f5f9',
                            font: { size: 16, weight: 'bold' }
                        }
                    },
                    scales: {
                        x: {
                            beginAtZero: true,
                            ticks: { color: '#94a3b8' },
                            grid: { color: 'rgba(71, 85, 105, 0.3)' }
                        },
                        y: {
                            ticks: { color: '#94a3b8' },
                            grid: { color: 'rgba(71, 85, 105, 0.3)' }
                        }
                    }
                }
            });
        });
    </script>`;
}

/**
 * Generate user activity timeline (multi-line chart showing each user's commits over time)
 */
function generateUserActivityTimeline(commits, users, chartId = 'userActivityTimeline') {
    if (!commits || commits.length === 0 || !users || users.length === 0) return '';

    // Group commits by user and date
    const userCommitsByDate = {};
    users.forEach(user => {
        userCommitsByDate[user.email] = {};
    });

    commits.forEach(c => {
        const date = c.date.toISOString().split('T')[0];
        if (userCommitsByDate[c.email]) {
            userCommitsByDate[c.email][date] = (userCommitsByDate[c.email][date] || 0) + 1;
        }
    });

    // Get all unique dates
    const allDates = [...new Set(commits.map(c => c.date.toISOString().split('T')[0]))].sort();

    // Generate colors for users
    const colors = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

    // Create datasets for each user
    const datasets = users.slice(0, 8).map((user, idx) => {
        const data = allDates.map(date => userCommitsByDate[user.email][date] || 0);
        return {
            label: user.name,
            data: data,
            borderColor: colors[idx % colors.length],
            backgroundColor: colors[idx % colors.length] + '20',
            tension: 0.4,
            fill: false,
            pointRadius: 2,
            pointHoverRadius: 4
        };
    });

    return `
    <div class="chart-container">
        <canvas id="${chartId}"></canvas>
    </div>
    <script>
        waitForCharts(function() {
            const ctx = document.getElementById('${chartId}');
            if (!ctx) return;
            new Chart(ctx.getContext('2d'), {
                type: 'line',
                data: {
                    labels: ${JSON.stringify(allDates)},
                    datasets: ${JSON.stringify(datasets)}
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: {
                        mode: 'index',
                        intersect: false
                    },
                    plugins: {
                        legend: {
                            labels: { color: '#e2e8f0', font: { size: 11 } },
                            position: 'top'
                        },
                        title: {
                            display: true,
                            text: 'User Activity Timeline',
                            color: '#f1f5f9',
                            font: { size: 16, weight: 'bold' }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: { color: '#94a3b8', precision: 0 },
                            grid: { color: 'rgba(71, 85, 105, 0.3)' }
                        },
                        x: {
                            ticks: { color: '#94a3b8', maxRotation: 45 },
                            grid: { color: 'rgba(71, 85, 105, 0.3)' }
                        }
                    }
                }
            });
        });
    </script>`;
}

/**
 * Generate user contributions comparison (horizontal bar chart)
 */
function generateUserContributionsComparison(users, chartId = 'userContribComparison', metric = 'commits') {
    if (!users || users.length === 0) return '';

    // Sort users by selected metric
    const sortedUsers = [...users].sort((a, b) => {
        if (metric === 'commits') return b.totalCommits - a.totalCommits;
        if (metric === 'additions') return b.totalAdditions - a.totalAdditions;
        if (metric === 'deletions') return b.totalDeletions - a.totalDeletions;
        return 0;
    }).slice(0, 10);

    const labels = sortedUsers.map(u => u.name);
    const commits = sortedUsers.map(u => u.totalCommits);
    const additions = sortedUsers.map(u => u.totalAdditions);
    const deletions = sortedUsers.map(u => u.totalDeletions);

    return `
    <div class="chart-container-wide">
        <canvas id="${chartId}"></canvas>
    </div>
    <script>
        waitForCharts(function() {
            const ctx = document.getElementById('${chartId}');
            if (!ctx) return;
            new Chart(ctx.getContext('2d'), {
                type: 'bar',
                data: {
                    labels: ${JSON.stringify(labels)},
                    datasets: [
                        {
                            label: 'Commits',
                            data: ${JSON.stringify(commits)},
                            backgroundColor: '#22c55e'
                        },
                        {
                            label: 'Additions',
                            data: ${JSON.stringify(additions)},
                            backgroundColor: '#3b82f6'
                        },
                        {
                            label: 'Deletions',
                            data: ${JSON.stringify(deletions)},
                            backgroundColor: '#dc2626'
                        }
                    ]
                },
                options: {
                    indexAxis: 'y',
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            labels: { color: '#e2e8f0', font: { size: 12 } }
                        },
                        title: {
                            display: true,
                            text: 'Top Contributors Comparison',
                            color: '#f1f5f9',
                            font: { size: 16, weight: 'bold' }
                        }
                    },
                    scales: {
                        x: {
                            beginAtZero: true,
                            ticks: { color: '#94a3b8' },
                            grid: { color: 'rgba(71, 85, 105, 0.3)' }
                        },
                        y: {
                            ticks: { color: '#94a3b8' },
                            grid: { color: 'rgba(71, 85, 105, 0.3)' }
                        }
                    }
                }
            });
        });
    </script>`;
}

/**
 * Generate user commit size comparison
 */
function generateUserCommitSizeComparison(commits, users, chartId = 'userCommitSizeComparison') {
    if (!commits || commits.length === 0 || !users || users.length === 0) return '';

    // Calculate average commit size per user
    const userStats = users.slice(0, 10).map(user => {
        const userCommits = commits.filter(c => c.email === user.email);
        const sizes = userCommits.map(c => c.additions + c.deletions);
        const avgSize = sizes.reduce((sum, s) => sum + s, 0) / sizes.length;
        const maxSize = Math.max(...sizes);
        const minSize = Math.min(...sizes);
        return {
            name: user.name,
            avgSize: Math.round(avgSize),
            maxSize: maxSize,
            minSize: minSize
        };
    }).sort((a, b) => b.avgSize - a.avgSize);

    const labels = userStats.map(u => u.name);
    const avgSizes = userStats.map(u => u.avgSize);
    const maxSizes = userStats.map(u => u.maxSize);

    return `
    <div class="chart-container">
        <canvas id="${chartId}"></canvas>
    </div>
    <script>
        waitForCharts(function() {
            const ctx = document.getElementById('${chartId}');
            if (!ctx) return;
            new Chart(ctx.getContext('2d'), {
                type: 'bar',
                data: {
                    labels: ${JSON.stringify(labels)},
                    datasets: [
                        {
                            label: 'Avg Commit Size',
                            data: ${JSON.stringify(avgSizes)},
                            backgroundColor: '#22c55e',
                            borderColor: '#22c55e',
                            borderWidth: 2
                        },
                        {
                            label: 'Max Commit Size',
                            data: ${JSON.stringify(maxSizes)},
                            backgroundColor: '#f59e0b',
                            borderColor: '#f59e0b',
                            borderWidth: 2
                        }
                    ]
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
                            text: 'User Commit Size Comparison',
                            color: '#f1f5f9',
                            font: { size: 16, weight: 'bold' }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: { color: '#94a3b8' },
                            grid: { color: 'rgba(71, 85, 105, 0.3)' },
                            title: {
                                display: true,
                                text: 'Lines Changed',
                                color: '#94a3b8'
                            }
                        },
                        x: {
                            ticks: { color: '#94a3b8', maxRotation: 45 },
                            grid: { color: 'rgba(71, 85, 105, 0.3)' }
                        }
                    }
                }
            });
        });
    </script>`;
}

/**
 * Generate user peak activity times (radar chart)
 */
function generateUserPeakActivityTimes(commits, users, chartId = 'userPeakActivity') {
    if (!commits || commits.length === 0 || !users || users.length === 0) return '';

    // Time periods
    const periods = ['Night (0-3)', 'Early Morning (4-7)', 'Morning (8-11)', 'Afternoon (12-15)', 'Evening (16-19)', 'Night (20-23)'];

    // Calculate commits per period for top 5 users
    const colors = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];
    const topUsers = users.slice(0, 5);

    const datasets = topUsers.map((user, idx) => {
        const userCommits = commits.filter(c => c.email === user.email);
        const periodCounts = [0, 0, 0, 0, 0, 0];

        userCommits.forEach(c => {
            const hour = c.date.getHours();
            if (hour < 4) periodCounts[0]++;
            else if (hour < 8) periodCounts[1]++;
            else if (hour < 12) periodCounts[2]++;
            else if (hour < 16) periodCounts[3]++;
            else if (hour < 20) periodCounts[4]++;
            else periodCounts[5]++;
        });

        return {
            label: user.name,
            data: periodCounts,
            borderColor: colors[idx],
            backgroundColor: colors[idx] + '20',
            pointBackgroundColor: colors[idx],
            pointBorderColor: '#fff',
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: colors[idx]
        };
    });

    return `
    <div class="chart-container">
        <canvas id="${chartId}"></canvas>
    </div>
    <script>
        waitForCharts(function() {
            const ctx = document.getElementById('${chartId}');
            if (!ctx) return;
            new Chart(ctx.getContext('2d'), {
                type: 'radar',
                data: {
                    labels: ${JSON.stringify(periods)},
                    datasets: ${JSON.stringify(datasets)}
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            labels: { color: '#e2e8f0', font: { size: 11 } },
                            position: 'top'
                        },
                        title: {
                            display: true,
                            text: 'User Peak Activity Times',
                            color: '#f1f5f9',
                            font: { size: 16, weight: 'bold' }
                        }
                    },
                    scales: {
                        r: {
                            beginAtZero: true,
                            ticks: {
                                color: '#94a3b8',
                                backdropColor: 'transparent'
                            },
                            grid: { color: 'rgba(71, 85, 105, 0.3)' },
                            pointLabels: { color: '#94a3b8', font: { size: 10 } }
                        }
                    }
                }
            });
        });
    </script>`;
}

/**
 * Generate GitHub-style contribution calendar
 */
function generateContributionCalendar(commits, chartId = 'contributionCalendar') {
    if (!commits || commits.length === 0) return '';

    // Get date range
    const dates = commits.map(c => c.date);
    const minDate = new Date(Math.min(...dates));
    const maxDate = new Date(Math.max(...dates));

    // Count commits per day
    const commitsByDate = {};
    commits.forEach(c => {
        const dateStr = c.date.toISOString().split('T')[0];
        commitsByDate[dateStr] = (commitsByDate[dateStr] || 0) + 1;
    });

    // Find max commits in a day for scaling
    const maxCommitsInDay = Math.max(...Object.values(commitsByDate), 1);

    // Generate calendar data for last 12 weeks
    const weeksToShow = 12;
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - (weeksToShow * 7));

    let calendarHTML = '<div style="background: #334155; border-radius: 12px; padding: 20px; overflow-x: auto;">';
    calendarHTML += '<h4 style="color: #f1f5f9; margin-bottom: 15px;">Contribution Activity (Last 12 Weeks)</h4>';
    calendarHTML += '<div style="display: flex; gap: 3px;">';

    // Generate columns for each week
    for (let week = 0; week < weeksToShow; week++) {
        calendarHTML += '<div style="display: flex; flex-direction: column; gap: 3px;">';

        // 7 days per week
        for (let day = 0; day < 7; day++) {
            const currentDate = new Date(startDate);
            currentDate.setDate(startDate.getDate() + (week * 7) + day);

            const dateStr = currentDate.toISOString().split('T')[0];
            const commitCount = commitsByDate[dateStr] || 0;

            // Calculate color intensity based on commits
            let bgColor = '#1e293b'; // No activity
            if (commitCount > 0) {
                const intensity = Math.min(commitCount / maxCommitsInDay, 1);
                if (intensity > 0.75) bgColor = '#22c55e'; // High activity - green
                else if (intensity > 0.5) bgColor = '#4ade80'; // Medium-high
                else if (intensity > 0.25) bgColor = '#86efac'; // Medium-low
                else bgColor = '#bbf7d0'; // Low activity
            }

            const title = `${dateStr}: ${commitCount} commit${commitCount !== 1 ? 's' : ''}`;
            calendarHTML += `<div title="${title}" style="width: 12px; height: 12px; background: ${bgColor}; border-radius: 2px; border: 1px solid #475569;"></div>`;
        }

        calendarHTML += '</div>';
    }

    calendarHTML += '</div>';

    // Add legend
    calendarHTML += '<div style="margin-top: 15px; display: flex; align-items: center; gap: 10px; font-size: 0.85em; color: #94a3b8;">';
    calendarHTML += '<span>Less</span>';
    calendarHTML += '<div style="width: 12px; height: 12px; background: #1e293b; border-radius: 2px; border: 1px solid #475569;"></div>';
    calendarHTML += '<div style="width: 12px; height: 12px; background: #bbf7d0; border-radius: 2px; border: 1px solid #475569;"></div>';
    calendarHTML += '<div style="width: 12px; height: 12px; background: #86efac; border-radius: 2px; border: 1px solid #475569;"></div>';
    calendarHTML += '<div style="width: 12px; height: 12px; background: #4ade80; border-radius: 2px; border: 1px solid #475569;"></div>';
    calendarHTML += '<div style="width: 12px; height: 12px; background: #22c55e; border-radius: 2px; border: 1px solid #475569;"></div>';
    calendarHTML += '<span>More</span>';
    calendarHTML += '</div>';

    calendarHTML += '</div>';

    return calendarHTML;
}

/**
 * Generate time of day activity polar chart
 */
function generateTimeOfDayChart(commits, chartId = 'timeOfDayChart') {
    if (!commits || commits.length === 0) return '';

    // Hour buckets (0-23)
    const hourCounts = new Array(24).fill(0);

    commits.forEach(commit => {
        const hour = commit.date.getHours();
        hourCounts[hour]++;
    });

    // Group into 6 time periods (4-hour blocks)
    const periods = [
        'Night (0-3)',
        'Early Morning (4-7)',
        'Morning (8-11)',
        'Afternoon (12-15)',
        'Evening (16-19)',
        'Night (20-23)'
    ];

    const periodCounts = [
        hourCounts.slice(0, 4).reduce((a, b) => a + b, 0),
        hourCounts.slice(4, 8).reduce((a, b) => a + b, 0),
        hourCounts.slice(8, 12).reduce((a, b) => a + b, 0),
        hourCounts.slice(12, 16).reduce((a, b) => a + b, 0),
        hourCounts.slice(16, 20).reduce((a, b) => a + b, 0),
        hourCounts.slice(20, 24).reduce((a, b) => a + b, 0)
    ];

    return `
    <div class="chart-container">
        <canvas id="${chartId}"></canvas>
    </div>
    <script>
        waitForCharts(function() {
            const ctx = document.getElementById('${chartId}');
            if (!ctx) return;
            new Chart(ctx.getContext('2d'), {
                type: 'polarArea',
                data: {
                    labels: ${JSON.stringify(periods)},
                    datasets: [{
                        label: 'Commits by Time Period',
                        data: ${JSON.stringify(periodCounts)},
                        backgroundColor: [
                            'rgba(148, 163, 184, 0.6)',  // Night - gray
                            'rgba(251, 191, 36, 0.6)',   // Early Morning - amber
                            'rgba(34, 197, 94, 0.6)',    // Morning - green
                            'rgba(59, 130, 246, 0.6)',   // Afternoon - blue
                            'rgba(249, 115, 22, 0.6)',   // Evening - orange
                            'rgba(30, 64, 175, 0.6)'     // Night - dark blue
                        ],
                        borderColor: [
                            '#94a3b8',
                            '#fbbf24',
                            '#22c55e',
                            '#3b82f6',
                            '#f97316',
                            '#1e40af'
                        ],
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'right',
                            labels: {
                                color: '#e2e8f0',
                                font: { size: 11 },
                                padding: 10
                            }
                        },
                        title: {
                            display: true,
                            text: 'Commits by Time of Day',
                            color: '#f1f5f9',
                            font: { size: 16, weight: 'bold' }
                        }
                    },
                    scales: {
                        r: {
                            ticks: {
                                color: '#94a3b8',
                                backdropColor: 'transparent'
                            },
                            grid: { color: 'rgba(71, 85, 105, 0.3)' },
                            pointLabels: { color: '#94a3b8' }
                        }
                    }
                }
            });
        });
    </script>`;
}


/**
 * Generate velocity tracking chart (commits/lines per week trend)
 */
function generateVelocityChart(commits, chartId = 'velocityChart') {
    if (!commits || commits.length === 0) return '';

    // Group commits by week
    const weeklyData = {};
    commits.forEach(c => {
        const date = new Date(c.date);
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        const weekKey = weekStart.toISOString().split('T')[0];

        if (!weeklyData[weekKey]) {
            weeklyData[weekKey] = { commits: 0, additions: 0, deletions: 0 };
        }
        weeklyData[weekKey].commits++;
        weeklyData[weekKey].additions += c.additions || 0;
        weeklyData[weekKey].deletions += c.deletions || 0;
    });

    const weeks = Object.keys(weeklyData).sort();
    const commitCounts = weeks.map(w => weeklyData[w].commits);

    // Calculate rolling average (4-week)
    const rollingAvg = commitCounts.map((_, idx) => {
        const start = Math.max(0, idx - 3);
        const slice = commitCounts.slice(start, idx + 1);
        return Math.round(slice.reduce((a, b) => a + b, 0) / slice.length);
    });

    return `
    <div class="chart-container">
        <canvas id="${chartId}"></canvas>
    </div>
    <script>
        waitForCharts(function() {
            const ctx = document.getElementById('${chartId}');
            if (!ctx) return;
            new Chart(ctx.getContext('2d'), {
                type: 'line',
                data: {
                    labels: ${JSON.stringify(weeks)},
                    datasets: [{
                        label: 'Commits per Week',
                        data: ${JSON.stringify(commitCounts)},
                        borderColor: '#22c55e',
                        backgroundColor: 'rgba(34, 197, 94, 0.1)',
                        fill: true,
                        tension: 0.4
                    }, {
                        label: '4-Week Rolling Avg',
                        data: ${JSON.stringify(rollingAvg)},
                        borderColor: '#8b5cf6',
                        borderDash: [5, 5],
                        fill: false,
                        tension: 0.4,
                        pointRadius: 0
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
                            text: 'Velocity Tracking (Weekly)',
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
        });
    </script>`;
}

/**
 * Generate streak tracking display
 */
function generateStreakCard(commits) {
    if (!commits || commits.length === 0) {
        return '<div class="streak-card"><div class="streak-number">0</div><div class="streak-label">Day Streak</div></div>';
    }

    // Sort commits by date
    const sortedCommits = [...commits].sort((a, b) => new Date(b.date) - new Date(a.date));

    // Calculate current streak
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 1;

    const commitDates = new Set(sortedCommits.map(c => c.date.toISOString().split('T')[0]));
    const uniqueDates = [...commitDates].sort().reverse();

    // Check if today or yesterday has commits
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    if (commitDates.has(today) || commitDates.has(yesterday)) {
        currentStreak = 1;
        const startDate = commitDates.has(today) ? today : yesterday;
        let checkDate = new Date(startDate);

        while (true) {
            checkDate.setDate(checkDate.getDate() - 1);
            const dateStr = checkDate.toISOString().split('T')[0];
            if (commitDates.has(dateStr)) {
                currentStreak++;
            } else {
                break;
            }
        }
    }

    // Calculate longest streak
    for (let i = 1; i < uniqueDates.length; i++) {
        const prevDate = new Date(uniqueDates[i - 1]);
        const currDate = new Date(uniqueDates[i]);
        const diff = (prevDate - currDate) / (1000 * 60 * 60 * 24);

        if (diff === 1) {
            tempStreak++;
        } else {
            longestStreak = Math.max(longestStreak, tempStreak);
            tempStreak = 1;
        }
    }
    longestStreak = Math.max(longestStreak, tempStreak, currentStreak);

    return `
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0;">
        <div class="streak-card">
            <div class="streak-number">${currentStreak}</div>
            <div class="streak-label">Current Streak (days)</div>
        </div>
        <div class="streak-card" style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);">
            <div class="streak-number">${longestStreak}</div>
            <div class="streak-label">Longest Streak (days)</div>
        </div>
    </div>`;
}

/**
 * Generate code ownership matrix
 */
function generateCodeOwnershipMatrix(commits, chartId = 'ownershipMatrix') {
    if (!commits || commits.length === 0) return '';

    // Extract file ownership from commits
    const fileOwnership = {};
    const allAuthors = new Set();

    commits.forEach(c => {
        allAuthors.add(c.author);
        if (!fileOwnership[c.author]) {
            fileOwnership[c.author] = { commits: 0, additions: 0, deletions: 0 };
        }
        fileOwnership[c.author].commits++;
        fileOwnership[c.author].additions += c.additions || 0;
        fileOwnership[c.author].deletions += c.deletions || 0;
    });

    const authors = [...allAuthors];
    const totalCommits = commits.length;

    // Sort authors by commits
    authors.sort((a, b) => fileOwnership[b].commits - fileOwnership[a].commits);

    const topAuthors = authors.slice(0, 10);
    const ownershipData = topAuthors.map(a => ({
        name: a,
        commits: fileOwnership[a].commits,
        percentage: Math.round((fileOwnership[a].commits / totalCommits) * 100)
    }));

    return `
    <div class="chart-container">
        <canvas id="${chartId}"></canvas>
    </div>
    <script>
        waitForCharts(function() {
            const ctx = document.getElementById('${chartId}');
            if (!ctx) return;

            const ownershipData = ${JSON.stringify(ownershipData)};

            new Chart(ctx.getContext('2d'), {
                type: 'bar',
                data: {
                    labels: ownershipData.map(d => d.name),
                    datasets: [{
                        label: 'Code Ownership %',
                        data: ownershipData.map(d => d.percentage),
                        backgroundColor: ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16'],
                        borderColor: '#1e293b',
                        borderWidth: 2
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
                            text: 'Code Ownership Distribution',
                            color: '#f1f5f9',
                            font: { size: 16, weight: 'bold' }
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const d = ownershipData[context.dataIndex];
                                    return d.name + ': ' + d.percentage + '% (' + d.commits + ' commits)';
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            beginAtZero: true,
                            max: 100,
                            ticks: {
                                color: '#94a3b8',
                                callback: function(value) { return value + '%'; }
                            },
                            grid: { color: 'rgba(71, 85, 105, 0.3)' }
                        },
                        y: {
                            ticks: { color: '#94a3b8' },
                            grid: { color: 'rgba(71, 85, 105, 0.3)' }
                        }
                    }
                }
            });
        });
    </script>`;
}

/**
 * Generate collaboration network (who works on same files)
 */
function generateCollaborationNetwork(commits, users, chartId = 'collaborationNetwork') {
    if (!commits || commits.length === 0 || !users || users.length < 2) return '';

    // Calculate collaboration based on commits within same day
    const commitsByDate = {};
    commits.forEach(c => {
        const date = c.date.toISOString().split('T')[0];
        if (!commitsByDate[date]) commitsByDate[date] = [];
        commitsByDate[date].push(c.author);
    });

    // Count author pairs working on same days
    const collaborationScores = {};
    Object.values(commitsByDate).forEach(authors => {
        const uniqueAuthors = [...new Set(authors)];
        for (let i = 0; i < uniqueAuthors.length; i++) {
            for (let j = i + 1; j < uniqueAuthors.length; j++) {
                const pair = [uniqueAuthors[i], uniqueAuthors[j]].sort().join('|');
                collaborationScores[pair] = (collaborationScores[pair] || 0) + 1;
            }
        }
    });

    // Get top collaborations
    const topCollabs = Object.entries(collaborationScores)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

    if (topCollabs.length === 0) {
        return '<div class="metrics-card"><h3>Collaboration Network</h3><p style="color: #94a3b8;">Not enough data to show collaboration patterns.</p></div>';
    }

    const labels = topCollabs.map(([pair]) => pair.replace('|', ' & '));
    const scores = topCollabs.map(([, score]) => score);

    return `
    <div class="chart-container">
        <canvas id="${chartId}"></canvas>
    </div>
    <script>
        waitForCharts(function() {
            const ctx = document.getElementById('${chartId}');
            if (!ctx) return;
            new Chart(ctx.getContext('2d'), {
                type: 'bar',
                data: {
                    labels: ${JSON.stringify(labels)},
                    datasets: [{
                        label: 'Days Working Together',
                        data: ${JSON.stringify(scores)},
                        backgroundColor: '#22c55e',
                        borderColor: '#1e293b',
                        borderWidth: 2
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
                            text: 'Collaboration Network (Same-Day Activity)',
                            color: '#f1f5f9',
                            font: { size: 16, weight: 'bold' }
                        }
                    },
                    scales: {
                        x: {
                            beginAtZero: true,
                            ticks: { color: '#94a3b8', precision: 0 },
                            grid: { color: 'rgba(71, 85, 105, 0.3)' },
                            title: { display: true, text: 'Days', color: '#94a3b8' }
                        },
                        y: {
                            ticks: { color: '#94a3b8' },
                            grid: { color: 'rgba(71, 85, 105, 0.3)' }
                        }
                    }
                }
            });
        });
    </script>`;
}

/**
 * Generate trend indicator HTML
 */
function generateTrendIndicator(current, previous) {
    if (!previous || previous === 0) {
        return '<span class="trend-indicator trend-neutral">→ new</span>';
    }

    const change = ((current - previous) / previous) * 100;
    const absChange = Math.abs(change).toFixed(1);

    if (change > 0) {
        return '<span class="trend-indicator trend-up">↑ ' + absChange + '%</span>';
    } else if (change < 0) {
        return '<span class="trend-indicator trend-down">↓ ' + absChange + '%</span>';
    }
    return '<span class="trend-indicator trend-neutral">→ 0%</span>';
}

module.exports = {
    getChartJsScript,
    generateCommitActivityChart,
    generateContributorPieChart,
    generateLanguageDistributionChart,
    generateActivityHeatmap,
    generateCommitTypeChart,
    generateAdditionsVsDeletionsChart,
    generateProjectsComparisonChart,
    generateWeeklyActivityChart,
    generateCommitSizeDistribution,
    generateTimeOfDayChart,
    generateContributionCalendar,
    generateUserActivityTimeline,
    generateUserContributionsComparison,
    generateUserCommitSizeComparison,
    generateUserPeakActivityTimes,
    generateVelocityChart,
    generateStreakCard,
    generateCodeOwnershipMatrix,
    generateCollaborationNetwork,
    generateTrendIndicator
};
