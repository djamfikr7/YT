import React, { useState, useEffect } from 'react'
import { 
  Folder, 
  File, 
  Download, 
  Play, 
  Trash2, 
  Eye, 
  RefreshCw,
  FolderOpen,
  Video,
  Music,
  FileText,
  Image
} from 'lucide-react'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import VideoPlayer from './ui/video-player'
import { useAppStore } from '@/store'
import { videoApi } from '@/services/api'

interface FileItem {
  name: string
  size: number
  type: 'video' | 'audio' | 'text' | 'image' | 'other'
  path: string
  createdAt: string
  downloadUrl: string
}

interface DirectoryContents {
  downloads: FileItem[]
  processed: FileItem[]
  uploads: FileItem[]
}

const FilesTab: React.FC = () => {
  const [files, setFiles] = useState<DirectoryContents>({
    downloads: [],
    processed: [],
    uploads: []
  })
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null)
  const [activeDirectory, setActiveDirectory] = useState<'downloads' | 'processed' | 'uploads'>('downloads')
  const [isLoading, setIsLoading] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  const { jobs } = useAppStore()

  // No more mock data - using real API data only

  useEffect(() => {
    loadFiles()
  }, [])

  const loadFiles = async () => {
    setIsLoading(true)
    try {
      // Fetch real files from API
      const apiFiles = await videoApi.getFiles()

      // Use API response directly - no more mock data fallback
      const convertedFiles: DirectoryContents = {
        downloads: apiFiles.downloads || [],
        processed: apiFiles.processed || [],
        uploads: apiFiles.uploads || []
      }

      // Add completed jobs that might not be in the file system yet
      const completedJobs = jobs.filter(job => job.status === 'completed' && job.result?.filename)
      const jobFiles: FileItem[] = completedJobs
        .filter(job => job.result?.filename)
        .map(job => ({
          name: job.result.filename,
          size: job.result.fileSize || 0,
          type: getFileType(job.type),
          path: `/downloads/${job.result.filename}`,
          createdAt: job.completedAt?.toISOString() || new Date().toISOString(),
          downloadUrl: job.result.downloadUrl || `/api/download/${job.result.filename}`
        }))

      // Merge API files with job files, avoiding duplicates
      const existingNames = new Set(convertedFiles.downloads.map(f => f.name))
      const newJobFiles = jobFiles.filter(f => !existingNames.has(f.name))

      setFiles({
        ...convertedFiles,
        downloads: [...convertedFiles.downloads, ...newJobFiles]
      })
    } catch (error) {
      console.error('Error loading files:', error)
      // Show empty state instead of mock data
      setFiles({
        downloads: [],
        processed: [],
        uploads: []
      })
    } finally {
      setIsLoading(false)
    }
  }

  const getFileExtension = (jobType: string): string => {
    switch (jobType) {
      case 'download': return 'mp4'
      case 'extract': return 'mp3'
      case 'transcribe': return 'txt'
      case 'translate': return 'txt'
      case 'manipulate': return 'mp4'
      default: return 'bin'
    }
  }

  const getFileType = (jobType: string): FileItem['type'] => {
    switch (jobType) {
      case 'download':
      case 'manipulate':
        return 'video'
      case 'extract':
        return 'audio'
      case 'transcribe':
      case 'translate':
        return 'text'
      default:
        return 'other'
    }
  }

  const getFileIcon = (type: FileItem['type']) => {
    switch (type) {
      case 'video': return <Video className="w-5 h-5 text-blue-500" />
      case 'audio': return <Music className="w-5 h-5 text-green-500" />
      case 'text': return <FileText className="w-5 h-5 text-yellow-500" />
      case 'image': return <Image className="w-5 h-5 text-purple-500" />
      default: return <File className="w-5 h-5 text-gray-500" />
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const handleFileSelect = (file: FileItem) => {
    setSelectedFile(file)
    setShowPreview(true)
  }

  const handleDownload = (file: FileItem) => {
    // Create a temporary link to download the file
    const link = document.createElement('a')
    link.href = file.downloadUrl
    link.download = file.name
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleDelete = async (file: FileItem) => {
    if (confirm(`Are you sure you want to delete ${file.name}?`)) {
      try {
        await videoApi.deleteFile(file.name)
        console.log('File deleted successfully:', file.name)
        loadFiles() // Refresh the file list
      } catch (error) {
        console.error('Error deleting file:', error)
        alert('Failed to delete file. Please try again.')
      }
    }
  }

  const currentFiles = files[activeDirectory]

  return (
    <div className="space-y-6">
      {/* Directory Navigation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Folder className="w-5 h-5" />
            <span>File Manager</span>
          </CardTitle>
          <CardDescription>
            Browse and manage your downloaded, processed, and uploaded files
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-2 mb-4">
            <Button
              variant={activeDirectory === 'downloads' ? 'default' : 'outline'}
              onClick={() => setActiveDirectory('downloads')}
              className="flex items-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>Downloads ({files.downloads.length})</span>
            </Button>
            <Button
              variant={activeDirectory === 'processed' ? 'default' : 'outline'}
              onClick={() => setActiveDirectory('processed')}
              className="flex items-center space-x-2"
            >
              <FolderOpen className="w-4 h-4" />
              <span>Processed ({files.processed.length})</span>
            </Button>
            <Button
              variant={activeDirectory === 'uploads' ? 'default' : 'outline'}
              onClick={() => setActiveDirectory('uploads')}
              className="flex items-center space-x-2"
            >
              <Folder className="w-4 h-4" />
              <span>Uploads ({files.uploads.length})</span>
            </Button>
            <Button
              variant="outline"
              onClick={loadFiles}
              disabled={isLoading}
              className="ml-auto"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          {/* File List */}
          <div className="space-y-2">
            {currentFiles.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Folder className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No files in this directory</p>
              </div>
            ) : (
              currentFiles.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                  onClick={() => handleFileSelect(file)}
                >
                  <div className="flex items-center space-x-3">
                    {getFileIcon(file.type)}
                    <div>
                      <p className="font-medium">{file.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatFileSize(file.size)} • {new Date(file.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="secondary">{file.type}</Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleFileSelect(file)
                      }}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDownload(file)
                      }}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(file)
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* File Preview */}
      {selectedFile && showPreview && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Preview: {selectedFile.name}</span>
              <Button
                variant="outline"
                onClick={() => setShowPreview(false)}
              >
                Close
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedFile.type === 'video' && (
              <VideoPlayer
                src={selectedFile.downloadUrl}
                className="w-full max-w-4xl mx-auto"
              />
            )}
            {selectedFile.type === 'audio' && (
              <audio controls className="w-full">
                <source src={selectedFile.downloadUrl} type="audio/mpeg" />
                Your browser does not support the audio element.
              </audio>
            )}
            {selectedFile.type === 'text' && (
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">Text file preview:</p>
                <p className="font-mono text-sm">
                  This is a preview of the text file. In a real implementation, 
                  the actual file content would be loaded here.
                </p>
              </div>
            )}
            {selectedFile.type === 'image' && (
              <img
                src={selectedFile.downloadUrl}
                alt={selectedFile.name}
                className="max-w-full h-auto rounded-lg"
              />
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default FilesTab
