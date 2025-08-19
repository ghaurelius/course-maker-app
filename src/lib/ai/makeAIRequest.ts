type AIRequest = {
  prompt: string;
  model?: string;
  temperature?: number;
  signal?: AbortSignal;
};

export async function makeAIRequest({ 
  prompt, 
  model = "gpt-4o-mini", 
  temperature = 0.3, 
  signal 
}: AIRequest) {
  // Use your proxy or server route here. Avoid pulling in React/other app files.
  const url =
    process.env.REACT_APP_AI_PROXY_URL ||
    (import.meta as any).env?.VITE_AI_PROXY_URL ||
    "/api/ai/proxy";

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, model, temperature }),
    signal,
  });

  if (!res.ok) {
    const msg = await res.text();
    throw new Error(`AI request failed: ${res.status} ${msg}`);
  }
  return res.json();
}
