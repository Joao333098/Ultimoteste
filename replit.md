# Overview

VoiceScribe AI is a real-time speech transcription and AI analysis platform. The application enables users to record audio through their microphone, automatically transcribe speech to text in real-time, and perform intelligent analysis of the transcribed content using AI. The system supports multi-language detection, provides AI-powered question answering about transcribed content, and maintains a history of transcription sessions.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture

The frontend is built using React with TypeScript and modern tooling:

- **Framework**: React 18 with TypeScript for type safety
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack React Query for server state management and caching
- **UI Framework**: shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens and CSS variables
- **Build Tool**: Vite for fast development and optimized production builds

Key architectural decisions:
- Component-based architecture with reusable UI components
- Custom hooks for speech recognition and AI analysis functionality
- Separation of concerns between UI components and business logic
- TypeScript for compile-time type checking and better developer experience

## Backend Architecture

The backend follows a REST API pattern using Express.js:

- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **API Design**: RESTful endpoints for session management and AI analysis
- **Storage**: In-memory storage implementation with interface for future database integration
- **Development**: Hot reloading with Vite middleware integration

Key architectural decisions:
- Interface-based storage abstraction allowing easy migration to persistent databases
- Middleware pattern for request logging and error handling
- Separation of route handlers from business logic
- Express middleware for JSON parsing and CORS handling

## Data Storage Solutions

Currently implements in-memory storage with planned PostgreSQL integration:

- **Schema Definition**: Drizzle ORM with TypeScript schema definitions
- **Database**: Configured for PostgreSQL with Neon Database serverless
- **Migrations**: Drizzle Kit for schema migrations
- **Data Models**: Users, transcription sessions, and AI analyses

Key architectural decisions:
- Schema-first approach with Zod validation
- Separate insert and select types for type safety
- UUID primary keys for scalability
- JSON fields for flexible language arrays

## Authentication and Authorization

Basic structure in place for future authentication:

- User schema defined with username/password fields
- Session-based authentication planned
- Interface methods for user management implemented

## External Service Integrations

The application integrates with AI services for transcription and analysis:

- **Speech Recognition**: Browser Web Speech API for real-time transcription
- **AI Analysis**: OpenAI GPT-5 for content analysis and question answering
- **Language Detection**: Client-side language detection with server-side AI enhancement
- **Summary Generation**: AI-powered content summarization

Key architectural decisions:
- Browser-native speech recognition for real-time performance
- Server-side AI processing for complex analysis tasks
- Fallback mechanisms for speech recognition failures
- Structured JSON responses from AI services for consistent data handling

## Development and Deployment

- **Development**: Vite dev server with HMR and Express backend
- **Build Process**: Vite for frontend bundling, esbuild for backend compilation
- **Environment**: Replit-optimized with development banner integration
- **Type Checking**: Comprehensive TypeScript configuration across frontend and backend

The architecture prioritizes real-time performance for speech transcription while maintaining flexibility for future enhancements and database integration.

# External Dependencies

## Core Framework Dependencies
- **React 18**: Frontend framework with modern hooks and concurrent features
- **Express.js**: Backend web framework for REST API
- **TypeScript**: Type safety across frontend and backend
- **Vite**: Development server and build tool

## UI and Styling
- **shadcn/ui**: Component library built on Radix UI primitives
- **Radix UI**: Headless UI components for accessibility
- **Tailwind CSS**: Utility-first CSS framework
- **Lucide React**: Icon library

## Database and ORM
- **Drizzle ORM**: TypeScript-first ORM for database operations
- **Neon Database**: Serverless PostgreSQL database
- **Drizzle Kit**: Database migration tool

## AI and External Services
- **OpenAI**: GPT-5 API for content analysis and question answering
- **Web Speech API**: Browser-native speech recognition

## State Management and Data Fetching
- **TanStack React Query**: Server state management and caching
- **Zod**: Schema validation and TypeScript integration

## Development Tools
- **Replit**: Development environment with specialized plugins
- **esbuild**: Fast JavaScript bundler for production
- **PostCSS**: CSS processing with Tailwind

## Additional Libraries
- **date-fns**: Date manipulation utilities
- **clsx/tailwind-merge**: Conditional CSS class utilities
- **wouter**: Lightweight React router
- **react-hook-form**: Form state management