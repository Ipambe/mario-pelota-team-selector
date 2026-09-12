import { COLOR_MAP } from '../data/colors'
import type {
  CharacterItem,
  PositionItem,
  StadiumCoordinates,
  VariantItem
} from '../types/game'

export function createItemCard(item: CharacterItem): HTMLDivElement {
  const card = document.createElement('div')
  card.className = 'item-card'

  const image = document.createElement('img')
  image.src = item.src
  image.alt = item.name
  image.className = 'card-image'
  image.loading = 'eager'
  image.decoding = 'async'
  image.width = 160
  image.height = 160

  card.appendChild(image)
  return card
}

export function createVariantCard(item: VariantItem): HTMLDivElement {
  const card = document.createElement('div')
  card.className = 'item-card'

  if (item.isDefault) {
    const image = document.createElement('img')
    image.src = item.characterSrc
    image.alt = item.name
    image.className = 'card-image'
    image.loading = 'eager'
    image.decoding = 'async'
    image.width = 160
    image.height = 160
    card.appendChild(image)
  } else {
    card.classList.add('variant-color-card')
    const colorBg = COLOR_MAP[item.name.toLowerCase()] ?? item.name
    card.style.backgroundColor = colorBg
    card.style.borderBottomColor = 'rgba(0, 0, 0, 0.4)'

    const label = document.createElement('span')
    label.className = 'variant-label'
    label.textContent = item.name.toUpperCase()
    card.appendChild(label)
  }

  return card
}

export function createPositionCard(item: PositionItem): HTMLDivElement {
  const card = document.createElement('div')
  card.className = 'item-card position-card'

  const codeSpan = document.createElement('span')
  codeSpan.className = 'position-code'
  codeSpan.textContent = item.code

  const nameSpan = document.createElement('span')
  nameSpan.className = 'position-subtext'
  nameSpan.textContent = item.name

  card.appendChild(codeSpan)
  card.appendChild(nameSpan)
  return card
}

export function createPlayerToken(
  item: CharacterItem,
  positionKey: string,
  coords: StadiumCoordinates,
  variant?: string | null
): HTMLDivElement {
  const token = document.createElement('div')
  token.className = 'player-token'
  token.dataset.pos = positionKey
  token.style.top = `${coords.top}px`
  token.style.left = `${coords.left}px`

  const img = document.createElement('img')
  img.src = item.src
  img.alt = item.name
  img.className = 'player-token-img'
  img.loading = 'eager'
  img.decoding = 'async'
  img.width = 56
  img.height = 56

  const tooltip = document.createElement('div')
  tooltip.className = 'player-tooltip'
  const isColorVariant = variant && variant.toUpperCase() !== 'DEFAULT'
  tooltip.textContent = isColorVariant
    ? `${item.name.toUpperCase()} - ${variant.toUpperCase()}`
    : item.name.toUpperCase()

  token.appendChild(img)
  token.appendChild(tooltip)
  return token
}
