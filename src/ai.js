import { invoke } from '@tauri-apps/api/tauri';

export async function getAISuggestion(context) {
  // context: short string (editor context) to send to the LLM
  try {
    const suggestion = await invoke('ai_suggest', { context });
    return suggestion;
  } catch (err) {
    console.error('ai_suggest invoke failed:', err);
    // Optionally: implement a fetch fallback here (requires exposing an API key; not recommended)
    throw err;
  }
}