import React, { useState } from 'react';
import VideoUpload from './VideoUpload';

// Simple markdown to HTML converter for lesson content
const renderMarkdown = (markdown) => {
  if (!markdown) return '';
  
  return markdown
    // Convert headers
    .replace(/^### (.*$)/gm, '<h3 style="margin: 15px 0 10px 0; color: #333; font-size: 16px;">$1</h3>')
    .replace(/^## (.*$)/gm, '<h2 style="margin: 20px 0 15px 0; color: #333; font-size: 18px;">$1</h2>')
    .replace(/^# (.*$)/gm, '<h1 style="margin: 25px 0 20px 0; color: #333; font-size: 20px;">$1</h1>')
    // Convert bullet points
    .replace(/^- (.*$)/gm, '<li style="margin: 5px 0;">$1</li>')
    // Wrap consecutive list items in ul tags
    .replace(/(<li.*<\/li>\s*)+/g, '<ul style="margin: 10px 0; padding-left: 20px;">$&</ul>')
    // Convert line breaks
    .replace(/\n\n/g, '<br><br>')
    .replace(/\n/g, '<br>');
};

const CoursePreview = ({ 
  generatedCourse, 
  editingContent, 
  handleContentEdit, 
  onSave, 
  onBack 
}) => {
  const [courseWithVideos, setCourseWithVideos] = useState(generatedCourse);
  const [viewMode, setViewMode] = useState('highlights'); // 'highlights' or 'full'

  // Handle video upload for lessons during course preview
  const handleVideoUpload = (videoUrl, moduleIndex, lessonIndex) => {
    const updatedCourse = { ...courseWithVideos };
    if (updatedCourse.modules[moduleIndex] && updatedCourse.modules[moduleIndex].lessons[lessonIndex]) {
      updatedCourse.modules[moduleIndex].lessons[lessonIndex].videoUrl = videoUrl;
      setCourseWithVideos(updatedCourse);
    }
  };
  if (!generatedCourse) {
    return (
      <div style={{ backgroundColor: "#f8f9fa", padding: "30px", borderRadius: "12px", textAlign: "center" }}>
        <h2>No course generated yet</h2>
        <p>Please go back and generate a course first.</p>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: "#f8f9fa", padding: "30px", borderRadius: "12px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h2 style={{ color: "#2c3e50", margin: "0" }}>📋 Step 5: Review & Edit Generated Course</h2>
        
        {/* View Mode Toggle */}
        <div style={{ display: "flex", gap: "5px", backgroundColor: "#e9ecef", padding: "3px", borderRadius: "6px" }}>
          <button
            onClick={() => setViewMode('highlights')}
            style={{
              padding: "8px 16px",
              fontSize: "14px",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              backgroundColor: viewMode === 'highlights' ? "#007bff" : "transparent",
              color: viewMode === 'highlights' ? "white" : "#495057",
              fontWeight: viewMode === 'highlights' ? "bold" : "normal"
            }}
          >
            📋 Highlights
          </button>
          <button
            onClick={() => setViewMode('full')}
            style={{
              padding: "8px 16px",
              fontSize: "14px",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              backgroundColor: viewMode === 'full' ? "#007bff" : "transparent",
              color: viewMode === 'full' ? "white" : "#495057",
              fontWeight: viewMode === 'full' ? "bold" : "normal"
            }}
          >
            📖 Full Preview
          </button>
        </div>
      </div>
      
      <div>
        {/* Course Overview */}
        <div style={{ backgroundColor: "white", padding: "20px", borderRadius: "8px", marginBottom: "20px" }}>
          <h3>{generatedCourse.title}</h3>
          <p><strong>Description:</strong> {generatedCourse.description}</p>
          <p><strong>Modules:</strong> {generatedCourse.modules.length}</p>
          
          {/* Show module breakdown with individual durations */}
          <div style={{ marginTop: "15px" }}>
            <h4 style={{ fontSize: "16px", marginBottom: "10px" }}>Module Breakdown:</h4>
            {generatedCourse.modules.map((module, index) => {
              const moduleDuration = module.lessons.reduce((acc, lesson) => acc + (lesson.duration || 0), 0);
              return (
                <div key={module.id} style={{ marginBottom: "8px", fontSize: "14px" }}>
                  <strong>{module.title}:</strong> {module.lessons.length} lessons, {moduleDuration} minutes
                </div>
              );
            })}
            <div style={{ marginTop: "10px", paddingTop: "10px", borderTop: "1px solid #eee", fontWeight: "bold" }}>
              <strong>Total Duration:</strong> {generatedCourse.metadata?.estimatedDuration || 0} minutes ({Math.round((generatedCourse.metadata?.estimatedDuration || 0) / 60)} hours)
            </div>
          </div>
        </div>
        
        {/* Course Content */}
        <div style={{ marginBottom: "20px" }}>
          <h4>Course Content:</h4>
          {generatedCourse.modules.map((module, moduleIndex) => (
            <div key={module.id} style={{ backgroundColor: "white", padding: "15px", borderRadius: "8px", marginBottom: "15px" }}>
              <h5 style={{ color: "#2c3e50" }}>{module.title}</h5>
              <p style={{ fontSize: "14px", color: "#666" }}>{module.description}</p>
              
              {/* Learning Outcomes */}
              {module.learningOutcomes && module.learningOutcomes.length > 0 && (
                <div style={{ marginTop: "10px", marginBottom: "15px" }}>
                  <h6 style={{ fontSize: "14px", fontWeight: "bold", color: "#34495e" }}>Learning Outcomes:</h6>
                  <ul style={{ fontSize: "12px", color: "#666", marginLeft: "20px" }}>
                    {module.learningOutcomes.map((outcome, idx) => (
                      <li key={idx}>{outcome}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {/* Lessons */}
              {module.lessons.map((lesson, lessonIndex) => (
                <div key={lesson.id} style={{ marginLeft: "20px", marginTop: "10px", padding: "10px", backgroundColor: "#f8f9fa", borderRadius: "4px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                    <h6>{lesson.title}</h6>
                    {lesson.duration && (
                      <span style={{ fontSize: "12px", color: "#666", backgroundColor: "#e9ecef", padding: "2px 8px", borderRadius: "12px" }}>
                        {lesson.duration} min
                      </span>
                    )}
                  </div>
                  
                  {/* Show learning objectives in highlights mode */}
                  {viewMode === 'highlights' && lesson.learningObjectives && lesson.learningObjectives.length > 0 && (
                    <div style={{ marginBottom: "10px" }}>
                      <div style={{ fontSize: "12px", fontWeight: "bold", color: "#495057", marginBottom: "5px" }}>Key Learning Objectives:</div>
                      <ul style={{ fontSize: "11px", color: "#666", marginLeft: "15px", marginBottom: "0" }}>
                        {lesson.learningObjectives.slice(0, 3).map((objective, idx) => (
                          <li key={idx}>{objective}</li>
                        ))}
                        {lesson.learningObjectives.length > 3 && (
                          <li style={{ fontStyle: "italic", color: "#999" }}>+ {lesson.learningObjectives.length - 3} more objectives</li>
                        )}
                      </ul>
                    </div>
                  )}
                  
                  {/* Highlights mode: Show summary instead of full content */}
                  {viewMode === 'highlights' ? (
                    <div style={{
                      padding: "12px",
                      backgroundColor: "#fff",
                      border: "1px solid #e9ecef",
                      borderRadius: "4px",
                      fontSize: "12px",
                      color: "#495057"
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                        <span style={{ fontWeight: "bold", color: "#007bff" }}>📋 Lesson Summary</span>
                        {lesson.multimedia?.hasVideo && <span style={{ fontSize: "10px", backgroundColor: "#e3f2fd", color: "#1976d2", padding: "2px 6px", borderRadius: "10px" }}>📹 Video</span>}
                        {lesson.multimedia?.hasAudio && <span style={{ fontSize: "10px", backgroundColor: "#f3e5f5", color: "#7b1fa2", padding: "2px 6px", borderRadius: "10px" }}>🎵 Audio</span>}
                      </div>
                      <div style={{ fontSize: "11px", color: "#666" }}>
                        This lesson covers key concepts and practical applications. 
                        {lesson.type && <span> Content type: <strong>{lesson.type}</strong>.</span>}
                        {lesson.assessmentType && <span> Includes <strong>{lesson.assessmentType}</strong> assessment.</span>}
                      </div>
                      <div style={{ marginTop: "8px", fontSize: "10px", color: "#999", fontStyle: "italic" }}>
                        Switch to "Full Preview" to see complete lesson content and editing options.
                      </div>
                    </div>
                  ) : (
                    /* Full mode: Show complete lesson content */
                    <>
                      {/* Rendered lesson content */}
                      <div
                        style={{
                          width: "100%",
                          minHeight: "150px",
                          padding: "15px",
                          borderRadius: "4px",
                          border: "1px solid #ddd",
                          fontSize: "13px",
                          fontFamily: "Arial, sans-serif",
                          backgroundColor: "#fff",
                          lineHeight: "1.6"
                        }}
                        dangerouslySetInnerHTML={{
                          __html: renderMarkdown(editingContent[`${moduleIndex}-${lessonIndex}`] || lesson.markdownContent || lesson.content || 'Lesson content will appear here...')
                        }}
                      />
                      
                      {/* Video Upload Section - Only show if course includes video content */}
                      {lesson.multimedia?.hasVideo && (
                        <div style={{ marginTop: "15px" }}>
                          <VideoUpload
                            lessonId={`lesson-${moduleIndex}-${lessonIndex}`}
                            moduleId={`module-${moduleIndex}`}
                            onVideoUploaded={(videoUrl) => handleVideoUpload(videoUrl, moduleIndex, lessonIndex)}
                            existingVideoUrl={courseWithVideos.modules[moduleIndex]?.lessons[lessonIndex]?.videoUrl}
                          />
                        </div>
                      )}
                      
                      {/* Edit button for raw markdown editing */}
                      <button
                        onClick={() => {
                          const rawContent = editingContent[`${moduleIndex}-${lessonIndex}`] || lesson.markdownContent || lesson.content || '';
                          const newContent = prompt('Edit lesson content (Markdown):', rawContent);
                          if (newContent !== null) {
                            handleContentEdit(moduleIndex, lessonIndex, newContent);
                          }
                        }}
                        style={{
                          marginTop: "8px",
                          padding: "4px 8px",
                          fontSize: "11px",
                          backgroundColor: "#007bff",
                          color: "white",
                          border: "none",
                          borderRadius: "3px",
                          cursor: "pointer"
                        }}
                      >
                        Edit Content
                      </button>
                    </>
                  )}
                  
                  {/* Lesson metadata - show in both modes */}
                  {lesson.type && (
                    <div style={{ marginTop: "8px", fontSize: "11px", color: "#666" }}>
                      <strong>Type:</strong> {lesson.type}
                      {lesson.interactivityLevel && <span> | <strong>Interactivity:</strong> {lesson.interactivityLevel}</span>}
                      {lesson.assessmentType && <span> | <strong>Assessment:</strong> {lesson.assessmentType}</span>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Course Metadata */}
        {generatedCourse.metadata && (
          <div style={{ backgroundColor: "white", padding: "15px", borderRadius: "8px", marginBottom: "20px" }}>
            <h4 style={{ fontSize: "16px", marginBottom: "10px" }}>Course Metadata</h4>
            <div style={{ fontSize: "12px", color: "#666" }}>
              <p><strong>Total Lessons:</strong> {generatedCourse.metadata.totalLessons}</p>
              <p><strong>Difficulty:</strong> {generatedCourse.metadata.difficulty}</p>
              <p><strong>Has Multimedia:</strong> {generatedCourse.metadata.hasMultimedia ? 'Yes' : 'No'}</p>
              <p><strong>AI Provider:</strong> {generatedCourse.metadata.aiProvider}</p>
              <p><strong>Generated:</strong> {new Date(generatedCourse.metadata.generatedAt).toLocaleString()}</p>
              {generatedCourse.metadata.sourceContentUsed && (
                <p><strong>Source Content Used:</strong> Yes</p>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
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
            ← Back to Generation
          </button>
          
          <button
            onClick={() => onSave(courseWithVideos)}
            style={{
              padding: "12px 24px",
              backgroundColor: "#27ae60",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer"
            }}
          >
            💾 Save Course
          </button>
          
          <button
            onClick={() => window.print()}
            style={{
              padding: "12px 24px",
              backgroundColor: "#3498db",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer"
            }}
          >
            🖨️ Print/Export
          </button>
        </div>
      </div>
    </div>
  );
};

export default CoursePreview;
