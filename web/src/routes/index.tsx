import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { ArrowRight, ClipboardList, Layout, Palette, Sparkles } from 'lucide-react'
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
import { Input } from '../components/ui/input'

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    // If already signed in, check session and optionally prefill or direct to dashboard
    const storedUser = localStorage.getItem('survey_user_email')
    if (storedUser) {
      setEmail(storedUser)
    }
  }, [])

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) {
      setError('Please enter a valid email address.')
      return
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Please enter a valid email format (e.g. name@example.com).')
      return
    }

    setError('')
    setIsLoading(true)

    // Simulate network sign-in delay
    setTimeout(() => {
      localStorage.setItem('survey_user_email', email)
      setIsLoading(false)
      navigate({ to: '/dashboard' })
    }, 800)
  }

  return (
    <div className="relative min-h-screen bg-slate-50 flex flex-col justify-between overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-indigo-100 rounded-full blur-[120px] opacity-70 -translate-y-1/2 -translate-x-1/2 -z-10" />
      <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-violet-100 rounded-full blur-[140px] opacity-60 translate-y-1/2 translate-x-1/2 -z-10" />

      {/* Navigation Header */}
      <header className="px-6 py-5 flex items-center justify-between max-w-6xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-600 text-white p-2 rounded-xl shadow-md">
            <ClipboardList className="h-6 w-6" />
          </div>
          <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-slate-900 to-indigo-950 bg-clip-text text-transparent">
            FormFlow
          </span>
        </div>
        <div className="text-xs font-semibold px-3 py-1.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
          SDE Intern Assignment
        </div>
      </header>

      {/* Hero section & Login Card */}
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="max-w-5xl w-full grid md:grid-cols-12 gap-12 items-center">
          {/* Left Column: Copy */}
          <div className="md:col-span-7 space-y-6 text-left">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-slate-200 text-xs font-medium text-slate-800 shadow-sm">
              <Sparkles className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
              <span>Modern Survey Builder MVP</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 leading-tight">
              Create gorgeous, <br />
              <span className="text-indigo-600">branded surveys</span> in seconds.
            </h1>
            <p className="text-base text-slate-600 max-w-lg leading-relaxed">
              Design conversational surveys styled like Tally and Typeform. Configure custom colors,
              logo branding, and view responses in a real-time analytics dashboard.
            </p>

            {/* Benefit Bullets */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
                  <Layout className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-slate-800">Intuitive Builder</h4>
                  <p className="text-xs text-slate-500">
                    Drag-and-drop questions to reorder with a live styling panel.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                  <Palette className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-slate-800">Custom Brand Identity</h4>
                  <p className="text-xs text-slate-500">
                    Apply custom primary colors, descriptions, and brand logos.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Sign In Card */}
          <div className="md:col-span-5 w-full max-w-md mx-auto">
            <Card className="shadow-xl border-slate-200/80 bg-white/85 backdrop-blur-md">
              <CardHeader className="space-y-1">
                <CardTitle className="text-2xl font-bold tracking-tight text-center">
                  Sign in to your account
                </CardTitle>
                <CardDescription className="text-center">
                  Enter your email address to enter your survey dashboard.
                </CardDescription>
              </CardHeader>
              <form onSubmit={handleSignIn}>
                <CardContent className="space-y-4">
                  <div className="space-y-2 text-left">
                    <label
                      htmlFor="email"
                      className="text-xs font-semibold text-slate-700 tracking-wide uppercase"
                    >
                      Email Address
                    </label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isLoading}
                      className="bg-slate-50/50"
                    />
                    {error && <p className="text-xs text-rose-500 font-medium">{error}</p>}
                  </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-3">
                  <Button
                    type="submit"
                    className="w-full flex justify-center py-5 font-semibold"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <span className="flex items-center gap-2">
                        <svg
                          className="animate-spin h-4 w-4 text-white"
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
                        Logging in...
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5">
                        Get Started <ArrowRight className="h-4 w-4" />
                      </span>
                    )}
                  </Button>
                  <p className="text-[10px] text-center text-slate-400">
                    No password required. A sandbox developer session will be generated locally.
                  </p>
                </CardFooter>
              </form>
            </Card>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 border-t border-slate-200/50 bg-white/20 text-center text-xs text-slate-500">
        <div>FormFlow &copy; 2026. Made with ❤️ for the SDE Intern take-home assignment.</div>
      </footer>
    </div>
  )
}
