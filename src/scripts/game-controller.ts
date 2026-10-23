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
  getNextSelectionMode,
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
  SelectionMode,
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

  private currentActiveTeam: '1' | '2' = '1'
  private currentWinningCharacter: CharacterItem | null = null
  private currentWinningVariant: string | null = null
  private currentNextAction: (() => void) | null = null

  private reelElement!: HTMLDivElement
  private spinBtn!: HTMLButtonElement
  private nextBtn: HTMLButtonElement | null = null
  private resultElement!: HTMLElement

  // Status & Turn elements
  private modeIndicatorBadge!: HTMLButtonElement | null
  private modeBadgeText!: HTMLElement | null
  private turnIndicator!: HTMLElement | null
  private turnLabel!: HTMLElement | null
  private turnTeamBadge!: HTMLElement | null
  private neighborsTurnIndicator!: HTMLElement | null
  private splitSideLeft!: HTMLElement | null
  private splitSideRight!: HTMLElement | null

  // Settings & Modal elements
  private settingsModal!: HTMLDialogElement | null
  private openSettingsBtn!: HTMLButtonElement | null
  private closeSettingsBtn!: HTMLButtonElement | null
  private doneSettingsBtn!: HTMLButtonElement | null
  private autoSelectSwitch!: HTMLInputElement | null
  private allowDuplicatesSwitch!: HTMLInputElement | null
  private allowDuplicatesBadge!: HTMLElement | null
  private enableVariantsSwitch!: HTMLInputElement | null
  private modeRadios: NodeListOf<HTMLInputElement> | null = null

  private settings: GameSettings = {
    autoSelect: false,
    allowDuplicatesInTeam: false,
    enableVariants: true,
    selectionMode: 'alternate'
  }
  private userAllowDuplicatesPreference = false
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

    // Status elements
    this.modeIndicatorBadge = document.getElementById(
      'modeIndicatorBadge'
    ) as HTMLButtonElement | null
    this.modeBadgeText = document.getElementById('modeBadgeText')
    this.turnIndicator = document.getElementById('turnIndicator')
    this.turnLabel = document.querySelector('.turn-label')
    this.turnTeamBadge = document.getElementById('turnTeamBadge')
    this.neighborsTurnIndicator = document.getElementById(
      'neighborsTurnIndicator'
    )
    this.splitSideLeft = document.getElementById('splitSideLeft')
    this.splitSideRight = document.getElementById('splitSideRight')

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
    this.allowDuplicatesSwitch = document.getElementById(
      'allowDuplicatesSwitch'
    ) as HTMLInputElement | null
    this.allowDuplicatesBadge = document.getElementById('allowDuplicatesBadge')
    this.enableVariantsSwitch = document.getElementById(
      'enableVariantsSwitch'
    ) as HTMLInputElement | null
    this.modeRadios = document.querySelectorAll<HTMLInputElement>(
      'input[name="selectionMode"]'
    )

    if (!this.reelElement || !this.spinBtn || !this.resultElement) {
      console.warn('GameController: Required DOM elements missing.')
      return
    }

    // Expose for browser console debugging / backwards compatibility
    window.team1 = this.team1
    window.team2 = this.team2

    this.initSettings()
    this.updateTeamStatusUI()

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

    if (this.modeIndicatorBadge) {
      this.modeIndicatorBadge.addEventListener('click', () => {
        this.cycleSelectionMode()
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
    this.userAllowDuplicatesPreference = this.settings.allowDuplicatesInTeam

    // 1. Auto Select Switch
    if (this.autoSelectSwitch) {
      this.autoSelectSwitch.checked = this.settings.autoSelect

      this.autoSelectSwitch.addEventListener('change', () => {
        const isChecked = this.autoSelectSwitch?.checked ?? false
        this.settings.autoSelect = isChecked
        saveSettings(this.settings)
        if (!isChecked && this.isAutoSpinning) {
          this.stopAutoSpin()
        }
      })
    }

    // 2. Allow Duplicates in Team Switch
    if (this.allowDuplicatesSwitch) {
      this.allowDuplicatesSwitch.checked = this.settings.allowDuplicatesInTeam

      this.allowDuplicatesSwitch.addEventListener('change', () => {
        if (this.settings.selectionMode === 'neighbors') {
          return
        }
        this.userAllowDuplicatesPreference =
          this.allowDuplicatesSwitch?.checked ?? false
        this.settings.allowDuplicatesInTeam = this.userAllowDuplicatesPreference
        saveSettings(this.settings)
        this.resetRouletteForTeam()
      })
    }

    // 3. Enable Variants Switch
    if (this.enableVariantsSwitch) {
      this.enableVariantsSwitch.checked = this.settings.enableVariants

      this.enableVariantsSwitch.addEventListener('change', () => {
        this.settings.enableVariants =
          this.enableVariantsSwitch?.checked ?? true
        saveSettings(this.settings)
      })
    }

    // 4. Selection Mode Radios
    if (this.modeRadios) {
      this.modeRadios.forEach(radio => {
        if (radio.value === this.settings.selectionMode) {
          radio.checked = true
        }
        radio.addEventListener('change', () => {
          if (radio.checked) {
            this.setSelectionMode(radio.value as SelectionMode)
          }
        })
      })
    }

    this.syncDuplicatesControlState()

    const closeAndSync = () => {
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

  public cycleSelectionMode(): void {
    if (
      this.isReelSpinning ||
      this.isAutoSpinning ||
      this.modeIndicatorBadge?.disabled
    ) {
      return
    }

    const isT1Complete = isTeamComplete(this.team1)
    const isT2Complete = isTeamComplete(this.team2)
    if (isT1Complete && isT2Complete) {
      return
    }

    const nextMode = getNextSelectionMode(this.settings.selectionMode)
    this.setSelectionMode(nextMode)
  }

  public setSelectionMode(mode: SelectionMode): void {
    this.settings.selectionMode = mode
    this.syncDuplicatesControlState()
    saveSettings(this.settings)

    if (this.modeRadios) {
      this.modeRadios.forEach(radio => {
        radio.checked = radio.value === mode
      })
    }

    this.updateTeamStatusUI()
    this.resetRouletteForTeam()
  }

  private syncDuplicatesControlState(): void {
    if (!this.allowDuplicatesSwitch) return

    if (this.settings.selectionMode === 'neighbors') {
      this.allowDuplicatesSwitch.checked = true
      this.allowDuplicatesSwitch.disabled = true
      this.settings.allowDuplicatesInTeam = true
      if (this.allowDuplicatesBadge) {
        this.allowDuplicatesBadge.style.display = 'inline-block'
      }
    } else {
      this.allowDuplicatesSwitch.disabled = false
      this.allowDuplicatesSwitch.checked = this.userAllowDuplicatesPreference
      this.settings.allowDuplicatesInTeam = this.userAllowDuplicatesPreference
      if (this.allowDuplicatesBadge) {
        this.allowDuplicatesBadge.style.display = 'none'
      }
    }
  }

  public resetGame(): void {
    this.stopIdleAnimation()

    // 1. Clear rosters
    Object.keys(this.team1).forEach(pos => {
      this.team1[pos as BaseballPositionKey] = null
    })
    Object.keys(this.team2).forEach(pos => {
      this.team2[pos as BaseballPositionKey] = null
    })

    // 2. Clear visual tokens from stadiums
    document.querySelectorAll('.player-token').forEach(el => {
      el.remove()
    })

    // 3. Reset internal game state
    this.currentActiveTeam = '1'
    this.currentWinningCharacter = null
    this.currentWinningVariant = null
    this.currentNextAction = null
    this.isAutoSpinning = false
    if (this.autoSpinTimeoutId !== null) {
      window.clearTimeout(this.autoSpinTimeoutId)
      this.autoSpinTimeoutId = null
    }

    this.spinBtn.classList.remove('reset-btn')
    this.spinBtn.classList.remove('next-btn')
    this.spinBtn.classList.remove('stop-btn')
    this.resultElement.textContent = ''

    // 4. Update UI & controls
    this.setTeamControlsDisabled(false)
    this.updateTeamStatusUI()
    this.resetRouletteForTeam()
  }

  private updateModeBadgeUI(label: string, isComplete = false): void {
    if (this.modeBadgeText) {
      this.modeBadgeText.textContent = label
    } else if (this.modeIndicatorBadge) {
      this.modeIndicatorBadge.textContent = label
    }

    if (this.modeIndicatorBadge) {
      if (isComplete) {
        this.modeIndicatorBadge.title = 'Selección completada'
        this.modeIndicatorBadge.setAttribute(
          'aria-label',
          'Selección completada'
        )
        this.modeIndicatorBadge.disabled = true
      } else {
        this.modeIndicatorBadge.title = `Modo: ${label}. Clic para alternar`
        this.modeIndicatorBadge.setAttribute(
          'aria-label',
          `Modo de selección: ${label}. Haz clic para alternar`
        )
        if (!this.isReelSpinning && !this.isAutoSpinning) {
          this.modeIndicatorBadge.disabled = false
        }
      }
    }
  }

  public updateTeamStatusUI(): void {
    const isT1Complete = isTeamComplete(this.team1)
    const isT2Complete = isTeamComplete(this.team2)
    const bothComplete = isT1Complete && isT2Complete

    const stadium1 = document.getElementById('stadium-1')
    const stadium2 = document.getElementById('stadium-2')

    // 1. Both complete -> Offer Reiniciar Partida
    if (bothComplete) {
      this.updateModeBadgeUI('COMPLETADO', true)
      if (this.turnIndicator) this.turnIndicator.style.display = 'flex'
      if (this.neighborsTurnIndicator) {
        this.neighborsTurnIndicator.style.display = 'none'
      }
      if (this.turnLabel) {
        this.turnLabel.textContent = ''
      }
      if (this.turnTeamBadge) {
        this.turnTeamBadge.textContent = "LO EQUIPO TAN' COMPLETO!"
        this.turnTeamBadge.className = 'turn-team-badge complete-active'
      }
      if (stadium1) stadium1.classList.remove('active-stadium')
      if (stadium2) stadium2.classList.remove('active-stadium')

      this.spinBtn.disabled = false
      this.spinBtn.textContent = 'Reiniciar'
      this.spinBtn.classList.remove('stop-btn')
      this.spinBtn.classList.remove('next-btn')
      this.spinBtn.classList.add('reset-btn')
      this.currentNextAction = () => this.resetGame()
      return
    }

    // 2. Mode: Neighbors (2 en 1)
    if (this.settings.selectionMode === 'neighbors') {
      this.updateModeBadgeUI('VECINOS (2 EN 1)', false)

      if (!isT1Complete && !isT2Complete) {
        if (this.turnIndicator) this.turnIndicator.style.display = 'none'
        if (this.neighborsTurnIndicator) {
          this.neighborsTurnIndicator.style.display = 'flex'
        }

        if (this.splitSideLeft) {
          this.splitSideLeft.textContent = 'IZQUIERDA: EQ 1'
          this.splitSideLeft.className =
            'split-side-label split-left team1-active'
        }

        if (this.splitSideRight) {
          this.splitSideRight.textContent = 'DERECHA: EQ 2'
          this.splitSideRight.className =
            'split-side-label split-right team2-active'
        }

        if (stadium1) stadium1.classList.add('active-stadium')
        if (stadium2) stadium2.classList.add('active-stadium')
        return
      }

      // If one team is complete, fallback to show the remaining team
      const remainingTeam = isT1Complete ? '2' : '1'
      this.currentActiveTeam = remainingTeam
    }

    // 3. Mode: Alternate or Sequential (or Neighbors fallback for last remaining team)
    if (this.turnIndicator) this.turnIndicator.style.display = 'flex'
    if (this.neighborsTurnIndicator) {
      this.neighborsTurnIndicator.style.display = 'none'
    }

    if (this.settings.selectionMode === 'alternate') {
      this.updateModeBadgeUI('DRAFT ALTERNADO', false)
    } else if (this.settings.selectionMode === 'sequential') {
      this.updateModeBadgeUI('SECUENCIAL', false)
      if (!isT1Complete) {
        this.currentActiveTeam = '1'
      }
    }

    if (this.turnLabel) {
      this.turnLabel.textContent = 'TURNO:'
    }

    if (this.turnTeamBadge) {
      if (this.currentActiveTeam === '1') {
        this.turnTeamBadge.textContent = 'EQUIPO 1'
        this.turnTeamBadge.className = 'turn-team-badge team1-active'
      } else {
        this.turnTeamBadge.textContent = 'EQUIPO 2'
        this.turnTeamBadge.className = 'turn-team-badge team2-active'
      }
    }

    if (stadium1 && stadium2) {
      if (this.currentActiveTeam === '1') {
        stadium1.classList.add('active-stadium')
        stadium2.classList.remove('active-stadium')
      } else {
        stadium2.classList.add('active-stadium')
        stadium1.classList.remove('active-stadium')
      }
    }
  }

  private setTeamControlsDisabled(disabled: boolean): void {
    if (this.openSettingsBtn) this.openSettingsBtn.disabled = disabled
    const isT1Complete = isTeamComplete(this.team1)
    const isT2Complete = isTeamComplete(this.team2)
    const allComplete = isT1Complete && isT2Complete

    if (this.modeIndicatorBadge) {
      this.modeIndicatorBadge.disabled = disabled || allComplete
    }
  }

  private getSelectedTeamInfo(): { value: string; team: TeamRoster } {
    const value = this.currentActiveTeam
    const team = value === '2' ? this.team2 : this.team1
    return { value, team }
  }

  private setTeam(teamNum: '1' | '2'): void {
    this.currentActiveTeam = teamNum
    this.updateTeamStatusUI()
    this.resetRouletteForTeam()
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
    const availableCharacters = getAvailableCharacters(
      targetTeam,
      CHARACTERS,
      this.settings.allowDuplicatesInTeam
    )

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
        if (isTeamComplete(this.team1) && isTeamComplete(this.team2)) {
          this.resultElement.textContent = "LO EQUIPO TAN' COMPLETO!"
          this.stopAutoSpin()
          return
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
      if (isTeamComplete(this.team1) && isTeamComplete(this.team2)) {
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

    // Determine next active team based on current Selection Mode
    const isT1Complete = isTeamComplete(this.team1)
    const isT2Complete = isTeamComplete(this.team2)

    if (isT1Complete && isT2Complete) {
      this.resultElement.textContent = "LO EQUIPO TAN' COMPLETO!"
      this.updateTeamStatusUI()
      this.stopAutoSpin()
      this.spinBtn.disabled = true
      return
    }

    if (this.settings.selectionMode === 'alternate') {
      const otherTeam = selectedTeamVal === '1' ? '2' : '1'
      const otherComplete = otherTeam === '1' ? isT1Complete : isT2Complete
      if (!otherComplete) {
        this.currentActiveTeam = otherTeam
      }
    } else if (this.settings.selectionMode === 'sequential') {
      const currentComplete =
        selectedTeamVal === '1' ? isT1Complete : isT2Complete
      if (currentComplete) {
        this.currentActiveTeam = selectedTeamVal === '1' ? '2' : '1'
      }
    }

    this.updateTeamStatusUI()

    if (this.isAutoSpinning) {
      this.autoSpinTimeoutId = window.setTimeout(() => {
        if (this.isAutoSpinning) {
          this.spin()
        }
      }, 1000)
    } else {
      this.spinBtn.disabled = false
      this.setTeamControlsDisabled(false)
      const { team: nextTeam } = this.getSelectedTeamInfo()
      const remainingPositions = getAvailablePositions(nextTeam, POSITIONS)
      if (remainingPositions.length > 0) {
        this.idleStartTimeoutId = window.setTimeout(() => {
          if (
            !this.isReelSpinning &&
            !this.isAutoSpinning &&
            !this.currentNextAction
          ) {
            this.startIdleAnimation()
          }
        }, 1800)
      }
    }
  }

  public spin(): void {
    this.stopIdleAnimation()

    // Check overall completion
    if (isTeamComplete(this.team1) && isTeamComplete(this.team2)) {
      this.resultElement.textContent = "LO EQUIPO TAN' COMPLETO!"
      this.updateTeamStatusUI()
      this.stopAutoSpin()
      this.spinBtn.disabled = true
      return
    }

    // Neighbors mode handler
    if (
      this.settings.selectionMode === 'neighbors' &&
      !isTeamComplete(this.team1) &&
      !isTeamComplete(this.team2)
    ) {
      this.spinNeighbors()
      return
    }

    // Single team spin (Alternate, Sequential, or Neighbors when 1 team is already done)
    const { value: selectedTeamVal, team: targetTeam } =
      this.getSelectedTeamInfo()
    const availablePositions = getAvailablePositions(targetTeam, POSITIONS)
    const otherTeamVal: '1' | '2' = selectedTeamVal === '1' ? '2' : '1'
    const otherTeam = otherTeamVal === '1' ? this.team1 : this.team2

    if (availablePositions.length === 0) {
      if (!isTeamComplete(otherTeam)) {
        this.setTeam(otherTeamVal)
        this.spin()
      } else {
        this.resultElement.textContent = "LO EQUIPO TAN' COMPLETO!"
        this.stopAutoSpin()
      }
      return
    }

    const availableCharacters = getAvailableCharacters(
      targetTeam,
      CHARACTERS,
      this.settings.allowDuplicatesInTeam
    )
    if (availableCharacters.length === 0) {
      this.resultElement.textContent = `¡NO HAY MÁS PERSONAJES DISPONIBLES PARA EL EQUIPO ${selectedTeamVal}!`
      if (this.isAutoSpinning) {
        if (!isTeamComplete(otherTeam)) {
          this.setTeam(otherTeamVal)
          this.spin()
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
      const canSpinVariant =
        this.settings.enableVariants &&
        Boolean(winningItem.variant && winningItem.variant.length > 0)

      if (canSpinVariant) {
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

  private spinNeighbors(): void {
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
    this.spinBtn.classList.remove('reset-btn')
    this.resultElement.textContent = ''

    // Generate reel from characters
    const generatedItems = generateCharacterReel(CHARACTERS)
    const leftChar = generatedItems[WINNING_INDEX - 1]
    const rightChar = generatedItems[WINNING_INDEX + 1]
    const cards = generatedItems.map(createItemCard)

    this.animateReel(cards, () => {
      if (!leftChar || !rightChar) return

      const char1 = leftChar
      const char2 = rightChar
      let variant1: string | null = null
      let variant2: string | null = null

      this.resultElement.textContent = `EQ 1: ${char1.name.toUpperCase()} • EQ 2: ${char2.name.toUpperCase()}`

      const hasVar1 = Boolean(
        this.settings.enableVariants &&
          char1.variant &&
          char1.variant.length > 0
      )
      const hasVar2 = Boolean(
        this.settings.enableVariants &&
          char2.variant &&
          char2.variant.length > 0
      )

      const finishNeighborsRound = () => {
        this.updateTeamStatusUI()
        this.spinBtn.classList.remove('next-btn')
        this.spinBtn.classList.remove('stop-btn')

        const isT1Complete = isTeamComplete(this.team1)
        const isT2Complete = isTeamComplete(this.team2)

        if (isT1Complete && isT2Complete) {
          this.resultElement.textContent = "LO EQUIPO TAN' COMPLETO!"
          this.stopAutoSpin()
          this.updateTeamStatusUI()
          return
        }

        this.spinBtn.textContent = 'Tirar'
        this.currentNextAction = null

        if (this.isAutoSpinning) {
          this.autoSpinTimeoutId = window.setTimeout(() => {
            if (this.isAutoSpinning) {
              this.spin()
            }
          }, 1000)
        } else {
          this.spinBtn.disabled = false
          this.setTeamControlsDisabled(false)
          this.idleStartTimeoutId = window.setTimeout(() => {
            if (
              !this.isReelSpinning &&
              !this.isAutoSpinning &&
              !this.currentNextAction
            ) {
              this.startIdleAnimation()
            }
          }, 1800)
        }
      }

      const startPositionSpin = () => {
        const doPosition = () => {
          this.spinSharedPositionForNeighbors(
            char1,
            variant1,
            char2,
            variant2,
            () => finishNeighborsRound()
          )
        }

        if (this.isAutoSpinning) {
          this.autoSpinTimeoutId = window.setTimeout(() => {
            if (this.isAutoSpinning) doPosition()
          }, 900)
        } else {
          this.currentNextAction = doPosition
          this.spinBtn.disabled = false
          this.spinBtn.textContent = 'Elegir Posición'
          this.spinBtn.classList.add('next-btn')
          this.spinBtn.classList.remove('stop-btn')
        }
      }

      const startVariant2 = () => {
        if (hasVar2) {
          const doVar2 = () => {
            this.spinVariantForNeighbors('2', char2, v2 => {
              variant2 = v2
              startPositionSpin()
            })
          }

          if (this.isAutoSpinning) {
            this.autoSpinTimeoutId = window.setTimeout(() => {
              if (this.isAutoSpinning) doVar2()
            }, 900)
          } else {
            this.currentNextAction = doVar2
            this.spinBtn.disabled = false
            this.spinBtn.textContent = 'Color Eq 2'
            this.spinBtn.classList.add('next-btn')
            this.spinBtn.classList.remove('stop-btn')
          }
        } else {
          startPositionSpin()
        }
      }

      const startVariant1 = () => {
        if (hasVar1) {
          const doVar1 = () => {
            this.spinVariantForNeighbors('1', char1, v1 => {
              variant1 = v1
              startVariant2()
            })
          }

          if (this.isAutoSpinning) {
            this.autoSpinTimeoutId = window.setTimeout(() => {
              if (this.isAutoSpinning) doVar1()
            }, 900)
          } else {
            this.currentNextAction = doVar1
            this.spinBtn.disabled = false
            this.spinBtn.textContent = 'Color Eq 1'
            this.spinBtn.classList.add('next-btn')
            this.spinBtn.classList.remove('stop-btn')
          }
        } else {
          startVariant2()
        }
      }

      startVariant1()
    })
  }

  private spinVariantForNeighbors(
    teamVal: '1' | '2',
    character: CharacterItem,
    onComplete: (winningVariant: string) => void
  ): void {
    const variants = character.variant
    if (!variants || variants.length === 0) {
      onComplete('DEFAULT')
      return
    }

    this.currentActiveTeam = teamVal
    this.currentWinningCharacter = character
    this.updateTeamStatusUI()

    this.setTeamControlsDisabled(true)
    if (this.isAutoSpinning) {
      this.spinBtn.disabled = false
      this.spinBtn.textContent = 'DETENER'
    } else {
      this.spinBtn.disabled = true
    }
    if (this.nextBtn) this.nextBtn.style.display = 'none'
    this.resultElement.textContent = ''

    const generatedVariants = generateVariantReel(character, variants)
    const winningVariant = generatedVariants[WINNING_INDEX]
    const cards = generatedVariants.map(createVariantCard)

    this.animateReel(cards, () => {
      const variantText =
        !winningVariant || winningVariant.isDefault
          ? 'DEFAULT'
          : winningVariant.name.toUpperCase()

      this.resultElement.textContent = `EQ ${teamVal}: ${character.name.toUpperCase()} - ${variantText}`
      onComplete(variantText)
    })
  }

  private spinSharedPositionForNeighbors(
    char1: CharacterItem,
    variant1: string | null,
    char2: CharacterItem,
    variant2: string | null,
    onComplete: () => void
  ): void {
    const availPos1 = getAvailablePositions(this.team1, POSITIONS)
    const availPos2 = getAvailablePositions(this.team2, POSITIONS)

    let commonPositions = availPos1.filter(p1 =>
      availPos2.some(p2 => p2.code === p1.code)
    )
    if (commonPositions.length === 0) {
      commonPositions = availPos1.length > 0 ? availPos1 : availPos2
    }

    if (commonPositions.length === 0) {
      onComplete()
      return
    }

    if (commonPositions.length === 1 && commonPositions[0]) {
      const posCode = commonPositions[0].code
      const teamKey = POSITION_TO_TEAM_KEY[posCode] ?? 'P'
      assignPlayerToTeam(this.team1, teamKey, char1, variant1)
      this.updateStadiumField('1', teamKey, char1, variant1)
      assignPlayerToTeam(this.team2, teamKey, char2, variant2)
      this.updateStadiumField('2', teamKey, char2, variant2)

      const v1Text = variant1 && variant1 !== 'DEFAULT' ? ` (${variant1})` : ''
      const v2Text = variant2 && variant2 !== 'DEFAULT' ? ` (${variant2})` : ''
      this.resultElement.textContent = `${posCode}: EQ 1 ${char1.name.toUpperCase()}${v1Text} • EQ 2 ${char2.name.toUpperCase()}${v2Text}`
      onComplete()
      return
    }

    this.setTeamControlsDisabled(true)
    this.spinBtn.disabled = !this.isAutoSpinning
    if (this.isAutoSpinning) {
      this.spinBtn.textContent = 'DETENER'
    }

    const generatedPositions = generatePositionReel(commonPositions)
    const winningPosition = generatedPositions[WINNING_INDEX]
    const cards = generatedPositions.map(createPositionCard)

    this.animateReel(cards, () => {
      if (!winningPosition) return

      const teamKey = POSITION_TO_TEAM_KEY[winningPosition.code]
      if (teamKey) {
        assignPlayerToTeam(this.team1, teamKey, char1, variant1)
        this.updateStadiumField('1', teamKey, char1, variant1)
        assignPlayerToTeam(this.team2, teamKey, char2, variant2)
        this.updateStadiumField('2', teamKey, char2, variant2)
      }

      const v1Text = variant1 && variant1 !== 'DEFAULT' ? ` (${variant1})` : ''
      const v2Text = variant2 && variant2 !== 'DEFAULT' ? ` (${variant2})` : ''
      this.resultElement.textContent = `${winningPosition.code}: EQ 1 ${char1.name.toUpperCase()}${v1Text} • EQ 2 ${char2.name.toUpperCase()}${v2Text}`
      onComplete()
    })
  }

  public resetRouletteForTeam(): void {
    this.stopIdleAnimation()

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
    this.spinBtn.classList.remove('reset-btn')
    this.resultElement.textContent = ''

    this.updateTeamStatusUI()

    if (!this.isAutoSpinning) {
      this.setTeamControlsDisabled(false)
    }

    // Reset reel visually
    this.reelElement.style.transition = 'none'
    this.reelElement.style.transform = 'translate3d(0px, 0, 0)'
    this.reelElement.innerHTML = ''

    const isT1Complete = isTeamComplete(this.team1)
    const isT2Complete = isTeamComplete(this.team2)

    if (isT1Complete && isT2Complete) {
      this.resultElement.textContent = "LO EQUIPO TAN' COMPLETO!"
      this.updateTeamStatusUI()
      return
    }

    const { team: targetTeam, value: selectedTeamVal } =
      this.getSelectedTeamInfo()
    const availablePositions = getAvailablePositions(targetTeam, POSITIONS)
    const availableCharacters = getAvailableCharacters(
      targetTeam,
      CHARACTERS,
      this.settings.allowDuplicatesInTeam
    )

    if (availablePositions.length === 0) {
      this.resultElement.textContent = `¡EL EQUIPO ${selectedTeamVal} YA ESTÁ COMPLETO!`
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
