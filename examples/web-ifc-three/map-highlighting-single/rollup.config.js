import resolve from '@rollup/plugin-node-resolve';

export default {
  input: 'examples/web-ifc-three/map-highlighting-single/app.js',
  output: [
    {
      format: 'esm',
      file: 'examples/web-ifc-three/map-highlighting-single/bundle.js'
    },
  ],
  plugins: [
    resolve(),
  ]
};