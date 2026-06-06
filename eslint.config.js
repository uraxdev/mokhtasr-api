import js from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default [
	js.configs.recommended,
	eslintConfigPrettier,
	...tseslint.configs.recommended,
	{
		languageOptions: {
			globals: {
				...globals.node
			}
		}
	},
	{
		ignores: ['dist/**']
	}
];
