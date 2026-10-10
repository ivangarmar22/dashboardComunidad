function contractFromEnv(key, label) {
  const prefix = `ENDESA_${key.toUpperCase()}_`;
  const env = (name) => process.env[prefix + name];
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
  user: process.env.ENDESA_BILLING_USER,
  password: process.env.ENDESA_BILLING_PASSWORD,
  sfContractId: process.env.ENDESA_BILLING_SF_CONTRACT_ID,
  cookie: process.env.ENDESA_BILLING_COOKIE,
  auraToken: process.env.ENDESA_BILLING_AURA_TOKEN,
  auraFwuid: process.env.ENDESA_BILLING_AURA_FWUID,
  dataFile: 'endesa-billing.json',
};

export default CONTRACTS;
