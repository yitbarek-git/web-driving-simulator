# Open Road Simulator

A browser-based driving game set on a winding mountain highway. Build driving
skills through a 10-level career, collect and deliver passengers, and earn
credits and XP as traffic, weather, and route objectives become more demanding.

## Drive

| Key | Action |
| --- | --- |
| W or Up Arrow | Accelerate |
| S or Down Arrow | Brake or reverse |
| A/D or Left/Right Arrow | Steer |
| Space | Handbrake |
| E | Interact at a passenger stop |
| C | Change camera |
| R | Reset the car |
| Esc | Pause |
| H | Show or hide driving hints |

Career progress and driving settings are saved in this browser. Complete a
level to unlock the next one. Passenger stops require a near-complete stop;
timed routes and collision limits are shown in the mission HUD. Pause to adjust
steering sensitivity or switch between Quality and Performance graphics.

The simulator includes procedural engine, tire, braking, wind, collision, and
interaction sounds. Use the speaker control in the driving HUD to mute or
restore audio.

## Run locally

You'll need [Node.js](https://nodejs.org/). From the project folder, install
the dependencies and start the development server:

```bash
npm install
npm run dev
```

Open the local address printed in the terminal.

## About

Made by [Yitbarek K.](https://github.com/yitbarek-git). The simulator uses
React, Three.js, and React Three Fiber.
