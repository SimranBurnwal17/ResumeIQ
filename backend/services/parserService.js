const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const path = require('path');

/**
 * Extracts plain text from a PDF or DOCX buffer.
 */
async function extractText(buffer, originalName) {
  const ext = path.extname(originalName).toLowerCase();
  let raw = '';

  if (ext === '.pdf') {
    const result = await pdfParse(buffer);
    raw = result.text;
  } else if (ext === '.docx' || ext === '.doc') {
    const result = await mammoth.extractRawText({ buffer });
    raw = result.value;
  } else {
    throw new Error(`Unsupported file type: ${ext}. Please upload a PDF or DOCX.`);
  }

  return cleanText(raw);
}

/**
 * Cleans extracted text — removes extra spaces and blank lines.
 */
function cleanText(raw) {
  return raw
    .replace(/\0/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Extracts real technical skill tokens from resume text.
 * Filters out city names, academic words, dates, and resume noise.
 */
function extractSkillTokens(text) {

  // Comprehensive list of real technical skills to look for
  const KNOWN_SKILLS = [
    // Languages
    'javascript', 'typescript', 'python', 'java', 'kotlin', 'swift',
    'c++', 'c#', 'ruby', 'php', 'go', 'rust', 'scala', 'r', 'matlab',
    'bash', 'shell', 'perl', 'dart',

    // Frontend
    'react', 'nextjs', 'next.js', 'vue', 'angular', 'svelte',
    'html', 'css', 'sass', 'tailwind', 'bootstrap', 'jquery',
    'redux', 'webpack', 'vite', 'figma',

    // Backend
    'node', 'nodejs', 'node.js', 'express', 'django', 'flask',
    'fastapi', 'spring', 'springboot', 'laravel', 'rails',
    'graphql', 'rest', 'grpc', 'websocket',

    // Databases
    'mongodb', 'postgresql', 'mysql', 'sqlite', 'redis',
    'elasticsearch', 'cassandra', 'dynamodb', 'firebase',
    'supabase', 'prisma', 'mongoose', 'sequelize',

    // Cloud & DevOps
    'aws', 'gcp', 'azure', 'docker', 'kubernetes', 'terraform',
    'ansible', 'jenkins', 'github', 'gitlab', 'bitbucket',
    'cicd', 'ci/cd', 'linux', 'nginx', 'apache',

    // Mobile
    'flutter', 'react native', 'android', 'ios', 'xcode',

    // AI/ML
    'tensorflow', 'pytorch', 'keras', 'scikit-learn', 'pandas',
    'numpy', 'opencv', 'nlp', 'machine learning', 'deep learning',

    // Tools & Methods
    'git', 'jira', 'agile', 'scrum', 'microservices', 'devops',
    'system design', 'sql', 'nosql', 'api', 'sdk',
  ];

  // Words that should NEVER be treated as skills
  const BLACKLIST = new Set([
    // Cities and places
    'kolkata', 'mumbai', 'delhi', 'bangalore', 'bengaluru', 'hyderabad',
    'pune', 'chennai', 'noida', 'gurgaon', 'india', 'usa', 'remote',
    'london', 'new york', 'singapore', 'dubai',

    // Academic words
    'cgpa', 'gpa', 'btech', 'mtech', 'bsc', 'msc', 'mba', 'phd',
    'engineering', 'management', 'bachelor', 'master', 'degree',
    'university', 'college', 'institute', 'school', 'education',

    // Months and time
    'jan', 'feb', 'mar', 'apr', 'may', 'jun',
    'jul', 'aug', 'sep', 'oct', 'nov', 'dec',
    'january', 'february', 'march', 'april', 'june',
    'july', 'august', 'september', 'october', 'november', 'december',

    // Common resume words
    'experience', 'skills', 'projects', 'summary', 'objective',
    'responsibilities', 'achievements', 'interests', 'languages',
    'hobbies', 'references', 'profile', 'contact', 'address',
    'email', 'phone', 'linkedin', 'github', 'portfolio',
    'internship', 'fresher', 'candidate', 'seeking', 'position',
    'role', 'team', 'work', 'worked', 'developed', 'implemented',
    'designed', 'built', 'created', 'managed', 'led', 'handled',
    'responsible', 'good', 'strong', 'excellent', 'proficient',

    // Numbers and grades
    'first', 'second', 'third', 'year', 'years', 'month', 'months',
  ]);

  const lowerText = text.toLowerCase();
  const found = [];

  // Match multi-word skills first (e.g. "machine learning", "react native")
  for (const skill of KNOWN_SKILLS) {
    if (skill.includes(' ')) {
      if (lowerText.includes(skill) && !found.includes(skill)) {
        found.push(skill);
      }
    }
  }

  // Then match single word skills
  for (const skill of KNOWN_SKILLS) {
    if (!skill.includes(' ')) {
      const regex = new RegExp(`\\b${skill.replace(/[.+]/g, '\\$&')}\\b`, 'i');
      if (regex.test(lowerText) && !found.includes(skill)) {
        found.push(skill);
      }
    }
  }

  // Filter out anything in the blacklist
  const clean = found.filter((s) => !BLACKLIST.has(s.toLowerCase()));

  console.log('[ParserService] Clean skill tokens:', clean.slice(0, 6));

  // Prioritise languages and frameworks over tools
  const PRIORITY = [
    'react', 'nodejs', 'python', 'java', 'javascript', 'typescript',
    'flutter', 'angular', 'vue', 'django', 'spring', 'mongodb',
    'postgresql', 'aws', 'docker', 'kubernetes',
  ];

  const sorted = [
    ...clean.filter((s) => PRIORITY.includes(s)),
    ...clean.filter((s) => !PRIORITY.includes(s)),
  ];

  return sorted.slice(0, 5);
}

module.exports = { extractText, extractSkillTokens, cleanText };