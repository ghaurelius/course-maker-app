import React from 'react';
import { useEnrollment } from '../contexts/EnrollmentContext';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

function EnrolledCourses() {
  const { enrolledCourses, loading, unenrollFromCourse } = useEnrollment();
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  if (!currentUser) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h2>Please log in to view your enrolled courses</h2>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h2>Loading your courses...</h2>
      </div>
    );
  }

  const handleContinueCourse = (courseId) => {
    navigate(`/course/${courseId}`);
  };

  const handleUnenroll = async (courseId, courseTitle) => {
    if (window.confirm(`Are you sure you want to unenroll from "${courseTitle}"? Your progress will be lost.`)) {
      const success = await unenrollFromCourse(courseId);
      if (success) {
        alert('Successfully unenrolled from the course.');
      } else {
        alert('Failed to unenroll. Please try again.');
      }
    }
  };

  const getProgressColor = (percentage) => {
    if (percentage === 100) return '#28a745';
    if (percentage >= 50) return '#ffc107';
    return '#17a2b8';
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>📚 My Learning</h1>
      
      {enrolledCourses.length === 0 ? (
        <div style={{ 
          textAlign: 'center', 
          padding: '60px 20px',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          margin: '20px 0'
        }}>
          <h2>No enrolled courses yet</h2>
          <p>Browse our course catalog to start learning!</p>
          <button
            onClick={() => navigate('/public-courses')}
            style={{
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '16px',
              marginTop: '10px'
            }}
          >
            Browse Courses
          </button>
        </div>
      ) : (
        <div>
          <p style={{ marginBottom: '30px', color: '#666' }}>
            You are enrolled in {enrolledCourses.length} course{enrolledCourses.length !== 1 ? 's' : ''}
          </p>
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', 
            gap: '20px' 
          }}>
            {enrolledCourses.map((enrollment) => {
              const course = enrollment.courseDetails;
              const progress = enrollment.progress || {};
              
              if (!course) {
                return (
                  <div key={enrollment.id} style={{
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    padding: '20px',
                    backgroundColor: '#f8f9fa'
                  }}>
                    <p>Course details unavailable</p>
                  </div>
                );
              }
              
              return (
                <div key={enrollment.id} style={{
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  padding: '20px',
                  backgroundColor: 'white',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  transition: 'transform 0.2s',
                  cursor: 'pointer'
                }}>
                  <h3 style={{ margin: '0 0 10px 0', color: '#333' }}>
                    {course.title}
                  </h3>
                  
                  <p style={{ 
                    color: '#666', 
                    fontSize: '14px', 
                    margin: '0 0 15px 0',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}>
                    {course.description}
                  </p>
                  
                  {/* Progress Bar */}
                  <div style={{ marginBottom: '15px' }}>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      marginBottom: '5px'
                    }}>
                      <span style={{ fontSize: '14px', fontWeight: 'bold' }}>Progress</span>
                      <span style={{ 
                        fontSize: '14px', 
                        color: getProgressColor(progress.completionPercentage || 0)
                      }}>
                        {progress.completionPercentage || 0}%
                      </span>
                    </div>
                    <div style={{
                      width: '100%',
                      height: '8px',
                      backgroundColor: '#e9ecef',
                      borderRadius: '4px',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        width: `${progress.completionPercentage || 0}%`,
                        height: '100%',
                        backgroundColor: getProgressColor(progress.completionPercentage || 0),
                        transition: 'width 0.3s ease'
                      }} />
                    </div>
                  </div>
                  
                  {/* Course Info */}
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    fontSize: '12px',
                    color: '#666',
                    marginBottom: '15px'
                  }}>
                    <span>📚 {course.modules?.length || 0} modules</span>
                    <span>⏱️ {course.duration || 'N/A'}</span>
                    <span>📈 {course.difficulty || 'beginner'}</span>
                  </div>
                  
                  {/* Action Buttons */}
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      onClick={() => handleContinueCourse(course.id)}
                      style={{
                        flex: 1,
                        backgroundColor: '#007bff',
                        color: 'white',
                        border: 'none',
                        padding: '10px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: 'bold'
                      }}
                    >
                      {progress.completionPercentage === 100 ? '🎓 Review' : '▶️ Continue'}
                    </button>
                    
                    <button
                      onClick={() => handleUnenroll(course.id, course.title)}
                      style={{
                        backgroundColor: '#dc3545',
                        color: 'white',
                        border: 'none',
                        padding: '10px 15px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '14px'
                      }}
                    >
                      ❌
                    </button>
                  </div>
                  
                  {progress.completionPercentage === 100 && (
                    <div style={{
                      marginTop: '10px',
                      padding: '8px',
                      backgroundColor: '#d4edda',
                      border: '1px solid #c3e6cb',
                      borderRadius: '4px',
                      textAlign: 'center',
                      fontSize: '12px',
                      color: '#155724'
                    }}>
                      🎉 Course Completed! Certificate Available
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default EnrolledCourses;