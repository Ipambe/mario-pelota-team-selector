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
  ITEM_WIDTH,
  SPIN_DURATION_MS,
  shuffle,
  WINNING_INDEX
} from '../logic/roulette'
import {
  type GameSettings,
  loadSettings,
  saveSettings
} from '../logic/settings'
import {
  assignPlayerToTeam,
  createEmptyTeam,
  getAvailableCharacters,
  getAvailablePositions,
  isTeamComplete
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
  private nextBtn: HTMLButtonElement | null = null
  private resultElement!: HTMLElement

  // Switch elements
  private teamSwitch!: HTMLInputElement | null
  private teamLabel1!: HTMLButtonElement | null
  private teamLabel2!: HTMLButtonElement | null

  // Settings & Modal elements
  private settingsModal!: HTMLDialogElement | null
  private openSettingsBtn!: HTMLButtonElement | null
  private closeSettingsBtn!: HTMLButtonElement | null
  private doneSettingsBtn!: HTMLButtonElement | null
  private autoSelectSwitch!: HTMLInputElement | null

  private settings: GameSettings = { autoSelect: false }
  private isAutoSpinning = false
  private autoSpinTimeoutId: number | null = null
  private isReelSpinning = false
  private idleStartTimeoutId: number | null = null
  private idleAnimation: Animation | null = null

  public init(): void {
    this.reelElement = document.getElementById('reel') as HTMLDivElement
    this.spinBtn = document.getElementById('spinBtn') as HTMLButtonElement
    this.nextBtn = document.getElementById(
      'nextBtn'
    ) as HTMLButtonElement | null
    this.resultElement = document.getElementById('result') as HTMLElement

    // Team Switch elements
    this.teamSwitch = document.getElementById(
      'teamSwitch'
    ) as HTMLInputElement | null
    this.teamLabel1 = document.getElementById(
      'teamLabel1'
    ) as HTMLButtonElement | null
    this.teamLabel2 = document.getElementById(
      'teamLabel2'
    ) as HTMLButtonElement | null

    // Settings Modal elements
    this.settingsModal = document.getElementById(
      'settingsModal'
    ) as HTMLDialogElement | null
    this.openSettingsBtn = document.getElementById(
      'openSettingsBtn'
    ) as HTMLButtonElement | null
    this.closeSettingsBtn = document.getElementById(
      'closeSettingsBtn'
    ) as HTMLButtonElement | null
    this.doneSettingsBtn = document.getElementById(
      'doneSettingsBtn'
    ) as HTMLButtonElement | null
    this.autoSelectSwitch = document.getElementById(
      'autoSelectSwitch'
    ) as HTMLInputElement | null

    if (!this.reelElement || !this.spinBtn || !this.resultElement) {
      console.warn('GameController: Required DOM elements missing.')
      return
    }

    // Expose for browser console debugging / backwards compatibility
    window.team1 = this.team1
    window.team2 = this.team2

    this.initSettings()
    this.initTeamControls()

    this.spinBtn.addEventListener('click', () => {
      if (this.isAutoSpinning) {
        this.stopAutoSpin()
      } else {
        this.resumeOrStartSpin()
      }
    })

    if (this.nextBtn) {
      this.nextBtn.addEventListener('click', () => {
        this.resumeOrStartSpin()
      })
    }

    this.resetRouletteForTeam()
  }

  private isAutoSelectEnabled(): boolean {
    if (this.autoSelectSwitch) {
      return this.autoSelectSwitch.checked
    }
    return this.settings.autoSelect
  }

  private initSettings(): void {
    this.settings = loadSettings()

    if (this.autoSelectSwitch) {
      this.autoSelectSwitch.checked = this.settings.autoSelect

      const syncSetting = () => {
        const isChecked = this.autoSelectSwitch?.checked ?? false
        this.settings.autoSelect = isChecked
        saveSettings(this.settings)
        if (!isChecked && this.isAutoSpinning) {
          this.stopAutoSpin()
        }
      }

      this.autoSelectSwitch.addEventListener('change', syncSetting)
    }

    const closeAndSync = () => {
      if (this.autoSelectSwitch) {
        this.settings.autoSelect = this.autoSelectSwitch.checked
        saveSettings(this.settings)
      }
      this.settingsModal?.close()
      if (
        !this.isReelSpinning &&
        !this.isAutoSpinning &&
        !this.currentNextAction
      ) {
        this.startIdleAnimation()
      }
    }

    if (this.openSettingsBtn && this.settingsModal) {
      this.openSettingsBtn.addEventListener('click', () => {
        if (
          this.isReelSpinning ||
          this.isAutoSpinning ||
          this.openSettingsBtn?.disabled
        ) {
          return
        }
        this.stopIdleAnimation()
        this.settingsModal?.showModal()
      })
    }

    if (this.closeSettingsBtn && this.settingsModal) {
      this.closeSettingsBtn.addEventListener('click', closeAndSync)
    }

    if (this.doneSettingsBtn && this.settingsModal) {
      this.doneSettingsBtn.addEventListener('click', closeAndSync)
    }

    if (this.settingsModal) {
      this.settingsModal.addEventListener('click', event => {
        if (event.target === this.settingsModal) {
          closeAndSync()
        }
      })
    }
  }

  private initTeamControls(): void {
    if (this.teamSwitch) {
      this.teamSwitch.addEventListener('change', () => {
        this.updateTeamSwitchUI()
        this.resetRouletteForTeam()
      })
    }

    if (this.teamLabel1) {
      this.teamLabel1.addEventListener('click', () => {
        if (!this.teamSwitch || this.teamSwitch.disabled) return
        if (this.teamSwitch.checked) {
          this.setTeam('1')
        }
      })
    }

    if (this.teamLabel2) {
      this.teamLabel2.addEventListener('click', () => {
        if (!this.teamSwitch || this.teamSwitch.disabled) return
        if (!this.teamSwitch.checked) {
          this.setTeam('2')
        }
      })
    }

    this.updateTeamSwitchUI()
  }

  private setTeam(teamNum: '1' | '2'): void {
    if (!this.teamSwitch) return
    this.teamSwitch.checked = teamNum === '2'
    this.updateTeamSwitchUI()
    this.resetRouletteForTeam()
  }

  private updateTeamSwitchUI(): void {
    const isTeam2 = this.teamSwitch?.checked ?? false
    if (this.teamSwitch) {
      this.teamSwitch.setAttribute('aria-checked', isTeam2 ? 'true' : 'false')
    }

    if (this.teamLabel1) {
      if (isTeam2) {
        this.teamLabel1.classList.remove('active')
        this.teamLabel1.setAttribute('aria-pressed', 'false')
      } else {
        this.teamLabel1.classList.add('active')
        this.teamLabel1.setAttribute('aria-pressed', 'true')
      }
    }

    if (this.teamLabel2) {
      if (isTeam2) {
        this.teamLabel2.classList.add('active')
        this.teamLabel2.setAttribute('aria-pressed', 'true')
      } else {
        this.teamLabel2.classList.remove('active')
        this.teamLabel2.setAttribute('aria-pressed', 'false')
      }
    }
  }

  private setTeamControlsDisabled(disabled: boolean): void {
    if (this.teamSwitch) this.teamSwitch.disabled = disabled
    if (this.teamLabel1) this.teamLabel1.disabled = disabled
    if (this.teamLabel2) this.teamLabel2.disabled = disabled
    if (this.openSettingsBtn) this.openSettingsBtn.disabled = disabled
  }

  private getSelectedTeamInfo(): { value: string; team: TeamRoster } {
    const isTeam2 = this.teamSwitch?.checked ?? false
    const value = isTeam2 ? '2' : '1'
    const team = isTeam2 ? this.team2 : this.team1
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

  private stopIdleAnimation(): void {
    if (this.idleStartTimeoutId !== null) {
      window.clearTimeout(this.idleStartTimeoutId)
      this.idleStartTimeoutId = null
    }

    if (this.idleAnimation) {
      this.idleAnimation.cancel()
      this.idleAnimation = null
    }

    this.reelElement.classList.remove('idle-spinning')
    this.reelElement.style.animation = ''
    this.reelElement.style.transition = 'none'
    this.reelElement.style.transform = 'translate3d(0px, 0, 0)'
  }

  private startIdleAnimation(): void {
    if (this.isReelSpinning || this.isAutoSpinning || this.currentNextAction) {
      return
    }

    const { team: targetTeam } = this.getSelectedTeamInfo()
    const availablePositions = getAvailablePositions(targetTeam, POSITIONS)
    const availableCharacters = getAvailableCharacters(targetTeam, CHARACTERS)

    if (availablePositions.length === 0 || availableCharacters.length === 0) {
      return
    }

    this.stopIdleAnimation()

    let block = shuffle(availableCharacters)
    while (block.length < 10) {
      block = [...block, ...shuffle(availableCharacters)]
    }

    const singleBlockWidth = block.length * ITEM_WIDTH
    const idleDurationMs = (singleBlockWidth / 60) * 1000

    this.reelElement.style.transition = 'none'
    this.reelElement.style.animation = ''
    this.reelElement.style.transform = ''
    this.reelElement.innerHTML = ''

    const fragment = document.createDocumentFragment()
    const totalItems = [...block, ...block]
    totalItems.forEach(item => {
      fragment.appendChild(createItemCard(item))
    })
    this.reelElement.appendChild(fragment)

    if (typeof this.reelElement.animate === 'function') {
      this.idleAnimation = this.reelElement.animate(
        [
          { transform: 'translate3d(0px, 0, 0)' },
          { transform: `translate3d(-${singleBlockWidth}px, 0, 0)` }
        ],
        {
          duration: idleDurationMs,
          iterations: Infinity,
          easing: 'linear'
        }
      )
    } else {
      this.reelElement.style.setProperty(
        '--idle-distance',
        `-${singleBlockWidth}px`
      )
      this.reelElement.style.setProperty(
        '--idle-duration',
        `${idleDurationMs / 1000}s`
      )
      this.reelElement.classList.add('idle-spinning')
    }
  }

  private animateReel(cards: HTMLElement[], onFinish: () => void): void {
    this.stopIdleAnimation()
    this.isReelSpinning = true
    this.reelElement.style.transition = 'none'
    this.reelElement.style.transform = 'translate3d(0px, 0, 0)'
    this.reelElement.innerHTML = ''

    const fragment = document.createDocumentFragment()
    cards.forEach(card => {
      fragment.appendChild(card)
    })
    this.reelElement.appendChild(fragment)

    const targetX = calculateReelTargetOffset(WINNING_INDEX)

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this.reelElement.style.transition = `transform ${SPIN_DURATION_MS / 1000}s cubic-bezier(0.12, 0.8, 0.15, 1)`
        this.reelElement.style.transform = `translate3d(-${targetX}px, 0, 0)`
      })
    })

    setTimeout(() => {
      this.isReelSpinning = false
      onFinish()
    }, SPIN_DURATION_MS)
  }

  public resumeOrStartSpin(): void {
    this.stopIdleAnimation()
    if (this.isAutoSelectEnabled()) {
      this.isAutoSpinning = true
      this.spinBtn.textContent = 'DETENER'
      this.spinBtn.classList.add('stop-btn')
      this.spinBtn.classList.remove('next-btn')
      this.spinBtn.disabled = false
      if (this.nextBtn) this.nextBtn.style.display = 'none'

      if (this.currentNextAction) {
        const action = this.currentNextAction
        this.currentNextAction = null
        action()
      } else {
        const { value: selectedTeamVal, team: targetTeam } =
          this.getSelectedTeamInfo()
        const otherTeamVal: '1' | '2' = selectedTeamVal === '1' ? '2' : '1'
        const otherTeam = selectedTeamVal === '1' ? this.team2 : this.team1

        if (isTeamComplete(targetTeam)) {
          if (!isTeamComplete(otherTeam)) {
            this.setTeam(otherTeamVal)
          } else {
            this.resultElement.textContent = "LO EQUIPO TAN' COMPLETO!"
            this.stopAutoSpin()
            return
          }
        }
        this.spin()
      }
    } else {
      if (this.currentNextAction) {
        const action = this.currentNextAction
        this.currentNextAction = null
        if (this.nextBtn) this.nextBtn.style.display = 'none'
        action()
      } else {
        this.spin()
      }
    }
  }

  public stopAutoSpin(): void {
    if (this.autoSpinTimeoutId !== null) {
      window.clearTimeout(this.autoSpinTimeoutId)
      this.autoSpinTimeoutId = null
    }

    this.isAutoSpinning = false
    if (this.currentNextAction) {
      this.spinBtn.textContent = 'Siguiente'
      this.spinBtn.classList.add('next-btn')
    } else {
      this.spinBtn.textContent = 'Tirar'
      this.spinBtn.classList.remove('next-btn')
    }
    this.spinBtn.classList.remove('stop-btn')

    if (this.isReelSpinning) {
      this.spinBtn.disabled = true
    } else {
      this.setTeamControlsDisabled(false)
      const { team } = this.getSelectedTeamInfo()
      if (isTeamComplete(team) && !this.currentNextAction) {
        this.spinBtn.disabled = true
      } else {
        this.spinBtn.disabled = false
        if (!this.currentNextAction) {
          this.startIdleAnimation()
        }
      }
    }
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

    if (this.nextBtn) {
      this.nextBtn.style.display = 'none'
      this.nextBtn.disabled = false
    }
    this.currentNextAction = null
    this.spinBtn.textContent = 'Tirar'
    this.spinBtn.classList.remove('next-btn')
    this.spinBtn.classList.remove('stop-btn')

    if (this.isAutoSpinning) {
      this.handleAutoSpinNextStep(selectedTeamVal, targetTeam)
    } else {
      this.spinBtn.disabled = false
      this.setTeamControlsDisabled(false)
      const remainingPositions = getAvailablePositions(targetTeam, POSITIONS)
      if (remainingPositions.length > 0) {
        this.idleStartTimeoutId = window.setTimeout(() => {
          if (
            !this.isReelSpinning &&
            !this.isAutoSpinning &&
            !this.currentNextAction
          ) {
            this.startIdleAnimation()
          }
        }, 5000)
      }
    }
  }

  private handleAutoSpinNextStep(
    currentTeamVal: string,
    currentTeam: TeamRoster
  ): void {
    if (!this.isAutoSpinning) return

    const remainingPositions = getAvailablePositions(currentTeam, POSITIONS)
    if (remainingPositions.length > 0) {
      // Continue spinning for current team
      this.autoSpinTimeoutId = window.setTimeout(() => {
        if (this.isAutoSpinning) {
          this.spin()
        }
      }, 1000)
    } else {
      // Current team is complete! Check the other team:
      const otherTeamVal: '1' | '2' = currentTeamVal === '1' ? '2' : '1'
      const otherTeam = currentTeamVal === '1' ? this.team2 : this.team1
      const otherTeamPositions = getAvailablePositions(otherTeam, POSITIONS)

      if (otherTeamPositions.length > 0) {
        this.resultElement.textContent = `¡EQUIPO ${currentTeamVal} COMPLETO! CAMBIANDO AL EQUIPO ${otherTeamVal}...`
        this.autoSpinTimeoutId = window.setTimeout(() => {
          if (!this.isAutoSpinning) return
          this.setTeam(otherTeamVal)
          this.autoSpinTimeoutId = window.setTimeout(() => {
            if (this.isAutoSpinning) {
              this.spin()
            }
          }, 1200)
        }, 1500)
      } else {
        this.resultElement.textContent = "LO EQUIPO TAN' COMPLETO!"
        this.stopAutoSpin()
      }
    }
  }

  public spin(): void {
    this.stopIdleAnimation()
    const { value: selectedTeamVal, team: targetTeam } =
      this.getSelectedTeamInfo()
    const availablePositions = getAvailablePositions(targetTeam, POSITIONS)
    const otherTeam = selectedTeamVal === '1' ? this.team2 : this.team1

    if (availablePositions.length === 0) {
      this.resultElement.textContent = `¡EL EQUIPO ${selectedTeamVal} YA ESTÁ COMPLETO!`
      if (this.isAutoSpinning) {
        if (!isTeamComplete(otherTeam)) {
          this.handleAutoSpinNextStep(selectedTeamVal, targetTeam)
        } else {
          this.stopAutoSpin()
        }
      }
      return
    }

    const availableCharacters = getAvailableCharacters(targetTeam, CHARACTERS)
    if (availableCharacters.length === 0) {
      this.resultElement.textContent = `¡NO HAY MÁS PERSONAJES DISPONIBLES PARA EL EQUIPO ${selectedTeamVal}!`
      if (this.isAutoSpinning) {
        if (!isTeamComplete(otherTeam)) {
          this.handleAutoSpinNextStep(selectedTeamVal, targetTeam)
        } else {
          this.stopAutoSpin()
        }
      }
      return
    }

    this.setTeamControlsDisabled(true)

    if (this.isAutoSpinning) {
      this.spinBtn.disabled = false
      this.spinBtn.textContent = 'DETENER'
    } else {
      this.spinBtn.disabled = true
    }

    if (this.nextBtn) this.nextBtn.style.display = 'none'
    this.currentWinningCharacter = null
    this.currentWinningVariant = null
    this.currentNextAction = null
    this.spinBtn.classList.remove('next-btn')
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
        if (this.isAutoSpinning) {
          this.autoSpinTimeoutId = window.setTimeout(() => {
            if (this.isAutoSpinning) {
              this.spinVariant()
            }
          }, 900)
        } else {
          this.currentNextAction = () => this.spinVariant()
          if (this.nextBtn) this.nextBtn.style.display = 'none'
          this.spinBtn.disabled = false
          this.spinBtn.textContent = 'Siguiente'
          this.spinBtn.classList.add('next-btn')
          this.spinBtn.classList.remove('stop-btn')
        }
      } else if (remainingPositions.length === 1 && remainingPositions[0]) {
        this.finalizePlayerAssignment(
          winningItem,
          null,
          remainingPositions[0].code,
          selectedTeamVal,
          targetTeam
        )
      } else {
        if (this.isAutoSpinning) {
          this.autoSpinTimeoutId = window.setTimeout(() => {
            if (this.isAutoSpinning) {
              this.spinPosition()
            }
          }, 900)
        } else {
          this.currentNextAction = () => this.spinPosition()
          if (this.nextBtn) this.nextBtn.style.display = 'none'
          this.spinBtn.disabled = false
          this.spinBtn.textContent = 'Siguiente'
          this.spinBtn.classList.add('next-btn')
          this.spinBtn.classList.remove('stop-btn')
        }
      }
    })
  }

  public spinVariant(): void {
    const character = this.currentWinningCharacter
    const variants = character?.variant
    if (!character || !variants || variants.length === 0) {
      return
    }

    this.setTeamControlsDisabled(true)

    if (this.isAutoSpinning) {
      this.spinBtn.disabled = false
      this.spinBtn.textContent = 'DETENER'
    } else {
      this.spinBtn.disabled = true
    }

    if (this.nextBtn) this.nextBtn.disabled = true
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
        if (this.isAutoSpinning) {
          this.autoSpinTimeoutId = window.setTimeout(() => {
            if (this.isAutoSpinning) {
              this.spinPosition()
            }
          }, 900)
        } else {
          this.currentNextAction = () => this.spinPosition()
          if (this.nextBtn) this.nextBtn.style.display = 'none'
          this.spinBtn.disabled = false
          this.spinBtn.textContent = 'Siguiente'
          this.spinBtn.classList.add('next-btn')
          this.spinBtn.classList.remove('stop-btn')
        }
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
      if (this.nextBtn) this.nextBtn.style.display = 'none'
      this.spinBtn.disabled = false
      this.currentNextAction = null
      this.setTeamControlsDisabled(false)
      if (this.isAutoSpinning) {
        this.stopAutoSpin()
      }
      return
    }

    this.setTeamControlsDisabled(true)

    if (this.isAutoSpinning) {
      this.spinBtn.disabled = false
      this.spinBtn.textContent = 'DETENER'
    } else {
      this.spinBtn.disabled = true
    }

    if (this.nextBtn) this.nextBtn.disabled = true
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
    this.stopIdleAnimation()

    const { value: selectedTeamVal, team: targetTeam } =
      this.getSelectedTeamInfo()

    this.currentWinningCharacter = null
    this.currentWinningVariant = null
    this.currentNextAction = null
    if (this.nextBtn) {
      this.nextBtn.style.display = 'none'
      this.nextBtn.disabled = false
    }
    this.spinBtn.textContent = 'Tirar'
    this.spinBtn.classList.remove('next-btn')
    this.spinBtn.classList.remove('stop-btn')
    this.resultElement.textContent = ''

    if (!this.isAutoSpinning) {
      this.setTeamControlsDisabled(false)
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
    this.reelElement.style.transform = 'translate3d(0px, 0, 0)'
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

    if (!this.isAutoSpinning) {
      this.spinBtn.disabled = false
      this.startIdleAnimation()
    }
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
