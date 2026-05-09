import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { scanAPI } from '../services/api';
import './Results.css';

const STATUS_MESSAGES = {
  queued:       'Queued — waiting to start…',
  parsing:      'Parsing your resume and job description…',
  scoring:      'AI is calculating your match score…',
  fetching_jobs:'Finding matching jobs across portals…',
  done:         'Analysis complete!',
  failed:       'Analysis failed.',
};

const STATUS_PROGRESS = {
  queued: 8, parsing: 25, scoring: 55, fetching_jobs: 80, done: 100, failed: 0,
};

function ScoreRing({ score }) {
  const r = 54;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = score >= 75 ? '#4ADE80' : score >= 50 ? '#FB923C' : '#F87171';

  return (
    <div className="score-ring-wrap">
      <svg width="132" height="132" viewBox="0 0 132 132">
        <circle cx="66" cy="66" r={r} fill="none" stroke="var(--bg3)" strokeWidth="10" />
        <circle
          cx="66" cy="66" r={r} fill="none"
          stroke={color} strokeWidth="10"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 66 66)"
          style={{ transition: 'stroke-dashoffset 1s ease' }}
        />
      </svg>
      <div className="score-ring-inner">
        <div className="score-num" style={{ color }}>{score}%</div>
        <div className="score-label">match</div>
      </div>
    </div>
  );
}

function KeywordBadge({ kw }) {
  const map = {
    present: { cls: 'tag-green', icon: '✓' },
    missing: { cls: 'tag-red', icon: '+' },
    partial: { cls: 'tag-orange', icon: '~' },
  };
  const { cls, icon } = map[kw.status] || map.missing;
  return (
    <div className={`kw-badge ${cls}`} title={kw.suggestion || ''}>
      <span className="kw-icon">{icon}</span>
      <span>{kw.keyword}</span>
      {kw.importance === 'high' && <span className="kw-high">★</span>}
    </div>
  );
}

