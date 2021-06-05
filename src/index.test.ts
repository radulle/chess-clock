import { Clock } from '.'

const TIME = 5 * 60_000
const UPDATE_INTERVAL = 100

jest.useFakeTimers()
const dateNow = jest.spyOn(Date, 'now')
let time = 0
dateNow.mockImplementation(() => (time += UPDATE_INTERVAL))

const callback = jest.fn()

const fischer = Clock.getConfig('Fischer Rapid 5|5')!
const noIncrement = Clock.getConfig('Fischer Blitz 5|0')!
const bronstein = Clock.getConfig('Bronstein Bullet 1|2')!
const simpleDelay = Clock.getConfig('Tournament 40/120|5, 60|5')!
const hourglass = Clock.getConfig('Hourglass 1')!

describe('Clock', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.clearAllTimers()
    time = 0
  })

  describe('Basic', () => {
    it('can track moves of two players', () => {
      const clock = new Clock(noIncrement)
      expect(clock.state.move).toStrictEqual([0, 0])
    })

    it('can return white', () => {
      const clock = new Clock(noIncrement)
      expect(clock.state.white).toBe(undefined)
      clock.push(1)
      clock.push(0)
      expect(clock.state.white).toBe(0)
      clock.reset()
      expect(clock.state.white).toBe(undefined)
      clock.push(0)
      expect(clock.state.white).toBe(1)
    })

    it('can track times of two players', () => {
      const clock = new Clock(noIncrement)
      expect(clock.state.remainingTime).toStrictEqual([TIME, TIME])
    })

    it('tracks history of two players', () => {
      const clock = new Clock(noIncrement)
      expect(clock.state.log).toStrictEqual([[], []])
    })

    it('can have different initial times', () => {
      const clock = new Clock({
        ...noIncrement,
        stages: [{ time: [4, 2], mode: 'Fischer', increment: 0 }],
      })
      expect(clock.state.remainingTime).toStrictEqual([4, 2])
    })

    it('can add a move', () => {
      const clock = new Clock(noIncrement)
      clock.push(0)
      expect(clock.state.move).toStrictEqual([1, 0])
    })

    it('stage defined by move', () => {
      const clock = new Clock({
        ...noIncrement,
        stages: [
          { time: [1, 1], mode: 'Fischer', increment: 0 },
          { time: [1, 1], move: 1, mode: 'Fischer', increment: 0 },
        ],
      })
      clock.push(0)
      expect(clock.state.stage.map((e) => e.i)).toStrictEqual([1, 0])
    })

    it('can add time', () => {
      const clock = new Clock(noIncrement)
      clock.addTime(0, 42)
      expect(clock.state.remainingTime).toStrictEqual([TIME + 42, TIME])
    })

    it('will add time on new stage', () => {
      const clock = new Clock({
        ...noIncrement,
        stages: [
          { time: [42, 21], mode: 'Fischer', increment: 0 },
          { time: [42, 21], move: 1, mode: 'Fischer', increment: 0 },
        ],
      })
      clock.push(0)
      expect(clock.state.remainingTime).toStrictEqual([84, 21])
    })

    it('can reset to initial game parameters', () => {
      const clock = new Clock(noIncrement)
      clock.push(0)
      clock.addTime(0, 42)
      expect(clock.state.move).toStrictEqual([1, 0])
      expect(clock.state.remainingTime).toStrictEqual([TIME + 42, TIME])
      expect(clock.state.log).not.toStrictEqual([[], []])
      clock.reset()
      expect(clock.state.move).toStrictEqual([0, 0])
      expect(clock.state.remainingTime).toStrictEqual([TIME, TIME])
      expect(clock.state.log).toStrictEqual([[], []])
    })

    it('can reset to new game parameters', () => {
      const clock = new Clock(noIncrement)
      expect(clock.state.stages[0].mode).toBe('Fischer')
      clock.reset(hourglass)
      expect(clock.state.stages[0].mode).toBe('Hourglass')
    })

    it('provides state', () => {
      const clock = new Clock(noIncrement)
      expect(clock.state).not.toBe(undefined)
    })

    it('status is ready initially and after reset', () => {
      const clock = new Clock(noIncrement)
      expect(clock.state.status).toBe('ready')
      clock.push(0)
      expect(clock.state.status).toBe('live')
      clock.reset()
      expect(clock.state.status).toBe('ready')
    })

    it('status is done when remainingTime has expired', () => {
      const clock = new Clock(noIncrement)
      clock.push(0)
      jest.runTimersToTime(TIME)
      expect(clock.state.status).toBe('done')
    })

    it('status is done when remainingTime has expired on push', () => {
      const clock = new Clock(noIncrement)
      clock.push(0)
      dateNow.mockReturnValueOnce(TIME + 100)
      clock.push(1)
      expect(clock.state.status).toBe('done')
    })

    it('remainingTime can not be lower than 0', () => {
      const clock = new Clock({ ...noIncrement, callback })
      clock.push(0)
      jest.runTimersToTime(2 * TIME)
      expect(clock.state.remainingTime).toStrictEqual([TIME, 0])
    })
  })

  describe('Push', () => {
    it('can starts timing', () => {
      const clock = new Clock(noIncrement)
      expect(clock.state.status).toBe('ready')
      clock.push(0)
      expect(clock.state.status).toBe('live')
    })

    it('can set last player', () => {
      const clock = new Clock(noIncrement)
      clock.push(0)
      expect(clock.state.lastPlayer).toBe(0)
    })

    it('can add a move to player', () => {
      const clock = new Clock(noIncrement)
      clock.push(0)
      expect(clock.state.move).toStrictEqual([1, 0])
    })

    it('has no effect if twice in a row by the same player', () => {
      const clock = new Clock(noIncrement)
      clock.push(0)
      const state = clock.state
      clock.push(0)
      expect(clock.state).toStrictEqual(state)
    })

    it('has no effect if status is done', () => {
      const clock = new Clock(noIncrement)
      clock.push(0)
      jest.runTimersToTime(TIME)
      clock.push(1)
      const state = clock.state
      clock.push(0)
      expect(clock.state).toStrictEqual(state)
    })

    it('can update elapsed time (without increment)', () => {
      const clock = new Clock(noIncrement)

      clock.push(0)
      expect(clock.state.timestamp).toBe(100)

      clock.push(1)
      expect(clock.state.timestamp).toBe(200)

      expect(dateNow).toBeCalledTimes(2)
    })

    it('can log time on non opening moves (without increment)', () => {
      const clock = new Clock(noIncrement)

      expect(clock.state.status).toBe('ready')

      clock.push(0)
      expect(clock.state.log[0][0]).toBe(undefined)
      expect(clock.state.remainingTime).toStrictEqual([TIME, TIME])

      jest.runTimersToTime(1000)
      expect(clock.state.remainingTime).toStrictEqual([TIME, TIME - 1000])

      clock.push(1)
      expect(clock.state.log[1][0]).toBe(1100)
      expect(clock.state.remainingTime).toStrictEqual([TIME, TIME - 1100])

      jest.runTimersToTime(450)
      clock.push(0)
      expect(clock.state.log[0][0]).toBe(500)
      expect(clock.state.remainingTime).toStrictEqual([TIME - 500, TIME - 1100])

      expect(clock.state.status).toBe('live')
      expect(dateNow).toBeCalledTimes(17)
    })
  })

  describe('Pause', () => {
    it('has effect if status is live', () => {
      const clock = new Clock(noIncrement)

      clock.push(0)

      expect(clock.state.status).toBe('live')
      clock.pause()

      jest.runTimersToTime(4200)

      expect(clock.state.remainingTime).toStrictEqual([TIME, TIME - 100])
      expect(clock.state.log[1][0]).toBe(100)
      expect(dateNow).toBeCalledTimes(2)
      expect(clock.state.status).toBe('paused')
    })

    it('has no effect if status is not live', () => {
      const clock = new Clock(noIncrement)

      // ready
      clock.pause()
      jest.runTimersToTime(4200)
      expect(clock.state.status).toBe('ready')

      clock.push(0)
      jest.runTimersToTime(TIME)
      expect(clock.state.status).toBe('done')

      // done
      clock.pause()
      jest.runTimersToTime(4200)
      expect(clock.state.status).toBe('done')

      expect(dateNow).toBeCalledTimes(TIME / UPDATE_INTERVAL + 1)
    })
  })

  describe('Resume', () => {
    it('has effect if status is paused', () => {
      const clock = new Clock(noIncrement)

      clock.push(0)

      clock.pause()

      jest.runTimersToTime(1000)

      clock.resume()

      jest.runTimersToTime(1000)

      expect(clock.state.remainingTime).toStrictEqual([TIME, TIME - 1100])
      expect(clock.state.log[1][0]).toBe(1100)
      expect(dateNow).toBeCalledTimes(13)
      expect(clock.state.status).toBe('live')
    })

    it('has no effect if status is not live', () => {
      const clock = new Clock(noIncrement)

      // ready
      clock.resume()
      jest.runTimersToTime(1000)
      expect(clock.state.status).toBe('ready')

      clock.push(0)
      jest.runTimersToTime(1000)

      // live
      clock.resume()
      jest.runTimersToTime(1000)
      expect(clock.state.remainingTime).toStrictEqual([TIME, TIME - 2000])
      expect(dateNow).toBeCalledTimes(21)
      expect(clock.state.status).toBe('live')

      jest.runTimersToTime(TIME)

      // done
      clock.resume()
      expect(clock.state.status).toBe('done')
    })

    it('Resume has no effect if status is ready or done', () => {
      const clock = new Clock(noIncrement)

      // ready
      clock.resume()
      expect(clock.state.status).toBe('ready')

      clock.push(0)
      jest.runTimersToTime(TIME)
      expect(clock.state.status).toBe('done')
      expect(clock.state.remainingTime).toStrictEqual([TIME, 0])

      // done
      clock.resume()
      jest.runTimersToTime(1000)
      expect(clock.state.status).toBe('done')
      expect(clock.state.remainingTime).toStrictEqual([TIME, 0])
    })
  })

  describe('Callback', () => {
    it('is called on push', () => {
      const clock = new Clock({ ...noIncrement, callback })
      clock.push(0)
      expect(callback).toBeCalledTimes(1)
    })

    it('is called on pause', () => {
      const clock = new Clock({ ...noIncrement, callback })
      clock.push(0)
      clock.pause()
      clock.pause()
      expect(callback).toBeCalledTimes(2)
    })

    it('is called on resume', () => {
      const clock = new Clock({ ...noIncrement, callback })
      clock.push(0)
      clock.resume()
      clock.pause()
      clock.resume()
      clock.resume()
      expect(callback).toBeCalledTimes(3)
    })

    it('is called on addTime', () => {
      const clock = new Clock({ ...noIncrement, callback })
      clock.addTime(0, 0)
      expect(callback).toBeCalledTimes(1)
    })

    it('is called on ticks', () => {
      const clock = new Clock({ ...noIncrement, callback })
      clock.push(0)
      jest.runTimersToTime(1000)
      expect(callback).toBeCalledTimes(11)
    })
  })

  describe('Increments', () => {
    describe('Fischer', () => {
      it('will add increment at end of each turn', () => {
        const clock = new Clock(fischer)
        clock.push(0)
        expect(clock.state.remainingTime).toStrictEqual([
          TIME + clock.state.stage[0].increment,
          TIME,
        ])
      })
    })

    describe('Bronstein', () => {
      it('will add spent increment at end of each turn', () => {
        const clock = new Clock(bronstein)
        const time = clock.state.stages[0].time
        clock.push(0)
        expect(clock.state.remainingTime).toStrictEqual(time)
        jest.advanceTimersByTime(clock.state.stage[1]?.increment / 2)
        expect(clock.state.remainingTime).toStrictEqual([
          time[0],
          time[1] - clock.state.stage[1].increment / 2,
        ])
        clock.push(1)
        expect(clock.state.remainingTime).toStrictEqual(time)
      })

      it('will add whole increment if it is spent at end of each turn', () => {
        const clock = new Clock(bronstein)
        const time = clock.state.stages[0].time
        clock.push(0)
        expect(clock.state.remainingTime).toStrictEqual(time)
        jest.advanceTimersByTime(clock.state.stage[1]?.increment || 0)
        clock.push(1)
        expect(clock.state.remainingTime).toStrictEqual([
          time[0],
          time[1] - 100,
        ])
      })
    })

    describe('Hourglass', () => {
      it('will add spent time to opponent', () => {
        const clock = new Clock(hourglass)
        const time = clock.state.stages[0].time
        clock.push(0)
        expect(clock.state.remainingTime).toStrictEqual(time)
        jest.advanceTimersByTime(1000)
        clock.push(1)
        expect(clock.state.remainingTime).toStrictEqual([
          time[0] + 1100,
          time[1] - 1100,
        ])
      })
    })

    describe('Delay', () => {
      it('will not start decreasing remainingTime before delay', () => {
        const clock = new Clock(simpleDelay)
        const time = clock.state.stages[0].time
        const delay = clock.state.stage[1]?.increment
        clock.push(0)
        expect(clock.state.remainingTime).toStrictEqual(time)
        jest.advanceTimersByTime(delay / 2)
        expect(clock.state.remainingTime).toStrictEqual(time)
        clock.push(1)
        jest.advanceTimersByTime(delay - 100)
        clock.push(0)
        expect(clock.state.remainingTime).toStrictEqual(time)
      })

      it('will decrease remainingTime after delay', () => {
        const clock = new Clock(simpleDelay)
        const time = clock.state.stages[0].time
        const delay = clock.state.stage[1]?.increment
        clock.push(0)
        jest.advanceTimersByTime(delay + 100)
        clock.push(1)
        expect(clock.state.remainingTime).toStrictEqual([
          time[0],
          time[1] - 200,
        ])
      })

      it('will immediately decrease remainingTime after delay', () => {
        const clock = new Clock(simpleDelay)
        const time = clock.state.stages[0].time
        const delay = clock.state.stage[1]?.increment
        clock.push(0)
        jest.advanceTimersByTime(delay)
        clock.push(1)
        expect(clock.state.remainingTime).toStrictEqual([
          time[0],
          time[1] - 100,
        ])
      })
    })
  })

  describe('Configs', () => {
    it('can list config names', () => {
      const names = Clock.listConfigNames()
      expect(names.length).not.toBe(0)
      expect(names.every((n) => typeof n === 'string')).toBe(true)
    })

    it('can list config entries', () => {
      const entries = Clock.listConfigEntries()
      expect(entries.length).not.toBe(0)
      expect(
        entries.every(
          ([n, s]) => typeof n === 'string' && typeof s === 'object'
        )
      ).toBe(true)
    })

    it('can add/set a config', () => {
      const length = Clock.listConfigNames().length
      Clock.setConfig('test', [
        {
          time: [60_000, 60_000],
          mode: 'Hourglass',
          increment: 0,
        },
      ])
      expect(Clock.listConfigNames().length).toBe(length + 1)
      expect(Clock.listConfigNames().includes('test')).toBeTruthy()
      Clock.setConfig('test', [
        {
          time: [60_000, 60_000],
          mode: 'Fischer',
          increment: 0,
        },
      ])
      expect(Clock.listConfigNames().length).toBe(length + 1)
      expect(Clock.getConfig('test')?.stages[0].mode).toBe('Fischer')
    })

    it('can get a config', () => {
      expect(Clock.getConfig('Hourglass 1')).not.toBeUndefined()
    })

    it('returns undefined if no config', () => {
      expect(Clock.getConfig('Does not exist')).toBeUndefined()
    })

    it('can delete a config', () => {
      Clock.setConfig('test', [
        {
          time: [60_000, 60_000],
          mode: 'Fischer',
          increment: 0,
        },
      ])
      Clock.deleteConfig('test')
      expect(Clock.getConfig('Does not exist')).toBeUndefined()
    })
  })
})
