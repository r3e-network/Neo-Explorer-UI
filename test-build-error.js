const { execSync } = require('child_process');
try {
  execSync('npm run build', { stdio: 'pipe' });
} catch (e) {
  console.log(e.stdout.toString());
  console.log(e.stderr.toString());
}
