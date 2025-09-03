# Button Functionality Fix - "Mulai Analisis Dokumen" and "Lihat Contoh"

---

## Goal

**Feature Goal**: Fix two non-functional buttons on the home page that are critical for user engagement and core application functionality

**Deliverable**: Working onClick handlers for both buttons with appropriate user interactions - "Mulai Analisis Dokumen" should consistently trigger file upload interface, and "Lihat Contoh" should display demo/example content

**Success Definition**: Both buttons respond immediately to user clicks with visible UI changes and proper functionality

## User Persona

**Target User**: Indonesian citizens, journalists, CSOs, and DPRD secretariat staff who need to analyze legal documents

**Use Case**: First-time visitors clicking primary action buttons to either start document analysis or view examples of the platform's capabilities

**User Journey**: 
1. User lands on home page
2. User sees two prominent buttons: "Mulai Analisis Dokumen" and "Lihat Contoh"
3. User clicks either button expecting immediate response
4. **Current state**: Buttons are unresponsive, causing user frustration and abandonment
5. **Desired state**: Buttons immediately respond with appropriate functionality

**Pain Points Addressed**: 
- Broken user experience preventing platform adoption
- No way to view examples or understand platform capabilities
- Failed first impression leading to user abandonment

## Why

- **Business Value**: These are the primary entry points to the application - broken buttons mean zero user conversion
- **Integration**: The "Mulai Analisis" button is the main path to the document processing pipeline
- **Problems Solved**: Critical UX failure preventing users from accessing any platform functionality

## What

**"Mulai Analisis Dokumen" Button Fix:**
- Debug existing onClick handler that calls `setShowUpload(true)`
- Ensure consistent state management and UI response
- Verify FileUpload component integration

**"Lihat Contoh" Button Implementation:**
- Add missing onClick handler
- Implement demo/example functionality showing platform capabilities
- Create modal or page section displaying sample document analysis

### Success Criteria

- [ ] "Mulai Analisis Dokumen" button consistently shows file upload interface on click
- [ ] "Lihat Contoh" button opens demo/example content immediately on click  
- [ ] Both buttons provide visual feedback (hover states, loading states if applicable)
- [ ] No JavaScript errors in browser console when clicking buttons
- [ ] Responsive behavior works across desktop and mobile devices

## All Needed Context

### Context Completeness Check

✅ **Validation**: This PRP provides complete implementation context for fixing the broken button functionality, including specific file locations, existing patterns, and actionable implementation steps.

### Documentation & References

```yaml
# CRITICAL READING - Current Implementation Analysis
- file: app/page.tsx
  why: Contains both problematic buttons and existing onClick pattern
  pattern: Lines 27-30 show working onClick pattern, lines 31-33 show broken pattern
  gotcha: useState hook already exists for upload interface, missing onClick handler for "Lihat Contoh"

- file: app/components/upload/FileUpload.tsx
  why: Target component that should display when "Mulai Analisis" is clicked
  pattern: Comprehensive file upload component with proper error handling
  gotcha: Component expects onUploadComplete and onUploadError callbacks

# TECHNICAL IMPLEMENTATION PATTERNS
- url: https://nextjs.org/docs/app/building-your-application/routing/linking-and-navigating
  why: Next.js 15 App Router patterns for navigation and state management
  critical: Must use 'use client' directive for interactive components with onClick handlers

- url: https://react.dev/learn/responding-to-events
  why: React event handling best practices and common onClick patterns
  critical: Function references vs function calls in onClick handlers

# UI/COMPONENT PATTERNS  
- url: https://ui.shadcn.com/docs/components/button
  why: shadcn/ui Button component API and interaction patterns
  critical: Variant and size props for consistent styling

- url: https://ui.shadcn.com/docs/components/dialog
  why: Dialog/modal patterns for implementing "Lihat Contoh" demo functionality
  critical: Accessibility requirements for modal interactions
```

### Current Codebase Tree

