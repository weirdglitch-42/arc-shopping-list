#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');

function analyzeCommits() {
  try {
    console.log('🔍 Analyzing recent commits for version bump...');

    // Get the last tag (cross-platform)
    let lastTag = '';
    try {
      lastTag = execSync('git describe --tags --abbrev=0', { encoding: 'utf8' }).trim();
    } catch (error) {
      // No tags found, use empty string
      lastTag = '';
    }

    // Get commits since last tag or all commits
    let commits = [];
    try {
      const range = lastTag ? `${lastTag}..HEAD` : '--all';
      const gitOutput = execSync(`git log ${range} --oneline --pretty=format:"%s"`, { encoding: 'utf8' });
      commits = gitOutput.split('\n').filter(commit => commit.trim());
    } catch (error) {
      console.log('⚠️ Could not get commit history');
      commits = [];
    }

    console.log(`📝 Found ${commits.length} commits since ${lastTag || 'beginning'}:`);
    commits.slice(0, 5).forEach(commit => console.log(`   ${commit}`));
    if (commits.length > 5) {
      console.log(`   ... and ${commits.length - 5} more`);
    }

    // Analyze commit messages for version bump type
    let bumpType = 'patch'; // default

    for (const commit of commits) {
      const message = commit.toLowerCase();

      // Check for breaking changes or major features
      if (message.includes('breaking') || message.includes('breaking change') ||
          message.includes('!') || message.startsWith('feat!')) {
        bumpType = 'major';
        break;
      }

      // Check for new features (minor bump)
      if (message.startsWith('feat') && bumpType !== 'major') {
        bumpType = 'minor';
      }

      // Fix commits stay as patch (default)
    }

    console.log(`📊 Determined version bump: ${bumpType}`);
    return bumpType;

  } catch (error) {
    console.log('⚠️ Could not analyze commits, defaulting to patch bump');
    return 'patch';
  }
}

function runLocalBuild() {
  try {
    console.log('🔨 Running local build and packaging...');

    // Clean release directory
    if (fs.existsSync('release')) {
      fs.rmSync('release', { recursive: true, force: true });
    }

    try {
      execSync('npm run build:win', { stdio: 'inherit' });
    } catch (buildError) {
      console.log('⚠️ Build completed with warnings/errors, checking for output files...');
    }

    // Verify build - get current version from package.json
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const currentVersion = packageJson.version;
    const zipPath = `release/ARC Raiders Item Tracker-${currentVersion}-win.zip`;
    if (!fs.existsSync(zipPath)) {
      throw new Error(`Build failed - ${zipPath} not found`);
    }

    // Copy the build zip to the expected location
    const version = currentVersion;
    const finalZipName = `arc-shopping-list-v${version}-windows.zip`;

    // Clean up old zips
    const oldZips = fs.readdirSync('.').filter(file => file.startsWith('arc-shopping-list-v') && file.endsWith('.zip'));
    oldZips.forEach(zip => fs.unlinkSync(zip));

    // Copy the build zip to the root directory with the expected name
    fs.copyFileSync(zipPath, finalZipName);

    const stats = fs.statSync(finalZipName);
    console.log(`✅ Local package created: ${finalZipName} (${(stats.size / 1024 / 1024).toFixed(1)}MB)`);

  } catch (error) {
    console.error('❌ Local build failed:', error.message);
    process.exit(1);
  }
}

function createAutomatedRelease() {
  try {
    console.log('🚀 Creating automated release...');

    // Analyze commits for version bump
    const bumpType = analyzeCommits();

    // Run version bump
    console.log(`\n📈 Bumping version (${bumpType})...`);
    execSync(`npm run bump:${bumpType}`, { stdio: 'inherit' });

    // Run local build
    runLocalBuild();

    console.log('\n🎉 Automated release complete!');
    console.log('📋 Summary:');
    console.log(`   • Version bumped: ${bumpType}`);
    console.log('   • Local build created');
    console.log('   • Changes committed and tagged');
    console.log('   • GitHub Actions will create full cross-platform release');

  } catch (error) {
    console.error('❌ Automated release failed:', error.message);
    process.exit(1);
  }
}

function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'analyze':
      const bumpType = analyzeCommits();
      console.log(`Recommended version bump: ${bumpType}`);
      break;

    case 'build':
      runLocalBuild();
      break;

    default:
      createAutomatedRelease();
      break;
  }
}

if (require.main === module) {
  main();
}

module.exports = { analyzeCommits, runLocalBuild, createAutomatedRelease };
