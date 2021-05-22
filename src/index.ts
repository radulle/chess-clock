export enum Increment {
  'Delay',
  'Bronstein',
  'Fischer',
}

export enum Status {
  'ready',
  'live',
  'paused',
  'done',
}

const TIME = 5 * 6000
const INCREMENT = 5
const INCREMENT_TYPE = Increment.Fischer
const UPDATE_INTERVAL = 100
const STAGE_LIST = [
  {
    time: [TIME, TIME] as [number, number],
    incrementType: INCREMENT_TYPE,
    increment: INCREMENT,
  },
]

interface Stage {
  i?: number
  time: [number, number]
  move?: number
  increment?: number
  incrementType?: Increment
}

export interface State {
  move: [number, number]
  remainingTime: [number, number]
  lastPlayer?: 0 | 1
  log: [number[], number[]]
  status: Status
  stage: [Stage, Stage]
  timestamp?: number
}

export interface TimerInterface {
  stageList?: Stage[]
  updateInterval?: number
  callback?: (state: State) => void
}

export class Timer {
  #move: [number, number] = [0, 0]
  #remainingTime: [number, number]
  #lastPlayer?: 0 | 1
  #log: [number[], number[]] = [[], []]
  #status: Status = Status.ready
  #stage: [Stage, Stage]

  #stageList: Stage[]
  #updateInterval: number
  #callback?: (state: State) => void

  #timestamp?: number
  #interval?: NodeJS.Timeout

  constructor({
    stageList = STAGE_LIST,
    updateInterval = UPDATE_INTERVAL,
    callback,
  }: TimerInterface = {}) {
    this.#stageList = stageList.map((e, i) => ({ i, ...e }))
    this.#stage = [this.#stageList[0], this.#stageList[0]]
    this.#remainingTime = [...this.#stageList[0].time]

    this.#updateInterval = updateInterval
    this.#callback = callback
  }

  reset() {
    this.#log = [[], []]
    this.#move = [0, 0]
    this.#remainingTime = [...this.#stageList[0].time]
    this.#lastPlayer = undefined
    this.#status = Status.ready
    this._callback()
  }

  pause() {
    if (this.#status !== Status.live) return
    if (this.#interval) clearInterval(this.#interval)
    this._record(this._otherPlayer)
    this.#status = Status.paused
    this._callback()
  }

  resume() {
    if (this.#status !== Status.paused) return
    this.#timestamp = Date.now()
    this.#interval = setInterval(() => {
      this._tick(this._otherPlayer)
    }, this.#updateInterval)
    this.#status = Status.live
    this._callback()
  }

  addTime(player: 0 | 1, time: number) {
    this._addTime(player, time)
    this._callback()
  }

  _addTime(player: 0 | 1, time: number) {
    this.#remainingTime[player] += time
  }

  push(player: 0 | 1) {
    if (this.#status === Status.done) return
    if (this.#lastPlayer === player) return
    if (this.#interval) clearInterval(this.#interval)

    this._tick(player)

    this.#lastPlayer = player
    this._logMove(player)
    this._updateStage(player)
    this.#log[this._otherPlayer].push(0)

    this.#interval = setInterval(() => {
      this._tick(this._otherPlayer)
    }, this.#updateInterval)
  }

  get state(): State {
    return {
      remainingTime: this.#remainingTime,
      move: this.#move,
      stage: this.#stage,
      lastPlayer: this.#lastPlayer,
      log: this.#log,
      status: this.#status,
      timestamp: this.#timestamp,
    }
  }

  private _callback() {
    if (this.#callback) this.#callback(this.state)
  }

  private _logMove(player: 0 | 1) {
    this.#move[player]++
  }

  private _updateStage(player: 0 | 1) {
    const newStage = this.#stageList.find((e) => e.move === this.#move[player])
    if (newStage) {
      this._addTime(player, newStage.time[player])
      this.#stage[player] = newStage
    }
  }

  private _record(player: 0 | 1) {
    const timestamp = this.#timestamp
    this.#timestamp = Date.now()
    if (timestamp !== undefined) {
      const elapsed = this.#timestamp - timestamp
      this.#log[player][this.#log[player].length - 1] += elapsed
      this.#remainingTime[player] -= elapsed
      if (this.#remainingTime[player] <= 0) {
        this.#remainingTime[player] = 0
        this.#status = Status.done
      }
    }
  }

  private _tick(player: 0 | 1) {
    if (this.#status === Status.done) return
    if (this.#status !== Status.live) this.#status = Status.live
    this._record(player)
    this._callback()
  }

  private get _otherPlayer() {
    return this.#lastPlayer === 1 ? 0 : 1
  }
}
