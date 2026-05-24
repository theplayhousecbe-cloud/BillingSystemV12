const { execSync } = require('child_process');
try {
  const result = execSync('git stash show -p stash@{0}', { encoding: 'utf8' });
  console.log(result);
} catch (e) {
  console.error(e.message);
}
