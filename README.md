<div align="center">

<img src="public/logo.png" alt="" width="72" height="72" />

# Terrazas del Cañaveral · Luz y agua

Panel de los suministros de una comunidad de vecinos: facturas de luz de las zonas comunes, consumo hora a hora de los portales y facturas del agua.

![Node](https://img.shields.io/badge/Node-22.12%2B-3c873a?logo=nodedotjs&logoColor=white)
![React](https://img.shields.io/badge/React-19-149eca?logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8-646cff?logo=vite&logoColor=white)
![Chart.js](https://img.shields.io/badge/Chart.js-4-ff6384?logo=chartdotjs&logoColor=white)

</div>

![Resumen del panel](docs/resumen.png)

## Qué muestra

- **Resumen** de los tres suministros: última factura, evolución del último año y facturas recientes.
- **Facturas de luz y agua** con precio medio por unidad, comparación con la anterior y aviso de las que se salen de lo habitual.
- **Consumo diario y por horas** de los portales, mapa de calor día × hora, consumo de fondo y reparto por periodos de la tarifa 2.0TD.
- Filtro para elegir cuántas facturas o meses ver en los gráficos.
- Modo claro por defecto y modo oscuro opcional, adaptado a móvil, tablet y escritorio.

<table>
  <tr>
    <td width="68%"><img src="docs/portales-oscuro.png" alt="Consumo de los portales en modo oscuro" /></td>
    <td width="32%"><img src="docs/movil.png" alt="Facturas en el móvil" /></td>
  </tr>
</table>

## Datos

La web es estática y lee los archivos de [`data/`](data). Para actualizarla basta con editar el archivo correspondiente y hacer `git push`.

| Archivo                  | Contenido                                      |
| ------------------------ | ---------------------------------------------- |
| `data/luz-comunes.json`  | Facturas de luz de las zonas comunes           |
| `data/agua.json`         | Facturas de agua                               |
| `data/luz-portales.json` | Lecturas diarias y horarias de luz de portales |

Cada factura (luz o agua) tiene este formato:

```json
{
  "numFact": "P26CON042639607",
  "fEmision": "2026-10-09",
  "consumo": 6291,
  "importe": 1380.43
}
```

- `consumo` va en kWh para la luz y en m³ para el agua.
- Opcionalmente, `desde` y `hasta` (`YYYY-MM-DD`) indican el período facturado. Si no están, se toma desde la factura anterior.
- El orden dentro del archivo no importa.

## Puesta en marcha

Requiere **Node.js 22.12 o superior**.

```bash
npm install
npm run dev     # http://localhost:3000
```

| Comando           | Qué hace                   |
| ----------------- | -------------------------- |
| `npm run dev`     | Servidor de desarrollo     |
| `npm run build`   | Compila la web en `dist/`  |
| `npm run preview` | Sirve la versión compilada |
| `npm run lint`    | ESLint                     |
| `npm run format`  | Prettier                   |

## Despliegue

El workflow [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) compila y publica la web en GitHub Pages con cada `git push` a `main`. Solo hay que tener **Settings → Pages → Source** en **GitHub Actions**.

La web queda en `https://<usuario>.github.io/<repositorio>/`. No tiene inicio de sesión: cualquiera con la URL puede verla.

## Estructura

```
data/                   Datos de facturas y lecturas
src/
  data.js               Suministros: datos, unidades y nombres
  components/           Vistas y componentes de la interfaz
  charts/               Gráficos (Chart.js) y su configuración común
  utils/                Formato es-ES y cálculos (resúmenes, tarifas, facturas)
  styles/global.css     Estilos y tema claro/oscuro
```
