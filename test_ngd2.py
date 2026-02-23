import requests
import json

url = "https://neofura.ngd.network"
payload = {
    "jsonrpc": "2.0",
    "method": "GetBlockByBlockHeight",
    "params": {"BlockHeight": 8910598},
    "id": 1
}
resp = requests.post(url, json=payload).json()
print("KEYS:", list(resp['result'].keys()))
print(json.dumps(resp['result'], indent=2))