```bash
C:\Users\ryang\Documents\SkyAero Studio\Projects\open-legis-ai-lite\
├── app/
│   ├── page.tsx                     # ⚠️ CONTAINS BROKEN BUTTONS (lines 27-33)
│   ├── layout.tsx                   # Root layout with metadata
│   ├── globals.css                  # Global styles
│   └── components/
│       ├── ui/                      # shadcn/ui components
│       │   ├── button.tsx          # Button component used by broken buttons
│       │   ├── card.tsx            # Card component for demo content
│       │   └── progress.tsx        # Progress component
│       └── upload/
│           ├── FileUpload.tsx       # Target component for "Mulai Analisis" button
│           ├── FileCard.tsx         # Document display component
│           └── ProcessingStatus.tsx # Status indicator component
├── PRPs/                            # Product Requirement Prompts
└── CLAUDE.md                        # Development workflow guidelines
```

### Desired Codebase Tree with Files to be Modified

```bash
app/
├── page.tsx                         # ✏️ MODIFY: Add onClick handler for "Lihat Contoh"
├── components/
│   └── demo/
│       └── ExampleDemo.tsx          # 🆕 CREATE: Demo component for "Lihat Contoh" 
└── lib/
    └── demo-data.ts                 # 🆕 CREATE: Sample data for demo functionality
```

### Known Gotchas & Library Quirks

```typescript
// CRITICAL: Next.js App Router requires 'use client' directive for interactive components
// File: app/page.tsx already has 'use client' - no changes needed

// React useState behavior - state updates are asynchronous
// Existing pattern: setShowUpload(true) should trigger re-render immediately
// If not working, check for JavaScript errors or conflicting state

// shadcn/ui Button component patterns
// Working pattern: <Button onClick={handler}>Text</Button>
// Broken pattern: <Button>Text</Button> (missing onClick)

// Modal/Dialog accessibility requirements
// Must handle ESC key, focus management, and click-outside-to-close
```

## Implementation Blueprint

### Data Models and Structure

**Demo Data Structure for "Lihat Contoh" functionality:**

```typescript
// app/lib/demo-data.ts
export interface DemoDocument {
  title: string;
  summary: string;
  changes: Array<{
    type: 'added' | 'modified' | 'deleted';
    clause: string;
    description: string;
  }>;
  conflicts: Array<{
    law: string;
    description: string;
    severity: 'low' | 'medium' | 'high';
  }>;
}

export const sampleAnalysis: DemoDocument = {
  title: "Peraturan Daerah tentang Pajak Hotel - Revisi 2024",
  summary: "Peraturan ini mengatur tarif pajak hotel yang naik dari 10% menjadi 12% untuk hotel berbintang...",
  changes: [
    {
      type: 'modified',
      clause: 'Pasal 5 Ayat 1',
      description: 'Perubahan tarif pajak dari 10% menjadi 12%'
    }
  ],
  conflicts: [
    {
      law: "UU No. 28 Tahun 2009 tentang PDRD",
      description: "Potensi tumpang tindih dalam definisi hotel",
      severity: 'medium'
    }
  ]
};
```

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: MODIFY app/page.tsx
  - DEBUG: Existing "Mulai Analisis Dokumen" button onClick handler (line 27-30)
  - ADD: onClick handler for "Lihat Contoh" button (line 31-33)
  - IMPLEMENT: useState hook for demo modal state management
  - FOLLOW pattern: Existing setShowUpload pattern for consistent state handling
  - NAMING: setShowDemo(boolean) state handler

Task 2: CREATE app/lib/demo-data.ts
  - IMPLEMENT: DemoDocument interface and sampleAnalysis constant
  - CONTENT: Realistic Indonesian legal document example data
  - PURPOSE: Provide meaningful demo content for "Lihat Contoh" functionality
  - PLACEMENT: Utility data in app/lib/ directory

Task 3: CREATE app/components/demo/ExampleDemo.tsx
  - IMPLEMENT: Modal component displaying demo document analysis
  - FOLLOW pattern: FileUpload component structure and shadcn/ui patterns
  - INCLUDE: Sample summary, changes visualization, conflict detection display
  - ACCESSIBILITY: ESC key handling, focus management, click-outside-to-close
  - STYLING: Match existing design system and card layouts from home page

Task 4: INTEGRATE Demo Component in app/page.tsx
  - IMPORT: ExampleDemo component and demo data
  - RENDER: Conditionally display demo modal based on showDemo state
  - CONNECT: Demo component props with close handler
  - PRESERVE: Existing upload functionality and layout structure

Task 5: VALIDATE Button Interactions
  - TEST: Both buttons respond immediately to clicks
  - VERIFY: No JavaScript console errors during interactions
  - CHECK: Modal accessibility with keyboard navigation
  - CONFIRM: Responsive behavior on mobile devices
