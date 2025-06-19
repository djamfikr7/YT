import React from 'react'
import { Moon, Sun, Settings, Download, FileText, Languages, Video, Music } from 'lucide-react'
import { Button } from './ui/button'
import { useAppStore } from '@/store'

const Header: React.FC = () => {
  const { theme, setTheme } = useAppStore()

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light')
  }

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo and Title */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-10 h-10 bg-primary rounded-lg">
              <Video className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Video Utility Suite</h1>
              <p className="text-sm text-muted-foreground">Download, Extract, Transcribe & More</p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="hidden md:flex items-center space-x-2">
            <Button variant="ghost" size="sm" className="flex items-center space-x-2">
              <Download className="w-4 h-4" />
              <span>Download</span>
            </Button>
            <Button variant="ghost" size="sm" className="flex items-center space-x-2">
              <Music className="w-4 h-4" />
              <span>Extract</span>
            </Button>
            <Button variant="ghost" size="sm" className="flex items-center space-x-2">
              <FileText className="w-4 h-4" />
              <span>Transcribe</span>
            </Button>
            <Button variant="ghost" size="sm" className="flex items-center space-x-2">
              <Languages className="w-4 h-4" />
              <span>Translate</span>
            </Button>
          </div>

          {/* Theme Toggle and Settings */}
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="w-9 h-9"
            >
              {theme === 'light' ? (
                <Moon className="w-4 h-4" />
              ) : (
                <Sun className="w-4 h-4" />
              )}
            </Button>
            <Button variant="ghost" size="icon" className="w-9 h-9">
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header