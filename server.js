const express = require('express');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use('/generated', express.static('generated'));

// Create directories if they don't exist
if (!fs.existsSync('generated')) {
    fs.mkdirSync('generated');
}

// Random meme data
const memeFormats = [
    {
        id: 'classic',
        name: 'Classic Meme',
        layout: 'top-bottom',
        bgColor: '#000000',
        textColor: '#ffffff'
    },
    {
        id: 'modern',
        name: 'Modern Meme',
        layout: 'center',
        bgColor: '#1a1a1a',
        textColor: '#00ff00'
    },
    {
        id: 'gradient',
        name: 'Gradient Meme',
        layout: 'top-bottom',
        bgColor: 'gradient',
        textColor: '#ffffff'
    },
    {
        id: 'colorful',
        name: 'Colorful Meme',
        layout: 'center',
        bgColor: '#ff6b6b',
        textColor: '#ffffff'
    }
];

const randomPhrases = [
    "When you realize it's Monday again",
    "POV: You're trying to be productive",
    "Me explaining why I need another coffee",
    "When someone asks if I'm okay",
    "Trying to adult like",
    "When you see your bank account",
    "Me pretending to understand",
    "When you find a bug in your code",
    "Trying to look busy at work",
    "When you finally fix the issue"
];

const bottomTexts = [
    "It's fine, everything is fine",
    "This is the way",
    "Such is life",
    "Why are we here? Just to suffer?",
    "I'm not crying, you're crying",
    "Task failed successfully",
    "I'll do it tomorrow",
    "It works on my machine",
    "That's a feature, not a bug",
    "I have no idea what I'm doing"
];

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/api/random-meme', async (req, res) => {
    try {
        // Generate random meme
        const randomFormat = memeFormats[Math.floor(Math.random() * memeFormats.length)];
        const randomTop = randomPhrases[Math.floor(Math.random() * randomPhrases.length)];
        const randomBottom = bottomTexts[Math.floor(Math.random() * bottomTexts.length)];
        
        const outputFilename = `random_meme_${Date.now()}.jpg`;
        const outputPath = path.join(__dirname, 'generated', outputFilename);
        
        await generateRandomMeme(randomFormat, randomTop, randomBottom, outputPath);
        
        res.json({
            success: true,
            imageUrl: `/generated/${outputFilename}`,
            topText: randomTop,
            bottomText: randomBottom,
            format: randomFormat.name
        });
        
    } catch (error) {
        console.error('Error generating random meme:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate random meme'
        });
    }
});

app.post('/api/generate-custom', async (req, res) => {
    try {
        const { topText, bottomText, format } = req.body;
        
        if (!topText && !bottomText) {
            return res.status(400).json({
                success: false,
                error: 'Please provide at least one text'
            });
        }
        
        const selectedFormat = memeFormats.find(f => f.id === format) || memeFormats[0];
        const outputFilename = `custom_meme_${Date.now()}.jpg`;
        const outputPath = path.join(__dirname, 'generated', outputFilename);
        
        await generateRandomMeme(selectedFormat, topText || '', bottomText || '', outputPath);
        
        res.json({
            success: true,
            imageUrl: `/generated/${outputFilename}`,
            topText: topText || '',
            bottomText: bottomText || '',
            format: selectedFormat.name
        });
        
    } catch (error) {
        console.error('Error generating custom meme:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate custom meme'
        });
    }
});

async function generateRandomMeme(format, topText, bottomText, outputPath) {
    const width = 800;
    const height = 600;
    
    try {
        let background;
        
        // Create background based on format
        if (format.bgColor === 'gradient') {
            // Create gradient background
            const gradientSvg = `
                <svg width="${width}" height="${height}">
                    <defs>
                        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" style="stop-color:#ff6b6b;stop-opacity:1" />
                            <stop offset="50%" style="stop-color:#4ecdc4;stop-opacity:1" />
                            <stop offset="100%" style="stop-color:#45b7d1;stop-opacity:1" />
                        </linearGradient>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#grad)" />
                </svg>
            `;
            background = Buffer.from(gradientSvg);
        } else {
            // Create solid color background
            background = {
                create: {
                    width: width,
                    height: height,
                    channels: 3,
                    background: format.bgColor
                }
            };
        }
        
        // Create text overlay SVG
        const textSvg = createTextSvg(format, topText, bottomText, width, height);
        
        // Generate the meme
        const image = format.bgColor === 'gradient' ? 
            sharp(background) : 
            sharp(background);
            
        await image
            .composite([{ input: Buffer.from(textSvg), top: 0, left: 0 }])
            .jpeg({ quality: 90 })
            .toFile(outputPath);
            
        console.log(`Random meme generated: ${outputPath}`);
        
    } catch (error) {
        console.error('Error in generateRandomMeme:', error);
        throw error;
    }
}

