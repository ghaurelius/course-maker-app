import React from 'react';
import { confirmDialog } from '../ui/confirmDialog';

// Temporary VersionsPanel component to satisfy webpack compilation
// This fixes the phantom compilation error

interface VersionsPanelProps {
  versions?: any[];
}

const VersionsPanel: React.FC<VersionsPanelProps> = ({ versions = [] }) => {
  
  const handleRevert = async (versionId: string) => {
    // Use confirmDialog instead of window.confirm to fix ESLint error
    const confirmed = await confirmDialog("Revert to this version?");
    if (!confirmed) return;
    
    // TODO: Implement version revert logic
    console.log('Reverting to version:', versionId);
  };

  return (
    <div className="versions-panel">
      <h3>Version History</h3>
      {versions.length === 0 ? (
        <p>No versions available</p>
      ) : (
        <ul>
          {versions.map((version, index) => (
            <li key={index}>
              <span>Version {index + 1}</span>
              <button onClick={() => handleRevert(version.id)}>
                Revert
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default VersionsPanel;
