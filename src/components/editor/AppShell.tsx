import React from 'react';
import { Button } from "../ui/button";
import { Separator } from "../ui/separator";
import { BookOpen, Download, Eye, Save, Sparkles } from "lucide-react";

interface AppShellProps {
  editor: React.ReactNode;
  preview: React.ReactNode;
  onTemplatesClick?: () => void;
  onPreviewClick?: () => void;
  onExportClick?: () => void;
  onSaveClick?: () => void;
  wordCount?: number;
  charCount?: number;
  saveStatus?: string;
}

export default function AppShell({ 
  editor, 
  preview, 
  onTemplatesClick,
  onPreviewClick,
  onExportClick,
  onSaveClick,
  wordCount = 0,
  charCount = 0,
  saveStatus = "Saved • just now"
}: AppShellProps) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-white/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-full items-center gap-3 px-6">
          <BookOpen className="h-5 w-5 text-blue-600" />
          <h1 className="text-lg font-semibold tracking-tight">Course Editor</h1>
          <Separator orientation="vertical" className="mx-2 h-6" />
          <div className="ml-auto flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onTemplatesClick}
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Templates
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onPreviewClick}
            >
              <Eye className="mr-2 h-4 w-4" />
              Preview
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onExportClick}
            >
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Button 
              size="sm" 
              onClick={onSaveClick}
            >
              <Save className="mr-2 h-4 w-4" />
              Save
            </Button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="grid grid-cols-1 gap-6 px-6 py-6 md:grid-cols-2">
        {/* Editor */}
        <section className="rounded-2xl border bg-white shadow-sm">
          <div className="border-b px-4 py-3">
            <h2 className="text-sm font-medium text-slate-600">Content Editor</h2>
          </div>
          <div className="p-4">{editor}</div>
        </section>

        {/* Preview */}
        <aside className="rounded-2xl border bg-white shadow-sm">
          <div className="border-b px-4 py-3 flex items-center justify-between">
            <h2 className="text-sm font-medium text-slate-600">Preview</h2>
            <span className="text-xs text-slate-500">Auto-updates</span>
          </div>
          <div className="prose prose-slate max-w-none p-4">
            {preview}
          </div>
        </aside>
      </main>

      {/* Footer / status bar */}
      <footer className="border-t bg-white">
        <div className="flex items-center justify-between px-6 py-2 text-xs text-slate-500">
          <span id="status">{saveStatus}</span>
          <span>Words: {wordCount} • Characters: {charCount}</span>
        </div>
      </footer>
    </div>
  );
}
