# 🔥 Configuración Firebase — Sheriff de Gastos

El proyecto **sheriff-de-gastos** ya existe y Firestore está habilitado. Solo falta **obtener la configuración** y llenar `.env.local`.

---

## Paso 1 — Iniciar sesión (si aún no lo has hecho)

```powershell
firebase login
```

Se abrirá el navegador para iniciar sesión con Google.

---

## Paso 2 — Obtener la configuración y actualizar .env.local

**Opción A — Script automático (recomendado):**

```powershell
# Desde la raíz del proyecto dinerito
.\scripts\get-firebase-config.ps1
```

El script verifica el login, obtiene la config de Firebase y actualiza `.env.local`.

**Opción B — Manual:**

```powershell
firebase apps:sdkconfig WEB --project sheriff-de-gastos
```

Si no hay app web, créala primero:

```powershell
firebase apps:create WEB "Sheriff de Gastos" --project sheriff-de-gastos
```

Luego copia los valores del output a `.env.local`:

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=sheriff-de-gastos.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=sheriff-de-gastos
VITE_FIREBASE_STORAGE_BUCKET=sheriff-de-gastos.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

---

## Paso 3 — Probar localmente

```powershell
npm run dev
```

Abre http://localhost:8080, agrega un gasto y recarga para verificar que se guarda en Firestore.

---

## Paso 4 — Desplegar

```powershell
npm run deploy
```

O solo hosting:

```powershell
npm run deploy:hosting
```

---

## Verificación en Firebase Console

1. https://console.firebase.google.com → proyecto **sheriff-de-gastos**
2. **Firestore Database** → colecciones `expenses` y `goals`
3. **Hosting** → URL de producción
