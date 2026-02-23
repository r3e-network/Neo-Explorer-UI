async function go() {
  const res = await fetch("https://dora.coz.io/api/v1/neo3/mainnet/committee");
  const data = await res.json();
  console.log(data[0]);
}
go();
