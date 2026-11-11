import argparse
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

from classificar_mudancas import carregar_config, classificar, corresponde
from executar_seletivos import selecionar
from testar_apresentacao import COM_GERADOR, GRUPOS, resolver_grupos


class SeletivosTest(unittest.TestCase):
    def test_aliases_somente_grupos_existentes(self):
        config = carregar_config()
        for nome, grupo in config['grupos'].items():
            if grupo['tipo'] == 'navegador':
                with self.subTest(grupo=nome):
                    numeros = resolver_grupos([nome])
                    self.assertTrue(set(numeros) <= GRUPOS.keys())
                    self.assertEqual(grupo['gerador'], bool(set(numeros) & COM_GERADOR))
        self.assertGreaterEqual(len(GRUPOS), 21)
        self.assertEqual(resolver_grupos(['editor', 'atalhos']), ['9'])

    def test_desconhecido_nao_e_ignorado(self):
        with self.assertRaises(ValueError):
            resolver_grupos(['inexistente'])
        args = argparse.Namespace(completo=False, grupo=['inexistente'], grupos=None)
        with self.assertRaises(ValueError):
            selecionar(args, carregar_config())

    def test_globs_nao_classificam_web_como_documentacao(self):
        self.assertFalse(corresponde('web/modelo.md', '*.md'))
        self.assertTrue(corresponde('tools/LEIA-ME.md', 'tools/**/*.md'))
        self.assertTrue(classificar([{'caminho': 'web/modelo.md'}])['completo'])

    def test_base_ausente_emite_fallback(self):
        with tempfile.TemporaryDirectory() as pasta:
            saida = Path(pasta) / 'selecao.json'
            resultado = subprocess.run([sys.executable, str(Path(__file__).with_name('classificar_mudancas.py')),
                '--base', '0' * 40, '--saida', str(saida)], capture_output=True)
            self.assertEqual(resultado.returncode, 2)
            plano = json.loads(saida.read_text(encoding='utf-8'))
            self.assertTrue(plano['completo'])
            self.assertTrue(plano['gerador'])

    def test_config_invalida_emite_fallback(self):
        with tempfile.TemporaryDirectory() as pasta:
            arquivo = Path(pasta) / 'invalido.yaml'
            arquivo.write_text('[]', encoding='utf-8')
            saida = Path(pasta) / 'selecao.json'
            resultado = subprocess.run([sys.executable, str(Path(__file__).with_name('classificar_mudancas.py')),
                '--config', str(arquivo), '--saida', str(saida)], capture_output=True)
            self.assertEqual(resultado.returncode, 2)
            self.assertTrue(json.loads(saida.read_text(encoding='utf-8'))['completo'])


if __name__ == '__main__':
    unittest.main()