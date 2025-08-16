import React, { useEffect, useMemo, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

type Opportunity = {
  id: string
  provider: string
  sport: string
  market_name: string
  runner: string
  arb_percentage: number
  lastSeen: number
  betfair_url?: string
  betfair_market_id?: string
  event_id_betfair?: string
  event_id_provider?: string
  // New fields from server
  teams?: string
  tournament?: string
  timestamp?: string
  back_odds?: number
  lay_odds?: number
  betfair_lay_size?: number
  provider_market_id?: string
  provider_url?: string
  handicap_name?: string
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [isConnected, setIsConnected] = useState(false)
  const [opps, setOpps] = useState<Opportunity[]>([])
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [showFilters, setShowFilters] = useState(false)
  const [selectedExchanger, setSelectedExchanger] = useState<'betfair' | 'betdaq' | 'smarkets'>('betfair')

  // Filter states
  const [selectedSports, setSelectedSports] = useState<string[]>(['soccer'])
  const [selectedMarkets, setSelectedMarkets] = useState<string[]>(['over-under', 'match-odds', 'half-time'])
  const [selectedSelections, setSelectedSelections] = useState<string[]>(['over', 'other'])
  const [selectedProviders, setSelectedProviders] = useState<string[]>(['golbet724', 'golbet724_pre', 'papa', 'onwin'])
  const [arbMinPercentage, setArbMinPercentage] = useState(-1)
  const [arbMaxPercentage, setArbMaxPercentage] = useState(30)
  const [oddsMin, setOddsMin] = useState(1.00)
  const [oddsMax, setOddsMax] = useState(20.00)

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const socketRef = useRef<Socket | null>(null)

  // Filter options
  const filterOptions = {
    sports: [
      { value: 'soccer', label: 'Soccer' },
      { value: 'basketball', label: 'Basketball' },
      { value: 'tennis', label: 'Tennis' },
      { value: 'other', label: 'Other' }
    ],
    markets: [
      { value: 'over-under', label: 'Over/Under' },
      { value: 'match-odds', label: 'Match Odds' },
      { value: 'half-time', label: 'Half Time' },
      { value: 'other', label: 'Other' },
      { value: 'asian-handicap', label: 'Asian Handicap' },
      { value: 'goal-lines', label: 'Goal Lines' },
      { value: 'first-half-goals', label: 'First Half Goals' }
    ],
    selections: [
      { value: 'over', label: 'Over' },
      { value: 'other', label: 'Other' },
      { value: 'under', label: 'Under' }
    ],
    providers: [
      { value: 'golbet724', label: 'Golbet724' },
      { value: 'golbet724_pre', label: 'Golbet724_pre' },
      { value: 'papa', label: 'Papa' },
      { value: 'onwin', label: 'Onwin' }
    ]
  }

  // Categorize market and selection functions
  const categorizeMarket = (name?: string) => {
    if (!name) return 'other'
    const n = name.toLowerCase()
    if (n.includes('handicap')) return 'asian-handicap'
    if (n.includes('total') || n.includes('over') || n.includes('under')) return 'over-under'
    if (n.includes('match') || n.includes('1x2')) return 'match-odds'
    if (n.includes('half') || n.includes('ht')) return 'half-time'
    if (n.includes('goal') || n.includes('gl')) return 'goal-lines'
    if (n.includes('first') || n.includes('1st')) return 'first-half-goals'
    return 'other'
  }

  const categorizeSelection = (runner?: string) => {
    if (!runner) return 'other'
    const r = runner.toLowerCase()
    if (r.includes('over')) return 'over'
    if (r.includes('under')) return 'under'
    return 'other'
  }

  // Prevent body scroll when filters are open
  useEffect(() => {
    if (showFilters) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [showFilters])

  useEffect(() => {
    // Add sample data for testing - remove this when real data is working
    const sampleData: Opportunity[] = [
      {
        id: '1',
        provider: 'golbet724',
        sport: 'soccer',
        market_name: 'Match Odds',
        runner: 'The Draw',
        arb_percentage: 53.39,
        lastSeen: Date.now() - 300000,
        teams: 'St Mirren vs Hearts',
        tournament: 'Scottish League Cup',
        timestamp: '2025-08-16 17:54:52',
        back_odds: 3.85,
        lay_odds: 1.17,
        betfair_lay_size: 5.05,
        betfair_market_id: '1.246530510',
        event_id_betfair: '34608673',
        event_id_provider: '50922367',
        provider_url: 'https://www.golbet724.com/canli/50922367'
      }
    ]
    setOpps(sampleData)

    const token = localStorage.getItem('authToken')
    if (!token) {
      toast.error('No token, redirecting to login.')
      navigate('/login')
      return
    }

    console.log('Attempting to connect with token:', token.substring(0, 10) + '…')

    // Validate token format
    if (token.split('.').length !== 3) {
      toast.error('Invalid token format, please login again.')
      localStorage.removeItem('authToken')
      navigate('/login')
      return
    }

    // Create socket connection
    const socket = io('https://ws.arbitragex.pro', {
      path: '/socket.io',
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      timeout: 10000,
      auth: { 'X-Token': token },
    })

    socketRef.current = socket

    // Connection timeout
    const connectionTimeout = setTimeout(() => {
      if (!isConnected) {
        console.error('Connection timeout after 15s')
        toast.error('Connection timeout. Please check your internet connection.')
      }
    }, 15000)

    // Socket event handlers
    socket.on('connect', () => {
      clearTimeout(connectionTimeout)
      setIsConnected(true)
      console.log('Connected to WebSocket.')
      toast.success('Connected to server successfully!')
    })

    socket.on('authentication:failed', (data: any) => {
      console.error('Authentication failed:', data)
      toast.error('Authentication failed. Please login again.')
      localStorage.removeItem('authToken')
      navigate('/login')
    })

    socket.on('connect_error', (err: any) => {
      console.error('Connection error:', err)
      setIsConnected(false)
      toast.error('Connection failed. Retrying...')
    })

    socket.on('disconnect', () => {
      console.log('Disconnected from WebSocket.')
      setIsConnected(false)
      toast.warning('Disconnected from server. Reconnecting...')
    })

    socket.on('new:arb', (data: any) => {
      console.log('New arbitrage opportunity:', data)

      // Handle different data formats
      let newOpp: Opportunity
      if (data.opportunity) {
        newOpp = data.opportunity
      } else if (data.event_id_provider) {
        // Handle legacy format
        newOpp = {
          id: `${data.event_id_provider}-${data.provider}-${data.market_name}-${data.runner}`,
          provider: data.provider?.toLowerCase() || 'unknown',
          sport: data.sport?.toLowerCase() || 'unknown',
          market_name: data.market_name || 'unknown',
          runner: data.runner || 'unknown',
          arb_percentage: Number(data.arb_percentage ?? 0),
          lastSeen: Date.now(),
          betfair_url: data.betfair_url,
          betfair_market_id: data.betfair_market_id,
          event_id_betfair: data.event_id_betfair,
          event_id_provider: data.event_id_provider,
          // Map new fields
          teams: data.teams,
          tournament: data.tournament,
          timestamp: data.timestamp,
          back_odds: Number(data.back_odds ?? 0),
          lay_odds: Number(data.lay_odds ?? 0),
          betfair_lay_size: Number(data.betfair_lay_size ?? 0),
          provider_market_id: data.provider_market_id,
          provider_url: data.provider_url,
          handicap_name: data.handicap_name
        }
      } else {
        console.warn('Unknown data format:', data)
        return
      }

      setOpps(prev => {
        const existing = prev.find(o => o.id === newOpp.id)
        if (existing) {
          return prev.map(o => o.id === newOpp.id ? { ...o, ...newOpp, lastSeen: Date.now() } : o)
        } else {
          if (soundEnabled) {
            playNotificationSound()
          }
          return [newOpp, ...prev].slice(0, 1000) // Keep last 1000 opportunities
        }
      })
    })

    // Cleanup on unmount
    return () => {
      socket.disconnect()
    }
  }, [navigate, soundEnabled])

  // Filter opportunities
  const filtered = useMemo(() => {
    console.log('Filtering opportunities:', {
      total: opps.length,
      selectedSports,
      selectedProviders,
      selectedMarkets,
      selectedSelections,
      arbMinPercentage,
      arbMaxPercentage
    })

    const newOpps = opps.map(o => {
      return {
        ...o,
        arb_percentage: ((o.back_odds - o.lay_odds) / o.lay_odds) * 100
      }
    })

    const filtered = newOpps.filter(o => {
      // Filter by arbitrage percentage range
      if (o.arb_percentage < arbMinPercentage || o.arb_percentage > arbMaxPercentage) return false

      // Filter by sports
      if (selectedSports.length > 0 && !selectedSports.includes(o.sport)) return false

      // Filter by providers
      if (selectedProviders.length > 0 && !selectedProviders.includes(o.provider)) return false

      // Filter by markets
      if (selectedMarkets.length > 0 && !selectedMarkets.includes(categorizeMarket(o.market_name))) return false

      // Filter by selections
      if (selectedSelections.length > 0 && !selectedSelections.includes(categorizeSelection(o.runner))) return false

      return true
    }).sort((a, b) => b.arb_percentage - a.arb_percentage)

    console.log('Filtered results:', filtered.length)
    return filtered
  }, [opps, selectedSports, selectedProviders, selectedMarkets, selectedSelections, arbMinPercentage, arbMaxPercentage])

  // Play notification sound
  const playNotificationSound = () => {
    if (!audioRef.current) {
      const a = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT')
      audioRef.current = a
    }
    audioRef.current.volume = 0.7
    audioRef.current.play().catch(() => { })
  }

  // Filter handlers
  const handleSelectAll = (category: string) => {
    switch (category) {
      case 'sports':
        setSelectedSports(filterOptions.sports.map(s => s.value))
        break
      case 'markets':
        setSelectedMarkets(filterOptions.markets.map(m => m.value))
        break
      case 'selections':
        setSelectedSelections(filterOptions.selections.map(s => s.value))
        break
      case 'providers':
        setSelectedProviders(filterOptions.providers.map(p => p.value))
        break
    }
  }

  const handleClear = (category: string) => {
    switch (category) {
      case 'sports':
        setSelectedSports([])
        break
      case 'markets':
        setSelectedMarkets([])
        break
      case 'selections':
        setSelectedSelections([])
        break
      case 'providers':
        setSelectedProviders([])
        break
    }
  }

  const handleCheckboxChange = (category: string, value: string, checked: boolean) => {
    switch (category) {
      case 'sports':
        setSelectedSports(prev =>
          checked ? [...prev, value] : prev.filter(v => v !== value)
        )
        break
      case 'markets':
        setSelectedMarkets(prev =>
          checked ? [...prev, value] : prev.filter(v => v !== value)
        )
        break
      case 'selections':
        setSelectedSelections(prev =>
          checked ? [...prev, value] : prev.filter(v => v !== value)
        )
        break
      case 'providers':
        setSelectedProviders(prev =>
          checked ? [...prev, value] : prev.filter(v => v !== value)
        )
        break
    }
  }

  // Get sport icon
  const getSportIcon = (sport: string) => {
    switch (sport.toLowerCase()) {
      case 'soccer': return '⚽'
      case 'basketball': return '🏀'
      case 'tennis': return '🎾'
      default: return '⭐'
    }
  }

  // Generate exchanger URL
  const generateExchangerUrl = (exchanger: string, sport: string, betfairMarketId?: string, eventIdBetfair?: string) => {
    if (exchanger === 'betfair' && betfairMarketId) {
      return `https://www.betfair.com/exchange/plus/${sport}/market/${betfairMarketId}`
    }
    if (eventIdBetfair) {
      return `https://www.betfair.com/exchange/plus/${sport}/event/${eventIdBetfair}`
    }
    return `https://www.betfair.com/`
  }

  // Debug info
  console.log('Dashboard render:', {
    isConnected,
    oppsCount: opps.length,
    filteredCount: filtered.length,
    showFilters
  })

  return (
    <div className="dashboard-container">
      {/* Header Section */}
      <header className="dashboard-header">
        <div className="header-left">
          <h1 className="dashboard-title">Arbitrage Dashboard</h1>
          <div className="status-info">
            <span className={`status-badge ${isConnected ? 'connected' : 'disconnected'}`}>
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
            <span className="opportunity-count">{filtered.length} of {opps.length} opportunities</span>
          </div>
        </div>

        <div className="header-right">

          <button
            className={`icon-button ${showFilters ? 'active' : ''}`}
            onClick={() => setShowFilters(!showFilters)}
            title="Filters"
          >
            🔍
          </button>
          <button
            className="icon-button"
            onClick={() => document.documentElement.requestFullscreen()}
            title="Fullscreen"
          >
            ⛶
          </button>
          <button
            className="logout-button"
            onClick={() => { localStorage.removeItem('authToken'); navigate('/login') }}
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className={`dashboard-content ${showFilters ? 'modal-open' : ''}`}>
        <main className="opportunities-list">
          {filtered.length > 0 ? (
            filtered.map((opp) => (
                <div className="opportunity-item" key={opp.id}>
                  <div className="opportunity-left">
                    <div className="sport-icon-container">
                      <div className="sport-icon">{getSportIcon(opp.sport)}</div>
                      <div>
                        <div className="team-names">{opp.teams || opp.market_name}</div>
                        <div className="tournament-name">{opp.tournament}</div>
                      </div>
                    </div>
                    <div className="match-details">
                      <div className="market-type">{opp.market_name}</div>
                      <div className="selection-highlight">{opp.runner}</div>
                      {opp.handicap_name && (
                        <div className="handicap-info">{opp.handicap_name}</div>
                      )}
                      <div className="time-info">
                        <span className="timestamp">
                          {opp.timestamp ? new Date(opp.timestamp).toLocaleTimeString('en-GB', {
                            hour: '2-digit',
                            minute: '2-digit'
                          }) : new Date(opp.lastSeen).toLocaleTimeString('en-GB', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="opportunity-right">
                    <div className="arbitrage-percentage">{opp.arb_percentage.toFixed(1)}%</div>
                    <div className="odds-container">
                      <div className="odds-pair" onClick={() => window.open(opp.provider_url, '_blank')}>
                        <span className="odds-value green" style={{ cursor: 'pointer' }}>{opp.back_odds?.toFixed(2) || '5.10'}</span>
                        <span className="provider-name" style={{ cursor: 'pointer' }}>{opp.provider}</span>
                        <span className="liquidity" style={{ cursor: 'pointer' }}>({opp.betfair_lay_size || 54})</span>
                      </div>
                      <div className="odds-pair" onClick={() => window.open(opp.sport === 'soccer' ? `https://orbitxch.com/customer/sport/1/market/${opp.betfair_market_id}` : `https://www.betfair.com/exchange/plus/${opp.sport}/market/${opp.betfair_market_id}`, '_blank')}>
                        <span className="odds-value red" style={{ cursor: 'pointer' }}>{opp.lay_odds?.toFixed(2) || '2.54'}</span>
                        <span className="provider-name" style={{ cursor: 'pointer' }}>Betfair</span>
                        <span className="liquidity" style={{ cursor: 'pointer' }}>(188)</span>
                      </div>
                    </div>
                  </div>
                </div>
            ))
          ) : (
            <div className="no-opportunities">
              <p>No arbitrage opportunities found</p>
              <p className="subtitle">
                {opps.length === 0
                  ? 'Waiting for data from server...'
                  : 'Check your filters or wait for new opportunities'
                }
              </p>
              {opps.length === 0 && (
                <div className="connection-status">
                  <p>Connection Status: {isConnected ? 'Connected' : 'Disconnected'}</p>
                  <p>Total Opportunities: {opps.length}</p>
                  <p>Debug: Check browser console for connection details</p>
                </div>
              )}
            </div>
          )}
        </main>

        {/* Filter Modal Overlay */}
        {showFilters && (
          <div
            className="filter-overlay"
            onClick={() => setShowFilters(false)}
          />
        )}

        {/* Filters Sidebar */}
        {showFilters && (
          <aside className="filters-sidebar" onClick={(e) => e.stopPropagation()}>
            <div className="filters-header">
              <h3 className="filters-title">Filters</h3>
              <p className="filters-subtitle">Filter arbitrage opportunities</p>
              <button
                className="close-filters-btn"
                onClick={() => setShowFilters(false)}
              >
                ✕
              </button>
            </div>

            {/* Sports Section */}
            <div className="filter-section">
              <div className="filter-section-header">
                <h4>Sports</h4>
                <div className="filter-actions">
                  <button onClick={() => handleSelectAll('sports')}>Select All</button>
                  <button onClick={() => handleClear('sports')}>Clear</button>
                </div>
              </div>
              <div className="filter-options">
                {filterOptions.sports.map(sport => (
                  <label key={sport.value} className="filter-option">
                    <input
                      type="checkbox"
                      checked={selectedSports.includes(sport.value)}
                      onChange={(e) => handleCheckboxChange('sports', sport.value, e.target.checked)}
                    />
                    <span>{sport.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Markets Section */}
            <div className="filter-section">
              <div className="filter-section-header">
                <h4>Markets</h4>
                <div className="filter-actions">
                  <button onClick={() => handleSelectAll('markets')}>Select All</button>
                  <button onClick={() => handleClear('markets')}>Clear</button>
                </div>
              </div>
              <div className="filter-options">
                {filterOptions.markets.map(market => (
                  <label key={market.value} className="filter-option">
                    <input
                      type="checkbox"
                      checked={selectedMarkets.includes(market.value)}
                      onChange={(e) => handleCheckboxChange('markets', market.value, e.target.checked)}
                    />
                    <span>{market.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Selections Section */}
            <div className="filter-section">
              <div className="filter-section-header">
                <h4>Selections</h4>
                <div className="filter-actions">
                  <button onClick={() => handleSelectAll('selections')}>Select All</button>
                  <button onClick={() => handleClear('selections')}>Clear</button>
                </div>
              </div>
              <div className="filter-options">
                {filterOptions.selections.map(selection => (
                  <label key={selection.value} className="filter-option">
                    <input
                      type="checkbox"
                      checked={selectedSelections.includes(selection.value)}
                      onChange={(e) => handleCheckboxChange('selections', selection.value, e.target.checked)}
                    />
                    <span>{selection.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Providers Section */}
            <div className="filter-section">
              <div className="filter-section-header">
                <h4>Providers</h4>
                <div className="filter-actions">
                  <button onClick={() => handleSelectAll('providers')}>Select All</button>
                  <button onClick={() => handleClear('providers')}>Clear</button>
                </div>
              </div>
              <div className="filter-options">
                {filterOptions.providers.map(provider => (
                  <label key={provider.value} className="filter-option">
                    <input
                      type="checkbox"
                      checked={selectedProviders.includes(provider.value)}
                      onChange={(e) => handleCheckboxChange('providers', provider.value, e.target.checked)}
                    />
                    <span>{provider.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Exchange Section */}
            <div className="filter-section">
              <h4>Exchange</h4>
              <select
                className="exchange-select"
                value={selectedExchanger}
                onChange={(e) => setSelectedExchanger(e.target.value as 'betfair' | 'betdaq' | 'smarkets')}
              >
                <option value="betfair">Betfair</option>
                <option value="betdaq">Betdaq</option>
                <option value="smarkets">Smarkets</option>
              </select>
            </div>

            {/* Arb Percentage Range Section */}
            <div className="filter-section">
              <h4>Arb Percentage Range</h4>
              <div className="range-slider-container">
                <div className="range-slider">
                  <input
                    type="range"
                    min="-1"
                    max="50"
                    value={arbMinPercentage}
                    onChange={(e) => setArbMinPercentage(Number(e.target.value))}
                    className="range-input min-range"
                  />
                  <input
                    type="range"
                    min="-1"
                    max="50"
                    value={arbMaxPercentage}
                    onChange={(e) => setArbMaxPercentage(Number(e.target.value))}
                    className="range-input max-range"
                  />
                </div>
                <div className="range-inputs">
                  <div className="range-input-group">
                    <label>Min:</label>
                    <input
                      type="number"
                      value={arbMinPercentage}
                      onChange={(e) => setArbMinPercentage(Number(e.target.value))}
                      className="range-number-input"
                    />
                    <span>%</span>
                  </div>
                  <div className="range-input-group">
                    <label>Max:</label>
                    <input
                      type="number"
                      value={arbMaxPercentage}
                      onChange={(e) => setArbMaxPercentage(Number(e.target.value))}
                      className="range-number-input"
                    />
                    <span>%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Odds Range Section */}
            <div className="filter-section">
              <h4>Odds Range</h4>
              <div className="range-slider-container">
                <div className="range-slider">
                  <input
                    type="range"
                    min="1"
                    max="20"
                    step="0.01"
                    value={oddsMin}
                    onChange={(e) => setOddsMin(Number(e.target.value))}
                    className="range-input min-range"
                  />
                  <input
                    type="range"
                    min="1"
                    max="20"
                    step="0.01"
                    value={oddsMax}
                    onChange={(e) => setOddsMax(Number(e.target.value))}
                    className="range-input max-range"
                  />
                </div>
                <div className="range-inputs">
                  <div className="range-input-group">
                    <label>Min:</label>
                    <input
                      type="number"
                      step="0.01"
                      value={oddsMin}
                      onChange={(e) => setOddsMin(Number(e.target.value))}
                      className="range-number-input"
                    />
                  </div>
                  <div className="range-input-group">
                    <label>Max:</label>
                    <input
                      type="number"
                      step="0.01"
                      value={oddsMax}
                      onChange={(e) => setOddsMax(Number(e.target.value))}
                      className="range-number-input"
                    />
                  </div>
                </div>
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  )
}
