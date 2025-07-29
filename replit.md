# CivicScape - Educational GIS Platform

## Overview

CivicScape is a full-stack educational platform designed for Geographic Information Systems (GIS) learning. The application provides a comprehensive environment where teachers can create modules and assignments, while students can complete coursework including interactive map-based activities. The platform features a React frontend with modern UI components, an Express.js backend API, and PostgreSQL database integration using Drizzle ORM.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query (React Query) for server state management
- **UI Components**: Radix UI primitives with shadcn/ui component library
- **Styling**: Tailwind CSS with CSS variables for theming
- **Map Integration**: Leaflet with React Leaflet for interactive GIS features
- **Build Tool**: Vite for fast development and optimized builds

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **API Design**: RESTful API with role-based authentication
- **Session Management**: Simple in-memory session store (suitable for development)
- **Authentication**: bcrypt for password hashing with session-based auth

### Database Architecture
- **Database**: PostgreSQL (configured for Neon serverless)
- **ORM**: Drizzle ORM for type-safe database operations
- **Schema Management**: Drizzle Kit for migrations and schema synchronization
- **Connection**: Neon serverless driver with WebSocket support

## Key Components

### Authentication System
- Role-based access control (teacher/student roles)
- Session-based authentication with bearer tokens
- Protected routes with middleware for authorization
- Registration and login endpoints with validation

### Educational Content Management
- **Modules**: Course units with objectives, difficulty levels, and duration
- **Assignments**: Text, GIS, or mixed-type assignments with due dates and point values
- **Submissions**: Student responses with support for written text and map data
- **Grading**: Teacher feedback system with rubric support

### GIS Integration
- Interactive map editor using Leaflet
- Support for multiple map layers (street, satellite, vector data)
- Drawing tools for points, lines, and polygons
- Map annotation system with save/export functionality
- Map data stored as JSON in the database

### User Interface Components
- Responsive design with mobile-first approach
- Dark/light theme support via CSS variables
- Component library based on Radix UI primitives
- Form handling with React Hook Form and Zod validation
- Toast notifications for user feedback

## Data Flow

### User Authentication Flow
1. User submits login credentials
2. Backend validates credentials using bcrypt
3. Session created and stored in memory with unique token
4. Token returned to client and stored in localStorage
5. Subsequent requests include bearer token for authentication
6. Middleware validates session on protected routes

### Content Creation Flow (Teachers)
1. Teacher creates module with objectives and metadata
2. Teacher creates assignments linked to modules
3. Students can view and enroll in modules
4. Assignment submissions tracked per student
5. Teachers can grade submissions with feedback

### GIS Workflow
1. Students access GIS editor through assignments
2. Map data manipulated using Leaflet tools
3. Map state saved as JSON to submission record
4. Teachers can view and grade map submissions
5. Export functionality for sharing map data

## External Dependencies

### Frontend Dependencies
- **@tanstack/react-query**: Server state management and caching
- **wouter**: Lightweight React routing
- **react-leaflet**: React components for Leaflet maps
- **react-hook-form**: Form state management
- **@hookform/resolvers**: Form validation resolvers
- **zod**: Schema validation
- **date-fns**: Date manipulation utilities
- **lucide-react**: Icon library

### Backend Dependencies
- **express**: Web application framework
- **drizzle-orm**: TypeScript ORM
- **@neondatabase/serverless**: Neon PostgreSQL driver
- **bcrypt**: Password hashing
- **ws**: WebSocket support for Neon
- **connect-pg-simple**: PostgreSQL session store (though currently using in-memory)

### Development Dependencies
- **vite**: Build tool and development server
- **typescript**: Type checking
- **tailwindcss**: Utility-first CSS framework
- **drizzle-kit**: Database schema management
- **tsx**: TypeScript execution for development

## Deployment Strategy

### Development Environment
- Vite development server for frontend with HMR
- Express server running with tsx for TypeScript execution
- Environment variables for database connection
- Replit-specific plugins for development experience

### Production Build
- Frontend: Vite builds optimized static assets to `dist/public`
- Backend: esbuild bundles server code to `dist/index.js`
- Static file serving through Express in production
- Database migrations applied via Drizzle Kit

### Environment Configuration
- **Development**: `NODE_ENV=development` with live reloading
- **Production**: `NODE_ENV=production` with optimized builds
- Database URL configuration through environment variables
- Session management (currently in-memory, should be upgraded for production)

### Database Setup
- PostgreSQL database provisioning required
- Drizzle migrations in `./migrations` directory
- Schema defined in `./shared/schema.ts`
- Push schema changes with `npm run db:push`

The application follows a monorepo structure with shared TypeScript types and clear separation between client and server code. The architecture supports real-time GIS collaboration features and can be extended with additional map data sources and analysis tools.

