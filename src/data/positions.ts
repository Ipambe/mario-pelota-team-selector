import type {
  BaseballPositionKey,
  PositionItem,
  StadiumCoordinates
} from '../types/game'

export const POSITIONS: PositionItem[] = [
  { code: 'P', name: 'PITCHER' },
  { code: 'K', name: 'CATCHER' },
  { code: '1B', name: '1RA BASE' },
  { code: '2B', name: '2DA BASE' },
  { code: 'SS', name: 'SHORTSTOP' },
  { code: '3B', name: '3RA BASE' },
  { code: 'LF', name: 'LEFT FIELD' },
  { code: 'CF', name: 'CENTER FIELD' },
  { code: 'RF', name: 'RIGHT FIELD' }
]

export const POSITION_TO_TEAM_KEY: Record<string, BaseballPositionKey> = {
  P: 'P',
  K: 'K',
  '1B': 'FB',
  '2B': 'SB',
  SS: 'SS',
  '3B': 'TB',
  LF: 'LF',
  CF: 'CF',
  RF: 'RF'
}

export const POSITION_COORDINATES: Record<
  BaseballPositionKey,
  StadiumCoordinates
> = {
  P: { top: 460, left: 410 },
  K: { top: 670, left: 410 },
  FB: { top: 350, left: 645 },
  SB: { top: 230, left: 520 },
  TB: { top: 350, left: 175 },
  SS: { top: 230, left: 300 },
  LF: { top: 140, left: 110 },
  CF: { top: 65, left: 410 },
  RF: { top: 140, left: 717 }
}
