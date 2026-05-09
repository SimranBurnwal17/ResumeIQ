const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function embed(text) {
  const truncated = text.slice(0, 8000);
  const response = await ai.models.embedContent({
    model: 'gemini-embedding-001',
    contents: truncated,
  });
  return response.embeddings[0].values;
}

function cosineSimilarity(a, b) {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

function scaleScore(similarity) {
  const MIN = 0.50, MAX = 0.95;
  const clamped = Math.max(MIN, Math.min(MAX, similarity));
  return Math.round(((clamped - MIN) / (MAX - MIN)) * 100);
}

function extractSection(text, anchors) {
  const lower = text.toLowerCase();
  for (const anchor of anchors) {
    const idx = lower.indexOf(anchor);
    if (idx !== -1) return text.slice(idx, idx + 2000);
  }
  return text.slice(0, 2000);
}

async function scoreMatch(resumeText, jdText) {
  const [resumeEmb, jdEmb] = await Promise.all([
    embed(resumeText),
    embed(jdText),
  ]);
  const overallScore = scaleScore(cosineSimilarity(resumeEmb, jdEmb));

  const resumeSkills  = extractSection(resumeText, ['skills', 'technologies', 'tech stack']);
  const jdRequire     = extractSection(jdText,     ['requirements', 'qualifications', 'skills']);
  const resumeExp     = extractSection(resumeText, ['experience', 'work history', 'employment']);
  const jdResp        = extractSection(jdText,     ['responsibilities', 'what you\'ll do', 'role']);
  const resumeEdu     = extractSection(resumeText, ['education', 'degree', 'certifications']);
  const jdEdu         = extractSection(jdText,     ['education', 'degree', 'qualifications']);

  const [rsE, jrE, reE, jrspE, reuE, jeuE] = await Promise.all([
    embed(resumeSkills), embed(jdRequire),
    embed(resumeExp),    embed(jdResp),
    embed(resumeEdu),    embed(jdEdu),
  ]);

  const breakdown = {
    skills:         scaleScore(cosineSimilarity(rsE,  jrE)),
    experience:     scaleScore(cosineSimilarity(reE,  jrspE)),
    keywords:       scaleScore(cosineSimilarity(resumeEmb, jrE)),
    qualifications: scaleScore(cosineSimilarity(reuE, jeuE)),
  };

  const weights = { skills: 0.35, experience: 0.30, keywords: 0.20, qualifications: 0.15 };
  const weighted = Math.round(
    breakdown.skills         * weights.skills +
    breakdown.experience     * weights.experience +
    breakdown.keywords       * weights.keywords +
    breakdown.qualifications * weights.qualifications
  );

  return {
    matchScore: Math.min(100, Math.max(0, Math.round(weighted * 0.7 + overallScore * 0.3))),
    breakdown,
    resumeEmbedding: resumeEmb,
    jdEmbedding: jdEmb,
  };
}

module.exports = { scoreMatch, embed, cosineSimilarity };