import type { RollupOptions } from 'rollup';
import terser from '@rollup/plugin-terser';
import { pkgName, outputFilePrefix, commonConfig } from './rollup.config';

const globalVariableName = pkgName.charAt(0).toUpperCase() + pkgName.substring(1);

const config: RollupOptions = {
  ...commonConfig,
  output: [
    {
      format: 'umd',
      file: `${outputFilePrefix}.js`,
      exports: 'default',
      name: globalVariableName,
      sourcemap: true
    },
    {
      format: 'umd',
      file: `${outputFilePrefix}.min.js`,
      exports: 'default',
      name: globalVariableName,
      sourcemap: true,
      plugins: [terser()]
    }
  ]
};

export default config;
