import { chromium } from 'playwright';

export const BASE_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';

const MESSAGE_SELECTOR = [
  '[role="alert"]',
  '[aria-live="assertive"]',
  '.slds-text-color_error',
  '.error',
  '.alert',
  '[class*="error" i]',
  '[class*="mensaje" i]',
].join(', ');

export function launchBrowser() {
  return chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
    ],
  });
}

export async function acceptCookies(page) {
  const button = page.locator('#onetrust-accept-btn-handler, button:has-text("Aceptar")').first();
  const shown = await button
    .waitFor({ state: 'visible', timeout: 4000 })
    .then(() => true)
    .catch(() => false);
  if (shown) await button.click().catch(() => {});
}

// Textos de error visibles en la página, para explicar por qué no se completó el login
export async function visibleMessages(page) {
  const texts = await page
    .locator(MESSAGE_SELECTOR)
    .filter({ visible: true })
    .allInnerTexts()
    .catch(() => []);
  const unique = [...new Set(texts.map((t) => t.replace(/\s+/g, ' ').trim()))];
  return unique.filter((t) => t.length > 3 && t.length < 300).slice(0, 3);
}

/**
 * Espera a salir de la página de login. Si no ocurre, lanza `ErrorClass`
 * con los mensajes que muestre la página (credenciales, captcha, verificación...).
 */
export async function waitForLoginToLeave(page, { isLoginUrl, timeout, ErrorClass }) {
  try {
    await page.waitForURL((url) => !isLoginUrl(url), { timeout });
  } catch {
    const messages = await visibleMessages(page);
    const detail = messages.length
      ? messages.join(' | ')
      : 'sin mensaje en la página (¿captcha o verificación adicional?)';
    throw new ErrorClass(`Login no completado: ${detail}`);
  }
}
