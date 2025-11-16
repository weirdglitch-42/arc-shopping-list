#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');

function analyzeCommits() {
  try {
    console.log('🔍 Analyzing recent commits for version bump...');

    // Get commits since last tag
    const lastTag = execSync('git describe --tags --abbrev=0 2>/dev/null || echo ""', { encoding: 'utf8' }).trim();
    const range = lastTag ? `${lastTag}..HEAD` : 'HEAD';

    const commits = execSync(`git log ${range} --oneline --pretty=format:"%s"`, { encoding: 'utf8' })
      .split('\n')
      .filter(commit => commit.trim());

    console.log(`📝 Found ${commits.length} commits since ${lastTag || 'beginning'}:`);
    commits.forEach(commit => console.log(`   ${commit}`));

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

    // Clean and build
    if (fs.existsSync('dist')) {
      fs.rmSync('dist', { recursive: true, force: true });
    }

    execSync('npm run build', { stdio: 'inherit' });

    // Verify build
    const exePath = 'dist/ARC Raiders Item Tracker Setup 1.0.0.exe';
    if (!fs.existsSync(exePath)) {
      throw new Error('Build failed - executable not found');
    }

    // Create local zip
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const version = packageJson.version;
    const zipName = `arc-shopping-list-v${version}-windows.zip`;

    // Clean up old zips
    const oldZips = fs.readdirSync('.').filter(file => file.startsWith('arc-shopping-list-v') && file.endsWith('.zip'));
    oldZips.forEach(zip => fs.unlinkSync(zip));

    // Create new zip
    const tempDir = 'temp_release';
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    fs.mkdirSync(tempDir);

    fs.copyFileSync(exePath, `${tempDir}/installer.exe`);
    fs.copyFileSync('README.md', `${tempDir}/README.md`);

    const psCommand = `Compress-Archive -Path "${tempDir}/*" -DestinationPath "${zipName}" -Force`;
    execSync(`powershell "${psCommand}"`, { stdio: 'inherit' });

    fs.rmSync(tempDir, { recursive: true, force: true });

    const stats = fs.statSync(zipName);
    console.log(`✅ Local package created: ${zipName} (${(stats.size / 1024 / 1024).toFixed(1)}MB)`);

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
