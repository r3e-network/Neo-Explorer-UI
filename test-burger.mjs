import fetch from 'node-fetch';
try {
  const res = await fetch('https://neoburger.io/api/apr');
  console.log(await res.text());
} catch(e) { console.log(e); }
