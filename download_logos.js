const fs = require('fs');
const https = require('https');

const flmUrl = 'https://flamingo.finance/img/FLM.png';
const frankUrl = 'https://flamingo.finance/img/FRANK.dd4fc974.svg';

const flmPath = 'src/assets/gui/0xf0151f528127558851b39c2cd8aa47da7418ab28.png';
const frankPath = 'src/assets/gui/0xa06cfd7ae9dd7befb7bf8e5b8c5902c969182de0.png';

https.get(flmUrl, (res) => {
    if (res.statusCode === 200) {
        const file = fs.createWriteStream(flmPath);
        res.pipe(file);
        file.on('finish', () => {
            file.close();
            console.log('FLM downloaded');
        });
    } else {
        console.log('Failed to download FLM', res.statusCode);
    }
});

https.get(frankUrl, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        const match = data.match(/data:image\/png;base64,([^"]+)/);
        if (match && match[1]) {
            const buffer = Buffer.from(match[1], 'base64');
            fs.writeFileSync(frankPath, buffer);
            console.log('FRANK extracted and saved');
        } else {
            console.log('Could not find base64 in FRANK svg');
            // Maybe fallback to direct download?
            const fallbackUrl = 'https://raw.githubusercontent.com/flamingo-finance/flamingo-contract-sdk/main/src/constants/tokens.ts';
        }
    });
});
