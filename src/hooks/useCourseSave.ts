import { doc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { estimateBytes } from "../utils/estimateSize";
import { uploadLessonContent } from "../utils/storageContent";

const MAX_SAFE = 950_000; // keep headroom below 1 MiB

export async function saveCourseWithOffload(courseId: string, course: any) {
  const clone = structuredClone(course);

  // Offload lesson content if needed
  let size = estimateBytes(clone);

  if (size > MAX_SAFE && Array.isArray(clone.modules)) {
    for (let mi = 0; mi < clone.modules.length; mi++) {
      const mod = clone.modules[mi];
      if (!mod?.lessons) continue;

      for (let li = 0; li < mod.lessons.length; li++) {
        const lesson = mod.lessons[li];
        const hasBigContent = typeof lesson?.content === "string" && lesson.content.length > 0;

        if (!hasBigContent) continue;

        // Try removing content and storing pointer if doc too large
        const test = structuredClone(clone);
        delete test.modules[mi].lessons[li].content;

        if (estimateBytes(test) <= MAX_SAFE) {
          // Replace content with reference
          const { path, url } = await uploadLessonContent(courseId, mi, li, lesson.content);
          clone.modules[mi].lessons[li].contentRef = path;
          clone.modules[mi].lessons[li].contentUrl = url; // optional convenience
          delete clone.modules[mi].lessons[li].content;

          // Recompute remaining size; stop early if we're now safe
          size = estimateBytes(clone);
          if (size <= MAX_SAFE) break;
        }
      }

      if (size <= MAX_SAFE) break;
    }
  }

  if (estimateBytes(clone) > 1_000_000) {
    throw new Error(
      "Course is still too large even after offloading lesson content. Please split content into additional modules/lessons."
    );
  }

  await setDoc(doc(db, "courses", courseId), clone, { merge: true });
}
