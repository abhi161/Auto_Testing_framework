import { Page } from '@playwright/test';

/**
 * Canonical Azure AD (via AWS Cognito federation) login helper.
 * DO NOT hand-write a second auth implementation — see auth-rules.instructions.md.
 */
export class AuthHelper {
  constructor(private page: Page) {}

  async login(): Promise<void> {
    const testUrl = process.env.TEST_URL!;
    const testAuthUrl = process.env.TEST_AUTH_URL;
    const user = process.env.TEST_USER!;
    const pass = process.env.TEST_PASS!;

    await this.page.goto(testAuthUrl ?? testUrl);

    // Microsoft email screen
    const emailInput = this.page.locator('input[type="email"], input[name="loginfmt"]');
    await emailInput.waitFor({ state: 'visible' });
    await emailInput.fill(user);
    await this.page.locator('input[type="submit"][value="Next"]').click();

    // Microsoft password screen
    const passwordInput = this.page.locator('input[type="password"], input[name="passwd"]');
    await passwordInput.waitFor({ state: 'visible' });
    await passwordInput.fill(pass);
    await this.page.locator('input[type="submit"][value="Sign in"]').click();

    // Optional "Stay signed in?" interstitial
    const staySignedIn = this.page.locator('input[type="submit"][value="Yes"]');
    if (await staySignedIn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await staySignedIn.click();
    }

    await this.page.waitForURL((url) => url.origin === new URL(testUrl).origin, { timeout: 30000 });
    await this.page.waitForLoadState('networkidle');
  }
}