## Recent Changes

### July 20, 2025
- Fixed assignment creation validation error by updating `insertAssignmentSchema` to use `z.coerce.date()` for proper date conversion
- Removed quick action buttons from teacher dashboard as requested by user
- Enhanced authentication error handling with automatic redirect to login on 401 errors
- Cleaned up debugging console logs for production readiness
- **Completed full grading workflow system:**
  - Fixed grade persistence using session-based mock storage
  - Updated submission status from "submitted" to "graded" after teacher grades
  - Implemented student grades page accessible to both teachers and students
  - Added grade display with score, percentage, and feedback on student interface
  - **Student dashboard improvements:** Filtered graded assignments from "Current Assignments" section
  - Assignments now properly move from current work to completed work after grading
  - Updated assignment statistics to exclude graded assignments from "due" count
  - Fixed average grade calculation to only include assignments with actual grades
- **Module-centric navigation redesign:**
  - Removed "Assignments" from sidebar navigation for cleaner interface
  - Made entire module cards clickable - users now click anywhere on module to view details
  - Created comprehensive module detail page showing module info and all assignments
  - **Assignment management improvements:** Added edit and delete functionality for teachers
  - Fixed assignment creation endpoint mismatch (now uses correct module-specific endpoint)
  - **Student management relocation:** Moved "Assign Students" functionality from modules list to module detail page
  - Added "Manage Students" dialog in module detail with enroll/remove capabilities
- **Code quality improvements (latest):** Comprehensive bug scan and cleanup completed
  - Removed all debugging console.log statements from production code
  - Fixed DialogContent accessibility warnings by adding DialogDescription to all dialogs
  - Fixed controlled/uncontrolled input warnings in forms by setting proper default values
  - Fixed duplicate method definition in IStorage interface
  - Enhanced objective display validation to handle undefined/empty arrays gracefully
  - Cleaned up server-side DEBUG statements for production readiness
