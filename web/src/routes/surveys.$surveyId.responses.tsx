import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import {
  ArrowLeft,
  Calendar,
  ChevronRight,
  ClipboardList,
  Download,
  ExternalLink,
  FileText,
  RefreshCw,
  Users,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog'
import { apiService } from '../services/api'
import type { Answer, Question, Survey, SurveyResponse } from '../types/survey'

export const Route = createFileRoute('/surveys/$surveyId/responses')({
  component: ResponseDashboard,
})

function ResponseDashboard() {
  const { surveyId } = Route.useParams()
  const navigate = useNavigate()

  // State
  const [survey, setSurvey] = useState<Survey | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [responses, setResponses] = useState<SurveyResponse[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState('')

  // Detailed Modal State
  const [selectedResponse, setSelectedResponse] = useState<SurveyResponse | null>(null)
  const [selectedAnswers, setSelectedAnswers] = useState<Answer[]>([])
  const [isLoadingAnswers, setIsLoadingAnswers] = useState(false)

  // Auth and Load check
  useEffect(() => {
    const storedUser = localStorage.getItem('survey_user_email')
    if (!storedUser) {
      navigate({ to: '/' })
      return
    }
    loadData()
  }, [surveyId])

  const loadData = async () => {
    setIsLoading(true)
    try {
      const surveyData = await apiService.getSurveyById(surveyId)
      setSurvey(surveyData)

      const questionData = await apiService.getQuestions(surveyId)
      setQuestions(questionData)

      const responseData = await apiService.getResponses(surveyId)
      setResponses(responseData)
      setError('')
    } catch (err) {
      console.error(err)
      setError('Failed to load responses for this survey.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      const responseData = await apiService.getResponses(surveyId)
      setResponses(responseData)
    } catch (err) {
      console.error(err)
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleRowClick = async (response: SurveyResponse) => {
    setSelectedResponse(response)
    setIsLoadingAnswers(true)
    try {
      const answersData = await apiService.getResponseAnswers(response.id)
      setSelectedAnswers(answersData)
    } catch (err) {
      console.error(err)
      alert('Failed to load answers for this response.')
    } finally {
      setIsLoadingAnswers(false)
    }
  }

  const handleCloseModal = () => {
    setSelectedResponse(null)
    setSelectedAnswers([])
  }

  // --- CSV EXPORT ---
  const [isExporting, setIsExporting] = useState(false)

  const handleExportCSV = useCallback(async () => {
    if (!survey) return
    if (responses.length === 0) {
      alert('No responses to export.')
      return
    }
    setIsExporting(true)

    try {
      // Fetch questions directly from the API to avoid local storage mismatches
      const API_BASE =
        import.meta.env.VITE_API_URL || 'https://sde-intern-task-api.rupak-api.workers.dev/api'
      const qRes = await fetch(`${API_BASE}/questions/${surveyId}`)
      if (!qRes.ok) throw new Error('Failed to fetch questions from API')
      const dbQuestions: Question[] = await qRes.json()
      const sortedQuestions = [...dbQuestions].sort((a, b) => a.position - b.position)

      if (sortedQuestions.length === 0) {
        alert('No questions found for this survey. Cannot export CSV.')
        setIsExporting(false)
        return
      }

      // Build header row: "Response ID", question titles..., "Submitted At"
      const headers = [
        'Response ID',
        ...sortedQuestions.map((q) => `${q.title} (${q.type})`),
        'Submitted At',
      ]

      // Fetch all answers in bulk
      const allAnswersRes = await fetch(`${API_BASE}/responses/${surveyId}/all-answers`)
      let allAnswers: Answer[] = []
      if (allAnswersRes.ok) {
        allAnswers = await allAnswersRes.json()
      }

      // Group answers by response_id
      const answersByResponse: Record<string, Answer[]> = {}
      for (const ans of allAnswers) {
        if (!answersByResponse[ans.response_id]) {
          answersByResponse[ans.response_id] = []
        }
        const list = answersByResponse[ans.response_id]
        if (list) {
          list.push(ans)
        }
      }

      // For each response, build a row
      const rows: string[][] = []

      for (const response of responses) {
        const answersData = answersByResponse[response.id] || []

        // Build a map of questionId -> display value
        const answerMap: Record<string, string> = {}
        for (const answer of answersData) {
          let displayValue = answer.value
          try {
            if (answer.value && (answer.value.startsWith('{') || answer.value.startsWith('['))) {
              const parsed = JSON.parse(answer.value)
              displayValue = parsed.value || answer.value
            }
          } catch {
            // use raw value
          }
          answerMap[answer.question_id] = displayValue
        }

        const row = [
          response.id,
          ...sortedQuestions.map((q) => answerMap[q.id] || ''),
          formatSubmittedDate(response.submitted_at),
        ]
        rows.push(row)
      }

      // Build CSV string
      const escapeCsvField = (field: string) => {
        if (field.includes(',') || field.includes('"') || field.includes('\n')) {
          return `"${field.replace(/"/g, '""')}"`
        }
        return field
      }

      const csvLines = [
        headers.map(escapeCsvField).join(','),
        ...rows.map((row) => row.map(escapeCsvField).join(',')),
      ]
      const csvContent = csvLines.join('\n')

      // Trigger download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `${survey.title.replace(/[^a-zA-Z0-9]/g, '_')}_responses.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('CSV export failed:', err)
      alert('Failed to export responses. Please try again.')
    } finally {
      setIsExporting(false)
    }
  }, [survey, questions, responses])

  const formatSubmittedDate = (dateStr: string) => {
    try {
      // SQLite CURRENT_TIMESTAMP returns "YYYY-MM-DD HH:MM:SS" in UTC.
      // Normalize it to ISO 8601 UTC format (e.g. "YYYY-MM-DDTHH:MM:SSZ") so JS parses it as UTC.
      let normalized = dateStr
      if (dateStr && !dateStr.includes('T') && !dateStr.includes('Z')) {
        normalized = `${dateStr.trim().replace(' ', 'T')}Z`
      }
      const date = new Date(normalized)
      if (Number.isNaN(date.getTime())) return dateStr

      // Return formatted locale date and time
      return date.toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    } catch {
      return dateStr
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
          <span className="text-sm font-medium text-slate-500">Loading responses...</span>
        </div>
      </div>
    )
  }

  if (error || !survey) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md w-full text-center bg-white border border-slate-200 rounded-2xl shadow-md p-8">
          <h2 className="text-lg font-bold text-slate-900">Error Loading Dashboard</h2>
          <p className="text-slate-500 text-sm mt-2">{error}</p>
          <Link to="/dashboard" className="mt-4 inline-block">
            <Button size="sm">Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Navbar */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/dashboard">
            <Button variant="ghost" size="sm" className="gap-1 text-slate-600 hover:text-slate-900">
              <ArrowLeft className="h-4 w-4" /> Dashboard
            </Button>
          </Link>
          <div className="h-4 w-[1px] bg-slate-200" />
          <h2 className="text-base font-bold text-slate-900 line-clamp-1 max-w-[200px] sm:max-w-md">
            {survey.title} Responses
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="gap-1 text-xs font-semibold"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 text-slate-500 ${isRefreshing ? 'animate-spin' : ''}`}
            />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            disabled={isExporting || responses.length === 0}
            className="gap-1 text-xs font-semibold"
          >
            <Download
              className={`h-3.5 w-3.5 text-slate-500 ${isExporting ? 'animate-bounce' : ''}`}
            />
            {isExporting ? 'Exporting...' : 'Export CSV'}
          </Button>
          <Link to="/surveys/$surveyId/edit" params={{ surveyId }}>
            <Button
              size="sm"
              className="gap-1 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              Back to Builder
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-grow max-w-6xl w-full mx-auto px-4 py-8 space-y-6">
        {/* Title Section */}
        <div className="text-left">
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
            Response Analysis
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Review detailed respondent inputs. Click on any response row to read individual answers.
          </p>
        </div>

        {/* Analytics Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 text-left">
          <Card className="bg-white border-slate-200/60 shadow-sm">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Total Submissions
                </p>
                <h3 className="text-2xl font-extrabold text-slate-900 mt-0.5">
                  {responses.length}
                </h3>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-slate-200/60 shadow-sm">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Active Questions
                </p>
                <h3 className="text-2xl font-extrabold text-slate-900 mt-0.5">
                  {questions.length}
                </h3>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-slate-200/60 shadow-sm">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Latest Submission
                </p>
                <h3 className="text-sm font-bold text-slate-800 truncate mt-1">
                  {responses.length > 0 && responses[0]
                    ? formatSubmittedDate(responses[0].submitted_at).split(',')[0]
                    : 'No responses yet'}
                </h3>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Responses Table Card */}
        <Card className="bg-white border-slate-200/80 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
              All Submissions
            </h3>
            <span className="text-xs font-semibold bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">
              {responses.length} rows
            </span>
          </div>

          {responses.length === 0 ? (
            /* Empty Table State */
            <div className="text-center py-20 p-6">
              <div className="mx-auto w-12 h-12 bg-slate-100 text-slate-400 rounded-xl flex items-center justify-center mb-4">
                <ClipboardList className="h-5 w-5" />
              </div>
              <h4 className="text-sm font-bold text-slate-800">No submissions recorded</h4>
              <p className="text-xs text-slate-400 max-w-xs mx-auto mt-1 leading-normal">
                Share your public URL to start collecting answers! Once submitted, answers will show
                up here.
              </p>
              <div className="mt-4">
                <Link to="/s/$surveyId" params={{ surveyId }} target="_blank">
                  <Button size="sm" variant="outline" className="gap-1 text-xs">
                    Open Survey Form <ExternalLink className="h-3 w-3" />
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            /* Table list */
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/30 text-xs font-bold text-slate-500 uppercase tracking-wider select-none">
                    <th className="px-6 py-4">Submission ID</th>
                    <th className="px-6 py-4">Date Submitted</th>
                    <th className="px-6 py-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {responses.map((response) => (
                    <tr
                      key={response.id}
                      onClick={() => handleRowClick(response)}
                      className="hover:bg-slate-50/80 cursor-pointer transition-colors group"
                    >
                      <td className="px-6 py-4 font-mono text-xs text-slate-600 font-medium max-w-[200px] sm:max-w-xs truncate">
                        {response.id}
                      </td>
                      <td className="px-6 py-4 text-slate-700 font-medium">
                        {formatSubmittedDate(response.submitted_at)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs font-semibold text-indigo-600 hover:text-indigo-900 group-hover:translate-x-0.5 transition-transform"
                        >
                          View Answers <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </main>

      {/* Response Answers Dialog Details Modal */}
      <Dialog isOpen={selectedResponse !== null} onClose={handleCloseModal}>
        <DialogHeader>
          <DialogTitle>Submission Details</DialogTitle>
          <DialogDescription className="font-mono text-[10px] uppercase tracking-wide truncate mt-1">
            ID: {selectedResponse?.id}
          </DialogDescription>
        </DialogHeader>

        <DialogContent className="space-y-4 py-2">
          {isLoadingAnswers ? (
            <div className="flex flex-col items-center py-12 gap-2">
              <svg className="animate-spin h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24">
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
              <span className="text-xs text-slate-400 font-semibold">Loading answers...</span>
            </div>
          ) : selectedAnswers.length === 0 ? (
            <p className="text-center py-6 text-xs text-slate-400">
              No responses recorded for this entry.
            </p>
          ) : (
            <div className="space-y-4 divide-y divide-slate-100">
              {selectedAnswers.map((answer, index) => {
                let displayValue = answer.value
                let questionTitle = ''
                let questionType = ''

                try {
                  if (
                    answer.value &&
                    (answer.value.startsWith('{') || answer.value.startsWith('['))
                  ) {
                    const parsed = JSON.parse(answer.value)
                    displayValue = parsed.value
                    questionTitle = parsed.question_title
                    questionType = parsed.question_type
                  }
                } catch {
                  // Ignore parse error
                }

                if (!questionTitle) {
                  const question = questions.find((q) => q.id === answer.question_id)
                  questionTitle = question ? question.title : `Question ${index + 1}`
                  questionType = question ? question.type : 'text'
                }

                return (
                  <div key={answer.id} className="pt-4 first:pt-0 text-left space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">
                      Q{index + 1} — {questionType}
                    </span>
                    <h4 className="text-sm font-bold text-slate-800 leading-tight">
                      {questionTitle}
                    </h4>
                    <div className="bg-slate-50 border border-slate-200/50 rounded-lg p-3 mt-1.5 text-sm text-slate-700 font-medium">
                      {displayValue || <span className="text-slate-400 italic">No response</span>}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </DialogContent>

        <DialogFooter>
          <div className="flex items-center justify-between w-full">
            <span className="text-[10px] text-slate-400 font-medium">
              Submitted: {selectedResponse && formatSubmittedDate(selectedResponse.submitted_at)}
            </span>
            <Button
              size="sm"
              onClick={handleCloseModal}
              className="bg-slate-900 text-white hover:bg-slate-800"
            >
              Close
            </Button>
          </div>
        </DialogFooter>
      </Dialog>
    </div>
  )
}
