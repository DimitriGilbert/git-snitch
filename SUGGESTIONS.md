# Git-Snitch UI/UX Improvement Suggestions

## Overview
This document contains suggestions for improving data visualization and presentation in git-snitch using charts and sortable/filterable datatables.

---

## 1. GENERAL OVERVIEW DASHBOARD CHARTS

### 1.1 Single Repository (Snitch) - Quick View Charts
**Current State:** Only shows 2 charts below stats, not prominent enough
**Suggested Improvement:** Add a dashboard section right after stats with these charts:

#### A. Contributor Activity Pie/Doughnut Chart
- **What:** Show % of commits per contributor
- **Why:** Quick view of who's doing most work
- **Location:** Top of page, alongside existing charts
- **Implementation:** Already have `generateContributorPieChart()` in charts.js

#### B. Commit Timeline Sparkline
- **What:** Small line chart showing commit frequency by week/month
- **Why:** See activity trends at a glance
- **Location:** In header stats cards (mini charts inside stat cards)
- **Library:** Chart.js line charts with `maintainAspectRatio: false`

#### C. Weekly Activity Bar Chart
- **What:** Bar chart showing commits per day of week
- **Why:** Understand work patterns (weekend vs weekday activity)
- **Data:** Group commits by day of week (Mon-Sun)
- **Chart Type:** Bar chart (7 bars)

#### D. Additions vs Deletions Trend
- **What:** Already exists but make it more prominent
- **Why:** See if code is growing or shrinking
- **Enhancement:** Add trendline or moving average

### 1.2 Multi-Repository (Scattered) - Cross-Project Overview Charts
**Current State:** Overview tab only has a basic table
**Suggested Improvement:** Add charts in Overview tab for cross-project comparison

#### A. Projects Comparison Bar Chart
- **What:** Horizontal bar chart comparing projects by commits/LOC/activity
- **Why:** Quick visual comparison of project sizes
- **Data:** All projects with sortable metric selection
- **Chart Type:** Horizontal bar (better for long project names)

#### B. Activity Distribution Pie Chart
- **What:** Pie chart showing % of total commits per project
- **Why:** See which projects consume most dev time
- **Data:** Aggregate commit counts

#### C. Language Distribution Across All Projects
- **What:** Stacked or grouped bar chart showing languages used
- **Why:** See tech stack overview
- **Data:** Combine `locDetails.byLanguage` from all projects

#### D. Project Health Score Matrix
- **What:** Visual grid/heatmap showing health scores for all projects
- **Why:** Quick identification of unhealthy projects
- **Data:** Use existing `quality.healthScore`
- **Visual:** Color-coded boxes (green/yellow/red)

---

## 2. SORTABLE/FILTERABLE DATATABLES

### 2.1 Use simple-datatables Library
**Library:** https://github.com/fiduswriter/simple-datatables
- Lightweight (no dependencies)
- Easy integration
- Sorting, filtering, pagination built-in
- Works with existing tables

### 2.2 Tables to Convert

#### A. Commits List (Both Snitch & Scattered)
**Current:** Static scrollable div with commit items
**Convert To:** DataTable with columns:
- Hash (linked)
- Branch (linked)
- Author
- Message
- Date
- Additions
- Deletions
- **Search:** By author, message, branch
- **Sort:** By date, additions, deletions, author
- **Filter:** Date range picker (optional)
- **Pagination:** 50 per page

**Benefits:**
- Search for specific commits
- Find largest commits
- Filter by author
- Export to CSV (optional feature)

#### B. Contributors List (Scattered)
**Current:** User cards (not searchable)
**Convert To:** DataTable with columns:
- Name
- Email
- Commits
- Additions
- Deletions
- Avg Lines/Commit
- **Search:** By name or email
- **Sort:** By any metric
- **Enhancement:** Click row to highlight their commits

#### C. Projects Overview Table (Scattered)
**Current:** Basic HTML table
**Enhance With:** Simple-datatables
- **Sort:** By any column
- **Search:** Project names
- **Filter:** LOC range, commit count range
- **Visual Enhancement:** Progress bars for relative sizes

#### D. File Hotspots Table
**Current:** Hotspot items in divs
**Convert To:** DataTable with columns:
- Filename
- Changes
- Churn
- Authors
- Risk Level (color-coded)
- **Search:** By filename
- **Sort:** By risk, changes, churn
- **Filter:** By risk level (High/Medium/Low)

#### E. Quality Metrics Comparison (New - for Scattered)
**What:** Table comparing quality metrics across projects
**Columns:**
- Project Name
- Health Score
- Bus Factor
- Code Churn
- Commit Size
- Comment Ratio
- **Sort:** By any metric
- **Visual:** Color-coded cells (red/yellow/green)

---

## 3. ADDITIONAL CHART IDEAS

### 3.1 GitHub-Style Contribution Calendar
- **What:** Heatmap showing daily commit activity (like GitHub contributions)
- **Why:** Visual pattern of work consistency
- **Library:** Can build with Chart.js matrix or use d3-based library
- **Location:** New tab or section in both snitch and scattered

