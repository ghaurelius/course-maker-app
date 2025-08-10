import React from 'react';

const GenerationStep = ({ 
  isGenerating, 
  questionAnswers, 
  multimediaPrefs, 
  onGenerate, 
  onBack 
}) => {
  return (
    <div style={{ backgroundColor: "#f8f9fa", padding: "30px", borderRadius: "12px", textAlign: "center" }}>
      <h2 style={{ color: "#2c3e50", marginBottom: "20px" }}>⚡ Step 4: AI Course Generation</h2>
      
      {!isGenerating ? (
        <div>
          <p style={{ marginBottom: "20px", fontSize: "16px" }}>
            Ready to generate your course with AI! This will create:
          </p>
          <ul style={{ textAlign: "left", maxWidth: "400px", margin: "0 auto 20px" }}>
            <li>{questionAnswers.moduleCount} modules with custom structure</li>
            <li>Comprehensive lesson content</li>
            <li>Interactive elements and assessments</li>
            {multimediaPrefs.includeAudio && <li>Audio narration</li>}
            {multimediaPrefs.includeVideo && <li>Video content</li>}
            {multimediaPrefs.includeQuizzes && <li>Interactive quizzes</li>}
            {multimediaPrefs.includeExercises && <li>Hands-on exercises</li>}
            {multimediaPrefs.includeResources && <li>Additional resources</li>}
          </ul>
          
          <button
            onClick={onGenerate}
            style={{
              padding: "15px 30px",
              backgroundColor: "#27ae60",
              color: "white",
              border: "none",
              borderRadius: "8px",
              fontSize: "16px",
              cursor: "pointer"
            }}
          >
            🚀 Generate My Course
          </button>
        </div>
      ) : (
        <div>
          <div style={{ marginBottom: "20px" }}>
            <div style={{
              width: "50px",
              height: "50px",
              border: "5px solid #f3f3f3",
              borderTop: "5px solid #3498db",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
              margin: "0 auto 20px"
            }}></div>
          </div>
          <h3>🤖 AI is generating your course...</h3>
          <p>This may take a few moments. Please wait.</p>
          
          <div style={{ marginTop: "20px", fontSize: "14px", color: "#666" }}>
            <p>✨ Analyzing your content...</p>
            <p>🏗️ Building course structure...</p>
            <p>📝 Creating lessons and activities...</p>
            <p>🎯 Optimizing for your preferences...</p>
          </div>
        </div>
      )}
      
      <div style={{ marginTop: "20px" }}>
        <button
          onClick={onBack}
          disabled={isGenerating}
          style={{
            padding: "12px 24px",
            backgroundColor: isGenerating ? "#bdc3c7" : "#95a5a6",
            color: "white",
            border: "none",
            borderRadius: "6px",
            cursor: isGenerating ? "not-allowed" : "pointer"
          }}
        >
          ← Back
        </button>
      </div>

      {/* Add CSS for spinner animation */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default GenerationStep;
