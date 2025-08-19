import React, { useState, useEffect } from 'react';
import AppShell from './editor/AppShell';
import { RichTextEditor } from './editor/RichTextEditor';
import { TemplateCards } from './editor/TemplateCards';

const RichTextEditorDemo = () => {
  const [content, setContent] = useState(`<h1>Sample Lesson</h1>

<h2>Learning Objectives</h2>
<p>By the end of this lesson, you will be able to:</p>
<ul>
<li>Understand the basics of course editing</li>
<li>Use templates for quick content creation</li>
<li>Export content in multiple formats</li>
</ul>

<h2>Lesson Content</h2>
<p>This is a sample lesson to test the <strong>Course Editor</strong> functionality.</p>

<h3>Key Points</h3>
<ul>
<li><strong>Rich text editing</strong> capabilities</li>
<li><strong>Templates</strong> for quick content creation</li>
<li><strong>Export</strong> features for sharing</li>
<li><strong>Auto-save</strong> functionality</li>
</ul>

<h2>Practice Activity</h2>
<p>Try editing this content and see how the preview updates in real-time.</p>

<h2>Knowledge Check</h2>
<ol>
<li>What are the main features of this editor?</li>
<li>How does the two-pane layout improve the editing experience?</li>
</ol>

<h2>Reflection</h2>
<p>Consider how this enhanced editor interface improves your content creation workflow.</p>`);

  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [saveStatus, setSaveStatus] = useState("Saved • just now");
  const [showTemplates, setShowTemplates] = useState(false);

  // Handle statistics updates from the editor
  const handleStatsChange = (stats: { characters: number; words: number }) => {
    setWordCount(stats.words);
    setCharCount(stats.characters);
  };

  // Handle content changes
  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    setSaveStatus("Modified • auto-saving...");
    setTimeout(() => setSaveStatus("Saved • just now"), 1000);
  };

  // Template insertion functions
  const insertTemplate = (templateType: string) => {
    let template = '';
    
    switch (templateType) {
      case 'basic':
        template = `<h1>Basic Lesson</h1>

<h2>Learning Objectives</h2>
<p>By the end of this lesson, you will be able to:</p>
<ul>
<li>Objective 1</li>
<li>Objective 2</li>
<li>Objective 3</li>
</ul>

<h2>Lesson Content</h2>
<p>Main content goes here...</p>

<h3>Key Concepts</h3>
<ul>
<li>Concept 1</li>
<li>Concept 2</li>
</ul>

<h2>Practice Activity</h2>
<p>Instructions for hands-on practice...</p>

<h2>Knowledge Check</h2>
<ol>
<li>Question 1</li>
<li>Question 2</li>
</ol>

<h2>Reflection</h2>
<p>Reflection prompts...</p>`;
        break;
        
      case 'interactive':
        template = `<h1>Interactive Lesson</h1>

<h2>Getting Started</h2>
<p>Welcome to this interactive lesson!</p>

<h2>Step 1: Introduction</h2>
<p>Brief overview of what we'll cover...</p>

<h3>Your Turn</h3>
<blockquote>
<p>Try this: [Interactive prompt]</p>
</blockquote>

<h2>Step 2: Deep Dive</h2>
<p>More detailed exploration...</p>

<h3>Check Your Understanding</h3>
<ul>
<li>Quick check question 1</li>
<li>Quick check question 2</li>
</ul>

<h2>Step 3: Application</h2>
<p>Apply what you've learned...</p>

<h3>Interactive Exercise</h3>
<p>Complete this hands-on activity...</p>

<h2>Wrap Up</h2>
<p>Summary and next steps...</p>`;
        break;
        
      case 'assessment':
        template = `<h1>Assessment</h1>

<h2>Instructions</h2>
<p>Complete the following assessment.</p>

<h2>Multiple Choice</h2>
<ol>
<li><strong>Question 1</strong><br>
a) Option A<br>
b) Option B<br>
c) Option C<br>
d) Option D</li>
<li><strong>Question 2</strong><br>
a) Option A<br>
b) Option B<br>
c) Option C<br>
d) Option D</li>
</ol>

<h2>Short Answer</h2>
<ol>
<li>Explain the concept...</li>
<li>Describe the process...</li>
</ol>

<h2>Essay Question</h2>
<p>Write a detailed response about...</p>

<h2>Answer Key</h2>
<ol>
<li>c) Option C</li>
<li>a) Option A</li>
</ol>`;
        break;
        
      default:
        return;
    }
    
    setContent(template);
    setSaveStatus("Modified • auto-saving...");
    setTimeout(() => setSaveStatus("Saved • just now"), 1000);
    setShowTemplates(false);
  };

  // Export functions
  const exportContent = (format: string) => {
    let exportData = content;
    let filename = 'lesson';
    let mimeType = 'text/plain';

    if (format === 'markdown') {
      // Convert HTML to Markdown (simplified)
      exportData = content
        .replace(/<h1>(.*?)<\/h1>/g, '# $1')
        .replace(/<h2>(.*?)<\/h2>/g, '## $1')
        .replace(/<h3>(.*?)<\/h3>/g, '### $1')
        .replace(/<strong>(.*?)<\/strong>/g, '**$1**')
        .replace(/<em>(.*?)<\/em>/g, '*$1*')
        .replace(/<li>(.*?)<\/li>/g, '- $1')
        .replace(/<\/?(ul|ol|p|br)>/g, '')
        .replace(/<blockquote><p>(.*?)<\/p><\/blockquote>/g, '> $1');
      filename = 'lesson.md';
      mimeType = 'text/markdown';
    } else if (format === 'html') {
      filename = 'lesson.html';
      mimeType = 'text/html';
    }

    const blob = new Blob([exportData], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Editor component with templates
  const editor = (
    <div className="space-y-4">
      {showTemplates && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-slate-700">📚 Choose a Template</h3>
            <button
              onClick={() => setShowTemplates(false)}
              className="text-xs text-slate-500 hover:text-slate-700"
            >
              Hide Templates
            </button>
          </div>
          <TemplateCards onChoose={insertTemplate} />
        </div>
      )}

      <RichTextEditor
        content={content}
        onChange={handleContentChange}
        onStatsChange={handleStatsChange}
        placeholder="Start typing your lesson content..."
      />
    </div>
  );

  // Preview component with typography polish
  const preview = (
    <div 
      className="prose prose-slate max-w-none md:max-w-prose"
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );

  return (
    <div className="editor-container">
      <AppShell
      editor={editor}
      preview={preview}
      onTemplatesClick={() => setShowTemplates(!showTemplates)}
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
    </div>
  );
};

export default RichTextEditorDemo;
