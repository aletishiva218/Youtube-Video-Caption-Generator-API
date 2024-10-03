const express = require('express');
const cors = require('cors');
const { getSubtitles } = require('youtube-captions-scraper');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Route to get captions
app.post('/api/captions', async (req, res) => {
    const { videoUrl } = req.body;

    if (!videoUrl) {
        return res.status(400).json({ error: 'Video URL is required' });
    }

    // Extract video ID from URL
    const videoId = videoUrl.split('v=')[1]?.split('&')[0];

    if (!videoId) {
        return res.status(400).json({ error: 'Invalid YouTube URL' });
    }

    try {
        // Fetch subtitles
        const subtitles = await getSubtitles({ videoID: videoId });
        //converts seconds to Timestamp
    const secondsToTimestamp = num => `${Math.floor(num / 3600) ? `${Math.floor(num / 3600)}:`.padStart(3, '0') : ''}${Math.floor((num % 3600) / 60).toString().padStart(2, '0')}:${(num % 60).toString().padStart(2, '0')}`;
    const formattedCaptions = subtitles.map(subtitle => ({
                text: subtitle.text, // Retaining the subtitle text
                timestamp: secondsToTimestamp(parseFloat(subtitle.start)) // Converting start time to YouTube timestamp
          }));
    return res.json(formattedCaptions);
    } catch (error) {
        return res.status(500).json({ error: 'Failed to fetch captions' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
