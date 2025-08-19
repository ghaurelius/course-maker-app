import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase"; // matches your CourseEditor import
import TestEditorPage from "./TestEditorPage";
import { confirmDialog } from "../components/ui/confirmDialog";

type Lesson = {
  title?: string;
  content?: string;           // markdown/plain (legacy)
  markdownContent?: string;   // HTML (legacy)
  [k: string]: any;
};
type Module = { title?: string; lessons: Lesson[]; [k: string]: any; };
type CourseDoc = { title?: string; modules?: Module[]; [k: string]: any; };

function mdToHtml(md: string): string {
  if (!md) return "<p></p>";
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const lines = md.split(/\r?\n/);
  const out: string[] = [];
  let inUL = false, inOL = false;

  const closeLists = () => {
    if (inUL) { out.push("</ul>"); inUL = false; }
    if (inOL) { out.push("</ol>"); inOL = false; }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (/^#{1,6}\s+/.test(line)) {
      closeLists();
      const m = line.match(/^(#{1,6})\s+(.*)$/)!;
      const lvl = m[1].length;
      out.push(`<h${lvl}>${esc(m[2])}</h${lvl}>`);
      continue;
    }
    if (/^[-*]\s+/.test(line)) {
      if (!inUL) { closeLists(); out.push("<ul>"); inUL = true; }
      out.push(`<li>${esc(line.replace(/^[-*]\s+/, ""))}</li>`);
      continue;
    }
    if (/^\d+\.\s+/.test(line)) {
      if (!inOL) { closeLists(); out.push("<ol>"); inOL = true; }
      out.push(`<li>${esc(line.replace(/^\d+\.\s+/, ""))}</li>`);
      continue;
    }
    if (line === "") { closeLists(); out.push(""); continue; }
    closeLists();
    out.push(`<p>${esc(line)}</p>`);
  }
  closeLists();
  return out.join("\n").replace(/\n{3,}/g, "\n\n");
}

function htmlToMarkdown(html: string): string {
  return (html || "")
    .replace(/<h1[^>]*>(.*?)<\/h1>/g, "# $1\n\n")
    .replace(/<h2[^>]*>(.*?)<\/h2>/g, "## $1\n\n")
    .replace(/<h3[^>]*>(.*?)<\/h3>/g, "### $1\n\n")
    .replace(/<h4[^>]*>(.*?)<\/h4>/g, "#### $1\n\n")
    .replace(/<h5[^>]*>(.*?)<\/h5>/g, "##### $1\n\n")
    .replace(/<h6[^>]*>(.*?)<\/h6>/g, "###### $1\n\n")
    .replace(/<p[^>]*>(.*?)<\/p>/g, "$1\n\n")
    .replace(/<ul[^>]*>/g, "")
    .replace(/<\/ul>/g, "\n")
    .replace(/<ol[^>]*>/g, "")
    .replace(/<\/ol>/g, "\n")
    .replace(/<li[^>]*>(.*?)<\/li>/g, "- $1\n")
    .replace(/<strong[^>]*>(.*?)<\/strong>/g, "**$1**")
    .replace(/<b[^>]*>(.*?)<\/b>/g, "**$1**")
    .replace(/<em[^>]*>(.*?)<\/em>/g, "*$1*")
    .replace(/<i[^>]*>(.*?)<\/i>/g, "*$1*")
    .replace(/<u[^>]*>(.*?)<\/u>/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export default function EditCoursePage() {
  const { courseId = "" } = useParams();
  const [search, setSearch] = useSearchParams();
  const navigate = useNavigate();

  // URL-driven selection (deep link)
  const m = Math.max(0, Number(search.get("m") ?? 0)); // module index
  const l = Math.max(0, Number(search.get("l") ?? 0)); // lesson index

  const [loading, setLoading] = useState(true);
  const [course, setCourse] = useState<CourseDoc | null>(null);
  const [initialHTML, setInitialHTML] = useState("<p></p>");
  const [dirty, setDirty] = useState(false); // simple unsaved changes flag

  // Load course once
  useEffect(() => {
    (async () => {
      setLoading(true);
      const snap = await getDoc(doc(db, "courses", courseId));
      if (!snap.exists()) {
        const fallback: CourseDoc = {
          title: "Untitled",
          modules: [{ title: "Module 1", lessons: [{ title: "Lesson 1", content: "" }] }],
        };
        setCourse(fallback);
        setInitialHTML("<h1>New Lesson</h1><p>Start writing…</p>");
        setLoading(false);
        return;
      }
      const data = snap.data() as CourseDoc;
      setCourse(data);
      setLoading(false);
    })();
  }, [courseId]);

  // Compute the current lesson object safely
  const currentLesson: Lesson | null = useMemo(() => {
    if (!course?.modules || !course.modules[m]?.lessons) return null;
    return course.modules[m].lessons[l] ?? null;
  }, [course, m, l]);

  // Recompute initial HTML whenever course/m/l change
  useEffect(() => {
    if (!course) return;
    let html = "<h1>New Lesson</h1><p>Start writing…</p>";
    if (currentLesson) {
      if (currentLesson.markdownContent) {
        html = currentLesson.markdownContent;
      } else if (typeof currentLesson.content === "string") {
        html = mdToHtml(currentLesson.content);
      }
    }
    setInitialHTML(html);
    // switching lessons resets dirty flag (we just loaded fresh content)
    setDirty(false);
  }, [course, currentLesson]);

  // Save handler: updates both MD + HTML on the selected lesson
  const handleSave = useCallback(
    async ({ html, markdown }: { html: string; markdown: string }) => {
      if (!course) return;
      const next: CourseDoc = JSON.parse(JSON.stringify(course));

      // ensure indices exist
      next.modules = Array.isArray(next.modules) ? next.modules : [];
      if (!next.modules[m]) next.modules[m] = { title: `Module ${m + 1}`, lessons: [] };
      next.modules[m].lessons = Array.isArray(next.modules[m].lessons) ? next.modules[m].lessons : [];
      if (!next.modules[m].lessons[l]) next.modules[m].lessons[l] = { title: `Lesson ${l + 1}` };

      // write both fields for compatibility
      next.modules[m].lessons[l].content = markdown;        // text/markdown
      next.modules[m].lessons[l].markdownContent = html;    // HTML
      (next as any).updatedAt = serverTimestamp();

      await updateDoc(doc(db, "courses", courseId), next as any);
      setCourse(next);
      setDirty(false);
    },
    [course, courseId, m, l]
  );

  // Let the editor toggle the dirty flag using a very lightweight listener
  // We do this by passing a wrapper onSave, plus a small onChange hook via URL param hack:
  // Instead of plumbing an onChange prop into TestEditorPage, we infer "dirty"
  // when the user focuses the editor and types; we setDirty(true) from a capture listener here.
  useEffect(() => {
    const handler = (e: any) => {
      // only mark dirty if we are inside this page (avoid global pollution)
      const tiptapRoot = document.querySelector(".tiptap");
      if (tiptapRoot && tiptapRoot.contains(e.target as Node)) setDirty(true);
    };
    window.addEventListener("input", handler, { capture: true });
    return () => window.removeEventListener("input", handler, { capture: true } as any);
  }, []);

  // Change selection safely with confirmDialog (no ESLint warning)
  async function selectLesson(nextM: number, nextL: number) {
    if (dirty) {
      const ok = await confirmDialog("You have unsaved changes. Switch without saving?");
      if (!ok) return;
      setDirty(false);
    }
    setSearch(prev => {
      const p = new URLSearchParams(prev);
      p.set("m", String(nextM));
      p.set("l", String(nextL));
      return p;
    }, { replace: true });
  }

  // Add module/lesson helpers (lightweight authoring from this page)
  async function addModule() {
    if (!course) return;
    const next: CourseDoc = JSON.parse(JSON.stringify(course));
    next.modules = next.modules || [];
    next.modules.push({ title: `Module ${next.modules.length + 1}`, lessons: [] });
    await updateDoc(doc(db, "courses", courseId), next as any);
    setCourse(next);
    // jump to new module
    selectLesson(next.modules.length - 1, 0);
  }

  async function addLesson(modIndex: number) {
    if (!course) return;
    const next: CourseDoc = JSON.parse(JSON.stringify(course));
    next.modules = next.modules || [];
    next.modules[modIndex] = next.modules[modIndex] || { title: `Module ${modIndex + 1}`, lessons: [] };
    next.modules[modIndex].lessons.push({ title: `Lesson ${next.modules[modIndex].lessons.length + 1}`, content: "" });
    await updateDoc(doc(db, "courses", courseId), next as any);
    setCourse(next);
    // jump to new lesson
    selectLesson(modIndex, next.modules[modIndex].lessons.length - 1);
  }

  if (loading) return <div style={{ padding: 20 }}>Loading…</div>;
  if (!course) return <div style={{ padding: 20, color: "red" }}>Course not found</div>;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: "16px", padding: "12px" }}>
      {/* Left rail: Modules / Lessons */}
      <aside
        role="navigation"
        aria-label="Course structure"
        style={{
          border: "1px solid var(--ce-border, #e2e8f0)",
          borderRadius: 12,
          background: "var(--ce-bg, #fff)",
          overflow: "hidden",
          height: "calc(100vh - 120px)",
          position: "sticky",
          top: 12,
        }}
      >
        <div style={{ padding: "10px 12px", borderBottom: "1px solid var(--ce-border, #e2e8f0)", fontWeight: 600 }}>
          📚 Course Structure
        </div>
        <div style={{ padding: "10px 12px", display: "flex", gap: 8 }}>
          <button
            className="btn-outline"
            onClick={addModule}
            style={{ fontSize: 12, padding: "6px 8px", borderRadius: 8, border: "1px solid var(--ce-border, #e2e8f0)" }}
          >
            + Module
          </button>
          <button
            className="btn-outline"
            onClick={() => addLesson(m)}
            style={{ fontSize: 12, padding: "6px 8px", borderRadius: 8, border: "1px solid var(--ce-border, #e2e8f0)" }}
          >
            + Lesson
          </button>
        </div>
        <div style={{ padding: "8px 8px 12px", overflowY: "auto", height: "calc(100% - 86px)" }}>
          {(course.modules || []).map((mod, mi) => (
            <div key={mi} style={{ marginBottom: 8 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "8px 10px",
                  borderRadius: 8,
                  background: mi === m ? "rgba(59,130,246,0.12)" : "transparent",
                  border: "1px solid var(--ce-border, #e2e8f0)",
                  cursor: "default",
                }}
              >
                <div style={{ fontWeight: 600, fontSize: 13 }}>
                  📁 {mod.title || `Module ${mi + 1}`}
                </div>
              </div>
              <div style={{ marginTop: 6 }}>
                {(mod.lessons || []).map((les, li) => (
                  <button
                    key={li}
                    onClick={() => selectLesson(mi, li)}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      border: "1px solid var(--ce-border, #e2e8f0)",
                      borderRadius: 8,
                      background: mi === m && li === l ? "rgba(99,102,241,0.14)" : "#fff",
                      padding: "8px 10px",
                      fontSize: 13,
                      marginBottom: 6,
                      cursor: "pointer",
                    }}
                  >
                    📄 {les.title || `Lesson ${li + 1}`}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div style={{ padding: "8px 12px", borderTop: "1px solid var(--ce-border, #e2e8f0)", fontSize: 12, color: "var(--ce-muted, #64748b)" }}>
          {dirty ? "Unsaved changes" : "All changes saved"}
        </div>
      </aside>

      {/* Main: Professional editor */}
      <div>
        <TestEditorPage
          initialHTML={initialHTML}
          courseContext={{ courseId, moduleIndex: m, lessonIndex: l, courseTitle: course.title ?? "Untitled" }}
          onSave={async ({ html, markdown }) => {
            await handleSave({ html, markdown });
          }}
        />
        {/* Optional Save Reminder bar (appears only when dirty) */}
        {dirty && (
          <div
            style={{
              position: "fixed",
              left: "50%",
              bottom: 16,
              transform: "translateX(-50%)",
              background: "var(--ce-bg, #fff)",
              border: "1px solid var(--ce-border, #e2e8f0)",
              borderRadius: 12,
              padding: "8px 12px",
              boxShadow: "0 10px 25px -5px rgba(0,0,0,.1)",
              display: "flex",
              gap: 8,
              alignItems: "center",
              zIndex: 50,
            }}
          >
            <span style={{ fontSize: 13 }}>You have unsaved changes.</span>
            <button
              className="btn-primary"
              onClick={async () => {
                const html = document.querySelector(".prose")?.innerHTML || "<p></p>";
                // Use the same converter to keep parity
                const markdown = htmlToMarkdown(html);
                await handleSave({ html: html!, markdown });
              }}
              style={{ fontSize: 12, padding: "6px 10px", borderRadius: 8 }}
            >
              Save now
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
