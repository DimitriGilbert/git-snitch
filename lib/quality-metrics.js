/**
 * Code quality metrics and analysis
 * Provides insights into code health, team dynamics, and technical debt
 */

/**
 * Calculate comprehensive code quality metrics
 */
function calculateCodeQualityMetrics(commits, loc, users) {
    const metrics = {
        churnRate: calculateChurnRate(commits),
        busFactor: calculateBusFactor(users || commits),
        ownershipConcentration: calculateGiniCoefficient(commits),
        avgCommitSize: calculateAvgCommitSize(commits),
        codeStability: calculateCodeStability(commits),
        commentRatio: loc?.stats ? calculateCommentRatio(loc.stats) : 0
    };

    // Calculate overall health score
    metrics.healthScore = calculateHealthScore(metrics, commits);

    return metrics;
}

/**
 * Calculate churn rate (average lines changed per commit)
 */
function calculateChurnRate(commits) {
    if (!commits || commits.length === 0) return 0;

    const totalChurn = commits.reduce((sum, c) => {
        return sum + (c.additions || 0) + (c.deletions || 0);
    }, 0);

    return Math.round(totalChurn / commits.length);
}

/**
 * Calculate bus factor (number of contributors needed for 80% coverage)
 */
function calculateBusFactor(contributors) {
    if (!contributors || contributors.length === 0) return 0;

    let commitCounts;

    // Handle both array of commits and array of users
    if (contributors[0]?.totalCommits !== undefined) {
        // Array of users
        commitCounts = contributors
            .map(u => u.totalCommits)
            .sort((a, b) => b - a);
    } else {
        // Array of commits
        const authorCommits = {};
        contributors.forEach(c => {
            const key = c.email || c.author;
            authorCommits[key] = (authorCommits[key] || 0) + 1;
        });
        commitCounts = Object.values(authorCommits).sort((a, b) => b - a);
    }

    const totalCommits = commitCounts.reduce((sum, count) => sum + count, 0);
    const threshold = totalCommits * 0.8;

    let sum = 0;
    let count = 0;

    for (const commitCount of commitCounts) {
        sum += commitCount;
        count++;
        if (sum >= threshold) break;
    }

    return count;
}

/**
 * Calculate Gini coefficient for code ownership concentration
 * 0 = perfect equality, 1 = perfect inequality
 */
function calculateGiniCoefficient(commits) {
    if (!commits || commits.length === 0) return 0;

    const contributions = {};
    commits.forEach(c => {
        const key = c.email || c.author;
        contributions[key] = (contributions[key] || 0) + (c.additions || 0);
    });

    const values = Object.values(contributions).sort((a, b) => a - b);
    const n = values.length;

    if (n === 0) return 0;

    const sum = values.reduce((a, b) => a + b, 0);
    if (sum === 0) return 0;

    let numerator = 0;
    values.forEach((val, i) => {
        numerator += (n - i) * val;
    });

    const gini = (2 * numerator) / (n * sum) - (n + 1) / n;
    return Math.round(gini * 100) / 100;
}

/**
 * Calculate average commit size
 */
function calculateAvgCommitSize(commits) {
    if (!commits || commits.length === 0) return 0;

    const totalAdditions = commits.reduce((sum, c) => sum + (c.additions || 0), 0);
    return Math.round(totalAdditions / commits.length);
}

/**
 * Calculate code stability (ratio of additions to deletions)
 */
function calculateCodeStability(commits) {
    if (!commits || commits.length === 0) return 1;

    const totalAdditions = commits.reduce((sum, c) => sum + (c.additions || 0), 0);
    const totalDeletions = commits.reduce((sum, c) => sum + (c.deletions || 0), 0);

    if (totalDeletions === 0) return totalAdditions > 0 ? 2 : 1;

    return Math.round((totalAdditions / totalDeletions) * 100) / 100;
}

/**
 * Calculate comment ratio
 */
function calculateCommentRatio(stats) {
    if (!stats || !stats.source || stats.source === 0) return 0;
    return Math.round((stats.comment / stats.source) * 100 * 10) / 10;
}

/**
 * Calculate overall health score (0-100)
 */
