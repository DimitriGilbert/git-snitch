const fs = require('fs');
const path = require('path');

/**
 * Template Loader - Loads templates from custom directory with fallback to defaults
 *
 * Template directory structure:
 *   templates/
 *     styles.css       - Custom CSS styles (overrides commonStyles)
 *     script.js        - Custom JavaScript (overrides commonScript)
 *     document.html    - Custom HTML document wrapper (uses placeholders)
 *     header.html      - Custom header template
 *     stat-card.html   - Custom stat card template
 *
 * Placeholders in templates:
 *   {{title}}          - Page title
 *   {{styles}}         - CSS styles (commonStyles + customStyles)
 *   {{content}}        - Main content
 *   {{scripts}}        - JavaScript (commonScript + additionalScripts)
 *   {{value}}          - Stat card value
 *   {{label}}          - Stat card label
 *   {{class}}          - Additional CSS class
 *   {{subtitle}}       - Header subtitle
 */

// Default templates (inline)
const defaultTemplates = {
    document: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{title}}</title>
    <link href="https://cdn.jsdelivr.net/npm/simple-datatables@latest/dist/style.css" rel="stylesheet" type="text/css">
    <style>
        {{styles}}
    </style>
</head>
<body>
    {{additionalScripts}}
    {{content}}
    <script src="https://cdn.jsdelivr.net/npm/simple-datatables@latest" type="text/javascript"></script>
    <script>
        {{script}}
    </script>
</body>
</html>`,

    header: `<div class="header">
    <h1>{{title}}</h1>
    <p>{{subtitle}}</p>
</div>`,

    statsGrid: `<div class="stats-grid">
    {{cards}}
</div>`,

    statCard: `<div class="stat-card">
    <span class="stat-number {{class}}">{{value}}</span>
    <div class="stat-label">{{label}}</div>
</div>`
};

class TemplateLoader {
    constructor(templateDir = null) {
        this.templateDir = templateDir;
        this.cache = {};
        this.customStyles = null;
        this.customScript = null;
    }

    /**
     * Set the custom template directory
     */
    setTemplateDir(dir) {
        this.templateDir = dir;
        this.cache = {}; // Clear cache when directory changes
        this.customStyles = null;
        this.customScript = null;
    }

    /**
     * Check if a custom template file exists
     */
    hasCustomTemplate(name) {
        if (!this.templateDir) return false;
        const filePath = this.getTemplatePath(name);
        return filePath && fs.existsSync(filePath);
    }

    /**
     * Get the path to a template file
     */
    getTemplatePath(name) {
        if (!this.templateDir) return null;

        const extensions = {
            'styles': '.css',
            'script': '.js',
            'document': '.html',
            'header': '.html',
            'statsGrid': '.html',
            'statCard': '.html'
        };

        const ext = extensions[name] || '.html';
        return path.join(this.templateDir, `${name}${ext}`);
    }

    /**
     * Load a template by name with fallback to default
     */
    loadTemplate(name) {
        // Check cache first
        if (this.cache[name]) {
            return this.cache[name];
        }

        let template = null;

        // Try to load from custom directory
        if (this.templateDir) {
            const filePath = this.getTemplatePath(name);
            if (filePath && fs.existsSync(filePath)) {
                try {
                    template = fs.readFileSync(filePath, 'utf8');
                } catch (error) {
                    console.warn(`Warning: Could not load template ${name} from ${filePath}`);
                }
            }
        }

        // Fall back to default
        if (!template && defaultTemplates[name]) {
            template = defaultTemplates[name];
        }

        if (template) {
            this.cache[name] = template;
        }

        return template;
    }

    /**
     * Load custom CSS styles
     */
    loadStyles() {
        if (this.customStyles !== null) {
            return this.customStyles;
        }

        this.customStyles = '';
        if (this.templateDir) {
            const stylePath = path.join(this.templateDir, 'styles.css');
            if (fs.existsSync(stylePath)) {
                try {
                    this.customStyles = fs.readFileSync(stylePath, 'utf8');
                } catch (error) {
                    console.warn(`Warning: Could not load styles from ${stylePath}`);
                }
            }
        }
        return this.customStyles;
    }

    /**
     * Load custom JavaScript
     */
    loadScript() {
        if (this.customScript !== null) {
            return this.customScript;
        }

        this.customScript = '';
        if (this.templateDir) {
            const scriptPath = path.join(this.templateDir, 'script.js');
            if (fs.existsSync(scriptPath)) {
                try {
                    this.customScript = fs.readFileSync(scriptPath, 'utf8');
                } catch (error) {
                    console.warn(`Warning: Could not load script from ${scriptPath}`);
                }
            }
        }
        return this.customScript;
    }

    /**
     * Render a template with data
     */
    render(templateName, data = {}) {
        let template = this.loadTemplate(templateName);
        if (!template) return '';

        // Replace placeholders
        for (const [key, value] of Object.entries(data)) {
            const placeholder = new RegExp(`{{${key}}}`, 'g');
            template = template.replace(placeholder, value ?? '');
        }

        return template;
    }

    /**
     * Get information about loaded templates
     */
    getTemplateInfo() {
        const info = {
            templateDir: this.templateDir,
            customTemplates: [],
            usingDefaults: []
        };

        const templateNames = Object.keys(defaultTemplates);

        for (const name of templateNames) {
            if (this.hasCustomTemplate(name)) {
                info.customTemplates.push(name);
            } else {
                info.usingDefaults.push(name);
            }
        }

        // Check for additional custom files
        if (this.templateDir && fs.existsSync(this.templateDir)) {
            const stylePath = path.join(this.templateDir, 'styles.css');
            const scriptPath = path.join(this.templateDir, 'script.js');

            if (fs.existsSync(stylePath)) {
                info.customTemplates.push('styles.css');
            }
            if (fs.existsSync(scriptPath)) {
                info.customTemplates.push('script.js');
            }
        }

        return info;
    }
}

/**
 * Create a sample template directory with example files
 */
function createSampleTemplates(targetDir) {
    const templatesDir = path.join(targetDir, 'templates');

    if (!fs.existsSync(templatesDir)) {
        fs.mkdirSync(templatesDir, { recursive: true });
    }

    // Sample styles.css
    const sampleStyles = `/* Custom Git-Snitch Styles
 *
 * These styles are merged with the default styles.
 * Use this to customize colors, fonts, layouts, etc.
 */

