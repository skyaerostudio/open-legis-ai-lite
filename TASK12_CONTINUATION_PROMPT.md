# Task 12 Continuation Prompt for Open-LegisAI Lite

## Context
This is a continuation of the Open-LegisAI Lite implementation. Tasks 1-11 have been completed, implementing the core backend infrastructure, processing pipeline, database schema, comprehensive results UI components, and custom React hooks for state management.

**Current Status:**
- ✅ Tasks 1-11: Backend infrastructure, upload routes, processing pipeline, results UI components, and custom React hooks complete
- 🎯 Next: Dynamic pages for public sharing with SEO optimization and accessibility (Task 12)

## Critical Instructions - READ FIRST

### ARCHON-FIRST RULE
BEFORE doing ANYTHING else:
1. Check Archon MCP server availability with `mcp__archon__list_tasks`
2. Find and get Task 12 with `mcp__archon__get_task`
3. Mark task as "doing" before starting work
4. Use Archon task management as PRIMARY system throughout

### Project Context
- **Project ID**: `55415c53-b616-4d68-9cf0-3d51200e93e7`
- **Feature**: `production-alignment`
- **Current Working Directory**: `/C:/Users/ryang/Documents/SkyAero Studio/Projects/open-legis-ai-lite`

## Task 12: CREATE dynamic pages for public sharing

**Priority**: Medium (Task Order: 12)
**Status**: TODO → DOING (mark this immediately)
**Task ID**: `8bbe5e2d-04cc-438e-8be9-b477ce67329e`

### Requirements from PRP:
```
IMPLEMENT: Public sharing pages with SEO optimization and accessibility
- ADD: Server-side rendering for proper social media preview cards
- ADD: Print-friendly layouts for offline distribution
- PATTERN: Next.js dynamic routes with proper error boundaries
- SEO: Open Graph tags, Twitter cards, structured data for legal documents
- PLACEMENT: app/results/[id]/ and app/shared/[id]/ dynamic route directories
```

### Implementation Specifications:

#### Pages to Create:

**1. app/results/[id]/ - Private Results Pages**
```
app/results/[id]/
├── page.tsx                   # Main results page (authenticated)
├── loading.tsx               # Loading UI with skeleton
├── error.tsx                 # Error boundary with retry
└── not-found.tsx            # 404 page with navigation
```

**Requirements for page.tsx:**
- Server-side data fetching for job results using new job system
- Integration with existing ResultsNavigation component from Task 10
- Authentication check (if implemented)
- Responsive layout with mobile support
- Real-time updates for processing jobs using useJobProcessingStatus hook

**Requirements for loading.tsx:**
- Skeleton UI matching the results layout
- Progressive loading indicators
- Service-type specific loading states

**Requirements for error.tsx:**
- Error boundary with detailed error information
- Retry functionality
- Navigation back to home
- User-friendly error messages in Indonesian

**Requirements for not-found.tsx:**
- Custom 404 page with branding
- Navigation options
- Search functionality
- Recent results suggestions

**2. app/shared/[id]/ - Public Sharing Pages**
```
app/shared/[id]/
├── page.tsx                  # Public sharing page
├── opengraph-image.tsx       # Dynamic OG image generation
└── layout.tsx               # SEO-optimized layout with metadata
```

**Requirements for page.tsx:**
- Public access without authentication
- Read-only view of results
- Watermarked content for branding
- Print-friendly CSS classes
- Social sharing buttons using usePublicSharing hook
- View tracking (optional)

**Requirements for opengraph-image.tsx:**
- Dynamic OG image generation using @vercel/og or similar
- Service-type specific imagery
- Document title and summary preview
- Branding and logo inclusion
- Optimal social media dimensions (1200x630)

**Requirements for layout.tsx:**
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

## Implementation Guidelines

### 1. Start with Archon Task Management:
```bash
# Get current tasks
mcp__archon__list_tasks(filter_by="status", filter_value="todo", project_id="55415c53-b616-4d68-9cf0-3d51200e93e7")

# Start Task 12
mcp__archon__get_task(task_id="8bbe5e2d-04cc-438e-8be9-b477ce67329e")
mcp__archon__update_task(task_id="8bbe5e2d-04cc-438e-8be9-b477ce67329e", status="doing")
```

### 2. Research Phase:
```bash
# Research Next.js dynamic routes and SEO optimization
mcp__archon__perform_rag_query(query="Next.js dynamic routes SEO optimization", match_count=5)
mcp__archon__search_code_examples(query="Next.js metadata generation social media", match_count=3)

# Research OG image generation
mcp__archon__perform_rag_query(query="Next.js OpenGraph image generation vercel og", match_count=3)
```

### 3. Integration Points to Verify:

