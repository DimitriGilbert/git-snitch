const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const chalk = require('chalk');
const { generateHTMLDocument, generateHeader, generateStatsGrid, openInBrowser } = require('./templates');
const { createCommitUrl, createBranchUrl } = require('./utils');
const config = require('./config');
const charts = require('./charts');

function parseArgs(args) {
    const options = {
        startDate: null,
        endDate: null,
        output: null,
        allBranches: false,
        branches: [],
        help: false,
        sortBy: "date",
        sortOrder: "desc",
    };

    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case "--start-date":
            case "-s":
                options.startDate = args[++i];
                break;
            case "--end-date":
            case "-e":
                options.endDate = args[++i];
                break;
            case "--output":
            case "-o":
                options.output = args[++i];
                break;
            case "--all-branches":
            case "-a":
                options.allBranches = true;
                break;
            case "--branch":
            case "-b":
                options.branches.push(args[++i]);
                break;
            case "--sort-by":
                const sortByValue = args[++i].toLowerCase();
                if (["date", "additions", "deletions"].includes(sortByValue)) {
                    options.sortBy = sortByValue;
                } else {
                    console.log(chalk.yellow(`Warning: Invalid value for --sort-by: "${sortByValue}". Using default "date".`));
                }
                break;
            case "--sort-order":
                const sortOrderValue = args[++i].toLowerCase();
                if (["asc", "desc"].includes(sortOrderValue)) {
                    options.sortOrder = sortOrderValue;
                } else {
                    console.log(chalk.yellow(`Warning: Invalid value for --sort-order: "${sortOrderValue}". Using default "desc".`));
                }
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

    if (options.allBranches && options.branches.length > 0) {
        console.log(chalk.yellow("Warning: Both --all-branches and specific --branch options were provided."));
        console.log(chalk.yellow("         --all-branches will take precedence."));
        options.branches = [];
    }

    return options;
}

function showHelp() {
    console.log(chalk.cyan.bold('📋 git-moar snitch') + chalk.gray(' - Single Repository Activity Report'));
    console.log('');
    console.log(chalk.yellow('Usage:'));
    console.log('  git-moar snitch [options]');
    console.log('');
    console.log(chalk.yellow('Options:'));
    console.log(chalk.green('  -s, --start-date <date>') + '    Start date (YYYY-MM-DD)');
    console.log(chalk.green('  -e, --end-date <date>') + '      End date (YYYY-MM-DD)');
    console.log(chalk.green('  -o, --output <file>') + '        Output HTML file path');
    console.log(chalk.green('  -a, --all-branches') + '         Include commits from all local and remote branches');
    console.log(chalk.green('  -b, --branch <name>') + '        Include commits from specific branch (can be used multiple times)');
    console.log(chalk.green('  --sort-by <criteria>') + '       Sort commits by: date (default), additions, deletions');
    console.log(chalk.green('  --sort-order <order>') + '       Sort order: asc, desc (default)');
    console.log(chalk.green('  -h, --help') + '                 Show this help message');
    console.log('');
    console.log(chalk.yellow('Examples:'));
    console.log(chalk.gray('  git-moar snitch --start-date 2023-01-01 --end-date 2023-12-31'));
    console.log(chalk.gray('  git-moar snitch --all-branches --sort-by additions'));
    console.log(chalk.gray('  git-moar snitch --branch main --branch develop -o report.html'));
    console.log('');
}

