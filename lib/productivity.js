/**
 * Productivity insights and analytics
 * Analyzes work patterns, collaboration, and team velocity
 */

/**
 * Generate comprehensive productivity insights
 */
function generateProductivityInsights(commits, users, periodDays) {
    return {
        peakHours: findPeakHours(commits),
        peakDays: findPeakDays(commits),
        velocity: calculateVelocity(commits, periodDays),
        rhythm: analyzeDevelopmentRhythm(commits),
        collaboration: calculateCollaborationScore(commits),
        focusTime: calculateFocusTime(commits)
    };
}

/**
 * Find peak productivity hours
 */
function findPeakHours(commits) {
    if (!commits || commits.length === 0) return { hour: 0, percentage: 0, commits: 0 };

    const hourCounts = Array(24).fill(0);
    commits.forEach(c => {
        if (c.date) {
            hourCounts[c.date.getHours()]++;
        }
    });

    const maxCount = Math.max(...hourCounts);
    const maxHour = hourCounts.indexOf(maxCount);

    return {
        hour: maxHour,
        hourFormatted: `${maxHour}:00`,
        commits: maxCount,
        percentage: ((maxCount / commits.length) * 100).toFixed(1)
    };
}

/**
 * Find peak productivity days
 */
function findPeakDays(commits) {
    if (!commits || commits.length === 0) return { day: 0, dayName: 'Unknown', percentage: 0, commits: 0 };

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayCounts = Array(7).fill(0);

    commits.forEach(c => {
        if (c.date) {
            dayCounts[c.date.getDay()]++;
        }
    });

    const maxCount = Math.max(...dayCounts);
    const maxDay = dayCounts.indexOf(maxCount);

    return {
        day: maxDay,
        dayName: dayNames[maxDay],
        commits: maxCount,
        percentage: ((maxCount / commits.length) * 100).toFixed(1)
    };
}

/**
 * Calculate development velocity
 */
function calculateVelocity(commits, periodDays) {
    if (!commits || commits.length === 0 || !periodDays) {
        return {
            linesPerDay: 0,
            commitsPerDay: 0,
            velocity: 'Unknown'
        };
    }

    const totalLines = commits.reduce((sum, c) => sum + (c.additions || 0), 0);
    const linesPerDay = Math.round(totalLines / periodDays);
    const commitsPerDay = (commits.length / periodDays).toFixed(2);

    let velocity = 'Low';
    if (linesPerDay > 500) velocity = 'High';
    else if (linesPerDay > 200) velocity = 'Medium';

    return {
        linesPerDay,
        commitsPerDay: parseFloat(commitsPerDay),
        velocity,
        totalLines
    };
}

/**
 * Analyze development rhythm (consistency of commits)
 */
function analyzeDevelopmentRhythm(commits) {
    if (!commits || commits.length < 2) {
        return {
            consistency: 'Unknown',
            avgDaysBetweenCommits: 0,
            rhythmScore: 0
        };
    }

    const sortedCommits = [...commits].sort((a, b) => a.date - b.date);
    const intervals = [];

    for (let i = 1; i < sortedCommits.length; i++) {
        const daysDiff = (sortedCommits[i].date - sortedCommits[i - 1].date) / (1000 * 60 * 60 * 24);
        intervals.push(daysDiff);
    }

    const avgInterval = intervals.reduce((sum, val) => sum + val, 0) / intervals.length;

    // Calculate standard deviation
    const variance = intervals.reduce((sum, val) => sum + Math.pow(val - avgInterval, 2), 0) / intervals.length;
    const stdDev = Math.sqrt(variance);

    // Lower std dev = more consistent rhythm
    const rhythmScore = Math.max(0, 100 - (stdDev * 10));

    let consistency = 'Irregular';
    if (rhythmScore > 70) consistency = 'Highly Consistent';
    else if (rhythmScore > 50) consistency = 'Consistent';
    else if (rhythmScore > 30) consistency = 'Somewhat Consistent';

    return {
        consistency,
        avgDaysBetweenCommits: avgInterval.toFixed(2),
        rhythmScore: Math.round(rhythmScore),
        standardDeviation: stdDev.toFixed(2)
    };
}

/**
 * Calculate collaboration score
 */
