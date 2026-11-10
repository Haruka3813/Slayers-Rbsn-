require("dotenv").config();

const express = require("express");

const {
  crearPerfil,
  mostrarPerfil
} = require("./systems/perfil");

const {
  consultarSaldo
} = require("./systems/economia");

const {
  mostrarInventario
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
  rankingPorMonedas,
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
  let perfil = await obtenerPerfil(userId);

  if (!perfil) {
    perfil = crearPerfil(userId, username);
    await guardarPerfil(perfil);
  }

  return perfil;
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

⚔️ COMANDOS RPG

&enemigos
&aventura <enemigo>
&atacar

🏆 RANKINGS

&ranking
&ranking nivel
&ranking victorias
&ranking monedas

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
    return consultarSaldo(perfil);
  }

  // INVENTARIO
  if (comando === "&inventario") {
    return mostrarInventario(perfil);
  }

  // ENEMIGOS
  if (comando === "&enemigos") {
    return textoEnemigos();
  }

  // AVENTURA
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

  // ATACAR
  if (comando === "&atacar") {
    const activo = combatesActivos.get(userId);

    if (!activo) {
      return "No tenés ningún combate activo. Usá &aventura.";
    }

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

  // RANKING
  if (comando === "&ranking") {
    const tipo = (argumentos[0] || "nivel").toLowerCase();

    const perfiles = await obtenerTodosLosPerfiles();

    let ranking;

    if (tipo === "nivel") {
      ranking = rankingPorNivel(perfiles);
    } else if (tipo === "victorias") {
      ranking = rankingPorVictorias(perfiles);
    } else if (tipo === "monedas") {
      ranking = rankingPorMonedas(perfiles);
    } else {
      return "Tipo de ranking inválido. Usá: nivel, victorias o monedas.";
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

  // Evitar que la lista crezca indefinidamente
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
  console.log(`Puerto: ${PORT}`);
  console.log(`Token configurado: ${Boolean(BOT_TOKEN)}`);
  console.log(`Supabase: ${comprobarConexion() ? "Configurado" : "No configurado"}`);
});
