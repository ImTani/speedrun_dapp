#!/usr/bin/env bash
# Renders every brand and listing asset through the capture server (capture-server.cjs, one
# Chromium) from the dev-only pages at /_brand and /preview. Needs `next dev -p 3200` running
# in apps/web and the capture server on 3299. Run from anywhere: bash render-all.sh [only]
# where `only` is one of: logo wordmark cover key masks shots frames icons (default: all).
set -euo pipefail

HERE=$(cd "$(dirname "$0")" && pwd)
SUB=$(cd "$HERE/../.." && pwd)
BRAND=$(cygpath -m "$SUB/brand" 2>/dev/null || echo "$SUB/brand")
LIST=$(cygpath -m "$SUB/listing" 2>/dev/null || echo "$SUB/listing")
APP=http://localhost:3200
CAP=http://localhost:3299/shot
ONLY=${1:-all}
mkdir -p "$SUB/brand" "$SUB/listing/screenshots/raw"

# job <json>: send one capture, fail loudly if it did not land.
job() {
	local r
	r=$(curl -s "$CAP" -d "$1")
	echo "$r"
	case "$r" in *'"ok":true'*) ;; *) echo "capture failed" >&2; exit 1 ;; esac
}
# j key=value ...: build the job JSON (values are JSON literals or plain strings).
j() { node -e '
const o = {};
for (const kv of process.argv.slice(1)) {
	const i = kv.indexOf("=");
	const k = kv.slice(0, i), v = kv.slice(i + 1);
	try { o[k] = JSON.parse(v); } catch { o[k] = v; }
}
console.log(JSON.stringify(o));' "$@"; }
want() { [ "$ONLY" = all ] || [ "$ONLY" = "$1" ]; }

if want logo; then
	job "$(j url="$APP/_brand?a=logo&bg=dark" out="$BRAND/logo-512.png" w=512 h=512 dsf=1 ready='[data-ready]' wait=1500)"
	job "$(j url="$APP/_brand?a=logo&bg=dark" out="$BRAND/logo-1024.png" w=512 h=512 dsf=2 ready='[data-ready]' wait=1500)"
	job "$(j url="$APP/_brand?a=logo&bg=clear" out="$BRAND/logo-transparent-1024.png" w=512 h=512 dsf=2 clear=true ready='[data-ready]' wait=1500)"
	job "$(j url="$APP/_brand?a=logo&bg=maskable" out="$BRAND/.logo-maskable-1024.png" w=512 h=512 dsf=2 ready='[data-ready]' wait=1500)"
	job "$(j url="$APP/_brand?a=logosvg&bg=dark" w=512 h=512 ready='[data-ready]' wait=1500 after=800 dump='#svgout' dumpOut="$BRAND/logo.svg")"
	job "$(j url="$APP/_brand?a=logosvg&bg=maskable" w=512 h=512 ready='[data-ready]' wait=1500 after=800 dump='#svgout' dumpOut="$BRAND/logo-maskable.svg")"
fi

if want icons || want logo; then
	# PWA icons: downscaled from the 2x renders (lanczos) so the glass stays crisp.
	mkdir -p "$SUB/brand/icons"
	ffmpeg -loglevel error -y -i "$SUB/brand/logo-1024.png" -vf scale=192:192:flags=lanczos "$SUB/brand/icons/icon-192.png"
	ffmpeg -loglevel error -y -i "$SUB/brand/logo-1024.png" -vf scale=512:512:flags=lanczos "$SUB/brand/icons/icon-512.png"
	ffmpeg -loglevel error -y -i "$SUB/brand/.logo-maskable-1024.png" -vf scale=512:512:flags=lanczos "$SUB/brand/icons/icon-maskable-512.png"
	ffmpeg -loglevel error -y -i "$SUB/brand/logo-1024.png" -vf scale=180:180:flags=lanczos "$SUB/brand/icons/apple-touch-icon-180.png"
	rm -f "$SUB/brand/.logo-maskable-1024.png"
fi

if want wordmark; then
	for bg in dark clear; do
		name=$([ $bg = clear ] && echo transparent || echo dark)
		job "$(j url="$APP/_brand?a=wordmark&lay=stack&bg=$bg" out="$BRAND/wordmark-stacked-$name@2x.png" w=800 h=400 dsf=2 clear=$([ $bg = clear ] && echo true || echo false) ready='[data-ready]' wait=500)"
		job "$(j url="$APP/_brand?a=wordmark&lay=row&bg=$bg&pad=0.07" out="$BRAND/wordmark-horizontal-$name@2x.png" w=1200 h=240 dsf=2 clear=$([ $bg = clear ] && echo true || echo false) ready='[data-ready]' wait=500)"
	done
fi

if want cover; then
	job "$(j url="$APP/_brand?a=cover" out="$LIST/cover-840x300.png" w=840 h=300 dsf=1 ready='[data-ready]' wait=2000)"
	job "$(j url="$APP/_brand?a=cover" out="$LIST/cover-1680x600@2x.png" w=840 h=300 dsf=2 ready='[data-ready]' wait=2000)"
fi

if want key; then
	job "$(j url="$APP/_brand?a=key" out="$BRAND/keyart-1920x1080.png" w=1920 h=1080 dsf=1 ready='[data-ready]' wait=3000)"
	job "$(j url="$APP/_brand?a=key&mark=0" out="$BRAND/keyart-clean-1920x1080.png" w=1920 h=1080 dsf=1 ready='[data-ready]' wait=3000)"
fi

if want masks; then
	job "$(j url="$APP/_brand?a=masks" out="$BRAND/masks-row.png" w=1540 h=340 dsf=2 ready='[data-ready]' wait=800)"
fi

RAW="$LIST/screenshots/raw"
if want shots; then
	P="$APP/preview"
	VIGIL='(()=>{const all=[...document.querySelectorAll("h2,h3,p,span,div")];const v=all.find(e=>e.children.length===0&&/Vigil/.test(e.textContent||""));if(v){v.scrollIntoView({block:"start"});let s=v.parentElement;while(s&&s.scrollHeight<=s.clientHeight+2)s=s.parentElement;if(s)s.scrollTop-=34;}})()'
	UNVEIL='(()=>{const b=[...document.querySelectorAll("button")].find(e=>/Unveil/.test(e.textContent||""));b&&b.click();})()'
	SCRY='(()=>{const b=[...document.querySelectorAll("button")].find(e=>/Scry/.test(e.textContent||""));b&&b.click();})()'
	phone() { echo w=390 h=844 dsf=2 reduce=false; }
	job "$(j url="$P?screen=gathering&state=reveal&freeze=devour" out="$RAW/01-gathering.png" $(phone) wait=14000)"
	job "$(j url="$P?screen=hud&state=full" out="$RAW/02-collect.png" $(phone) wait=9000 eval="$VIGIL" after=2500)"
	job "$(j url="$P?screen=onboarding&state=stirring" out="$RAW/03-practice.png" $(phone) wait=9000 eval="$UNVEIL" after=4500)"
	job "$(j url="$P?screen=spire&state=mid" out="$RAW/04-spire.png" $(phone) wait=9000)"
	job "$(j url="$P?screen=reliquary&state=pity" out="$RAW/05-reliquary.png" $(phone) wait=9000 eval="$SCRY" after=6000)"
fi

if want frames || want shots; then
	frame() {
		job "$(j url="$APP/_brand?a=frame&shot=$1&cap=$(node -p 'encodeURIComponent(process.argv[1])' "$2")" out="$LIST/screenshots/$1.png" w=1080 h=1920 dsf=1 ready='[data-ready]' wait=800 shots="$RAW")"
	}
	frame 01-gathering "Your Fragment fights while you’re away"
	frame 02-collect "Collect what it earned"
	frame 03-practice "Learn by playing"
	frame 04-spire "Climb the Spire"
	frame 05-reliquary "Scry for cosmetics"
fi
echo done
