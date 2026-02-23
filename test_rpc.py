import requests

url = "http://198.244.215.132:1927"
payload = {
    "jsonrpc": "2.0",
    "method": "GetBlockInfoList",
    "params": {"Limit": 2, "Skip": 0},
    "id": 1
}
try:
    resp = requests.post(url, json=payload).json()
    print("KEYS:", list(resp['result']['result'][0].keys()))
    import json
    print(json.dumps(resp['result']['result'][0], indent=2))
except Exception as e:
    print(e)
