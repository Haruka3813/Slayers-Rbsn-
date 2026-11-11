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
      throw new Error("La imagen descargada está vacía.");
    }

    if (bytes.length > 512 * 1024) {
      throw new Error("La imagen supera el límite de 512 KB de Anarchy.");
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
        `Anarchy rechazó la imagen (${respuesta.status}): ${resultado}`
      );
    }

    console.log("¡Imagen de perfil de Slayers-Rbsn actualizada!");
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
    throw new Error("No se recibió el ID de la conversación.");
  }

  if (contenido === null || contenido === undefined) {
    throw new Error("No se recibió contenido para enviar.");
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
  if (combatesActivos.has(userId)) {
    return combatesActivos.get(userId).perfil;
  }

  let perfil = await obtenerPerfil(userId);

  if (!perfil) {
    perfil = crearPerfil(userId, username);
  }

  normalizarPerfil(perfil);

  if (username) {
    perfil.nombre = username;
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
    titulo = "🌟 ELEGÍ TU ELEMENTO DE RENACIMIENTO";

  } else if (!perfil.elementos.primero) {
    titulo = "⚔️ REGISTRO DE AVENTURERO";

  } else if (
    perfil.nivel >= 25 &&
    !perfil.elementos.segundo
  ) {
    titulo = "✨ DESBLOQUEASTE TU SEGUNDO ELEMENTO";

  } else {
    return "❌ Ya tenés todos los elementos disponibles por ahora.";
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
    return "❌ No quedan elementos disponibles para elegir.";
  }

  let mensaje =
    `${titulo}\n\n` +
    "Elegí un elemento de la siguiente lista:\n\n";

  disponibles.forEach(elemento => {
    mensaje +=
      `${elemento.nombre}\n` +
      `Comando: &registrar:${elemento.id}\n\n`;
  });

  mensaje +=
    "⚠️ Tu elección será permanente y no podrás cambiarla.";

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
      "❌ Ese elemento no existe.\n\n" +
      mostrarMenuElementos(perfil)
    );
  }

  const elementosElegidos = [
    perfil.elementos.primero,
    perfil.elementos.segundo,
    ...(perfil.elementos.adicionales || [])
  ].filter(Boolean);

  if (elementosElegidos.includes(elementoId)) {
    return "❌ Ya tenés ese elemento. Elegí uno diferente.";
  }

  if (perfil.renacerPendiente) {
    perfil.elementos.adicionales.push(elementoId);
    perfil.renacerPendiente = false;

    await guardarPerfil(perfil);

    return (
      `🌟 ¡ELEMENTO DE RENACIMIENTO DESBLOQUEADO!\n\n` +
      `${elemento.nombre}\n\n` +
      `🌟 Renacer: ${perfil.renacer}\n` +
      "Este elemento es permanente."
    );
  }

  if (!perfil.elementos.primero) {
    perfil.elementos.primero = elementoId;

    await guardarPerfil(perfil);

    return (
      "⚔️ ¡REGISTRO COMPLETADO!\n\n" +
      `👤 Aventurero: ${perfil.nombre}\n` +
      `${elemento.nombre}\n\n` +
      "Tu primer elemento es permanente.\n" +
      "¡Bienvenido a Slayers Rbsn!"
    );
  }

  if (
    perfil.nivel >= 25 &&
    !perfil.elementos.segundo
  ) {
    perfil.elementos.segundo = elementoId;

    await guardarPerfil(perfil);

    return (
      "✨ ¡SEGUNDO ELEMENTO DESBLOQUEADO!\n\n" +
      `${elemento.nombre}\n\n` +
      "Tu segundo elemento es permanente."
    );
  }

  return "❌ No tenés ningún elemento pendiente para elegir.";
}

// =====================================
// MOSTRAR ECONOMÍA
// =====================================

