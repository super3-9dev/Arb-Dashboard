export const markets = [
  { label:'1X2', value:'1x2' },
  { label:'Handicap', value:'handicap' },
  { label:'Totals', value:'totals' },
]

export const selections = [
  { label:'Home', value:'home' },
  { label:'Away', value:'away' },
  { label:'Draw', value:'draw' },
]

export const sports = [
  { label:'Football', value:'football' },
  { label:'Basketball', value:'basketball' },
  { label:'Tennis', value:'tennis' },
  { label:'Other', value:'other' },
]

export function categorizeMarket(name?: string){
  if(!name) return 'other'
  const n = name.toLowerCase()
  if(n.includes('handicap')) return 'handicap'
  if(n.includes('total') || n.includes('over') || n.includes('under')) return 'totals'
  return '1x2'
}
export function categorizeSelection(runner?: string){
  if(!runner) return 'other'
  const r = runner.toLowerCase()
  if(['home','1','team1'].includes(r)) return 'home'
  if(['away','2','team2'].includes(r)) return 'away'
  if(['draw','x'].includes(r)) return 'draw'
  return 'other'
}

export function getSportIcon(sport:string){ return '🏟️' as const }

export function generateExchangerUrl(
  exchanger: 'betfair'|'betdaq'|'smakets'|'smarkets',
  sport: string,
  betfairMarketId?: string,
  eventIdBetfair?: string
){
  if(exchanger==='betfair' && betfairMarketId){
    return `https://www.betfair.com/exchange/plus/${sport}/market/${betfairMarketId}`
  }
  if(eventIdBetfair){
    return `https://www.betfair.com/exchange/plus/${sport}/event/${eventIdBetfair}`
  }
  return `https://www.betfair.com/`
}
