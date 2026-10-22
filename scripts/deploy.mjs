// Builds the game and publishes dist/ to the gh-pages branch (GitHub Pages serves it).
import { execSync } from 'node:child_process';
import { rmSync } from 'node:fs';

const run = (cmd, cwd) => execSync(cmd, { stdio: 'inherit', cwd });
const remote = execSync('git remote get-url origin').toString().trim();

run('npm run build');
rmSync('dist/.git', { recursive: true, force: true });
run('git init -q', 'dist');
run('git checkout -q -B gh-pages', 'dist');
run('git add -A', 'dist');
run('git -c user.name=deploy -c user.email=deploy@localhost commit -q -m "Deploy Berlin Life 3D"', 'dist');
run(`git push -q -f ${remote} gh-pages`, 'dist');
console.log('Published to the gh-pages branch.');
