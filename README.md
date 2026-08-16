# YouTube Analytics Tool

A full-stack app for analyzing public YouTube video metrics and estimating audience demographics from public page signals.

## Stack

- Frontend: React + Vite
- Node API: Express
- Python scraper: Flask

## Project structure

- `frontend/` — web UI
- `backend/node-api/` — API layer for engagement calculations
- `backend/python-scraper/` — public YouTube scraping and heuristic audience profiling

## Setup

1. Install Node dependencies in `backend/node-api` and `frontend`.
2. Install Python dependencies in `backend/python-scraper`.
3. Run the Node API and Python scraper.
4. Use the frontend to submit a YouTube URL.

## Engagement formula

Engagement rate is calculated as:

`engagement_rate = ((total_likes + total_comments) / total_views) * 100`

The app also estimates an audience profile using public page text and metadata signals, including likely age range, dominant city/region, and confidence.
