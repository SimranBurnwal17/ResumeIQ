const Scan = require('../models/Scan');
const JobMatch = require('../models/JobMatch');
const { extractText, extractSkillTokens } = require('./parserService');
const { scoreMatch } = require('./matchService');
const { analyzeKeywordGap } = require('./keywordService');
const { aggregateJobs } = require('./jobService');

async function processScan(scanId, userId, resumeBuffer, resumeFileName, jdBuffer, jdFileName, jdText, location) {
  const setStatus = (status) => Scan.findByIdAndUpdate(scanId, { status });

  try {
    await setStatus('parsing');

    const resumeBuf = Buffer.from(resumeBuffer);
    const resumeText = await extractText(resumeBuf, resumeFileName);

    let resolvedJdText = jdText;
    if (!resolvedJdText && jdBuffer) {
      const jdBuf = Buffer.from(jdBuffer);
      resolvedJdText = await extractText(jdBuf, jdFileName);
    }

    if (!resumeText || resumeText.length < 100) {
      throw new Error('Could not extract text from resume. Please ensure it is not a scanned image.');
    }
    if (!resolvedJdText || resolvedJdText.length < 50) {
      throw new Error('Job description text is too short.');
    }

    await Scan.findByIdAndUpdate(scanId, {
      resumeText,
      jdText: resolvedJdText,
      status: 'scoring',
    });

    const [matchResult, keywords] = await Promise.all([
      scoreMatch(resumeText, resolvedJdText),
      analyzeKeywordGap(resumeText, resolvedJdText),
    ]);

    await Scan.findByIdAndUpdate(scanId, {
      matchScore: matchResult.matchScore,
      breakdown: matchResult.breakdown,
      keywords,
      resumeEmbedding: matchResult.resumeEmbedding,
      jdEmbedding: matchResult.jdEmbedding,
      status: 'fetching_jobs',
    });

    const skillTokens = extractSkillTokens(resumeText);
    console.log('[ScanWorker] Skill tokens:', skillTokens);

    const jobMatches = await aggregateJobs(
      skillTokens,
      matchResult.resumeEmbedding,
      location || ''
    );

    if (jobMatches.length > 0) {
      const docs = jobMatches.map((j) => ({ ...j, scanId, userId }));
      await JobMatch.insertMany(docs);
    }

    await Scan.findByIdAndUpdate(scanId, { status: 'done' });
    console.log(`[ScanWorker] Scan ${scanId} completed. Score: ${matchResult.matchScore}%, Jobs: ${jobMatches.length}`);

  } catch (err) {
    console.error(`[ScanWorker] Failed scanId=${scanId}:`, err.message);
    await Scan.findByIdAndUpdate(scanId, {
      status: 'failed',
      error: err.message,
    });
  }
}

module.exports = { processScan };