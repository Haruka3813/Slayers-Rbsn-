require("dotenv").config();

const express = require("express");

const {
  crearPerfil,
  mostrarPerfil,
  actualizarRegeneracion,
  renacerPerfil,
  ELEMENTOS_DISPONIBLES,
  normalizarPerfil,
  actualizarMina,
  consumirIntentoMina
} = require("./systems/perfil");

const {
  consultarSaldo,
  agregarBanco,
  retirarBanco,
  agregarReserva,
  retirarReserva
} = require("./systems/economia");

const {
  mostrarInventario,
  usarEsencia,
  agregarEsencia
} = require("./systems/inventario");

const {
  listarEnemigos,
  listarBosses,
  obtenerProximoBoss,
  buscarBoss,
  iniciarCombate,
  iniciarCombateBoss,
  atacarEnemigo,
  atacarJugador,
  finalizarCombate
} = require("./systems/rpg");

const {
  rankingPorNivel,
  rankingPorVictorias,
  rankingPorRubies,
  mostrarRanking
} = require("./systems/ranking");

const {
  comprobarConexion,
  guardarPerfil,
  obtenerPerfil,
  obtenerTodosLosPerfiles
} = require("./database/supabase");

const app = express();

app.use(express.json());

const PORT = process.env.PORT || 3000;
const BOT_TOKEN = process.env.BOT_TOKEN;

const URL_ICONO =
  "https://raw.githubusercontent.com/Haruka3813/Slayers-Rbsn-/main/slayers-rbsn.jpg";

const combatesActivos = new Map();
const mensajesProcesados = new Set();

// =====================================
// ACTUALIZAR IMAGEN DEL BOT
// =====================================

async function actualizarIconoBot() {
  if (!BOT_TOKEN) {
    console.error("No se puede actualizar el icono: falta BOT_TOKEN.");
    return;
  }

  try {
    console.log("Descargando imagen de Slayers-Rbsn...");

    const imagen = await fetch(URL_ICONO);

    if (!imagen.ok) {
      throw new Error(`No se pudo descargar la imagen: HTTP ${imagen.status}`);
    }

    const bytes = Buffer.from(await imagen.arrayBuffer());

    if (bytes.length === 0) {
      throw new Error("La imagen descargada estÃ¡ vacÃ­a.");
    }

    if (bytes.length > 512 * 1024) {
      throw new Error("La imagen supera el lÃ­mite de 512 KB de Anarchy.");
    }

    const respuesta = await fetch(
      "https://api.anarchyapps.org/bot-api/v1/me/icon",
      {
        method: "PUT",
        headers: {
          Authorization: "Bot " + BOT_TOKEN,
          "Content-Type": "image/jpeg"
        },
        body: bytes
      }
    );

    const resultado = await respuesta.text();

    if (!respuesta.ok) {
      throw new Error(
        `Anarchy rechazÃ³ la imagen (${respuesta.status}): ${resultado}`
      );
    }

    console.log("Â¡Imagen de perfil de Slayers-Rbsn actualizada!");
    console.log("Respuesta de Anarchy:", resultado);

  } catch (error) {
    console.error("Error actualizando la imagen del bot:", error.message);
  }
}

// =====================================
// PAUSA ENTRE TURNOS
// =====================================

