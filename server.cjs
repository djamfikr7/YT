const express = require('express')
const cors = require('cors')
const multer = require('multer')
const path = require('path')
const fs = require('fs')

const app = express()
const PORT = process.env.PORT || 9000;

// Middleware
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/')
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname)
  }
})

const upload = multer({ storage })

// Mock data for demonstration
const mockVideoInfo = {
  title: 'Sample Video Title',
  duration: '00:03:45',
  thumbnail: 'https://via.placeholder.com/320x180',
  uploader: 'Sample Channel',
  uploadDate: '2024-01-15',
  viewCount: 1234567,
  description: 'This is a sample video description for demonstration purposes.',
  formats: [
    { format_id: '720p', ext: 'mp4', height: 720, filesize: 52428800, format_note: 'HD' },
    { format_id: '480p', ext: 'mp4', height: 480, filesize: 31457280, format_note: 'SD' },
    { format_id: '360p', ext: 'mp4', height: 360, filesize: 20971520, format_note: 'Low' },
    { format_id: 'audio', ext: 'mp3', vcodec: 'none', filesize: 5242880, format_note: 'Audio only' }
  ]
}

const mockLanguages = [
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

// API Routes

// Get video information
app.post('/api/video/info', (req, res) => {
  const { url } = req.body
  
  if (!url) {
    return res.status(400).json({ error: 'URL is required' })
  }
  
  // Simulate processing delay
  setTimeout(() => {
    res.json({
      success: true,
      data: {
        ...mockVideoInfo,
        url: url
      }
    })
  }, 1000)
})

// Download video
app.post('/api/video/download', (req, res) => {
  const { url, format, quality } = req.body
  
  const jobId = 'job_' + Date.now()
  
  res.json({
    success: true,
    jobId: jobId,
    message: 'Download started'
  })
})

// Extract audio
app.post('/api/video/extract-audio', (req, res) => {
  const { url, format, quality } = req.body
  
  const jobId = 'job_' + Date.now()
  
  res.json({
    success: true,
    jobId: jobId,
    downloadUrl: '/api/download/' + jobId + '.mp3',
    message: 'Audio extraction started'
  })
})

// Extract audio from file
app.post('/api/video/extract-audio-file', upload.single('videoFile'), (req, res) => {
  const { format, quality } = req.body
  
  if (!req.file) {
    return res.status(400).json({ error: 'Video file is required' })
  }
  
  const jobId = 'job_' + Date.now()
  
  res.json({
    success: true,
    jobId: jobId,
    downloadUrl: '/api/download/' + jobId + '.' + format,
    message: 'Audio extraction from file started'
  })
})

// Transcribe audio
app.post('/api/transcribe', upload.single('audioFile'), (req, res) => {
  const { language, outputFormat, includeTimestamps } = req.body
  
  const jobId = 'job_' + Date.now()
  
  // Mock transcription result
  const mockTranscription = {
    text: 'This is a sample transcription of the audio content. The transcription service has processed the audio and converted speech to text.',
    timestamps: includeTimestamps === 'true' ? [
      { start: 0, end: 2.5, text: 'This is a sample transcription' },
      { start: 2.5, end: 5.0, text: 'of the audio content.' },
      { start: 5.0, end: 8.0, text: 'The transcription service has processed' },
      { start: 8.0, end: 10.5, text: 'the audio and converted speech to text.' }
    ] : null
  }
  
  res.json({
    success: true,
    jobId: jobId,
    result: mockTranscription,
    downloadUrl: '/api/download/' + jobId + '.' + outputFormat
  })
})

// Transcribe from URL
app.post('/api/transcribe-url', (req, res) => {
  const { url, language, outputFormat, includeTimestamps } = req.body
  
  const jobId = 'job_' + Date.now()
  
  const mockTranscription = {
    text: 'This is a sample transcription from the video URL. The system has downloaded the audio and processed it for transcription.',
    timestamps: includeTimestamps ? [
      { start: 0, end: 3.0, text: 'This is a sample transcription from the video URL.' },
      { start: 3.0, end: 7.0, text: 'The system has downloaded the audio and processed it for transcription.' }
    ] : null
  }
  
  res.json({
    success: true,
    jobId: jobId,
    result: mockTranscription,
    downloadUrl: '/api/download/' + jobId + '.' + outputFormat
  })
})

// Translate text
app.post('/api/translate', (req, res) => {
  const { text, sourceLang, targetLang } = req.body
  
  if (!text || !targetLang) {
    return res.status(400).json({ error: 'Text and target language are required' })
  }
  
  // Mock translation
  const translatedText = `[Translated to ${targetLang}] ${text}`
  
  res.json({
    success: true,
    translatedText: translatedText,
    sourceLang: sourceLang || 'auto',
    targetLang: targetLang
  })
})

// Translate file
app.post('/api/translate-file', upload.single('file'), (req, res) => {
  const { sourceLang, targetLang } = req.body
  
  if (!req.file) {
    return res.status(400).json({ error: 'File is required' })
  }
  
  const jobId = 'job_' + Date.now()
  
  res.json({
    success: true,
    jobId: jobId,
    downloadUrl: '/api/download/' + jobId + '_translated.txt',
    message: 'File translation started'
  })
})

// Manipulate video
app.post('/api/video/manipulate', upload.single('videoFile'), (req, res) => {
  const { operation, parameters } = req.body
  
  if (!req.file && !req.body.url) {
    return res.status(400).json({ error: 'Video file or URL is required' })
  }
  
  const jobId = 'job_' + Date.now()
  
  res.json({
    success: true,
    jobId: jobId,
    message: `Video ${operation} operation started`,
    downloadUrl: '/api/download/' + jobId + '_processed.mp4'
  })
})

// Get job status
app.get('/api/job/:jobId/status', (req, res) => {
  const { jobId } = req.params
  
  // Mock job status
  res.json({
    success: true,
    status: 'completed',
    progress: 100,
    result: {
      downloadUrl: '/api/download/' + jobId + '_result.mp4'
    }
  })
})

// Download result
app.get('/api/download/:filename', (req, res) => {
  const { filename } = req.params
  
  // Mock file download
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
  res.setHeader('Content-Type', 'application/octet-stream')
  res.send('Mock file content for: ' + filename)
})

// Get supported languages
app.get('/api/languages', (req, res) => {
  res.json({
    success: true,
    languages: mockLanguages
  })
})

// Extract metadata
app.post('/api/video/metadata', (req, res) => {
  const { url } = req.body
  
  const mockMetadata = {
    title: 'Sample Video',
    duration: 225, // seconds
    width: 1920,
    height: 1080,
    fps: 30,
    bitrate: 2500000,
    codec: 'h264',
    filesize: 52428800,
    format: 'mp4'
  }
  
  res.json({
    success: true,
    metadata: mockMetadata
  })
})

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('[ERROR] Unhandled error:', err.stack);
  res.status(500).json({ error: 'Something went wrong!', details: err.message });
})

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' })
})

// Create uploads directory if it doesn't exist
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads')
}

app.on('error', (err) => {
  console.error('Server startup error:', err);
});

app.listen(PORT, () => {
  console.log(`[INFO] Attempting to start server on port ${PORT}...`);
  console.log(`🚀 Video Utility Suite Backend running on http://localhost:${PORT}`);
  console.log(`📁 Upload directory: ${path.join(__dirname, 'uploads')}`)
  console.log('🎯 API endpoints available:')
  console.log('   POST /api/video/info - Get video information')
  console.log('   POST /api/video/download - Download video')
  console.log('   POST /api/video/extract-audio - Extract audio from URL')
  console.log('   POST /api/video/extract-audio-file - Extract audio from file')
  console.log('   POST /api/transcribe - Transcribe audio file')
  console.log('   POST /api/transcribe-url - Transcribe from URL')
  console.log('   POST /api/translate - Translate text')
  console.log('   POST /api/translate-file - Translate file')
  console.log('   POST /api/video/manipulate - Manipulate video')
  console.log('   GET  /api/languages - Get supported languages')
  console.log('   GET  /api/job/:id/status - Get job status')
  console.log('   GET  /api/download/:filename - Download result')
})