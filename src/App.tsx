import React, { useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs'
import { Download, Music, FileText, Languages, Video, Settings, Folder } from 'lucide-react'
import Header from './components/Header'
import DownloadTab from './components/DownloadTab'
import ExtractTab from './components/ExtractTab'
import TranscribeTab from './components/TranscribeTab'
import TranslateTab from './components/TranslateTab'
import ManipulateTab from './components/ManipulateTab'
import FilesTab from './components/FilesTab'
import { useAppStore } from './store'

function App() {
  const { theme } = useAppStore()

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }, [theme])

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent mb-4">
              Video Utility Suite
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Your all-in-one solution for video processing, audio extraction, transcription, translation, and manipulation.
              Powerful tools made simple.
            </p>
          </div>

          {/* Main Tabs */}
          <Tabs defaultValue="download" className="w-full">
            <TabsList className="grid w-full grid-cols-6 mb-8">
              <TabsTrigger value="download" className="flex items-center space-x-2">
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Download</span>
              </TabsTrigger>
              <TabsTrigger value="extract" className="flex items-center space-x-2">
                <Music className="w-4 h-4" />
                <span className="hidden sm:inline">Extract</span>
              </TabsTrigger>
              <TabsTrigger value="transcribe" className="flex items-center space-x-2">
                <FileText className="w-4 h-4" />
                <span className="hidden sm:inline">Transcribe</span>
              </TabsTrigger>
              <TabsTrigger value="translate" className="flex items-center space-x-2">
                <Languages className="w-4 h-4" />
                <span className="hidden sm:inline">Translate</span>
              </TabsTrigger>
              <TabsTrigger value="manipulate" className="flex items-center space-x-2">
                <Video className="w-4 h-4" />
                <span className="hidden sm:inline">Edit</span>
              </TabsTrigger>
              <TabsTrigger value="files" className="flex items-center space-x-2">
                <Folder className="w-4 h-4" />
                <span className="hidden sm:inline">Files</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="download" className="space-y-6">
              <DownloadTab />
            </TabsContent>

            <TabsContent value="extract" className="space-y-6">
              <ExtractTab />
            </TabsContent>

            <TabsContent value="transcribe" className="space-y-6">
              <TranscribeTab />
            </TabsContent>

            <TabsContent value="translate" className="space-y-6">
              <TranslateTab />
            </TabsContent>

            <TabsContent value="manipulate" className="space-y-6">
              <ManipulateTab />
            </TabsContent>

            <TabsContent value="files" className="space-y-6">
              <FilesTab />
            </TabsContent>
          </Tabs>

          {/* Features Overview */}
          <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="p-6 rounded-lg border bg-card text-card-foreground">
              <div className="flex items-center space-x-3 mb-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Download className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold">Video Download</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Download videos from YouTube, Vimeo, and 1000+ other platforms in various formats and qualities.
              </p>
            </div>

            <div className="p-6 rounded-lg border bg-card text-card-foreground">
              <div className="flex items-center space-x-3 mb-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Music className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold">Audio Extraction</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Extract high-quality audio from videos in multiple formats including MP3, WAV, FLAC, and more.
              </p>
            </div>

            <div className="p-6 rounded-lg border bg-card text-card-foreground">
              <div className="flex items-center space-x-3 mb-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold">Transcription</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Convert speech to text with AI-powered transcription supporting 50+ languages and multiple formats.
              </p>
            </div>

            <div className="p-6 rounded-lg border bg-card text-card-foreground">
              <div className="flex items-center space-x-3 mb-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Languages className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold">Translation</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Translate text between 100+ languages with support for files and real-time translation.
              </p>
            </div>

            <div className="p-6 rounded-lg border bg-card text-card-foreground">
              <div className="flex items-center space-x-3 mb-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Video className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold">Video Editing</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Trim, merge, convert, resize, and manipulate videos with professional-grade tools.
              </p>
            </div>

            <div className="p-6 rounded-lg border bg-card text-card-foreground">
              <div className="flex items-center space-x-3 mb-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Settings className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold">Batch Processing</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Process multiple files simultaneously with queue management and progress tracking.
              </p>
            </div>
          </div>

          {/* Footer */}
          <footer className="mt-16 pt-8 border-t text-center text-sm text-muted-foreground">
            <p>
              Built with React, TypeScript, and modern web technologies. 
              <span className="mx-2">•</span>
              Open source and privacy-focused.
            </p>
          </footer>
        </div>
      </main>
    </div>
  )
}

export default App