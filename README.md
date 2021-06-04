# CHESS-CLOCK

- multi-stage chess clock
- supported timing methods:
  - hourglass
  - simple delay
  - Bronstein
  - Fischer
- clock config store comes with most common game types
- supports mid-game player penalty/bonus
- TDD -> good test coverage
- full Typescript support
- vanilla JavaScript
- 0 dependencies
- **esm** and **commonjs** imports supported
- small footprint, less than 2 kb uglified and gzipped

## Installation

Package is available on **NPM**:

```sh
yarn add chess-clock
```

or

```sh
npm install chess-clock
```

## Imports

### ESM

```ts
import { Clock } from 'chess-clock'
```

### CommonJS

```ts
const { Clock } = require('chess-clock/cjs')
```

## Basic example

```ts
import { Clock } from 'chess-clock'

const fischer = Clock.getConfig('Fischer Rapid 5|5')!
const updateInterval = 1000
const callback = console.info

const clock = new Clock({
  ...fischer,
  updateInterval,
  callback,
})

clock.push(0)
setTimeout(() => clock.push(1), 2100)
setTimeout(() => clock.push(0), 4200)
setTimeout(() => clock.push(1), 8400)
```

## Instantiating Clock

```ts
const clock = new Clock ({
  // clock config (can be retrieved from the Config store or inlined)
  name?: string
  stages?: Stage[]
  // optional: default is 100ms
  updateInterval?: number
  // optional: called with clock state on each "button" push and on each interval update
  callback?(state: State): void
})
```

## Instance methods

### Get clock's state

```ts
clock.state
```

### Add time to a player

```ts
clock.addTime(player: 0 | 1, time: number)
```

### End player's turn

```ts
clock.push(player: 0 | 1)
```

### Pause clock

```ts
clock.pause()
```

### Resume clock

```ts
clock.resume()
```

### Reset clock with old or new config

```ts
clock.reset()
clock.reset({ name: string; stages: Stage[] })
```

## Static methods

### Clock configurations

Clock config store holds arrays of Stage objects.

```ts
Stage {
  // Allocated time per player
  time: [number, number]
  // 0 based move at which this stage starts (number of moves of previous stages)
  move?: number
  // Delay / increment in milliseconds
  increment: number
  // Delay, Bronstein, Fischer, Hourglass
  mode: Mode
}
```

### Add/replace a config in configs store

```ts
Clock.setConfig(name: string, stages: Stage[])
```

### Delete a config by name in configs store

```ts
Clock.deleteConfig(name: string)
```

### Get a config by name from configs store

```ts
Clock.setConfig(name: string)
```

### List config names from configs store.

```ts
Clock.listConfigNames()
```

### List config entries from configs store

```ts
Clock.listConfigEntries()
```

## Timing methods ([wikipedia](https://en.wikipedia.org/wiki/Time_control#Chess))

### Hourglass

Each player's clock starts with a specified time (such as one minute or ten minutes). While one player is deciding a move, their clock time decreases and their opponent's clock time increases. This is analogous to an hourglass: sand empties from one container and fills the other. The sum of both clocks always remains the same, and slow moves give extra time to the opponent. There is no maximum amount of time allotted for a game with this timing method; if both players play quickly enough, the game will continue until its natural end.

### Fischer / increment

In increment (also known as bonus and Fischer, after Bobby Fischer's patent on it), a specified amount of time is added to the player's main time after each move, unless the player's main time ran out before they completed their move. For example, if the time control is "G/90;inc30" (90 minutes of main time per player, with a 30-second increment each move), each player gets an additional 30 seconds added to their main time after each move, unless the player's main time ran out first.

Under FIDE and US Chess rules, each player gets the increment for the first move as well. For example, with "G/3;inc2", each player starts with three minutes and two seconds on the first move. Not all digital chess clocks automatically give the increment for the first move; for those that don't, the increment time has to be added manually.

### Simple delay

In the simple delay (also known as the US delay), the clock waits for a fixed delay period during each move before the player's main time starts counting down. For example, if the delay is ten seconds, the clock waits for ten seconds each move before the main time starts counting down.

### Bronstein Delay

The Bronstein delay (named after David Bronstein, its inventor), like increment, adds a fixed amount of time after each move, but no more than the amount of time spent to make the move. For example, if the delay is ten seconds and a player uses ten or more seconds for a move, ten seconds are added after they complete their move. If the player uses five seconds, only those five seconds are returned to the clock. This ensures that the main time left on the clock can never increase even if a player makes fast moves. As with increment, under FIDE and US Chess rules, the delay time is applied to the first move.

The Simple and Bronstein delays are mathematically equivalent. The advantage of the Bronstein delay is that the player can easily see how much time is remaining without mentally adding the delay to the main clock. The advantage of the simple delay is that the player can always tell whether the delay time or the main time is counting down. The simple delay is the form of delay most often used in the United States, while the Bronstein delay is more often used in most other countries.

## License

Distributed under the MIT License. See `LICENSE` for more information.
