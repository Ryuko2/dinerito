# 🤠 Sheriff de Gastos — Dinerito

Tracker de gastos en pareja con temática vaquera. Construido con **Vite + React + TypeScript + Tailwind + shadcn/ui** y **Firebase Firestore**.

## Inicio rápido

```bash
# 1. Clonar e instalar
git clone <TU_REPO_URL>
cd dinerito
npm install

# 2. Configurar Firebase (crea .env.local)
# En PowerShell, tras firebase login:
.\scripts\get-firebase-config.ps1

# 3. Desarrollo
npm run dev
```

Abre http://localhost:8080

## Configuración de Firebase

1. Proyecto **sheriff-de-gastos** ya creado en Firebase.
2. Inicia sesión: `firebase login`
3. Ejecuta: `.\scripts\get-firebase-config.ps1` para generar `.env.local`
4. O copia `.env.example` a `.env.local` y rellena los valores manualmente.

Ver **FIREBASE_SETUP.md** para detalles.

## Deploy a Firebase Hosting

```bash
npm run deploy
```

O solo hosting: `npm run deploy:hosting`

## Scripts disponibles

| Comando             | Descripción                    |
|---------------------|--------------------------------|
| `npm run dev`       | Servidor de desarrollo         |
| `npm run build`     | Build de producción            |
| `npm run deploy`    | Build + deploy a Firebase      |
| `npm run deploy:hosting` | Solo Hosting             |
| `npm run deploy:rules`   | Solo reglas Firestore     |

## Tech stack

- Vite
- React
- TypeScript
- Tailwind CSS
- shadcn/ui
- Firebase (Firestore, Hosting)
- Recharts
