const express = require('express');
const { YoutubeTranscript } = require('youtube-transcript');
const fs = require('fs');
require('dotenv').config();

const app = express();

// Middleware to parse JSON bodies
app.use(express.json());

// Function to extract video ID from YouTube URL
const extractVideoId = (url) => {
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[7].length === 11) ? match[7] : null;
}

// Function to format milliseconds to timestamp
const formatTime = (milliseconds) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// Function to get captions
const getCaptions = async (videoUrl) => {
    try {
        const videoId = extractVideoId(videoUrl);
        if (!videoId) {
            throw new Error('Invalid YouTube URL');
        }

        // Get transcripts
        const transcripts = await YoutubeTranscript.fetchTranscript(videoId);
        
        // Format the transcripts
        const formattedCaptions = transcripts.map(item => {
            const timestamp = formatTime(item.offset);
            return `[${timestamp}] ${item.text}`;
        }).join('\n');

        // Save captions to a file
        const fileName = `captions-${videoId}.txt`;
        fs.writeFileSync(fileName, formattedCaptions);
        
        return {
            success: true,
            fileName: fileName,
            captions: formattedCaptions,
            rawTranscript: transcripts
        };
    } catch (error) {
        if (error.message.includes('Could not find any transcripts')) {
            throw new Error('No captions available for this video');
        }
        throw error;
    }
}

// API endpoint to get captions
app.post('/api/captions', async (req, res) => {
    try {
        const { videoUrl } = req.body;
        
        if (!videoUrl) {
            return res.status(400).json({
                success: false,
                error: 'Video URL is required'
            });
        }

        const result = await getCaptions(videoUrl);
        const captions = result.rawTranscript;
        const secondsToTimestamp = num => `${Math.floor(num / 3600) ? `${Math.floor(num / 3600)}:`.padStart(3, '0') : ''}${Math.floor((num % 3600) / 60).toString().padStart(2, '0')}:${(num % 60).toString().padStart(2, '0')}`;
        // Reformat captions using the new format.

        const formattedCaptions = captions.map(subtitle => ({
        text: subtitle.text.replace("&amp;#39;","'"), // Retaining the subtitle text
        timestamp: secondsToTimestamp(parseFloat(subtitle.offset)) // Converting start time to YouTube timestamp
  }));

  const formattedCaptionsTimeStamp = formattedCaptions.map(subtitle => ({
    text: subtitle.text, // Retaining the subtitle text
    timestamp: subtitle.timestamp.slice(0,2)+":"+Math.round(parseFloat(subtitle.timestamp.slice(3)))  // Converting start time to YouTube timestamp
}));

 

    // const t = "00:12.55";
    
    // return res.json(t.slice(0,2)+":"+Math.round(parseFloat(t.slice(3))));
  
        res.json(formattedCaptionsTimeStamp);
    } catch (error) {
        console.error('Error:', error.message);
        res.status(500).json({
            success: false,
            error: error.message || 'Internal server error'
        });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        error: 'Something broke!'
    });
});

// Start the server
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});