```

### Implementation Patterns & Key Details

```typescript
// Button Fix Pattern - app/page.tsx
export default function HomePage() {
  const [showUpload, setShowUpload] = useState(false);
  const [showDemo, setShowDemo] = useState(false); // 🆕 ADD: Demo state

  return (
    <div className="container py-8 md:py-12 lg:py-16">
      {/* Existing content */}
      <div className="mt-8">
        {/* ✅ WORKING BUTTON - Debug if needed */}
        <Button size="lg" className="mr-4" onClick={() => setShowUpload(true)}>
          <Upload className="mr-2 h-5 w-5" />
          Mulai Analisis Dokumen
        </Button>
        
        {/* 🔧 BROKEN BUTTON - Add onClick handler */}
        <Button variant="outline" size="lg" onClick={() => setShowDemo(true)}>
          Lihat Contoh
        </Button>
      </div>

      {/* 🆕 ADD: Demo Modal */}
      {showDemo && (
        <ExampleDemo 
          isOpen={showDemo}
          onClose={() => setShowDemo(false)}
          demoData={sampleAnalysis}
        />
      )}

      {/* Existing upload section */}
      {showUpload && (
        <div className="mx-auto mt-16 max-w-4xl">
          <FileUpload 
            onUploadComplete={(result) => {
              console.log('Upload completed:', result);
              window.location.href = `/${result.document.id}`;
            }}
            onUploadError={(error) => {
              console.error('Upload error:', error);
            }}
          />
        </div>
      )}
    </div>
  );
}

// Demo Component Pattern - app/components/demo/ExampleDemo.tsx
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, FileText, AlertTriangle } from 'lucide-react';
import type { DemoDocument } from '@/lib/demo-data';

interface ExampleDemoProps {
  isOpen: boolean;
  onClose: () => void;
  demoData: DemoDocument;
}

