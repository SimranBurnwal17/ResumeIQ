import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Landing.css';

export default function Landing() {
  const { user } = useAuth();

  return (
    <div className="landing">
      <section className="hero">
        <div className="hero-glow" />
        <div className="hero-content">
          <div className="hero-badge fade-up">⚡ AI-powered resume matching</div>
          <h1 className="hero-title fade-up-1">
            Know exactly how well<br />
            <span className="hero-highlight">your resume fits</span><br />
            any job — instantly
          </h1>
          <p className="hero-sub fade-up-2">
            Upload your resume and a job description. ResumeIQ scores the match,
            shows missing keywords, and finds aligned jobs across LinkedIn, Indeed & Naukri.
          </p>
          <div className="hero-cta fade-up-3">
            <Link to={user ? '/scan' : '/register'} className="btn btn-primary btn-lg">
              Analyse my resume →
            </Link>
            <Link to="/login" className="btn btn-ghost btn-lg">Log in</Link>
          </div>
          <p className="hero-note fade-up-4">Free to use · No credit card needed</p>
        </div>
      </section>

      <section className="how-section">
        <p className="section-label">How it works</p>
        <h2 className="section-title">From upload to offer in 4 steps</h2>
        <div className="steps-grid">
          {[
            { num: '01', title: 'Upload resume & JD', desc: 'Upload your PDF or DOCX resume and paste or upload the job description.' },
            { num: '02', title: 'AI analyses both', desc: 'Our engine extracts skills, experience, and keywords using embeddings and GPT.' },
            { num: '03', title: 'Get your match score', desc: 'See an overall score plus a breakdown by skills, experience, and qualifications.' },
            { num: '04', title: 'Discover aligned jobs', desc: 'We auto-search job portals and show only jobs where your resume scores high.' },
          ].map((s) => (
            <div key={s.num} className="step-card">
              <div className="step-num">{s.num}</div>
              <h3 className="step-title">{s.title}</h3>
              <p className="step-desc">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="features-section">
        <p className="section-label">Features</p>
        <h2 className="section-title">Everything you need to land the role</h2>
        <div className="features-grid">
          <div className="feature-card feature-big">
            <div className="feature-icon">🎯</div>
            <h3>Resume–JD Match Score</h3>
            <p>Cosine similarity + weighted breakdown across skills, experience, keywords, and qualifications. Know your exact fit before you apply.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🔍</div>
            <h3>Keyword Gap Analysis</h3>
            <p>See exactly which keywords are missing and how to add them naturally to your resume.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">💼</div>
            <h3>Auto Job Matching</h3>
            <p>Scans job portals and ranks results by how well your resume fits — no more random applying.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">⚡</div>
            <h3>ATS Optimisation</h3>
            <p>Improve your ATS compatibility score with specific, actionable keyword suggestions.</p>
          </div>
        </div>
      </section>

      <section className="cta-section">
        <div className="cta-card">
          <div className="cta-glow" />
          <h2>Ready to stop applying blindly?</h2>
          <p>Know your match score before you hit apply.</p>
          <Link to={user ? '/scan' : '/register'} className="btn btn-primary btn-lg">
            Start for free →
          </Link>
        </div>
      </section>
    </div>
  );
}