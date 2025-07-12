// Ensure Electron binaries are installed
// This script checks if Electron needs its binaries downloaded and runs the install script if needed

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const electronPath = path.join(__dirname, '..', 'node_modules', 'electron');
const pathTxt = path.join(electronPath, 'path.txt');
const installJs = path.join(electronPath, 'install.js');

if (fs.existsSync(electronPath) && !fs.existsSync(pathTxt)) {
  console.log('Electron binaries not found, installing...');
  if (fs.existsSync(installJs)) {
    try {
      execSync('node install.js', {
        cwd: electronPath,
        stdio: 'inherit'
      });
      console.log('Electron binaries installed successfully');
    } catch (error) {
      console.error('Failed to install Electron binaries:', error.message);
      process.exit(1);
    }
  } else {
    console.warn('Electron install.js not found, skipping...');
  }
}


