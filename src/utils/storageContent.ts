import { getStorage, ref, uploadString, getDownloadURL } from "firebase/storage";

const storage = getStorage();

export async function uploadLessonContent(
  courseId: string,
  moduleIdx: number,
  lessonIdx: number,
  htmlOrMd: string
) {
  const path = `courses/${courseId}/lessons/m${moduleIdx}_l${lessonIdx}.html`;
  const r = ref(storage, path);
  await uploadString(r, htmlOrMd, "raw"); // raw = no base64 conversion
  const url = await getDownloadURL(r);
  return { path, url };
}

export async function downloadLessonContent(path: string) {
  const r = ref(storage, path);
  const res = await fetch(await getDownloadURL(r));
  return res.text();
}
