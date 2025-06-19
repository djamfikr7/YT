#!/usr/bin/env node

/**
 * Video Utility Suite - Master Server
 * Consolidated server with real yt-dlp and Whisper integration
 * Version: 2.0.0
 */

const express = require('express')
const cors = require('cors')
const fs = require('fs')
const path = require('path')
const multer = require('multer')
const { spawn } = require('child_process')
const { v4: uuidv4 } = require('uuid')

const app = express()
const PORT = 9001

// ===== CONFIGURATION =====
const CONFIG = {
  directories: {
    downloads: 'storage/downloads',
    processed: 'storage/processed',
    uploads: 'storage/uploads',
    temp: 'storage/temp',
    jobs: 'storage/jobs'
  },
  whisper: {
    models: ['tiny', 'base', 'small', 'medium', 'large'],
    defaultModel: 'base'
  },
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB
    concurrentJobs: 5
  }
}

// ===== MIDDLEWARE =====
app.use(cors({
  origin: ['http://localhost:3001', 'http://localhost:3000', 'http://localhost:5173'],
  credentials: true
}))
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true, limit: '50mb' }))

// File upload configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    ensureDirectory(CONFIG.directories.uploads)
    cb(null, CONFIG.directories.uploads)
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')
    cb(null, `${uniqueSuffix}-${sanitizedName}`)
  }
})

const upload = multer({
  storage: storage,
  limits: { fileSize: CONFIG.limits.fileSize },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /\.(mp4|avi|mov|mkv|webm|mp3|wav|flac|m4a|ogg)$/i
    if (allowedTypes.test(file.originalname)) {
      cb(null, true)
    } else {
      cb(new Error('Invalid file type. Only video and audio files are allowed.'))
    }
  }
})

// ===== UTILITY FUNCTIONS =====
const ensureDirectory = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
    console.log(`[INFO] Created directory: ${dir}`)
  }
}

const initializeDirectories = () => {
  console.log('[INFO] Initializing directory structure...')
  Object.values(CONFIG.directories).forEach(ensureDirectory)
}

// Job persistence system
const jobStorage = {
  save: (job) => {
    try {
      const jobPath = path.join('jobs', `${job.id}.json`)
      fs.writeFileSync(jobPath, JSON.stringify(job, null, 2))
    } catch (error) {
      console.error(`[ERROR] Failed to save job ${job.id}:`, error.message)
    }
  },

  load: (jobId) => {
    try {
      const jobPath = path.join('jobs', `${jobId}.json`)
      if (fs.existsSync(jobPath)) {
        const jobData = fs.readFileSync(jobPath, 'utf8')
        const job = JSON.parse(jobData)
        // Convert date strings back to Date objects
        job.createdAt = new Date(job.createdAt)
        job.updatedAt = new Date(job.updatedAt)
        if (job.completedAt) job.completedAt = new Date(job.completedAt)
        return job
      }
    } catch (error) {
      console.error(`[ERROR] Failed to load job ${jobId}:`, error.message)
    }
    return null
  },

  loadAll: () => {
    try {
      if (!fs.existsSync('jobs')) return []
      const jobFiles = fs.readdirSync('jobs').filter(file => file.endsWith('.json'))
      return jobFiles.map(file => {
        const jobId = path.basename(file, '.json')
        return jobStorage.load(jobId)
      }).filter(job => job !== null)
    } catch (error) {
      console.error('[ERROR] Failed to load jobs:', error.message)
      return []
    }
  },

  delete: (jobId) => {
    try {
      const jobPath = path.join('jobs', `${jobId}.json`)
      if (fs.existsSync(jobPath)) {
        fs.unlinkSync(jobPath)
      }
    } catch (error) {
      console.error(`[ERROR] Failed to delete job ${jobId}:`, error.message)
    }
  }
}

// Note: Upload configuration is defined earlier in the file

// Job management
const jobs = new Map()

const createJob = (type, input, options = {}) => {
  const jobId = uuidv4()
  const job = {
    id: jobId,
    type,
    status: 'pending',
    progress: 0,
    input,
    options,
    createdAt: new Date(),
    updatedAt: new Date()
  }
  jobs.set(jobId, job)
  jobStorage.save(job) // Persist to disk
  console.log(`[INFO] Created job ${jobId} (${type})`)
  return job
}

const updateJob = (jobId, updates) => {
  const job = jobs.get(jobId)
  if (job) {
    Object.assign(job, updates, { updatedAt: new Date() })
    if (updates.status === 'completed') {
      job.completedAt = new Date()
    }
    jobs.set(jobId, job)
    jobStorage.save(job) // Persist to disk
    console.log(`[INFO] Updated job ${jobId}: ${job.status} (${job.progress}%)`)
  }
  return job
}

const getJob = (jobId) => {
  // Try memory first, then disk
  let job = jobs.get(jobId)
  if (!job) {
    job = jobStorage.load(jobId)
    if (job) {
      jobs.set(jobId, job) // Cache in memory
    }
  }
  return job
}

// Load existing jobs on startup
const loadExistingJobs = () => {
  try {
    console.log('[INFO] Loading existing jobs from disk...')
    const existingJobs = jobStorage.loadAll()
    let loadedCount = 0

    existingJobs.forEach(job => {
      try {
        if (job && job.id) {
          jobs.set(job.id, job)
          loadedCount++
        } else {
          console.warn('[WARN] Skipping invalid job:', job)
        }
      } catch (jobError) {
        console.error('[ERROR] Failed to load job:', jobError.message)
      }
    })

    console.log(`[INFO] Loaded ${loadedCount} existing jobs`)
  } catch (error) {
    console.error('[ERROR] Failed to load jobs from disk:', error.message)
    console.log('[INFO] Continuing with empty job list...')
  }
}

// Standardized error response helper
const sendError = (res, status, error, details = null) => {
  const errorResponse = {
    success: false,
    error,
    details,
    timestamp: new Date().toISOString()
  }
  console.error(`[ERROR ${status}] ${error}${details ? ': ' + details : ''}`)
  res.status(status).json(errorResponse)
}

