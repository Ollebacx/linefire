import React from 'react';
import { UI_STROKE_PRIMARY, UI_STROKE_SECONDARY } from '../constants';
// BackgroundAnimation is now rendered by App.tsx at a lower z-index

interface StartScreenProps {
  onStart: () => void;
  onStartTutorial: () => void;
  // width and height props removed
}

const StartScreen: React.FC<StartScreenProps> = ({ onStart, onStartTutorial }) => {
  const handleStart = () => {
    onStart();
  };

  const handleStartTutorial = () => {
    onStartTutorial();
  };

  return (
    <div 
        className="w-full h-full flex flex-col items-center justify-center z-10 p-4 text-center" 
        style={{ 
            position: 'relative', // Ensures z-index applies correctly within gameAreaRef
            backgroundColor: 'transparent' // Allows App-level BackgroundAnimation to show through
        }} 
    >
      {/* Content is centered by the flex properties */}
      <h1 
        className="text-5xl sm:text-7xl lg:text-8xl mb-2 sm:mb-3 uppercase"
        style={{
            fontFamily: "'Inter', sans-serif",
            fontWeight: '100', 
            color: UI_STROKE_PRIMARY, 
            letterSpacing: '0.05em',
        }}
      >
        Linefire
      </h1>
      <p 
        className="text-md sm:text-lg mb-8 sm:mb-10"
        style={{
            fontFamily: "'Inter', sans-serif",
            fontWeight: '300', 
            color: UI_STROKE_SECONDARY, 
            letterSpacing: '0.025em',
            opacity: 0.9,
        }}
      >
        A minimalist survival experience.
      </p>
      
      <button
        onClick={handleStart}
        className="btn-minimal mb-3 sm:mb-4 py-2.5 px-8 text-md sm:text-lg w-full max-w-xs sm:max-w-sm"
      >
        START
      </button>
      <button
        onClick={handleStartTutorial}
        className="btn-minimal py-2.5 px-8 text-md sm:text-lg w-full max-w-xs sm:max-w-sm"
      >
        TUTORIAL
      </button>
    </div>
  );
};

export default StartScreen;
