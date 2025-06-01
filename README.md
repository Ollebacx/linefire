# LineFire

A wave-based survival game built with React where you control a champion and fight against waves of enemies while collecting allies and upgrading your abilities.

## Technologies Used

- **React 19**: Frontend framework
- **TypeScript**: Type-safe development
- **Vite**: Build tool and development server
- **HeroIcons**: UI icons
- **Web Audio API**: Background music and sound effects

## Features

- 🎮 Wave-based combat system
- 🦸‍♂️ Multiple champion choices with unique abilities
- 🤝 Collectible allies that fight alongside you
- ⚡ Upgrade system between waves
- 🎯 Dynamic HUD with enemy indicators
- 📱 Responsive design with touch controls for mobile devices
- 🎵 Dynamic audio system with background music and ambient sounds
- 🎓 Interactive tutorial mode
- 🌊 Visual effects including parallax backgrounds

## Getting Started

1. Clone the repository
```bash
git clone https://github.com/yourusername/linefire.git
cd linefire
```

2. Install dependencies
```bash
npm install
```

3. Run the development server
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:5173`

## Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## Code Architecture

The project follows a component-based architecture with several key elements:

- `App.tsx`: Main game container managing game state and screens
- `components/`: UI and game object components
  - Game screens (Start, Champion Select, Game Over)
  - HUD and game interface elements
  - Visual effects components
- `hooks/`: Custom React hooks
  - `useGameLogic`: Core game logic and state management
- `utils/`: Helper functions
- `types.ts`: TypeScript type definitions
- `constants.ts`: Game configuration and constants

## Key Technical Decisions

1. **State Management**: Uses React's built-in state management with custom hooks for game logic, avoiding unnecessary external state libraries.

2. **Game Loop**: Implements a custom game loop using React's useEffect and requestAnimationFrame for smooth animations and game updates.

3. **Responsive Design**: Dynamically adjusts game area based on viewport size while maintaining playability across devices.

4. **Touch Controls**: Implements custom joystick controls for mobile devices while maintaining keyboard support for desktop.

5. **Audio System**: Uses Web Audio API for background music and sound effects with proper handling of audio contexts and user interaction requirements.

6. **Component Architecture**: Separates concerns between game logic (hooks), visual representation (components), and shared utilities.

## Contributing

Feel free to open issues and pull requests for any improvements you'd like to suggest.

## License

This project is open source and available under the MIT license.
