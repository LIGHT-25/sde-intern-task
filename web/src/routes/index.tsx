import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { ArrowRight, ClipboardList, Layout, Palette } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '../components/ui/button'

// Add CSS animations for bouncy letters with a travelling highlight
const styles = `
  @keyframes bounce-letter {
    0%, 100% { transform: translateY(0) scaleX(1); }
    50% { transform: translateY(-5px) scaleX(1.02); }
  }

  @keyframes color-wave {
    0%, 20%, 100% { color: #1e293b; text-shadow: none; }
    10%, 12% { color: #7c3aed; text-shadow: 0 0 12px rgba(124, 58, 237, 0.4); }
  }

  @keyframes glitch {
    0% { transform: translateX(0) skewX(0deg); }
    20% { transform: translateX(-2px) skewX(-1deg); }
    40% { transform: translateX(2px) skewX(1deg); }
    60% { transform: translateX(-1px) skewX(-0.5deg); }
    80% { transform: translateX(1px) skewX(0.5deg); }
    100% { transform: translateX(0) skewX(0deg); }
  }

  .bounce-char {
    display: inline-block;
    animation: bounce-letter 0.6s ease-in-out infinite;
    color: #1e293b;
    font-weight: 600;
  }

  .bounce-char.motion {
    animation: bounce-letter 0.55s ease-in-out infinite, color-wave 4s linear infinite;
    animation-fill-mode: both;
  }

  .bounce-char:nth-child(1) { animation-delay: 0s, 0s; }
  .bounce-char:nth-child(2) { animation-delay: 0s, 0.15s; }
  .bounce-char:nth-child(3) { animation-delay: 0s, 0.3s; }
  .bounce-char:nth-child(4) { animation-delay: 0s, 0.45s; }
  .bounce-char:nth-child(5) { animation-delay: 0s, 0.6s; }
  .bounce-char:nth-child(6) { animation-delay: 0s, 0.75s; }
  .bounce-char:nth-child(7) { animation-delay: 0s, 0.9s; }
  .bounce-char:nth-child(8) { animation-delay: 0s, 1.05s; }
  .bounce-char:nth-child(9) { animation-delay: 0s, 1.2s; }
  .bounce-char:nth-child(10) { animation-delay: 0s, 1.35s; }
  .bounce-char:nth-child(11) { animation-delay: 0s, 1.5s; }
  .bounce-char:nth-child(12) { animation-delay: 0s, 1.65s; }
  .bounce-char:nth-child(13) { animation-delay: 0s, 1.8s; }
  .bounce-char:nth-child(14) { animation-delay: 0s, 1.95s; }
  .bounce-char:nth-child(15) { animation-delay: 0s, 2.1s; }
  .bounce-char:nth-child(16) { animation-delay: 0s, 2.25s; }
  .bounce-char:nth-child(17) { animation-delay: 0s, 2.4s; }
  .bounce-char:nth-child(18) { animation-delay: 0s, 2.55s; }
  .bounce-char:nth-child(19) { animation-delay: 0s, 2.7s; }
  .bounce-char:nth-child(20) { animation-delay: 0s, 2.85s; }
  .bounce-char:nth-child(21) { animation-delay: 0s, 3s; }
  .bounce-char:nth-child(22) { animation-delay: 0s, 3.15s; }
  .bounce-char:nth-child(23) { animation-delay: 0s, 3.3s; }
  .bounce-char:nth-child(24) { animation-delay: 0s, 3.45s; }
  .bounce-char:nth-child(25) { animation-delay: 0s, 3.6s; }

  .glitch-badge:hover .bounce-char.motion {
    animation-direction: reverse, reverse;
  }

  .glitch-badge:hover .bounce-char {
    animation-name: bounce-letter, color-wave;
    animation-duration: 0.55s, 4s;
    animation-iteration-count: infinite, infinite;
  }
`

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
      <style>{styles}</style>
      {/* Background Gradients - Optimized for mobile */}
      <div className="absolute top-0 left-1/4 w-[300px] h-[300px] sm:w-[500px] sm:h-[500px] bg-indigo-100 rounded-full blur-[80px] sm:blur-[120px] opacity-50 sm:opacity-70 -translate-y-1/2 -translate-x-1/2 -z-10" />
      <div className="absolute bottom-0 right-1/4 w-[300px] h-[300px] sm:w-[600px] sm:h-[600px] bg-violet-100 rounded-full blur-[80px] sm:blur-[140px] opacity-40 sm:opacity-60 translate-y-1/2 translate-x-1/2 -z-10" />

      {/* Navigation Header */}
      <header className="px-4 sm:px-6 py-4 sm:py-5 flex items-center justify-between max-w-6xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-600 text-white p-1.5 sm:p-2 rounded-lg sm:rounded-xl shadow-md">
            <ClipboardList className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <span className="font-bold text-lg sm:text-xl tracking-tight bg-gradient-to-r from-slate-900 to-indigo-950 bg-clip-text text-transparent">
            FormFlow
          </span>
        </div>
        <div className="hidden sm:flex text-xs font-semibold px-3 py-1.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
          SDE Intern Assignment
        </div>
      </header>

      {/* Hero section & Login Card */}
      <main className="flex-1 flex items-center justify-center px-3 sm:px-4 py-6 sm:py-8">
        <div className="max-w-5xl w-full grid grid-cols-1 md:grid-cols-12 gap-6 sm:gap-8 md:gap-12 items-center">
          {/* Left Column: Copy */}
          <div className="md:col-span-7 space-y-4 sm:space-y-6 text-left">
            <div className="inline-flex items-center gap-0 px-4 sm:px-5 py-2 sm:py-2.5 rounded-full bg-white border-2 border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-300 glitch-badge">
              <span className="text-xs sm:text-sm tracking-wide whitespace-nowrap overflow-hidden">
                {'Welcome To OUR Survey BUILDER'.split('').map((char, i) => (
                  <span key={i} className="bounce-char motion">
                    {char === ' ' ? '\u00A0' : char}
                  </span>
                ))}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 leading-tight">
              Create gorgeous, <br className="hidden sm:block" />
              <span className="text-indigo-600">branded surveys</span> in seconds.
            </h1>
            <p className="text-sm sm:text-base text-slate-600 max-w-lg leading-relaxed">
              Design conversational surveys styled like Tally and Typeform. Configure custom colors,
              logo branding, and view responses in a real-time analytics dashboard.
            </p>

            {/* Benefit Bullets */}
            <div className="space-y-3 sm:space-y-4 pt-2">
              <div className="flex items-start gap-2 sm:gap-3">
                <div className="flex-shrink-0 p-1 sm:p-1.5 bg-emerald-50 text-emerald-600 rounded-lg mt-1">
                  <Layout className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
                <div className="min-w-0">
                  <h4 className="font-semibold text-xs sm:text-sm text-slate-800">
                    Intuitive Builder
                  </h4>
                  <p className="text-[11px] sm:text-xs text-slate-500 leading-snug">
                    Drag-and-drop questions to reorder with a live styling panel.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2 sm:gap-3">
                <div className="flex-shrink-0 p-1 sm:p-1.5 bg-indigo-50 text-indigo-600 rounded-lg mt-1">
                  <Palette className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
                <div className="min-w-0">
                  <h4 className="font-semibold text-xs sm:text-sm text-slate-800">
                    Custom Brand Identity
                  </h4>
                  <p className="text-[11px] sm:text-xs text-slate-500 leading-snug">
                    Apply custom primary colors, descriptions, and brand logos.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Sign In Card */}
          <div className="md:col-span-5 w-full max-w-md mx-auto">
            <Card className="shadow-lg sm:shadow-xl border-slate-200/80 bg-white/85 backdrop-blur-md">
              <CardHeader className="space-y-1 px-4 sm:px-6 py-4 sm:py-6">
                <CardTitle className="text-xl sm:text-2xl font-bold tracking-tight text-center">
                  Sign in to your account
                </CardTitle>
                <CardDescription className="text-center text-xs sm:text-sm">
                  Enter your email address to enter your survey dashboard.
                </CardDescription>
              </CardHeader>
              <form onSubmit={handleSignIn}>
                <CardContent className="space-y-4 px-4 sm:px-6 py-3 sm:py-4">
                  <div className="space-y-2 text-left">
                    <label
                      htmlFor="email"
                      className="text-[11px] sm:text-xs font-semibold text-slate-700 tracking-wide uppercase"
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
                      className="bg-slate-50/50 text-sm sm:text-base"
                    />
                    {error && <p className="text-xs text-rose-500 font-medium">{error}</p>}
                  </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-3 px-4 sm:px-6 py-4 sm:py-6">
                  <Button
                    type="submit"
                    className="w-full flex justify-center py-4 sm:py-5 font-semibold text-sm sm:text-base"
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
                  <p className="text-[10px] sm:text-xs text-center text-slate-400 leading-tight">
                    No password required. A sandbox developer session will be generated locally.
                  </p>
                </CardFooter>
              </form>
            </Card>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 sm:py-6 px-3 sm:px-6 border-t border-slate-200/50 bg-white/20 text-center text-xs text-slate-500">
        <div className="text-[11px] sm:text-xs">
          FormFlow &copy; 2026. Made with ❤️ for the SDE Intern take-home assignment.
        </div>
      </footer>
    </div>
  )
}
