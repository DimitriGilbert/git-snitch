const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const chalk = require('chalk');
const { generateHTMLDocument, generateHeader, generateStatsGrid, openInBrowser } = require('./templates');
const {
    parsePeriodToGitSince,
    findGitRepositories,
    getRepoInfo,
    getLinesOfCode,
    parseGitLog,
    generateUserStats,
    generateProjectStats,
    createCommitUrl,
    createBranchUrl
} = require('./utils');
const config = require('./config');
const charts = require('./charts');
const { generateCommitTypeBreakdown, analyzeCommitMessageQuality } = require('./commit-classifier');
const { calculateCodeQualityMetrics, getHealthScoreRating, generateHealthRecommendations } = require('./quality-metrics');
const { generateProductivityInsights, generateProductivityRecommendations } = require('./productivity');
const { findFileHotspots, calculateHotspotStats, generateHotspotRecommendations } = require('./hotspots');

/**
 * Parse period string to number of days
 */
function parsePeriodToDays(period) {
    const match = period.match(/^(\d+)([hdwmy])$/i);
    if (match) {
        const [, amount, unit] = match;
        const unitToDays = {
            'h': parseFloat(amount) / 24,
            'd': parseFloat(amount),
            'w': parseFloat(amount) * 7,
            'm': parseFloat(amount) * 30,
            'y': parseFloat(amount) * 365
        };
        return unitToDays[unit.toLowerCase()] || 7;
    }
    return 7; // default
}

function parseArgs(args) {
    const options = {
        period: "7d",
        dir: ".",
        output: null,
        help: false,
        sortBy: "commits",
        sortOrder: "desc",
    };

    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case "--period":
            case "-p":
                options.period = args[++i];
                break;
            case "--dir":
            case "-d":
                options.dir = args[++i];
                break;
            case "--output":
            case "-o":
                options.output = args[++i];
                break;
            case "--sort-by":
                options.sortBy = args[++i].toLowerCase();
                break;
            case "--sort-order":
                options.sortOrder = args[++i].toLowerCase();
                break;
            case "--help":
            case "-h":
                options.help = true;
                break;
            default:
                if (args[i].startsWith("-")) {
                    console.log(chalk.yellow(`Warning: Unknown option "${args[i]}". Ignoring.`));
                }
        }
    }
    return options;
}

function showHelp() {
    console.log(chalk.cyan.bold('🏔️  git-moar scattered') + chalk.gray(' - Cross-Repository Activity Report'));
    console.log('');
    console.log(chalk.yellow('Usage:'));
    console.log('  git-moar scattered [options]');
    console.log('');
    console.log(chalk.yellow('Options:'));
    console.log(chalk.green('  -p, --period <period>') + '    Analysis period (e.g., "1d", "7d", "30d"). Default: "7d"');
    console.log(chalk.green('  -d, --dir <path>') + '         Directory to scan for git repositories. Default: current directory');
    console.log(chalk.green('  -o, --output <file>') + '      Output HTML file path. If not set, a temp file is opened');
    console.log(chalk.green('  --sort-by <criteria>') + '     Sort projects by: commits (default), loc, additions, deletions');
    console.log(chalk.green('  --sort-order <order>') + '     Sort order: asc, desc (default)');
    console.log(chalk.green('  -h, --help') + '               Show this help message');
    console.log('');
    console.log(chalk.yellow('Examples:'));
    console.log(chalk.gray('  git-moar scattered'));
    console.log(chalk.gray('  git-moar scattered -p 1d -d ~/Code --sort-by loc'));
    console.log(chalk.gray('  git-moar scattered -p 30d --sort-by additions -o monthly-report.html'));
    console.log('');
}

