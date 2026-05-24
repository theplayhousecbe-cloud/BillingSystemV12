const { execSync } = require('child_process');
const fs = require('fs');
try {
  const result = execSync('git log --oneline -n 20', { encoding: 'utf8' });
  fs.writeFileSync('git_log_output.txt', result);
  
  const stash = execSync('git stash list', { encoding: 'utf8' });
  fs.writeFileSync('git_stash_output.txt', stash);
} catch (e) {
  fs.writeFileSync('git_log_error.txt', e.message);
}
