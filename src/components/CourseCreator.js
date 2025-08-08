import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

function CourseCreator() {
  const { currentUser } = useAuth();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    targetAudience: '',
    learningObjectives: '',
    duration: '',
    difficulty: 'beginner',
    category: '',
    additionalRequirements: ''
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCourse, setGeneratedCourse] = useState(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const generateCourseContent = async () => {
    setIsGenerating(true);
    try {
      // Simulate AI course generation (we'll implement real AI later)
      const mockCourseContent = {
        title: formData.title,
        description: formData.description,
        modules: [
          {
            id: 1,
            title: `Introduction to ${formData.title}`,
            lessons: [
              {
                id: 1,
                title: 'Getting Started',
                content: `Welcome to ${formData.title}! In this lesson, we'll cover the fundamentals and set up your learning environment.`,
                duration: '15 minutes'
              },
              {
                id: 2,
                title: 'Core Concepts',
                content: `Let's dive into the core concepts of ${formData.title}. Understanding these principles is crucial for your success.`,
                duration: '25 minutes'
              }
            ]
          },
          {
            id: 2,
            title: `Advanced ${formData.title} Techniques`,
            lessons: [
              {
                id: 3,
                title: 'Best Practices',
                content: `Now that you understand the basics, let's explore best practices and advanced techniques in ${formData.title}.`,
                duration: '30 minutes'
              },
              {
                id: 4,
                title: 'Real-world Applications',
                content: `Apply your knowledge with real-world examples and case studies in ${formData.title}.`,
                duration: '35 minutes'
              }
            ]
          }
        ],
        metadata: {
          targetAudience: formData.targetAudience,
          difficulty: formData.difficulty,
          estimatedDuration: formData.duration,
          category: formData.category
        }
      };

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 3000));
      setGeneratedCourse(mockCourseContent);
    } catch (error) {
      console.error('Error generating course:', error);
      alert('Failed to generate course. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const saveCourse = async () => {
    if (!generatedCourse) return;

    try {
      const courseData = {
        ...generatedCourse,
        createdBy: currentUser.uid,
        createdAt: serverTimestamp(),
        status: 'draft'
      };

      await addDoc(collection(db, 'courses'), courseData);
      alert('Course saved successfully!');
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        targetAudience: '',
        learningObjectives: '',
        duration: '',
        difficulty: 'beginner',
        category: '',
        additionalRequirements: ''
      });
      setGeneratedCourse(null);
    } catch (error) {
      console.error('Error saving course:', error);
      alert('Failed to save course. Please try again.');
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>🎓 Create New Course</h1>
      
      {!generatedCourse ? (
        <div style={{ backgroundColor: '#f8f9fa', padding: '30px', borderRadius: '8px' }}>
          <h2>Course Information</h2>
          
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Course Title *</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              placeholder="e.g., Introduction to React Development"
              style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ddd' }}
              required
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Course Description *</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Describe what students will learn in this course..."
              rows="4"
              style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ddd' }}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Target Audience</label>
              <input
                type="text"
                name="targetAudience"
                value={formData.targetAudience}
                onChange={handleInputChange}
                placeholder="e.g., Beginners, Professionals"
                style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ddd' }}
              />
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Category</label>
              <input
                type="text"
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                placeholder="e.g., Programming, Design, Business"
                style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ddd' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Difficulty Level</label>
              <select
                name="difficulty"
                value={formData.difficulty}
                onChange={handleInputChange}
                style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ddd' }}
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Estimated Duration</label>
              <input
                type="text"
                name="duration"
                value={formData.duration}
                onChange={handleInputChange}
                placeholder="e.g., 4 hours, 2 weeks"
                style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ddd' }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Learning Objectives</label>
            <textarea
              name="learningObjectives"
              value={formData.learningObjectives}
              onChange={handleInputChange}
              placeholder="What will students be able to do after completing this course?"
              rows="3"
              style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ddd' }}
            />
          </div>

          <div style={{ marginBottom: '30px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Additional Requirements</label>
            <textarea
              name="additionalRequirements"
              value={formData.additionalRequirements}
              onChange={handleInputChange}
              placeholder="Any specific topics, tools, or approaches you want included?"
              rows="3"
              style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ddd' }}
            />
          </div>

          <button
            onClick={generateCourseContent}
            disabled={!formData.title || !formData.description || isGenerating}
            style={{
              padding: '15px 30px',
              backgroundColor: isGenerating ? '#6c757d' : '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              cursor: isGenerating ? 'not-allowed' : 'pointer',
              width: '100%'
            }}
          >
            {isGenerating ? '🤖 Generating Course Content...' : '🚀 Generate Course with AI'}
          </button>
        </div>
      ) : (
        <div>
          <h2>✅ Generated Course Content</h2>
          <div style={{ backgroundColor: '#d4edda', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
            <h3>{generatedCourse.title}</h3>
            <p><strong>Description:</strong> {generatedCourse.description}</p>
            <p><strong>Modules:</strong> {generatedCourse.modules.length}</p>
            <p><strong>Total Lessons:</strong> {generatedCourse.modules.reduce((total, module) => total + module.lessons.length, 0)}</p>
          </div>

          <div style={{ display: 'flex', gap: '15px' }}>
            <button
              onClick={saveCourse}
              style={{
                padding: '12px 24px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              💾 Save Course
            </button>
            
            <button
              onClick={() => setGeneratedCourse(null)}
              style={{
                padding: '12px 24px',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              🔄 Create Another
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default CourseCreator;