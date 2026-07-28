-- ============================================================
-- RESCATE OPEN — Esquema de base de datos (SQLite / Cloudflare D1)
-- Deriva de este archivo el esquema Prisma si migras a PostgreSQL:
-- los nombres y las restricciones ya reflejan las reglas del piloto.
--
-- Principios grabados en el esquema:
--  1. Los estados son un CHECK, no una convención.
--  2. Los datos sensibles viven en columnas separadas y explícitas.
--  3. La auditoría es append-only y encadenada por hash.
--  4. Nada de cascadas destructivas sobre auditoría.
-- ============================================================

PRAGMA foreign_keys = ON;

-- ---------- Organizaciones ----------

CREATE TABLE IF NOT EXISTS organizaciones (
  id                    TEXT PRIMARY KEY,
  nombre                TEXT NOT NULL,
  tipo                  TEXT NOT NULL CHECK (tipo IN ('DONANTE', 'RECEPTORA')),
  nit                   TEXT NOT NULL,
  ciudad_id             TEXT NOT NULL,
  direccion             TEXT NOT NULL,
  correo_contacto       TEXT NOT NULL,
  telefono_contacto     TEXT NOT NULL,
  responsable_nombre    TEXT NOT NULL,
  responsable_cargo     TEXT,
  capacidad_kg_mes      REAL,
  tiene_cadena_frio     INTEGER NOT NULL DEFAULT 0,
  tiene_transporte      INTEGER NOT NULL DEFAULT 0,
  descripcion           TEXT,
  estado_verificacion   TEXT NOT NULL DEFAULT 'PENDIENTE'
                          CHECK (estado_verificacion IN ('PENDIENTE','EN_REVISION','VERIFICADA','RECHAZADA')),
  chequeo_json          TEXT NOT NULL DEFAULT '{}',
  suspendida            INTEGER NOT NULL DEFAULT 0,
  motivo_estado         TEXT,
  verificada_por_id     TEXT,
  verificada_en         TEXT,
  creada_en             TEXT NOT NULL,
  actualizada_en        TEXT NOT NULL,
  UNIQUE (nit)
);

CREATE INDEX IF NOT EXISTS idx_org_estado ON organizaciones (estado_verificacion, suspendida);

-- Los documentos de verificación NO se guardan aquí: solo su referencia.
-- Deben vivir en almacenamiento cifrado, con URLs temporales y acceso por rol.
CREATE TABLE IF NOT EXISTS documentos_verificacion (
  id                TEXT PRIMARY KEY,
  organizacion_id   TEXT NOT NULL REFERENCES organizaciones(id) ON DELETE CASCADE,
  tipo              TEXT NOT NULL,
  referencia_externa TEXT NOT NULL,   -- clave en el bucket cifrado, nunca una URL pública
  hash_sha256       TEXT NOT NULL,
  subido_por_id     TEXT NOT NULL,
  subido_en         TEXT NOT NULL,
  borrar_despues_de TEXT              -- calendario de retención: obligatorio de definir
);

-- ---------- Usuarios y sesiones ----------

CREATE TABLE IF NOT EXISTS usuarios (
  id                 TEXT PRIMARY KEY,
  nombre             TEXT NOT NULL,
  correo             TEXT NOT NULL UNIQUE,
  correo_verificado  INTEGER NOT NULL DEFAULT 0,
  rol                TEXT NOT NULL CHECK (rol IN ('DONOR','RECEIVER','VERIFIER','SUPPORT','ADMIN')),
  organizacion_id    TEXT REFERENCES organizaciones(id) ON DELETE SET NULL,
  mfa_activo         INTEGER NOT NULL DEFAULT 0,
  suspendido         INTEGER NOT NULL DEFAULT 0,
  creado_en          TEXT NOT NULL,
  actualizado_en     TEXT NOT NULL,
  -- Los roles críticos no pueden existir sin segundo factor.
  CHECK (rol NOT IN ('VERIFIER','ADMIN') OR mfa_activo = 1)
);