function createTextSvg(format, topText, bottomText, width, height) {
    const fontSize = 48;
    const smallFontSize = 36;
    const strokeWidth = 3;
    
    let textElements = '';
    
    if (format.layout === 'top-bottom') {
        // Top text
        if (topText) {
            const topLines = wrapText(topText, width - 40, fontSize);
            topLines.forEach((line, index) => {
                const y = 80 + (index * (fontSize + 10));
                textElements += `
                    <text x="${width/2}" y="${y}" 
                          text-anchor="middle" 
                          font-family="Arial, sans-serif" 
                          font-size="${fontSize}" 
                          font-weight="bold" 
                          fill="${format.textColor}" 
                          stroke="black" 
                          stroke-width="${strokeWidth}">
                        ${escapeXml(line)}
                    </text>
                `;
            });
        }
        
        // Bottom text
        if (bottomText) {
            const bottomLines = wrapText(bottomText, width - 40, fontSize);
            bottomLines.forEach((line, index) => {
                const y = height - 80 - ((bottomLines.length - 1 - index) * (fontSize + 10));
                textElements += `
                    <text x="${width/2}" y="${y}" 
                          text-anchor="middle" 
                          font-family="Arial, sans-serif" 
                          font-size="${fontSize}" 
                          font-weight="bold" 
                          fill="${format.textColor}" 
                          stroke="black" 
                          stroke-width="${strokeWidth}">
                        ${escapeXml(line)}
                    </text>
                `;
            });
        }
    } else {
        // Center layout
        const allText = [topText, bottomText].filter(Boolean).join(' - ');
        if (allText) {
            const lines = wrapText(allText, width - 40, fontSize);
            lines.forEach((line, index) => {
                const y = height/2 + (index - (lines.length-1)/2) * (fontSize + 10);
                textElements += `
                    <text x="${width/2}" y="${y}" 
                          text-anchor="middle" 
                          font-family="Arial, sans-serif" 
                          font-size="${fontSize}" 
                          font-weight="bold" 
                          fill="${format.textColor}" 
                          stroke="black" 
                          stroke-width="${strokeWidth}">
                        ${escapeXml(line)}
                    </text>
                `;
            });
        }
    }
    
    return `
        <svg width="${width}" height="${height}">
            ${textElements}
        </svg>
    `;
}

function wrapText(text, maxWidth, fontSize) {
    const words = text.split(' ');
    const lines = [];
    let currentLine = '';
    
    // Estimate character width
    const avgCharWidth = fontSize * 0.6;
    const maxCharsPerLine = Math.floor(maxWidth / avgCharWidth);
    
    for (let word of words) {
        const testLine = currentLine + (currentLine ? ' ' : '') + word;
        
        if (testLine.length <= maxCharsPerLine) {
            currentLine = testLine;
        } else {
            if (currentLine) {
                lines.push(currentLine);
                currentLine = word;
            } else {
                lines.push(word);
            }
        }
    }
    
    if (currentLine) {
        lines.push(currentLine);
    }
    
    return lines.length > 0 ? lines : [text];
}

function escapeXml(text) {
    return text.replace(/&/g, '&amp;')
               .replace(/</g, '&lt;')
               .replace(/>/g, '&gt;')
               .replace(/"/g, '&quot;')
               .replace(/'/g, '&#39;');
}

app.listen(PORT, () => {
    console.log(`Random Meme Generator running on http://localhost:${PORT}`);
});

module.exports = app;