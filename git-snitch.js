#!/usr/bin/env node

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    startDate: null,
    endDate: null,
    output: null,
    allBranches: false,
    branches: [], // To store specific branches if -b/--branch is used
    help: false,
    sortBy: "date", // New option: 'date' (default), 'additions', 'deletions'
    sortOrder: "desc", // New option: 'asc', 'desc' (default)
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
          console.warn(
            `Warning: Invalid value for --sort-by: "${sortByValue}". Using default "date".`,
          );
        }
        break;
      case "--sort-order":
        const sortOrderValue = args[++i].toLowerCase();
        if (["asc", "desc"].includes(sortOrderValue)) {
          options.sortOrder = sortOrderValue;
        } else {
          console.warn(
            `Warning: Invalid value for --sort-order: "${sortOrderValue}". Using default "desc".`,
          );
        }
        break;
      case "--help":
      case "-h":
        options.help = true;
        break;
      default:
        // Handle potential unknown args or malformed ones
        if (args[i].startsWith("-")) {
          console.warn(`Warning: Unknown option "${args[i]}". Ignoring.`);
        }
    }
  }

  // Handle conflict: if --all-branches AND specific branches are requested
  if (options.allBranches && options.branches.length > 0) {
    console.warn(
      "Warning: Both --all-branches and specific --branch options were provided.",
    );
    console.warn("       --all-branches will take precedence.");
    options.branches = []; // Clear specific branches as --all-branches covers them
  }

  return options;
}

function showHelp() {
  console.log(`
Git Report Generator

Usage: node git-report.js [options]

Options:
  -s, --start-date <date>    Start date (YYYY-MM-DD)
  -e, --end-date <date>      End date (YYYY-MM-DD)
  -o, --output <file>        Output HTML file path
  -a, --all-branches         Include commits from all local and remote branches
  -b, --branch <name>        Include commits from a specific branch. Can be used multiple times.
                             (e.g., -b main -b develop origin/feature-x)
  --sort-by <criteria>       Sort commits by: date (default), additions, deletions
  --sort-order <order>       Sort order: asc (ascending), desc (descending, default)
  -h, --help                 Show this help message

Examples:
  node git-report.js                                 # Current branch only
  node git-report.js --all-branches                  # All branches
  node git-report.js --branch main --branch develop  # Specific branches
  node git-report.js -s 2024-01-01 -e 2024-12-31 -o report.html
  node git-report.js --sort-by additions --sort-order desc # Top commits by additions
`);
}

// Check if we're in a git repository
function checkGitRepo() {
  try {
    execSync("git rev-parse --git-dir", { stdio: "ignore" });
    return true;
  } catch (error) {
    return false;
  }
}

// Get git repository info
function getRepoInfo() {
  try {
    let remoteUrl = execSync("git config --get remote.origin.url", {
      encoding: "utf8",
    }).trim();

    // Convert SSH URL to HTTPS if applicable
    if (remoteUrl.startsWith("git@")) {
      const parts = remoteUrl.match(/git@([^:]+):([^/]+)\/(.+)\.git/);
      if (parts && parts.length === 4) {
        const host = parts[1];
        const owner = parts[2];
        const repo = parts[3];
        remoteUrl = `https://${host}/${owner}/${repo}`;
      }
    } else if (remoteUrl.endsWith(".git")) {
      remoteUrl = remoteUrl.slice(0, -4);
    }

    const repoName = path.basename(process.cwd());
    const currentBranch = execSync("git branch --show-current", {
      encoding: "utf8",
    }).trim();

    // Get first commit date (project start)
    const firstCommitDate = execSync(
      'git log --reverse --format="%ad" --date=iso | head -1',
      { encoding: "utf8" },
    ).trim();

    return {
      name: repoName,
      url: remoteUrl,
      currentBranch: currentBranch,
      startDate: firstCommitDate ? new Date(firstCommitDate) : null,
    };
  } catch (error) {
    return {
      name: path.basename(process.cwd()),
      url: "",
      currentBranch: "main", // Default to 'main' if not found
      startDate: null,
    };
  }
}

