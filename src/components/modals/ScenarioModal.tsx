import React from 'react';
import { CustomScenarioModal } from './CustomScenarioModal.js';
import { Scenario } from '../../types/index.js';

interface ScenarioModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentScenario?: Scenario;
  onSelectScenario?: (scenario: Scenario) => void;
  onScenarioGenerated?: (scenario: Scenario) => void;
  // Deprecated list prop retained for interface compatibility
  scenarios?: Scenario[];
  selectedScenarioId?: string;
}

export const ScenarioModal: React.FC<ScenarioModalProps> = ({
  isOpen,
  onClose,
  currentScenario,
  onSelectScenario,
  onScenarioGenerated,
}) => {
  return (
    <CustomScenarioModal
      isOpen={isOpen}
      onClose={onClose}
      currentScenario={currentScenario}
      onScenarioGenerated={(scenario) => {
        onScenarioGenerated?.(scenario);
        onSelectScenario?.(scenario);
      }}
    />
  );
};

export { CustomScenarioModal };
