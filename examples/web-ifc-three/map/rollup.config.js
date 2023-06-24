import resolve from '@rollup/plugin-node-resolve';

export default {
  input: 'examples/web-ifc-three/map/app.js',
  output: [
    {
      format: 'esm',
      file: 'examples/web-ifc-three/map/bundle.js'
    },
  ],
  plugins: [
    resolve(),
  ]
};