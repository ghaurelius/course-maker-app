// src/pages/TestEditorSandbox.tsx
import React, { useMemo } from 'react';
import TestEditorPage from './TestEditorPage';

const LS_KEY = 'course-editor-content';

export default function TestEditorSandbox() {
  const initialHTML = useMemo(() => {
    const cached = localStorage.getItem(LS_KEY);
    return cached || `<h1>New Lesson</h1><p>Start writing…</p>`;
  }, []);

  return (
    <TestEditorPage
      initialHTML={initialHTML}
      autosave={{ enabled: true, intervalMs: 5000 }}
      onChange={({ html }) => {
        // Keep a rolling cache in localStorage while editing
        localStorage.setItem(LS_KEY, html);
      }}
      // No onSave -> Save button + autosave will write to localStorage only
    />
  );
}
