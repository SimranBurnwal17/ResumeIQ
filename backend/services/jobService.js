const axios = require('axios');
const { cosineSimilarity, embed } = require('./matchService');

const JSEARCH_BASE = 'https://jsearch.p.rapidapi.com/search';
const MAX_JOBS_PER_QUERY = 10;
const MIN_MATCH_SCORE = 20;

function buildQuery(skillTokens, location = '') {
  if (skillTokens.length === 0) {
    return `software developer${location ? ' in ' + location : ''}`;
  }

  // Use top 3 skills maximum — more skills makes the query too narrow
  const topSkills = skillTokens
    .slice(0, 3)
    .map((s) => {
      // Normalise common skill names for better search results
      const map = {
        'nodejs': 'Node.js',
        'nextjs': 'Next.js',
        'reactjs': 'React',
        'vuejs': 'Vue.js',
        'node': 'Node.js',
      };
      return map[s.toLowerCase()] || s;
    })
    .join(' ');

  const loc = location ? ` in ${location}` : '';
  return `${topSkills} developer${loc}`;
}

async function fetchJobs(query) {
  const response = await axios.get(JSEARCH_BASE, {
    headers: {
      'X-RapidAPI-Key': process.env.JSEARCH_API_KEY,
      'X-RapidAPI-Host': 'jsearch.p.rapidapi.com',
    },
    params: {
      query,
      page: '1',
      num_pages: '1',
      country: process.env.JOB_COUNTRY || 'in',
    },
  });
  return response.data?.data || [];
}

async function scoreJobMatch(resumeEmbedding, jobDescription) {
  if (!jobDescription || jobDescription.length < 50) return 0;
  try {
    const jobEmb = await embed(jobDescription.slice(0, 3000));
    const sim = cosineSimilarity(resumeEmbedding, jobEmb);
    const MIN = 0.50, MAX = 0.95;
    const clamped = Math.max(MIN, Math.min(MAX, sim));
    return Math.round(((clamped - MIN) / (MAX - MIN)) * 100);
  } catch {
    return 0;
  }
}

function normaliseJob(raw) {
  return {
    title: raw.job_title || '',
    company: raw.employer_name || '',
    location: [raw.job_city, raw.job_state, raw.job_country].filter(Boolean).join(', '),
    source: raw.job_publisher || '',
    applyUrl: raw.job_apply_link || raw.job_google_link || '',
    postedAt: raw.job_posted_at || '',
    salaryMin: raw.job_min_salary || null,
    salaryMax: raw.job_max_salary || null,
    salaryPeriod: raw.job_salary_period || null,
    descriptionSnippet: (raw.job_description || '').slice(0, 400),
    requiredSkills: raw.job_required_skills || [],
    fullDescription: raw.job_description || '',
  };
}

async function aggregateJobs(skillTokens, resumeEmbedding, location = '') {
  if (!process.env.JSEARCH_API_KEY || process.env.JSEARCH_API_KEY === 'your_rapidapi_key_here') {
    console.log('[JobAggregator] No JSearch API key set — skipping job fetch');
    return [];
  }

  const query = buildQuery(skillTokens, location);
  console.log(`[JobAggregator] Query: "${query}"`);

  let rawJobs = [];
  try {
    rawJobs = await fetchJobs(query);
    console.log(`[JobAggregator] Fetched ${rawJobs.length} jobs`);
  } catch (err) {
    console.error('[JobAggregator] JSearch fetch failed:', err.message);
    return [];
  }

  const topJobs = rawJobs.slice(0, MAX_JOBS_PER_QUERY);

  const scoredJobs = await Promise.all(
    topJobs.map(async (raw) => {
      const job = normaliseJob(raw);
      const score = await scoreJobMatch(resumeEmbedding, job.fullDescription);
      const { fullDescription, ...rest } = job;
      return { ...rest, matchScore: score };
    })
  );

  const result = scoredJobs
    .filter((j) => j.matchScore >= MIN_MATCH_SCORE)
    .sort((a, b) => b.matchScore - a.matchScore);

  console.log(`[JobAggregator] ${result.length} jobs passed threshold`);
  return result;
}

module.exports = { aggregateJobs, buildQuery };