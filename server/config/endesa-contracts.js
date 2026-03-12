import dotenv from 'dotenv';
dotenv.config();

const CONTRACTS = {
  comunes: {
    key: 'comunes',
    label: 'Zonas Comunes',
    user: process.env.ENDESA_COMUNES_USER,
    password: process.env.ENDESA_COMUNES_PASSWORD,
    clientId: process.env.ENDESA_COMUNES_CLIENT_ID,
    contractId: process.env.ENDESA_COMUNES_CONTRACT_ID,
    cookie: process.env.ENDESA_COMUNES_COOKIE,
    sessionId: process.env.ENDESA_COMUNES_SESSION_ID,
    dataFile: 'endesa-comunes.json',
    cookieCacheFile: '.endesa-comunes-cookies.json',
  },
  portales: {
    key: 'portales',
    label: 'Portales (1-7)',
    user: process.env.ENDESA_PORTALES_USER,
    password: process.env.ENDESA_PORTALES_PASSWORD,
    clientId: process.env.ENDESA_PORTALES_CLIENT_ID,
    contractId: process.env.ENDESA_PORTALES_CONTRACT_ID,
    cookie: process.env.ENDESA_PORTALES_COOKIE,
    sessionId: process.env.ENDESA_PORTALES_SESSION_ID,
    dataFile: 'endesa-portales.json',
    cookieCacheFile: '.endesa-portales-cookies.json',
  },
};

export function getContract(key) {
  const contract = CONTRACTS[key];
  if (!contract) throw new Error(`Contrato desconocido: ${key}`);
  return contract;
}

export function getAllContracts() {
  return Object.values(CONTRACTS).map((c) => ({ key: c.key, label: c.label }));
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