function mostrarEconomia(perfil) {
  const datos = consultarSaldo(perfil);

  return (
    "💎 ECONOMÍA DE SLAYERS 💎\n\n" +
    `💰 Rubíes disponibles: ${datos.saldo}\n` +
    `🏦 Banco: ${datos.banco}\n` +
    `🔒 Reserva: ${datos.reserva}/${datos.limiteReserva} 💎\n\n` +
    "━━━━━━━━━━━━━━━━━━"
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
    "📊━━━━━━━━━━━━━━━━━━📊\n" +
    "       ESTADÍSTICAS DEL AVENTURERO\n" +
    "📊━━━━━━━━━━━━━━━━━━📊\n\n" +

    `🧙 Jugador: ${perfil.nombre || "Jugador"}\n` +
    `🌟 Renacer: ${perfil.renacer || 0}\n` +
    `⭐ Nivel: ${nivel}/500\n` +
    `✨ Experiencia: ${experiencia} XP\n\n` +

    "━━━━━━━━━━━━━━━━━━\n" +
    "⚔️ ATRIBUTOS DE COMBATE\n\n" +

    `❤️ Vida: ${vida}/${vidaMaxima}\n` +
    `⚔️ Ataque: ${ataque}\n` +
    `🛡️ Defensa: ${defensa}\n\n` +

    "━━━━━━━━━━━━━━━━━━\n" +
    "👹 ENEMIGOS DERROTADOS\n\n" +

    `👹 Monstruos: ${monstruos}\n` +
    `🐉 Bosses: ${bosses}\n\n` +

    "━━━━━━━━━━━━━━━━━━\n" +
    "🏆 RESULTADOS DE COMBATE\n\n" +

    `✅ Victorias: ${victorias}\n` +
    `❌ Derrotas: ${derrotas}\n` +
    `⚔️ Combates ganados: ${combatesGanados}\n` +
    `💀 Combates perdidos: ${combatesPerdidos}\n\n` +

    "━━━━━━━━━━━━━━━━━━\n" +
    "💎 ECONOMÍA ACUMULADA\n\n" +

    `💰 Rubíes obtenidos: ${rubies}\n\n` +

    "📊━━━━━━━━━━━━━━━━━━📊"
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
    return "❌ No se pudo guardar la esencia obtenida.";
  }

  await guardarPerfil(perfil);

  const nombres = {
    normal: "⚪ Esencia normal",
    epica: "🟣 Esencia épica",
    legendaria: "🟡 Esencia legendaria"
  };

  return (
    "⛏️━━━━━━━━━━━━━━━━━━⛏️\n" +
    "       MINA DE ESENCIAS\n" +
    "⛏️━━━━━━━━━━━━━━━━━━⛏️\n\n" +
    "🎉 ¡Encontraste una esencia!\n\n" +
    `${nombres[esencia]}\n\n` +
    `🔋 Intentos restantes: ${resultado.intentos}/3\n\n` +
    "📦 La esencia fue guardada en tu inventario.\n\n" +
    "⛏️━━━━━━━━━━━━━━━━━━⛏️"
  );
}

// =====================================
// AYUDA
// =====================================

function mostrarAyuda() {
  return `⚔️ SLAYERS RBSN ⚔️

📋 REGISTRO
&registrar
&registrar:elemento

📋 COMANDOS BÁSICOS
&ayuda
&perfil
&estadisticas
&saldo
&inventario
&zona de caza

⛏️ MINA DE ESENCIAS
&minar

3 intentos cada 5 minutos.
70% normal, 25% épica y 5% legendaria.

💎 ECONOMÍA
&banco
&agregar:cantidad
&retirar:cantidad

🔒 RESERVA
&reserva:agregar:cantidad
&reserva:retirar:cantidad

✨ COMANDOS DE ESENCIAS
&usar:esencia:normal
&usar:esencia:epica
&usar:esencia:legendaria

También podés indicar una cantidad:
&usar:esencia:normal:5

🌟 RENACIMIENTO
&renacer
Disponible al alcanzar el nivel 500.

⚔️ COMANDOS RPG
&cazar
&enemigos
&aventura <enemigo>
&atacar

👑 COMANDOS DE BOSS
&boss
&bosses
&info boss nivel

Ejemplo: &info boss 50

Los Bosses aparecen cada 50 niveles:
50, 100, 150... hasta 500.

🏆 RANKINGS
&ranking
&ranking nivel
&ranking victorias
&ranking rubies

━━━━━━━━━━━━━━━━━━
Usá & antes de cada comando.`;
}

