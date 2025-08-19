import { downloadLessonContent } from "./storageContent";

export async function getLessonContent(lesson: any): Promise<string> {
  if (lesson?.contentRef && !lesson.content) {
    return downloadLessonContent(lesson.contentRef);
  }
  return lesson?.content || "";
}

export function shouldWarnAboutSize(html: string): boolean {
  const bytes = new Blob([html]).size;
  return bytes > 700_000;
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
