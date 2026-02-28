const fs = require('fs');
let file = fs.readFileSync('src/composables/useTransferSummary.js', 'utf8');

const oldSummary = `      if (nep17) {
        const amount = formatTokenAmount(nep17.value ?? 0, Number(nep17.decimals ?? 0), 8);
        const symbol = nep17.symbol || nep17.tokenname || "Token";
        const suffix = extraTransferSuffix(nep17Res?.totalCount);
        setSummary(hash, \`\${amount} \${symbol}\${suffix}\`);
        return;
      }`;

const newSummary = `      if (nep17) {
        const amount = formatTokenAmount(nep17.value ?? 0, Number(nep17.decimals ?? 0), 8);
        const symbol = nep17.symbol || nep17.tokenname || "Token";
        const suffix = extraTransferSuffix(nep17Res?.totalCount);
        setSummary(hash, {
          text: \`\${amount} \${symbol}\${suffix}\`,
          contract: nep17.contract || nep17.contractHash || nep17.asset,
          type: 'NEP17'
        });
        return;
      }`;
file = file.replace(oldSummary, newSummary);

const oldNep11 = `      if (nep11) {
        const symbol = nep11.symbol || nep11.tokenname || "NFT";
        const tokenId = nep11.tokenid || nep11.tokenId;
        const suffix = extraTransferSuffix(nep11Res?.totalCount);
        const readableId = truncateTokenId(tokenId);
        setSummary(hash, readableId ? \`1 \${symbol} #\${readableId}\${suffix}\` : \`1 \${symbol}\${suffix}\`);
        return;
      }

      setSummary(hash, "\\u2014");`;

const newNep11 = `      if (nep11) {
        const symbol = nep11.symbol || nep11.tokenname || "NFT";
        const tokenId = nep11.tokenid || nep11.tokenId;
        const suffix = extraTransferSuffix(nep11Res?.totalCount);
        const readableId = truncateTokenId(tokenId);
        setSummary(hash, {
          text: readableId ? \`1 \${symbol} #\${readableId}\${suffix}\` : \`1 \${symbol}\${suffix}\`,
          contract: nep11.contract || nep11.contractHash || nep11.asset,
          type: 'NEP11'
        });
        return;
      }

      setSummary(hash, { text: "\\u2014", contract: null, type: null });`;
file = file.replace(oldNep11, newNep11);

// Error case fix
file = file.replace(/setSummary\(hash, "\\u2014"\);/g, `setSummary(hash, { text: "\\u2014", contract: null, type: null });`);


fs.writeFileSync('src/composables/useTransferSummary.js', file);