- **Submission status fixes:** Fixed assignment submission tracking and grading workflow visibility
  - Fixed /api/submissions/recent endpoint to show real submission data instead of hardcoded mock data
  - Updated student dashboard to properly display "Submitted" status for completed assignments
  - Enhanced module detail page to show submission status badges for students
  - Fixed grading management to include all student submissions (including Jane Doe's submission)
  - Improved status display: Assigned → Submitted → Graded workflow now fully visible
- **Grading workflow fixes:** Fixed grading system to work universally for all students
  - Removed all hardcoded mock data and integrated with real database storage
  - Fixed individual submission retrieval to work for any submission ID
  - Updated grading endpoints to use proper database operations
  - Fixed redirect after grading to go back to grades page instead of outdated assignments page
  - Added proper cache invalidation to refresh grades list after grading
  - Enhanced cache invalidation to update all related UI components after grading (student submissions, assignments, etc.)
  - Fixed grades page to properly display "graded" status with green badge and "View Grade" button after grading
- All core functionality now working: authentication, student management, module creation, assignment creation/editing/deletion, submission workflow, and complete grading lifecycle
- **Assignment publishing system:** Added isPublished field to assignments table with default false value
  - Teachers can toggle assignment visibility using publish/unpublish buttons with eye icons
  - Students only see published assignments in their dashboard and module views
  - Assignment status indicators show "Published" (green) or "Unpublished" (gray) for teachers
  - Publishing changes are reflected immediately across all student interfaces
- **Teacher dashboard redesign:** Completely overhauled teacher dashboard to focus on real data and actionable items
  - Removed all mock/hardcoded data and replaced with live statistics from database
  - Added real-time pending submissions that need grading with direct "Grade" buttons
  - Removed "Active Modules" section as requested - now focuses purely on grading workflow
  - Updated stats to show: Total Modules, Total Students, Pending Grades, Completed Grades
  - Each pending submission shows student name, assignment title, submission date, and quick grade action
- **Authentication routing fix:** Fixed critical issue where teachers were seeing student dashboard instead of teacher dashboard
  - Problem was React rendering StudentDashboard first (when user=null) before switching to TeacherDashboard
  - Added proper loading state to prevent premature component mounting during authentication check
  - Enhanced user state management with proper effect dependency handling
  - Eliminated duplicate API calls from both dashboards mounting simultaneously
  - Now correctly shows only teacher interface with proper role-based routing
- **Module management system:** Added comprehensive module CRUD operations to module detail page
  - Teachers can now activate/deactivate modules with Power/PowerOff toggle buttons
  - Added module edit functionality with form validation for title, description, duration, and difficulty
  - Implemented module delete with cascading deletion to handle foreign key constraints
  - Added Active/Inactive status badge next to module titles for visual feedback
  - Backend API routes for PUT /api/modules/:id, DELETE /api/modules/:id, and PATCH /api/modules/:id/activate
  - Cascading delete properly removes grades, submissions, assignments, and enrollments before deleting module
  - Enhanced module detail header with management action buttons for teachers
  - **Safety enhancement:** Only inactive modules can be deleted - delete button is disabled for active modules
  - Backend validation prevents deletion of active modules with clear error message
  - UI provides helpful tooltip explaining deactivation requirement for deletion
- **Module visibility and publishing restrictions:** Enhanced access control for students and assignment publishing
  - Students now only see active modules in their dashboard and enrollments
  - Assignment publishing is restricted to active modules only
  - Cannot publish assignments in inactive modules - publish button disabled with helpful tooltip
  - Backend validation prevents publishing assignments when module is inactive
  - Student assignment queries now filter by both assignment and module active status
- **Enhanced module management UI:** Improved user experience and safety for module operations
  - Moved module management buttons (activate, edit, delete) to dedicated section at bottom of module detail page
  - Added confirmation dialog for module activation/deactivation with clear explanations of impacts
  - Module management section includes helpful status descriptions for active/inactive states
  - Separated management actions from navigation for cleaner header layout
- **January 20, 2025 - Latest Updates:**
   - **Application rebranding:** Changed app name from "EduGIS" to "CivicScape" throughout the codebase
     - Updated main header component and login page branding
     - Changed HTML document title to "CivicScape - Educational GIS Platform"
     - Updated project documentation and overview
     - Maintained all existing functionality while refreshing brand identity
   - **Professional GIS Integration:** Integrated National Geographic MapMaker for authentic mapping experience
     - Embedded National Geographic's professional MapMaker tool (https://www.arcgis.com/apps/instant/atlas/index.html)
     - Added session management for saving and loading map projects
     - Implemented export functionality for map sessions and data
     - Added comprehensive mapping controls and instructions
     - Replaced custom Leaflet implementation with industry-standard GIS tools
     - Provides access to real geographic data, population data, climate patterns, and professional analysis tools
   - **Assignment creation dialog restoration:** Fixed missing create assignment dialog in module detail page
     - Added complete form dialog with title, description, type, points, and due date fields
     - Connected "Add Assignment" button to properly open the creation dialog
     - Included proper form validation and submission handling
   - **Assignment editing validation fix:** Resolved 400 validation errors during assignment updates
     - Created updateAssignmentSchema for partial updates (doesn't require moduleId field)
     - Updated PUT /api/assignments/:id endpoint to use correct partial validation schema
     - Fixed form submissions to only send edited fields instead of requiring all original creation fields
   - **Student submission redirect improvement:** Enhanced user experience after assignment submission
     - Students now redirect to dashboard after successfully submitting assignments
     - Draft saves remain on same page for continued work
     - Only completed submissions trigger redirect to dashboard
   - **Module initialization change:** New modules now start as deactivated by default
     - Changed database schema default for modules.isActive from true to false
     - Teachers must explicitly activate modules before students can see them
     - Prevents accidentally publishing incomplete modules to students
  - **Assignment creation dialog restoration:** Fixed missing create assignment dialog in module detail page
    - Added complete form dialog with title, description, type, points, and due date fields
    - Connected "Add Assignment" button to properly open the creation dialog
    - Included proper form validation and submission handling
  - **Assignment editing validation fix:** Resolved 400 validation errors during assignment updates
    - Created updateAssignmentSchema for partial updates (doesn't require moduleId field)
    - Updated PUT /api/assignments/:id endpoint to use correct partial validation schema
    - Fixed form submissions to only send edited fields instead of requiring all original creation fields
  - **Student submission redirect improvement:** Enhanced user experience after assignment submission
    - Students now redirect to dashboard after successfully submitting assignments
    - Draft saves remain on same page for continued work
    - Only completed submissions trigger redirect to dashboard
  - **Module initialization change:** New modules now start as deactivated by default
    - Changed database schema default for modules.isActive from true to false
    - Teachers must explicitly activate modules before students can see them
    - Prevents accidentally publishing incomplete modules to students
- **January 20, 2025 - Code Cleanup and Performance Optimization:**
  - **Removed unused code:** Deleted unused pages (assignments.tsx, gis-editor.tsx) and their redundant routes
  - **Performance optimizations:** Added React.useMemo to dashboard components to prevent unnecessary re-renders
  - **Query client optimization:** Improved caching with 5-minute stale time for better performance
  - **Variable naming standardization:** Standardized location hook usage (setLocation vs navigate) across all components
  - **Removed unused imports:** Cleaned up ClipboardList import from sidebar and other unused dependencies
  - **Fixed duplicate key warnings:** Enhanced key generation in grades list to prevent React warnings
  - **Server-side cleanup:** Removed empty lines and redundant code from routes and storage interfaces
  - **Memoized utility functions:** Optimized status color and assignment type icon functions with useMemo
  - **Route optimization:** Consolidated duplicate grading routes and removed unused assignment routes
  - **Import optimization:** Removed unused icons and components from import statements throughout the app
  - **Mapping page cleanup:** Removed cluttered UI elements from National Geographic MapMaker integration
    - Removed redundant top bar with title, controls, and session counter
    - Removed "Map Controls" overlay card and "MapMaker Features" instruction card
    - Simplified to clean embedded MapMaker experience taking full available space
  - **Sidebar improvements:** Made sidebar narrower (192px vs 256px) and fully minimizable
    - Added collapse/expand toggle button with smooth animations
    - When collapsed shows only icons (64px wide) with tooltips
    - When expanded shows icons + labels with modern blue highlighting
    - Works consistently across all pages for teachers and students
  - **Student dashboard bug fix:** Fixed "Button is not defined" error by adding missing Button component import
- **Assignment submission and due date fixes:** Resolved critical issues with assignment submissions and date displays
  - Fixed assignment submission to allow text-only responses without requiring file uploads
  - Added proper content validation requiring at least written response, map data, or file attachments for submission
  - Fixed "12/31/1969" due date display issue throughout application (student dashboard, module detail, assignment submission)
  - Updated overdue logic to properly handle assignments without due dates (no longer shows "overdue" for assignments with no due date)
  - Enhanced late submission detection in grading system to avoid invalid date comparisons
- **January 21, 2025 - Draft submission and UI improvements:**
  - **Fixed draft submission workflow:** Drafts are now properly filtered from teacher grading interface using backend query filtering
  - Teachers only see submitted or graded submissions, preventing confusion with incomplete work
  - Updated student dashboard to show proper status badges: "Draft Saved", "Submitted", and "Graded"
  - Students can continue editing drafts with "Continue Draft" button vs "Start Assignment" for new work
  - **Removed login success popup** for smoother user experience during authentication
  - **Updated grades filter categories:** Removed "assigned" category, now only shows "Submitted" and "Graded" statuses
  - **Fixed module enrollment display:** Backend now includes actual enrollment counts instead of hardcoded "0 students"
  - Enhanced module cards to show correct enrollment count with proper singular/plural formatting
  - **Missing submissions tracking:** Added comprehensive missing submissions feature to assignment detail pages
  - Teachers can now see which enrolled students haven't submitted assignments with overdue calculations
  - Backend endpoint `/api/assignments/:id/missing` provides filtered list excluding students with submitted/graded work
  - Clean sidebar integration showing missing count and overdue badges for late submissions
- **January 21, 2025 - Student management enhancements:**
  - **Clickable student cards:** Student cards on Students page now link to individual student detail pages
  - **Comprehensive student detail pages:** Include student info, email functionality, module enrollment management, and submissions tracking
  - **Teacher ownership restrictions:** Teachers can only enroll/remove students from their own modules, other modules shown as read-only
  - **Filtered submissions display:** Recent submissions exclude drafts and show assignment names as clickable links to grading pages
  - **Module separation:** Student detail shows "Your Modules" (manageable) vs "Other Modules" (read-only) for clear ownership boundaries
- **January 21, 2025 - Complete notification system implementation:**
  - **Full notification infrastructure:** Added notifications table to database schema with support for different notification types
  - **Real-time notification bell:** Implemented functional notification dropdown in header with unread count badge and "Mark all read" functionality
  - **Teacher notifications:** Teachers receive notifications when students submit assignments with student name and assignment details
  - **Student notifications:** Students receive notifications when new assignments are published in their enrolled modules
  - **Grading notifications:** Students automatically receive notifications when their assignments are graded with score and feedback preview
  - **Interactive notifications:** Click any notification to navigate to relevant page and automatically mark as read
  - **Navigation system:** Notifications intelligently route users to assignment submission pages, grading interfaces, or assignment details based on type and user role
  - **Database integration:** Full CRUD operations for notifications with proper relations to users, assignments, and submissions
  - **API endpoints:** Complete REST API for fetching notifications, getting unread counts, marking all as read, and marking individual notifications as read
  - **Automatic notification creation:** Notifications are automatically created when assignments are published, submissions are received, or assignments are graded
  - **UI/UX enhancements:** Notification dropdown shows up to 10 recent notifications with timestamps, read/unread status, clickable interface, and clean scrollable design
  - **Smart routing:** Assignment graded notifications route students to submission pages, new assignment notifications route to assignment pages, submission received notifications route teachers to grading interfaces