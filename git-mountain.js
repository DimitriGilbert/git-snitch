#!/usr/bin/env node

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");

// --- Argument Parsing and Help ---
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    period: "7d", // e.g., '1d', '7d', '30d', '3m'
    dir: ".",
    output: null,
    help: false,
    sortBy: "commits", // New: 'commits', 'loc', 'additions', 'deletions'
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
          console.warn(`Warning: Unknown option "${args[i]}". Ignoring.`);
        }
    }
  }
  return options;
}

function showHelp() {
  console.log(`
Git Mountain - Cross-repo activity report

Usage: node git-mountain.js [options]

Options:
  -p, --period <period>    Analysis period (e.g., '1d', '7d', '30d'). Default: '7d'.
  -d, --dir <path>         Directory to scan for git repositories. Default: current directory.
  -o, --output <file>      Output HTML file path. If not set, a temp file is opened.
  --sort-by <criteria>     Sort projects by: commits (default), loc, additions, deletions.
  --sort-order <order>     Sort order: asc, desc (default).
  -h, --help               Show this help message

Examples:
  node git-mountain.js
  node git-mountain.js -p 1d -d ~/Code --sort-by loc
`);
}

// --- Period Parsing ---

function parsePeriodToGitSince(period) {
  // Convert shorthand periods to formats Git reliably understands
  const match = period.match(/^(\d+)([hdwmy])$/i);
  if (match) {
    const [, amount, unit] = match;
    const unitMap = {
      'h': 'hours',
      'd': 'days', 
      'w': 'weeks',
      'm': 'months',
      'y': 'years'
    };
    const fullUnit = unitMap[unit.toLowerCase()];
    if (fullUnit) {
      return `${amount} ${fullUnit} ago`;
    }
  }
  
  // If it doesn't match shorthand format, assume it's already in Git format
  return period;
}

// --- Core Logic: Finding and Analyzing Repos ---

function findGitRepositories(baseDir) {
    const gitDirs = [];
    if (!fs.existsSync(baseDir)) {
        console.warn(`Directory not found: ${baseDir}`);
        return [];
    }
    const entries = fs.readdirSync(baseDir, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(baseDir, entry.name);
        if (entry.isDirectory()) {
            if (entry.name === ".git") {
                gitDirs.push(path.dirname(fullPath));
            } else if (entry.name !== 'node_modules' && !entry.name.startsWith('.') && entry.name !== 'vendor') {
                try {
                    gitDirs.push(...findGitRepositories(fullPath));
                } catch (error) {
                    // Ignore directories we can't read
                }
            }
        }
    }
    return [...new Set(gitDirs)]; // Return unique paths
}


function getRepoInfo(repoPath) {
  try {
    let remoteUrl = execSync("git config --get remote.origin.url", {
      encoding: "utf8",
      cwd: repoPath,
      stdio: 'pipe'
    }).trim();

    if (remoteUrl.startsWith("git@")) {
      const parts = remoteUrl.match(/git@([^:]+):([^/]+)\/(.+)\.git/);
      if (parts) remoteUrl = `https://${parts[1]}/${parts[2]}/${parts[3]}`;
    } else if (remoteUrl.endsWith(".git")) {
      remoteUrl = remoteUrl.slice(0, -4);
    }

    const repoName = path.basename(repoPath);
    return { name: repoName, path: repoPath, url: remoteUrl };
  } catch (error) {
    return { name: path.basename(repoPath), path: repoPath, url: "" };
  }
}

function getLinesOfCode(repoPath) {
    try {
        const output = execSync("loc . --include '\\.(ts|tsx|js|jsx|php)$' --exclude 'node_modules|dist|\\.next'", { cwd: repoPath, encoding: 'utf8', stdio: 'pipe' });
        const lines = output.split('\n');
        const totalLine = lines.find(line => line.startsWith(' Total'));

        if (totalLine) {
            const parts = totalLine.trim().split(/\s+/);
            const header = lines.find(l => l.includes('Language') && l.includes('Code'));
            if (!header) return 0;
            const codeIndex = header.split(/\s+/).findIndex(h => h === 'Code');
            if (codeIndex > -1 && parts.length > codeIndex) {
                 return parseInt(parts[codeIndex], 10) || 0;
            }
             return parseInt(parts[parts.length - 1], 10) || 0;
        }
        return 0;
    } catch (error) {
        console.warn(`Warning: Could not calculate LoC for ${repoPath}. Is 'loc' installed and in PATH?`);
        return 0;
    }
}


