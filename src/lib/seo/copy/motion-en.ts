// Textos em inglês das páginas de SEO do app Motion (visualizador, editor e criador de Lottie).
import type { MotionCopy } from './types.ts';

export const motionEn: MotionCopy = {
	pages: {
		'lottie-viewer': {
			label: 'Lottie viewer',
			title: 'Lottie Viewer — Preview JSON and .lottie Files Online',
			description: 'Open Lottie JSON and dotLottie files in your browser: play, pause, scrub frame by frame, change speed and background, and see fps, frames and layers.',
			h1: 'Online Lottie viewer and player',
			lead: 'Drop a Bodymovin/Lottie .json or a .lottie file and it starts playing right away. Check every frame, test it on light and dark backgrounds and read its technical details before it goes into your app or site.',
			sections: [
				{ h2: 'What the Lottie viewer does', body: [
					'Lottie is the vector animation format exported from After Effects with the Bodymovin plugin, and dotLottie (.lottie) is its zipped version with images and several animations in one file. The viewer plays both without installing anything.',
					'It is the quickest way to answer the questions a designer or developer has before shipping: does the file open, how long is it, how heavy is it, and does it look right on the background where it will live?'
				] },
				{ h2: 'How the player works', body: [
					'Play, pause and drag the timeline to scrub frame by frame, or step one frame at a time. Change the playback speed, turn the loop on or off, and switch the background between transparent, white, black or any custom color.',
					'The info panel shows canvas size, frame rate, total frames, duration and the list of layers, including precomps, so you can spot heavy or hidden content quickly.'
				] }
			],
			steps: [
				'Drag a .json or .lottie file onto the page, or tap to pick it.',
				'Play, pause or scrub the timeline to inspect any frame.',
				'Try different speeds, loop settings and backgrounds.',
				'Check the size, fps, frames, duration and layer list in the info panel.',
				'Optionally edit it or export it as GIF, MP4, WebM or dotLottie.'
			],
			faq: [
				{ q: 'Why does my Lottie look different here than in After Effects?', a: 'Lottie only supports part of what After Effects can do. Effects, some blend modes, 3D layers and expressions are not exported or are ignored by players, so what you see here is close to what web and mobile players will show.' },
				{ q: 'Can I see which layers make a file heavy?', a: 'Yes. The layer list shows every layer and precomp, and embedded images are the usual suspects when a Lottie weighs hundreds of kilobytes.' }
			]
		},
		'lottie-editor': {
			label: 'Lottie editor',
			title: 'Lottie Editor — Change Colors, Text and Layers Online',
			description: 'Edit Lottie animations online: change colors across the file, rewrite texts, hide or remove layers, trim frames, change speed and resize the canvas.',
			h1: 'Online Lottie editor',
			lead: 'Adjust a Lottie animation without opening After Effects. Recolor it to match your brand, fix a text, remove a layer you do not need and export a new JSON or .lottie in a minute.',
			sections: [
				{ h2: 'Edit a Lottie without After Effects', body: [
					'Most Lottie files come from a designer or a library, and small changes usually mean going back to the original project. This editor works directly on the exported JSON, so you can make the common fixes yourself.',
					'Every change is applied to the animation data, not to a video, which means the result stays a lightweight, sharp vector Lottie that you can keep editing later.'
				] },
				{ h2: 'Colors, texts and layers', body: [
					'The editor extracts the palette used in the file. Change one swatch and every shape that uses that color updates at once, which is perfect for brand colors or a dark-mode variant.',
					'Text layers can be rewritten in place, and any layer or precomp can be hidden or removed. Mistakes are not a problem: undo takes you back step by step.'
				] }
			],
			steps: [
				'Open your .json or .lottie file in the editor.',
				'Pick a color from the extracted palette and replace it everywhere.',
				'Rewrite texts and hide or remove the layers you do not need.',
				'Adjust speed, fps, trim the frame range or resize the canvas.',
				'Export as Lottie JSON, dotLottie, GIF or video.'
			],
			faq: [
				{ q: 'Can I change only one element’s color?', a: 'The palette changes a color everywhere it appears. To recolor one element only, hide the others or edit that layer in the creator timeline.' },
				{ q: 'Is the edited file still a normal Lottie?', a: 'Yes. The export is standard Lottie JSON or dotLottie that works with lottie-web, lottie-ios, lottie-android, dotLottie players and LottieFiles.' }
			]
		},
		'lottie-maker': {
			label: 'Lottie animation maker',
			title: 'Lottie Animation Maker — Create Animations Online',
			description: 'Create Lottie animations in your browser with a keyframe timeline, easing, shapes, text and 30+ presets. Export JSON, .lottie, GIF or MP4. Free.',
			h1: 'Create Lottie animations online',
			lead: 'A motion editor in the browser for icons, logos, loaders and social clips. Build with a keyframe timeline or start from a one-click preset or template, then export a real Lottie or a video.',
			sections: [
				{ h2: 'A motion editor made for Lottie', body: [
					'Add shape layers (rectangle, ellipse, star, polygon or your own SVG paths), text layers and images, then animate position, scale, rotation, opacity and colors on a timeline with keyframes.',
					'Each keyframe has its easing: linear, ease in, ease out, ease in-out, back, elastic, bounce or hold. That is what makes motion feel natural instead of robotic.'
				] },
				{ h2: 'Presets and templates', body: [
					'More than 30 one-click presets cover the classics: fade, slide, pop, zoom, spin, bounce, draw stroke, typewriter, pulse, shake, wiggle, heartbeat and seamless loops.',
					'Starter templates give you a finished base to adapt: logo reveal, lower third, loading spinner, like heart, notification badge and typewriter text.'
				] }
			],
			steps: [
				'Start from a blank canvas, a template or an imported SVG.',
				'Add shapes, text or images as layers.',
				'Apply a preset or set keyframes and easing on the timeline.',
				'Preview the loop and fine-tune timing.',
				'Export as Lottie JSON, dotLottie, GIF, MP4, WebM or PNG.'
			],
			faq: [
				{ q: 'Do I need to know After Effects?', a: 'No. Presets and templates produce a full animation in one click, and the timeline uses the same keyframe and easing ideas found in any motion tool.' },
				{ q: 'Can I import my logo?', a: 'Yes. Import an SVG and its paths become shape layers you can animate, recolor and draw stroke by stroke.' }
			]
		},
		'lottie-to-gif': {
			label: 'Lottie to GIF',
			title: 'Lottie to GIF Converter — Transparent GIF, No Upload',
			description: 'Convert Lottie JSON or .lottie animations to GIF in your browser, with transparent background, custom size, fps and loop. No upload and no watermark.',
			h1: 'Convert Lottie to GIF',
			lead: 'Turn a Lottie animation into a GIF for places that do not play Lottie: email, chat apps, documentation, slides and old CMSs. Keep the background transparent or pick a color.',
			sections: [
				{ h2: 'Why convert Lottie to GIF', body: [
					'Lottie needs a player library, so it does not work in email, Slack or Teams messages, README files, Notion or most presentation tools. GIF plays everywhere with no code.',
					'Converting locally also means your unreleased animation never leaves your device, which matters for client work and product launches.'
				] },
				{ h2: 'How the GIF is rendered', body: [
					'Each frame of the Lottie is drawn in the browser and encoded into a GIF with an optimized color palette. You choose the output size, frame rate, loop and background.',
					'With a transparent background, the GIF keeps on/off transparency, so it sits cleanly on colored pages. Soft edges are matched to a background color you choose to avoid dark halos.'
				] }
			],
			steps: [
				'Open the .json or .lottie file.',
				'Check the preview and, if needed, trim frames or change speed.',
				'Open Export and choose GIF (it is preselected on this page).',
				'Set size, fps, loop and transparent or solid background.',
				'Export and download the GIF.'
			],
			faq: [
				{ q: 'Why is my GIF bigger than the Lottie?', a: 'Lottie stores vector instructions, while GIF stores every frame as pixels with at most 256 colors. Lower the size or fps, or trim frames, to shrink it.' },
				{ q: 'Can I make the GIF loop only once?', a: 'Yes. Turn off looping in the export options and the GIF will stop on its last frame.' }
			]
		},
		'lottie-to-mp4': {
			label: 'Lottie to MP4',
			title: 'Lottie to MP4 Converter — H.264 Video in Your Browser',
			description: 'Convert Lottie and dotLottie animations to MP4 (H.264) right in your browser for Instagram, TikTok, Reels and slides. Pick size, fps and background color.',
			h1: 'Convert Lottie to MP4 video',
			lead: 'Export any Lottie as an MP4 video that every phone, social network and editing app accepts. Ideal for stories, reels, presentations and video editors.',
			sections: [
				{ h2: 'Why turn a Lottie into MP4', body: [
					'Social networks, messaging apps and video editors accept video files, not Lottie JSON. MP4 with H.264 is the most compatible video format there is, from Instagram and TikTok to PowerPoint, Keynote and Premiere.',
					'Video is also smaller than GIF for long or colorful animations, with millions of colors and smooth gradients instead of a 256-color palette.'
				] },
				{ h2: 'How the MP4 is encoded', body: [
					'Frames are rendered from the Lottie and encoded to H.264 using WebCodecs, the video encoder built into modern browsers. It is fast, often uses hardware acceleration, and nothing is sent to a server.',
					'Choose resolution, frame rate and background color, since MP4 has no transparency. For a vertical story, resize the canvas to 1080×1920 before exporting.'
				] }
			],
			steps: [
				'Open your Lottie .json or .lottie file.',
				'Resize the canvas if you need a square, vertical or wide video.',
				'Open Export; MP4 is preselected on this page.',
				'Pick resolution, fps and a background color.',
				'Export and download the MP4.'
			],
			faq: [
				{ q: 'Can I export a vertical video for Stories and Reels?', a: 'Yes. Resize the canvas to 1080×1920 (9:16) and position the animation, then export as MP4.' },
				{ q: 'Does the MP4 have sound?', a: 'No. Lottie animations have no audio track, so the video is silent. Add music afterwards in your video editor or social app.' }
			]
		},
		'lottie-to-webm': {
			label: 'Lottie to WebM',
			title: 'Lottie to WebM Converter — Free, In Your Browser',
			description: 'Convert Lottie JSON and .lottie files to WebM video in your browser. Light files for websites and autoplay loops, custom size and fps. No upload, free.',
			h1: 'Convert Lottie to WebM',
			lead: 'Export a Lottie as a WebM video, the open web video format that browsers play natively in a muted, looping video tag, with no Lottie player library needed.',
			sections: [
				{ h2: 'When WebM is the right choice', body: [
					'If you want an animation on a website but do not want to load a Lottie player, a short muted WebM in a video tag with autoplay and loop is light, smooth and supported by every modern browser.',
					'WebM uses the VP8/VP9 codecs and usually produces smaller files than GIF with far better colors, which helps page speed and Core Web Vitals.'
				] },
				{ h2: 'How the WebM export works', body: [
					'The Lottie is rendered frame by frame in your browser and encoded locally. You choose output size, frame rate and background, then download the .webm file.',
					'For the widest reach, publish WebM together with an MP4 fallback: older Safari versions and many desktop apps prefer MP4.'
				] }
			],
			steps: [
				'Open the Lottie .json or .lottie file.',
				'Trim frames or change speed if the loop is too long.',
				'Open Export; WebM is preselected on this page.',
				'Choose size, fps and background.',
				'Export and use the .webm in a muted, looping video tag.'
			],
			faq: [
				{ q: 'Does WebM play on iPhone?', a: 'Recent Safari versions play WebM, but older iPhones and iPads do not. Offer an MP4 fallback in the same video tag to be safe.' },
				{ q: 'WebM or Lottie for my website?', a: 'Lottie stays sharp at any size and can be interactive, but needs a player script. WebM needs no script and is better for complex, colorful scenes.' }
			]
		},
		'json-to-lottie': {
			label: 'JSON to dotLottie',
			title: 'JSON to dotLottie Converter — Make .lottie Files Online',
			description: 'Convert Lottie JSON (Bodymovin) into a compact dotLottie (.lottie) file in your browser, or unpack a .lottie back to JSON. Free, private, no sign-up.',
			h1: 'Convert Lottie JSON to dotLottie',
			lead: 'Pack a Bodymovin JSON and its images into a single compressed .lottie file, or open a .lottie and save it as plain JSON again. Everything runs in your browser.',
			sections: [
				{ h2: 'JSON vs dotLottie', body: [
					'A Lottie JSON is plain text: easy to inspect and supported by every player, but images must be embedded as base64 or shipped as separate files. dotLottie (.lottie) is a ZIP archive with the JSON, its images and a manifest.',
					'Thanks to compression, a .lottie is often 50–80% smaller than the same JSON, and it keeps everything together in one file that is easy to share and cache.'
				] },
				{ h2: 'How the conversion works', body: [
					'Open the JSON and export as dotLottie: the animation data and assets are packed and compressed locally. Going the other way, open a .lottie and export Lottie JSON to get the original data back.',
					'You can also adjust the animation before saving: change colors, texts, speed or canvas size in the editor, then export the format you need.'
				] }
			],
			steps: [
				'Drop your Lottie .json (or a .lottie to unpack).',
				'Check the preview and edit anything you need.',
				'Open Export; dotLottie is preselected on this page.',
				'Choose dotLottie to pack, or Lottie JSON to unpack.',
				'Download the converted file.'
			],
			faq: [
				{ q: 'Do all players support .lottie?', a: 'The dotLottie players (web, iOS, Android, React, Flutter) and LottieFiles do. Older setups using only lottie-web need the plain JSON, which you can export here too.' },
				{ q: 'Will converting change the animation?', a: 'No. Packing to dotLottie only compresses the same data and assets, so playback is identical.' }
			]
		},
		'text-animation': {
			label: 'Animated text maker',
			title: 'Animated Text Maker — Typewriter and Kinetic Text',
			description: 'Make animated text online: typewriter, fade, slide and scale per character, with easing and loops. Export as Lottie, GIF, MP4 or WebM. Free, no watermark.',
			h1: 'Animated text maker',
			lead: 'Turn a word, a title or a quote into motion. Animate text letter by letter, pick an easing, and export a light Lottie for your site or a video for social media.',
			sections: [
				{ h2: 'Per-character text animation', body: [
					'Type your text and choose how each character appears: typewriter, fade, slide from any side or scale up. A delay between letters gives the classic staggered look used in titles and intros.',
					'Combine it with the timeline: add a hold, then animate the whole line out, or loop it for a banner. Easings like back and elastic add a playful bounce.'
				] },
				{ h2: 'Ideas for animated text', body: [
					'Use it for story titles, YouTube lower thirds, website hero headlines, presentation openers, quotes on Instagram or a typewriter effect in a product demo.',
					'Start from the typewriter text or lower third templates and replace the words, or build your own from a blank canvas with text and shape layers.'
				] }
			],
			steps: [
				'Open the animated text maker or a text template.',
				'Type your text and choose font size, color and alignment.',
				'Pick an animation per character: typewriter, fade, slide or scale.',
				'Adjust timing and easing on the timeline.',
				'Export as Lottie, GIF, MP4 or WebM.'
			],
			faq: [
				{ q: 'Can I animate each word instead of each letter?', a: 'The presets work per character. For word-by-word motion, put each word on its own text layer and offset their keyframes on the timeline.' },
				{ q: 'Is the text still editable after export?', a: 'In Lottie JSON and dotLottie the text stays text, so you can reopen and change it. In GIF and video it becomes pixels.' }
			]
		}
	},
	sections: {
		edit: { h2: 'What you can change', body: [
			'Recolor the whole animation from its extracted palette, rewrite texts, hide or remove layers and precomps, change speed or fps, trim the frame range and resize the canvas. Every step can be undone.',
			'For bigger changes, open the creator: keyframe timeline with easing, shape, text and image layers, and more than 30 animation presets.'
		] },
		export: { h2: 'Export formats and use cases', body: [
			'Export Lottie JSON or dotLottie for websites and apps, GIF with transparency for email and chats, MP4 (H.264) for Instagram, TikTok, stories and presentations, WebM for light web loops, a PNG sequence in a ZIP, or a single frame as PNG or SVG.',
			'The same animation can feed a product page, an onboarding screen in a mobile app, a social post and a slide deck, each in the format that fits.'
		] },
		tips: { h2: 'Tips for performance and file size', body: [
			'Embedded images are usually the heaviest part of a Lottie: prefer vector shapes, or use dotLottie to compress assets. Fewer layers and shorter loops also play smoother on low-end phones.',
			'For GIF, reduce dimensions and fps first: going from 60 to 30 fps roughly halves the file. For video, 30 fps and the real display size are enough for most social and web uses.'
		] },
		choose: { h2: 'GIF, MP4 or Lottie: which to use', body: [
			'Lottie (JSON or .lottie) is the best choice inside websites and apps: tiny, sharp at any size and controllable by code. GIF is for places that only show images, such as email and chats, and is the only one of the three with transparency that plays everywhere.',
			'MP4 is for social networks, messaging and presentations: millions of colors, small files, no transparency. WebM is the light video option for web pages.'
		] }
	},
	faq: {
		dotlottie: { q: 'Does it support .lottie (dotLottie) files?', a: 'Yes. It opens both Bodymovin/Lottie .json and dotLottie .lottie files, and can export either format.' },
		expressions: { q: 'Are After Effects expressions supported?', a: 'No. Expressions are not evaluated, as in most Lottie players; their static values are used. Effects, 3D layers and some blend modes are also not part of Lottie.' },
		fonts: { q: 'Which fonts do text layers use?', a: 'Text layers are drawn with fonts available on your system. If the original font is missing, a similar system font is used, so convert critical text to shapes before export.' },
		gifAlpha: { q: 'Can the GIF have a transparent background?', a: 'Yes. Choose a transparent background when exporting. GIF transparency is on/off per pixel, so soft edges are blended with a matte color you pick.' },
		webcodecs: { q: 'Why does MP4 export need a modern browser?', a: 'MP4 is encoded with WebCodecs, available in current Chrome, Edge, Safari and Firefox. On older browsers, export WebM, GIF or a PNG sequence instead.' },
		privacy: { q: 'Are my animations uploaded?', a: 'No. Opening, editing, rendering and encoding all happen in your browser. Files never leave your device, so it is safe for unreleased work.' },
		phone: { q: 'Does it work on a phone?', a: 'Yes. You can open, play, edit and export Lottie animations on iPhone and Android in any modern browser.' },
		free: { q: 'Is it free? Is there a watermark?', a: 'It is completely free, with no sign-up, no watermark and no limit on exports.' }
	}
};
