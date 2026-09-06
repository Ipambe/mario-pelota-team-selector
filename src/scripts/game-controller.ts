import { CHARACTERS } from '../data/characters'
import {
  POSITION_COORDINATES,
  POSITION_TO_TEAM_KEY,
  POSITIONS
} from '../data/positions'
import {
  createItemCard,
  createPlayerToken,
  createPositionCard,
  createVariantCard
} from '../logic/dom-cards'
import {
  calculateReelTargetOffset,
  generateCharacterReel,
  generatePositionReel,
  generateVariantReel,
  SPIN_DURATION_MS,
  WINNING_INDEX
} from '../logic/roulette'
import {
  assignPlayerToTeam,
  createEmptyTeam,
  getAvailableCharacters,
  getAvailablePositions
} from '../logic/team'
import type {
  BaseballPositionKey,
  CharacterItem,
  TeamRoster
} from '../types/game'

declare global {
  interface Window {
    team1: TeamRoster
    team2: TeamRoster
  }
}

export class GameController {
  private readonly team1: TeamRoster = createEmptyTeam()
  private readonly team2: TeamRoster = createEmptyTeam()

  private currentWinningCharacter: CharacterItem | null = null
  private currentWinningVariant: string | null = null
  private currentNextAction: (() => void) | null = null

  private reelElement!: HTMLDivElement
  private spinBtn!: HTMLButtonElement
  private nextBtn!: HTMLButtonElement
  private resultElement!: HTMLElement
  private teamSelect!: HTMLSelectElement | null

  public init(): void {
    this.reelElement = document.getElementById('reel') as HTMLDivElement
    this.spinBtn = document.getElementById('spinBtn') as HTMLButtonElement
    this.nextBtn = document.getElementById('nextBtn') as HTMLButtonElement
    this.resultElement = document.getElementById('result') as HTMLElement
    this.teamSelect = document.getElementById(
      'teamSelect'
    ) as HTMLSelectElement | null

    if (
      !this.reelElement ||
      !this.spinBtn ||
      !this.nextBtn ||
      !this.resultElement
    ) {
      console.warn('GameController: Required DOM elements missing.')
      return
    }

    // Expose for browser console debugging / backwards compatibility
    window.team1 = this.team1
    window.team2 = this.team2

    this.spinBtn.addEventListener('click', () => this.spin())
    this.nextBtn.addEventListener('click', () => {
      if (this.currentNextAction) {
        this.currentNextAction()
      }
    })

    if (this.teamSelect) {
      this.teamSelect.addEventListener('change', () =>
        this.resetRouletteForTeam()
      )
    }

    this.resetRouletteForTeam()
  }

  private getSelectedTeamInfo(): { value: string; team: TeamRoster } {
    const value = this.teamSelect?.value ?? '1'
    const team = value === '2' ? this.team2 : this.team1
    return { value, team }
  }

  private updateStadiumField(
    teamIndex: string,
    positionKey: BaseballPositionKey,
    item: CharacterItem,
    variant?: string | null
  ): void {
    const stadium = document.getElementById(`stadium-${teamIndex}`)
    if (!stadium) return

    const existingToken = stadium.querySelector(
      `.player-token[data-pos="${positionKey}"]`
    )
    if (existingToken) {
      existingToken.remove()
    }

    const coords = POSITION_COORDINATES[positionKey]
    if (!coords) return

    const token = createPlayerToken(item, positionKey, coords, variant)
    stadium.appendChild(token)
  }

  private animateReel(cards: HTMLElement[], onFinish: () => void): void {
    this.reelElement.style.transition = 'none'
    this.reelElement.style.transform = 'translateX(0px)'
    this.reelElement.innerHTML = ''

    cards.forEach(card => {
      this.reelElement.appendChild(card)
    })

    const targetX = calculateReelTargetOffset(WINNING_INDEX)

    requestAnimationFrame(() => {
      this.reelElement.style.transition = `transform ${SPIN_DURATION_MS / 1000}s cubic-bezier(0.12, 0.8, 0.15, 1)`
      this.reelElement.style.transform = `translateX(-${targetX}px)`
    })

    setTimeout(() => {
      onFinish()
    }, SPIN_DURATION_MS)
  }

