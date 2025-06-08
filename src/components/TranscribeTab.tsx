import React, { useState } from 'react'
import { FileText, Upload, Download, Languages, Clock, Copy } from 'lucide-react'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Badge } from './ui/badge'
import { Progress } from './ui/progress'
import { Textarea } from './ui/textarea'
import { videoApi } from '@/services/api'
import { useAppStore } from '@/store'

const TranscribeTab: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [language, setLanguage] = useState('auto')
  const [outputFormat, setOutputFormat] = useState<'txt' | 'srt' | 'vtt' | 'json'>('txt')
  const [includeTimestamps, setIncludeTimestamps] = useState(true)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [transcribeProgress, setTranscribeProgress] = useState(0)
  const [transcriptionResult, setTranscriptionResult] = useState('')
  
  const { addJob } = useAppStore()

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

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedFile(file)
    }
  }

  const handleTranscribe = async () => {
    if (!selectedFile) {
      alert('Please select an audio file')
      return
    }

    setIsTranscribing(true)
    setTranscribeProgress(0)
    setTranscriptionResult('')

    try {
      const job = await videoApi.transcribeAudio({
        audioFile: selectedFile,
        language: language === 'auto' ? undefined : language,
        includeTimestamps,
        outputFormat,
      })

      addJob({
        type: 'transcribe',
        status: 'processing',
        progress: 0,
        input: selectedFile.name,
      })

      // Simulate progress and result
      const progressInterval = setInterval(() => {
        setTranscribeProgress(prev => {
          if (prev >= 100) {
            clearInterval(progressInterval)
            setIsTranscribing(false)
            // Simulate transcription result
            setTranscriptionResult(
              outputFormat === 'srt' 
                ? `1\n00:00:00,000 --> 00:00:05,000\nHello, this is a sample transcription.\n\n2\n00:00:05,000 --> 00:00:10,000\nThis demonstrates the transcription feature.`
                : outputFormat === 'vtt'
                ? `WEBVTT\n\n00:00:00.000 --> 00:00:05.000\nHello, this is a sample transcription.\n\n00:00:05.000 --> 00:00:10.000\nThis demonstrates the transcription feature.`
                : outputFormat === 'json'
                ? `{\n  "segments": [\n    {\n      "start": 0.0,\n      "end": 5.0,\n      "text": "Hello, this is a sample transcription."\n    },\n    {\n      "start": 5.0,\n      "end": 10.0,\n      "text": "This demonstrates the transcription feature."\n    }\n  ]\n}`
                : 'Hello, this is a sample transcription. This demonstrates the transcription feature of the Video Utility Suite.'
            )
            return 100
          }
          return prev + Math.random() * 8
        })
      }, 1000)

    } catch (error) {
      console.error('Error transcribing audio:', error)
      alert('Failed to transcribe audio. Please try again.')
      setIsTranscribing(false)
    }
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
          {/* File Upload */}
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
                  accept="audio/*"
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

          {/* Transcription Settings */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Output Format</label>
              <Select value={outputFormat} onValueChange={(value: 'txt' | 'srt' | 'vtt' | 'json') => setOutputFormat(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="txt">Plain Text (.txt)</SelectItem>
                  <SelectItem value="srt">SubRip (.srt)</SelectItem>
                  <SelectItem value="vtt">WebVTT (.vtt)</SelectItem>
                  <SelectItem value="json">JSON (.json)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center space-x-2">
                <Clock className="w-4 h-4" />
                <span>Timestamps</span>
              </label>
              <Select 
                value={includeTimestamps ? 'yes' : 'no'} 
                onValueChange={(value) => setIncludeTimestamps(value === 'yes')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">Include timestamps</SelectItem>
                  <SelectItem value="no">Text only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            onClick={handleTranscribe}
            disabled={isTranscribing || !selectedFile}
            className="w-full"
          >
            {isTranscribing ? 'Transcribing...' : 'Start Transcription'}
            <FileText className="w-4 h-4 ml-2" />
          </Button>

          {/* Progress */}
          {isTranscribing && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Processing audio...</span>
                <span>{Math.round(transcribeProgress)}%</span>
              </div>
              <Progress value={transcribeProgress} className="w-full" />
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
          <CardTitle>Transcription Features</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <h4 className="font-medium">Supported Features</h4>
              <div className="space-y-1 text-muted-foreground">
                <p>• Automatic language detection</p>
                <p>• Multiple output formats</p>
                <p>• Timestamp generation</p>
                <p>• High accuracy speech recognition</p>
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Output Formats</h4>
              <div className="space-y-1 text-muted-foreground">
                <p>• <strong>TXT:</strong> Plain text transcription</p>
                <p>• <strong>SRT:</strong> Subtitle format for videos</p>
                <p>• <strong>VTT:</strong> Web video text tracks</p>
                <p>• <strong>JSON:</strong> Structured data with metadata</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default TranscribeTab