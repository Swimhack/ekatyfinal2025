const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

async function generateOGImage() {
  console.log('🎨 Starting OG image generation...');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();

    // Set viewport to exact OG image dimensions
    await page.setViewport({
      width: 1200,
      height: 630,
      deviceScaleFactor: 2 // Higher quality image
    });

    // Load the HTML template
    const htmlPath = path.join(__dirname, 'og-image-template.html');
    const htmlContent = fs.readFileSync(htmlPath, 'utf-8');

    await page.setContent(htmlContent, {
      waitUntil: 'networkidle0'
    });

    // Wait for fonts to load
    await page.evaluateHandle('document.fonts.ready');

    // Additional wait to ensure everything is rendered
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Take screenshot
    const outputPath = path.join(__dirname, '../public/og-image-new.png');
    await page.screenshot({
      path: outputPath,
      type: 'png',
      clip: {
        x: 0,
        y: 0,
        width: 1200,
        height: 630
      }
    });

    console.log('✅ OG image generated successfully!');
    console.log(`📁 Saved to: ${outputPath}`);
    console.log('📏 Dimensions: 1200 x 630 pixels');

    // Get file size
    const stats = fs.statSync(outputPath);
    const fileSizeInKB = (stats.size / 1024).toFixed(2);
    console.log(`📊 File size: ${fileSizeInKB} KB`);

  } catch (error) {
    console.error('❌ Error generating OG image:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

// Run the function
generateOGImage()
  .then(() => {
    console.log('\n🎉 All done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Failed to generate OG image:', error);
    process.exit(1);
  });
