import { Timer } from '.'

const TIME = 5 * 6000
const UPDATE_INTERVAL = 100

const dateNow = jest.spyOn(Date, 'now')

describe('Timer', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.clearAllTimers()
    jest.clearAllMocks()
  })

  describe('Tracks moves', () => {
    it('Tracks moves of two players', () => {
      const timer = new Timer()
      expect(timer.move).toStrictEqual([0, 0])
    })

    it('Adds a move', () => {
      const timer = new Timer()
      timer.logMove(0)
      expect(timer.move).toStrictEqual([1, 0])
    })

    it('Current move defines current stage', () => {
      const timer = new Timer({ stageList: [{ time: [1, 1], move: 1 }] })
      timer.logMove(0)
      expect(timer.stage).toStrictEqual([1, 0])
    })
  })

  describe('Tracks time', () => {
    it('Tracks times of two players', () => {
      const timer = new Timer()
      expect(timer.remainingTime).toStrictEqual([TIME, TIME])
    })

    it('Initial times can differ', () => {
      const timer = new Timer({ stageList: [{ time: [4, 2] }] })
      expect(timer.remainingTime).toStrictEqual([4, 2])
    })

    it('Add time to a player', () => {
      const timer = new Timer({
        stageList: [{ time: [4, 2] }, { time: [4, 2], move: 1 }],
      })
      timer.addTime(0, 1)
      expect(timer.remainingTime).toStrictEqual([5, 2])
    })

    it('Add time to a player on beginning of a stage', () => {
      const timer = new Timer({
        stageList: [{ time: [4, 2] }, { time: [4, 2], move: 1 }],
      })
      timer.addTimeOnNewStage(0)
      expect(timer.remainingTime).toStrictEqual([4, 2])
      timer.logMove(0)
      timer.addTimeOnNewStage(0)
      expect(timer.remainingTime).toStrictEqual([8, 2])
    })
  })

  describe('Tracks history', () => {
    it('Tracks history of two players', () => {
      const timer = new Timer()
      expect(timer.log).toStrictEqual([[], []])
    })

    it('Push to history', () => {
      const timer = new Timer()
      timer.logHistory(0, 42)
      expect(timer.log).toStrictEqual([[42], []])
    })
  })

  it('Reset move, time and history to initial values', () => {
    const timer = new Timer()
    timer.logMove(0)
    timer.addTime(0, 1)
    timer.logHistory(0, 0)
    expect(timer.move).not.toStrictEqual([0, 0])
    expect(timer.remainingTime).not.toStrictEqual(timer.stageList[0].time)
    expect(timer.log).not.toStrictEqual([[], []])
    timer.reset()
    expect(timer.move).toStrictEqual([0, 0])
    expect(timer.remainingTime).toStrictEqual(timer.stageList[0].time)
    expect(timer.log).toStrictEqual([[], []])
  })

  describe('Trigger', () => {
    it('Trigger starts timing', () => {
      const timer = new Timer()
      expect(timer.timestamp).toBeUndefined()
      timer.trigger(0)
      expect(timer.timestamp).not.toBeUndefined()
    })

    it('Trigger sets last player', () => {
      const timer = new Timer()
      timer.trigger(0)
      expect(timer.lastPlayer).toBe(0)
    })

    it('Trigger adds a move to player', () => {
      const timer = new Timer()
      timer.trigger(0)
      expect(timer.move).toStrictEqual([1, 0])
    })

    it('Same player can not trigger twice in a row', () => {
      const timer = new Timer()
      timer.trigger(0)
      timer.trigger(0)
      expect(timer.move).toStrictEqual([1, 0])
    })

    it('Subsequent trigger sets new timestamp (without increment)', () => {
      let time = 0
      dateNow.mockImplementation(() => (time += UPDATE_INTERVAL))

      const timer = new Timer({ increment: 0 })

      timer.trigger(0)
      expect(timer.timestamp).toBe(100)

      timer.trigger(1)
      expect(timer.timestamp).toBe(200)

      expect(dateNow).toBeCalledTimes(2)
    })

    it('Log time on non opening moves (without increment)', () => {
      let time = 0
      dateNow.mockImplementation(() => (time += UPDATE_INTERVAL))

      const timer = new Timer({ increment: 0 })

      timer.trigger(0)
      expect(timer.log[0][0]).toBeUndefined()
      expect(timer.remainingTime).toStrictEqual([TIME, TIME])

      jest.runTimersToTime(1000)
      expect(timer.remainingTime).toStrictEqual([TIME, TIME - 1000])

      timer.trigger(1)
      expect(timer.log[1][0]).toBe(1100)
      expect(timer.remainingTime).toStrictEqual([TIME, TIME - 1100])

      jest.runTimersToTime(450)
      timer.trigger(0)
      expect(timer.log[0][0]).toBe(500)
      expect(timer.remainingTime).toStrictEqual([TIME - 500, TIME - 1100])

      expect(dateNow).toBeCalledTimes(17)
    })
  })
})

// Handle Pause ...
// Handle Increments
// Handle Done ...
// Provide State ...
// Clamp RemainingTime ...
// Add callbacks ...
