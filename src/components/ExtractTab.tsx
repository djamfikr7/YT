import React, { useState } from 'react'
import { Music, Download, Upload, FileAudio, Settings } from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Badge } from './ui/badge'
import { Progress } from './ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { videoApi } from '@/services/api'
import { useAppStore } from '@/store'
import { validateUrl } from '@/lib/utils'

const ExtractTab: React.FC = () => {
  const [url, setUrl] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [audioFormat, setAudioFormat] = useState('mp3')
  const [quality, setQuality] = useState('192')
  const [isExtracting, setIsExtracting] = useState(false)
  const [extractProgress, setExtractProgress] = useState(0)
  
  const { addJob } = useAppStore()

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedFile(file)
    }
  }

  const handleExtractFromUrl = async () => {
    if (!validateUrl(url)) {
      alert('Please enter a valid URL')
      return
    }

    setIsExtracting(true)
    setExtractProgress(0)

    try {
      const job = await videoApi.extractAudio({
        url,
        audioOnly: true,
        format: audioFormat,
        quality,
      })

      addJob({
        type: 'extract',
        status: 'processing',
        progress: 0,
        input: url,
      })

      // Simulate progress
      const progressInterval = setInterval(() => {
        setExtractProgress(prev => {
          if (prev >= 100) {
            clearInterval(progressInterval)
            setIsExtracting(false)
            return 100
          }
          return prev + Math.random() * 15
        })
      }, 800)

    } catch (error) {
      console.error('Error extracting audio:', error)
      alert('Failed to extract audio. Please try again.')
      setIsExtracting(false)
    }
  }

  const handleExtractFromFile = async () => {
    if (!selectedFile) {
      alert('Please select a video file')
      return
    }

    setIsExtracting(true)
    setExtractProgress(0)

    try {
      // In a real implementation, you would upload the file and extract audio
      addJob({
        type: 'extract',
        status: 'processing',
        progress: 0,
        input: selectedFile.name,
      })

      // Simulate progress
      const progressInterval = setInterval(() => {
        setExtractProgress(prev => {
          if (prev >= 100) {
            clearInterval(progressInterval)
            setIsExtracting(false)
            return 100
          }
          return prev + Math.random() * 12
        })
      }, 600)

    } catch (error) {
      console.error('Error extracting audio from file:', error)
      alert('Failed to extract audio from file. Please try again.')
      setIsExtracting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Main Extraction Interface */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Music className="w-5 h-5" />
            <span>Audio Extraction</span>
          </CardTitle>
          <CardDescription>
            Extract high-quality audio from videos or online sources
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="url" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="url">From URL</TabsTrigger>
              <TabsTrigger value="file">From File</TabsTrigger>
            </TabsList>
            
            <TabsContent value="url" className="space-y-4">
              <div className="space-y-4">
                <div className="flex space-x-2">
                  <Input
                    placeholder="https://www.youtube.com/watch?v=..."
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="flex-1"
                  />
                </div>
                
                {/* Audio Settings */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Audio Format</label>
                    <Select value={audioFormat} onValueChange={setAudioFormat}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mp3">MP3</SelectItem>
                        <SelectItem value="wav">WAV</SelectItem>
                        <SelectItem value="flac">FLAC</SelectItem>
                        <SelectItem value="aac">AAC</SelectItem>
                        <SelectItem value="ogg">OGG</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Quality (kbps)</label>
                    <Select value={quality} onValueChange={setQuality}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="128">128 kbps</SelectItem>
                        <SelectItem value="192">192 kbps</SelectItem>
                        <SelectItem value="256">256 kbps</SelectItem>
                        <SelectItem value="320">320 kbps</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <Button
                  onClick={handleExtractFromUrl}
                  disabled={isExtracting || !url}
                  className="w-full"
                >
                  {isExtracting ? 'Extracting...' : 'Extract Audio'}
                  <Music className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </TabsContent>
            
            <TabsContent value="file" className="space-y-4">
              <div className="space-y-4">
                {/* File Upload */}
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6">
                  <div className="text-center">
                    <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
                    <div className="mt-4">
                      <label htmlFor="video-file" className="cursor-pointer">
                        <span className="mt-2 block text-sm font-medium text-foreground">
                          {selectedFile ? selectedFile.name : 'Click to upload video file'}
                        </span>
                        <span className="mt-1 block text-xs text-muted-foreground">
                          Supports MP4, AVI, MOV, MKV and more
                        </span>
                      </label>
                      <input
                        id="video-file"
                        type="file"
                        className="hidden"
                        accept="video/*"
                        onChange={handleFileSelect}
                      />
                    </div>
                  </div>
                </div>
                
                {selectedFile && (
                  <div className="flex items-center space-x-2 p-3 bg-muted rounded-lg">
                    <FileAudio className="w-5 h-5 text-primary" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{selectedFile.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                      </p>
                    </div>
                    <Badge variant="secondary">{selectedFile.type}</Badge>
                  </div>
                )}
                
                {/* Audio Settings */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Audio Format</label>
                    <Select value={audioFormat} onValueChange={setAudioFormat}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mp3">MP3</SelectItem>
                        <SelectItem value="wav">WAV</SelectItem>
                        <SelectItem value="flac">FLAC</SelectItem>
                        <SelectItem value="aac">AAC</SelectItem>
                        <SelectItem value="ogg">OGG</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Quality (kbps)</label>
                    <Select value={quality} onValueChange={setQuality}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="128">128 kbps</SelectItem>
                        <SelectItem value="192">192 kbps</SelectItem>
                        <SelectItem value="256">256 kbps</SelectItem>
                        <SelectItem value="320">320 kbps</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <Button
                  onClick={handleExtractFromFile}
                  disabled={isExtracting || !selectedFile}
                  className="w-full"
                >
                  {isExtracting ? 'Extracting...' : 'Extract Audio from File'}
                  <Music className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </TabsContent>
          </Tabs>
          
          {/* Progress */}
          {isExtracting && (
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Extracting audio...</span>
                <span>{Math.round(extractProgress)}%</span>
              </div>
              <Progress value={extractProgress} className="w-full" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Format Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="w-5 h-5" />
            <span>Audio Format Guide</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <h4 className="font-medium">Lossy Formats</h4>
              <div className="space-y-1 text-muted-foreground">
                <p><strong>MP3:</strong> Most compatible, good quality</p>
                <p><strong>AAC:</strong> Better quality than MP3 at same bitrate</p>
                <p><strong>OGG:</strong> Open source, good compression</p>
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Lossless Formats</h4>
              <div className="space-y-1 text-muted-foreground">
                <p><strong>WAV:</strong> Uncompressed, largest file size</p>
                <p><strong>FLAC:</strong> Compressed lossless, smaller than WAV</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default ExtractTab