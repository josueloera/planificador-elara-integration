#!/bin/bash
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
SOURCE="$HERE/Planificador Docente ELARA Integration.app"
DEST_ROOT="$HOME/Applications"
DEST="$DEST_ROOT/Planificador Docente ELARA Integration.app"
if [ ! -d "$SOURCE" ]; then
  echo 'Ejecuta este instalador desde el DMG abierto del Planificador.'
  exit 1
fi
if pgrep -f '/Planificador Docente ELARA Integration.app/Contents/MacOS/' >/dev/null; then
  echo 'Cierra el Planificador antes de instalar. Tus datos se conservaran.'
  exit 1
fi
/usr/bin/codesign --verify --deep --strict "$SOURCE"
mkdir -p "$DEST_ROOT"
STAGING="$(mktemp -d "$DEST_ROOT/.planificador-instalacion.XXXXXX")"
STAGED="$STAGING/Planificador Docente ELARA Integration.app"
/usr/bin/ditto "$SOURCE" "$STAGED"
# Solo esta copia verificada: no se cambia la configuracion global de seguridad.
/usr/bin/xattr -dr com.apple.quarantine "$STAGED"
/usr/bin/codesign --verify --deep --strict "$STAGED"
if [ -e "$DEST" ]; then
  BACKUP="$DEST_ROOT/Planificador Docente ELARA Integration-respaldo-$(date +%Y%m%d-%H%M%S).app"
  if [ -e "$BACKUP" ]; then echo 'Ya existe el respaldo. Intenta de nuevo en un minuto.'; exit 1; fi
  mv "$DEST" "$BACKUP"
  echo "Version anterior conservada en: $BACKUP"
fi
mv "$STAGED" "$DEST"
rmdir "$STAGING"
echo "Instalado en: $DEST"
echo 'Los datos y la licencia no se modificaron.'
if [ "${PLANIFICADOR_TEST:-0}" = '1' ]; then
  open -n "$DEST" --args --remote-debugging-port=9229 --enable-logging=stderr
else
  open "$DEST"
fi
