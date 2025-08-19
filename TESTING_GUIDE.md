# Course Editor Panel Testing Guide 🧪

## Quick Start Testing

### 1. **Start the Development Server**
```bash
cd /Users/mahama/new_course_creator_app/course-maker-app
npm start
```

### 2. **Access the Test Page**
1. Navigate to `http://localhost:3000`
2. Login with your credentials
3. Go to `http://localhost:3000/test-editor` (or add `/test-editor` to the URL)

## Testing Checklist ✅

### **Core Editor Features**
- [ ] **Rich Text Formatting**
  - Bold, italic, underline, strikethrough
  - Bullet lists, numbered lists, task lists
  - Headings (H1, H2, H3)
  - Blockquotes and code blocks
  - Text alignment (left, center, right)

- [ ] **Toolbar Functionality**
  - All toolbar buttons respond correctly
  - Keyboard shortcuts work (Ctrl+B for bold, etc.)
  - Toolbar collapses properly on mobile
  - Format state updates correctly (bold button highlights when text is bold)

### **Templates System**
- [ ] **Templates Button**
  - Click "📚 Templates" button opens dropdown
  - All 5 templates are visible with descriptions
  - Templates are categorized correctly
  - Clicking a template inserts content

- [ ] **Template Content**
  - Basic Lesson template inserts complete structure
  - Interactive Lesson includes engagement elements
  - Assessment template has proper quiz format
  - Multimedia template includes media placeholders
  - Discussion template has collaboration elements

### **Slash Commands**
- [ ] **Slash Command Detection**
  - Type "/" anywhere in editor
  - Command menu appears with search
  - Arrow keys navigate menu
  - Enter selects command
  - Escape closes menu

- [ ] **Command Execution**
  - "/objectives" inserts learning objectives
  - "/activity" inserts practice activity
  - "/table" creates a 3x3 table
  - "/image" prompts for image URL
  - "/code" creates code block

### **Side Panel Features**
- [ ] **Panel Toggle**
  - Side panel opens/closes with button
  - Panel is responsive on mobile
  - Tabs switch correctly (Outline, Comments, Versions)

- [ ] **Outline Panel**
  - Auto-generates outline from headings
  - Clicking outline items scrolls to content
  - Outline updates as headings change

- [ ] **Comments Panel**
  - Can add new comments
  - Comments show timestamp and user
  - Can resolve/unresolve comments
  - Comments persist across sessions

- [ ] **Versions Panel**
  - Shows auto-save status
  - Displays version history
  - Can restore previous versions
  - Version timestamps are accurate

### **Validation System**
- [ ] **Real-time Validation**
  - Validation panel shows/hides based on errors
  - Zod schema validates lesson structure
  - Error messages are clear and helpful
  - Validation updates as content changes

- [ ] **Test Validation Errors**
  - Remove "## Learning Objectives" heading → should show error
  - Add invalid content structure → should show warning
  - Fix errors → validation panel should disappear

### **Auto-Save & Storage**
- [ ] **Auto-Save Functionality**
  - Content saves automatically every 30 seconds
  - Save status indicator updates correctly
  - Draft persists in localStorage
  - Manual save works with Ctrl+S

- [ ] **Storage Integration**
  - localStorage stores drafts and versions
  - Firestore integration works for manual saves
  - Data persists across browser sessions
  - Version history is maintained

### **Export Features**
- [ ] **Export Options**
  - Export panel accessible from side panel
  - Markdown export downloads correctly
  - HTML export includes styling
  - PDF export generates properly

- [ ] **Export Content**
  - Exported content matches editor content
  - Formatting is preserved in exports
  - Metadata is included when selected

### **Responsive Design**
- [ ] **Mobile Testing**
  - Resize browser to mobile width
  - Toolbar collapses to hamburger menu
  - Side panel adapts to mobile layout
  - Touch interactions work properly

- [ ] **Tablet Testing**
  - Test at tablet breakpoints
  - Ensure all features remain accessible
  - Check touch target sizes

### **Accessibility Testing**
- [ ] **Keyboard Navigation**
  - Tab through all interactive elements
  - Keyboard shortcuts work correctly
  - Focus indicators are visible
  - Screen reader compatibility

- [ ] **ARIA Labels**
  - Toolbar buttons have proper labels
  - Form elements are properly labeled
  - Status messages are announced

## Advanced Testing Scenarios

### **Performance Testing**
1. **Large Content**: Paste 10,000+ words and test responsiveness
2. **Multiple Operations**: Rapid formatting changes, undo/redo
3. **Auto-save Load**: Test with frequent content changes

### **Error Handling**
1. **Network Issues**: Disconnect internet, test offline functionality
2. **Invalid Data**: Test with corrupted localStorage data
3. **API Failures**: Test Firestore connection failures

### **Integration Testing**
1. **Existing Course Data**: Test loading legacy course formats
2. **Migration**: Test backward compatibility utilities
3. **Export Integration**: Test exported content in CoursePreview

## Debugging Tips 🔧

### **Console Logging**
- Open browser DevTools (F12)
- Check Console tab for errors or warnings
- Look for Zustand store state changes
- Monitor auto-save and validation logs

### **Common Issues**
1. **Templates not loading**: Check lessonTemplates.ts import
2. **Slash commands not working**: Verify detectSlashCommand function
3. **Validation errors**: Check Zod schema in types/schema.ts
4. **Auto-save failing**: Check localStorage permissions

### **Performance Monitoring**
- Use React DevTools Profiler
- Monitor TipTap editor performance
- Check for memory leaks in long sessions

## Test Data 📊

### **Sample Content for Testing**
```markdown
# Test Lesson

## Learning Objectives
- Test objective 1
- Test objective 2

## Lesson Content
This is test content for validation.

## Practice Activity
Test activity instructions.

## Knowledge Check
- Test question 1
- Test question 2
```

### **Validation Test Cases**
1. **Missing sections**: Remove required headings
2. **Empty content**: Leave sections blank
3. **Invalid structure**: Wrong heading hierarchy
4. **Malformed lists**: Broken bullet points

## Reporting Issues 🐛

When reporting issues, include:
1. **Steps to reproduce**
2. **Expected vs actual behavior**
3. **Browser and version**
4. **Console error messages**
5. **Screenshots if relevant**

## Success Criteria ✨

The Course Editor Panel passes testing if:
- ✅ All core editing features work smoothly
- ✅ Templates insert correctly and are well-formatted
- ✅ Slash commands provide quick content insertion
- ✅ Validation catches structural issues
- ✅ Auto-save and manual save work reliably
- ✅ Export features generate proper output
- ✅ Responsive design works on all devices
- ✅ Accessibility standards are met
- ✅ Performance is acceptable for typical use

---

**Happy Testing! 🚀**

For questions or issues, check the console logs and refer to the component documentation in the source files.
