# Course Editor Integration Package

## Overview
This package contains the files and documentation needed to integrate the professional TestEditorPage with the main course editing workflow.

## Current State

### Routing Configuration (App.js)
- **Legacy Route**: `/edit-course/:courseId` → `CourseEditor` component
- **Professional Route**: `/test-editor` → `TestEditorPage` component (standalone)
- **Goal**: Integrate TestEditorPage into course editing workflow without breaking existing functionality

### Key Components

#### 1. TestEditorPage (Professional Editor)
- **Location**: `/src/pages/TestEditorPage.tsx` (1000 lines)
- **Status**: ✅ Fully functional standalone editor
- **Features**: 18 professional enhancements including:
  - TipTap rich text editor with toolbar
  - Real-time preview pane
  - Dark mode with CSS tokens
  - Template system (slash commands)
  - Auto-save and versioning
  - Outline navigation
  - Search functionality
  - Export capabilities
  - Keyboard shortcuts
  - Floating format bar
  - Content validation

#### 2. CourseEditor (Legacy Editor)
- **Location**: `/src/components/CourseEditor.js` (832 lines)
- **Status**: ⚠️ Legacy component for comparison
- **Features**: Basic course editing with Firestore integration
- **Data Flow**: Loads course from Firestore, edits modules/lessons, saves back

## Integration Challenges

### 1. Data Structure Mismatch
**TestEditorPage**: Uses simple HTML content with localStorage
```javascript
// Current save method
localStorage.setItem('course-editor-content', content);
```

**CourseEditor**: Uses complex nested structure with Firestore
```javascript
// Course structure
{
  title, description, category, difficulty,
  modules: [{
    name, lessons: [{
      title, content, duration, multimedia
    }]
  }]
}
```

### 2. Content Loading
**TestEditorPage**: Loads hardcoded sample content
```javascript
const [content, setContent] = useState(`<h1>Sample Lesson</h1>...`);
```

**CourseEditor**: Loads from Firestore with complex processing
```javascript
const processedModules = (courseData.modules || []).map(module => ({
  lessons: module.lessons.map(lesson => ({
    content: lesson.content || lesson.markdownContent || ""
  }))
}));
```

### 3. Save Integration
**TestEditorPage**: Simple localStorage save
**CourseEditor**: Complex Firestore updates with validation

## Proposed Integration Strategies

### Option 1: Non-Destructive Wrapper (Recommended)
Create `CourseEditorIntegrated.js` that wraps TestEditorPage:

```javascript
import TestEditorPage from '../pages/TestEditorPage';
import { useCourseData } from '../hooks/useCourseData';

export default function CourseEditorIntegrated({ courseId }) {
  const { course, loading, saveCourse } = useCourseData(courseId);
  
  // Format lesson content for TestEditorPage
  const formatLessonForEditor = (course) => {
    if (!course?.modules?.[selectedModule]?.lessons?.[selectedLesson]) {
      return '<h1>New Lesson</h1><p>Start writing...</p>';
    }
    return course.modules[selectedModule].lessons[selectedLesson].content;
  };
  
  const handleSave = (content) => {
    const updatedCourse = { ...course };
    updatedCourse.modules[selectedModule].lessons[selectedLesson].content = content;
    saveCourse(updatedCourse);
  };
  
  if (loading) return <div>Loading course...</div>;
  
  return (
    <TestEditorPage 
      initialContent={formatLessonForEditor(course)}
      onSave={handleSave}
      courseMetadata={course}
    />
  );
}
```

### Option 2: URL Parameter Enhancement
Modify TestEditorPage to accept optional courseId:
- Route: `/test-editor/:courseId?`
- Load course data when courseId provided
- Fallback to standalone mode when no courseId

### Option 3: Route Replacement
Replace `/edit-course/:courseId` route with enhanced TestEditorPage

## Required Modifications

### TestEditorPage Enhancements Needed
1. **Props Interface**: Accept `initialContent`, `onSave`, `courseMetadata`
2. **Dynamic Content Loading**: Replace hardcoded sample content
3. **Save Method Override**: Replace localStorage with custom save function
4. **Course Context**: Display course/module/lesson information

### New Components/Hooks Needed
1. **useCourseData Hook**: Handle Firestore course loading/saving
2. **CourseEditorIntegrated Component**: Wrapper for TestEditorPage
3. **Course Navigation**: Module/lesson selector UI

## Data Flow Documentation

### Current TestEditorPage Flow
```
User Input → TipTap Editor → HTML Content → localStorage
                ↓
            Preview Pane ← HTML Content
```

### Proposed Integrated Flow
```
Firestore → Course Data → Format for Editor → TestEditorPage
    ↑                                              ↓
Save Course ← Format for Storage ← Editor Content ← User Input
```

## Files Included in Package

1. **App.js** - Current routing configuration
2. **TestEditorPage.tsx** - Professional editor (complete)
3. **CourseEditor.js** - Legacy editor for comparison
4. **INTEGRATION_PACKAGE.md** - This documentation

## Critical Requirements

1. **Preserve TestEditorPage**: Do not modify the core professional editor
2. **Non-Breaking**: Existing CourseEditor workflows must continue working
3. **Data Integrity**: Ensure proper course data handling and validation
4. **User Experience**: Maintain the professional editor's UX quality

## Next Steps

1. Review integration strategy with consultant
2. Create useCourseData hook for Firestore integration
3. Build CourseEditorIntegrated wrapper component
4. Update routing configuration
5. Test integration thoroughly
6. Migrate existing courses if needed

## Contact

For questions about this integration package, refer to the development team or external consultant.
