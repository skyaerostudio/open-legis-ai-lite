# Task 11-12 Continuation Prompt for Open-LegisAI Lite

## Context
This is a continuation of the Open-LegisAI Lite implementation. Tasks 1-10 have been completed, implementing the core backend infrastructure, processing pipeline, database schema, and comprehensive results UI components.

**Current Status:**
- ✅ Tasks 1-10: Backend infrastructure, upload routes, processing pipeline, and results UI components complete
- 🎯 Next: Custom React hooks for state management and dynamic public sharing pages (Tasks 11-12)

## Critical Instructions - READ FIRST

### ARCHON-FIRST RULE
BEFORE doing ANYTHING else:
1. Check Archon MCP server availability with `mcp__archon__list_tasks`
2. Find and get the next TODO task with `mcp__archon__get_task`
3. Mark task as "doing" before starting work
4. Use Archon task management as PRIMARY system throughout

### Project Context
- **Project ID**: `55415c53-b616-4d68-9cf0-3d51200e93e7`
- **Feature**: `production-alignment`
- **Current Working Directory**: `/C:/Users/ryang/Documents/SkyAero Studio/Projects/open-legis-ai-lite`

## Task 11: CREATE app/hooks/ custom hooks for state management

**Priority**: High (Task Order: 11)
**Status**: TODO → DOING (mark this immediately)

### Requirements from PRP:
```
IMPLEMENT: Upload progress, processing status, service selection hooks
- CREATE: useUploadWithProgress.ts, useProcessingStatus.ts, useServiceSelection.ts
- ADD: Real-time subscriptions with polling fallback mechanisms
- PATTERN: React hooks with proper cleanup and error handling
- INTEGRATION: Supabase real-time with WebSocket fallback to polling
```

### Implementation Specifications:

#### Hooks to Create or Enhance:

**1. useUploadWithProgress.ts** (Already exists - ENHANCE):
- Current location: `app/hooks/useUploadWithProgress.ts`
- Enhancement needed: Integration with new service job system
- Add support for multi-service uploads
- Improve error handling and retry logic
- Add progress callbacks for individual files and overall progress

**2. useProcessingStatus.ts** (Already exists - ENHANCE):
- Current location: `app/hooks/useProcessingStatus.ts`
- Enhancement needed: Integration with new service_jobs table
- Support for job-based tracking instead of version-based
- Enhanced real-time subscriptions with better fallback
- Add support for step-by-step progress tracking

**3. useServiceSelection.ts** (CREATE NEW):
- Manage service type state (ringkasan/perubahan/konflik)
- File count validation per service type using SERVICE_JOB_CONFIGS
- Integration with dynamic upload area
- Form state management and validation
- Support for service-specific configurations

**4. useJobResults.ts** (CREATE NEW):
- Fetch and cache job results by job_id
- Support different result types based on service_type
- Real-time updates when job completes
- Error handling and retry logic
- Integration with caching strategy

**5. usePublicSharing.ts** (CREATE NEW):
- Manage public sharing state for completed jobs
- Generate and manage share URLs
- Handle privacy settings and expiration
- Track sharing analytics
- Support for share link copying and social media integration

#### Technical Requirements:

**Real-time Integration:**
- Use existing `app/lib/supabase-realtime.ts` for WebSocket connections
- Implement polling fallback using standard intervals
- Proper cleanup on component unmount
- Error handling for connection failures

**State Management:**
- Use React's built-in state management (useState, useReducer)
- Implement proper dependency arrays for useEffect
- Add optimistic updates where appropriate
- Cache results using React Query patterns if available

**TypeScript Compliance:**
- Use strict TypeScript with proper type definitions
- Import types from `@/types/` directory
- Custom error classes for different failure modes
- Proper generic types for reusable hooks

**Integration Points:**
- API routes: `/api/upload`, `/api/process`, `/api/export`
- Database tables: `service_jobs`, `document_versions`, `document_diffs`, `document_conflicts`
- Existing components: Results components from Task 10
- Configuration: `SERVICE_JOB_CONFIGS` from `@/types/processing`

## Task 12: CREATE dynamic pages for public sharing

**Priority**: Medium (Task Order: 12)
**Status**: TODO → DOING (mark this after Task 11)

### Requirements from PRP:
```
IMPLEMENT: Public sharing pages with SEO optimization and accessibility
- ADD: Server-side rendering for proper social media preview cards
- ADD: Print-friendly layouts for offline distribution
- PATTERN: Next.js dynamic routes with proper error boundaries
- SEO: Open Graph tags, Twitter cards, structured data for legal documents
- PLACEMENT: app/results/[id]/ and app/shared/[id]/ dynamic route directories
```