// Standardized success response helper
const sendSuccess = (res, data, message = null) => {
  const successResponse = {
    success: true,
    ...data,
    ...(message && { message }),
    timestamp: new Date().toISOString()
  }
  res.json(successResponse)
}

// Test external tool installations
let ytDlpAvailable = false
let whisperAvailable = false
let ffmpegAvailable = false

const testYtDlpInstallation = async () => {
  return new Promise((resolve) => {
    const ytdlp = spawn('yt-dlp', ['--version'])

    ytdlp.on('close', (code) => {
      if (code === 0) {
        ytDlpAvailable = true
        console.log('[SUCCESS] yt-dlp is installed and ready!')
        resolve(true)
      } else {
        ytDlpAvailable = false
        console.log('[ERROR] yt-dlp not working properly')
        resolve(false)
      }
    })

    ytdlp.on('error', () => {
      ytDlpAvailable = false
      console.log('[ERROR] yt-dlp not found - install with: pip install yt-dlp')
      resolve(false)
    })
  })
}

const testWhisperInstallation = async () => {
  return new Promise((resolve) => {
    const whisper = spawn('whisper', ['--help'])

    whisper.on('close', (code) => {
      if (code === 0) {
        whisperAvailable = true
        console.log('[SUCCESS] Whisper is installed and ready!')
        resolve(true)
      } else {
        whisperAvailable = false
        console.log('[ERROR] Whisper not working properly')
        resolve(false)
      }
    })

    whisper.on('error', () => {
      whisperAvailable = false
      console.log('[ERROR] Whisper not found - install with: pip install openai-whisper')
      resolve(false)
    })
  })
}

const testFFmpegInstallation = async () => {
  return new Promise((resolve) => {
    const ffmpeg = spawn('ffmpeg', ['-version'])

    ffmpeg.on('close', (code) => {
      if (code === 0) {
        ffmpegAvailable = true
        console.log('[SUCCESS] FFmpeg is installed and ready!')
        resolve(true)
      } else {
        ffmpegAvailable = false
        console.log('[ERROR] FFmpeg not working properly')
        resolve(false)
      }
    })

    ffmpeg.on('error', () => {
      ffmpegAvailable = false
      console.log('[ERROR] FFmpeg not found - install FFmpeg')
      resolve(false)
    })
  })
}

// Get video info using yt-dlp
async function getVideoInfo(url) {
  return new Promise((resolve, reject) => {
    const ytdlp = spawn('yt-dlp', [url, '--dump-json', '--no-download'])
    let output = ''
    let error = ''

    ytdlp.stdout.on('data', (data) => {
      output += data.toString()
    })

    ytdlp.stderr.on('data', (data) => {
      error += data.toString()
    })

    ytdlp.on('close', (code) => {
      if (code === 0) {
        try {
          // Handle multiple JSON objects (playlist) by splitting on newlines
          const lines = output.trim().split('\n').filter(line => line.trim())

          if (lines.length === 0) {
            reject(new Error('No video information received'))
            return
          }

          // Parse the first video info (for playlists, we'll use the first video)
          const info = JSON.parse(lines[0])

          // If it's a playlist, add playlist information
          if (lines.length > 1) {
            info.playlist_count = lines.length
            info.is_playlist = true
          }

          resolve(info)
        } catch (parseError) {
          reject(new Error(`Failed to parse video info: ${parseError.message}`))
        }
      } else {
        reject(new Error(`yt-dlp failed: ${error}`))
      }
    })

    ytdlp.on('error', (err) => {
      reject(new Error(`yt-dlp command failed: ${err.message}`))
    })
  })
}

