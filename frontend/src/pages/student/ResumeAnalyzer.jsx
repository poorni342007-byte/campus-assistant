import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { api } from '../../api';

function ResumeAnalyzer({ user }) {
  const [resumeText, setResumeText] = useState('');
  const [targetRole, setTargetRole] = useState('Frontend Developer');
  const [resumeResult, setResumeResult] = useState(null);
  const [resumeLoading, setResumeLoading] = useState(false);
  const [resumeError, setResumeError] = useState('');

  const jobRoles = [
    "Frontend Developer",
    "Backend Developer",
    "Full Stack Developer",
    "Data Scientist",
    "Mobile App Developer"
  ];

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.name.endsWith('.txt')) {
      alert('Only plain text (.txt) files are supported. For PDFs or Word documents, please copy-paste the text content directly.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (evt) => {
      setResumeText(evt.target.result);
    };
    reader.readAsText(file);
  };

  const handleAnalyzeResume = async (e) => {
    if (e) e.preventDefault();
    if (!resumeText.trim()) {
      setResumeError('Please paste your resume text first.');
      return;
    }

    setResumeLoading(true);
    setResumeError('');
    setResumeResult(null);

    try {
      const data = await api.post('/api/resume/analyze', {
        resume_text: resumeText.trim(),
        target_role: targetRole
      });
      setResumeResult(data);
    } catch (err) {
      setResumeError(err.message || 'Error running resume analysis.');
    } finally {
      setResumeLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px', maxWidth: '900px', margin: '0 auto' }}>

      {/* Intro Card */}
      <div className="info-card" style={{ maxWidth: 'none', background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(6, 182, 212, 0.05) 100%)', border: '1px solid rgba(6, 182, 212, 0.1)' }}>
        <h2 style={{ fontSize: '1.5rem', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '1.4rem' }}>📄</span> Smart Resume Analyzer
        </h2>
        <p style={{ color: '#94a3b8', fontSize: '0.95rem', marginTop: '5px' }}>
          Analyze your resume alignment against industry-standard tech roles. Copy-paste your resume text below or upload a plain text (.txt) file to calculate your match score, identify missing skills, and unlock tailored learning suggestions.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>

        {/* Form Card */}
        <div className="info-card" style={{ maxWidth: 'none', padding: '25px' }}>
          <form onSubmit={handleAnalyzeResume} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px', flexWrap: 'wrap' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.8rem' }}>Target Job Profile</label>
                <select
                  className="form-control"
                  style={{ padding: '12px' }}
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  disabled={resumeLoading}
                >
                  {jobRoles.map((role, idx) => (
                    <option key={idx} value={role}>{role}</option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.8rem' }}>Upload Plain Text File (.txt)</label>
                <input
                  type="file"
                  accept=".txt"
                  className="form-control"
                  onChange={handleFileUpload}
                  disabled={resumeLoading}
                  style={{ padding: '8px 12px', fontSize: '0.8rem' }}
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '0.8rem' }}>Paste Resume Text Content</label>
              <textarea
                className="form-control"
                style={{ height: '200px', resize: 'vertical', fontFamily: 'monospace', fontSize: '0.85rem', padding: '12px', backgroundColor: 'rgba(0,0,0,0.2)' }}
                value={resumeText}
                onChange={(e) => setResumeText(e.target.value)}
                placeholder="Paste your resume qualifications, projects, and skills here..."
                disabled={resumeLoading}
              />
            </div>

            {resumeError && <div className="alert alert-error" style={{ margin: 0 }}>⚠️ {resumeError}</div>}

            <button
              type="submit"
              className="btn"
              disabled={resumeLoading || !resumeText.trim()}
              style={{ padding: '14px', fontSize: '0.95rem', background: 'linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)' }}
            >
              {resumeLoading ? (
                <span style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                  <Loader2 className="animate-spin" size={18} /> Analyzing Skill Alignments...
                </span>
              ) : 'Run Resume Match Analysis 🔍'}
            </button>

          </form>
        </div>

        {/* Results Card */}
        {resumeResult && (
          <div className="info-card" style={{ maxWidth: 'none', padding: '25px', border: '1px solid rgba(167, 139, 250, 0.2)' }}>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '20px', marginBottom: '20px', flexWrap: 'wrap', gap: '20px' }}>
              <div>
                <h3 style={{ fontSize: '1.3rem', color: '#ffffff' }}>Analysis Report: {targetRole} Standing</h3>
                <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: '3px' }}>Keyword-based parsing vs. required role credentials</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase' }}>Match Score</div>
                  <div style={{ fontSize: '2.2rem', fontWeight: '800', color: resumeResult.score >= 75 ? '#34d399' : (resumeResult.score >= 50 ? '#fbbf24' : '#f87171') }}>
                    {resumeResult.score}%
                  </div>
                </div>

                <div style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  border: '5px solid rgba(255,255,255,0.05)',
                  borderTop: `5px solid ${resumeResult.score >= 75 ? '#34d399' : (resumeResult.score >= 50 ? '#fbbf24' : '#f87171')}`,
                  transform: 'rotate(-45deg)',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center'
                }}>
                  <span style={{ transform: 'rotate(45deg)', fontSize: '0.75rem', fontWeight: '800', color: '#ffffff' }}>
                    {resumeResult.score >= 70 ? 'PASS' : 'GAP'}
                  </span>
                </div>
              </div>
            </div>

            {/* Skills breakdown columns */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '25px' }}>

              {/* Matched Skills */}
              <div style={{ padding: '15px', borderRadius: '12px', backgroundColor: 'rgba(52, 211, 153, 0.03)', border: '1px solid rgba(52, 211, 153, 0.1)' }}>
                <h4 style={{ color: '#34d399', fontSize: '0.95rem', fontWeight: '700', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  ✓ Matched Skills ({resumeResult.matched_skills.length})
                </h4>
                {resumeResult.matched_skills.length === 0 ? (
                  <p style={{ color: '#94a3b8', fontSize: '0.85rem', fontStyle: 'italic' }}>No matched keywords found.</p>
                ) : (
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {resumeResult.matched_skills.map((skill, i) => (
                      <span key={i} style={{ fontSize: '0.75rem', padding: '4px 10px', borderRadius: '6px', backgroundColor: 'rgba(52, 211, 153, 0.12)', color: '#a7f3d0', border: '1px solid rgba(52, 211, 153, 0.2)' }}>
                        {skill}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Missing Skills */}
              <div style={{ padding: '15px', borderRadius: '12px', backgroundColor: 'rgba(245, 158, 11, 0.03)', border: '1px solid rgba(245, 158, 11, 0.1)' }}>
                <h4 style={{ color: '#fbbf24', fontSize: '0.95rem', fontWeight: '700', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  ✗ Skill Gaps ({resumeResult.missing_skills.length})
                </h4>
                {resumeResult.missing_skills.length === 0 ? (
                  <p style={{ color: '#34d399', fontSize: '0.85rem', fontWeight: '600' }}>✓ Perfect alignment! All target skills found.</p>
                ) : (
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {resumeResult.missing_skills.map((skill, i) => (
                      <span key={i} style={{ fontSize: '0.75rem', padding: '4px 10px', borderRadius: '6px', backgroundColor: 'rgba(245, 158, 11, 0.12)', color: '#fde68a', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                        {skill}
                      </span>
                    ))}
                  </div>
                )}
              </div>

            </div>

            {/* Recommendations */}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '20px' }}>
              <h4 style={{ color: '#ffffff', fontSize: '1rem', fontWeight: '700', marginBottom: '12px' }}>
                🎯 Recommended Action Plan to close gaps
              </h4>
              <ul style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingLeft: '20px', color: '#cbd5e1', fontSize: '0.9rem', lineHeight: '1.6' }}>
                {resumeResult.recommendations.map((rec, i) => (
                  <li key={i}>{rec}</li>
                ))}
              </ul>
            </div>

          </div>
        )}

      </div>

    </div>
  );
}

export default ResumeAnalyzer;
