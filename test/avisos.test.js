import { test } from 'node:test';
import assert from 'node:assert/strict';
import { duracaoDoAviso, partesDoAviso, tipoDoAviso } from '../public/js/lib/avisos.js';

test('avisos: o tipo vem do texto', () => {
  assert.equal(tipoDoAviso('Não consegui ler o áudio: EncodingError'), 'erro');
  assert.equal(tipoDoAviso('Erro: sem conexão'), 'erro');
  assert.equal(tipoDoAviso('Não foi possível gerar: x'), 'erro');
  assert.equal(tipoDoAviso('Gerando o PowerPoint…'), 'carregando');
  assert.equal(tipoDoAviso('Trazendo a música…'), 'carregando');
  assert.equal(tipoDoAviso('Letra e cifra colocadas automaticamente: confira'), 'ia');
  assert.equal(tipoDoAviso('Rascunho aberto no editor: confira as notas'), 'ia');
  assert.equal(tipoDoAviso('Salva na biblioteca'), 'sucesso');
  assert.equal(tipoDoAviso('App atualizado (versão 158)'), 'sucesso');
  assert.equal(tipoDoAviso('Música excluída'), 'sucesso');
  assert.equal(tipoDoAviso('Escolha uma nota'), 'info');
  assert.equal(tipoDoAviso('Esta música não informa o tom'), 'info');
});

test('avisos: título e detalhe, e o tempo na tela', () => {
  assert.deepEqual(partesDoAviso('Não consegui ler: o arquivo está vazio'), { titulo: 'Não consegui ler', detalhe: 'O arquivo está vazio' });
  assert.deepEqual(partesDoAviso('Salva na biblioteca'), { titulo: 'Salva na biblioteca', detalhe: '' });
  assert.ok(duracaoDoAviso('erro', 'x') > duracaoDoAviso('sucesso', 'x'));
  assert.ok(duracaoDoAviso('info', 'x'.repeat(120)) > duracaoDoAviso('info', 'x'));
});