export default function ExampleDemo({ isOpen, onClose, demoData }: ExampleDemoProps) {
  // 🔑 CRITICAL: Handle ESC key for accessibility
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden'; // Prevent background scroll
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => {
        // 🔑 CRITICAL: Close on backdrop click
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="max-w-4xl w-full mx-4 bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold">Contoh Analisis Dokumen</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="p-6 max-h-96 overflow-y-auto">
          {/* Document Title */}
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <FileText className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">{demoData.title}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{demoData.summary}</p>
            </CardContent>
          </Card>

          {/* Changes Section */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Perubahan Terdeteksi</CardTitle>
              <CardDescription>
                {demoData.changes.length} perubahan ditemukan dalam dokumen ini
              </CardDescription>
            </CardHeader>
            <CardContent>
              {demoData.changes.map((change, index) => (
                <div key={index} className="flex items-start space-x-3 p-3 border rounded-lg mb-3">
                  <span className={`px-2 py-1 text-xs rounded ${
                    change.type === 'added' ? 'bg-green-100 text-green-800' :
                    change.type === 'modified' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {change.type === 'added' ? 'Ditambah' :
                     change.type === 'modified' ? 'Diubah' : 'Dihapus'}
                  </span>
                  <div>
                    <p className="font-medium">{change.clause}</p>
                    <p className="text-sm text-muted-foreground">{change.description}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Conflicts Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                <span>Potensi Konflik</span>
              </CardTitle>
              <CardDescription>
                {demoData.conflicts.length} potensi konflik dengan peraturan yang ada
              </CardDescription>
            </CardHeader>
            <CardContent>
              {demoData.conflicts.map((conflict, index) => (
                <div key={index} className="p-3 border rounded-lg mb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">{conflict.law}</p>
                      <p className="text-sm text-muted-foreground">{conflict.description}</p>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded ${
                      conflict.severity === 'high' ? 'bg-red-100 text-red-800' :
                      conflict.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {conflict.severity === 'high' ? 'Tinggi' :
                       conflict.severity === 'medium' ? 'Sedang' : 'Rendah'}
                    </span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
        
        <div className="p-6 border-t bg-gray-50">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              Ini adalah contoh analisis. Unggah dokumen untuk analisis sesungguhnya.
            </p>
            <Button onClick={() => { onClose(); /* Could also trigger setShowUpload(true) */ }}>
              Mulai Analisis
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

### Integration Points

```yaml
STATE_MANAGEMENT:
  - existing: showUpload state for file upload interface
  - add: showDemo state for example modal
  - pattern: "useState(false) with setter functions"

COMPONENT_INTEGRATION:
  - existing: FileUpload component integration
  - add: ExampleDemo component integration
  - pattern: "Conditional rendering based on state"

UI_CONSISTENCY:
  - follow: Existing shadcn/ui Button, Card, and layout patterns
  - maintain: Color scheme and typography from current design
  - ensure: Responsive behavior matches existing components
```

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run after each file creation/modification
npm run lint                         # ESLint validation for TypeScript files
npm run type-check                   # TypeScript type checking (if available)
npx tsc --noEmit                    # Alternative TypeScript checking

# Browser console validation
# Open http://localhost:3000 and check browser DevTools console for errors
# Expected: No JavaScript errors when clicking either button
```

### Level 2: Unit Tests (Component Validation)

```bash
# Component testing (if test framework exists)
npm run test                         # Run existing test suite
npm run test -- --watch             # Watch mode for development

# Manual component testing
npm run dev                          # Start development server
# Navigate to http://localhost:3000
# Click both buttons and verify expected behavior
# Expected: Immediate UI response, no console errors, proper modal behavior
```

### Level 3: Integration Testing (System Validation)

```bash
# Full application testing
npm run dev                          # Start development server
curl -f http://localhost:3000        # Verify page loads successfully

# Interactive testing sequence:
# 1. Click "Mulai Analisis Dokumen" → Should show file upload interface
# 2. Click "Lihat Contoh" → Should open demo modal
# 3. Press ESC key in modal → Should close demo modal
# 4. Click backdrop of modal → Should close demo modal
# 5. Test on mobile viewport → Should be responsive

# Performance validation
lighthouse http://localhost:3000     # Lighthouse audit for performance/accessibility
# Expected: No significant performance degradation from modal implementation
```

### Level 4: Creative & Domain-Specific Validation

```bash
# Accessibility Testing
axe-core http://localhost:3000       # Automated accessibility scanning
# Manual keyboard navigation testing
# Tab through all interactive elements, verify focus management in modal

# Cross-browser Testing
# Test in Chrome, Firefox, Safari (if available)
# Verify button interactions work consistently across browsers

# Mobile Testing
# Test on actual mobile devices or browser dev tools mobile simulation
# Verify touch interactions work properly

# User Experience Validation
# Time the response from button click to UI change (should be < 100ms)
# Verify demo content is meaningful and representative
# Check that demo leads users toward actual functionality

# Expected: Full accessibility compliance, cross-browser compatibility, optimal UX
```

## Final Validation Checklist

### Technical Validation

- [ ] Both buttons respond immediately to clicks without console errors
- [ ] "Mulai Analisis Dokumen" consistently shows file upload interface
- [ ] "Lihat Contoh" opens demo modal with sample content
- [ ] Modal closes properly with ESC key, close button, and backdrop click
- [ ] No TypeScript errors: `npx tsc --noEmit`
- [ ] No linting errors: `npm run lint`

### Feature Validation

- [ ] Demo content accurately represents platform capabilities
- [ ] Modal is accessible with proper keyboard navigation
- [ ] Responsive design works on mobile devices
- [ ] Visual feedback provided for button hover states
- [ ] Demo modal integrates seamlessly with existing design system

### User Experience Validation

- [ ] Button interactions feel immediate and responsive
- [ ] Demo content helps users understand platform value proposition
- [ ] Clear path from demo content to actual document upload
- [ ] Modal doesn't interfere with existing page functionality
- [ ] Consistent behavior across different browsers and devices

### Code Quality Validation

- [ ] Implementation follows existing React/Next.js patterns in codebase
- [ ] File placement matches project structure conventions
- [ ] TypeScript interfaces properly defined and used
- [ ] Component props and state management follow best practices
- [ ] Error handling implemented for edge cases

---

## Anti-Patterns to Avoid

- ❌ Don't call functions directly in onClick (use function references)
- ❌ Don't forget 'use client' directive for interactive components
- ❌ Don't skip accessibility considerations (ESC key, focus management)
- ❌ Don't hardcode demo content in component files (use separate data file)
- ❌ Don't break existing upload functionality while adding demo modal
- ❌ Don't ignore mobile responsiveness in modal implementation
- ❌ Don't skip TypeScript type definitions for new components and data