### 3.2 Commit Size Distribution Histogram
- **What:** Histogram showing how many commits fall into size buckets
- **Why:** Identify if commits are appropriately sized
- **Buckets:** 0-10, 10-50, 50-100, 100-500, 500+ lines
- **Chart Type:** Bar chart

### 3.3 Time of Day Activity Chart
- **What:** Polar/radial bar chart showing commits by hour (0-23)
- **Why:** See peak productivity hours
- **Chart Type:** Radar or polar area chart
- **Data:** Already extracted in productivity.js

### 3.4 Author Collaboration Network (Advanced)
- **What:** Network graph showing which authors work on same files
- **Why:** Understand team collaboration patterns
- **Note:** May be too complex for personal use - lower priority

### 3.5 Code Growth Timeline (Area Chart)
- **What:** Stacked area chart showing LOC growth over time
- **Why:** See project growth trajectory
- **Data:** Cumulative additions - deletions over time

### 3.6 Commit Message Quality Indicator
- **What:** Pie chart showing % of well-formatted commit messages
- **Why:** Encourage better commit practices
- **Data:** Use `analyzeCommitMessageQuality()` from commit-classifier.js

---

## 4. ENHANCED DATA PRESENTATION

### 4.1 Summary Dashboard Cards
**What:** Enhance stat cards with:
- **Trend indicators:** ↑ +15% from last period
- **Mini sparklines:** Tiny charts inside cards
- **Color coding:** Green for good, red for concerning
- **Tooltips:** Hover for more detail

### 4.2 Top Contributors Widget
**What:** Small widget showing top 5 contributors
- Avatar (first letter)
- Name
- Commit count
- Percentage bar
**Location:** After stats grid

### 4.3 Most Changed Files Widget
**What:** List of top 10 most frequently changed files
- Filename
- Change count
- Visual bar indicator
**Location:** Sidebar or dedicated section

### 4.4 Recent Activity Feed
**What:** Timeline showing last 20 commits
- Relative time ("2 hours ago")
- Author
- Message preview
**Style:** Twitter/feed-like layout

### 4.5 Filtering Controls
**What:** Add filter bar to main views:
- Date range picker
- Author multi-select dropdown
- Branch selector
- Min/max commit size
**Action:** Filters update all tables and charts dynamically

---

## 5. SPECIFIC IMPLEMENTATION SUGGESTIONS

### 5.1 Priority 1 (High Impact, Easy Implementation)

1. **Convert all tables to simple-datatables**
   - Effort: Low
   - Impact: High
   - Files to modify: `templates.js`, `snitch.js`, `scattered.js`
   - Add CDN: `<script src="https://cdn.jsdelivr.net/npm/simple-datatables@latest"></script>`

2. **Add contributor pie chart to snitch overview**
   - Effort: Low (already have function)
   - Impact: Medium
   - File: `snitch.js` line 126-134

3. **Add projects comparison bar chart to scattered overview**
   - Effort: Medium
   - Impact: High
   - File: `scattered.js` overview tab section

4. **Make commits list a datatable**
   - Effort: Medium
   - Impact: High
   - Benefits: Searchable, sortable, much better UX

### 5.2 Priority 2 (Medium Impact, Medium Effort)

1. **Add weekly/daily activity bar charts**
   - Effort: Medium
   - Impact: Medium
   - New chart function in charts.js

2. **Add language distribution chart to snitch**
   - Effort: Low (if LOC by language is collected)
   - Impact: Medium
   - Need to call `getLinesOfCode(path, true)` in snitch

3. **GitHub-style contribution calendar**
   - Effort: High
   - Impact: Medium-High
   - Very visual and engaging

4. **Add trend indicators to stat cards**
   - Effort: Medium
   - Impact: Medium
   - Need to calculate changes from previous period

### 5.3 Priority 3 (Nice to Have, Lower Priority)

1. **Time of day polar chart**
   - Effort: Medium
   - Impact: Low-Medium

2. **Commit size distribution histogram**
   - Effort: Medium
   - Impact: Low

3. **Advanced filters UI**
   - Effort: High
   - Impact: Medium

---

## 6. EXAMPLE IMPLEMENTATION SNIPPETS

### 6.1 Simple-datatables Integration

```javascript
// In HTML head, add CDN:
<link href="https://cdn.jsdelivr.net/npm/simple-datatables@latest/dist/style.css" rel="stylesheet" type="text/css">
<script src="https://cdn.jsdelivr.net/npm/simple-datatables@latest" type="text/javascript"></script>

// In JavaScript, initialize datatable:
document.addEventListener('DOMContentLoaded', function() {
    const commitsTable = document.querySelector('#commits-table');
    if (commitsTable) {
        new simpleDatatables.DataTable(commitsTable, {
            perPage: 50,
            perPageSelect: [25, 50, 100],
            searchable: true,
            sortable: true,
            labels: {
                placeholder: "Search commits...",
                perPage: "{select} commits per page",
                noRows: "No commits found",
            }
        });
    }
});
```