### Pages to Create:

#### app/results/[id]/ - Private Results Pages
```
app/results/[id]/
├── page.tsx                   # Main results page (authenticated)
├── loading.tsx               # Loading UI with skeleton
├── error.tsx                 # Error boundary with retry
└── not-found.tsx            # 404 page with navigation
```

**page.tsx Requirements:**
- Server-side data fetching for job results
- Integration with ResultsNavigation component from Task 10
- Authentication check (if implemented)
- Responsive layout with mobile support
- Real-time updates for processing jobs

**loading.tsx Requirements:**
- Skeleton UI matching the results layout
- Progressive loading indicators
- Service-type specific loading states

**error.tsx Requirements:**
- Error boundary with detailed error information
- Retry functionality
- Navigation back to home
- User-friendly error messages in Indonesian

**not-found.tsx Requirements:**
- Custom 404 page with branding
- Navigation options
- Search functionality
- Recent results suggestions

#### app/shared/[id]/ - Public Sharing Pages
```
app/shared/[id]/
├── page.tsx                  # Public sharing page
├── opengraph-image.tsx       # Dynamic OG image generation
└── layout.tsx               # SEO-optimized layout with metadata
```

**page.tsx Requirements:**
- Public access without authentication
- Read-only view of results
- Watermarked content for branding
- Print-friendly CSS classes
- Social sharing buttons
- View tracking (optional)

**opengraph-image.tsx Requirements:**
- Dynamic OG image generation using @vercel/og or similar
- Service-type specific imagery
- Document title and summary preview
- Branding and logo inclusion
- Optimal social media dimensions (1200x630)

**layout.tsx Requirements:**
- Dynamic meta tags based on job content
- Open Graph tags for Facebook/LinkedIn
- Twitter Card integration
- JSON-LD structured data for legal documents
- Canonical URLs and SEO optimization
- Print-friendly CSS imports

#### SEO and Metadata Requirements:

**Open Graph Tags:**
```html
<meta property="og:title" content="[Document Title] - Open-LegisAI Analysis" />
<meta property="og:description" content="[Generated Summary]" />
<meta property="og:type" content="article" />
<meta property="og:image" content="[Dynamic OG Image URL]" />
<meta property="og:url" content="[Canonical URL]" />
<meta property="og:site_name" content="Open-LegisAI" />
```

**Twitter Cards:**
```html
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="[Document Title]" />
<meta name="twitter:description" content="[Generated Summary]" />
<meta name="twitter:image" content="[Dynamic OG Image URL]" />
```

**JSON-LD Structured Data:**
```json
{
  "@context": "https://schema.org",
  "@type": "AnalysisDocument",
  "name": "[Document Title]",
  "description": "[Document Summary]",
  "dateCreated": "[Creation Date]",
  "author": {
    "@type": "Organization",
    "name": "Open-LegisAI"
  },
  "about": {
    "@type": "LegalDocument",
    "legislationType": "[Service Type]"
  }
}
```

#### Print-Friendly Features:

**CSS Requirements:**
- `@media print` styles for clean printing
- Hide navigation and interactive elements
- Optimize typography for print readability
- Ensure proper page breaks
- Include print header/footer with branding

**Layout Considerations:**
- Single-column layout for print
- Increased font sizes and line spacing
- High contrast colors
- Print button functionality
- Page numbering and document metadata

## Development Workflow

### 1. Start with Archon Task Management:
```bash
# Get current tasks
mcp__archon__list_tasks(filter_by="status", filter_value="todo", project_id="55415c53-b616-4d68-9cf0-3d51200e93e7")

# Start Task 11
mcp__archon__get_task(task_id="[task_11_id]")
mcp__archon__update_task(task_id="[task_11_id]", status="doing")
```

### 2. Research Phase (for each task):
```bash
# Research hook patterns and real-time integration
mcp__archon__perform_rag_query(query="React hooks real-time subscriptions cleanup", match_count=5)
mcp__archon__search_code_examples(query="Next.js dynamic routes SEO optimization", match_count=3)
```

### 3. Implementation Standards:
- Follow existing code conventions in the project
- Use TypeScript with strict type checking
- Import types from `@/types/` directory
- Use existing UI components from Task 10
- Add comprehensive error handling
- Write accessible HTML with proper ARIA labels
- Implement proper cleanup in React hooks

### 4. Integration Points to Verify:

**Existing Files to Study:**
- `app/hooks/useUploadWithProgress.ts` - Current upload hook
- `app/hooks/useProcessingStatus.ts` - Current processing hook
- `app/lib/supabase-realtime.ts` - Real-time client configuration
- `app/components/results/` - All components from Task 10
- `supabase/migrations/20250904000001_fix_processing_pipeline.sql` - Database schema
- `app/types/processing.ts` - Service job types and configurations

**API Endpoints to Integrate:**
- `GET /api/results/[id]` - Fetch job results
- `POST /api/share` - Create public share links
- `GET /api/shared/[id]` - Fetch public share data
- `POST /api/export` - Export functionality

### 5. Quality Assurance:
- Run `npm run lint` after each hook/component
- Test hooks with different service types and error scenarios
- Verify real-time updates work correctly
- Test public sharing functionality thoroughly
- Validate SEO meta tags with social media debuggers
- Test print layouts in different browsers
- Verify accessibility with screen readers
- Test keyboard navigation throughout

#### Browser Testing with Playwright MCP:
Use the Playwright MCP server for comprehensive testing:

```bash
# Test real-time hook updates
mcp__playwright__browser_navigate(url="http://localhost:3000/results/[job-id]")
mcp__playwright__browser_wait_for(text="Processing completed")
mcp__playwright__browser_take_screenshot(filename="results-realtime-test.png")

# Test public sharing workflow
mcp__playwright__browser_click(element="Share button", ref="btn-share")
mcp__playwright__browser_wait_for(text="Share link created")
mcp__playwright__browser_evaluate(function="() => navigator.clipboard.readText()")

# Navigate to public sharing page and verify SEO
PUBLIC_URL="[shared link]"
mcp__playwright__browser_navigate(url=PUBLIC_URL)
mcp__playwright__browser_evaluate(function="() => ({
  title: document.title,
  ogTitle: document.querySelector('meta[property=\"og:title\"]')?.content,
  ogImage: document.querySelector('meta[property=\"og:image\"]')?.content
})")

# Test print layout
mcp__playwright__browser_take_screenshot(filename="print-layout-test.png", fullPage=true)
```

### 6. Task Completion:
```bash
# Mark task as review when complete
mcp__archon__update_task(task_id="[task_id]", status="review")

# Get next task
mcp__archon__list_tasks(filter_by="status", filter_value="todo")
```

## Key Dependencies and Existing Code

### Current Hooks (to enhance):
- `app/hooks/useUploadWithProgress.ts`
- `app/hooks/useProcessingStatus.ts`

### Available UI Components (from Task 10):
- `ProcessingProgress`, `DocumentSummary`, `DocumentComparison`
- `ConflictDetection`, `ResultsNavigation`, `ExportButton`

### Type Definitions:
- `@/types/processing` - Service jobs and processing types
- `@/types/analysis` - Analysis results and export types
- `@/types/database` - Database schema types

### Database Schema:
- `service_jobs` table for job tracking
- `document_diffs` and `document_conflicts` for results
- Public sharing flags and metadata

## Success Criteria

### Task 11 Complete When:
- [ ] All 5 custom hooks created/enhanced and tested
- [ ] Real-time updates working with fallback mechanisms
- [ ] File upload progress tracking functional across all service types
- [ ] Service selection state management working with validation
- [ ] Job results fetching with proper caching and error handling
- [ ] Public sharing state management with URL generation
- [ ] Proper cleanup and error handling implemented
- [ ] Browser testing with Playwright MCP confirms real-time functionality
- [ ] Hook state management tested across browser refresh scenarios

### Task 12 Complete When:
- [ ] Dynamic routes created for both /results/[id] and /shared/[id]
- [ ] Server-side rendering functional for SEO
- [ ] Open Graph images generated dynamically
- [ ] All SEO meta tags implemented correctly
- [ ] JSON-LD structured data working
- [ ] Print-friendly layouts working across browsers
- [ ] Error boundaries and loading states implemented
- [ ] Public sharing privacy controls working
- [ ] Social media preview cards tested with browser screenshots
- [ ] Print layouts verified through Playwright MCP testing
- [ ] 404 and error pages provide proper user experience

## Next Steps After Completion

After Tasks 11-12 are complete, the Open-LegisAI Lite MVP will be ready for:
1. **Final integration testing** across all services using Playwright MCP
2. **Performance optimization** and caching strategy implementation
3. **Production deployment** with comprehensive monitoring
4. **User acceptance testing** with real legal documents
5. **SEO and social media optimization** validation

**Remember**: Always use Archon task management first, research before implementing, use Playwright MCP for comprehensive browser testing, and maintain high code quality standards throughout. The success of this implementation depends on seamless integration with the existing codebase from Tasks 1-10.