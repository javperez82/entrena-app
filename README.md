# ENTRENA — PWA de entrenamiento, medicamentos y mente

App personal para el programa de fuerza progresiva de 4 semanas, registro de medicamentos e inyectables, métricas corporales de los lunes, y módulo de respiración/meditación. Vanilla JS, sin build step. Imágenes de ejercicios: [Free Exercise DB](https://github.com/yuhonas/free-exercise-db) (licencia abierta).

## Funciona en dos modos
- **Local (por defecto):** sin configurar nada, guarda en el dispositivo (localStorage). Útil para probar hoy mismo.
- **Nube (recomendado):** con Supabase configurado, datos respaldados + login por enlace mágico.

## Despliegue (15 minutos)

### 1. Supabase
1. Crea un proyecto nuevo en supabase.com (región us-east está bien).
2. SQL Editor → New query → pega el contenido completo de `schema.sql` → Run.
3. Authentication → Providers → verifica que **Email** esté habilitado (magic link viene activo por defecto).
4. Settings → API → copia el **Project URL** y la **anon public key**.

### 2. Configurar la app
Abre `index.html` y pega tus credenciales en el bloque de arriba:
```js
window.ENTRENA_CONFIG = {
  SUPABASE_URL: 'https://TUPROYECTO.supabase.co',
  SUPABASE_ANON_KEY: 'eyJ...'
};
```
(La anon key es pública por diseño; la seguridad la dan las políticas RLS del esquema.)

### 3. Vercel
1. Sube esta carpeta a un repo de GitHub (ej. `javperez82/entrena-app`).
2. Vercel → Add New Project → importa el repo → framework "Other" → Deploy. No hay build step.
3. En Supabase: Authentication → URL Configuration → agrega tu dominio de Vercel a **Redirect URLs** (ej. `https://entrena-app.vercel.app`), para que el enlace mágico regrese a la app.

### 4. Instalar en el celular
Abre la URL en el navegador del celular → menú → **Agregar a pantalla de inicio**. Queda como app con ícono propio y funciona offline en el gym (los datos se sincronizan cuando hay señal... en modo nube requiere conexión para guardar; en el gym con datos móviles basta).

## Estructura
```
index.html    — UI + config
app.js        — lógica (capa de datos dual Supabase/local)
data.js       — programa de 4 semanas, catálogo, meds, meditaciones
schema.sql    — tablas + RLS para Supabase
img/          — 48 imágenes de ejercicios (inicio/fin de movimiento)
manifest.json, sw.js, icon-*.png — PWA
```

## Notas
- La **semana del programa** se calcula desde el lunes de la primera semana de uso (guardado en el dispositivo). Para reiniciar el programa: borrar `entrena_inicio` del localStorage.
- El botón "Usar barra" en sentadilla goblet aparece para el cambio de las semanas 3–4.
- **Al terminar esta versión: cambia la contraseña de la base en Supabase → Settings → Database → Reset database password.**
- Los recordatorios de medicamentos siguen la receta vigente; cualquier ajuste lo define el médico tratante.
