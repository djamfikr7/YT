import React, { useState, useEffect } from 'react'
import { FileText, Upload, Download, Languages, Clock, Copy, Folder, Music, Video, Info, Cpu, Zap } from 'lucide-react'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Badge } from './ui/badge'
import { Progress } from './ui/progress'
import { Textarea } from './ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Checkbox } from './ui/checkbox'
import { Label } from './ui/label'
import { videoApi } from '@/services/api'
import { useAppStore } from '@/store'

const TranscribeTab: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [selectedExistingFile, setSelectedExistingFile] = useState<string>('')
  const [inputMethod, setInputMethod] = useState<'upload' | 'existing'>('existing')
  const [language, setLanguage] = useState('auto')
  const [outputFormat, setOutputFormat] = useState<'txt' | 'srt' | 'vtt' | 'json'>('txt')
  const [includeTimestamps, setIncludeTimestamps] = useState(true)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [transcribeProgress, setTranscribeProgress] = useState(0)
  const [transcriptionResult, setTranscriptionResult] = useState('')
  const [selectedModel, setSelectedModel] = useState('base')
  const [removeTimestamps, setRemoveTimestamps] = useState(false)
  const [outputFormats, setOutputFormats] = useState<string[]>(['txt'])
  const [temperature, setTemperature] = useState(0.0)
  const [beamSize, setBeamSize] = useState(5)
  const [detectedLanguage, setDetectedLanguage] = useState<string | null>(null)
  const [selectedFiles, setSelectedFiles] = useState<string[]>([])
  const [batchMode, setBatchMode] = useState(false)
  const [currentJobId, setCurrentJobId] = useState<string | string[] | null>(null)
  const [progressInterval, setProgressInterval] = useState<NodeJS.Timeout | null>(null)

  const { addJob, files, refreshFiles } = useAppStore()

  useEffect(() => {
    refreshFiles()
  }, [])

  const whisperModels = [
    {
      id: 'tiny',
      name: 'Tiny',
      size: '39 MB',
      speed: '~32x realtime',
      accuracy: 'Lowest',
      description: 'Fastest processing, lowest accuracy. Good for quick drafts.',
      color: 'bg-green-100 text-green-800'
    },
    {
      id: 'base',
      name: 'Base',
      size: '74 MB',
      speed: '~16x realtime',
      accuracy: 'Good',
      description: 'Balanced speed and accuracy. Recommended for most use cases.',
      color: 'bg-blue-100 text-blue-800'
    },
    {
      id: 'small',
      name: 'Small',
      size: '244 MB',
      speed: '~6x realtime',
      accuracy: 'Better',
      description: 'Good balance of speed and accuracy for professional use.',
      color: 'bg-yellow-100 text-yellow-800'
    },
    {
      id: 'medium',
      name: 'Medium',
      size: '769 MB',
      speed: '~2x realtime',
      accuracy: 'High',
      description: 'High accuracy with slower processing. Good for important content.',
      color: 'bg-orange-100 text-orange-800'
    },
    {
      id: 'large',
      name: 'Large',
      size: '1550 MB',
      speed: '~1x realtime',
      accuracy: 'Highest',
      description: 'Maximum accuracy with slowest processing. Best for critical transcriptions.',
      color: 'bg-red-100 text-red-800'
    }
  ]

  const supportedLanguages = [
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
    { code: 'hi', name: 'Hindi' },
  ]

  const availableFormats = [
    { id: 'txt', name: 'Plain Text (.txt)', description: 'Simple text transcription' },
    { id: 'srt', name: 'SubRip (.srt)', description: 'Subtitle format for videos' },
    { id: 'vtt', name: 'WebVTT (.vtt)', description: 'Web video text tracks' },
    { id: 'json', name: 'JSON (.json)', description: 'Structured data with metadata' }
  ]

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedFile(file)
    }
  }

  const handleTranscribe = async () => {
    if (inputMethod === 'upload' && !selectedFile) {
      alert('Please select an audio file to upload')
      return
    }
    if (inputMethod === 'existing' && !batchMode && !selectedExistingFile) {
      alert('Please select an existing file')
      return
    }
    if (inputMethod === 'existing' && batchMode && selectedFiles.length === 0) {
      alert('Please select at least one file for batch processing')
      return
    }
    if (outputFormats.length === 0) {
      alert('Please select at least one output format')
      return
    }

    setIsTranscribing(true)
    setTranscribeProgress(0)
    setTranscriptionResult('')

    try {
      let job
      if (inputMethod === 'upload') {
        job = await videoApi.transcribeAudio({
          audioFile: selectedFile!,
          language: language === 'auto' ? undefined : language,
          includeTimestamps,
          outputFormats,
          model: selectedModel,
          removeTimestamps,
          temperature,
          beamSize,
        })
      } else if (batchMode) {
        // Batch processing
        const response = await fetch('/api/transcribe/batch', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            filenames: selectedFiles,
            options: {
              language: language === 'auto' ? undefined : language,
              outputFormats,
              model: selectedModel,
              removeTimestamps,
              temperature,
              beamSize,
            },
          }),
        })
        job = await response.json()
      } else {
        // Single file processing
        const response = await fetch('/api/transcribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            filename: selectedExistingFile,
            language: language === 'auto' ? undefined : language,
            outputFormats,
            model: selectedModel,
            removeTimestamps,
            temperature,
            beamSize,
          }),
        })
        job = await response.json()
      }

      if (batchMode) {
        // Add multiple jobs for batch processing
        selectedFiles.forEach(filename => {
          addJob({
            type: 'transcribe',
            status: 'processing',
            progress: 0,
            input: filename,
          })
        })
      } else {
        addJob({
          type: 'transcribe',
          status: 'processing',
          progress: 0,
          input: inputMethod === 'upload' ? selectedFile!.name : selectedExistingFile,
        })
      }

      // Store job ID for cancellation
      const jobIds = batchMode ? job.jobIds : job.jobId
      setCurrentJobId(jobIds)

      // Poll for job status and get real transcription results
      const pollJobStatus = async (jobId: string | string[]) => {
        try {
          if (Array.isArray(jobId)) {
            // Batch processing - poll all jobs
            let completedJobs = 0
            let totalProgress = 0
            let allResults: string[] = []

            for (const id of jobId) {
              const response = await fetch(`/api/job/${id}/status`)

              if (!response.ok) {
                console.error(`Failed to get status for job ${id}: ${response.status}`)
                continue
              }

              const jobStatus = await response.json()

              if (jobStatus.status === 'completed' && jobStatus.result) {
                completedJobs++
                try {
                  const transcriptionResponse = await fetch(jobStatus.result.downloadUrl)
                  const transcriptionText = await transcriptionResponse.text()
                  allResults.push(`=== ${jobStatus.result.filename} ===\n${transcriptionText}`)
                } catch (fetchError) {
                  console.error('Error fetching transcription result:', fetchError)
                  allResults.push(`=== ${jobStatus.result.filename} ===\nError: Could not fetch transcription result`)
                }
              } else if (jobStatus.status === 'error') {
                completedJobs++
                allResults.push(`=== ${id} ===\nError: ${jobStatus.error}`)
              } else if (jobStatus.status === 'processing') {
                totalProgress += jobStatus.progress || 0
              }
            }

            const avgProgress = totalProgress / jobId.length
            setTranscribeProgress(avgProgress)

            if (completedJobs === jobId.length) {
              // All jobs completed
              setTranscriptionResult(allResults.join('\n\n'))
              setTranscribeProgress(100)
              setIsTranscribing(false)
              if (progressInterval) {
                clearInterval(progressInterval)
                setProgressInterval(null)
              }
              setCurrentJobId(null)
            }
          } else {
            // Single job processing
            const response = await fetch(`/api/job/${jobId}/status`)

            if (!response.ok) {
              console.error(`Failed to get job status: ${response.status}`)
              return
            }

            const jobStatus = await response.json()

            if (jobStatus.status === 'completed' && jobStatus.result) {
              // Job completed successfully - fetch the transcription file
              try {
                const transcriptionResponse = await fetch(jobStatus.result.downloadUrl)
                const transcriptionText = await transcriptionResponse.text()

                setTranscriptionResult(transcriptionText)
                setTranscribeProgress(100)
                setIsTranscribing(false)
                if (progressInterval) {
                  clearInterval(progressInterval)
                  setProgressInterval(null)
                }
                setCurrentJobId(null)

                // Set detected language if available
                if (jobStatus.result.detectedLanguage) {
                  setDetectedLanguage(jobStatus.result.detectedLanguage)
                }
              } catch (fetchError) {
                console.error('Error fetching transcription result:', fetchError)
                setTranscriptionResult('Error: Could not fetch transcription result')
                setIsTranscribing(false)
                if (progressInterval) {
                  clearInterval(progressInterval)
                  setProgressInterval(null)
                }
                setCurrentJobId(null)
              }
            } else if (jobStatus.status === 'error') {
              // Job failed
              console.error('Transcription job failed:', jobStatus.error)
              alert(`Transcription failed: ${jobStatus.error}`)
              setIsTranscribing(false)
              if (progressInterval) {
                clearInterval(progressInterval)
                setProgressInterval(null)
              }
              setCurrentJobId(null)
            } else if (jobStatus.status === 'processing') {
              // Update progress
              setTranscribeProgress(jobStatus.progress || 0)
            }
          }
        } catch (error) {
          console.error('Error polling job status:', error)
          // If there are repeated errors, stop polling to prevent spam
          if (error.message.includes('Failed to fetch') || error.message.includes('JSON')) {
            console.warn('Stopping job polling due to repeated errors')
            if (progressInterval) {
              clearInterval(progressInterval)
              setProgressInterval(null)
            }
            setIsTranscribing(false)
            setCurrentJobId(null)
            alert('Lost connection to server. Please check if the transcription completed in the Files tab.')
          }
        }
      }

      // Start polling for job status
      const interval = setInterval(() => {
        pollJobStatus(jobIds)
      }, 2000) // Poll every 2 seconds

      setProgressInterval(interval)

    } catch (error) {
      console.error('Error transcribing audio:', error)
      alert('Failed to transcribe audio. Please try again.')
      setIsTranscribing(false)
    }
  }

  const cancelTranscription = async () => {
    if (progressInterval) {
      clearInterval(progressInterval)
      setProgressInterval(null)
    }

    if (currentJobId) {
      try {
        // Cancel the job(s) on the server
        if (Array.isArray(currentJobId)) {
          // Cancel batch jobs
          for (const jobId of currentJobId) {
            await fetch(`/api/job/${jobId}/cancel`, { method: 'POST' })
          }
        } else {
          // Cancel single job
          await fetch(`/api/job/${currentJobId}/cancel`, { method: 'POST' })
        }
      } catch (error) {
        console.error('Error canceling job:', error)
      }
    }

    // Reset UI state
    setIsTranscribing(false)
    setTranscribeProgress(0)
    setCurrentJobId(null)
    alert('Transcription canceled')
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(transcriptionResult)
    alert('Transcription copied to clipboard!')
  }

  const downloadTranscription = () => {
    const blob = new Blob([transcriptionResult], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `transcription.${outputFormat}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      {/* File Upload and Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="w-5 h-5" />
            <span>Audio Transcription</span>
          </CardTitle>
          <CardDescription>
            Convert speech to text with high accuracy and multiple output formats
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* File Input Method Selection */}
          <Tabs value={inputMethod} onValueChange={(value: 'upload' | 'existing') => setInputMethod(value)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="existing" className="flex items-center space-x-2">
                <Folder className="w-4 h-4" />
                <span>Existing Files</span>
              </TabsTrigger>
              <TabsTrigger value="upload" className="flex items-center space-x-2">
                <Upload className="w-4 h-4" />
                <span>Upload New</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="existing" className="space-y-4">
              <div className="space-y-4">
                {/* Batch Mode Toggle */}
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="batch-mode"
                    checked={batchMode}
                    onCheckedChange={setBatchMode}
                  />
                  <Label htmlFor="batch-mode" className="text-sm">
                    Batch Processing (Select multiple files)
                  </Label>
                </div>

                {!batchMode ? (
                  /* Single File Selection */
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Select Audio/Video File</label>
                    <Select value={selectedExistingFile} onValueChange={setSelectedExistingFile}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a file to transcribe" />
                      </SelectTrigger>
                      <SelectContent>
                        {files.filter(file =>
                          file.name.match(/\.(mp3|wav|flac|m4a|ogg|mp4|avi|mov|mkv)$/i)
                        ).map((file) => (
                          <SelectItem key={file.name} value={file.name}>
                            <div className="flex items-center space-x-2">
                              {file.name.match(/\.(mp4|avi|mov|mkv)$/i) ?
                                <Video className="w-4 h-4" /> :
                                <Music className="w-4 h-4" />
                              }
                              <span>{file.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  /* Batch File Selection */
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Select Multiple Files for Batch Processing</label>
                    <div className="max-h-48 overflow-y-auto border rounded-lg p-2 space-y-2">
                      {files.filter(file =>
                        file.name.match(/\.(mp3|wav|flac|m4a|ogg|mp4|avi|mov|mkv)$/i)
                      ).map((file) => (
                        <div key={file.name} className="flex items-center space-x-2 p-2 hover:bg-muted rounded">
                          <Checkbox
                            id={`file-${file.name}`}
                            checked={selectedFiles.includes(file.name)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedFiles([...selectedFiles, file.name])
                              } else {
                                setSelectedFiles(selectedFiles.filter(f => f !== file.name))
                              }
                            }}
                          />
                          <Label htmlFor={`file-${file.name}`} className="flex items-center space-x-2 flex-1 cursor-pointer">
                            {file.name.match(/\.(mp4|avi|mov|mkv)$/i) ?
                              <Video className="w-4 h-4" /> :
                              <Music className="w-4 h-4" />
                            }
                            <span className="text-sm">{file.name}</span>
                            <Badge variant="outline" className="ml-auto">
                              {(file.size / (1024 * 1024)).toFixed(1)} MB
                            </Badge>
                          </Label>
                        </div>
                      ))}
                    </div>
                    {selectedFiles.length > 0 && (
                      <p className="text-sm text-muted-foreground">
                        {selectedFiles.length} file(s) selected for batch processing
                      </p>
                    )}
                  </div>
                )}

                {files.filter(file =>
                  file.name.match(/\.(mp3|wav|flac|m4a|ogg|mp4|avi|mov|mkv)$/i)
                ).length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No audio or video files found. Download or upload files first.
                  </p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="upload" className="space-y-4">
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6">
                <div className="text-center">
                  <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
                  <div className="mt-4">
                    <label htmlFor="audio-file" className="cursor-pointer">
                      <span className="mt-2 block text-sm font-medium text-foreground">
                        {selectedFile ? selectedFile.name : 'Click to upload audio file'}
                      </span>
                      <span className="mt-1 block text-xs text-muted-foreground">
                        Supports MP3, WAV, FLAC, M4A, OGG and more
                      </span>
                    </label>
                    <input
                      id="audio-file"
                      type="file"
                      className="hidden"
                      accept="audio/*,video/*"
                      onChange={handleFileSelect}
                    />
                  </div>
                </div>
              </div>

              {selectedFile && (
                <div className="flex items-center space-x-2 p-3 bg-muted rounded-lg">
                  <FileText className="w-5 h-5 text-primary" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{selectedFile.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                  <Badge variant="secondary">{selectedFile.type}</Badge>
                </div>
              )}
            </TabsContent>
          </Tabs>

          {/* Model Selection */}
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center space-x-2">
                <Cpu className="w-4 h-4" />
                <span>Whisper Model</span>
              </label>
              <Select value={selectedModel} onValueChange={setSelectedModel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {whisperModels.map((model) => (
                    <SelectItem key={model.id} value={model.id}>
                      <div className="flex items-center space-x-2">
                        <Badge className={model.color} variant="secondary">
                          {model.name}
                        </Badge>
                        <span>{model.size}</span>
                        <span className="text-muted-foreground">•</span>
                        <span className="text-muted-foreground">{model.speed}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedModel && (
                <div className="p-3 bg-muted rounded-lg">
                  <div className="flex items-start space-x-2">
                    <Info className="w-4 h-4 mt-0.5 text-muted-foreground" />
                    <div className="text-sm">
                      <p className="font-medium">
                        {whisperModels.find(m => m.id === selectedModel)?.name} Model
                      </p>
                      <p className="text-muted-foreground">
                        {whisperModels.find(m => m.id === selectedModel)?.description}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Basic Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center space-x-2">
                <Languages className="w-4 h-4" />
                <span>Language</span>
              </label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {supportedLanguages.map((lang) => (
                    <SelectItem key={lang.code} value={lang.code}>
                      {lang.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {detectedLanguage && (
                <p className="text-xs text-muted-foreground">
                  Detected: {supportedLanguages.find(l => l.code === detectedLanguage)?.name || detectedLanguage}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center space-x-2">
                <Clock className="w-4 h-4" />
                <span>Timestamp Options</span>
              </label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="remove-timestamps"
                    checked={removeTimestamps}
                    onCheckedChange={setRemoveTimestamps}
                  />
                  <Label htmlFor="remove-timestamps" className="text-sm">
                    Remove timestamps from output
                  </Label>
                </div>
              </div>
            </div>
          </div>

          {/* Output Formats */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Output Formats (Select Multiple)</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {availableFormats.map((format) => (
                <div key={format.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={format.id}
                    checked={outputFormats.includes(format.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setOutputFormats([...outputFormats, format.id])
                      } else {
                        setOutputFormats(outputFormats.filter(f => f !== format.id))
                      }
                    }}
                  />
                  <Label htmlFor={format.id} className="text-sm">
                    {format.name}
                  </Label>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Select one or more output formats. Each format will be generated separately.
            </p>
          </div>

          {/* Advanced Quality Settings */}
          <div className="space-y-4 border-t pt-4">
            <h4 className="text-sm font-medium flex items-center space-x-2">
              <Zap className="w-4 h-4" />
              <span>Advanced Quality Settings</span>
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="temperature" className="text-sm">
                  Temperature (Creativity): {temperature}
                </Label>
                <input
                  id="temperature"
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={temperature}
                  onChange={(e) => setTemperature(parseFloat(e.target.value))}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Lower values (0.0) = more conservative, Higher values (1.0) = more creative
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="beam-size" className="text-sm">
                  Beam Size (Accuracy): {beamSize}
                </Label>
                <input
                  id="beam-size"
                  type="range"
                  min="1"
                  max="10"
                  step="1"
                  value={beamSize}
                  onChange={(e) => setBeamSize(parseInt(e.target.value))}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Higher values = more accurate but slower processing
                </p>
              </div>
            </div>
          </div>

          <div className="flex space-x-2">
            <Button
              onClick={handleTranscribe}
              disabled={
                isTranscribing ||
                (inputMethod === 'upload' && !selectedFile) ||
                (inputMethod === 'existing' && !batchMode && !selectedExistingFile) ||
                (inputMethod === 'existing' && batchMode && selectedFiles.length === 0) ||
                outputFormats.length === 0
              }
              className="flex-1"
            >
              {isTranscribing ?
                (batchMode ? `Transcribing ${selectedFiles.length} files...` : 'Transcribing...') :
                (batchMode ? `Start Batch Transcription (${selectedFiles.length} files)` : 'Start Transcription')
              }
              <FileText className="w-4 h-4 ml-2" />
            </Button>

            {isTranscribing && (
              <Button
                onClick={cancelTranscription}
                variant="destructive"
                className="px-4"
              >
                Cancel
              </Button>
            )}
          </div>

          {/* Progress */}
          {isTranscribing && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>
                  {batchMode ?
                    `Processing ${selectedFiles.length} files...` :
                    'Processing audio...'
                  }
                </span>
                <span>{Math.round(transcribeProgress)}%</span>
              </div>
              <Progress value={transcribeProgress} className="w-full" />
              {batchMode && (
                <p className="text-xs text-muted-foreground">
                  Batch processing may take longer. Files are processed sequentially for optimal performance.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transcription Result */}
      {transcriptionResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Transcription Result</span>
              <div className="flex space-x-2">
                <Button variant="outline" size="sm" onClick={copyToClipboard}>
                  <Copy className="w-4 h-4 mr-2" />
                  Copy
                </Button>
                <Button variant="outline" size="sm" onClick={downloadTranscription}>
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={transcriptionResult}
              readOnly
              className="min-h-[200px] font-mono text-sm"
              placeholder="Transcription will appear here..."
            />
          </CardContent>
        </Card>
      )}

      {/* Features Info */}
      <Card>
        <CardHeader>
          <CardTitle>Advanced Transcription Features</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="space-y-2">
              <h4 className="font-medium flex items-center space-x-2">
                <Cpu className="w-4 h-4" />
                <span>AI Models</span>
              </h4>
              <div className="space-y-1 text-muted-foreground">
                <p>• <strong>Tiny:</strong> 39MB, ~32x realtime</p>
                <p>• <strong>Base:</strong> 74MB, ~16x realtime</p>
                <p>• <strong>Small:</strong> 244MB, ~6x realtime</p>
                <p>• <strong>Medium:</strong> 769MB, ~2x realtime</p>
                <p>• <strong>Large:</strong> 1550MB, ~1x realtime</p>
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium flex items-center space-x-2">
                <Zap className="w-4 h-4" />
                <span>Advanced Features</span>
              </h4>
              <div className="space-y-1 text-muted-foreground">
                <p>• Batch processing multiple files</p>
                <p>• Quality control (temperature, beam size)</p>
                <p>• Smart file naming</p>
                <p>• Language detection with override</p>
                <p>• Timestamp control options</p>
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Output Formats</h4>
              <div className="space-y-1 text-muted-foreground">
                <p>• <strong>TXT:</strong> Plain text transcription</p>
                <p>• <strong>SRT:</strong> Subtitle format for videos</p>
                <p>• <strong>VTT:</strong> Web video text tracks</p>
                <p>• <strong>JSON:</strong> Structured data with metadata</p>
                <p>• Multiple formats simultaneously</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default TranscribeTab