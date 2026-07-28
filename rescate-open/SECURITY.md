# Política de seguridad

## Reportar una vulnerabilidad

**No abras un issue público.** Escribe a: `[SEGURIDAD@TUDOMINIO.CO]`

Si el reporte contiene información sensible, cífralo con nuestra clave pública: `[HUELLA PGP O ENLACE]`

### Qué incluir

- Descripción del problema y su impacto.
- Pasos para reproducirlo.
- Versión, rama o commit afectado.
- Si aplica, una prueba de concepto **mínima**.

### Qué esperar

| Momento | Compromiso |
|---|---|
| 48 horas | Acuse de recibo |
| 7 días | Evaluación inicial y severidad asignada |
| 90 días | Corrección o plan público, con divulgación coordinada |

Si el hallazgo afecta datos personales de organizaciones reales, la contención empieza el mismo día.

### Divulgación coordinada

Te pedimos no divulgar públicamente el hallazgo hasta que exista corrección o hayan transcurrido 90 días desde el acuse, lo que ocurra primero. Reconoceremos tu aporte en las notas de la versión, salvo que prefieras el anonimato.

## Alcance

**Dentro de alcance**

- La aplicación desplegada en `[https://app.tudominio.co]`
- La API (`api/worker.js`)
- El núcleo de reglas (`app/js/core/`)
- Configuración de despliegue y cabeceras de seguridad

**Especialmente valorado**

- Cualquier forma de cambiar el estado de una donación sin pasar por `aplicarTransicion()`.
- Cualquier forma de publicar o entregar un alimento que las reglas de `inocuidad.js` deberían bloquear.
- Acceso a `direccionExacta`, `contactoTelefono` o `codigoEntrega` sin reserva activa.
- Escalada de privilegios entre roles, o acceso a recursos de otra organización.
- Alteración del historial de auditoría sin romper la cadena de hash.

**Fuera de alcance**

- Ingeniería social al equipo o a las organizaciones participantes.
- Denegación de servicio por volumen.
- Hallazgos automatizados sin impacto demostrado.
- Ausencia de cabeceras en dominios que no son de la entidad.
- Manipulación del `localStorage` en el **piloto local**: es un modo de demostración documentado, sin datos reales, y por diseño el navegador no es la autoridad. Si encuentras la misma manipulación aceptada por la API, eso **sí** es un hallazgo.

## Compromisos del proyecto

- Cero dependencias de terceros en tiempo de ejecución, para mantener mínima la superficie de cadena de suministro.
- Auditoría append-only, reforzada con disparadores en la base de datos.
- Direcciones IP nunca almacenadas completas.
- Ningún secreto en el repositorio; solo nombres en `.env.example`.
- Ningún dato real en semillas, pruebas ni capturas — hay una prueba automática que lo verifica.

## Si eres tú quien encontró el problema estando dentro

Si trabajas en el proyecto y descubres que algo se desplegó mal, dilo de inmediato. No hay consecuencia por reportar un error propio; sí la hay por dejar que siga en producción.
