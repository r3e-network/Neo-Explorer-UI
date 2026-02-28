#!/bin/bash
# Update dbname from neofura_mainnet to neofura in config.yml
sed -i 's/dbname: "neofura_mainnet"/dbname: "neofura"/' neo3fura/config.yml
sed -i 's/database: "neofura_mainnet"/database: "neofura"/' neo3fura/config.yml
