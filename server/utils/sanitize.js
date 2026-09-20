/**
 * Strips common prompt-injection / jailbreak patterns from text extracted
 * from untrusted PDF uploads before it is interpolated into a Gemini prompt.
 * This is defense-in-depth, not a substitute for treating the LLM output
 * as untrusted (responses are still constrained by responseSchema).
 */
const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior|above)\s+instructions?/gi,
  /disregard\s+(all\s+)?(previous|prior|above)\s+(instructions?|prompts?)/gi,
  /you\s+are\s+now\s+(a|an)\s+/gi,
  /system\s*:\s*/gi,
  /^\s*assistant\s*:/gim,
  /forget\s+(everything|all)\s+(you|above)/gi,
  /new\s+instructions?\s*:/gi,
  /override\s+(your\s+)?(system\s+)?prompt/gi,
  /reveal\s+(your\s+)?(system\s+)?prompt/gi,
  /act\s+as\s+(if\s+you\s+are\s+)?/gi,
  /<\s*\/?\s*(system|instructions?)\s*>/gi,
];

export function sanitizeExtractedText(rawText) {
  if (typeof rawText !== 'string') return '';

  let clean = rawText;
  for (const pattern of INJECTION_PATTERNS) {
    clean = clean.replace(pattern, '[redacted]');
  }

  // Strip null bytes / control characters that could break JSON framing.
  clean = clean.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');

  return clean;
}

export function sanitizeUserQuestion(question) {
  if (typeof question !== 'string') return '';
  const trimmed = question.trim().slice(0, 2000);
  return sanitizeExtractedText(trimmed);
}
