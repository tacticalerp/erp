const path = require('path');

const MAP = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.pdf': 'application/pdf',
};

function fromExt(filePath) {
  return MAP[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
}

module.exports = { fromExt };
