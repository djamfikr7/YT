# 🎬 Video Utility Suite

A comprehensive web-based application for video processing, manipulation, and content creation. This suite provides a unified platform for downloading videos, extracting audio, transcribing content, translating text, and performing various video editing operations.

## ✨ Features

### 🎥 Video Operations
- **Download Videos**: Download videos and playlists from YouTube and other platforms
- **Extract Audio**: Convert videos to audio files in multiple formats (MP3, WAV, FLAC)
- **Video Manipulation**: Trim, split, merge, resize, rotate, add watermarks, create GIFs

### 🎙️ Audio Processing
- **Transcription**: Convert speech to text with timestamp support
- **Multiple Formats**: Export transcriptions as TXT, SRT, VTT, or JSON
- **Language Support**: Auto-detect or specify source language

### 🌍 Translation
- **Text Translation**: Translate text between 30+ languages
- **File Translation**: Translate entire text files
- **Batch Processing**: Handle multiple translation tasks

### 📊 Metadata & Analysis
- **Video Metadata**: Extract detailed information about video files
- **Format Analysis**: Analyze video/audio formats and properties

## 🚀 Quick Start

### Prerequisites

Before running the application, ensure you have the following installed:

1. **Node.js** (v18 or higher)
2. **FFmpeg** - Required for video/audio processing
3. **yt-dlp** - Required for video downloading

#### Installing FFmpeg

**Windows:**
```bash
# Using Chocolatey
choco install ffmpeg

# Or download from https://ffmpeg.org/download.html
```

**macOS:**
```bash
# Using Homebrew
brew install ffmpeg
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install ffmpeg
```

#### Installing yt-dlp

```bash
# Using pip
pip install yt-dlp

# Or using npm (alternative)
npm install -g yt-dlp-wrap
```

### Installation

1. **Clone the repository:**
```bash
git clone <repository-url>
cd video-utility-suite
```

2. **Install dependencies:**
```bash
npm install
```

3. **Start the backend server:**
```bash
npm run server
```

4. **Start the frontend development server:**
```bash
npm run dev
```

5. **Open your browser:**
Navigate to `http://localhost:3001`

## 🛠️ Development

### Project Structure

```
video-utility-suite/
├── src/                    # Frontend source code
│   ├── components/         # React components
│   ├── services/          # API services
│   ├── store/             # State management
│   └── lib/               # Utilities
├── server.cjs             # Backend server
├── uploads/               # Temporary file uploads
├── downloads/             # Downloaded content
├── processed/             # Processed files
└── temp/                  # Temporary processing files
```

### Available Scripts

```bash
# Development
npm run dev          # Start frontend development server
npm run server       # Start backend server
npm run dev:server   # Start backend with auto-reload

# Production
npm run build        # Build frontend for production
npm run preview      # Preview production build

# Utilities
npm run lint         # Run ESLint
```

### API Endpoints

The backend provides the following REST API endpoints:

#### Video Operations
- `POST /api/video/info` - Get video information
- `POST /api/video/download` - Download video
- `POST /api/video/extract-audio` - Extract audio from URL
- `POST /api/video/extract-audio-file` - Extract audio from file
- `POST /api/video/manipulate` - Manipulate video files
- `POST /api/video/metadata` - Extract metadata

#### Audio & Text Processing
- `POST /api/transcribe` - Transcribe audio file
- `POST /api/transcribe-url` - Transcribe from URL
- `POST /api/translate` - Translate text
- `POST /api/translate-file` - Translate file

#### Job Management
- `GET /api/job/:id/status` - Get job status
- `GET /api/download/:filename` - Download result files
- `GET /api/languages` - Get supported languages

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
# Server Configuration
PORT=9000

# OpenAI API (for advanced transcription)
OPENAI_API_KEY=your_openai_api_key_here

# Google Translate API (for translation)
GOOGLE_TRANSLATE_API_KEY=your_google_api_key_here
```

### File Limits

- Maximum file size: 500MB
- Supported video formats: MP4, AVI, MOV, MKV, WebM, FLV
- Supported audio formats: MP3, WAV, FLAC, M4A, OGG
- Supported text formats: TXT, SRT, VTT, JSON

## 🎯 Usage Examples

### Download a Video
1. Go to the "Download" tab
2. Paste a video URL (YouTube, Vimeo, etc.)
3. Click "Get Info" to see available formats
4. Select your preferred quality and format
5. Click "Download Video"

### Extract Audio
1. Go to the "Extract" tab
2. Either paste a URL or upload a video file
3. Choose audio format (MP3, WAV, etc.)
4. Click "Extract Audio"

### Transcribe Audio
1. Go to the "Transcribe" tab
2. Upload an audio file
3. Select language and output format
4. Click "Start Transcription"

### Translate Text
1. Go to the "Translate" tab
2. Enter text or upload a file
3. Select source and target languages
4. Click "Translate"

### Manipulate Videos
1. Go to the "Manipulate" tab
2. Upload video file(s)
3. Choose operation (trim, resize, rotate, etc.)
4. Configure parameters
5. Click process button

## 🔒 Security Considerations

- File uploads are limited to 500MB
- Temporary files are automatically cleaned up
- File type validation prevents malicious uploads
- No sensitive data is stored permanently

## 🐛 Troubleshooting

### Common Issues

**"FFmpeg not found" error:**
- Ensure FFmpeg is installed and in your system PATH
- Restart the server after installing FFmpeg

**"yt-dlp not found" error:**
- Install yt-dlp using pip or npm
- Ensure it's accessible from command line

**Large file processing fails:**
- Check available disk space
- Increase file size limits if needed
- Monitor server memory usage

**Video download fails:**
- Verify the URL is accessible
- Some platforms may block automated downloads
- Check if the video is region-restricted

### Logs

Server logs are displayed in the console. Look for:
- `[INFO]` - General information
- `[WARN]` - Warnings (non-critical)
- `[ERROR]` - Errors that need attention

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Built with React, TypeScript, and Node.js
- Uses FFmpeg for video/audio processing
- Uses yt-dlp for video downloading
- UI components from shadcn/ui
- Icons from Lucide React