  private finalizePlayerAssignment(
    character: CharacterItem,
    variantText: string | null,
    positionCode: string,
    selectedTeamVal: string,
    targetTeam: TeamRoster
  ): void {
    if (variantText) {
      this.resultElement.textContent = `${character.name.toUpperCase()} - ${variantText} - ${positionCode}`
    } else {
      this.resultElement.textContent = `${character.name.toUpperCase()} - ${positionCode}`
    }

    const teamKey = POSITION_TO_TEAM_KEY[positionCode]
    if (teamKey) {
      assignPlayerToTeam(targetTeam, teamKey, character, variantText)
      this.updateStadiumField(selectedTeamVal, teamKey, character, variantText)
    }

    this.nextBtn.style.display = 'none'
    this.nextBtn.disabled = false
    this.spinBtn.disabled = false
    this.currentNextAction = null

    if (this.teamSelect) {
      this.teamSelect.disabled = false
    }
  }

  public spin(): void {
    const { value: selectedTeamVal, team: targetTeam } =
      this.getSelectedTeamInfo()
    const availablePositions = getAvailablePositions(targetTeam, POSITIONS)

    if (availablePositions.length === 0) {
      this.resultElement.textContent = `¡EL EQUIPO ${selectedTeamVal} YA ESTÁ COMPLETO!`
      return
    }

    const availableCharacters = getAvailableCharacters(targetTeam, CHARACTERS)
    if (availableCharacters.length === 0) {
      this.resultElement.textContent = `¡NO HAY MÁS PERSONAJES DISPONIBLES PARA EL EQUIPO ${selectedTeamVal}!`
      return
    }

    if (this.teamSelect) {
      this.teamSelect.disabled = true
    }

    this.spinBtn.disabled = true
    this.nextBtn.style.display = 'none'
    this.currentWinningCharacter = null
    this.currentWinningVariant = null
    this.currentNextAction = null
    this.resultElement.textContent = ''

    const generatedItems = generateCharacterReel(availableCharacters)
    const winningItem = generatedItems[WINNING_INDEX]
    const cards = generatedItems.map(createItemCard)

    this.animateReel(cards, () => {
      if (!winningItem) return
      this.currentWinningCharacter = winningItem
      this.resultElement.textContent = winningItem.name.toUpperCase()

      const remainingPositions = getAvailablePositions(targetTeam, POSITIONS)

      if (winningItem.variant && winningItem.variant.length > 0) {
        this.currentNextAction = () => this.spinVariant()
        this.nextBtn.style.display = 'inline-block'
        this.nextBtn.disabled = false
        this.spinBtn.disabled = false
      } else if (remainingPositions.length === 1 && remainingPositions[0]) {
        this.finalizePlayerAssignment(
          winningItem,
          null,
          remainingPositions[0].code,
          selectedTeamVal,
          targetTeam
        )
      } else {
        this.currentNextAction = () => this.spinPosition()
        this.nextBtn.style.display = 'inline-block'
        this.nextBtn.disabled = false
        this.spinBtn.disabled = false
      }
    })
  }

  public spinVariant(): void {
    const character = this.currentWinningCharacter
    const variants = character?.variant
    if (!character || !variants || variants.length === 0) {
      return
    }

    if (this.teamSelect) {
      this.teamSelect.disabled = true
    }

    this.nextBtn.disabled = true
    this.spinBtn.disabled = true
    this.resultElement.textContent = ''

    const generatedVariants = generateVariantReel(character, variants)
    const winningVariant = generatedVariants[WINNING_INDEX]
    const cards = generatedVariants.map(createVariantCard)

    this.animateReel(cards, () => {
      if (!winningVariant) return
      const variantText = winningVariant.isDefault
        ? 'DEFAULT'
        : winningVariant.name.toUpperCase()
      this.currentWinningVariant = variantText
      this.resultElement.textContent = `${character.name.toUpperCase()} - ${variantText}`

      const { value: selectedTeamVal, team: targetTeam } =
        this.getSelectedTeamInfo()
      const remainingPositions = getAvailablePositions(targetTeam, POSITIONS)

      if (remainingPositions.length === 1 && remainingPositions[0]) {
        this.finalizePlayerAssignment(
          character,
          variantText,
          remainingPositions[0].code,
          selectedTeamVal,
          targetTeam
        )
      } else {
        this.currentNextAction = () => this.spinPosition()
        this.nextBtn.style.display = 'inline-block'
        this.nextBtn.disabled = false
        this.spinBtn.disabled = false
      }
    })
  }

