import requests
import json

url = "https://neofura.ngd.network"
payload = {
    "jsonrpc": "2.0",
    "method": "GetBlockInfoList",
    "params": {"Limit": 2, "Skip": 0},
    "id": 1
}
resp = requests.post(url, json=payload).json()
print("KEYS:", list(resp['result']['result'][0].keys()))
print(json.dumps(resp['result']['result'][0], indent=2))
