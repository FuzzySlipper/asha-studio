import nx from '@nx/eslint-plugin';

const productionScopes = [
  'scope:contracts',
  'scope:domain',
  'scope:command-dispatch',
  'scope:store',
  'scope:interactions',
  'scope:viewport',
  'scope:panels',
  'scope:components',
  'scope:shell',
  'scope:theme',
];

export default [
  ...nx.configs['flat/base'],
  ...nx.configs['flat/typescript'],
  ...nx.configs['flat/javascript'],
  {
    ignores: ['**/dist', '**/out-tsc', '**/.nx', 'old/**'],
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    rules: {
      '@nx/enforce-module-boundaries': [
        'error',
        {
          enforceBuildableLibDependency: true,
          allow: ['^.*/eslint(\\.base)?\\.config\\.[cm]?[jt]s$'],
          depConstraints: [
            {
              sourceTag: 'type:app',
              onlyDependOnLibsWithTags: ['type:lib', 'type:testing'],
            },
            {
              sourceTag: 'type:lib',
              onlyDependOnLibsWithTags: ['type:lib'],
            },
            {
              sourceTag: 'type:testing',
              onlyDependOnLibsWithTags: ['type:lib', 'type:testing'],
            },
            {
              sourceTag: 'type:generator',
              onlyDependOnLibsWithTags: ['type:generator'],
            },
            {
              sourceTag: 'scope:contracts',
              onlyDependOnLibsWithTags: [],
            },
            {
              sourceTag: 'scope:domain',
              onlyDependOnLibsWithTags: ['scope:contracts'],
            },
            {
              sourceTag: 'scope:command-dispatch',
              onlyDependOnLibsWithTags: ['scope:contracts', 'scope:domain'],
            },
            {
              sourceTag: 'scope:store',
              onlyDependOnLibsWithTags: [
                'scope:contracts',
                'scope:domain',
                'scope:command-dispatch',
              ],
            },
            {
              sourceTag: 'scope:interactions',
              onlyDependOnLibsWithTags: ['scope:domain'],
            },
            {
              sourceTag: 'scope:viewport',
              onlyDependOnLibsWithTags: [
                'scope:contracts',
                'scope:domain',
                'scope:components',
                'scope:store',
              ],
            },
            {
              sourceTag: 'scope:panels',
              onlyDependOnLibsWithTags: [
                'scope:domain',
                'scope:components',
                'scope:store',
              ],
            },
            {
              sourceTag: 'scope:components',
              onlyDependOnLibsWithTags: ['scope:domain', 'scope:theme'],
            },
            {
              sourceTag: 'scope:shell',
              onlyDependOnLibsWithTags: productionScopes,
            },
            {
              sourceTag: 'scope:theme',
              onlyDependOnLibsWithTags: [],
            },
            {
              sourceTag: 'scope:testing-fixtures',
              onlyDependOnLibsWithTags: ['scope:contracts', 'scope:domain'],
            },
            {
              sourceTag: 'scope:workspace-generators',
              onlyDependOnLibsWithTags: [],
            },
          ],
        },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/no-extra-non-null-assertion': 'error',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports' },
      ],
    },
  },
];
