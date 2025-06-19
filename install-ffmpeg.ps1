# FFmpeg Installation Script for Windows
# Run this script as Administrator in PowerShell

Write-Host "🎬 FFmpeg Installation Script" -ForegroundColor Magenta
Write-Host "=============================" -ForegroundColor Magenta

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")

if (-not $isAdmin) {
    Write-Host "❌ This script must be run as Administrator!" -ForegroundColor Red
    Write-Host "Please right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    exit 1
}

# Define paths
$ffmpegDir = "C:\ffmpeg"
$ffmpegBin = "$ffmpegDir\bin"
$downloadUrl = "https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip"
$zipFile = "$env:TEMP\ffmpeg.zip"

Write-Host "📁 Setting up FFmpeg installation..." -ForegroundColor Blue

# Create directory if it doesn't exist
if (-not (Test-Path $ffmpegDir)) {
    New-Item -ItemType Directory -Path $ffmpegDir -Force | Out-Null
    Write-Host "   Created directory: $ffmpegDir" -ForegroundColor Green
}

# Check if FFmpeg is already installed
if (Test-Path "$ffmpegBin\ffmpeg.exe") {
    Write-Host "✅ FFmpeg is already installed at $ffmpegBin" -ForegroundColor Green
    
    # Test if it's in PATH
    try {
        $version = & ffmpeg -version 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ FFmpeg is working and in PATH" -ForegroundColor Green
            exit 0
        }
    } catch {
        Write-Host "⚠️  FFmpeg exists but not in PATH, adding to PATH..." -ForegroundColor Yellow
    }
} else {
    Write-Host "📥 Downloading FFmpeg..." -ForegroundColor Blue
    
    try {
        # Download FFmpeg
        Invoke-WebRequest -Uri $downloadUrl -OutFile $zipFile -UseBasicParsing
        Write-Host "   Downloaded FFmpeg" -ForegroundColor Green
        
        # Extract ZIP
        Write-Host "📦 Extracting FFmpeg..." -ForegroundColor Blue
        Expand-Archive -Path $zipFile -DestinationPath $env:TEMP -Force
        
        # Find the extracted folder (it has a version number in the name)
        $extractedFolder = Get-ChildItem -Path $env:TEMP -Directory | Where-Object { $_.Name -like "ffmpeg-*-essentials_build" } | Select-Object -First 1
        
        if ($extractedFolder) {
            # Copy contents to our ffmpeg directory
            Copy-Item -Path "$($extractedFolder.FullName)\*" -Destination $ffmpegDir -Recurse -Force
            Write-Host "   Extracted FFmpeg to $ffmpegDir" -ForegroundColor Green
            
            # Clean up
            Remove-Item -Path $zipFile -Force -ErrorAction SilentlyContinue
            Remove-Item -Path $extractedFolder.FullName -Recurse -Force -ErrorAction SilentlyContinue
        } else {
            throw "Could not find extracted FFmpeg folder"
        }
        
    } catch {
        Write-Host "❌ Failed to download or extract FFmpeg: $($_.Exception.Message)" -ForegroundColor Red
        exit 1
    }
}

# Add to PATH
Write-Host "🔧 Adding FFmpeg to system PATH..." -ForegroundColor Blue

try {
    # Get current PATH
    $currentPath = [Environment]::GetEnvironmentVariable("PATH", "Machine")
    
    # Check if FFmpeg is already in PATH
    if ($currentPath -notlike "*$ffmpegBin*") {
        # Add FFmpeg to PATH
        $newPath = "$currentPath;$ffmpegBin"
        [Environment]::SetEnvironmentVariable("PATH", $newPath, "Machine")
        Write-Host "   Added $ffmpegBin to system PATH" -ForegroundColor Green
        
        # Update current session PATH
        $env:PATH = "$env:PATH;$ffmpegBin"
    } else {
        Write-Host "   FFmpeg is already in system PATH" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "❌ Failed to add FFmpeg to PATH: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "You may need to add it manually:" -ForegroundColor Yellow
    Write-Host "   Path to add: $ffmpegBin" -ForegroundColor Yellow
}

# Test installation
Write-Host "🧪 Testing FFmpeg installation..." -ForegroundColor Blue

try {
    # Test FFmpeg
    $ffmpegVersion = & "$ffmpegBin\ffmpeg.exe" -version 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ FFmpeg is working!" -ForegroundColor Green
    } else {
        throw "FFmpeg test failed"
    }
    
    # Test FFprobe
    $ffprobeVersion = & "$ffmpegBin\ffprobe.exe" -version 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ FFprobe is working!" -ForegroundColor Green
    } else {
        throw "FFprobe test failed"
    }
    
} catch {
    Write-Host "❌ FFmpeg installation test failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Please restart your terminal and try again" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "🎉 FFmpeg installation completed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Next steps:" -ForegroundColor Blue
Write-Host "   1. Restart your terminal/PowerShell" -ForegroundColor Cyan
Write-Host "   2. Test with: ffmpeg -version" -ForegroundColor Cyan
Write-Host "   3. Run: node install.cjs (to verify Video Utility Suite requirements)" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ You can now use the Video Utility Suite with full functionality!" -ForegroundColor Green
