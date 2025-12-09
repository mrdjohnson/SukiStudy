
import React, { useState } from 'react';
import { Icons } from './Icons';
import { Button } from './ui/Button';

interface Step {
  title: string;
  description: string;
  icon: React.ElementType;
}

interface HowToPlayModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  steps: Step[];
}

export const HowToPlayModal: React.FC<HowToPlayModalProps> = ({ isOpen, onClose, title, steps }) => {
  const [currentStep, setCurrentStep] = useState(0);

  if (!isOpen) return null;

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      onClose();
      setCurrentStep(0);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const StepIcon = steps[currentStep].icon;

  return (
    <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden flex flex-col min-h-[400px]">
        {/* Header */}
        <div className="bg-indigo-600 p-6 text-white flex justify-between items-center">
          <h2 className="text-xl font-bold">How to Play</h2>
          <button onClick={onClose} className="hover:bg-indigo-700 p-1 rounded-full transition-colors">
            <Icons.X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 p-8 flex flex-col items-center justify-center text-center relative">
          
          <div className="bg-indigo-50 p-6 rounded-full mb-6 animate-bounce-slow">
             <StepIcon className="w-16 h-16 text-indigo-600" />
          </div>

          <h3 className="text-2xl font-bold text-gray-900 mb-3">
            {steps[currentStep].title}
          </h3>
          
          <p className="text-gray-600 text-lg leading-relaxed">
            {steps[currentStep].description}
          </p>

          {/* Dots Indicator */}
          <div className="flex gap-2 mt-8">
            {steps.map((_, idx) => (
              <div 
                key={idx} 
                className={`w-2 h-2 rounded-full transition-all duration-300 ${idx === currentStep ? 'bg-indigo-600 w-6' : 'bg-gray-300'}`}
              />
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 flex justify-between items-center bg-gray-50">
           <Button 
             variant="ghost" 
             onClick={handlePrev} 
             disabled={currentStep === 0}
             className={currentStep === 0 ? 'invisible' : ''}
           >
             Back
           </Button>
           <Button onClick={handleNext}>
             {currentStep === steps.length - 1 ? "Let's Play!" : 'Next'}
           </Button>
        </div>
      </div>
    </div>
  );
};
