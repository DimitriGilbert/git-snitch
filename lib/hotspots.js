/**
 * File hotspot detection and analysis
 * Identifies files that change frequently or have high technical debt
 */

/**
 * Find file hotspots from commits
 */
function findFileHotspots(commits, limit = 20) {
    if (!commits || commits.length === 0) return [];

    const fileStats = {};

    commits.forEach(c => {
        if (!c.files) return;

        c.files.forEach(f => {
            if (!fileStats[f.filename]) {
                fileStats[f.filename] = {
                    changes: 0,
                    additions: 0,
                    deletions: 0,
                    authors: new Set(),
                    lastChanged: c.date
                };
            }

            const stats = fileStats[f.filename];
            stats.changes++;
            stats.additions += f.additions || 0;
            stats.deletions += f.deletions || 0;
            stats.authors.add(c.email || c.author);

            // Track most recent change
            if (c.date > stats.lastChanged) {
                stats.lastChanged = c.date;
            }
        });
    });

    // Convert to array and calculate scores
    const hotspots = Object.entries(fileStats)
        .map(([filename, stats]) => {
            const authorCount = stats.authors.size;
            const churn = stats.additions + stats.deletions;

            // Hotspot score considers:
            // - Number of changes (frequency)
            // - Code churn (volume of changes)
            // - Number of authors (potential complexity)
            const hotspotScore = stats.changes * Math.log(churn + 1) * Math.sqrt(authorCount);

            return {
                filename,
                changes: stats.changes,
                additions: stats.additions,
                deletions: stats.deletions,
                churn,
                authorCount,
                authors: Array.from(stats.authors),
                lastChanged: stats.lastChanged,
                hotspotScore: Math.round(hotspotScore),
                riskLevel: calculateRiskLevel(stats.changes, churn, authorCount)
            };
        })
        .sort((a, b) => b.hotspotScore - a.hotspotScore)
        .slice(0, limit);

    return hotspots;
}

/**
 * Calculate risk level for a file
 */
function calculateRiskLevel(changes, churn, authorCount) {
    let riskScore = 0;

    // High change frequency
    if (changes > 20) riskScore += 30;
    else if (changes > 10) riskScore += 20;
    else if (changes > 5) riskScore += 10;

    // High churn
    if (churn > 1000) riskScore += 30;
    else if (churn > 500) riskScore += 20;
    else if (churn > 200) riskScore += 10;

    // Multiple authors (potential knowledge silos)
    if (authorCount > 5) riskScore += 20;
    else if (authorCount > 3) riskScore += 10;
    else if (authorCount === 1) riskScore += 15; // Single point of failure

    if (riskScore > 60) return { level: 'High', color: '#dc2626', emoji: '🔴' };
    if (riskScore > 30) return { level: 'Medium', color: '#f97316', emoji: '🟡' };
    return { level: 'Low', color: '#22c55e', emoji: '🟢' };
}

/**
 * Find files with single author (knowledge silos)
 */
function findKnowledgeSilos(hotspots) {
    return hotspots.filter(h => h.authorCount === 1);
}

/**
 * Find frequently changed files
 */
function findFrequentlyChangedFiles(hotspots, threshold = 10) {
    return hotspots.filter(h => h.changes >= threshold);
}

/**
 * Find files with high churn
 */
function findHighChurnFiles(hotspots, threshold = 500) {
    return hotspots.filter(h => h.churn >= threshold);
}

/**
 * Analyze file extensions and identify most volatile types
 */
function analyzeFileTypeVolatility(hotspots) {
    const byExtension = {};

    hotspots.forEach(h => {
        const ext = h.filename.includes('.') ? h.filename.split('.').pop() : 'no-ext';

        if (!byExtension[ext]) {
            byExtension[ext] = {
                files: 0,
                totalChanges: 0,
                totalChurn: 0
            };
        }

        byExtension[ext].files++;
        byExtension[ext].totalChanges += h.changes;
        byExtension[ext].totalChurn += h.churn;
    });

    return Object.entries(byExtension)
        .map(([ext, stats]) => ({
            extension: ext,
            files: stats.files,
            totalChanges: stats.totalChanges,
            avgChangesPerFile: (stats.totalChanges / stats.files).toFixed(1),
            totalChurn: stats.totalChurn,
            avgChurnPerFile: Math.round(stats.totalChurn / stats.files)
        }))
        .sort((a, b) => b.totalChanges - a.totalChanges);
}

/**
 * Find files that might need refactoring
 */
function findRefactoringCandidates(hotspots) {
    // Files with high changes AND high churn are candidates for refactoring
    return hotspots.filter(h => {
        return h.changes > 10 && h.churn > 500 && h.authorCount > 2;
    }).map(h => ({
        ...h,
        reason: [
            h.changes > 15 ? 'High change frequency' : null,
            h.churn > 1000 ? 'High code churn' : null,
            h.authorCount > 4 ? 'Many contributors (complex?)' : null
        ].filter(Boolean)
    }));
}

/**
 * Calculate hotspot statistics
 */
function calculateHotspotStats(hotspots) {
    if (!hotspots || hotspots.length === 0) {
        return {
            totalHotspots: 0,
            highRisk: 0,
            mediumRisk: 0,
            lowRisk: 0,
            avgChangesPerFile: 0,
            avgChurnPerFile: 0
        };
    }

    const riskCounts = {
        High: 0,
        Medium: 0,
        Low: 0
    };

    hotspots.forEach(h => {
        riskCounts[h.riskLevel.level]++;
    });

    const totalChanges = hotspots.reduce((sum, h) => sum + h.changes, 0);
    const totalChurn = hotspots.reduce((sum, h) => sum + h.churn, 0);

    return {
        totalHotspots: hotspots.length,
        highRisk: riskCounts.High,
        mediumRisk: riskCounts.Medium,
        lowRisk: riskCounts.Low,
        avgChangesPerFile: (totalChanges / hotspots.length).toFixed(1),
        avgChurnPerFile: Math.round(totalChurn / hotspots.length)
    };
}

/**
 * Generate hotspot recommendations
 */
function generateHotspotRecommendations(hotspots) {
    const recommendations = [];

    const highRiskFiles = hotspots.filter(h => h.riskLevel.level === 'High');
    if (highRiskFiles.length > 0) {
        recommendations.push({
            severity: 'high',
            category: 'High Risk Files',
            message: `${highRiskFiles.length} file(s) identified as high-risk hotspots.`,
            files: highRiskFiles.slice(0, 5).map(h => h.filename),
            action: 'Review these files for potential refactoring or better modularization'
        });
    }

    const silos = findKnowledgeSilos(hotspots);
    if (silos.length > 5) {
        recommendations.push({
            severity: 'medium',
            category: 'Knowledge Silos',
            message: `${silos.length} file(s) are maintained by single authors.`,
            action: 'Encourage code reviews and knowledge sharing for these files'
        });
    }

    const refactoringCandidates = findRefactoringCandidates(hotspots);
    if (refactoringCandidates.length > 0) {
        recommendations.push({
            severity: 'medium',
            category: 'Refactoring Needed',
            message: `${refactoringCandidates.length} file(s) show signs of needing refactoring.`,
            files: refactoringCandidates.slice(0, 5).map(h => h.filename),
            action: 'Consider breaking down complex files or improving architecture'
        });
    }

    return recommendations;
}

module.exports = {
    findFileHotspots,
    calculateRiskLevel,
    findKnowledgeSilos,
    findFrequentlyChangedFiles,
    findHighChurnFiles,
    analyzeFileTypeVolatility,
    findRefactoringCandidates,
    calculateHotspotStats,
    generateHotspotRecommendations
};
