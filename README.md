# 🔍 git-moar

> Advanced Git reporting tools for developers

**git-moar** provides powerful analytics for your Git repositories, helping you understand development patterns, activity levels, and contributor insights across single repositories or entire project collections.

## ✨ Features

- 📋 **Single Repository Analysis** (`snitch`) - Deep dive into individual repo activity
- 🏔️ **Cross-Repository Analysis** (`scattered`) - Compare activity across multiple repositories
- 🎨 **Beautiful HTML Reports** - Interactive, responsive reports with dark theme
- 📊 **Rich Statistics** - Commits, additions, deletions, lines of code, and timing analysis
- 🌈 **Colored CLI Output** - Clean, informative terminal output with chalk
- ⚡ **Period Filtering** - Flexible time ranges (1d, 7d, 30d, 3m, etc.)
- 🔗 **Git Integration** - Direct links to commits and branches on GitHub/GitLab

## 🚀 Installation

### Global Installation (Recommended)
```bash
npm install -g git-moar
```

### Use with npx (No Installation)
```bash
npx git-moar <command> [options]
```

## 📖 Usage

### Commands

#### 📋 `snitch` - Single Repository Analysis
Analyze commit activity within a single Git repository.

```bash
git-moar snitch [options]
```

**Options:**
- `-s, --start-date <date>` - Start date (YYYY-MM-DD)
- `-e, --end-date <date>` - End date (YYYY-MM-DD) 
- `-o, --output <file>` - Output HTML file path
- `-a, --all-branches` - Include commits from all branches
- `-b, --branch <name>` - Include specific branch (can use multiple times)
- `--sort-by <criteria>` - Sort by: date (default), additions, deletions
- `--sort-order <order>` - Sort order: asc, desc (default)

**Examples:**
```bash
# Analyze current repo for the last month
git-moar snitch --start-date 2023-01-01 --end-date 2023-12-31

# Include all branches, sort by additions
git-moar snitch --all-branches --sort-by additions

# Analyze specific branches
git-moar snitch --branch main --branch develop -o report.html
```

#### 🏔️ `scattered` - Cross-Repository Analysis
Scan and analyze multiple Git repositories in a directory tree.

```bash
git-moar scattered [options]
```

**Options:**
- `-p, --period <period>` - Analysis period (e.g., "1d", "7d", "30d") [Default: "7d"]
- `-d, --dir <path>` - Directory to scan for repositories [Default: current directory]
- `-o, --output <file>` - Output HTML file path
- `--sort-by <criteria>` - Sort by: commits (default), loc, additions, deletions
- `--sort-order <order>` - Sort order: asc, desc (default)

**Examples:**
```bash
# Analyze current directory for last 7 days
git-moar scattered

# Scan ~/Code directory for last day, sort by lines of code
git-moar scattered -p 1d -d ~/Code --sort-by loc

# Generate monthly report
git-moar scattered -p 30d --sort-by additions -o monthly-report.html
```

## 🕒 Time Period Format

The `--period` option supports flexible time formats:

- **Hours**: `12h`, `24h`
- **Days**: `1d`, `7d`, `14d`, `30d`  
- **Weeks**: `1w`, `2w`, `4w`
- **Months**: `1m`, `3m`, `6m`
- **Years**: `1y`

## 📊 Report Features

### Single Repository Reports (`snitch`)
- **Commit Timeline** - Chronological list of all commits with metadata
- **Contributor Stats** - Author activity and contribution metrics
- **Branch Analysis** - Per-branch commit distribution
- **File Change Statistics** - Lines added/deleted per commit
- **Interactive Sorting** - Sort commits by date, additions, or deletions

### Cross-Repository Reports (`scattered`)
- **Project Overview** - Summary table of all active repositories
- **Project Deep-Dive** - Detailed analysis for each repository
- **Contributor Breakdown** - Author activity across all projects
- **Aggregated Statistics** - Total commits, changes, and lines of code
- **Interactive Tabs** - Navigate between projects and views

## 🎨 Report Styling

All reports feature:
- 🌙 **Dark Theme** - Easy on the eyes for long analysis sessions
- 📱 **Responsive Design** - Works great on desktop and mobile
- 🖱️ **Interactive Elements** - Clickable tabs, sortable data, hover effects
- 🔗 **External Links** - Direct links to GitHub/GitLab commits and branches
- ✨ **Smooth Animations** - Polished transitions and effects

## 🛠️ Development

### Prerequisites
- Node.js 14+
- Git (obviously!)

All dependencies are included in the package, including `sloc` for lines of code analysis.

### Project Structure
```
git-moar/
├── bin/
│   └── cli.js          # CLI entry point
├── lib/
│   ├── templates.js    # Shared HTML/CSS templates
│   ├── utils.js        # Common utilities and Git functions
│   ├── snitch.js       # Single repo analysis
│   └── scattered.js    # Multi-repo analysis
├── package.json
└── README.md
```

### Building from Source
```bash
git clone <your-repo-url>
cd git-moar
npm install
npm link  # For global development installation
```

## 🤝 Contributing

Contributions are welcome! Please feel free to:

1. 🐛 Report bugs
2. 💡 Suggest new features  
3. 🔧 Submit pull requests
4. 📖 Improve documentation

## 📝 License

MIT License - see LICENSE file for details.

## 🙏 Acknowledgments

- Built with ❤️ for the developer community
- Inspired by the need for better Git repository insights
- Uses modern web technologies for beautiful, accessible reports

---

**Happy analyzing!** 🎉