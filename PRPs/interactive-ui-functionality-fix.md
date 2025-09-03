# Open-LegisAI Lite Interactive UI & File Upload Functionality Fix

---

## Goal

**Feature Goal**: Transform the static Open-LegisAI Lite interface into a fully interactive experience where feature cards drive dynamic UI behavior, coupled with functional file upload capability.

**Deliverable**: Interactive feature card selector with state management, functional drag-and-drop file upload, dynamic upload area that adapts to selected service, and dynamic workflow section that updates based on active service.

**Success Definition**: 
- Clicking feature cards visually highlights selection and changes app behavior
- File upload works via both drag-and-drop and button click (PDF/HTML up to 50MB)
- Upload area displays service-specific instructions and validation
- Workflow section updates dynamically with service-appropriate steps
- All interactions are smooth with proper transitions and error states

## User Persona

**Target User**: Indonesian citizens, journalists, CSOs, and DPRD secretariat staff who need to analyze legal documents

**Use Case**: User selects a specific analysis service (summary, change detection, or conflict detection), uploads appropriate documents, and proceeds through a service-tailored workflow.

**User Journey**:
1. Land on homepage and see three feature cards
2. Click desired service (Ringkasan/Deteksi Perubahan/Deteksi Konflik)
3. See selected card highlighted and UI adapt to service requirements
4. Upload file(s) via drag-and-drop or button click based on service needs
5. View updated workflow steps relevant to chosen service
6. Proceed with document processing

**Pain Points Addressed**: 
- Confusion about which service to use and what files are needed
- Broken upload functionality preventing users from starting analysis
- Static interface that doesn't guide users through service-specific workflows

## Why

- **Business Value**: Converts static mockup into functional MVP, enabling user testing and feedback collection
- **Integration**: Creates foundation for service-specific document processing workflows
- **Problems Solved**: Non-functional file upload, unclear service selection, static UI that doesn't guide users

## What

Interactive card selector that manages application state, working file upload with validation and progress, service-specific upload instructions, and dynamic workflow presentation.

### Success Criteria

- [ ] Feature cards are clickable and show visual selection state
- [ ] Only one service can be selected at a time with proper state management
- [ ] File upload supports drag-and-drop and button click for PDF/HTML files up to 50MB
- [ ] Upload area shows different instructions based on selected service
- [ ] Workflow section updates content based on active service
- [ ] Smooth transitions between states without jarring layout shifts
- [ ] Proper error handling for unsupported files, oversized files, and validation failures

## All Needed Context

### Context Completeness Check

✅ **Validation**: This PRP provides complete implementation context for developers unfamiliar with the codebase, including specific React/Next.js patterns, component structure, state management approach, and shadcn/ui integration.

### Documentation & References

```yaml
# CRITICAL READING - Current Implementation
- file: app/page.tsx
  why: Current homepage structure with static cards and non-functional upload
  pattern: Feature cards structure, upload section layout, workflow section
  gotcha: Upload button has onClick placeholder but no actual functionality

- file: app/components/demo/ExampleDemo.tsx
  why: Modal implementation pattern and existing interactive component structure
  pattern: State management with useState, modal overlay, event handling
  gotcha: Uses fixed backdrop click handling and keyboard event management

# REACT STATE MANAGEMENT PATTERNS
- url: https://nextjs.org/docs/app/getting-started/server-and-client-components#when-to-use-server-and-client-components
  why: Understanding when to use 'use client' directive for interactive components
  critical: Interactive components require client-side rendering for useState/useEffect

- url: https://react.dev/reference/react/useState#updating-state-based-on-the-previous-state
  why: Proper state updating patterns for complex state objects
  critical: Use functional updates when new state depends on previous state

# SHADCN/UI COMPONENT PATTERNS
- url: https://ui.shadcn.com/docs/components/card
  why: Card component styling and interaction patterns
  critical: Use variant props and className merging for visual states

- url: https://ui.shadcn.com/docs/components/button
  why: Button variants and interaction states
  critical: Use variant="outline" vs "default" for selection states

# FILE UPLOAD IMPLEMENTATION
- url: https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API/File_drags
  why: Native drag-and-drop file handling with proper event management
  critical: preventDefault on dragOver to enable drop, handle multiple files

- url: https://developer.mozilla.org/en-US/docs/Web/API/File_API/Using_files_from_web_applications
  why: File validation, size checking, and type validation
  critical: Check file.size and file.type before processing
```

