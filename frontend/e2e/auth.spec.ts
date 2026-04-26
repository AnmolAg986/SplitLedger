import { test, expect } from '@playwright/test';

test.describe('Auth Flow', () => {
  test('User can register, verify OTP, and login', async ({ page }) => {
    // 1. Navigate to register
    await page.goto('/register');
    
    // 2. Fill out registration form
    const timestamp = Date.now();
    const email = `testuser${timestamp}@example.com`;
    const password = 'securePassword123!';
    
    await page.fill('input[name="displayName"]', 'Test User');
    await page.fill('input[name="identifier"]', email);
    await page.fill('input[name="password"]', password);
    await page.check('input[name="agreedToPrivacyPolicy"]'); // Ensure checkbox has correct name or ID
    
    await page.click('button[type="submit"]');

    // 3. Verify OTP screen appears
    await expect(page.locator('text=Verification')).toBeVisible();

    // 4. Fill OTP (hardcoded to '123456' in test mode)
    await page.fill('input[type="text"]', '123456'); // If it's a 6 digit input, this might need specific targeting depending on the OTP component
    // If there are multiple inputs for the OTP:
    const otpInputs = await page.$$('input[type="text"]');
    if (otpInputs.length === 6) {
      for (let i = 0; i < 6; i++) {
        await otpInputs[i].fill('123456'[i]);
      }
    }
    
    await page.click('button:has-text("Verify")');
    
    // 5. Verify successful login and redirect to dashboard
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('text=Test User')).toBeVisible();
    
    // 6. Test Logout
    // (assuming there's a profile menu and logout button)
    // await page.click('button[aria-label="Profile Menu"]');
    // await page.click('text=Logout');
    // await expect(page).toHaveURL('/login');
    
    // 7. Login again
    // await page.fill('input[name="identifier"]', email);
    // await page.fill('input[name="password"]', password);
    // await page.click('button[type="submit"]');
    // await expect(page).toHaveURL('/dashboard');
  });
});
