async function go() {
  const res = await fetch("https://dora.coz.io/api/v1/neo3/testnet_rc4/committee");
  console.log(res.status, await res.text());
}
go();
