import unittest

from app import extract_youtube_metrics, estimate_audience_profile


class ScraperExtractionTests(unittest.TestCase):
    def test_extract_youtube_metrics(self):
        html = '''
        <html><script>var ytInitialData = {"contents":{"twoColumnWatchNextResults":{"results":{"results":{"contents":[{"videoPrimaryInfoRenderer":{"title":{"runs":[{"text":"Demo Video"}]},"viewCount":{"videoViewCountRenderer":{"viewCount":{"simpleText":"123,456 views"}}},"likeCount":{"simpleText":"42,000"},"commentCount":{"simpleText":"1,200"}}}]}}}}};</script></html>
        '''
        self.assertEqual(extract_youtube_metrics(html), {"avgViews": 123456, "avgLikes": 42000, "avgComments": 1200})

    def test_estimate_audience_profile(self):
        html = '''
        <html><body>
        <div>London, UK</div>
        <div>young creators react to gaming memes and everyday vibes</div>
        <div>this is so funny lol</div>
        <div>college life in London</div>
        </body></html>
        '''
        profile = estimate_audience_profile(html)
        self.assertIn(profile['ageRange'], ['18-24', '25-34'])
        self.assertIn(profile['city'], ['London', 'UK'])
        self.assertIn(profile['confidence'], ['Low', 'Medium', 'High'])


if __name__ == '__main__':
    unittest.main()
