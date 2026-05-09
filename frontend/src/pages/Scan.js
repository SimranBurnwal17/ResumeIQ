import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { scanAPI } from '../services/api';
import './Scan.css';

export default function ScanPage() {
  const [resumeFile, setResumeFile] = useState(null);
  const [jdFile, setJdFile] = useState(null);
  const [jdText, setJdText] = useState('');
  const [jdMode, setJdMode] = useState('text');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const resumeRef = useRef();
  const jdRef = useRef();
  const navigate = useNavigate();

  const handleFileDrop = (e, setter) => {
    e.preventDefault();
    const file = e.dataTransfer?.files[0] || e.target.files[0];
    if (file) setter(file);
  };

  const canSubmit = resumeFile && (jdMode === 'text' ? jdText.trim().length > 50 : jdFile);

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setError(''); setLoading(true);
    try {
      const formData = new FormData();
      formData.append('resume', resumeFile);
      if (jdMode === 'file') formData.append('jd', jdFile);
      else formData.append('jdText', jdText);
      if (location) formData.append('location', location);
      const res = await scanAPI.create(formData);
      navigate(`/results/${res.data.scanId}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to start scan. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="scan-page">
      <div className="scan-header fade-up">
        <h1>Analyse your resume</h1>
        <p>Upload your resume and job description — we'll score the match and find relevant jobs.</p>
      </div>
      {error && <div className="scan-error fade-up">{error}</div>}
      <div className="scan-grid">
        <div className="scan-card fade-up-1">
          <div className="scan-card-header">
            <span className="scan-step">01</span>
            <h2>Your resume</h2>
          </div>
          <div className={`upload-zone ${resumeFile ? 'uploaded' : ''}`}
            onClick={() => resumeRef.current.click()}
            onDrop={(e) => handleFileDrop(e, setResumeFile)}
            onDragOver={(e) => e.preventDefault()}>
            <input type="file" ref={resumeRef} accept=".pdf,.doc,.docx"
              style={{ display: 'none' }} onChange={(e) => handleFileDrop(e, setResumeFile)} />
            {resumeFile ? (
              <div className="upload-done">
                <div className="upload-done-icon">✓</div>
                <div className="upload-done-name">{resumeFile.name}</div>
                <div className="upload-done-size">{(resumeFile.size / 1024).toFixed(0)} KB · Click to change</div>
              </div>
            ) : (
              <div className="upload-placeholder">
                <div className="upload-icon">📄</div>
                <div className="upload-label">Drop your resume here</div>
                <div className="upload-sub">PDF or DOCX · Max 5MB</div>
              </div>
            )}
          </div>
        </div>

        <div className="scan-card fade-up-2">
          <div className="scan-card-header">
            <span className="scan-step">02</span>
            <h2>Job description</h2>
          </div>
          <div className="jd-mode-tabs">
            <button className={`jd-tab ${jdMode === 'text' ? 'active' : ''}`} onClick={() => setJdMode('text')}>Paste text</button>
            <button className={`jd-tab ${jdMode === 'file' ? 'active' : ''}`} onClick={() => setJdMode('file')}>Upload file</button>
          </div>
          {jdMode === 'text' ? (
            <textarea className="jd-textarea"
              placeholder="Paste the full job description here…"
              value={jdText} onChange={(e) => setJdText(e.target.value)} rows={10} />
          ) : (
            <div className={`upload-zone ${jdFile ? 'uploaded' : ''}`}
              onClick={() => jdRef.current.click()}
              onDrop={(e) => handleFileDrop(e, setJdFile)}
              onDragOver={(e) => e.preventDefault()}>
              <input type="file" ref={jdRef} accept=".pdf,.doc,.docx"
                style={{ display: 'none' }} onChange={(e) => handleFileDrop(e, setJdFile)} />
              {jdFile ? (
                <div className="upload-done">
                  <div className="upload-done-icon">✓</div>
                  <div className="upload-done-name">{jdFile.name}</div>
                  <div className="upload-done-size">{(jdFile.size / 1024).toFixed(0)} KB</div>
                </div>
              ) : (
                <div className="upload-placeholder">
                  <div className="upload-icon">📋</div>
                  <div className="upload-label">Drop job description here</div>
                  <div className="upload-sub">PDF or DOCX · Max 5MB</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="scan-location fade-up-3">
        <label>📍 Your location <span>(optional — improves job matches)</span></label>
        <input type="text" placeholder="e.g. Bengaluru, Mumbai, Remote"
          value={location} onChange={(e) => setLocation(e.target.value)} />
      </div>

      <div className="scan-submit fade-up-4">
        <button className="btn btn-primary btn-xl" onClick={handleSubmit} disabled={!canSubmit || loading}>
          {loading ? <><span className="spinner" /> Starting analysis…</> : '⚡ Analyse match'}
        </button>
        {!canSubmit && <p className="scan-hint">Upload your resume and add a job description to continue</p>}
      </div>
    </div>
  );
}