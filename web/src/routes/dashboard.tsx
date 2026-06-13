import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import {
  BarChart2,
  Check,
  ClipboardList,
  Copy,
  Edit3,
  Eye,
  LogOut,
  Mail,
  Plus,
  Trash2,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '../components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../components/ui/card'
import { hexToColorName } from '../lib/utils'
import { apiService } from '../services/api'
import type { Survey } from '../types/survey'

export const Route = createFileRoute('/dashboard')({
  component: Dashboard,
})

function Dashboard() {
  const [surveys, setSurveys] = useState<Survey[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const navigate = useNavigate()

  useEffect(() => {
    // Auth Check
    const storedUser = localStorage.getItem('survey_user_email')
    if (!storedUser) {
      navigate({ to: '/' })
      return
    }
    setUserEmail(storedUser)

    // Load Surveys
    loadSurveys()
  }, [])

  const loadSurveys = async () => {
    setIsLoading(true)
    try {
      const data = await apiService.getSurveys()
      setSurveys(data)
      setError('')
    } catch (err) {
      console.error(err)
      setError(
        'Could not load surveys from the backend API. Make sure the backend server is running.',
      )
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateSurvey = async () => {
    try {
      const newSurvey = await apiService.createSurvey('My New Survey')
      // Redirect straight to edit builder
      navigate({ to: '/surveys/$surveyId/edit', params: { surveyId: newSurvey.id } })
    } catch (err) {
      console.error(err)
      alert('Failed to create survey. Please try again.')
    }
  }

  const handleDeleteSurvey = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    if (
      !confirm(
        'Are you sure you want to delete this survey? All associated questions and responses will be removed.',
      )
    ) {
      return
    }
    try {
      await apiService.deleteSurvey(id)
      setSurveys(surveys.filter((s) => s.id !== id))
    } catch (err) {
      console.error(err)
      alert('Failed to delete survey.')
    }
  }

  const handleCopyLink = (surveyId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()

    const url = `${window.location.origin}/s/${surveyId}`
    navigator.clipboard.writeText(url)

    setCopiedId(surveyId)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleSignOut = () => {
    localStorage.removeItem('survey_user_email')
    navigate({ to: '/' })
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 text-white p-2 rounded-xl shadow-sm">
              <ClipboardList className="h-5 w-5" />
            </div>
            <span className="font-bold text-lg tracking-tight text-slate-900">FormFlow</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-lg text-xs font-medium text-slate-600">
              <Mail className="h-3.5 w-3.5" />
              <span>{userEmail}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="text-slate-600 hover:text-rose-600"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline ml-1">Sign Out</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 py-8">
        {/* Welcome Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Surveys</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage, style, share your surveys, and analyze respondent submissions.
            </p>
          </div>
          <Button
            onClick={handleCreateSurvey}
            className="shadow-md bg-indigo-600 hover:bg-indigo-700 font-semibold gap-1.5 flex-shrink-0 self-start sm:self-auto"
          >
            <Plus className="h-4 w-4" /> Create Survey
          </Button>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-sm font-medium flex items-center justify-between">
            <span>{error}</span>
            <Button
              size="sm"
              variant="outline"
              onClick={loadSurveys}
              className="border-amber-300 text-amber-800 bg-amber-100 hover:bg-amber-200"
            >
              Retry Connection
            </Button>
          </div>
        )}

        {isLoading ? (
          /* Loading Skeleton Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-64 rounded-xl border border-slate-200 bg-white animate-pulse p-6 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="h-4 bg-slate-200 rounded w-2/3" />
                  <div className="h-3 bg-slate-200 rounded w-full" />
                  <div className="h-3 bg-slate-200 rounded w-5/6" />
                </div>
                <div className="flex gap-2">
                  <div className="h-8 bg-slate-100 rounded w-1/3" />
                  <div className="h-8 bg-slate-100 rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : surveys.length === 0 ? (
          /* Empty State */
          <div className="text-center py-20 bg-white border border-slate-200/80 rounded-2xl shadow-sm max-w-xl mx-auto">
            <div className="mx-auto w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-4">
              <ClipboardList className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">No surveys found</h3>
            <p className="text-slate-500 text-sm max-w-sm mx-auto mt-2">
              Create your very first survey now to start branding and collecting dynamic responses!
            </p>
            <Button
              onClick={handleCreateSurvey}
              className="mt-6 bg-indigo-600 hover:bg-indigo-700 font-semibold gap-1.5 shadow-sm"
            >
              <Plus className="h-4 w-4" /> Build Your First Survey
            </Button>
          </div>
        ) : (
          /* Survey Cards Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {surveys.map((survey) => (
              <Card
                key={survey.id}
                className="group relative flex flex-col justify-between h-[280px] hover:shadow-md hover:border-slate-300 overflow-hidden bg-white"
              >
                {/* Accent Color Band */}
                <div
                  className="absolute top-0 left-0 w-full h-1.5"
                  style={{ backgroundColor: survey.primary_color || '#4f46e5' }}
                />

                <CardHeader className="pt-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1 select-none">
                      <CardTitle className="line-clamp-1 group-hover:text-indigo-600 transition-colors">
                        {survey.title || 'Untitled Survey'}
                      </CardTitle>
                      <CardDescription className="line-clamp-2 min-h-[40px]">
                        {survey.description || 'No description provided.'}
                      </CardDescription>
                    </div>
                    {survey.logo_url && (
                      <div className="w-10 h-10 border border-slate-100 rounded-lg bg-slate-50 flex items-center justify-center overflow-hidden flex-shrink-0">
                        <img
                          src={survey.logo_url}
                          alt="Logo"
                          className="object-contain max-w-full max-h-full p-1"
                        />
                      </div>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="py-2">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3.5 h-3.5 rounded-full border border-slate-200 flex-shrink-0"
                      style={{ backgroundColor: survey.primary_color || '#4f46e5' }}
                    />
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      {hexToColorName(survey.primary_color || '#4f46e5')}
                    </span>
                  </div>
                </CardContent>

                <CardFooter className="grid grid-cols-2 gap-2 border-t border-slate-100 bg-slate-50/50 p-4">
                  <Link
                    to="/surveys/$surveyId/edit"
                    params={{ surveyId: survey.id }}
                    className="w-full"
                  >
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-center text-xs font-semibold gap-1"
                    >
                      <Edit3 className="h-3.5 w-3.5 text-slate-500" /> Build
                    </Button>
                  </Link>

                  <Link
                    to="/surveys/$surveyId/responses"
                    params={{ surveyId: survey.id }}
                    className="w-full"
                  >
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-center text-xs font-semibold gap-1"
                    >
                      <BarChart2 className="h-3.5 w-3.5 text-indigo-500" /> Responses
                    </Button>
                  </Link>

                  <div className="col-span-2 flex gap-2 mt-1">
                    <Link
                      to="/s/$surveyId"
                      params={{ surveyId: survey.id }}
                      target="_blank"
                      className="flex-1"
                    >
                      <Button
                        size="sm"
                        className="w-full justify-center text-xs font-bold gap-1 bg-slate-900 text-white hover:bg-slate-800"
                      >
                        <Eye className="h-3.5 w-3.5" /> View Live
                      </Button>
                    </Link>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => handleCopyLink(survey.id, e)}
                      className="flex-shrink-0 px-2.5 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                      title="Copy Public Link"
                    >
                      {copiedId === survey.id ? (
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => handleDeleteSurvey(survey.id, e)}
                      className="flex-shrink-0 px-2.5 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-colors"
                      title="Delete Survey"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
