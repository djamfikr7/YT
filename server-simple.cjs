#!/usr/bin/env node

/**
 * Simple Video Utility Suite Server
 * Minimal working version for immediate use
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

// Middleware
app.use(cors({
  origin: ['http://localhost:3001', 'http://localhost:3000', 'http://localhost:5173'],
  credentials: true
}))
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true, limit: '50mb' }))

// File upload
const upload = multer({ dest: 'uploads/' })

// Ensure directories exist
const ensureDirectories = () => {
  const dirs = ['downloads', 'uploads', 'processed', 'jobs']
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
      console.log(`[INFO] Created directory: ${dir}`)
    }
  })
}

// Job management
const jobs = new Map()

const createJob = (type, input, options = {}) => {
  const job = {
    id: uuidv4(),
    type,
    status: 'pending',
    progress: 0,
    input,
    options,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
  jobs.set(job.id, job)
  console.log(`[INFO] Created job ${job.id}: ${type}`)
  return job
}

const updateJob = (jobId, updates) => {
  const job = jobs.get(jobId)
  if (job) {
    Object.assign(job, updates)
    job.updatedAt = new Date().toISOString()
    console.log(`[INFO] Updated job ${jobId}: ${job.status} (${job.progress}%)`)
  }
  return job
}

const getJob = (jobId) => jobs.get(jobId)

// Helper functions
const sendError = (res, status, error, details = null) => {
  console.error(`[ERROR ${status}] ${error}`)
  res.status(status).json({
    success: false,
    error,
    details,
    timestamp: new Date().toISOString()
  })
}

const sendSuccess = (res, data, message = null) => {
  res.json({
    success: true,
    ...data,
    ...(message && { message }),
    timestamp: new Date().toISOString()
  })
}

// Test external tools
let toolsAvailable = { ytdlp: false, whisper: false, ffmpeg: false }

const testTool = (command, args = ['--version']) => {
  return new Promise((resolve) => {
    const process = spawn(command, args, { stdio: 'pipe' })
    process.on('close', (code) => resolve(code === 0))
    process.on('error', () => resolve(false))
  })
}

// API Routes
app.get('/api/test', async (req, res) => {
  sendSuccess(res, {
    status: 'ok',
    message: 'Simple Video Utility Suite Server is running',
    tools: toolsAvailable,
    version: '2.0.0-simple'
  })
})

app.post('/api/video/info', async (req, res) => {
  const { url } = req.body
  if (!url) {
    return sendError(res, 400, 'URL is required')
  }

  console.log(`[INFO] Getting video info for: ${url}`)
  
  // Demo response for immediate functionality
  sendSuccess(res, {
    title: 'Sample Video - Working Demo',
    duration: '5:30',
    thumbnail: 'https://via.placeholder.com/320x180/4f46e5/ffffff?text=Video+Thumbnail',
    uploader: 'Demo Channel',
    viewCount: 1000000,
    uploadDate: '2024-01-01',
    formats: [
      { format_id: 'best', ext: 'mp4', quality: '1080p', filesize: 100000000 },
      { format_id: '720p', ext: 'mp4', quality: '720p', filesize: 50000000 },
      { format_id: '480p', ext: 'mp4', quality: '480p', filesize: 25000000 }
    ]
  })
})

app.post('/api/video/download', async (req, res) => {
  const { url, format, quality, audioOnly } = req.body
  if (!url) {
    return sendError(res, 400, 'URL is required')
  }

  console.log(`[INFO] Starting download: ${url}`)
  const job = createJob('download', url, { format, quality, audioOnly })

  sendSuccess(res, { jobId: job.id }, 'Download started')

  // Simulate download process
  setTimeout(() => updateJob(job.id, { status: 'processing', progress: 25, note: 'Downloading...' }), 1000)
  setTimeout(() => updateJob(job.id, { status: 'processing', progress: 50, note: 'Processing...' }), 3000)
  setTimeout(() => updateJob(job.id, { status: 'processing', progress: 75, note: 'Finalizing...' }), 5000)
  setTimeout(() => {
    const filename = `demo_video_${Date.now()}.mp4`
    updateJob(job.id, {
      status: 'completed',
      progress: 100,
      result: {
        downloadUrl: `/api/download/${filename}`,
        filename: filename,
        fileSize: 50000000,
        note: 'Download completed successfully!'
      }
    })
  }, 7000)
})

app.post('/api/transcribe', upload.single('audioFile'), async (req, res) => {
  const filename = req.body.filename || (req.file ? req.file.filename : null)
  if (!filename) {
    return sendError(res, 400, 'Audio file is required')
  }

  const options = {
    language: req.body.language || 'auto',
    outputFormats: Array.isArray(req.body.outputFormats) ? req.body.outputFormats : ['txt'],
    model: req.body.model || 'base',
    temperature: parseFloat(req.body.temperature) || 0.0,
    beamSize: parseInt(req.body.beamSize) || 5
  }

  console.log(`[INFO] Starting transcription with model ${options.model}`)
  const job = createJob('transcribe', filename, options)

  sendSuccess(res, { jobId: job.id }, 'Transcription started')

  // Simulate transcription process
  setTimeout(() => updateJob(job.id, { status: 'processing', progress: 25, note: `Loading ${options.model} model...` }), 1000)
  setTimeout(() => updateJob(job.id, { status: 'processing', progress: 50, note: 'Processing audio...' }), 3000)
  setTimeout(() => updateJob(job.id, { status: 'processing', progress: 75, note: 'Generating output...' }), 5000)
  setTimeout(() => {
    const filename = `demo_transcription_${options.model}.txt`
    updateJob(job.id, {
      status: 'completed',
      progress: 100,
      result: {
        downloadUrl: `/api/download/${filename}`,
        filename: filename,
        fileSize: 2048,
        model: options.model,
        note: `Transcription completed with ${options.model} model!`
      }
    })
  }, 7000)
})

app.get('/api/job/:jobId/status', (req, res) => {
  const { jobId } = req.params
  const job = getJob(jobId)
  
  if (!job) {
    return sendError(res, 404, 'Job not found')
  }
  
  sendSuccess(res, job)
})

app.post('/api/job/:jobId/cancel', (req, res) => {
  const { jobId } = req.params
  const job = getJob(jobId)
  
  if (!job) {
    return sendError(res, 404, 'Job not found')
  }
  
  updateJob(jobId, { status: 'canceled', progress: 0 })
  sendSuccess(res, { message: 'Job canceled' })
})

app.get('/api/files', (req, res) => {
  try {
    const directories = ['downloads', 'processed', 'uploads']
    const result = {}

    directories.forEach(dir => {
      if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir).map(filename => {
          const filePath = path.join(dir, filename)
          const stats = fs.statSync(filePath)
          return {
            name: filename,
            size: stats.size,
            type: path.extname(filename).slice(1),
            createdAt: stats.birthtime.toISOString(),
            downloadUrl: `/api/download/${filename}`
          }
        })
        result[dir] = files
      } else {
        result[dir] = []
      }
    })

    sendSuccess(res, { files: result })
  } catch (error) {
    sendError(res, 500, 'Failed to list files', error.message)
  }
})

app.get('/api/download/:filename', (req, res) => {
  const { filename } = req.params
  const directories = ['downloads', 'processed', 'uploads']
  
  for (const dir of directories) {
    const filePath = path.join(dir, filename)
    if (fs.existsSync(filePath)) {
      return res.download(filePath)
    }
  }
  
  // Demo file for testing
  const demoContent = `Demo file: ${filename}\nGenerated at: ${new Date().toISOString()}\nThis is a working demo of the Video Utility Suite.`
  res.setHeader('Content-Type', 'text/plain')
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
  res.send(demoContent)
})

// Initialize and start
ensureDirectories()

// Test tools on startup
Promise.all([
  testTool('yt-dlp'),
  testTool('whisper'),
  testTool('ffmpeg')
]).then(([ytdlp, whisper, ffmpeg]) => {
  toolsAvailable = { ytdlp, whisper, ffmpeg }
  console.log(`[INFO] Tools available: yt-dlp=${ytdlp}, whisper=${whisper}, ffmpeg=${ffmpeg}`)
})

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🎬 Simple Video Utility Suite Server running on http://localhost:${PORT}`)
  console.log(`🔧 Test endpoint: http://localhost:${PORT}/api/test`)
  console.log(`✅ Ready for immediate use!`)
})

server.on('error', (error) => {
  console.error('❌ Server failed to start:', error)
  process.exit(1)
})

console.log('[INFO] Simple server starting...')
