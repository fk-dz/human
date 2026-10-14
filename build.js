const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

async function build() {
  const result = await esbuild.build({
    entryPoints: [path.join(__dirname, 'src/main.js')],
    bundle: true,
    minify: true,
    format: 'iife',
    target: ['es2020'],
    write: false
  });

  const bundledJs = result.outputFiles[0].text;
  const css = fs.readFileSync(path.join(__dirname, 'src/styles.css'), 'utf8');
  const logoSvg = fs.readFileSync(path.join(__dirname, 'fatyak-logo.svg'), 'utf8');
  const template = fs.readFileSync(path.join(__dirname, 'src/template.html'), 'utf8');

  // Escape any accidental </script> inside bundled JS
  const safeJs = bundledJs.replace(/<\/script>/gi, '<\\/script>');

  const finalHtml = template
    .replace('/*__INLINE_CSS__*/', () => css)
    .replace('/*__INLINE_LOGO_SVG__*/', () => logoSvg)
    .replace('/*__INLINE_JS__*/', () => safeJs);

  fs.writeFileSync(path.join(__dirname, 'index.html'), finalHtml, 'utf8');
  fs.writeFileSync(path.join(__dirname, 'app.bundle.js'), bundledJs, 'utf8');
  console.log('Successfully built self-contained index.html (' + (finalHtml.length / 1024).toFixed(1) + ' KB)');
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
