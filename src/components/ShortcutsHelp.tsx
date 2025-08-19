import React from 'react';

export function ShortcutsHelp() {
  return (
    <div className="card" style={{
      position: "fixed", 
      right: 20, 
      top: 80, 
      zIndex: 1000,
      width: 280,
      maxWidth: "90vw",
      boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
    }}>
      <div className="card-head">Shortcuts</div>
      <div className="rail-body text-sm">
        <div style={{display: "grid", gridTemplateColumns: "1fr auto", gap: "8px 16px", alignItems: "center"}}>
          <div>Bold</div><div style={{fontFamily: "monospace", color: "#666"}}>⌘/Ctrl + B</div>
          <div>Italic</div><div style={{fontFamily: "monospace", color: "#666"}}>⌘/Ctrl + I</div>
          <div>Underline</div><div style={{fontFamily: "monospace", color: "#666"}}>⌘/Ctrl + U</div>
          <div>H1/H2</div><div style={{fontFamily: "monospace", color: "#666"}}>⌘/Ctrl + ⌥ + 1/2</div>
          <div>Bullets/Numbers</div><div style={{fontFamily: "monospace", color: "#666"}}>⌘/Ctrl + ⇧ + 8 / 7</div>
          <div>Toggle Rail</div><div style={{fontFamily: "monospace", color: "#666"}}>⌘/Ctrl + .</div>
        </div>
      </div>
    </div>
  );
}
