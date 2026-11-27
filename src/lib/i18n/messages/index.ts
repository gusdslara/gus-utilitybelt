// Junta os namespaces: messages[lang].<namespace>.<chave>
import common from './common.ts';
import app from './app.ts';
import api from './api.ts';
import whatsapp from './whatsapp.ts';
import tools from './tools.ts';
import editor from './editor.ts';
import clipboard from './clipboard.ts';
import image from './image.ts';
import imageFx from './imageFx.ts';
import imageAi from './imageAi.ts';
import imageConv from './imageConv.ts';
import motion from './motion.ts';
import pdf from './pdf.ts';

const all = { common, app, api, whatsapp, tools, editor, clipboard, image, imageFx, imageAi, imageConv, motion, pdf };
type All = typeof all;
export type Messages = { [K in keyof All]: All[K]['pt'] };
type Lang = 'pt' | 'en' | 'es' | 'fr';

const pick = (l: Lang) => Object.fromEntries(Object.entries(all).map(([k, v]) => [k, v[l]])) as Messages;
export const messages: Record<Lang, Messages> = { pt: pick('pt'), en: pick('en'), es: pick('es'), fr: pick('fr') };
