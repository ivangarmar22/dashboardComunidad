// Quita espacios y comillas que se cuelan al copiar valores desde otros paneles (CLAVE="valor")
function readEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) return undefined;
  return value.replace(/^(["'])(.*)\1$/s, '$2');
}

function contractFromEnv(key, label) {
  const env = (name) => readEnv(`ENDESA_${key.toUpperCase()}_${name}`);
  return {
    key,
    label,
    user: env('USER'),
    password: env('PASSWORD'),
    clientId: env('CLIENT_ID'),
    contractId: env('CONTRACT_ID'),
    cookie: env('COOKIE'),
    sessionId: env('SESSION_ID'),
    dataFile: `endesa-${key}.json`,
    cookieCacheFile: `.endesa-${key}-cookies.json`,
  };
}

const CONTRACTS = {
  comunes: contractFromEnv('comunes', 'Zonas Comunes'),
  portales: contractFromEnv('portales', 'Portales'),
};

export function getContract(key) {
  if (!Object.hasOwn(CONTRACTS, key)) throw new Error(`Contrato desconocido: ${key}`);
  return CONTRACTS[key];
}

export const BILLING_CONFIG = {
  user: readEnv('ENDESA_BILLING_USER'),
  password: readEnv('ENDESA_BILLING_PASSWORD'),
  sfContractId: readEnv('ENDESA_BILLING_SF_CONTRACT_ID'),
  cookie: readEnv('ENDESA_BILLING_COOKIE'),
  auraToken: readEnv('ENDESA_BILLING_AURA_TOKEN'),
  auraFwuid: readEnv('ENDESA_BILLING_AURA_FWUID'),
  dataFile: 'endesa-billing.json',
};

export default CONTRACTS;
