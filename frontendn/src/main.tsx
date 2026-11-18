import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import App from './App'
import './index.css'

const storedTheme = localStorage.getItem('commitdev-theme')
if (storedTheme === 'light' || storedTheme === 'dark') document.documentElement.dataset.theme = storedTheme

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 15_000, refetchOnWindowFocus: false } } })

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><QueryClientProvider client={queryClient}><App /><Toaster position="bottom-right" toastOptions={{ duration: 4000 }} /></QueryClientProvider></React.StrictMode>,
)
