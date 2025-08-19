import React, { useState } from 'react';

const SimpleEditorDemo = () => {
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
Try editing this content:
1. Change the title above
2. Add your own bullet points
3. Create new sections
4. Test the template insertion

## Knowledge Check
- Can you modify this content?
- Can you see the templates working?
- Does the preview update correctly?
`);

  const [selectedTemplate, setSelectedTemplate] = useState('');

  const templates = [
    {
      id: 'basic',
      name: 'Basic Lesson',
      icon: '📚',
      content: `# New Lesson

## Learning Objectives
- Objective 1
- Objective 2
- Objective 3

## Lesson Content
Your lesson content goes here.

## Practice Activity
Instructions for the activity.

## Knowledge Check
- Question 1
- Question 2
`
    },
    {
      id: 'interactive',
      name: 'Interactive Lesson',
      icon: '🎯',
      content: `# Interactive Lesson

## Learning Objectives
- Interactive objective 1
- Interactive objective 2

## Warm-Up Activity
Quick engagement activity.

## Core Content
Main lesson content with interactions.

## Group Activity
Collaborative learning exercise.

## Reflection
Individual reflection prompts.
`
    },
    {
      id: 'assessment',
      name: 'Assessment',
      icon: '✅',
      content: `# Assessment

## Instructions
Complete the following assessment.

## Multiple Choice
1. Question 1
   a) Option A
   b) Option B
   c) Option C

## Short Answer
1. Explain the concept...
2. Describe the process...

## Essay Question
Write a detailed response about...
`
    }
  ];

  const insertTemplate = (template) => {
    setContent(template.content);
    setSelectedTemplate('');
  };

  const exportContent = (format) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `lesson.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const stats = {
    characters: content.length,
    words: content.trim().split(/\s+/).length,
    lines: content.split('\n').length
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Course Editor Panel Demo 🎉
          </h1>
          <p className="text-gray-600 mb-6">
            This simplified demo shows the core functionality of the Course Editor Panel.
            The full version with TipTap will be available once we resolve the dependency issues.
          </p>
          
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Sidebar */}
            <div className="lg:col-span-1 space-y-4">
              {/* Templates */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-3">📚 Templates</h3>
                <div className="space-y-2">
                  {templates.map(template => (
                    <button
                      key={template.id}
                      onClick={() => insertTemplate(template)}
                      className="w-full text-left p-2 bg-white rounded border hover:bg-blue-50 hover:border-blue-300 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span>{template.icon}</span>
                        <span className="text-sm font-medium">{template.name}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Export */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-3">📤 Export</h3>
                <div className="space-y-2">
                  <button
                    onClick={() => exportContent('md')}
                    className="w-full p-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                  >
                    Export Markdown
                  </button>
                  <button
                    onClick={() => exportContent('txt')}
                    className="w-full p-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                  >
                    Export Text
                  </button>
                </div>
              </div>

              {/* Stats */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-3">📊 Stats</h3>
                <div className="text-sm space-y-1">
                  <div>Characters: {stats.characters}</div>
                  <div>Words: {stats.words}</div>
                  <div>Lines: {stats.lines}</div>
                </div>
              </div>
            </div>
            
            {/* Editor */}
            <div className="lg:col-span-3">
              <div className="bg-white border rounded-lg">
                <div className="border-b p-3 bg-gray-50">
                  <h3 className="font-semibold">Content Editor</h3>
                  <p className="text-sm text-gray-600">Edit your lesson content below</p>
                </div>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full h-96 p-4 border-none resize-none focus:outline-none font-mono text-sm"
                  placeholder="Start typing your lesson content..."
                />
              </div>
            </div>
          </div>
        </div>
        
        {/* Preview */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">📖 Preview</h2>
          <div className="prose max-w-none">
            <pre className="whitespace-pre-wrap font-sans text-gray-800 leading-relaxed">
              {content}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimpleEditorDemo;