**Existing Files to Study:**
- `app/hooks/useJobResults.ts` - Job results fetching (from Task 11)
- `app/hooks/usePublicSharing.ts` - Public sharing management (from Task 11)
- `app/hooks/useJobProcessingStatus.ts` - Real-time job status (from Task 11)
- `app/components/results/` - All components from Task 10
- `app/types/processing.ts` - Service job types and configurations
- `app/types/analysis.ts` - Analysis result types

**API Endpoints to Create/Use:**
- `GET /api/results/[id]` - Fetch job results (may need to create)
- `GET /api/shared/[id]` - Fetch public share data (may need to create)
- `POST /api/share` - Create public share links (may need to create)
- `GET /api/og/[id]` - Generate OG images (may need to create)

### 4. Implementation Standards:
- Use Next.js 15 App Router patterns
- Follow existing code conventions in the project
- Use TypeScript with strict type checking
- Import types from `@/types/` directory
- Use existing UI components from shadcn/ui
- Add comprehensive error handling
- Write accessible HTML with proper ARIA labels
- Implement proper cleanup in React hooks

### 5. Key Dependencies and Existing Code

**Available Custom Hooks (from Task 11):**
- `useJobResults(jobId, enableRealtime)` - Fetch and cache job results
- `usePublicSharing(jobId)` - Manage public sharing state
- `useJobProcessingStatus(jobId)` - Monitor job processing status
- `useSocialSharing(shareUrl, metadata)` - Social media sharing utilities

**Available UI Components (from Task 10):**
- `ProcessingProgress`, `DocumentSummary`, `DocumentComparison`
- `ConflictDetection`, `ResultsNavigation`, `ExportButton`

**Type Definitions:**
- `@/types/processing` - Service jobs and processing types
- `@/types/analysis` - Analysis results (AIAnalysisResult) and export types
- `@/types/database` - Database schema types

**Database Schema:**
- `service_jobs` table for job tracking
- `document_diffs` and `document_conflicts` for results
- Public sharing flags and metadata

### 6. Testing Requirements:

#### Browser Testing with Playwright MCP:
```bash
# Test dynamic routing
mcp__playwright__browser_navigate(url="http://localhost:3000/results/[job-id]")
mcp__playwright__browser_wait_for(text="Analysis Results")
mcp__playwright__browser_take_screenshot(filename="results-page-test.png")

# Test public sharing
mcp__playwright__browser_navigate(url="http://localhost:3000/shared/[share-id]")
mcp__playwright__browser_wait_for(text="Public Analysis")

# Test SEO meta tags
mcp__playwright__browser_evaluate(function="() => ({
  title: document.title,
  ogTitle: document.querySelector('meta[property=\"og:title\"]')?.content,
  ogImage: document.querySelector('meta[property=\"og:image\"]')?.content,
  ogDescription: document.querySelector('meta[property=\"og:description\"]')?.content,
  twitterCard: document.querySelector('meta[name=\"twitter:card\"]')?.content
})")

# Test print layout
mcp__playwright__browser_take_screenshot(filename="print-layout-test.png", fullPage=true)

# Test social sharing buttons functionality
mcp__playwright__browser_click(element="Share to Facebook button", ref="btn-facebook-share")
```

### 7. Quality Assurance:
- Run `npm run lint` after each component creation
- Test dynamic routes with different job IDs and service types
- Verify SEO meta tags with social media debuggers
- Test print layouts in different browsers
- Verify accessibility with screen readers
- Test keyboard navigation throughout
- Validate OG image generation
- Test error boundaries with invalid job IDs

### 8. Task Completion Criteria:

**Task 12 Complete When:**
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

### 9. Task Completion:
```bash
# Mark task as review when complete
mcp__archon__update_task(task_id="8bbe5e2d-04cc-438e-8be9-b477ce67329e", status="review")

# Check for remaining tasks
mcp__archon__list_tasks(filter_by="status", filter_value="todo")
```

## Success Indicators

1. **Functional Requirements**: All dynamic routes load correctly with proper data
2. **SEO Requirements**: Meta tags and structured data validate correctly
3. **Accessibility Requirements**: WCAG compliance for all public pages
4. **Performance Requirements**: Fast loading times for shared pages
5. **Print Requirements**: Clean, professional print layouts
6. **Error Handling**: Graceful degradation for missing or invalid data

## Next Steps After Completion

After Task 12 is complete, the Open-LegisAI Lite MVP will be ready for:
1. **Final integration testing** across all services
2. **Performance optimization** and caching strategy implementation
3. **Production deployment** with comprehensive monitoring
4. **User acceptance testing** with real legal documents
5. **SEO and social media optimization** validation

**Remember**: Always use Archon task management first, research before implementing, use Playwright MCP for comprehensive browser testing, and maintain high code quality standards throughout. The success of this implementation depends on seamless integration with the existing codebase from Tasks 1-11.