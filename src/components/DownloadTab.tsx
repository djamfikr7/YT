import React, { useState } from 'react'
import { Download, Play, Info, ExternalLink } from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Badge } from './ui/badge'
import { Progress } from './ui/progress'
import { videoApi, VideoInfo } from '@/services/api'
import { useAppStore } from '@/store'
import { validateUrl, formatFileSize, formatDuration } from '@/lib/utils'

const DownloadTab: React.FC = () => {
  const [url, setUrl] = useState('')
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null)
  const [selectedFormat, setSelectedFormat] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState(0)
  const [isDownloading, setIsDownloading] = useState(false)
  
  const { addJob, updateJob } = useAppStore()

  const handleGetInfo = async () => {
    if (!validateUrl(url)) {
      alert('Please enter a valid URL')
      return
    }

    setIsLoading(true)
    try {
      const info = await videoApi.getVideoInfo(url)
      setVideoInfo(info)
      if (info.formats.length > 0) {
        setSelectedFormat(info.formats[0].format_id)
      }
    } catch (error) {
      console.error('Error fetching video info:', error)
      alert('Failed to fetch video information. Please check the URL and try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDownload = async () => {
    if (!videoInfo || !selectedFormat) return

    setIsDownloading(true)
    setDownloadProgress(0)

    try {
      const job = await videoApi.downloadVideo({
        url,
        format: selectedFormat,
      })

      addJob({
        type: 'download',
        status: 'processing',
        progress: 0,
        input: url,
      })

      // Simulate progress updates (in real implementation, this would come from WebSocket or polling)
      const progressInterval = setInterval(() => {
        setDownloadProgress(prev => {
          if (prev >= 100) {
            clearInterval(progressInterval)
            setIsDownloading(false)
            return 100
          }
          return prev + Math.random() * 10
        })
      }, 500)

    } catch (error) {
      console.error('Error downloading video:', error)
      alert('Failed to start download. Please try again.')
      setIsDownloading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* URL Input */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Download className="w-5 h-5" />
            <span>Video Download</span>
          </CardTitle>
          <CardDescription>
            Enter a video URL from YouTube, Vimeo, or other supported platforms
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex space-x-2">
            <Input
              placeholder="https://www.youtube.com/watch?v=..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="flex-1"
            />
            <Button onClick={handleGetInfo} disabled={isLoading || !url}>
              {isLoading ? 'Loading...' : 'Get Info'}
              <Info className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Video Information */}
      {videoInfo && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="truncate">{videoInfo.title}</span>
              <Badge variant="secondary">{formatDuration(videoInfo.duration)}</Badge>
            </CardTitle>
            <CardDescription className="flex items-center space-x-4">
              <span>By {videoInfo.uploader}</span>
              <span>•</span>
              <span>{videoInfo.view_count?.toLocaleString()} views</span>
              <span>•</span>
              <span>{videoInfo.upload_date}</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Thumbnail */}
            <div className="flex space-x-4">
              <img
                src={videoInfo.thumbnail}
                alt={videoInfo.title}
                className="w-32 h-24 object-cover rounded-md"
              />
              <div className="flex-1 space-y-3">
                {/* Format Selection */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Quality & Format</label>
                  <Select value={selectedFormat} onValueChange={setSelectedFormat}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select quality" />
                    </SelectTrigger>
                    <SelectContent>
                      {videoInfo.formats.map((format) => (
                        <SelectItem key={format.format_id} value={format.format_id}>
                          <div className="flex items-center justify-between w-full">
                            <span>{format.quality} ({format.ext})</span>
                            {format.filesize && (
                              <span className="text-muted-foreground ml-2">
                                {formatFileSize(format.filesize)}
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Download Button */}
                <div className="flex space-x-2">
                  <Button
                    onClick={handleDownload}
                    disabled={isDownloading || !selectedFormat}
                    className="flex-1"
                  >
                    {isDownloading ? 'Downloading...' : 'Download Video'}
                    <Download className="w-4 h-4 ml-2" />
                  </Button>
                  <Button variant="outline" size="icon">
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Download Progress */}
            {isDownloading && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Downloading...</span>
                  <span>{Math.round(downloadProgress)}%</span>
                </div>
                <Progress value={downloadProgress} className="w-full" />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Quick Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Supported Platforms</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="flex items-center space-x-2">
              <Play className="w-4 h-4 text-red-500" />
              <span>YouTube</span>
            </div>
            <div className="flex items-center space-x-2">
              <Play className="w-4 h-4 text-blue-500" />
              <span>Vimeo</span>
            </div>
            <div className="flex items-center space-x-2">
              <Play className="w-4 h-4 text-orange-500" />
              <span>Dailymotion</span>
            </div>
            <div className="flex items-center space-x-2">
              <Play className="w-4 h-4 text-purple-500" />
              <span>Twitch</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default DownloadTab