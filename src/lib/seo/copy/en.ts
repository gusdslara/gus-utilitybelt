// Textos em inglês das páginas de SEO (conversor e editor de imagens).
import type { Copy } from './types.ts';

export const en: Copy = {
	fmt: {
		jpg: {
			full: 'JPEG (Joint Photographic Experts Group)',
			about: 'JPG, or JPEG, is the default format for photos from cameras and most phones. It uses lossy compression, has no transparency and opens in practically every app, website and operating system.',
			pain: 'JPG has no transparency and every re-save loses a little quality, which hurts logos, screenshots and images you keep editing.',
			gain: 'JPG is accepted absolutely everywhere: upload forms, email, office suites, printers and old software.'
		},
		png: {
			full: 'PNG (Portable Network Graphics)',
			about: 'PNG is a lossless format with full transparency, the standard for screenshots, logos, UI graphics and anything with sharp edges or text. It works in every browser and editor, but photos saved as PNG get heavy.',
			pain: 'PNG photos are heavy: a picture that is 1 MB as JPG easily becomes 3 to 5 MB as PNG, which slows pages and fills storage.',
			gain: 'PNG keeps every pixel exactly as it is and supports transparency, so it is the safe choice for editing, screenshots and graphics with text.'
		},
		webp: {
			full: 'WebP (Google)',
			about: 'WebP is a modern web format created by Google. It supports lossy and lossless compression and transparency, and every current browser displays it. Some older desktop apps, print services and upload forms still reject it.',
			pain: 'WebP files saved from websites often refuse to open in older editors, office apps, print shops and some upload forms.',
			gain: 'WebP is usually 25–35% smaller than JPG at the same visual quality and still supports transparency, which makes pages load faster.'
		},
		avif: {
			full: 'AVIF (AV1 Image File Format)',
			about: 'AVIF is based on the AV1 video codec and is currently one of the most efficient image formats: very small files with transparency and good detail. Modern browsers support it, but many desktop apps and older systems do not open it yet.',
			pain: 'AVIF is still unknown to many apps: older Windows and macOS versions, office software and many editors cannot open it.',
			gain: 'AVIF produces some of the smallest files available today, often half the size of a comparable JPG, with transparency support.'
		},
		gif: {
			full: 'GIF (Graphics Interchange Format)',
			about: 'GIF is one of the oldest web formats, famous for short animations. It is limited to 256 colors per frame and only supports on/off transparency, so photos look banded and files are large.',
			pain: 'GIF is limited to 256 colors, so gradients and photos look grainy, and the files are big for what they show.',
			gain: 'GIF opens in every browser, email client and chat app, including very old ones, which makes it a lowest-common-denominator choice.'
		},
		bmp: {
			full: 'BMP (Windows Bitmap)',
			about: 'BMP is the classic uncompressed Windows bitmap. It stores raw pixels, so it is simple and lossless but very large. Today it mostly appears in old software, scanners and embedded systems.',
			pain: 'BMP files are uncompressed and huge, and many websites and apps do not accept them.',
			gain: 'BMP is required by some legacy programs, industrial devices and embedded displays that only read raw bitmaps.'
		},
		ico: {
			full: 'ICO (Windows icon)',
			about: 'ICO is the Windows icon format and the classic favicon.ico. A single file can hold several sizes of the same icon (16×16 up to 256×256) so each place picks the sharpest one.',
			pain: 'ICO files are hard to reuse: most editors, websites and chat apps do not open them directly.',
			gain: 'ICO is still the most compatible favicon format and the one Windows expects for shortcuts and program icons.'
		},
		svg: {
			full: 'SVG (Scalable Vector Graphics)',
			about: 'SVG describes shapes instead of pixels, so it scales to any size without blurring. It is ideal for logos, icons and illustrations, and browsers render it natively, but many upload forms and social networks do not accept it.',
			pain: 'SVG is often rejected by social networks, marketplaces, office apps and image upload forms that expect a regular picture.',
			gain: 'SVG scales to any size without losing sharpness and is usually tiny for logos and flat illustrations.'
		},
		heic: {
			full: 'HEIC/HEIF (High Efficiency Image File)',
			about: 'HEIC is the format iPhones and iPads use for photos by default. It keeps good quality at roughly half the size of JPG, but Windows, Android, many websites and most upload forms do not open it without extra software.',
			pain: 'HEIC photos from an iPhone often do not open on Windows, Android or websites, and upload forms reject them.',
			gain: ''
		},
		tiff: {
			full: 'TIFF (Tagged Image File Format)',
			about: 'TIFF is a professional format used in scanning, printing, publishing and archiving. It is usually lossless and can store high bit depths, but files are large and browsers do not display it.',
			pain: 'TIFF files are large and browsers, email clients and most websites cannot display them.',
			gain: 'TIFF is the format print shops, scanners, publishing workflows and archives often ask for, because it is lossless and widely supported by professional software.'
		},
		psd: {
			full: 'PSD (Adobe Photoshop Document)',
			about: 'PSD is Adobe Photoshop’s working file, with layers, masks and effects. It is great for editing, but you need Photoshop or a compatible editor to open it, and files are big.',
			pain: 'A PSD needs Photoshop or a compatible editor to open, so clients, websites and phones usually cannot preview it.',
			gain: ''
		},
		pdf: {
			full: 'PDF (Portable Document Format)',
			about: 'PDF is the universal document format. Any computer or phone opens it, it prints predictably, and it is what forms, schools, banks and government portals usually ask for.',
			pain: '',
			gain: 'PDF is the format portals, schools, banks and offices ask for when you need to attach, print or send scanned documents.'
		}
	},
	pairLabel: (A, B) => `${A} to ${B}`,
	pairTitle: (A, B) => `${A} to ${B} Converter — Free, Private, Batch`,
	pairH1: (A, B) => `Convert ${A} to ${B} online`,
	pairLead: (A, B) =>
		`Turn ${A} images into ${B} right here in your browser. Your files never leave your device, there is no sign-up or watermark, and you can convert dozens of images at once.`,
	pairDesc: (A, B, hook) => [
		`Convert ${A} to ${B} free in your browser. ${hook} Batch conversion, no upload, no sign-up, no watermark.`,
		`Convert ${A} to ${B} free in your browser. ${hook} Batch, no upload, no sign-up.`,
		`Convert ${A} to ${B} free in your browser. ${hook} No upload, no sign-up.`,
		`Free ${A} to ${B} converter. ${hook} Private and in batch.`,
		`${A} to ${B}, free and private. ${hook}`
	],
	hook: {
		heic: () => 'iPhone photos open everywhere, with location data removed.',
		trace: () => 'Real vector tracing with a color count you control.',
		pdf: () => 'Each image becomes a PDF page, ready to send or print.',
		ico: () => 'Multi-size favicon in one file, from 16 to 256 px.',
		psd: () => 'Photoshop files flattened without opening Photoshop.',
		gifFrame: () => 'Uses the first frame of the GIF, in full color depth.',
		raster: () => 'Vectors rendered to pixels at the size you choose.',
		icoIn: () => 'Extract the icon as a regular image you can edit and share.',
		alpha: () => 'Pick the background color for transparent areas.',
		palette: () => 'Reduced to a 256-color palette for maximum compatibility.',
		smaller: () => 'Smaller files with a quality slider or a target size in KB.',
		lossless: () => 'Lossless output that will not degrade on further edits.',
		archive: () => 'Lossless output for print, archive and legacy software.',
		generic: () => 'Keeps orientation and strips metadata for privacy.'
	},
	h2: {
		why: (A, B) => `Why convert ${A} to ${B}?`,
		changes: () => 'What changes in the conversion',
		size: (A, B) => `File size: ${A} vs ${B}`,
		not: () => 'When it is better not to convert',
		about: (A, B) => `About ${A} and ${B}`
	},
	note: {
		heic: () => 'HEIC photos are decoded on your device, rotated according to their EXIF orientation, and saved without the camera metadata, so the GPS location of your iPhone photo is not carried into the new file.',
		psd: () => 'The PSD is flattened: all visible layers, masks and effects are merged into a single image, exactly as Photoshop would show it. If you need the layers, open the file in the editor instead.',
		gifFrame: () => 'Only the first frame of an animated GIF is converted. Single-frame GIFs convert completely.',
		raster: (A) => `The ${A} is rendered to pixels. Vector sharpness becomes a fixed resolution, so set a large enough size in the resize options if you need a big image.`,
		trace: (A) => `This is real vectorization: the ${A} is traced into SVG paths, not just wrapped inside an SVG file. You choose the number of colors; fewer colors give cleaner shapes and smaller files, more colors keep more detail.`,
		pdf: () => 'Each image is placed on its own PDF page, so a batch of photos or scans turns into pages you can send, print or attach to a form.',
		ico: () => 'The ICO is generated with multiple sizes inside one file (from 16×16 up to 256×256), which is what browsers and Windows expect from a favicon or program icon. Square images give the best result.',
		icoIn: (A, B) => `The icon image inside the ${A} is converted to a regular ${B} file, which you can then edit, upload or share like any other picture.`,
		palette: (A, B) => `${B} stores at most 256 colors, so the converter builds an optimized palette. Flat graphics stay crisp, but photos and gradients may show banding.`,
		alphaLost: (A, B) => `${B} has no transparency. Transparent areas of the ${A} are filled with a background color you choose (white by default), so logos do not end up with a black box.`,
		alphaKept: (A, B) => `Transparency is preserved: transparent and semi-transparent pixels in the ${A} stay transparent in the ${B}.`,
		toLossy: (A, B) => `${B} uses lossy compression, so you control the trade-off with the quality slider, or set a target size in KB and let the converter find the right quality.`,
		lossyToLossless: (A, B) => `${B} is lossless, so nothing more is lost from here on, but it cannot bring back detail that ${A} compression already discarded.`,
		exact: (A, B) => `Both formats are lossless here, so the pixels of the ${A} are copied to the ${B} exactly, with no quality loss. Only the way they are stored changes.`,
		exif: () => 'EXIF orientation is respected, so sideways photos come out upright, and metadata such as GPS location, camera model and date is stripped for privacy.'
	},
	size: {
		smaller: (A, B) => `For photos, ${B} is usually noticeably smaller than ${A} at a similar visual quality. Exact savings depend on the content: busy photos compress less than flat graphics.`,
		larger: (A, B) => `Expect ${B} files to be larger than the ${A} originals, sometimes several times larger for photos, because ${B} stores more data per pixel. That is the price of compatibility or lossless quality.`,
		similar: (A, B) => `${A} and ${B} usually end up in the same size range. The final size depends more on the image dimensions and the quality setting than on the format itself.`,
		toSvg: (A) => `SVG size depends on how complex the image is, not on its pixel count. A logo with a few flat colors becomes a tiny file; a detailed ${A} photo produces thousands of paths and a large SVG.`,
		toIco: () => 'ICO files are small: even with all sizes up to 256×256 a favicon usually stays in the tens of kilobytes.',
		toPdf: (A) => `The PDF is roughly the size of the images inside it. To send a lighter PDF, reduce the dimensions of the ${A} images in the resize options before converting.`,
		fromSvg: (A, B) => `A ${A} of a few kilobytes can become a much bigger ${B}, because the output stores every pixel. The size grows with the resolution you choose.`,
		fromIco: (A, B) => `Icons are small images, so the ${B} file will also be small, usually just a few kilobytes.`
	},
	sizeTip: () => 'You can also resize in the same step (by percentage, to fit a box, or to exact pixels) to make the files lighter.',
	not: {
		keepLayers: (A) => `Keep the original ${A} if you will edit it again: flattening merges the layers for good. Convert a copy for sharing.`,
		keepAnim: (A, B) => `If the animation matters, keep the ${A}: a static ${B} only keeps the first frame.`,
		keepVector: (A) => `Keep the ${A} for logos and icons on websites: it stays sharp at any size and is usually smaller. Convert only where a regular image is required.`,
		noPhotoTrace: (A) => `Do not vectorize ${A} photos expecting a perfect copy: tracing works best on logos, icons, drawings and flat illustrations with few colors.`,
		icoPhoto: () => 'Do not use ICO for regular pictures: it is meant for small square icons, not photos.',
		pdfEdit: (A) => `If the recipient needs to edit or reuse the picture, send the ${A} itself: images inside a PDF are harder to extract.`,
		keepLossless: (A, B) => `For screenshots, text, diagrams and logos with sharp edges, ${A} may still be the better choice; lossy ${B} can add blur around letters at lower quality settings.`,
		recompress: (A, B) => `Converting one lossy format into another compresses the image twice. Use a high quality setting, and work from the original ${A} rather than from an already re-saved copy.`,
		lossyGrow: (A, B) => `If you only want a smaller file, ${B} is the wrong direction: it will be bigger than the ${A} without looking better.`,
		heavy: (A, B) => `${B} is not meant for the web: browsers and messaging apps handle it poorly. Use it only when a program or print service asks for it.`,
		avifCompat: (A, B) => `Check where the file is going: ${B} is great for websites, but some older apps, operating systems and upload forms still cannot open it.`,
		generic: (A) => `If the ${A} already works where you need it, there is no reason to convert. Each conversion is a chance to change size or quality.`
	},
	faq: {
		heic: () => ({ q: 'Can I convert photos straight from my iPhone?', a: 'Yes. Open this page on the iPhone, pick photos from the library or Files, and they are converted on the phone itself. HEIF files are accepted too.' }),
		psd: () => ({ q: 'Are the Photoshop layers kept?', a: 'Not in this conversion: the PSD is flattened into a single image, as it appears in Photoshop. To work with the layers, open it in the online editor, which reads and exports layered PSD.' }),
		anim: (A, B) => ({ q: `Does the ${A} animation carry over to ${B}?`, a: `No. The converter reads the first frame of the ${A}, so the ${B} is a still image of that frame.` }),
		trace: (A) => ({ q: 'Is the SVG a real vector or just an embedded image?', a: `It is a real vector. The ${A} is traced into SVG paths with the number of colors you pick, so it can be scaled and edited in Illustrator, Inkscape or Figma.` }),
		svgSize: (A, B) => ({ q: `What resolution will the ${B} have?`, a: `By default the size defined in the ${A}. Use the resize options to set a percentage or exact pixels; since the source is vector, enlarging does not blur.` }),
		pdf: (A) => ({ q: 'How are the pages arranged in the PDF?', a: `Each ${A} image is placed on its own page, in the order of the list, so ten images become ten pages.` }),
		ico: () => ({ q: 'Which sizes are inside the ICO file?', a: 'Several standard icon sizes, from 16×16 up to 256×256, in a single file. It works as favicon.ico and as a Windows icon.' }),
		alphaLost: (A, B) => ({ q: 'What happens to the transparent background?', a: `${B} cannot store transparency, so transparent areas get the background color you set (white by default). Keep PNG or WebP if you need transparency.` }),
		alphaKept: (A, B) => ({ q: 'Is transparency kept?', a: `Yes. Transparent and semi-transparent pixels of the ${A} stay transparent in the ${B}.` }),
		quality: (A, B) => ({ q: `Can I choose the ${B} quality or file size?`, a: 'Yes. Use the quality slider, or type a target size in KB and the converter searches for the highest quality that fits.' }),
		lossless: (A, B) => ({ q: `Will converting to ${B} improve the quality of my ${A}?`, a: `No. ${B} stops further losses, but detail removed by ${A} compression cannot be recovered.` })
	},
	faqSize: (A, B) => `Is ${B} smaller than ${A}?`,
	faqBatch: (A, B) => ({ q: `Can I convert many ${A} files to ${B} at once?`, a: `Yes. Drop as many ${A} files as you want; they are converted in parallel and you download them one by one, as a ZIP, or straight into a folder.` }),
	general: {
		free: { q: 'Is it really free?', a: 'Yes. No sign-up, no watermark, no daily limit and no paid plan. It is free because the work happens on your own device.' },
		upload: { q: 'Are my images uploaded to a server?', a: 'No. Everything runs in your browser with Web Workers; the files never leave your device. Metadata such as GPS location is removed from the output.' },
		batch: { q: 'How many images can I convert at once?', a: 'There is no fixed limit. Files are processed in parallel, and the practical limit is your device’s memory.' },
		phone: { q: 'Does it work on iPhone and Android?', a: 'Yes. It works in any modern mobile browser, including Safari on iPhone and Chrome on Android, with no app to install.' }
	},
	steps: {
		add: (A) => `Drag your ${A} files into the converter above or tap to choose them. You can add many at once.`,
		target: (A, B) => `${B} is already selected as the output format on this page.`,
		convert: (A, B) => `Convert and download each ${B} file, everything as a ZIP, or save straight to a folder (Chrome and Edge).`
	},
	opt: {
		quality: (A, B) => `Adjust the ${B} quality, or set a target size in KB.`,
		background: (A, B) => `Choose the background color for transparent areas (${B} has no transparency).`,
		colors: () => 'Pick the number of colors for the vector tracing.',
		icoSizes: () => 'Use a square image: the icon sizes up to 256×256 are generated automatically.',
		pdfPage: () => 'Order the files in the list: each image becomes one page.',
		resize: () => 'Optionally resize by percentage, to fit a box, or to exact pixels.'
	},
	hubs: {
		converter: {
			label: 'Image converter',
			title: 'Image Converter — Free, Private, Batch | Gus Utility Belt',
			description: 'Convert JPG, PNG, WebP, AVIF, HEIC, GIF, TIFF, PSD and SVG in your browser. Batch conversion, compression and resizing. No upload, no sign-up.',
			h1: 'Free online image converter',
			lead: 'Convert images between 11 input and 11 output formats directly in your browser. Files are processed on your device, never uploaded, and you can convert a whole folder in one go.',
			sections: [
				{ h2: 'Formats it reads and writes', body: [
					'Input: JPG/JPEG, PNG, WebP, AVIF, GIF (first frame), BMP, ICO, SVG, HEIC/HEIF from iPhones, TIFF and Photoshop PSD (flattened).',
					'Output: JPG, PNG, WebP, AVIF, GIF, BMP, multi-size ICO for favicons, TIFF, PDF with one page per image, real vector SVG with a chosen color count, and PSD.'
				] },
				{ h2: 'Options that matter', body: [
					'Set the quality for JPG, WebP and AVIF, or give a target size in KB and let the converter find the best quality that fits. Resize by percentage, to fit a box, or to exact pixels.',
					'For formats without transparency you choose the background color. EXIF orientation is respected, and metadata such as GPS location is stripped so photos do not reveal where they were taken.'
				] },
				{ h2: 'Private by design', body: [
					'Conversion runs in Web Workers inside your browser, in parallel. Nothing is sent to a server, so it is safe for confidential documents and there is no queue or daily limit.'
				] }
			],
			steps: [
				'Drag images into the converter or tap to pick them; mixed formats are fine.',
				'Choose the output format and, if needed, quality, target size or resize.',
				'Convert and download each file, a ZIP with everything, or save straight to a folder (Chrome and Edge).'
			],
			faq: [
				{ q: 'Which format should I choose for a website?', a: 'WebP for broad support with small files, AVIF for the smallest files in modern browsers, PNG for graphics that need to be pixel-perfect.' },
				{ q: 'Can I convert HEIC photos from an iPhone?', a: 'Yes. HEIC and HEIF are read directly in the browser and can be saved as JPG, PNG, WebP or PDF, with location data removed.' },
				{ q: 'Are my images uploaded?', a: 'No. Everything is processed locally in your browser; the files never leave your device.' },
				{ q: 'Is there a limit on the number of files?', a: 'No fixed limit. Files are converted in parallel and the practical limit is your device’s memory.' }
			]
		},
		editor: {
			label: 'Online image editor',
			title: 'Online Image Editor with Layers — Free, No Upload',
			description: 'Free online photo editor inspired by Paint.NET: layers, blend modes, magic wand, AI background removal, 39 filters, text effects. Runs in your browser.',
			h1: 'Online image editor with layers',
			lead: 'A full image editor in the browser, inspired by Paint.NET: layers, selections, filters, text and shapes, plus local AI for selecting subjects. Nothing is uploaded.',
			sections: [
				{ h2: 'Layers and selections', body: [
					'Work with layers, opacity and blend modes, merge or flatten when you are done. Select with rectangle, ellipse and lasso, then add, subtract or intersect.',
					'The magic wand offers five algorithms, from classic contiguous fill to edge-aware and clustering modes, for clean selections on tricky images.'
				] },
				{ h2: 'Filters, text and effects', body: [
					'39 filters with live preview: color adjustments, blurs, sharpening, noise, stylize, distort and artistic. Add text with 3D extrusion, neon glow, shadows and outlines, and editable vector shapes.'
				] },
				{ h2: 'Local AI and export', body: [
					'Smart select and background removal use AI models downloaded once and run on your device. Export PNG, JPG, WebP, AVIF, ICO, layered PSD or vector SVG. On phones it supports touch and pinch zoom.'
				] }
			],
			steps: [
				'Open an image (drag, paste with Ctrl+V or pick a file); PSD opens with its layers.',
				'Edit with layers, selections, filters, text and shapes.',
				'Export to the format you need, including layered PSD and vector SVG.'
			],
			faq: [
				{ q: 'Do I need to install anything?', a: 'No. The editor runs in any modern browser on desktop or mobile.' },
				{ q: 'Can it open Photoshop files?', a: 'Yes. PSD files open with their layers and can be exported back to PSD with layers.' },
				{ q: 'Are my images uploaded?', a: 'No. Editing, filters and even the AI features run on your device.' },
				{ q: 'Does it work on a phone?', a: 'Yes. The interface adapts to touch, with a bottom toolbar and two-finger pinch zoom.' }
			]
		},
		'remove-bg': {
			label: 'Remove background',
			title: 'Remove Image Background — Free, Private AI',
			description: 'Remove the background from photos with AI that runs on your device. No upload, no sign-up, no watermark. Refine the edge and export a transparent PNG.',
			h1: 'Remove image background with on-device AI',
			lead: 'Cut out people, products and objects automatically. The AI model is downloaded once and runs in your browser, so your photo never leaves your device.',
			sections: [
				{ h2: 'How it works', body: [
					'A segmentation model detects the main subject and turns the background into transparency. The first run downloads the model, which is then cached in the browser for next time.',
					'It uses WebGPU when available and falls back to WebAssembly, so it works on most computers and recent phones, just faster on some than others.'
				] },
				{ h2: 'Refine and export', body: [
					'The result lands in the full editor: fix edges with the eraser or brush, refine with the magic wand or smart select, add a new background color or image, then export a transparent PNG or WebP.'
				] }
			],
			steps: [
				'Open the photo in the editor (drag, paste or pick a file).',
				'Run background removal; the model is downloaded once and runs locally.',
				'Touch up the edges if needed and export as transparent PNG or WebP.'
			],
			faq: [
				{ q: 'Is my photo sent to a server?', a: 'No. Unlike most background removers, the AI runs on your device; only the model files are downloaded.' },
				{ q: 'Why is the first run slower?', a: 'The model is downloaded on first use. After that it is stored in the browser and starts much faster.' },
				{ q: 'Is there a watermark or resolution limit?', a: 'No watermark and no paid HD tier. Large images just take longer to process on slower devices.' }
			]
		},
		compress: {
			label: 'Compress image',
			title: 'Compress Image to KB — Free, No Upload, Batch',
			description: 'Compress JPG, PNG, WebP and AVIF images to a target size in KB, right in your browser. Batch compression, no upload, metadata stripped. Free.',
			h1: 'Compress images to a target size',
			lead: 'Shrink photos for forms, email and websites without sending them anywhere. Set a target size in KB or a quality level and compress many images at once.',
			sections: [
				{ h2: 'Hit an exact size in KB', body: [
					'Many portals accept only files under 100 KB, 200 KB or 1 MB. Type the limit and the compressor searches for the highest quality that stays below it.',
					'If an image is still too big at a reasonable quality, reduce its dimensions too: halving width and height cuts the pixel count by four.'
				] },
				{ h2: 'Choose the right format', body: [
					'WebP and AVIF give much smaller files than JPG at the same visual quality. Keep JPG when the destination does not accept modern formats. PNG is lossless, so it barely compresses photos.',
					'Metadata such as camera model and GPS location is stripped, which saves a few kilobytes and protects your privacy.'
				] }
			],
			steps: [
				'Add your images to the compressor; batches are welcome.',
				'Set the target size in KB or adjust quality, and choose the output format.',
				'Compress and download individually, as a ZIP, or to a folder.'
			],
			faq: [
				{ q: 'Will compressing ruin the quality?', a: 'At moderate settings the difference is hard to see. The compressor keeps the highest quality that fits your target.' },
				{ q: 'Can I compress PNG without changing the format?', a: 'PNG is lossless, so savings are limited. For big reductions, convert to WebP, which also keeps transparency.' },
				{ q: 'Are my images uploaded?', a: 'No. Compression runs in your browser; files never leave your device.' }
			]
		},
		resize: {
			label: 'Resize image',
			title: 'Resize Image Online — Free, Batch, No Upload',
			description: 'Resize images by percentage, to fit a box, or to exact pixels in your browser. Batch resize JPG, PNG, WebP, HEIC and more. No upload, no sign-up.',
			h1: 'Resize images online',
			lead: 'Change the dimensions of one image or a hundred at once. Choose a percentage, a maximum box, or exact width and height, and convert the format in the same step.',
			sections: [
				{ h2: 'Three ways to resize', body: [
					'Percentage scales everything evenly, for example 50% for half the size. Fit keeps the proportions inside a maximum width and height, ideal for batches of mixed photos. Exact sets precise pixel dimensions.',
					'EXIF orientation is applied first so portrait photos keep the right shape.'
				] },
				{ h2: 'Resize and convert together', body: [
					'Combine resizing with any output format and quality: for example, turn iPhone HEIC photos into 1600 px JPGs under 300 KB in one pass.'
				] }
			],
			steps: [
				'Add the images you want to resize.',
				'Choose percentage, fit inside a box, or exact pixels, plus the output format.',
				'Convert and download the resized images, as a ZIP if you prefer.'
			],
			faq: [
				{ q: 'Does resizing keep the aspect ratio?', a: 'Percentage and fit always keep it. Exact size lets you set both dimensions freely.' },
				{ q: 'Can I enlarge images?', a: 'Yes, but enlarging a photo cannot add real detail; SVG sources are the exception and stay sharp.' },
				{ q: 'Are the images uploaded?', a: 'No. Resizing happens in your browser.' }
			]
		}
	}
};
