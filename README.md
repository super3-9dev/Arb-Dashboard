# Arb Tracker Dashboard

A real-time dashboard for tracking arbitrage opportunities from multiple data sources.

## Features

- **Real-time Data**: WebSocket connection to backend for live updates
- **Arbitrage Detection**: Automatically finds matches with same team names across data sources
- **Profit Calculation**: Calculates potential profit percentage for each opportunity
- **Dual Data Sources**: Golbet724 and orbitxch data comparison
- **Responsive Design**: Works on desktop and mobile devices
- **Auto-reconnection**: Automatically reconnects if connection is lost

## How It Works

The dashboard receives data from two sources:
1. **Golbet724**: From golbet724 scraper
2. **orbitxch**: From orbitxch scraper

It then automatically:
- Matches teams with identical names (case-insensitive)
- Calculates profit potential between the two sources
- Displays only opportunities where the same match appears in both sources
- Sorts opportunities by profit percentage (highest first)

## Prerequisites

- Node.js 16+ 
- Backend server running on port 8000

## Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Build for production:
```bash
npm run build
```

4. Preview production build:
```bash
npm run preview
```

## Backend Connection

The frontend connects to the backend via WebSocket at `ws://localhost:8000/ws`. Make sure your backend server is running before starting the frontend.

## Data Structure

The dashboard receives data in the following format:

```typescript
interface WebSocketData {
  api_data: MatchData[];    // From golbet724 scraper
  dom_data: MatchData[];    // From orbitxch scraper
}

interface MatchData {
  id: string;               // Unique match identifier
  team_1: string;          // Home team
  team_2: string;          // Away team  
  average: number;          // Average odds
}
```

And creates arbitrage opportunities:

```typescript
interface ArbitrageOpportunity {
  id: string;               // Combined ID from both sources
  team_1: string;          // Home team name
  team_2: string;          // Away team name
  api_odds: number;        // Odds from Golbet724 source
  dom_odds: number;        // Odds from orbitxch source
  api_source: string;      // Source label (Golbet724)
  dom_source: string;      // Source label (orbitxch)
  profit_percentage: number; // Calculated profit potential
}
```

## Development

- Built with React 18 + TypeScript
- Vite for fast development and building
- Sonner for toast notifications
- CSS Grid and Flexbox for responsive layout

## Project Structure

```
src/
├── components/
│   └── Dashboard.tsx    # Main dashboard component with arbitrage logic
├── App.tsx              # App routing
├── main.tsx             # Entry point
└── index.css            # Global styles
```

## Profit Calculation

The profit percentage is calculated using the formula:
```
profit_percentage = ((max_odds / min_odds) - 1) * 100
```

This shows the potential profit if you bet on the higher odds and lay on the lower odds.

## UI Features

- **Connection Status**: Positioned in the top-right corner showing connection state
- **Statistics Cards**: Display match counts from both sources and found opportunities
- **Arbitrage Cards**: Show detailed information for each opportunity including:
  - Profit percentage badge
  - Team names with color coding
  - Odds comparison between sources
  - Profitability indicator
