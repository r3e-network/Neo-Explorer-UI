const fs = require('fs');

let code = fs.readFileSync('src/components/common/TxListItem.vue', 'utf8');

const targetImgs = `          <div v-if="recipient" class="flex items-center gap-1.5">
            <img v-if="recipient.hash === '0xef4073a0f2b305a38ec4050e4d3d28bc40ea63f5'" :src="'/img/brand/neo.png'" class="w-3.5 h-3.5 rounded-full flex-shrink-0" />
            <img v-else-if="recipient.hash === '0xd2a4cff31913016155e38e474a2c06d08be276cf'" :src="'/img/brand/gas.png'" class="w-3.5 h-3.5 rounded-full flex-shrink-0" />
            <HashLink :hash="recipient.hash" :type="recipient.type" :copyable="false" />
          </div>`;

const cleanImgs = `          <div v-if="recipient" class="flex items-center gap-1.5">
            <HashLink :hash="recipient.hash" :type="recipient.type" :copyable="false" />
          </div>`;

code = code.replace(targetImgs, cleanImgs);
fs.writeFileSync('src/components/common/TxListItem.vue', code);