/* Example: Custom color scheme */
/*
:root {
    --primary-color: #3b82f6;
    --accent-color: #10b981;
    --background-dark: #1a1a2e;
    --background-light: #16213e;
}

body {
    background: linear-gradient(135deg, var(--background-dark) 0%, var(--background-light) 100%);
}

.stat-number {
    color: var(--accent-color);
}

.header {
    background: linear-gradient(135deg, var(--primary-color) 0%, var(--background-dark) 100%);
}
*/

/* Example: Custom fonts */
/*
body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
}
*/

/* Example: Compact mode */
/*
.container {
    max-width: 1200px;
    padding: 15px;
}

.stat-card {
    padding: 15px;
}
*/
`;

    // Sample script.js
    const sampleScript = `/* Custom Git-Snitch JavaScript
 *
 * This script runs after the default scripts.
 * Use this for custom interactions, analytics, etc.
 */

// Example: Custom initialization
/*
document.addEventListener('DOMContentLoaded', () => {
    console.log('Custom template loaded!');

    // Example: Add custom button functionality
    // document.querySelector('.custom-btn')?.addEventListener('click', () => {
    //     alert('Custom action!');
    // });
});
*/

// Example: Custom export function
/*
window.customExport = function() {
    // Custom export logic
};
*/
`;

    // Sample document.html
    const sampleDocument = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{title}}</title>
    <!-- Custom meta tags -->
    <meta name="description" content="Git activity report generated by Git-Snitch">

    <!-- DataTables CSS -->
    <link href="https://cdn.jsdelivr.net/npm/simple-datatables@latest/dist/style.css" rel="stylesheet" type="text/css">

    <!-- Custom fonts (uncomment to use) -->
    <!-- <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet"> -->

    <style>
        {{styles}}
    </style>
</head>
<body>
    {{additionalScripts}}

    <!-- Custom header/branding -->
    <!-- <div class="custom-branding">Your Company Name</div> -->

    {{content}}

    <!-- Custom footer -->
    <!-- <footer class="custom-footer">Generated with Git-Snitch</footer> -->

    <!-- DataTables JS -->
    <script src="https://cdn.jsdelivr.net/npm/simple-datatables@latest" type="text/javascript"></script>
    <script>
        {{script}}
    </script>
</body>
</html>`;

    // Sample header.html
    const sampleHeader = `<div class="header">
    <!-- Custom logo: <img src="your-logo.png" alt="Logo" class="header-logo"> -->
    <h1>{{title}}</h1>
    <p>{{subtitle}}</p>
    <!-- Custom tagline: <span class="header-tagline">Your custom tagline</span> -->
</div>`;

    // Sample statCard.html
    const sampleStatCard = `<div class="stat-card">
    <span class="stat-number {{class}}">{{value}}</span>
    <div class="stat-label">{{label}}</div>
    <!-- Custom: Add trend indicator -->
    <!-- <span class="trend-indicator">+5%</span> -->
</div>`;

    // Write sample files
    const samples = {
        'styles.css': sampleStyles,
        'script.js': sampleScript,
        'document.html': sampleDocument,
        'header.html': sampleHeader,
        'statCard.html': sampleStatCard
    };

    for (const [filename, content] of Object.entries(samples)) {
        const filePath = path.join(templatesDir, filename);
        fs.writeFileSync(filePath, content);
    }

    // Create README
    const readme = `# Custom Templates for Git-Snitch

This directory contains custom templates for Git-Snitch reports.

## Files

- \`styles.css\` - Custom CSS styles (merged with defaults)
- \`script.js\` - Custom JavaScript (runs after default scripts)
- \`document.html\` - Custom HTML document wrapper
- \`header.html\` - Custom header template
- \`statCard.html\` - Custom stat card template

## Placeholders

Use these placeholders in your templates:

| Placeholder | Description |
|------------|-------------|
| \`{{title}}\` | Page/section title |
| \`{{subtitle}}\` | Header subtitle |
| \`{{styles}}\` | CSS styles |
| \`{{script}}\` | JavaScript code |
| \`{{content}}\` | Main content |
| \`{{additionalScripts}}\` | Chart.js and other scripts |
| \`{{value}}\` | Stat card value |
| \`{{label}}\` | Stat card label |
| \`{{class}}\` | Additional CSS class |

## Usage

\`\`\`bash
# Use custom templates
git-moar snitch --template-dir ./templates

# Or for scattered reports
git-moar scattered --template-dir ./templates
\`\`\`

## Tips

1. Start by modifying \`styles.css\` for color/font changes
2. Edit \`document.html\` to add custom branding
3. Use \`script.js\` for custom interactions
4. Only override what you need - missing files use defaults
`;

    fs.writeFileSync(path.join(templatesDir, 'README.md'), readme);

    return templatesDir;
}

// Export singleton instance and factory
const defaultLoader = new TemplateLoader();

module.exports = {
    TemplateLoader,
    defaultLoader,
    createSampleTemplates,
    defaultTemplates
};
