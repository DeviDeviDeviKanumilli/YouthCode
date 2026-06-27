import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

const baseUrl = process.env.DASHBOARD_URL ?? 'http://127.0.0.1:5174';
const serverCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';

let server;

try {
  const serverAlreadyRunning = await isReachable(baseUrl);
  if (!serverAlreadyRunning) {
    server = spawn(serverCommand, ['run', 'dev', '--', '--host', '127.0.0.1'], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    server.stdout.on('data', (chunk) => process.stdout.write(chunk));
    server.stderr.on('data', (chunk) => process.stderr.write(chunk));
    await waitForServer(baseUrl);
  }

  await runBrowserChecks(baseUrl);
  console.log('Dashboard smoke checks passed.');
} finally {
  if (server) {
    server.kill('SIGTERM');
  }
}

async function runBrowserChecks(url) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const consoleErrors = [];

  page.on('console', (message) => {
    if (message.type() === 'error') {
      consoleErrors.push(message.text());
    }
  });
  page.on('pageerror', (error) => consoleErrors.push(error.message));

  await page.goto(`${url}/#overview`, { waitUntil: 'networkidle' });
  await page.evaluate(() => window.localStorage.clear());
  await page.reload({ waitUntil: 'networkidle' });
  await expectText(page, 'Research overview');
  await expectMapTiles(page, 'overview map');
  await expectText(page, 'Visible observations');
  await expectText(page, '5');
  await page.getByRole('button', { name: /Notifications/ }).click();
  await expectText(page, 'Workspace notices');
  await page.getByRole('button', { name: /Open app menu/ }).click();
  await expectText(page, 'Research session');
  await page.getByLabel('Research role').selectOption('researcher');
  await expectText(page, 'Role: researcher');
  await page.getByRole('button', { name: /Open app menu/ }).click();

  await page.getByRole('button', { name: /Clear all/ }).click();
  await expectText(page, 'No filters active');
  await expectText(page, '6');
  await page.getByRole('button', { name: /Water Chestnut/ }).first().click();
  await expectText(page, 'Moderate signal');
  await page.getByRole('button', { name: /Restore demo filters/ }).click();
  await expectText(page, '5 filters active');
  await expectText(page, '5');
  await expectText(page, 'Priority ecological signal');
  await page.getByLabel('Search observations').fill('no matching ecological record');
  await expectText(page, 'No map records visible');
  await expectText(page, 'No observation selected');
  await page.getByLabel('Search observations').fill('');
  await expectText(page, 'Priority ecological signal');

  await page.getByRole('button', { name: /Verification Queue/ }).click();
  await expectText(page, 'Verification queue');
  await expectText(page, 'You need reviewer or admin access to verify observations.');
  await page.getByLabel('Research role').selectOption('reviewer');
  await page.getByLabel('Reviewer notes').fill('Need closer habitat context before this possible species can be verified.');
  await page.getByRole('button', { name: /Needs more evidence/ }).click();
  await expectText(page, 'Requested evidence: Close-up media and habitat context');

  await page.getByRole('button', { name: /Forecast Map/ }).click();
  await expectText(page, 'Forecast map');
  await page.getByLabel('Potential spread corridors').uncheck();
  await expectText(page, 'Sampling gap');

  await page.getByRole('button', { name: /Sampling Gaps/ }).click();
  await expectText(page, 'Sampling gap map');
  await expectMapTiles(page, 'sampling map');

  await page.getByRole('button', { name: /Observations/ }).click();
  await expectText(page, 'Observations');
  await page.getByRole('button', { name: /Save view/ }).click();
  await expectText(page, 'saved with filters, columns, sort, and selected record');
  await page.getByRole('button', { name: /Show source/ }).click();
  await expectText(page, 'source column shown');
  await page.getByRole('button', { name: /Export view/ }).click();
  await expectText(page, 'CSV export request created from the current observations table view.');
  await page.getByRole('button', { name: /^Flag$/ }).first().click();
  await expectText(page, 'Flagged');
  await page.getByRole('button', { name: /Add to sampling plan/ }).first().click();
  await expectText(page, 'In sampling plan');
  await page.getByRole('button', { name: /Create follow-up task/ }).first().click();
  await expectText(page, 'Task created');
  const singleRecordDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: /Export record/ }).first().click();
  const singleRecordFile = await singleRecordDownload;
  if (!singleRecordFile.suggestedFilename().endsWith('.csv')) {
    throw new Error(`Expected a single-record CSV download, got ${singleRecordFile.suggestedFilename()}.`);
  }
  await expectText(page, 'single-record CSV downloaded');
  await page.getByRole('button', { name: /View on map/ }).first().click();
  await expectText(page, 'Forecast map');
  await expectText(page, 'opened on the Forecast Map');
  await page.getByRole('button', { name: /Open in queue/ }).first().click();
  await expectText(page, 'Verification queue');
  await expectText(page, 'opened in the verification queue');

  await page.getByRole('button', { name: /AI Analyst/ }).click();
  await expectText(page, 'AI analyst');
  await page.getByPlaceholder(/Ask about signals/).fill('What export format should I use for map layers?');
  await page.getByRole('button', { name: /Ask analyst/ }).click();
  await expectText(page, 'GeoJSON is best for GIS workflows');
  await page.getByRole('button', { name: /Save analysis/ }).click();
  await expectText(page, 'What export format should I use for map layers?');

  await page.getByRole('button', { name: /Exports/ }).click();
  await expectText(page, 'Export center');
  await page.getByRole('button', { name: /GeoJSON/ }).click();
  await expectText(page, 'Fields');
  await page.getByLabel('Media URLs').uncheck();
  await expectText(page, '28');
  await page.getByRole('button', { name: /Create GeoJSON export/ }).click();
  await expectText(page, 'GeoJSON export - current filters');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: /Download/ }).first().click();
  const exportDownload = await downloadPromise;
  if (!exportDownload.suggestedFilename().endsWith('.csv')) {
    throw new Error(`Expected a CSV export download, got ${exportDownload.suggestedFilename()}.`);
  }
  await expectText(page, 'Privacy rules remain applied');
  await page.getByRole('button', { name: /Retry/ }).first().click();
  await expectText(page, 'retry queued with the same filters');
  await expectText(page, 'Under-sampled zones - May retry');

  await page.getByRole('button', { name: /Settings/ }).click();
  await expectText(page, 'Workflow safeguards');
  await page.getByLabel('Settings verification role').selectOption('admin');
  await page.getByRole('button', { name: /Open app menu/ }).click();
  await expectText(page, 'Role: admin');
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /Open app menu/ }).click();
  await expectText(page, 'Role: admin');
  await page.getByRole('button', { name: /Observations/ }).click();
  await expectText(page, 'Visible records view');
  await page.getByRole('button', { name: /AI Analyst/ }).click();
  await expectText(page, 'What export format should I use for map layers?');

  if (consoleErrors.length > 0) {
    throw new Error(`Console errors found:\n${consoleErrors.join('\n')}`);
  }

  await browser.close();
}

async function expectText(page, text) {
  await page.getByText(text, { exact: false }).first().waitFor({ timeout: 5000 });
}

async function expectMapTiles(page, label) {
  await page.locator('.leaflet-host').first().waitFor({ state: 'visible', timeout: 5000 });
  await page.waitForFunction(
    () => document.querySelectorAll('.leaflet-tile-loaded').length >= 4,
    undefined,
    { timeout: 10000 },
  ).catch(async () => {
    const tileCount = await page.locator('.leaflet-tile-loaded').count();
    throw new Error(`Expected ${label} tiles to load, found ${tileCount}.`);
  });
}

async function isReachable(url) {
  try {
    const response = await fetch(url);
    return response.ok;
  } catch {
    return false;
  }
}

async function waitForServer(url) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < 30000) {
    if (await isReachable(url)) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Timed out waiting for ${url}`);
}