### Current Codebase Tree

```bash
C:\Users\ryang\Documents\SkyAero Studio\Projects\open-legis-ai-lite\
├── app/
│   ├── components/
│   │   ├── ui/              # shadcn/ui components
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── input.tsx
│   │   │   ├── label.tsx
│   │   │   └── progress.tsx
│   │   ├── demo/
│   │   │   └── ExampleDemo.tsx  # Modal component pattern
│   │   ├── upload/          # File upload components (mostly empty/incomplete)
│   │   │   ├── FileUpload.tsx
│   │   │   ├── FileCard.tsx
│   │   │   └── ProcessingStatus.tsx
│   │   └── analysis/        # Analysis display components (future)
│   ├── lib/
│   │   ├── utils.ts         # shadcn/ui utilities
│   │   └── demo-data.ts     # Demo data for modal
│   ├── layout.tsx           # Root layout
│   ├── page.tsx             # Homepage with static cards and broken upload
│   └── globals.css          # Global styles
├── components.json          # shadcn/ui configuration
├── tailwind.config.js      # Tailwind configuration
├── package.json            # Dependencies (Next.js 15, React 19, shadcn/ui)
└── tsconfig.json           # TypeScript configuration
```

### Desired Codebase Tree with Additions

```bash
app/
├── components/
│   ├── ui/                  # (existing shadcn/ui components)
│   ├── demo/               # (existing)
│   ├── home/               # NEW: Homepage-specific components
│   │   ├── ServiceSelector.tsx      # Interactive feature card selector
│   │   ├── DynamicUploadArea.tsx    # Service-adaptive upload component
│   │   ├── DynamicWorkflow.tsx      # Service-adaptive workflow steps
│   │   └── types.ts                 # Service types and interfaces
│   └── upload/             # ENHANCED: Functional file upload components
│       ├── FileDropZone.tsx         # Drag-and-drop implementation
│       ├── FileUpload.tsx           # Enhanced upload with validation
│       └── ProgressIndicator.tsx    # Upload progress display
├── hooks/                  # NEW: Custom hooks for state management
│   └── useServiceSelection.ts       # Service selection state hook
├── page.tsx                # MODIFIED: Integration of new components
└── globals.css            # MODIFIED: Enhanced styles for interactions
```

### Known Gotchas & Library Quirks

```typescript
// CRITICAL: Next.js 15 + React 19 compatibility
// - Must use 'use client' directive for components using useState/useEffect
// - Event handlers must be properly typed for TypeScript

// CRITICAL: shadcn/ui Card component behavior
// - Use onClick on CardHeader or Card for proper click detection
// - Combine className prop properly using cn() utility from lib/utils

// File API Gotchas
// - event.dataTransfer.files is FileList, not Array - convert with Array.from()
// - Drag events need preventDefault() on dragOver to enable drop functionality
// - File.size is in bytes, need proper validation for 50MB limit (50 * 1024 * 1024)

// State Management Pattern
// - Use functional setState when new state depends on previous: setState(prev => {...prev, newProp})
// - Service selection affects multiple components - consider prop drilling vs context
```

## Implementation Blueprint

### Data Models and Structure

Define service types and state management interfaces for consistent type safety.