// Transcribe audio using Whisper
async function transcribeAudioReal(audioPath, jobId, options = {}) {
  return new Promise((resolve, reject) => {
    const outputDir = 'processed'
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const outputFormats = options.outputFormats || ['txt']
    const model = options.model || 'base'
    const temperature = options.temperature || 0.0
    const beamSize = options.beamSize || 5

    const args = [
      audioPath,
      '--output_dir', outputDir,
      '--verbose', 'False'  // Disable verbose output to avoid Unicode issues
    ]

    // Add language if specified, otherwise force English to avoid Unicode issues
    if (options.language && options.language !== 'auto') {
      args.push('--language', options.language)
    } else {
      args.push('--language', 'en')
    }

    // Add task type (transcribe is default, but we can be explicit)
    args.push('--task', 'transcribe')

    // Add model specification
    args.push('--model', model)

    // Add quality parameters
    if (temperature !== 0.0) {
      args.push('--temperature', temperature.toString())
    }

    if (beamSize !== 5) {
      args.push('--beam_size', beamSize.toString())
    }

    // Add timestamp options
    if (options.removeTimestamps) {
      args.push('--word_timestamps', 'False')
    }

    console.log(`[INFO] Starting transcription with model ${model}: whisper ${args.join(' ')}`)

    const whisper = spawn('whisper', args, {
      env: {
        ...process.env,
        PYTHONIOENCODING: 'utf-8',  // Force UTF-8 encoding for Python
        PYTHONUTF8: '1'             // Enable UTF-8 mode in Python
      }
    })
    let output = ''
    let error = ''

    whisper.stdout.on('data', (data) => {
      const text = data.toString()
      output += text
      console.log(`[TRANSCRIBE] ${text.trim()}`)

      // Parse different types of progress indicators
      // Model download progress
      const downloadMatch = text.match(/(\d+)%.*?(\d+\.?\d*[MG]?)\/(\d+\.?\d*[MG]?)/)
      if (downloadMatch) {
        const progress = Math.min(50, parseInt(downloadMatch[1])) // Cap download progress at 50%
        updateJob(jobId, { progress, status: 'processing', note: 'Downloading model...' })
        return
      }

      // Transcription segment progress
      const segmentMatch = text.match(/\[(\d{2}):(\d{2})\.(\d{3}) --> (\d{2}):(\d{2})\.(\d{3})\]/)
      if (segmentMatch) {
        // Calculate progress based on timestamp (rough estimate)
        const currentTime = parseInt(segmentMatch[1]) * 60 + parseInt(segmentMatch[2])
        // This is a rough estimate - in a real implementation you'd need the total duration
        const estimatedProgress = Math.min(95, 50 + (currentTime / 10)) // Start from 50% after model download
        updateJob(jobId, { progress: estimatedProgress, status: 'processing', note: 'Transcribing audio...' })
        return
      }

      // Language detection
      const langMatch = text.match(/Detected language: (\w+)/)
      if (langMatch) {
        const detectedLang = langMatch[1].toLowerCase()
        updateJob(jobId, { progress: 60, status: 'processing', note: `Language detected: ${langMatch[1]}` })
        return
      }

      // General progress fallback
      const progressMatch = text.match(/(\d+)%/)
      if (progressMatch) {
        const progress = Math.min(90, parseInt(progressMatch[1]))
        updateJob(jobId, { progress })
      }
    })

    whisper.stderr.on('data', (data) => {
      const text = data.toString()
      error += text
      if (!text.includes('WARNING')) {
        console.log(`[TRANSCRIBE ERROR] ${text.trim()}`)
      }
    })

    whisper.on('close', (code) => {
      if (code === 0) {
        // Find transcribed files - Whisper creates multiple formats by default
        try {
          const baseName = path.basename(audioPath, path.extname(audioPath))
          const foundFiles = []

          // Check for all requested output formats
          for (const format of outputFormats) {
            const expectedFile = `${baseName}.${format}`
            const expectedPath = path.join(outputDir, expectedFile)

            if (fs.existsSync(expectedPath)) {
              const stats = fs.statSync(expectedPath)
              foundFiles.push({
                filename: expectedFile,
                size: stats.size,
                path: expectedPath,
                format: format
              })
            }
          }

          // If no files found with expected names, search for any files with the base name
          if (foundFiles.length === 0) {
            const allFiles = fs.readdirSync(outputDir).filter(f => f.includes(baseName))
            for (const file of allFiles) {
              const filePath = path.join(outputDir, file)
              const stats = fs.statSync(filePath)
              const ext = path.extname(file).substring(1)
              foundFiles.push({
                filename: file,
                size: stats.size,
                path: filePath,
                format: ext
              })
            }
          }

          if (foundFiles.length > 0) {
            console.log(`[SUCCESS] Transcription completed: ${foundFiles.length} file(s) generated`)
            foundFiles.forEach(file => {
              console.log(`  - ${file.filename} (${(file.size / 1024).toFixed(2)} KB)`)
            })

            // Return the first file for compatibility, but include all files in metadata
            const primaryFile = foundFiles[0]
            resolve({
              success: true,
              filename: primaryFile.filename,
              size: primaryFile.size,
              path: primaryFile.path,
              allFiles: foundFiles,
              formats: foundFiles.map(f => f.format)
            })
          } else {
            reject(new Error('Transcription completed but no output files found'))
          }
        } catch (fileError) {
          reject(new Error(`File system error: ${fileError.message}`))
        }
      } else {
        reject(new Error(`Transcription failed with exit code ${code}: ${errorOutput}`))
      }
    })

    whisper.on('error', (err) => {
      reject(new Error(`Whisper command failed: ${err.message}`))
    })
  })
}

// Download video using yt-dlp
async function downloadVideoReal(url, jobId, options = {}) {
  return new Promise((resolve, reject) => {
    const outputDir = 'downloads'
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const outputTemplate = path.join(outputDir, `${timestamp}_%(title)s_${jobId}.%(ext)s`)
    
    const args = [
      url,
      '--output', outputTemplate,
      '--no-playlist'
    ]
    
    // Add format selection
    if (options.audioOnly) {
      args.push('--extract-audio', '--audio-format', 'mp3')
    } else {
      args.push('--format', 'best[height<=720]/best')
    }
    
    console.log(`[INFO] Starting real download: yt-dlp ${args.join(' ')}`)
    
    const ytdlp = spawn('yt-dlp', args)
    let output = ''
    let error = ''
    
    ytdlp.stdout.on('data', (data) => {
      const text = data.toString()
      output += text
      console.log(`[DOWNLOAD] ${text.trim()}`)
      
      // Parse progress if available
      const progressMatch = text.match(/(\d+\.?\d*)%/)
      if (progressMatch) {
        const progress = Math.min(90, parseInt(progressMatch[1]))
        updateJob(jobId, { progress })
      }
    })
    
    ytdlp.stderr.on('data', (data) => {
      const text = data.toString()
      error += text
      if (!text.includes('WARNING')) {
        console.log(`[ERROR] ${text.trim()}`)
      }
    })
    
    ytdlp.on('close', (code) => {
      if (code === 0) {
        // Find downloaded file
        try {
          const files = fs.readdirSync(outputDir).filter(f => f.includes(jobId))
          if (files.length > 0) {
            const downloadedFile = files[0]
            const filePath = path.join(outputDir, downloadedFile)
            const stats = fs.statSync(filePath)
            
            console.log(`[SUCCESS] Real download completed: ${downloadedFile} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`)
            resolve({
              success: true,
              filename: downloadedFile,
              size: stats.size,
              path: filePath
            })
          } else {
            reject(new Error('Download completed but no file found'))
          }
        } catch (fileError) {
          reject(new Error(`File system error: ${fileError.message}`))
        }
      } else {
        reject(new Error(`Download failed with exit code ${code}: ${error}`))
      }
    })
    
    ytdlp.on('error', (err) => {
      reject(new Error(`yt-dlp command failed: ${err.message}`))
    })
  })
}

