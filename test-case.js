const { extractContractInvocation } = require('./src/utils/scriptDisassembler.js');
const script = 'CwOAZixBpgAAAAwUopctuZ+/A03bLZntcIVjqT3wkkEMFPV+4rkv91tZrGkJpjn//ALr3sspFMAfDAh0cmFuc2ZlcgwUz3bii9AGLEpHjuNVYQETGfPPpNJBYn1bUg==';
console.log(extractContractInvocation(script));