```typescript
// app/components/home/types.ts
export type ServiceType = 'ringkasan' | 'perubahan' | 'konflik';

export interface ServiceConfig {
  id: ServiceType;
  title: string;
  description: string;
  icon: LucideIcon;
  uploadInstructions: string;
  maxFiles: number;
  workflowSteps: Array<{
    number: number;
    title: string;
    description: string;
  }>;
}

export interface AppState {
  selectedService: ServiceType | null;
  uploadedFiles: File[];
  isUploading: boolean;
  uploadError: string | null;
}

// File upload validation
export interface FileValidation {
  isValid: boolean;
  error?: string;
  file: File;
}
```

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: CREATE app/hooks/useServiceSelection.ts
  - IMPLEMENT: Custom hook for service selection state management
  - PATTERN: useState with ServiceType, helper functions for setting/clearing
  - RETURN: selectedService, setSelectedService, clearSelection functions
  - PLACEMENT: New hooks directory for reusable state logic

Task 2: CREATE app/components/home/types.ts
  - IMPLEMENT: ServiceType union type, ServiceConfig interface, AppState interface
  - FOLLOW pattern: TypeScript interfaces for consistent typing
  - EXPORT: All types for use in other components
  - PLACEMENT: Component-specific types in home directory

Task 3: CREATE app/components/home/ServiceSelector.tsx
  - IMPLEMENT: Interactive service card component with click handling
  - FOLLOW pattern: app/components/demo/ExampleDemo.tsx (event handling, state management)
  - STYLING: shadcn/ui Card with visual selection states using cn() utility
  - DEPENDENCIES: useServiceSelection hook, ServiceConfig type
  - PLACEMENT: Home-specific components directory

Task 4: CREATE app/components/upload/FileDropZone.tsx
  - IMPLEMENT: Drag-and-drop file upload with validation
  - FOLLOW pattern: HTML5 drag-and-drop API with proper event handling
  - VALIDATION: File type (PDF/HTML), file size (50MB), file count based on service
  - STYLING: Tailwind classes for drag states, error states, success states
  - PLACEMENT: Enhanced upload components directory

Task 5: CREATE app/components/home/DynamicUploadArea.tsx
  - IMPLEMENT: Service-adaptive upload component that renders different UI based on selected service
  - DEPENDENCIES: FileDropZone component, ServiceConfig for instructions
  - CONDITIONAL: Show single vs multiple file upload based on service type
  - INTEGRATION: Error handling and file validation feedback
  - PLACEMENT: Home-specific components directory

Task 6: CREATE app/components/home/DynamicWorkflow.tsx
  - IMPLEMENT: Workflow steps that update based on selected service
  - FOLLOW pattern: app/page.tsx existing workflow section structure
  - ANIMATION: Smooth transitions using Tailwind transition classes
  - CONDITIONAL: Different step content based on ServiceType
  - PLACEMENT: Home-specific components directory

Task 7: MODIFY app/page.tsx
  - INTEGRATE: Replace static cards with ServiceSelector component
  - INTEGRATE: Replace static upload with DynamicUploadArea component
  - INTEGRATE: Replace static workflow with DynamicWorkflow component
  - PRESERVE: Existing hero section, demo modal functionality
  - STATE: Use useServiceSelection hook for coordinated state management

Task 8: ENHANCE app/globals.css
  - ADD: Transition classes for smooth card selection states
  - ADD: Drag-and-drop visual feedback styles
  - ADD: Error state styling for upload validation
  - PRESERVE: Existing shadcn/ui and Tailwind integration
```

### Implementation Patterns & Key Details

```typescript
// Service Selection Hook Pattern
// app/hooks/useServiceSelection.ts
'use client';

import { useState, useCallback } from 'react';
import type { ServiceType } from '@/components/home/types';

export function useServiceSelection() {
  const [selectedService, setSelectedService] = useState<ServiceType | null>(null);
  
  const selectService = useCallback((service: ServiceType) => {
    setSelectedService(service);
  }, []);
  
  const clearSelection = useCallback(() => {
    setSelectedService(null);
  }, []);
  
  return { selectedService, selectService, clearSelection };
}

