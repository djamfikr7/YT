import axios from 'axios'

const API_BASE_URL = '/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 300000, // 5 minutes for long operations
})

// Request interceptor
api.interceptors.request.use(
  (config) => {
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`)
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor
api.interceptors.response.use(
  (response) => {
    console.log(`API Response: ${response.status} ${response.config.url}`)
    return response
  },
  (error) => {
    console.error('API Error:', error.response?.data || error.message)
    return Promise.reject(error)
  }
)

export interface VideoInfo {
  title: string
  duration: string // Changed to string to match backend response format
  thumbnail: string
  uploader: string
  uploadDate: string // Changed to camelCase to match backend
  viewCount: number // Changed to camelCase to match backend
  description?: string // Added optional description field
  formats: VideoFormat[]
}

export interface VideoFormat {
  format_id: string
  ext: string
  quality: string
  filesize?: number
  vcodec?: string
  acodec?: string
}

export interface DownloadOptions {
  url: string
  format?: string
  quality?: string
  audioOnly?: boolean
  playlist?: boolean
}

export interface TranscriptionOptions {
  audioFile: File
  language?: string
  includeTimestamps?: boolean
  outputFormat?: 'txt' | 'srt' | 'vtt' | 'json'
}

export interface TranslationOptions {
  text: string
  sourceLang?: string
  targetLang: string
}

export interface VideoManipulationOptions {
  videoFile: File
  operation: 'split' | 'trim' | 'merge' | 'convert' | 'resize' | 'rotate' | 'watermark' | 'gif'
  parameters: Record<string, any>
}

// API endpoints
export const videoApi = {
  // Get video information
  getVideoInfo: async (url: string): Promise<VideoInfo> => {
    const response = await api.post('/video/info', { url })
    return response.data
  },

  // Download video
  downloadVideo: async (options: DownloadOptions): Promise<{ jobId: string }> => {
    const response = await api.post('/video/download', options)
    return response.data
  },

  // Extract audio
  extractAudio: async (options: DownloadOptions): Promise<{ jobId: string }> => {
    const response = await api.post('/video/extract-audio', options)
    return response.data
  },

  // Transcribe audio
  transcribeAudio: async (options: TranscriptionOptions): Promise<{ jobId: string }> => {
    const formData = new FormData()
    formData.append('audioFile', options.audioFile) // Fixed field name to match backend
    if (options.language) formData.append('language', options.language)
    if (options.includeTimestamps) formData.append('includeTimestamps', 'true')
    if (options.outputFormat) formData.append('outputFormat', options.outputFormat)

    const response = await api.post('/transcribe', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },

  // Translate text
  translateText: async (options: TranslationOptions): Promise<{ translation: string }> => {
    const response = await api.post('/translate', options)
    return response.data
  },

  // Video manipulation
  manipulateVideo: async (options: VideoManipulationOptions): Promise<{ jobId: string }> => {
    const formData = new FormData()
    formData.append('videoFile', options.videoFile) // Fixed field name to match backend
    formData.append('operation', options.operation)
    formData.append('parameters', JSON.stringify(options.parameters))

    const response = await api.post('/video/manipulate', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },

  // Get job status
  getJobStatus: async (jobId: string): Promise<{
    status: 'pending' | 'processing' | 'completed' | 'error'
    progress: number
    result?: any
    error?: string
  }> => {
    const response = await api.get(`/job/${jobId}/status`)
    return response.data
  },

  // Download result
  downloadResult: async (jobId: string): Promise<Blob> => {
    const response = await api.get(`/download/${jobId}`, {
      responseType: 'blob',
    })
    return response.data
  },

  // Get supported languages
  getSupportedLanguages: async (): Promise<{ code: string; name: string }[]> => {
    const response = await api.get('/languages')
    return response.data
  },

  // Get metadata
  getMetadata: async (file: File): Promise<any> => {
    const formData = new FormData()
    formData.append('file', file)

    const response = await api.post('/video/metadata', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },

  // File management
  getFiles: async (): Promise<{
    downloads: any[]
    processed: any[]
    uploads: any[]
  }> => {
    const response = await api.get('/files')
    return response.data.files
  },

  deleteFile: async (filename: string): Promise<{ success: boolean }> => {
    const response = await api.delete(`/files/${filename}`)
    return response.data
  },
}

export default api