import os

# 1. Update docker-compose.yml to expose HTTP_PORT and WS_PORT
dc_path = "../neo3fura/docker-compose.yml"
with open(dc_path, 'r') as f:
    dc = f.read()
dc = dc.replace('- "1926:1926"', '- "${HTTP_PORT:-1926}:1926"')
dc = dc.replace('- "2026:2026"', '- "${WS_PORT:-2026}:2026"')
with open(dc_path, 'w') as f:
    f.write(dc)

# 2. Update start.sh to include MAINNET
sh_path = "../neo3fura/start.sh"
with open(sh_path, 'r') as f:
    sh = f.read()
if "MAINNET" not in sh:
    mainnet_block = """
if [ $1 == "MAINNET" ]
then
    export RUNTIME="mainnet"
    export HTTP_PORT="1927"
    export WS_PORT="2027"
    docker stop service_ws_mainnet
    docker stop service_http_mainnet

    docker container rm service_ws_mainnet
    docker container rm service_http_mainnet

    docker rmi mainnet_neofura_http -f
    docker rmi mainnet_neofura_ws -f
    docker compose -p "mainnet" up -d
fi
"""
    # Fix docker-compose -> docker compose in old TEST/STAGING blocks
    sh = sh.replace('docker-compose', 'docker compose')
    # Add MAINNET block before the last empty lines
    sh = sh.strip() + "\n" + mainnet_block + "\n"
    # Overwrite port exports to default block if not explicitly set
    sh = sh.replace('export RUNTIME="test"', 'export RUNTIME="test"\n    export HTTP_PORT="1926"\n    export WS_PORT="2026"')
    with open(sh_path, 'w') as f:
        f.write(sh)

# 3. Update neo3fura_http/app/neo3fura/src.go to support RUNTIME=mainnet
src_path = "../neo3fura/neo3fura_http/app/neo3fura/src.go"
with open(src_path, 'r') as f:
    src = f.read()

# Make Database_Staging struct serve as Database_Mainnet too, or add Mainnet.
# We will just map "mainnet" to Database_Staging configs to avoid massive struct changes
if 'os.ExpandEnv("${RUNTIME}") == "mainnet"' not in src:
    # Find the dev/test/staging if blocks and add mainnet
    src = src.replace('} else if os.ExpandEnv("${RUNTIME}") == "staging" {', '} else if os.ExpandEnv("${RUNTIME}") == "mainnet" || os.ExpandEnv("${RUNTIME}") == "staging" {')

with open(src_path, 'w') as f:
    f.write(src)

