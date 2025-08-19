import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import TestEditorPage from '../pages/TestEditorPage';
import { mdToHtml, htmlToMarkdown } from '../editor/adapters/contentAdapter';
import { getLessonContent, shouldWarnAboutSize, formatBytes } from '../utils/contentLoader';
import { saveCourseWithOffload } from '../hooks/useCourseSave';

type IntegratedCourseEditorProps = {
  // Optional override props
  courseId?: string;
  moduleIndex?: number;
  lessonIndex?: number;
};

export default function IntegratedCourseEditor({
  courseId: propCourseId,
  moduleIndex: propModuleIndex,
  lessonIndex: propLessonIndex,
}: IntegratedCourseEditorProps = {}) {
  const { courseId: paramCourseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  // Use props or URL params
  const courseId = propCourseId || paramCourseId;
  const moduleIndex = propModuleIndex ?? 0;
  const lessonIndex = propLessonIndex ?? 0;
  
  // State
  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [initialContent, setInitialContent] = useState<string>('');
  const [contentLoaded, setContentLoaded] = useState(false);

  // Load course data
  useEffect(() => {
    const loadCourse = async () => {
      if (!courseId || !currentUser) {
        setError('Missing course ID or user authentication');
        setLoading(false);
        return;
      }

      try {
        const courseDoc = await getDoc(doc(db, 'courses', courseId));
        if (!courseDoc.exists()) {
          setError('Course not found');
          setLoading(false);
          return;
        }

        const courseData = { id: courseDoc.id, ...courseDoc.data() };
        setCourse(courseData);
        setError(null);
      } catch (err) {
        console.error('Error loading course:', err);
        setError('Failed to load course');
      } finally {
        setLoading(false);
      }
    };

    loadCourse();
  }, [courseId, currentUser]);

  // Get current lesson content with Cloud Storage support
  const getCurrentLessonContent = async (): Promise<string> => {
    if (!course?.modules?.[moduleIndex]?.lessons?.[lessonIndex]) {
      return '<h1>New Lesson</h1><p>Start writing your lesson content here...</p>';
    }
    
    const lesson = course.modules[moduleIndex].lessons[lessonIndex];
    
    // Load content from Cloud Storage if needed
    const content = await getLessonContent(lesson);
    
    if (!content) {
      return '<h1>New Lesson</h1><p>Start writing your lesson content here...</p>';
    }
    
    // Convert markdown to HTML if needed
    if (typeof content === 'string' && !content.trim().startsWith('<')) {
      return mdToHtml(content);
    }
    return content;
  };

  // Save lesson content
  const handleSave = async ({ html, markdown }: { html: string; markdown: string }) => {
    if (!course || !courseId) return;
    
    setSaving(true);
    try {
      // Update the course data structure
      const updatedCourse = { ...course };
      if (!updatedCourse.modules[moduleIndex]) {
        updatedCourse.modules[moduleIndex] = { lessons: [] };
      }
      if (!updatedCourse.modules[moduleIndex].lessons[lessonIndex]) {
        updatedCourse.modules[moduleIndex].lessons[lessonIndex] = {};
      }
      
      // Check content size and warn if large
      if (shouldWarnAboutSize(html)) {
        console.warn(`⚠️ Large lesson content: ${formatBytes(new Blob([html]).size)}`);
      }
      
      // Store as HTML for rich editing, but keep markdown for export
      updatedCourse.modules[moduleIndex].lessons[lessonIndex].content = html;
      updatedCourse.modules[moduleIndex].lessons[lessonIndex].markdown = markdown;
      
      // Use the offload system to save the course
      await saveCourseWithOffload(courseId, updatedCourse);
      
      setCourse(updatedCourse);
      setLastSaved(new Date());
      console.log('✅ Lesson saved successfully with offload support');
    } catch (err) {
      console.error('Error saving lesson:', err);
      throw new Error('Failed to save lesson');
    } finally {
      setSaving(false);
    }
  };

  // Handle content changes with size monitoring
  const handleChange = ({ html, markdown }: { html: string; markdown: string }) => {
    // Monitor content size and warn user
    if (shouldWarnAboutSize(html)) {
      console.warn(`⚠️ Large lesson content: ${formatBytes(new Blob([html]).size)} - consider splitting`);
    }
    console.log('Content changed, length:', html.length);
  };

  // Load initial content asynchronously
  useEffect(() => {
    const loadInitialContent = async () => {
      if (course) {
        try {
          const content = await getCurrentLessonContent();
          setInitialContent(content);
          setContentLoaded(true);
        } catch (err) {
          console.error('Error loading initial content:', err);
          setInitialContent('<h1>New Lesson</h1><p>Start writing your lesson content here...</p>');
          setContentLoaded(true);
        }
      }
    };

    loadInitialContent();
  }, [course, moduleIndex, lessonIndex]);

  if (loading || !contentLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading course...</div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Error Loading Course</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Get course context for the editor
  const courseContext = {
    courseId,
    moduleIndex,
    lessonIndex,
    courseTitle: course?.title || 'Untitled Course',
  };

  // Autosave configuration
  const autosaveConfig = {
    enabled: true,
    intervalMs: 3000, // Save every 3 seconds
  };

  return (
    <div className="integrated-course-editor">
      {/* Status bar */}
      <div className="bg-gray-50 border-b px-4 py-2 text-sm text-gray-600">
        <div className="flex items-center justify-between">
          <div>
            Editing: <strong>{course?.title}</strong> • Module {moduleIndex + 1} • Lesson {lessonIndex + 1}
          </div>
          <div className="flex items-center gap-4">
            {saving && (
              <span className="text-blue-600">
                <span className="animate-spin inline-block w-3 h-3 border border-blue-600 border-t-transparent rounded-full mr-1"></span>
                Saving...
              </span>
            )}
            {lastSaved && !saving && (
              <span className="text-green-600">
                ✓ Saved {lastSaved.toLocaleTimeString()}
              </span>
            )}
            <button
              onClick={() => navigate('/dashboard')}
              className="text-gray-500 hover:text-gray-700"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>

      {/* Professional Editor */}
      <TestEditorPage
        initialHTML={initialContent}
        onSave={handleSave}
        onChange={handleChange}
        autosave={{ enabled: true, intervalMs: 30000 }}
        courseContext={courseContext}
        readOnly={false}
      />
    </div>
  );
}