// Interactive Card Component Pattern
// app/components/home/ServiceSelector.tsx
'use client';

import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { ServiceType, ServiceConfig } from './types';

interface ServiceSelectorProps {
  services: ServiceConfig[];
  selectedService: ServiceType | null;
  onServiceSelect: (service: ServiceType) => void;
}

export default function ServiceSelector({ services, selectedService, onServiceSelect }: ServiceSelectorProps) {
  return (
    <div className="grid gap-8 md:grid-cols-3">
      {services.map((service) => (
        <Card 
          key={service.id}
          className={cn(
            "cursor-pointer transition-all duration-200 hover:shadow-lg",
            selectedService === service.id 
              ? "ring-2 ring-primary shadow-lg" 
              : "hover:shadow-md"
          )}
          onClick={() => onServiceSelect(service.id)}
        >
          <CardHeader>
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <service.icon className={cn(
                "h-6 w-6",
                selectedService === service.id ? "text-primary" : "text-primary"
              )} />
            </div>
            <h3 className="text-xl font-semibold">{service.title}</h3>
            <p className="text-muted-foreground">{service.description}</p>
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}

// File Drop Zone Implementation Pattern
// app/components/upload/FileDropZone.tsx
'use client';

import { useCallback, useState } from 'react';
import { cn } from '@/lib/utils';

interface FileDropZoneProps {
  onFilesSelected: (files: File[]) => void;
  maxFiles: number;
  acceptedTypes: string[];
  maxFileSize: number;
  disabled?: boolean;
}

export default function FileDropZone({ onFilesSelected, maxFiles, acceptedTypes, maxFileSize, disabled }: FileDropZoneProps) {
  const [isDragActive, setIsDragActive] = useState(false);

  const validateFiles = useCallback((files: FileList): File[] => {
    const validFiles: File[] = [];
    
    for (let i = 0; i < Math.min(files.length, maxFiles); i++) {
      const file = files[i];
      
      // Validate file type
      if (!acceptedTypes.some(type => file.type.includes(type))) {
        continue;
      }
      
      // Validate file size (50MB = 50 * 1024 * 1024 bytes)
      if (file.size > maxFileSize) {
        continue;
      }
      
      validFiles.push(file);
    }
    
    return validFiles;
  }, [acceptedTypes, maxFileSize, maxFiles]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
    
    if (disabled) return;
    
    const files = e.dataTransfer.files;
    const validFiles = validateFiles(files);
    
    if (validFiles.length > 0) {
      onFilesSelected(validFiles);
    }
  }, [disabled, validateFiles, onFilesSelected]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault(); // CRITICAL: Must preventDefault to enable drop
    if (!disabled) {
      setIsDragActive(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const validFiles = validateFiles(files);
      if (validFiles.length > 0) {
        onFilesSelected(validFiles);
      }
    }
  }, [validateFiles, onFilesSelected]);

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 text-center transition-colors",
        isDragActive 
          ? "border-primary bg-primary/5" 
          : "border-muted-foreground/25",
        disabled && "opacity-50 cursor-not-allowed"
      )}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      <Upload className="h-12 w-12 text-muted-foreground" />
      <p className="mt-4 text-lg font-medium">
        Seret dan lepas file di sini atau klik untuk pilih
      </p>
      <p className="mt-2 text-sm text-muted-foreground">
        Format yang didukung: PDF, HTML (maksimal 50MB)
      </p>
      <input
        type="file"
        multiple={maxFiles > 1}
        accept={acceptedTypes.join(',')}
        onChange={handleFileInput}
        className="sr-only"
        id="file-input"
        disabled={disabled}
      />
      <label
        htmlFor="file-input"
        className="mt-4 cursor-pointer rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
      >
        Pilih File
      </label>
    </div>
  );
}

// Service Configuration Data
// app/components/home/serviceConfig.ts
import { FileText, Search, Share2 } from 'lucide-react';
import type { ServiceConfig } from './types';

