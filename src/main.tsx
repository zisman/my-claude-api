import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './contexts/AuthContext'
import { OrgProvider } from './contexts/OrgContext'
import { router } from './router'
import { envReady } from './lib/supabase/client'
import './index.css'

// ─── Error boundary ───────────────────────────────────────────────────────────

interface ErrorBoundaryState { error: Error | null }

class ErrorBoundary extends React.Component<React.PropsWithChildren, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
          <div className="max-w-md w-full bg-white rounded-xl border border-slate-200 shadow-sm p-8 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto">
              <span className="text-red-600 text-xl font-bold">!</span>
            </div>
            <h1 className="text-lg font-semibold text-slate-900">Something went wrong</h1>
            <p className="text-sm text-slate-500">{this.state.error.message}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
            >
              Reload page
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

// ─── Env check ────────────────────────────────────────────────────────────────

function EnvMissingScreen() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
      <div className="max-w-lg w-full bg-white rounded-xl border border-amber-200 shadow-sm p-8 space-y-4">
        <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mx-auto">
          <span className="text-amber-600 text-xl font-bold">⚙</span>
        </div>
        <h1 className="text-lg font-semibold text-slate-900 text-center">Setup required</h1>
        <p className="text-sm text-slate-600 text-center">
          The app needs environment variables to connect to Supabase. Copy{' '}
          <code className="font-mono bg-slate-100 px-1 rounded">.env.example</code> to{' '}
          <code className="font-mono bg-slate-100 px-1 rounded">.env.local</code> and fill in your values.
        </p>
        <div className="bg-slate-900 rounded-lg p-4 font-mono text-xs text-slate-200 space-y-1">
          <p className="text-slate-400"># .env.local</p>
          <p>VITE_SUPABASE_URL=https://your-project.supabase.co</p>
          <p>VITE_SUPABASE_ANON_KEY=your-anon-key</p>
        </div>
        <p className="text-xs text-slate-400 text-center">
          Find these values in your Supabase project under{' '}
          <strong>Project Settings → API</strong>.
        </p>
      </div>
    </div>
  )
}

// ─── Query client ─────────────────────────────────────────────────────────────

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: 1,
    },
  },
})

// ─── Mount ────────────────────────────────────────────────────────────────────

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      {!envReady ? (
        <EnvMissingScreen />
      ) : (
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <OrgProvider>
              <RouterProvider router={router} />
            </OrgProvider>
          </AuthProvider>
        </QueryClientProvider>
      )}
    </ErrorBoundary>
  </React.StrictMode>
)