  public spinPosition(): void {
    const character = this.currentWinningCharacter
    if (!character) return

    const { value: selectedTeamVal, team: targetTeam } =
      this.getSelectedTeamInfo()
    const availablePositions = getAvailablePositions(targetTeam, POSITIONS)

    if (availablePositions.length === 0) {
      this.resultElement.textContent = `¡EL EQUIPO ${selectedTeamVal} YA ESTÁ COMPLETO!`
      this.nextBtn.style.display = 'none'
      this.spinBtn.disabled = false
      this.currentNextAction = null
      if (this.teamSelect) {
        this.teamSelect.disabled = false
      }
      return
    }

    if (this.teamSelect) {
      this.teamSelect.disabled = true
    }

    this.nextBtn.disabled = true
    this.spinBtn.disabled = true
    this.resultElement.textContent = ''

    const generatedPositions = generatePositionReel(availablePositions)
    const winningPosition = generatedPositions[WINNING_INDEX]
    const cards = generatedPositions.map(createPositionCard)

    this.animateReel(cards, () => {
      if (!winningPosition) return
      this.finalizePlayerAssignment(
        character,
        this.currentWinningVariant,
        winningPosition.code,
        selectedTeamVal,
        targetTeam
      )
    })
  }

  public resetRouletteForTeam(): void {
    const { value: selectedTeamVal, team: targetTeam } =
      this.getSelectedTeamInfo()

    this.currentWinningCharacter = null
    this.currentWinningVariant = null
    this.currentNextAction = null
    this.nextBtn.style.display = 'none'
    this.nextBtn.disabled = false
    this.resultElement.textContent = ''

    if (this.teamSelect) {
      this.teamSelect.disabled = false
    }

    // Highlight active stadium
    const stadium1 = document.getElementById('stadium-1')
    const stadium2 = document.getElementById('stadium-2')
    if (stadium1 && stadium2) {
      if (selectedTeamVal === '1') {
        stadium1.classList.add('active-stadium')
        stadium2.classList.remove('active-stadium')
      } else {
        stadium2.classList.add('active-stadium')
        stadium1.classList.remove('active-stadium')
      }
    }

    // Reset reel visually
    this.reelElement.style.transition = 'none'
    this.reelElement.style.transform = 'translateX(0px)'
    this.reelElement.innerHTML = ''

    const availablePositions = getAvailablePositions(targetTeam, POSITIONS)
    const availableCharacters = getAvailableCharacters(targetTeam, CHARACTERS)

    if (availablePositions.length === 0) {
      this.resultElement.textContent = `¡EL EQUIPO ${selectedTeamVal} YA ESTÁ COMPLETO!`
      this.spinBtn.disabled = true
      return
    }

    if (availableCharacters.length === 0) {
      this.resultElement.textContent = `¡NO HAY MÁS PERSONAJES DISPONIBLES PARA EL EQUIPO ${selectedTeamVal}!`
      this.spinBtn.disabled = true
      return
    }

    this.spinBtn.disabled = false

    // Initial preview reel
    const previewItems = generateCharacterReel(availableCharacters, 10)
    previewItems.forEach(item => {
      this.reelElement.appendChild(createItemCard(item))
    })
  }
}

// Automatically instantiate and initialize when loaded on the client
if (typeof window !== 'undefined') {
  const controller = new GameController()
  // Run when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => controller.init())
  } else {
    controller.init()
  }
}
