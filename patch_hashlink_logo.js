const fs = require('fs');

let code = fs.readFileSync('src/views/Transaction/components/TransactionTable.vue', 'utf8');

// The HashLink component internally generates the Neo / Gas logo now if it detects KNOWN_CONTRACTS or NATIVE_CONTRACTS. 
// So the TransactionTable is rendering its own <img /> right next to the HashLink which also renders an <img />.

const targetImgs = `              <svg
                class="h-4 w-4 flex-shrink-0 text-low"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
              <img v-if="getRecipient(tx) && getRecipient(tx).hash === '0xef4073a0f2b305a38ec4050e4d3d28bc40ea63f5'" :src="'/img/brand/neo.png'" class="w-4 h-4 rounded-full flex-shrink-0" />
              <img v-else-if="getRecipient(tx) && getRecipient(tx).hash === '0xd2a4cff31913016155e38e474a2c06d08be276cf'" :src="'/img/brand/gas.png'" class="w-4 h-4 rounded-full flex-shrink-0" />
              <HashLink :hash="getRecipient(tx).hash" :type="getRecipient(tx).type" :truncated="true" />`;

const cleanImgs = `              <svg
                class="h-4 w-4 flex-shrink-0 text-low"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
              <HashLink :hash="getRecipient(tx).hash" :type="getRecipient(tx).type" :truncated="true" />`;

code = code.replace(targetImgs, cleanImgs);
fs.writeFileSync('src/views/Transaction/components/TransactionTable.vue', code);
