import React, { useState } from 'react';

export default function EditorSearchBar({ editor }: { editor: any }) {
  const [q, setQ] = useState("");
  const [r, setR] = useState("");
  const [currentMatch, setCurrentMatch] = useState(0);
  const [totalMatches, setTotalMatches] = useState(0);
  
  const findAllMatches = (): number[] => {
    if (!editor || !q) return [];
    const html = editor.getHTML();
    const text = editor.getText();
    const matches: number[] = [];
    let index = 0;
    
    while ((index = text.indexOf(q, index)) !== -1) {
      matches.push(index);
      index += q.length;
    }
    
    setTotalMatches(matches.length);
    return matches;
  };
  
  const selectMatch = (matchIndex: number) => {
    if (!editor || !q) return;
    
    try {
      // Get the current HTML content
      let html = editor.getHTML();
      
      // Remove any existing highlights
      html = html.replace(/<mark class="search-highlight[^"]*">/g, '').replace(/<\/mark>/g, '');
      
      // Find all matches and highlight them (with word boundaries)
      const escapedQuery = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b(${escapedQuery})\\b`, 'gi');
      
      let matchCount = 0;
      const highlightedHtml = html.replace(regex, (match: string, p1: string, offset: number, string: string) => {
        const isCurrentMatch = matchCount === currentMatch;
        matchCount++;
        
        if (isCurrentMatch) {
          return `<mark class="search-highlight search-current">${p1}</mark>`;
        } else {
          return `<mark class="search-highlight">${p1}</mark>`;
        }
      });
      
      // Update the editor content with highlights
      editor.commands.setContent(highlightedHtml);
      
      // Scroll to the current match
      setTimeout(() => {
        const currentHighlight = document.querySelector('.search-current');
        if (currentHighlight) {
          currentHighlight.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
          });
        }
      }, 100);
      
      // Update total matches
      setTotalMatches(matchCount);
      
      editor.commands.focus();
      
    } catch (error) {
      console.log('Search error:', error);
      editor.commands.focus();
    }
  };
  
  const find = () => {
    if (!editor || !q) return;
    const matches = findAllMatches();
    if (matches.length > 0) {
      const matchIndex = matches[currentMatch % matches.length];
      selectMatch(matchIndex);
    }
  };
  
  const findNext = () => {
    if (!editor || !q) return;
    const matches = findAllMatches();
    if (matches.length > 0) {
      const nextMatch = (currentMatch + 1) % matches.length;
      setCurrentMatch(nextMatch);
      const matchIndex = matches[nextMatch];
      selectMatch(matchIndex);
    }
  };
  
  const findPrevious = () => {
    if (!editor || !q) return;
    const matches = findAllMatches();
    if (matches.length > 0) {
      const prevMatch = currentMatch === 0 ? matches.length - 1 : currentMatch - 1;
      setCurrentMatch(prevMatch);
      const matchIndex = matches[prevMatch];
      selectMatch(matchIndex);
    }
  };
  
  const replace = () => {
    if (!editor || !q || !r) return;
    
    // Get current content and replace only the current highlighted match
    let html = editor.getHTML();
    
    // Remove existing highlights
    html = html.replace(/<mark class="search-highlight[^"]*">/g, '').replace(/<\/mark>/g, '');
    
    // Find all matches with word boundaries
    const escapedQuery = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const wordBoundaryRegex = new RegExp(`\\b${escapedQuery}\\b`, 'gi');
    
    let matchCount = 0;
    const replacedHtml = html.replace(wordBoundaryRegex, (match: string) => {
      if (matchCount === currentMatch) {
        matchCount++;
        return r; // Replace this specific match
      }
      matchCount++;
      return match; // Keep other matches unchanged
    });
    
    editor.commands.setContent(replacedHtml);
    editor.commands.focus();
    
    // Update search to show remaining matches
    setTimeout(() => find(), 100);
  };
  
  const replaceAll = () => {
    if (!editor || !q || !r) return;
    
    let html = editor.getHTML();
    
    // Remove existing highlights
    html = html.replace(/<mark class="search-highlight[^"]*">/g, '').replace(/<\/mark>/g, '');
    
    // Replace all matches with word boundaries
    const escapedQuery = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const wordBoundaryRegex = new RegExp(`\\b${escapedQuery}\\b`, 'gi');
    const newHtml = html.replace(wordBoundaryRegex, r);
    
    editor.commands.setContent(newHtml);
    editor.commands.focus();
    setCurrentMatch(0);
    setTotalMatches(0);
  };
  
  // Update search when query changes
  React.useEffect(() => {
    if (q) {
      findAllMatches();
      setCurrentMatch(0);
    } else {
      setTotalMatches(0);
      setCurrentMatch(0);
    }
  }, [q]);
  
  return (
    <div className="card">
      <div className="card-head">Find & Replace</div>
      <div className="rail-body">
        <div className="mb-2">
          <input 
            className="input w-full mb-1" 
            placeholder="Find" 
            value={q} 
            onChange={e => setQ(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') find();
              if (e.key === 'F3' || (e.key === 'Enter' && e.shiftKey)) findNext();
            }}
          />
          {totalMatches > 0 && (
            <div className="text-xs text-muted mb-1">
              {currentMatch + 1} of {totalMatches} matches
            </div>
          )}
          <div className="flex gap-1">
            <button className="btn btn-sm" onClick={findPrevious} disabled={totalMatches === 0}>↑</button>
            <button className="btn btn-sm" onClick={findNext} disabled={totalMatches === 0}>↓</button>
            <button className="btn btn-sm flex-1" onClick={find}>Find</button>
          </div>
        </div>
        <div className="mb-2">
          <input 
            className="input w-full mb-1" 
            placeholder="Replace" 
            value={r} 
            onChange={e => setR(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && replace()}
          />
          <div className="flex gap-1">
            <button className="btn btn-sm" onClick={replace} disabled={totalMatches === 0}>Replace</button>
            <button className="btn btn-sm" onClick={replaceAll} disabled={totalMatches === 0}>All</button>
          </div>
        </div>
      </div>
    </div>
  );
}
