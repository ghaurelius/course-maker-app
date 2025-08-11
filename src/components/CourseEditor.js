import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../contexts/AuthContext";
import VideoUpload from "./VideoUpload";

const CourseEditor = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("details");
  const [selectedModule, setSelectedModule] = useState(0);
  const [selectedLesson, setSelectedLesson] = useState(0);

  // Form states
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [estimatedDuration, setEstimatedDuration] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [modules, setModules] = useState([]);

  useEffect(() => {
    fetchCourse();
  }, [courseId]);

  const fetchCourse = async () => {
    try {
      const courseDoc = await getDoc(doc(db, "courses", courseId));
      if (courseDoc.exists()) {
        const courseData = courseDoc.data();
        setCourse(courseData);

        // Populate form states
        setTitle(courseData.title || "");
        setDescription(courseData.description || "");
        setCategory(courseData.category || "");
        setDifficulty(courseData.difficulty || "");
        setEstimatedDuration(courseData.estimatedDuration || "");
        setTargetAudience(courseData.targetAudience || "");
        setModules(courseData.modules || []);
      } else {
        alert("Course not found!");
        navigate("/dashboard");
      }
    } catch (error) {
      console.error("Error fetching course:", error);
      alert("Error loading course. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      alert("Please enter a course title");
      return;
    }

    setSaving(true);
    try {
      const updatedCourse = {
        title: title.trim(),
        description: description.trim(),
        category,
        difficulty,
        estimatedDuration,
        targetAudience: targetAudience.trim(),
        modules,
        updatedAt: new Date(),
      };

      await updateDoc(doc(db, "courses", courseId), updatedCourse);
      alert("Course updated successfully!");
      setCourse({ ...course, ...updatedCourse });
    } catch (error) {
      console.error("Error updating course:", error);
      alert("Error saving course. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const addModule = () => {
    const newModule = {
      title: "New Module",
      lessons: [
        {
          title: "New Lesson",
          content: "Enter lesson content here...",
          objectives: [],
        },
      ],
    };
    setModules([...modules, newModule]);
  };

  const deleteModule = (moduleIndex) => {
    if (window.confirm("Are you sure you want to delete this module?")) {
      const updatedModules = modules.filter(
        (_, index) => index !== moduleIndex,
      );
      setModules(updatedModules);
      if (selectedModule >= updatedModules.length) {
        setSelectedModule(Math.max(0, updatedModules.length - 1));
      }
    }
  };

  const updateModule = (moduleIndex, field, value) => {
    const updatedModules = [...modules];
    updatedModules[moduleIndex][field] = value;
    setModules(updatedModules);
  };

  const addLesson = (moduleIndex) => {
    const updatedModules = [...modules];
    const newLesson = {
      title: "New Lesson",
      content: "Enter lesson content here...",
      objectives: [],
    };
    updatedModules[moduleIndex].lessons.push(newLesson);
    setModules(updatedModules);
  };

  const deleteLesson = (moduleIndex, lessonIndex) => {
    if (window.confirm("Are you sure you want to delete this lesson?")) {
      const updatedModules = [...modules];
      updatedModules[moduleIndex].lessons = updatedModules[
        moduleIndex
      ].lessons.filter((_, index) => index !== lessonIndex);
      setModules(updatedModules);
      if (selectedLesson >= updatedModules[moduleIndex].lessons.length) {
        setSelectedLesson(
          Math.max(0, updatedModules[moduleIndex].lessons.length - 1),
        );
      }
    }
  };

  const updateLesson = (moduleIndex, lessonIndex, field, value) => {
    const updatedModules = [...modules];
    updatedModules[moduleIndex].lessons[lessonIndex][field] = value;
    setModules(updatedModules);
  };

  // Handle video upload for lessons
  const handleVideoUpload = async (videoUrl, moduleIndex, lessonIndex) => {
    try {
      const updatedModules = [...modules];
      if (updatedModules[moduleIndex] && updatedModules[moduleIndex].lessons[lessonIndex]) {
        updatedModules[moduleIndex].lessons[lessonIndex].videoUrl = videoUrl;
        setModules(updatedModules);
        
        // Also update the course in Firestore immediately
        const updatedCourse = {
          ...course,
          modules: updatedModules,
          updatedAt: new Date(),
        };
        
        await updateDoc(doc(db, "courses", courseId), updatedCourse);
        setCourse(updatedCourse);
        
        console.log('Video uploaded and saved successfully');
      }
    } catch (error) {
      console.error('Error saving video to course:', error);
      alert('Failed to save video. Please try again.');
    }
  };

  if (loading) {
    return (
      <div style={{ padding: "20px", textAlign: "center" }}>
        <h2>Loading Course Editor...</h2>
      </div>
    );
  }

  if (!course) {
    return (
      <div style={{ padding: "20px", textAlign: "center" }}>
        <h2>Course not found</h2>
        <button onClick={() => navigate("/dashboard")}>
          ← Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: "20px", maxWidth: "1200px", margin: "0 auto" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
          borderBottom: "2px solid #e0e0e0",
          paddingBottom: "15px",
        }}
      >
        <div>
          <h1 style={{ margin: "0 0 5px 0", color: "#333" }}>✏️ Edit Course</h1>
          <p style={{ margin: 0, color: "#666" }}>
            Modify your course content and structure
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={() => navigate("/dashboard")}
            style={{
              padding: "10px 20px",
              backgroundColor: "#6c757d",
              color: "white",
              border: "none",
              borderRadius: "5px",
              cursor: "pointer",
            }}
          >
            ← Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: "10px 20px",
              backgroundColor: saving ? "#ccc" : "#007bff",
              color: "white",
              border: "none",
              borderRadius: "5px",
              cursor: saving ? "not-allowed" : "pointer",
            }}
          >
            {saving ? "Saving..." : "💾 Save Changes"}
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={{ marginBottom: "20px" }}>
        <div style={{ display: "flex", borderBottom: "1px solid #ddd" }}>
          {[
            { id: "details", label: "📋 Course Details" },
            { id: "content", label: "📚 Content Editor" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: "10px 20px",
                border: "none",
                backgroundColor:
                  activeTab === tab.id ? "#007bff" : "transparent",
                color: activeTab === tab.id ? "white" : "#333",
                cursor: "pointer",
                borderRadius: "5px 5px 0 0",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Course Details Tab */}
      {activeTab === "details" && (
        <div
          style={{
            backgroundColor: "#f8f9fa",
            padding: "20px",
            borderRadius: "8px",
          }}
        >
          <h3 style={{ marginTop: 0 }}>Course Information</h3>

          <div style={{ display: "grid", gap: "15px" }}>
            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "5px",
                  fontWeight: "bold",
                }}
              >
                Course Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  fontSize: "16px",
                }}
                placeholder="Enter course title"
              />
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "5px",
                  fontWeight: "bold",
                }}
              >
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                style={{
                  width: "100%",
                  padding: "10px",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  fontSize: "14px",
                  resize: "vertical",
                }}
                placeholder="Describe what students will learn in this course"
              />
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "15px",
              }}
            >
              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: "5px",
                    fontWeight: "bold",
                  }}
                >
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px",
                    border: "1px solid #ddd",
                    borderRadius: "4px",
                    fontSize: "14px",
                  }}
                >
                  <option value="">Select Category</option>
                  <option value="Programming">Programming</option>
                  <option value="Design">Design</option>
                  <option value="Business">Business</option>
                  <option value="Marketing">Marketing</option>
                  <option value="Data Science">Data Science</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: "5px",
                    fontWeight: "bold",
                  }}
                >
                  Difficulty
                </label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px",
                    border: "1px solid #ddd",
                    borderRadius: "4px",
                    fontSize: "14px",
                  }}
                >
                  <option value="">Select Difficulty</option>
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                </select>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "15px",
              }}
            >
              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: "5px",
                    fontWeight: "bold",
                  }}
                >
                  Estimated Duration
                </label>
                <input
                  type="text"
                  value={estimatedDuration}
                  onChange={(e) => setEstimatedDuration(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px",
                    border: "1px solid #ddd",
                    borderRadius: "4px",
                    fontSize: "14px",
                  }}
                  placeholder="e.g., 4 weeks, 20 hours"
                />
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: "5px",
                    fontWeight: "bold",
                  }}
                >
                  Target Audience
                </label>
                <input
                  type="text"
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px",
                    border: "1px solid #ddd",
                    borderRadius: "4px",
                    fontSize: "14px",
                  }}
                  placeholder="e.g., Beginners, Professionals"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Content Editor Tab */}
      {activeTab === "content" && (
        <div style={{ display: "flex", gap: "20px", height: "600px" }}>
          {/* Sidebar - Modules & Lessons */}
          <div
            style={{
              width: "300px",
              backgroundColor: "#f8f9fa",
              padding: "15px",
              borderRadius: "8px",
              overflowY: "auto",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "15px",
              }}
            >
              <h4 style={{ margin: 0 }}>📚 Course Structure</h4>
              <button
                onClick={addModule}
                style={{
                  padding: "5px 10px",
                  backgroundColor: "#28a745",
                  color: "white",
                  border: "none",
                  borderRadius: "3px",
                  cursor: "pointer",
                  fontSize: "12px",
                }}
              >
                + Module
              </button>
            </div>

            {modules.map((module, moduleIndex) => (
              <div key={moduleIndex} style={{ marginBottom: "15px" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "8px",
                    backgroundColor:
                      selectedModule === moduleIndex ? "#007bff" : "#e9ecef",
                    color: selectedModule === moduleIndex ? "white" : "#333",
                    borderRadius: "4px",
                    cursor: "pointer",
                  }}
                >
                  <span
                    onClick={() => setSelectedModule(moduleIndex)}
                    style={{ flex: 1, fontWeight: "bold", fontSize: "14px" }}
                  >
                    📁 {module.title}
                  </span>
                  <button
                    onClick={() => deleteModule(moduleIndex)}
                    style={{
                      background: "none",
                      border: "none",
                      color:
                        selectedModule === moduleIndex ? "white" : "#dc3545",
                      cursor: "pointer",
                      fontSize: "12px",
                    }}
                  >
                    🗑️
                  </button>
                </div>

                {selectedModule === moduleIndex && (
                  <div style={{ marginTop: "8px", paddingLeft: "10px" }}>
                    <div style={{ marginBottom: "8px" }}>
                      <button
                        onClick={() => addLesson(moduleIndex)}
                        style={{
                          padding: "3px 8px",
                          backgroundColor: "#17a2b8",
                          color: "white",
                          border: "none",
                          borderRadius: "3px",
                          cursor: "pointer",
                          fontSize: "11px",
                        }}
                      >
                        + Lesson
                      </button>
                    </div>
                    {module.lessons &&
                      module.lessons.map((lesson, lessonIndex) => (
                        <div
                          key={lessonIndex}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "5px 8px",
                            backgroundColor:
                              selectedLesson === lessonIndex
                                ? "#6c757d"
                                : "#fff",
                            color:
                              selectedLesson === lessonIndex ? "white" : "#333",
                            borderRadius: "3px",
                            marginBottom: "3px",
                            cursor: "pointer",
                            fontSize: "13px",
                          }}
                        >
                          <span
                            onClick={() => setSelectedLesson(lessonIndex)}
                            style={{ flex: 1 }}
                          >
                            📄 {lesson.title}
                          </span>
                          <button
                            onClick={() =>
                              deleteLesson(moduleIndex, lessonIndex)
                            }
                            style={{
                              background: "none",
                              border: "none",
                              color:
                                selectedLesson === lessonIndex
                                  ? "white"
                                  : "#dc3545",
                              cursor: "pointer",
                              fontSize: "10px",
                            }}
                          >
                            🗑️
                          </button>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Main Editor */}
          <div
            style={{
              flex: 1,
              backgroundColor: "#fff",
              padding: "20px",
              borderRadius: "8px",
              border: "1px solid #ddd",
            }}
          >
            {modules.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  color: "#666",
                  marginTop: "50px",
                }}
              >
                <h3>No modules yet</h3>
                <p>Click "+ Module" to start building your course content</p>
              </div>
            ) : (
              <div>
                {/* Module Editor */}
                <div style={{ marginBottom: "20px" }}>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "5px",
                      fontWeight: "bold",
                    }}
                  >
                    Module Title
                  </label>
                  <input
                    type="text"
                    value={modules[selectedModule]?.title || ""}
                    onChange={(e) =>
                      updateModule(selectedModule, "title", e.target.value)
                    }
                    style={{
                      width: "100%",
                      padding: "10px",
                      border: "1px solid #ddd",
                      borderRadius: "4px",
                      fontSize: "16px",
                      fontWeight: "bold",
                    }}
                    placeholder="Enter module title"
                  />
                </div>

                {/* Lesson Editor */}
                {modules[selectedModule]?.lessons &&
                  modules[selectedModule].lessons.length > 0 && (
                    <div>
                      <div style={{ marginBottom: "15px" }}>
                        <label
                          style={{
                            display: "block",
                            marginBottom: "5px",
                            fontWeight: "bold",
                          }}
                        >
                          Lesson Title
                        </label>
                        <input
                          type="text"
                          value={
                            modules[selectedModule].lessons[selectedLesson]
                              ?.title || ""
                          }
                          onChange={(e) =>
                            updateLesson(
                              selectedModule,
                              selectedLesson,
                              "title",
                              e.target.value,
                            )
                          }
                          style={{
                            width: "100%",
                            padding: "8px",
                            border: "1px solid #ddd",
                            borderRadius: "4px",
                            fontSize: "14px",
                          }}
                          placeholder="Enter lesson title"
                        />
                      </div>

                      <div>
                        <label
                          style={{
                            display: "block",
                            marginBottom: "5px",
                            fontWeight: "bold",
                          }}
                        >
                          Lesson Content
                        </label>
                        <textarea
                          value={
                            modules[selectedModule].lessons[selectedLesson]
                              ?.content || ""
                          }
                          onChange={(e) =>
                            updateLesson(
                              selectedModule,
                              selectedLesson,
                              "content",
                              e.target.value,
                            )
                          }
                          rows={15}
                          style={{
                            width: "100%",
                            padding: "10px",
                            border: "1px solid #ddd",
                            borderRadius: "4px",
                            fontSize: "14px",
                            fontFamily: "monospace",
                            resize: "vertical",
                          }}
                          placeholder="Enter lesson content here...\n\nYou can use:\n- **Bold text**\n- *Italic text*\n- # Headers\n- Lists\n- Code blocks\n- And more!"
                        />
                      </div>

                      {/* Video Upload Section for Course Creators */}
                      <div style={{ marginTop: "20px" }}>
                        <VideoUpload
                          lessonId={`lesson-${selectedModule}-${selectedLesson}`}
                          moduleId={`module-${selectedModule}`}
                          onVideoUploaded={(videoUrl) => handleVideoUpload(videoUrl, selectedModule, selectedLesson)}
                          existingVideoUrl={modules[selectedModule]?.lessons[selectedLesson]?.videoUrl}
                        />
                      </div>

                      {/* Display existing video preview if available */}
                      {modules[selectedModule]?.lessons[selectedLesson]?.videoUrl && (
                        <div style={{
                          marginTop: "15px",
                          padding: "15px",
                          backgroundColor: "#f8f9fa",
                          border: "1px solid #e9ecef",
                          borderRadius: "8px"
                        }}>
                          <h4 style={{ margin: "0 0 10px 0", color: "#2c3e50" }}>
                            📹 Current Lesson Video
                          </h4>
                          <video
                            controls
                            style={{
                              width: "100%",
                              maxWidth: "400px",
                              height: "auto",
                              borderRadius: "4px"
                            }}
                          >
                            <source src={modules[selectedModule].lessons[selectedLesson].videoUrl} type="video/mp4" />
                            Your browser does not support the video tag.
                          </video>
                        </div>
                      )}
                    </div>
                  )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CourseEditor;
