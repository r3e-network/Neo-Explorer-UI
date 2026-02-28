const fs = require('fs');

let code = fs.readFileSync('src/components/trace/ExecutionTraceView.vue', 'utf8');

code = code.replace(/<NotificationDecoder/g, '<EnrichedNotification');
code = code.replace(/import NotificationDecoder from "\.\/NotificationDecoder\.vue";/, 'import EnrichedNotification from "./EnrichedNotification.vue";');

fs.writeFileSync('src/components/trace/ExecutionTraceView.vue', code);
