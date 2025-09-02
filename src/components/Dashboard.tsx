import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';

interface MatchData {
  id: string;
  team_1: string;
  team_2: string;
  average: number;
  market_id: string;
}

interface WebSocketData {
  api_data: MatchData[];
  dom_data: MatchData[];
}

interface ArbitrageOpportunity {
  id: string;
  team_1: string;
  team_2: string;
  api_odds: number;
  dom_odds: number;
  api_source: string;
  dom_source: string;
  profit_percentage: number;
  market_id: string;
}

export default function Dashboard() {
  const [isConnected, setIsConnected] = useState(false);
  const [apiData, setApiData] = useState<MatchData[]>([]);
  const [domData, setDomData] = useState<MatchData[]>([]);
  const [arbitrageOpportunities, setArbitrageOpportunities] = useState<ArbitrageOpportunity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);

  // Function to find matching teams and create arbitrage opportunities
  const findArbitrageOpportunities = (api: MatchData[], dom: MatchData[]) => {
    const opportunities: ArbitrageOpportunity[] = [];

    api.forEach(apiMatch => {
      dom.forEach(domMatch => {
        // Check if team names match (case-insensitive)
        if (
          (apiMatch.team_1.toLowerCase() === domMatch.team_1.toLowerCase() &&
            apiMatch.team_2.toLowerCase() === domMatch.team_2.toLowerCase()) ||
          (apiMatch.team_1.toLowerCase() === domMatch.team_2.toLowerCase() &&
            apiMatch.team_2.toLowerCase() === domMatch.team_1.toLowerCase())
        ) {
          // Calculate profit percentage
          console.log(apiMatch.team_1, apiMatch.team_2, domMatch.team_1, domMatch.team_2)
          const profit_percentage = ((Math.max(apiMatch.average, domMatch.average) / Math.min(apiMatch.average, domMatch.average)) - 1) * 100;
          if (profit_percentage > -1 && profit_percentage < 30 && apiMatch.average >= domMatch.average) {
            opportunities.push({
              id: `${apiMatch.id}_${domMatch.id}`,
              team_1: apiMatch.team_1,
              team_2: apiMatch.team_2,
              api_odds: apiMatch.average,
              dom_odds: domMatch.average,
              api_source: 'Golbet724',
              dom_source: 'orbitxch',
              profit_percentage: profit_percentage,
              market_id: domMatch.market_id
            });
          }
        }
      });
    });

    // Sort by profit percentage (highest first)
    return opportunities.sort((a, b) => b.profit_percentage - a.profit_percentage);
  };

  const connectWebSocket = () => {
    try {
      const ws = new WebSocket("wss://90e4e773bc2a.ngrok-free.app/ws");

      ws.onopen = () => {
        console.log('WebSocket connected to backend');
        setIsConnected(true);
        setIsLoading(false);
        toast.success('Connected to backend successfully!');
      };

      ws.onmessage = (event) => {
        try {
          const data: WebSocketData = JSON.parse(event.data);
          console.log('Received data from backend:', data);

          setApiData(data.api_data || []);
          setDomData(data.dom_data || []);

          // Find arbitrage opportunities
          const opportunities = findArbitrageOpportunities(data.api_data || [], data.dom_data || []);
          setArbitrageOpportunities(opportunities);

          console.log('Found arbitrage opportunities:', opportunities);
        } catch (error) {
          console.error('Error parsing WebSocket data:', error);
        }
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
        toast.error('Connection lost. Reconnecting...');

        // Reconnect after 3 seconds
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
        reconnectTimeoutRef.current = window.setTimeout(() => {
          connectWebSocket();
        }, 3000);
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsConnected(false);
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
      toast.error('Failed to connect to backend');
      setIsLoading(false);
    }
  };

  useEffect(() => {
    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  const handleReconnect = () => {
    if (wsRef.current) {
      wsRef.current.close();
    }
    setIsLoading(true);
    connectWebSocket();
  };

  const renderArbitrageCard = (opportunity: ArbitrageOpportunity) => (
    <div key={opportunity.id} className="arbitrage-card">
      <div className="arbitrage-header">
        <span className="profit-badge">
          {opportunity.profit_percentage > 0 ? '+' : ''}{opportunity.profit_percentage.toFixed(2)}%
        </span>
      </div>

      <div className="teams">
        <div className="team team-1">{opportunity.team_1}</div>
        <div className="vs">vs</div>
        <div className="team team-2">{opportunity.team_2}</div>
      </div>

      <div className="odds-comparison" onClick={() => window.open(`https://orbitxch.com/customer/sport/1/market/${opportunity.market_id}`, '_blank')}>
        <div className="odds-pair">
          <span className="source-label">{opportunity.api_source}</span>
          <span className="odds-value">{opportunity.api_odds.toFixed(2)}</span>
        </div>
        <div className="odds-pair">
          <span className="source-label">{opportunity.dom_source}</span>
          <span className="odds-value">{opportunity.dom_odds.toFixed(2)}</span>
        </div>
      </div>

      <div className="arbitrage-footer">
        <span className="profit-indicator">
          {opportunity.profit_percentage > 0 ? '💰 Profitable' : '⚠️ No Profit'}
        </span>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Connecting to backend...</p>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-content">
          <h1>Arb Tracker Dashboard</h1>
          <div className="connection-status">
            <span className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}>
              {isConnected ? '●' : '○'}
            </span>
            <span className="status-text">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
            {!isConnected && (
              <button onClick={handleReconnect} className="reconnect-btn">
                Reconnect
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="dashboard-content">
        <div className="stats-section">
          <div className="stat-card">
            <h3>Golbet724</h3>
            <span className="stat-value">{apiData.length}</span>
            <span className="stat-label">matches</span>
          </div>
          <div className="stat-card">
            <h3>orbitxch</h3>
            <span className="stat-value">{domData.length}</span>
            <span className="stat-label">matches</span>
          </div>
          <div className="stat-card">
            <h3>Arbitrage Opportunities</h3>
            <span className="stat-value">{arbitrageOpportunities.length}</span>
            <span className="stat-label">found</span>
          </div>
        </div>

        <section className="arbitrage-section">
          <h2>Arbitrage Opportunities ({arbitrageOpportunities.length})</h2>
          <div className="arbitrage-grid">
            {arbitrageOpportunities.length > 0 ? (
              arbitrageOpportunities.map(opportunity => renderArbitrageCard(opportunity))
            ) : (
              <div className="no-opportunities">
                <p>No arbitrage opportunities found</p>
                <p className="subtitle">
                  {apiData.length === 0 || domData.length === 0
                    ? 'Waiting for data from both sources...'
                    : 'No matching team names between Golbet724 and orbitxch data'
                  }
                </p>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
