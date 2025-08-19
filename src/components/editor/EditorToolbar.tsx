import React from 'react';
import { Editor } from "@tiptap/react";
import { Bold, Italic, Underline, Strikethrough, List, ListOrdered, Quote, Code, AlignLeft, AlignCenter, AlignRight, Undo2, Redo2, Link as LinkIcon, Image as ImageIcon } from "lucide-react";
import { Button } from "../ui/button";
import { Separator } from "../ui/separator";

interface EditorToolbarProps {
  editor: Editor | null;
}

export function EditorToolbar({ editor }: EditorToolbarProps) {
  if (!editor) return null;

  const IconBtn = ({ onClick, pressed, children, label }: {
    onClick: () => void;
    pressed: boolean;
    children: React.ReactNode;
    label: string;
  }) => (
    <Button 
      variant={pressed ? "secondary" : "ghost"} 
      size="sm" 
      aria-label={label} 
      onClick={onClick} 
      className="h-9 w-9 p-0" 
      aria-pressed={pressed}
    >
      {children}
    </Button>
  );

  return (
    <div className="sticky top-0 z-10 flex flex-wrap items-center gap-1 rounded-xl border bg-white p-2 shadow-sm mb-4">
      {/* Text Formatting */}
      <IconBtn 
        label="Bold" 
        onClick={() => editor.chain().focus().toggleBold().run()} 
        pressed={editor.isActive("bold")}
      >
        <Bold size={16} />
      </IconBtn>
      <IconBtn 
        label="Italic" 
        onClick={() => editor.chain().focus().toggleItalic().run()} 
        pressed={editor.isActive("italic")}
      >
        <Italic size={16} />
      </IconBtn>
      <IconBtn 
        label="Underline" 
        onClick={() => editor.chain().focus().toggleUnderline().run()} 
        pressed={editor.isActive("underline")}
      >
        <Underline size={16} />
      </IconBtn>
      <IconBtn 
        label="Strike" 
        onClick={() => editor.chain().focus().toggleStrike().run()} 
        pressed={editor.isActive("strike")}
      >
        <Strikethrough size={16} />
      </IconBtn>

      <Separator orientation="vertical" className="mx-1 h-6" />

      {/* Lists & Blocks */}
      <IconBtn 
        label="Bulleted list" 
        onClick={() => editor.chain().focus().toggleBulletList().run()} 
        pressed={editor.isActive("bulletList")}
      >
        <List size={16} />
      </IconBtn>
      <IconBtn 
        label="Numbered list" 
        onClick={() => editor.chain().focus().toggleOrderedList().run()} 
        pressed={editor.isActive("orderedList")}
      >
        <ListOrdered size={16} />
      </IconBtn>
      <IconBtn 
        label="Quote" 
        onClick={() => editor.chain().focus().toggleBlockquote().run()} 
        pressed={editor.isActive("blockquote")}
      >
        <Quote size={16} />
      </IconBtn>
      <IconBtn 
        label="Inline code" 
        onClick={() => editor.chain().focus().toggleCode().run()} 
        pressed={editor.isActive("code")}
      >
        <Code size={16} />
      </IconBtn>

      <Separator orientation="vertical" className="mx-1 h-6" />

      {/* Text Alignment */}
      <IconBtn 
        label="Align left" 
        onClick={() => editor.chain().focus().setTextAlign("left").run()} 
        pressed={editor.isActive({ textAlign: "left" })}
      >
        <AlignLeft size={16} />
      </IconBtn>
      <IconBtn 
        label="Align center" 
        onClick={() => editor.chain().focus().setTextAlign("center").run()} 
        pressed={editor.isActive({ textAlign: "center" })}
      >
        <AlignCenter size={16} />
      </IconBtn>
      <IconBtn 
        label="Align right" 
        onClick={() => editor.chain().focus().setTextAlign("right").run()} 
        pressed={editor.isActive({ textAlign: "right" })}
      >
        <AlignRight size={16} />
      </IconBtn>

      <Separator orientation="vertical" className="mx-1 h-6" />

      {/* Media & Links */}
      <IconBtn 
        label="Link" 
        onClick={() => {
          const url = window.prompt('Enter URL:');
          if (url) {
            editor.chain().focus().setLink({ href: url }).run();
          }
        }}
        pressed={editor.isActive("link")}
      >
        <LinkIcon size={16} />
      </IconBtn>
      <IconBtn 
        label="Image" 
        onClick={() => {
          const url = window.prompt('Enter image URL:');
          if (url) {
            editor.chain().focus().setImage({ src: url }).run();
          }
        }}
        pressed={false}
      >
        <ImageIcon size={16} />
      </IconBtn>

      <Separator orientation="vertical" className="mx-1 h-6" />

      {/* History */}
      <IconBtn 
        label="Undo" 
        onClick={() => editor.chain().focus().undo().run()}
        pressed={false}
      >
        <Undo2 size={16} />
      </IconBtn>
      <IconBtn 
        label="Redo" 
        onClick={() => editor.chain().focus().redo().run()}
        pressed={false}
      >
        <Redo2 size={16} />
      </IconBtn>
    </div>
  );
}
