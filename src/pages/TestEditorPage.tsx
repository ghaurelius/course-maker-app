// FILE: src/pages/TestEditorPage.tsx
// A self-contained /test-editor page: TipTap editor (left), live Preview (middle),
// Outline + Stats + Quick Actions (right). No external helpers required.

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from "@tiptap/extension-character-count";
import Highlight from '@tiptap/extension-highlight';
import { Bold, Italic, Underline as UnderIcon, Strikethrough, List, ListOrdered, Quote, Code, AlignLeft, AlignCenter, AlignRight, Undo2, Redo2, BookOpen, Sparkles, Eye, Download, Save } from "lucide-react";
import "../styles/editor.css";
import { insertTemplate } from '../editor/commands';
import { runChecks } from '../lib/validation/runChecks';
import { normalizeMarkdown } from '../lib/format/normalize';
import { ExportMenu } from '../components/ExportMenu';
import { ShortcutsHelp } from '../components/ShortcutsHelp';
import { saveVersion, listVersions, restoreVersion } from '../lib/persistence/versions';
import EditorSearchBar from '../components/EditorSearchBar';
import { initCollab } from '../editor/collab';
import { useTheme } from '../hooks/useTheme';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { htmlToMarkdown } from '../editor/adapters/contentAdapter';
import { confirmDialog } from '../components/ui/confirmDialog';
import { SafePaste } from '../editor/extensions/SafePaste';
import { SlashHotkey } from '../editor/extensions/SlashHotkey';

