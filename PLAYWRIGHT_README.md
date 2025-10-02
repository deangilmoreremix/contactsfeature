# Playwright Automation for Screenshots, Videos, and Demo Walkthroughs

This setup uses Playwright to automate taking screenshots, recording videos, and creating demo walkthroughs of all app features.

## Features Covered

### Landing Page Demos
- AI Contact Scoring
- AI Email Composer
- Smart Filtering & Search
- AI Smart Search
- Live Deal Analysis
- AI Objection Handler
- Instant AI Response
- AI Contact Intelligence

### Main App Features
- Contact Detail View (8 tabs: Overview, Journey Timeline, Analytics, Communication Hub, Automation, Sales Intelligence, AI Insights, Email)
- AI Enrichment & Insights
- Communication Hub
- AI Automation Workflows
- Customizable AI Toolbar

## File Structure

```
tests/playwright/
├── landing-page-screenshots.spec.ts    # Screenshots of landing page demos
├── main-app-screenshots.spec.ts        # Screenshots of main app features
├── ai-tools-walkthrough.spec.ts        # Interactive walkthroughs of AI tools
└── full-demo-walkthrough.spec.ts       # Complete user journey walkthroughs

screenshots/                            # Generated screenshots
walkthrough/                            # Sequential walkthrough screenshots
test-results/videos/                    # Recorded videos
gifs/                                   # Generated GIFs (requires FFmpeg)
```

## Available Scripts

```bash
# Run all tests
npm run test:e2e

# Run only screenshot tests
npm run test:screenshots

# Run only walkthrough tests
npm run test:walkthrough

# Run full demo walkthrough
npm run test:demo

# Open Playwright UI for debugging
npm run test:e2e:ui

# Run tests in headed mode (visible browser)
npm run test:e2e:headed

# Generate GIFs from videos (requires FFmpeg)
npm run generate-gifs
```

## Configuration

- **Base URL**: `http://localhost:5173` (Vite dev server)
- **Browsers**: Chromium, Firefox, WebKit, Mobile Chrome, Mobile Safari
- **Video Recording**: Enabled with 1280x720 resolution, retained on failure
- **Screenshots**: Taken on failure by default, custom screenshots in tests

## Running Tests

1. Start the dev server:
   ```bash
   npm run dev
   ```

2. In another terminal, run the tests:
   ```bash
   # For screenshots only
   npm run test:screenshots

   # For full walkthrough with videos
   npm run test:walkthrough

   # For complete demo
   npm run test:demo
   ```

3. Generate GIFs from videos (optional):
   ```bash
   npm run generate-gifs
   ```

## Output Locations

- **Screenshots**: `screenshots/` directory
- **Walkthrough Screenshots**: `walkthrough/` directory
- **Videos**: `test-results/videos/` directory
- **GIFs**: `gifs/` directory (after running generate-gifs)

## Test Categories

### Screenshots Tests
- Static captures of UI states
- Fast execution
- No user interactions beyond navigation

### Walkthrough Tests
- Interactive simulations of user flows
- Video recording enabled
- Demonstrates actual usage patterns

### Full Demo Tests
- Complete user journeys from landing to advanced features
- Sequential screenshot series
- Comprehensive feature coverage

## Requirements

- Node.js and npm
- FFmpeg (for GIF generation): `sudo apt install ffmpeg` on Ubuntu/Debian

## Customization

- Modify `playwright.config.ts` to change browsers, video settings, or base URL
- Update test selectors in `.spec.ts` files if UI changes
- Adjust screenshot paths and options in test files
- Configure video dimensions and quality in config

## CI/CD Integration

The tests are configured to work in CI environments:
- Automatic dev server startup
- Parallel test execution
- Video recording on failure
- No headed mode in CI

## Troubleshooting

- **Tests failing**: Check if dev server is running on port 5173
- **Element not found**: UI may have changed, update selectors
- **Videos not generating**: Check `test-results/videos/` permissions
- **GIF generation fails**: Install FFmpeg