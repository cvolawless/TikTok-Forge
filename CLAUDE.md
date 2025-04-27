# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Remotion (Video Generation)
- Build: `cd remotion && npm run build`  
- Dev server: `cd remotion && npm run dev`
- Render video: `cd remotion && npm run render`
- Lint: `cd remotion && npm run lint`
- TypeCheck: `cd remotion && npm run typecheck`

### API (Python)
- Run API: `cd api && python app.py`
- Docker: `docker-compose up`
- Format: `cd api && black .`

## Code Style

### TypeScript/React (Remotion)
- Use TypeScript types for all components and functions
- Follow component structure in `remotion/src/compositions/`
- Use tailwind for styling as configured in tailwind.config.js
- Use named exports for components
- Organize imports: React first, then external libraries, then local

### Python (API)
- Follow PEP 8 guidelines
- Use Flask blueprints for API organization
- Handle errors with appropriate status codes
- Document API endpoints with docstrings

## Project Structure
- `api/`: Flask backend service
- `remotion/`: Video generation frontend
- Docker containers orchestrated via docker-compose.yml