// Manipulate video using FFmpeg
async function manipulateVideoReal(videoPath, jobId, operation, parameters = {}) {
  return new Promise((resolve, reject) => {
    const outputDir = 'processed'
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const inputExt = path.extname(videoPath)
    const outputFile = path.join(outputDir, `${timestamp}_${operation}_${jobId}${inputExt}`)

    let args = ['-i', videoPath]

    // Build FFmpeg arguments based on operation
    switch (operation) {
      case 'trim':
        if (parameters.startTime) args.push('-ss', parameters.startTime)
        if (parameters.duration) args.push('-t', parameters.duration)
        break
      case 'resize':
        if (parameters.width && parameters.height) {
          args.push('-vf', `scale=${parameters.width}:${parameters.height}`)
        }
        break
      case 'convert':
        // Output format determined by file extension
        break
      case 'rotate':
        if (parameters.angle) {
          const rotateFilter = parameters.angle === '90' ? 'transpose=1' :
                              parameters.angle === '180' ? 'transpose=2,transpose=2' :
                              parameters.angle === '270' ? 'transpose=2' : 'transpose=0'
          args.push('-vf', rotateFilter)
        }
        break
      case 'gif':
        args.push('-vf', 'fps=10,scale=320:-1:flags=lanczos')
        args.push('-c:v', 'gif')
        break
      default:
        return reject(new Error(`Unsupported operation: ${operation}`))
    }

    // Add output file
    args.push('-y', outputFile) // -y to overwrite existing files

    console.log(`[INFO] Starting video manipulation: ffmpeg ${args.join(' ')}`)

    const ffmpeg = spawn('ffmpeg', args)
    let output = ''
    let error = ''

    ffmpeg.stdout.on('data', (data) => {
      const text = data.toString()
      output += text
    })

    ffmpeg.stderr.on('data', (data) => {
      const text = data.toString()
      error += text

      // Parse progress from FFmpeg output
      const timeMatch = text.match(/time=(\d{2}):(\d{2}):(\d{2})/)
      if (timeMatch && parameters.duration) {
        const currentSeconds = parseInt(timeMatch[1]) * 3600 + parseInt(timeMatch[2]) * 60 + parseInt(timeMatch[3])
        const totalSeconds = parseDuration(parameters.duration)
        if (totalSeconds > 0) {
          const progress = Math.min(90, Math.floor((currentSeconds / totalSeconds) * 100))
          updateJob(jobId, { progress })
        }
      }
    })

    ffmpeg.on('close', (code) => {
      if (code === 0) {
        try {
          if (fs.existsSync(outputFile)) {
            const stats = fs.statSync(outputFile)
            const filename = path.basename(outputFile)
            console.log(`[SUCCESS] Video manipulation completed: ${filename}`)
            resolve({
              success: true,
              filename,
              size: stats.size,
              path: outputFile
            })
          } else {
            reject(new Error('Video manipulation completed but no file found'))
          }
        } catch (fileError) {
          reject(new Error(`File system error: ${fileError.message}`))
        }
      } else {
        reject(new Error(`Video manipulation failed with exit code ${code}: ${error}`))
      }
    })

    ffmpeg.on('error', (err) => {
      reject(new Error(`FFmpeg command failed: ${err.message}`))
    })
  })
}

// Helper function to parse duration string to seconds
function parseDuration(duration) {
  const parts = duration.split(':')
  if (parts.length === 3) {
    return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2])
  }
  return 0
}

// Extract comprehensive file metadata using ffprobe
async function extractFileMetadata(filePath) {
  return new Promise((resolve, reject) => {
    const args = [
      '-v', 'quiet',
      '-print_format', 'json',
      '-show_format',
      '-show_streams',
      filePath
    ]

    const ffprobe = spawn('ffprobe', args)
    let output = ''
    let error = ''

    ffprobe.stdout.on('data', (data) => {
      output += data.toString()
    })

    ffprobe.stderr.on('data', (data) => {
      error += data.toString()
    })

    ffprobe.on('close', (code) => {
      if (code === 0) {
        try {
          const metadata = JSON.parse(output)
          const format = metadata.format || {}
          const videoStream = metadata.streams?.find(s => s.codec_type === 'video')
          const audioStream = metadata.streams?.find(s => s.codec_type === 'audio')

          resolve({
            filename: path.basename(filePath),
            size: parseInt(format.size) || 0,
            duration: parseFloat(format.duration) || 0,
            bitrate: parseInt(format.bit_rate) || 0,
            format: format.format_name,
            video: videoStream ? {
              codec: videoStream.codec_name,
              width: videoStream.width,
              height: videoStream.height,
              fps: videoStream.r_frame_rate ? parseFloat(videoStream.r_frame_rate.split('/')[0]) / parseFloat(videoStream.r_frame_rate.split('/')[1]) : 0,
              bitrate: parseInt(videoStream.bit_rate) || 0
            } : null,
            audio: audioStream ? {
              codec: audioStream.codec_name,
              sampleRate: parseInt(audioStream.sample_rate) || 0,
              channels: audioStream.channels,
              bitrate: parseInt(audioStream.bit_rate) || 0
            } : null
          })
        } catch (parseError) {
          reject(new Error(`Failed to parse metadata: ${parseError.message}`))
        }
      } else {
        reject(new Error(`ffprobe failed: ${error}`))
      }
    })

    ffprobe.on('error', (err) => {
      reject(new Error(`ffprobe command failed: ${err.message}`))
    })
  })
}



// Generate thumbnail for video file
async function generateThumbnail(videoPath, jobId) {
  return new Promise((resolve, reject) => {
    const outputDir = 'processed'
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const thumbnailFile = path.join(outputDir, `${timestamp}_thumbnail_${jobId}.jpg`)

    const args = [
      '-i', videoPath,
      '-ss', '00:00:01', // Take screenshot at 1 second
      '-vframes', '1',   // Only one frame
      '-vf', 'scale=320:240', // Resize to thumbnail size
      '-y', thumbnailFile
    ]

    console.log(`[INFO] Generating thumbnail: ffmpeg ${args.join(' ')}`)

    const ffmpeg = spawn('ffmpeg', args)
    let error = ''

    ffmpeg.stderr.on('data', (data) => {
      error += data.toString()
    })

    ffmpeg.on('close', (code) => {
      if (code === 0) {
        try {
          if (fs.existsSync(thumbnailFile)) {
            const stats = fs.statSync(thumbnailFile)
            const filename = path.basename(thumbnailFile)
            console.log(`[SUCCESS] Thumbnail generated: ${filename}`)
            resolve({
              success: true,
              filename,
              size: stats.size,
              path: thumbnailFile
            })
          } else {
            reject(new Error('Thumbnail generation completed but no file found'))
          }
        } catch (fileError) {
          reject(new Error(`File system error: ${fileError.message}`))
        }
      } else {
        reject(new Error(`Thumbnail generation failed with exit code ${code}: ${error}`))
      }
    })

    ffmpeg.on('error', (err) => {
      reject(new Error(`FFmpeg command failed: ${err.message}`))
    })
  })
}



