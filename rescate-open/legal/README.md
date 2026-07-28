# Documentos legales — plantillas

> **Esto no es asesoría jurídica.** Son borradores de trabajo para acortar el camino con un abogado, no para reemplazarlo. Ningún documento de esta carpeta debe publicarse tal cual ni usarse para recibir donaciones o datos personales reales.

## Cómo usarlos

1. Reemplaza cada `[CORCHETE]` con el dato real de la entidad operadora.
2. Resuelve cada `TODO (legal)` con tu abogado. Son las decisiones que no se pueden tomar desde el código.
3. Al publicar la versión aprobada, actualiza las versiones en `app/js/core/consentimiento.js`:

```js
export const VERSIONES = {
  terminos: "1.0.0",      // era "1.0.0-borrador"
  privacidad: "1.0.0",
};
```

Cambiar esas cadenas invalida los consentimientos anteriores y obliga a pedirlos de nuevo. Es intencional: si el texto cambió, la autorización previa fue sobre otra cosa.

## Inventario

| Archivo | Qué cubre | Prioridad |
|---|---|---|
| `terminos-de-uso.md` | Relación con usuarios, rol de intermediario, prohibiciones, PQR | Bloqueante |
| `politica-tratamiento-datos.md` | Ley 1581 de 2012: finalidades, derechos, retención | Bloqueante |
| `aviso-de-privacidad.md` | Versión corta para cada formulario | Bloqueante |
| `acuerdo-donante.md` | Declaración de aptitud y responsabilidades del donante | Bloqueante |
| `acuerdo-organizacion-receptora.md` | Custodia, destino gratuito, auditoría | Bloqueante |
| `politica-inocuidad.md` | Criterios de aceptación y rechazo | Bloqueante |
| `dpa-encargado.md` | Contrato con proveedores que tratan datos | Antes de contratar |
| `politica-cookies.md` | Almacenamiento local y de terceros | Antes de analítica |

## Decisiones que deben tomarse antes de completar cualquier plantilla

- Naturaleza de la entidad operadora (ESAL, fundación, asociación) y quién responde.
- Régimen tributario y tratamiento de las donaciones.
- Si se contratan seguros de responsabilidad civil y con qué cobertura.
- Rol frente a INVIMA y secretarías de salud locales.
- Si aplica el registro de bases de datos ante la SIC.
- Transferencias internacionales de datos según el hosting elegido.
- Jurisdicción y mecanismo de solución de controversias.
