import importlib
import json
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest

RAIZ = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(RAIZ / 'tools'))
import gerador
from conteudo import contexto, fontes, markdown


class ModulosTest(unittest.TestCase):
    def test_manifesto_completo(self):
        pacote = RAIZ / 'tools' / 'conteudo'
        arquivos = json.loads((pacote / 'arquivos.json').read_text(encoding='utf-8'))
        existentes = sorted(arquivo.relative_to(RAIZ / 'tools').as_posix()
                            for arquivo in pacote.rglob('*') if arquivo.is_file()
                            and '__pycache__' not in arquivo.parts and arquivo.name != 'arquivos.json')
        self.assertEqual(arquivos, existentes)
        self.assertEqual(len(arquivos), len(set(arquivos)))

    def test_api_reexportada(self):
        for nome, modulo in [('blocks', 'markdown'), ('img_bytes', 'imagens'),
                             ('treinamento_html', 'html_saida'), ('treinamento_docx', 'docx'),
                             ('treinamento_epub', 'epub'), ('slides_pptx', 'pptx')]:
            with self.subTest(nome=nome):
                self.assertIs(getattr(gerador, nome), getattr(importlib.import_module('conteudo.' + modulo), nome))

    def test_markdown_minimo(self):
        casos = json.loads((Path(__file__).parent / 'casos' / 'markdown.json').read_text(encoding='utf-8'))
        for caso in casos:
            with self.subTest(nome=caso['nome']):
                self.assertEqual(json.loads(json.dumps(markdown.blocks(caso['texto']))), caso['blocos'])
        titulo, slides = markdown.split_slides('---\ntitle: Teste\n---\n\n# Primeiro\n\n<!-- notas: Nota. -->\n\n---\n\n# Segundo\n')
        self.assertEqual(titulo, 'Teste')
        self.assertEqual(len(slides), 2)
        self.assertEqual(markdown.notas_para_narracao('---\ntitle: Teste\n---\n\n# Primeiro\n\n<!-- notas: Nota. -->\n\n---\n\n# Segundo\n'), ['Nota.', ''])

    def test_estado_compartilhado(self):
        for texto in ['<!-- linguagem-acessivel: decorativa -->\n![Logo](logo.png)', '![Logo](logo.png)']:
            contexto.registrar_decorativas(texto)
            self.assertIs(gerador.DECORATIVAS, contexto.DECORATIVAS)
            self.assertIs(gerador.DECORATIVAS_VISTAS, contexto.DECORATIVAS_VISTAS)
            self.assertEqual(contexto.decorativa('logo.png', 'Logo'), texto.startswith('<!--'))
        fontes.reiniciar_fontes()
        self.assertIsNone(fontes._FONTES_CSS)
        self.assertEqual(Path(fontes.FONTES_DIR), RAIZ / 'tools' / 'fontes')

    def test_imagens(self):
        self.assertEqual(gerador.img_bytes('data:image/png;base64,YWJj'), b'abc')
        self.assertIsNone(gerador.img_bytes('data:image/svg+xml,<svg/>'))
        self.assertIsNone(gerador.img_bytes('arquivo-inexistente.png'))
        codigo = '```markdown\n![Logo](arquivo-inexistente.png)\n```'
        self.assertEqual(gerador.embed_images(codigo), (codigo, 0, []))

    def test_pacote_publicado_importavel(self):
        with tempfile.TemporaryDirectory() as pasta:
            destino = Path(pasta)
            shutil.copy(RAIZ / 'tools' / 'gerador.py', destino)
            manifesto = json.loads((RAIZ / 'tools' / 'conteudo' / 'arquivos.json').read_text(encoding='utf-8'))
            for nome in manifesto:
                arquivo = destino / nome
                arquivo.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy(RAIZ / 'tools' / nome, arquivo)
            resultado = subprocess.run([sys.executable, '-I', '-c',
                "import sys;sys.path.insert(0,sys.argv[1]);import gerador;assert gerador.blocks('# Teste') == [('h',1,'Teste')];assert '<button' in gerador.slides_html('Teste',[('',gerador.blocks('# Teste'),'')],'')",
                str(destino)], capture_output=True, text=True, encoding='utf-8')
            self.assertEqual(resultado.returncode, 0, resultado.stderr)


if __name__ == '__main__':
    unittest.main()