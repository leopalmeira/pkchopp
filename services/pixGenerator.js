const QRCode = require('qrcode');

/**
 * Utilitário para gerar payload Pix (BR Code) padrão Banco Central do Brasil
 * e QR Code em formato Base64 para exibição imediata no frontend.
 */

function crc16(buffer) {
  let crc = 0xffff;
  for (let i = 0; i < buffer.length; i++) {
    crc ^= buffer.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = (crc << 1) ^ 0x1021;
      } else {
        crc = crc << 1;
      }
    }
  }
  return (crc & 0xffff).toString(16).toUpperCase().padStart(4, '0');
}

function formatField(id, value) {
  const len = value.length.toString().padStart(2, '0');
  return `${id}${len}${value}`;
}

function generatePixPayload({ key, name, city, amount, txid = '***' }) {
  // Tratamento dos campos
  const cleanKey = key.trim();
  const cleanName = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").substring(0, 25).trim();
  const cleanCity = city.normalize("NFD").replace(/[\u0300-\u036f]/g, "").substring(0, 15).trim();
  const formattedAmount = Number(amount).toFixed(2);
  const cleanTxid = txid.replace(/[^a-zA-Z0-9]/g, '').substring(0, 25) || 'PKCHOPP';

  // 00 - Payload Format Indicator
  let payload = formatField('00', '01');

  // 26 - Merchant Account Information (GUI + Key)
  const gui = formatField('00', 'br.gov.bcb.pix');
  const pixKey = formatField('01', cleanKey);
  const merchantAccountInfo = `${gui}${pixKey}`;
  payload += formatField('26', merchantAccountInfo);

  // 52 - Merchant Category Code
  payload += formatField('52', '0000');

  // 53 - Transaction Currency (986 = BRL)
  payload += formatField('53', '986');

  // 54 - Transaction Amount
  payload += formatField('54', formattedAmount);

  // 58 - Country Code
  payload += formatField('58', 'BR');

  // 59 - Merchant Name
  payload += formatField('59', cleanName || 'PKCHOPP DISTRIBUIDORA');

  // 60 - Merchant City
  payload += formatField('60', cleanCity || 'RIO DE JANEIRO');

  // 62 - Additional Data Field Template (TxID)
  const additionalDataField = formatField('05', cleanTxid);
  payload += formatField('62', additionalDataField);

  // 63 - CRC16 Checksum
  const payloadWithCRCId = `${payload}6304`;
  const checksum = crc16(payloadWithCRCId);

  return `${payloadWithCRCId}${checksum}`;
}

async function generatePixQRCode(pixData) {
  const payload = generatePixPayload(pixData);
  const qrCodeBase64 = await QRCode.toDataURL(payload, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 320,
    color: {
      dark: '#111827',
      light: '#ffffff'
    }
  });

  return {
    payload,
    qrCodeBase64
  };
}

module.exports = {
  generatePixPayload,
  generatePixQRCode
};