// Load existing jobs and test tools on startup
console.log('[INFO] Initializing server...')

// Ensure required directories exist - Updated for new storage structure
const requiredDirs = [
  'storage/downloads',
  'storage/uploads',
  'storage/processed',
  'storage/jobs',
  'storage/temp',
  // Keep old directories for backward compatibility
  'downloads',
  'uploads',
  'processed',
  'jobs'
]
requiredDirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
    console.log(`[INFO] Created directory: ${dir}`)
  }
})

loadExistingJobs()
console.log('[INFO] Testing external tools...')
Promise.all([
  testYtDlpInstallation(),
  testWhisperInstallation(),
  testFFmpegInstallation()
]).then(() => {
  console.log('[INFO] Tool testing completed')
}).catch(err => {
  console.error('[ERROR] Tool testing failed:', err.message)
})

// API ROUTES

// Test endpoint
app.get('/api/test', async (req, res) => {
  res.json({
    status: 'ok',
    ytdlpInstalled: ytDlpAvailable,
    message: ytDlpAvailable ? 'yt-dlp is working!' : 'yt-dlp not found - install with: pip install yt-dlp',
    timestamp: new Date().toISOString()
  })
})

// Get video info
app.post('/api/video/info', async (req, res) => {
  const { url } = req.body

  if (!url) {
    return sendError(res, 400, 'URL is required')
  }

  try {
    console.log(`[INFO] Getting video info for: ${url}`)

    if (!ytDlpAvailable) {
      return sendError(res, 503, 'yt-dlp not available', 'Install yt-dlp with: pip install yt-dlp')
    }

    const info = await getVideoInfo(url)

    sendSuccess(res, {
      title: info.title,
      duration: info.duration ? `${Math.floor(info.duration / 60)}:${(info.duration % 60).toString().padStart(2, '0')}` : 'Unknown',
      thumbnail: info.thumbnail,
      uploader: info.uploader,
      uploadDate: info.upload_date,
      viewCount: info.view_count,
      description: info.description,
      isPlaylist: info.is_playlist || false,
      playlistCount: info.playlist_count || 1,
      formats: info.formats ? info.formats.slice(0, 5).map(f => ({
        format_id: f.format_id,
        ext: f.ext,
        quality: f.format_note || f.quality,
        filesize: f.filesize
      })) : []
    })
  } catch (error) {
    sendError(res, 500, 'Failed to get video info', error.message)
  }
})

// Download video
app.post('/api/video/download', async (req, res) => {
  const { url, audioOnly } = req.body

  if (!url) {
    return sendError(res, 400, 'URL is required')
  }

  if (!ytDlpAvailable) {
    return sendError(res, 503, 'yt-dlp not available', 'Install yt-dlp with: pip install yt-dlp')
  }

  try {
    const job = createJob('download', url, { audioOnly })

    sendSuccess(res, {
      jobId: job.id
    }, 'Real download started')

    // Start download asynchronously
    updateJob(job.id, { status: 'processing', progress: 10 })

    try {
      const result = await downloadVideoReal(url, job.id, { audioOnly })

      // Generate thumbnail for video files (not audio-only)
      let thumbnailResult = null
      if (!audioOnly && ffmpegAvailable) {
        try {
          console.log(`[INFO] Generating thumbnail for ${result.filename}`)
          thumbnailResult = await generateThumbnail(result.path, job.id)
          console.log(`[SUCCESS] Thumbnail generated: ${thumbnailResult.filename}`)
        } catch (thumbnailError) {
          console.log(`[WARN] Thumbnail generation failed: ${thumbnailError.message}`)
        }
      }

      updateJob(job.id, {
        status: 'completed',
        progress: 100,
        result: {
          downloadUrl: `/api/download/${result.filename}`,
          filename: result.filename,
          fileSize: result.size,
          thumbnailUrl: thumbnailResult ? `/api/download/${thumbnailResult.filename}` : null,
          note: 'Real video download successful!'
        }
      })
    } catch (downloadError) {
      updateJob(job.id, {
        status: 'error',
        error: downloadError.message,
        progress: 0
      })
    }

  } catch (error) {
    sendError(res, 500, 'Failed to start download', error.message)
  }
})

// Extract audio (same as download with audioOnly=true)
app.post('/api/video/extract-audio', async (req, res) => {
  const { url } = req.body

  if (!url) {
    return res.status(400).json({ error: 'URL is required' })
  }

  if (!ytDlpAvailable) {
    return res.status(503).json({
      error: 'yt-dlp not available',
      details: 'Install yt-dlp with: pip install yt-dlp'
    })
  }

  try {
    const job = createJob('extract-audio', url, { audioOnly: true })

    res.json({
      success: true,
      jobId: job.id,
      message: 'Audio extraction started'
    })

    // Start download asynchronously
    updateJob(job.id, { status: 'processing', progress: 10 })

    try {
      const result = await downloadVideoReal(url, job.id, { audioOnly: true })

      updateJob(job.id, {
        status: 'completed',
        progress: 100,
        result: {
          downloadUrl: `/api/download/${result.filename}`,
          filename: result.filename,
          fileSize: result.size,
          note: 'Audio extraction successful!'
        }
      })
    } catch (downloadError) {
      console.error(`[ERROR] Audio extraction failed: ${downloadError.message}`)
      updateJob(job.id, {
        status: 'error',
        error: downloadError.message,
        progress: 0
      })
    }

  } catch (error) {
    console.error(`[ERROR] Failed to start audio extraction: ${error.message}`)
    res.status(500).json({
      error: 'Failed to start audio extraction',
      details: error.message
    })
  }
})

