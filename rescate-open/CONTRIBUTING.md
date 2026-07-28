# Cómo contribuir a Rescate Open

Gracias por el interés. Este proyecto coordina alimentos que van a comer personas reales, así que las reglas de contribución son más estrictas de lo habitual en un proyecto pequeño.

## Certificado de origen (DCO)

Toda contribución requiere firmar cada commit:

```bash
git commit -s -m "Corrige la ventana de retiro de preparados"
```

El `-s` añade la línea `Signed-off-by: Nombre <correo>`, con la que declaras estar de acuerdo con el [Developer Certificate of Origin 1.1](https://developercertificate.org/): que tienes derecho a aportar ese código y que puede distribuirse bajo la licencia del proyecto.

**No se aceptan contribuciones sin DCO.** Sin ella no hay forma de saber si el código puede distribuirse.

## Antes de escribir código

1. Abre un issue describiendo el problema, no la solución.
2. Si tocas `core/inocuidad.js`, `core/rbac.js` o `core/estados.js`, **espera a que se discuta**. Esos tres archivos son el producto: cambiarlos cambia lo que la plataforma permite hacer con alimentos.
3. Si el cambio afecta obligaciones legales u operativas, dilo en el issue. Puede requerir revisión externa.

## Flujo

```bash
git checkout -b arregla/ventana-preparados
npm test          # debe pasar antes de empezar
# ... tus cambios ...
npm test          # y después
git commit -s -m "..."
```

## Reglas que no se negocian

1. **Cero dependencias en tiempo de ejecución.** Si crees que necesitas una, abre un issue y explica por qué. La respuesta por defecto es no. Herramientas de desarrollo se discuten aparte.
2. **Ningún dato real.** Ni en semillas, ni en pruebas, ni en capturas, ni en mensajes de commit: ni organizaciones, ni direcciones, ni teléfonos, ni correos personales. Usa dominios reservados (`ejemplo.test`) y márcalos como ficticios. Hay una prueba que lo verifica.
3. **Ningún secreto.** Ni claves, ni tokens, ni identificadores de base de datos con acceso.
4. **`estado` solo se cambia en `core/estados.js`.** Cualquier asignación fuera de ahí es un bug de seguridad, aunque funcione.
5. **Todo texto de usuario pasa por `esc()`** antes de llegar a `innerHTML`. Sin excepciones.
6. **Nada de `unsafe-inline` en scripts.** No agregues `<script>` en línea ni atributos `onclick`: romperían la CSP que protege el despliegue.
7. **Una regla sanitaria no se relaja para que algo funcione.** Si estorba, la discusión es de producto y de inocuidad.

## Pruebas

Toda corrección de bug llega con una prueba que falla antes del arreglo y pasa después.

```bash
npm test                  # todo
node --test tests/estados.test.js   # un archivo
npm run test:watch        # durante el desarrollo
```

Las pruebas son el contrato del núcleo. Si un cambio hace pasar algo que antes fallaba, revisa que no se haya debilitado la prueba:

```bash
git diff tests/
```

Cambios que **siempre** requieren prueba nueva:

- cualquier regla de `inocuidad.js`;
- cualquier entrada de la matriz de `rbac.js`;
- cualquier transición de `estados.js`;
- cualquier campo que pueda filtrarse en `vistaPublica()`.

## Estilo

- Español en nombres, comentarios y mensajes de commit. Los códigos de estado y de error van en inglés porque son el contrato con la base de datos y la API.
- Comentarios que expliquen **por qué**, no qué. El qué ya está en el código.
- Módulos ES, funciones puras en el núcleo, sin estado global fuera de `store.js`.
- Sin abreviaturas crípticas. `organizacionReceptora`, no `orgRec`.
- Formato: 2 espacios, comillas dobles, punto y coma. Sigue lo que ya está.

## Revisión

Las PR se revisan mirando, en este orden:

1. ¿Debilita alguna barrera sanitaria o de autorización?
2. ¿Puede filtrar datos reservados?
3. ¿Rompe la cadena de auditoría o permite editarla?
4. ¿Está probado?
5. ¿Se entiende dentro de seis meses?

## Traducciones y accesibilidad

Bienvenidas. La interfaz debe funcionar con teclado, con lector de pantalla y con contraste suficiente. Si encuentras un elemento que no se puede alcanzar con `Tab`, es un bug.

## Código de conducta

`CODE_OF_CONDUCT.md`. Aplica en issues, PR y cualquier espacio del proyecto.

## Licencia de tus aportes

Al contribuir aceptas que tu código se distribuya bajo **AGPL-3.0-or-later**, la licencia del proyecto.