function generateReport(data) {
    let branchInfoText = "";
    if (data.options.allBranches) {
        branchInfoText = "All branches";
    } else if (data.options.branches.length > 0) {
        branchInfoText = `Branches: ${data.options.branches.join(", ")}`;
    } else {
        branchInfoText = `Current branch: ${data.repo.currentBranch}`;
    }

    const stats = [
        { value: data.stats.totalCommits.toLocaleString(), label: 'Total Commits' },
        { value: data.stats.totalAuthors.toLocaleString(), label: 'Contributors' },
        { value: `+${data.stats.totalAdditions.toLocaleString()}`, label: 'Lines Added', class: 'additions' },
        { value: `-${data.stats.totalDeletions.toLocaleString()}`, label: 'Lines Deleted', class: 'deletions' }
    ];

    const content = `
    <div class="container">
        ${generateHeader(`📋 ${data.repo.name}`, branchInfoText)}
        ${generateStatsGrid(stats)}

        ${config.chartsEnabled() ? `
        <div class="section">
            <h2>📊 Activity Charts</h2>
            <div class="charts-grid">
                ${charts.generateCommitActivityChart(data.commits, 'snitch-activity-chart')}
                ${charts.generateAdditionsVsDeletionsChart(data.commits, 'snitch-addel-chart')}
            </div>
        </div>
        ` : ''}

        <div class="section">
            <h2>📊 Commit Activity</h2>
            <div class="commits-list">
                ${data.commits.map(commit => `
                    <div class="commit-item">
                        <a href="${createCommitUrl(data.repo.url, commit.hash)}" class="commit-hash" target="_blank">${commit.hash.substring(0, 7)}</a>
                        <a href="${createBranchUrl(data.repo.url, commit.branch)}" class="commit-branch" target="_blank">${commit.branch}</a>
                        <div class="commit-message">
                            <strong>${commit.author}</strong> - ${commit.message}
                            <div class="commit-date">${commit.date.toLocaleString()}</div>
                        </div>
                        <div class="commit-stats">
                            <span class="commit-stat additions">+${commit.additions}</span>
                            <span class="commit-stat deletions">-${commit.deletions}</span>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    </div>`;

    const additionalScripts = config.chartsEnabled() ? charts.getChartJsScript() : '';
    return generateHTMLDocument(`${data.repo.name} Git Report`, content) + additionalScripts;
}

function run(args) {
    const options = parseArgs(args);

    if (options.help) {
        showHelp();
        return;
    }

    try {
        console.log(chalk.cyan('🔍 Analyzing repository...'));

        // Build git log command
        let gitCmd = 'git log --pretty=format:"%H|%an|%ae|%ad|%s" --date=iso --numstat';
        
        if (options.startDate) {
            gitCmd += ` --since="${options.startDate}"`;
        }
        if (options.endDate) {
            gitCmd += ` --until="${options.endDate}"`;
        }
        if (options.allBranches) {
            gitCmd += ' --all';
        } else if (options.branches.length > 0) {
            gitCmd += ` ${options.branches.join(' ')}`;
        }

        const gitOutput = execSync(gitCmd, { encoding: 'utf8', stdio: 'pipe' });
        
        if (!gitOutput.trim()) {
            console.log(chalk.yellow('⚠️  No commits found for the specified criteria.'));
            return;
        }

        // Parse commits (simplified version)
        const commits = [];
        const lines = gitOutput.split('\n');
        let currentCommit = null;

        for (const line of lines) {
            if (line.includes('|') && !line.match(/^\d+\s+\d+\s+/)) {
                if (currentCommit) commits.push(currentCommit);
                
                const parts = line.split('|');
                currentCommit = {
                    hash: parts[0],
                    author: parts[1],
                    email: parts[2],
                    date: new Date(parts[3]),
                    message: parts[4],
                    branch: 'main', // Simplified for now
                    additions: 0,
                    deletions: 0
                };
            } else if (line.match(/^\d+\s+\d+\s+/) && currentCommit) {
                const parts = line.split('\t');
                if (parts.length >= 2) {
                    currentCommit.additions += parseInt(parts[0], 10) || 0;
                    currentCommit.deletions += parseInt(parts[1], 10) || 0;
                }
            }
        }
        
        if (currentCommit) commits.push(currentCommit);

        // Sort commits
        commits.sort((a, b) => {
            let valA, valB;
            switch (options.sortBy) {
                case 'additions': valA = a.additions; valB = b.additions; break;
                case 'deletions': valA = a.deletions; valB = b.deletions; break;
                case 'date':
                default:
                    valA = a.date.getTime(); valB = b.date.getTime(); break;
            }
            return options.sortOrder === 'asc' ? valA - valB : valB - valA;
        });

        // Get repo info
        const repoName = path.basename(process.cwd());
        let repoUrl = '';
        try {
            repoUrl = execSync('git config --get remote.origin.url', { encoding: 'utf8', stdio: 'pipe' }).trim();
        } catch (e) {
            // Ignore if no remote
        }

        const stats = {
            totalCommits: commits.length,
            totalAuthors: new Set(commits.map(c => c.email)).size,
            totalAdditions: commits.reduce((sum, c) => sum + c.additions, 0),
            totalDeletions: commits.reduce((sum, c) => sum + c.deletions, 0)
        };

        const reportData = {
            repo: { name: repoName, url: repoUrl, currentBranch: 'main' },
            stats,
            commits,
            options
        };

        const htmlContent = generateReport(reportData);

        let outputPath = options.output;
        if (!outputPath) {
            const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
            outputPath = path.join(os.tmpdir(), `git-snitch-${repoName}-${timestamp}.html`);
        }

        fs.writeFileSync(outputPath, htmlContent);
        console.log(chalk.green('✅ Report generated successfully!'));
        console.log(chalk.gray(`📄 File: ${outputPath}`));

        if (!options.output) {
            if (openInBrowser(outputPath)) {
                console.log(chalk.green('🌐 Report opened in browser'));
            }
        }

    } catch (error) {
        console.log(chalk.red('❌ Error generating report:'), error.message);
        process.exit(1);
    }
}

module.exports = { run };