// =====================================
// LISTA DE ENEMIGOS
// =====================================

function textoEnemigos() {
  const enemigos = listarEnemigos();

  if (!enemigos || enemigos.length === 0) {
    return "No hay enemigos disponibles.";
  }

  let texto = "⚔️ ENEMIGOS DISPONIBLES ⚔️\n\n";

  enemigos.forEach(enemigo => {
    texto +=
      `• ${enemigo.nombre || enemigo.id}\n` +
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

  let texto = "👑 CATÁLOGO DE BOSSES 👑\n\n";

  bosses.forEach(boss => {
    texto +=
      `🔥 ${boss.nombre} — Nivel ${boss.nivel}\n`;
  });

  texto +=
    "\n━━━━━━━━━━━━━━━━━━\n" +
    "Usá &info boss nivel para conocer sus estadísticas.";

  return texto;
}

// =====================================
// INFORMACIÓN DE UN BOSS
// =====================================

function textoInfoBoss(nivel) {
  const boss = buscarBoss(nivel);

  if (!boss) {
    return (
      "❌ No existe un Boss en ese nivel.\n\n" +
      "Los Bosses aparecen cada 50 niveles:\n" +
      "50, 100, 150, 200... hasta 500.\n\n" +
      "Usá &bosses para ver el catálogo."
    );
  }

  return (
    "👑━━━━━━━━━━━━━━━━━━👑\n" +
    "       INFORMACIÓN DEL BOSS\n" +
    "👑━━━━━━━━━━━━━━━━━━👑\n\n" +
    `🔥 Nombre: ${boss.nombre}\n` +
    `📊 Nivel: ${boss.nivel}\n` +
    `👁️ Apariencia: ${boss.apariencia}\n\n` +
    "━━━━━━━━━━━━━━━━━━\n" +
    "📊 ESTADÍSTICAS\n\n" +
    `❤️ Vida: ${boss.vida}\n` +
    `⚔️ Ataque: ${boss.ataque}\n` +
    `🛡️ Defensa: ${boss.defensa}\n` +
    `⭐ Experiencia: ${boss.experiencia} XP\n\n` +
    "━━━━━━━━━━━━━━━━━━\n" +
    "💚 Regeneración: 1.01 puntos cada 1.8 segundos.\n" +
    "⚔️ No tiene límite de tiempo.\n\n" +
    "👑━━━━━━━━━━━━━━━━━━👑"
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
    "🌲━━━━━━━━━━━━━━━━━━🌲\n" +
    "        ZONA DE CAZA\n" +
    "🌲━━━━━━━━━━━━━━━━━━🌲\n\n";

  texto +=
    "🗺️ Zona compartida de Slayers Rbsn\n" +
    "⚔️ Todos los aventureros pueden explorar esta zona.\n\n";

  texto +=
    `🧙 Tu nivel: ${nivelJugador}\n\n` +
    "━━━━━━━━━━━━━━━━━━\n" +
    "👹 MONSTRUOS DE LA ZONA\n\n";

  if (!enemigos || enemigos.length === 0) {
    texto += "No hay monstruos disponibles actualmente.\n";
  } else {
    enemigos.forEach(enemigo => {
      texto +=
        `👹 ${enemigo.nombre || enemigo.id}\n` +
        `   ID: ${enemigo.id}\n` +
        `   Nivel base: ${enemigo.nivel}\n` +
        `   ❤️ Vida base: ${enemigo.vida}\n` +
        `   ⚔️ Ataque base: ${enemigo.ataque}\n` +
        `   🛡️ Defensa base: ${enemigo.defensa}\n\n`;
    });
  }

  texto +=
    "━━━━━━━━━━━━━━━━━━\n" +
    "📈 ADAPTACIÓN DE MONSTRUOS\n\n" +
    "Los monstruos aumentan sus estadísticas según tu nivel.\n" +
    "Sus recompensas también crecen con tu progreso.\n\n" +
    "━━━━━━━━━━━━━━━━━━\n" +
    "👑 PRÓXIMO BOSS\n\n";

  if (proximoBoss) {
    texto +=
      `🔥 ${proximoBoss.nombre}\n` +
      `📊 Nivel: ${proximoBoss.nivel}\n` +
      `👁️ Apariencia: ${proximoBoss.apariencia}\n` +
      "❤️ Los Bosses regeneran vida durante el combate.\n" +
      "🎁 Entregan recompensas especiales.\n\n";
  }

  texto +=
    "🌲━━━━━━━━━━━━━━━━━━🌲\n" +
    "Usá &cazar para iniciar una batalla automática.";

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
      `🗡️ ${ataquesJugador}. Atacaste e hiciste ${ataque.dano} de daño.`
    );

    if (ataque.regeneracion > 0) {
      registro.push(
        `👑 El Boss regeneró ${ataque.regeneracion} puntos de vida.`
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
      `👹 El enemigo te atacó e hizo ${contraataque.dano} de daño.`
    );

    if (contraataque.regeneracion > 0) {
      registro.push(
        `👑 El Boss regeneró ${contraataque.regeneracion} puntos de vida.`
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
    "⚔️━━━━━━━━━━━━━━━━━━⚔️\n" +
    "       INFORME DE BATALLA\n" +
    "⚔️━━━━━━━━━━━━━━━━━━⚔️\n\n";

  mensaje +=
    `${enemigo.esBoss ? "👑 BOSS: " : "👹 Enemigo: "}${enemigo.nombre}\n` +
    `📊 Nivel: ${enemigo.nivel}\n`;

  if (enemigo.esBoss) {
    mensaje += `👁️ Apariencia: ${enemigo.apariencia}\n`;
  }

  mensaje += "\n📜 DESARROLLO DE LA BATALLA\n\n";

  batalla.registro.forEach(linea => {
    mensaje += linea + "\n";
  });

  mensaje +=
    "\n━━━━━━━━━━━━━━━━━━\n" +
    "📊 ESTADÍSTICAS DE BATALLA\n\n" +
    `🔄 Rondas: ${batalla.rondas}\n` +
    `🗡️ Tus ataques: ${batalla.ataquesJugador}\n` +
    `👹 Ataques enemigos: ${batalla.ataquesEnemigo}\n` +
    `💥 Daño causado: ${batalla.danoCausado}\n` +
    `💔 Daño recibido: ${batalla.danoRecibido}\n`;

  if (enemigo.esBoss) {
    mensaje +=
      `💚 Vida regenerada por el Boss: ${batalla.vidaRegeneradaBoss}\n`;
  }

  mensaje +=
    `\n❤️ Tu vida final: ${perfil.estadisticas.vida}/${perfil.estadisticas.vidaMaxima}\n` +
    `👹 Vida final del enemigo: ${batalla.combate.enemigo.vida}/${batalla.combate.enemigo.vidaMaxima}\n\n`;

  mensaje += "━━━━━━━━━━━━━━━━━━\n";

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

    let mensajeBotin = "🎁 Botín: No encontraste objetos.";

    if (botin) {
      agregarEsencia(perfil, botin, 1);

      const nombres = {
        normal: "Esencia normal ⚪",
        epica: "Esencia épica 🟣",
        legendaria: "Esencia legendaria 🟡"
      };

      mensajeBotin =
        `🎁 Botín obtenido: ${nombres[botin]}`;
    }

    mensaje +=
      `${enemigo.esBoss ? "👑 ¡BOSS DERROTADO!\n\n" : "🏆 ¡VICTORIA!\n\n"}` +
      `⭐ Experiencia: +${final.experiencia || 0} XP\n` +
      `💎 Rubíes obtenidos: +${rubies}\n` +
      `${mensajeBotin}\n\n`;

    if (enemigo.esBoss) {
      mensaje += "🏆 Boss registrado en tus estadísticas.\n\n";
    }

    if (final.subioNivel) {
      mensaje += "⬆️ ¡SUBISTE DE NIVEL!\n\n";
    }

    mensaje +=
      `💰 Total de rubíes: ${perfil.rubies}\n`;

  } else {
    mensaje +=
      "💀 ¡HAS SIDO DERROTADO!\n\n" +
      `📉 Experiencia perdida: ${final.perdidaExperiencia || 0} XP\n` +
      `⭐ Experiencia restante: ${final.experienciaRestante || 0} XP\n` +
      "💎 Rubíes perdidos: 0\n" +
      "⏳ Regeneración bloqueada: 5 minutos\n";
  }

  mensaje += "\n⚔️━━━━━━━━━━━━━━━━━━⚔️";

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
      return "❌ Formato incorrecto. Usá &registrar:elemento";
    }

    if (
      estaRegistrado(perfil) &&
      !perfil.renacerPendiente &&
      !(perfil.nivel >= 25 && !perfil.elementos.segundo)
    ) {
      return "❌ Ya estás registrado. No puedes volver a registrarte ni cambiar tu elemento.";
    }

    return registrarElemento(perfil, datos[1]);
  }

  // =====================================
  // BLOQUEO DE JUGADORES NO REGISTRADOS
  // =====================================

  if (!estaRegistrado(perfil)) {
    return (
      "❌ Todavía no estás registrado.\n\n" +
      "Primero elegí tu elemento permanente con:\n" +
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
      return "❌ Formato incorrecto. Usá &agregar:cantidad";
    }

    const cantidad = validarCantidad(datos[1]);

    if (cantidad === null) {
      return "❌ Ingresá una cantidad válida de rubíes.";
    }

    const resultado = agregarBanco(perfil, cantidad);

    if (!resultado.correcto) {
      return `❌ ${resultado.mensaje}`;
    }

    await guardarPerfil(perfil);

    return (
      `🏦 DEPÓSITO REALIZADO\n\n` +
      `${resultado.mensaje}\n\n` +
      `💰 Rubíes disponibles: ${resultado.saldo}\n` +
      `🏦 Banco: ${resultado.banco}`
    );
  }

  // =====================================
  // RETIRAR DEL BANCO
  // =====================================

  if (comando.startsWith("&retirar:")) {
    const datos = comando.split(":");

    if (datos.length !== 2) {
      return "❌ Formato incorrecto. Usá &retirar:cantidad";
    }

    const cantidad = validarCantidad(datos[1]);

    if (cantidad === null) {
      return "❌ Ingresá una cantidad válida de rubíes.";
    }

    const resultado = retirarBanco(perfil, cantidad);

    if (!resultado.correcto) {
      return `❌ ${resultado.mensaje}`;
    }

    await guardarPerfil(perfil);

    return (
      `🏦 RETIRO REALIZADO\n\n` +
      `${resultado.mensaje}\n\n` +
      `💰 Rubíes disponibles: ${resultado.saldo}\n` +
      `🏦 Banco: ${resultado.banco}`
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
        "❌ Formato incorrecto.\n\n" +
        "Usá:\n" +
        "&reserva:agregar:cantidad\n" +
        "&reserva:retirar:cantidad"
      );
    }

    const cantidad = validarCantidad(datos[2]);

    if (cantidad === null) {
      return "❌ Ingresá una cantidad válida de rubíes.";
    }

    let resultado;

    if (datos[1] === "agregar") {
      resultado = agregarReserva(perfil, cantidad);
    } else {
      resultado = retirarReserva(perfil, cantidad);
    }

    if (!resultado.correcto) {
      return `❌ ${resultado.mensaje}`;
    }

    await guardarPerfil(perfil);

    const datosEconomia = consultarSaldo(perfil);

    return (
      `🔒 RESERVA ACTUALIZADA\n\n` +
      `${resultado.mensaje}\n\n` +
      `💰 Rubíes disponibles: ${datosEconomia.saldo}\n` +
      `🔒 Reserva: ${datosEconomia.reserva}/${datosEconomia.limiteReserva} 💎`
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
        "❌ Formato incorrecto.\n\n" +
        "Usá:\n" +
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
      return `❌ ${resultado.mensaje}`;
    }

    await guardarPerfil(perfil);

    return resultado.mensaje;
  }

  // =====================================
  // CAZAR AUTOMÁTICAMENTE
  // =====================================

  if (comando === "&cazar") {
    if (combatesActivos.has(userId)) {
      return "Ya tenés un combate activo. Usá &atacar.";
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
      return "⚠️ No se pudo completar la cacería. Intentá nuevamente.";
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
        "❌ Formato incorrecto.\n\n" +
        "Usá: &info boss nivel\n" +
        "Ejemplo: &info boss 50"
      );
    }

    const nivel = Number(argumentos[1]);

    if (!Number.isSafeInteger(nivel)) {
      return "❌ El nivel debe ser un número entero válido.";
    }

    return textoInfoBoss(nivel);
  }

  // =====================================
  // DESAFIAR BOSS
  // =====================================

  if (comando === "&boss") {
    if (combatesActivos.has(userId)) {
      return "Ya tenés un combate activo. Usá &atacar.";
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
      "👑━━━━━━━━━━━━━━━━━━👑\n" +
      "       ¡DESAFÍO DE BOSS!\n" +
      "👑━━━━━━━━━━━━━━━━━━👑\n\n" +
      `🔥 ${resultado.enemigo.nombre}\n` +
      `📊 Nivel: ${resultado.enemigo.nivel}\n` +
      `👁️ Apariencia: ${resultado.enemigo.apariencia}\n\n` +
      `❤️ Vida del Boss: ${resultado.enemigo.vida}/${resultado.enemigo.vidaMaxima}\n` +
      `❤️ Tu vida: ${resultado.jugador.vida}/${resultado.jugador.vidaMaxima}\n\n` +
      "💚 El Boss regenera vida cada 1,8 segundos.\n" +
      "⚔️ No tiene límite de tiempo.\n\n" +
      "Usá &atacar para comenzar la batalla."
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
      return "Ya tenés un combate activo. Usá &atacar.";
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
      `⚔️ ¡COMIENZA EL COMBATE!\n\n` +
      `👹 Enemigo: ${resultado.enemigo.nombre || resultado.enemigo.id}\n` +
      `❤️ Vida del enemigo: ${resultado.enemigo.vida}/${resultado.enemigo.vidaMaxima}\n` +
      `❤️ Tu vida: ${resultado.jugador.vida}/${resultado.jugador.vidaMaxima}\n\n` +
      "Usá &atacar para ejecutar toda la batalla."
    );
  }

  // =====================================
  // ATACAR
  // =====================================

  if (comando === "&atacar") {
    const activo = combatesActivos.get(userId);

    if (!activo) {
      return "No tenés ningún combate activo. Usá &aventura o &boss.";
    }

    actualizarRegeneracion(activo.perfil, true);

    const combate = activo.combate;

    if (combate.terminado) {
      combatesActivos.delete(userId);
      return "Ese combate ya terminó.";
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
      return "⚠️ No se pudo completar la batalla. Intentá nuevamente.";
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
      return "Tipo de ranking inválido. Usá: nivel, victorias o rubies.";
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
    mensaje.author?.username ||
    mensaje.author?.name ||
    "Jugador";

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
          "⚠️ Ocurrió un error al ejecutar el comando. Intentá nuevamente."
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
    estado: "En línea",
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
