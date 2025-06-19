import { create } from 'zustand'

export interface ProcessingJob {
  id: string
  type: 'download' | 'extract' | 'transcribe' | 'translate' | 'manipulate'
  status: 'pending' | 'processing' | 'completed' | 'error'
  progress: number
  input: string
  output?: string
  error?: string
  createdAt: Date
  completedAt?: Date
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system'
  defaultVideoQuality: string
  defaultAudioFormat: string
  autoDownload: boolean
  showAdvancedOptions: boolean
}

interface AppState {
  // Theme
  theme: 'light' | 'dark'
  setTheme: (theme: 'light' | 'dark') => void
  
  // Processing jobs
  jobs: ProcessingJob[]
  addJob: (job: Omit<ProcessingJob, 'id' | 'createdAt'>) => void
  updateJob: (id: string, updates: Partial<ProcessingJob>) => void
  removeJob: (id: string) => void
  clearJobs: () => void
  
  // User preferences
  preferences: UserPreferences
  updatePreferences: (updates: Partial<UserPreferences>) => void
  
  // UI state
  activeTab: string
  setActiveTab: (tab: string) => void
  
  // Current processing
  currentUrl: string
  setCurrentUrl: (url: string) => void
  
  // Results
  results: any[]
  addResult: (result: any) => void
  clearResults: () => void
}

export const useAppStore = create<AppState>((set, get) => ({
  // Theme
  theme: 'dark',
  setTheme: (theme) => set({ theme }),
  
  // Processing jobs
  jobs: [],
  addJob: (job) => {
    const newJob: ProcessingJob = {
      ...job,
      id: crypto.randomUUID(),
      createdAt: new Date(),
    }
    set((state) => ({ jobs: [...state.jobs, newJob] }))
  },
  updateJob: (id, updates) => {
    set((state) => ({
      jobs: state.jobs.map((job) => 
        job.id === id ? { ...job, ...updates } : job
      )
    }))
  },
  removeJob: (id) => {
    set((state) => ({
      jobs: state.jobs.filter((job) => job.id !== id)
    }))
  },
  clearJobs: () => set({ jobs: [] }),
  
  // User preferences
  preferences: {
    theme: 'dark',
    defaultVideoQuality: '720p',
    defaultAudioFormat: 'mp3',
    autoDownload: false,
    showAdvancedOptions: false,
  },
  updatePreferences: (updates) => {
    set((state) => ({
      preferences: { ...state.preferences, ...updates }
    }))
  },
  
  // UI state
  activeTab: 'download',
  setActiveTab: (tab) => set({ activeTab: tab }),
  
  // Current processing
  currentUrl: '',
  setCurrentUrl: (url) => set({ currentUrl: url }),
  
  // Results
  results: [],
  addResult: (result) => {
    set((state) => ({ results: [...state.results, result] }))
  },
  clearResults: () => set({ results: [] }),
}))