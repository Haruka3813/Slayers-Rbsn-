const { createClient } = require("@supabase/supabase-js");

// Configuración de Supabase
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

const supabase =
SUPABASE_URL && SUPABASE_KEY
? createClient(SUPABASE_URL, SUPABASE_KEY)
: null;

// Comprobar conexión configurada
function comprobarConexion() {
return supabase !== null;
}

// Guardar o actualizar perfil
async function guardarPerfil(perfil) {
if (!supabase) {
throw new Error("Supabase no está configurado.");
}

if (!perfil || !perfil.id) {
throw new Error("El perfil no es válido.");
}

const { data, error } = await supabase
.from("perfiles")
.upsert({
id: String(perfil.id),
nombre: perfil.nombre || "Jugador",
datos: perfil,
fecha_actualizacion: new Date().toISOString()
})
.select()
.single();

if (error) {
throw error;
}

return data;
}

// Obtener perfil de un jugador
async function obtenerPerfil(userId) {
if (!supabase) {
throw new Error("Supabase no está configurado.");
}

const { data, error } = await supabase
.from("perfiles")
.select("datos")
.eq("id", String(userId))
.maybeSingle();

if (error) {
throw error;
}

return data ? data.datos : null;
}

// Obtener todos los perfiles
async function obtenerTodosLosPerfiles() {
if (!supabase) {
throw new Error("Supabase no está configurado.");
}

const { data, error } = await supabase
.from("perfiles")
.select("datos");

if (error) {
throw error;
}

return data.map(registro => registro.datos);
}

// Eliminar perfil
async function eliminarPerfil(userId) {
if (!supabase) {
throw new Error("Supabase no está configurado.");
}

const { error } = await supabase
.from("perfiles")
.delete()
.eq("id", String(userId));

if (error) {
throw error;
}

return true;
}

module.exports = {
comprobarConexion,
guardarPerfil,
obtenerPerfil,
obtenerTodosLosPerfiles,
eliminarPerfil
};
