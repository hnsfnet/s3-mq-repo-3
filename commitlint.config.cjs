module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',
        'fix',
        'docs',
        'style',
        'refactor',
        'perf',
        'test',
        'build',
        'ci',
        'chore',
        'revert'
      ]
    ],
    'subject-case': [0, 'always', 'lower-case'],
    'header-max-length': [2, 'always', 100],
    'subject-empty': [0, 'never'],
    'type-empty': [0, 'never']
  }
};
