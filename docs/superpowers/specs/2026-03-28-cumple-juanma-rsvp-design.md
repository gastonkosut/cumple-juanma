# Cumple Juanma - RSVP Web

## Contexto

Juanma cumple 8 anos el viernes 17 de abril de 2026. La fiesta es tematica Harry Potter en Zona Prado (Adolfo Berro 912), de 18:30 a 21:30 hs. Se necesita una pagina web sencilla para que los invitados confirmen asistencia, y un panel admin para ver las confirmaciones.

## Stack

- **Frontend:** HTML / CSS / JS vanilla (una sola pagina, mobile-first)
- **Backend:** Node.js + Express
- **Datos:** Archivo JSON en disco (`data/rsvps.json`)
- **Backup:** Copia automatica del JSON cada hora a `data/backups/`
- **Hosting:** Render free tier

## Pagina principal (`/`)

### Estilo visual
- Tematica **Gryffindor**: fondo rojo oscuro (#2a0a0a / #4a1111), acentos dorados (#ffd700), bordes escarlata (#ae0001)
- Fuente titulo: **Cinzel Decorative** (Google Fonts, weight 900)
- Fuente cuerpo: Georgia / Times New Roman (serif)
- Icono superior: lechuza (emoji 🦉) dentro de circulo rojo/dorado
- Estrellas decorativas doradas
- Divisor con degradado rojo-dorado-rojo

### Contenido
1. **Header:** "El Ministerio de la Magia informa que" + "Juanma cumple 8!" (Cinzel Decorative)
2. **Datos del evento:** Fecha, hora y lugar en tarjeta con borde escarlata
3. **Formulario RSVP** con dos modos:
   - **"Soy un mago/a"** (individual): nombre + alergias (opcional)
   - **"Venimos en familia"**: nombre de contacto + cantidad adultos (contador +/-) + cantidad ninos (contador +/-) + alergias (opcional)
4. **Footer:** "Hecho con magia"

### Flujo del formulario
- Por defecto se muestra modo individual ("Soy un mago/a" activo)
- Al clickear "Venimos en familia" se muestran los contadores de adultos/ninos
- Al confirmar: POST a `/api/rsvp`, se muestra mensaje de exito tematico ("Tu lechuza ha sido enviada!")
- Validacion: nombre requerido, al menos 1 persona en modo familia

## Panel admin (`/admin`)

- Acceso protegido con clave (query param `?key=SECRET` o prompt de password)
- La clave se configura via variable de entorno `ADMIN_KEY`
- Muestra tabla con todos los RSVPs:
  - Nombre
  - Tipo (individual / familia)
  - Adultos / Ninos
  - Alergias
  - Fecha de confirmacion
- Totales al final: total confirmaciones, total adultos, total ninos, total personas
- Boton para exportar a CSV
- Boton para eliminar un RSVP individual

## API

### `POST /api/rsvp`
Crea una nueva confirmacion.

```json
{
  "name": "string (requerido)",
  "type": "individual | family",
  "adults": "number (default 0, solo family)",
  "kids": "number (default 1 para individual, configurable para family)",
  "allergies": "string (opcional)"
}
```

Respuesta: `201 { success: true, message: "..." }`

### `GET /api/rsvps?key=SECRET`
Lista todas las confirmaciones (protegido con admin key).

### `DELETE /api/rsvps/:id?key=SECRET`
Elimina una confirmacion (protegido con admin key).

## Estructura de archivos

```
cumple_juanma/
├── server.js              # Express server + API routes
├── package.json
├── public/
│   ├── index.html         # Pagina principal con formulario
│   ├── style.css          # Estilos Gryffindor
│   ├── app.js             # Logica del formulario
│   └── admin.html         # Panel admin
├── data/
│   ├── rsvps.json         # Datos de confirmaciones
│   └── backups/           # Backups automaticos
└── render.yaml            # Config de deploy en Render
```

## Backup

- Cada hora, el servidor copia `rsvps.json` a `data/backups/rsvps-YYYY-MM-DD-HH.json`
- Se mantienen los ultimos 48 backups (2 dias)
- Se implementa con `setInterval` en el server

## Verificacion

1. `npm install && npm start` levanta el servidor en localhost:3000
2. Abrir la pagina principal, verificar que se ve la tematica Gryffindor correctamente
3. Confirmar asistencia en modo individual y en modo familia
4. Verificar que `data/rsvps.json` se actualiza
5. Acceder a `/admin?key=test` y verificar que se ven las confirmaciones
6. Verificar que los totales suman correctamente
7. Probar exportar CSV y eliminar un RSVP