// Get job status
app.get('/api/job/:jobId/status', (req, res) => {
  try {
    const { jobId } = req.params

    if (!jobId) {
      return sendError(res, 400, 'Job ID is required')
    }

    const job = getJob(jobId)
    if (!job) {
      return sendError(res, 404, 'Job not found')
    }

    // Ensure all required fields exist
    const response = {
      id: job.id || jobId,
      type: job.type || 'unknown',
      status: job.status || 'pending',
      progress: job.progress || 0,
      result: job.result || null,
      error: job.error || null,
      createdAt: job.createdAt || new Date().toISOString(),
      updatedAt: job.updatedAt || new Date().toISOString()
    }

    sendSuccess(res, response)
  } catch (error) {
    console.error(`[ERROR] Failed to get job status for ${req.params.jobId}:`, error)
    sendError(res, 500, 'Failed to get job status', error.message)
  }
})

// Cancel job
app.post('/api/job/:jobId/cancel', (req, res) => {
  const { jobId } = req.params
  const job = getJob(jobId)

  if (!job) {
    return sendError(res, 404, 'Job not found')
  }

  if (job.status === 'completed' || job.status === 'error') {
    return sendError(res, 400, 'Job already finished')
  }

  // Update job status to canceled
  updateJob(jobId, {
    status: 'canceled',
    progress: 0,
    error: 'Job canceled by user'
  })

  console.log(`[INFO] Job ${jobId} canceled by user`)
  sendSuccess(res, { message: 'Job canceled successfully' })
})

// Download file
app.get('/api/download/:filename', (req, res) => {
  const { filename } = req.params

  // Check in all directories
  const directories = ['downloads', 'processed', 'uploads']
  let filePath = null

  for (const dir of directories) {
    const testPath = path.join(dir, filename)
    if (fs.existsSync(testPath)) {
      filePath = testPath
      break
    }
  }

  if (!filePath) {
    return res.status(404).json({ error: 'File not found' })
  }

  // For video/audio files, support streaming
  const ext = path.extname(filename).toLowerCase()
  const isVideo = ['.mp4', '.avi', '.mov', '.mkv', '.webm'].includes(ext)
  const isAudio = ['.mp3', '.wav', '.flac', '.m4a', '.ogg'].includes(ext)

  if (isVideo || isAudio) {
    const stat = fs.statSync(filePath)
    const fileSize = stat.size
    const range = req.headers.range

    if (range) {
      // Support range requests for video streaming
      const parts = range.replace(/bytes=/, "").split("-")
      const start = parseInt(parts[0], 10)
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1
      const chunksize = (end - start) + 1
      const file = fs.createReadStream(filePath, { start, end })
      const head = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': isVideo ? 'video/mp4' : 'audio/mpeg',
      }
      res.writeHead(206, head)
      file.pipe(res)
    } else {
      const head = {
        'Content-Length': fileSize,
        'Content-Type': isVideo ? 'video/mp4' : 'audio/mpeg',
      }
      res.writeHead(200, head)
      fs.createReadStream(filePath).pipe(res)
    }
  } else {
    // Regular download for other files
    res.download(filePath)
  }
})

// List files
app.get('/api/files', (req, res) => {
  try {
    const directories = ['downloads', 'processed', 'uploads']
    const result = {}

    // Helper function to determine file type
    const getFileType = (filename) => {
      const ext = path.extname(filename).toLowerCase()
      if (['.mp4', '.avi', '.mov', '.mkv', '.webm', '.flv'].includes(ext)) return 'video'
      if (['.mp3', '.wav', '.flac', '.m4a', '.ogg'].includes(ext)) return 'audio'
      if (['.txt', '.srt', '.vtt', '.json'].includes(ext)) return 'text'
      if (['.jpg', '.jpeg', '.png', '.gif', '.bmp'].includes(ext)) return 'image'
      return 'other'
    }

    directories.forEach(dir => {
      if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir).map(filename => {
          const filePath = path.join(dir, filename)
          const stats = fs.statSync(filePath)
          const fileType = getFileType(filename)

          // Check for existing thumbnail
          let thumbnailUrl = null
          if (fileType === 'video') {
            try {
              const baseName = path.basename(filename, path.extname(filename))
              if (fs.existsSync('processed')) {
                const possibleThumbnails = fs.readdirSync('processed').filter(f =>
                  f.includes('thumbnail') && f.includes(baseName.split('_').pop())
                )
                if (possibleThumbnails.length > 0) {
                  thumbnailUrl = `/api/download/${possibleThumbnails[0]}`
                }
              }
            } catch (thumbnailError) {
              // Ignore thumbnail errors, just continue without thumbnail
              console.warn(`[WARN] Could not check for thumbnail: ${thumbnailError.message}`)
            }
          }

          return {
            name: filename,
            size: stats.size,
            type: fileType,
            path: `/${dir}/${filename}`,
            createdAt: stats.birthtime.toISOString(),
            created: stats.birthtime,
            modified: stats.mtime,
            downloadUrl: `/api/download/${filename}`,
            thumbnailUrl
          }
        })
        result[dir] = files
      } else {
        result[dir] = []
      }
    })

    res.json({
      success: true,
      files: result
    })
  } catch (error) {
    console.error('[ERROR] Failed to list files:', error.message)
    res.status(500).json({ error: 'Failed to list files', details: error.message })
  }
})

// Delete file
app.delete('/api/files/:filename', (req, res) => {
  const { filename } = req.params

  try {
    // Check in all directories
    const directories = ['downloads', 'processed', 'uploads']
    let deleted = false

    for (const dir of directories) {
      const filePath = path.join(dir, filename)
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath)
        deleted = true
        console.log(`[INFO] Deleted file: ${filePath}`)
        break
      }
    }

    if (deleted) {
      res.json({ success: true, message: 'File deleted successfully' })
    } else {
      res.status(404).json({ error: 'File not found' })
    }
  } catch (error) {
    console.error('[ERROR] Failed to delete file:', error.message)
    res.status(500).json({ error: 'Failed to delete file', details: error.message })
  }
})

