import React, { useState, useEffect } from 'react';
import AppShell from './editor/AppShell';

const EnhancedEditorDemo = () => {
  const [content, setContent] = useState(`# Sample Lesson

## Learning Objectives
By the end of this lesson, you will be able to:
- Understand the basics of course editing
- Use templates for quick content creation
- Export content in multiple formats

## Lesson Content
This is a sample lesson to test the Course Editor functionality.

### Key Points
- **Rich text editing** capabilities
- **Templates** for quick content creation
- **Export** features for sharing
- **Auto-save** functionality

## Practice Activity
Try editing this content and see how the preview updates in real-time.

## Knowledge Check
1. What are the main features of this editor?
2. How does the two-pane layout improve the editing experience?

## Reflection
Consider how this enhanced editor interface improves your content creation workflow.`);

  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [saveStatus, setSaveStatus] = useState("Saved • just now");

  // Calculate statistics
  useEffect(() => {
    const words = content.trim().split(/\s+/).filter(word => word.length > 0).length;
    const chars = content.length;
    setWordCount(words);
    setCharCount(chars);
  }, [content]);

  // Template insertion functions
  const insertTemplate = (templateType) => {
    let template = '';
    
    switch (templateType) {
      case 'basic':
        template = `# Basic Lesson

## Learning Objectives
By the end of this lesson, you will be able to:
- Objective 1
- Objective 2
- Objective 3

## Lesson Content
Main content goes here...

### Key Concepts
- Concept 1
- Concept 2

## Practice Activity
Instructions for hands-on practice...

## Knowledge Check
1. Question 1
2. Question 2

## Reflection
Reflection prompts...`;
        break;
        
      case 'interactive':
        template = `# Interactive Lesson

## Getting Started
Welcome to this interactive lesson!

## Step 1: Introduction
Brief overview of what we'll cover...

### Your Turn
Try this: [Interactive prompt]

## Step 2: Deep Dive
More detailed exploration...

### Check Your Understanding
- Quick check question 1
- Quick check question 2

## Step 3: Application
Apply what you've learned...

### Interactive Exercise
Complete this hands-on activity...

## Wrap Up
Summary and next steps...`;
        break;
        
      case 'assessment':
        template = `# Assessment

## Instructions
Complete the following assessment.

## Multiple Choice
1. Question 1
   a) Option A
   b) Option B
   c) Option C
   d) Option D

2. Question 2
   a) Option A
   b) Option B
   c) Option C
   d) Option D

## Short Answer
1. Explain the concept...
2. Describe the process...

## Essay Question
Write a detailed response about...

## Answer Key
1. c) Option C
2. a) Option A`;
        break;
        
      default:
        return;
    }
    
    setContent(template);
    setSaveStatus("Modified • auto-saving...");
    setTimeout(() => setSaveStatus("Saved • just now"), 1000);
  };

  // Export functions
  const exportContent = (format) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lesson.${format === 'markdown' ? 'md' : 'txt'}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Render markdown to HTML (simple version)
  const renderMarkdown = (markdown) => {
    return markdown
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^\* (.*$)/gim, '<li>$1</li>')
      .replace(/^\- (.*$)/gim, '<li>$1</li>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br>');
  };

  // Editor component
  const editor = (
    <div className="space-y-4">
      {/* Template Selection */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-slate-700">📚 Templates</h3>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => insertTemplate('basic')}
            className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
          >
            📚 Basic Lesson
          </button>
          <button
            onClick={() => insertTemplate('interactive')}
            className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors"
          >
            🎯 Interactive Lesson
          </button>
          <button
            onClick={() => insertTemplate('assessment')}
            className="px-3 py-1 text-xs bg-purple-100 text-purple-700 rounded-md hover:bg-purple-200 transition-colors"
          >
            ✅ Assessment
          </button>
        </div>
      </div>

      {/* Content Editor */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-slate-700">✏️ Content Editor</h3>
        <textarea
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
            setSaveStatus("Modified • auto-saving...");
            setTimeout(() => setSaveStatus("Saved • just now"), 1000);
          }}
          className="w-full h-96 p-3 border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
          placeholder="Start typing your lesson content..."
        />
      </div>
    </div>
  );

  // Preview component with typography polish
  const preview = (
    <div 
      className="prose prose-slate max-w-none md:max-w-prose"
      dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
    />
  );

  return (
    <AppShell
      editor={editor}
      preview={preview}
      onTemplatesClick={() => console.log('Templates clicked')}
      onPreviewClick={() => console.log('Preview clicked')}
      onExportClick={() => exportContent('markdown')}
      onSaveClick={() => {
        setSaveStatus("Saving...");
        setTimeout(() => setSaveStatus("Saved • just now"), 500);
      }}
      wordCount={wordCount}
      charCount={charCount}
      saveStatus={saveStatus}
    />
  );
};

export default EnhancedEditorDemo;
