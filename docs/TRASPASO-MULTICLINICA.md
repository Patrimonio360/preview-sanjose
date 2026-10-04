# Traspaso: de "web de San José" a producto para muchas clínicas

Documento para empezar la conversación dedicada a poder vender la web + VetBot
a más clínicas. Estado a 4 de octubre de 2026. San José está cerrado y en
entrega: **no tocar su instalación** salvo para corregir fallos.

## 1. Qué hay hoy (instalación de San José)

Carpeta local: `Default Project\Software Clinicas Veterinarias\`
- `web\` → repo público `Patrimonio360/preview-sanjose` (rama `master`).
- `vetbot\vetbot-pro\` → repo privado `Patrimonio360/Vet-bot` (app Electron de WhatsApp).
- `vetbot\patrimonio-admin\` → repo `Patrimonio360/patrimonio-admin` (licencias, en PythonAnywhere).

Piezas de la web:

| Pieza | Dónde | Qué hace |
|---|---|---|
| Web estática | GitHub Pages: `patrimonio360.github.io/preview-sanjose/site/` | Páginas, panel (`site/admin/dashboard.html`), datos en `site/_data/*.json` |
| Servidor | Vercel, proyecto `preview-sanjose` → `https://preview-sanjose.vercel.app/api/*` | `book-appointment`, `availability`, `admin` (panel), `vetbot` (cerebro del bot) |
| Calendario | Repo **privado** `Patrimonio360/sanjose-citas` | `appointments.json` (citas) y `admin-auth.json` (contraseña del panel cuando la clínica la cambia) |
| IA | OpenRouter, modelos gratuitos | Solo preguntas libres de VetBot; citas, precios, horario… sin IA |
| Avisos por email | FormSubmit (gratis) | Cita nueva → email de Ajustes de la clínica; sugerencias del panel → Patrimonio360 |

Lógica compartida (un solo sitio, la usan web, panel y servidor):
- `site/js/schedule.js` — horario por días (Ajustes), huecos de cita, "Abierto ahora".
- `site/js/clinic-options.js` — animales que atiende la clínica y motivos de cita.
- `site/js/cms.js` — rellena la web con Ajustes; `CMS.AGENCY` = crédito fijo de Patrimonio360; `CMS.COLOR_ROLES` = temas.
- `api/_booking.js` — creación de citas (formulario, chat y WhatsApp).
- `api/_vetbot-brain.js` — conversación de VetBot (cita guiada sin IA + IA para lo demás).
- `tools/bake.js` — escribe Ajustes dentro del HTML para SEO (lo lanza `.github/workflows/bake.yml`).

Variables de entorno en Vercel (nombres, nunca valores en este repo):
`GITHUB_TOKEN`, `ADMIN_PASSWORD_HASH`, `ADMIN_SESSION_SECRET`, `OPENROUTER_API_KEY`
y, opcional, `AGENCY_MASTER_PASSWORD` (clave maestra de Patrimonio360 para el panel).

## 2. Lo que está escrito a mano para San José

Todo esto habría que convertirlo en configuración por clínica:

- `api/_lib.js`: `ALLOWED_ORIGINS` (`https://patrimonio360.github.io`), `SITE_REPO`
  (`Patrimonio360/preview-sanjose`) y valor por defecto de `APPOINTMENTS_REPO` (`sanjose-citas`).
- `site/js/citas.js`, `site/js/vetbot.js`, `site/admin/dashboard.html` (`ADMIN_API`):
  dirección del servidor `https://preview-sanjose.vercel.app`.
- `site/_data/*.json`: todos los datos y textos de San José (cada clínica los cambia en el panel).
- Fotos de `site/img/` y algunas imágenes externas de productos (Amazon/Unsplash: sustituir).
- `index.html` raíz: puerta con contraseña de "vista previa" + `noindex` (quitar al publicar con dominio).

## 3. Bloqueos para vender a varias clínicas (por prioridad)

1. **Alojamiento con uso comercial.** Vercel Hobby no permite uso comercial y GitHub Pages
   no está pensado para webs de negocio. Opciones: Vercel Pro (~20 $/mes para todas) o
   Cloudflare Pages + Workers/Functions (gratis, uso comercial permitido). Decidir antes de
   dar de alta la segunda clínica.
2. **Alta rápida de una clínica nueva.** Hoy es manual (repo web, repo privado de citas,
   proyecto de servidor, 4-5 variables, direcciones en el código). Objetivo: un script o
   plantilla que lo haga en minutos y genere una contraseña inicial segura.
3. **Dominio propio por clínica** y paso de "vista previa" a web pública (quitar puerta,
   `noindex`, `robots Disallow`; `settings.siteUrl` para `tools/bake.js`).
4. **Contrato con cada clínica**: Patrimonio360 es encargado del tratamiento (RGPD) de los
   datos de sus clientes; condiciones de servicio, mantenimiento y precio. Revisar con asesor.
5. **VetBot por WhatsApp**: usa conexión no oficial (Baileys) → riesgo de bloqueo del número;
   valorar API oficial (de pago). VetBot Pro 1.0.21 (cerebro de la web) sin compilar ni probar
   con WhatsApp real. Cupo IA gratuito (~50 preguntas/día) compartido entre todas las clínicas.
6. **Escala del "calendario en GitHub"**: válido para pocas citas; con muchas clínicas valorar
   una base de datos (p. ej. Firestore de VetBot o la que ofrezca el alojamiento elegido).

## 4. Plan propuesto para la nueva conversación

1. Elegir alojamiento comercial y migrar la arquitectura (sin tocar San José hasta el final).
2. Convertir lo escrito a mano (sección 2) en configuración por clínica.
3. Script/plantilla de alta de clínica + documento de alta para Patrimonio360.
4. Plantilla de datos neutra (sin San José) para clínicas nuevas.
5. Migrar San José a la nueva forma cuando todo esté probado (con su dominio).
6. Contrato tipo y precios (fuera del código).

## 5. Entrega de San José — lo que queda (no técnico)

- Dominio propio y quitar la "vista previa" (puede hacerse ya o tras el punto 1 del plan).
- La clínica cambia la contraseña del panel desde Ajustes → "Contraseña del panel".
- Patrimonio360 añade la clave maestra: `vercel env add AGENCY_MASTER_PASSWORD production --sensitive` y volver a publicar.
- Pulsar "Activate" en el primer email de FormSubmit (la clínica para citas, Patrimonio360 para sugerencias).
- Revisar en el panel: animales que atiende, motivos de cita, respuesta guardada de precios en VetBot, CIF y datos legales reales.
- Compilar y publicar VetBot Pro 1.0.21 y, en el PC de la clínica, Ajustes → "Web de la clínica" =
  `https://preview-sanjose.vercel.app/api/vetbot`.
