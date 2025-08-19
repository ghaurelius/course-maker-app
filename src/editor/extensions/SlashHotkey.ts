import { Extension } from "@tiptap/core";

export const SlashHotkey = Extension.create<{
  onSlash?: (coords: { top: number; left: number }) => void;
}>({
  name: "slashHotkey",
  addOptions() {
    return { onSlash: undefined };
  },
  addKeyboardShortcuts() {
    return {
      "/": () => {
        const { from } = this.editor.state.selection;
        const { top, left } = this.editor.view.coordsAtPos(from);
        this.options.onSlash?.({ top: top + 20, left });
        return true; // prevent inserting '/'
      },
      Escape: () => {
        this.options.onSlash?.({ top: -1, left: -1 }); // caller can interpret as close
        return false;
      },
    };
  },
});
