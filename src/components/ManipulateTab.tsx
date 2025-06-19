import React, { useState } from 'react'
import { Video, Upload, Scissors, RotateCw, Crop, Merge, Download, Settings, Play } from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Badge } from './ui/badge'
import { Progress } from './ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { videoApi } from '@/services/api'
import { useAppStore } from '@/store'

const ManipulateTab: React.FC = () => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [operation, setOperation] = useState<'split' | 'trim' | 'merge' | 'convert' | 'resize' | 'rotate' | 'watermark' | 'gif'>('trim')
  const [isProcessing, setIsProcessing] = useState(false)
  const [processProgress, setProcessProgress] = useState(0)
  
  // Operation-specific parameters
  const [trimStart, setTrimStart] = useState('')
  const [trimEnd, setTrimEnd] = useState('')
  const [outputFormat, setOutputFormat] = useState('mp4')
  const [resolution, setResolution] = useState('1920x1080')
  const [rotation, setRotation] = useState('90')
  const [watermarkText, setWatermarkText] = useState('')
  const [gifStart, setGifStart] = useState('')
  const [gifDuration, setGifDuration] = useState('3')
  
  const { addJob } = useAppStore()

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    setSelectedFiles(files)
  }

  const handleProcess = async () => {
    if (selectedFiles.length === 0) {
      alert('Please select at least one video file')
      return
    }

    if (operation === 'merge' && selectedFiles.length < 2) {
      alert('Please select at least two files for merging')
      return
    }

    setIsProcessing(true)
    setProcessProgress(0)

    try {
      let parameters: Record<string, any> = {}
      
      switch (operation) {
        case 'trim':
          parameters = { start: trimStart, end: trimEnd }
          break
        case 'convert':
          parameters = { format: outputFormat }
          break
        case 'resize':
          parameters = { resolution }
          break
        case 'rotate':
          parameters = { degrees: rotation }
          break
        case 'watermark':
          parameters = { text: watermarkText, position: 'bottom-right' }
          break
        case 'gif':
          parameters = { start: gifStart, duration: gifDuration }
          break
        case 'split':
          parameters = { segments: 2 }
          break
        case 'merge':
          parameters = { files: selectedFiles.map(f => f.name) }
          break
      }

      const job = await videoApi.manipulateVideo({
        videoFile: selectedFiles[0],
        operation,
        parameters,
      })

      addJob({
        type: 'manipulate',
        status: 'processing',
        progress: 0,
        input: selectedFiles.map(f => f.name).join(', '),
      })

      // Simulate progress
      const progressInterval = setInterval(() => {
        setProcessProgress(prev => {
          if (prev >= 100) {
            clearInterval(progressInterval)
            setIsProcessing(false)
            return 100
          }
          return prev + Math.random() * 10
        })
      }, 1000)

    } catch (error) {
      console.error('Error processing video:', error)
      alert('Failed to process video. Please try again.')
      setIsProcessing(false)
    }
  }

  const renderOperationSettings = () => {
    switch (operation) {
      case 'trim':
        return (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Start Time (HH:MM:SS)</label>
              <Input
                placeholder="00:00:30"
                value={trimStart}
                onChange={(e) => setTrimStart(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">End Time (HH:MM:SS)</label>
              <Input
                placeholder="00:02:30"
                value={trimEnd}
                onChange={(e) => setTrimEnd(e.target.value)}
              />
            </div>
          </div>
        )
      
      case 'convert':
        return (
          <div className="space-y-2">
            <label className="text-sm font-medium">Output Format</label>
            <Select value={outputFormat} onValueChange={setOutputFormat}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mp4">MP4</SelectItem>
                <SelectItem value="avi">AVI</SelectItem>
                <SelectItem value="mov">MOV</SelectItem>
                <SelectItem value="mkv">MKV</SelectItem>
                <SelectItem value="webm">WebM</SelectItem>
                <SelectItem value="flv">FLV</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )
      
      case 'resize':
        return (
          <div className="space-y-2">
            <label className="text-sm font-medium">Resolution</label>
            <Select value={resolution} onValueChange={setResolution}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3840x2160">4K (3840x2160)</SelectItem>
                <SelectItem value="1920x1080">Full HD (1920x1080)</SelectItem>
                <SelectItem value="1280x720">HD (1280x720)</SelectItem>
                <SelectItem value="854x480">SD (854x480)</SelectItem>
                <SelectItem value="640x360">360p (640x360)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )
      
      case 'rotate':
        return (
          <div className="space-y-2">
            <label className="text-sm font-medium">Rotation</label>
            <Select value={rotation} onValueChange={setRotation}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="90">90° Clockwise</SelectItem>
                <SelectItem value="180">180°</SelectItem>
                <SelectItem value="270">270° Clockwise</SelectItem>
                <SelectItem value="-90">90° Counter-clockwise</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )
      
      case 'watermark':
        return (
          <div className="space-y-2">
            <label className="text-sm font-medium">Watermark Text</label>
            <Input
              placeholder="© Your Name 2024"
              value={watermarkText}
              onChange={(e) => setWatermarkText(e.target.value)}
            />
          </div>
        )
      
      case 'gif':
        return (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Start Time (HH:MM:SS)</label>
              <Input
                placeholder="00:00:10"
                value={gifStart}
                onChange={(e) => setGifStart(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Duration (seconds)</label>
              <Input
                placeholder="3"
                value={gifDuration}
                onChange={(e) => setGifDuration(e.target.value)}
              />
            </div>
          </div>
        )
      
      default:
        return null
    }
  }

  const getOperationIcon = (op: string) => {
    switch (op) {
      case 'trim': return <Scissors className="w-4 h-4" />
      case 'rotate': return <RotateCw className="w-4 h-4" />
      case 'resize': return <Crop className="w-4 h-4" />
      case 'merge': return <Merge className="w-4 h-4" />
      case 'convert': return <Video className="w-4 h-4" />
      case 'gif': return <Play className="w-4 h-4" />
      default: return <Settings className="w-4 h-4" />
    }
  }

  return (
    <div className="space-y-6">
      {/* File Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Video className="w-5 h-5" />
            <span>Video Manipulation</span>
          </CardTitle>
          <CardDescription>
            Edit, convert, and manipulate your video files with powerful tools
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* File Upload Area */}
          <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6">
            <div className="text-center">
              <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
              <div className="mt-4">
                <label htmlFor="video-files" className="cursor-pointer">
                  <span className="mt-2 block text-sm font-medium text-foreground">
                    {selectedFiles.length > 0 
                      ? `${selectedFiles.length} file(s) selected` 
                      : 'Click to upload video files'
                    }
                  </span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    Supports MP4, AVI, MOV, MKV, WebM and more
                  </span>
                </label>
                <input
                  id="video-files"
                  type="file"
                  className="hidden"
                  accept="video/*"
                  multiple={operation === 'merge'}
                  onChange={handleFileSelect}
                />
              </div>
            </div>
          </div>

          {/* Selected Files */}
          {selectedFiles.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Selected Files</label>
              <div className="space-y-2">
                {selectedFiles.map((file, index) => (
                  <div key={index} className="flex items-center space-x-2 p-3 bg-muted rounded-lg">
                    <Video className="w-5 h-5 text-primary" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(file.size / (1024 * 1024)).toFixed(2)} MB
                      </p>
                    </div>
                    <Badge variant="secondary">{file.type}</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Operation Selection and Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Operation Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Operation Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Operation</label>
            <Tabs value={operation} onValueChange={(value: any) => setOperation(value)}>
              <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8">
                <TabsTrigger value="trim" className="flex items-center space-x-1">
                  <Scissors className="w-3 h-3" />
                  <span className="hidden sm:inline">Trim</span>
                </TabsTrigger>
                <TabsTrigger value="split" className="flex items-center space-x-1">
                  <Scissors className="w-3 h-3" />
                  <span className="hidden sm:inline">Split</span>
                </TabsTrigger>
                <TabsTrigger value="merge" className="flex items-center space-x-1">
                  <Merge className="w-3 h-3" />
                  <span className="hidden sm:inline">Merge</span>
                </TabsTrigger>
                <TabsTrigger value="convert" className="flex items-center space-x-1">
                  <Video className="w-3 h-3" />
                  <span className="hidden sm:inline">Convert</span>
                </TabsTrigger>
                <TabsTrigger value="resize" className="flex items-center space-x-1">
                  <Crop className="w-3 h-3" />
                  <span className="hidden sm:inline">Resize</span>
                </TabsTrigger>
                <TabsTrigger value="rotate" className="flex items-center space-x-1">
                  <RotateCw className="w-3 h-3" />
                  <span className="hidden sm:inline">Rotate</span>
                </TabsTrigger>
                <TabsTrigger value="watermark" className="flex items-center space-x-1">
                  <Settings className="w-3 h-3" />
                  <span className="hidden sm:inline">Watermark</span>
                </TabsTrigger>
                <TabsTrigger value="gif" className="flex items-center space-x-1">
                  <Play className="w-3 h-3" />
                  <span className="hidden sm:inline">GIF</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Operation-specific Settings */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              {getOperationIcon(operation)}
              <h3 className="text-lg font-medium capitalize">{operation} Settings</h3>
            </div>
            {renderOperationSettings()}
          </div>

          {/* Process Button */}
          <Button
            onClick={handleProcess}
            disabled={isProcessing || selectedFiles.length === 0}
            className="w-full"
          >
            {isProcessing ? 'Processing...' : `${operation.charAt(0).toUpperCase() + operation.slice(1)} Video`}
            {getOperationIcon(operation)}
          </Button>

          {/* Progress */}
          {isProcessing && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Processing video...</span>
                <span>{Math.round(processProgress)}%</span>
              </div>
              <Progress value={processProgress} className="w-full" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Operation Descriptions */}
      <Card>
        <CardHeader>
          <CardTitle>Available Operations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-3">
              <div className="flex items-start space-x-2">
                <Scissors className="w-4 h-4 mt-0.5 text-primary" />
                <div>
                  <p className="font-medium">Trim & Split</p>
                  <p className="text-muted-foreground">Cut specific segments or split videos into parts</p>
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <Merge className="w-4 h-4 mt-0.5 text-primary" />
                <div>
                  <p className="font-medium">Merge</p>
                  <p className="text-muted-foreground">Combine multiple videos into one</p>
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <Video className="w-4 h-4 mt-0.5 text-primary" />
                <div>
                  <p className="font-medium">Convert</p>
                  <p className="text-muted-foreground">Change video format and codec</p>
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <Crop className="w-4 h-4 mt-0.5 text-primary" />
                <div>
                  <p className="font-medium">Resize</p>
                  <p className="text-muted-foreground">Change video resolution and aspect ratio</p>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-start space-x-2">
                <RotateCw className="w-4 h-4 mt-0.5 text-primary" />
                <div>
                  <p className="font-medium">Rotate</p>
                  <p className="text-muted-foreground">Rotate video by 90, 180, or 270 degrees</p>
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <Settings className="w-4 h-4 mt-0.5 text-primary" />
                <div>
                  <p className="font-medium">Watermark</p>
                  <p className="text-muted-foreground">Add text or image watermarks</p>
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <Play className="w-4 h-4 mt-0.5 text-primary" />
                <div>
                  <p className="font-medium">GIF Creation</p>
                  <p className="text-muted-foreground">Convert video segments to animated GIFs</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default ManipulateTab