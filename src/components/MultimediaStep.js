import React from 'react';

const MultimediaStep = ({ 
  multimediaPrefs, 
  setMultimediaPrefs, 
  onNext, 
  onBack 
}) => {
  return (
    <div style={{ backgroundColor: "#f8f9fa", padding: "30px", borderRadius: "12px" }}>
      <h2 style={{ color: "#2c3e50", marginBottom: "20px" }}>🎬 Step 3: Multimedia Content Preferences</h2>
      
      <div style={{ display: "grid", gap: "20px" }}>
        <div style={{ backgroundColor: "white", padding: "20px", borderRadius: "8px" }}>
          <label style={{ display: "flex", alignItems: "center", marginBottom: "15px" }}>
            <input
              type="checkbox"
              checked={multimediaPrefs.includeAudio}
              onChange={(e) => setMultimediaPrefs(prev => ({ ...prev, includeAudio: e.target.checked }))}
              style={{ marginRight: "10px" }}
            />
            <span style={{ fontWeight: "bold" }}>🎵 Include Audio Content</span>
          </label>
          
          {multimediaPrefs.includeAudio && (
            <div style={{ marginLeft: "25px" }}>
              <label style={{ display: "block", marginBottom: "5px" }}>Voice Style:</label>
              <select
                value={multimediaPrefs.voiceStyle}
                onChange={(e) => setMultimediaPrefs(prev => ({ ...prev, voiceStyle: e.target.value }))}
                style={{ padding: "8px", borderRadius: "4px", border: "1px solid #ddd" }}
              >
                <option value="professional">Professional</option>
                <option value="conversational">Conversational</option>
                <option value="energetic">Energetic</option>
              </select>
            </div>
          )}
        </div>
        
        <div style={{ backgroundColor: "white", padding: "20px", borderRadius: "8px" }}>
          <label style={{ display: "flex", alignItems: "center", marginBottom: "15px" }}>
            <input
              type="checkbox"
              checked={multimediaPrefs.includeVideo}
              onChange={(e) => setMultimediaPrefs(prev => ({ ...prev, includeVideo: e.target.checked }))}
              style={{ marginRight: "10px" }}
            />
            <span style={{ fontWeight: "bold" }}>🎥 Include Video Content</span>
          </label>
          
          {multimediaPrefs.includeVideo && (
            <div style={{ marginLeft: "25px" }}>
              <label style={{ display: "block", marginBottom: "5px" }}>Video Format:</label>
              <select
                value={multimediaPrefs.videoFormat}
                onChange={(e) => setMultimediaPrefs(prev => ({ ...prev, videoFormat: e.target.value }))}
                style={{ padding: "8px", borderRadius: "4px", border: "1px solid #ddd" }}
              >
                <option value="presentation">Presentation Style</option>
                <option value="screencast">Screen Recording</option>
                <option value="talking-head">Talking Head</option>
              </select>
            </div>
          )}
        </div>

        <div style={{ backgroundColor: "white", padding: "20px", borderRadius: "8px" }}>
          <h4 style={{ marginBottom: "15px" }}>📋 Content Enhancement Options</h4>
          <div style={{ display: "grid", gap: "10px" }}>
            <label style={{ display: "flex", alignItems: "center" }}>
              <input
                type="checkbox"
                checked={multimediaPrefs.includeQuizzes || false}
                onChange={(e) => setMultimediaPrefs(prev => ({ ...prev, includeQuizzes: e.target.checked }))}
                style={{ marginRight: "10px" }}
              />
              <span>📝 Interactive Quizzes</span>
            </label>
            
            <label style={{ display: "flex", alignItems: "center" }}>
              <input
                type="checkbox"
                checked={multimediaPrefs.includeExercises || false}
                onChange={(e) => setMultimediaPrefs(prev => ({ ...prev, includeExercises: e.target.checked }))}
                style={{ marginRight: "10px" }}
              />
              <span>💪 Hands-on Exercises</span>
            </label>
            
            <label style={{ display: "flex", alignItems: "center" }}>
              <input
                type="checkbox"
                checked={multimediaPrefs.includeResources || false}
                onChange={(e) => setMultimediaPrefs(prev => ({ ...prev, includeResources: e.target.checked }))}
                style={{ marginRight: "10px" }}
              />
              <span>📚 Additional Resources</span>
            </label>
          </div>
        </div>
      </div>
      
      <div style={{ marginTop: "20px", display: "flex", gap: "10px" }}>
        <button
          onClick={onBack}
          style={{
            padding: "12px 24px",
            backgroundColor: "#95a5a6",
            color: "white",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer"
          }}
        >
          ← Back
        </button>
        <button
          onClick={onNext}
          style={{
            padding: "12px 24px",
            backgroundColor: "#3498db",
            color: "white",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer"
          }}
        >
          Next: Generate Course →
        </button>
      </div>
    </div>
  );
};

export default MultimediaStep;