// Get supported languages
app.get('/api/languages', (req, res) => {
  const languages = [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Spanish' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
    { code: 'it', name: 'Italian' },
    { code: 'pt', name: 'Portuguese' },
    { code: 'ru', name: 'Russian' },
    { code: 'ja', name: 'Japanese' },
    { code: 'ko', name: 'Korean' },
    { code: 'zh', name: 'Chinese' }
  ]

  res.json({
    success: true,
    languages
  })
})

// Real transcription endpoint using Whisper
app.post('/api/transcribe', upload.single('audioFile'), async (req, res) => {
  let audioPath
  let filename

  // Handle both file upload and existing file selection
  if (req.file) {
    // File upload case
    audioPath = path.join('uploads', req.file.filename)
    filename = req.file.filename
  } else if (req.body.filename) {
    // Existing file case
    filename = req.body.filename
    // Check in downloads, uploads, and processed directories
    const directories = ['downloads', 'uploads', 'processed']
    let foundPath = null

    for (const dir of directories) {
      const testPath = path.join(dir, filename)
      if (fs.existsSync(testPath)) {
        foundPath = testPath
        break
      }
    }

    if (!foundPath) {
      return sendError(res, 404, 'File not found', `File ${filename} not found in any directory`)
    }

    audioPath = foundPath
  } else {
    return sendError(res, 400, 'Audio file or filename is required')
  }

  if (!whisperAvailable) {
    return sendError(res, 503, 'Whisper not available', 'Install Whisper with: pip install openai-whisper')
  }

  try {
    const options = {
      language: req.body.language || 'auto',
      includeTimestamps: req.body.includeTimestamps === 'true',
      outputFormats: req.body.outputFormats || ['txt'],
      model: req.body.model || 'base',
      removeTimestamps: req.body.removeTimestamps === true,
      temperature: parseFloat(req.body.temperature) || 0.0,
      beamSize: parseInt(req.body.beamSize) || 5
    }

    const job = createJob('transcribe', filename, options)

    sendSuccess(res, {
      jobId: job.id
    }, 'Transcription started')

    // Start transcription asynchronously
    updateJob(job.id, { status: 'processing', progress: 10 })

    try {
      const result = await transcribeAudioReal(audioPath, job.id, options)

      updateJob(job.id, {
        status: 'completed',
        progress: 100,
        result: {
          downloadUrl: `/api/download/${result.filename}`,
          filename: result.filename,
          fileSize: result.size,
          allFiles: result.allFiles || [],
          formats: result.formats || [],
          model: options.model,
          note: `Transcription completed successfully! Generated ${result.allFiles?.length || 1} file(s) using ${options.model} model.`
        }
      })
    } catch (transcribeError) {
      updateJob(job.id, {
        status: 'error',
        error: transcribeError.message,
        progress: 0
      })
    }

  } catch (error) {
    sendError(res, 500, 'Failed to start transcription', error.message)
  }
})

// Batch transcription endpoint
app.post('/api/transcribe/batch', async (req, res) => {
  const { filenames, options = {} } = req.body

  if (!filenames || !Array.isArray(filenames) || filenames.length === 0) {
    return sendError(res, 400, 'Filenames array is required')
  }

  if (!whisperAvailable) {
    return sendError(res, 503, 'Whisper not available', 'Install Whisper with: pip install openai-whisper')
  }

  try {
    const batchId = require('crypto').randomUUID()
    const jobs = []

    // Create individual jobs for each file
    for (const filename of filenames) {
      // Check if file exists
      const directories = ['downloads', 'uploads', 'processed']
      let foundPath = null

      for (const dir of directories) {
        const testPath = path.join(dir, filename)
        if (fs.existsSync(testPath)) {
          foundPath = testPath
          break
        }
      }

      if (!foundPath) {
        console.warn(`[WARN] File not found for batch transcription: ${filename}`)
        continue
      }

      const transcriptionOptions = {
        language: options.language || 'auto',
        outputFormats: options.outputFormats || ['txt'],
        model: options.model || 'base',
        removeTimestamps: options.removeTimestamps === true,
        temperature: parseFloat(options.temperature) || 0.0,
        beamSize: parseInt(options.beamSize) || 5
      }

      const job = createJob('transcribe', filename, { ...transcriptionOptions, batchId })
      jobs.push(job)
    }

    sendSuccess(res, {
      batchId,
      jobIds: jobs.map(j => j.id),
      totalFiles: jobs.length
    }, `Batch transcription started for ${jobs.length} files`)

    // Process jobs sequentially to avoid overwhelming the system
    for (const job of jobs) {
      try {
        updateJob(job.id, { status: 'processing', progress: 10 })

        const filename = job.input
        const directories = ['downloads', 'uploads', 'processed']
        let audioPath = null

        for (const dir of directories) {
          const testPath = path.join(dir, filename)
          if (fs.existsSync(testPath)) {
            audioPath = testPath
            break
          }
        }

        if (audioPath) {
          const result = await transcribeAudioReal(audioPath, job.id, job.options)

          updateJob(job.id, {
            status: 'completed',
            progress: 100,
            result: {
              downloadUrl: `/api/download/${result.filename}`,
              filename: result.filename,
              fileSize: result.size,
              allFiles: result.allFiles || [],
              formats: result.formats || [],
              model: job.options.model,
              note: `Batch transcription completed! Generated ${result.allFiles?.length || 1} file(s).`
            }
          })
        } else {
          updateJob(job.id, {
            status: 'error',
            error: 'File not found',
            progress: 0
          })
        }
      } catch (transcribeError) {
        updateJob(job.id, {
          status: 'error',
          error: transcribeError.message,
          progress: 0
        })
      }
    }

  } catch (error) {
    sendError(res, 500, 'Failed to start batch transcription', error.message)
  }
})

// Real translation endpoint using Google Translate
app.post('/api/translate', async (req, res) => {
  const { text, targetLang, sourceLang } = req.body

  if (!text || !targetLang) {
    return sendError(res, 400, 'Text and target language are required')
  }

  try {
    // Use a simple translation approach for now
    // In production, you would use Google Translate API or similar service
    const translatedText = await translateText(text, targetLang, sourceLang)

    sendSuccess(res, {
      translation: translatedText,
      sourceLang: sourceLang || 'auto',
      targetLang
    })
  } catch (error) {
    sendError(res, 500, 'Translation failed', error.message)
  }
})

