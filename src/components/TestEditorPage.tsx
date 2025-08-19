import React, { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "./ui/button";
import { Separator } from "./ui/separator";
import { Eye, Download, Save, BookOpen, Sparkles } from "lucide-react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import CharacterCount from '@tiptap/extension-character-count';
import Placeholder from '@tiptap/extension-placeholder';
import { EditorToolbar } from "./editor/EditorToolbar";

export default function TestEditorPage() {
  const previewRef = useRef<HTMLDivElement>(null);
  const [outline, setOutline] = useState<Array<{ id: string; text: string; level: number }>>([]);
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

  // Initialize TipTap editor
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
        placeholder: "Start typing your lesson content...",
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      setContent(html);
    },
    editorProps: {
      attributes: {
        class: 'prose prose-slate max-w-none focus:outline-none min-h-[400px] p-4',
      },
    },
  });

  // Generate outline from preview headings
  useEffect(() => {
    const root = previewRef.current;
    if (!root) return;
    const hs = Array.from(root.querySelectorAll("h1, h2, h3")) as HTMLElement[];
    const items = hs.map((h, i) => {
      if (!h.id) h.id = `h-${i}-${(h.textContent || "").toLowerCase().replace(/\s+/g, "-")}`;
      return { id: h.id, text: h.textContent || "", level: Number(h.tagName.substring(1)) };
    });
    setOutline(items);
  }, [content]);

  const wordCount = useMemo(() => {
    const text = previewRef.current?.innerText || "";
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    return words;
  }, [content]);

  const renderedMarkdown = (
    <div dangerouslySetInnerHTML={{ __html: content }} />
  );

  return (
    <div className="min-h-screen bg-slate-50" style={{ 
      position: 'fixed', 
      top: 0, 
      left: 0, 
      right: 0, 
      bottom: 0, 
      width: '100vw', 
      height: '100vh',
      overflow: 'auto'
    }}>
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-white/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4">
          <BookOpen className="h-5 w-5 text-blue-600" />
          <h1 className="text-lg font-semibold tracking-tight">Course Editor</h1>
          <Separator orientation="vertical" className="mx-2 h-6" />
          <div className="ml-auto flex items-center gap-2">
            <Button variant="ghost" size="sm"><Sparkles className="mr-2 h-4 w-4" />Templates</Button>
            <Button variant="ghost" size="sm"><Eye className="mr-2 h-4 w-4" />Preview</Button>
            <Button variant="outline" size="sm"><Download className="mr-2 h-4 w-4" />Export</Button>
            <Button size="sm"><Save className="mr-2 h-4 w-4" />Save</Button>
          </div>
        </div>
      </header>

      {/* Main grid: editor | preview | right rail */}
      <main className="grid gap-6 px-6 py-6 grid-cols-1 lg:grid-cols-3" style={{ minHeight: 'calc(100vh - 112px)' }}>
        {/* Editor card */}
        <section className="rounded-2xl border bg-white shadow-sm">
          <div className="sticky top-14 z-30 border-b bg-white/90 px-3 py-2">
            <EditorToolbar editor={editor} />
          </div>
          <div className="p-4 text-left">
            <EditorContent editor={editor} className="tiptap" />
          </div>
        </section>

        {/* Preview card */}
        <section className="rounded-2xl border bg-white shadow-sm">
          <div className="border-b px-4 py-3 flex items-center justify-between">
            <h2 className="text-sm font-medium text-slate-600">Preview</h2>
            <span className="text-xs text-slate-500">Auto-updates</span>
          </div>
          <div ref={previewRef} className="prose prose-slate max-w-prose p-4 text-left">
            {renderedMarkdown}
          </div>
        </section>

        {/* Right rail: outline / stats / quick actions */}
        <aside className="space-y-4">
          <div className="rounded-2xl border bg-white shadow-sm">
            <div className="border-b px-4 py-3">
              <h3 className="text-sm font-medium text-slate-600">Outline</h3>
            </div>
            <nav className="max-h-[50vh] overflow-auto p-3 text-sm">
              {outline.length === 0 && <p className="text-slate-500">No headings yet.</p>}
              <ul className="space-y-1">
                {outline.map((o) => (
                  <li key={o.id} className={o.level === 1 ? "pl-0" : o.level === 2 ? "pl-3" : "pl-6"}>
                    <a href={`#${o.id}`} className="text-slate-700 hover:text-blue-600">{o.text}</a>
                  </li>
                ))}
              </ul>
            </nav>
          </div>

          <div className="rounded-2xl border bg-white shadow-sm">
            <div className="border-b px-4 py-3">
              <h3 className="text-sm font-medium text-slate-600">Stats</h3>
            </div>
            <div className="p-4 text-sm text-slate-700">
              <div className="flex justify-between"><span>Words</span><span>{wordCount}</span></div>
              {/* add more stats if you want */}
            </div>
          </div>

          <div className="rounded-2xl border bg-white shadow-sm">
            <div className="border-b px-4 py-3">
              <h3 className="text-sm font-medium text-slate-600">Quick Actions</h3>
            </div>
            <div className="p-3 flex flex-col gap-2">
              <Button variant="secondary" size="sm">Run Formatter</Button>
              <Button variant="outline" size="sm">Insert Lesson Template</Button>
              <Button variant="outline" size="sm">Export Markdown</Button>
            </div>
          </div>
        </aside>
      </main>

      {/* Status bar */}
      <footer className="border-t bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2 text-xs text-slate-500">
          <span id="status">Saved • just now</span>
          <span>© Your Company</span>
        </div>
      </footer>
    </div>
  );
}
