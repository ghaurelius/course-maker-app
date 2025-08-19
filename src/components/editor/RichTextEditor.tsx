import React, { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import CharacterCount from '@tiptap/extension-character-count';
import Placeholder from '@tiptap/extension-placeholder';
import { EditorToolbar } from './EditorToolbar';

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  onStatsChange?: (stats: { characters: number; words: number }) => void;
  placeholder?: string;
}

export function RichTextEditor({ 
  content, 
  onChange, 
  onStatsChange,
  placeholder = "Start typing your lesson content..."
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Link.configure({
        openOnClick: false,
      }),
      Image,
      CharacterCount,
      Placeholder.configure({
        placeholder,
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange(html);
      
      // Update statistics
      if (onStatsChange) {
        const stats = editor.storage.characterCount;
        const words = stats.words();
        const characters = stats.characters();
        onStatsChange({ characters, words });
      }
    },
    editorProps: {
      attributes: {
        class: 'prose prose-slate max-w-none focus:outline-none min-h-[400px] p-4',
      },
    },
  });

  // Update editor content when prop changes
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!editor) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const { ctrlKey, metaKey, key, altKey, shiftKey } = event;
      const isCmd = ctrlKey || metaKey;

      if (isCmd) {
        switch (key) {
          case 'b':
            event.preventDefault();
            editor.chain().focus().toggleBold().run();
            break;
          case 'i':
            event.preventDefault();
            editor.chain().focus().toggleItalic().run();
            break;
          case 'u':
            event.preventDefault();
            editor.chain().focus().toggleUnderline().run();
            break;
          case '1':
            if (altKey) {
              event.preventDefault();
              editor.chain().focus().toggleHeading({ level: 1 }).run();
            }
            break;
          case '2':
            if (altKey) {
              event.preventDefault();
              editor.chain().focus().toggleHeading({ level: 2 }).run();
            }
            break;
          case '7':
            if (shiftKey) {
              event.preventDefault();
              editor.chain().focus().toggleOrderedList().run();
            }
            break;
          case '8':
            if (shiftKey) {
              event.preventDefault();
              editor.chain().focus().toggleBulletList().run();
            }
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [editor]);

  if (!editor) {
    return <div className="min-h-[400px] p-4 border rounded-lg bg-gray-50 animate-pulse" />;
  }

  return (
    <div className="space-y-4">
      <EditorToolbar editor={editor} />
      <div className="border rounded-lg bg-white min-h-[400px] focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
