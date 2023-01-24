import fs from 'fs';

import { execCmd } from './execCmd';

const createSampleRepo = async (repoDir: string): Promise<void> => {
  fs.rmSync(repoDir, { recursive: true, force: true });
  fs.mkdirSync(repoDir, { recursive: true });

  execCmd(
    repoDir,
    `
    git init

    // root dir
    echo 'test1' > test1
    git add test1
    git commit -m 'feat: adding test1 file to root'
    git tag 30.0.0

    // prefix1 dir
    mkdir -p prefix1

    echo 'test1' > prefix1/test1
    git add prefix1/test1
    git commit -m 'feat: 1 prefix1 adding test1 file'
    git tag prefix1/1.0.0

    echo 'test1b' > prefix1/test1
    git add prefix1/test1
    git commit -m 'fix: 2 prefix1 updating test1 file'
    git tag prefix1/1.0.1

    echo 'test2' > prefix1/test2
    git add prefix1/test2
    git commit -m 'feat: 3 prefix1 creating test2 file'
    git tag prefix1/1.1.0
    git tag prefix1/1.10.0
    git tag prefix1/1.2.0

    echo 'test3' > prefix1/test3
    git add prefix1/test3
    git commit -m 'feat!: 4 prefix1 creating test3 file'
    git tag prefix1/2.0.0
    git tag prefix1/3.2.1
    git tag prefix1/3.3.5

    // prefix2 dir
    mkdir -p prefix2

    echo 'test1' > prefix2/test1
    git add prefix2/test1
    git commit -m 'feat(test): 5 prefix2 adding test2 file'
    git tag prefix2/10.0.0

    echo 'test1b' > prefix2/test1
    git add prefix2/test1
    git commit -m 'fix: 6 prefix2 updating test1 file'
    git tag prefix2/10.0.1

    echo 'test1b' > prefix2/test2
    git add prefix2/test2
    git commit -m 'feat: 7 prefix2 creating test2 file'
    git tag prefix2/10.1.0

    git tag prefix2/10.10.0-beta
    git tag prefix2/10.10.0----RC-SNAPSHOT.12.9.1--.12
    git tag prefix2/10.10.0
    git tag prefix2/10.2.0

    echo 'test3' > prefix2/test3
    git add prefix2/test3
    git commit -m 'feat!: 8 prefix2 creating test3 file'

    git tag prefix2/20.0.0
    git tag prefix2/20.0.0-alpha-volume1
    git tag prefix2/20.10.0


    // add commits without tags yet (candidates for next tags)
    echo 'test1c' > prefix1/test1
    git add prefix1/test1
    echo 'test2c' > prefix1/test2
    git add prefix1/test2
    git commit -m 'fix(user-ui): 9 prefix1 updating test1 and test2 files again for module prefix1'

    echo 'test1c' > prefix2/test1
    git add prefix2/test1
    echo 'test2c' > prefix2/test2
    git add prefix2/test2
    git commit -m 'fix(anyscope): 10 prefix2 updating test1 and test2 files again for module prefix2'

    echo 'test1d' > prefix1/test1
    git add prefix1/test1
    echo 'test2d' > prefix1/test2
    git add prefix1/test2
    git commit -m 'fix(tests): 11 prefix1 updating test1 and test2 files for module prefix1'

    echo 'test1d' > prefix2/test1
    git add prefix2/test1
    echo 'test3d' > prefix2/test3
    git add prefix2/test3
    git commit -m 'feat!: 12 prefix2 adding test3 file for module prefix2'

    echo 'test1c' > prefix2/test1
    git add prefix2/test1
    echo 'test2c' > prefix2/test2
    git add prefix2/test2
    git commit -m 'chore: 13 prefix2 updating test1 and test2 files for module prefix2 closes #45'

    echo 'test4f' > prefix2/test4
    git add prefix2/test4
    echo 'test4f' > prefix1/test4
    git add prefix1/test4
    git commit -m 'feat: 14 prefix1 prefix2 adding test4 for both prefix1 and prefix2'

    `,
  );
};

export { createSampleRepo };
