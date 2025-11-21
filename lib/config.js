const fs = require('fs');
const path = require('path');

/**
 * Configuration management for git-moar
 * Supports .git-moar/config.json for project-specific settings
 */
class Config {
    constructor() {
        this.configPath = '.git-moar/config.json';
        this.themesPath = '.git-moar/themes';
        this.templatesPath = '.git-moar/templates';

        this.defaults = {
            theme: 'dark',
            customCSS: null,
            logo: null,
            companyName: null,
            timezone: 'UTC',
            dateFormat: 'YYYY-MM-DD HH:mm',

            charts: {
                enabled: true,
                library: 'chartjs',
                showActivityChart: true,
                showContributorPie: true,
                showLanguageBar: true,
                showHeatmap: true,
                showCommitTypeBreakdown: true,
                colors: ['#22c55e', '#dc2626', '#1e40af', '#f59e0b', '#8b5cf6', '#ec4899', '#10b981', '#f97316']
            },

            stats: {
                currency: '$',
                showLineValue: true,
                lineValue: 50,
                showProductivity: true,
                showQualityMetrics: true,
                showHotspots: true
            },

            filters: {
                excludeAuthors: [],
                includeExtensions: null,
                excludePatterns: []
            },

            integrations: {
                jira: {
                    enabled: false,
                    baseUrl: null,
                    projectKey: null
                },
                slack: {
                    enabled: false,
                    webhookUrl: null
                }
            },

            widgets: {
                showCodeValue: true,
                showTimeSaved: true,
                showHealthScore: true,
                showBusFactor: true,
                showCommitClassification: true
            }
        };

        this.config = this.load();
    }

    /**
     * Load configuration from file or use defaults
     */
    load() {
        try {
            if (fs.existsSync(this.configPath)) {
                const userConfig = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
                return this.mergeDeep(this.defaults, userConfig);
            }
        } catch (error) {
            console.warn(`Warning: Could not load config from ${this.configPath}:`, error.message);
        }
        return this.defaults;
    }

    /**
     * Deep merge two objects
     */
    mergeDeep(target, source) {
        const output = Object.assign({}, target);
        if (this.isObject(target) && this.isObject(source)) {
            Object.keys(source).forEach(key => {
                if (this.isObject(source[key])) {
                    if (!(key in target)) {
                        Object.assign(output, { [key]: source[key] });
                    } else {
                        output[key] = this.mergeDeep(target[key], source[key]);
                    }
                } else {
                    Object.assign(output, { [key]: source[key] });
                }
            });
        }
        return output;
    }

    isObject(item) {
        return item && typeof item === 'object' && !Array.isArray(item);
    }

    /**
     * Get configuration value by dot notation path
     */
    get(key) {
        return key.split('.').reduce((obj, k) => obj?.[k], this.config);
    }

    /**
     * Get custom CSS if configured
     */
    getCustomCSS() {
        const cssPath = this.get('customCSS');
        if (cssPath && fs.existsSync(cssPath)) {
            try {
                return fs.readFileSync(cssPath, 'utf8');
            } catch (error) {
                console.warn(`Warning: Could not load custom CSS from ${cssPath}`);
            }
        }
        return '';
    }

    /**
     * Get custom template if configured
     */
    getTemplate(name) {
        const templatePath = path.join(this.templatesPath, `${name}.html`);
        if (fs.existsSync(templatePath)) {
            try {
                return fs.readFileSync(templatePath, 'utf8');
            } catch (error) {
                console.warn(`Warning: Could not load template ${name}`);
            }
        }
        return null;
    }

    /**
     * Check if charts are enabled
     */
    chartsEnabled() {
        return this.get('charts.enabled') === true;
    }

    /**
     * Get chart colors
     */
    getChartColors() {
        return this.get('charts.colors') || this.defaults.charts.colors;
    }

    /**
     * Create sample configuration
     */
    static createSampleConfig() {
        const sampleConfig = {
            theme: 'dark',
            companyName: 'My Company',

            charts: {
                enabled: true,
                showActivityChart: true,
                showContributorPie: true,
                showLanguageBar: true,
                showHeatmap: true
            },

            stats: {
                currency: '$',
                showLineValue: true,
                lineValue: 50,
                showProductivity: true,
                showQualityMetrics: true
            },

            filters: {
                excludeAuthors: ['bot@example.com', 'dependabot[bot]'],
                excludePatterns: ['*.test.js', '*.spec.ts']
            },

            widgets: {
                showCodeValue: true,
                showHealthScore: true,
                showBusFactor: true
            }
        };

        const configDir = '.git-moar';
        if (!fs.existsSync(configDir)) {
            fs.mkdirSync(configDir, { recursive: true });
        }

        const configPath = path.join(configDir, 'config.json');
        fs.writeFileSync(configPath, JSON.stringify(sampleConfig, null, 2));

        // Create subdirectories
        ['themes', 'templates', 'templates/widgets'].forEach(dir => {
            const dirPath = path.join(configDir, dir);
            if (!fs.existsSync(dirPath)) {
                fs.mkdirSync(dirPath, { recursive: true });
            }
        });

        return configPath;
    }
}

// Export singleton instance
module.exports = new Config();
