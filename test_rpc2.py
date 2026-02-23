import requests

url = "http://198.244.215.132:1927"
payload = {
    "jsonrpc": "2.0",
    "method": "GetBlockByBlockHeight",
    "params": {"BlockHeight": 1136117},
    "id": 1
}
resp = requests.post(url, json=payload).json()
print("KEYS:", list(resp['result'].keys()))
