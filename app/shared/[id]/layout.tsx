import { Metadata } from 'next';
import { ReactNode } from 'react';

interface LayoutProps {
  children: ReactNode;
  params: Promise<{ id: string }>;
}

// This layout provides additional SEO optimization and print-friendly styles
export default async function SharedLayout({ children, params }: LayoutProps) {
  const { id } = await params; // Await the params in Next.js 15
  
  return (
    <>
      {/* Print-specific styles - moved to CSS module or global styles */}
      <style dangerouslySetInnerHTML={{
        __html: `
        /* Print-friendly CSS */
        @media print {
          .print\\:hidden {
            display: none !important;
          }
          
          .print\\:block {
            display: block !important;
          }
          
          .print\\:mt-4 {
            margin-top: 1rem !important;
          }
          
          /* Page setup */
          @page {
            size: A4;
            margin: 2cm 1.5cm;
            @top-center {
              content: "Open-LegisAI - Analisis Dokumen Hukum";
              font-size: 10px;
              color: #666;
            }
            @bottom-center {
              content: "Halaman " counter(page) " dari " counter(pages);
              font-size: 10px;
              color: #666;
            }
          }
          
          /* Layout adjustments for print */
          body {
            font-size: 12pt;
            line-height: 1.4;
            color: #000;
            background: #fff;
          }
          
          .print-layout {
            background: #fff !important;
          }
          
          /* Hide interactive elements */
          button, 
          .print\\:hidden,
          nav,
          .social-share,
          .actions {
            display: none !important;
          }
          
          /* Optimize content for print */
          h1 {
            font-size: 18pt;
            margin-bottom: 12pt;
            color: #000;
            page-break-after: avoid;
          }
          
          h2 {
            font-size: 14pt;
            margin-top: 16pt;
            margin-bottom: 8pt;
            color: #000;
            page-break-after: avoid;
          }
          
          h3 {
            font-size: 12pt;
            margin-top: 12pt;
            margin-bottom: 6pt;
            color: #000;
            page-break-after: avoid;
          }
          
          p {
            margin-bottom: 8pt;
            text-align: justify;
            orphans: 3;
            widows: 3;
          }
          
          /* Card and container adjustments */
          .card,
          .border,
          .shadow,
          .rounded {
            border: 1px solid #e5e7eb !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            background: #fff !important;
          }
          
          /* List formatting */
          ul, ol {
            margin-bottom: 12pt;
          }
          
          li {
            margin-bottom: 4pt;
          }
          
          /* Table formatting */
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 12pt;
          }
          
          th, td {
            border: 1px solid #000;
            padding: 6pt;
            text-align: left;
            font-size: 10pt;
          }
          
          th {
            background: #f3f4f6;
            font-weight: bold;
          }
          
          /* Avoid breaking elements */
          .no-break {
            page-break-inside: avoid;
          }
          
          /* Ensure good contrast */
          .text-gray-600 {
            color: #4b5563 !important;
          }
          
          .text-gray-500 {
            color: #6b7280 !important;
          }
          
          /* Watermark for print */
          .print-watermark {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-45deg);
            font-size: 60pt;
            color: rgba(0, 0, 0, 0.05);
            z-index: -1;
            font-weight: bold;
            pointer-events: none;
          }
          
          /* Links in print */
          a {
            color: #000 !important;
            text-decoration: underline;
          }
          
          a[href]:after {
            content: " (" attr(href) ")";
            font-size: 9pt;
            color: #666;
          }
          
          /* Remove hover effects */
          *:hover {
            background: transparent !important;
            color: inherit !important;
          }
        }
        
        /* Screen-specific optimizations */
        @media screen {
          /* Smooth scrolling */
          html {
            scroll-behavior: smooth;
          }
          
          /* Focus indicators */
          *:focus {
            outline: 2px solid #3b82f6;
            outline-offset: 2px;
          }
          
          /* High contrast mode support */
          @media (prefers-contrast: high) {
            .bg-gray-50 {
              background-color: #ffffff !important;
            }
            
            .text-gray-600 {
              color: #000000 !important;
            }
            
            .border-gray-200 {
              border-color: #000000 !important;
            }
          }
          
          /* Reduced motion support */
          @media (prefers-reduced-motion: reduce) {
            *,
            *::before,
            *::after {
              animation-duration: 0.01ms !important;
              animation-iteration-count: 1 !important;
              transition-duration: 0.01ms !important;
            }
          }
        }`
      }} />
      
      {/* Additional meta tags for shared content */}
      <meta name="robots" content="index, follow, max-image-preview:large" />
      <meta name="googlebot" content="index, follow" />
      <meta name="format-detection" content="telephone=no" />
      <meta name="theme-color" content="#3b82f6" />
      
      {/* Language and region */}
      <meta httpEquiv="content-language" content="id-ID" />
      <meta name="geo.region" content="ID" />
      <meta name="geo.country" content="Indonesia" />
      
      {/* Security headers */}
      <meta httpEquiv="X-Content-Type-Options" content="nosniff" />
      <meta httpEquiv="Referrer-Policy" content="strict-origin-when-cross-origin" />
      
      {/* Preconnect to external domains */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      
      {/* DNS prefetch for social sharing */}
      <link rel="dns-prefetch" href="//www.facebook.com" />
      <link rel="dns-prefetch" href="//twitter.com" />
      <link rel="dns-prefetch" href="//www.linkedin.com" />
      
      {children}
    </>
  );
}

// Additional metadata that applies to all shared pages
export const metadata: Metadata = {
  robots: {
    index: true,
    follow: true,
    'max-image-preview': 'large',
    'max-snippet': -1,
    'max-video-preview': -1,
  },
  verification: {
    // Add search engine verification codes here when available
    // google: 'your-google-verification-code',
    // bing: 'your-bing-verification-code',
  },
  category: 'Legal Analysis',
  classification: 'Public Document Analysis',
  other: {
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'black-translucent',
    'mobile-web-app-capable': 'yes',
    'msapplication-TileColor': '#3b82f6',
    'msapplication-config': '/browserconfig.xml',
  },
};