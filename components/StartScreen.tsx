
import React from 'react';
// Removed UI_BACKGROUND_NEUTRAL, UI_STROKE_PRIMARY, UI_STROKE_SECONDARY as they are handled by new CSS

interface StartScreenProps {
  onStart: () => void;
  onStartTutorial: () => void;
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
        className="fixed inset-0 flex flex-col items-center justify-center z-50 p-4 text-center start-screen-linefire-theme"
    >
      <h1 
        className="title-linefire"
      >
        Linefire
      </h1>
      <p 
        className="subtitle-linefire"
      >
        A minimalist survival experience.
      </p>
      
      {/* Removed descriptive text and kbd elements */}

      <button
        onClick={handleStart}
        className="btn-linefire" // Using new CSS class
      >
        START
      </button>
      <button
        onClick={handleStartTutorial}
        className="btn-linefire" // Using new CSS class
      >
        TUTORIAL
      </button>

      {/* Removed "A minimalist survival experience." paragraph that was previously at the bottom */}
    </div>
  );
};

export default StartScreen;