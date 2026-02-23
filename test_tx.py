import requests
import json

url = "https://neofura.ngd.network"
payload = {
    "jsonrpc": "2.0",
    "method": "GetNep17TransferByTransactionHash",
    "params": {"TransactionHash": "0xd5fc342b0fbf1c2f6fc89ff5e1d2d42b4945a1a799248e2884b7d76578bb43aa"},
    "id": 1
}
resp = requests.post(url, json=payload).json()
print("NEP17 Transfers:", json.dumps(resp['result']['result'], indent=2))
