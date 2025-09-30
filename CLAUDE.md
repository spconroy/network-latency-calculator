# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Network Latency Calculator - A Next.js application that calculates theoretical network latency between two geographic locations based on physical distance and the speed of light in fiber optic cables.

## Development Commands

```bash
# Run development server (http://localhost:3000)
npm run dev

# Build production bundle
npm run build

# Start production server
npm start

# Run linter
npm lint

# Export static site to /out directory
npm run export
```

## Tech Stack

- **Framework**: Next.js 14.2.8 (Pages Router)
- **Styling**: Tailwind CSS with shadcn/ui components
- **Mapping**: React Leaflet 4.2.1 with OpenStreetMap tiles
- **Geocoding API**: OpenStreetMap Nominatim API
- **Build Output**: Static export configured (`output: 'export'` in next.config.mjs)

## Architecture

### Project Structure
- [src/pages/](src/pages/) - Next.js pages using Pages Router
  - [index.js](src/pages/index.js) - Home page that renders the calculator
  - [_app.js](src/pages/_app.js) - App wrapper
  - [_document.js](src/pages/_document.js) - Document wrapper
- [src/components/](src/components/) - React components
  - [latency_calculator.jsx](src/components/latency_calculator.jsx) - Main calculator component with all features
  - [map-view.jsx](src/components/map-view.jsx) - Leaflet map component (dynamically imported, SSR disabled)
  - [ui/](src/components/ui/) - shadcn/ui components (Card, Input, Label, Button, Select)
- [src/lib/](src/lib/) - Utility functions
  - [utils.js](src/lib/utils.js) - Contains `cn()` helper for className merging
- [src/styles/](src/styles/) - Global styles and CSS variables

### Path Aliases
The project uses `@/` as an alias for the `src/` directory (configured in [jsconfig.json](jsconfig.json)):
```javascript
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
```

### Component System
- Uses shadcn/ui components configured via [components.json](components.json)
- Components are non-RSC (React Server Components disabled: `"rsc": false`)
- Uses JavaScript, not TypeScript (`"tsx": false`)

### Calculator Features
The [latency_calculator.jsx](src/components/latency_calculator.jsx) component provides:

**Input Options:**
- Origin and destination addresses/cities (text input)
- Medium type selector: Fiber Optic, Copper Cable, Wireless 5G, Satellite (GEO)
- Real-world multiplier: 1x, 1.5x, 2x, 3x (accounts for equipment delay and network conditions)

**Calculation Flow:**
1. Geocodes addresses using OpenStreetMap Nominatim API
2. Calculates distance using Haversine formula (accounts for Earth's curvature)
3. Computes theoretical latency based on medium-specific propagation speed
4. Calculates real-world latency estimate using multiplier
5. Displays interactive map with markers and connection line

**Output Display:**
- Distance (km and miles)
- One-way theoretical latency
- Round-trip time (RTT)
- Estimated real-world latency with visual quality indicator
- Interactive map showing geographic route
- Comparison table of different connection types
- Related network tools section

### Styling System
- Tailwind CSS with custom theme configuration in [tailwind.config.js](tailwind.config.js)
- Uses CSS variables for theming (defined in [src/styles/globals.css](src/styles/globals.css))
- shadcn/ui design tokens: border, input, ring, background, foreground, primary, secondary, destructive, muted, accent, popover, card
- Responsive design with mobile-first approach

## Static Export Configuration

The app is configured for static export:
- `output: 'export'` in [next.config.mjs](next.config.mjs)
- Image optimization disabled for static compatibility
- Builds to `/out` directory
- No server-side runtime required
- Leaflet map component uses dynamic import with `ssr: false` to avoid SSR issues

## Medium Type Configurations

The calculator supports multiple transmission mediums with specific propagation speeds:
- **Fiber Optic**: 200,000 km/s (~5ms per 1000km)
- **Copper Cable**: 200,000 km/s (~5ms per 1000km)
- **Wireless 5G**: 200,000 km/s + processing overhead
- **Satellite (GEO)**: 300,000 km/s (~119ms to geostationary orbit at 35,786 km)