enum Increment {
  'Delay',
  'Bronstein',
  'Fischer',
}

enum Status {
  'ready',
  'live',
  'paused',
  'done',
}

const TIME = 5 * 6000
const INCREMENT = 5
const INCREMENT_TYPE = Increment.Fischer
const UPDATE_INTERVAL = 100

interface State {
  move: [number, number]
  remainingTime: [number, number]
  lastPlayer?: 0 | 1
  log: [number[], number[]]
  status: Status
  stage: [number, number]
}

interface Timer {
  stageList: { time: [number, number]; move?: number }[]
  increment: number
  incrementType: Increment
  updateInterval: number
  callback?: (state: State) => void
}

class Timer {
  move: [number, number] = [0, 0]
  remainingTime: [number, number]
  lastPlayer?: 0 | 1
  log: [number[], number[]] = [[], []]
  status: Status = Status.ready

  timestamp?: number
  interval?: NodeJS.Timeout

  constructor({
    stageList = [{ time: [TIME, TIME] }],
    increment = INCREMENT,
    incrementType = INCREMENT_TYPE,
    updateInterval = UPDATE_INTERVAL,
    callback,
  }: Partial<Timer> = {}) {
    this.stageList = stageList
    this.increment = increment
    this.incrementType = incrementType
    this.updateInterval = updateInterval
    this.callback = callback

    this.remainingTime = [...stageList[0].time]
  }

  reset() {
    this.log = [[], []]
    this.move = [0, 0]
    this.remainingTime = [...this.stageList[0].time]
    this.lastPlayer = undefined
    this.status = Status.ready
  }

  pause() {
    if (this.interval) clearInterval(this.interval)
    this.tick(this.otherPlayer)
    this.status = Status.paused
  }

  resume() {
    this.timestamp = Date.now()
    this.interval = setInterval(() => {
      this.tick(this.otherPlayer)
    }, this.updateInterval)
    this.status = Status.live
  }

  logMove(player: 0 | 1) {
    this.move[player]++
  }

  addTime(player: 0 | 1, time: number) {
    this.remainingTime[player] += time
  }

  logHistory(player: 0 | 1, time: number) {
    this.log[player].push(time)
  }

  addTimeOnNewStage(player: 0 | 1) {
    const newStage = this.stageList.find((e) => e.move === this.move[player])
    if (newStage) this.addTime(player, newStage.time[player])
  }

  tick(player: 0 | 1) {
    if (this.callback) this.callback(this.state)
    if (this.status === Status.done) return
    if (this.status !== Status.live) this.status = Status.live
    const timestamp = this.timestamp
    this.timestamp = Date.now()
    if (timestamp !== undefined) {
      const elapsed = this.timestamp - timestamp
      this.log[player][this.log[player].length - 1] += elapsed
      this.remainingTime[player] -= elapsed
      if (this.remainingTime[player] <= 0) {
        this.remainingTime[player] = 0
        this.status = Status.done
      }
    }
  }

  trigger(player: 0 | 1) {
    if (this.status === Status.done) return
    if (this.lastPlayer === player) return
    if (this.interval) clearInterval(this.interval)

    this.tick(player)

    this.lastPlayer = player
    this.logMove(player)
    this.addTimeOnNewStage(player)
    this.log[this.otherPlayer].push(0)

    this.interval = setInterval(() => {
      this.tick(this.otherPlayer)
    }, this.updateInterval)
  }

  get otherPlayer() {
    return this.lastPlayer === 1 ? 0 : 1
  }

  get stage() {
    return this.move.map(
      (move) =>
        this.stageList.findIndex(
          ({ move: moves }) => move >= (moves || Infinity)
        ) + 1
    ) as [number, number]
  }

  get state(): State {
    return {
      remainingTime: [...this.remainingTime],
      move: [...this.move],
      stage: [...this.stage],
      lastPlayer: this.lastPlayer,
      log: this.log.map((e) => [...e]) as [number[], number[]],
      status: this.status,
    }
  }
}

export { Timer }
