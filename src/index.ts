const UPDATE_INTERVAL = 100

export type Mode = 'Delay' | 'Bronstein' | 'Fischer' | 'Hourglass'

export type Status = 'ready' | 'live' | 'paused' | 'done'

export interface Stage {
  i?: number
  time: [number, number]
  move?: number
  increment: number
  mode: Mode
}

export interface State {
  name?: string
  move: [number, number]
  remainingTime: [number, number]
  lastPlayer?: 0 | 1
  log: [number[], number[]]
  status: Status
  stage: [Stage, Stage]
  timestamp?: number
  stages: Stage[]
}

export interface TimerInterface {
  name: string
  stages: Stage[]
  updateInterval?: number
  callback?: (state: State) => void
}

/** Chess timer */
export class Timer {
  private _name?: string
  private _move: [number, number] = [0, 0]
  private _remainingTime: [number, number]
  private _lastPlayer?: 0 | 1
  private _log: [number[], number[]] = [[], []]
  private _status: Status = 'ready'
  private _stage: [Stage, Stage]

  private _stages: Stage[]
  private _updateInterval: number
  private _callback?: (state: State) => void

  private _timestamp?: number
  private _interval?: NodeJS.Timeout

  constructor({
    name,
    stages,
    updateInterval = UPDATE_INTERVAL,
    callback,
  }: TimerInterface) {
    this._name = name
    this._stages = stages.map((e, i) => ({ i, ...e }))
    this._stage = [this._stages[0], this._stages[0]]
    this._remainingTime = [...this._stages[0].time]

    this._updateInterval = updateInterval
    this._callback = callback
  }

  /** Resets game to initial or new game config. */
  reset(): void
  reset({ name, stages }: { name: string; stages: Stage[] }): void
  reset({ name, stages }: { name?: string; stages?: Stage[] } = {}) {
    if (name !== undefined && stages !== undefined) {
      this._stages = stages.map((e, i) => ({ i, ...e }))
      this._name = name
    }

    this._log = [[], []]
    this._move = [0, 0]
    this._stage = [this._stages[0], this._stages[0]]
    this._remainingTime = [...this._stages[0].time]
    this._lastPlayer = undefined
    this._status = 'ready'
    this._invokeCallback()
  }

  /** Pauses game. */
  pause() {
    if (this._status !== 'live' || this._lastPlayer === undefined) return
    if (this._interval !== undefined) clearInterval(this._interval)
    this._record(this._other(this._lastPlayer))
    this._status = 'paused'
    this._invokeCallback()
  }

  /** Resumes paused game. */
  resume() {
    if (this._status !== 'paused') return
    this._timestamp = Date.now()
    this._interval = setInterval(() => {
      if (this._lastPlayer !== undefined)
        this._tick(this._other(this._lastPlayer))
    }, this._updateInterval)
    this._status = 'live'
    this._invokeCallback()
  }

  /** Adds time to a player. */
  addTime(player: 0 | 1, time: number) {
    this._addTime(player, time)
    this._invokeCallback()
  }

  /** Ends player's turn (push button). */
  push(player: 0 | 1) {
    if (this._status === 'done' || this._status === 'paused') return
    if (this._lastPlayer === player) return
    if (this._status === 'ready') this._status = 'live'
    if (this._interval !== undefined) clearInterval(this._interval)

    this._lastPlayer = player

    const done = this._record(player)
    if (done) return

    this._logMove(player)

    this._fischer(player)
    this._bronstein(player)
    this._hourglass(player)

    this._updateStage(player)
    this._log[this._other(player)].push(0)

    this._interval = setInterval(() => {
      this._tick(this._other(player))
    }, this._updateInterval)

    this._invokeCallback()
  }

  /** Returns game's state. */
  get state(): State {
    return {
      name: this._name,
      remainingTime: this._remainingTime,
      move: this._move,
      stage: this._stage,
      lastPlayer: this._lastPlayer,
      log: this._log,
      status: this._status,
      timestamp: this._timestamp,
      stages: this._stages,
    }
  }

  private _fischer(player: 0 | 1) {
    if (this._stage[player].mode === 'Fischer')
      this._remainingTime[player] += this._stage[player].increment || 0
  }