export const serviceConfigs: ServiceConfig[] = [
  {
    id: 'ringkasan',
    title: 'Ringkasan Bahasa Sederhana',
    description: 'AI menghasilkan ringkasan 600-900 kata dalam Bahasa Indonesia yang mudah dipahami dengan glosarium istilah hukum.',
    icon: FileText,
    uploadInstructions: 'Unggah 1 dokumen hukum untuk dianalisis',
    maxFiles: 1,
    workflowSteps: [
      { number: 1, title: 'Unggah', description: 'Unggah 1 dokumen hukum' },
      { number: 2, title: 'Proses', description: 'AI mengekstrak dan menganalisis teks' },
      { number: 3, title: 'Analisis', description: 'Lihat ringkasan dengan glosarium' },
      { number: 4, title: 'Bagikan', description: 'Bagikan link publik untuk transparansi' }
    ]
  },
  {
    id: 'perubahan',
    title: 'Deteksi Perubahan',
    description: 'Bandingkan versi dokumen secara visual dengan navigasi "lompat ke perubahan" dan highlight pada tingkat pasal.',
    icon: Search,
    uploadInstructions: 'Unggah 2 versi dokumen untuk dibandingkan',
    maxFiles: 2,
    workflowSteps: [
      { number: 1, title: 'Unggah', description: 'Unggah 2 versi dokumen' },
      { number: 2, title: 'Proses', description: 'AI mendeteksi perbedaan' },
      { number: 3, title: 'Analisis', description: 'Lihat perubahan dengan highlight' },
      { number: 4, title: 'Bagikan', description: 'Bagikan link publik untuk transparansi' }
    ]
  },
  {
    id: 'konflik',
    title: 'Deteksi Konflik',
    description: 'Identifikasi potensi tumpang tindih dengan peraturan yang ada menggunakan pencarian semantik dengan kutipan dan referensi.',
    icon: Share2,
    uploadInstructions: 'Unggah 1 dokumen untuk pengecekan konflik',
    maxFiles: 1,
    workflowSteps: [
      { number: 1, title: 'Unggah', description: 'Unggah 1 dokumen hukum' },
      { number: 2, title: 'Proses', description: 'AI scan regulasi terkait' },
      { number: 3, title: 'Analisis', description: 'Lihat deteksi konflik dengan kutipan' },
      { number: 4, title: 'Bagikan', description: 'Bagikan link publik untuk transparansi' }
    ]
  }
];
```

### Integration Points

```yaml
STATE_MANAGEMENT:
  - hook: "useServiceSelection for coordinating service selection across components"
  - pattern: "Pass selectedService and handlers down through props"
  - scope: "Component-level state, no need for context at this complexity level"

COMPONENT_INTEGRATION:
  - parent: "app/page.tsx coordinates all interactive components"
  - children: "ServiceSelector, DynamicUploadArea, DynamicWorkflow share service state"
  - pattern: "Prop drilling sufficient for current scope, consider context if expanding"

FILE_HANDLING:
  - validation: "File type checking using file.type, size checking with 50MB limit"
  - storage: "Files stored in component state until upload API integration"
  - feedback: "Visual feedback for drag states, validation errors, upload progress"

STYLING:
  - framework: "Tailwind CSS with shadcn/ui components"
  - states: "Hover, selected, drag-active, error states with proper transitions"
  - responsive: "Existing responsive grid layout preserved and enhanced"
```

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# TypeScript validation
npx tsc --noEmit

# ESLint validation
npx eslint app/ --ext .ts,.tsx

# Development server test
npm run dev
# Navigate to http://localhost:3000 and test interactions

# Expected: Zero TypeScript errors, no ESLint violations, dev server starts successfully
```

### Level 2: Unit Tests (Component Validation)

```bash
# Test service selection hook
npm run test -- app/hooks/useServiceSelection.test.ts

# Test interactive components
npm run test -- app/components/home/ServiceSelector.test.tsx
npm run test -- app/components/upload/FileDropZone.test.tsx

# Expected: All hooks and components behave correctly with proper state management
```

