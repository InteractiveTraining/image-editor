import {Config} from '@stencil/core';
import {sass} from '@stencil/sass';

export const config: Config = {
  namespace: 'it-image-editor',
  globalScript: 'src/global-script.ts',
  plugins: [
    sass()
  ],
  outputTargets: [
    {
      type: 'dist',
      dir: 'dist'
    }
  ],
  devServer: {
    openBrowser: false
  },
  preamble: '(C) 2019 Interactive.Training https://interactive.training'
};
