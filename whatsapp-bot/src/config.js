require('dotenv').config();
const path = require('path');

function required(name, fallback) {
  const v = process.env[name];
  if (v === undefined || v === '') return fallback;
  return v;
}

module.exports = {
  port: parseInt(required('PORT', '3000'), 10),
  dataDir: path.resolve(__dirname, '..', required('DATA_DIR', './data')),

  rompecabezas: {
    token: required('WA_ROMPECABEZAS_TOKEN', ''),
    phoneNumberId: required('WA_ROMPECABEZAS_PHONE_NUMBER_ID', ''),
    verifyToken: required('WA_ROMPECABEZAS_VERIFY_TOKEN', ''),
  },

  nequi: {
    numero: required('NEQUI_NUMERO', ''),
    titular: required('NEQUI_TITULAR', ''),
  },

  hubApiKey: required('HUB_API_KEY', ''),
};
