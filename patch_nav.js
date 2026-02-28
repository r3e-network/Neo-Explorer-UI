const fs = require('fs');

let desktop = fs.readFileSync('src/components/layout/DesktopNav.vue', 'utf8');
desktop = desktop.replace('<router-link to="/nns" class="dropdown-link">Neo Name Service</router-link>', '<router-link to="/nns" class="dropdown-link">Neo Name Service</router-link>\n        <router-link to="/tools" class="dropdown-link">Tools</router-link>');
fs.writeFileSync('src/components/layout/DesktopNav.vue', desktop);

let mobile = fs.readFileSync('src/components/layout/MobileMenu.vue', 'utf8');
mobile = mobile.replace('<router-link to="/nns" class="mobile-sublink" @click="$emit(\'close\')">Neo Name Service</router-link>', '<router-link to="/nns" class="mobile-sublink" @click="$emit(\'close\')">Neo Name Service</router-link>\n            <router-link to="/tools" class="mobile-sublink" @click="$emit(\'close\')">Tools</router-link>');
fs.writeFileSync('src/components/layout/MobileMenu.vue', mobile);
