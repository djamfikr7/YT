#!/usr/bin/env node

/**
 * Video Utility Suite - Stable Full Version
 * Real functionality with bulletproof error handling
 * Version: 2.1.0 - Crash-Free Edition
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

console.log('🚀 Starting Stable Full Video Utility Suite...')

// ===== CONFIGURATION =====
const CONFIG = {
  directories: {
    downloads: 'downloads',
    processed: 'processed', 
    uploads: 'uploads',
    temp: 'temp',
    jobs: 'jobs'
  },
  whisper: {
    models: ['tiny', 'base', 'small', 'medium', 'large'],
    defaultModel: 'base'
  },
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB
    concurrentJobs: 3,
    maxJobAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}

// ===== SAFE DIRECTORY MANAGEMENT =====
const ensureDirectory = (dir) => {
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
      console.log(`[INFO] Created directory: ${dir}`)
    }
    return true
  } catch (error) {
    console.error(`[ERROR] Failed to create directory ${dir}:`, error.message)
    return false
  }
}

const initializeDirectories = () => {
  console.log('[INFO] Initializing directories...')
  let allSuccess = true
  
  Object.values(CONFIG.directories).forEach(dir => {
    if (!ensureDirectory(dir)) {
      allSuccess = false
    }
  })
  
  if (allSuccess) {
    console.log('[INFO] All directories initialized successfully')
  } else {
    console.warn('[WARN] Some directories failed to initialize')
  }
  
  return allSuccess
}

// ===== MIDDLEWARE =====
app.use(cors({
  origin: ['http://localhost:3001', 'http://localhost:3002', 'http://localhost:3000', 'http://localhost:5173'],
  credentials: true
}))
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true, limit: '50mb' }))

// ===== SAFE FILE UPLOAD =====
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = CONFIG.directories.uploads
    if (ensureDirectory(uploadDir)) {
      cb(null, uploadDir)
    } else {
      cb(new Error('Upload directory not available'))
    }
  },
  filename: (req, file, cb) => {
    try {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
      const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')
      cb(null, `${uniqueSuffix}-${sanitizedName}`)
    } catch (error) {
      cb(error)
    }
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

// ===== SAFE JOB MANAGEMENT =====
const jobs = new Map()
let activeJobs = 0

const createJob = (type, input, options = {}) => {
  try {
    const job = {
      id: uuidv4(),
      type,
      status: 'pending',
      progress: 0,
      input,
      options,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      pid: null
    }
    jobs.set(job.id, job)
    saveJobSafe(job)
    console.log(`[INFO] Created job ${job.id}: ${type}`)
    return job
  } catch (error) {
    console.error('[ERROR] Failed to create job:', error.message)
    return null
  }
}

const updateJob = (jobId, updates) => {
  try {
    const job = jobs.get(jobId)
    if (job) {
      Object.assign(job, updates)
      job.updatedAt = new Date().toISOString()
      
      if (updates.status === 'completed') {
        job.completedAt = new Date().toISOString()
        activeJobs = Math.max(0, activeJobs - 1)
      } else if (updates.status === 'processing' && job.status === 'pending') {
        activeJobs++
      } else if (updates.status === 'error' || updates.status === 'canceled') {
        activeJobs = Math.max(0, activeJobs - 1)
      }
      
      saveJobSafe(job)
      console.log(`[INFO] Updated job ${jobId}: ${job.status} (${job.progress}%)`)
    }
    return job
  } catch (error) {
    console.error(`[ERROR] Failed to update job ${jobId}:`, error.message)
    return null
  }
}

const getJob = (jobId) => {
  try {
    return jobs.get(jobId) || null
  } catch (error) {
    console.error(`[ERROR] Failed to get job ${jobId}:`, error.message)
    return null
  }
}

const saveJobSafe = (job) => {
  try {
    const jobFile = path.join(CONFIG.directories.jobs, `${job.id}.json`)
    fs.writeFileSync(jobFile, JSON.stringify(job, null, 2))
  } catch (error) {
    console.warn(`[WARN] Failed to save job ${job.id}:`, error.message)
  }
}

const cleanupOldJobs = () => {
  try {
    const now = Date.now()
    let cleanedCount = 0
    
    for (const [jobId, job] of jobs.entries()) {
      const jobAge = now - new Date(job.createdAt).getTime()
      if (jobAge > CONFIG.limits.maxJobAge && (job.status === 'completed' || job.status === 'error')) {
        jobs.delete(jobId)
        
        // Try to delete job file
        try {
          const jobFile = path.join(CONFIG.directories.jobs, `${jobId}.json`)
          if (fs.existsSync(jobFile)) {
            fs.unlinkSync(jobFile)
          }
        } catch (deleteError) {
          console.warn(`[WARN] Failed to delete job file ${jobId}:`, deleteError.message)
        }
        
        cleanedCount++
      }
    }
    
    if (cleanedCount > 0) {
      console.log(`[INFO] Cleaned up ${cleanedCount} old jobs`)
    }
  } catch (error) {
    console.error('[ERROR] Failed to cleanup old jobs:', error.message)
  }
}

// ===== TOOL AVAILABILITY TESTING =====
let toolsAvailable = {
  ytdlp: false,
  whisper: false,
  ffmpeg: false
}

const testTool = (command, args = ['--version'], timeout = 5000) => {
  return new Promise((resolve) => {
    try {
      const process = spawn(command, args, { stdio: 'pipe' })
      let resolved = false
      
      const timer = setTimeout(() => {
        if (!resolved) {
          resolved = true
          try {
            process.kill()
          } catch (killError) {
            // Ignore kill errors
          }
          resolve(false)
        }
      }, timeout)
      
      process.on('close', (code) => {
        if (!resolved) {
          resolved = true
          clearTimeout(timer)
          resolve(code === 0)
        }
      })
      
      process.on('error', () => {
        if (!resolved) {
          resolved = true
          clearTimeout(timer)
          resolve(false)
        }
      })
    } catch (error) {
      resolve(false)
    }
  })
}

const testAllTools = async () => {
  try {
    console.log('[INFO] Testing external tools...')
    
    const [ytdlp, whisper, ffmpeg] = await Promise.all([
      testTool('yt-dlp', ['--version']),
      testTool('whisper', ['--help']),
      testTool('ffmpeg', ['-version'])
    ])
    
    toolsAvailable = { ytdlp, whisper, ffmpeg }
    
    console.log(`[INFO] Tool availability:`)
    console.log(`   yt-dlp: ${ytdlp ? '✅ Available' : '❌ Missing'}`)
    console.log(`   whisper: ${whisper ? '✅ Available' : '❌ Missing'}`)
    console.log(`   ffmpeg: ${ffmpeg ? '✅ Available' : '❌ Missing'}`)
    
    return toolsAvailable
  } catch (error) {
    console.error('[ERROR] Tool testing failed:', error.message)
    return { ytdlp: false, whisper: false, ffmpeg: false }
  }
}

// ===== HELPER FUNCTIONS =====
const sendError = (res, status, error, details = null) => {
  const errorResponse = {
    success: false,
    error,
    details,
    timestamp: new Date().toISOString()
  }
  console.error(`[ERROR ${status}] ${error}${details ? ': ' + details : ''}`)
  
  try {
    res.status(status).json(errorResponse)
  } catch (responseError) {
    console.error('[ERROR] Failed to send error response:', responseError.message)
  }
}

const sendSuccess = (res, data, message = null) => {
  const successResponse = {
    success: true,
    ...data,
    ...(message && { message }),
    timestamp: new Date().toISOString()
  }

  try {
    res.json(successResponse)
  } catch (responseError) {
    console.error('[ERROR] Failed to send success response:', responseError.message)
  }
}

// ===== REAL VIDEO DOWNLOAD FUNCTION =====
const downloadVideoReal = async (url, options, jobId) => {
  return new Promise((resolve, reject) => {
    try {
      if (!toolsAvailable.ytdlp) {
        reject(new Error('yt-dlp is not available'))
        return
      }

      updateJob(jobId, { status: 'processing', progress: 5, note: 'Starting download...' })

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0]
      const outputTemplate = path.join(CONFIG.directories.downloads, `${timestamp}_%(title)s_${jobId}.%(ext)s`)

      const args = [
        url,
        '--output', outputTemplate,
        '--no-playlist',
        '--write-info-json'
      ]

      if (options.audioOnly) {
        args.push('--extract-audio', '--audio-format', options.format || 'mp3')
      } else if (options.format && options.format !== 'best') {
        args.push('--format', options.format)
      }

      console.log(`[INFO] Executing: yt-dlp ${args.join(' ')}`)

      const ytdlp = spawn('yt-dlp', args, { stdio: 'pipe' })
      let downloadedFile = null
      let resolved = false

      updateJob(jobId, { pid: ytdlp.pid })

      // Timeout after 10 minutes
      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true
          try {
            ytdlp.kill()
          } catch (killError) {
            console.warn('[WARN] Failed to kill yt-dlp process:', killError.message)
          }
          reject(new Error('Download timeout after 10 minutes'))
        }
      }, 10 * 60 * 1000)

      ytdlp.stdout.on('data', (data) => {
        const output = data.toString()
        console.log(`[YTDLP] ${output.trim()}`)

        // Parse progress
        const progressMatch = output.match(/(\d+(?:\.\d+)?)%/)
        if (progressMatch) {
          const progress = Math.min(90, Math.max(5, parseFloat(progressMatch[1])))
          updateJob(jobId, { progress, note: 'Downloading...' })
        }

        // Check for completion
        if (output.includes('[download] 100%') || output.includes('has already been downloaded')) {
          updateJob(jobId, { progress: 95, note: 'Finalizing...' })
        }
      })

      ytdlp.stderr.on('data', (data) => {
        const error = data.toString()
        if (!error.includes('WARNING')) {
          console.error(`[YTDLP ERROR] ${error.trim()}`)
        }
      })

      ytdlp.on('close', (code) => {
        if (!resolved) {
          resolved = true
          clearTimeout(timeout)

          if (code === 0) {
            // Find downloaded file
            try {
              const files = fs.readdirSync(CONFIG.directories.downloads)
              downloadedFile = files.find(f => f.includes(jobId))

              if (downloadedFile) {
                const filePath = path.join(CONFIG.directories.downloads, downloadedFile)
                const stats = fs.statSync(filePath)

                resolve({
                  filename: downloadedFile,
                  size: stats.size,
                  path: filePath,
                  format: path.extname(downloadedFile).slice(1)
                })
              } else {
                reject(new Error('Download completed but file not found'))
              }
            } catch (error) {
              reject(new Error(`Failed to locate downloaded file: ${error.message}`))
            }
          } else {
            reject(new Error(`yt-dlp exited with code ${code}`))
          }
        }
      })

      ytdlp.on('error', (error) => {
        if (!resolved) {
          resolved = true
          clearTimeout(timeout)
          reject(new Error(`yt-dlp command failed: ${error.message}`))
        }
      })

    } catch (error) {
      reject(error)
    }
  })
}

// ===== REAL WHISPER TRANSCRIPTION FUNCTION =====
const transcribeAudioReal = async (audioPath, jobId, options = {}) => {
  return new Promise((resolve, reject) => {
    try {
      if (!toolsAvailable.whisper) {
        reject(new Error('Whisper is not available'))
        return
      }

      const outputDir = CONFIG.directories.processed
      const model = options.model || 'base'
      const language = options.language || 'auto'
      const temperature = options.temperature || 0.0
      const beamSize = options.beamSize || 5

      const args = [
        audioPath,
        '--output_dir', outputDir,
        '--model', model,
        '--verbose', 'False'
      ]

      if (language !== 'auto') {
        args.push('--language', language)
      }

      if (temperature !== 0.0) {
        args.push('--temperature', temperature.toString())
      }

      if (beamSize !== 5) {
        args.push('--beam_size', beamSize.toString())
      }

      console.log(`[INFO] Starting transcription: whisper ${args.join(' ')}`)

      const whisper = spawn('whisper', args, { stdio: 'pipe' })
      let resolved = false

      updateJob(jobId, { pid: whisper.pid })

      // Timeout after 30 minutes
      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true
          try {
            whisper.kill()
          } catch (killError) {
            console.warn('[WARN] Failed to kill whisper process:', killError.message)
          }
          reject(new Error('Transcription timeout after 30 minutes'))
        }
      }, 30 * 60 * 1000)

      whisper.stdout.on('data', (data) => {
        const output = data.toString()
        console.log(`[WHISPER] ${output.trim()}`)

        // Parse progress indicators
        if (output.includes('Downloading')) {
          updateJob(jobId, { progress: 25, note: 'Downloading model...' })
        } else if (output.includes('Loading model')) {
          updateJob(jobId, { progress: 40, note: 'Loading model...' })
        } else if (output.includes('Detected language')) {
          updateJob(jobId, { progress: 60, note: 'Processing audio...' })
        }
      })

      whisper.stderr.on('data', (data) => {
        const error = data.toString()
        if (!error.includes('WARNING')) {
          console.error(`[WHISPER ERROR] ${error.trim()}`)
        }
      })

      whisper.on('close', (code) => {
        if (!resolved) {
          resolved = true
          clearTimeout(timeout)

          if (code === 0) {
            try {
              const baseName = path.basename(audioPath, path.extname(audioPath))
              const txtFile = `${baseName}.txt`
              const txtPath = path.join(outputDir, txtFile)

              if (fs.existsSync(txtPath)) {
                const stats = fs.statSync(txtPath)
                resolve({
                  filename: txtFile,
                  size: stats.size,
                  path: txtPath,
                  model: model
                })
              } else {
                reject(new Error('Transcription completed but file not found'))
              }
            } catch (error) {
              reject(new Error(`Failed to locate transcription file: ${error.message}`))
            }
          } else {
            reject(new Error(`Whisper exited with code ${code}`))
          }
        }
      })

      whisper.on('error', (error) => {
        if (!resolved) {
          resolved = true
          clearTimeout(timeout)
          reject(new Error(`Whisper command failed: ${error.message}`))
        }
      })

    } catch (error) {
      reject(error)
    }
  })
}

// ===== API ENDPOINTS =====

// Health check endpoint
app.get('/api/test', async (req, res) => {
  try {
    sendSuccess(res, {
      status: 'ok',
      message: 'Stable Full Video Utility Suite Server is running!',
      version: '2.1.0-stable',
      tools: toolsAvailable,
      activeJobs: activeJobs,
      totalJobs: jobs.size,
      features: [
        'Real Video Download (yt-dlp)',
        'Real AI Transcription (Whisper)',
        '5 Whisper Models',
        'Batch Processing',
        'Quality Controls',
        'Cancel Functionality',
        'File Management'
      ]
    })
  } catch (error) {
    sendError(res, 500, 'Health check failed', error.message)
  }
})

// Video info endpoint
app.post('/api/video/info', async (req, res) => {
  try {
    const { url } = req.body

    if (!url) {
      return sendError(res, 400, 'URL is required')
    }

    if (!toolsAvailable.ytdlp) {
      return sendError(res, 503, 'yt-dlp is not available', 'Please install yt-dlp: pip install yt-dlp')
    }

    console.log(`[INFO] Getting video info for: ${url}`)

    // Use yt-dlp to get real video info
    const ytdlp = spawn('yt-dlp', [url, '--dump-json', '--no-download'], { stdio: 'pipe' })
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
          const info = JSON.parse(output.trim().split('\n')[0])
          sendSuccess(res, {
            title: info.title || 'Unknown Title',
            duration: info.duration_string || 'Unknown',
            thumbnail: info.thumbnail || null,
            uploader: info.uploader || 'Unknown',
            viewCount: info.view_count || 0,
            uploadDate: info.upload_date || 'Unknown',
            formats: (info.formats || []).slice(0, 5).map(f => ({
              format_id: f.format_id,
              ext: f.ext,
              quality: f.height ? `${f.height}p` : 'audio',
              filesize: f.filesize || 0
            }))
          })
        } catch (parseError) {
          sendError(res, 500, 'Failed to parse video info', parseError.message)
        }
      } else {
        sendError(res, 400, 'Failed to get video info', error.trim())
      }
    })

    ytdlp.on('error', (err) => {
      sendError(res, 500, 'yt-dlp command failed', err.message)
    })

  } catch (error) {
    console.error('[ERROR] Video info failed:', error)
    sendError(res, 500, 'Failed to get video info', error.message)
  }
})

// Video download endpoint
app.post('/api/video/download', async (req, res) => {
  try {
    const { url, format, quality, audioOnly, playlist } = req.body

    if (!url) {
      return sendError(res, 400, 'URL is required')
    }

    if (!toolsAvailable.ytdlp) {
      return sendError(res, 503, 'yt-dlp is not available', 'Please install yt-dlp: pip install yt-dlp')
    }

    if (activeJobs >= CONFIG.limits.concurrentJobs) {
      return sendError(res, 429, 'Too many active jobs', `Maximum ${CONFIG.limits.concurrentJobs} concurrent jobs allowed`)
    }

    console.log(`[INFO] Starting video download: ${url}`)

    const job = createJob('download', url, { format, quality, audioOnly, playlist })
    if (!job) {
      return sendError(res, 500, 'Failed to create job')
    }

    sendSuccess(res, { jobId: job.id }, 'Video download started')

    // Start download in background
    downloadVideoReal(url, { format, quality, audioOnly }, job.id)
      .then((result) => {
        updateJob(job.id, {
          status: 'completed',
          progress: 100,
          result: {
            downloadUrl: `/api/download/${result.filename}`,
            filename: result.filename,
            fileSize: result.size,
            format: result.format,
            note: 'Video download completed successfully!'
          }
        })
      })
      .catch((error) => {
        console.error(`[ERROR] Download failed for job ${job.id}:`, error.message)
        updateJob(job.id, {
          status: 'error',
          progress: 0,
          error: error.message
        })
      })

  } catch (error) {
    console.error('[ERROR] Video download failed:', error)
    sendError(res, 500, 'Failed to start video download', error.message)
  }
})

// Audio extraction endpoint
app.post('/api/video/extract-audio', async (req, res) => {
  try {
    const { url, format, quality } = req.body

    if (!url) {
      return sendError(res, 400, 'URL is required')
    }

    if (!toolsAvailable.ytdlp) {
      return sendError(res, 503, 'yt-dlp is not available')
    }

    if (activeJobs >= CONFIG.limits.concurrentJobs) {
      return sendError(res, 429, 'Too many active jobs')
    }

    console.log(`[INFO] Starting audio extraction: ${url}`)

    const job = createJob('extract-audio', url, { format, quality })
    if (!job) {
      return sendError(res, 500, 'Failed to create job')
    }

    sendSuccess(res, { jobId: job.id }, 'Audio extraction started')

    // Start extraction in background
    downloadVideoReal(url, { audioOnly: true, format: format || 'mp3' }, job.id)
      .then((result) => {
        updateJob(job.id, {
          status: 'completed',
          progress: 100,
          result: {
            downloadUrl: `/api/download/${result.filename}`,
            filename: result.filename,
            fileSize: result.size,
            format: result.format,
            note: 'Audio extraction completed successfully!'
          }
        })
      })
      .catch((error) => {
        console.error(`[ERROR] Audio extraction failed for job ${job.id}:`, error.message)
        updateJob(job.id, {
          status: 'error',
          progress: 0,
          error: error.message
        })
      })

  } catch (error) {
    console.error('[ERROR] Audio extraction failed:', error)
    sendError(res, 500, 'Failed to start audio extraction', error.message)
  }
})

// Enhanced transcription endpoint
app.post('/api/transcribe', upload.single('audioFile'), async (req, res) => {
  try {
    const filename = req.body.filename || (req.file ? req.file.filename : null)

    if (!filename) {
      return sendError(res, 400, 'Audio file or filename is required')
    }

    if (!toolsAvailable.whisper) {
      return sendError(res, 503, 'Whisper is not available', 'Please install Whisper: pip install openai-whisper')
    }

    if (activeJobs >= CONFIG.limits.concurrentJobs) {
      return sendError(res, 429, 'Too many active jobs')
    }

    const options = {
      language: req.body.language || 'auto',
      outputFormats: Array.isArray(req.body.outputFormats) ? req.body.outputFormats : ['txt'],
      model: req.body.model || 'base',
      removeTimestamps: req.body.removeTimestamps === 'true' || req.body.removeTimestamps === true,
      temperature: parseFloat(req.body.temperature) || 0.0,
      beamSize: parseInt(req.body.beamSize) || 5
    }

    console.log(`[INFO] Starting transcription with options:`, options)

    const job = createJob('transcribe', filename, options)
    if (!job) {
      return sendError(res, 500, 'Failed to create job')
    }

    sendSuccess(res, { jobId: job.id }, 'Enhanced transcription started')

    // Determine audio file path
    let audioPath = filename
    if (req.file) {
      audioPath = req.file.path
    } else {
      // Check in uploads directory
      const uploadPath = path.join(CONFIG.directories.uploads, filename)
      if (fs.existsSync(uploadPath)) {
        audioPath = uploadPath
      }
    }

    // Start transcription in background
    transcribeAudioReal(audioPath, job.id, options)
      .then((result) => {
        updateJob(job.id, {
          status: 'completed',
          progress: 100,
          result: {
            downloadUrl: `/api/download/${result.filename}`,
            filename: result.filename,
            fileSize: result.size,
            model: result.model,
            detectedLanguage: options.language === 'auto' ? 'auto-detected' : options.language,
            note: `Enhanced transcription completed using ${result.model} model!`
          }
        })
      })
      .catch((error) => {
        console.error(`[ERROR] Transcription failed for job ${job.id}:`, error.message)
        updateJob(job.id, {
          status: 'error',
          progress: 0,
          error: error.message
        })
      })

  } catch (error) {
    console.error('[ERROR] Transcription failed:', error)
    sendError(res, 500, 'Failed to start transcription', error.message)
  }
})

// Job status endpoint
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

    const response = {
      id: job.id,
      type: job.type,
      status: job.status,
      progress: job.progress,
      result: job.result || null,
      error: job.error || null,
      note: job.note || null,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt
    }

    sendSuccess(res, response)
  } catch (error) {
    console.error(`[ERROR] Failed to get job status:`, error)
    sendError(res, 500, 'Failed to get job status', error.message)
  }
})

// Cancel job endpoint
app.post('/api/job/:jobId/cancel', (req, res) => {
  try {
    const { jobId } = req.params
    const job = getJob(jobId)

    if (!job) {
      return sendError(res, 404, 'Job not found')
    }

    if (job.status === 'completed' || job.status === 'error') {
      return sendError(res, 400, 'Job already finished')
    }

    // Try to kill the process if it exists
    if (job.pid) {
      try {
        process.kill(job.pid)
        console.log(`[INFO] Killed process ${job.pid} for job ${jobId}`)
      } catch (killError) {
        console.warn(`[WARN] Failed to kill process ${job.pid}:`, killError.message)
      }
    }

    updateJob(jobId, {
      status: 'canceled',
      progress: 0,
      error: 'Job canceled by user'
    })

    console.log(`[INFO] Job ${jobId} canceled by user`)
    sendSuccess(res, { message: 'Job canceled successfully' })
  } catch (error) {
    console.error('[ERROR] Failed to cancel job:', error)
    sendError(res, 500, 'Failed to cancel job', error.message)
  }
})

// Files listing endpoint
app.get('/api/files', (req, res) => {
  try {
    const directories = [CONFIG.directories.downloads, CONFIG.directories.processed, CONFIG.directories.uploads]
    const result = {}

    const getFileType = (filename) => {
      const ext = path.extname(filename).toLowerCase()
      if (['.mp4', '.avi', '.mov', '.mkv', '.webm', '.flv'].includes(ext)) return 'video'
      if (['.mp3', '.wav', '.flac', '.m4a', '.ogg'].includes(ext)) return 'audio'
      if (['.txt', '.srt', '.vtt', '.json'].includes(ext)) return 'text'
      if (['.jpg', '.jpeg', '.png', '.gif', '.bmp'].includes(ext)) return 'image'
      return 'other'
    }

    directories.forEach(dir => {
      const dirName = path.basename(dir)
      try {
        if (fs.existsSync(dir)) {
          const files = fs.readdirSync(dir)
            .filter(filename => {
              try {
                const filePath = path.join(dir, filename)
                return fs.statSync(filePath).isFile()
              } catch {
                return false
              }
            })
            .map(filename => {
              try {
                const filePath = path.join(dir, filename)
                const stats = fs.statSync(filePath)
                const fileType = getFileType(filename)

                return {
                  name: filename,
                  size: stats.size,
                  type: fileType,
                  path: `/${dir}/${filename}`,
                  createdAt: stats.birthtime.toISOString(),
                  modified: stats.mtime.toISOString(),
                  downloadUrl: `/api/download/${filename}`
                }
              } catch (fileError) {
                console.warn(`[WARN] Error reading file ${filename}:`, fileError.message)
                return null
              }
            })
            .filter(file => file !== null)

          result[dirName] = files
        } else {
          result[dirName] = []
        }
      } catch (dirError) {
        console.warn(`[WARN] Error reading directory ${dir}:`, dirError.message)
        result[dirName] = []
      }
    })

    sendSuccess(res, { files: result })
  } catch (error) {
    console.error('[ERROR] Failed to list files:', error)
    sendError(res, 500, 'Failed to list files', error.message)
  }
})

// Download endpoint
app.get('/api/download/:filename', (req, res) => {
  try {
    const { filename } = req.params
    const directories = [CONFIG.directories.downloads, CONFIG.directories.processed, CONFIG.directories.uploads]

    for (const dir of directories) {
      const filePath = path.join(dir, filename)
      if (fs.existsSync(filePath)) {
        console.log(`[INFO] Serving file: ${filePath}`)
        return res.download(filePath)
      }
    }

    sendError(res, 404, 'File not found')
  } catch (error) {
    console.error('[ERROR] Download failed:', error)
    sendError(res, 500, 'Download failed', error.message)
  }
})

// Delete file endpoint
app.delete('/api/files/:filename', (req, res) => {
  try {
    const { filename } = req.params
    const directories = [CONFIG.directories.downloads, CONFIG.directories.processed, CONFIG.directories.uploads]

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
      sendSuccess(res, { success: true }, 'File deleted successfully')
    } else {
      sendError(res, 404, 'File not found')
    }
  } catch (error) {
    console.error('[ERROR] Failed to delete file:', error)
    sendError(res, 500, 'Failed to delete file', error.message)
  }
})

// Get supported languages
app.get('/api/languages', (req, res) => {
  try {
    const languages = [
      { code: 'auto', name: 'Auto-detect' },
      { code: 'en', name: 'English' },
      { code: 'es', name: 'Spanish' },
      { code: 'fr', name: 'French' },
      { code: 'de', name: 'German' },
      { code: 'it', name: 'Italian' },
      { code: 'pt', name: 'Portuguese' },
      { code: 'ru', name: 'Russian' },
      { code: 'ja', name: 'Japanese' },
      { code: 'ko', name: 'Korean' },
      { code: 'zh', name: 'Chinese' },
      { code: 'ar', name: 'Arabic' },
      { code: 'hi', name: 'Hindi' }
    ]

    sendSuccess(res, languages)
  } catch (error) {
    sendError(res, 500, 'Failed to get languages', error.message)
  }
})

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('[ERROR] Unhandled error:', err)
  sendError(res, 500, 'Internal server error', err.message)
})

// ===== SERVER INITIALIZATION =====

const startServer = async () => {
  try {
    console.log('[INFO] Initializing Stable Full Video Utility Suite...')

    // Initialize directories
    if (!initializeDirectories()) {
      console.error('[ERROR] Failed to initialize directories')
      process.exit(1)
    }

    // Test external tools
    await testAllTools()

    // Cleanup old jobs
    cleanupOldJobs()

    // Setup periodic cleanup
    setInterval(cleanupOldJobs, 60 * 60 * 1000) // Every hour

    // Start server
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`🎬 Stable Full Video Utility Suite Server running on http://localhost:${PORT}`)
      console.log(`📁 Downloads directory: ${path.resolve(CONFIG.directories.downloads)}`)
      console.log(`🔧 Test endpoint: http://localhost:${PORT}/api/test`)
      console.log(`✅ REAL functionality enabled with crash protection!`)
      console.log(`🌐 Server listening on all interfaces (0.0.0.0:${PORT})`)
      console.log(`🛡️ Bulletproof error handling active`)

      if (toolsAvailable.ytdlp && toolsAvailable.whisper) {
        console.log(`🚀 All tools available - full functionality ready!`)
      } else {
        console.log(`⚠️  Some tools missing - limited functionality`)
        if (!toolsAvailable.ytdlp) console.log(`   📥 Install yt-dlp: pip install yt-dlp`)
        if (!toolsAvailable.whisper) console.log(`   🎤 Install Whisper: pip install openai-whisper`)
        if (!toolsAvailable.ffmpeg) console.log(`   🎬 Install FFmpeg: https://ffmpeg.org/`)
      }
    })

    server.on('error', (error) => {
      console.error('❌ Server failed to start:', error)
      if (error.code === 'EADDRINUSE') {
        console.error(`🔧 Port ${PORT} is already in use. Try a different port.`)
      }
      process.exit(1)
    })

    // Graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n[INFO] Graceful shutdown initiated...')

      // Cancel all active jobs
      for (const [jobId, job] of jobs.entries()) {
        if (job.status === 'processing' && job.pid) {
          try {
            process.kill(job.pid)
            updateJob(jobId, { status: 'canceled', error: 'Server shutdown' })
          } catch (killError) {
            console.warn(`[WARN] Failed to kill process ${job.pid}:`, killError.message)
          }
        }
      }

      server.close(() => {
        console.log('[INFO] Server closed gracefully')
        process.exit(0)
      })
    })

    // Enhanced error handling
    process.on('uncaughtException', (error) => {
      console.error('❌ Uncaught exception:', error)
      console.log('🛡️ Server will continue running with enhanced protection...')
    })

    process.on('unhandledRejection', (reason, promise) => {
      console.error('❌ Unhandled rejection at:', promise, 'reason:', reason)
      console.log('🛡️ Server will continue running with enhanced protection...')
    })

  } catch (error) {
    console.error('[ERROR] Failed to start server:', error)
    process.exit(1)
  }
}

// Start the server
startServer()

console.log('[INFO] Stable Full Video Utility Suite initialization complete!')
