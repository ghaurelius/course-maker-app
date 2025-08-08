import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';

function StudentManagement() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  const [course, setCourse] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState(null);

  useEffect(() => {
    const fetchCourseAndStudents = async () => {
      try {
        // Fetch course details
        const courseDoc = await getDoc(doc(db, 'courses', courseId));
        if (courseDoc.exists()) {
          const courseData = { id: courseDoc.id, ...courseDoc.data() };
          
          // Check if current user is the course creator
          if (courseData.createdBy !== currentUser.uid) {
            alert('You are not authorized to manage students for this course.');
            navigate('/my-courses');
            return;
          }
          
          setCourse(courseData);
          
          // Fetch enrolled students
          const enrollmentsQuery = query(
            collection(db, 'enrollments'),
            where('courseId', '==', courseId)
          );
          const enrollmentsSnapshot = await getDocs(enrollmentsQuery);
          
          const studentsData = [];
          for (const enrollmentDoc of enrollmentsSnapshot.docs) {
            const enrollmentData = { id: enrollmentDoc.id, ...enrollmentDoc.data() };
            studentsData.push(enrollmentData);
          }
          
          // Sort by enrollment date (newest first)
          studentsData.sort((a, b) => {
            const aDate = a.enrolledAt?.toDate?.() || new Date(a.enrolledAt || 0);
            const bDate = b.enrolledAt?.toDate?.() || new Date(b.enrolledAt || 0);
            return bDate - aDate;
          });
          
          setStudents(studentsData);
        } else {
          alert('Course not found.');
          navigate('/my-courses');
        }
      } catch (error) {
        console.error('Error fetching course and students:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCourseAndStudents();
  }, [courseId, currentUser, navigate]);

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getProgressColor = (percentage) => {
    if (percentage === 100) return '#28a745';
    if (percentage >= 75) return '#17a2b8';
    if (percentage >= 50) return '#ffc107';
    if (percentage >= 25) return '#fd7e14';
    return '#dc3545';
  };

  const getProgressLabel = (percentage) => {
    if (percentage === 100) return 'Completed';
    if (percentage >= 75) return 'Almost Done';
    if (percentage >= 50) return 'Halfway';
    if (percentage >= 25) return 'Getting Started';
    return 'Just Started';
  };

  const handleStudentClick = (student) => {
    setSelectedStudent(selectedStudent?.id === student.id ? null : student);
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h2>Loading student data...</h2>
      </div>
    );
  }

  if (!course) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h2>Course not found</h2>
        <button onClick={() => navigate('/my-courses')}>
          Back to My Courses
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '30px' }}>
        <button
          onClick={() => navigate('/my-courses')}
          style={{
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            padding: '8px 15px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            marginBottom: '15px'
          }}
        >
          ← Back to My Courses
        </button>
        
        <h1>👥 Student Management</h1>
        <h2 style={{ color: '#666', margin: '10px 0' }}>{course.title}</h2>
        
        <div style={{ 
          display: 'flex', 
          gap: '30px',
          fontSize: '14px',
          color: '#666',
          marginTop: '15px'
        }}>
          <span>📚 {course.modules?.length || 0} modules</span>
          <span>👥 {students.length} enrolled students</span>
          <span>📅 Created: {formatDate(course.createdAt)}</span>
        </div>
      </div>

      {/* Students Overview */}
      <div style={{
        backgroundColor: '#f8f9fa',
        padding: '20px',
        borderRadius: '8px',
        marginBottom: '30px'
      }}>
        <h3 style={{ margin: '0 0 15px 0' }}>📊 Course Statistics</h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#007bff' }}>
              {students.length}
            </div>
            <div style={{ fontSize: '14px', color: '#666' }}>Total Students</div>
          </div>
          
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#28a745' }}>
              {students.filter(s => s.progress?.completionPercentage === 100).length}
            </div>
            <div style={{ fontSize: '14px', color: '#666' }}>Completed</div>
          </div>
          
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ffc107' }}>
              {students.filter(s => (s.progress?.completionPercentage || 0) > 0 && (s.progress?.completionPercentage || 0) < 100).length}
            </div>
            <div style={{ fontSize: '14px', color: '#666' }}>In Progress</div>
          </div>
          
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#dc3545' }}>
              {students.filter(s => (s.progress?.completionPercentage || 0) === 0).length}
            </div>
            <div style={{ fontSize: '14px', color: '#666' }}>Not Started</div>
          </div>
        </div>
      </div>

      {/* Students List */}
      {students.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px'
        }}>
          <h3>No students enrolled yet</h3>
          <p>Students will appear here once they enroll in your course.</p>
        </div>
      ) : (
        <div>
          <h3 style={{ marginBottom: '20px' }}>📋 Enrolled Students</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {students.map((student) => {
              const progress = student.progress || {};
              const completionPercentage = progress.completionPercentage || 0;
              const isExpanded = selectedStudent?.id === student.id;
              
              return (
                <div key={student.id} style={{
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  backgroundColor: 'white',
                  overflow: 'hidden',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}>
                  {/* Student Header */}
                  <div
                    onClick={() => handleStudentClick(student)}
                    style={{
                      padding: '20px',
                      cursor: 'pointer',
                      borderBottom: isExpanded ? '1px solid #ddd' : 'none',
                      backgroundColor: isExpanded ? '#f8f9fa' : 'white',
                      transition: 'background-color 0.2s'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '10px' }}>
                          <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            backgroundColor: '#007bff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontWeight: 'bold'
                          }}>
                            {student.userId.slice(-2).toUpperCase()}
                          </div>
                          
                          <div>
                            <div style={{ fontWeight: 'bold', fontSize: '16px' }}>
                              Student ID: {student.userId.slice(-8)}
                            </div>
                            <div style={{ fontSize: '14px', color: '#666' }}>
                              Enrolled: {formatDate(student.enrolledAt)}
                            </div>
                          </div>
                        </div>
                        
                        {/* Progress Bar */}
                        <div style={{ marginTop: '10px' }}>
                          <div style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center',
                            marginBottom: '5px'
                          }}>
                            <span style={{ fontSize: '14px', fontWeight: 'bold' }}>Progress</span>
                            <span style={{ 
                              fontSize: '14px', 
                              color: getProgressColor(completionPercentage),
                              fontWeight: 'bold'
                            }}>
                              {completionPercentage}% - {getProgressLabel(completionPercentage)}
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
                              width: `${completionPercentage}%`,
                              height: '100%',
                              backgroundColor: getProgressColor(completionPercentage),
                              transition: 'width 0.3s ease'
                            }} />
                          </div>
                        </div>
                      </div>
                      
                      <div style={{ marginLeft: '20px' }}>
                        <span style={{ fontSize: '18px' }}>
                          {isExpanded ? '▼' : '▶'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Expanded Details */}
                  {isExpanded && (
                    <div style={{ padding: '20px', backgroundColor: '#f8f9fa' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
                        {/* Progress Details */}
                        <div>
                          <h4 style={{ margin: '0 0 10px 0', color: '#333' }}>📈 Progress Details</h4>
                          <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
                            <div><strong>Completed Lessons:</strong> {progress.completedLessons?.length || 0}</div>
                            <div><strong>Current Module:</strong> {(progress.currentModule || 0) + 1}</div>
                            <div><strong>Current Lesson:</strong> {(progress.currentLesson || 0) + 1}</div>
                            {progress.lastAccessedAt && (
                              <div><strong>Last Active:</strong> {formatDate(progress.lastAccessedAt)}</div>
                            )}
                          </div>
                        </div>
                        
                        {/* Enrollment Info */}
                        <div>
                          <h4 style={{ margin: '0 0 10px 0', color: '#333' }}>📋 Enrollment Info</h4>
                          <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
                            <div><strong>Status:</strong> 
                              <span style={{ 
                                color: student.status === 'active' ? '#28a745' : '#dc3545',
                                fontWeight: 'bold',
                                marginLeft: '5px'
                              }}>
                                {student.status || 'active'}
                              </span>
                            </div>
                            <div><strong>User ID:</strong> {student.userId}</div>
                            <div><strong>Enrollment Date:</strong> {formatDate(student.enrolledAt)}</div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Completed Lessons List */}
                      {progress.completedLessons && progress.completedLessons.length > 0 && (
                        <div style={{ marginTop: '20px' }}>
                          <h4 style={{ margin: '0 0 10px 0', color: '#333' }}>✅ Completed Lessons</h4>
                          <div style={{ 
                            display: 'flex', 
                            flexWrap: 'wrap', 
                            gap: '5px',
                            fontSize: '12px'
                          }}>
                            {progress.completedLessons.map((lessonId, index) => (
                              <span key={index} style={{
                                backgroundColor: '#28a745',
                                color: 'white',
                                padding: '4px 8px',
                                borderRadius: '12px',
                                fontSize: '11px'
                              }}>
                                Lesson {lessonId}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
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

export default StudentManagement;