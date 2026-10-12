import { expect, test } from '@playwright/test';

test('landing page renders the product proposition', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /real brain MRI data/i })).toBeVisible();
  await expect(page.getByRole('banner').getByRole('link', { name: 'Sign in' })).toBeVisible();
});

test('protected routes redirect to the sign-in page', async ({ page }) => {
  await page.goto('/app/dashboard');
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
});

test('the application shell renders for a session cookie', async ({ page, context }) => {
  await context.addCookies([
    { name: 'mri-lab_session', value: 'e2e-token', url: 'http://127.0.0.1:3000' },
    {
      name: 'mri-lab_user',
      value: encodeURIComponent(
        JSON.stringify({ displayName: 'Researcher', email: 'r@example.com' }),
      ),
      url: 'http://127.0.0.1:3000',
    },
  ]);

  await page.goto('/app/dashboard');
  await expect(page).toHaveURL(/\/app\/dashboard/);
  await expect(page.getByRole('heading', { name: 'Home' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Primary' })).toBeVisible();
});
