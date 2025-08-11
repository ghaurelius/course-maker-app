import React, { useState } from 'react';

const TableOfContents = ({ 
  course, 
  currentModuleIndex = 0, 
  currentLessonIndex = 0, 
  onNavigate,
  showVideoLinks = true 
}) => {
  const [expandedModules, setExpandedModules] = useState(new Set([currentModuleIndex]));

  const toggleModule = (moduleIndex) => {
    const newExpanded = new Set(expandedModules);
    if (newExpanded.has(moduleIndex)) {
      newExpanded.delete(moduleIndex);
    } else {
      newExpanded.add(moduleIndex);
    }
    setExpandedModules(newExpanded);
  };

  const handleNavigation = (moduleIndex, lessonIndex = null) => {
    if (onNavigate) {
      onNavigate(moduleIndex, lessonIndex);
    }
  };

  if (!course || !course.modules) {
    return (
      <div style={{
        padding: '20px',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px',
        textAlign: 'center',
        color: '#666'
      }}>
        No course content available
      </div>
    );
  }

  return (
    <div style={{
      backgroundColor: '#fff',
      border: '1px solid #e9ecef',
      borderRadius: '8px',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        backgroundColor: '#2c3e50',
        color: 'white',
        padding: '16px',
        fontSize: '18px',
        fontWeight: 'bold'
      }}>
        📚 Table of Contents
      </div>

      {/* Course Title */}
      <div style={{
        padding: '16px',
        borderBottom: '1px solid #e9ecef',
        backgroundColor: '#f8f9fa'
      }}>
        <h3 style={{
          margin: 0,
          color: '#2c3e50',
          fontSize: '16px'
        }}>
          {course.title}
        </h3>
        <p style={{
          margin: '4px 0 0 0',
          fontSize: '14px',
          color: '#666'
        }}>
          {course.modules.length} modules • {course.modules.reduce((total, module) => total + (module.lessons?.length || 0), 0)} lessons
        </p>
      </div>

      {/* Modules List */}
      <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
        {course.modules.map((module, moduleIndex) => (
          <div key={moduleIndex} style={{ borderBottom: '1px solid #f1f3f4' }}>
            {/* Module Header */}
            <div
              onClick={() => toggleModule(moduleIndex)}
              style={{
                padding: '12px 16px',
                backgroundColor: currentModuleIndex === moduleIndex ? '#e3f2fd' : '#fff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderLeft: currentModuleIndex === moduleIndex ? '4px solid #2196f3' : '4px solid transparent',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                if (currentModuleIndex !== moduleIndex) {
                  e.target.style.backgroundColor = '#f8f9fa';
                }
              }}
              onMouseLeave={(e) => {
                if (currentModuleIndex !== moduleIndex) {
                  e.target.style.backgroundColor = '#fff';
                }
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12px' }}>
                  {expandedModules.has(moduleIndex) ? '📂' : '📁'}
                </span>
                <span style={{
                  fontWeight: currentModuleIndex === moduleIndex ? 'bold' : 'normal',
                  color: currentModuleIndex === moduleIndex ? '#1976d2' : '#2c3e50',
                  fontSize: '14px'
                }}>
                  Module {moduleIndex + 1}: {module.title}
                </span>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {/* Video indicator for module */}
                {showVideoLinks && module.videoUrl && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(module.videoUrl, '_blank');
                    }}
                    style={{
                      padding: '4px 8px',
                      backgroundColor: '#e74c3c',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '10px',
                      cursor: 'pointer'
                    }}
                    title="Watch module video"
                  >
                    🎥 Video
                  </button>
                )}
                
                <span style={{ fontSize: '12px', color: '#666' }}>
                  {module.lessons?.length || 0} lessons
                </span>
                
                <span style={{ fontSize: '12px', color: '#999' }}>
                  {expandedModules.has(moduleIndex) ? '▼' : '▶'}
                </span>
              </div>
            </div>

            {/* Lessons List */}
            {expandedModules.has(moduleIndex) && module.lessons && (
              <div style={{ backgroundColor: '#fafafa' }}>
                {module.lessons.map((lesson, lessonIndex) => (
                  <div
                    key={lessonIndex}
                    onClick={() => handleNavigation(moduleIndex, lessonIndex)}
                    style={{
                      padding: '8px 16px 8px 40px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      backgroundColor: (currentModuleIndex === moduleIndex && currentLessonIndex === lessonIndex) 
                        ? '#fff3e0' : 'transparent',
                      borderLeft: (currentModuleIndex === moduleIndex && currentLessonIndex === lessonIndex)
                        ? '3px solid #ff9800' : '3px solid transparent',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      if (!(currentModuleIndex === moduleIndex && currentLessonIndex === lessonIndex)) {
                        e.target.style.backgroundColor = '#f5f5f5';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!(currentModuleIndex === moduleIndex && currentLessonIndex === lessonIndex)) {
                        e.target.style.backgroundColor = 'transparent';
                      }
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '12px' }}>📄</span>
                      <span style={{
                        fontSize: '13px',
                        color: (currentModuleIndex === moduleIndex && currentLessonIndex === lessonIndex) 
                          ? '#f57c00' : '#555',
                        fontWeight: (currentModuleIndex === moduleIndex && currentLessonIndex === lessonIndex)
                          ? 'bold' : 'normal'
                      }}>
                        {lesson.title}
                      </span>
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {/* Video indicator for lesson */}
                      {showVideoLinks && lesson.videoUrl && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(lesson.videoUrl, '_blank');
                          }}
                          style={{
                            padding: '2px 6px',
                            backgroundColor: '#e74c3c',
                            color: 'white',
                            border: 'none',
                            borderRadius: '3px',
                            fontSize: '9px',
                            cursor: 'pointer'
                          }}
                          title="Watch lesson video"
                        >
                          🎥
                        </button>
                      )}
                      
                      {/* Audio indicator */}
                      {lesson.hasAudio && (
                        <span style={{
                          fontSize: '10px',
                          color: '#27ae60',
                          title: 'Audio available'
                        }}>
                          🎵
                        </span>
                      )}
                      
                      <span style={{ fontSize: '11px', color: '#999' }}>
                        {lesson.duration || '5 min'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{
        padding: '12px 16px',
        backgroundColor: '#f8f9fa',
        borderTop: '1px solid #e9ecef',
        fontSize: '12px',
        color: '#666',
        textAlign: 'center'
      }}>
        Click on any module or lesson to navigate • 🎥 indicates video content
      </div>
    </div>
  );
};

export default TableOfContents;
