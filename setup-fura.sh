#!/bin/bash
set -e

DIR="/home/ubuntu/neo-cli-fura-sync"

# Stop existing screens
screen -S fura_testnet -X quit || true
pkill -9 -f neo-cli || true
sleep 1

# Recreate DIR
rm -rf "$DIR"
mkdir -p "$DIR"
cd "$DIR"

echo "Downloading neo-cli..."
wget -q https://github.com/neo-project/neo-node/releases/download/v3.9.2/neo-cli-linux-x64.zip
unzip -q -o neo-cli-linux-x64.zip

echo "Downloading LevelDBStore..."
wget -q -O LevelDBStore.zip https://github.com/neo-project/neo-node/releases/download/v3.9.2/LevelDBStore.zip
unzip -q -o LevelDBStore.zip -d neo-cli/

# Setup config
cp neo-cli/config.testnet.json neo-cli/config.json

echo "Building Fura plugin..."
cd /tmp/Fura/Fura
git checkout .
git pull || true
rm -rf bin obj
dotnet restore
dotnet publish -c Release -f net10.0 -o /tmp/FuraPublish

echo "Copying ONLY necessary DLLs to Plugin folder..."
mkdir -p "$DIR/neo-cli/Plugins/Fura"
cd /tmp/FuraPublish

# Copy all published DLLs to the plugin directory
cp *.dll "$DIR/neo-cli/Plugins/Fura/"

# Remove Neo and Akka DLLs from the plugin directory so they are resolved from the host application
rm -f "$DIR/neo-cli/Plugins/Fura/Neo.dll"
rm -f "$DIR/neo-cli/Plugins/Fura/Neo.Extensions.dll"
rm -f "$DIR/neo-cli/Plugins/Fura/Akka.dll"

echo "Creating Fura config..."
cat << 'JSON' > "$DIR/neo-cli/Plugins/Fura/config.json"
{
  "PluginConfiguration": {
    "DbName": "neofura",
    "ConnectionString": "mongodb://127.0.0.1:27001",
    "NetType": 894710606,
    "Log": false,
    "SleepTime": 10,
    "WaitTime": 120,
    "MarketContractIds": [0, 0],
    "Nep11ContractIds": [],
    "Nep17ContractIds": [],
    "IlexContractHashes": [],
    "MetaContractHashes": [],
    "NNS": "0x50ac1c37690cc2cfc594472833cf57505d5f46de"
  }
}
JSON

cd "$DIR/neo-cli"
rm -f /home/ubuntu/fura_sync.log
ln -sf /home/ubuntu/neo-rs/data/bootstrap-testnet/chain.0.acc .

chmod +x neo-cli || true

echo "Starting Fura via screen..."
screen -dmS fura_testnet
screen -S fura_testnet -X stuff "cd $DIR/neo-cli\n"
screen -S fura_testnet -X stuff "./neo-cli > out.log 2>&1\n"

echo "Done. Fura is running inside screen 'fura_testnet'"
