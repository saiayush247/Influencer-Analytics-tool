import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import './styles.css';

const CITY_KEYWORDS = {
  London: ['london', 'uk', 'united kingdom'],
  'New York': ['new york', 'nyc'],
  'Los Angeles': ['los angeles', 'la', 'california'],
  Dubai: ['dubai', 'uae'],
  Paris: ['paris', 'france'],
  Tokyo: ['tokyo', 'japan'],
  Seoul: ['seoul', 'korea'],
  Mumbai: ['mumbai', 'india'],
  Toronto: ['toronto', 'canada'],
  Sydney: ['sydney', 'australia'],
  Berlin: ['berlin', 'germany'],
  Singapore: ['singapore'],
  Jakarta: ['jakarta'],
  'Mexico City': ['mexico city', 'mexico'],
  'Cape Town': ['cape town', 'south africa'],
};

const YOUNG_KEYWORDS = ['lol', 'gaming', 'meme', 'college', 'school', 'teen', 'student', 'vibes', 'skincare', 'fashion', 'dance', 'viral', 'gym', 'fitcheck'];
const ADULT_KEYWORDS = ['finance', 'business', 'career', 'salary', 'parenting', 'family', 'wellness', 'investing', 'retirement', 'home', 'travel', 'cooking'];

const normalizeCount = (value) => {
  if (value === null || value === undefined) return 0;
  const text = String(value).trim();
  if (!text) return 0;

  const match = text.match('(\\d[\\d,\\.kKmMbB]*)');
  if (!match) return 0;

  let number = match[1].replace(/,/g, '');
  const lower = number.toLowerCase();

  let multiplier = 1;
  if (lower.endsWith('k')) {
    multiplier = 1000;
    number = lower.slice(0, -1);
  } else if (lower.endsWith('m')) {
    multiplier = 1000000;
    number = lower.slice(0, -1);
  } else if (lower.endsWith('b')) {
    multiplier = 1000000000;
    number = lower.slice(0, -1);
  }

  const parsed = Number.parseFloat(number);
  if (Number.isNaN(parsed)) return 0;
  return Math.round(parsed * multiplier);
};

const extractYouTubeMetrics = (html = '') => {
  const metrics = { avgViews: 0, avgLikes: 0, avgComments: 0 };

  const patterns = {
    avgViews: [
      /"viewCount":{"videoViewCountRenderer":{"viewCount":{"simpleText":"([^"]+)"}}}/i,
      /"viewCountText":{"simpleText":"([^"]+)"}/i,
      /"shortViewCountText":{"simpleText":"([^"]+)"}/i,
    ],
    avgLikes: [/"likeCount":{"simpleText":"([^"]+)"}/i, /"likesCountText":{"simpleText":"([^"]+)"}/i],
    avgComments: [/"commentCount":{"simpleText":"([^"]+)"}/i, /"commentsCountText":{"simpleText":"([^"]+)"}/i],
  };

  Object.entries(patterns).forEach(([key, list]) => {
    for (const pattern of list) {
      const match = html.match(pattern);
      if (match) {
        metrics[key] = normalizeCount(match[1]);
        break;
      }
    }
  });

  if (!metrics.avgViews) {
    const match = html.match(/"viewCount":"([^"]+)"/i);
    if (match) metrics.avgViews = normalizeCount(match[1]);
  }

  if (!metrics.avgLikes) {
    const match = html.match(/"likeCount":"([^"]+)"/i);
    if (match) metrics.avgLikes = normalizeCount(match[1]);
  }

  if (!metrics.avgComments) {
    const match = html.match(/"commentCount":"([^"]+)"/i);
    if (match) metrics.avgComments = normalizeCount(match[1]);
  }

  return metrics;
};

const detectCity = (html = '') => {
  const text = html.toLowerCase();
  const cityScores = Object.fromEntries(Object.keys(CITY_KEYWORDS).map((city) => [city, 0]));

  Object.entries(CITY_KEYWORDS).forEach(([city, aliases]) => {
    aliases.forEach((alias) => {
      cityScores[city] += text.split(alias.toLowerCase()).length - 1;
    });
  });

  const bestCity = Object.entries(cityScores).sort((a, b) => b[1] - a[1])[0];
  if (!bestCity || bestCity[1] === 0) return 'Unknown';
  return bestCity[0];
};

const estimateAudienceProfile = (html = '') => {
  const lowerText = String(html || '').toLowerCase();
  const city = detectCity(lowerText);

  const youngScore = YOUNG_KEYWORDS.reduce((sum, keyword) => sum + lowerText.split(keyword.toLowerCase()).length - 1, 0);
  const adultScore = ADULT_KEYWORDS.reduce((sum, keyword) => sum + lowerText.split(keyword.toLowerCase()).length - 1, 0);

  let ageRange = '25-34';
  if (youngScore > adultScore) {
    ageRange = youngScore >= 5 ? '18-24' : '25-34';
  } else if (adultScore > youngScore) {
    ageRange = adultScore >= 5 ? '25-34' : '35-44';
  }

  const signalCount = youngScore + adultScore + (city !== 'Unknown' ? 1 : 0);
  let confidence = 'Low';
  if (signalCount >= 10) confidence = 'High';
  else if (signalCount >= 4) confidence = 'Medium';

  return {
    ageRange,
    city,
    confidence,
    signals: {
      youngScore,
      adultScore,
      cityDetected: city !== 'Unknown',
    },
  };
};

const formatConfidence = (value = '') => {
  const normalized = String(value || '').trim();
  if (!normalized) return 'Low';
  return normalized.charAt(0).toUpperCase() + normalized.slice(1).toLowerCase();
};

const calculateEngagementRate = ({ views, likes, comments }) => {
  const totalViews = Number(views || 0);
  const totalInteractions = Number(likes || 0) + Number(comments || 0);

  if (!totalViews) return 0;
  return Number(((totalInteractions / totalViews) * 100).toFixed(2));
};

const fetchYouTubePage = async (url) => {
  if (!url || !url.includes('youtube.com')) {
    throw new Error('Please enter a valid YouTube URL.');
  }

  const sanitized = url.replace(/^https?:\/\//i, '');
  const proxyUrl = `https://r.jina.ai/http://${sanitized}`;
  const response = await fetch(proxyUrl, { headers: { Accept: 'text/plain' } });

  if (!response.ok) {
    throw new Error('Unable to read the public YouTube page.');
  }

  return response.text();
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
      const html = await fetchYouTubePage(url);
      const metrics = extractYouTubeMetrics(html);
      const audienceProfile = estimateAudienceProfile(html);

      const avgViews = Number(metrics.avgViews || 0);
      const avgLikes = Number(metrics.avgLikes || 0);
      const avgComments = Number(metrics.avgComments || 0);
      const engagementRate = calculateEngagementRate({ views: avgViews, likes: avgLikes, comments: avgComments });

      setResult({
        platform: 'youtube',
        metrics: {
          avgViews,
          avgLikes,
          avgComments,
          engagementRate,
        },
        summary: {
          avgViews,
          avgLikes,
          avgComments,
          engagementRate,
        },
        audienceProfile,
      });
    } catch (err) {
      setError(err.message || 'Analysis failed.');
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="app-shell">
      <section className="card">
        <h1>YouTube Analytics</h1>
        <p>Analyze public performance signals and estimate audience demographics for a YouTube channel or video.</p>

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
