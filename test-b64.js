function toHex(b64) {
  return Buffer.from(b64, 'base64').toString('hex');
}
console.log(toHex('CxYMFBIuK77fzRjYdUGLoK+9mXAMRMJnDBRh2QMzGFtBYHpkyP70az2kLPX0/xTAHwwIdHJhbnNmZXIMFPVj6kC8KD1NDgXEjqMFs/Kgc0DvQWJ9W1I='));
