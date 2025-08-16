import React, { useEffect, useMemo, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { getSportIcon, markets, selections, sports, categorizeMarket, categorizeSelection, generateExchangerUrl } from '../lib/constants'

type Opportunity = {
  id: string
  provider: string
  sport: string
  market_name: string
  runner: string
  arb_percentage: number
  lastSeen: number
  marketCategory?: string
  selectionCategory?: string
  isExpiring?: boolean
  betfair_url?: string
  betfair_market_id?: string
  event_id_betfair?: string
  event_id_provider?: string
}

const DEFAULT_MARKETS = [
  { code: 'golbet724', id: 6 },
  { code: 'papa', id: 7 },
  { code: 'golbet724_pre', id: 9 },
  { code: 'onwin', id: 18547 },
]

export default function Dashboard() {
  const navigate = useNavigate()
  const [isConnected, setIsConnected] = useState(false)
  const [availableProviders, setAvailableProviders] = useState<{ label: string, value: string }[]>([])
  const [selectedProviders, setSelectedProviders] = useState<string[]>([])
  const [selectedMarkets, setSelectedMarkets] = useState<string[]>([])
  const [selectedSelections, setSelectedSelections] = useState<string[]>([])
  const [selectedSports, setSelectedSports] = useState<string[]>([])
  const [debugMode, setDebugMode] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [soundVolume, setSoundVolume] = useState(0.7)
  const [opps, setOpps] = useState<Opportunity[]>([])
  const [filtersLoaded, setFiltersLoaded] = useState(false)
  const [selectedExchanger, setSelectedExchanger] = useState<'betfair' | 'betdaq' | 'smarkets'>('betfair')

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const socketRef = useRef<Socket | null>(null)
  const teamNameRefs = useRef<Map<string, HTMLElement>>(new Map())

  useEffect(() => {
    const token = localStorage.getItem('authToken')
    if(!token){ 
      toast.error('No token, redirecting to login.')
      navigate('/login')
      return 
    }
    console.log('Attempting to connect with token:', token.substring(0,10)+'…')
    if (token.split('.').length !== 3) {
      toast.error('Invalid token format, please login again.')
      localStorage.removeItem('authToken')
      navigate('/login')
      return
    }
    let userId = 'unknown'
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      console.log(payload)
      userId = payload.sub || payload.userId || payload.email || 'unknown'
    } catch (e) { console.warn('Could not extract user ID:', e) }

    const socket = io('https://ws.arbitragex.pro', {
      path: '/socket.io',
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      timeout: 10000,
      auth: { 'X-Token': token },
    })
    socketRef.current = socket
    console.log('socket', socket)
    const connectionTimeout = setTimeout(() => {
      if (!isConnected) {
        console.error('Connection timeout after 15s')
      }
    }, 15000)

    socket.on('connect', () => {
      clearTimeout(connectionTimeout)
      setIsConnected(true)
      console.log('Connected to WebSocket.')
      // Optionally subscribe after connect if backend expects it:
      // DEFAULT_MARKETS.forEach(m => socket.emit('subscribe', { marketCode: m.code, marketId: m.id }))
    })
    socket.on('authentication:failed', (data: any) => {
      console.error('Authentication failed:', data)
      toast.error('Authentication failed. Please login again.')
      localStorage.removeItem('authToken')
      navigate('/login')
    })
    socket.on('connect_error', (err: any) => {
      console.error('connect_error', err)
      setIsConnected(false)
    })
    socket.on('disconnect', (reason: any) => {
      console.log('disconnected:', reason)
      setIsConnected(false)
    })

    socket.on('user:markets', (data: any) => {
      const fm = (data?.markets || []).map((m: string) => ({ label: m.charAt(0).toUpperCase() + m.slice(1), value: m.toLowerCase() }))
      setAvailableProviders(fm)
      setSelectedProviders(prev => prev.length ? prev.filter(p => fm.some(fp => fp.value === p)) : fm.map(p => p.value))
      setFiltersLoaded(true)
    })

    socket.on('new:arb', (events: any) => {
      const arr = Array.isArray(events) ? events : [events]
      setOpps(prev => {
        const now = Date.now()
        const updated = [...prev]
        const newOnes: Opportunity[] = []
        for (const event of arr) {
          const safe: Opportunity = {
            id: `${event.event_id_provider || 'unknown'}-${(event.provider || 'unknown').toLowerCase()}-${event.market_name || 'unknown'}-${event.runner || 'unknown'}`,
            provider: (event.provider || 'unknown').toLowerCase(),
            sport: (event.sport || 'unknown').toLowerCase(),
            market_name: event.market_name || 'unknown',
            runner: event.runner || 'unknown',
            arb_percentage: Number(event.arb_percentage ?? 0),
            lastSeen: now,
            marketCategory: categorizeMarket(event.market_name),
            selectionCategory: categorizeSelection(event.runner),
            betfair_url: event.betfair_url,
            betfair_market_id: event.betfair_market_id,
            event_id_betfair: event.event_id_betfair,
            event_id_provider: event.event_id_provider
          }
          const idx = updated.findIndex(o => o.id === safe.id)
          if (idx >= 0) updated[idx] = safe; else { updated.push(safe); newOnes.push(safe) }
        }
        if (newOnes.length && soundEnabled) { playSound() }
        return updated
      })
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [])

  // expiry + cleanup timers
  useEffect(() => {
    const expiry = setInterval(() => {
      const now = Date.now()
      setOpps(prev => prev.map(opp => {
        const t = now - opp.lastSeen
        if (t > 8000 && t < 10000 && !opp.isExpiring) return { ...opp, isExpiring: true }
        return opp
      }))
    }, 200)
    const cleanup = setInterval(() => {
      const now = Date.now()
      setOpps(prev => prev.filter(opp => now - opp.lastSeen < 10000))
    }, 1000)
    return () => { clearInterval(expiry); clearInterval(cleanup) }
  }, [])

  const filtered = useMemo(() => {
    return opps
      .filter(o => !selectedProviders.length || selectedProviders.includes(o.provider))
      .filter(o => !selectedMarkets.length || selectedMarkets.includes(categorizeMarket(o.market_name)))
      .filter(o => !selectedSelections.length || selectedSelections.includes(categorizeSelection(o.runner)))
      .filter(o => !selectedSports.length || selectedSports.includes(o.sport))
      .sort((a, b) => b.arb_percentage - a.arb_percentage)
  }, [opps, selectedProviders, selectedMarkets, selectedSelections, selectedSports])

  function playSound() {
    if (!audioRef.current) {
      const a = new Audio()
      a.src = 'data:audio/mp3;base64,//uQZAAAAAAAAAAAAAAAAAAAA...' // tiny silent placeholder
      audioRef.current = a
    }
    audioRef.current.volume = soundVolume
    audioRef.current.play().catch(() => { })
  }

  const getExchangerLabel = () => (selectedExchanger === 'betfair' ? 'Betfair' : selectedExchanger === 'betdaq' ? 'Betdaq' : 'Smarkets')
  const getExchangerUrl = (o: Opportunity) => generateExchangerUrl(selectedExchanger, o.sport, o.betfair_market_id, o.event_id_betfair)

  return (
    <div>
      <header>
        <strong>Arb Dashboard</strong>
        <span className={'badge ' + (isConnected ? 'ok' : 'fail')}>{isConnected ? 'connected' : 'disconnected'}</span>
        <span className="muted">providers: {availableProviders.length}</span>
        <button className="btn" onClick={() => { localStorage.removeItem('authToken'); navigate('/login') }}>Logout</button>
      </header>

      <div className="grid">
        <main className="card">
          <div className="row" style={{ marginBottom: 12 }}>
            <strong>Opportunities</strong>
            <span className="muted">showing {filtered.length} / {opps.length}</span>
            <span className="tag">{getExchangerLabel()}</span>
          </div>
          <div className="list">
            {filtered.map(o => (
              <div className="opp" key={o.id}>
                <div className="row">
                  <span className="tag">{o.provider}</span>
                  <span className="tag">{o.sport}</span>
                  <span className="tag">{categorizeMarket(o.market_name)}</span>
                  <span className="tag">{categorizeSelection(o.runner)}</span>
                  <span className="tag">arb {o.arb_percentage.toFixed(2)}%</span>
                </div>
                <div className="marquee-container">
                  <div>{o.market_name} — {o.runner}</div>
                </div>
                <div className="row">
                  <a href={getExchangerUrl(o)} target="_blank">Open in {getExchangerLabel()}</a>
                </div>
              </div>
            ))}
          </div>
        </main>

        <aside className="card">
          <h3>Filters</h3>
          <div className="list">
            <div>
              <div className="muted">Providers</div>
              <div className="row">
                {availableProviders.map(p => (
                  <label key={p.value}><input type="checkbox" checked={selectedProviders.includes(p.value)} onChange={e => {
                    setSelectedProviders(prev => e.target.checked ? [...prev, p.value] : prev.filter(v => v !== p.value))
                  }} /> {p.label}</label>
                ))}
              </div>
            </div>
            <div>
              <div className="muted">Markets</div>
              <div className="row">
                {markets.map(m => (
                  <label key={m.value}><input type="checkbox" checked={selectedMarkets.includes(m.value)} onChange={e => {
                    setSelectedMarkets(prev => e.target.checked ? [...prev, m.value] : prev.filter(v => v !== m.value))
                  }} /> {m.label}</label>
                ))}
              </div>
            </div>
            <div>
              <div className="muted">Selections</div>
              <div className="row">
                {selections.map(s => (
                  <label key={s.value}><input type="checkbox" checked={selectedSelections.includes(s.value)} onChange={e => {
                    setSelectedSelections(prev => e.target.checked ? [...prev, s.value] : prev.filter(v => v !== s.value))
                  }} /> {s.label}</label>
                ))}
              </div>
            </div>
            <div>
              <div className="muted">Sports</div>
              <div className="row">
                {sports.map(s => (
                  <label key={s.value}><input type="checkbox" checked={selectedSports.includes(s.value)} onChange={e => {
                    setSelectedSports(prev => e.target.checked ? [...prev, s.value] : prev.filter(v => v !== s.value))
                  }} /> {s.label}</label>
                ))}
              </div>
            </div>
            <div className="toggle">
              <label><input type="checkbox" checked={debugMode} onChange={() => setDebugMode(!debugMode)} /> Debug</label>
              <label><input type="checkbox" checked={soundEnabled} onChange={() => setSoundEnabled(!soundEnabled)} /> Sound</label>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
