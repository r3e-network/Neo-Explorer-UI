const fs = require('fs');

let code = fs.readFileSync('src/views/Tools/NeoFSTool.vue', 'utf8');

const modalHtml = `
    <!-- View Objects Modal -->
    <div v-if="showObjectsModal" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4">
      <div class="bg-surface w-full max-w-2xl rounded-2xl shadow-2xl border border-line-soft overflow-hidden relative z-10 flex flex-col max-h-[85vh]">
        <div class="px-6 py-4 border-b border-line-soft flex items-center justify-between shrink-0">
          <div>
            <h2 class="text-lg font-bold text-high">Objects in Container</h2>
            <p class="text-xs text-mid font-mono mt-1">{{ activeContainer?.name || activeContainer?.id }}</p>
          </div>
          <button @click="showObjectsModal = false" class="text-low hover:text-high"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg></button>
        </div>
        
        <div class="p-6 overflow-y-auto flex-1 relative min-h-[300px]">
           <div v-if="isLoadingObjects" class="absolute inset-0 flex flex-col items-center justify-center bg-surface/80 backdrop-blur-sm z-20">
             <svg class="animate-spin h-8 w-8 text-cyan-500 mb-4" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
             <p class="text-sm font-medium text-high">Fetching objects from NeoFS nodes...</p>
           </div>
           
           <div v-else-if="containerObjects.length === 0" class="text-center py-12 text-mid flex flex-col items-center justify-center h-full">
              <svg class="h-12 w-12 text-low mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path></svg>
              <p>No objects found in this container.</p>
           </div>
           
           <div v-else class="space-y-3">
             <div v-for="(obj, i) in containerObjects" :key="i" class="flex items-center justify-between p-4 rounded-xl border border-line-soft bg-surface-muted hover:border-cyan-400/30 transition-colors group">
                <div class="flex items-center gap-3 overflow-hidden">
                  <div class="h-10 w-10 shrink-0 rounded-lg bg-white dark:bg-slate-800 border border-line-soft flex items-center justify-center text-cyan-500">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                  </div>
                  <div class="min-w-0">
                    <p class="text-sm font-semibold text-high truncate">{{ obj.name }}</p>
                    <p class="text-xs text-mid font-mono truncate mt-0.5" title="Object ID">OID: {{ obj.id }}</p>
                  </div>
                </div>
                <div class="flex items-center gap-4 shrink-0 pl-4">
                  <span class="text-xs text-mid hidden sm:inline-block">{{ obj.size }}</span>
                  <div class="flex items-center gap-2">
                    <button @click="copyOid(obj.id)" class="text-low hover:text-cyan-500 transition-colors p-1" title="Copy Object ID">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
                    </button>
                    <button class="text-low hover:text-cyan-500 transition-colors p-1" title="Download">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                    </button>
                  </div>
                </div>
             </div>
           </div>
        </div>
      </div>
    </div>
    
    <!-- Upload Modal -->
`;

code = code.replace('<!-- Upload Modal -->', modalHtml);

const scriptAdditions = `
async function viewObjects(container) {
  activeContainer.value = container;
  showObjectsModal.value = true;
  isLoadingObjects.value = true;
  containerObjects.value = [];
  
  // Mock fetching objects
  await new Promise(resolve => setTimeout(resolve, 1200));
  
  // Generate fake objects
  const mockObjects = [];
  const count = container.objectCount > 0 ? Math.min(container.objectCount, 8) : 0;
  
  for(let i=0; i<count; i++) {
    mockObjects.push({
      name: container.name.includes('Logos') ? \`logo_v\${i+1}.png\` : \`backup_part_\${i+1}.tar.gz\`,
      id: Array.from({length: 44}, () => '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'[Math.floor(Math.random() * 58)]).join(''),
      size: (Math.random() * 5 + 0.1).toFixed(2) + ' MB'
    });
  }
  
  containerObjects.value = mockObjects;
  isLoadingObjects.value = false;
}
`;

code = code.replace(`function viewObjects(container) {
  toast.info(\`Redirecting to view objects for: \${container.name}\`);
}`, scriptAdditions);

code = code.replace(`const showUploadModal = ref(false);`, `const showUploadModal = ref(false);\nconst showObjectsModal = ref(false);\nconst activeContainer = ref(null);\nconst isLoadingObjects = ref(false);\nconst containerObjects = ref([]);\n\nfunction copyOid(id) {\n  navigator.clipboard.writeText(id);\n  toast.success("Object ID copied to clipboard");\n}`);

fs.writeFileSync('src/views/Tools/NeoFSTool.vue', code);
