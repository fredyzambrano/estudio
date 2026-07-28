# Runbook del piloto

Cómo se opera esto con personas de verdad. Escrito para que alguien que no construyó el sistema pueda ejecutarlo.

## Antes del día uno

- [ ] Revisión legal completa (`legal/`) y textos publicados en `www`
- [ ] Rangos de `app/js/datos/catalogos.js` validados por un profesional de inocuidad
- [ ] Entidad operadora constituida, con correo corporativo y MFA en todas las cuentas
- [ ] Backend desplegado (`api/`) — el piloto local **no** recibe datos reales
- [ ] Canal de PQR con responsable y horario publicados
- [ ] Un teléfono de contingencia que conteste durante la ventana de retiro

## Escala del piloto

3 donantes, 2 organizaciones receptoras, una ciudad, 6 semanas. Deliberadamente pequeño: el objetivo es descubrir dónde falla el proceso, no mover toneladas.

Criterios de salida: si el tiempo mediano entre publicar y recibir supera las 12 horas de forma sostenida, o si más del 20 % de las publicaciones vence sin reservarse, el problema es de diseño operativo y no se arregla con más donantes.

## Admisión de una organización

1. Recibir solicitud por el canal acordado. **No** por formulario público abierto en el piloto.
2. Solicitar: certificado de existencia y representación legal (≤ 30 días), RUT, dirección operativa, responsable con teléfono directo, descripción de capacidad (almacenamiento, frío, transporte).
3. Videollamada con el representante legal. Confirmar identidad y que la dirección operativa existe.
4. Registrar en la plataforma y marcar la lista de chequeo **solo con lo que se confirmó personalmente**.
5. Escribir el sustento en el campo de motivo. Ese texto es la defensa del proyecto si algo sale mal.
6. Firmar el acuerdo correspondiente (`legal/acuerdo-donante.md` o `legal/acuerdo-organizacion-receptora.md`).

Nunca se aprueba con la lista incompleta: el sistema lo impide, y no hay forma de saltárselo desde la interfaz.

## Día a día

**Mañana**
- Revisar donaciones publicadas con ventana < 12 h que sigan sin reserva. Llamar, no esperar.
- Revisar la bandeja de verificación.

**Durante la ventana de retiro**
- Confirmar por teléfono que la organización va en camino cuando falten 2 horas.
- Si no puede ir: liberar la reserva de inmediato (`RESERVED → PUBLISHED` con motivo). Otra organización todavía alcanza.

**Cierre del día**
- Confirmar recepciones pendientes. Una donación en `HANDED_OVER` más de 24 h es una señal: o no se confirmó, o algo pasó.
- Revisar en Auditoría los eventos `INOCUIDAD_BLOQUEO`. Repetición en la misma organización = conversación, no sanción automática.

**Semanal**
- Verificar la integridad de la cadena de auditoría (botón en el panel).
- Exportar respaldo y guardarlo fuera de la plataforma.
- Revisar el embudo: dónde se pierde lo publicado.

## Protocolo de incidente sanitario

Un incidente sanitario es cualquier sospecha de que un alimento entregado pudo causar daño.

**Primeros 30 minutos**
1. Pausar: cancelar las donaciones activas del mismo lote y suspender la publicación del donante si hay duda razonable.
2. Avisar por teléfono a las dos partes. Por teléfono, no por correo.
3. Pedir que se detenga cualquier distribución en curso.

**Primeras 4 horas**
4. Preservar evidencia: fotos, actas, registros de temperatura, la donación completa en la plataforma. **No** editar registros — la auditoría es append-only justamente para esto.
5. Registrar el incidente con gravedad y descripción de los hechos, sin conjeturas.
6. Evaluar con asesoría si corresponde reportar a la autoridad sanitaria. `TODO (legal)`: definir de antemano el umbral y el destinatario del reporte.

**Primeras 72 horas**
7. Reunión con ambas partes. Qué pasó, qué falló en el proceso, qué cambia.
8. Si el fallo fue del sistema (una regla que debió bloquear y no bloqueó), abrir un cambio en `inocuidad.js` **con una prueba que reproduzca el caso**.
9. Decidir sobre la continuidad de la organización involucrada.

## Protocolo de incidente de datos personales

1. Contener: revocar tokens (`SAL_TOKENS`), cerrar el acceso comprometido.
2. Determinar alcance: qué datos, de cuántos titulares, desde cuándo.
3. Registrar todo con hora. La reconstrucción posterior siempre es peor que el registro en vivo.
4. `TODO (legal)`: el abogado debe fijar el procedimiento y los plazos de notificación aplicables, y quién firma la comunicación.
5. Notificar a los titulares afectados en lenguaje claro: qué pasó, qué datos, qué deben hacer.
6. Postmortem escrito, sin buscar culpables individuales.

## Qué medir

| Indicador | Dónde | Señal de alarma |
|---|---|---|
| Tiempo mediano publicar → recibir | Panel | > 12 h sostenido |
| Tasa de rescate | Panel | < 60 % |
| Donaciones vencidas sin reservar | Operación | Cualquier caso merece revisión |
| Bloqueos por inocuidad | Auditoría | Repetición en una misma organización |
| Reservas liberadas | Auditoría | Una organización que libera mucho no tiene capacidad real |
| Recepciones no conformes | Actas | Diferencia sistemática entre publicado y recibido |

El indicador que **no** debe usarse como objetivo público es el total de kilos: premia publicar mucho, no rescatar bien.

## Preguntas frecuentes de la operación

**¿Y si el donante quiere entregar directamente a una familia?**
No en el piloto. La plataforma solo coordina con organizaciones verificadas. Es la decisión de riesgo que hace viable empezar.

**¿Y si la organización receptora quiere vender parte del alimento para financiarse?**
Está prohibido por el acuerdo. Es causal de suspensión inmediata.

**¿Y si el alimento vence en 2 horas?**
La plataforma deja publicarlo si cumple todo lo demás, y avisa del margen crítico. La decisión de moverlo es de las partes; el sistema no la toma por ellas.

**¿Y si alguien pide "solo por esta vez" publicar algo vencido?**
No. No hay forma de hacerlo en la interfaz y no debe agregarse. Es el único límite que no se negocia.
