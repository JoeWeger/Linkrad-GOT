// Nach dem Packen: Programmname, Firma, Version und Symbol in die .exe schreiben (reines JS, kein Wine nötig).
// Ohne das zeigt Windows in der Taskleiste und im Task-Manager „Electron“.
const fs = require('node:fs');
const path = require('node:path');

exports.default = async function afterPack(ctx) {
  if (ctx.electronPlatformName !== 'win32') return;
  const ResEdit = require('resedit');
  const { productFilename, info } = ctx.packager.appInfo;
  const exe = path.join(ctx.appOutDir, `${productFilename}.exe`);
  const res = ResEdit.NtExecutableResource.from(ResEdit.NtExecutable.from(fs.readFileSync(exe)));
  const ex = ResEdit.NtExecutable.from(fs.readFileSync(exe));
  const rs = ResEdit.NtExecutableResource.from(ex);

  // Symbol ersetzen
  const ico = ResEdit.Data.IconFile.from(fs.readFileSync(path.join(__dirname, 'icon.ico')));
  const groups = ResEdit.Resource.IconGroupEntry.fromEntries(rs.entries);
  for (const g of groups) {
    ResEdit.Resource.IconGroupEntry.replaceIconsForResource(rs.entries, g.id, g.lang, ico.icons.map((i) => i.data));
  }

  // Versionsinfo
  const name = ctx.packager.appInfo.productName;
  const version = ctx.packager.appInfo.version;
  const [vi] = ResEdit.Resource.VersionInfo.fromEntries(rs.entries);
  const lang = { lang: 1033, codepage: 1200 };
  vi.setStringValues(lang, {
    FileDescription: name, ProductName: name, InternalName: name, CompanyName: 'getontop',
    OriginalFilename: `${productFilename}.exe`, LegalCopyright: `© ${new Date().getFullYear()} getontop`,
  });
  const v = version.split('.').map(Number);
  vi.setFileVersion(v[0], v[1], v[2], 0, 1033);
  vi.setProductVersion(v[0], v[1], v[2], 0, 1033);
  vi.outputToResourceEntries(rs.entries);

  rs.outputResource(ex);
  fs.writeFileSync(exe, Buffer.from(ex.generate()));
  console.log(`  • Programmname „${name}“ ${version} in ${path.basename(exe)} eingetragen`);
  void res;
};