function EditorToolbar({ editor }: { editor: Editor | null }) {
  if (!editor) return null;
  const Btn = ({ onClick, pressed, label, children }: any) => (
    <button
      type="button"
      aria-label={label}
      aria-pressed={pressed ? "true" : "false"}
      onClick={onClick}
      className={`ce-btn ${pressed ? "active" : ""}`}
    >
      {children}
    </button>
  );
  return (
    <div role="toolbar" aria-label="Formatting" className="ce-toolbar">
      <Btn label="Bold" pressed={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}><Bold size={18} strokeWidth={2.2}/></Btn>
      <Btn label="Italic" pressed={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic size={18} strokeWidth={2.2}/></Btn>
      <Btn label="Underline" pressed={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()}><UnderIcon size={18} strokeWidth={2.2}/></Btn>
      <Btn label="Strike" pressed={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()}><Strikethrough size={18} strokeWidth={2.2}/></Btn>
      <span className="ce-divider" />
      <Btn label="Bulleted list" pressed={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}><List size={18} strokeWidth={2.2}/></Btn>
      <Btn label="Numbered list" pressed={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered size={18} strokeWidth={2.2}/></Btn>
      <Btn label="Quote" pressed={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}><Quote size={18} strokeWidth={2.2}/></Btn>
      <Btn label="Code" pressed={editor.isActive("code")} onClick={() => editor.chain().focus().toggleCode().run()}><Code size={18} strokeWidth={2.2}/></Btn>
      <span className="ce-divider" />
      <Btn label="Align left" pressed={editor.isActive({ textAlign: "left" })} onClick={() => editor.chain().focus().setTextAlign("left").run()}><AlignLeft size={18} strokeWidth={2.2}/></Btn>
      <Btn label="Align center" pressed={editor.isActive({ textAlign: "center" })} onClick={() => editor.chain().focus().setTextAlign("center").run()}><AlignCenter size={18} strokeWidth={2.2}/></Btn>
      <Btn label="Align right" pressed={editor.isActive({ textAlign: "right" })} onClick={() => editor.chain().focus().setTextAlign("right").run()}><AlignRight size={18} strokeWidth={2.2}/></Btn>
      <span className="ce-divider" />
      <Btn label="Undo" onClick={() => editor.chain().focus().undo().run()}><Undo2 size={18} strokeWidth={2.2}/></Btn>
      <Btn label="Redo" onClick={() => editor.chain().focus().redo().run()}><Redo2 size={18} strokeWidth={2.2}/></Btn>
    </div>
  );
}

// Template Selection Menu Component
function TemplateMenu({ 
  show, 
  position, 
  onSelect, 
  onClose 
}: { 
  show: boolean; 
  position: { top: number; left: number }; 
  onSelect: (type: string) => void; 
  onClose: () => void; 
}) {
  if (!show) return null;

  const templates = [
    { key: 'LO', label: '📚 Learning Objectives', desc: 'Add lesson objectives and outcomes' },
    { key: 'Content', label: '📝 Lesson Content', desc: 'Add main lesson content section' },
    { key: 'Activity', label: '🎯 Practice Activity', desc: 'Add hands-on learning activity' },
    { key: 'Reflection', label: '💭 Reflection Questions', desc: 'Add reflective thinking prompts' },
    { key: 'Quiz', label: '❓ Knowledge Check', desc: 'Add quiz or assessment questions' }
  ];

  // Calculate available space and adjust menu height
  const viewportHeight = window.innerHeight;
  const availableSpace = viewportHeight - position.top - 40; // 40px buffer
  const maxMenuHeight = Math.min(300, Math.max(200, availableSpace));

  return (
    <div 
      className="template-menu"
      style={{
        position: 'fixed',
        top: position.top,
        left: position.left,
        zIndex: 1000,
        background: 'white',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        padding: '8px',
        minWidth: '300px',
        maxHeight: `${maxMenuHeight}px`,
        overflowY: 'auto'
      }}
    >
      <div style={{ 
        fontSize: '12px', 
        color: '#64748b', 
        padding: '8px 12px 4px', 
        fontWeight: '500' 
      }}>
        Select a template to insert:
      </div>
      {templates.map((template) => (
        <button
          key={template.key}
          className="template-option"
          onClick={() => onSelect(template.key)}
          style={{
            width: '100%',
            padding: '12px',
            border: 'none',
            background: 'transparent',
            textAlign: 'left',
            borderRadius: '6px',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
            transition: 'background-color 0.15s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#f8fafc';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <div style={{ fontWeight: '500', fontSize: '14px', color: '#1e293b' }}>
            {template.label}
          </div>
          <div style={{ fontSize: '12px', color: '#64748b' }}>
            {template.desc}
          </div>
        </button>
      ))}
      <div style={{ 
        borderTop: '1px solid #e2e8f0', 
        marginTop: '4px', 
        paddingTop: '8px' 
      }}>
        <button
          onClick={onClose}
          style={{
            width: '100%',
            padding: '8px 12px',
            border: 'none',
            background: 'transparent',
            color: '#64748b',
            fontSize: '12px',
            cursor: 'pointer',
            borderRadius: '4px'
          }}
        >
          Press Escape to cancel
        </button>
      </div>
    </div>
  );
}

// Floating Format Toolbar Component (always visible when text is selected)
function FloatingFormatBar({ editor }: { editor: Editor | null }) {
  const [hasSelection, setHasSelection] = useState(false);

  useEffect(() => {
    if (!editor) return;

    const updateSelection = () => {
      const { selection } = editor.state;
      const { from, to } = selection;
      setHasSelection(from !== to);
    };

    editor.on('selectionUpdate', updateSelection);
    editor.on('focus', updateSelection);
    editor.on('blur', () => setTimeout(() => setHasSelection(false), 100));

    return () => {
      editor.off('selectionUpdate', updateSelection);
      editor.off('focus', updateSelection);
      editor.off('blur');
    };
  }, [editor]);

  if (!hasSelection || !editor) return null;

  return (
    <div 
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        zIndex: 1000,
        background: 'white',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        padding: '8px',
        display: 'flex',
        gap: '4px',
        alignItems: 'center'
      }}
    >
      <div style={{ 
        fontSize: '11px', 
        color: '#64748b', 
        marginRight: '8px',
        fontWeight: '500'
      }}>
        Format:
      </div>
      <button 
        className="ce-btn" 
        onClick={() => editor.chain().focus().toggleBold().run()} 
        aria-label="Bold"
        style={{ 
          background: editor.isActive('bold') ? '#3b82f6' : 'transparent',
          color: editor.isActive('bold') ? 'white' : '#374151',
          border: '1px solid #e5e7eb',
          borderRadius: '6px',
          padding: '6px 8px',
          fontSize: '12px',
          fontWeight: '600'
        }}
      >
        B
      </button>
      <button 
        className="ce-btn" 
        onClick={() => editor.chain().focus().toggleItalic().run()} 
        aria-label="Italic"
        style={{ 
          background: editor.isActive('italic') ? '#3b82f6' : 'transparent',
          color: editor.isActive('italic') ? 'white' : '#374151',
          border: '1px solid #e5e7eb',
          borderRadius: '6px',
          padding: '6px 8px',
          fontSize: '12px',
          fontStyle: 'italic'
        }}
      >
        I
      </button>
      <button 
        className="ce-btn" 
        onClick={() => editor.chain().focus().toggleUnderline().run()} 
        aria-label="Underline"
        style={{ 
          background: editor.isActive('underline') ? '#3b82f6' : 'transparent',
          color: editor.isActive('underline') ? 'white' : '#374151',
          border: '1px solid #e5e7eb',
          borderRadius: '6px',
          padding: '6px 8px',
          fontSize: '12px',
          textDecoration: 'underline'
        }}
      >
        U
      </button>
      <div style={{ width: '1px', background: '#e5e7eb', height: '20px', margin: '0 4px' }}></div>
      <button 
        className="ce-btn" 
        onClick={() => {
          const url = prompt("URL"); 
          if (!url) return;
          editor.chain().focus().extendMarkRange("link").setMark("link", { href: url }).run();
        }} 
        aria-label="Link"
        style={{ 
          background: editor.isActive('link') ? '#3b82f6' : 'transparent',
          color: editor.isActive('link') ? 'white' : '#374151',
          border: '1px solid #e5e7eb',
          borderRadius: '6px',
          padding: '6px 8px',
          fontSize: '12px'
        }}
      >
        🔗
      </button>
      <button 
        className="ce-btn" 
        onClick={() => editor.chain().focus().toggleHighlight().run()} 
        aria-label="Highlight"
        style={{ 
          background: editor.isActive('highlight') ? '#3b82f6' : 'transparent',
          color: editor.isActive('highlight') ? 'white' : '#374151',
          border: '1px solid #e5e7eb',
          borderRadius: '6px',
          padding: '6px 8px',
          fontSize: '12px'
        }}
      >
        🖍️
      </button>
    </div>
  );
}


type CourseContext = {
  courseId?: string;
  moduleIndex?: number;
  lessonIndex?: number;
  courseTitle?: string;
};
type AutosaveCfg = { enabled: boolean; intervalMs?: number };
type TestEditorProps = {
  initialHTML?: string;
  onSave?: (p: { html: string; markdown: string }) => Promise<void> | void;
  onChange?: (p: { html: string; markdown: string }) => void;
  autosave?: AutosaveCfg;
  courseContext?: CourseContext;
  readOnly?: boolean;
};

export default function TestEditorPage({
  initialHTML,
  onSave,
  onChange,
  autosave,
  courseContext,
  readOnly,
}: TestEditorProps = {}) {
  const [html, setHtml] = useState("");
  const [markdown, setMarkdown] = useState("");
  const [templateMenuOpen, setTemplateMenuOpen] = useState(false);
  const [templateMenuPosition, setTemplateMenuPosition] = useState({ top: 0, left: 0 });
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [versions, setVersions] = useState<any[]>([]);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Editor UI state
  const [railOpen, setRailOpen] = useState(true);
  const [showSearchBar, setShowSearchBar] = useState(false);
  
  // Course data state
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [selectedModule, setSelectedModule] = useState(0);
  const [selectedLesson, setSelectedLesson] = useState(0);
  const [loadingCourses, setLoadingCourses] = useState(true);
  
  // Theme management
  const { theme, toggle: toggleTheme } = useTheme();
  const { currentUser } = useAuth();
  
  const [content, setContent] = useState(initialHTML ?? `<h1>Loading Course Content...</h1><p>Please select a course from the sidebar to begin editing.</p>`);



  // Load courses from Firestore
  useEffect(() => {
    const loadCourses = async () => {
      if (!currentUser) {
        setLoadingCourses(false);
        return;
      }

      try {
        const coursesQuery = query(
          collection(db, "courses"),
          orderBy("createdAt", "desc")
        );
        const snapshot = await getDocs(coursesQuery);
        const coursesData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setCourses(coursesData);
        
        // Auto-select first course if available
        if (coursesData.length > 0) {
          setSelectedCourse(coursesData[0]);
          loadLessonContent(coursesData[0], 0, 0);
        }
      } catch (error) {
        console.error("Error loading courses:", error);
      } finally {
        setLoadingCourses(false);
      }
    };

    loadCourses();
  }, [currentUser]);

  // Load lesson content into editor - FIXED VERSION
  const loadLessonContent = (course: any, moduleIndex: number, lessonIndex: number) => {
    try {
      const lesson = course?.modules?.[moduleIndex]?.lessons?.[lessonIndex];
      const lessonTitle = lesson?.title || 'Untitled Lesson';
      let lessonContent =
        lesson?.content || lesson?.htmlContent || `<h1>${lessonTitle}</h1><p>Start editing this lesson...</p>`;

      // Clean markdown artifacts from content
      if (lessonContent && typeof lessonContent === 'string') {
        // STEP 1: Clean up unwanted bullets and markdown artifacts FIRST
        lessonContent = lessonContent
          // Remove standalone bullet points and empty bullet lines
          .replace(/^\s*[-•*]\s*$/gm, '')
          .replace(/\n\s*[-•*]\s*\n/g, '\n')
          .replace(/\n\s*[-•*]\s*$/gm, '\n')
          // Remove bullets that appear immediately after headers
          .replace(/(Learning Objectives)\s*[-•*]\s*/gi, '$1\n')
          .replace(/(Reflection)\s*[-•*]\s*/gi, '$1\n')
          .replace(/(Content)\s*[-•*]\s*/gi, '$1\n')
          .replace(/(Activity)\s*[-•*]\s*/gi, '$1\n')
          .replace(/(Quiz)\s*[-•*]\s*/gi, '$1\n')
          // Remove bullets after any heading pattern
          .replace(/(#{1,6}\s*[^#\n]+)\s*[-•*]\s*/gi, '$1\n')
          // Clean up excessive whitespace
          .replace(/\n{3,}/g, '\n\n')
          .trim();

        // STEP 2: Convert markdown headers to HTML
        lessonContent = lessonContent.replace(/^#{1,6}\s*(.*)$/gm, '<h3>$1</h3>');
        
        // STEP 3: Convert formatting (bold/italic)
        lessonContent = lessonContent.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
        lessonContent = lessonContent.replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, '<em>$1</em>');
        
        // STEP 4: Convert ONLY legitimate list items (those with actual content after the bullet)
        // This regex ensures we only convert bullets that have meaningful content
        lessonContent = lessonContent.replace(/^[-•*]\s+(.+\S.*)$/gm, '<li>$1</li>');
        
        // STEP 5: Wrap consecutive list items in appropriate list containers
        lessonContent = lessonContent.replace(/(<li>.*?<\/li>\s*)+/gs, (match: string) => {
          // Check if this was originally a numbered list by looking for number patterns
          const hasNumbers = /^\d+\.\s+/.test(match);
          return hasNumbers ? `<ol>${match}</ol>` : `<ul>${match}</ul>`;
        });
        
        // STEP 6: Handle numbered lists separately
        lessonContent = lessonContent.replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>');
        lessonContent = lessonContent.replace(/(<li>.*?<\/li>\s*)+/gs, (match: string) => {
          if (!match.includes('<ul>')) {
            return `<ol>${match}</ol>`;
          }
          return match;
        });
        
        // STEP 7: Handle paragraph structure
        lessonContent = lessonContent
          .split(/\n\s*\n/)
          .filter((para: string) => para.trim())
          .map((para: string) => {
            para = para.trim();
            // Don't wrap already formatted elements
            if (para.startsWith('<h') || para.startsWith('<ul') || para.startsWith('<ol') || 
                para.startsWith('<div') || para.startsWith('<li') || para.includes('</')) {
              return para;
            }
            // Handle single line breaks within paragraphs
            para = para.replace(/\n/g, '<br>');
            return `<p>${para}</p>`;
          })
          .join('\n');
        
        // STEP 8: Final cleanup - remove any remaining artifacts
        lessonContent = lessonContent
          .replace(/\*\*/g, '') // Remove any remaining **
          .replace(/(?<!\w)\*(?!\w)/g, '') // Remove standalone *
          .replace(/#{1,6}/g, '') // Remove any remaining #
          .replace(/<br>\s*<\/p>/g, '</p>') // Clean up br before closing p
          .replace(/<p>\s*<br>/g, '<p>') // Clean up br after opening p
          .replace(/<li>\s*<\/li>/g, '') // Remove empty list items
          .replace(/<ul>\s*<\/ul>/g, '') // Remove empty lists
          .replace(/<ol>\s*<\/ol>/g, '') // Remove empty ordered lists
          .replace(/<p>\s*<\/p>/g, '') // Remove empty paragraphs
          // CRITICAL: Final pass to remove any bullets that snuck through
          .replace(/(<h3>[^<]*Learning Objectives[^<]*<\/h3>)\s*[-•*]\s*/gi, '$1')
          .replace(/(<h3>[^<]*Reflection[^<]*<\/h3>)\s*[-•*]\s*/gi, '$1')
          .replace(/(<h3>[^<]*Content[^<]*<\/h3>)\s*[-•*]\s*/gi, '$1')
          .replace(/(<h3>[^<]*Activity[^<]*<\/h3>)\s*[-•*]\s*/gi, '$1')
          .replace(/(<h3>[^<]*Quiz[^<]*<\/h3>)\s*[-•*]\s*/gi, '$1')
          .replace(/(<\/h3>)\s*[-•*]\s*/gi, '$1')
          .replace(/(<\/h3>)\s*<p>\s*[-•*]\s*<\/p>/gi, '$1');
        
        // STEP 9: Enhanced section formatting
        lessonContent = lessonContent
          .replace(/(<h3>Content<\/h3>)([\s\S]*?)(?=<h3>|$)/gi, (match: string, header: string, content: string) => {
            const formattedContent = content.split(/\n\s*\n/).filter((para: string) => para.trim()).map((para: string) => {
              para = para.trim();
              if (!para.startsWith('<') && para.length > 0) {
                return `<p style="margin: 16px 0; line-height: 1.6;">${para}</p>`;
              }
              return para;
            }).join('\n');
            return header + '\n' + formattedContent;
          })
          .replace(/(<h3>Activity<\/h3>)([\s\S]*?)(?=<h3>|$)/gi, (match: string, header: string, content: string) => {
            const formattedContent = content.split(/\n\s*\n/).filter((para: string) => para.trim()).map((para: string) => {
              para = para.trim();
              if (!para.startsWith('<') && para.length > 0) {
                return `<p style="margin: 16px 0; line-height: 1.6; padding: 12px; background: #f8f9fa; border-left: 4px solid #007bff; border-radius: 4px;">${para}</p>`;
              }
              return para;
            }).join('\n');
            return header + '\n' + formattedContent;
          })
          .replace(/(<h3>Reflection<\/h3>)([\s\S]*?)(?=<h3>|$)/gi, (match: string, header: string, content: string) => {
            const formattedContent = content.split(/\n\s*\n/).filter((para: string) => para.trim()).map((para: string) => {
              para = para.trim();
              if (!para.startsWith('<') && para.length > 0) {
                return `<p style="margin: 16px 0; line-height: 1.6; padding: 12px; background: #fff3cd; border-left: 4px solid #ffc107; border-radius: 4px;">${para}</p>`;
              }
              return para;
            }).join('\n');
            return header + '\n' + formattedContent;
          });
      }

      setSelectedCourse(course || null);
      setSelectedModule(moduleIndex || 0);
      setSelectedLesson(lessonIndex || 0);
      setContent(lessonContent);
    } catch (e) {
      console.warn('loadLessonContent failed:', e);
      setContent('<h1>No Content Available</h1><p>This lesson has no content yet.</p>');
    }
  };

  // Initialize editor first
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Placeholder.configure({
        placeholder: 'Start writing your lesson...',
      }),
      CharacterCount,
      Highlight.configure({ multicolor: true }),
      SafePaste,
      SlashHotkey.configure({
        onSlash: ({ top, left }) => {
          if (top >= 0) {
            setTemplateMenuPosition({ top, left });
            setTemplateMenuOpen(true);
          } else {
            setTemplateMenuOpen(false);
          }
        },
      }),
    ],
    content: initialHTML || '',
    editorProps: {
      attributes: {
        class: 'tiptap',
      },
    },
    onCreate({ editor }) {
      setHtml(editor.getHTML());
      // Initialize collaboration if needed
      try {
        if (!editor.isDestroyed) {
          initCollab(editor, 'lesson-123');
        }
      } catch (err) {
        console.warn('Collab init failed:', err);
      }
    },
    onUpdate({ editor }) {
      setHtml(editor.getHTML());
      if (onChange) {
        onChange({ html: editor.getHTML(), markdown: htmlToMarkdown(editor.getHTML()) });
      }
    },
  });

  // Content sync - only update when content actually changes
  useEffect(() => {
    if (!editor || !content) return;
    
    const currentHtml = editor.getHTML().trim();
    if (content.trim() !== currentHtml) {
      editor.commands.setContent(content, false);
      // Immediately update preview HTML to match
      setHtml(editor.getHTML());
    }
  }, [content, editor]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === '.') {
        e.preventDefault();
        setRailOpen(prev => !prev);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === '?') {
        e.preventDefault();
        setShowShortcuts(prev => !prev);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        setShowSearchBar(prev => !prev);
      }
      if (e.key === 'Escape') {
        setShowSearchBar(false);
        setShowShortcuts(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Load versions on mount
  useEffect(() => {
    setVersions(listVersions());
  }, []);

  // Enhanced autosave functionality - save every 10 seconds for better protection
  useEffect(() => {
    if (!editor) return;

    const autoSaveInterval = setInterval(() => {
      const content = editor.getHTML();
      if (content && content.trim() !== '<p></p>' && content.trim() !== '') {
        saveVersion(content);
        setVersions(listVersions());
        setLastSaved(new Date());
      }
    }, 10000); // Save every 10 seconds for better protection

    return () => clearInterval(autoSaveInterval);
  }, [editor]);

  // Debounced autosave to host app (when onSave is provided)
  const saveTimer = useRef<number | null>(null);

  useEffect(() => {
    if (!editor || !onSave) return;

    // debounce ~2s after last keystroke
    const handler = () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
      saveTimer.current = window.setTimeout(async () => {
        try {
          const html = editor.getHTML();
          const markdown = htmlToMarkdown(html);
          await onSave({ html, markdown });
          setLastSaved(new Date());
        } catch (e) {
          console.warn('Autosave failed:', e);
        }
      }, 2000);
    };

    editor.on('update', handler);
    return () => {
      editor.off('update', handler);
      if (saveTimer.current) {
        window.clearTimeout(saveTimer.current);
      }
    };
  }, [editor, onSave]);

  // Template menu is now handled by SlashHotkey extension

  // Handle template selection
  const handleTemplateSelect = (type: string) => {
    if (editor && ["LO", "Content", "Activity", "Reflection", "Quiz"].includes(type)) {
      insertTemplate(editor, type as "LO"|"Content"|"Activity"|"Reflection"|"Quiz");
      setTemplateMenuOpen(false);
    }
  };

  const handleTemplateMenuClose = () => {
    setTemplateMenuOpen(false);
  };

  // Preview HTML managed by editor onUpdate
  useEffect(() => {
    if (!editor) return;
    
    // Set initial content
    setHtml(editor.getHTML());
    
    // Immediate update for real-time sync
    const on = () => {
      setHtml(editor.getHTML());
    };
    
    editor.on("update", on);
    
    return () => {
      editor.off("update", on);
    };
  }, [editor]);

  // Validation checks - update when editor content changes
  const issues = useMemo(() => {
    if (!editor) return [];
    return runChecks(editor.getText());
  }, [editor?.state.doc]);

  // Outline from preview headings
  const previewRef = useRef<HTMLDivElement>(null);
  const [outline, setOutline] = useState<Array<{ id: string; text: string; level: number }>>([]);
  useEffect(() => {
    const root = previewRef.current;
    if (!root) return;
    const hs = Array.from(root.querySelectorAll("h1, h2, h3")) as HTMLElement[];
    const items = hs.map((h, i) => {
      if (!h.id) h.id = `h-${i}-${(h.textContent || "").toLowerCase().replace(/\s+/g,"-")}`;
      return { id: h.id, text: h.textContent || "", level: Number(h.tagName.substring(1)) };
    });
    setOutline(items);
  }, [html]);

  const wordCount = useMemo(() => {
    const text = previewRef.current?.innerText || "";
    return text.trim().split(/\s+/).filter(Boolean).length;
  }, [html]);

  // Active section tracking for outline navigation
  const [activeId, setActiveId] = useState<string>("");

  useEffect(() => {
    const root = previewRef.current;
    if (!root) return;
    const hs = Array.from(root.querySelectorAll("h1,h2,h3")) as HTMLElement[];
    const io = new IntersectionObserver(entries => {
      const first = entries.find(e => e.isIntersecting);
      if (first) setActiveId((first.target as HTMLElement).id);
    }, { root, threshold: 0.1 });
    hs.forEach(h => io.observe(h));
    return () => io.disconnect();
  }, [html]);

  const jumpTo = (id: string) =>
    previewRef.current?.querySelector(`#${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });

  // Add this debug function to see the raw HTML
  const debugContent = () => {
    if (!editor) return;
    
    console.log("=== CONTENT DEBUG ===");
    console.log("Raw HTML from editor:", editor.getHTML());
    console.log("Raw JSON from editor:", JSON.stringify(editor.getJSON(), null, 2));
    
    // Check for specific problematic patterns
    const html = editor.getHTML();
    const hasProblematicBullet = html.includes('Learning Objectives') && html.includes('<li></li>');
    const hasEmptyListAfterHeader = /<h[1-6][^>]*>Learning Objectives<\/h[1-6]>\s*<ul>\s*<li>\s*<\/li>/.test(html);
    
    console.log("Has problematic bullet:", hasProblematicBullet);
    console.log("Has empty list after header:", hasEmptyListAfterHeader);
    
    // Look for the exact pattern around Learning Objectives
    const match = html.match(/<h[1-6][^>]*>Learning Objectives<\/h[1-6]>([\s\S]*?)<ol>/);
    if (match) {
      console.log("Content between Learning Objectives and numbered list:", JSON.stringify(match[1]));
    }
  };

  // Quick Actions handlers
  const handleRunFormatter = () => {
    if (!editor) return;
    
    // Get current HTML content to preserve formatting
    const content = editor.getHTML();
    
    // Apply gentle formatting improvements that preserve structure
    const formatted = content
      // Fix excessive spacing between elements
      .replace(/(<\/[^>]+>)\s{3,}(<[^>]+>)/g, '$1\n\n$2')
      // Normalize list item spacing
      .replace(/(<li[^>]*>)\s+/g, '$1')
      .replace(/\s+(<\/li>)/g, '$1')
      // Clean up paragraph spacing
      .replace(/(<\/p>)\s{3,}(<p[^>]*>)/g, '$1\n\n$2')
      // Remove empty paragraphs
      .replace(/<p[^>]*><\/p>/g, '')
      .trim();
    
    // Update editor content with gentle formatting
    editor.commands.setContent(formatted);
    
    // Show feedback
    setTimeout(() => {
      alert('Document formatted! Cleaned up spacing and structure.');
    }, 100);
    
    // Focus back to editor
    editor.commands.focus();
  };

  const handleInsertTemplate = () => {
    if (!editor) return;
    
    // Insert a properly structured lesson template
    editor.chain().focus()
      .insertContent('<h2>New Section</h2>')
      .insertContent('<p>Add your content here...</p>')
      .insertContent('<h3>Key Points</h3>')
      .insertContent('<ul><li>Point 1</li><li>Point 2</li><li>Point 3</li></ul>')
      .insertContent('<p></p>') // Add empty paragraph for continued editing
      .run();
  };



  // Header button handlers
  const handleTemplates = async () => {
    if (!editor) return;
    
    // Show confirmation before replacing content
    const hasContent = editor.getHTML().trim() !== '<p></p>' && editor.getHTML().trim() !== '';
    if (hasContent) {
      const confirmed = await confirmDialog('This will replace your current content with a lesson template. Continue?');
      if (!confirmed) return;
    }
    const previewElement = previewRef.current;
    if (previewElement) {
      previewElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // Add visual feedback
      previewElement.style.transition = 'all 0.3s ease';
      previewElement.style.backgroundColor = '#f8fafc';
      previewElement.style.border = '2px solid #3b82f6';
      
      // Remove highlight after 2 seconds
      setTimeout(() => {
        previewElement.style.backgroundColor = '';
        previewElement.style.border = '';
      }, 2000);
    } else {
      // Fallback: scroll to preview section by class
      const previewSection = document.querySelector('.card:nth-child(2)');
      if (previewSection) {
        previewSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  // local helper – same logic as your ExportMenu's getMarkdown
  function htmlToMarkdown(html: string): string {
    return (html || "")
      .replace(/<h1[^>]*>(.*?)<\/h1>/g, '# $1\n\n')
      .replace(/<h2[^>]*>(.*?)<\/h2>/g, '## $1\n\n')
      .replace(/<h3[^>]*>(.*?)<\/h3>/g, '### $1\n\n')
      .replace(/<h4[^>]*>(.*?)<\/h4>/g, '#### $1\n\n')
      .replace(/<h5[^>]*>(.*?)<\/h5>/g, '##### $1\n\n')
      .replace(/<h6[^>]*>(.*?)<\/h6>/g, '###### $1\n\n')
      .replace(/<p[^>]*>(.*?)<\/p>/g, '$1\n\n')
      .replace(/<ul[^>]*>/g, '')
      .replace(/<\/ul>/g, '\n')
      .replace(/<ol[^>]*>/g, '')
      .replace(/<\/ol>/g, '\n')
      .replace(/<li[^>]*>(.*?)<\/li>/g, '- $1\n')
      .replace(/<strong[^>]*>(.*?)<\/strong>/g, '**$1**')
      .replace(/<b[^>]*>(.*?)<\/b>/g, '**$1**')
      .replace(/<em[^>]*>(.*?)<\/em>/g, '*$1*')
      .replace(/<i[^>]*>(.*?)<\/i>/g, '*$1*')
      .replace(/<u[^>]*>(.*?)<\/u>/g, '$1')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  const handleSave = async () => {
    if (!editor) return;
    const html = editor.getHTML();
    const markdown = htmlToMarkdown(html);
    if (onSave) {
      await onSave({ html, markdown });
    } else {
      localStorage.setItem('course-editor-content', html);
    }
    setLastSaved(new Date());
  };

  const handlePreview = () => {
    const previewElement = previewRef.current;
    if (previewElement) {
      previewElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Debounced autosave + onChange notifier
  useEffect(() => {
    if (!editor) return;
    const intervalMs = autosave?.intervalMs ?? 2000;
    let t: number | null = null;
    const handler = () => {
      if (t) window.clearTimeout(t);
      t = window.setTimeout(async () => {
        try {
          const html = editor.getHTML();
          const markdown = htmlToMarkdown(html);
          onChange?.({ html, markdown });
          if (autosave?.enabled && onSave) {
            await onSave({ html, markdown });
            setLastSaved(new Date());
          } else if (autosave?.enabled && !onSave) {
            localStorage.setItem('course-editor-content', html);
            setLastSaved(new Date());
          }
        } catch (e) {
          console.warn('Autosave failed:', e);
        }
      }, intervalMs);
    };
    editor.on('update', handler);
    return () => { editor.off('update', handler); if (t) window.clearTimeout(t); };
  }, [editor, onSave, onChange, autosave?.enabled, autosave?.intervalMs]);



  return (
    <div className={`editor-grid ${theme === 'dark' ? 'dark-mode' : ''} ${!railOpen ? 'rail-closed' : ''}`}>
      <a
        href="#main-editor"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:rounded"
        style={{ backgroundColor: 'var(--ce-primary)', color: 'var(--ce-primary-text)' }}
      >
        Skip to main editor
      </a>

      {/* Header */}
      <header className="editor-header">
        <BookOpen className="h-5 w-5" style={{ color: 'var(--ce-icon)' }} />
        <h1 className="text-base font-semibold tracking-tight">Course Editor</h1>
        {courseContext && (
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {courseContext.courseTitle ? `${courseContext.courseTitle} • ` : ''}
            Module {(courseContext.moduleIndex ?? 0) + 1} • Lesson {(courseContext.lessonIndex ?? 0) + 1}
          </div>
        )}
        <div style={{ marginLeft: "auto" }} />
        <button className="btn-ghost" onClick={handleTemplates}>
          <Sparkles size={18} strokeWidth={2.2} className="mr-1" />Templates
        </button>
        <button className="btn-ghost" onClick={handlePreview}>
          <Eye size={18} strokeWidth={2.2} className="mr-1" />Preview
        </button>
        <button className="btn-ghost" onClick={toggleTheme} title="Toggle theme" aria-label="Toggle dark mode">
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
        <button className="btn-primary" onClick={handleSave}>
          <Save size={18} strokeWidth={2.2} className="mr-1" />Save
        </button>
        <button className="btn-ghost" onClick={() => setRailOpen(v => !v)} title="Toggle sidebar (Ctrl/Cmd + .)">
          <span style={{ fontSize: '16px', fontWeight: 'bold' }}>
            {railOpen ? '◀' : '▶'}
          </span>
        </button>
      </header>

      {/* Floating helpers must be siblings of the main layout */}
      <FloatingFormatBar editor={editor} />
      <TemplateMenu
        show={templateMenuOpen}
        position={templateMenuPosition}
        onSelect={handleTemplateSelect}
        onClose={handleTemplateMenuClose}
      />

      {/* Main 4-column layout */}
      <main>
        {/* Course Sidebar */}
        <aside className="course-sidebar">
          <div className="course-sidebar-header">
            📚 Courses
          </div>
          <div className="course-sidebar-content">
            {loadingCourses ? (
              <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--ce-muted)' }}>
                Loading courses...
              </div>
            ) : courses.length === 0 ? (
              <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--ce-muted)' }}>
                No courses found
              </div>
            ) : (
              courses.map((course) => (
                <div 
                  key={course.id} 
                  className={`course-item ${selectedCourse?.id === course.id ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedCourse(course);
                    setSelectedModule(0);
                    setSelectedLesson(0);
                    loadLessonContent(course, 0, 0);
                  }}
                >
                  <div className="course-title">{course.title}</div>
                  <div className="course-meta">
                    {course.modules?.length || 0} modules • {course.createdAt?.toDate?.()?.toLocaleDateString() || 'Recent'}
                  </div>
                  
                  {selectedCourse?.id === course.id && course.modules && (
                    <div className="module-list">
                      {course.modules.map((module: any, moduleIndex: number) => (
                        <div key={moduleIndex}>
                          <div 
                            className={`module-item ${selectedModule === moduleIndex ? 'active' : ''}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedModule(moduleIndex);
                              setSelectedLesson(0);
                              loadLessonContent(course, moduleIndex, 0);
                            }}
                          >
                            📖 {module.title}
                          </div>
                          
                          {selectedModule === moduleIndex && module.lessons && (
                            <div className="lesson-list">
                              {module.lessons.map((lesson: any, lessonIndex: number) => (
                                <div 
                                  key={lessonIndex}
                                  className={`lesson-item ${selectedLesson === lessonIndex ? 'active' : ''}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedLesson(lessonIndex);
                                    loadLessonContent(course, moduleIndex, lessonIndex);
                                  }}
                                >
                                  📝 {lesson.title}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </aside>

        {/* Editor card */}
        <section className="card" id="main-editor">
          <div className="card-head flex-between">
            <span>Content Editor</span>
            <div className="flex items-center gap-2">
              <span className="muted text-xs">{editor?.storage.characterCount?.characters() || 0} chars</span>
              <span className="muted text-xs">•</span>
              <span className="muted text-xs">{wordCount} words</span>
            </div>
          </div>
          <div className="card-body p-0">
            <EditorToolbar editor={editor} />
            <div className="editor-scope">
              <EditorContent editor={editor} className="tiptap" aria-label="Course content editor" />
            </div>
          </div>
        </section>

        {/* Preview card */}
        <section className="card">
          <div className="card-head flex-between">
            <span>Preview</span><span className="muted">Auto-updates</span>
          </div>
          <div className="card-body">
            <div ref={previewRef} className="prose max-w-prose p-4 text-left dark:prose-invert">
              <div dangerouslySetInnerHTML={{ __html: html }} />
            </div>
          </div>
        </section>

        {/* Right rail */}
        {railOpen && (
          <aside className="rail" role="complementary" aria-label="Editor tools and information">
            <div className="card">
              <div className="card-head">Outline</div>
              <nav className="card-body" role="navigation" aria-label="Document outline">
                {outline.length === 0 && <p className="muted">No headings yet.</p>}
                <ul className="outline">
                  {outline.map(o => (
                    <li key={o.id} className={`ol-item lv-${o.level}`}>
                      <a
                        href={`#${o.id}`}
                        onClick={(e) => { e.preventDefault(); jumpTo(o.id); }}
                        className={activeId === o.id ? "active" : ""}
                      >
                        {o.text}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            </div>

            <div className="card">
              <div className="card-head">Stats</div>
              <div className="card-body">
                <div className="stat"><span>Words</span><span>{wordCount}</span></div>
              </div>
            </div>

            <div className="card">
              <div className="card-head">Checks</div>
              <div className="card-body text-sm">
                {issues.length === 0 ? (
                  <div style={{ color: '#10b981' }}>All good ✅</div>
                ) : (
                  <ul className="list-disc pl-5 space-y-1">
                    {issues.map((issue, idx) => (
                      <li key={idx} style={{ color: '#d97706' }}>{issue}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="card">
              <div className="card-head">Versions</div>
              <div className="card-body text-sm">
                <div className="flex-between mb-2">
                  <span className="muted">Auto-saved</span>
                  <span className="muted">{lastSaved ? lastSaved.toLocaleTimeString() : 'Never'}</span>
                </div>
                {versions.length === 0 ? (
                  <p className="muted">No versions yet</p>
                ) : (
                  <div className="space-y-1">
                    {versions.slice(0, 5).map((version, idx) => (
                      <button
                        key={idx}
                        className="btn btn-sm w-full"
                        onClick={() => {
                          if (editor && version) {
                            editor.commands.setContent(version);
                          }
                        }}
                        style={{
                          fontSize: '11px',
                          padding: '4px 8px',
                          justifyContent: 'flex-start'
                        }}
                      >
                        Version {idx + 1} {idx === 0 ? '(latest)' : ''}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Search Bar - positioned in right rail */}
            {showSearchBar && <EditorSearchBar editor={editor} />}

            <div className="card">
              <div className="card-head">Quick Actions</div>
              <div className="card-body">
                <button className="btn btn-sm w-full mb-2" onClick={handleRunFormatter}>
                  🔧 Run Formatter
                </button>
                <button className="btn btn-sm w-full mb-2" onClick={handleInsertTemplate}>
                  📝 Insert Lesson Template
                </button>
                <button className="btn btn-sm w-full mb-2" onClick={() => setShowShortcuts(prev => !prev)}>
                  ❓ {showShortcuts ? 'Hide' : 'Show'} Shortcuts
                </button>
                <button className="btn btn-sm w-full mb-2" onClick={() => setShowSearchBar(prev => !prev)}>
                  🔍 {showSearchBar ? 'Hide' : 'Show'} Search
                </button>
                <button className="btn btn-sm w-full mb-2" onClick={() => {
                  if (editor) {
                    const content = editor.getHTML();
                    if (content && content.trim() !== '<p></p>' && content.trim() !== '') {
                      saveVersion(content);
                      setVersions(listVersions());
                      setLastSaved(new Date());
                    }
                  }
                }}>
                  💾 Save Version
                </button>
                <button className="btn btn-sm w-full mb-2" onClick={() => {
                  if (!editor) {
                    console.log("Editor is null!");
                    return;
                  }
                  
                  console.log("=== CONTENT DEBUG ===");
                  console.log("Raw HTML from editor:", editor.getHTML());
                  
                  // Check your browser's console (F12 -> Console tab)
                  const html = editor.getHTML();
                  console.log("Content around Learning Objectives:");
                  const match = html.match(/(Learning Objectives[\s\S]{0,200})/i);
                  if (match) {
                    console.log(match[1]);
                  }
                }}>
                  🐛 Debug Content
                </button>
                <ExportMenu getMarkdown={() => {
                  if (!editor) return "";
                  // Convert HTML to clean Markdown
                  const content = editor.getHTML();
                  return content
                    // Convert headings
                    .replace(/<h1[^>]*>(.*?)<\/h1>/g, '# $1\n\n')
                    .replace(/<h2[^>]*>(.*?)<\/h2>/g, '## $1\n\n')
                    .replace(/<h3[^>]*>(.*?)<\/h3>/g, '### $1\n\n')
                    .replace(/<h4[^>]*>(.*?)<\/h4>/g, '#### $1\n\n')
                    .replace(/<h5[^>]*>(.*?)<\/h5>/g, '##### $1\n\n')
                    .replace(/<h6[^>]*>(.*?)<\/h6>/g, '###### $1\n\n')
                    // Convert paragraphs
                    .replace(/<p[^>]*>(.*?)<\/p>/g, '$1\n\n')
                    // Convert lists
                    .replace(/<ul[^>]*>/g, '')
                    .replace(/<\/ul>/g, '\n')
                    .replace(/<ol[^>]*>/g, '')
                    .replace(/<\/ol>/g, '\n')
                    .replace(/<li[^>]*>(.*?)<\/li>/g, '- $1\n')
                    // Convert formatting
                    .replace(/<strong[^>]*>(.*?)<\/strong>/g, '**$1**')
                    .replace(/<b[^>]*>(.*?)<\/b>/g, '**$1**')
                    .replace(/<em[^>]*>(.*?)<\/em>/g, '*$1*')
                    .replace(/<i[^>]*>(.*?)<\/i>/g, '*$1*')
                    .replace(/<u[^>]*>(.*?)<\/u>/g, '$1')
                    // Clean up extra whitespace
                    .replace(/\n{3,}/g, '\n\n')
                    .trim();
                }} />
              </div>
            </div>
          </aside>
        )}
      </main>

      {/* Footer */}
      <footer className="editor-statusbar">
        <span>{lastSaved ? `Saved • ${lastSaved.toLocaleTimeString()}` : 'Saved • just now'}</span>
        <span> Your Company</span>
        <span> 2023</span>
        <span>© Your Company</span>
      </footer>

      {/* Keyboard Shortcuts Help */}
      {showShortcuts && <ShortcutsHelp />}
    </div>
  );
}
