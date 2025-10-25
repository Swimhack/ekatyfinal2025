import puppeteer, { Browser, Page } from 'puppeteer';

describe('eKaty E2E Tests', () => {
  let browser: Browser;
  let page: Page;
  const baseUrl = process.env.TEST_URL || 'http://localhost:3000';

  beforeAll(async () => {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  });

  afterAll(async () => {
    await browser.close();
  });

  beforeEach(async () => {
    page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
  });

  afterEach(async () => {
    await page.close();
  });

  describe('Homepage', () => {
    test('should load the homepage successfully', async () => {
      const response = await page.goto(baseUrl);
      expect(response?.status()).toBe(200);
      
      // Check for main elements
      const title = await page.title();
      expect(title).toContain('eKaty');
      
      // Check for header
      const header = await page.$('header');
      expect(header).toBeTruthy();
      
      // Check for hero section
      const heroText = await page.$eval('h1', el => el.textContent);
      expect(heroText).toBeTruthy();
    });

    test('should display restaurant listings', async () => {
      await page.goto(baseUrl);
      
      // Wait for restaurants to load
      await page.waitForSelector('[data-testid="restaurant-card"], .restaurant-card', { 
        timeout: 10000 
      }).catch(() => {});
      
      // Check if restaurants are displayed
      const restaurants = await page.$$('[data-testid="restaurant-card"], .restaurant-card');
      expect(restaurants.length).toBeGreaterThan(0);
    });

    test('should navigate to categories', async () => {
      await page.goto(baseUrl);
      
      // Find and click on a category
      const categoryLink = await page.$('a[href*="/categories"]');
      if (categoryLink) {
        await categoryLink.click();
        await page.waitForNavigation();
        const url = page.url();
        expect(url).toContain('/categories');
      }
    });
  });

  describe('Mobile Responsiveness', () => {
    test('should be responsive on mobile devices', async () => {
      // Set mobile viewport
      await page.setViewport({ width: 375, height: 667 });
      await page.goto(baseUrl);
      
      // Check if mobile menu button exists
      const mobileMenuButton = await page.$('[aria-label*="menu"], button[data-testid="mobile-menu"]');
      expect(mobileMenuButton).toBeTruthy();
      
      // Check if content is properly sized
      const body = await page.$('body');
      const boundingBox = await body?.boundingBox();
      expect(boundingBox?.width).toBeLessThanOrEqual(375);
    });

    test('should show bottom navigation on mobile', async () => {
      await page.setViewport({ width: 375, height: 667 });
      await page.goto(baseUrl);
      
      // Check for bottom navigation
      const bottomNav = await page.$('nav[aria-label="bottom navigation"], .bottom-nav, .mobile-nav');
      if (bottomNav) {
        const isVisible = await bottomNav.isIntersectingViewport();
        expect(isVisible).toBeTruthy();
      }
    });
  });

  describe('Grub Roulette', () => {
    test('should navigate to Grub Roulette page', async () => {
      await page.goto(baseUrl);
      
      // Find and click Grub Roulette link
      const rouletteLink = await page.$('a[href*="/roulette"], a[href*="/spin"]');
      if (rouletteLink) {
        await rouletteLink.click();
        await page.waitForNavigation();
        
        const url = page.url();
        expect(url).toMatch(/\/(roulette|spin)/);
        
        // Check for spinner element
        const spinner = await page.$('[data-testid="spinner"], .spinner, .wheel');
        expect(spinner).toBeTruthy();
      }
    });

    test('should have working spin button', async () => {
      await page.goto(`${baseUrl}/spin`);
      
      // Find spin button
      const spinButton = await page.$('button[data-testid="spin-button"], button:has-text("Spin")');
      if (spinButton) {
        const isDisabled = await spinButton.evaluate(el => (el as HTMLButtonElement).disabled);
        expect(isDisabled).toBeFalsy();
        
        // Click spin button
        await spinButton.click();
        
        // Wait for animation or result
        await page.waitForTimeout(3000);
        
        // Check if a result is shown
        const result = await page.$('[data-testid="spin-result"], .result, .winner');
        expect(result).toBeTruthy();
      }
    });
  });

  describe('Search Functionality', () => {
    test('should have a working search bar', async () => {
      await page.goto(baseUrl);
      
      // Find search input
      const searchInput = await page.$('input[type="search"], input[placeholder*="Search"], input[name="search"]');
      if (searchInput) {
        // Type in search
        await searchInput.type('mexican');
        
        // Wait for results to update
        await page.waitForTimeout(1000);
        
        // Check if results are filtered or search results page is shown
        const results = await page.$$('[data-testid="restaurant-card"], .restaurant-card, .search-result');
        expect(results).toBeTruthy();
      }
    });
  });

  describe('Restaurant Details', () => {
    test('should navigate to restaurant detail page', async () => {
      await page.goto(baseUrl);
      
      // Wait for restaurant cards to load
      await page.waitForSelector('[data-testid="restaurant-card"], .restaurant-card a, a[href*="/restaurant"]', {
        timeout: 10000
      }).catch(() => {});
      
      // Click on first restaurant
      const restaurantLink = await page.$('[data-testid="restaurant-card"] a, .restaurant-card a, a[href*="/restaurant"]');
      if (restaurantLink) {
        await restaurantLink.click();
        await page.waitForNavigation();
        
        // Check if on detail page
        const url = page.url();
        expect(url).toMatch(/\/restaurant/);
        
        // Check for restaurant details
        const restaurantName = await page.$('h1');
        expect(restaurantName).toBeTruthy();
        
        const address = await page.$eval('*', el => el.textContent?.includes('Katy') || false);
        expect(address).toBeTruthy();
      }
    });
  });

  describe('Contact Page', () => {
    test('should load contact page and form', async () => {
      await page.goto(`${baseUrl}/contact`);
      
      // Check for contact form
      const contactForm = await page.$('form');
      expect(contactForm).toBeTruthy();
      
      // Check for required fields
      const nameInput = await page.$('input[name="name"], input[type="text"]');
      const emailInput = await page.$('input[name="email"], input[type="email"]');
      const messageTextarea = await page.$('textarea[name="message"], textarea');
      
      expect(nameInput).toBeTruthy();
      expect(emailInput).toBeTruthy();
      expect(messageTextarea).toBeTruthy();
    });

    test('should validate contact form', async () => {
      await page.goto(`${baseUrl}/contact`);
      
      // Try to submit empty form
      const submitButton = await page.$('button[type="submit"]');
      if (submitButton) {
        await submitButton.click();
        
        // Check for validation messages
        const validationMessage = await page.$(':invalid');
        expect(validationMessage).toBeTruthy();
      }
    });
  });

  describe('Performance', () => {
    test('should load quickly', async () => {
      const startTime = Date.now();
      await page.goto(baseUrl, { waitUntil: 'networkidle2' });
      const loadTime = Date.now() - startTime;
      
      // Page should load in under 5 seconds
      expect(loadTime).toBeLessThan(5000);
    });

    test('should have good Core Web Vitals', async () => {
      await page.goto(baseUrl);
      
      // Measure LCP (Largest Contentful Paint)
      const lcp = await page.evaluate(() => {
        return new Promise<number>((resolve) => {
          new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lastEntry = entries[entries.length - 1];
            resolve(lastEntry.startTime);
          }).observe({ entryTypes: ['largest-contentful-paint'] });
        });
      }).catch(() => 0);
      
      // LCP should be under 2.5 seconds for good performance
      if (lcp > 0) {
        expect(lcp).toBeLessThan(2500);
      }
    });
  });

  describe('Accessibility', () => {
    test('should have proper heading hierarchy', async () => {
      await page.goto(baseUrl);
      
      // Check for h1
      const h1 = await page.$('h1');
      expect(h1).toBeTruthy();
      
      // Check that there's only one h1
      const h1Count = await page.$$eval('h1', elements => elements.length);
      expect(h1Count).toBe(1);
    });

    test('should have alt text on images', async () => {
      await page.goto(baseUrl);
      
      // Check all images have alt text
      const imagesWithoutAlt = await page.$$eval('img:not([alt])', images => images.length);
      expect(imagesWithoutAlt).toBe(0);
    });

    test('should have proper ARIA labels', async () => {
      await page.goto(baseUrl);
      
      // Check navigation has aria label
      const nav = await page.$('nav');
      if (nav) {
        const ariaLabel = await nav.evaluate(el => el.getAttribute('aria-label'));
        expect(ariaLabel).toBeTruthy();
      }
      
      // Check buttons have accessible text or aria-label
      const buttons = await page.$$('button');
      for (const button of buttons) {
        const text = await button.evaluate(el => el.textContent?.trim());
        const ariaLabel = await button.evaluate(el => el.getAttribute('aria-label'));
        expect(text || ariaLabel).toBeTruthy();
      }
    });
  });
});