import React from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";

function Dashboard() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    try {
      await logout();
      navigate("/login");
    } catch {
      console.log("Failed to log out");
    }
  }

  const handleCreateCourse = () => {
    navigate("/create-course");
  };

  const handleMyCourses = () => {
    navigate("/my-courses");
  };

  const handlePublicCourses = () => {
    navigate("/public-courses");
  };

  return (
    <div style={{ padding: "20px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "30px",
        }}
      >
        <h1>🎓 Course Maker Dashboard</h1>
        <div>
          <span style={{ marginRight: "15px" }}>
            Welcome, {currentUser?.email}!
          </span>
          <button
            onClick={handleLogout}
            style={{
              padding: "8px 16px",
              backgroundColor: "#dc3545",
              color: "white",
              border: "none",
              borderRadius: "4px",
            }}
          >
            Logout
          </button>
        </div>
      </div>

      <div style={{ textAlign: "center", padding: "50px" }}>
        <h2>🚀 Ready to Create Amazing Courses!</h2>
        <p>Your AI-powered course creation tool is ready to use.</p>
        <div style={{ marginTop: "30px" }}>
          <button
            onClick={handleCreateCourse}
            style={{
              padding: "15px 30px",
              backgroundColor: "#007bff",
              color: "white",
              border: "none",
              borderRadius: "8px",
              fontSize: "16px",
              marginRight: "15px",
              cursor: "pointer",
            }}
          >
            📚 Create New Course
          </button>
          <button
            onClick={handleMyCourses}
            style={{
              padding: "15px 30px",
              backgroundColor: "#28a745",
              color: "white",
              border: "none",
              borderRadius: "8px",
              fontSize: "16px",
              marginRight: "15px",
              cursor: "pointer",
            }}
          >
            📖 My Courses
          </button>
          <button
            onClick={handlePublicCourses}
            style={{
              padding: "15px 30px",
              backgroundColor: "#6f42c1",
              color: "white",
              border: "none",
              borderRadius: "8px",
              fontSize: "16px",
              cursor: "pointer",
            }}
          >
            🌍 Browse Courses
          </button>
        </div>
      </div>
      {/* Add this to the navigation section: */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
          gap: "20px",
          marginTop: "30px",
        }}
      >
        {/* Existing cards */}

        {/* New Enrollment Cards */}
        <div
          style={{
            backgroundColor: "white",
            padding: "30px",
            borderRadius: "10px",
            boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
            textAlign: "center",
            cursor: "pointer",
            transition: "transform 0.2s",
            border: "2px solid #17a2b8",
          }}
          onClick={() => navigate("/enrolled-courses")}
          onMouseEnter={(e) => (e.target.style.transform = "translateY(-5px)")}
          onMouseLeave={(e) => (e.target.style.transform = "translateY(0)")}
        >
          <div style={{ fontSize: "48px", marginBottom: "15px" }}>📚</div>
          <h3 style={{ color: "#17a2b8", margin: "0 0 10px 0" }}>
            My Learning
          </h3>
          <p style={{ color: "#666", margin: "0", fontSize: "14px" }}>
            View your enrolled courses and track progress
          </p>
        </div>

        <div
          style={{
            backgroundColor: "white",
            padding: "30px",
            borderRadius: "10px",
            boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
            textAlign: "center",
            cursor: "pointer",
            transition: "transform 0.2s",
            border: "2px solid #28a745",
          }}
          onClick={() => navigate("/public-courses")}
          onMouseEnter={(e) => (e.target.style.transform = "translateY(-5px)")}
          onMouseLeave={(e) => (e.target.style.transform = "translateY(0)")}
        >
          <div style={{ fontSize: "48px", marginBottom: "15px" }}>🌟</div>
          <h3 style={{ color: "#28a745", margin: "0 0 10px 0" }}>
            Discover Courses
          </h3>
          <p style={{ color: "#666", margin: "0", fontSize: "14px" }}>
            Browse and enroll in published courses
          </p>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