function getCommitBranchInfo(commitHash, repoPath) {
  try {
    const output = execSync(`git branch -a --contains ${commitHash}`, {
      encoding: "utf8",
      stdio: "pipe",
      cwd: repoPath
    }).trim();
    const branches = output.split('\n').map(l => l.trim().replace(/^\* /, '')).filter(Boolean);
    if (branches.length > 0) {
        const localBranch = branches.find(b => !b.startsWith('remotes/'));
        return localBranch || branches[0];
    }
    return 'unknown';
  } catch (error) {
    return "unknown";
  }
}

function parseGitLog(output, repoPath) {
  const commits = [];
  const lines = output.split("\n");
  let currentCommit = null;

  for (const line of lines) {
    if (line.includes("|") && !line.match(/^\d+\s+\d+\s+/)) {
      if (currentCommit) commits.push(currentCommit);

      const parts = line.split("|");
      currentCommit = {
        hash: parts[0],
        author: parts[1],
        email: parts[2],
        date: new Date(parts[3]),
        message: parts[4],
        branch: getCommitBranchInfo(parts[0], repoPath),
        additions: 0,
        deletions: 0,
        files: [],
      };
    } else if (line.match(/^\d+\s+\d+\s+/) && currentCommit) {
      const parts = line.split("\t");
      if (parts.length >= 3) {
        const additions = parseInt(parts[0], 10) || 0;
        const deletions = parseInt(parts[1], 10) || 0;
        currentCommit.additions += additions;
        currentCommit.deletions += deletions;
        currentCommit.files.push({ filename: parts[2], additions, deletions });
      }
    }
  }

  if (currentCommit) commits.push(currentCommit);
  return commits;
}

// --- Data Aggregation and Statistics ---

function calculateTimingStats(commits) {
  if (commits.length < 2) return { avgHours: 0, avgDays: 0 };
  const sortedCommits = [...commits].sort((a, b) => a.date - b.date);
  let totalTimeDiff = 0;
  for (let i = 1; i < sortedCommits.length; i++) {
    totalTimeDiff += sortedCommits[i].date - sortedCommits[i - 1].date;
  }
  const avgMilliseconds = totalTimeDiff / (sortedCommits.length - 1);
  const avgHours = Math.round(avgMilliseconds / 3600000);
  const avgDays = Math.round((avgHours / 24) * 10) / 10;
  return { avgHours, avgDays };
}

function generateUserStats(commits) {
  const users = new Map();
  for (const commit of commits) {
    const userKey = `${commit.author}|${commit.email}`;
    if (!users.has(userKey)) {
      users.set(userKey, {
        name: commit.author,
        email: commit.email,
        commits: [],
        totalCommits: 0,
        totalAdditions: 0,
        totalDeletions: 0,
      });
    }
    const user = users.get(userKey);
    user.commits.push(commit);
    user.totalCommits++;
    user.totalAdditions += commit.additions;
    user.totalDeletions += commit.deletions;
  }

  return Array.from(users.values()).map((user) => {
    user.commits.sort((a, b) => b.date - a.date);
    const timing = calculateTimingStats(user.commits);
    return {
      ...user,
      avgAdditions: user.totalCommits > 0 ? Math.round(user.totalAdditions / user.totalCommits) : 0,
      avgDeletions: user.totalCommits > 0 ? Math.round(user.totalDeletions / user.totalCommits) : 0,
      avgTimeBetweenCommits: timing,
    };
  });
}

function generateProjectStats(commits) {
    const totalCommits = commits.length;
    const totalAdditions = commits.reduce((sum, c) => sum + c.additions, 0);
    const totalDeletions = commits.reduce((sum, c) => sum + c.deletions, 0);
    return {
        totalCommits,
        totalAdditions,
        totalDeletions,
        avgAdditions: totalCommits > 0 ? Math.round(totalAdditions / totalCommits) : 0,
        avgDeletions: totalCommits > 0 ? Math.round(totalDeletions / totalCommits) : 0,
        avgTimeBetweenCommits: calculateTimingStats(commits),
    };
}

// --- HTML Generation ---

function createCommitUrl(repoUrl, hash) {
  if (!repoUrl) return "#";
  if (repoUrl.includes("github.com") || repoUrl.includes("gitlab.com")) {
    return `${repoUrl}/commit/${hash}`;
  }
  return "#";
}

function createBranchUrl(repoUrl, branchName) {
  if (!repoUrl || !branchName || branchName === "unknown") return "#";
  let cleanBranchName = branchName.startsWith("origin/") ? branchName.substring(7) : branchName;
  cleanBranchName = encodeURIComponent(cleanBranchName);
  if (repoUrl.includes("github.com") || repoUrl.includes("gitlab.com")) {
    return `${repoUrl}/tree/${cleanBranchName}`;
  }
  return "#";
}