-- Tokens opacos. Se guarda solo el hash: si se filtra la tabla, no se filtran sesiones.
CREATE TABLE IF NOT EXISTS tokens (
  hash_token     TEXT PRIMARY KEY,
  usuario_id     TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  creado_en      TEXT NOT NULL,
  expira_en      TEXT NOT NULL,
  revocado_en    TEXT,
  ip_seudonima   TEXT
);

CREATE INDEX IF NOT EXISTS idx_tokens_usuario ON tokens (usuario_id);

-- ---------- Consentimiento ----------

CREATE TABLE IF NOT EXISTS consentimientos (
  id                    TEXT PRIMARY KEY,
  usuario_id            TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  finalidades_json      TEXT NOT NULL,
  version_terminos      TEXT NOT NULL,
  version_privacidad    TEXT NOT NULL,
  hash_texto_mostrado   TEXT NOT NULL,   -- prueba de QUÉ se le mostró al titular
  canal                 TEXT NOT NULL,
  ip_seudonima          TEXT,
  agente_usuario        TEXT,
  otorgado_en           TEXT NOT NULL,
  revocado_en           TEXT
);

CREATE INDEX IF NOT EXISTS idx_consent_usuario ON consentimientos (usuario_id, otorgado_en DESC);

-- ---------- Donaciones ----------

CREATE TABLE IF NOT EXISTS donaciones (
  id                    TEXT PRIMARY KEY,
  estado                TEXT NOT NULL DEFAULT 'DRAFT'
                          CHECK (estado IN ('DRAFT','PUBLISHED','RESERVED','HANDED_OVER','RECEIVED','CLOSED','CANCELLED','REJECTED')),
  organizacion_id       TEXT NOT NULL REFERENCES organizaciones(id) ON DELETE RESTRICT,
  creada_por_id         TEXT NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,

  titulo                TEXT NOT NULL,
  descripcion           TEXT,
  categoria             TEXT NOT NULL,
  cantidad              REAL NOT NULL CHECK (cantidad > 0),
  unidad                TEXT NOT NULL,

  conservacion          TEXT NOT NULL,
  temperatura_c         REAL,
  estado_empaque        TEXT NOT NULL,
  fecha_vencimiento     TEXT,
  preparado_en          TEXT,
  lote                  TEXT,
  registro_sanitario    TEXT,
  responsable_tecnico   TEXT,
  alergenos_json        TEXT NOT NULL DEFAULT '[]',
  sin_alergenos_declarados INTEGER NOT NULL DEFAULT 0,
  alerta_sanitaria      INTEGER NOT NULL DEFAULT 0,
  declaracion_aptitud   INTEGER NOT NULL DEFAULT 0,

  retiro_desde          TEXT NOT NULL,
  retiro_hasta          TEXT NOT NULL,
  requiere_transporte_receptor INTEGER NOT NULL DEFAULT 1,

  -- Ubicación pública: SOLO aproximada. Las coordenadas exactas no se almacenan.
  ciudad_id             TEXT NOT NULL,
  zona                  TEXT,
  lat_aprox             REAL,
  lon_aprox             REAL,
  precision_km          REAL NOT NULL DEFAULT 1,
  celda                 TEXT,

  -- Datos reservados: se sirven solo a la organización con reserva activa.
  direccion_exacta      TEXT NOT NULL,
  indicaciones_retiro   TEXT,
  contacto_nombre       TEXT NOT NULL,
  contacto_telefono     TEXT NOT NULL,

  fotos_json            TEXT NOT NULL DEFAULT '[]',

  reservada_por_id      TEXT REFERENCES organizaciones(id) ON DELETE SET NULL,
  reservada_en          TEXT,
  codigo_entrega        TEXT,
  entregada_en          TEXT,
  evidencia_entrega_json TEXT,
  recibida_en           TEXT,
  acta_json             TEXT,
  cerrada_en            TEXT,
  finalizada_en         TEXT,
  motivo_final          TEXT,

  publicada_en          TEXT,
  creada_en             TEXT NOT NULL,
  actualizada_en        TEXT NOT NULL,

  CHECK (retiro_hasta > retiro_desde),
  -- Una donación reservada tiene, sí o sí, organización receptora y código.
  CHECK (estado <> 'RESERVED' OR (reservada_por_id IS NOT NULL AND codigo_entrega IS NOT NULL)),
  -- Nadie se dona a sí mismo.
  CHECK (reservada_por_id IS NULL OR reservada_por_id <> organizacion_id)
);

