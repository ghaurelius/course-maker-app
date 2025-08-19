import React from 'react';

export function ExportMenu({ getMarkdown }: { getMarkdown: () => string }) {
  const save = (blob: Blob, name: string) => { 
    const a = document.createElement("a"); 
    a.href = URL.createObjectURL(blob); 
    a.download = name; 
    a.click(); 
  };
  
  const onMd = () => save(new Blob([getMarkdown()], {type: "text/markdown"}), "lesson.md");
  const onTxt = () => save(new Blob([getMarkdown().replace(/\*\*|\*/g, "")], {type: "text/plain"}), "lesson.txt");
  const onHtml = () => save(new Blob([`<html><body>${getMarkdown()}</body></html>`], {type: "text/html"}), "lesson.html");
  
  return (
    <div className="dropdown">
      <button className="btn btn-sm w-full">📄 Export ▾</button>
      <div className="menu">
        <button onClick={onMd}>Markdown</button>
        <button onClick={onTxt}>Text</button>
        <button onClick={onHtml}>HTML</button>
      </div>
    </div>
  );
}
