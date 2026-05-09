const Groq = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const SYSTEM_PROMPT = `You are an expert ATS analyst.
Given a resume and a job description, extract all important keywords and skills from the job description, then classify each one based on how well it appears in the resume.

Respond with ONLY a valid JSON array. No markdown, no backticks, no explanation, no preamble.

Each item must have exactly these fields:
- "keyword": string (1-4 words)
- "status": "present" | "missing" | "partial"
- "importance": "high" | "medium" | "low"  
- "suggestion": string (one sentence on how to add it, empty string if status is "present")

Return 12-20 keywords focused on technical skills, tools, frameworks, and qualifications.`;

async function analyzeKeywordGap(resumeText, jdText) {
  const response = await groq.chat.completions.create({
    model: 'llama-3.1-8b-instant',
    temperature: 0.2,
    max_tokens: 2000,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `RESUME:\n${resumeText.slice(0, 4000)}\n\n---\n\nJOB DESCRIPTION:\n${jdText.slice(0, 3000)}`,
      },
    ],
  });

  const raw = response.choices[0].message.content.trim();

  let keywords;
  try {
    const clean = raw.replace(/```json|```/g, '').trim();
    keywords = JSON.parse(clean);
  } catch {
    const match = raw.match(/\[[\s\S]*\]/);
    if (!match) throw new Error('Groq returned invalid JSON for keyword analysis');
    keywords = JSON.parse(match[0]);
  }

  if (!Array.isArray(keywords)) throw new Error('Result is not an array');

  return keywords
    .filter((k) => k.keyword && k.status && k.importance)
    .map((k) => ({
      keyword:    String(k.keyword).trim(),
      status:     ['present', 'missing', 'partial'].includes(k.status) ? k.status : 'missing',
      importance: ['high', 'medium', 'low'].includes(k.importance) ? k.importance : 'medium',
      suggestion: String(k.suggestion || '').trim(),
    }))
    .sort((a, b) => {
      const s = { missing: 0, partial: 1, present: 2 };
      const imp = { high: 0, medium: 1, low: 2 };
      if (s[a.status] !== s[b.status]) return s[a.status] - s[b.status];
      return imp[a.importance] - imp[b.importance];
    });
}

module.exports = { analyzeKeywordGap };