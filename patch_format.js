const fs = require('fs');

let code = fs.readFileSync('src/views/Tools/FormatConverterTool.vue', 'utf8');

if (!code.includes('import { u }')) {
    code = code.replace(
        'import { useToast } from "vue-toastification";',
        'import { useToast } from "vue-toastification";\nimport { u } from "@cityofzion/neon-js";'
    );
}

// Replace the conversion functions completely
const replaceRegion = `function stringToHex(str) {
  let hex = '';
  for(let i=0; i<str.length; i++) {
    hex += '' + str.charCodeAt(i).toString(16);
  }
  return hex;
}

function hexToString(hex) {
  let str = '';
  hex = hex.replace(/^0x/, '');
  for (let i = 0; i < hex.length; i += 2) {
    str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
  }
  return str;
}

function hexToBase64(hexstring) {
  hexstring = hexstring.replace(/^0x/, '');
  return btoa(hexstring.match(/\\w{2}/g).map(function(a) {
      return String.fromCharCode(parseInt(a, 16));
  }).join(""));
}

function base64ToHex(str) {
  const raw = atob(str);
  let result = '';
  for (let i = 0; i < raw.length; i++) {
    const hex = raw.charCodeAt(i).toString(16);
    result += (hex.length === 2 ? hex : '0' + hex);
  }
  return result.toUpperCase();
}`;

const newRegion = `function stringToHex(str) {
  return u.str2hexstring(str);
}

function hexToString(hex) {
  return u.hexstring2str(hex.replace(/^0x/, ''));
}

function hexToBase64(hexstring) {
  return u.hex2base64(hexstring.replace(/^0x/, ''));
}

function base64ToHex(str) {
  return u.base642hex(str);
}`;

code = code.replace(replaceRegion, newRegion);
fs.writeFileSync('src/views/Tools/FormatConverterTool.vue', code);
