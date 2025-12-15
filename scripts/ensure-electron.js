/*
 * Copyright (c) 2025 Aarón Negrín
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

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





