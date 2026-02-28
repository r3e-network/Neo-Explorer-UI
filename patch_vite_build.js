const fs = require('fs');

let code = fs.readFileSync('src/components/layout/AppHeader.vue', 'utf8');

// Vite attempts to resolve static assets when src is used as an attribute directly, unless ignored or absolute paths correctly mapping to public.
// Sometimes using dynamic binding :src avoids the static analyzer error.
code = code.replace(
  `src="/img/brand/neoline.png"`,
  `:src="'/img/brand/neoline.png'"`
);
code = code.replace(
  `src="/img/brand/o3.png"`,
  `:src="'/img/brand/o3.png'"`
);
code = code.replace(
  `src="/img/brand/walletconnect.png"`,
  `:src="'/img/brand/walletconnect.png'"`
);

fs.writeFileSync('src/components/layout/AppHeader.vue', code);
