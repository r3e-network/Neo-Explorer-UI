const fs = require('fs');

let code = fs.readFileSync('src/views/Tools/BroadcastMessageTool.vue', 'utf8');

const newBroadcastFn = `
async function broadcastMessage() {
  if (!message.value.trim() || messageBytes.value > 65535) return;
  if (!connectedAccount.value) {
    toast.error("Please connect your wallet first");
    return;
  }

  if (typeof window === "undefined" || !window.NEOLineN3) {
    toast.error("NeoLine N3 wallet not found.");
    return;
  }

  isSending.value = true;
  txHash.value = "";
  
  try {
    const neoline = new window.NEOLineN3.Init();
    
    // Convert current address to ScriptHash for the from/to fields
    const fromAddress = connectedAccount.value;
    
    // We do a 0 GAS transfer to self, with the message in the argument and/or remark
    // GAS script hash
    const gasHash = "0xd2a4cff31913016155e38e474a2c06d08be276cf";
    
    toast.info("Preparing transaction for wallet signature...");
    
    const result = await neoline.invoke({
      scriptHash: gasHash,
      operation: "transfer",
      args: [
        { type: "Address", value: fromAddress },
        { type: "Address", value: fromAddress },
        { type: "Integer", value: "0" },
        { type: "String", value: message.value }
      ],
      fee: "0",
      broadcastOverride: false,
      signers: [
        {
          account: fromAddress, // NeoLine accepts base58 address here
          scopes: 1 // CalledByEntry
        }
      ],
      remark: message.value // Pass remark parameter, wallet might append it as TxAttribute
    });

    txHash.value = result.txid;
    toast.success("Message broadcasted to Neo N3!");
    message.value = ""; // Clear on success
    
  } catch (e) {
    console.error(e);
    toast.error("Failed to broadcast message: " + (e.description || e.message || "User rejected"));
  } finally {
    isSending.value = false;
  }
}
`;

code = code.replace(/async function broadcastMessage\(\) \{[\s\S]*?\}\n/m, newBroadcastFn);
fs.writeFileSync('src/views/Tools/BroadcastMessageTool.vue', code);
