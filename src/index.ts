export enum Mode {
  'Delay',
  'Bronstein',
  'Fischer',
  'Hourglass',
}

export enum Status {
  'ready',
  'live',
  'paused',
  'done',
}

const TIME = 5 * 60_000
const INCREMENT = 5000
const MODE = Mode.Fischer
const UPDATE_INTERVAL = 100
const STAGE_LIST = [
  {
    time: [TIME, TIME] as [number, number],
    mode: MODE,
    increment: INCREMENT,
  },
]

interface Stage {
  i?: number
  time: [number, number]
  move?: number
  increment?: number
  mode?: Mode
}

export interface State {
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
  stages?: Stage[]
  updateInterval?: number
  callback?: (state: State) => void
}

/** Chess timer */
export class Timer {
  private _move: [number, number] = [0, 0]
  private _remainingTime: [number, number]
  private _lastPlayer?: 0 | 1
  private _log: [number[], number[]] = [[], []]
  private _status: Status = Status.ready
  private _stage: [Stage, Stage]

  private _stages: Stage[]
  private _updateInterval: number
  private _callback?: (state: State) => void

  private _timestamp?: number
  private _interval?: NodeJS.Timeout

  constructor({
    stages = STAGE_LIST,
    updateInterval = UPDATE_INTERVAL,
    callback,
  }: TimerInterface = {}) {
    this._stages = stages.map((e, i) => ({ i, ...e }))
    this._stage = [this._stages[0], this._stages[0]]
    this._remainingTime = [...this._stages[0].time]

    this._updateInterval = updateInterval
    this._callback = callback
  }

  /** Resets game to initial or new game parameters (stages). */
  reset(stages?: Stage[]) {
    if (stages) this._stages = stages.map((e, i) => ({ i, ...e }))
    this._log = [[], []]
    this._move = [0, 0]
    this._remainingTime = [...this._stages[0].time]
    this._lastPlayer = undefined
    this._status = Status.ready
    this._invokeCallback()
  }

  /** Pauses game. */
  pause() {
    if (this._status !== Status.live || this._lastPlayer === undefined) return
    if (this._interval !== undefined) clearInterval(this._interval)
    this._record(this._other(this._lastPlayer))
    this._status = Status.paused
    this._invokeCallback()
  }

  /** Resumes paused game. */
  resume() {
    if (this._status !== Status.paused) return
    this._timestamp = Date.now()
    this._interval = setInterval(() => {
      if (this._lastPlayer !== undefined)
        this._tick(this._other(this._lastPlayer))
    }, this._updateInterval)
    this._status = Status.live
    this._invokeCallback()
  }

  /** Adds time to a player. */
  addTime(player: 0 | 1, time: number) {
    this._addTime(player, time)
    this._invokeCallback()
  }

  /** Ends player's turn (push button). */
  push(player: 0 | 1) {
    if (this._status === Status.done || this._status === Status.paused) return
    if (this._lastPlayer === player) return
    if (this._status === Status.ready) this._status = Status.live
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
    if (this._stage[player].mode === Mode.Fischer)
      this._remainingTime[player] += this._stage[player].increment || 0
  }

  private _bronstein(player: 0 | 1) {
    if (this._stage[player].mode === Mode.Bronstein) {
      const spent = this._log[player][this._log[player].length - 1] || 0
      const increment = this._stage[player].increment || 0
      const add = Math.min(spent, increment)
      this._remainingTime[player] += add
    }
  }

  private _hourglass(player: 0 | 1) {
    if (this._stage[player].mode === Mode.Hourglass) {
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

      if (this._stage[player].mode === Mode.Delay) {
        this._withDelay(player, diff)
      } else {
        this._addTime(player, -diff)
      }
    }

    if (this._remainingTime[player] <= 0) {
      this._remainingTime[player] = 0
      this._status = Status.done
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
    if (this._status !== Status.live) return
    this._record(player)
    this._invokeCallback()
  }

  private _other(player: 0 | 1) {
    return player === 1 ? 0 : 1
  }
}
