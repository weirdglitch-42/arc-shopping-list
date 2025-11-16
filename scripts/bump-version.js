#!/usr/bin/env node

const fs = require('fs');
const { execSync } = require('child_process');

function bumpVersion(type = 'patch') {
  try {
    console.log(`🚀 Bumping version (${type})...`);

    // Read current version
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const currentVersion = packageJson.version;
    console.log(`📦 Current version: ${currentVersion}`);

    // Parse version
    const [major, minor, patch] = currentVersion.split('.').map(Number);

    // Calculate new version
    let newVersion;
    switch (type) {
      case 'major':
        newVersion = `${major + 1}.0.0`;
        break;
      case 'minor':
        newVersion = `${major}.${minor + 1}.0`;
        break;
      case 'patch':
      default:
        newVersion = `${major}.${minor}.${patch + 1}`;
        break;
    }

    console.log(`📈 New version: ${newVersion}`);

    // Update package.json
    packageJson.version = newVersion;
    fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2) + '\n');

    // Update progress.md if it exists (but don't add to git since memory-bank is ignored)
    const progressFile = 'memory-bank/progress.md';
    if (fs.existsSync(progressFile)) {
      let progressContent = fs.readFileSync(progressFile, 'utf8');
      progressContent = progressContent.replace(
        /Version: v[\d.]+/g,
        `Version: v${newVersion}`
      );
      fs.writeFileSync(progressFile, progressContent);
      console.log(`✅ Updated version in ${progressFile}`);
    }

    console.log(`✅ Version bumped to ${newVersion}`);
    return newVersion;

  } catch (error) {
    console.error('❌ Error bumping version:', error.message);
    process.exit(1);
  }
}

function createRelease(newVersion) {
  try {
    console.log('📝 Creating release commit...');

    // Stage changes (only package.json since memory-bank is ignored)
    execSync('git add package.json', { stdio: 'inherit' });

    // Commit
    execSync(`git commit -m "chore: bump version to v${newVersion}"`, { stdio: 'inherit' });

    // Create tag
    execSync(`git tag v${newVersion}`, { stdio: 'inherit' });

    // Push
    execSync('git push origin HEAD', { stdio: 'inherit' });
    execSync(`git push origin v${newVersion}`, { stdio: 'inherit' });

    console.log(`✅ Release v${newVersion} created and pushed!`);
    console.log('🎉 GitHub Actions will now build and create the release automatically.');

  } catch (error) {
    console.error('❌ Error creating release:', error.message);
    process.exit(1);
  }
}

function main() {
  const args = process.argv.slice(2);
  const type = args[0] || 'patch';

  if (!['major', 'minor', 'patch'].includes(type)) {
    console.error('❌ Invalid version type. Use: major, minor, or patch');
    process.exit(1);
  }

  const newVersion = bumpVersion(type);
  createRelease(newVersion);
}

if (require.main === module) {
  main();
}

module.exports = { bumpVersion, createRelease };
