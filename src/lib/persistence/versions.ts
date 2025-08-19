const KEY = "ce:versions";

export function saveVersion(doc: string) {
  const list: string[] = JSON.parse(localStorage.getItem(KEY) || "[]");
  list.unshift(doc); 
  localStorage.setItem(KEY, JSON.stringify(list.slice(0, 5)));
}

export function listVersions() { 
  return JSON.parse(localStorage.getItem(KEY) || "[]") as string[]; 
}

export function clearVersions() {
  localStorage.removeItem(KEY);
}

export function restoreVersion(index: number): string | null {
  const versions = listVersions();
  return versions[index] || null;
}