function createUserProfileUrl(repoUrl, username) {
    if (!repoUrl || !username) return "#";
    if (repoUrl.includes("github.com")) {
        return `https://github.com/${encodeURIComponent(username)}`;
    } else if (repoUrl.includes("gitlab.com")) {
        return `https://gitlab.com/${encodeURIComponent(username)}`;
    }
    return "#";
}

function generateHTMLReport(data) {
    // Reusing styles from git-snitch
    const styles = `
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #e2e8f0; background: linear-gradient(135deg, #1e293b 0%, #0f172a 50%, #1e293b 100%); min-height: 100vh; }
        .container { max-width: 1400px; margin: 0 auto; padding: 20px; background: #1e293b; margin-top: 20px; margin-bottom: 20px; border-radius: 12px; box-shadow: 0 20px 40px rgba(0,0,0,0.3); border: 1px solid #334155; }
        .header { text-align: center; margin-bottom: 40px; padding: 30px 0; background: linear-gradient(135deg, #1e40af 0%, #0f172a 50%, #dc2626 100%); color: white; border-radius: 12px; margin: -20px -20px 40px -20px; }
        .header h1 { font-size: 2.5em; margin-bottom: 10px; font-weight: 700; }
        .header p { opacity: 0.9; font-size: 1.1em; }
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 40px; }
        .stat-card { background: #334155; padding: 25px; border-radius: 12px; text-align: center; border: 2px solid #475569; transition: transform 0.2s, box-shadow 0.2s; }
        .stat-card:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(34, 197, 94, 0.2); border-color: #22c55e; }
        .stat-number { font-size: 2.5em; font-weight: bold; color: #22c55e; display: block; }
        .stat-label { color: #94a3b8; font-size: 0.9em; text-transform: uppercase; letter-spacing: 1px; margin-top: 8px; }
        .section { margin-bottom: 40px; }
        .section h2 { font-size: 1.8em; margin-bottom: 20px; color: #f1f5f9; border-bottom: 3px solid #22c55e; padding-bottom: 10px; display: inline-block; }
        .tabs { display: flex; border-bottom: 2px solid #475569; margin-bottom: 20px; gap: 5px; flex-wrap: wrap; }
        .tab { padding: 12px 24px; background: #475569; color: #94a3b8; border: none; border-radius: 8px 8px 0 0; cursor: pointer; font-size: 1rem; font-weight: 500; transition: all 0.3s ease; border-bottom: 3px solid transparent; white-space: nowrap; }
        .tab:hover { background: #64748b; color: #f1f5f9; }
        .tab.active { background: #1e40af; color: white; border-bottom-color: #22c55e; }
        .tab-content { display: none; animation: slideIn 0.3s ease-in-out; }
        .tab-content.active { display: block; }
        @keyframes slideIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .user-card, .project-card { background: #334155; border: 1px solid #475569; border-radius: 12px; padding: 25px; margin-bottom: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.2); }
        .user-header { display: flex; align-items: center; margin-bottom: 20px; }
        .user-avatar { width: 50px; height: 50px; border-radius: 50%; background: linear-gradient(135deg, #22c55e, #dc2626); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 1.2em; margin-right: 15px; }
        .user-info h3 { font-size: 1.3em; margin-bottom: 5px; color: #f1f5f9; }
        .user-email a { color: #94a3b8; text-decoration: none; }
        .user-stats, .project-stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 15px; margin-bottom: 20px; }
        .user-stat, .project-stat { text-align: center; padding: 15px; background: #475569; border-radius: 8px; }
        .user-stat-number, .project-stat-number { font-size: 1.5em; font-weight: bold; color: #22c55e; }
        .user-stat-label, .project-stat-label { font-size: 0.8em; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; }
        .commits-list { background: #475569; border-radius: 8px; padding: 20px; max-height: 400px; overflow-y: auto; }
        .commit-item { display: flex; align-items: center; padding: 12px 0; border-bottom: 1px solid #64748b; }
        .commit-item:last-child { border-bottom: none; }
        .commit-hash { font-family: 'Monaco', 'Menlo', monospace; background: #1e40af; color: white; padding: 4px 8px; border-radius: 4px; font-size: 0.8em; margin-right: 12px; text-decoration: none; }
        .commit-branch { font-family: 'Monaco', 'Menlo', monospace; background: #f97316; color: white; padding: 4px 8px; border-radius: 4px; font-size: 0.8em; margin-right: 12px; text-decoration: none; white-space: nowrap; }
        .commit-message { flex: 1; font-size: 0.9em; color: #e2e8f0; }
        .commit-stats { display: flex; gap: 8px; margin-left: 12px; }
        .commit-stat { font-size: 0.8em; padding: 2px 6px; border-radius: 4px; }
        .additions { background: #22c55e; color: white; }
        .deletions { background: #dc2626; color: white; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 12px 15px; text-align: left; border-bottom: 1px solid #475569; }
        th { background-color: #334155; color: #f1f5f9; }
        tr:hover { background-color: #475569; }
    `;

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
            </div>
        </div>
    `).join('');

    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Git Mountain Report</title>
            <style>${styles}</style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🏔️ Git Mountain Report</h1>
                    <p>Cross-repository analysis for the last ${data.period}</p>
                </div>
                <div class="stats-grid">
                    <div class="stat-card"><span class="stat-number">${data.overall.totalProjects}</span><div class="stat-label">Active Projects</div></div>
                    <div class="stat-card"><span class="stat-number">${data.overall.totalCommits.toLocaleString()}</span><div class="stat-label">Total Commits</div></div>
                    <div class="stat-card"><span class="stat-number additions">+${data.overall.totalAdditions.toLocaleString()}</span><div class="stat-label">Total Additions</div></div>
                    <div class="stat-card"><span class="stat-number deletions">-${data.overall.totalDeletions.toLocaleString()}</span><div class="stat-label">Total Deletions</div></div>
                    <div class="stat-card"><span class="stat-number">${data.overall.totalLoc.toLocaleString()}</span><div class="stat-label">Total Lines of Code</div></div>
                </div>
                <div class="section">
                    <div class="tabs main-tabs">
                        <button class="tab active" data-tab-target="overview">Overview</button>
                        ${data.projects.map((p, i) => `<button class="tab" data-tab-target="project-${i}">${p.repo.name}</button>`).join('')}
                    </div>
                    ${overviewTab}
                    ${projectTabs}
                </div>
            </div>
            <script>
                document.addEventListener('DOMContentLoaded', () => {
                    const mainTabs = document.querySelector('.main-tabs');
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

                    mainTabs.querySelector('.tab').click();
                });
            </script>
        </body>
        </html>
    `;
}


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
    console.log(`🌐 Report opened in default browser`);
  } catch (error) {
    console.log(`📁 Report saved to: ${filePath}`);
  }
}


