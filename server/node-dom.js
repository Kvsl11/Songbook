// Registra o node-html-parser como parser de HTML para os módulos compartilhados.
import { parse } from 'node-html-parser';
import { setHtmlParser } from '../public/js/lib/cindy.js';

setHtmlParser((html) => parse(html));