  private _bronstein(player: 0 | 1) {
    if (this._stage[player].mode === 'Bronstein') {
      const spent = this._log[player][this._log[player].length - 1] || 0
      const increment = this._stage[player].increment || 0
      const add = Math.min(spent, increment)
      this._remainingTime[player] += add
    }
  }

  private _hourglass(player: 0 | 1) {
    if (this._stage[player].mode === 'Hourglass') {
      const spent = this._log[player][this._log[player].length - 1] || 0
      this._remainingTime[this._other(player)] += spent
    }
  }

  private _addTime(player: 0 | 1, time: number) {
    this._remainingTime[player] += time
  }

  private _invokeCallback() {
    if (this._callback) this._callback(this.state)
  }

  private _logMove(player: 0 | 1) {
    this._move[player]++
  }

  private _updateStage(player: 0 | 1) {
    const newStage = this._stages.find((e) => e.move === this._move[player])
    if (newStage) {
      this._addTime(player, newStage.time[player])
      this._stage[player] = newStage
    }
  }

  private _record(player: 0 | 1) {
    const before = this._timestamp
    const after = (this._timestamp = Date.now())

    if (before !== undefined) {
      const diff = after - before
      this._log[player][this._log[player].length - 1] += diff

      if (this._stage[player].mode === 'Delay') {
        this._withDelay(player, diff)
      } else {
        this._addTime(player, -diff)
      }
    }

    if (this._remainingTime[player] <= 0) {
      this._remainingTime[player] = 0
      this._status = 'done'
      return true
    }
    return false
  }

  private _withDelay(player: 0 | 1, diff: number) {
    const delay = this._stage[player].increment || 0
    const elapsed = this._log[player][this._log[player].length - 1]
    if (elapsed - diff > delay) {
      this._addTime(player, -diff)
      return
    }
    if (elapsed > delay) {
      this._addTime(player, -(elapsed - delay))
    }
  }

  private _tick(player: 0 | 1) {
    if (this._status !== 'live') return
    this._record(player)
    this._invokeCallback()
  }

  private _other(player: 0 | 1) {
    return player === 1 ? 0 : 1
  }

  private static _Configs = new Map<string, Stage[]>()

  /** Add/replace a config in configs store. */
  static setConfig(name: string, stages: Stage[]) {
    Timer._Configs.set(name, stages)
  }

  /** Delete a config by name in configs store. */
  static deleteConfig(name: string) {
    Timer._Configs.delete(name)
  }

  /** Get a config by name from configs store. */
  static getConfig(name: string) {
    const stages = Timer._Configs.get(name)
    if (!stages) return
    return {
      name,
      stages,
    }
  }

  /** List config names from configs store. */
  static listConfigNames() {
    return [...Timer._Configs.keys()]
  }

  /** List config entries from configs store. */
  static listConfigEntries() {
    return [...Timer._Configs.entries()]
  }
}

Timer.setConfig('Fischer Blitz 5|0', [
  {
    time: [300_000, 300_000],
    mode: 'Fischer',
    increment: 0,
  },
])

Timer.setConfig('Fischer Rapid 5|5', [
  {
    time: [300_000, 300_000],
    mode: 'Fischer',
    increment: 5000,
  },
])

Timer.setConfig('Fischer Rapid 10|5', [
  {
    time: [600_000, 600_000],
    mode: 'Fischer',
    increment: 5000,
  },
])

Timer.setConfig('Delay Bullet 1|2', [
  {
    time: [60_000, 60_000],
    mode: 'Delay',
    increment: 2000,
  },
])

Timer.setConfig('Bronstein Bullet 1|2', [
  {
    time: [60_000, 60_000],
    mode: 'Bronstein',
    increment: 2000,
  },
])

Timer.setConfig('Hourglass 1', [
  {
    time: [60_000, 60_000],
    mode: 'Hourglass',
    increment: 0,
  },
])

Timer.setConfig('Tournament 40/120|5, 60|5', [
  {
    time: [7_200_000, 7_200_000],
    mode: 'Delay',
    increment: 5000,
  },
  {
    move: 40,
    time: [3_600_000, 3_600_000],
    mode: 'Delay',
    increment: 5000,
  },
])
