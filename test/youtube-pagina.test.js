import { test } from 'node:test';
import assert from 'node:assert/strict';
import { videosDaPaginaDoYoutube } from '../public/js/lib/web.js';
import { escolherAudio } from '../public/js/lib/versoes.js';

// um pedaço da busca do YouTube como o Jina Reader devolve (o formato de cada vídeo: miniatura com a duração, título, canal)
const PAGINA = `Markdown Content:
[![Image 6: true](https://i.ytimg.com/vi/eVli-tstM5E/hq720.jpg?sqp=x) 3:21 3:21 Now playing](https://www.youtube.com/watch?v=eVli-tstM5E&list=RDeVli-tstM5E&start_radio=1)

### [Sabrina Carpenter - Espresso](https://www.youtube.com/watch?v=eVli-tstM5E&list=RDeVli-tstM5E "Sabrina Carpenter - Espresso")

[Sabrina Carpenter](https://www.youtube.com/channel/UCPKWE1H6xhxwPlqUlKgHb_w)

701M 2y ago

[![Image 8: true](https://i.ytimg.com/vi/51zjlMhdSTE/hq720.jpg?sqp=y) 2:56 2:56 Now playing](https://www.youtube.com/watch?v=51zjlMhdSTE&list=RD51zjlMhdSTE)

### [Sabrina Carpenter - Espresso (Official Audio)](https://www.youtube.com/watch?v=51zjlMhdSTE&list=RD51zjlMhdSTE "Sabrina Carpenter - Espresso (Official Audio)")

[Sabrina Carpenter](https://www.youtube.com/@SabrinaCarpenter)

[![Image 17](https://www.youtube.com/results?search_query=x) Mix](https://www.youtube.com/watch?v=eVli-tstM5E&list=RDeVli-tstM5E&start_radio=1)

### [Mix - Sabrina Carpenter - Espresso](https://www.youtube.com/watch?v=eVli-tstM5E&list=RDeVli-tstM5E&start_radio=1)
`;

test('a busca do YouTube lida pela página: os vídeos com a duração, o título e o canal', () => {
  const l = videosDaPaginaDoYoutube(PAGINA);
  assert.deepEqual(l.map((v) => [v.id, v.segundos, v.canal, v.titulo]), [
    ['eVli-tstM5E', 201, 'Sabrina Carpenter', 'Sabrina Carpenter - Espresso'],
    ['51zjlMhdSTE', 176, 'Sabrina Carpenter', 'Sabrina Carpenter - Espresso (Official Audio)'],
  ]);
});

test('o áudio oficial sai dela como sai do Piped', () => {
  const achado = escolherAudio(videosDaPaginaDoYoutube(PAGINA), { titulo: 'Espresso', artista: 'Sabrina Carpenter', duracao: 175, evitar: 'eVli-tstM5E' });
  assert.equal(achado?.id, '51zjlMhdSTE');
});
