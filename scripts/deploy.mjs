// Builds the game and publishes dist/ to the gh-pages branch (GitHub Pages serves it).
import { execSync } from 'node:child_process';
const run = (c, cwd) => execSync(c, { stdio: 'inherit', cwd });
const remote = execSync('git remote get-url origin').toString().trim();
run('npm run build');
run('git init -q', 'dist');
run('git checkout -q -B gh-pages', 'dist');
run('git add -A', 'dist');
run('git -c user.name=deploy -c user.email=deploy@localhost commit -q -m "Deploy Berlin Life 3D"', 'dist');
run(, 'dist');
console.log('Published to the gh-pages branch.');
