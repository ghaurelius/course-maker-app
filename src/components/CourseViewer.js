import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../contexts/AuthContext";
import { useEnrollment } from "../contexts/EnrollmentContext";
import { sanitizeForDisplay } from "../utils/contentCleanup";
import AudioPlayer from "./AudioPlayer";
import TableOfContents from "./TableOfContents";

function CourseViewer() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { updateLessonProgress, getEnrollmentDetails, enrollInCourse } =
    useEnrollment();

  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentModuleIndex, setCurrentModuleIndex] = useState(0);
  const [currentLessonIndex, setCurrentLessonIndex] = useState(0);
  const [enrollment, setEnrollment] = useState(null);
  const [completedLessons, setCompletedLessons] = useState([]);
  const [showTableOfContents, setShowTableOfContents] = useState(false);
  const [isCreatorMode, setIsCreatorMode] = useState(false);

  useEffect(() => {
    const fetchCourse = async () => {
      try {
        const courseDoc = await getDoc(doc(db, "courses", courseId));
        if (courseDoc.exists()) {
          setCourse({ id: courseDoc.id, ...courseDoc.data() });

          // If user is logged in, get enrollment details
          if (currentUser) {
            const enrollmentData = await getEnrollmentDetails(courseId);
            if (enrollmentData) {
              setEnrollment(enrollmentData);
              setCompletedLessons(
                enrollmentData.progress?.completedLessons || [],
              );
              setCurrentModuleIndex(
                enrollmentData.progress?.currentModule || 0,
              );
              setCurrentLessonIndex(
                enrollmentData.progress?.currentLesson || 0,
              );
            }
          }
        } else {
          console.error("Course not found");
        }
      } catch (error) {
        console.error("Error fetching course:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCourse();
  }, [courseId, currentUser, getEnrollmentDetails]); // Added getEnrollmentDetails

  // Check if current user is the course creator
  useEffect(() => {
    if (course && currentUser) {
      setIsCreatorMode(course.createdBy === currentUser.uid);
    }
  }, [course, currentUser]);

  // Handle navigation from table of contents
  const handleTOCNavigation = (moduleIndex, lessonIndex = null) => {
    setCurrentModuleIndex(moduleIndex);
    if (lessonIndex !== null) {
      setCurrentLessonIndex(lessonIndex);
    } else {
      setCurrentLessonIndex(0);
    }
    setShowTableOfContents(false); // Close TOC after navigation
  };

  // Video upload functionality moved to CourseEditor component

  const handleLessonComplete = async (moduleIndex, lessonIndex) => {
    if (!currentUser || !enrollment) {
      alert("Please enroll in this course to track your progress.");
      return;
    }

    const lessonId = `${moduleIndex}-${lessonIndex}`;
    if (!completedLessons.includes(lessonId)) {
      const success = await updateLessonProgress(
        courseId,
        moduleIndex,
        lessonIndex,
      );
      if (success) {
        setCompletedLessons((prev) => [...prev, lessonId]);

        // Auto-advance to next lesson
        const currentModule = course.modules[moduleIndex];
        if (lessonIndex < currentModule.lessons.length - 1) {
          setCurrentLessonIndex(lessonIndex + 1);
        } else if (moduleIndex < course.modules.length - 1) {
          setCurrentModuleIndex(moduleIndex + 1);
          setCurrentLessonIndex(0);
        }
      }
    }
  };

  const handleEnrollNow = async () => {
    if (!currentUser) {
      alert("Please log in to enroll in this course.");
      navigate("/login");
      return;
    }

    const success = await enrollInCourse(courseId, course.title);
    if (success) {
      alert(`Successfully enrolled in "${course.title}"!`);
      // Refresh enrollment data
      const enrollmentData = await getEnrollmentDetails(courseId);
      setEnrollment(enrollmentData);
    }
  };

  const isLessonCompleted = (moduleIndex, lessonIndex) => {
    const lessonId = `${moduleIndex}-${lessonIndex}`;
    return completedLessons.includes(lessonId);
  };

  const getProgressPercentage = () => {
    if (!course || !course.modules) return 0;

    let totalLessons = 0;
    course.modules.forEach((module) => {
      totalLessons += module.lessons.length;
    });

    return totalLessons > 0
      ? Math.round((completedLessons.length / totalLessons) * 100)
      : 0;
  };

  if (loading) {
    return (
      <div style={{ padding: "20px", textAlign: "center" }}>
        <h2>Loading course...</h2>
      </div>
    );
  }

  if (!course) {
    return (
      <div style={{ padding: "20px", textAlign: "center" }}>
        <h2>Course not found</h2>
        <button onClick={() => navigate("/public-courses")}>
          Back to Courses
        </button>
      </div>
    );
  }

  const currentModule = course.modules?.[currentModuleIndex];
  const currentLesson = currentModule?.lessons?.[currentLessonIndex];

  // Safety check for course data integrity
  if (course && (!course.modules || course.modules.length === 0)) {
    return (
      <div style={{ padding: "20px", textAlign: "center" }}>
        <h2>Course Data Error</h2>
        <p>This course appears to have no modules or lessons. Please contact support.</p>
        <button onClick={() => navigate("/dashboard")}>Return to Dashboard</button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      {/* Sidebar */}
      <div
        style={{
          width: "300px",
          backgroundColor: "#f8f9fa",
          borderRight: "1px solid #ddd",
          overflowY: "auto",
          padding: "20px",
        }}
      >
        <h3 style={{ margin: "0 0 15px 0" }}>{course.title}</h3>

        {/* Table of Contents Toggle */}
        <button
          onClick={() => setShowTableOfContents(!showTableOfContents)}
          style={{
            width: "100%",
            padding: "10px",
            backgroundColor: "#17a2b8",
            color: "white",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            fontSize: "14px",
            marginBottom: "15px"
          }}
        >
          📚 {showTableOfContents ? "Hide" : "Show"} Table of Contents
        </button>

        {/* Progress Bar (only for enrolled users) */}
        {enrollment && (
          <div style={{ marginBottom: "20px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "5px",
              }}
            >
              <span style={{ fontSize: "14px", fontWeight: "bold" }}>
                Progress
              </span>
              <span style={{ fontSize: "14px", color: "#007bff" }}>
                {getProgressPercentage()}%
              </span>
            </div>
            <div
              style={{
                width: "100%",
                height: "8px",
                backgroundColor: "#e9ecef",
                borderRadius: "4px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${getProgressPercentage()}%`,
                  height: "100%",
                  backgroundColor: "#007bff",
                  transition: "width 0.3s ease",
                }}
              />
            </div>
          </div>
        )}

        {/* Enhanced Table of Contents or Module List */}
        {showTableOfContents ? (
          <TableOfContents
            course={course}
            currentModuleIndex={currentModuleIndex}
            currentLessonIndex={currentLessonIndex}
            onNavigate={handleTOCNavigation}
            showVideoLinks={true}
          />
        ) : (
          /* Simplified Module List */
          course.modules.map((module, moduleIndex) => (
            <div key={moduleIndex} style={{ marginBottom: "15px" }}>
              <h4
                style={{
                  margin: "0 0 10px 0",
                  fontSize: "16px",
                  color: moduleIndex === currentModuleIndex ? "#007bff" : "#333",
                }}
              >
                📚 {module.title}
              </h4>

              {module.lessons.map((lesson, lessonIndex) => {
                const isActive =
                  moduleIndex === currentModuleIndex &&
                  lessonIndex === currentLessonIndex;
                const isCompleted = isLessonCompleted(moduleIndex, lessonIndex);

                return (
                  <div
                    key={lessonIndex}
                    onClick={() => {
                      setCurrentModuleIndex(moduleIndex);
                      setCurrentLessonIndex(lessonIndex);
                    }}
                    style={{
                      padding: "8px 12px",
                      marginBottom: "5px",
                      borderRadius: "4px",
                      cursor: "pointer",
                      backgroundColor: isActive
                        ? "#007bff"
                        : isCompleted
                          ? "#d4edda"
                          : "white",
                      color: isActive
                        ? "white"
                        : isCompleted
                          ? "#155724"
                          : "#333",
                      border:
                        "1px solid " +
                        (isActive ? "#007bff" : isCompleted ? "#c3e6cb" : "#ddd"),
                      fontSize: "14px",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <span>{isCompleted ? "✅" : "📖"}</span>
                    <span style={{ flex: 1 }}>{lesson.title}</span>
                    {lesson.duration && (
                      <span style={{ fontSize: "12px", opacity: 0.7 }}>
                        {lesson.duration}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, padding: "20px", overflowY: "auto" }}>
        {!enrollment && currentUser && (
          <div
            style={{
              backgroundColor: "#fff3cd",
              border: "1px solid #ffeaa7",
              borderRadius: "8px",
              padding: "15px",
              marginBottom: "20px",
              textAlign: "center",
            }}
          >
            <h4 style={{ margin: "0 0 10px 0", color: "#856404" }}>
              Enroll to Track Progress
            </h4>
            <p style={{ margin: "0 0 15px 0", color: "#856404" }}>
              Enroll in this course to track your progress and earn a
              certificate upon completion.
            </p>
            <button
              onClick={handleEnrollNow}
              style={{
                backgroundColor: "#007bff",
                color: "white",
                border: "none",
                padding: "10px 20px",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "16px",
                fontWeight: "bold",
              }}
            >
              📚 Enroll Now
            </button>
          </div>
        )}

        {!currentUser && (
          <div
            style={{
              backgroundColor: "#d1ecf1",
              border: "1px solid #bee5eb",
              borderRadius: "8px",
              padding: "15px",
              marginBottom: "20px",
              textAlign: "center",
            }}
          >
            <h4 style={{ margin: "0 0 10px 0", color: "#0c5460" }}>
              Login to Enroll
            </h4>
            <p style={{ margin: "0 0 15px 0", color: "#0c5460" }}>
              Please log in to enroll in this course and track your progress.
            </p>
            <button
              onClick={() => navigate("/login")}
              style={{
                backgroundColor: "#17a2b8",
                color: "white",
                border: "none",
                padding: "10px 20px",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "16px",
              }}
            >
              🔐 Login
            </button>
          </div>
        )}

        {currentLesson ? (
          <div>
            <div style={{ marginBottom: "20px" }}>
              <h1 style={{ margin: "0 0 10px 0" }}>{currentLesson.title || 'Untitled Lesson'}</h1>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "15px",
                  fontSize: "14px",
                  color: "#666",
                }}
              >
                <span>
                  📚 Module {currentModuleIndex + 1}: {currentModule.title}
                </span>
                <span>
                  📖 Lesson {currentLessonIndex + 1} of{" "}
                  {currentModule.lessons.length}
                </span>
                {currentLesson.duration && (
                  <span>⏱️ {currentLesson.duration}</span>
                )}
              </div>
            </div>

            <div
              style={{
                backgroundColor: "white",
                border: "1px solid #ddd",
                borderRadius: "8px",
                padding: "30px",
                marginBottom: "20px",
                lineHeight: "1.6",
              }}
            >
              <div
                dangerouslySetInnerHTML={{
                  __html: sanitizeForDisplay(currentLesson.markdownContent || currentLesson.content || 'No content available')
                }}
              />
            </div>

            {/* Audio Player for Lesson Content */}
            <AudioPlayer 
              content={sanitizeForDisplay(currentLesson.markdownContent || currentLesson.content || 'No content available')}
              title={currentLesson.title || 'Untitled Lesson'}
            />

            {/* Video upload is handled in CourseEditor, not in CourseViewer */}

            {/* Display existing video for all users */}
            {currentLesson.videoUrl && (
              <div style={{
                backgroundColor: '#f8f9fa',
                border: '1px solid #e9ecef',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '20px'
              }}>
                <h4 style={{
                  margin: '0 0 12px 0',
                  color: '#2c3e50',
                  fontSize: '16px'
                }}>
                  🎥 Lesson Video
                </h4>
                <video
                  controls
                  style={{
                    width: '100%',
                    maxWidth: '600px',
                    height: 'auto',
                    borderRadius: '4px'
                  }}
                >
                  <source src={currentLesson.videoUrl} type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              </div>
            )}

            {/* Lesson Actions */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div style={{ display: "flex", gap: "10px" }}>
                {/* Previous Lesson */}
                <button
                  onClick={() => {
                    if (currentLessonIndex > 0) {
                      setCurrentLessonIndex(currentLessonIndex - 1);
                    } else if (currentModuleIndex > 0) {
                      const prevModule = course.modules[currentModuleIndex - 1];
                      setCurrentModuleIndex(currentModuleIndex - 1);
                      setCurrentLessonIndex(prevModule.lessons.length - 1);
                    }
                  }}
                  disabled={
                    currentModuleIndex === 0 && currentLessonIndex === 0
                  }
                  style={{
                    backgroundColor: "#6c757d",
                    color: "white",
                    border: "none",
                    padding: "10px 15px",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "14px",
                    opacity:
                      currentModuleIndex === 0 && currentLessonIndex === 0
                        ? 0.5
                        : 1,
                  }}
                >
                  ← Previous
                </button>

                {/* Next Lesson */}
                <button
                  onClick={() => {
                    if (currentLessonIndex < currentModule.lessons.length - 1) {
                      setCurrentLessonIndex(currentLessonIndex + 1);
                    } else if (currentModuleIndex < course.modules.length - 1) {
                      setCurrentModuleIndex(currentModuleIndex + 1);
                      setCurrentLessonIndex(0);
                    }
                  }}
                  disabled={
                    currentModuleIndex === course.modules.length - 1 &&
                    currentLessonIndex === currentModule.lessons.length - 1
                  }
                  style={{
                    backgroundColor: "#007bff",
                    color: "white",
                    border: "none",
                    padding: "10px 15px",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "14px",
                    opacity:
                      currentModuleIndex === course.modules.length - 1 &&
                      currentLessonIndex === currentModule.lessons.length - 1
                        ? 0.5
                        : 1,
                  }}
                >
                  Next →
                </button>
              </div>

              {/* Mark as Complete */}
              {enrollment && (
                <button
                  onClick={() =>
                    handleLessonComplete(currentModuleIndex, currentLessonIndex)
                  }
                  disabled={isLessonCompleted(
                    currentModuleIndex,
                    currentLessonIndex,
                  )}
                  style={{
                    backgroundColor: isLessonCompleted(
                      currentModuleIndex,
                      currentLessonIndex,
                    )
                      ? "#28a745"
                      : "#ffc107",
                    color: "white",
                    border: "none",
                    padding: "10px 20px",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: "bold",
                  }}
                >
                  {isLessonCompleted(currentModuleIndex, currentLessonIndex)
                    ? "✅ Completed"
                    : "✓ Mark Complete"}
                </button>
              )}
            </div>
          </div>
        ) : (
          <div style={{ padding: "20px", textAlign: "center" }}>
            <h2>No Lesson Available</h2>
            <p>The selected lesson could not be found or is not available.</p>
            <button 
              onClick={() => {
                setCurrentModuleIndex(0);
                setCurrentLessonIndex(0);
              }}
              style={{
                backgroundColor: "#3498db",
                color: "white",
                border: "none",
                padding: "10px 20px",
                borderRadius: "5px",
                cursor: "pointer"
              }}
            >
              Go to First Lesson
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default CourseViewer;
