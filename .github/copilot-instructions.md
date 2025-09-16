# IMSCC QC Next - Canvas Course QA Tool

Always reference these instructions first and fallback to search or bash commands only when you encounter unexpected information that does not match the info here.

## Overview
IMSCC QC Next is a Next.js 15.5.3 web application built with React 19, TypeScript, and Adobe React Spectrum UI components. It allows users to upload IMSCC 1.1 archives (Canvas course cartridges) and perform quality checks including accessibility analysis, link validation, and course structure review. The application also includes iOS mobile capabilities via Capacitor.

## Working Effectively

### Prerequisites
- Node.js v20.19.5+ (confirmed working version)
- pnpm package manager (required - this project uses pnpm-lock.yaml)

### Setup and Installation
Install pnpm globally if not available:
```bash
npm install -g pnpm
```

Bootstrap and install dependencies:
```bash
pnpm install
```
- **TIMING**: Takes ~46 seconds. NEVER CANCEL. Set timeout to 60+ minutes for safety.
- **WARNING**: You may see warnings about ignored build scripts for @tailwindcss/oxide, sharp, and unrs-resolver - this is normal.

### Core Development Commands

#### Linting
```bash
pnpm run lint
```
- **TIMING**: Takes ~3 seconds
- Uses ESLint with Next.js TypeScript configuration
- ALWAYS run this before committing changes or CI will fail

#### Building
```bash
pnpm run build
```
- **TIMING**: Takes ~32 seconds. NEVER CANCEL. Set timeout to 60+ minutes.
- Uses Next.js with Turbopack for faster builds
- Outputs optimized production build to `.next/` directory
- **CRITICAL**: Build process includes automatic linting and type checking

#### Development Server
```bash
pnpm run dev
```
- Starts development server on http://localhost:3000
- Uses Turbopack for fast refresh and hot module replacement
- **TIMING**: Takes ~2 seconds to start, typically ready in under 1.3 seconds
- Application loads in browser showing "Canvas Course QA Tool" interface

#### Production Server
```bash
pnpm run start
```
- **NOTE**: Runs the production build (requires `pnpm run build` first)
- **KNOWN ISSUE**: May have routing issues in some environments - use dev server for testing changes

## Validation and Testing

### Manual Application Testing
After making changes, ALWAYS test the application functionality:

1. **Start the application**: `pnpm run dev`
2. **Navigate to**: http://localhost:3000
3. **Verify UI loads**: Should see "Canvas Course QA Tool" heading
4. **Test file upload**: Click "Pick IMSCC File" button - file chooser should open
5. **Test sample link**: Click "Growing with Canvas by Education Services" link - should open external Google Drive
6. **Verify responsiveness**: Check that Adobe React Spectrum components render properly

### Key User Scenarios to Test
- **File Upload Flow**: Pick IMSCC file → Run QA Checks → View results
- **Accessibility**: Application uses Adobe React Spectrum for built-in accessibility
- **Link Checking**: External links to Canvas Commons and Google Drive work
- **Results Display**: After selecting file and running checks, results should appear in the Results section

### Build Validation
```bash
pnpm run lint && pnpm run build
```
- **TIMING**: Total ~35 seconds (3s lint + 32s build). NEVER CANCEL.
- This is the exact validation the CI system will run

## Mobile/iOS Development

### iOS App Structure
- **Location**: `ios/` directory contains complete iOS app built with Capacitor
- **Framework**: Uses Capacitor to wrap the web application as a native iOS app
- **Target**: iOS 14.0+ (as specified in Podfile)
- **Bundle ID**: Configured in `ios/App/App/Info.plist`

### iOS Development Commands
**NOTE**: iOS development requires macOS with Xcode. The iOS directory exists but cannot be built/tested in this Linux environment.

On macOS with Xcode:
```bash
cd ios/App
pod install
# Open App.xcworkspace in Xcode to build and test
```

## Codebase Structure and Navigation

### Key Directories
- **`app/`**: Main Next.js application using App Router
  - **`app/page.tsx`**: Main homepage component with file upload interface
  - **`app/layout.tsx`**: Root layout with Adobe React Spectrum Provider
  - **`app/provider.tsx`**: Client-side providers setup
  - **`app/lib/`**: Core business logic
    - **`definitions.ts`**: TypeScript interfaces for IMSCC data structures
    - **`imscc-handling.ts`**: IMSCC file parsing and analysis
    - **`link-checker.ts`**: Link validation functionality
  - **`app/(results)/`**: Results display components
  - **`app/ui/`**: Reusable UI components

### Important Files
- **`package.json`**: Project dependencies and scripts
- **`next.config.ts`**: Next.js configuration with Adobe React Spectrum transpilation
- **`tsconfig.json`**: TypeScript configuration
- **`eslint.config.mjs`**: ESLint configuration for Next.js TypeScript
- **`postcss.config.mjs`**: PostCSS with Tailwind CSS 4

### Key Dependencies
- **Next.js 15.5.3**: React framework with Turbopack
- **React 19.1.0**: Latest React version
- **Adobe React Spectrum**: Complete UI component library and design system
- **Axe-core**: Accessibility testing engine
- **JSZip**: For handling IMSCC zip file extraction
- **Linkinator**: Link validation tool

## Common Tasks and Troubleshooting

### Adding New Features
1. **UI Components**: Use Adobe React Spectrum components instead of custom CSS
2. **Type Safety**: Always add TypeScript interfaces to `app/lib/definitions.ts`
3. **Accessibility**: Leverage React Spectrum's built-in accessibility features
4. **File Processing**: Extend `app/lib/imscc-handling.ts` for new IMSCC analysis features

### Performance Considerations
- **Turbopack**: Enabled for both dev and build for faster compilation
- **Tree Shaking**: Next.js automatically optimizes bundle size
- **Code Splitting**: Use dynamic imports for heavy libraries like JSZip

### Debugging
- **Browser DevTools**: Application includes React DevTools integration
- **Next.js DevTools**: Available in development mode
- **Type Checking**: Use `npx tsc --noEmit` for standalone type checking

### Known Working Commands Summary
```bash
# Essential workflow - ALWAYS run these in order:
pnpm install                 # 46s - NEVER CANCEL
pnpm run lint               # 3s
pnpm run build              # 32s - NEVER CANCEL  
pnpm run dev                # Start development server
```

### Common File Paths for Quick Reference
```
├── app/
│   ├── page.tsx                    # Main upload interface
│   ├── layout.tsx                  # App layout with providers
│   ├── lib/
│   │   ├── definitions.ts          # Type definitions
│   │   ├── imscc-handling.ts       # Core IMSCC processing
│   │   └── link-checker.ts         # Link validation
│   ├── (results)/                  # Results display components
│   └── ui/                         # Reusable components
├── ios/App/                        # iOS/Capacitor mobile app
├── package.json                    # Scripts and dependencies
├── next.config.ts                  # Next.js configuration
└── tsconfig.json                   # TypeScript config
```

Remember: This is a Canvas course quality assurance tool - always test with actual IMSCC files when making changes to file processing logic.