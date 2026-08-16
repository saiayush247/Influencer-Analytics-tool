import json
import os
import re
from typing import Dict, Optional

import requests
from flask import Flask, jsonify, request

app = Flask(__name__)

REQUEST_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
    'Accept-Language': 'en-US,en;q=0.9',
}

CITY_KEYWORDS = {
    'London': ['london', 'uk', 'united kingdom'],
    'New York': ['new york', 'nyc'],
    'Los Angeles': ['los angeles', 'la', 'california'],
    'Dubai': ['dubai', 'uae'],
    'Paris': ['paris', 'france'],
    'Tokyo': ['tokyo', 'japan'],
    'Seoul': ['seoul', 'korea'],
    'Mumbai': ['mumbai', 'india'],
    'Toronto': ['toronto', 'canada'],
    'Sydney': ['sydney', 'australia'],
    'Berlin': ['berlin', 'germany'],
    'Singapore': ['singapore'],
    'Jakarta': ['jakarta'],
    'Mexico City': ['mexico city', 'mexico'],
    'Cape Town': ['cape town', 'south africa'],
}

YOUNG_KEYWORDS = ['lol', 'gaming', 'meme', 'college', 'school', 'teen', 'student', 'vibes', 'skincare', 'fashion', 'dance', 'viral', 'gym', 'fitcheck']
ADULT_KEYWORDS = ['finance', 'business', 'career', 'salary', 'parenting', 'family', 'wellness', 'investing', 'retirement', 'home', 'travel', 'cooking']


def normalize_count(value: Optional[str]) -> int:
    if value is None:
        return 0

    text = str(value).strip()
    if not text:
        return 0

    match = re.search(r'(\d[\d,\.kKmMbB]*)', text)
    if not match:
        return 0

    number = match.group(1).replace(',', '')
    lower = number.lower()

    multiplier = 1
    if lower.endswith('k'):
        multiplier = 1000
        number = lower[:-1]
    elif lower.endswith('m'):
        multiplier = 1_000_000
        number = lower[:-1]
    elif lower.endswith('b'):
        multiplier = 1_000_000_000
        number = lower[:-1]

    try:
        return int(float(number) * multiplier)
    except ValueError:
        return 0


def extract_youtube_metrics(html: str) -> Dict[str, int]:
    metrics = {'avgViews': 0, 'avgLikes': 0, 'avgComments': 0}

    patterns = {
        'avgViews': [
            r'"viewCount":{"videoViewCountRenderer":{"viewCount":{"simpleText":"([^"]+)"}}}',
            r'"viewCountText":{"simpleText":"([^"]+)"}',
            r'"shortViewCountText":{"simpleText":"([^"]+)"}',
        ],
        'avgLikes': [
            r'"likeCount":{"simpleText":"([^"]+)"}',
            r'"likesCountText":{"simpleText":"([^"]+)"}',
        ],
        'avgComments': [
            r'"commentCount":{"simpleText":"([^"]+)"}',
            r'"commentsCountText":{"simpleText":"([^"]+)"}',
        ],
    }

    for key, regex_list in patterns.items():
        for pattern in regex_list:
            match = re.search(pattern, html, re.I)
            if match:
                metrics[key] = normalize_count(match.group(1))
                break

    if metrics['avgViews'] == 0:
        match = re.search(r'"viewCount":"([^"]+)"', html)
        if match:
            metrics['avgViews'] = normalize_count(match.group(1))

    if metrics['avgLikes'] == 0:
        match = re.search(r'"likeCount":"([^"]+)"', html)
        if match:
            metrics['avgLikes'] = normalize_count(match.group(1))

    if metrics['avgComments'] == 0:
        match = re.search(r'"commentCount":"([^"]+)"', html)
        if match:
            metrics['avgComments'] = normalize_count(match.group(1))

    return metrics


def detect_city(html: str) -> str:
    text = html.lower()
    city_scores: Dict[str, int] = {city: 0 for city in CITY_KEYWORDS}
    for city, aliases in CITY_KEYWORDS.items():
        for alias in aliases:
            city_scores[city] += text.count(alias.lower())

    best_city = max(city_scores, key=city_scores.get, default='Unknown')
    if city_scores[best_city] == 0:
        return 'Unknown'
    return best_city


def estimate_audience_profile(html: str, url: str = '') -> Dict[str, object]:
    lower_text = (html or '').lower()
    city = detect_city(lower_text)

    young_score = sum(lower_text.count(keyword.lower()) for keyword in YOUNG_KEYWORDS)
    adult_score = sum(lower_text.count(keyword.lower()) for keyword in ADULT_KEYWORDS)

    if young_score > adult_score:
        if young_score >= 5:
            age_range = '18-24'
        else:
            age_range = '25-34'
    elif adult_score > young_score:
        if adult_score >= 5:
            age_range = '25-34'
        else:
            age_range = '35-44'
    else:
        age_range = '25-34'

    signal_count = young_score + adult_score + (1 if city != 'Unknown' else 0)
    if signal_count >= 10:
        confidence = 'High'
    elif signal_count >= 4:
        confidence = 'Medium'
    else:
        confidence = 'Low'

    return {
        'ageRange': age_range,
        'city': city,
        'confidence': confidence,
        'signals': {
            'youngScore': young_score,
            'adultScore': adult_score,
            'cityDetected': city != 'Unknown',
        },
    }


def fetch_public_html(url: str) -> str:
    response = requests.get(url, headers=REQUEST_HEADERS, timeout=20)
    response.raise_for_status()
    return response.text


@app.get('/health')
def health():
    return jsonify({"status": "ok"})


@app.post('/scrape')
def scrape_metrics():
    data = request.get_json(force=False, silent=True) or {}
    url = data.get('url', '')

    if not url:
        return jsonify({"error": "A URL is required."}), 400

    platform = 'youtube' if 'youtu' in url.lower() else 'unknown'

    if platform != 'youtube':
        return jsonify({"error": "This tool currently supports YouTube URLs only."}), 400

    try:
        html = fetch_public_html(url)
    except Exception as exc:  # pragma: no cover - network edge case
        return jsonify({"error": f"Unable to fetch page: {str(exc)}"}), 400

    metrics = extract_youtube_metrics(html)

    engagement_rate = 0
    total_views = float(metrics.get('avgViews', 0) or 0)
    total_interactions = float(metrics.get('avgLikes', 0) or 0) + float(metrics.get('avgComments', 0) or 0)
    if total_views:
        engagement_rate = round((total_interactions / total_views) * 100, 2)

    audience_profile = estimate_audience_profile(html, url)

    return jsonify({
        "platform": platform,
        "url": url,
        "metrics": {
            "avgViews": metrics.get('avgViews', 0),
            "avgLikes": metrics.get('avgLikes', 0),
            "avgComments": metrics.get('avgComments', 0),
            "engagementRate": engagement_rate,
        },
        "audienceProfile": audience_profile,
    })


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 5001)), debug=False)
