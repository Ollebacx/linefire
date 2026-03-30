
import React from 'react';
import { UI_BACKGROUND_NEUTRAL, UI_STROKE_PRIMARY, UI_STROKE_SECONDARY } from '../constants';

interface TutorialOverlayProps {
  currentMessageHTML: string;
  onNextStep: () => void;
  onEndTutorial: () => void;
  isLastStep: boolean;
}

const TutorialOverlay: React.FC<TutorialOverlayProps> = ({ currentMessageHTML, onNextStep, onEndTutorial, isLastStep }) => {
  return (
    <div
      className="absolute bottom-0 left-0 right-0 p-3 sm:p-4 z-[1000]"
      style={{
        backgroundColor: `${UI_BACKGROUND_NEUTRAL}E6`, 
        borderTop: `1.5px solid ${UI_STROKE_SECONDARY}`,
        color: UI_STROKE_PRIMARY,
        fontFamily: "'Inter', sans-serif", // Ensure Inter font for the overlay
      }}
      role="dialog"
      aria-live="polite"
      aria-describedby="tutorial-message"
    >
      <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-4">
        <p 
            id="tutorial-message" 
            className="text-sm sm:text-base text-center sm:text-left flex-grow"
            style={{ fontWeight: '300' }} // Light weight for tutorial text
            dangerouslySetInnerHTML={{ __html: currentMessageHTML }}
        />
        <div className="flex-shrink-0 flex space-x-2 w-full sm:w-auto">
          {!isLastStep && (
            <button
              onClick={onEndTutorial}
              className="btn-tutorial-secondary py-1.5 px-3 text-sm sm:text-base flex-1 sm:flex-initial"
              aria-label="Return to Menu"
            >
              Return to Menu
            </button>
          )}
          <button
            onClick={onNextStep}
            className="btn-primary-minimal py-1.5 px-3 text-sm sm:text-base flex-1 sm:flex-initial"
            aria-label={isLastStep ? "Finish Tutorial" : "Next Step"}
          >
            {isLastStep ? "Finish" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TutorialOverlay;