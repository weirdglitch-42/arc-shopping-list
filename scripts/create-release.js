#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');

function createRelease() {
  try {
    console.log('🚀 Building and packaging release...');

    // Get current version from package.json
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const version = packageJson.version;

    console.log(`📦 Building ARC Raiders Item Tracker v${version}`);

    // Clean previous builds
    if (fs.existsSync('dist')) {
      fs.rmSync('dist', { recursive: true, force: true });
    }

    // Build the application
    execSync('npm run build', { stdio: 'inherit' });

    // Verify build output
    const exePath = `dist/ARC Raiders Item Tracker Setup ${version}.exe`;
    if (!fs.existsSync(exePath)) {
      throw new Error(`Build failed: ${exePath} not found`);
    }

    // Create zip file with installer and readme
    console.log('📁 Creating distribution package...');
    const zipName = `arc-shopping-list-v${version}-windows.zip`;

    // Copy files to a temp directory without spaces for zipping
    const tempDir = 'temp_release';
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    fs.mkdirSync(tempDir);

    // Copy files to temp directory
    fs.copyFileSync(exePath, `${tempDir}/installer.exe`);
    fs.copyFileSync('README.md', `${tempDir}/README.md`);

    // Use PowerShell to create zip from temp directory
    const psCommand = `Compress-Archive -Path "${tempDir}/*" -DestinationPath "${zipName}" -Force`;
    execSync(`powershell "${psCommand}"`, { stdio: 'inherit' });

    // Clean up temp directory
    fs.rmSync(tempDir, { recursive: true, force: true });

    console.log(`✅ Release package created: ${zipName}`);
    console.log(`📊 Package size: ${fs.statSync(zipName).size} bytes`);
    console.log('');
    console.log('📋 To create a GitHub release:');
    console.log(`   1. Commit changes: git add . && git commit -m "Release v${version}"`);
    console.log(`   2. Create tag: git tag v${version}`);
    console.log(`   3. Push tag: git push origin v${version}`);
    console.log('   4. GitHub Actions will build for all platforms and create release');

  } catch (error) {
    console.error('❌ Error creating release:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  createRelease();
}

module.exports = { createRelease };
