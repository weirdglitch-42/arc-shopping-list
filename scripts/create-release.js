#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function createRelease() {
  try {
    console.log('🚀 Creating release...');

    // Get current version from package.json
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const version = packageJson.version;

    console.log(`📦 Building version ${version}`);

    // Build the application
    execSync('npm run build', { stdio: 'inherit' });

    // Create zip file with installer and readme
    console.log('📁 Creating distribution zip...');
    const zipName = `arc-shopping-list-v${version}.zip`;

    // Use PowerShell to create zip (works on Windows)
    execSync(`powershell "Compress-Archive -Path 'dist\\ARC Raiders Item Tracker Setup ${version}.exe', 'README.md' -DestinationPath '${zipName}' -Force"`, { stdio: 'inherit' });

    console.log(`✅ Release created: ${zipName}`);
    console.log('📋 Next steps:');
    console.log(`   1. Commit your changes: git add . && git commit -m "Release v${version}"`);
    console.log(`   2. Create and push tag: git tag v${version} && git push origin v${version}`);
    console.log('   3. GitHub Actions will automatically create a release with all platform builds');

  } catch (error) {
    console.error('❌ Error creating release:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  createRelease();
}

module.exports = { createRelease };
