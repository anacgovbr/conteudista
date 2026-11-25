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
from conteudo import contexto, fontes, licencas, markdown


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
            self.assertIs(gerador.licencas, licencas)

    def test_tabela_sem_separador(self):
        com = markdown.blocks('| A | B |\n|---|:-:|\n| 1 | 2 |')
        sem = markdown.blocks('| A | B |\n| 1 | 2 |\n| 3 | 4 |')
        self.assertEqual(com, [('table', [['A', 'B'], ['1', '2']])])
        self.assertEqual(sem, [('table', [['A', 'B'], ['1', '2'], ['3', '4']])])

    def test_catalogo_licencas(self):
        self.assertEqual(licencas.validar(), '')
        self.assertEqual(licencas.aviso_html(), '')
        self.assertEqual(len(licencas.LICENCAS), 7)
        for codigo, item in licencas.LICENCAS.items():
            with self.subTest(codigo=codigo):
                aviso = licencas.aviso_html(codigo)
                self.assertIn(item['nome'], aviso)
                self.assertIn(item['sigla'], aviso)
                self.assertIn('href="%s"' % item['url'], aviso)
                self.assertIn(licencas.RESSALVA, aviso)
        with self.assertRaises(ValueError):
            licencas.validar('cc-by-3.0')

    def test_roundtrip_markdown_licenca(self):
        apostila = '# Apostila\n\nTexto.'
        apresentacao = '---\ntitle: Curso\n---\n\n# Slide\n\nTexto.'
        for texto, slides in ((apostila, False), (apresentacao, True)):
            with self.subTest(slides=slides):
                gerado = licencas.anexar_markdown(texto, 'cc-by-4.0', slides)
                limpo, codigo = licencas.separar_markdown(gerado)
                self.assertEqual(limpo, texto)
                self.assertEqual(codigo, 'cc-by-4.0')
                self.assertEqual(licencas.anexar_markdown(limpo, codigo, slides), gerado)

    def test_gerar_licenca_opcional(self):
        import wave
        from zipfile import ZipFile
        from docx import Document
        from pptx import Presentation

        apostila = '# Apostila\n\nTexto final.'
        apresentacao = '---\ntitle: Curso\n---\n\n# Slide\n\nTexto.'
        with tempfile.TemporaryDirectory() as pasta:
            gerador.gerar(apostila, apresentacao, prefixo='Sem', saida=pasta)
            self.assertNotIn('class="licenciamento"', (Path(pasta) / 'Apostila_Sem.html').read_text(encoding='utf-8'))
            self.assertNotIn('class="licenciamento"', (Path(pasta) / 'Apresentacao_Sem.html').read_text(encoding='utf-8'))
            self.assertEqual(len(Presentation(str(Path(pasta) / 'Apresentacao_Sem.pptx')).slides), 1)

            gerador.gerar(apostila, apresentacao, prefixo='Com', saida=pasta, licenca='cc-by-4.0')
            md = (Path(pasta) / 'Apostila_Com.md').read_text(encoding='utf-8')
            self.assertEqual(md.count('conteudista:licenciamento:inicio='), 1)
            html_g = (Path(pasta) / 'Apostila_Com.html').read_text(encoding='utf-8')
            self.assertIn('class="licenciamento"', html_g)
            self.assertLess(html_g.index('class="licenciamento"'), html_g.index('</article>'))
            html_s = (Path(pasta) / 'Apresentacao_Com.html').read_text(encoding='utf-8')
            self.assertIn('aria-label="Slide 2 de 2"', html_s)
            self.assertLess(html_s.rindex('aria-label="Slide 2 de 2"'), html_s.rindex('</section>'))
            docx = Document(str(Path(pasta) / 'Apostila_Com.docx'))
            self.assertEqual(docx.paragraphs[-3].text, 'Licenciamento')
            self.assertIn(licencas.LICENCAS['cc-by-4.0']['url'], docx.element.body.xml)
            with ZipFile(Path(pasta) / 'Apostila_Com.epub') as epub:
                opf = epub.read('OEBPS/content.opf').decode('utf-8')
                self.assertIn('<dc:rights>CC BY 4.0', opf)
                self.assertIn('licenciamento.xhtml', opf)
                self.assertIn(licencas.LICENCAS['cc-by-4.0']['url'], epub.read('OEBPS/licenciamento.xhtml').decode('utf-8'))
            slides = Presentation(str(Path(pasta) / 'Apresentacao_Com.pptx')).slides
            self.assertEqual(len(slides), 2)
            self.assertIn('Licenciamento', ' '.join(shape.text for shape in slides[-1].shapes if shape.has_text_frame))

            audio = Path(pasta) / 'fora-do-intervalo.wav'
            with wave.open(str(audio), 'wb') as wav:
                wav.setnchannels(1); wav.setsampwidth(2); wav.setframerate(22050); wav.writeframes(b'\0\0' * 220)
            html_s = gerador.slides_html('Curso', [('title', gerador.blocks('# Slide'), '')], '',
                                         audios={1: str(audio)}, licenca='cc-by-4.0')
            self.assertNotIn('data-s="1"', html_s)
            gerador.slides_pptx('Curso', [('title', gerador.blocks('# Slide'), '')],
                                str(Path(pasta) / 'Audio.pptx'), '', audios={1: str(audio)}, licenca='cc-by-4.0')
            with ZipFile(Path(pasta) / 'Audio.pptx') as pptx:
                self.assertNotIn('a:audioFile', pptx.read('ppt/slides/slide2.xml').decode('utf-8'))

    def test_markdown_minimo(self):
        casos = json.loads((Path(__file__).parent / 'casos' / 'markdown.json').read_text(encoding='utf-8'))
        for caso in casos:
            with self.subTest(nome=caso['nome']):
                self.assertEqual(json.loads(json.dumps(markdown.blocks(caso['texto']))), caso['blocos'])
        titulo, slides = markdown.split_slides('---\ntitle: Teste\n---\n\n# Primeiro\n\n<!-- notas: Nota. -->\n\n---\n\n# Segundo\n')
        self.assertEqual(titulo, 'Teste')
        self.assertEqual(len(slides), 2)
        self.assertEqual(markdown.notas_para_narracao('---\ntitle: Teste\n---\n\n# Primeiro\n\n<!-- notas: Nota. -->\n\n---\n\n# Segundo\n'), ['Nota.', ''])

    def test_layouts_de_slide(self):
        import zipfile
        slugs = ('branco titulo-conteudo somente-titulo imagem-direita imagem-esquerda meio-meio '
                 'imagem-destaque colunas-2 colunas-3 pros-contras antes-depois cards-4 cards-6 cards-8 '
                 'matriz-2x2 plano-cartesiano swot priorizacao etapas-3 etapas-5 linha-tempo '
                 'fluxo-horizontal indicadores-2 indicadores-4 dashboard').split()
        self.assertEqual(len(slugs), 25)
        ed = (RAIZ / 'web/editor.js').read_text(encoding='utf-8')
        cel = (RAIZ / 'web/celular.js').read_text(encoding='utf-8')
        for s in slugs:
            with self.subTest(slug=s):
                self.assertIn("'%s'" % s, ed, s)
        self.assertIn('Slide:', cel)
        _, sl = markdown.split_slides('# Slide\n\n<!-- layout: cards-4 -->\n\n| A | B |\n|---|---|\n| 1 | 2 |')
        self.assertEqual(sl[0][3], 'cards-4')
        _, ruim = markdown.split_slides('# Slide\n\n<!-- layout: inexistente -->')
        self.assertEqual(ruim[0][3], '')
        css = (RAIZ / 'tools/conteudo/recursos/apresentacao/layouts-slide.css').read_text(encoding='utf-8')
        self.assertIn('.s.lay-imagem-direita', css)
        self.assertIn('lay-cards-4', gerador.slides_html('Apresentação', sl, 'Rodapé'))
        with tempfile.TemporaryDirectory() as d:
            p = Path(d) / 'slides.pptx'
            gerador.slides_pptx('Apresentação', sl, str(p), 'Rodapé')
            with zipfile.ZipFile(p) as z:
                self.assertIsNone(z.testzip())
                self.assertIn('ppt/slides/slide1.xml', z.namelist())

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
        remota = '![x](http://127.0.0.1:9/x.png)'
        self.assertEqual(gerador.embed_images(remota), (remota, 0, ['http://127.0.0.1:9/x.png']))
        self.assertEqual(gerador.embed_images(remota, remotas=True), (remota, 0, ['http://127.0.0.1:9/x.png']))

    def test_geracao_sem_arquivo_antigo(self):
        with tempfile.TemporaryDirectory() as pasta:
            antigo = Path(pasta) / 'Apostila_Falha.docx'
            antigo.write_bytes(b'antigo')
            original = gerador.treinamento_docx
            def falhar(*a, **k): raise RuntimeError('sem docx')
            gerador.treinamento_docx = falhar
            try:
                arqs, res = gerador.gerar('# Apostila\n\nTexto.', '', prefixo='Falha', saida=pasta)
            finally:
                gerador.treinamento_docx = original
            self.assertIn('docx: ERRO', res)
            self.assertFalse(antigo.exists(), 'saída antiga do mesmo prefixo é removida')
            self.assertTrue((Path(pasta) / 'Apostila_Falha.html').is_file())
            self.assertNotIn(str(antigo), arqs)
            self.assertEqual([p.name for p in Path(pasta).iterdir() if p.name.startswith('.gerar-')], [])

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