// --- Main Execution ---

function main() {
    const options = parseArgs();

    if (options.help) {
        showHelp();
        return;
    }

    console.log(`🔍 Scanning for git repositories in ${path.resolve(options.dir)}...`);
    const allRepoPaths = findGitRepositories(options.dir);
    console.log(`Found ${allRepoPaths.length} git repositories.`);

    const projects = [];
    const period = options.period;
    
    console.log(`\nAnalyzing projects active in the last ${period}...`);

    for (const repoPath of allRepoPaths) {
        try {
            const gitSince = parsePeriodToGitSince(period);
            const gitLogCmd = `git log --since="${gitSince}" --pretty=format:"%H|%an|%ae|%ad|%s" --date=iso --numstat`;
            const gitOutput = execSync(gitLogCmd, { cwd: repoPath, encoding: 'utf8', stdio: 'pipe' });

            if (gitOutput.trim().length > 0) {
                const repoName = path.basename(repoPath);
                console.log(`  -> ${repoName} is active. Analyzing...`);
                
                const repoInfo = getRepoInfo(repoPath);
                const loc = getLinesOfCode(repoPath);
                const commits = parseGitLog(gitOutput, repoPath);
                commits.sort((a, b) => b.date - a.date); // Sort commits by date desc

                const projectStats = generateProjectStats(commits);
                const userStats = generateUserStats(commits);

                projects.push({
                    repo: repoInfo,
                    loc,
                    stats: projectStats,
                    users: userStats,
                    commits,
                });
            }
        } catch (error) {
            console.warn(`Could not analyze git repository at ${repoPath}. Skipping. Error: ${error.message}`);
        }
    }
    
    console.log(`\n📊 Found ${projects.length} active projects.`);
    if (projects.length === 0) {
        console.log("No activity found for the specified period. Exiting.");
        return;
    }

    // --- Sort projects ---
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


    // --- Aggregate overall stats ---
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

    const htmlContent = generateHTMLReport(reportData);

    let outputPath = options.output;
    if (!outputPath) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      outputPath = path.join(os.tmpdir(), `git-mountain-report-${timestamp}.html`);
    }

    fs.writeFileSync(outputPath, htmlContent);
    console.log(`✅ Report generated successfully!`);
    console.log(`📄 File: ${outputPath}`);

    if (!options.output) {
      openInBrowser(outputPath);
    }
}

if (require.main === module) {
    main();
}
