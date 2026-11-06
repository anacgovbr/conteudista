import json
from pathlib import Path
import subprocess
import tempfile
import unittest

from classificar_mudancas import carregar_config, classificar, mudancas_git


class ClassificadorTest(unittest.TestCase):
    def test_fixtures(self):
        casos = json.loads((Path(__file__).parent / 'fixtures' / 'mudancas' / 'casos.json').read_text(encoding='utf-8'))
        for caso in casos:
            with self.subTest(nome=caso['nome']):
                resultado = classificar(caso['registros'])
                self.assertEqual(resultado['completo'], caso['completo'])
                self.assertEqual(resultado['playwright'], caso['chrome'])
                self.assertTrue(set(caso['grupos']) <= set(resultado['grupos']))
                if 'gerador' in caso:
                    self.assertEqual(resultado['gerador'], caso['gerador'])

    def test_publicacao_exige_completo(self):
        resultado = classificar([{'caminho': 'web/editor.js'}], evento='push', branch='main')
        self.assertTrue(resultado['completo'])

    def test_tres_dominios(self):
        resultado = classificar([{'caminho': nome} for nome in ['web/editor.js', 'web/locucao.js', 'web/config/opcoes.yaml']])
        self.assertTrue(resultado['completo'])

    def test_config_invalida(self):
        with tempfile.TemporaryDirectory() as pasta:
            caminho = Path(pasta) / 'grupos.yaml'
            caminho.write_text('{"versao": 99}', encoding='utf-8')
            with self.assertRaises(ValueError):
                carregar_config(caminho)

    def test_diff_real_com_renomeacao_e_exclusao(self):
        with tempfile.TemporaryDirectory() as pasta:
            raiz = Path(pasta)
            def comando(*args):
                return subprocess.check_output(['git', *args], cwd=raiz).decode().strip()
            comando('init', '-q')
            comando('config', 'user.name', 'Teste')
            comando('config', 'user.email', 'teste@example.test')
            (raiz / 'web').mkdir()
            (raiz / 'web' / 'editor.js').write_text('const teste = 1;\n', encoding='utf-8')
            (raiz / 'README.md').write_text('# Teste\n', encoding='utf-8')
            comando('add', '.')
            comando('commit', '-qm', 'base')
            comando('mv', 'web/editor.js', 'web/locucao.js')
            comando('rm', 'README.md')
            comando('commit', '-qm', 'mudanca')
            registros, _, _, _ = mudancas_git('HEAD~1', 'HEAD', raiz)
            resultado = classificar(registros)
            self.assertIn('editor', resultado['dominios'])
            self.assertIn('locucao', resultado['dominios'])
            self.assertIn('README.md', resultado['arquivos'])


if __name__ == '__main__':
    unittest.main()