function pausa(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// =====================================
// ENVIAR MENSAJES A ANARCHY APPS
// =====================================

async function enviarMensaje(threadId, contenido) {
  if (!BOT_TOKEN) {
    throw new Error("Falta configurar BOT_TOKEN.");
  }

  if (!threadId) {
    throw new Error("No se recibiÃ³ el ID de la conversaciÃ³n.");
  }

  if (contenido === null || contenido === undefined) {
    throw new Error("No se recibiÃ³ contenido para enviar.");
  }

  const respuesta = await fetch(
    `https://api.anarchyapps.org/bot-api/v1/threads/${encodeURIComponent(threadId)}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: "Bot " + BOT_TOKEN,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        content: String(contenido)
      })
    }
  );

  const resultado = await respuesta.text();

  if (!respuesta.ok) {
    throw new Error(
      `Error de Anarchy (${respuesta.status}): ${resultado}`
    );
  }

  return resultado;
}

// =====================================
// OBTENER O CREAR PERFIL
// =====================================

async function cargarPerfil(userId, username) {
  const nombreValido =
    typeof username === "string" &&
    username.trim() !== "" &&
    username.trim().toLowerCase() !== "jugador";

  if (combatesActivos.has(userId)) {
    const perfilActivo = combatesActivos.get(userId).perfil;

    if (nombreValido) {
      perfilActivo.nombre = username.trim();
    }

    return perfilActivo;
  }

  let perfil = await obtenerPerfil(userId);

  if (!perfil) {
    perfil = crearPerfil(
      userId,
      nombreValido ? username.trim() : "Jugador"
    );
  }

  normalizarPerfil(perfil);

  if (nombreValido) {
    perfil.nombre = username.trim();
  }

  actualizarRegeneracion(perfil, false);
  actualizarMina(perfil);

  await guardarPerfil(perfil);

  return perfil;
}

// =====================================
// COMPROBAR REGISTRO
// =====================================

function estaRegistrado(perfil) {
  return Boolean(
    perfil &&
    perfil.elementos &&
    perfil.elementos.primero
  );
}

// =====================================
// MENÚ DE REGISTRO Y ELEMENTOS
// =====================================

function mostrarMenuElementos(perfil) {
  normalizarPerfil(perfil);

  let titulo = "";
  let disponibles = [];

  if (perfil.renacerPendiente) {
    titulo = "ðŸŒŸ ELEGÃ TU ELEMENTO DE RENACIMIENTO";

  } else if (!perfil.elementos.primero) {
    titulo = "âš”ï¸ REGISTRO DE AVENTURERO";

  } else if (
    perfil.nivel >= 25 &&
    !perfil.elementos.segundo
  ) {
    titulo = "âœ¨ DESBLOQUEASTE TU SEGUNDO ELEMENTO";

  } else {
    return "âŒ Ya tenÃ©s todos los elementos disponibles por ahora.";
  }

  const elementosElegidos = [
    perfil.elementos.primero,
    perfil.elementos.segundo,
    ...(perfil.elementos.adicionales || [])
  ].filter(Boolean);

  disponibles = ELEMENTOS_DISPONIBLES.filter(
    elemento => !elementosElegidos.includes(elemento.id)
  );

  if (disponibles.length === 0) {
    return "âŒ No quedan elementos disponibles para elegir.";
  }

  let mensaje =
    `${titulo}\n\n` +
    "ElegÃ­ un elemento de la siguiente lista:\n\n";

  disponibles.forEach(elemento => {
    mensaje +=
      `${elemento.nombre}\n` +
      `Comando: &registrar:${elemento.id}\n\n`;
  });

  mensaje +=
    "âš ï¸ Tu elecciÃ³n serÃ¡ permanente y no podrÃ¡s cambiarla.";

  return mensaje;
}

// =====================================
// REGISTRAR O ELEGIR ELEMENTO
// =====================================

async function registrarElemento(perfil, elementoId) {
  normalizarPerfil(perfil);

  const elemento = ELEMENTOS_DISPONIBLES.find(
    item => item.id === elementoId
  );

  if (!elemento) {
    return (
      "âŒ Ese elemento no existe.\n\n" +
      mostrarMenuElementos(perfil)
    );
  }

  const elementosElegidos = [
    perfil.elementos.primero,
    perfil.elementos.segundo,
    ...(perfil.elementos.adicionales || [])
  ].filter(Boolean);

  if (elementosElegidos.includes(elementoId)) {
    return "âŒ Ya tenÃ©s ese elemento. ElegÃ­ uno diferente.";
  }

  if (perfil.renacerPendiente) {
    perfil.elementos.adicionales.push(elementoId);
    perfil.renacerPendiente = false;

    await guardarPerfil(perfil);

    return (
      `ðŸŒŸ Â¡ELEMENTO DE RENACIMIENTO DESBLOQUEADO!\n\n` +
      `${elemento.nombre}\n\n` +
      `ðŸŒŸ Renacer: ${perfil.renacer}\n` +
      "Este elemento es permanente."
    );
  }

  if (!perfil.elementos.primero) {
    perfil.elementos.primero = elementoId;

    await guardarPerfil(perfil);

    return (
      "âš”ï¸ Â¡REGISTRO COMPLETADO!\n\n" +
      `ðŸ‘¤ Aventurero: ${perfil.nombre}\n` +
      `${elemento.nombre}\n\n` +
      "Tu primer elemento es permanente.\n" +
      "Â¡Bienvenido a Slayers Rbsn!"
    );
  }

  if (
    perfil.nivel >= 25 &&
    !perfil.elementos.segundo
  ) {
    perfil.elementos.segundo = elementoId;

    await guardarPerfil(perfil);

    return (
      "âœ¨ Â¡SEGUNDO ELEMENTO DESBLOQUEADO!\n\n" +
      `${elemento.nombre}\n\n` +
      "Tu segundo elemento es permanente."
    );
  }

  return "âŒ No tenÃ©s ningÃºn elemento pendiente para elegir.";
}

// =====================================
// MOSTRAR ECONOMÍA
// =====================================

function mostrarEconomia(perfil) {
  const datos = consultarSaldo(perfil);

  return (
    "ðŸ’Ž ECONOMÃA DE SLAYERS ðŸ’Ž\n\n" +
    `ðŸ’° RubÃ­es disponibles: ${datos.saldo}\n` +
    `ðŸ¦ Banco: ${datos.banco}\n` +
    `ðŸ”’ Reserva: ${datos.reserva}/${datos.limiteReserva} ðŸ’Ž\n\n` +
    "â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”"
  );
}

// =====================================
// MOSTRAR ESTADÍSTICAS
// =====================================

function textoEstadisticas(perfil) {
  const stats = perfil.estadisticas || {};

  const nivel = Number(perfil.nivel) || 1;
  const experiencia = Number(perfil.experiencia) || 0;

  const vida = Number(stats.vida) || 0;
  const vidaMaxima = Number(stats.vidaMaxima) || 0;

  const ataque = Number(stats.ataque) || 0;
  const defensa = Number(stats.defensa) || 0;

  const monstruos = Number(stats.monstruosDerrotados) || 0;
  const bosses = Number(stats.bossesDerrotados) || 0;

  const rubies = Number(stats.rubiesObtenidos) || 0;

  const victorias = Number(stats.victorias) || 0;
  const derrotas = Number(stats.derrotas) || 0;

  const combatesGanados =
    Number(stats.combatesGanados) || victorias;

  const combatesPerdidos =
    Number(stats.combatesPerdidos) || derrotas;

  return (
    "ðŸ“Šâ”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”ðŸ“Š\n" +
    "       ESTADÃSTICAS DEL AVENTURERO\n" +
    "ðŸ“Šâ”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”ðŸ“Š\n\n" +

    `ðŸ§™ Jugador: ${perfil.nombre || "Jugador"}\n` +
    `ðŸŒŸ Renacer: ${perfil.renacer || 0}\n` +
    `â­ Nivel: ${nivel}/500\n` +
    `âœ¨ Experiencia: ${experiencia} XP\n\n` +

    "â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”\n" +
    "âš”ï¸ ATRIBUTOS DE COMBATE\n\n" +

    `â¤ï¸ Vida: ${vida}/${vidaMaxima}\n` +
    `âš”ï¸ Ataque: ${ataque}\n` +
    `ðŸ›¡ï¸ Defensa: ${defensa}\n\n` +

    "â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”\n" +
    "ðŸ‘¹ ENEMIGOS DERROTADOS\n\n" +

    `ðŸ‘¹ Monstruos: ${monstruos}\n` +
    `ðŸ‰ Bosses: ${bosses}\n\n` +

    "â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”\n" +
    "ðŸ† RESULTADOS DE COMBATE\n\n" +

    `âœ… Victorias: ${victorias}\n` +
    `âŒ Derrotas: ${derrotas}\n` +
    `âš”ï¸ Combates ganados: ${combatesGanados}\n` +
    `ðŸ’€ Combates perdidos: ${combatesPerdidos}\n\n` +

    "â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”\n" +
    "ðŸ’Ž ECONOMÃA ACUMULADA\n\n" +

    `ðŸ’° RubÃ­es obtenidos: ${rubies}\n\n` +

    "ðŸ“Šâ”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”ðŸ“Š"
  );
}

// =====================================
// VALIDAR CANTIDAD
// =====================================

function validarCantidad(valor) {
  const cantidad = Number(valor);

  if (
    !Number.isSafeInteger(cantidad) ||
    cantidad <= 0
  ) {
    return null;
  }

  return cantidad;
}

// =====================================
// RECOMPENSA DE RUBÍES
// =====================================

function calcularRubies(enemigo, nivelJugador) {
  const nivel = Math.max(
    1,
    Number(nivelJugador) || 1
  );

  if (enemigo.esBoss) {
    return Math.floor(
      100 + (enemigo.nivel * 25)
    );
  }

  const recompensas = {
    slime: 10,
    goblin: 18,
    lobo: 28,
    orco: 45
  };

  const base = recompensas[enemigo.id] || 10;

  return Math.floor(
    base * (1 + (nivel - 1) * 0.15)
  );
}

// =====================================
// BOTÍN ALEATORIO
// =====================================

function calcularBotin(enemigo) {
  const probabilidades = {
    slime: 8,
    goblin: 12,
    lobo: 16,
    orco: 20
  };

  const probabilidad = enemigo.esBoss
    ? 50
    : (probabilidades[enemigo.id] || 8);

  const tirada = Math.random() * 100;

  if (tirada >= probabilidad) {
    return null;
  }

  const rareza = Math.random() * 100;

  if (enemigo.esBoss) {
    if (rareza < 10) return "legendaria";
    if (rareza < 45) return "epica";
    return "normal";
  }

  if (rareza < 2) return "legendaria";
  if (rareza < 15) return "epica";

  return "normal";
}

// =====================================
// MINA DE ESENCIAS
// =====================================

function obtenerEsenciaMina() {
  const tirada = Math.random() * 100;

  if (tirada < 70) {
    return "normal";
  }

  if (tirada < 95) {
    return "epica";
  }

  return "legendaria";
}

async function ejecutarMineria(perfil) {
  const resultado = consumirIntentoMina(perfil);

  if (!resultado.correcto) {
    await guardarPerfil(perfil);
    return resultado.mensaje;
  }

  const esencia = obtenerEsenciaMina();

  const agregada = agregarEsencia(
    perfil,
    esencia,
    1
  );

  if (agregada && agregada.correcto === false) {
    return "âŒ No se pudo guardar la esencia obtenida.";
  }

  await guardarPerfil(perfil);

  const nombres = {
    normal: "âšª Esencia normal",
    epica: "ðŸŸ£ Esencia Ã©pica",
    legendaria: "ðŸŸ¡ Esencia legendaria"
  };

  return (
    "â›ï¸â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â›ï¸\n" +
    "       MINA DE ESENCIAS\n" +
    "â›ï¸â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â›ï¸\n\n" +
    "ðŸŽ‰ Â¡Encontraste una esencia!\n\n" +
    `${nombres[esencia]}\n\n` +
    `ðŸ”‹ Intentos restantes: ${resultado.intentos}/3\n\n` +
    "ðŸ“¦ La esencia fue guardada en tu inventario.\n\n" +
    "â›ï¸â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â›ï¸"
  );
}

// =====================================
// AYUDA
// =====================================

function mostrarAyuda() {
  return `âš”ï¸ SLAYERS RBSN âš”ï¸

ðŸ“‹ REGISTRO
&registrar
&registrar:elemento

ðŸ“‹ COMANDOS BÃSICOS
&ayuda
&perfil
&estadisticas
&saldo
&inventario
&zona de caza

â›ï¸ MINA DE ESENCIAS
&minar

3 intentos cada 5 minutos.
70% normal, 25% Ã©pica y 5% legendaria.

ðŸ’Ž ECONOMÃA
&banco
&agregar:cantidad
&retirar:cantidad

ðŸ”’ RESERVA
&reserva:agregar:cantidad
&reserva:retirar:cantidad

âœ¨ COMANDOS DE ESENCIAS
&usar:esencia:normal
&usar:esencia:epica
&usar:esencia:legendaria

TambiÃ©n podÃ©s indicar una cantidad:
&usar:esencia:normal:5

ðŸŒŸ RENACIMIENTO
&renacer

Disponible al alcanzar el nivel 500.

âš”ï¸ COMANDOS RPG
&cazar
&enemigos
&aventura <enemigo>
&atacar

ðŸ‘‘ COMANDOS DE BOSS
&boss
&bosses
&info boss nivel

Ejemplo: &info boss 50

Los Bosses aparecen cada 50 niveles:
50, 100, 150... hasta 500.

ðŸ† RANKINGS
&ranking
&ranking nivel
&ranking victorias
&ranking rubies

â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”

UsÃ¡ & antes de cada comando.`;
}

// =====================================
// LISTA DE ENEMIGOS
// =====================================

function textoEnemigos() {
  const enemigos = listarEnemigos();

  if (!enemigos || enemigos.length === 0) {
    return "No hay enemigos disponibles.";
  }

  let texto = "âš”ï¸ ENEMIGOS DISPONIBLES âš”ï¸\n\n";

  enemigos.forEach(enemigo => {
    texto +=
      `â€¢ ${enemigo.nombre || enemigo.id}\n` +
      `  ID: ${enemigo.id}\n` +
      `  Nivel: ${enemigo.nivel}\n` +
      `  Vida: ${enemigo.vida}\n\n`;
  });

  return texto;
}

// =====================================
// LISTA DE BOSSES
// =====================================

function textoBosses() {
  const bosses = listarBosses();

  if (!bosses || bosses.length === 0) {
    return "No hay Bosses disponibles.";
  }

  let texto = "ðŸ‘‘ CATÃLOGO DE BOSSES ðŸ‘‘\n\n";

  bosses.forEach(boss => {
    texto +=
      `ðŸ”¥ ${boss.nombre} â€” Nivel ${boss.nivel}\n`;
  });

  texto +=
    "\nâ”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”\n" +
    "UsÃ¡ &info boss nivel para conocer sus estadÃ­sticas.";

  return texto;
}

// =====================================
// INFORMACIÓN DE UN BOSS
// =====================================

function textoInfoBoss(nivel) {
  const boss = buscarBoss(nivel);

  if (!boss) {
    return (
      "âŒ No existe un Boss en ese nivel.\n\n" +
      "Los Bosses aparecen cada 50 niveles:\n" +
      "50, 100, 150, 200... hasta 500.\n\n" +
      "UsÃ¡ &bosses para ver el catÃ¡logo."
    );
  }

  return (
    "ðŸ‘‘â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”ðŸ‘‘\n" +
    "       INFORMACIÃ“N DEL BOSS\n" +
    "ðŸ‘‘â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”ðŸ‘‘\n\n" +
    `ðŸ”¥ Nombre: ${boss.nombre}\n` +
    `ðŸ“Š Nivel: ${boss.nivel}\n` +
    `ðŸ‘ï¸ Apariencia: ${boss.apariencia}\n\n` +
    "â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”\n" +
    "ðŸ“Š ESTADÃSTICAS\n\n" +
    `â¤ï¸ Vida: ${boss.vida}\n` +
    `âš”ï¸ Ataque: ${boss.ataque}\n` +
    `ðŸ›¡ï¸ Defensa: ${boss.defensa}\n` +
    `â­ Experiencia: ${boss.experiencia} XP\n\n` +
    "â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”\n" +
    "ðŸ’š RegeneraciÃ³n: 1.01 puntos cada 1.8 segundos.\n" +
    "âš”ï¸ No tiene lÃ­mite de tiempo.\n\n" +
    "ðŸ‘‘â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”ðŸ‘‘"
  );
}

// =====================================
// ZONA DE CAZA
// =====================================

function textoZonaCaza(perfil) {
  const enemigos = listarEnemigos();

  const nivelJugador = Math.max(
    1,
    Number(perfil.nivel) || 1
  );

  const proximoBoss = obtenerProximoBoss(nivelJugador);

  let texto =
    "ðŸŒ²â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”ðŸŒ²\n" +
    "        ZONA DE CAZA\n" +
    "ðŸŒ²â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”ðŸŒ²\n\n";

  texto +=
    "ðŸ—ºï¸ Zona compartida de Slayers Rbsn\n" +
    "âš”ï¸ Todos los aventureros pueden explorar esta zona.\n\n";

  texto +=
    `ðŸ§™ Tu nivel: ${nivelJugador}\n\n` +
    "â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”\n" +
    "ðŸ‘¹ MONSTRUOS DE LA ZONA\n\n";

  if (!enemigos || enemigos.length === 0) {
    texto += "No hay monstruos disponibles actualmente.\n";
  } else {
    enemigos.forEach(enemigo => {
      texto +=
        `ðŸ‘¹ ${enemigo.nombre || enemigo.id}\n` +
        `   ID: ${enemigo.id}\n` +
        `   Nivel base: ${enemigo.nivel}\n` +
        `   â¤ï¸ Vida base: ${enemigo.vida}\n` +
        `   âš”ï¸ Ataque base: ${enemigo.ataque}\n` +
        `   ðŸ›¡ï¸ Defensa base: ${enemigo.defensa}\n\n`;
    });
  }

  texto +=
    "â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”\n" +
    "ðŸ“ˆ ADAPTACIÃ“N DE MONSTRUOS\n\n" +
    "Los monstruos aumentan sus estadÃ­sticas segÃºn tu nivel.\n" +
    "Sus recompensas tambiÃ©n crecen con tu progreso.\n\n" +
    "â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”\n" +
    "ðŸ‘‘ PRÃ“XIMO BOSS\n\n";

  if (proximoBoss) {
    texto +=
      `ðŸ”¥ ${proximoBoss.nombre}\n` +
      `ðŸ“Š Nivel: ${proximoBoss.nivel}\n` +
      `ðŸ‘ï¸ Apariencia: ${proximoBoss.apariencia}\n` +
      "â¤ï¸ Los Bosses regeneran vida durante el combate.\n" +
      "ðŸŽ Entregan recompensas especiales.\n\n";
  }

  texto +=
    "ðŸŒ²â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”ðŸŒ²\n" +
    "UsÃ¡ &cazar para iniciar una batalla automÃ¡tica.";

  return texto;
}
// =====================================
// EJECUTAR BATALLA AUTOMÁTICA
// =====================================

async function ejecutarBatalla(perfil, combate) {
  let rondas = 0;
  let ataquesJugador = 0;
  let ataquesEnemigo = 0;

  let danoCausado = 0;
  let danoRecibido = 0;
  let vidaRegeneradaBoss = 0;

  const registro = [];

  while (!combate.terminado) {
    rondas++;

    const ataque = atacarEnemigo(combate);

    if (ataque.error) {
      break;
    }

    combate = ataque.combate || combate;

    ataquesJugador++;
    danoCausado += ataque.dano || 0;
    vidaRegeneradaBoss += ataque.regeneracion || 0;

    registro.push(
      `ðŸ—¡ï¸ ${ataquesJugador}. Atacaste e hiciste ${ataque.dano} de daÃ±o.`
    );

    if (ataque.regeneracion > 0) {
      registro.push(
        `ðŸ‘‘ El Boss regenerÃ³ ${ataque.regeneracion} puntos de vida.`
      );
    }

    if (combate.terminado) {
      break;
    }

    if (combate.esBoss) {
      await pausa(1800);
    }

    const contraataque = atacarJugador(combate);

    if (contraataque.error) {
      break;
    }

    combate = contraataque.combate || combate;

    ataquesEnemigo++;
    danoRecibido += contraataque.dano || 0;
    vidaRegeneradaBoss += contraataque.regeneracion || 0;

    registro.push(
      `ðŸ‘¹ El enemigo te atacÃ³ e hizo ${contraataque.dano} de daÃ±o.`
    );

    if (contraataque.regeneracion > 0) {
      registro.push(
        `ðŸ‘‘ El Boss regenerÃ³ ${contraataque.regeneracion} puntos de vida.`
      );
    }

    if (combate.terminado) {
      break;
    }

    if (combate.esBoss) {
      await pausa(1800);
    }
  }

  return {
    combate,
    rondas,
    ataquesJugador,
    ataquesEnemigo,
    danoCausado,
    danoRecibido,
    vidaRegeneradaBoss,
    registro
  };
}

// =====================================
// CONSTRUIR INFORME DE BATALLA
// =====================================

function construirInformeBatalla(
  perfil,
  enemigo,
  batalla,
  final
) {
  let mensaje =
    "âš”ï¸â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”âš”ï¸\n" +
    "       INFORME DE BATALLA\n" +
    "âš”ï¸â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”âš”ï¸\n\n";

  mensaje +=
    `${enemigo.esBoss ? "ðŸ‘‘ BOSS: " : "ðŸ‘¹ Enemigo: "}${enemigo.nombre}\n` +
    `ðŸ“Š Nivel: ${enemigo.nivel}\n`;

  if (enemigo.esBoss) {
    mensaje += `ðŸ‘ï¸ Apariencia: ${enemigo.apariencia}\n`;
  }

  mensaje += "\nðŸ“œ DESARROLLO DE LA BATALLA\n\n";

  batalla.registro.forEach(linea => {
    mensaje += linea + "\n";
  });

  mensaje +=
    "\nâ”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”\n" +
    "ðŸ“Š ESTADÃSTICAS DE BATALLA\n\n" +
    `ðŸ”„ Rondas: ${batalla.rondas}\n` +
    `ðŸ—¡ï¸ Tus ataques: ${batalla.ataquesJugador}\n` +
    `ðŸ‘¹ Ataques enemigos: ${batalla.ataquesEnemigo}\n` +
    `ðŸ’¥ DaÃ±o causado: ${batalla.danoCausado}\n` +
    `ðŸ’” DaÃ±o recibido: ${batalla.danoRecibido}\n`;

  if (enemigo.esBoss) {
    mensaje +=
      `ðŸ’š Vida regenerada por el Boss: ${batalla.vidaRegeneradaBoss}\n`;
  }

  mensaje +=
    `\nâ¤ï¸ Tu vida final: ${perfil.estadisticas.vida}/${perfil.estadisticas.vidaMaxima}\n` +
    `ðŸ‘¹ Vida final del enemigo: ${batalla.combate.enemigo.vida}/${batalla.combate.enemigo.vidaMaxima}\n\n`;

  mensaje += "â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”\n";

  if (final.resultado === "victoria") {
    const rubies = calcularRubies(
      enemigo,
      perfil.nivel
    );

    perfil.rubies =
      (Number(perfil.rubies) || 0) + rubies;

    perfil.monedas = perfil.rubies;

    perfil.estadisticas.rubiesObtenidos =
      (Number(perfil.estadisticas.rubiesObtenidos) || 0) +
      rubies;

    const botin = calcularBotin(enemigo);

    let mensajeBotin = "ðŸŽ BotÃ­n: No encontraste objetos.";

    if (botin) {
      agregarEsencia(perfil, botin, 1);

      const nombres = {
        normal: "Esencia normal âšª",
        epica: "Esencia Ã©pica ðŸŸ£",
        legendaria: "Esencia legendaria ðŸŸ¡"
      };

      mensajeBotin =
        `ðŸŽ BotÃ­n obtenido: ${nombres[botin]}`;
    }

    mensaje +=
      `${enemigo.esBoss ? "ðŸ‘‘ Â¡BOSS DERROTADO!\n\n" : "ðŸ† Â¡VICTORIA!\n\n"}` +
      `â­ Experiencia: +${final.experiencia || 0} XP\n` +
      `ðŸ’Ž RubÃ­es obtenidos: +${rubies}\n` +
      `${mensajeBotin}\n\n`;

    if (enemigo.esBoss) {
      mensaje += "ðŸ† Boss registrado en tus estadÃ­sticas.\n\n";
    }

    if (final.subioNivel) {
      mensaje += "â¬†ï¸ Â¡SUBISTE DE NIVEL!\n\n";
    }

    mensaje +=
      `ðŸ’° Total de rubÃ­es: ${perfil.rubies}\n`;

  } else {
    mensaje +=
      "ðŸ’€ Â¡HAS SIDO DERROTADO!\n\n" +
      `ðŸ“‰ Experiencia perdida: ${final.perdidaExperiencia || 0} XP\n` +
      `â­ Experiencia restante: ${final.experienciaRestante || 0} XP\n` +
      "ðŸ’Ž RubÃ­es perdidos: 0\n" +
      "â³ RegeneraciÃ³n bloqueada: 5 minutos\n";
  }

  mensaje += "\nâš”ï¸â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”âš”ï¸";

  return mensaje;
}

// =====================================
// PROCESAR COMANDOS
// =====================================

async function procesarComando(
  texto,
  userId,
  username,
  threadId
) {
  const partes = texto.trim().split(/\s+/);
  const comando = partes[0].toLowerCase();
  const argumentos = partes.slice(1);

  if (comando === "&ayuda") {
    return mostrarAyuda();
  }

  const perfil = await cargarPerfil(userId, username);

  // =====================================
  // REGISTRO
  // =====================================

  if (comando === "&registrar") {
    return mostrarMenuElementos(perfil);
  }

  if (comando.startsWith("&registrar:")) {
    const datos = comando.split(":");

    if (datos.length !== 2 || !datos[1]) {
      return "âŒ Formato incorrecto. UsÃ¡ &registrar:elemento";
    }

    if (
      estaRegistrado(perfil) &&
      !perfil.renacerPendiente &&
      !(perfil.nivel >= 25 && !perfil.elementos.segundo)
    ) {
      return "âŒ Ya estÃ¡s registrado. No puedes volver a registrarte ni cambiar tu elemento.";
    }

    return registrarElemento(perfil, datos[1]);
  }

  // =====================================
  // BLOQUEO DE JUGADORES NO REGISTRADOS
  // =====================================

  if (!estaRegistrado(perfil)) {
    return (
      "âŒ TodavÃ­a no estÃ¡s registrado.\n\n" +
      "Primero elegÃ­ tu elemento permanente con:\n" +
      "&registrar"
    );
  }

  // =====================================
  // RENACIMIENTO
  // =====================================

  if (comando === "&renacer") {
    const resultado = renacerPerfil(perfil);

    if (!resultado.correcto) {
      return resultado.mensaje;
    }

    await guardarPerfil(perfil);

    return resultado.mensaje;
  }

  // =====================================
  // MINA DE ESENCIAS
  // =====================================

  if (comando === "&minar") {
    return await ejecutarMineria(perfil);
  }

  // =====================================
  // PERFIL
  // =====================================

  if (comando === "&perfil") {
    return mostrarPerfil(perfil);
  }

  // =====================================
  // ESTADÍSTICAS
  // =====================================

  if (comando === "&estadisticas") {
    return textoEstadisticas(perfil);
  }

  // =====================================
  // ECONOMÍA
  // =====================================

  if (comando === "&saldo") {
    return mostrarEconomia(perfil);
  }

  if (comando === "&inventario") {
    return mostrarInventario(perfil);
  }

  if (
    comando === "&zona" &&
    argumentos.join(" ").toLowerCase() === "de caza"
  ) {
    return textoZonaCaza(perfil);
  }

  if (comando === "&banco") {
    return mostrarEconomia(perfil);
  }

  // =====================================
  // AGREGAR AL BANCO
  // =====================================

  if (comando.startsWith("&agregar:")) {
    const datos = comando.split(":");

    if (datos.length !== 2) {
      return "âŒ Formato incorrecto. UsÃ¡ &agregar:cantidad";
    }

    const cantidad = validarCantidad(datos[1]);

    if (cantidad === null) {
      return "âŒ IngresÃ¡ una cantidad vÃ¡lida de rubÃ­es.";
    }

    const resultado = agregarBanco(perfil, cantidad);

    if (!resultado.correcto) {
      return `âŒ ${resultado.mensaje}`;
    }

    await guardarPerfil(perfil);

    return (
      `ðŸ¦ DEPÃ“SITO REALIZADO\n\n` +
      `${resultado.mensaje}\n\n` +
      `ðŸ’° RubÃ­es disponibles: ${resultado.saldo}\n` +
      `ðŸ¦ Banco: ${resultado.banco}`
    );
  }

  // =====================================
  // RETIRAR DEL BANCO
  // =====================================

  if (comando.startsWith("&retirar:")) {
    const datos = comando.split(":");

    if (datos.length !== 2) {
      return "âŒ Formato incorrecto. UsÃ¡ &retirar:cantidad";
    }

    const cantidad = validarCantidad(datos[1]);

    if (cantidad === null) {
      return "âŒ IngresÃ¡ una cantidad vÃ¡lida de rubÃ­es.";
    }

    const resultado = retirarBanco(perfil, cantidad);

    if (!resultado.correcto) {
      return `âŒ ${resultado.mensaje}`;
    }

    await guardarPerfil(perfil);

    return (
      `ðŸ¦ RETIRO REALIZADO\n\n` +
      `${resultado.mensaje}\n\n` +
      `ðŸ’° RubÃ­es disponibles: ${resultado.saldo}\n` +
      `ðŸ¦ Banco: ${resultado.banco}`
    );
  }

  // =====================================
  // RESERVA
  // =====================================

  if (comando.startsWith("&reserva:")) {
    const datos = comando.split(":");

    if (
      datos.length !== 3 ||
      !["agregar", "retirar"].includes(datos[1])
    ) {
      return (
        "âŒ Formato incorrecto.\n\n" +
        "UsÃ¡:\n" +
        "&reserva:agregar:cantidad\n" +
        "&reserva:retirar:cantidad"
      );
    }

    const cantidad = validarCantidad(datos[2]);

    if (cantidad === null) {
      return "âŒ IngresÃ¡ una cantidad vÃ¡lida de rubÃ­es.";
    }

    let resultado;

    if (datos[1] === "agregar") {
      resultado = agregarReserva(perfil, cantidad);
    } else {
      resultado = retirarReserva(perfil, cantidad);
    }

    if (!resultado.correcto) {
      return `âŒ ${resultado.mensaje}`;
    }

    await guardarPerfil(perfil);

    const datosEconomia = consultarSaldo(perfil);

    return (
      `ðŸ”’ RESERVA ACTUALIZADA\n\n` +
      `${resultado.mensaje}\n\n` +
      `ðŸ’° RubÃ­es disponibles: ${datosEconomia.saldo}\n` +
      `ðŸ”’ Reserva: ${datosEconomia.reserva}/${datosEconomia.limiteReserva} ðŸ’Ž`
    );
  }

  // =====================================
  // USAR ESENCIAS
  // =====================================

  if (comando.startsWith("&usar:")) {
    const datos = comando.split(":");

    if (
      datos.length < 3 ||
      datos.length > 4 ||
      datos[1] !== "esencia"
    ) {
      return (
        "âŒ Formato incorrecto.\n\n" +
        "UsÃ¡:\n" +
        "&usar:esencia:normal\n" +
        "&usar:esencia:epica\n" +
        "&usar:esencia:legendaria\n" +
        "&usar:esencia:normal:5"
      );
    }

    const rareza = datos[2];

    const cantidad = datos.length === 4
      ? Number(datos[3])
      : 1;

    const resultado = usarEsencia(
      perfil,
      rareza,
      cantidad
    );

    if (!resultado.correcto) {
      return `âŒ ${resultado.mensaje}`;
    }

    await guardarPerfil(perfil);

    return resultado.mensaje;
  }

  // =====================================
  // CAZAR AUTOMÁTICAMENTE
  // =====================================

  if (comando === "&cazar") {
    if (combatesActivos.has(userId)) {
      return "Ya tenÃ©s un combate activo. UsÃ¡ &atacar.";
    }

    const enemigos = listarEnemigos();

    if (!enemigos || enemigos.length === 0) {
      return "No hay monstruos disponibles para cazar.";
    }

    const enemigoElegido =
      enemigos[Math.floor(Math.random() * enemigos.length)];

    const resultado = iniciarCombate(
      perfil,
      enemigoElegido.id
    );

    if (resultado.error) {
      return resultado.error;
    }

    const enemigo = {
      ...resultado.enemigo
    };

    actualizarRegeneracion(perfil, true);

    await guardarPerfil(perfil);

    const batalla = await ejecutarBatalla(
      perfil,
      resultado
    );

    if (!batalla.combate.terminado) {
      return "âš ï¸ No se pudo completar la cacerÃ­a. IntentÃ¡ nuevamente.";
    }

    const final = finalizarCombate(
      perfil,
      batalla.combate
    );

    if (final.error) {
      return final.error;
    }

    const mensaje = construirInformeBatalla(
      final.perfil,
      enemigo,
      batalla,
      final
    );

    await guardarPerfil(final.perfil);

    return mensaje;
  }

  // =====================================
  // ENEMIGOS
  // =====================================

  if (comando === "&enemigos") {
    return textoEnemigos();
  }

  // =====================================
  // BOSSES
  // =====================================

  if (comando === "&bosses") {
    return textoBosses();
  }

  // =====================================
  // INFORMACIÓN DE BOSS
  // =====================================

  if (comando === "&info") {
    if (
      argumentos.length !== 2 ||
      argumentos[0].toLowerCase() !== "boss"
    ) {
      return (
        "âŒ Formato incorrecto.\n\n" +
        "UsÃ¡: &info boss nivel\n" +
        "Ejemplo: &info boss 50"
      );
    }

    const nivel = Number(argumentos[1]);

    if (!Number.isSafeInteger(nivel)) {
      return "âŒ El nivel debe ser un nÃºmero entero vÃ¡lido.";
    }

    return textoInfoBoss(nivel);
  }

  // =====================================
  // DESAFIAR BOSS
  // =====================================

  if (comando === "&boss") {
    if (combatesActivos.has(userId)) {
      return "Ya tenÃ©s un combate activo. UsÃ¡ &atacar.";
    }

    const resultado = iniciarCombateBoss(perfil);

    if (resultado.error) {
      return resultado.error;
    }

    actualizarRegeneracion(perfil, true);

    await guardarPerfil(perfil);

    combatesActivos.set(userId, {
      perfil,
      combate: resultado
    });

    return (
      "ðŸ‘‘â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”ðŸ‘‘\n" +
      "       Â¡DESAFÃO DE BOSS!\n" +
      "ðŸ‘‘â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”ðŸ‘‘\n\n" +
      `ðŸ”¥ ${resultado.enemigo.nombre}\n` +
      `ðŸ“Š Nivel: ${resultado.enemigo.nivel}\n` +
      `ðŸ‘ï¸ Apariencia: ${resultado.enemigo.apariencia}\n\n` +
      `â¤ï¸ Vida del Boss: ${resultado.enemigo.vida}/${resultado.enemigo.vidaMaxima}\n` +
      `â¤ï¸ Tu vida: ${resultado.jugador.vida}/${resultado.jugador.vidaMaxima}\n\n` +
      "ðŸ’š El Boss regenera vida cada 1,8 segundos.\n" +
      "âš”ï¸ No tiene lÃ­mite de tiempo.\n\n" +
      "UsÃ¡ &atacar para comenzar la batalla."
    );
  }

  // =====================================
  // AVENTURA
  // =====================================

  if (comando === "&aventura") {
    if (!argumentos[0]) {
      return textoEnemigos();
    }

    if (combatesActivos.has(userId)) {
      return "Ya tenÃ©s un combate activo. UsÃ¡ &atacar.";
    }

    const resultado = iniciarCombate(
      perfil,
      argumentos[0].toLowerCase()
    );

    if (resultado.error) {
      return resultado.error;
    }

    actualizarRegeneracion(perfil, true);

    await guardarPerfil(perfil);

    combatesActivos.set(userId, {
      perfil,
      combate: resultado
    });

    return (
      `âš”ï¸ Â¡COMIENZA EL COMBATE!\n\n` +
      `ðŸ‘¹ Enemigo: ${resultado.enemigo.nombre || resultado.enemigo.id}\n` +
      `â¤ï¸ Vida del enemigo: ${resultado.enemigo.vida}/${resultado.enemigo.vidaMaxima}\n` +
      `â¤ï¸ Tu vida: ${resultado.jugador.vida}/${resultado.jugador.vidaMaxima}\n\n` +
      "UsÃ¡ &atacar para ejecutar toda la batalla."
    );
  }

  // =====================================
  // ATACAR
  // =====================================

  if (comando === "&atacar") {
    const activo = combatesActivos.get(userId);

    if (!activo) {
      return "No tenÃ©s ningÃºn combate activo. UsÃ¡ &aventura o &boss.";
    }

    actualizarRegeneracion(activo.perfil, true);

    const combate = activo.combate;

    if (combate.terminado) {
      combatesActivos.delete(userId);
      return "Ese combate ya terminÃ³.";
    }

    const enemigo = {
      ...combate.enemigo
    };

    const batalla = await ejecutarBatalla(
      activo.perfil,
      combate
    );

    activo.combate = batalla.combate;

    if (!batalla.combate.terminado) {
      return "âš ï¸ No se pudo completar la batalla. IntentÃ¡ nuevamente.";
    }

    const final = finalizarCombate(
      activo.perfil,
      batalla.combate
    );

    combatesActivos.delete(userId);

    if (final.error) {
      return final.error;
    }

    const mensaje = construirInformeBatalla(
      final.perfil,
      enemigo,
      batalla,
      final
    );

    await guardarPerfil(final.perfil);

    return mensaje;
  }

  // =====================================
  // RANKING
  // =====================================

  if (comando === "&ranking") {
    let tipo = (argumentos[0] || "nivel").toLowerCase();

    if (tipo === "monedas") {
      tipo = "rubies";
    }

    const perfiles = await obtenerTodosLosPerfiles();

    let ranking;

    if (tipo === "nivel") {
      ranking = rankingPorNivel(perfiles);
    } else if (tipo === "victorias") {
      ranking = rankingPorVictorias(perfiles);
    } else if (tipo === "rubies") {
      ranking = rankingPorRubies(perfiles);
    } else {
      return "Tipo de ranking invÃ¡lido. UsÃ¡: nivel, victorias o rubies.";
    }

    return mostrarRanking(ranking, tipo);
  }

  return null;
}

// =====================================
// WEBHOOK DE ANARCHY APPS
// =====================================

app.post("/webhook", (req, res) => {
  const evento = req.body;

  res.sendStatus(200);

  if (!evento || evento.type !== "message" || !evento.message) {
    return;
  }

  const mensaje = evento.message;

  const texto = mensaje.content?.trim();
  const userId = mensaje.author?.uid;

  const username =
    mensaje.author?.displayName ||
    mensaje.author?.globalName ||
    mensaje.author?.name ||
    mensaje.author?.username ||
    null;

  const messageId = mensaje.messageId;
  const threadId = evento.threadId;

  if (!texto || !texto.startsWith("&")) {
    return;
  }

  if (!userId || !threadId) {
    console.error(
      "Webhook sin userId o threadId:",
      JSON.stringify({
        userId,
        threadId,
        messageId
      })
    );

    return;
  }

  if (messageId && mensajesProcesados.has(messageId)) {
    return;
  }

  if (messageId) {
    mensajesProcesados.add(messageId);
  }

  if (mensajesProcesados.size > 5000) {
    mensajesProcesados.clear();
  }

  procesarComando(
    texto,
    String(userId),
    username,
    threadId
  )
    .then(async respuesta => {
      if (respuesta) {
        await enviarMensaje(threadId, respuesta);
      }
    })
    .catch(async error => {
      console.error("Error procesando comando:", error);

      try {
        await enviarMensaje(
          threadId,
          "âš ï¸ OcurriÃ³ un error al ejecutar el comando. IntentÃ¡ nuevamente."
        );
      } catch (errorEnvio) {
        console.error("Error enviando respuesta:", errorEnvio);
      }
    });
});

// =====================================
// ESTADO DEL SERVICIO
// =====================================

app.get("/", (req, res) => {
  res.json({
    bot: "Slayers Rbsn",
    estado: "En lÃ­nea",
    tokenConfigurado: Boolean(BOT_TOKEN),
    supabaseConfigurado: comprobarConexion()
  });
});

// =====================================
// INICIAR SERVIDOR
// =====================================

app.listen(PORT, () => {
  console.log("Slayers Rbsn iniciado.");
  console.log("Puerto: " + PORT);
  console.log("Token configurado: " + Boolean(BOT_TOKEN));

  if (comprobarConexion()) {
    console.log("Supabase: Configurado");
  } else {
    console.log("Supabase: No configurado");
  }

  actualizarIconoBot();
});
