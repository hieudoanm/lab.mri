import { chromium } from '@playwright/test';

const baseUrl = process.env.DEMO_WEB_URL ?? 'http://localhost:3000';
const apiBaseUrl = process.env.DEMO_API_URL ?? 'http://localhost:8000/api/v1';
const videoDirectory = process.env.DEMO_VIDEO_DIRECTORY!;

const sleep = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

const log = (message: string) => {
  console.info(`[create-demo] ${message}`);
};

interface AccessTokenResponse {
  access_token: string;
  expires_at: string;
}

interface ProjectMember {
  user_id: string;
  email: string;
  display_name: string;
  role: string;
}

interface MembershipListResponse {
  items: ProjectMember[];
}

interface ErrorEnvelope {
  error?: { code?: string; message?: string };
}

interface ApiResult<T> {
  status: number;
  body: T;
}

async function mintDevelopmentToken(
  email: string,
  displayName?: string,
): Promise<AccessTokenResponse> {
  const response = await fetch(`${apiBaseUrl}/auth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, display_name: displayName }),
  });
  if (!response.ok) {
    throw new Error(
      `Development sign-in failed for ${email} (${response.status}): ${await response.text()}`,
    );
  }
  return (await response.json()) as AccessTokenResponse;
}

async function callApi<T>(
  path: string,
  token: string,
  init: RequestInit = {},
): Promise<ApiResult<T>> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
    },
  });
  const body = (await response.json().catch(() => ({}))) as T;
  return { status: response.status, body };
}

const expectError = (
  result: ApiResult<ErrorEnvelope>,
  status: number,
  code: string,
  action: string,
) => {
  if (result.status !== status || result.body.error?.code !== code) {
    throw new Error(
      `${action}: expected ${status} ${code}, got ${result.status}: ${JSON.stringify(result.body)}`,
    );
  }
};

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo: { dir: videoDirectory, size: { width: 1440, height: 900 } },
  });
  const page = await context.newPage();
  page.setDefaultTimeout(30_000);
  page.setDefaultNavigationTimeout(30_000);

  try {
    // Scene 1 — Landing page and private-by-default positioning.
    log('Scene 1: landing page');
    await page.goto(baseUrl, { waitUntil: 'networkidle' });
    await page
      .getByRole('heading', {
        name: 'Explore real brain MRI data and run computational neuroscience experiments.',
      })
      .waitFor();
    await page.getByText('Private by default', { exact: true }).waitFor();
    await page.getByRole('heading', { name: 'View', exact: true }).waitFor();
    await page.getByRole('heading', { name: 'Compute', exact: true }).waitFor();
    await page.getByRole('heading', { name: 'Share', exact: true }).waitFor();
    await sleep(1500);

    // Scene 2 — Route guard and development sign-in.
    log('Scene 2: route guard and development sign-in');
    await page.goto(`${baseUrl}/app/dashboard`);
    await page.waitForURL(/\/login\?next=/);
    await page.getByRole('heading', { name: 'Sign in' }).waitFor();
    await sleep(1200);

    const identity = await mintDevelopmentToken('demo@mri-lab.local', 'Demo Researcher');
    await context.addCookies([
      {
        name: 'mri-lab_session',
        value: identity.access_token,
        domain: 'localhost',
        path: '/',
      },
      {
        name: 'mri-lab_user',
        value: encodeURIComponent(
          JSON.stringify({
            displayName: 'Demo Researcher',
            email: 'demo@mri-lab.local',
          }),
        ),
        domain: 'localhost',
        path: '/',
      },
    ]);
    await page.goto(`${baseUrl}/app/dashboard`, { waitUntil: 'networkidle' });

    // Scene 3 — Dashboard and workspace usage.
    log('Scene 3: dashboard');
    await page.getByRole('heading', { name: 'Home', exact: true }).waitFor();
    await page.getByText('Storage used', { exact: true }).waitFor();
    await page.getByRole('heading', { name: 'Recent runs', exact: true }).waitFor();
    await page.getByRole('heading', { name: 'Projects', exact: true }).waitFor();
    await page.getByRole('heading', { name: 'Workspace usage', exact: true }).waitFor();
    await sleep(1800);

    // Scene 4 — Browse projects.
    log('Scene 4: browse projects');
    await page
      .getByRole('navigation', { name: 'Primary' })
      .getByRole('link', { name: 'Projects', exact: true })
      .click();
    await page.getByRole('heading', { name: 'Projects', exact: true }).waitFor();
    await page.getByRole('button', { name: 'New project' }).waitFor();
    await page.getByRole('link', { name: 'Development Project' }).waitFor();
    await sleep(1500);

    // Scene 5 — Create a project.
    log('Scene 5: create a project');
    const demoStamp = new Date()
      .toISOString()
      .replace(/[-:.TZ]/g, '')
      .slice(0, 14);
    const projectName = `MRI Lab Demo Project ${demoStamp}`;
    await page.getByRole('button', { name: 'New project' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('heading', { name: 'New project' }).waitFor();
    const nameInput = dialog.getByLabel('Name');
    const nameRequired = await nameInput.evaluate(
      (element) => (element as HTMLInputElement).required,
    );
    if (!nameRequired) {
      throw new Error('The project name field is not marked as required.');
    }
    await dialog.getByRole('button', { name: 'Create project' }).click();
    await sleep(800);
    await nameInput.fill(projectName);
    await dialog
      .getByLabel('Description')
      .fill('Synthetic project used to demonstrate the MRI Lab workflow.');
    await sleep(600);
    await dialog.getByRole('button', { name: 'Create project' }).click();
    await page.getByRole('link', { name: projectName }).waitFor();
    await sleep(1200);

    // Scene 6 — Project detail.
    log('Scene 6: project detail');
    await page.getByRole('link', { name: projectName }).click();
    await page.waitForURL(/\/app\/projects\/[0-9a-f-]+$/i);
    await page.getByRole('heading', { name: projectName }).waitFor();
    await page.getByRole('heading', { name: 'Details', exact: true }).waitFor();
    await page.getByText('Visibility', { exact: true }).waitFor();
    await page.getByRole('heading', { name: 'Datasets', exact: true }).waitFor();
    await page.getByRole('heading', { name: 'Recent runs', exact: true }).waitFor();
    await sleep(1600);

    const projectId = page.url().match(/\/app\/projects\/([0-9a-f-]+)$/i)?.[1];
    if (!projectId) {
      throw new Error('Could not identify the newly created project.');
    }

    // Scene 7 — Members and roles.
    log('Scene 7: members and roles');
    const members = await callApi<MembershipListResponse>(
      `/projects/${projectId}/members`,
      identity.access_token,
    );
    if (members.status !== 200 || members.body.items.length === 0) {
      throw new Error(
        `Listing project members failed (${members.status}): ${JSON.stringify(members.body)}`,
      );
    }
    const owner = members.body.items.find((member) => member.role === 'owner');
    if (!owner) {
      throw new Error('The demo project has no owner.');
    }

    const added = await callApi<ProjectMember>(
      `/projects/${projectId}/members`,
      identity.access_token,
      {
        method: 'POST',
        body: JSON.stringify({
          email: 'viewer@mri-lab.local',
          display_name: 'Demo Viewer',
          role: 'viewer',
        }),
      },
    );
    if (added.status !== 201) {
      throw new Error(`Adding a viewer failed (${added.status}): ${JSON.stringify(added.body)}`);
    }

    const viewer = await mintDevelopmentToken('viewer@mri-lab.local', 'Demo Viewer');
    const viewerWrite = await callApi<ErrorEnvelope>(
      `/projects/${projectId}`,
      viewer.access_token,
      {
        method: 'PATCH',
        body: JSON.stringify({ description: 'This write must be rejected.' }),
      },
    );
    expectError(viewerWrite, 403, 'insufficient_role', 'Viewer project write');

    const demotion = await callApi<ErrorEnvelope>(
      `/projects/${projectId}/members/${owner.user_id}`,
      identity.access_token,
      {
        method: 'PATCH',
        body: JSON.stringify({ role: 'viewer' }),
      },
    );
    expectError(demotion, 409, 'last_owner', 'Last-owner demotion');
    log(
      'Membership enforcement verified: viewer write rejected (403 insufficient_role), last-owner demotion rejected (409 last_owner)',
    );
    await sleep(800);

    // Scene 8 — Settings and sign out.
    log('Scene 8: settings and sign out');
    await page
      .getByRole('navigation', { name: 'Primary' })
      .getByRole('link', { name: 'Settings', exact: true })
      .click();
    await page.getByRole('heading', { name: 'Settings', exact: true }).waitFor();
    const settings = page.getByRole('main');
    await settings.getByRole('heading', { name: 'Account' }).waitFor();
    await settings.getByText('Display name', { exact: true }).waitFor();
    await settings.getByText('Demo Researcher', { exact: true }).waitFor();
    await settings.getByText('demo@mri-lab.local', { exact: true }).waitFor();
    await settings.getByRole('heading', { name: 'Workspace usage' }).waitFor();
    await settings.getByRole('heading', { name: 'Appearance' }).waitFor();
    await sleep(1500);

    const accountMenu = page.locator('details.dropdown');
    await accountMenu.locator('summary').click();
    await accountMenu.getByRole('link', { name: 'Settings' }).waitFor();
    await accountMenu.getByRole('button', { name: 'Sign out' }).waitFor();
    await sleep(800);
    await accountMenu.locator('summary').click();
    await page.getByRole('button', { name: 'Sign out' }).waitFor();
    await page.getByRole('button', { name: 'Sign out' }).click();
    await page.waitForURL(/\/login/);
    await page.getByRole('heading', { name: 'Sign in' }).waitFor();
    await sleep(1200);

    // Scene 9 — Project isolation.
    log('Scene 9: project isolation');
    const intruder = await mintDevelopmentToken('intruder@mri-lab.local');
    const isolation = await callApi<ErrorEnvelope>(`/projects/${projectId}`, intruder.access_token);
    expectError(isolation, 404, 'not_found', 'Cross-project read');

    const anonymous = await callApi<ErrorEnvelope>(`/projects/${projectId}`, '');
    if (anonymous.status !== 401) {
      throw new Error(
        `Expected 401 for an unauthenticated read, got ${anonymous.status}: ${JSON.stringify(anonymous.body)}`,
      );
    }
    log(
      'Project isolation verified: cross-project read returns 404 not_found, anonymous read returns 401',
    );

    log('Demo completed successfully');
    await sleep(2500);
  } finally {
    await context.close();
    await browser.close();
  }
}

main().catch((error) => {
  console.error('Demo recording failed:', error);
  process.exit(1);
});
