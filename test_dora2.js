async function go() {
  const res = await fetch("https://dora.coz.io/api/v1/neo3/testnet_b/committee");
  try {
    const data = await res.json();
    console.log(data);
  } catch(e) { console.log(e); }
}
go();
