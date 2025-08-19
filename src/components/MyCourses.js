import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import {
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
  doc,
  orderBy,
  updateDoc,
} from "firebase/firestore";
import { confirmDialog } from "./ui/confirmDialog";

function MyCourses() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchCourses = useCallback(async () => {
    try {
      const q = query(
        collection(db, "courses"),
        where("createdBy", "==", currentUser.uid),
        orderBy("createdAt", "desc"),
      );

      const querySnapshot = await getDocs(q);
      const coursesData = [];

      querySnapshot.forEach((doc) => {
        const courseData = { id: doc.id, ...doc.data() };
        coursesData.push(courseData);
      });

      setCourses(coursesData);
    } catch (error) {
      console.error("Error fetching courses:", error);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const handleDeleteCourse = async (courseId, courseTitle) => {
    if (
      await confirmDialog(
        `Are you sure you want to delete "${courseTitle}"? This action cannot be undone.`
      )
    ) {
      try {
        await deleteDoc(doc(db, "courses", courseId));
        setCourses(courses.filter((course) => course.id !== courseId));
        alert("Course deleted successfully!");
      } catch (error) {
        console.error("Error deleting course:", error);
        alert("Failed to delete course. Please try again.");
      }
    }
  };

  const handleEditCourse = (courseId) => {
    navigate(`/edit-course/${courseId}`);
  };

  const handleViewCourse = (courseId) => {
    navigate(`/course/${courseId}`);
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "Unknown";
    return timestamp.toDate
      ? timestamp.toDate().toLocaleDateString()
      : new Date(timestamp).toLocaleDateString();
  };

  const getTotalLessons = (modules) => {
    if (!modules || !Array.isArray(modules)) return 0;
    return modules.reduce((total, module) => {
      return total + (module.lessons ? module.lessons.length : 0);
    }, 0);
  };

  const handlePublishCourse = async (courseId, currentStatus) => {
    try {
      const newStatus = currentStatus === "published" ? "draft" : "published";
      const courseRef = doc(db, "courses", courseId);

      await updateDoc(courseRef, {
        status: newStatus,
        publishedAt: newStatus === "published" ? new Date() : null,
      });

      // Refresh courses list
      fetchCourses();

      alert(
        `Course ${newStatus === "published" ? "published" : "unpublished"} successfully!`,
      );
    } catch (error) {
      console.error("Error updating course status:", error);
      alert("Error updating course status. Please try again.");
    }
  };

  if (loading) {
    return (
      <div style={{ padding: "20px", textAlign: "center" }}>
        <h1>📚 My Courses</h1>
        <p>Loading your courses...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "20px", maxWidth: "1200px", margin: "0 auto" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "30px",
        }}
      >
        <h1>📚 My Courses</h1>
        <div>
          <button
            onClick={() => navigate("/create-course")}
            style={{
              padding: "10px 20px",
              backgroundColor: "#007bff",
              color: "white",
              border: "none",
              borderRadius: "6px",
              marginRight: "10px",
              cursor: "pointer",
            }}
          >
            ➕ Create New Course
          </button>
          <button
            onClick={() => navigate("/dashboard")}
            style={{
              padding: "10px 20px",
              backgroundColor: "#6c757d",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
            }}
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>

      {courses.length === 0 ? (
        <div style={{ textAlign: "center", padding: "50px" }}>
          <h2>🎓 No Courses Yet</h2>
          <p>
            You haven't created any courses yet. Start building your first
            course!
          </p>
          <button
            onClick={() => navigate("/create-course")}
            style={{
              padding: "15px 30px",
              backgroundColor: "#007bff",
              color: "white",
              border: "none",
              borderRadius: "8px",
              fontSize: "16px",
              cursor: "pointer",
              marginTop: "20px",
            }}
          >
            🚀 Create Your First Course
          </button>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))",
            gap: "20px",
          }}
        >
          {courses.map((course) => (
            <div
              key={course.id}
              style={{
                backgroundColor: "#f8f9fa",
                border: "1px solid #dee2e6",
                borderRadius: "8px",
                padding: "20px",
                boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
              }}
            >
              <h3
                style={{ marginTop: "0", marginBottom: "10px", color: "#333" }}
              >
                {course.title}
              </h3>

              <p
                style={{
                  color: "#666",
                  marginBottom: "15px",
                  fontSize: "14px",
                }}
              >
                {course.description && course.description.length > 100
                  ? `${course.description.substring(0, 100)}...`
                  : course.description}
              </p>

              <div
                style={{
                  marginBottom: "15px",
                  fontSize: "12px",
                  color: "#888",
                }}
              >
                <div>
                  <strong>Created:</strong> {formatDate(course.createdAt)}
                </div>
                <div>
                  <strong>Modules:</strong>{" "}
                  {course.modules ? course.modules.length : 0}
                </div>
                <div>
                  <strong>Lessons:</strong> {getTotalLessons(course.modules)}
                </div>
                <div>
                  <strong>Difficulty:</strong>{" "}
                  {course.metadata?.difficulty || "Not specified"}
                </div>
                <div>
                  <strong>Status:</strong>
                  <span
                    style={{
                      color:
                        course.status === "published" ? "#28a745" : "#ffc107",
                      fontWeight: "bold",
                      marginLeft: "5px",
                    }}
                  >
                    {course.status || "draft"}
                  </span>
                </div>
              </div>

              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <button
                  onClick={() => handleViewCourse(course.id)}
                  style={{
                    padding: "8px 12px",
                    backgroundColor: "#17a2b8",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    fontSize: "12px",
                    cursor: "pointer",
                  }}
                >
                  👁️ View
                </button>

                <button
                  onClick={() => handleEditCourse(course.id)}
                  style={{
                    padding: "8px 12px",
                    backgroundColor: "#28a745",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    fontSize: "12px",
                    cursor: "pointer",
                  }}
                >
                  ✏️ Edit
                </button>

                <button
                  onClick={() => handlePublishCourse(course.id, course.status)}
                  style={{
                    padding: "8px 12px",
                    backgroundColor:
                      course.status === "published" ? "#ffc107" : "#007bff",
                    color: course.status === "published" ? "#000" : "white",
                    border: "none",
                    borderRadius: "4px",
                    fontSize: "12px",
                    cursor: "pointer",
                  }}
                >
                  {course.status === "published"
                    ? "📤 Unpublish"
                    : "🌍 Publish"}
                </button>

                <button
                  onClick={() => handleDeleteCourse(course.id, course.title)}
                  style={{
                    padding: "8px 12px",
                    backgroundColor: "#dc3545",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    fontSize: "12px",
                    cursor: "pointer",
                  }}
                >
                  🗑️ Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default MyCourses;
