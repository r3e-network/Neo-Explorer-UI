async function go() {
  const res = await fetch("https://dora.coz.io/api/v1/neo3/testnet/committee");
  const data = await res.json();
  console.log(data);
}
go();
