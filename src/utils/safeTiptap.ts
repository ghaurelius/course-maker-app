// safeTiptap.ts
export function withEditorView(
  editor: any | null,
  attach: (dom: HTMLElement, editor: any) => () => void
) {
  if (!editor) return () => {};

  let rafId: number | null = null;
  let cleanup: (() => void) | null = null;
  let destroyed = false;

  const tryAttach = () => {
    if (!editor || destroyed) return;
    const view = editor.view;
    const dom: HTMLElement | undefined = view?.dom as any;

    if (dom) {
      cleanup = attach(dom, editor);
      return;
    }
    // view not ready yet – try again next frame
    rafId = window.requestAnimationFrame(tryAttach);
  };

  // TipTap fires "create" when the view is available
  editor.on?.("create", tryAttach);
  // also attempt immediately (in case it's already created)
  tryAttach();

  // handle destroy / unmount
  const offDestroy = () => {
    destroyed = true;
    if (rafId) cancelAnimationFrame(rafId);
    if (cleanup) cleanup();
  };
  editor.on?.("destroy", offDestroy);

  // return a React cleanup
  return () => {
    destroyed = true;
    if (rafId) cancelAnimationFrame(rafId);
    if (cleanup) cleanup();
    editor.off?.("create", tryAttach);
    editor.off?.("destroy", offDestroy);
  };
}