function calculateHealthScore(metrics, commits) {
    let score = 100;

    // Deduct for low bus factor (risky)
    if (metrics.busFactor === 1) score -= 20;
    else if (metrics.busFactor === 2) score -= 10;

    // Deduct for high ownership concentration
    if (metrics.ownershipConcentration > 0.7) score -= 15;
    else if (metrics.ownershipConcentration > 0.5) score -= 8;

    // Deduct for very large commits (indicates poor atomic commits)
    if (metrics.avgCommitSize > 500) score -= 10;
    else if (metrics.avgCommitSize > 200) score -= 5;

    // Deduct for very low comment ratio
    if (metrics.commentRatio < 5) score -= 10;
    else if (metrics.commentRatio < 10) score -= 5;

    // Deduct for unstable code (too many deletions or too many additions)
    if (metrics.codeStability > 3 || metrics.codeStability < 0.5) score -= 10;

    // Deduct for very high churn
    if (metrics.churnRate > 1000) score -= 10;
    else if (metrics.churnRate > 500) score -= 5;

    return Math.max(0, Math.min(100, score));
}

/**
 * Get health score rating
 */
function getHealthScoreRating(score) {
    if (score >= 90) return { label: 'Excellent', color: '#22c55e', emoji: '🌟' };
    if (score >= 75) return { label: 'Good', color: '#22c55e', emoji: '✅' };
    if (score >= 60) return { label: 'Fair', color: '#f59e0b', emoji: '⚠️' };
    if (score >= 40) return { label: 'Poor', color: '#f97316', emoji: '⚠️' };
    return { label: 'Critical', color: '#dc2626', emoji: '❌' };
}

/**
 * Generate health recommendations
 */
function generateHealthRecommendations(metrics, commits) {
    const recommendations = [];

    if (metrics.busFactor <= 2) {
        recommendations.push({
            severity: 'high',
            category: 'Bus Factor',
            message: `Only ${metrics.busFactor} contributor(s) account for 80% of commits. Consider distributing knowledge and code ownership.`,
            action: 'Encourage pair programming and code reviews'
        });
    }

    if (metrics.ownershipConcentration > 0.6) {
        recommendations.push({
            severity: 'medium',
            category: 'Code Ownership',
            message: 'High code ownership concentration detected. Some contributors may be overworked.',
            action: 'Balance workload across team members'
        });
    }

    if (metrics.avgCommitSize > 300) {
        recommendations.push({
            severity: 'medium',
            category: 'Commit Size',
            message: `Average commit size is ${metrics.avgCommitSize} lines. Smaller, atomic commits are recommended.`,
            action: 'Break down changes into smaller, focused commits'
        });
    }

    if (metrics.commentRatio < 10) {
        recommendations.push({
            severity: 'low',
            category: 'Documentation',
            message: `Comment ratio is ${metrics.commentRatio}%. Consider adding more code documentation.`,
            action: 'Add comments for complex logic and public APIs'
        });
    }

    if (metrics.churnRate > 500) {
        recommendations.push({
            severity: 'medium',
            category: 'Code Churn',
            message: `High code churn detected (${metrics.churnRate} lines per commit). This may indicate unstable requirements.`,
            action: 'Review requirements and architecture decisions'
        });
    }

    return recommendations;
}

/**
 * Calculate technical debt indicators
 */
function calculateTechnicalDebt(commits, files) {
    const hotspots = files ? files.slice(0, 10) : [];

    return {
        hotspotCount: hotspots.length,
        avgHotspotChanges: hotspots.length > 0
            ? Math.round(hotspots.reduce((sum, f) => sum + f.changes, 0) / hotspots.length)
            : 0,
        filesWithHighChurn: files ? files.filter(f => f.churn > 500).length : 0,
        multiAuthorFiles: files ? files.filter(f => f.authorCount > 3).length : 0
    };
}

module.exports = {
    calculateCodeQualityMetrics,
    calculateChurnRate,
    calculateBusFactor,
    calculateGiniCoefficient,
    calculateAvgCommitSize,
    calculateCodeStability,
    calculateCommentRatio,
    calculateHealthScore,
    getHealthScoreRating,
    generateHealthRecommendations,
    calculateTechnicalDebt
};
