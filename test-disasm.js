const { sc, u } = require('@cityofzion/neon-js');

const hex = '0b013a010c14e7ef7f5e58c16e9d72096b4ed8c859e2880c416b0c1461d90333185b41607a64c8fef46b3da42cf5f4ff14c01f0c087472616e736665720c14f563ea40bc283d4d0e05c48ea305b3f2a07340ef41627d5b52';

try {
  const instructions = sc.OpCode;
  
  // let's just log the reversed map
  const rev = {};
  for(let k in sc.OpCode) {
    rev[sc.OpCode[k]] = parseInt(k);
  }
  // console.log(rev);
  
  // Is there a built in disassembler in neon-js?
  // We can just use the OpCode object to build a proper list.
  
} catch(e) {
  console.log(e)
}
