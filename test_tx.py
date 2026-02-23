import requests
import json

url = "https://neofura.ngd.network"
payload = {
    "jsonrpc": "2.0",
    "method": "GetBlockCount",
    "params": {},
    "id": 1
}
resp = requests.post(url, json=payload).json()
print("GetBlockCount response:", resp)
