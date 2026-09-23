// src/data/manuales.js
// ═══════════════════════════════════════════════════════════════════
// Registro de manuales del SIG.
// Para agregar un manual nuevo:
//   1. Crea src/data/<nombreManual>.js con la misma forma que
//      manualIntegradoGestion.js (id, code, title, sections[...]).
//   2. Impórtalo aquí y agrégalo al arreglo MANUALES.
//   3. (Opcional) imágenes en /public/
// La página Manuales.jsx los lista y los muestra automáticamente.
// ═══════════════════════════════════════════════════════════════════

import { MANUAL_INTEGRADO_GESTION } from './manualIntegradoGestion';

export const MANUALES = [
  MANUAL_INTEGRADO_GESTION,
];

// Categorías que se muestran como filtro (se agregan solas según los manuales)
export const getCategorias = () =>
  [...new Set(MANUALES.map((m) => m.category).filter(Boolean))];
