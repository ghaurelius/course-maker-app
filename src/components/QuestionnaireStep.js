import React from 'react';

const QuestionnaireStep = ({ 
  questionAnswers, 
  handleQuestionChange, 
  handleCustomModuleNameChange,
  onNext, 
  onBack 
}) => {
  return (
    <div style={{ backgroundColor: "#f8f9fa", padding: "30px", borderRadius: "12px" }}>
      <h2 style={{ color: "#2c3e50", marginBottom: "20px" }}>🤖 Step 2: AI Questionnaire</h2>
      
      <div style={{ display: "grid", gap: "20px" }}>
        <div style={{ backgroundColor: "white", padding: "20px", borderRadius: "8px" }}>
          <label style={{ display: "block", marginBottom: "10px", fontWeight: "bold" }}>📚 Number of Course Modules:</label>
          <select
            value={questionAnswers.moduleCount}
            onChange={(e) => handleQuestionChange('moduleCount', parseInt(e.target.value))}
            style={{ padding: "10px", borderRadius: "4px", border: "1px solid #ddd", width: "100%" }}
          >
            <option value={2}>2 Modules - Quick & Focused</option>
            <option value={3}>3 Modules - Balanced Structure</option>
            <option value={4}>4 Modules - Comprehensive</option>
            <option value={5}>5 Modules - In-depth Coverage</option>
            <option value={6}>6+ Modules - Extensive Course</option>
          </select>
          <p style={{ fontSize: "12px", color: "#666", marginTop: "5px" }}>
            More modules allow better pacing and digestible learning chunks
          </p>
        </div>
        
        <div style={{ backgroundColor: "white", padding: "20px", borderRadius: "8px" }}>
          <label style={{ display: "block", marginBottom: "10px", fontWeight: "bold" }}>🏷️ Module Naming Preference:</label>
          <select
            value={questionAnswers.moduleNaming}
            onChange={(e) => handleQuestionChange('moduleNaming', e.target.value)}
            style={{ padding: "10px", borderRadius: "4px", border: "1px solid #ddd", width: "100%" }}
          >
            <option value="ai-generated">Let AI suggest module names</option>
            <option value="custom">I'll provide custom module names</option>
            <option value="collaborative">AI suggests, I can modify</option>
          </select>
          
          {questionAnswers.moduleNaming === 'custom' && (
            <div style={{ marginTop: "15px" }}>
              <p style={{ marginBottom: "10px", fontWeight: "bold" }}>Enter your module names:</p>
              {Array.from({ length: questionAnswers.moduleCount }, (_, i) => (
                <input
                  key={i}
                  type="text"
                  placeholder={`Module ${i + 1} name`}
                  value={questionAnswers.customModuleNames[i] || ''}
                  onChange={(e) => handleCustomModuleNameChange(i, e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px",
                    margin: "5px 0",
                    borderRadius: "4px",
                    border: "1px solid #ddd"
                  }}
                />
              ))}
            </div>
          )}
        </div>
        
        <div style={{ backgroundColor: "white", padding: "20px", borderRadius: "8px" }}>
          <label style={{ display: "block", marginBottom: "10px", fontWeight: "bold" }}>Preferred Course Length:</label>
          <select
            value={questionAnswers.courseLength}
            onChange={(e) => handleQuestionChange('courseLength', e.target.value)}
            style={{ padding: "10px", borderRadius: "4px", border: "1px solid #ddd", width: "100%" }}
          >
            <option value="short">Short (1-2 hours)</option>
            <option value="medium">Medium (3-5 hours)</option>
            <option value="long">Long (6+ hours)</option>
          </select>
        </div>
        
        <div style={{ backgroundColor: "white", padding: "20px", borderRadius: "8px" }}>
          <label style={{ display: "block", marginBottom: "10px", fontWeight: "bold" }}>Learning Style Focus:</label>
          <select
            value={questionAnswers.learningStyle}
            onChange={(e) => handleQuestionChange('learningStyle', e.target.value)}
            style={{ padding: "10px", borderRadius: "4px", border: "1px solid #ddd", width: "100%" }}
          >
            <option value="visual">Visual (diagrams, charts)</option>
            <option value="auditory">Auditory (explanations, discussions)</option>
            <option value="kinesthetic">Kinesthetic (hands-on, practical)</option>
            <option value="mixed">Mixed approach</option>
          </select>
        </div>

        <div style={{ backgroundColor: "white", padding: "20px", borderRadius: "8px" }}>
          <label style={{ display: "block", marginBottom: "10px", fontWeight: "bold" }}>Interactivity Level:</label>
          <select
            value={questionAnswers.interactivityLevel}
            onChange={(e) => handleQuestionChange('interactivityLevel', e.target.value)}
            style={{ padding: "10px", borderRadius: "4px", border: "1px solid #ddd", width: "100%" }}
          >
            <option value="low">Low - Mostly reading and watching</option>
            <option value="medium">Medium - Some exercises and quizzes</option>
            <option value="high">High - Lots of hands-on activities</option>
          </select>
        </div>

        <div style={{ backgroundColor: "white", padding: "20px", borderRadius: "8px" }}>
          <label style={{ display: "block", marginBottom: "10px", fontWeight: "bold" }}>Assessment Type:</label>
          <select
            value={questionAnswers.assessmentType}
            onChange={(e) => handleQuestionChange('assessmentType', e.target.value)}
            style={{ padding: "10px", borderRadius: "4px", border: "1px solid #ddd", width: "100%" }}
          >
            <option value="quizzes">Quizzes only</option>
            <option value="projects">Projects only</option>
            <option value="mixed">Mixed (quizzes + projects)</option>
            <option value="none">No formal assessments</option>
          </select>
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
          Next: Multimedia Options →
        </button>
      </div>
    </div>
  );
};

export default QuestionnaireStep;
