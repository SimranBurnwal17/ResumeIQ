import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { scanAPI } from '../services/api';
import './History.css';

export default function HistoryPage() {
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    scanAPI.list()
      .then((res) => setScans(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="history-page">
        <div className="history-header"><h1>Scan history</h1></div>
        <div className="history-list">
          {[1,2,3].map((i) => (
            <div key={i} className="skeleton" style={{ height: 80, marginBottom: 10 }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="history-page">
      <div className="history-header fade-up">
        <h1>Scan history</h1>
        <button className="btn btn-primary" onClick={() => navigate('/scan')}>+ New scan</button>
      </div>

      {scans.length === 0 ? (
        <div className="history-empty fade-up-1">
          <div style={{ fontSize: 48, marginBottom: 16 }}>📄</div>
          <h2>No scans yet</h2>
          <p>Upload your resume and a job description to get your first match score.</p>
          <button className="btn btn-primary" style={{ marginTop: 20 }} onClick={() => navigate('/scan')}>
            Start your first scan →
          </button>
        </div>
      ) : (
        <div className="history-list">
          {scans.map((scan, i) => {
            const scoreCls = !scan.matchScore ? '' : scan.matchScore >= 75 ? 'score-green' : scan.matchScore >= 50 ? 'score-orange' : 'score-red';
            const date = new Date(scan.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
            return (
              <div
                key={scan._id}
                className={`history-card fade-up`}
                style={{ animationDelay: `${i * 0.05}s` }}
                onClick={() => scan.status === 'done' && navigate(`/results/${scan._id}`)}
              >
                <div className="history-files">
                  <div className="history-filename">📄 {scan.resumeFileName || 'resume'}</div>
                  <div className="history-arrow">→</div>
                  <div className="history-filename">💼 {scan.jdFileName || 'job description'}</div>
                </div>
                <div className="history-meta">
                  <span className="history-date">{date}</span>
                  {scan.status === 'done' && scan.matchScore != null ? (
                    <span className={`history-score ${scoreCls}`}>{scan.matchScore}% match</span>
                  ) : (
                    <span className={`history-status status-${scan.status}`}>{scan.status}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}