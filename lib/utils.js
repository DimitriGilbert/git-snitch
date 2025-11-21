const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const sloc = require('sloc');

/**
 * Parse period shorthand to Git since format
 */
function parsePeriodToGitSince(period) {
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
    return period;
}

/**
 * Find git repositories recursively
 */
function findGitRepositories(baseDir) {
    const gitDirs = [];
    if (!fs.existsSync(baseDir)) {
        return [];
    }
    
    try {
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
    } catch (error) {
        // Ignore directories we can't read
    }
    
    return [...new Set(gitDirs)];
}

/**
 * Get repository information
 */
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

/**
 * Get lines of code count using sloc npm package with detailed breakdown
 */
function getLinesOfCode(repoPath, detailed = false) {
    const extensionMap = {
        '.js': 'js',
        '.jsx': 'jsx',
        '.ts': 'ts',
        '.tsx': 'tsx',
        '.php': 'php',
        '.py': 'py',
        '.java': 'java',
        '.c': 'c',
        '.cpp': 'cpp',
        '.cs': 'cs',
        '.go': 'go',
        '.rb': 'rb',
        '.rs': 'rust'
    };

    const excludeDirs = new Set([
        'node_modules',
        'dist',
        '.next',
        'build',
        'out',
        '.git',
        'vendor',
        'coverage',
        '.vscode',
        '.idea',
        'target',
        'bin',
        'obj'
    ]);

    let totalSourceLines = 0;
    const byLanguage = {};
    const byDirectory = {};
    let totalStats = { source: 0, comment: 0, blank: 0, total: 0 };

    function walkDir(dir, relPath = '') {
        try {
            const entries = fs.readdirSync(dir, { withFileTypes: true });

            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                const newRelPath = relPath ? path.join(relPath, entry.name) : entry.name;

                if (entry.isDirectory()) {
                    if (!excludeDirs.has(entry.name) && !entry.name.startsWith('.')) {
                        walkDir(fullPath, newRelPath);
                    }
                } else if (entry.isFile()) {
                    const ext = path.extname(entry.name);
                    const language = extensionMap[ext];

                    if (language) {
                        try {
                            const code = fs.readFileSync(fullPath, 'utf8');
                            const stats = sloc(code, language);

                            const sourceLines = stats.source || 0;
                            totalSourceLines += sourceLines;

                            if (detailed) {
                                // By language
                                if (!byLanguage[language]) {
                                    byLanguage[language] = { source: 0, comment: 0, blank: 0, files: 0 };
                                }
                                byLanguage[language].source += sourceLines;
                                byLanguage[language].comment += stats.comment || 0;
                                byLanguage[language].blank += stats.blank || 0;
                                byLanguage[language].files++;

                                // By directory
                                const topDir = relPath.split(path.sep)[0] || 'root';
                                if (!byDirectory[topDir]) {
                                    byDirectory[topDir] = 0;
                                }
                                byDirectory[topDir] += sourceLines;

                                // Total stats
                                totalStats.source += sourceLines;
                                totalStats.comment += stats.comment || 0;
                                totalStats.blank += stats.blank || 0;
                                totalStats.total += stats.total || 0;
                            }
                        } catch (fileError) {
                            // Skip files that can't be read or parsed
                        }
                    }
                }
            }
        } catch (dirError) {
            // Skip directories that can't be read
        }
    }

    try {
        walkDir(repoPath);

        if (detailed) {
            return {
                total: totalSourceLines,
                byLanguage,
                byDirectory,
                stats: totalStats
            };
        }

        return totalSourceLines;
    } catch (error) {
        return detailed ? { total: 0, byLanguage: {}, byDirectory: {}, stats: { source: 0, comment: 0, blank: 0, total: 0 } } : 0;
    }
}

/**
 * Get commit branch information
 */
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

/**
 * Parse git log output
 */
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

/**
 * Calculate timing statistics
 */
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

/**
 * Generate user statistics
 */
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

/**
 * Generate project statistics
 */
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

/**
 * Create commit URL for external repository
 */
function createCommitUrl(repoUrl, hash) {
    if (!repoUrl) return "#";
    if (repoUrl.includes("github.com") || repoUrl.includes("gitlab.com")) {
        return `${repoUrl}/commit/${hash}`;
    }
    return "#";
}

/**
 * Create branch URL for external repository
 */
function createBranchUrl(repoUrl, branchName) {
    if (!repoUrl || !branchName || branchName === "unknown") return "#";
    let cleanBranchName = branchName.startsWith("origin/") ? branchName.substring(7) : branchName;
    cleanBranchName = encodeURIComponent(cleanBranchName);
    if (repoUrl.includes("github.com") || repoUrl.includes("gitlab.com")) {
        return `${repoUrl}/tree/${cleanBranchName}`;
    }
    return "#";
}

module.exports = {
    parsePeriodToGitSince,
    findGitRepositories,
    getRepoInfo,
    getLinesOfCode,
    getCommitBranchInfo,
    parseGitLog,
    calculateTimingStats,
    generateUserStats,
    generateProjectStats,
    createCommitUrl,
    createBranchUrl
};