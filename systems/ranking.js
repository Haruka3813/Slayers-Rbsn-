// =====================================
// SLAYERS RBSN — SISTEMA DE RANKINGS
// =====================================

// RANKING POR NIVEL
function rankingPorNivel(perfiles) {
  return [...perfiles]
    .sort((a, b) => {
      if (b.nivel !== a.nivel) {
        return b.nivel - a.nivel;
      }

      return b.experiencia - a.experiencia;
    })
    .map((perfil, index) => ({
      posicion: index + 1,
      nombre: perfil.nombre,
      nivel: perfil.nivel,
      experiencia: perfil.experiencia
    }));
}

// RANKING POR VICTORIAS
function rankingPorVictorias(perfiles) {
  return [...perfiles]
    .sort((a, b) => {
      return (
        (b.estadisticas?.victorias || 0) -
        (a.estadisticas?.victorias || 0)
      );
    })
    .map((perfil, index) => ({
      posicion: index + 1,
      nombre: perfil.nombre,
      victorias: perfil.estadisticas?.victorias || 0,
      derrotas: perfil.estadisticas?.derrotas || 0
    }));
}

// RANKING POR RUBÍES
function rankingPorRubies(perfiles) {
  return [...perfiles]
    .sort((a, b) => {
      const rubiesA = a.rubies ?? a.monedas ?? 0;
      const rubiesB = b.rubies ?? b.monedas ?? 0;

      return rubiesB - rubiesA;
    })
    .map((perfil, index) => ({
      posicion: index + 1,
      nombre: perfil.nombre,
      rubies: perfil.rubies ?? perfil.monedas ?? 0
    }));
}

// COMPATIBILIDAD CON EL NOMBRE ANTERIOR
const rankingPorMonedas = rankingPorRubies;

// MOSTRAR RANKING
function mostrarRanking(ranking, tipo) {
  if (!ranking || ranking.length === 0) {
    return "Todavía no hay jugadores en el ranking.";
  }

  let titulo = "🏆 RANKING";

  if (tipo === "nivel") {
    titulo = "🏆 RANKING POR NIVEL";
  }

  if (tipo === "victorias") {
    titulo = "⚔️ RANKING POR VICTORIAS";
  }

  if (tipo === "rubies" || tipo === "monedas") {
    titulo = "💎 RANKING POR RUBÍES";
  }

  const lista = ranking.slice(0, 10).map(jugador => {
    let detalle = "";

    if (tipo === "nivel") {
      detalle = `Nivel ${jugador.nivel} | ${jugador.experiencia} XP`;
    } else if (tipo === "victorias") {
      detalle =
        `${jugador.victorias} victorias | ` +
        `${jugador.derrotas} derrotas`;
    } else if (tipo === "rubies" || tipo === "monedas") {
      detalle = `${jugador.rubies ?? jugador.monedas ?? 0} 💎 Rubíes`;
    }

    return `${jugador.posicion}. ${jugador.nombre} — ${detalle}`;
  });

  return `${titulo}\n\n${lista.join("\n")}`;
}

// EXPORTAR FUNCIONES
module.exports = {
  rankingPorNivel,
  rankingPorVictorias,
  rankingPorRubies,
  rankingPorMonedas,
  mostrarRanking
};
