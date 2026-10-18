#!/bin/sh
# QC: seçilen kareleri render edip 3 sütunlu kontak sayfası üretir. Kullanım: scripts/sheet.sh out/qc/sheetX.png 0,30,60
set -e
OUT=$1; FR=$2; DIR=out/qc/tmp
rm -rf $DIR; node scripts/render.mjs --stills $FR --dir $DIR >/dev/null
N=$(ls $DIR | wc -l); ROWS=$(( (N + 2) / 3 ))
ffmpeg -loglevel error -y -pattern_type glob -i "$DIR/f*.png" -vf "scale=360:640,tile=3x$ROWS" -frames:v 1 $OUT
