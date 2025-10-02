import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Feature-based naming mapping (same as generate-gifs.js)
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

function renameVideos() {
  const testResultsDir = path.join(__dirname, '..', 'test-results');

  // Find all video directories
  const videoDirs = [];
  if (fs.existsSync(testResultsDir)) {
    const items = fs.readdirSync(testResultsDir);
    for (const item of items) {
      const fullPath = path.join(testResultsDir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory() && !item.startsWith('.')) {
        const videoPath = path.join(fullPath, 'video.webm');
        if (fs.existsSync(videoPath)) {
          videoDirs.push({ dir: item, fullPath, videoPath });
        }
      }
    }
  }

  console.log(`Found ${videoDirs.length} video directories to rename.`);

  videoDirs.forEach(({ dir, fullPath, videoPath }) => {
    // Extract feature name from directory name
    let featureName = dir;

    // Apply feature-based naming
    let descriptiveName = featureName;
    for (const [key, value] of Object.entries(featureNameMapping)) {
      if (featureName.includes(key)) {
        descriptiveName = value;
        break;
      }
    }

    // Extract browser from path
    const browserMatch = dir.match(/(chromium|firefox|webkit|Mobile-Chrome|Mobile-Safari)/i);
    const browser = browserMatch ? browserMatch[1].toLowerCase().replace('mobile-', '') : 'unknown';

    // Create new directory name
    const newDirName = `${descriptiveName}-${browser}`;
    const newDirPath = path.join(testResultsDir, newDirName);
    const newVideoPath = path.join(newDirPath, 'video.webm');

    try {
      // Create new directory
      if (!fs.existsSync(newDirPath)) {
        fs.mkdirSync(newDirPath, { recursive: true });
      }

      // Move video file
      fs.renameSync(videoPath, newVideoPath);

      // Copy any other files (screenshots, error context, etc.)
      const oldItems = fs.readdirSync(fullPath);
      oldItems.forEach(item => {
        if (item !== 'video.webm') {
          const oldPath = path.join(fullPath, item);
          const newPath = path.join(newDirPath, item);
          try {
            fs.copyFileSync(oldPath, newPath);
          } catch (copyError) {
            console.warn(`Could not copy ${item}:`, copyError.message);
          }
        }
      });

      // Remove old directory
      try {
        fs.rmdirSync(fullPath);
      } catch (rmError) {
        console.warn(`Could not remove old directory ${fullPath}:`, rmError.message);
      }

      console.log(`✅ Renamed: ${dir} → ${newDirName}`);
    } catch (error) {
      console.error(`❌ Failed to rename ${dir}:`, error.message);
    }
  });

  console.log('\n🎉 Video renaming complete!');
}

renameVideos();