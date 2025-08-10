import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { EnrollmentProvider } from "./contexts/EnrollmentContext";
import { ToastProvider } from "./components/Toast";
import Login from "./components/Login";
import Register from "./components/Register";
import Dashboard from "./components/Dashboard";
import CourseCreator from "./components/CourseCreator";
import MyCourses from "./components/MyCourses";
import CourseViewer from "./components/CourseViewer";
import CourseEditor from "./components/CourseEditor";
import PublicCourses from "./components/PublicCourses";
import EnrolledCourses from "./components/EnrolledCourses";
import "./App.css";

// Protected Route Component
function ProtectedRoute({ children }) {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "50px" }}>Loading...</div>
    );
  }

  return currentUser ? children : <Navigate to="/login" />;
}

// Public Route Component (redirect if already logged in)
function PublicRoute({ children }) {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "50px" }}>Loading...</div>
    );
  }

  return !currentUser ? children : <Navigate to="/dashboard" />;
}

function App() {
  return (
    <AuthProvider>
      <EnrollmentProvider>
        <ToastProvider>
          <Router>
          <div className="App">
            <Routes>
              <Route path="/" element={<Navigate to="/login" />} />
              <Route path="/public-courses" element={<PublicCourses />} />
              <Route
                path="/login"
                element={
                  <PublicRoute>
                    <Login />
                  </PublicRoute>
                }
              />
              <Route
                path="/register"
                element={
                  <PublicRoute>
                    <Register />
                  </PublicRoute>
                }
              />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/create-course"
                element={
                  <ProtectedRoute>
                    <CourseCreator />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/my-courses"
                element={
                  <ProtectedRoute>
                    <MyCourses />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/enrolled-courses"
                element={
                  <ProtectedRoute>
                    <EnrolledCourses />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/edit-course/:courseId"
                element={
                  <ProtectedRoute>
                    <CourseEditor />
                  </ProtectedRoute>
                }
              />
              <Route path="/course/:courseId" element={<CourseViewer />} />
            </Routes>
          </div>
          </Router>
        </ToastProvider>
      </EnrollmentProvider>
    </AuthProvider>
  );
}

export default App;