### 6.2 Weekly Activity Chart

```javascript
// In charts.js
function generateWeeklyActivityChart(commits, containerId) {
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayCounts = [0, 0, 0, 0, 0, 0, 0];

    commits.forEach(commit => {
        const day = commit.date.getDay();
        dayCounts[day]++;
    });

    return `
        <div class="chart-container">
            <canvas id="${containerId}"></canvas>
        </div>
        <script>
            chartQueue.push(() => {
                new Chart(document.getElementById('${containerId}'), {
                    type: 'bar',
                    data: {
                        labels: ${JSON.stringify(weekdays)},
                        datasets: [{
                            label: 'Commits by Day',
                            data: ${JSON.stringify(dayCounts)},
                            backgroundColor: '#22c55e'
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false
                    }
                });
            });
        </script>
    `;
}
```

### 6.3 Projects Comparison Chart

```javascript
// In scattered.js overview tab
function generateProjectsComparisonChart(projects) {
    const labels = projects.map(p => p.repo.name);
    const commits = projects.map(p => p.stats.totalCommits);

    return `
        <div class="chart-container-wide">
            <canvas id="projects-comparison-chart"></canvas>
        </div>
        <script>
            chartQueue.push(() => {
                new Chart(document.getElementById('projects-comparison-chart'), {
                    type: 'bar',
                    data: {
                        labels: ${JSON.stringify(labels)},
                        datasets: [{
                            label: 'Commits',
                            data: ${JSON.stringify(commits)},
                            backgroundColor: '#22c55e'
                        }]
                    },
                    options: {
                        indexAxis: 'y', // Horizontal bars
                        responsive: true,
                        maintainAspectRatio: false
                    }
                });
            });
        </script>
    `;
}
```

---

## 7. MOBILE/RESPONSIVE CONSIDERATIONS

### 7.1 Charts on Mobile
- Use `responsive: true` in all Chart.js configs
- Stack charts vertically on small screens
- Reduce chart height on mobile
- Use horizontal scrolling for wide tables

### 7.2 Datatables on Mobile
- Enable responsive mode in simple-datatables
- Allow horizontal scroll for wide tables
- Show fewer columns on mobile (hide less important ones)

---

## 8. PERFORMANCE CONSIDERATIONS

### 8.1 Large Datasets
- Use pagination in datatables (50-100 per page)
- Lazy-load charts (only render visible ones)
- Consider virtual scrolling for very large commit lists

### 8.2 Chart Rendering
- Use chart queue (already implemented)
- Render charts only when tab is active
- Cache chart data to avoid re-processing

---

## 9. DARK THEME INTEGRATION

All suggested charts and datatables should match the existing dark theme:
- Background: #334155
- Text: #e2e8f0
- Accent: #22c55e (green), #dc2626 (red), #1e40af (blue)
- Borders: #475569

### Simple-datatables Dark Theme CSS:
```css
.dataTable-wrapper .dataTable-container {
    background: #334155;
    color: #e2e8f0;
}
.dataTable-input {
    background: #475569;
    color: #e2e8f0;
    border: 1px solid #64748b;
}
.dataTable-wrapper .dataTable-top,
.dataTable-wrapper .dataTable-bottom {
    background: #1e293b;
    color: #94a3b8;
}
```

---

## 10. SUMMARY OF RECOMMENDATIONS

### Must-Have (Personal/Small Team Use):
1. ✅ Convert all tables to simple-datatables (searchable/sortable)
2. ✅ Add contributor pie chart to snitch overview
3. ✅ Add projects comparison chart to scattered overview
4. ✅ Make commits list a proper datatable with search
5. ✅ Add weekly activity bar chart

### Should-Have:
1. GitHub-style contribution calendar
2. Language distribution charts
3. Top contributors widget
4. Most changed files widget
5. Trend indicators on stats

### Nice-to-Have:
1. Time of day activity (polar chart)
2. Commit size distribution histogram
3. Advanced filtering UI
4. Export to CSV functionality
5. Collaboration network (advanced)

---

## 11. FILES TO MODIFY

| File | Changes |
|------|---------|
| `lib/templates.js` | Add simple-datatables CSS/script, dark theme styles |
| `lib/snitch.js` | Add contributor chart, convert commits list to table |
| `lib/scattered.js` | Add overview charts, convert all lists to datatables |
| `lib/charts.js` | Add new chart functions (weekly, comparison, etc.) |
| `package.json` | No changes (using CDN for simple-datatables) |

---

## 12. NEXT STEPS

1. Review suggestions and select which features to implement
2. Start with Priority 1 items (high impact, low effort)
3. Implement simple-datatables integration first (foundation)
4. Add one chart type at a time
5. Test with real repositories
6. Iterate based on feedback

---

**Note:** All suggestions focus on personal/small team use cases - no enterprise features like user authentication, API integration, or cloud storage.
