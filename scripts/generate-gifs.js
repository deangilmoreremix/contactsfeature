import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const videosDir = path.join(__dirname, '..', 'test-results', 'videos');
const gifsDir = path.join(__dirname, '..', 'gifs');

// Ensure gifs directory exists
if (!fs.existsSync(gifsDir)) {
  fs.mkdirSync(gifsDir, { recursive: true });
}

// Check if ffmpeg is available
try {
  execSync('ffmpeg -version', { stdio: 'pipe' });
} catch (error) {
  console.error('FFmpeg is not installed. Please install FFmpeg to generate GIFs.');
  console.log('On Ubuntu/Debian: sudo apt install ffmpeg');
  console.log('On macOS: brew install ffmpeg');
  console.log('On Windows: Download from https://ffmpeg.org/download.html');
  process.exit(1);
}

// Function to convert video to GIF
function convertToGif(videoPath, gifPath) {
  try {
    // Use ffmpeg to convert video to GIF
    // -vf "fps=10,scale=800:-1:flags=lanczos" sets frame rate and scales width to 800px
    // -y overwrites output files
    const command = `ffmpeg -i "${videoPath}" -vf "fps=15,scale=800:-1:flags=lanczos" -y "${gifPath}"`;
    execSync(command, { stdio: 'inherit' });
    console.log(`✓ Generated GIF: ${gifPath}`);
  } catch (error) {
    console.error(`✗ Failed to convert ${videoPath}:`, error.message);
  }
}

// Feature-based naming mapping
const featureNameMapping = {
  // Contact Card Features
  'contact-card-ai-features': 'contact-card-ai-scoring-insights-tools',
  'ai-tools-walkthrough-AI-To': 'ai-contact-scoring-analysis',
  'ai-tools-walkthrough-AI-To-693aa-mmunication-Hub': 'communication-hub-messaging',
  'communication-email-featur': 'email-composition-communication',
  'contact-detail-overview': 'contact-detail-editing-profiles',
  'ai-web-research-enrichment': 'ai-web-research-enrichment',
  'sales-intelligence-tools': 'sales-intelligence-playbooks',
  'quick-actions-management': 'contact-management-actions',

  // Legacy mappings
  'full-demo-walkthrough': 'complete-app-walkthrough',
  'landing-page-screenshots': 'landing-page-demo',
  'main-app-screenshots': 'main-app-features'
};

// Process all video files
function processVideos() {
  // Find all video files recursively
  const findVideos = (dir) => {
    const results = [];
    if (!fs.existsSync(dir)) return results;

    const items = fs.readdirSync(dir);
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        results.push(...findVideos(fullPath));
      } else if (item.endsWith('.webm') || item.endsWith('.mp4')) {
        results.push(fullPath);
      }
    }
    return results;
  };

  const videoFiles = findVideos(path.join(__dirname, '..', 'test-results'));

  if (videoFiles.length === 0) {
    console.log('No video files found in test-results/ directory. Run tests first to generate videos.');
    return;
  }

  console.log(`Found ${videoFiles.length} video file(s). Converting to GIFs...`);

  videoFiles.forEach(videoPath => {
    const relativePath = path.relative(path.join(__dirname, '..', 'test-results'), videoPath);

    // Extract feature name from path
    let featureName = relativePath.split('/')[0];

    // Apply feature-based naming
    let descriptiveName = featureName;
    for (const [key, value] of Object.entries(featureNameMapping)) {
      if (featureName.includes(key)) {
        descriptiveName = value;
        break;
      }
    }

    // Extract browser from path
    const browserMatch = relativePath.match(/(chromium|firefox|webkit)/i);
    const browser = browserMatch ? browserMatch[1].toLowerCase() : 'unknown';

    // Create descriptive filename
    const gifFile = `${descriptiveName}-${browser}.gif`;
    const gifPath = path.join(gifsDir, gifFile);

    console.log(`Converting: ${relativePath} → ${gifFile}`);
    convertToGif(videoPath, gifPath);
  });

  console.log('\n🎉 GIF generation complete!');
  console.log(`GIFs saved to: ${gifsDir}`);
}

processVideos();