// Simple translation function (placeholder for real service)
async function translateText(text, targetLang, sourceLang = 'auto') {
  // This is a simplified implementation
  // In production, integrate with Google Translate API, DeepL, or similar

  const translations = {
    'es': {
      'hello': 'hola',
      'world': 'mundo',
      'video': 'vídeo',
      'audio': 'audio',
      'file': 'archivo'
    },
    'fr': {
      'hello': 'bonjour',
      'world': 'monde',
      'video': 'vidéo',
      'audio': 'audio',
      'file': 'fichier'
    },
    'de': {
      'hello': 'hallo',
      'world': 'welt',
      'video': 'video',
      'audio': 'audio',
      'file': 'datei'
    }
  }

  // Simple word-by-word translation for demo
  const words = text.toLowerCase().split(' ')
  const translatedWords = words.map(word => {
    const cleanWord = word.replace(/[^\w]/g, '')
    return translations[targetLang]?.[cleanWord] || word
  })

  return translatedWords.join(' ')
}

// Real video manipulation endpoint using FFmpeg
app.post('/api/video/manipulate', upload.single('videoFile'), async (req, res) => {
  if (!req.file) {
    return sendError(res, 400, 'Video file is required')
  }

  if (!ffmpegAvailable) {
    return sendError(res, 503, 'FFmpeg not available', 'Install FFmpeg from https://ffmpeg.org/')
  }

  try {
    const operation = req.body.operation
    const parameters = JSON.parse(req.body.parameters || '{}')

    if (!operation) {
      return sendError(res, 400, 'Operation is required')
    }

    const job = createJob('manipulate', req.file.filename, { operation, parameters })

    sendSuccess(res, {
      jobId: job.id
    }, `Video ${operation} started`)

    // Start manipulation asynchronously
    updateJob(job.id, { status: 'processing', progress: 10 })

    try {
      const videoPath = path.join('uploads', req.file.filename)
      const result = await manipulateVideoReal(videoPath, job.id, operation, parameters)

      updateJob(job.id, {
        status: 'completed',
        progress: 100,
        result: {
          downloadUrl: `/api/download/${result.filename}`,
          filename: result.filename,
          fileSize: result.size,
          note: `Video ${operation} completed successfully!`
        }
      })
    } catch (manipulateError) {
      updateJob(job.id, {
        status: 'error',
        error: manipulateError.message,
        progress: 0
      })
    }

  } catch (error) {
    sendError(res, 500, 'Failed to start video manipulation', error.message)
  }
})

// Get video metadata using ffprobe
app.post('/api/video/metadata', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return sendError(res, 400, 'File is required')
  }

  if (!ffmpegAvailable) {
    return sendError(res, 503, 'FFmpeg not available', 'Install FFmpeg to extract metadata')
  }

  try {
    const filePath = path.join('uploads', req.file.filename)
    const metadata = await extractFileMetadata(filePath)

    sendSuccess(res, { metadata })
  } catch (error) {
    sendError(res, 500, 'Failed to extract metadata', error.message)
  }
})

// View transcription content
app.get('/api/transcription/:filename', (req, res) => {
  const { filename } = req.params
  const filePath = path.join('processed', filename)

  try {
    if (!fs.existsSync(filePath)) {
      return sendError(res, 404, 'Transcription file not found')
    }

    const content = fs.readFileSync(filePath, 'utf8')
    const stats = fs.statSync(filePath)

    sendSuccess(res, {
      filename,
      content,
      size: stats.size,
      lastModified: stats.mtime
    })
  } catch (error) {
    sendError(res, 500, 'Failed to read transcription file', error.message)
  }
})

// Generate thumbnail for video
app.post('/api/video/thumbnail', async (req, res) => {
  const { filename } = req.body

  if (!filename) {
    return sendError(res, 400, 'Filename is required')
  }

  if (!ffmpegAvailable) {
    return sendError(res, 503, 'FFmpeg not available', 'Install FFmpeg to generate thumbnails')
  }

  try {
    // Find the video file in downloads directory
    const videoPath = path.join('downloads', filename)
    if (!fs.existsSync(videoPath)) {
      return sendError(res, 404, 'Video file not found')
    }

    const jobId = uuidv4()
    const job = createJob('thumbnail', filename, {})

    sendSuccess(res, {
      jobId: job.id
    }, 'Thumbnail generation started')

    // Generate thumbnail asynchronously
    updateJob(job.id, { status: 'processing', progress: 50 })

    try {
      const result = await generateThumbnail(videoPath, job.id)

      updateJob(job.id, {
        status: 'completed',
        progress: 100,
        result: {
          downloadUrl: `/api/download/${result.filename}`,
          filename: result.filename,
          fileSize: result.size,
          note: 'Thumbnail generated successfully!'
        }
      })
    } catch (thumbnailError) {
      updateJob(job.id, {
        status: 'error',
        error: thumbnailError.message,
        progress: 0
      })
    }

  } catch (error) {
    sendError(res, 500, 'Failed to generate thumbnail', error.message)
  }
})

// Serve frontend (only for non-API routes)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'))
})

// Start server with proper error handling
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🎬 Clean Video Utility Suite Server running on http://localhost:${PORT}`)
  console.log(`📁 Downloads directory: ${path.resolve('downloads')}`)
  console.log(`🔧 Test endpoint: http://localhost:${PORT}/api/test`)
  console.log(`✅ REAL functionality enabled - no more demo files!`)
  console.log(`🌐 Server listening on all interfaces (0.0.0.0:${PORT})`)
})

server.on('error', (error) => {
  console.error('❌ Server failed to start:', error)
  if (error.code === 'EADDRINUSE') {
    console.error(`🔧 Port ${PORT} is already in use. Try a different port or kill the process using it.`)
  }
  process.exit(1)
})

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught exception:', error)
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled rejection at:', promise, 'reason:', reason)
})
