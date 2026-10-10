// Con `vite build --mode static` (GitHub Pages) los datos son JSON publicados junto a la web
export const IS_STATIC = import.meta.env.MODE === 'static';

const dataUrl = (path) => `${import.meta.env.BASE_URL}data/${path}`;

export const endpoints = {
  status: () => (IS_STATIC ? dataUrl('status.json') : '/api/status'),
  billing: () => (IS_STATIC ? dataUrl('billing.json') : '/api/endesa/billing'),
  periods: (key) => (IS_STATIC ? dataUrl(`${key}/periods.json`) : `/api/endesa/${key}/periods`),
  allDays: (key) => dataUrl(`${key}/days.json`),
  range: (key, start, end) => `/api/endesa/${key}/range?start=${start}&end=${end}`,
  period: (key) => `/api/endesa/${key}/period`,
};
