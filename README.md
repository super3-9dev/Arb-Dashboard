# Arb Dashboard

A real-time arbitrage betting dashboard built with React, TypeScript, and Vite. This application provides live monitoring of betting opportunities across multiple providers with WebSocket connectivity.

## Features

- **Real-time Data**: Live WebSocket connection for instant updates
- **Authentication**: Secure login system with JWT tokens
- **Responsive Design**: Mobile-friendly interface that adapts to all screen sizes
- **Toast Notifications**: User-friendly feedback using Sonner toast library
- **Filtering**: Advanced filtering by providers, markets, selections, and sports
- **Sound Alerts**: Configurable audio notifications for new opportunities
- **Exchange Integration**: Support for Betfair, Betdaq, and Smarkets

## Tech Stack

- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite
- **Routing**: React Router DOM
- **Real-time**: Socket.IO Client
- **Notifications**: Sonner (Toast notifications)
- **Styling**: CSS with responsive design

## Prerequisites

- Node.js (version 16 or higher)
- npm or yarn package manager

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd arb-dashboard
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:5173`

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## Project Structure

```
src/
├── components/
│   ├── Dashboard.tsx      # Main dashboard component
│   ├── Login.tsx          # Authentication component
│   └── ProtectedRoute.tsx # Route protection wrapper
├── lib/
│   └── constants.ts       # Application constants
├── App.tsx                # Main application component
├── main.tsx              # Application entry point
└── index.css             # Global styles
```

## Configuration

The application connects to external services:

- **WebSocket**: `https://ws.arbitragex.pro`
- **Login API**: `https://login.arbitragex.pro/login`

## Features

### Dashboard
- Real-time arbitrage opportunity monitoring
- Provider and market filtering
- Sport and selection categorization
- Expiring opportunity alerts
- Sound notifications with volume control
- Debug mode for development

### Authentication
- JWT token-based authentication
- Secure token storage
- Automatic token validation
- Redirect to login on authentication failure

### Responsive Design
- Mobile-first approach
- Adaptive layouts for all screen sizes
- Touch-friendly interface elements

## Development

This project uses:
- **TypeScript** for type safety
- **ESLint** for code quality (if configured)
- **Prettier** for code formatting (if configured)

## Building for Production

```bash
npm run build
```

The built files will be in the `dist/` directory, ready for deployment.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is private and proprietary.

## Support

For support or questions, please contact the development team.
