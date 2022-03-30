module.exports = {
    branches: [
        'main',
    ],
    plugins: [
        '@semantic-release/commit-analyzer',
        '@semantic-release/release-notes-generator',
        [
            '@semantic-release/changelog',
            {
                changelogFile: 'CHANGELOG.md',
                changelogTitle: '# Changelog',
            },
        ],
        'semantic-release-license',
        '@semantic-release/npm',
        [
            '@semantic-release/git',
            {
                assets: ['CHANGELOG.md', 'package.json', 'package-lock.json', 'LICENSE'],
                message: 'chore(release): set `package.json` to ${nextRelease.version} [skip ci]'
                    + '\n\n${nextRelease.notes}',
            },
        ],
    ],
};
