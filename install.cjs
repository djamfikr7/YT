#!/usr/bin/env node

/**
 * Video Utility Suite Installation Script
 * Checks system requirements and sets up the application
 */

const { execSync, spawn } = require('child_process')
const fs = require('fs')
const path = require('path')
const os = require('os')

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function checkCommand(command, name) {
  // First try the command directly (if in PATH)
  try {
    execSync(`${command} --version`, { stdio: 'ignore' })
    log(`✅ ${name} is installed`, 'green')
    return true
  } catch (error) {
    // If not in PATH, check common installation locations
    if (command === 'ffmpeg' || command === 'ffprobe') {
      const possiblePaths = [
        `C:\\ffmpeg\\bin\\${command}.exe`,
        `C:\\ffmpeg\\${command}.exe`,
        `C:\\ProgramData\\chocolatey\\bin\\${command}.exe`
      ]

      for (const testPath of possiblePaths) {
        if (fs.existsSync(testPath)) {
          try {
            execSync(`"${testPath}" --version`, { stdio: 'ignore' })
            log(`✅ ${name} is installed at ${testPath}`, 'green')
            return true
          } catch (pathError) {
            // Continue to next path
          }
        }
      }
    }

    log(`❌ ${name} is not installed`, 'red')
    return false
  }
}

function createDirectories() {
  const dirs = ['uploads', 'downloads', 'processed', 'temp', 'logs']
  
  log('\n📁 Creating required directories...', 'blue')
  
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
      log(`   Created: ${dir}`, 'green')
    } else {
      log(`   Exists: ${dir}`, 'yellow')
    }
  })
}

function createEnvFile() {
  if (!fs.existsSync('.env')) {
    log('\n⚙️  Creating .env file...', 'blue')
    if (fs.existsSync('.env.example')) {
      fs.copyFileSync('.env.example', '.env')
      log('   Created .env file from .env.example', 'green')
      log('   Please edit .env file to configure API keys', 'yellow')
    } else {
      log('   .env.example not found, skipping .env creation', 'yellow')
    }
  } else {
    log('\n⚙️  .env file already exists', 'yellow')
  }
}

function checkSystemRequirements() {
  log('🔍 Checking system requirements...', 'blue')
  
  const requirements = [
    { command: 'node', name: 'Node.js', required: true },
    { command: 'npm', name: 'npm', required: true },
    { command: 'ffmpeg', name: 'FFmpeg', required: false },
    { command: 'ffprobe', name: 'FFprobe', required: false },
    { command: 'yt-dlp', name: 'yt-dlp', required: false },
    { command: 'python', name: 'Python', required: false }
  ]
  
  let allRequired = true
  let missingOptional = []
  
  requirements.forEach(req => {
    const installed = checkCommand(req.command, req.name)
    if (req.required && !installed) {
      allRequired = false
    }
    if (!req.required && !installed) {
      missingOptional.push(req.name)
    }
  })
  
  if (!allRequired) {
    log('\n❌ Missing required dependencies!', 'red')
    process.exit(1)
  }
  
  if (missingOptional.length > 0) {
    log('\n⚠️  Some optional dependencies are missing:', 'yellow')
    missingOptional.forEach(dep => log(`   - ${dep}`, 'yellow'))
    log('   The application will work with limited functionality', 'yellow')
    log('\nTo install missing dependencies:', 'cyan')
    log('  FFmpeg: https://ffmpeg.org/download.html', 'cyan')
    log('  yt-dlp: pip install yt-dlp', 'cyan')
  }
  
  log('\n✅ System requirements check passed!', 'green')
}

function displayStartupInstructions() {
  log('\n🎉 Installation completed successfully!', 'green')
  log('\n🚀 To start the application:', 'blue')
  log('   1. Start the backend server:', 'cyan')
  log('      npm run server', 'cyan')
  log('   2. In another terminal, start the frontend:', 'cyan')
  log('      npm run dev', 'cyan')
  log('   3. Open your browser to:', 'cyan')
  log('      http://localhost:3001', 'cyan')
  
  log('\n📝 Configuration:', 'blue')
  log('   - Edit .env file to add API keys for enhanced features', 'cyan')
  log('   - Check README.md for detailed usage instructions', 'cyan')
  
  log('\n🔧 Development commands:', 'blue')
  log('   npm run dev        - Start frontend development server', 'cyan')
  log('   npm run server     - Start backend server', 'cyan')
  log('   npm run dev:server - Start backend with auto-reload', 'cyan')
  log('   npm run build      - Build for production', 'cyan')
}

function main() {
  log('🎬 Video Utility Suite Installation', 'magenta')
  log('=====================================', 'magenta')
  
  try {
    checkSystemRequirements()
    createDirectories()
    createEnvFile()
    displayStartupInstructions()
  } catch (error) {
    log(`\n❌ Installation failed: ${error.message}`, 'red')
    process.exit(1)
  }
}

// Run installation if this script is executed directly
if (require.main === module) {
  main()
}

module.exports = { main, checkCommand, createDirectories, createEnvFile }
