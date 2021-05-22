import { Mode, Status, Timer, TimerInterface } from '.'

const TIME = 5 * 60_000
const UPDATE_INTERVAL = 100

jest.useFakeTimers()
const dateNow = jest.spyOn(Date, 'now')
let time = 0
dateNow.mockImplementation(() => (time += UPDATE_INTERVAL))

const callback = jest.fn()

const noIncrement = {
  stages: [
    {
      time: [TIME, TIME],
      increment: 0,
    },
  ],
} as TimerInterface

const bronstein = {
  stages: [
    {
      time: [TIME, TIME],
      increment: 5000,
      mode: Mode.Bronstein,
    },
  ],
} as TimerInterface

const simpleDelay = {
  stages: [
    {
      time: [TIME, TIME],
      increment: 5000,
      mode: Mode.Delay,
    },
  ],
} as TimerInterface

const hourglass = {
  stages: [
    {
      time: [TIME, TIME],
      mode: Mode.Hourglass,
    },
  ],
} as TimerInterface

describe('Timer', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.clearAllTimers()
    time = 0
  })

  describe('Basic', () => {
    it('can track moves of two players', () => {
      const timer = new Timer()
      expect(timer.state.move).toStrictEqual([0, 0])
    })

    it('can track times of two players', () => {
      const timer = new Timer()
      expect(timer.state.remainingTime).toStrictEqual([TIME, TIME])
    })

    it('tracks history of two players', () => {
      const timer = new Timer()
      expect(timer.state.log).toStrictEqual([[], []])
    })

    it('can have different initial times', () => {
      const timer = new Timer({ stages: [{ time: [4, 2] }] })
      expect(timer.state.remainingTime).toStrictEqual([4, 2])
    })

    it('can add a move', () => {
      const timer = new Timer()
      timer.push(0)
      expect(timer.state.move).toStrictEqual([1, 0])
    })

    it('stage defined by move', () => {
      const timer = new Timer({
        stages: [{ time: [1, 1] }, { time: [1, 1], move: 1 }],
      })
      timer.push(0)
      expect(timer.state.stage.map((e) => e.i)).toStrictEqual([1, 0])
    })

    it('can add time', () => {
      const timer = new Timer()
      timer.addTime(0, 42)
      expect(timer.state.remainingTime).toStrictEqual([TIME + 42, TIME])
    })

    it('will add time on new stage', () => {
      const timer = new Timer({
        stages: [{ time: [42, 21] }, { time: [42, 21], move: 1 }],
      })
      timer.push(0)
      expect(timer.state.remainingTime).toStrictEqual([84, 21])
    })

    it('can reset to initial game parameters', () => {
      const timer = new Timer(noIncrement)
      timer.push(0)
      timer.addTime(0, 42)
      expect(timer.state.move).toStrictEqual([1, 0])
      expect(timer.state.remainingTime).toStrictEqual([TIME + 42, TIME])
      expect(timer.state.log).not.toStrictEqual([[], []])
      timer.reset()
      expect(timer.state.move).toStrictEqual([0, 0])
      expect(timer.state.remainingTime).toStrictEqual([TIME, TIME])
      expect(timer.state.log).toStrictEqual([[], []])
    })

    it('can reset to new game parameters', () => {
      const timer = new Timer(noIncrement)
      expect(timer.state.stages[0].mode).toBeUndefined()
      timer.reset(hourglass.stages)
      expect(timer.state.stages[0].mode).toBe(Mode.Hourglass)
    })

    it('provides state', () => {
      const timer = new Timer()
      expect(timer.state).not.toBe(undefined)
    })

    it('status is ready initially and after reset', () => {
      const timer = new Timer()
      expect(timer.state.status).toBe(Status.ready)
      timer.push(0)
      expect(timer.state.status).toBe(Status.live)
      timer.reset()
      expect(timer.state.status).toBe(Status.ready)
    })

    it('status is done when remainingTime has expired', () => {
      const timer = new Timer()
      timer.push(0)
      jest.runTimersToTime(TIME)
      expect(timer.state.status).toBe(Status.done)
    })

    it('status is done when remainingTime has expired on push', () => {
      const timer = new Timer()
      timer.push(0)
      dateNow.mockReturnValueOnce(TIME + 100)
      timer.push(1)
      expect(timer.state.status).toBe(Status.done)
    })

    it('remainingTime can not be lower than 0', () => {
      const timer = new Timer({ ...noIncrement, callback })
      timer.push(0)
      jest.runTimersToTime(2 * TIME)
      expect(timer.state.remainingTime).toStrictEqual([TIME, 0])
    })
  })

  describe('Push', () => {
    it('can starts timing', () => {
      const timer = new Timer()
      expect(timer.state.status).toBe(Status.ready)
      timer.push(0)
      expect(timer.state.status).toBe(Status.live)
    })

    it('can set last player', () => {
      const timer = new Timer()
      timer.push(0)
      expect(timer.state.lastPlayer).toBe(0)
    })

    it('can add a move to player', () => {
      const timer = new Timer()
      timer.push(0)
      expect(timer.state.move).toStrictEqual([1, 0])
    })

    it('has no effect if twice in a row by the same player', () => {
      const timer = new Timer()
      timer.push(0)
      const state = timer.state
      timer.push(0)
      expect(timer.state).toStrictEqual(state)
    })

    it('has no effect if status is done', () => {
      const timer = new Timer()
      timer.push(0)
      jest.runTimersToTime(TIME)
      timer.push(1)
      const state = timer.state
      timer.push(0)
      expect(timer.state).toStrictEqual(state)
    })

    it('can update elapsed time (without increment)', () => {
      const timer = new Timer(noIncrement)

      timer.push(0)
      expect(timer.state.timestamp).toBe(100)

      timer.push(1)
      expect(timer.state.timestamp).toBe(200)

      expect(dateNow).toBeCalledTimes(2)
    })

    it('can log time on non opening moves (without increment)', () => {
      const timer = new Timer(noIncrement)

      expect(timer.state.status).toBe(Status.ready)

      timer.push(0)
      expect(timer.state.log[0][0]).toBe(undefined)
      expect(timer.state.remainingTime).toStrictEqual([TIME, TIME])

      jest.runTimersToTime(1000)
      expect(timer.state.remainingTime).toStrictEqual([TIME, TIME - 1000])

      timer.push(1)
      expect(timer.state.log[1][0]).toBe(1100)
      expect(timer.state.remainingTime).toStrictEqual([TIME, TIME - 1100])

      jest.runTimersToTime(450)
      timer.push(0)
      expect(timer.state.log[0][0]).toBe(500)
      expect(timer.state.remainingTime).toStrictEqual([TIME - 500, TIME - 1100])

      expect(timer.state.status).toBe(Status.live)
      expect(dateNow).toBeCalledTimes(17)
    })
  })

  describe('Pause', () => {
    it('has effect if status is live', () => {
      const timer = new Timer(noIncrement)

      timer.push(0)

      expect(timer.state.status).toBe(Status.live)
      timer.pause()

      jest.runTimersToTime(4200)

      expect(timer.state.remainingTime).toStrictEqual([TIME, TIME - 100])
      expect(timer.state.log[1][0]).toBe(100)
      expect(dateNow).toBeCalledTimes(2)
      expect(timer.state.status).toBe(Status.paused)
    })

    it('has no effect if status is not live', () => {
      const timer = new Timer(noIncrement)

      // ready
      timer.pause()
      jest.runTimersToTime(4200)
      expect(timer.state.status).toBe(Status.ready)

      timer.push(0)
      jest.runTimersToTime(TIME)
      expect(timer.state.status).toBe(Status.done)

      // done
      timer.pause()
      jest.runTimersToTime(4200)
      expect(timer.state.status).toBe(Status.done)

      expect(dateNow).toBeCalledTimes(TIME / UPDATE_INTERVAL + 1)
    })
  })

  describe('Resume', () => {
    it('has effect if status is paused', () => {
      const timer = new Timer(noIncrement)

      timer.push(0)

      timer.pause()

      jest.runTimersToTime(1000)

      timer.resume()

      jest.runTimersToTime(1000)

      expect(timer.state.remainingTime).toStrictEqual([TIME, TIME - 1100])
      expect(timer.state.log[1][0]).toBe(1100)
      expect(dateNow).toBeCalledTimes(13)
      expect(timer.state.status).toBe(Status.live)
    })

    it('has no effect if status is not live', () => {
      const timer = new Timer(noIncrement)

      // ready
      timer.resume()
      jest.runTimersToTime(1000)
      expect(timer.state.status).toBe(Status.ready)

      timer.push(0)
      jest.runTimersToTime(1000)

      // live
      timer.resume()
      jest.runTimersToTime(1000)
      expect(timer.state.remainingTime).toStrictEqual([TIME, TIME - 2000])
      expect(dateNow).toBeCalledTimes(21)
      expect(timer.state.status).toBe(Status.live)

      jest.runTimersToTime(TIME)

      // done
      timer.resume()
      expect(timer.state.status).toBe(Status.done)
    })

    it('Resume has no effect if status is ready or done', () => {
      const timer = new Timer(noIncrement)

      // ready
      timer.resume()
      expect(timer.state.status).toBe(Status.ready)

      timer.push(0)
      jest.runTimersToTime(TIME)
      expect(timer.state.status).toBe(Status.done)
      expect(timer.state.remainingTime).toStrictEqual([TIME, 0])

      // done
      timer.resume()
      jest.runTimersToTime(1000)
      expect(timer.state.status).toBe(Status.done)
      expect(timer.state.remainingTime).toStrictEqual([TIME, 0])
    })
  })

  describe('Callback', () => {
    it('is called on push', () => {
      const timer = new Timer({ callback })
      timer.push(0)
      expect(callback).toBeCalledTimes(1)
    })

    it('is called on pause', () => {
      const timer = new Timer({ callback })
      timer.push(0)
      timer.pause()
      timer.pause()
      expect(callback).toBeCalledTimes(2)
    })

    it('is called on resume', () => {
      const timer = new Timer({ callback })
      timer.push(0)
      timer.resume()
      timer.pause()
      timer.resume()
      timer.resume()
      expect(callback).toBeCalledTimes(3)
    })

    it('is called on addTime', () => {
      const timer = new Timer({ callback })
      timer.addTime(0, 0)
      expect(callback).toBeCalledTimes(1)
    })

    it('is called on ticks', () => {
      const timer = new Timer({ callback })
      timer.push(0)
      jest.runTimersToTime(1000)
      expect(callback).toBeCalledTimes(11)
    })
  })

  describe('Increments', () => {
    describe('Fischer', () => {
      it('will add increment at end of each turn', () => {
        const timer = new Timer()
        timer.push(0)
        expect(timer.state.remainingTime).toStrictEqual([
          TIME + (timer.state.stage[0].increment || 0),
          TIME,
        ])
      })
    })

    describe('Bronstein', () => {
      it('will add spent increment at end of each turn', () => {
        const timer = new Timer(bronstein)
        timer.push(0)
        expect(timer.state.remainingTime).toStrictEqual([TIME, TIME])
        jest.advanceTimersByTime((timer.state.stage[1]?.increment || 0) / 2)
        expect(timer.state.remainingTime).toStrictEqual([
          TIME,
          TIME - (timer.state.stage[1]?.increment || 0) / 2,
        ])
        timer.push(1)
        expect(timer.state.remainingTime).toStrictEqual([TIME, TIME])
      })

      it('will add whole increment if it is spent at end of each turn', () => {
        const timer = new Timer(bronstein)
        timer.push(0)
        expect(timer.state.remainingTime).toStrictEqual([TIME, TIME])
        jest.advanceTimersByTime(timer.state.stage[1]?.increment || 0)
        timer.push(1)
        expect(timer.state.remainingTime).toStrictEqual([TIME, TIME - 100])
      })
    })

    describe('Hourglass', () => {
      it('will add spent time to opponent', () => {
        const timer = new Timer(hourglass)
        timer.push(0)
        expect(timer.state.remainingTime).toStrictEqual([TIME, TIME])
        jest.advanceTimersByTime(1000)
        timer.push(1)
        expect(timer.state.remainingTime).toStrictEqual([
          TIME + 1100,
          TIME - 1100,
        ])
      })
    })

    describe('Delay', () => {
      it('will not start decreasing remainingTime before delay', () => {
        const timer = new Timer(simpleDelay)
        const delay = timer.state.stage[1]?.increment || 0
        timer.push(0)
        expect(timer.state.remainingTime).toStrictEqual([TIME, TIME])
        jest.advanceTimersByTime(delay / 2)
        expect(timer.state.remainingTime).toStrictEqual([TIME, TIME])
        timer.push(1)
        jest.advanceTimersByTime(delay - 100)
        timer.push(0)
        expect(timer.state.remainingTime).toStrictEqual([TIME, TIME])
      })

      it('will decrease remainingTime after delay', () => {
        const timer = new Timer(simpleDelay)
        const delay = timer.state.stage[1]?.increment || 0
        timer.push(0)
        jest.advanceTimersByTime(delay + 100)
        timer.push(1)
        expect(timer.state.remainingTime).toStrictEqual([TIME, TIME - 200])
      })

      it('will immediately decrease remainingTime after delay', () => {
        const timer = new Timer(simpleDelay)
        const delay = timer.state.stage[1]?.increment || 0
        timer.push(0)
        jest.advanceTimersByTime(delay)
        timer.push(1)
        expect(timer.state.remainingTime).toStrictEqual([TIME, TIME - 100])
      })
    })
  })
})
