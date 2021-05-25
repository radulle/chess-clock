import { Timer } from '.'

const TIME = 5 * 60_000
const UPDATE_INTERVAL = 100

jest.useFakeTimers()
const dateNow = jest.spyOn(Date, 'now')
let time = 0
dateNow.mockImplementation(() => (time += UPDATE_INTERVAL))

const callback = jest.fn()

const fischer = Timer.getConfig('Fischer Rapid 5|5')!
const noIncrement = Timer.getConfig('Fischer Blitz 5|0')!
const bronstein = Timer.getConfig('Bronstein Bullet 1|2')!
const simpleDelay = Timer.getConfig('Tournament 40/120|5, 60|5')!
const hourglass = Timer.getConfig('Hourglass 1')!

describe('Timer', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.clearAllTimers()
    time = 0
  })

  describe('Basic', () => {
    it('can track moves of two players', () => {
      const timer = new Timer(noIncrement)
      expect(timer.state.move).toStrictEqual([0, 0])
    })

    it('can track times of two players', () => {
      const timer = new Timer(noIncrement)
      expect(timer.state.remainingTime).toStrictEqual([TIME, TIME])
    })

    it('tracks history of two players', () => {
      const timer = new Timer(noIncrement)
      expect(timer.state.log).toStrictEqual([[], []])
    })

    it('can have different initial times', () => {
      const timer = new Timer({
        ...noIncrement,
        stages: [{ time: [4, 2], mode: 'Fischer', increment: 0 }],
      })
      expect(timer.state.remainingTime).toStrictEqual([4, 2])
    })

    it('can add a move', () => {
      const timer = new Timer(noIncrement)
      timer.push(0)
      expect(timer.state.move).toStrictEqual([1, 0])
    })

    it('stage defined by move', () => {
      const timer = new Timer({
        ...noIncrement,
        stages: [
          { time: [1, 1], mode: 'Fischer', increment: 0 },
          { time: [1, 1], move: 1, mode: 'Fischer', increment: 0 },
        ],
      })
      timer.push(0)
      expect(timer.state.stage.map((e) => e.i)).toStrictEqual([1, 0])
    })

    it('can add time', () => {
      const timer = new Timer(noIncrement)
      timer.addTime(0, 42)
      expect(timer.state.remainingTime).toStrictEqual([TIME + 42, TIME])
    })

    it('will add time on new stage', () => {
      const timer = new Timer({
        ...noIncrement,
        stages: [
          { time: [42, 21], mode: 'Fischer', increment: 0 },
          { time: [42, 21], move: 1, mode: 'Fischer', increment: 0 },
        ],
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
      expect(timer.state.stages[0].mode).toBe('Fischer')
      timer.reset(hourglass)
      expect(timer.state.stages[0].mode).toBe('Hourglass')
    })

    it('provides state', () => {
      const timer = new Timer(noIncrement)
      expect(timer.state).not.toBe(undefined)
    })

    it('status is ready initially and after reset', () => {
      const timer = new Timer(noIncrement)
      expect(timer.state.status).toBe('ready')
      timer.push(0)
      expect(timer.state.status).toBe('live')
      timer.reset()
      expect(timer.state.status).toBe('ready')
    })

    it('status is done when remainingTime has expired', () => {
      const timer = new Timer(noIncrement)
      timer.push(0)
      jest.runTimersToTime(TIME)
      expect(timer.state.status).toBe('done')
    })

    it('status is done when remainingTime has expired on push', () => {
      const timer = new Timer(noIncrement)
      timer.push(0)
      dateNow.mockReturnValueOnce(TIME + 100)
      timer.push(1)
      expect(timer.state.status).toBe('done')
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
      const timer = new Timer(noIncrement)
      expect(timer.state.status).toBe('ready')
      timer.push(0)
      expect(timer.state.status).toBe('live')
    })

    it('can set last player', () => {
      const timer = new Timer(noIncrement)
      timer.push(0)
      expect(timer.state.lastPlayer).toBe(0)
    })

    it('can add a move to player', () => {
      const timer = new Timer(noIncrement)
      timer.push(0)
      expect(timer.state.move).toStrictEqual([1, 0])
    })

    it('has no effect if twice in a row by the same player', () => {
      const timer = new Timer(noIncrement)
      timer.push(0)
      const state = timer.state
      timer.push(0)
      expect(timer.state).toStrictEqual(state)
    })

    it('has no effect if status is done', () => {
      const timer = new Timer(noIncrement)
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

      expect(timer.state.status).toBe('ready')

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

      expect(timer.state.status).toBe('live')
      expect(dateNow).toBeCalledTimes(17)
    })
  })

  describe('Pause', () => {
    it('has effect if status is live', () => {
      const timer = new Timer(noIncrement)

      timer.push(0)

      expect(timer.state.status).toBe('live')
      timer.pause()

      jest.runTimersToTime(4200)

      expect(timer.state.remainingTime).toStrictEqual([TIME, TIME - 100])
      expect(timer.state.log[1][0]).toBe(100)
      expect(dateNow).toBeCalledTimes(2)
      expect(timer.state.status).toBe('paused')
    })

    it('has no effect if status is not live', () => {
      const timer = new Timer(noIncrement)

      // ready
      timer.pause()
      jest.runTimersToTime(4200)
      expect(timer.state.status).toBe('ready')

      timer.push(0)
      jest.runTimersToTime(TIME)
      expect(timer.state.status).toBe('done')

      // done
      timer.pause()
      jest.runTimersToTime(4200)
      expect(timer.state.status).toBe('done')

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
      expect(timer.state.status).toBe('live')
    })

    it('has no effect if status is not live', () => {
      const timer = new Timer(noIncrement)

      // ready
      timer.resume()
      jest.runTimersToTime(1000)
      expect(timer.state.status).toBe('ready')

      timer.push(0)
      jest.runTimersToTime(1000)

      // live
      timer.resume()
      jest.runTimersToTime(1000)
      expect(timer.state.remainingTime).toStrictEqual([TIME, TIME - 2000])
      expect(dateNow).toBeCalledTimes(21)
      expect(timer.state.status).toBe('live')

      jest.runTimersToTime(TIME)

      // done
      timer.resume()
      expect(timer.state.status).toBe('done')
    })

    it('Resume has no effect if status is ready or done', () => {
      const timer = new Timer(noIncrement)

      // ready
      timer.resume()
      expect(timer.state.status).toBe('ready')

      timer.push(0)
      jest.runTimersToTime(TIME)
      expect(timer.state.status).toBe('done')
      expect(timer.state.remainingTime).toStrictEqual([TIME, 0])

      // done
      timer.resume()
      jest.runTimersToTime(1000)
      expect(timer.state.status).toBe('done')
      expect(timer.state.remainingTime).toStrictEqual([TIME, 0])
    })
  })

  describe('Callback', () => {
    it('is called on push', () => {
      const timer = new Timer({ ...noIncrement, callback })
      timer.push(0)
      expect(callback).toBeCalledTimes(1)
    })

    it('is called on pause', () => {
      const timer = new Timer({ ...noIncrement, callback })
      timer.push(0)
      timer.pause()
      timer.pause()
      expect(callback).toBeCalledTimes(2)
    })

    it('is called on resume', () => {
      const timer = new Timer({ ...noIncrement, callback })
      timer.push(0)
      timer.resume()
      timer.pause()
      timer.resume()
      timer.resume()
      expect(callback).toBeCalledTimes(3)
    })

    it('is called on addTime', () => {
      const timer = new Timer({ ...noIncrement, callback })
      timer.addTime(0, 0)
      expect(callback).toBeCalledTimes(1)
    })

    it('is called on ticks', () => {
      const timer = new Timer({ ...noIncrement, callback })
      timer.push(0)
      jest.runTimersToTime(1000)
      expect(callback).toBeCalledTimes(11)
    })
  })

  describe('Increments', () => {
    describe('Fischer', () => {
      it('will add increment at end of each turn', () => {
        const timer = new Timer(fischer)
        timer.push(0)
        expect(timer.state.remainingTime).toStrictEqual([
          TIME + timer.state.stage[0].increment,
          TIME,
        ])
      })
    })

    describe('Bronstein', () => {
      it('will add spent increment at end of each turn', () => {
        const timer = new Timer(bronstein)
        const time = timer.state.stages[0].time
        timer.push(0)
        expect(timer.state.remainingTime).toStrictEqual(time)
        jest.advanceTimersByTime(timer.state.stage[1]?.increment / 2)
        expect(timer.state.remainingTime).toStrictEqual([
          time[0],
          time[1] - timer.state.stage[1].increment / 2,
        ])
        timer.push(1)
        expect(timer.state.remainingTime).toStrictEqual(time)
      })

      it('will add whole increment if it is spent at end of each turn', () => {
        const timer = new Timer(bronstein)
        const time = timer.state.stages[0].time
        timer.push(0)
        expect(timer.state.remainingTime).toStrictEqual(time)
        jest.advanceTimersByTime(timer.state.stage[1]?.increment || 0)
        timer.push(1)
        expect(timer.state.remainingTime).toStrictEqual([
          time[0],
          time[1] - 100,
        ])
      })
    })

    describe('Hourglass', () => {
      it('will add spent time to opponent', () => {
        const timer = new Timer(hourglass)
        const time = timer.state.stages[0].time
        timer.push(0)
        expect(timer.state.remainingTime).toStrictEqual(time)
        jest.advanceTimersByTime(1000)
        timer.push(1)
        expect(timer.state.remainingTime).toStrictEqual([
          time[0] + 1100,
          time[1] - 1100,
        ])
      })
    })

    describe('Delay', () => {
      it('will not start decreasing remainingTime before delay', () => {
        const timer = new Timer(simpleDelay)
        const time = timer.state.stages[0].time
        const delay = timer.state.stage[1]?.increment
        timer.push(0)
        expect(timer.state.remainingTime).toStrictEqual(time)
        jest.advanceTimersByTime(delay / 2)
        expect(timer.state.remainingTime).toStrictEqual(time)
        timer.push(1)
        jest.advanceTimersByTime(delay - 100)
        timer.push(0)
        expect(timer.state.remainingTime).toStrictEqual(time)
      })

      it('will decrease remainingTime after delay', () => {
        const timer = new Timer(simpleDelay)
        const time = timer.state.stages[0].time
        const delay = timer.state.stage[1]?.increment
        timer.push(0)
        jest.advanceTimersByTime(delay + 100)
        timer.push(1)
        expect(timer.state.remainingTime).toStrictEqual([
          time[0],
          time[1] - 200,
        ])
      })

      it('will immediately decrease remainingTime after delay', () => {
        const timer = new Timer(simpleDelay)
        const time = timer.state.stages[0].time
        const delay = timer.state.stage[1]?.increment
        timer.push(0)
        jest.advanceTimersByTime(delay)
        timer.push(1)
        expect(timer.state.remainingTime).toStrictEqual([
          time[0],
          time[1] - 100,
        ])
      })
    })
  })

  describe('Configs', () => {
    it('can list config names', () => {
      const names = Timer.listConfigNames()
      expect(names.length).not.toBe(0)
      expect(names.every((n) => typeof n === 'string')).toBe(true)
    })

    it('can list config entries', () => {
      const entries = Timer.listConfigEntries()
      expect(entries.length).not.toBe(0)
      expect(
        entries.every(
          ([n, s]) => typeof n === 'string' && typeof s === 'object'
        )
      ).toBe(true)
    })

    it('can add/set a config', () => {
      const length = Timer.listConfigNames().length
      Timer.setConfig('test', [
        {
          time: [60_000, 60_000],
          mode: 'Hourglass',
          increment: 0,
        },
      ])
      expect(Timer.listConfigNames().length).toBe(length + 1)
      expect(Timer.listConfigNames().includes('test')).toBeTruthy()
      Timer.setConfig('test', [
        {
          time: [60_000, 60_000],
          mode: 'Fischer',
          increment: 0,
        },
      ])
      expect(Timer.listConfigNames().length).toBe(length + 1)
      expect(Timer.getConfig('test')?.stages[0].mode).toBe('Fischer')
    })

    it('can get a config', () => {
      expect(Timer.getConfig('Hourglass 1')).not.toBeUndefined()
    })

    it('returns undefined if no config', () => {
      expect(Timer.getConfig('Does not exist')).toBeUndefined()
    })

    it('can delete a config', () => {
      Timer.setConfig('test', [
        {
          time: [60_000, 60_000],
          mode: 'Fischer',
          increment: 0,
        },
      ])
      Timer.deleteConfig('test')
      expect(Timer.getConfig('Does not exist')).toBeUndefined()
    })
  })
})