function calculateCollaborationScore(commits) {
    if (!commits || commits.length === 0) {
        return {
            score: 0,
            multiAuthorFiles: 0,
            totalFiles: 0,
            collaborationLevel: 'None'
        };
    }

    const fileAuthors = {};

    commits.forEach(c => {
        if (c.files) {
            c.files.forEach(f => {
                if (!fileAuthors[f.filename]) {
                    fileAuthors[f.filename] = new Set();
                }
                fileAuthors[f.filename].add(c.email || c.author);
            });
        }
    });

    const totalFiles = Object.keys(fileAuthors).length;
    const multiAuthorFiles = Object.values(fileAuthors).filter(authors => authors.size > 1).length;

    const score = totalFiles > 0 ? ((multiAuthorFiles / totalFiles) * 100).toFixed(1) : 0;

    let collaborationLevel = 'Low';
    if (score > 50) collaborationLevel = 'High';
    else if (score > 25) collaborationLevel = 'Medium';

    return {
        score: parseFloat(score),
        multiAuthorFiles,
        totalFiles,
        collaborationLevel
    };
}

/**
 * Calculate focus time patterns
 */
function calculateFocusTime(commits) {
    if (!commits || commits.length === 0) {
        return {
            workingHoursCommits: 0,
            afterHoursCommits: 0,
            weekendCommits: 0,
            workLifeBalance: 'Unknown'
        };
    }

    let workingHoursCommits = 0; // 9 AM - 6 PM, Mon-Fri
    let afterHoursCommits = 0;
    let weekendCommits = 0;

    commits.forEach(c => {
        if (!c.date) return;

        const hour = c.date.getHours();
        const day = c.date.getDay();

        if (day === 0 || day === 6) {
            weekendCommits++;
        } else if (hour >= 9 && hour < 18) {
            workingHoursCommits++;
        } else {
            afterHoursCommits++;
        }
    });

    const afterHoursPercent = ((afterHoursCommits / commits.length) * 100).toFixed(1);
    const weekendPercent = ((weekendCommits / commits.length) * 100).toFixed(1);

    let workLifeBalance = 'Good';
    if (afterHoursPercent > 40 || weekendPercent > 30) workLifeBalance = 'Poor';
    else if (afterHoursPercent > 25 || weekendPercent > 15) workLifeBalance = 'Fair';

    return {
        workingHoursCommits,
        workingHoursPercent: ((workingHoursCommits / commits.length) * 100).toFixed(1),
        afterHoursCommits,
        afterHoursPercent,
        weekendCommits,
        weekendPercent,
        workLifeBalance
    };
}

/**
 * Calculate time to value (how quickly features are delivered)
 */
function calculateTimeToValue(commits) {
    if (!commits || commits.length < 2) {
        return {
            avgTimeToFeature: 0,
            featureCount: 0
        };
    }

    const featureCommits = commits.filter(c => {
        const msg = (c.message || '').toLowerCase();
        return /^(feat|feature)/.test(msg) || /\b(add|new|implement)\b/.test(msg);
    });

    if (featureCommits.length < 2) {
        return {
            avgTimeToFeature: 0,
            featureCount: featureCommits.length
        };
    }

    const sortedFeatures = featureCommits.sort((a, b) => a.date - b.date);
    let totalDays = 0;

    for (let i = 1; i < sortedFeatures.length; i++) {
        const days = (sortedFeatures[i].date - sortedFeatures[i - 1].date) / (1000 * 60 * 60 * 24);
        totalDays += days;
    }

    return {
        avgTimeToFeature: (totalDays / (sortedFeatures.length - 1)).toFixed(1),
        featureCount: featureCommits.length
    };
}

/**
 * Generate productivity recommendations
 */
function generateProductivityRecommendations(insights) {
    const recommendations = [];

    if (insights.focusTime && insights.focusTime.workLifeBalance === 'Poor') {
        recommendations.push({
            category: 'Work-Life Balance',
            message: `${insights.focusTime.afterHoursPercent}% of commits are after hours and ${insights.focusTime.weekendPercent}% on weekends.`,
            action: 'Consider reviewing workload distribution and deadlines'
        });
    }

    if (insights.rhythm && insights.rhythm.rhythmScore < 50) {
        recommendations.push({
            category: 'Development Rhythm',
            message: 'Inconsistent commit patterns detected.',
            action: 'Establish regular development cycles and sprint planning'
        });
    }

    if (insights.collaboration && insights.collaboration.score < 25) {
        recommendations.push({
            category: 'Collaboration',
            message: 'Low collaboration detected. Most files are worked on by single authors.',
            action: 'Encourage pair programming and cross-functional code reviews'
        });
    }

    if (insights.velocity && insights.velocity.velocity === 'Low') {
        recommendations.push({
            category: 'Velocity',
            message: 'Development velocity is below optimal levels.',
            action: 'Review blockers, technical debt, and process bottlenecks'
        });
    }

    return recommendations;
}

module.exports = {
    generateProductivityInsights,
    findPeakHours,
    findPeakDays,
    calculateVelocity,
    analyzeDevelopmentRhythm,
    calculateCollaborationScore,
    calculateFocusTime,
    calculateTimeToValue,
    generateProductivityRecommendations
};
