# Dashboard Comunidad

Panel de control para monitorizar el consumo eléctrico de la comunidad (Endesa), con dos contratos: Zonas Comunes y Portales (1-7).

## Requisitos

- Node.js 18 o superior
- npm 9 o superior

## Instalación

```bash
# 1. Instalar dependencias
npm install

# 2. Instalar navegador para scraping
npx playwright install chromium

# 3. Copiar y configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales
```

## Configuración (.env)

### Endesa - Zonas Comunes (solo facturación)
- `ENDESA_COMUNES_USER` / `ENDESA_COMUNES_PASSWORD`: Credenciales de Endesa
- `ENDESA_COMUNES_CLIENT_ID` / `ENDESA_COMUNES_CONTRACT_ID`: Opcionales (si no se tienen, solo se usan datos de facturación)

### Endesa - Portales 1-7 (consumo + facturación)
- `ENDESA_PORTALES_USER` / `ENDESA_PORTALES_PASSWORD`: Credenciales de Endesa
- `ENDESA_PORTALES_CLIENT_ID` / `ENDESA_PORTALES_CONTRACT_ID`: ID de cliente y contrato

Para encontrar `clientId` y `contractId`:
1. Inicia sesión en https://www.endesa.com/es/area-cliente
2. Ve a "Mi consumo"
3. Abre DevTools (F12) > Network
4. Busca peticiones a `consumptions` — los parámetros están en la URL

### Endesa - Facturación (Portal Mi Empresa)
- `ENDESA_BILLING_USER` / `ENDESA_BILLING_PASSWORD`: Credenciales del portal empresas
- `ENDESA_BILLING_SF_CONTRACT_ID`: ID de contrato Salesforce
- `ENDESA_BILLING_COOKIE` / `ENDESA_BILLING_AURA_TOKEN` / `ENDESA_BILLING_AURA_FWUID`: Tokens de sesión

## Uso en local

```bash
# Ejecutar frontend + backend
npm run dev

# Frontend: http://localhost:3000
# API:      http://localhost:4000
```

### Obtener datos manualmente

```bash
# Obtener datos de consumo de Endesa
npm run fetch:endesa

# Obtener todos los datos
npm run fetch:all
```

## Deploy en Railway

1. Subir el proyecto a un repositorio privado en GitHub
2. Crear cuenta en [railway.app](https://railway.app) (login con GitHub)
3. New Project > Deploy from GitHub repo > seleccionar el repositorio
4. Railway detecta el `Dockerfile` y despliega automáticamente
5. Configurar las variables de entorno en Settings > Variables
6. En Settings > Networking, generar un dominio público

Cada `git push` a GitHub redespliega automáticamente.

## Estructura del proyecto

```
dashboardComunidad/
  server/                         # Backend Express
    index.js                      # Servidor principal
    config/
      endesa-contracts.js         # Configuración de contratos
    routes/
      endesa.js                   # Rutas API (consumo + facturación)
    scrapers/
      endesa-scraper.js           # Scraping consumo (Playwright)
      endesa-billing-scraper.js   # API facturación (Salesforce Aura)
    utils/
      dataStore.js                # Persistencia JSON
    data/                         # Datos JSON (generados automáticamente)
  src/                            # Frontend React
    App.jsx
    main.jsx
    components/
      OverviewTab.jsx             # Vista general (ambos contratos)
      Dashboard.jsx               # Vista por contrato
      ServiceCard.jsx             # Tarjeta de resumen
      PeriodSelector.jsx          # Selector de periodos
      ConsumptionChart.jsx        # Gráfico consumo diario
      HourlyChart.jsx             # Gráfico consumo por horas
      MonthlyChart.jsx            # Evolución mensual
      MonthlyComparisonChart.jsx  # Comparativa mensual
      BillingTable.jsx            # Tabla de facturas
    hooks/
      useConsumption.js           # Hook de datos de consumo
      useBilling.js               # Hook de datos de facturación
    utils/
      format.js                   # Formateo de números (es-ES)
    styles/
      global.css
  scripts/
    fetch-endesa.js               # Script de obtención de datos
    fetch-all.js
  Dockerfile                      # Config para Railway
  vite.config.js
  .env.example
```

## API Endpoints

| Endpoint | Descripcion |
|---|---|
| `GET /api/endesa/:contrato/periods` | Periodos de facturacion |
| `POST /api/endesa/:contrato/period` | Datos de un periodo |
| `GET /api/endesa/:contrato/range?start=X&end=Y` | Datos por rango de fechas |
| `GET /api/endesa/:contrato/monthly` | Resumen mensual |
| `GET /api/endesa/billing` | Facturas de Zonas Comunes |
| `GET /api/health` | Estado del servidor |

`:contrato` puede ser `comunes` o `portales`.
