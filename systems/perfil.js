// =================================
// SLAYERS RBSN — SISTEMA DE PERFILES
// =================================

function crearPerfil(userId, username) {
  return {
    id: userId,
    nombre: username || "Jugador",
    nivel: 1,
    experiencia: 0,
    monedas: 0,

    estadisticas: {
      vida: 100,
      ataque: 10,
      defensa: 5,
      victorias: 0,
      derrotas: 0
    },

    inventario: [],
    equipamiento: {
      arma: null,
      armadura: null
    },

    fechaCreacion: new Date().toISOString()
  };
}

// EXPERIENCIA NECESARIA
function experienciaNecesaria(nivel) {
  return nivel * 100;
}

// AGREGAR EXPERIENCIA
function agregarExperiencia(perfil, cantidad) {
  if (!perfil || cantidad <= 0) {
    return perfil;
  }

  perfil.experiencia += cantidad;

  let subioNivel = false;

  while (
    perfil.experiencia >= experienciaNecesaria(perfil.nivel)
  ) {
    perfil.experiencia -= experienciaNecesaria(perfil.nivel);
    perfil.nivel++;
    subioNivel = true;
  }

  return {
    perfil,
    subioNivel
  };
}

// MOSTRAR PERFIL
function mostrarPerfil(perfil) {
  if (!perfil) {
    return "❌ No se encontró el perfil del jugador.";
  }

  return `⚔️ SLAYERS RBSN — PERFIL

👤 Jugador: ${perfil.nombre}
⭐ Nivel: ${perfil.nivel}
✨ Experiencia: ${perfil.experiencia}/${experienciaNecesaria(perfil.nivel)}

💰 Monedas: ${perfil.monedas}

❤️ Vida: ${perfil.estadisticas.vida}
⚔️ Ataque: ${perfil.estadisticas.ataque}
🛡️ Defensa: ${perfil.estadisticas.defensa}

🏆 Victorias: ${perfil.estadisticas.victorias}
💀 Derrotas: ${perfil.estadisticas.derrotas}`;
}

// EXPORTAR FUNCIONES
module.exports = {
  crearPerfil,
  experienciaNecesaria,
  agregarExperiencia,
  mostrarPerfil
};