function generateReport(data) {
    const stats = [
        { value: data.overall.totalProjects.toString(), label: 'Active Projects' },
        { value: data.overall.totalCommits.toLocaleString(), label: 'Total Commits' },
        { value: `+${data.overall.totalAdditions.toLocaleString()}`, label: 'Total Additions', class: 'additions' },
        { value: `-${data.overall.totalDeletions.toLocaleString()}`, label: 'Total Deletions', class: 'deletions' },
        { value: data.overall.totalLoc.toLocaleString(), label: 'Total Lines of Code' }
    ];

    const overviewTab = `
        <div id="overview" class="tab-content">
            ${config.chartsEnabled() && data.projects.length > 1 ? `
            <div class="section">
                <h2>📊 Projects Comparison</h2>
                ${charts.generateProjectsComparisonChart(data.projects, 'overview-comparison-chart')}
            </div>
            ` : ''}

            <h2>Projects Overview</h2>
            <div style="background: #334155; border-radius: 12px; padding: 20px;">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Project</th>
                            <th>Commits</th>
                            <th>Additions</th>
                            <th>Deletions</th>
                            <th>Lines of Code</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.projects.map(p => `
                            <tr>
                                <td><a href="${p.repo.url || '#'}" target="_blank" style="color: #22c55e;">${p.repo.name}</a></td>
                                <td data-order="${p.stats.totalCommits}">${p.stats.totalCommits}</td>
                                <td class="additions" data-order="${p.stats.totalAdditions}">+${p.stats.totalAdditions}</td>
                                <td class="deletions" data-order="${p.stats.totalDeletions}">-${p.stats.totalDeletions}</td>
                                <td data-order="${p.loc}">${p.loc.toLocaleString()}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;

    const projectTabs = data.projects.map((p, pIndex) => `
        <div id="project-${pIndex}" class="tab-content">
            <div class="project-card">
                 <h2><a href="${p.repo.url}" target="_blank" style="color: white">${p.repo.name}</a></h2>
                 <div class="project-stats-grid">
                    <div class="project-stat"><div class="project-stat-number">${p.stats.totalCommits}</div><div class="project-stat-label">Commits</div></div>
                    <div class="project-stat"><div class="project-stat-number">${p.loc.toLocaleString()}</div><div class="project-stat-label">LoC</div></div>
                    <div class="project-stat"><div class="project-stat-number additions">+${p.stats.totalAdditions}</div><div class="project-stat-label">Additions</div></div>
                    <div class="project-stat"><div class="project-stat-number deletions">-${p.stats.totalDeletions}</div><div class="project-stat-label">Deletions</div></div>
                 </div>
                 <div class="tabs sub-tabs">
                    <button class="tab sub-tab" data-sub-tab-target="project-${pIndex}-commits">Commits</button>
                    <button class="tab sub-tab" data-sub-tab-target="project-${pIndex}-users">Contributors</button>
                    ${config.chartsEnabled() ? `<button class="tab sub-tab" data-sub-tab-target="project-${pIndex}-charts">📊 Charts</button>` : ''}
                    ${p.quality ? `<button class="tab sub-tab" data-sub-tab-target="project-${pIndex}-quality">🏥 Health</button>` : ''}
                    ${p.hotspots && p.hotspots.length > 0 ? `<button class="tab sub-tab" data-sub-tab-target="project-${pIndex}-hotspots">🔥 Hotspots</button>` : ''}
                 </div>

                 <div id="project-${pIndex}-commits" class="tab-content sub-tab-content">
                    <div style="background: #475569; border-radius: 8px; padding: 20px;">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Hash</th>
                                    <th>Branch</th>
                                    <th>Author</th>
                                    <th>Message</th>
                                    <th>Date</th>
                                    <th>Additions</th>
                                    <th>Deletions</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${p.commits.map(c => `
                                    <tr>
                                        <td><a href="${createCommitUrl(p.repo.url, c.hash)}" class="commit-hash" target="_blank">${c.hash.substring(0, 7)}</a></td>
                                        <td><a href="${createBranchUrl(p.repo.url, c.branch)}" class="commit-branch" target="_blank">${c.branch}</a></td>
                                        <td>${c.author}</td>
                                        <td>${c.message}</td>
                                        <td data-order="${c.date.getTime()}">${c.date.toLocaleString()}</td>
                                        <td class="additions" data-order="${c.additions}">+${c.additions}</td>
                                        <td class="deletions" data-order="${c.deletions}">-${c.deletions}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                 </div>
                 <div id="project-${pIndex}-users" class="tab-content sub-tab-content">
                    <div style="background: #475569; border-radius: 8px; padding: 20px;">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Email</th>
                                    <th>Commits</th>
                                    <th>Additions</th>
                                    <th>Deletions</th>
                                    <th>Avg Lines/Commit</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${p.users.map(u => `
                                    <tr>
                                        <td><strong>${u.name}</strong></td>
                                        <td><a href="mailto:${u.email}" style="color: #94a3b8;">${u.email}</a></td>
                                        <td data-order="${u.totalCommits}">${u.totalCommits}</td>
                                        <td class="additions" data-order="${u.totalAdditions}">+${u.totalAdditions}</td>
                                        <td class="deletions" data-order="${u.totalDeletions}">-${u.totalDeletions}</td>
                                        <td data-order="${Math.round((u.totalAdditions + u.totalDeletions) / u.totalCommits)}">${Math.round((u.totalAdditions + u.totalDeletions) / u.totalCommits)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                 </div>

                 ${config.chartsEnabled() ? `
                 <div id="project-${pIndex}-charts" class="tab-content sub-tab-content">
                    <h3>Activity Charts</h3>
                    <div class="charts-grid">
                        ${charts.generateCommitActivityChart(p.commits, 'project-' + pIndex + '-activity-chart')}
                        ${charts.generateWeeklyActivityChart(p.commits, 'project-' + pIndex + '-weekly-chart')}
                    </div>
                    <div class="charts-grid">
                        ${p.users && p.users.length > 1 ? charts.generateContributorPieChart(p.users, 'project-' + pIndex + '-contributor-chart') : ''}
                        ${p.locDetails && p.locDetails.byLanguage ? charts.generateLanguageDistributionChart(p.locDetails.byLanguage, 'project-' + pIndex + '-lang-chart') : ''}
                    </div>
                    <div class="charts-grid">
                        ${charts.generateCommitSizeDistribution(p.commits, 'project-' + pIndex + '-size-dist')}
                        ${charts.generateTimeOfDayChart(p.commits, 'project-' + pIndex + '-time-chart')}
                    </div>
                    ${p.commitTypes ? charts.generateCommitTypeChart(p.commitTypes, 'project-' + pIndex + '-type-chart') : ''}
                    ${charts.generateActivityHeatmap(p.commits, 'project-' + pIndex + '-heatmap')}
                    ${charts.generateContributionCalendar(p.commits, 'project-' + pIndex + '-calendar')}
                 </div>
                 ` : ''}

                 ${p.quality ? `
                 <div id="project-${pIndex}-quality" class="tab-content sub-tab-content">
                    <h3>Repository Health</h3>
                    ${(() => {
                        const rating = getHealthScoreRating(p.quality.healthScore);
                        return `
                        <div class="health-score">
                            <div class="health-score-circle" style="border-color: ${rating.color}; color: ${rating.color};">
                                ${p.quality.healthScore}
                            </div>
                            <div class="health-score-label" style="color: ${rating.color};">
                                ${rating.emoji} ${rating.label}
                            </div>
                        </div>
                        `;
                    })()}

                    <div class="metrics-card">
                        <h3>Quality Metrics</h3>
                        <div class="metric-item">
                            <span class="metric-label">Bus Factor</span>
                            <span class="metric-value ${p.quality.busFactor <= 2 ? 'danger' : p.quality.busFactor <= 3 ? 'warning' : ''}">${p.quality.busFactor}</span>
                        </div>
                        <div class="metric-item">
                            <span class="metric-label">Code Churn Rate</span>
                            <span class="metric-value">${p.quality.churnRate} lines/commit</span>
                        </div>
                        <div class="metric-item">
                            <span class="metric-label">Avg Commit Size</span>
                            <span class="metric-value ${p.quality.avgCommitSize > 300 ? 'warning' : ''}">${p.quality.avgCommitSize} lines</span>
                        </div>
                        <div class="metric-item">
                            <span class="metric-label">Comment Ratio</span>
                            <span class="metric-value ${p.quality.commentRatio < 10 ? 'warning' : ''}">${p.quality.commentRatio}%</span>
                        </div>
                        <div class="metric-item">
                            <span class="metric-label">Code Stability</span>
                            <span class="metric-value">${p.quality.codeStability}</span>
                        </div>
                        <div class="metric-item">
                            <span class="metric-label">Ownership Concentration</span>
                            <span class="metric-value ${p.quality.ownershipConcentration > 0.6 ? 'warning' : ''}">${p.quality.ownershipConcentration}</span>
                        </div>
                    </div>

                    ${(() => {
                        const recommendations = generateHealthRecommendations(p.quality, p.commits);
                        if (recommendations.length === 0) return '';
                        return `
                        <div class="metrics-card">
                            <h3>Recommendations</h3>
                            <div class="recommendations">
                                ${recommendations.map(rec => `
                                    <div class="recommendation-item ${rec.severity === 'high' ? 'danger' : rec.severity === 'medium' ? 'warning' : ''}">
                                        <div class="recommendation-category">${rec.category}</div>
                                        <div class="recommendation-message">${rec.message}</div>
                                        <div class="recommendation-action">💡 ${rec.action}</div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                        `;
                    })()}
                 </div>
                 ` : ''}

                 ${p.hotspots && p.hotspots.length > 0 ? `
                 <div id="project-${pIndex}-hotspots" class="tab-content sub-tab-content">
                    <h3>File Hotspots</h3>
                    <p style="color: #94a3b8; margin-bottom: 20px;">Files that change frequently may indicate technical debt or areas needing refactoring.</p>
                    <div style="background: #475569; border-radius: 8px; padding: 20px;">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Risk</th>
                                    <th>Filename</th>
                                    <th>Changes</th>
                                    <th>Churn</th>
                                    <th>Authors</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${p.hotspots.slice(0, 20).map(h => `
                                    <tr>
                                        <td><span style="color: ${h.riskLevel.color}; font-size: 1.5em;">${h.riskLevel.emoji}</span></td>
                                        <td><code style="color: #f1f5f9;">${h.filename}</code></td>
                                        <td data-order="${h.changes}">${h.changes}</td>
                                        <td data-order="${h.churn}">${h.churn.toLocaleString()}</td>
                                        <td data-order="${h.authorCount}">${h.authorCount}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                 </div>
                 ` : ''}
            </div>
        </div>
    `).join('');

    const content = `
    <div class="container">
        ${generateHeader('🏔️ Git Mountain Report', `Cross-repository analysis for the last ${data.period}`)}
        ${generateStatsGrid(stats)}
        
        <div class="section">
            <div class="tabs main-tabs">
                <button class="tab active" data-tab-target="overview">Overview</button>
                ${data.projects.map((p, i) => `<button class="tab" data-tab-target="project-${i}">${p.repo.name}</button>`).join('')}
            </div>
            ${overviewTab}
            ${projectTabs}
        </div>
    </div>`;

    // Add Chart.js if charts are enabled
    const additionalScripts = config.chartsEnabled() ? charts.getChartJsScript() : '';

    return generateHTMLDocument('Git Mountain Report', content, '', additionalScripts);
}

function run(args) {
    const options = parseArgs(args);

    if (options.help) {
        showHelp();
        return;
    }

    console.log(chalk.cyan(`🔍 Scanning for git repositories in ${path.resolve(options.dir)}...`));
    const allRepoPaths = findGitRepositories(options.dir);
    console.log(chalk.gray(`Found ${allRepoPaths.length} git repositories.`));

    const projects = [];
    const period = options.period;
    
    console.log(chalk.cyan(`\n📊 Analyzing projects active in the last ${period}...`));

    for (const repoPath of allRepoPaths) {
        try {
            const gitSince = parsePeriodToGitSince(period);
            const gitLogCmd = `git log --since="${gitSince}" --pretty=format:"%H|%an|%ae|%ad|%s" --date=iso --numstat`;
            const gitOutput = execSync(gitLogCmd, { cwd: repoPath, encoding: 'utf8', stdio: 'pipe' });

            if (gitOutput.trim().length > 0) {
                const repoName = path.basename(repoPath);
                console.log(chalk.gray(`  -> ${repoName} is active. Analyzing...`));

                const repoInfo = getRepoInfo(repoPath);
                const locDetails = getLinesOfCode(repoPath, true);
                const commits = parseGitLog(gitOutput, repoPath);
                commits.sort((a, b) => b.date - a.date);

                const projectStats = generateProjectStats(commits);
                const userStats = generateUserStats(commits);

                // Calculate period in days
                const periodDays = parsePeriodToDays(period);

                // New analytics
                const commitTypes = config.get('widgets.showCommitClassification') ? generateCommitTypeBreakdown(commits) : null;
                const quality = config.get('stats.showQualityMetrics') ? calculateCodeQualityMetrics(commits, locDetails, userStats) : null;
                const productivity = config.get('stats.showProductivity') ? generateProductivityInsights(commits, userStats, periodDays) : null;
                const hotspots = config.get('stats.showHotspots') ? findFileHotspots(commits, 20) : [];

                projects.push({
                    repo: repoInfo,
                    loc: locDetails.total || locDetails,
                    locDetails: locDetails,
                    stats: projectStats,
                    users: userStats,
                    commits,
                    commitTypes,
                    quality,
                    productivity,
                    hotspots
                });
            }
        } catch (error) {
            console.log(chalk.yellow(`Could not analyze git repository at ${repoPath}. Skipping. Error: ${error.message}`));
        }
    }
    
    console.log(chalk.green(`\n📊 Found ${projects.length} active projects.`));
    if (projects.length === 0) {
        console.log(chalk.yellow("No activity found for the specified period. Exiting."));
        return;
    }

    // Sort projects
    projects.sort((a, b) => {
        let valA, valB;
        switch(options.sortBy) {
            case 'loc': valA = a.loc; valB = b.loc; break;
            case 'additions': valA = a.stats.totalAdditions; valB = b.stats.totalAdditions; break;
            case 'deletions': valA = a.stats.totalDeletions; valB = b.stats.totalDeletions; break;
            case 'commits':
            default:
                valA = a.stats.totalCommits; valB = b.stats.totalCommits; break;
        }
        return options.sortOrder === 'asc' ? valA - valB : valB - valA;
    });

    // Aggregate overall stats
    const overallStats = {
        totalProjects: projects.length,
        totalCommits: projects.reduce((sum, p) => sum + p.stats.totalCommits, 0),
        totalAdditions: projects.reduce((sum, p) => sum + p.stats.totalAdditions, 0),
        totalDeletions: projects.reduce((sum, p) => sum + p.stats.totalDeletions, 0),
        totalLoc: projects.reduce((sum, p) => sum + p.loc, 0),
    };

    const reportData = {
        projects,
        overall: overallStats,
        options,
        generatedAt: new Date().toISOString(),
        period,
    };

    const htmlContent = generateReport(reportData);

    let outputPath = options.output;
    if (!outputPath) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        outputPath = path.join(os.tmpdir(), `git-mountain-report-${timestamp}.html`);
    }

    fs.writeFileSync(outputPath, htmlContent);
    console.log(chalk.green('✅ Report generated successfully!'));
    console.log(chalk.gray(`📄 File: ${outputPath}`));

    if (!options.output) {
        if (openInBrowser(outputPath)) {
            console.log(chalk.green('🌐 Report opened in browser'));
        }
    }
}

module.exports = { run };