CREATE INDEX IF NOT EXISTS idx_don_estado_ventana ON donaciones (estado, retiro_hasta);
CREATE INDEX IF NOT EXISTS idx_don_org ON donaciones (organizacion_id, estado);
CREATE INDEX IF NOT EXISTS idx_don_reserva ON donaciones (reservada_por_id, estado);
CREATE INDEX IF NOT EXISTS idx_don_ciudad ON donaciones (ciudad_id, estado);

-- ---------- Cadena de custodia ----------

CREATE TABLE IF NOT EXISTS eventos_custodia (
  id              TEXT PRIMARY KEY,
  donacion_id     TEXT NOT NULL REFERENCES donaciones(id) ON DELETE RESTRICT,
  estado_desde    TEXT NOT NULL,
  estado_hasta    TEXT NOT NULL,
  actor_id        TEXT NOT NULL,
  actor_rol       TEXT NOT NULL,
  motivo          TEXT,
  datos_json      TEXT,
  ocurrido_en     TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_custodia_donacion ON eventos_custodia (donacion_id, ocurrido_en);

-- ---------- Incidentes ----------

CREATE TABLE IF NOT EXISTS incidentes (
  id              TEXT PRIMARY KEY,
  donacion_id     TEXT REFERENCES donaciones(id) ON DELETE SET NULL,
  organizacion_id TEXT REFERENCES organizaciones(id) ON DELETE SET NULL,
  reportado_por_id TEXT NOT NULL,
  gravedad        TEXT NOT NULL CHECK (gravedad IN ('BAJA','MEDIA','ALTA','CRITICA')),
  descripcion     TEXT NOT NULL,
  estado          TEXT NOT NULL DEFAULT 'ABIERTO' CHECK (estado IN ('ABIERTO','EN_CURSO','CERRADO')),
  acciones        TEXT,
  reportado_en    TEXT NOT NULL,
  cerrado_en      TEXT
);

-- ---------- Auditoría (append-only, encadenada) ----------

CREATE TABLE IF NOT EXISTS auditoria (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  accion          TEXT NOT NULL,
  actor_id        TEXT,
  actor_rol       TEXT,
  organizacion_id TEXT,
  recurso         TEXT,
  recurso_id      TEXT,
  antes_json      TEXT,
  despues_json    TEXT,
  motivo          TEXT,
  ip_seudonima    TEXT,          -- /24 o /48, seudonimizada con sal. NUNCA la IP completa.
  ts              TEXT NOT NULL,
  hash_anterior   TEXT,
  hash            TEXT NOT NULL UNIQUE
);

CREATE INDEX IF NOT EXISTS idx_audit_recurso ON auditoria (recurso_id, id);
CREATE INDEX IF NOT EXISTS idx_audit_accion ON auditoria (accion, id);

-- La auditoría no se edita ni se borra. Estos disparadores lo hacen explícito
-- dentro de la base de datos, no solo en la capa de aplicación.
CREATE TRIGGER IF NOT EXISTS auditoria_sin_update
BEFORE UPDATE ON auditoria
BEGIN
  SELECT RAISE(ABORT, 'La auditoría es append-only: no se actualiza.');
END;

CREATE TRIGGER IF NOT EXISTS auditoria_sin_delete
BEFORE DELETE ON auditoria
BEGIN
  SELECT RAISE(ABORT, 'La auditoría es append-only: no se borra.');
END;

-- ---------- Limitación de tasa ----------

CREATE TABLE IF NOT EXISTS limites (
  clave       TEXT PRIMARY KEY,     -- ip_seudonima + ruta + ventana
  conteo      INTEGER NOT NULL DEFAULT 0,
  ventana_fin TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_limites_ventana ON limites (ventana_fin);
