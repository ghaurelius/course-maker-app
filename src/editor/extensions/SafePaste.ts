import { Extension } from "@tiptap/core";
import { Plugin } from "prosemirror-state";

export const SafePaste = Extension.create({
  name: "safePaste",
  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          handlePaste(view, event) {
            const e = event as ClipboardEvent;
            const html = e.clipboardData?.getData("text/html") ?? "";
            const text = e.clipboardData?.getData("text/plain") ?? "";

            // Strip scripts from pasted HTML
            if (html && /<script[\s\S]*?>[\s\S]*?<\/script>/i.test(html)) {
              e.preventDefault();
              const clean = html.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "");
              view.dispatch(view.state.tr.insertText(clean));
              return true;
            }

            // Normalize bullet chars to '- '
            if (/^[•*]\s/m.test(text)) {
              e.preventDefault();
              const normalized = text.replace(/^[•*]\s+/gm, "- ");
              view.dispatch(view.state.tr.insertText(normalized));
              return true;
            }

            return false;
          },
        },
      }),
    ];
  },
});
