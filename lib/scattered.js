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
            <h2>Projects Overview</h2>
            <table>
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
                            <td>${p.stats.totalCommits}</td>
                            <td class="additions">+${p.stats.totalAdditions}</td>
                            <td class="deletions">-${p.stats.totalDeletions}</td>
                            <td>${p.loc.toLocaleString()}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
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
                    <div class="commits-list" style="max-height: 500px;">
                        ${p.commits.map(c => `
                            <div class="commit-item">
                                <a href="${createCommitUrl(p.repo.url, c.hash)}" class="commit-hash" target="_blank">${c.hash.substring(0, 7)}</a>
                                <a href="${createBranchUrl(p.repo.url, c.branch)}" class="commit-branch" target="_blank">${c.branch}</a>
                                <div class="commit-message">
                                    <strong>${c.author}</strong> - ${c.message}
                                    <div class="commit-date">${c.date.toLocaleString()}</div>
                                </div>
                                <div class="commit-stats">
                                    <span class="commit-stat additions">+${c.additions}</span>
                                    <span class="commit-stat deletions">-${c.deletions}</span>
                                </div>
                            </div>`).join('')}
                    </div>
                 </div>
                 <div id="project-${pIndex}-users" class="tab-content sub-tab-content">
                    ${p.users.map(u => `
                        <div class="user-card">
                            <div class="user-header">
                                <div class="user-avatar">${u.name.charAt(0).toUpperCase()}</div>
                                <div class="user-info">
                                    <h3>${u.name}</h3>
                                    <div class="user-email"><a href="mailto:${u.email}">${u.email}</a></div>
                                </div>
                            </div>
                            <div class="user-stats">
                                <div class="user-stat"><div class="user-stat-number">${u.totalCommits}</div><div class="user-stat-label">Commits</div></div>
                                <div class="user-stat"><div class="user-stat-number additions">+${u.totalAdditions}</div><div class="user-stat-label">Additions</div></div>
                                <div class="user-stat"><div class="user-stat-number deletions">-${u.totalDeletions}</div><div class="user-stat-label">Deletions</div></div>
                            </div>
                        </div>
                    `).join('')}
                 </div>

                 ${config.chartsEnabled() ? `
                 <div id="project-${pIndex}-charts" class="tab-content sub-tab-content">
                    <h3>Activity Charts</h3>
                    ${charts.generateCommitActivityChart(p.commits, 'project-' + pIndex + '-activity-chart')}
                    ${p.users && p.users.length > 1 ? charts.generateContributorPieChart(p.users, 'project-' + pIndex + '-contributor-chart') : ''}
                    ${p.locDetails && p.locDetails.byLanguage ? charts.generateLanguageDistributionChart(p.locDetails.byLanguage, 'project-' + pIndex + '-lang-chart') : ''}
                    ${p.commitTypes ? charts.generateCommitTypeChart(p.commitTypes, 'project-' + pIndex + '-type-chart') : ''}
                    ${charts.generateActivityHeatmap(p.commits, 'project-' + pIndex + '-heatmap')}
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
                    ${p.hotspots.slice(0, 15).map(h => `
                        <div class="hotspot-item ${h.riskLevel.level.toLowerCase()}-risk">
                            <div class="hotspot-filename">${h.riskLevel.emoji} ${h.filename}</div>
                            <div class="hotspot-stats">
                                <span class="hotspot-stat"><strong>${h.changes}</strong> changes</span>
                                <span class="hotspot-stat"><strong>${h.churn.toLocaleString()}</strong> churn</span>
                                <span class="hotspot-stat"><strong>${h.authorCount}</strong> authors</span>
                                <span class="hotspot-stat">Risk: <strong style="color: ${h.riskLevel.color}">${h.riskLevel.level}</strong></span>
                            </div>
                        </div>
                    `).join('')}
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

    return generateHTMLDocument('Git Mountain Report', content) + additionalScripts;
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