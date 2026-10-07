#!/usr/bin/env node
/**
 * Beautifies all static HTML pages and adds Turkish section comments (once per section).
 */
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const ROUTE_LABELS = {
  home: 'Ana Sayfa – Genel Bakış',
  shop: 'Mağaza / Shop',
  'deposit-1': 'Yatırma – Adım 1 (Bilgiler)',
  'deposit-2': 'Yatırma – Adım 2 (Genel Bakış)',
  'deposit-3': 'Yatırma – Adım 3 (Onay)',
  'payout-1': 'Çekim – Adım 1 (Bilgiler)',
  'payout-2': 'Çekim – Adım 2 (Genel Bakış)',
  'payout-3': 'Çekim – Adım 3 (Onay)',
  'create-user': 'Yeni Müşteri Oluştur',
  customers: 'Müşteri Arama',
  'edit-customer': 'Müşteri Düzenle',
  history: 'Hesap Geçmişi',
  coupons: 'Bahis Kuponları',
  'coupon-filters': 'Kupon Filtreleri',
  'coupon-detail': 'Kupon Detayı',
  turnover: 'Muhasebe / Ciro',
  'deposit-transactions': 'Yatırma İşlemleri',
  'payout-transactions': 'Çekim İşlemleri',
};

function dedupeCommentLines(html) {
  const lines = html.split('\n');
  const out = [];
  for (const line of lines) {
    const t = line.trim();
    if (t.startsWith('<!--') && out.length) {
      const prev = out[out.length - 1].trim();
      if (prev === t) continue;
    }
    out.push(line);
  }
  return out.join('\n');
}

function addBefore(html, marker, comment) {
  if (html.includes(comment)) return html;
  const idx = html.indexOf(marker);
  if (idx === -1) return html;
  return `${html.slice(0, idx)}${comment}\n${html.slice(idx)}`;
}

function injectComments(html, route, pageName) {
  const label = ROUTE_LABELS[route] || route;
  let out = html;

  const pageBanner = `<!-- SAYFA: ${pageName} | ${label} -->`;
  if (!out.includes('<!-- SAYFA:')) {
    out = out.replace(/<!DOCTYPE html>/i, `<!DOCTYPE html>\n${pageBanner}`);
  }

  const blocks = [
    ['<head>', '  <!-- HEAD: karakter seti, viewport, tema rengi, SEO, stil dosyaları -->\n'],
    ['<body', '  <!-- BODY: data-route ile aktif sayfa rotası -->\n'],
    ['<div id="app"', '  <!-- APP: uygulama kökü (header + main + footer + drawer) -->\n'],
    [
      '<header class="topbar">',
      '      <!-- HEADER – Üst bar: marka, mobil toplam bakiye, bakiye, menü butonu -->\n',
    ],
    ['<main class="layout">', '      <!-- MAIN – Sayfa içeriği alanı -->\n'],
    ['<footer class="footer">', '      <!-- FOOTER – Telif / alt bilgi -->\n'],
    [
      '<div class="drawer-backdrop"',
      '    <!-- DRAWER BACKDROP – Yan menü açıkken arka plan karartma -->\n',
    ],
    ['<aside class="drawer"', '    <!-- SIDEBAR (DRAWER) – Sol yan navigasyon menüsü -->\n'],
    [
      '<nav class="drawer-nav">',
      '      <!-- Drawer navigasyon: mağaza, hızlı işlemler, bölümler, dil, QR -->\n',
    ],
    [
      '<button class="drawer-shop-user"',
      '        <!-- Drawer: Mağaza / kullanıcı kısayolu -->\n',
    ],
    [
      '<button class="drawer-primary deposit"',
      '        <!-- Drawer: Yatırma kısayolu -->\n',
    ],
    [
      '<button class="drawer-primary payout"',
      '        <!-- Drawer: Çekim kısayolu -->\n',
    ],
    [
      '<button class="drawer-primary turnover"',
      '        <!-- Drawer: Muhasebe kısayolu -->\n',
    ],
    [
      '<div class="drawer-section-title">',
      '        <!-- Drawer: Diğer bölümler başlığı -->\n',
    ],
    [
      '<div class="drawer-language-block">',
      '        <!-- Drawer: Dil seçimi -->\n',
    ],
    ['<div class="drawer-footer">', '        <!-- Drawer alt: Telegram QR ve marka -->\n'],
    ['<div id="toast"', '  <!-- TOAST – Geçici bildirim mesajları -->\n'],
    [
      '<script src="./i18n.js',
      '  <!-- SCRIPTS: çeviri, uygulama mantığı, görünümler, sayfa başlatma -->\n',
    ],
    ['<div class="page-head">', '        <!-- Sayfa başlığı: ikon, başlık, açıklama -->\n'],
    [
      '<div class="quick-grid">',
      '        <!-- Hızlı işlemler: yatırma, çekim, yeni müşteri -->\n',
    ],
    [
      '<div class="dash-grid">',
      '        <!-- Dashboard ızgarası: KPI kartları ve menü listesi -->\n',
    ],
    [
      '<div class="kpis">',
      '            <!-- KPI alanları: yatırma, çekim, kâr, açık bahisler -->\n',
    ],
    [
      '<div class="date-tabs">',
      '            <!-- Tarih sekmeleri: bugün, dün, hafta, ay -->\n',
    ],
    [
      '<section class="deposit-minimal-page">',
      '        <!-- Yatırma/çekim akışı: başlık, adımlar, form -->\n',
    ],
    ['<div class="stepper">', '          <!-- Adım göstergesi (stepper) -->\n'],
    [
      '<section class="deposit-minimal-form">',
      '          <!-- Form alanları: müşteri, tutar, not vb. -->\n',
    ],
    [
      '<div class="deposit-form-grid">',
      '            <!-- Form grid: bilgi alanları -->\n',
    ],
  ];

  for (const [marker, comment] of blocks) {
    out = addBefore(out, marker, comment.trimEnd());
  }

  if (
    out.includes('<label>Müşteri Seç</label>') &&
    !out.includes('<!-- Alan: Müşteri seçimi')
  ) {
    out = out.replace(
      '<label>Müşteri Seç</label>',
      '<!-- Alan: Müşteri seçimi / arama -->\n                <label>Müşteri Seç</label>',
    );
  }

  return dedupeCommentLines(out);
}

async function main() {
  const files = (await readdir(root)).filter((f) => f.endsWith('.html'));

  execSync(
    `npx --yes js-beautify --type html --indent-size 2 --wrap-line-length 100 --replace "${root}/*.html"`,
    { cwd: root, stdio: 'inherit' },
  );

  for (const file of files) {
    const path = join(root, file);
    let html = await readFile(path, 'utf8');
    const routeMatch = html.match(/data-route="([^"]+)"/);
    const route = routeMatch?.[1] || file.replace('.html', '');
    html = injectComments(html, route, file);
    html = dedupeCommentLines(html);
    await writeFile(path, html, 'utf8');
  }

  execSync(
    `npx --yes js-beautify --type html --indent-size 2 --wrap-line-length 100 --replace "${root}/*.html"`,
    { cwd: root, stdio: 'inherit' },
  );

  for (const file of files) {
    const path = join(root, file);
    let html = await readFile(path, 'utf8');
    html = dedupeCommentLines(html);
    await writeFile(path, html, 'utf8');
  }

  console.log(`Beautified ${files.length} HTML files.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
