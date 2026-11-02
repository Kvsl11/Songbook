import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cifraNasLinhas } from '../public/js/lib/cifra-sincronizada.js';

// cifra com frases juntas numa linha só e o refrão escrito uma vez; a letra sincronizada com uma frase por linha
const CIFRA = `{key: G}
{start_of_verse: Verse 1}
[G]Vem cantar comigo [D]nesta manhã de sol e [Em]luz
[C]Abre o coração
{end_of_verse}
{start_of_chorus}
[G]Ohhh
[D]Canta, canta, canta
{end_of_chorus}`;

const LETRA = ['Vem cantar comigo', 'Nesta manhã de sol e luz', 'Abre o coração', 'Ooh-ooh', 'Canta, canta, canta', 'Canta, canta, canta'];

test('põe os acordes da cifra nas frases da letra sincronizada, uma linha por frase', () => {
  const r = cifraNasLinhas(CIFRA, LETRA);
  assert.ok(r);
  const linhas = r.content.split('\n').filter((l) => l && !/^\{/.test(l));
  assert.equal(linhas.length, LETRA.length);
  assert.deepEqual(linhas.slice(0, 5), ['[G]Vem cantar comigo', '[D]Nesta manhã de sol e [Em]luz', '[C]Abre o coração', '[G]Ooh-ooh', '[D]Canta, canta, canta']);
  // a frase repetida (o refrão escrito uma vez só) leva os mesmos acordes
  assert.equal(linhas[5], '[D]Canta, canta, canta');
  // as seções da cifra continuam
  assert.match(r.content, /\{start_of_verse: Verse 1\}/);
  assert.match(r.content, /\{start_of_chorus\}/);
});

test('cifra que não bate com a letra: fica como está (null)', () => {
  assert.equal(cifraNasLinhas(CIFRA, ['Uma letra toda diferente', 'sem nada em comum aqui']), null);
  assert.equal(cifraNasLinhas('Sem acordes nenhum', LETRA), null);
});
