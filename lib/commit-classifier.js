/**
 * Commit classification and analysis
 * Automatically categorizes commits based on message patterns
 */

/**
 * Classify a commit based on its message
 */
function classifyCommit(message) {
    if (!message) return 'other';

    const lowerMessage = message.toLowerCase();

    // Conventional Commits patterns
    const patterns = {
        feature: /^(feat|feature)(\(.+\))?:/i,
        bugfix: /^(fix|bugfix)(\(.+\))?:/i,
        refactor: /^refactor(\(.+\))?:/i,
        docs: /^docs(\(.+\))?:/i,
        test: /^test(\(.+\))?:/i,
        chore: /^chore(\(.+\))?:/i,
        style: /^style(\(.+\))?:/i,
        perf: /^perf(\(.+\))?:/i,
        ci: /^ci(\(.+\))?:/i,
        build: /^build(\(.+\))?:/i,
        revert: /^revert(\(.+\))?:/i
    };

    // Check conventional commit patterns first
    for (const [type, pattern] of Object.entries(patterns)) {
        if (pattern.test(message)) return type;
    }

    // Heuristic classification for non-conventional commits
    if (/\b(fix|bug|issue|error|resolve|patch)\b/i.test(lowerMessage)) return 'bugfix';
    if (/\b(add|new|create|implement|introduce)\b/i.test(lowerMessage)) return 'feature';
    if (/\b(update|change|modify|improve|enhance|refine)\b/i.test(lowerMessage)) return 'refactor';
    if (/\b(test|spec|testing)\b/i.test(lowerMessage)) return 'test';
    if (/\b(doc|readme|comment|documentation)\b/i.test(lowerMessage)) return 'docs';
    if (/\b(format|indent|whitespace|prettier|eslint)\b/i.test(lowerMessage)) return 'style';
    if (/\b(merge|rebase)\b/i.test(lowerMessage)) return 'merge';
    if (/\b(release|version|bump)\b/i.test(lowerMessage)) return 'release';

    return 'other';
}

/**
 * Generate commit type breakdown
 */
function generateCommitTypeBreakdown(commits) {
    const breakdown = {};

    commits.forEach(c => {
        const type = classifyCommit(c.message);
        breakdown[type] = (breakdown[type] || 0) + 1;
    });

    return breakdown;
}

/**
 * Get commit type statistics with percentages
 */
function getCommitTypeStats(commits) {
    const breakdown = generateCommitTypeBreakdown(commits);
    const total = commits.length;

    return Object.entries(breakdown)
        .map(([type, count]) => ({
            type,
            count,
            percentage: ((count / total) * 100).toFixed(1)
        }))
        .sort((a, b) => b.count - a.count);
}

/**
 * Extract ticket/issue references from commit message
 */
function extractIssueReferences(message, config = null) {
    const references = [];

    // JIRA pattern: PROJ-123
    const jiraPattern = /([A-Z]+-\d+)/g;
    const jiraMatches = message.match(jiraPattern);
    if (jiraMatches) {
        jiraMatches.forEach(ref => {
            references.push({
                type: 'jira',
                ref,
                url: config?.get('integrations.jira.baseUrl')
                    ? `${config.get('integrations.jira.baseUrl')}/browse/${ref}`
                    : null
            });
        });
    }

    // GitHub/GitLab issue pattern: #123
    const issuePattern = /#(\d+)/g;
    const issueMatches = message.match(issuePattern);
    if (issueMatches) {
        issueMatches.forEach(ref => {
            references.push({
                type: 'issue',
                ref,
                number: ref.substring(1)
            });
        });
    }

    return references;
}

/**
 * Analyze commit message quality
 */
function analyzeCommitMessageQuality(commits) {
    let hasConventionalCommits = 0;
    let hasGoodLength = 0; // 10-72 chars for summary
    let hasDescription = 0;
    let hasPunctuation = 0;

    commits.forEach(c => {
        const message = c.message || '';
        const lines = message.split('\n');
        const summary = lines[0];

        // Check conventional commits
        if (/^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\(.+\))?:/i.test(summary)) {
            hasConventionalCommits++;
        }

        // Check summary length (good practice: 10-72 chars)
        if (summary.length >= 10 && summary.length <= 72) {
            hasGoodLength++;
        }

        // Check if has description (more than just summary)
        if (lines.length > 1 && lines.slice(1).some(l => l.trim().length > 0)) {
            hasDescription++;
        }

        // Check if summary ends with punctuation (should not)
        if (!/[.!?]$/.test(summary.trim())) {
            hasPunctuation++;
        }
    });

    const total = commits.length;
    return {
        conventionalCommitsPercent: ((hasConventionalCommits / total) * 100).toFixed(1),
        goodLengthPercent: ((hasGoodLength / total) * 100).toFixed(1),
        hasDescriptionPercent: ((hasDescription / total) * 100).toFixed(1),
        noPunctuationPercent: ((hasPunctuation / total) * 100).toFixed(1),
        overallScore: Math.round(
            (hasConventionalCommits * 0.3 +
             hasGoodLength * 0.25 +
             hasDescription * 0.25 +
             hasPunctuation * 0.2) / total * 100
        )
    };
}

/**
 * Find most common commit patterns
 */
function findCommitPatterns(commits) {
    const patterns = {
        startsWithVerb: 0,
        hasIssueReference: 0,
        isOneWord: 0,
        isMergeCommit: 0,
        isVerbose: 0 // > 100 chars
    };

    commits.forEach(c => {
        const message = c.message || '';
        const summary = message.split('\n')[0];

        // Starts with verb
        if (/^(add|fix|update|remove|refactor|implement|create|modify|improve|enhance)/i.test(summary)) {
            patterns.startsWithVerb++;
        }

        // Has issue reference
        if (/#\d+|[A-Z]+-\d+/.test(message)) {
            patterns.hasIssueReference++;
        }

        // Is one word
        if (summary.trim().split(/\s+/).length === 1) {
            patterns.isOneWord++;
        }

        // Is merge commit
        if (/^merge\s/i.test(summary)) {
            patterns.isMergeCommit++;
        }

        // Is verbose
        if (summary.length > 100) {
            patterns.isVerbose++;
        }
    });

    const total = commits.length;
    return Object.entries(patterns).map(([pattern, count]) => ({
        pattern,
        count,
        percentage: ((count / total) * 100).toFixed(1)
    }));
}

module.exports = {
    classifyCommit,
    generateCommitTypeBreakdown,
    getCommitTypeStats,
    extractIssueReferences,
    analyzeCommitMessageQuality,
    findCommitPatterns
};
