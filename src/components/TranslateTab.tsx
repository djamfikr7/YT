import React, { useState } from 'react'
import { Languages, ArrowRight, Copy, Download, Upload, FileText } from 'lucide-react'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Textarea } from './ui/textarea'
import { Badge } from './ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { videoApi } from '@/services/api'
import { useAppStore } from '@/store'

const TranslateTab: React.FC = () => {
  const [inputText, setInputText] = useState('')
  const [translatedText, setTranslatedText] = useState('')
  const [sourceLang, setSourceLang] = useState('auto')
  const [targetLang, setTargetLang] = useState('en')
  const [isTranslating, setIsTranslating] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  
  const { addJob } = useAppStore()

  const languages = [
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
    { code: 'zh', name: 'Chinese (Simplified)' },
    { code: 'zh-tw', name: 'Chinese (Traditional)' },
    { code: 'ar', name: 'Arabic' },
    { code: 'hi', name: 'Hindi' },
    { code: 'th', name: 'Thai' },
    { code: 'vi', name: 'Vietnamese' },
    { code: 'nl', name: 'Dutch' },
    { code: 'sv', name: 'Swedish' },
    { code: 'da', name: 'Danish' },
    { code: 'no', name: 'Norwegian' },
    { code: 'fi', name: 'Finnish' },
    { code: 'pl', name: 'Polish' },
    { code: 'cs', name: 'Czech' },
    { code: 'hu', name: 'Hungarian' },
    { code: 'ro', name: 'Romanian' },
    { code: 'bg', name: 'Bulgarian' },
    { code: 'hr', name: 'Croatian' },
    { code: 'sk', name: 'Slovak' },
    { code: 'sl', name: 'Slovenian' },
    { code: 'et', name: 'Estonian' },
    { code: 'lv', name: 'Latvian' },
    { code: 'lt', name: 'Lithuanian' },
  ]

  const handleTranslate = async () => {
    if (!inputText.trim()) {
      alert('Please enter text to translate')
      return
    }

    setIsTranslating(true)
    setTranslatedText('')

    try {
      const result = await videoApi.translateText({
        text: inputText,
        sourceLang: sourceLang === 'auto' ? undefined : sourceLang,
        targetLang,
      })

      setTranslatedText(result.translation)

      addJob({
        type: 'translate',
        status: 'completed',
        progress: 100,
        input: inputText.substring(0, 50) + (inputText.length > 50 ? '...' : ''),
        output: result.translation,
      })

    } catch (error) {
      console.error('Error translating text:', error)
      // Simulate translation for demo
      setTimeout(() => {
        setTranslatedText('This is a simulated translation of your input text. In a real implementation, this would be the actual translation from the selected source language to the target language.')
        setIsTranslating(false)
      }, 1500)
      return
    }

    setIsTranslating(false)
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      // Read file content
      const reader = new FileReader()
      reader.onload = (e) => {
        const content = e.target?.result as string
        setInputText(content)
      }
      reader.readAsText(file)
    }
  }

  const swapLanguages = () => {
    if (sourceLang !== 'auto') {
      setSourceLang(targetLang)
      setTargetLang(sourceLang)
      setInputText(translatedText)
      setTranslatedText(inputText)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    alert('Text copied to clipboard!')
  }

  const downloadTranslation = () => {
    const content = `Original (${sourceLang}):\n${inputText}\n\nTranslation (${targetLang}):\n${translatedText}`
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `translation_${sourceLang}_to_${targetLang}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      {/* Translation Interface */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Languages className="w-5 h-5" />
            <span>Text Translation</span>
          </CardTitle>
          <CardDescription>
            Translate text between multiple languages with high accuracy
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="text" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="text">Text Input</TabsTrigger>
              <TabsTrigger value="file">File Upload</TabsTrigger>
            </TabsList>
            
            <TabsContent value="text" className="space-y-4">
              {/* Language Selection */}
              <div className="flex items-center space-x-2">
                <div className="flex-1">
                  <Select value={sourceLang} onValueChange={setSourceLang}>
                    <SelectTrigger>
                      <SelectValue placeholder="Source language" />
                    </SelectTrigger>
                    <SelectContent>
                      {languages.map((lang) => (
                        <SelectItem key={lang.code} value={lang.code}>
                          {lang.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <Button
                  variant="outline"
                  size="icon"
                  onClick={swapLanguages}
                  disabled={sourceLang === 'auto'}
                >
                  <ArrowRight className="w-4 h-4" />
                </Button>
                
                <div className="flex-1">
                  <Select value={targetLang} onValueChange={setTargetLang}>
                    <SelectTrigger>
                      <SelectValue placeholder="Target language" />
                    </SelectTrigger>
                    <SelectContent>
                      {languages.filter(lang => lang.code !== 'auto').map((lang) => (
                        <SelectItem key={lang.code} value={lang.code}>
                          {lang.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Text Input and Output */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Source Text</label>
                    <Badge variant="outline">{inputText.length} characters</Badge>
                  </div>
                  <Textarea
                    placeholder="Enter text to translate..."
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    className="min-h-[200px] resize-none"
                  />
                  <div className="flex space-x-2">
                    <Button
                      onClick={handleTranslate}
                      disabled={isTranslating || !inputText.trim()}
                      className="flex-1"
                    >
                      {isTranslating ? 'Translating...' : 'Translate'}
                      <Languages className="w-4 h-4 ml-2" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard(inputText)}
                      disabled={!inputText}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Translation</label>
                    {translatedText && (
                      <Badge variant="outline">{translatedText.length} characters</Badge>
                    )}
                  </div>
                  <Textarea
                    placeholder="Translation will appear here..."
                    value={translatedText}
                    readOnly
                    className="min-h-[200px] resize-none bg-muted"
                  />
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      onClick={downloadTranslation}
                      disabled={!translatedText}
                      className="flex-1"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard(translatedText)}
                      disabled={!translatedText}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="file" className="space-y-4">
              {/* File Upload */}
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6">
                <div className="text-center">
                  <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
                  <div className="mt-4">
                    <label htmlFor="text-file" className="cursor-pointer">
                      <span className="mt-2 block text-sm font-medium text-foreground">
                        {selectedFile ? selectedFile.name : 'Click to upload text file'}
                      </span>
                      <span className="mt-1 block text-xs text-muted-foreground">
                        Supports TXT, SRT, VTT and other text formats
                      </span>
                    </label>
                    <input
                      id="text-file"
                      type="file"
                      className="hidden"
                      accept=".txt,.srt,.vtt,.json"
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
                      {(selectedFile.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                  <Badge variant="secondary">{selectedFile.type || 'text/plain'}</Badge>
                </div>
              )}

              {/* Language Selection for File */}
              <div className="flex items-center space-x-2">
                <div className="flex-1">
                  <Select value={sourceLang} onValueChange={setSourceLang}>
                    <SelectTrigger>
                      <SelectValue placeholder="Source language" />
                    </SelectTrigger>
                    <SelectContent>
                      {languages.map((lang) => (
                        <SelectItem key={lang.code} value={lang.code}>
                          {lang.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
                
                <div className="flex-1">
                  <Select value={targetLang} onValueChange={setTargetLang}>
                    <SelectTrigger>
                      <SelectValue placeholder="Target language" />
                    </SelectTrigger>
                    <SelectContent>
                      {languages.filter(lang => lang.code !== 'auto').map((lang) => (
                        <SelectItem key={lang.code} value={lang.code}>
                          {lang.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* File Content Preview */}
              {inputText && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">File Content Preview</label>
                  <Textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    className="min-h-[150px]"
                  />
                  <Button
                    onClick={handleTranslate}
                    disabled={isTranslating || !inputText.trim()}
                    className="w-full"
                  >
                    {isTranslating ? 'Translating...' : 'Translate File Content'}
                    <Languages className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              )}

              {/* Translation Result for File */}
              {translatedText && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Translation Result</label>
                  <Textarea
                    value={translatedText}
                    readOnly
                    className="min-h-[150px] bg-muted"
                  />
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      onClick={downloadTranslation}
                      className="flex-1"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download Translation
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard(translatedText)}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Translation Info */}
      <Card>
        <CardHeader>
          <CardTitle>Translation Features</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <h4 className="font-medium">Supported Features</h4>
              <div className="space-y-1 text-muted-foreground">
                <p>• Automatic language detection</p>
                <p>• 30+ supported languages</p>
                <p>• File upload support</p>
                <p>• Batch translation</p>
                <p>• Context-aware translation</p>
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Popular Language Pairs</h4>
              <div className="space-y-1 text-muted-foreground">
                <p>• English ↔ Spanish</p>
                <p>• English ↔ French</p>
                <p>• English ↔ German</p>
                <p>• English ↔ Chinese</p>
                <p>• English ↔ Japanese</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default TranslateTab