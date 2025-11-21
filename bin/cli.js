#!/usr/bin/env node

const chalk = require('chalk');
const path = require('path');
const fs = require('fs');

// Import our commands
const snitch = require('../lib/snitch');
const scattered = require('../lib/scattered');

function showHelp() {
  console.log(chalk.cyan.bold('🔍 git-moar') + chalk.gray(' - Advanced Git Reporting Tools'));
  console.log('');
  console.log(chalk.yellow('Usage:'));
  console.log('  git-moar <command> [options]');
  console.log('');
  console.log(chalk.yellow('Commands:'));
  console.log(chalk.green('  snitch') + '     ' + chalk.gray('Generate detailed single-repository activity report'));
  console.log(chalk.green('  scattered') + '  ' + chalk.gray('Cross-repository analysis and activity summary'));
  console.log('');
  console.log(chalk.yellow('Examples:'));
  console.log(chalk.gray('  git-moar snitch --start-date 2023-01-01 --end-date 2023-12-31'));
  console.log(chalk.gray('  git-moar scattered --period 7d --dir ~/Code'));
  console.log('');
  console.log(chalk.yellow('Get help for specific commands:'));
  console.log(chalk.gray('  git-moar snitch --help'));
  console.log(chalk.gray('  git-moar scattered --help'));
  console.log('');
}

function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    showHelp();
    return;
  }

  const command = args[0];
  const commandArgs = args.slice(1);

  // Handle global help
  if (args.includes('--help') || args.includes('-h')) {
    if (command === 'snitch' || command === 'scattered') {
      // Pass help to the subcommand
    } else {
      showHelp();
      return;
    }
  }

  switch (command) {
    case 'snitch':
      snitch.run(commandArgs);
      break;
    case 'scattered':
      scattered.run(commandArgs);
      break;
    default:
      console.log(chalk.red(`❌ Unknown command: ${command}`));
      console.log('');
      showHelp();
      process.exit(1);
  }
}

main();