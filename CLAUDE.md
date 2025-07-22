# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TensorAI is a React-based intelligent knowledge retrieval system that provides multi-domain information access through streaming chat interfaces. The application connects to a Spring Boot backend (Tensor-AI) and supports four main functional modules: process/system retrieval, product/technical documentation search, AI knowledge retrieval, and resume screening assistance.

## Key Commands

### Development Commands
```bash
# Start development environment with proxy
npm run dev
# OR use the development script
./start-dev.sh

# Start React dev server only (port 3001 - requires Nginx proxy for API access)
npm start

# Start CORS proxy server only (port 3001)
npm run start:proxy

# Build for production
npm run build

# Run tests
npm test
```

### Production Deployment
```bash
# Deploy to production environment
./update-prod.sh

# View build history
./list-builds.sh

# Rollback to previous version
./rollback.sh
```

## Architecture Overview

### Frontend Stack
- **React 19.1.0** with TypeScript 4.9.5
- **Ant Design 5.12.2** for UI components
- **React Router DOM 7.6.1** for routing
- **React Markdown 10.1.0** with syntax highlighting and math support
- **Axios 1.9.0** for HTTP requests

### Key Architectural Patterns

**Context-Based State Management**
- `ChatContext` (`src/context/ChatContext.tsx`) manages all application state
- Session-based state management for handling multiple concurrent conversations
- Real-time streaming response handling with pause/resume capabilities

**API Layer Architecture**
- `ApiClient` class (`src/services/api/client.ts`) handles all backend communication
- Built-in retry logic, request throttling, and error handling
- Support for both streaming SSE and traditional REST endpoints
- CORS proxy server (`cors-proxy.js`) for development environment

**Component Structure**
- Modular component architecture under `src/components/`
- Separation of concerns: Auth, Chat, Common, Layout, Sidebar
- Reusable utilities for markdown processing and file handling

### Environment Configuration

**Development Environment**
- React dev server: `localhost:3001` (internal)
- Nginx proxy access: `http://192.168.1.131:3002` (use this URL)
- CORS proxy for API calls to backend at `192.168.1.131:8080`

**Production Environment**
- Internal: `http://192.168.1.131:3000`
- Public: `http://123.207.100.71:5006` (via npc tunnel)
- Static file serving from `/var/www/tensorai/`

## Key Implementation Details

### Streaming Chat Implementation
- Server-Sent Events (SSE) for real-time message streaming
- Reference data accumulation during streaming responses
- Debounced UI updates to optimize performance
- Session-based flow control with pause/resume functionality

### Authentication & Session Management
- Token-based authentication with localStorage persistence
- Multi-application support via `appid` parameter
- URL-based state restoration for deep linking
- Automatic session title generation from first user message

### Reference System
- Real-time document reference collection during chat
- Support for both chunk-level and document-level references
- Reference data persistence and display in chat interface
- Integration with backend knowledge base search

## Development Guidelines

### Code Style & Patterns
- TypeScript strict mode enabled
- Functional components with hooks
- Context API for state management instead of Redux
- Error boundaries and comprehensive error handling
- Extensive logging in development environment

### API Integration
- All API calls go through the centralized `ApiClient`
- Built-in request throttling (1.5 second intervals)
- Automatic retry with exponential backoff
- Network status monitoring and offline handling

### Testing Considerations
- React Testing Library setup included
- Jest configuration for component testing
- Test utilities in `src/setupTests.ts`

## Common Development Tasks

When working with chat functionality:
- Messages are managed through `ChatContext` 
- Always use the context methods for state updates
- Stream handling is built into `apiClient.streamChatMessage()`
- Reference data accumulates automatically during streaming

When adding new routes:
- Update `functionRoutes` in `NavigationBar.tsx`
- Add corresponding components under appropriate directories
- Ensure proper authentication guards are in place

When modifying API calls:
- Use the existing `ApiClient` methods when possible
- Add new methods to `ApiClient` class for new endpoints
- Follow the established error handling patterns
- Consider request throttling for high-frequency calls

## Important Notes

- **Never use port 3001 directly** - always access development environment via Nginx proxy on port 3002
- **API proxy configuration** is critical - all `/api/*` requests are forwarded to backend
- **localStorage keys** use `ragflow_*` prefix for consistency
- **Session state management** is complex - always use context methods rather than direct state manipulation
- **Streaming responses** require careful handling of partial data and reference accumulation