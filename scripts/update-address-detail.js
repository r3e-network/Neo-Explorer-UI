const fs = require('fs');
const path = 'src/views/Account/AddressDetail.vue';
let content = fs.readFileSync(path, 'utf8');

// Also import NATIVE_CONTRACTS and KNOWN_CONTRACTS
content = content.replace(
  'import { accountService, candidateService, contractService, tokenService } from "@/services";',
  'import { accountService, candidateService, contractService, tokenService } from "@/services";\nimport { NATIVE_CONTRACTS } from "@/constants";\nimport { KNOWN_CONTRACTS } from "@/constants/knownContracts";'
);

const newLoadAssets = `async function loadAssets(addr) {
  const currentRequestId = addressRequestId;
  assetsLoading.value = true;
  assetsError.value = "";

  try {
    const response = await accountService.getAssets(addr);
    if (currentRequestId !== addressRequestId) return;
    
    let rawAssets = [];
    if (Array.isArray(response)) {
      rawAssets = response;
    } else if (response && Array.isArray(response.result)) {
      rawAssets = response.result;
    }

    // Enhance assets with token metadata (since GetAssetsHeldByAddress only returns balance + hash)
    const enhancedPromises = rawAssets.map(async (asset) => {
      let hash = asset?.hash || asset?.asset || asset?.contracthash || asset?.contractHash || asset?.assethash || "";
      hash = hash.toLowerCase();
      if (!hash) return asset;
      if (!hash.startsWith("0x")) hash = "0x" + hash;

      // Fast path for known contracts
      const native = NATIVE_CONTRACTS[hash];
      const known = KNOWN_CONTRACTS[hash];
      
      let tokenname = asset.tokenname || asset.name;
      let symbol = asset.symbol;
      let decimals = asset.decimals;
      let standard = asset.standard || asset.type;

      if (native) {
        tokenname = tokenname || native.name;
        symbol = symbol || native.symbol;
        decimals = decimals !== undefined ? decimals : native.decimals;
        standard = standard || "NEP17";
      } else if (known) {
        tokenname = tokenname || known.name;
        symbol = symbol || known.symbol;
        decimals = decimals !== undefined ? decimals : known.decimals;
        standard = standard || "NEP17"; // Assuming KNOWN_CONTRACTS are usually NEP17 in this context
      }

      // If still missing essential info, fetch from API
      if (!tokenname || standard === undefined || decimals === undefined) {
        try {
          const info = await tokenService.getByHash(hash);
          if (info) {
             tokenname = tokenname || info.tokenname || info.name || info.symbol;
             symbol = symbol || info.symbol || info.name;
             decimals = decimals !== undefined ? decimals : info.decimals;
             standard = standard || info.type || info.standard;
          }
        } catch (e) {
          // Ignore metadata fetch error
        }
      }

      return {
        ...asset,
        tokenname,
        symbol,
        decimals,
        standard,
        type: standard
      };
    });

    const enhancedAssets = await Promise.all(enhancedPromises);
    if (currentRequestId !== addressRequestId) return;

    assets.value = enhancedAssets;

    const split = splitAddressAssets(assets.value);
    fungibleAssets.value = split.fungibleAssets;
    nftAssets.value = split.nftAssets;
    tokenCount.value = assets.value.length;
  } catch {
    if (currentRequestId !== addressRequestId) return;
    assetsError.value = "Failed to load token holdings";
  } finally {
    if (currentRequestId === addressRequestId) {
      assetsLoading.value = false;
    }
  }
}`;

// need to replace the newLoadAssets created by previous script run
const previousLoadAssets = `async function loadAssets(addr) {
  const currentRequestId = addressRequestId;
  assetsLoading.value = true;
  assetsError.value = "";

  try {
    const response = await accountService.getAssets(addr);
    if (currentRequestId !== addressRequestId) return;
    
    let rawAssets = [];
    if (Array.isArray(response)) {
      rawAssets = response;
    } else if (response && Array.isArray(response.result)) {
      rawAssets = response.result;
    }

    // Enhance assets with token metadata (since GetAssetsHeldByAddress only returns balance + hash)
    const enhancedPromises = rawAssets.map(async (asset) => {
      const hash = asset?.hash || asset?.asset || asset?.contracthash || asset?.contractHash || asset?.assethash;
      if (!hash) return asset;

      try {
        const info = await tokenService.getByHash(hash);
        if (info) {
          return {
            ...asset,
            tokenname: asset.tokenname || info.tokenname || info.name || info.symbol,
            symbol: asset.symbol || info.symbol || info.name,
            decimals: asset.decimals !== undefined ? asset.decimals : info.decimals,
            standard: asset.standard || info.type || info.standard,
            type: asset.type || info.type || info.standard
          };
        }
      } catch (e) {
        // Ignore metadata fetch error for individual asset
      }
      return asset;
    });

    const enhancedAssets = await Promise.all(enhancedPromises);
    if (currentRequestId !== addressRequestId) return;

    assets.value = enhancedAssets;

    const split = splitAddressAssets(assets.value);
    fungibleAssets.value = split.fungibleAssets;
    nftAssets.value = split.nftAssets;
    tokenCount.value = assets.value.length;
  } catch {
    if (currentRequestId !== addressRequestId) return;
    assetsError.value = "Failed to load token holdings";
  } finally {
    if (currentRequestId === addressRequestId) {
      assetsLoading.value = false;
    }
  }
}`;

content = content.replace(previousLoadAssets, newLoadAssets);

fs.writeFileSync(path, content);
console.log('Updated AddressDetail.vue again');
