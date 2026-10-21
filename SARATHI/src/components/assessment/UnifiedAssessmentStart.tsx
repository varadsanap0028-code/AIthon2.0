import React, { useState } from 'react';
import type { AssessmentMode } from '../../types/assessmentV2';
import { AssessmentIntroCard } from './start/AssessmentIntroCard';
import { AssessmentPolicyCards } from './start/AssessmentPolicyCards';
import { AssessmentAccommodations } from './start/AssessmentAccommodations';
import { AssessmentStartFooter } from './start/AssessmentStartFooter';

export interface UnifiedAssessmentStartProps {
  selectedMode: AssessmentMode;
  onSelectMode: (mode: AssessmentMode) => void;
  domainTitle: string;
  roleTitle: string;
  onContinue: (accommodation?: {
    extendedTimeMultiplier: number;
    disabledRestrictions: boolean;
    screenReaderMode: boolean;
  }) => void;
}

export const UnifiedAssessmentStart: React.FC<UnifiedAssessmentStartProps> = ({
  selectedMode,
  onSelectMode,
  domainTitle,
  roleTitle,
  onContinue,
}) => {
  const [extendedTime, setExtendedTime] = useState(false);
  const [screenReaderMode, setScreenReaderMode] = useState(false);
  const [showAccommodations, setShowAccommodations] = useState(false);

  const durationMinutes = extendedTime ? 68 : 45;

  const handleStart = () => {
    onContinue({
      extendedTimeMultiplier: extendedTime ? 1.5 : 1.0,
      disabledRestrictions: screenReaderMode || extendedTime,
      screenReaderMode,
    });
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6">
      {/* 1. Assessment Overview & Header */}
      <AssessmentIntroCard
        domainTitle={domainTitle}
        roleTitle={roleTitle}
        durationMinutes={durationMinutes}
      />

      {/* 2. Unified Policy Selection */}
      <AssessmentPolicyCards
        selectedMode={selectedMode}
        onSelectMode={onSelectMode}
      />

      {/* 3. Accessibility & Privacy Accordion */}
      <AssessmentAccommodations
        extendedTime={extendedTime}
        setExtendedTime={setExtendedTime}
        screenReaderMode={screenReaderMode}
        setScreenReaderMode={setScreenReaderMode}
        showAccommodations={showAccommodations}
        setShowAccommodations={setShowAccommodations}
      />

      {/* 4. Action Footer */}
      <AssessmentStartFooter
        selectedMode={selectedMode}
        onStart={handleStart}
      />
    </div>
  );
};
