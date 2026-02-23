import requests
import json

url = "https://neofura.ngd.network"
payload = {
    "jsonrpc": "2.0",
    "method": "GetBlockInfoList",
    "params": {"Limit": 100, "Skip": 0},
    "id": 1
}
resp = requests.post(url, json=payload).json()
for b in resp['result']['result']:
    if b.get('transactioncount', 0) > 0:
        print("Block with TXs:", b['index'], "Count:", b['transactioncount'])
        break