function JobCard({ job }) {
  const [expanded, setExpanded] = useState(false);
  const scoreColor = job.matchScore >= 75 ? 'green' : job.matchScore >= 50 ? 'orange' : 'red';
  return (
    <div className={`job-card ${expanded ? 'expanded' : ''}`} onClick={() => setExpanded(!expanded)}>
      <div className="job-top">
        <div className="job-logo">{job.company?.[0] || '?'}</div>
        <div className="job-info">
          <div className="job-title">{job.title}</div>
          <div className="job-meta">{job.company} · {job.location || 'Location not specified'}</div>
        </div>
        <div className={`job-score score-${scoreColor}`}>{job.matchScore}%</div>
      </div>
      {job.requiredSkills?.length > 0 && (
        <div className="job-skills">
          {job.requiredSkills.slice(0, 5).map((s) => (
            <span key={s} className="tag tag-purple">{s}</span>
          ))}
        </div>
      )}
      <div className="job-footer">
        <span className="job-source">via {job.source}</span>
        {job.postedAt && <span className="job-posted">{job.postedAt}</span>}
      </div>
      {expanded && (
        <div className="job-expanded">
          {job.descriptionSnippet && <p className="job-snippet">{job.descriptionSnippet}…</p>}
          {job.salaryMin && (
            <p className="job-salary">
              💰 ₹{job.salaryMin.toLocaleString()} – ₹{job.salaryMax?.toLocaleString()} / {job.salaryPeriod || 'year'}
            </p>
          )}
          {job.applyUrl && (
            <a
              href={job.applyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary btn-apply"
              onClick={(e) => e.stopPropagation()}
            >
              Apply now →
            </a>
          )}
        </div>
      )}
    </div>
  );
}

export default function ResultsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('queued');
  const [progress, setProgress] = useState(5);
  const [scan, setScan] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [jobFilter, setJobFilter] = useState(0);
  const [activeTab, setActiveTab] = useState('keywords');
  const [error, setError] = useState('');

  const poll = useCallback(async () => {
    try {
      const res = await scanAPI.getStatus(id);
      const { status: s, progress: p, error: e } = res.data;
      setStatus(s);
      setProgress(p || STATUS_PROGRESS[s] || 0);
      if (e) setError(e);

      if (s === 'done') {
        const [scanRes, jobsRes] = await Promise.all([
          scanAPI.getResult(id),
          scanAPI.getJobs(id),
        ]);
        setScan(scanRes.data);
        setJobs(jobsRes.data.jobs || []);
      }
    } catch {
      setError('Could not fetch results. Please refresh.');
    }
  }, [id]);

  useEffect(() => {
    poll();
    const interval = setInterval(() => {
      if (status === 'done' || status === 'failed') {
        clearInterval(interval);
        return;
      }
      poll();
    }, 2500);
    return () => clearInterval(interval);
  }, [poll, status]);

  const filteredJobs = jobs.filter((j) => j.matchScore >= jobFilter);

  // Loading state
  if (status !== 'done' && status !== 'failed') {
    return (
      <div className="results-loading">
        <div className="loading-glow" />
        <div className="loading-card fade-up">
          <div className="loading-spinner" />
          <h2>{STATUS_MESSAGES[status]}</h2>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <p className="progress-pct">{progress}% complete</p>
          <p className="loading-note">This takes 15–30 seconds. Don't close this tab.</p>
        </div>
      </div>
    );
  }

  if (status === 'failed') {
    return (
      <div className="results-loading">
        <div className="loading-card fade-up">
          <div style={{ fontSize: 40, marginBottom: 16 }}>❌</div>
          <h2>Analysis failed</h2>
          <p style={{ color: 'var(--text2)', marginBottom: 24 }}>{error || 'Something went wrong.'}</p>
          <button className="btn btn-primary" onClick={() => navigate('/scan')}>Try again</button>
        </div>
      </div>
    );
  }

  if (!scan) return null;

  const scoreLabel = scan.matchScore >= 75 ? 'Strong match' : scan.matchScore >= 50 ? 'Moderate match' : 'Weak match';
  const scoreCls = scan.matchScore >= 75 ? 'tag-green' : scan.matchScore >= 50 ? 'tag-orange' : 'tag-red';
  const missingKws = scan.keywords?.filter((k) => k.status === 'missing') || [];
  const partialKws = scan.keywords?.filter((k) => k.status === 'partial') || [];
  const presentKws = scan.keywords?.filter((k) => k.status === 'present') || [];

  return (
    <div className="results-page">
      {/* Score hero */}
      <div className="results-hero fade-up">
        <ScoreRing score={scan.matchScore} />
        <div className="results-hero-text">
          <span className={`tag ${scoreCls}`}>{scoreLabel}</span>
          <h1>Your resume scores <strong>{scan.matchScore}%</strong></h1>
          <p>
            {scan.matchScore >= 75
              ? 'Great fit! A few keyword additions could push you to 90%+.'
              : scan.matchScore >= 50
              ? 'Decent match. Add the missing keywords below to significantly boost your score.'
              : 'Low match. Focus on adding the high-priority missing keywords to your resume.'}
          </p>
        </div>
      </div>

      {/* Breakdown */}
      <div className="breakdown-row fade-up-1">
        {[
          { label: 'Skills', val: scan.breakdown?.skills },
          { label: 'Experience', val: scan.breakdown?.experience },
          { label: 'Keywords', val: scan.breakdown?.keywords },
          { label: 'Qualifications', val: scan.breakdown?.qualifications },
        ].map((b) => (
          <div key={b.label} className="breakdown-card">
            <div className={`breakdown-val ${b.val >= 75 ? 'val-green' : b.val >= 50 ? 'val-orange' : 'val-red'}`}>
              {b.val}%
            </div>
            <div className="breakdown-label">{b.label}</div>
            <div className="breakdown-bar">
              <div className="breakdown-fill" style={{ width: `${b.val}%` }} />
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="results-tabs fade-up-2">
        <button className={`rtab ${activeTab === 'keywords' ? 'active' : ''}`} onClick={() => setActiveTab('keywords')}>
          Keywords {missingKws.length > 0 && <span className="rtab-badge">{missingKws.length} missing</span>}
        </button>
        <button className={`rtab ${activeTab === 'jobs' ? 'active' : ''}`} onClick={() => setActiveTab('jobs')}>
          Job matches <span className="rtab-badge">{jobs.length}</span>
        </button>
      </div>

      {/* Keywords tab */}
      {activeTab === 'keywords' && (
        <div className="keywords-section fade-up-3">
          {missingKws.length > 0 && (
            <div className="kw-group">
              <div className="kw-group-header">
                <span className="kw-group-icon red">✗</span>
                <h3>Missing — add these to your resume</h3>
                <span className="kw-count">{missingKws.length}</span>
              </div>
              <div className="kw-list">
                {missingKws.map((kw) => <KeywordBadge key={kw.keyword} kw={kw} />)}
              </div>
              {missingKws.filter(k => k.suggestion).length > 0 && (
                <div className="kw-suggestions">
                  <h4>💡 How to add them</h4>
                  {missingKws.filter(k => k.suggestion).slice(0, 5).map((kw) => (
                    <div key={kw.keyword} className="kw-suggestion-row">
                      <span className="kw-suggestion-kw">{kw.keyword}</span>
                      <span className="kw-suggestion-text">{kw.suggestion}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {partialKws.length > 0 && (
            <div className="kw-group">
              <div className="kw-group-header">
                <span className="kw-group-icon orange">~</span>
                <h3>Partially matched — strengthen these</h3>
                <span className="kw-count">{partialKws.length}</span>
              </div>
              <div className="kw-list">
                {partialKws.map((kw) => <KeywordBadge key={kw.keyword} kw={kw} />)}
              </div>
            </div>
          )}
          {presentKws.length > 0 && (
            <div className="kw-group">
              <div className="kw-group-header">
                <span className="kw-group-icon green">✓</span>
                <h3>Already in your resume</h3>
                <span className="kw-count">{presentKws.length}</span>
              </div>
              <div className="kw-list">
                {presentKws.map((kw) => <KeywordBadge key={kw.keyword} kw={kw} />)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Jobs tab */}
      {activeTab === 'jobs' && (
        <div className="jobs-section fade-up-3">
          <div className="jobs-filters">
            {[0, 50, 70, 85].map((f) => (
              <button
                key={f}
                className={`filter-chip ${jobFilter === f ? 'active' : ''}`}
                onClick={() => setJobFilter(f)}
              >
                {f === 0 ? 'All jobs' : `${f}%+ match`}
              </button>
            ))}
            <span className="jobs-count">{filteredJobs.length} jobs found</span>
          </div>
          {filteredJobs.length === 0 ? (
            <div className="jobs-empty">
              <p>No jobs found with {jobFilter}%+ match. Try lowering the filter.</p>
            </div>
          ) : (
            <div className="jobs-list">
              {filteredJobs.map((job) => <JobCard key={job._id} job={job} />)}
            </div>
          )}
        </div>
      )}

      {/* New scan CTA */}
      <div className="results-footer fade-up-4">
        <button className="btn btn-ghost" onClick={() => navigate('/scan')}>← Analyse another resume</button>
        <button className="btn btn-ghost" onClick={() => navigate('/history')}>View scan history</button>
      </div>
    </div>
  );
}