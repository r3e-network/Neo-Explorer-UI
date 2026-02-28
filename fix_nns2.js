const fs = require('fs');

let content = fs.readFileSync('src/views/NNS/NNS.vue', 'utf8');

const oldCheck = `      let propData = null;
      if (Array.isArray(props) && props.length > 0) {
        propData = props[0];
      } else if (props && !Array.isArray(props)) {
        propData = props;
      }`;

const newCheck = `      let propData = null;
      if (props && Array.isArray(props.result) && props.result.length > 0) {
        propData = props.result[0];
      } else if (Array.isArray(props) && props.length > 0) {
        propData = props[0];
      } else if (props && !Array.isArray(props) && !props.result) {
        propData = props;
      }`;

content = content.replace(oldCheck, newCheck);

fs.writeFileSync('src/views/NNS/NNS.vue', content);
