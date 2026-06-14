import { createFileRoute } from '@tanstack/react-router'
import { CheckCircle2, ChevronRight, ClipboardList, Star } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { apiService } from '../services/api'
import type { Question, QuestionConfig, Survey } from '../types/survey'

export const Route = createFileRoute('/s/$surveyId')({
  component: PublicSurvey,
})

function PublicSurvey() {
  const { surveyId } = Route.useParams()

  // Extract version from URL search params
  const searchParams = new URLSearchParams(window.location.search)
  const versionParam = searchParams.get('v') || undefined

  // State
  const [survey, setSurvey] = useState<Survey | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [started, setStarted] = useState(false)

  useEffect(() => {
    loadSurvey()
  }, [surveyId])

  const loadSurvey = async () => {
    setIsLoading(true)
    try {
      const surveyData = await apiService.getSurveyById(surveyId)
      setSurvey(surveyData)

      const questionData = await apiService.getQuestions(surveyId, versionParam)
      setQuestions([...questionData].sort((a, b) => a.position - b.position))
    } catch (err) {
      console.error(err)
      setError('This survey is not available or does not exist.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAnswerChange = (qId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [qId]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!survey) return

    // Validation: check if all questions have an answer
    const unanswered = questions.filter(
      (q) => !answers[q.id] || (answers[q.id] || '').trim() === '',
    )
    if (unanswered.length > 0) {
      alert(`Please answer all questions before submitting. (${unanswered.length} remaining)`)
      return
    }

    setIsSubmitting(true)
    try {
      // 1. Create response with the version from URL params (or use survey's current version)
      const targetVersion = versionParam || survey.version || 'v1.0'
      const responseId = await apiService.createResponseWithVersion(survey.id, targetVersion)

      // 2. Submit all answers
      const answersPayload = Object.entries(answers).map(([qId, val]) => {
        const question = questions.find((q) => q.id === qId)
        const questionTitle = question ? question.title : ''
        const questionType = question ? question.type : ''
        const packedValue = JSON.stringify({
          value: val,
          question_title: questionTitle,
          question_type: questionType,
        })
        return {
          questionId: qId,
          value: packedValue,
        }
      })

      await apiService.submitAnswers(responseId, answersPayload)

      setHasSubmitted(true)
    } catch (err) {
      console.error(err)
      alert('Failed to submit your responses. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Calculate completion percentage
  const totalQuestions = questions.length
  const answeredQuestions = Object.values(answers).filter(
    (val) => val !== undefined && val.trim() !== '',
  ).length
  const progressPercent =
    totalQuestions > 0 ? Math.round((answeredQuestions / totalQuestions) * 100) : 0

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
          <span className="text-sm font-medium text-slate-500">Loading survey form...</span>
        </div>
      </div>
    )
  }

  if (error || !survey) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md w-full text-center bg-white border border-slate-200 rounded-2xl shadow-md p-8">
          <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center mx-auto mb-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="lucide lucide-shield-alert"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="M12 8v4" />
              <path d="M12 16h.01" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-slate-900">Survey Not Found</h2>
          <p className="text-slate-500 text-sm mt-2">
            {error || 'The requested survey could not be loaded.'}
          </p>
        </div>
      </div>
    )
  }

  // Inject Survey Custom Colors Dynamically
  const primaryThemeColor = survey.primary_color || '#4f46e5'
  const customStyle = {
    '--primary': primaryThemeColor,
    '--ring': primaryThemeColor,
  } as React.CSSProperties

  // --- SUBMITTED SUCCESS STATE ---
  if (hasSubmitted) {
    return (
      <div
        style={customStyle}
        className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-6 text-slate-900"
      >
        <div className="max-w-md w-full bg-white border border-slate-200/80 rounded-2xl shadow-xl p-8 text-center animate-in fade-in zoom-in-95 duration-300">
          <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="h-10 w-10 text-[var(--primary)]" />
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight">Submission Received!</h2>
          <p className="text-slate-500 text-sm mt-3 leading-relaxed">
            Thank you for taking the time to answer this survey. Your responses have been
            successfully recorded.
          </p>
          <hr className="my-6 border-slate-100" />
          <p className="text-[10px] text-slate-400">
            Powered by FormFlow builder. Built with pnpm & React 19.
          </p>
        </div>
      </div>
    )
  }

  // --- WELCOME/START PAGE ---
  if (!started) {
    return (
      <div
        style={customStyle}
        className="min-h-screen bg-slate-50 flex flex-col justify-between p-6"
      >
        <div />
        <main className="max-w-xl w-full mx-auto bg-white border border-slate-200/80 rounded-2xl shadow-xl p-8 text-center space-y-6">
          {/* Brand Logo if exists */}
          {survey.logo_url && (
            <div className="h-16 flex items-center justify-center mb-2">
              <img
                src={survey.logo_url}
                alt="Brand Logo"
                className="max-h-full max-w-[200px] object-contain"
              />
            </div>
          )}

          <div className="space-y-2">
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 leading-tight">
              {survey.title || 'Welcome to this Survey'}
            </h1>
            <p className="text-slate-500 text-sm leading-relaxed max-w-md mx-auto">
              {survey.description || 'Please click below to start answering the questions.'}
            </p>
          </div>

          <div className="pt-4">
            <Button
              onClick={() => setStarted(true)}
              className="px-8 py-6 text-base font-bold shadow-md bg-[var(--primary)] text-white hover:opacity-90 transition-opacity w-full sm:w-auto"
            >
              Start Survey <ChevronRight className="h-5 w-5 ml-1" />
            </Button>
          </div>

          <div className="text-[10px] text-slate-400 pt-2 flex items-center justify-center gap-1">
            <ClipboardList className="h-3.5 w-3.5" />
            <span>Anonymous responses. No sign-in required.</span>
          </div>
        </main>

        <footer className="text-center text-[10px] text-slate-400 py-4">
          FormFlow Surveys &copy; 2026. All rights reserved.
        </footer>
      </div>
    )
  }

  // --- MAIN SURVEY FILLING FORM ---
  return (
    <div style={customStyle} className="min-h-screen bg-slate-50 flex flex-col">
      {/* Branded Header */}
      <div className="w-full text-center px-6 py-8" style={{ backgroundColor: primaryThemeColor }}>
        {survey.logo_url && (
          <img
            src={survey.logo_url}
            alt="Brand Logo"
            className="h-10 mx-auto mb-3 object-contain"
            onError={(e) => {
              ;(e.target as HTMLImageElement).style.display = 'none'
            }}
          />
        )}
        <h1 className="text-xl font-bold text-white leading-tight drop-shadow-sm">
          {survey.title || 'Survey'}
        </h1>
        {survey.description && (
          <p className="text-sm text-white/80 mt-1 max-w-lg mx-auto line-clamp-2">
            {survey.description}
          </p>
        )}
      </div>

      {/* Sticky Progress Bar */}
      <div className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
        <div className="h-1 bg-slate-100 w-full overflow-hidden">
          <div
            className="h-full transition-all duration-300"
            style={{ width: `${progressPercent}%`, backgroundColor: primaryThemeColor }}
          />
        </div>
        <div className="max-w-3xl mx-auto px-6 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: primaryThemeColor }}
            />
            <span className="text-xs font-bold text-slate-700 tracking-tight truncate max-w-[200px] sm:max-w-md">
              {survey.title}
            </span>
          </div>
          <span className="text-xs font-mono font-semibold text-slate-500">
            {answeredQuestions}/{totalQuestions} Answered ({progressPercent}%)
          </span>
        </div>
      </div>

      {/* Questions list container */}
      <main className="flex-grow max-w-3xl w-full mx-auto px-4 py-10">
        <form onSubmit={handleSubmit} className="space-y-8">
          {questions.map((question, index) => {
            let config: QuestionConfig = {}
            try {
              config = JSON.parse(question.config_json || '{}')
            } catch {
              config = {}
            }

            const currentVal = answers[question.id] || ''

            return (
              <Card
                key={question.id}
                className={`border bg-white shadow-sm overflow-hidden text-left transition-all ${
                  currentVal ? 'border-l-4 border-l-[var(--primary)]' : 'border-slate-200'
                }`}
              >
                <CardContent className="p-6 space-y-4">
                  {/* Question Heading */}
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-[var(--primary)] uppercase tracking-wider font-mono">
                      Question {index + 1}
                    </span>
                    <h3 className="text-lg font-bold text-slate-900 leading-tight">
                      {question.title}
                    </h3>
                  </div>

                  {/* Dynamic Fields */}

                  {/* TYPE: text */}
                  {question.type === 'text' && (
                    <Input
                      type="text"
                      placeholder="Type your answer here..."
                      value={currentVal}
                      onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                      className="border-slate-200 focus:border-[var(--primary)] focus:ring-[var(--primary)] h-11 text-base bg-slate-50/50"
                      required
                    />
                  )}

                  {/* TYPE: multiple_choice */}
                  {question.type === 'multiple_choice' && (
                    <div className="grid grid-cols-1 gap-2.5">
                      {(config.options || []).map((option, optIdx) => {
                        const isSelected = currentVal === option
                        return (
                          <button
                            key={optIdx}
                            type="button"
                            onClick={() => handleAnswerChange(question.id, option)}
                            className={`flex items-center justify-between p-4 rounded-xl border text-sm font-semibold transition-all duration-150 text-left ${
                              isSelected
                                ? 'bg-primary/5 border-[var(--primary)] text-slate-900 shadow-sm'
                                : 'bg-slate-50/30 border-slate-200 text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <span>{option}</span>
                            <div
                              className={`w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 ${
                                isSelected
                                  ? 'border-[var(--primary)] bg-[var(--primary)] text-white'
                                  : 'border-slate-300 bg-white'
                              }`}
                            >
                              {isSelected && (
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="3"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  className="h-3 w-3"
                                >
                                  <path d="M20 6 9 17l-5-5" />
                                </svg>
                              )}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  )}

                  {/* TYPE: rating */}
                  {question.type === 'rating' && (
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {Array.from({ length: config.maxRating || 5 }).map((_, i) => {
                          const starVal = (i + 1).toString()
                          const isActive = parseInt(currentVal, 10) >= i + 1
                          const isExact = currentVal === starVal

                          return (
                            <button
                              key={i}
                              type="button"
                              onClick={() => handleAnswerChange(question.id, starVal)}
                              className="group flex flex-col items-center justify-center w-12 h-12 rounded-xl border transition-all duration-100 active:scale-95"
                              style={{
                                backgroundColor: isExact
                                  ? 'var(--primary)'
                                  : isActive
                                    ? 'rgba(var(--primary), 0.1)'
                                    : 'transparent',
                                color: isExact
                                  ? '#ffffff'
                                  : isActive
                                    ? 'var(--primary)'
                                    : '#64748b',
                                borderColor: isActive ? 'var(--primary)' : '#e2e8f0',
                              }}
                              title={`Rate ${starVal}`}
                            >
                              <Star
                                className={`h-5 w-5 ${isActive ? 'fill-current' : 'text-slate-400 group-hover:text-[var(--primary)]'}`}
                              />
                              <span className="text-[10px] font-bold mt-0.5">{starVal}</span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}

          {/* Submission button bar */}
          <div className="flex justify-end pt-4">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="px-10 py-6 text-base font-bold shadow-md bg-[var(--primary)] text-white hover:opacity-90 transition-opacity w-full sm:w-auto"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
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
                  Submitting response...
                </span>
              ) : (
                'Submit Form'
              )}
            </Button>
          </div>
        </form>
      </main>
    </div>
  )
}