### Level 3: Integration Testing (System Validation)

```bash
# Visual testing - click through each service
# 1. Click Ringkasan card → verify visual highlight and upload area shows "1 document"
# 2. Click Perubahan card → verify selection changes and upload area shows "2 documents"
# 3. Click Konflik card → verify selection changes and upload area shows "1 document"

# File upload testing
# 1. Drag PDF file → verify visual feedback and file acceptance
# 2. Drag non-PDF file → verify rejection with error message
# 3. Drag oversized file → verify size validation and error message
# 4. Click "Pilih File" button → verify file picker opens and works

# Workflow section testing
# 1. Switch between services → verify workflow steps update correctly
# 2. Check transitions → verify smooth animations without layout shift

# Expected: All interactions work smoothly, proper validation, no broken states
```

### Level 4: Creative & Domain-Specific Validation

```bash
# Accessibility testing
# 1. Tab navigation → verify all interactive elements are reachable
# 2. Screen reader testing → verify proper ARIA labels and announcements
# 3. Keyboard interaction → verify cards selectable with Enter/Space

# User experience validation
# 1. Mobile responsive testing → verify touch interactions work properly
# 2. Service switching speed → verify instant feedback and state updates
# 3. Error recovery → verify users can recover from validation errors

# Edge case testing
# 1. Multiple rapid clicks → verify state remains consistent
# 2. File drag without drop → verify UI returns to normal state
# 3. Browser back/forward → verify state preserved or properly reset

# Expected: Excellent user experience, full accessibility compliance, robust error handling
```

## Final Validation Checklist

### Technical Validation

- [ ] All 4 validation levels completed successfully
- [ ] TypeScript compilation without errors: `npx tsc --noEmit`
- [ ] Development server runs: `npm run dev`
- [ ] All components render without console errors
- [ ] Service selection state works across all components
- [ ] File upload validation works for all cases (valid files, invalid types, oversized files)

### Feature Validation

- [ ] Feature cards are clickable and show visual selection state
- [ ] Only one service can be selected at a time
- [ ] Upload area displays service-specific instructions and file limits
- [ ] Workflow section updates content based on selected service
- [ ] Drag-and-drop file upload works with proper visual feedback
- [ ] "Pilih File" button opens file picker and validates selections
- [ ] Smooth transitions between service selections without layout shifts
- [ ] Error states show appropriate messages and recovery options

### Code Quality Validation

- [ ] Follows Next.js 15 and React 19 patterns with proper 'use client' usage
- [ ] Uses shadcn/ui components correctly with proper styling
- [ ] TypeScript types are comprehensive and prevent runtime errors
- [ ] Component structure is modular and reusable
- [ ] State management is clean and predictable
- [ ] File handling includes proper validation and error handling
- [ ] Responsive design works across mobile and desktop

### User Experience Validation

- [ ] Interface is intuitive and guides users through service selection
- [ ] Visual feedback is immediate and clear for all interactions
- [ ] Error messages are helpful and actionable
- [ ] Accessibility standards met for keyboard navigation and screen readers
- [ ] Mobile touch interactions work smoothly
- [ ] Loading and transition states provide appropriate feedback

---

## Anti-Patterns to Avoid

- ❌ Don't use server components for interactive elements - use 'use client'
- ❌ Don't skip preventDefault() in drag event handlers - drops won't work
- ❌ Don't directly mutate state - use functional updates with setState
- ❌ Don't ignore file validation - validate size, type, and count
- ❌ Don't forget keyboard accessibility - make cards focusable and interactive
- ❌ Don't use layout-shifting animations - use transform-based transitions
- ❌ Don't store files in global state unnecessarily - component state is sufficient
- ❌ Don't skip error boundaries - handle file upload failures gracefully
- ❌ Don't hardcode file size limits - define constants for easy maintenance
- ❌ Don't ignore responsive design - test on mobile devices