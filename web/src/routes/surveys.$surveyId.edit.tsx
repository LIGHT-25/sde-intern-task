import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import {
  ArrowLeft,
  BarChart2,
  Check,
  CloudUpload,
  Copy,
  Eye,
  EyeOff,
  GripVertical,
  Image,
  Info,
  List,
  Monitor,
  Save,
  Settings,
  Sparkles,
  Star,
  Trash2,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'
import { Input, Textarea } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Select } from '../components/ui/select'
import { colorNameToHex, hexToColorName } from '../lib/utils'
import { apiService } from '../services/api'
import type { Question, QuestionConfig, QuestionType, Survey } from '../types/survey'

export const Route = createFileRoute('/surveys/$surveyId/edit')({
  component: SurveyBuilder,
})

// Preset branding colors
const PRESET_COLORS = [
  { name: 'Indigo', value: '#4f46e5' },
  { name: 'Emerald', value: '#10b981' },
  { name: 'Rose', value: '#f43f5e' },
  { name: 'Amber', value: '#f59e0b' },
  { name: 'Violet', value: '#8b5cf6' },
  { name: 'Charcoal', value: '#334155' },
]

function SurveyBuilder() {
  const { surveyId } = Route.useParams()
  const navigate = useNavigate()
  const saveTimeout = useRef<NodeJS.Timeout | null>(null)

  // State
  const [survey, setSurvey] = useState<Survey | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [_isSaving, _setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [colorInput, setColorInput] = useState('')
  const [isPublishing, setIsPublishing] = useState(false)
  const [publishStatus, setPublishStatus] = useState<'idle' | 'success' | 'error'>('idle')

  // Drag and drop state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)

  // Copy state & handler
  const [copied, setCopied] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const handleCopyLink = () => {
    const url = `${window.location.origin}/s/${surveyId}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Auth & Load Check
  useEffect(() => {
    const storedUser = localStorage.getItem('survey_user_email')
    if (!storedUser) {
      navigate({ to: '/' })
      return
    }
    loadSurveyData()
  }, [surveyId])

  const loadSurveyData = async () => {
    setIsLoading(true)
    try {
      const surveyData = await apiService.getSurveyById(surveyId)
      setSurvey(surveyData)
      setColorInput(hexToColorName(surveyData.primary_color || '#4f46e5'))

      const questionData = await apiService.getQuestions(surveyId)
      // Sort by position just in case
      const sorted = [...questionData].sort((a, b) => a.position - b.position)
      setQuestions(sorted)
    } catch (err) {
      console.error(err)
      alert('Failed to load survey data.')
      navigate({ to: '/dashboard' })
    } finally {
      setIsLoading(false)
    }
  }

  // --- BRANDING ACTIONS ---

  const handleUpdateSurveyField = (field: keyof Survey, value: string) => {
    if (!survey) return
    const updated = { ...survey, [field]: value }
    setSurvey(updated)
    if (field === 'primary_color') {
      setColorInput(hexToColorName(value))
    }
    triggerAutoSave(updated, questions)
  }

  // --- QUESTION ACTIONS ---

  const handleAddQuestion = async (type: QuestionType = 'text') => {
    if (!survey) return
    try {
      setSaveStatus('saving')
      const newQ = await apiService.createQuestion(survey.id, type, `What is your question?`)
      const updatedQuestions = [...questions, newQ]
      setQuestions(updatedQuestions)
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2000)
    } catch (err) {
      console.error(err)
      alert('Failed to add question')
    }
  }

  const handleDeleteQuestion = async (qId: string) => {
    if (!survey) return
    try {
      setSaveStatus('saving')
      await apiService.deleteQuestion(survey.id, qId)
      const updatedQuestions = questions
        .filter((q) => q.id !== qId)
        .map((q, idx) => ({ ...q, position: idx + 1 }))
      setQuestions(updatedQuestions)
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2000)
    } catch (err) {
      console.error(err)
      alert('Failed to delete question')
    }
  }

  const handleUpdateQuestionField = (qId: string, updates: Partial<Question>) => {
    if (!survey) return
    const updatedQuestions = questions.map((q) => {
      if (q.id === qId) {
        return { ...q, ...updates }
      }
      return q
    })
    setQuestions(updatedQuestions)

    // Save to server
    apiService.updateQuestion(survey.id, qId, updates).catch(console.error)
    triggerAutoSave(survey, updatedQuestions)
  }

  const handleUpdateQuestionConfig = (qId: string, configUpdates: Partial<QuestionConfig>) => {
    if (!survey) return
    const q = questions.find((item) => item.id === qId)
    if (!q) return

    let currentConfig: QuestionConfig = {}
    try {
      currentConfig = JSON.parse(q.config_json || '{}')
    } catch {
      currentConfig = {}
    }

    const newConfig = { ...currentConfig, ...configUpdates }
    const configStr = JSON.stringify(newConfig)

    handleUpdateQuestionField(qId, { config_json: configStr })
  }

  // --- DRAG AND DROP HANDLERS ---

  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === index) return

    // Perform reorder local swap to show visual feedback
    const items = [...questions]
    const draggedItem = items[draggedIndex]
    if (!draggedItem) return

    items.splice(draggedIndex, 1)
    items.splice(index, 0, draggedItem)

    // Update local state positions
    const reordered = items.map((q, idx) => ({ ...q, position: idx + 1 }))
    setQuestions(reordered)
    setDraggedIndex(index)
  }

  const handleDragEnd = async () => {
    setDraggedIndex(null)
    if (!survey) return

    setSaveStatus('saving')
    try {
      await apiService.reorderQuestions(survey.id, questions)
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2000)
    } catch (err) {
      console.error(err)
      alert('Failed to sync question positions on server.')
    }
  }

  // --- AUTO-SAVE TRIGGER ---

  const triggerAutoSave = (currentSurvey: Survey, _currentQuestions: Question[]) => {
    setSaveStatus('saving')

    // Debounce saves
    if (saveTimeout.current) clearTimeout(saveTimeout.current)
    saveTimeout.current = setTimeout(async () => {
      try {
        await apiService.updateSurvey(currentSurvey.id, {
          title: currentSurvey.title,
          description: currentSurvey.description,
          primary_color: currentSurvey.primary_color,
          logo_url: currentSurvey.logo_url,
        })
        setSaveStatus('saved')
        setTimeout(() => setSaveStatus('idle'), 2000)
      } catch (err) {
        console.error(err)
        setSaveStatus('idle')
      }
    }, 600)
  }

  // --- PUBLISH / SYNC CHANGES ---

  const handleUpdateChanges = async () => {
    if (!survey) return
    setIsPublishing(true)
    setPublishStatus('idle')
    try {
      // 1. Sync survey metadata
      await apiService.updateSurvey(survey.id, {
        title: survey.title,
        description: survey.description,
        primary_color: survey.primary_color,
        logo_url: survey.logo_url,
      })

      // 2. Fetch server questions to reconcile
      const API_BASE =
        import.meta.env.VITE_API_URL || 'https://sde-intern-task-api.rupak-api.workers.dev/api'
      const res = await fetch(`${API_BASE}/questions/${survey.id}`)
      if (res.ok) {
        const dbQuestions: Question[] = await res.json()
        const dbIds = new Set(dbQuestions.map((q) => q.id))
        const localIds = new Set(questions.map((q) => q.id))

        // A. Delete server questions that do not exist locally
        for (const dbQ of dbQuestions) {
          if (!localIds.has(dbQ.id)) {
            await apiService.deleteQuestion(survey.id, dbQ.id)
          }
        }

        // B. Update/Create questions
        for (const q of questions) {
          if (dbIds.has(q.id)) {
            // Update
            await apiService.updateQuestion(survey.id, q.id, {
              title: q.title,
              type: q.type,
              position: q.position,
              config_json: q.config_json,
            })
          } else {
            // Create on server
            await fetch(`${API_BASE}/questions/${survey.id}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ type: q.type, title: q.title }),
            })
          }
        }
      }

      setPublishStatus('success')
      setTimeout(() => setPublishStatus('idle'), 3000)
    } catch (err) {
      console.error('Failed to sync changes:', err)
      setPublishStatus('error')
    } finally {
      setIsPublishing(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <svg className="animate-spin h-8 w-8 text-indigo-600" fill="none" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          <span className="text-sm font-medium text-slate-500">Loading workspace...</span>
        </div>
      </div>
    )
  }

  if (!survey) return null

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Sub Header / Control Bar */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/dashboard">
            <Button variant="ghost" size="sm" className="gap-1 text-slate-600 hover:text-slate-900">
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
          </Link>
          <div className="h-4 w-[1px] bg-slate-200" />
          <h2 className="text-base font-bold text-slate-900 line-clamp-1 max-w-[200px] sm:max-w-md">
            {survey.title || 'Untitled Survey'}
          </h2>
          {saveStatus === 'saving' && (
            <span className="text-xs text-slate-400 animate-pulse flex items-center gap-1">
              <Save className="h-3 w-3" /> Auto-saving...
            </span>
          )}
          {saveStatus === 'saved' && (
            <span className="text-xs text-emerald-500 font-medium flex items-center gap-1 animate-in fade-in duration-300">
              <Check className="h-3 w-3" /> All changes saved
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <Link to="/surveys/$surveyId/responses" params={{ surveyId }}>
            <Button variant="outline" size="sm" className="gap-1 text-xs font-semibold">
              <BarChart2 className="h-4 w-4 text-slate-500" /> Responses
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyLink}
            className="gap-1 text-xs font-semibold"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 text-emerald-600" /> Copied Link
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 text-slate-500" /> Copy Link
              </>
            )}
          </Button>
          <Button
            variant={showPreview ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowPreview(!showPreview)}
            className={`gap-1 text-xs font-semibold ${
              showPreview ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : ''
            }`}
          >
            {showPreview ? (
              <>
                <EyeOff className="h-4 w-4" /> Hide Preview
              </>
            ) : (
              <>
                <Monitor className="h-4 w-4 text-slate-500" /> Live Preview
              </>
            )}
          </Button>
          <Link to="/s/$surveyId" params={{ surveyId }} target="_blank">
            <Button
              size="sm"
              className="gap-1 text-xs font-bold bg-slate-900 text-white hover:bg-slate-800"
            >
              <Eye className="h-4 w-4" /> Open Public
            </Button>
          </Link>
          <Button
            onClick={handleUpdateChanges}
            disabled={isPublishing}
            size="sm"
            className="gap-1 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
          >
            {isPublishing ? (
              <>
                <svg
                  className="animate-spin h-3.5 w-3.5 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Updating...
              </>
            ) : publishStatus === 'success' ? (
              <>
                <Check className="h-3.5 w-3.5" /> Updated!
              </>
            ) : publishStatus === 'error' ? (
              <>Error!</>
            ) : (
              <>
                <CloudUpload className="h-3.5 w-3.5" /> Update Changes
              </>
            )}
          </Button>
        </div>
      </header>

      {/* Workspace split */}
      <div className={`flex-1 grid gap-0 ${showPreview ? 'md:grid-cols-12' : 'md:grid-cols-12'}`}>
        {/* Left column - Settings / Branding */}
        <aside
          className={`${showPreview ? 'md:col-span-3' : 'md:col-span-4'} bg-white border-r border-slate-200 p-6 flex flex-col justify-between overflow-y-auto max-h-[calc(100vh-65px)]`}
        >
          <div className="space-y-6 text-left">
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Settings className="h-4 w-4 text-indigo-500" /> Branding & Theme
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Customize the logo, colors, and global metadata.
              </p>
            </div>

            <hr className="border-slate-100" />

            {/* Title & Desc */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="survey-title" className="font-semibold text-slate-700">
                  Survey Title
                </Label>
                <Input
                  id="survey-title"
                  value={survey.title}
                  onChange={(e) => handleUpdateSurveyField('title', e.target.value)}
                  placeholder="e.g. Feedback Survey"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="survey-description" className="font-semibold text-slate-700">
                  Description
                </Label>
                <Textarea
                  id="survey-description"
                  value={survey.description || ''}
                  onChange={(e) => handleUpdateSurveyField('description', e.target.value)}
                  placeholder="Describe the purpose of this survey..."
                  rows={3}
                />
              </div>
            </div>

            <hr className="border-slate-100" />

            {/* Logo Settings */}
            <div className="space-y-3">
              <Label className="font-semibold text-slate-700 flex items-center gap-1">
                <Image className="h-4 w-4 text-slate-500" /> Logo Branding
              </Label>
              <Input
                value={survey.logo_url || ''}
                onChange={(e) => handleUpdateSurveyField('logo_url', e.target.value)}
                placeholder="https://example.com/logo.png"
              />
              <p className="text-[10px] text-slate-400">
                Paste any public URL to display your logo on the survey header.
              </p>

              {/* Logo Preview box */}
              {survey.logo_url && (
                <div className="mt-2 border border-slate-200 rounded-lg p-2 bg-slate-50 flex items-center justify-center h-20 relative overflow-hidden">
                  <img
                    src={survey.logo_url}
                    alt="Logo Preview"
                    className="max-h-full max-w-full object-contain p-1"
                    onError={(e) => {
                      ;(e.target as HTMLImageElement).style.display = 'none'
                    }}
                  />
                </div>
              )}
            </div>

            <hr className="border-slate-100" />

            {/* Theme Settings */}
            <div className="space-y-4">
              <Label className="font-semibold text-slate-700">Theme Primary Color</Label>

              {/* Presets Grid */}
              <div className="grid grid-cols-6 gap-2">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => handleUpdateSurveyField('primary_color', color.value)}
                    className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center relative hover:scale-110 active:scale-95 transition-all"
                    style={{ backgroundColor: color.value }}
                    title={color.name}
                  >
                    {survey.primary_color === color.value && (
                      <Check className="h-4 w-4 text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)]" />
                    )}
                  </button>
                ))}
              </div>

              {/* Custom Color Input */}
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={survey.primary_color || '#4f46e5'}
                  onChange={(e) => handleUpdateSurveyField('primary_color', e.target.value)}
                  className="w-10 h-10 rounded border border-slate-200 cursor-pointer p-0 bg-transparent"
                />
                <div className="flex-1 space-y-1">
                  <Input
                    value={colorInput}
                    onChange={(e) => {
                      const val = e.target.value
                      setColorInput(val)
                      const hex = colorNameToHex(val)
                      if (hex) {
                        handleUpdateSurveyField('primary_color', hex)
                      }
                    }}
                    placeholder="e.g. Rose"
                    className="text-sm h-9"
                  />
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    {survey.primary_color || '#4f46e5'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-6 text-left">
            <div className="flex gap-2 p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl text-[11px] text-indigo-700 leading-normal">
              <Sparkles className="h-4 w-4 text-indigo-500 flex-shrink-0" />
              <span>
                Theme changes are instantly applied to the live public link at `/s/{survey.id}`.
              </span>
            </div>
          </div>
        </aside>

        {/* Right column - Question Builder Canvas */}
        <main
          className={`${showPreview ? 'md:col-span-5' : 'md:col-span-8'} p-6 lg:p-10 overflow-y-auto max-h-[calc(100vh-65px)]`}
        >
          <div className="max-w-3xl mx-auto space-y-6">
            {/* Header / Instructions */}
            <div className="flex items-center justify-between text-left">
              <div>
                <h1 className="text-xl font-extrabold tracking-tight text-slate-900 flex items-center gap-1.5">
                  <List className="h-5 w-5 text-indigo-600" /> Questions
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Configure your fields. Drag items to reorder survey flow.
                </p>
              </div>
            </div>

            {/* Questions List */}
            {questions.length === 0 ? (
              <div className="text-center py-16 border-2 border-dashed border-slate-200 bg-white rounded-xl shadow-sm p-6">
                <List className="mx-auto h-8 w-8 text-slate-400 stroke-1" />
                <h3 className="text-sm font-semibold text-slate-800 mt-2">
                  Add your first question
                </h3>
                <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                  Survey respondents will respond to these. Select a question type below to get
                  started.
                </p>
                <div className="flex justify-center gap-3 mt-6">
                  <Button
                    size="sm"
                    onClick={() => handleAddQuestion('text')}
                    variant="outline"
                    className="border-indigo-100 text-indigo-600 bg-indigo-50/50 hover:bg-indigo-50 font-bold"
                  >
                    + Text Input
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleAddQuestion('multiple_choice')}
                    variant="outline"
                    className="border-indigo-100 text-indigo-600 bg-indigo-50/50 hover:bg-indigo-50 font-bold"
                  >
                    + Multiple Choice
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleAddQuestion('rating')}
                    variant="outline"
                    className="border-indigo-100 text-indigo-600 bg-indigo-50/50 hover:bg-indigo-50 font-bold"
                  >
                    + 1–5 Rating
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {questions.map((question, index) => {
                  let config: QuestionConfig = {}
                  try {
                    config = JSON.parse(question.config_json || '{}')
                  } catch {
                    config = {}
                  }

                  return (
                    <Card
                      key={question.id}
                      draggable
                      onDragStart={() => handleDragStart(index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragEnd={handleDragEnd}
                      className={`relative bg-white border border-slate-200/80 shadow-sm transition-all duration-150 ${
                        draggedIndex === index
                          ? 'opacity-50 border-indigo-400 ring-2 ring-indigo-50'
                          : ''
                      }`}
                    >
                      {/* Left Drag Border Indicator */}
                      <div
                        className="absolute top-0 left-0 h-full w-1 rounded-l-xl"
                        style={{ backgroundColor: survey.primary_color || '#4f46e5' }}
                      />

                      <CardContent className="p-5 flex items-start gap-4">
                        {/* Drag Handle */}
                        <div
                          className="mt-2 text-slate-400 cursor-grab hover:text-slate-700 active:cursor-grabbing flex items-center justify-center p-1 hover:bg-slate-100 rounded flex-shrink-0"
                          title="Drag to Reorder"
                        >
                          <GripVertical className="h-5 w-5" />
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 space-y-4 text-left">
                          {/* Top Row: Position & Title Input & Type Select */}
                          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                            {/* Position Label + Question Title Input */}
                            <div className="flex items-center gap-2 flex-grow w-full sm:w-auto">
                              <span className="font-mono text-xs font-semibold px-2 py-1 bg-slate-100 rounded-md text-slate-600 border border-slate-200/60">
                                Q{index + 1}
                              </span>
                              <Input
                                value={question.title}
                                onChange={(e) =>
                                  handleUpdateQuestionField(question.id, { title: e.target.value })
                                }
                                placeholder="Enter question title..."
                                className="font-semibold text-slate-800 border-none shadow-none focus-visible:ring-0 p-0 text-base h-auto max-w-full truncate focus:border-b focus:border-indigo-400 rounded-none bg-transparent"
                              />
                            </div>

                            {/* Question Type Selector */}
                            <div className="w-full sm:w-[160px] flex-shrink-0">
                              <Select
                                value={question.type}
                                onChange={(e) =>
                                  handleUpdateQuestionField(question.id, {
                                    type: e.target.value as QuestionType,
                                  })
                                }
                                className="h-8 py-0.5 text-xs text-slate-600 border-slate-200"
                              >
                                <option value="text">Text Answer</option>
                                <option value="multiple_choice">Multiple Choice</option>
                                <option value="rating">Rating (1–5)</option>
                              </Select>
                            </div>
                          </div>

                          {/* Dynamic Configurations based on Question Type */}

                          {/* Text Type info */}
                          {question.type === 'text' && (
                            <div className="p-3 bg-slate-50 border border-slate-200/60 rounded-lg text-xs text-slate-500 flex items-center gap-1.5">
                              <Info className="h-4 w-4 text-slate-400" />
                              <span>
                                Adds a simple, single-line text input field for short textual
                                answers.
                              </span>
                            </div>
                          )}

                          {/* Multiple Choice Options Builder */}
                          {question.type === 'multiple_choice' && (
                            <div className="space-y-2 border-t border-slate-100 pt-3">
                              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                                Choice Options
                              </div>
                              <div className="space-y-1.5">
                                {(config.options || []).map((option, optIdx) => (
                                  <div key={optIdx} className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                    <Input
                                      value={option}
                                      onChange={(e) => {
                                        const newOpts = [...(config.options || [])]
                                        newOpts[optIdx] = e.target.value
                                        handleUpdateQuestionConfig(question.id, {
                                          options: newOpts,
                                        })
                                      }}
                                      placeholder={`Option ${optIdx + 1}`}
                                      className="h-8 py-1 text-xs text-slate-700 bg-slate-50/50"
                                    />
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded"
                                      onClick={() => {
                                        const newOpts = (config.options || []).filter(
                                          (_, i) => i !== optIdx,
                                        )
                                        handleUpdateQuestionConfig(question.id, {
                                          options: newOpts,
                                        })
                                      }}
                                      title="Remove Option"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                ))}

                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    const newOpts = [
                                      ...(config.options || []),
                                      `Option ${(config.options || []).length + 1}`,
                                    ]
                                    handleUpdateQuestionConfig(question.id, { options: newOpts })
                                  }}
                                  className="text-[11px] h-7 px-2 hover:bg-indigo-50 text-indigo-600 font-semibold mt-1"
                                >
                                  + Add Option
                                </Button>
                              </div>
                            </div>
                          )}

                          {/* Rating Type Config */}
                          {question.type === 'rating' && (
                            <div className="space-y-2 border-t border-slate-100 pt-3">
                              <div className="flex items-center gap-4 text-xs">
                                <span className="font-semibold text-slate-600">Max Rating</span>
                                <Select
                                  value={config.maxRating || 5}
                                  onChange={(e) => {
                                    handleUpdateQuestionConfig(question.id, {
                                      maxRating: parseInt(e.target.value, 10),
                                    })
                                  }}
                                  className="h-8 w-24 py-1 text-xs text-slate-700"
                                >
                                  <option value={5}>5 Stars</option>
                                  <option value={10}>10 Stars</option>
                                </Select>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Delete Question Button */}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteQuestion(question.id)}
                          className="h-9 w-9 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg flex-shrink-0 ml-1"
                          title="Delete Question"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}

            {/* Quick Add Footer Bar */}
            {questions.length > 0 && (
              <div className="flex justify-center gap-3 p-4 bg-white border border-slate-200/80 rounded-xl shadow-sm">
                <Button
                  size="sm"
                  onClick={() => handleAddQuestion('text')}
                  variant="outline"
                  className="border-indigo-100 text-indigo-600 bg-indigo-50/50 hover:bg-indigo-50 font-bold"
                >
                  + Text Input
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleAddQuestion('multiple_choice')}
                  variant="outline"
                  className="border-indigo-100 text-indigo-600 bg-indigo-50/50 hover:bg-indigo-50 font-bold"
                >
                  + Multiple Choice
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleAddQuestion('rating')}
                  variant="outline"
                  className="border-indigo-100 text-indigo-600 bg-indigo-50/50 hover:bg-indigo-50 font-bold"
                >
                  + 1–5 Rating
                </Button>
              </div>
            )}
          </div>
        </main>

        {/* Live Preview Panel */}
        {showPreview && (
          <aside className="md:col-span-4 border-l border-slate-200 bg-slate-100 overflow-y-auto max-h-[calc(100vh-65px)]">
            <div className="sticky top-0 z-10 bg-slate-200/80 backdrop-blur-sm px-4 py-2.5 border-b border-slate-300/50 flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                <Monitor className="h-3.5 w-3.5" /> Live Preview
              </span>
              <span className="text-[10px] text-slate-400 font-medium">Updates in real-time</span>
            </div>
            <div className="p-4">
              {/* Simulated Mobile Frame */}
              <div
                className="mx-auto max-w-sm bg-white rounded-2xl shadow-lg border border-slate-200/60 overflow-hidden"
                style={{ minHeight: '400px' }}
              >
                {/* Preview Header with branding */}
                <div
                  className="px-6 py-5 text-center"
                  style={{ backgroundColor: survey.primary_color || '#4f46e5' }}
                >
                  {survey.logo_url && (
                    <img
                      src={survey.logo_url}
                      alt="Logo"
                      className="h-8 mx-auto mb-2 object-contain"
                      onError={(e) => {
                        ;(e.target as HTMLImageElement).style.display = 'none'
                      }}
                    />
                  )}
                  <h3 className="text-base font-bold text-white leading-tight drop-shadow-sm">
                    {survey.title || 'Untitled Survey'}
                  </h3>
                  {survey.description && (
                    <p className="text-xs text-white/80 mt-1 line-clamp-2">{survey.description}</p>
                  )}
                </div>

                {/* Preview Questions */}
                <div className="px-5 py-4 space-y-4">
                  {questions.length === 0 ? (
                    <div className="text-center py-8 text-xs text-slate-400">
                      <List className="h-5 w-5 mx-auto mb-1.5 text-slate-300" />
                      No questions yet
                    </div>
                  ) : (
                    questions.map((q, idx) => {
                      let config: QuestionConfig = {}
                      try {
                        config = JSON.parse(q.config_json || '{}')
                      } catch {
                        config = {}
                      }

                      return (
                        <div key={q.id} className="text-left">
                          <p className="text-xs font-bold text-slate-700 mb-1.5">
                            {idx + 1}. {q.title || 'Untitled'}
                          </p>

                          {/* Text input preview */}
                          {q.type === 'text' && (
                            <div className="h-8 bg-slate-50 border border-slate-200 rounded-md px-2 flex items-center">
                              <span className="text-[10px] text-slate-300">
                                Type your answer...
                              </span>
                            </div>
                          )}

                          {/* Multiple choice preview */}
                          {q.type === 'multiple_choice' && (
                            <div className="space-y-1.5">
                              {(config.options || ['Option 1', 'Option 2']).map((opt, optIdx) => (
                                <div
                                  key={optIdx}
                                  className="h-7 border border-slate-200 rounded-md px-2.5 flex items-center text-[10px] text-slate-500 hover:border-indigo-300 transition-colors cursor-default"
                                  style={{
                                    borderColor:
                                      optIdx === 0 ? survey.primary_color || '#4f46e5' : undefined,
                                    backgroundColor:
                                      optIdx === 0
                                        ? `${survey.primary_color || '#4f46e5'}08`
                                        : undefined,
                                  }}
                                >
                                  <div
                                    className="w-2.5 h-2.5 rounded-full border-2 mr-2 flex-shrink-0"
                                    style={{
                                      borderColor:
                                        optIdx === 0
                                          ? survey.primary_color || '#4f46e5'
                                          : '#cbd5e1',
                                      backgroundColor:
                                        optIdx === 0
                                          ? survey.primary_color || '#4f46e5'
                                          : 'transparent',
                                    }}
                                  />
                                  {opt}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Rating preview */}
                          {q.type === 'rating' && (
                            <div className="flex gap-1">
                              {Array.from({ length: config.maxRating || 5 }).map((_, i) => (
                                <Star
                                  key={i}
                                  className="h-4 w-4"
                                  style={{
                                    color: i < 3 ? survey.primary_color || '#4f46e5' : '#e2e8f0',
                                    fill: i < 3 ? survey.primary_color || '#4f46e5' : 'none',
                                  }}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })
                  )}

                  {/* Preview Submit Button */}
                  {questions.length > 0 && (
                    <div className="pt-3 pb-2">
                      <div
                        className="w-full py-2 rounded-lg text-center text-xs font-bold text-white"
                        style={{ backgroundColor: survey.primary_color || '#4f46e5' }}
                      >
                        Submit Survey
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  )
}
