import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Open-LegisAI Lite',
  description: 'AI-powered legal document analysis platform for Indonesian regulations - analyze changes, detect conflicts, and generate plain-language summaries.',
  keywords: ['legal', 'indonesia', 'regulation', 'analysis', 'AI', 'document'],
  authors: [{ name: 'Open-LegisAI Team' }],
  robots: 'index, follow',
  openGraph: {
    title: 'Open-LegisAI Lite',
    description: 'AI-powered legal document analysis platform for Indonesian regulations',
    type: 'website',
    locale: 'id_ID',
  }
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="id" className={inter.className}>
      <head>
        <meta name="color-scheme" content="light" />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className="min-h-screen bg-background font-sans antialiased">
        <div className="relative flex min-h-screen flex-col">
          <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-14 items-center">
              <div className="mr-4 hidden md:flex">
                <a 
                  className="mr-6 flex items-center space-x-2" 
                  href="/"
                  aria-label="Open-LegisAI Lite - Home"
                >
                  <span className="hidden font-bold sm:inline-block">
                    Open-LegisAI Lite
                  </span>
                </a>
              </div>
              <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
                <nav className="flex items-center">
                  {/* Navigation will be added later */}
                </nav>
              </div>
            </div>
          </header>
          
          <main className="flex-1">
            {children}
          </main>
          
          <footer className="border-t py-6 md:px-8 md:py-0 no-print">
            <div className="container flex flex-col items-center justify-between gap-4 md:h-24 md:flex-row">
              <div className="flex flex-col items-center gap-4 px-8 md:flex-row md:gap-2 md:px-0">
                <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
                  Open-LegisAI Lite - AI-powered legal document analysis
                </p>
              </div>
              <div className="text-center text-sm text-muted-foreground">
                <strong className="text-orange-600">⚠️ Disclaimer:</strong> AI-generated summaries and analysis. 
                Always verify with official legal sources before making decisions.
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  )
}