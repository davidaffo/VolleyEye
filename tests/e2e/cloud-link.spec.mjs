import { test, expect } from '@playwright/test';

test('il link condiviso mostra solo il database da importare', async ({ page }) => {
  test.setTimeout(25000);
  await page.route('https://cloud.example/**', async route => {
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'OPTIONS, PROPFIND, GET', 'access-control-allow-headers': 'authorization, content-type, depth' } });
    return route.fulfill({ status: 207, headers: { 'access-control-allow-origin': '*', 'content-type': 'application/xml' }, body: '<?xml version="1.0"?><d:multistatus xmlns:d="DAV:"><d:response><d:href>/remote.php/dav/files/anna/Squadra/backup.json</d:href></d:response></d:multistatus>' });
  });
  await page.goto('/?cloud=nextcloud&cloudAddress=https%3A%2F%2Fcloud.example&cloudUser=anna&cloudPath=Squadra%2Fbackup.json');
  await page.waitForFunction(() => document.documentElement.dataset.appReady === 'true');
  const cloud = page.getByRole('dialog', { name: '☁ Database cloud' });
  await cloud.getByLabel('Password o password per app').fill('password');
  await cloud.getByRole('button', { name: 'Accedi', exact: true }).click();
  await expect(cloud.getByRole('heading', { name: 'Importa il database condiviso' })).toBeVisible();
  await expect(cloud.locator('.cloud-shared-import__file')).toContainText('backup.json');
  await expect(cloud.getByRole('button', { name: 'Importa database', exact: true })).toBeVisible();
  await expect(cloud.getByText('Esporta in questa cartella')).toHaveCount(0);
  await expect(cloud.getByRole('button', { name: /Condividi/ })).toHaveCount(0);
});