// Build git log command with date filters and branch options
function buildGitLogCommand(startDate, endDate, options) {
  // Use %D for ref names, like HEAD -> main, origin/main, tag: v1.0
  let cmd =
    'git log --pretty=format:"%H|%an|%ae|%ad|%s|%D" --date=iso --numstat';

  if (options.allBranches) {
    cmd += " --all"; // Include all local and remote branches
  } else if (options.branches.length > 0) {
    // If specific branches are provided, add them to the command
    cmd += " " + options.branches.map((b) => `'${b}'`).join(" ");
  } else {
    // Default to current branch if no branch options are specified
    // (git log without a ref defaults to HEAD/current branch)
  }

  if (startDate) {
    cmd += ` --since="${startDate}"`;
  }
  if (endDate) {
    cmd += ` --until="${endDate}"`;
  }

  return cmd;
}

/**
 * Determines the most appropriate branch name for a given commit hash
 * by querying git for branches that contain it.
 * Prioritizes local branches over remote, and main/master over others.
 * @param {string} commitHash The hash of the commit.
 * @returns {string} The displayable branch name, or 'unknown'.
 */
function getCommitBranchInfo(commitHash) {
  try {
    // Get all branches (local and remote) that contain this commit
    const output = execSync(`git branch -a --contains ${commitHash}`, {
      encoding: "utf8",
      stdio: "pipe", // Capture output, prevent direct stdout
    }).trim();

    const lines = output.split("\n").map((line) => line.trim());
    const branchCandidates = new Set();

    for (const line of lines) {
      if (line.length === 0) continue;

      let branchName = line.replace(/^\* /, ""); // Remove '*' prefix for current branch
      branchName = branchName.replace(/^remotes\/origin\//, "origin/"); // Normalize remote/origin/ to origin/

      // Exclude HEAD pointers from candidates for display
      if (branchName.includes("HEAD ->")) continue;
      if (branchName === "HEAD") continue;

      branchCandidates.add(branchName);
    }

    if (branchCandidates.size === 0) {
      return "unknown"; // No branches found for this commit
    }

    // Prioritization logic:
    // 1. Current local branch (if any)
    const currentLocalBranch = execSync("git branch --show-current", {
      encoding: "utf8",
      stdio: "pipe",
    }).trim();
    if (currentLocalBranch && branchCandidates.has(currentLocalBranch)) {
      return currentLocalBranch;
    }

    // 2. 'main' or 'master' local branch
    if (branchCandidates.has("main")) return "main";
    if (branchCandidates.has("master")) return "master";

    // 3. Other local branches
    const localBranches = Array.from(branchCandidates).filter(
      (b) => !b.startsWith("origin/"),
    );
    if (localBranches.length > 0) {
      return localBranches[0]; // Take the first one
    }

    // 4. 'origin/main' or 'origin/master' remote branch
    if (branchCandidates.has("origin/main")) return "origin/main";
    if (branchCandidates.has("origin/master")) return "origin/master";

    // 5. Other remote branches
    const remoteBranches = Array.from(branchCandidates).filter((b) =>
      b.startsWith("origin/"),
    );
    if (remoteBranches.length > 0) {
      return remoteBranches[0]; // Take the first one
    }

    // 6. Fallback to any remaining candidate (shouldn't happen often if above logic is comprehensive)
    return Array.from(branchCandidates)[0];
  } catch (error) {
    // If git command fails (e.g., commit not found, or detached HEAD on something obscure)
    return "unknown";
  }
}

// Parse git log output
function parseGitLog(output) {
  const commits = [];
  const lines = output.split("\n");
  let currentCommit = null;

  for (const line of lines) {
    // A commit header line now includes branch information separated by '|'
    // It should not start with digits (which would indicate file stats)
    if (line.includes("|") && !line.match(/^\d+\s+\d+\s+/)) {
      if (currentCommit) {
        commits.push(currentCommit);
      }

      const parts = line.split("|");
      const hash = parts[0];
      const author = parts[1];
      const email = parts[2];
      const date = parts[3];
      const message = parts[4];
      const refNamesRaw = parts[5] || ""; // Reference names from %D

      let displayBranch = "unknown";

      // FIRST ATTEMPT: Try to extract branch info directly from %D (refNamesRaw)
      // This is fast and often provides the most relevant current branch if available.
      const headBranchMatch = refNamesRaw.match(/HEAD -> ([\w\/\-\.]+)/);
      if (headBranchMatch && headBranchMatch[1]) {
        displayBranch = headBranchMatch[1];
      } else if (refNamesRaw.includes("origin/main")) {
        // Check for common remote main
        displayBranch = "origin/main";
      } else if (refNamesRaw.includes("main")) {
        // Check for common local main
        displayBranch = "main";
      } else if (refNamesRaw.includes("origin/master")) {
        // Check for common remote master
        displayBranch = "origin/master";
      } else if (refNamesRaw.includes("master")) {
        // Check for common local master
        displayBranch = "master";
      } else {
        // More generic approach for other named refs in %D
        const generalRefMatch = refNamesRaw.match(
          /(?:(?:origin\/)|(?:tag:))?([\w\/\-\.]+)/,
        );
        if (
          generalRefMatch &&
          generalRefMatch[1] &&
          generalRefMatch[1] !== "HEAD"
        ) {
          let candidate = generalRefMatch[1];
          if (
            refNamesRaw.includes(`origin/${candidate}`) &&
            !candidate.startsWith("origin/")
          ) {
            candidate = `origin/${candidate}`;
          }
          displayBranch = candidate;
        }
      }

      // SECOND ATTEMPT (Fallback): If %D didn't give a clear branch,
      // query `git branch --contains` for this commit.
      // This is the slower, but more accurate, fallback.
      if (displayBranch === "unknown" && hash) {
        displayBranch = getCommitBranchInfo(hash);
      }

      currentCommit = {
        hash: hash,
        author: author,
        email: email,
        date: new Date(date),
        message: message,
        branch: displayBranch,
        additions: 0,
        deletions: 0,
        files: [],
      };
    } else if (line.match(/^\d+\s+\d+\s+/) && currentCommit) {
      // This is a file change line
      const parts = line.split("\t");
      if (parts.length >= 3) {
        const additions = parseInt(parts[0]) || 0;
        const deletions = parseInt(parts[1]) || 0;
        const filename = parts[2];

        currentCommit.additions += additions;
        currentCommit.deletions += deletions;
        currentCommit.files.push({ filename, additions, deletions });
      }
    }
  }

  if (currentCommit) {
    commits.push(currentCommit);
  }

  return commits;
}

// Sort commits based on options
function sortCommits(commits, sortBy, sortOrder) {
  return commits.sort((a, b) => {
    let valA, valB;

    switch (sortBy) {
      case "additions":
        valA = a.additions;
        valB = b.additions;
        break;
      case "deletions":
        valA = a.deletions;
        valB = b.deletions;
        break;
      case "date":
      default:
        valA = a.date.getTime();
        valB = b.date.getTime();
        break;
    }

    if (sortOrder === "asc") {
      return valA - valB;
    } else {
      // 'desc'
      return valB - valA;
    }
  });
}

// Calculate time between commits
function calculateTimingStats(commits) {
  if (commits.length < 2) return { avgHours: 0, avgDays: 0 };

  // Ensure commits are sorted by date for timing calculation
  const sortedCommits = [...commits].sort((a, b) => a.date - b.date);
  let totalTimeDiff = 0;

  for (let i = 1; i < sortedCommits.length; i++) {
    totalTimeDiff += sortedCommits[i].date - sortedCommits[i - 1].date;
  }

  const avgMilliseconds = totalTimeDiff / (sortedCommits.length - 1);
  const avgHours = Math.round(avgMilliseconds / (1000 * 60 * 60));
  const avgDays = Math.round((avgHours / 24) * 10) / 10;

  return { avgHours, avgDays };
}

// Generate user statistics
function generateUserStats(commits) {
  const users = new Map();

  for (const commit of commits) {
    const userKey = `${commit.author}|${commit.email}`;

    if (!users.has(userKey)) {
      users.set(userKey, {
        name: commit.author,
        email: commit.email,
        commits: [], // Store actual commit objects for per-user commits list
        totalCommits: 0,
        totalAdditions: 0,
        totalDeletions: 0,
      });
    }

    const user = users.get(userKey);
    user.commits.push(commit); // Add the commit object
    user.totalCommits++;
    user.totalAdditions += commit.additions;
    user.totalDeletions += commit.deletions;
  }

  // Convert to array and calculate averages + timing
  return Array.from(users.values()).map((user) => {
    // Sort user's commits by date for consistent timing and display (most recent first)
    user.commits.sort((a, b) => b.date - a.date);
    const timing = calculateTimingStats(user.commits); // Calculate timing based on user's own commits
    return {
      ...user,
      avgAdditions:
        user.totalCommits > 0
          ? Math.round(user.totalAdditions / user.totalCommits)
          : 0,
      avgDeletions:
        user.totalCommits > 0
          ? Math.round(user.totalDeletions / user.totalCommits)
          : 0,
      avgTimeBetweenCommits: timing,
    };
  });
}

// Generate overall statistics
function generateOverallStats(commits, repoStartDate) {
  const totalCommits = commits.length;
  const totalAdditions = commits.reduce(
    (sum, commit) => sum + commit.additions,
    0,
  );
  const totalDeletions = commits.reduce(
    (sum, commit) => sum + commit.deletions,
    0,
  );
  const timing = calculateTimingStats(commits);

  // Calculate project age
  let projectAge = null;
  if (repoStartDate) {
    const now = new Date();
    const ageInMilliseconds = now - repoStartDate;
    const ageInDays = Math.floor(ageInMilliseconds / (1000 * 60 * 60 * 24));
    projectAge = {
      days: ageInDays,
      months: Math.floor(ageInDays / 30),
      years: Math.floor(ageInDays / 365),
    };
  }

  return {
    totalCommits,
    totalAdditions,
    totalDeletions,
    avgAdditions:
      totalCommits > 0 ? Math.round(totalAdditions / totalCommits) : 0,
    avgDeletions:
      totalCommits > 0 ? Math.round(totalDeletions / totalCommits) : 0,
    avgTimeBetweenCommits: timing,
    projectAge,
  };
}

// Create GitHub/GitLab commit URL
function createCommitUrl(repoUrl, hash) {
  if (!repoUrl) return "#";

  let baseUrl = repoUrl;
  if (baseUrl.includes("github.com")) {
    return `${baseUrl}/commit/${hash}`;
  }
  if (baseUrl.includes("gitlab.com")) {
    return `${baseUrl}/-/commit/${hash}`;
  }

  return "#"; // Fallback for other platforms
}

// Create GitHub/GitLab branch URL
function createBranchUrl(repoUrl, branchName) {
  if (!repoUrl || !branchName || branchName === "unknown") return "#";

  // Remove "origin/" prefix if it's a remote branch name, as the URL usually uses the branch's local name
  let cleanBranchName = branchName.startsWith("origin/")
    ? branchName.substring(7)
    : branchName;
  cleanBranchName = encodeURIComponent(cleanBranchName); // Encode branch name for URL safety

  let baseUrl = repoUrl;
  if (baseUrl.includes("github.com")) {
    return `${baseUrl}/tree/${cleanBranchName}`;
  }
  if (baseUrl.includes("gitlab.com")) {
    return `${baseUrl}/-/tree/${cleanBranchName}`;
  }

  return "#"; // Fallback for other platforms
}

// Create GitHub/GitLab user profile URL
function createUserProfileUrl(repoUrl, username) {
  if (!repoUrl || !username) return "#";

  let baseUrl = repoUrl;
  if (baseUrl.includes("github.com")) {
    // Assuming format https://github.com/owner/repo
    return `https://github.com/${encodeURIComponent(username)}`;
  } else if (baseUrl.includes("gitlab.com")) {
    // Assuming format https://gitlab.com/owner/repo
    return `https://gitlab.com/${encodeURIComponent(username)}`;
  }

  return "#"; // Fallback for other platforms
}

// Generate HTML report
function generateHTMLReport(data) {
  let branchInfoText = "";
  if (data.options.allBranches) {
    branchInfoText = "All branches";
  } else if (data.options.branches.length > 0) {
    branchInfoText = `Branches: ${data.options.branches.join(", ")}`;
  } else {
    branchInfoText = `Current branch: ${data.repo.currentBranch}`;
  }

  // Determine the default sorting order for the commit list
  const defaultCommitSortOrder =
    data.options.sortBy === "date" && data.options.sortOrder === "desc";

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${data.repo.name} Git Report</title>
    <style>
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
            max-width: 1200px;
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
            flex-wrap: wrap; /* Allow tabs to wrap */
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
            white-space: nowrap; /* Prevent tab text from breaking */
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

        .user-card {
            background: #334155;
            border: 1px solid #475569;
            border-radius: 12px;
            padding: 25px;
            margin-bottom: 20px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            transition: transform 0.2s, box-shadow 0.2s;
        }

        .user-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(34, 197, 94, 0.15);
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

        .user-email {
            color: #94a3b8;
            font-size: 0.9em;
        }

        .user-email a {
            color: #94a3b8;
            text-decoration: none;
        }

        .user-email a:hover {
            text-decoration: underline;
        }

        .user-stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
            gap: 15px;
            margin-bottom: 20px;
        }

        .user-stat {
            text-align: center;
            padding: 15px;
            background: #475569;
            border-radius: 8px;
        }

        .user-stat-number {
            font-size: 1.5em;
            font-weight: bold;
            color: #22c55e;
        }

        .user-stat-label {
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
            transition: background 0.2s;
        }

        .commit-hash:hover {
            background: #1d4ed8;
        }

        .commit-message {
            flex: 1;
            font-size: 0.9em;
            color: #e2e8f0;
        }

        .commit-branch {
            font-family: 'Monaco', 'Menlo', monospace;
            background: #f97316; /* Orange color for branch */
            color: white;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 0.8em;
            margin-right: 12px;
            text-decoration: none;
            white-space: nowrap;
        }

        .commit-branch:hover {
             background: #ea580c;
        }

        .commit-author {
            color: #22c55e;
            font-weight: 500;
            cursor: pointer;
            text-decoration: underline;
            text-decoration-color: transparent;
            transition: text-decoration-color 0.2s;
        }

        .commit-author:hover {
            text-decoration-color: #22c55e;
        }

        .commit-date {
            font-size: 0.8em;
            color: #94a3b8;
            margin-top: 4px;
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

        .overall-commits {
            background: #334155;
            border: 1px solid #475569;
            border-radius: 12px;
            padding: 25px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        }

        .date-range {
            background: #1e40af;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 30px;
            text-align: center;
            color: white;
            font-weight: 500;
        }

        .project-info {
            background: #475569;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 30px;
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
        }

        .project-info-item {
            text-align: center;
        }

        .project-info-label {
            color: #94a3b8;
            font-size: 0.9em;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 8px;
        }

        .project-info-value {
            color: #22c55e;
            font-size: 1.2em;
            font-weight: bold;
        }

        ::-webkit-scrollbar {
            width: 8px;
        }

        ::-webkit-scrollbar-track {
            background: #1e293b;
            border-radius: 4px;
        }

        ::-webkit-scrollbar-thumb {
            background: #22c55e;
            border-radius: 4px;
        }

        ::-webkit-scrollbar-thumb:hover {
            background: #16a34a;
        }

        @media (max-width: 768px) {
            .container {
                margin: 10px;
                padding: 15px;
            }

            .header {
                margin: -15px -15px 30px -15px;
                padding: 20px;
            }

            .header h1 {
                font-size: 2em;
            }

            .stats-grid {
                grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                gap: 15px;
            }

            .user-header {
                flex-direction: column;
                text-align: center;
            }

            .user-avatar {
                margin-right: 0;
                margin-bottom: 10px;
            }

            .tabs {
                flex-wrap: wrap;
            }

            .tab {
                padding: 8px 16px;
                font-size: 0.9rem;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 ${data.repo.name} Git Report</h1>
            <p>${branchInfoText}</p>
            ${
              data.repo.url
                ? `<p><a href="${data.repo.url}" target="_blank" style="color: white; opacity: 0.9; text-decoration: underline;">${data.repo.url}</a></p>`
                : ""
            }
        </div>

        ${
          data.dateRange
            ? `<div class="date-range">📅 Report Period: ${data.dateRange}</div>`
            : ""
        }

        <div class="project-info">
            ${
              data.repo.startDate
                ? `
                <div class="project-info-item">
                    <div class="project-info-label">Project Started</div>
                    <div class="project-info-value">${data.repo.startDate.toLocaleDateString()}</div>
                </div>
            `
                : ""
            }
            ${
              data.overall.projectAge
                ? `
                <div class="project-info-item">
                    <div class="project-info-label">Project Age</div>
                    <div class="project-info-value">
                        ${
                          data.overall.projectAge.years > 0
                            ? data.overall.projectAge.years + "y "
                            : ""
                        }
                        ${
                          data.overall.projectAge.months % 12 > 0
                            ? (data.overall.projectAge.months % 12) + "m "
                            : ""
                        }
                        ${data.overall.projectAge.days % 30}d
                    </div>
                </div>
            `
                : ""
            }
            <div class="project-info-item">
                <div class="project-info-label">Avg Time Between Commits</div>
                <div class="project-info-value">${
                  data.overall.avgTimeBetweenCommits.avgDays > 0
                    ? data.overall.avgTimeBetweenCommits.avgDays + " days"
                    : data.overall.avgTimeBetweenCommits.avgHours + " hours"
                }</div>
            </div>
        </div>

        <div class="stats-grid">
            <div class="stat-card">
                <span class="stat-number">${data.overall.totalCommits}</span>
                <div class="stat-label">Total Commits</div>
            </div>
            <div class="stat-card">
                <span class="stat-number">${data.overall.avgAdditions}</span>
                <div class="stat-label">Avg Additions</div>
            </div>
            <div class="stat-card">
                <span class="stat-number">${data.overall.avgDeletions}</span>
                <div class="stat-label">Avg Deletions</div>
            </div>
            <div class="stat-card">
                <span class="stat-number">${data.users.length}</span>
                <div class="stat-label">Contributors</div>
            </div>
        </div>

        <div class="section">
            <div class="tabs main-tabs">
                <button class="tab" data-tab-target="all-commits">📝 All Commits</button>
                <button class="tab" data-tab-target="contributors">👥 Contributors</button>
            </div>

            <div id="all-commits" class="tab-content">
                <div class="overall-commits">
                    <div class="commits-list" style="max-height: 600px;">
                        ${data.commits
                          .map(
                            (commit) => `
                            <div class="commit-item">
                                <a href="${createCommitUrl(data.repo.url, commit.hash)}" class="commit-hash" target="_blank">
                                    ${commit.hash.substring(0, 7)}
                                </a>
                                ${
                                  commit.branch && commit.branch !== "unknown"
                                    ? `<a href="${createBranchUrl(data.repo.url, commit.branch)}" class="commit-branch" target="_blank">${commit.branch}</a>`
                                    : ""
                                }
                                <div class="commit-message">
                                    <span class="commit-author" data-author-name="${commit.author.replace(
                                      /'/g,
                                      "\\'",
                                    )}">
                                        ${commit.author}
                                    </span> - ${commit.message}
                                    <div class="commit-date">
                                        ${commit.date.toLocaleDateString()} ${commit.date.toLocaleTimeString()}
                                    </div>
                                </div>
                                <div class="commit-stats">
                                    <span class="commit-stat additions">+${
                                      commit.additions
                                    }</span>
                                    <span class="commit-stat deletions">-${
                                      commit.deletions
                                    }</span>
                                </div>
                            </div>
                        `,
                          )
                          .join("")}
                    </div>
                </div>
            </div>

            <div id="contributors" class="tab-content">
                <div class="tabs user-tabs">
                    ${data.users
                      .map(
                        (user, index) => `
                        <button class="tab" data-user-tab-target="user-${index}">${user.name}</button>
                    `,
                      )
                      .join("")}
                </div>

                ${data.users
                  .map(
                    (user, index) => `
                    <div id="user-${index}" class="tab-content user-tab">
                        <div class="user-card">
                            <div class="user-header">
                                <div class="user-avatar">${user.name
                                  .charAt(0)
                                  .toUpperCase()}</div>
                                <div class="user-info">
                                    <h3>${user.name}</h3>
                                    <div class="user-email">
                                        ${user.email}
                                        ${
                                          createUserProfileUrl(
                                            data.repo.url,
                                            user.name,
                                          ) !== "#"
                                            ? `<br><a href="${createUserProfileUrl(
                                                data.repo.url,
                                                user.name,
                                              )}" target="_blank">View Profile</a>`
                                            : ""
                                        }
                                    </div>
                                </div>
                            </div>

                            <div class="user-stats">
                                <div class="user-stat">
                                    <div class="user-stat-number">${
                                      user.totalCommits
                                    }</div>
                                    <div class="user-stat-label">Commits</div>
                                </div>
                                <div class="user-stat">
                                    <div class="user-stat-number">${
                                      user.avgAdditions
                                    }</div>
                                    <div class="user-stat-label">Avg Additions</div>
                                </div>
                                <div class="user-stat">
                                    <div class="user-stat-number">${
                                      user.totalAdditions
                                    }</div>
                                    <div class="user-stat-label">Total Additions</div>
                                </div>
                                <div class="user-stat">
                                    <div class="user-stat-number">${
                                      user.totalDeletions
                                    }</div>
                                    <div class="user-stat-label">Total Deletions</div>
                                </div>
                                <div class="user-stat">
                                    <div class="user-stat-number">${
                                      user.avgTimeBetweenCommits.avgDays > 0
                                        ? user.avgTimeBetweenCommits.avgDays +
                                          "d"
                                        : user.avgTimeBetweenCommits.avgHours +
                                          "h"
                                    }</div>
                                    <div class="user-stat-label">Avg Time Between</div>
                                </div>
                            </div>

                            <div class="commits-list">
                                <h4 style="margin-bottom: 15px; color: #f1f5f9;">All Commits (${
                                  user.totalCommits
                                })</h4>
                                ${user.commits
                                  .map(
                                    (commit) => `
                                    <div class="commit-item">
                                        <a href="${createCommitUrl(data.repo.url, commit.hash)}" class="commit-hash" target="_blank">
                                            ${commit.hash.substring(0, 7)}
                                        </a>
                                        ${
                                          commit.branch &&
                                          commit.branch !== "unknown"
                                            ? `<a href="${createBranchUrl(data.repo.url, commit.branch)}" class="commit-branch" target="_blank">${commit.branch}</a>`
                                            : ""
                                        }
                                        <div class="commit-message">
                                            ${commit.message}
                                            <div class="commit-date">
                                                ${commit.date.toLocaleDateString()} ${commit.date.toLocaleTimeString()}
                                            </div>
                                        </div>
                                        <div class="commit-stats">
                                            <span class="commit-stat additions">+${
                                              commit.additions
                                            }</span>
                                            <span class="commit-stat deletions">-${
                                              commit.deletions
                                            }</span>
                                        </div>
                                    </div>
                                `,
                                  )
                                  .join("")}
                            </div>
                        </div>
                    </div>
                `,
                  )
                  .join("")}
            </div>
        </div>
    </div>

    <script>
        document.addEventListener('DOMContentLoaded', function() {
            // Main tab switching logic
            document.querySelectorAll('.main-tabs .tab').forEach(button => {
                button.addEventListener('click', function() {
                    const targetTabId = this.dataset.tabTarget;

                    // Deactivate all main tabs and contents
                    document.querySelectorAll('.main-tabs .tab').forEach(btn => btn.classList.remove('active'));
                    document.querySelectorAll('.section > .tab-content').forEach(content => content.classList.remove('active'));

                    // Activate clicked tab and its content
                    this.classList.add('active');
                    document.getElementById(targetTabId).classList.add('active');

                    // If 'Contributors' tab is activated, open the first user tab by default
                    if (targetTabId === 'contributors') {
                        const firstUserTabButton = document.querySelector('.user-tabs .tab');
                        if (firstUserTabButton) {
                            firstUserTabButton.click(); // Programmatically click the first user tab
                        }
                    }
                });
            });

            // User tab switching logic (inside Contributors tab)
            document.querySelectorAll('.user-tabs .tab').forEach(button => {
                button.addEventListener('click', function() {
                    const targetUserTabId = this.dataset.userTabTarget;

                    // Deactivate all user tabs and contents
                    document.querySelectorAll('.user-tabs .tab').forEach(btn => btn.classList.remove('active'));
                    document.querySelectorAll('#contributors .user-tab').forEach(content => content.classList.remove('active'));

                    // Activate clicked user tab and its content
                    this.classList.add('active');
                    document.getElementById(targetUserTabId).classList.add('active');
                });
            });

            // Handle clicking on author name in commit list to open contributor tab
            document.querySelectorAll('.commit-author').forEach(authorSpan => {
                authorSpan.addEventListener('click', function() {
                    const authorName = this.dataset.authorName;

                    // Activate the 'Contributors' main tab first
                    document.querySelector('.main-tabs .tab[data-tab-target="contributors"]').click();

                    // Find and activate the specific user tab
                    setTimeout(() => { // Small delay to allow main tab transition
                        const userTabButtons = document.querySelectorAll('.user-tabs .tab');
                        userTabButtons.forEach(button => {
                            // Trim the button text content to remove potential whitespace
                            if (button.textContent.trim() === authorName) {
                                button.click(); // Programmatically click the user's tab
                            }
                        });
                    }, 50); // Adjust delay if needed
                });
            });

            // Set initial active tabs
            // Check if the default sorting order is 'desc' by date to determine initial tab
            const defaultSortOrderIsDescDate = ${defaultCommitSortOrder};
            if (defaultSortOrderIsDescDate) {
                 // If default is desc by date, commits are already in desired order, show all commits tab
                document.querySelector('.main-tabs .tab[data-tab-target="all-commits"]').click();
            } else {
                // If sorted by something else, default to contributors or just keep all-commits active
                // For now, let's just default to all-commits, or you can pick 'contributors' based on preference
                document.querySelector('.main-tabs .tab[data-tab-target="all-commits"]').click();
            }

        });
    </script>
</body>
</html>`;
}

// Open file in default browser
function openInBrowser(filePath) {
  const platform = os.platform();
  let command;

  switch (platform) {
    case "darwin":
      command = `open "${filePath}"`;
      break;
    case "win32":
      command = `start "" "${filePath}"`;
      break;
    default:
      command = `xdg-open "${filePath}"`;
  }

  try {
    execSync(command);
    console.log(`🌐 Report opened in default browser`);
  } catch (error) {
    console.log(`📁 Report saved to: ${filePath}`);
  }
}

// Main function
function main() {
  const options = parseArgs();

  if (options.help) {
    showHelp();
    return;
  }

  console.log("🔍 Analyzing git repository...");

  if (!checkGitRepo()) {
    console.error(
      "❌ Error: Not a git repository. Please run this command in a git repository.",
    );
    process.exit(1);
  }

  try {
    // Get repository info
    const repoInfo = getRepoInfo();
    console.log(`📂 Repository: ${repoInfo.name}`);
    if (options.allBranches) {
      console.log("  Scope: All branches");
    } else if (options.branches.length > 0) {
      console.log(`  Scope: Specific branches: ${options.branches.join(", ")}`);
    } else {
      console.log(`  Scope: Current branch: ${repoInfo.currentBranch}`);
    }

    // Build and execute git log command
    const gitLogCmd = buildGitLogCommand(
      options.startDate,
      options.endDate,
      options,
    );
    const gitOutput = execSync(gitLogCmd, { encoding: "utf8" });

    // Parse git log output
    let commits = parseGitLog(gitOutput);
    console.log(`📊 Found ${commits.length} commits`);

    if (commits.length === 0) {
      console.log("⚠️  No commits found for the specified date range.");
      return;
    }

    // Sort commits based on user options
    commits = sortCommits(commits, options.sortBy, options.sortOrder);
    console.log(`Sorting commits by: ${options.sortBy} (${options.sortOrder})`);

    // Generate statistics
    const userStats = generateUserStats(commits);
    const overallStats = generateOverallStats(commits, repoInfo.startDate); // Pass repoInfo.startDate
    console.log(`👥 Found ${userStats.length} contributors`);

    // Prepare data for report
    const reportData = {
      repo: repoInfo,
      commits: commits,
      users: userStats,
      overall: overallStats,
      options: options, // Pass options to HTML for displaying current branch vs all branches
      dateRange:
        options.startDate || options.endDate
          ? `${options.startDate || "Beginning"} to ${options.endDate || "Now"}`
          : null,
      generatedAt: new Date().toISOString(),
    };

    // Generate HTML report
    const htmlContent = generateHTMLReport(reportData);

    // Determine output file path
    let outputPath = options.output;
    if (!outputPath) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      outputPath = path.join(
        os.tmpdir(),
        `git-report-${repoInfo.name}-${timestamp}.html`,
      );
    }

    // Write HTML file
    fs.writeFileSync(outputPath, htmlContent);
    console.log(`✅ Report generated successfully!`);
    console.log(`📄 File: ${outputPath}`);

    // Open in browser if no specific output file was provided
    if (!options.output) {
      openInBrowser(outputPath);
    }
  } catch (error) {
    console.error("❌ Error generating report:", error.message);
    // Print stderr if available from execSync error
    if (error.stderr) {
      console.error("Git command stderr:", error.stderr.toString());
    }
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}
