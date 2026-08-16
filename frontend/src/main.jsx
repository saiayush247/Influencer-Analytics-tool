import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import './styles.css';

const formatConfidence = (value = '') => {
  const normalized = String(value || '').trim();
  if (!normalized) {
    return 'Low';
  }

  return normalized.charAt(0).toUpperCase() + normalized.slice(1).toLowerCase();
};

function App() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const apiBase = (import.meta.env.VITE_API_URL || 'http://localhost:4001').replace(/\/$/, '');
      const response = await fetch(`${apiBase}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Analysis failed.');
      }

      setResult(data);
    } catch (err) {
      setError(err.message);
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="app-shell">
      <section className="card">
        <h1>YouTube Analytics</h1>
        <p>Analyze public engagement metrics and estimate audience demographics for a YouTube channel or video.</p>

        <form onSubmit={handleSubmit}>
          <input
            type="url"
            name="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            required
          />
          <button type="submit" disabled={loading}>
            {loading ? 'Analyzing...' : 'Analyze'}
          </button>
        </form>

        {error && <div className="message error">{error}</div>}

        {result && (
          <div className="results">
            <div className="result-header">
              <span className="label">Platform</span>
              <strong>{result.platform}</strong>
            </div>

            <div className="stats-grid">
              <div className="stat-box">
                <span>Avg Views</span>
                <strong>{result.metrics.avgViews.toLocaleString()}</strong>
              </div>
              <div className="stat-box">
                <span>Avg Likes</span>
                <strong>{result.metrics.avgLikes.toLocaleString()}</strong>
              </div>
              <div className="stat-box highlight">
                <span>Engagement Rate</span>
                <strong>{result.metrics.engagementRate}%</strong>
              </div>
            </div>

            <div className="summary-box">
              <h3>Summary</h3>
              <ul>
                <li>Average views: {result.summary.avgViews.toLocaleString()}</li>
                <li>Average likes: {result.summary.avgLikes.toLocaleString()}</li>
                <li>Engagement rate: {result.summary.engagementRate}%</li>
              </ul>
            </div>

            <div className="summary-box audience-box">
              <h3>Estimated Audience Profile</h3>
              <div className="audience-grid">
                <div className="audience-card">
                  <span>Estimated age</span>
                  <strong>{result.audienceProfile.ageRange}</strong>
                </div>
                <div className="audience-card">
                  <span>Dominant city</span>
                  <strong>{result.audienceProfile.city}</strong>
                </div>
                <div className="audience-card">
                  <span>Confidence</span>
                  <strong>{formatConfidence(result.audienceProfile.confidence)}</strong>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
