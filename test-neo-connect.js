function getWalletErrorMessage(err) {
  if (!err) return "";
  if (typeof err === "string") return err;

  const candidates = [
    err.description,
    err.message,
    err.error?.description,
    err.error?.message,
    err.data?.description,
    err.data?.message,
  ];

  for (const value of candidates) {
    if (typeof value === "string" && value.trim()) return value;
  }

  return "";
}

function isDapiConnectionDenied(err) {
  const type = String(err?.type || "").toUpperCase();
  const msg = getWalletErrorMessage(err).toLowerCase();
  
  return type === "CONNECTION_DENIED" || type === "CANCELED" || /refused to process this request|connection denied|user canceled|canceled/.test(msg);
}

function toConnectionDeniedError(providerName) {
  return new Error(
    `${providerName} refused this request. Open ${providerName}, unlock it, approve this site, and retry.`
  );
}

async function requestAccountWithDeniedRetry(providerName, getAccount, prepareRetry = null) {
  try {
    return await getAccount();
  } catch (err) {
    if (!isDapiConnectionDenied(err)) {
      console.log('Error NOT denied:', err);
      throw err;
    }

    if (typeof prepareRetry === "function") {
      try {
        await prepareRetry();
      } catch (e) {
        console.log('Retry prep failed', e);
      }
    }

    try {
      return await getAccount();
    } catch (retryErr) {
      if (isDapiConnectionDenied(retryErr)) {
        throw toConnectionDeniedError(providerName);
      }
      console.log('Retry err NOT denied:', retryErr);
      throw retryErr;
    }
  }
}

const mockErr = {
    type: 'CONNECTION_DENIED',
    description: 'NeoLine refused to process this request.'
};

let callCount = 0;
const mockGetAccount = async () => {
    callCount++;
    throw mockErr;
};

requestAccountWithDeniedRetry('NeoLine', mockGetAccount, async () => { console.log('preparing retry...'); })
    .catch(err => console.log('Final Error thrown:', err.message));
