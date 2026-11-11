require("dotenv").config();

const express = require("express");

const {
  crearPerfil,
  mostrarPerfil,
  actualizarRegeneracion
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
  iniciarCombate,
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

const combatesActivos = new Map();
const mensajesProcesados = new Set();

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

  actualizarRegeneracion(perfil, false);

  await guardarPerfil(perfil);

  return perfil;
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
  const recompensas = {
    slime: 10,
    goblin: 18,
    lobo: 28,
    orco: 45
  };

  const base = recompensas[enemigo.id] || 10;

  const nivel = Math.max(
    1,
    Number(nivelJugador) || 1
  );

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

  const probabilidad =
    probabilidades[enemigo.id] || 8;

  const tirada = Math.random() * 100;

  if (tirada >= probabilidad) {
    return null;
  }

  const rareza = Math.random() * 100;

  if (rareza < 2) {
    return "legendaria";
  }

  if (rareza < 15) {
    return "epica";
  }

  return "normal";
}

// =====================================
// AYUDA
// =====================================

function mostrarAyuda() {
  return `
⚔️ SLAYERS RBSN ⚔️

📋 COMANDOS BÁSICOS

&ayuda
&perfil
&saldo
&inventario

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

⚔️ COMANDOS RPG

&zona de caza
&enemigos
&aventura <enemigo>
&atacar

🏆 RANKINGS

&ranking
&ranking nivel
&ranking victorias
&ranking rubies

━━━━━━━━━━━━━━━━━━
Usá & antes de cada comando.
`;
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
// ZONA DE CAZA
// =====================================

function textoZonaCaza(perfil) {
  const enemigos = listarEnemigos();

  const nivelJugador = Math.max(
    1,
    Number(perfil.nivel) || 1
  );

  const proximoBoss =
    Math.ceil(nivelJugador / 10) * 10;

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
    "👑 PRÓXIMO BOSS\n\n" +
    `🔥 Boss correspondiente al nivel ${proximoBoss}\n` +
    "Los Bosses aparecen cada 10 niveles.\n" +
    "Cada uno tendrá nombre, apariencia y recompensas únicas.\n\n" +
    "🌲━━━━━━━━━━━━━━━━━━🌲\n" +
    "Usá &aventura <enemigo> para comenzar a cazar.";

  return texto;
}

// =====================================
// EJECUTAR BATALLA AUTOMÁTICA
// =====================================

function ejecutarBatalla(perfil, combate) {
  let rondas = 0;
  let ataquesJugador = 0;
  let ataquesEnemigo = 0;

  let danoCausado = 0;
  let danoRecibido = 0;

  const registro = [];

  while (!combate.terminado) {
    rondas++;

    // TURNO DEL JUGADOR

    const ataque = atacarEnemigo(combate);

    if (ataque.error) {
      break;
    }

    combate = ataque.combate || combate;

    ataquesJugador++;
    danoCausado += ataque.dano || 0;

    registro.push(
      `🗡️ ${ataquesJugador}. Atacaste e hiciste ${ataque.dano} de daño.`
    );

    if (combate.terminado) {
      break;
    }

    // TURNO DEL ENEMIGO

    const contraataque = atacarJugador(combate);

    if (contraataque.error) {
      break;
    }

    combate = contraataque.combate || combate;

    ataquesEnemigo++;
    danoRecibido += contraataque.dano || 0;

    registro.push(
      `👹 El enemigo te atacó e hizo ${contraataque.dano} de daño.`
    );
  }

  return {
    combate,
    rondas,
    ataquesJugador,
    ataquesEnemigo,
    danoCausado,
    danoRecibido,
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
    `👹 Enemigo: ${enemigo.nombre}\n` +
    `📊 Nivel: ${enemigo.nivel}\n\n`;

  mensaje += "📜 DESARROLLO DE LA BATALLA\n\n";

  batalla.registro.forEach((linea, index) => {
    mensaje += linea + "\n";
  });

  mensaje +=
    "\n━━━━━━━━━━━━━━━━━━\n" +
    "📊 ESTADÍSTICAS DE BATALLA\n\n" +
    `🔄 Rondas: ${batalla.rondas}\n` +
    `🗡️ Tus ataques: ${batalla.ataquesJugador}\n` +
    `👹 Ataques enemigos: ${batalla.ataquesEnemigo}\n` +
    `💥 Daño causado: ${batalla.danoCausado}\n` +
    `💔 Daño recibido: ${batalla.danoRecibido}\n\n`;

  mensaje +=
    `❤️ Tu vida final: ${perfil.estadisticas.vida}/${perfil.estadisticas.vidaMaxima}\n` +
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
      "🏆 ¡VICTORIA!\n\n" +
      `⭐ Experiencia: +${final.experiencia || 0} XP\n` +
      `💎 Rubíes obtenidos: +${rubies}\n` +
      `${mensajeBotin}\n\n`;

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
// COMANDOS
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

  const perfil = await cargarPerfil(userId, username);

  // AYUDA
  if (comando === "&ayuda") {
    return mostrarAyuda();
  }

  // PERFIL
  if (comando === "&perfil") {
    return mostrarPerfil(perfil);
  }

  // SALDO
  if (comando === "&saldo") {
    return mostrarEconomia(perfil);
  }

  // INVENTARIO
  if (comando === "&inventario") {
    return mostrarInventario(perfil);
  }

  // =====================================
  // BANCO
  // =====================================

  if (comando === "&banco") {
    return mostrarEconomia(perfil);
  }

  // AGREGAR AL BANCO
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

  // RETIRAR DEL BANCO
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
  // ZONA DE CAZA
  // =====================================

  if (
    comando === "&zona" &&
    argumentos[0]?.toLowerCase() === "de" &&
    argumentos[1]?.toLowerCase() === "caza"
  ) {
    return textoZonaCaza(perfil);
  }

  // =====================================
  // ENEMIGOS
  // =====================================

  if (comando === "&enemigos") {
    return textoEnemigos();
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
      `Usá &atacar para ejecutar toda la batalla.`
    );
  }

  // =====================================
  // ATACAR
  // =====================================

  if (comando === "&atacar") {
    const activo = combatesActivos.get(userId);

    if (!activo) {
      return "No tenés ningún combate activo. Usá &aventura.";
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

    const batalla = ejecutarBatalla(
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
});
