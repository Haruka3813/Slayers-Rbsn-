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
  usarEsencia
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
  // Si está combatiendo, conservar el perfil del combate
  if (combatesActivos.has(userId)) {
    return combatesActivos.get(userId).perfil;
  }

  let perfil = await obtenerPerfil(userId);

  if (!perfil) {
    perfil = crearPerfil(userId, username);
  }

  // Regeneración automática fuera de combate
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

    // Marcar el inicio del combate
    actualizarRegeneracion(perfil, true);

    await guardarPerfil(perfil);

    combatesActivos.set(userId, {
      perfil,
      combate: resultado
    });

    return (
      `⚔️ ¡COMIENZA EL COMBATE!\n\n` +
      `Enemigo: ${resultado.enemigo.nombre || resultado.enemigo.id}\n` +
      `Vida del enemigo: ${resultado.enemigo.vida}\n` +
      `Tu vida: ${resultado.jugador.vida}\n\n` +
      `Usá &atacar para comenzar tu turno.`
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

    // Mantener detenida la regeneración durante el combate
    actualizarRegeneracion(activo.perfil, true);

    const combate = activo.combate;

    if (combate.terminado) {
      combatesActivos.delete(userId);
      return "Ese combate ya terminó.";
    }

    if (combate.turno !== "jugador") {
      return "Todavía no es tu turno.";
    }

    const ataque = atacarEnemigo(combate);

    if (ataque.error) {
      return ataque.error;
    }

    activo.combate = ataque.combate || combate;

    let mensaje = ataque.mensaje || "";

    if (activo.combate.terminado) {
      const final = finalizarCombate(
        activo.perfil,
        activo.combate
      );

      combatesActivos.delete(userId);

      if (final.error) {
        return mensaje + "\n" + final.error;
      }

      await guardarPerfil(final.perfil);

      mensaje +=
        "\n\n" +
        (final.resultado === "victoria"
          ? `🏆 ¡VICTORIA!\nExperiencia obtenida: ${final.experiencia || 0}`
          : "💀 Has sido derrotado.");

      if (final.subioNivel) {
        mensaje += "\n⬆️ ¡Subiste de nivel!";
      }

      return mensaje;
    }

    const contraataque = atacarJugador(activo.combate);

    if (contraataque.error) {
      return mensaje + "\n" + contraataque.error;
    }

    activo.combate = contraataque.combate || activo.combate;

    mensaje += "\n\n" + (contraataque.mensaje || "");

    if (activo.combate.terminado) {
      const final = finalizarCombate(
        activo.perfil,
        activo.combate
      );

      combatesActivos.delete(userId);

      if (final.error) {
        return mensaje + "\n" + final.error;
      }

      await guardarPerfil(final.perfil);

      mensaje +=
        "\n\n" +
        (final.resultado === "victoria"
          ? "🏆 ¡VICTORIA!"
          : "💀 Has sido derrotado.");

      if (final.experiencia) {
        mensaje += `\nExperiencia obtenida: ${final.experiencia}`;
      }

      if (final.subioNivel) {
        mensaje += "\n⬆️ ¡Subiste de nivel!";
      }

      return mensaje;
    }

    return mensaje + "\n\n⚔️ Tu próximo turno: &atacar";
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
