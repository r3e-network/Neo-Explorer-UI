import requests
import json

url = "https://neofura.ngd.network"
payload = {
    "jsonrpc": "2.0",
    "method": "GetBlockByBlockHeight",
    "params": {"BlockHeight": 8910573},
    "id": 1
}
resp = requests.post(url, json=payload).json()
print("networkFee:", resp['result']['networkFee'])
print("systemFee:", resp['result']['systemFee'])
