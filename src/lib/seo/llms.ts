// Seções do llms.txt sobre o conversor/editor de imagens e o app Motion (Lottie).
// O integrador anexa llmsImageSection() e llmsMotionSection() ao llms.txt.
import { FORMATS, TOP_PAIRS } from './formats.ts';
import { COPY, LANGS, MOTION_COPY, MOTION_KINDS, hubSlug, motionSlug, pairSlug, type Lang } from './pages.ts';
import { abs } from './site.ts';

const LANG_NAME: Record<Lang, string> = { pt: 'Português (pt-BR)', en: 'English', es: 'Español', fr: 'Français' };
const HUB_KINDS = ['converter', 'editor', 'remove-bg', 'compress', 'resize'] as const;

export function llmsImageSection(): string {
	const perLang = LANGS.map((lang) => {
		const c = COPY[lang];
		const hubs = HUB_KINDS.map((k) => `- [${c.hubs[k].label}](${abs('/' + hubSlug(k, lang))})`).join('\n');
		const pairs = TOP_PAIRS.slice(0, 20)
			.map(([a, b]) => `- [${c.pairLabel(FORMATS[a].label, FORMATS[b].label)}](${abs('/' + pairSlug(a, b, lang))})`)
			.join('\n');
		return `### ${LANG_NAME[lang]}\n\n${hubs}\n${pairs}`;
	}).join('\n\n');

	return `## Image converter and image editor

Free online image converter and Paint.NET-style image editor that run 100% in the browser. Files are never uploaded: decoding, encoding, filters and even the AI models run on the user's device. No sign-up, no watermark, no daily limit.

### Converter
- Input: JPG/JPEG, PNG, WebP, AVIF, GIF (first frame), BMP, ICO, SVG, HEIC/HEIF (iPhone photos), TIFF, PSD (Photoshop, flattened).
- Output: JPG, PNG, WebP, AVIF, GIF, BMP, ICO (multi-size favicon, 16–256 px), TIFF, PDF (one page per image), SVG (real vectorization/tracing with a chosen color count), PSD.
- Batch conversion of many files in parallel (Web Workers). Download individually, as a ZIP, or save to a folder (Chrome/Edge).
- Options: quality, compress to a target size in KB, resize (percent, fit inside a box, exact pixels), background color for formats without transparency.
- EXIF orientation is respected; EXIF/GPS metadata is stripped from the output for privacy.

### Editor
- Layers, blend modes, selections, magic wand (5 algorithms), 39 filters with live preview, text with 3D/neon effects, editable shapes.
- Local AI smart select and background removal (models downloaded once, run on device via WebGPU or WebAssembly).
- Opens PSD with layers; exports PNG, JPG, WebP, AVIF, BMP, ICO, layered PSD and vector SVG. Works on phones (touch, pinch zoom).

UI languages: Português, English, Español, Français. Each landing page below opens the app with the right preset and has the same content in all four languages (hreflang alternates). Full list: ${abs('/sitemap.xml')}

${perLang}
`;
}

export function llmsMotionSection(): string {
	const perLang = LANGS.map((lang) => {
		const m = MOTION_COPY[lang];
		const links = MOTION_KINDS.map((k) => `- [${m.pages[k].label}](${abs('/' + motionSlug(k, lang))})`).join('\n');
		return `### ${LANG_NAME[lang]}\n\n${links}`;
	}).join('\n\n');

	return `## Motion: Lottie viewer, editor and animation maker

Free online Lottie player, Lottie editor and motion/animation maker that run 100% in the browser. Files are never uploaded: parsing, rendering and video encoding happen on the user's device. No sign-up, no watermark. Works on phones.

### Viewer / player
- Opens Bodymovin/Lottie .json and dotLottie .lottie files by drag and drop.
- Play, pause, scrub frame by frame, playback speed, loop, background (transparent, white, black or custom color).
- Shows canvas size, fps, frame count, duration and the layer list (including precomps).

### Editor
- Global color replacement from the palette extracted from the file, text editing, hide/remove layers and precomps.
- Change speed and fps, trim the frame range, resize the canvas; undo.
- Limitations: After Effects expressions are not evaluated (static values are used); text layers render with system fonts.

### Creator
- Timeline with keyframes and easing: linear, ease in/out, back, elastic, bounce, hold.
- Shape layers (rectangle, ellipse, star, polygon, imported SVG paths), text layers with per-character animation (typewriter, fade, slide, scale), image layers.
- 30+ one-click presets (fade, slide, pop, zoom, spin, bounce, draw stroke, typewriter, pulse, shake, wiggle, heartbeat, loops) and starter templates (logo reveal, lower third, loading spinner, like heart, notification badge, typewriter text).

### Export
- Lottie JSON, dotLottie (.lottie), GIF (with transparency), MP4 (H.264 via WebCodecs, needs a modern browser), WebM, PNG sequence (ZIP), single frame as PNG or SVG.

Each landing page below opens the Motion app in the right mode (view/edit or create), some with the export format preselected, and exists in all four languages (hreflang alternates).

${perLang}
`;
}
