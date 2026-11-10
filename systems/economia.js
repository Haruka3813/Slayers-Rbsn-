// =================================
// SLAYERS RBSN — SISTEMA DE ECONOMÍA
// =================================

// CONSULTAR SALDO
function consultarSaldo(perfil) {
  if (!perfil) {
    return {
      correcto: false,
      mensaje: "No se encontró el perfil."
    };
  }

  return {
    correcto: true,
    saldo: perfil.monedas
  };
}

// DEPOSITAR MONEDAS
function depositar(perfil, cantidad) {
  if (!perfil) {
    return {
      correcto: false,
      mensaje: "No se encontró el perfil."
    };
  }

  if (
    !Number.isSafeInteger(cantidad) ||
    cantidad <= 0
  ) {
    return {
      correcto: false,
      mensaje: "La cantidad debe ser un número entero positivo."
    };
  }

  if (!Number.isSafeInteger(perfil.monedas + cantidad)) {
    return {
      correcto: false,
      mensaje: "Se alcanzó el límite de monedas."
    };
  }

  perfil.monedas += cantidad;

  return {
    correcto: true,
    saldo: perfil.monedas,
    mensaje: `Se agregaron ${cantidad} monedas.`
  };
}

// RETIRAR MONEDAS
function retirar(perfil, cantidad) {
  if (!perfil) {
    return {
      correcto: false,
      mensaje: "No se encontró el perfil."
    };
  }

  if (
    !Number.isSafeInteger(cantidad) ||
    cantidad <= 0
  ) {
    return {
      correcto: false,
      mensaje: "La cantidad debe ser un número entero positivo."
    };
  }

  if (perfil.monedas < cantidad) {
    return {
      correcto: false,
      mensaje: "No tenés suficientes monedas."
    };
  }

  perfil.monedas -= cantidad;

  return {
    correcto: true,
    saldo: perfil.monedas,
    mensaje: `Se retiraron ${cantidad} monedas.`
  };
}

// TRANSFERIR MONEDAS
function transferir(emisor, receptor, cantidad) {
  if (!emisor || !receptor) {
    return {
      correcto: false,
      mensaje: "No se encontraron ambos perfiles."
    };
  }

  if (emisor === receptor || emisor.id === receptor.id) {
    return {
      correcto: false,
      mensaje: "No podés transferirte monedas a vos mismo."
    };
  }

  if (
    !Number.isSafeInteger(cantidad) ||
    cantidad <= 0
  ) {
    return {
      correcto: false,
      mensaje: "La cantidad debe ser un número entero positivo."
    };
  }

  if (emisor.monedas < cantidad) {
    return {
      correcto: false,
      mensaje: "No tenés suficientes monedas."
    };
  }

  if (!Number.isSafeInteger(receptor.monedas + cantidad)) {
    return {
      correcto: false,
      mensaje: "El receptor alcanzó el límite de monedas."
    };
  }

  emisor.monedas -= cantidad;
  receptor.monedas += cantidad;

  return {
    correcto: true,
    mensaje: "Transferencia realizada correctamente.",
    saldoEmisor: emisor.monedas,
    saldoReceptor: receptor.monedas
  };
}

// EXPORTAR FUNCIONES
module.exports = {
  consultarSaldo,
  depositar,
  retirar,
  transferir
};
