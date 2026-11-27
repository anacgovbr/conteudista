import importlib
import json
import re
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
        self.assertEqual(set(slugs), set(markdown.LAYOUTS))
        ed = (RAIZ / 'web/editor.js').read_text(encoding='utf-8')
        cel = (RAIZ / 'web/celular.js').read_text(encoding='utf-8')
        for s in slugs:
            with self.subTest(slug=s):
                self.assertIn("'%s'" % s, ed, s)
                self.assertIn("'Slide: ' + rot", ed)
        self.assertIn('dataset.layout', ed)
        self.assertIn('mv-cat', cel)
        self.assertIn('dataset.layout', cel)
        # P1/P3/P5: os modelos trazem imagem de exemplo, eixos na tabela e rótulos de indicadores.
        self.assertIn('const imgph = ', ed)
        self.assertIn('data:image/png;base64,', ed)
        self.assertIn('| Meta | Realizado |', ed)
        self.assertIn('| Eixo Y / Eixo X |', ed)
        self.assertNotIn('Eixo X: Impacto', ed)
        _, sl = markdown.split_slides('# Slide\n\n<!-- layout: cards-4 -->\n\n| A | B |\n|---|---|\n| 1 | 2 |')
        self.assertEqual(sl[0][3], 'cards-4')
        _, ruim = markdown.split_slides('# Slide\n\n<!-- layout: inexistente -->')
        self.assertEqual(ruim[0][3], '')
        css = (RAIZ / 'tools/conteudo/recursos/apresentacao/layouts-slide.css').read_text(encoding='utf-8')
        for s in ('imagem-direita', 'cards-4', 'cards-6', 'cards-8', 'etapas-3', 'etapas-5', 'linha-tempo'):
            self.assertIn('lay-' + s, css)
        # P2/P4/P6: coluna reservada sem imagem, primeira coluna estreita e conteúdo no topo.
        self.assertIn(':has(>figure)', css)
        self.assertIn('td:first-child{width:18%}', css)
        self.assertIn('lay-titulo-conteudo .conteudo{justify-content:flex-start;gap:0.5rem}', css)
        png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2nKkAAAAASUVORK5CYII='
        cards = lambda n: '\n'.join('- **Card %d** — Texto do card' % i for i in range(1, n + 1))
        etapas = lambda n: '\n'.join('%d. **Etapa %d** — descreva a ação' % (i, i) for i in range(1, n + 1))
        corpo = {
            'branco': '', 'titulo-conteudo': '# Título\n\nTexto de apoio.', 'somente-titulo': '# Título',
            'imagem-direita': '# Título\n\n## Título\n\nTexto.\n\n![Descrição](%s)' % png,
            'imagem-esquerda': '# Título\n\n![Descrição](%s)\n\n## Título\n\nTexto.' % png,
            'meio-meio': '# Título\n\n![Descrição](%s)\n\n## Título\n\nTexto.' % png,
            'imagem-destaque': '# Título\n\n## Título\n\nLegenda.\n\n![Descrição](%s)' % png,
            'colunas-2': '# Título\n\n| Coluna 1 | Coluna 2 |\n|---|---|\n| Texto 1.1 | Texto 1.2 |',
            'colunas-3': '# Título\n\n| Coluna 1 | Coluna 2 | Coluna 3 |\n|---|---|---|\n| Texto 1.1 | Texto 1.2 | Texto 1.3 |',
            'pros-contras': '# Título\n\n| Prós | Contras |\n|---|---|\n| Vantagem | Desvantagem |',
            'antes-depois': '# Título\n\n| Antes | Depois |\n|---|---|\n| Atual | Desejada |',
            'cards-4': '# Destaques\n\n' + cards(4), 'cards-6': '# Destaques\n\n' + cards(6),
            'cards-8': '# Destaques\n\n' + cards(8),
            'matriz-2x2': '# Matriz\n\n| | A | B |\n|---|---|---|\n| A | Quadrante A | Quadrante B |\n| B | Quadrante C | Quadrante D |',
            'plano-cartesiano': '# Plano cartesiano\n\n| Eixo Y / Eixo X | Negativo | Positivo |\n|---|---|---|\n| Vertical (acima) | Q2 | Q1 |\n| Horizontal (abaixo) | Q3 | Q4 |',
            'swot': '# Matriz\n\n| | Positivo | Negativo |\n|---|---|---|\n| Interno | Forças | Fraquezas |\n| Externo | Oportunidades | Ameaças |',
            'priorizacao': '# Matriz\n\n| | Baixo esforço | Alto esforço |\n|---|---|---|\n| Alto impacto | Fazer agora | Planejar |\n| Baixo impacto | Delegar | Evitar |',
            'etapas-3': '# Processo\n\n' + etapas(3), 'etapas-5': '# Processo\n\n' + etapas(5),
            'linha-tempo': '# Linha do tempo\n\n1. **2024** — Marco 1\n2. **2025** — Marco 2\n3. **2026** — Marco 3',
            'fluxo-horizontal': '# Processo\n\n```mermaid\nflowchart LR\n    A[Início] --> B[Etapa] --> C[Fim]\n```',
            'indicadores-2': '# Indicadores\n\n| Meta | Realizado |\n|---|---|\n| — | — |',
            'indicadores-4': '# Indicadores\n\n| Meta | Realizado | Cobertura | Prazo |\n|---|---|---|---|\n| — | — | — | — |',
            'dashboard': '# Indicadores\n\n| Métrica | Valor | Tendência | Situação |\n|---|---|---|---|\n| Meta | 0 | — | — |\n| Realizado | 0 | — | — |',
        }
        slides = [('', markdown.blocks(corpo[s]), '', s) for s in slugs]
        for tema in ('govbr', 'classico', 'anac20-claro', 'anac20-escuro'):
            with self.subTest(tema=tema):
                h = gerador.slides_html('Apresentação', slides, 'Rodapé', tema)
                for s in slugs:
                    self.assertIn('lay-' + s, h, s)
                self.assertIn('Card 1', h)
                self.assertIn('Quadrante A', h)
                self.assertIn('2024', h)
                self.assertIn('Eixo Y / Eixo X', h)
                self.assertIn('Cobertura', h)
                self.assertNotIn('<!-- layout:', h)
        with tempfile.TemporaryDirectory() as d:
            p = Path(d) / 'slides.pptx'
            gerador.slides_pptx('Apresentação', slides, str(p), 'Rodapé', 'govbr')
            with zipfile.ZipFile(p) as z:
                self.assertIsNone(z.testzip())
                xml = ''.join(z.read(n).decode('utf-8') for n in z.namelist() if n.startswith('ppt/slides/slide'))
                self.assertIn('Card 1', xml)
                self.assertIn('Etapa 5', xml)
                self.assertIn('2024', xml)
                self.assertIn('Quadrante A', xml)
                self.assertIn('prst="ellipse"', xml)   # marcos da linha do tempo
        with tempfile.TemporaryDirectory() as d:
            md = '\n\n'.join('## %s\n\n%s' % (s, corpo[s]) for s in slugs if corpo[s])
            dp = Path(d) / 'apostila.docx'
            gerador.treinamento_docx(md, str(dp), 'Rodapé', 'govbr')
            with zipfile.ZipFile(dp) as z:
                doc = z.read('word/document.xml').decode('utf-8')
                for txt in ('Card 1', 'Etapa 3', '2024', 'Quadrante A', 'Forças'):
                    self.assertIn(txt, doc)
            ep = Path(d) / 'apostila.epub'
            gerador.treinamento_epub(md, str(ep), 'Rodapé', 'govbr')
            with zipfile.ZipFile(ep) as z:
                self.assertIsNone(z.testzip())
                xhtml = ''.join(z.read(n).decode('utf-8') for n in z.namelist() if n.endswith('.xhtml'))
                for txt in ('Card 1', 'Etapa 3', '2024', 'Quadrante A', 'Forças'):
                    self.assertIn(txt, xhtml)

    def test_placeholder_imagem_dos_modelos(self):
        import zipfile
        ed = (RAIZ / 'web/editor.js').read_text(encoding='utf-8')
        ini = ed.index("const imgph = '") + len("const imgph = '")
        ph = ed[ini:ed.index("';", ini)]
        self.assertTrue(ph.startswith('![Imagem'))
        sl = [('', markdown.blocks(ph), '', 'imagem-direita')]
        h = gerador.slides_html('Prova', sl, 'Rodapé', 'govbr')
        self.assertIn('<figure><img src="data:image/png;base64,', h)
        with tempfile.TemporaryDirectory() as d:
            p = Path(d) / 'prova.pptx'
            gerador.slides_pptx('Prova', sl, str(p), 'Rodapé', 'govbr')
            with zipfile.ZipFile(p) as z:
                self.assertIsNone(z.testzip())
                self.assertIn('ppt/media/image1.png', z.namelist())
            doc = Path(d) / 'prova.docx'
            gerador.treinamento_docx(ph, str(doc), 'Rodapé', 'govbr')
            with zipfile.ZipFile(doc) as z:
                self.assertTrue(any(n.startswith('word/media/') for n in z.namelist()))
            ep = Path(d) / 'prova.epub'
            gerador.treinamento_epub(ph, str(ep), 'Rodapé', 'govbr')
            with zipfile.ZipFile(ep) as z:
                self.assertIsNone(z.testzip())
                self.assertTrue(any(n.startswith('OEBPS/img/') for n in z.namelist()))

    def test_tema_html_frontend_slides(self):
        import zipfile
        with tempfile.TemporaryDirectory() as d:
            arqs, res = gerador.gerar('# Apostila\n\nTexto.', '# Slide\n\nTexto do slide.',
                                      prefixo='Prova', saida=d, tema='bold-signal',
                                      formatos='html,md,docx,pptx')
            self.assertIn('tema: Bold Signal', res)
            h = (Path(d) / 'Apresentacao_Prova.html').read_text(encoding='utf-8')
            self.assertIn('fs-slide-in', h)
            self.assertIn('data-fs-reveal', h)
            md = (Path(d) / 'Apresentacao_Prova.md').read_text(encoding='utf-8')
            self.assertIn('theme: bold-signal', md)
            for nome in ('Apresentacao_Prova.pptx', 'Apostila_Prova.docx'):
                with zipfile.ZipFile(Path(d) / nome) as z:
                    self.assertIsNone(z.testzip(), nome)

    def test_formatos_abertos(self):
        import json, re, zipfile, xml.dom.minidom as dom
        gm = '# Guia de Teste\n\nTexto com **negrito**, *itálico* e [link](https://exemplo.gov.br).\n\n## Lista\n\n- um\n- dois\n  - filho\n\n1. a\n2. b\n\n| A | B |\n|---|---|\n| 1 | 2 |\n\n```python\nprint(1)\n```\n\n> [!info] Nota\n\n![Foto](foto.png)\n'
        sm = '---\ntitle: Aula\n---\n\n# Slide 1\n\nTexto.\n\n<!-- notas: fale devagar -->\n\n---\n\n# Slide 2\n\n- ponto\n'
        formatos = 'odt,odp,pdf,rtf,txt,wiki,yaml,json'
        with tempfile.TemporaryDirectory() as d:
            arqs, res = gerador.gerar(gm, sm, prefixo='teste-aberto', saida=d, formatos=formatos)
            nomes = sorted(Path(a).name for a in arqs)
            esperado = sorted(['Apostila_teste-aberto.' + e for e in ('odt', 'pdf', 'rtf', 'txt', 'wiki')]
                              + ['Apresentacao_teste-aberto.' + e for e in ('odp', 'pdf', 'rtf', 'txt', 'wiki')]
                              + ['Conteudo_teste-aberto.json', 'Conteudo_teste-aberto.yaml'])
            self.assertEqual(nomes, esperado, res)
            self.assertNotIn('ERRO', res)
            for nome in ('Apostila_teste-aberto.odt', 'Apresentacao_teste-aberto.odp'):
                with zipfile.ZipFile(Path(d) / nome) as z:
                    self.assertIsNone(z.testzip())
                    self.assertEqual(z.namelist()[0], 'mimetype')
                    self.assertEqual(z.getinfo('mimetype').compress_type, zipfile.ZIP_STORED)
                    for x in z.namelist():
                        if x.endswith('.xml'):
                            dom.parseString(z.read(x))
            odt = zipfile.ZipFile(Path(d) / 'Apostila_teste-aberto.odt').read('content.xml').decode('utf-8')
            self.assertIn('text:outline-level', odt)
            self.assertIn('<table:table ', odt)
            self.assertEqual(odt.count('<draw:page'), 0)
            self.assertEqual(zipfile.ZipFile(Path(d) / 'Apresentacao_teste-aberto.odp').read('content.xml').decode('utf-8').count('<draw:page '), 2)
            pdf = (Path(d) / 'Apostila_teste-aberto.pdf').read_bytes()
            self.assertTrue(pdf.startswith(b'%PDF-1.4') and pdf.rstrip().endswith(b'%%EOF'))
            inicio = int(re.search(rb'startxref\n(\d+)', pdf).group(1))
            self.assertEqual(pdf[inicio:inicio + 4], b'xref')
            self.assertIn(b'/Lang (pt-BR)', pdf)
            rtf = (Path(d) / 'Apostila_teste-aberto.rtf').read_text(encoding='ascii')
            self.assertEqual(rtf.count('{') - rtf.count('\\{'), rtf.count('}') - rtf.count('\\}'))
            self.assertIn('{\\b negrito}', rtf)
            wiki = (Path(d) / 'Apostila_teste-aberto.wiki').read_text(encoding='utf-8')
            self.assertIn("'''negrito'''", wiki)
            self.assertIn('{| class="wikitable"', wiki)
            self.assertIn('[https://exemplo.gov.br link]', wiki)
            txt = (Path(d) / 'Apresentacao_teste-aberto.txt').read_text(encoding='utf-8')
            self.assertIn('Notas do apresentador: fale devagar', txt)
            dados = json.loads((Path(d) / 'Conteudo_teste-aberto.json').read_text(encoding='utf-8'))
            self.assertEqual(len(dados['apresentacao']['slides']), 2)
            self.assertEqual(dados['apresentacao']['slides'][0]['notas'], 'fale devagar')
            self.assertEqual(dados['apostila'][0], {'tipo': 'titulo', 'nivel': 1, 'texto': 'Guia de Teste'})
            try:
                import yaml as pyyaml
            except ImportError:
                pyyaml = None
            if pyyaml:
                self.assertEqual(pyyaml.safe_load((Path(d) / 'Conteudo_teste-aberto.yaml').read_text(encoding='utf-8')), dados)
    # ---- Prompt curto com instruções no GitHub (critérios CA-01 a CA-13 da SPEC) ----
    URL_PROMPT = 'https://raw.githubusercontent.com/anacgovbr/conteudista/main/docs/PROMPT_GERACAO_IA.md'
    URL_REGRAS = 'https://raw.githubusercontent.com/anacgovbr/conteudista/main/docs/REGRAS_ACESSIBILIDADE_LINGUAGEM_SIMPLES.md'

    def _docs(self):
        return ((RAIZ / 'docs/PROMPT_GERACAO_IA.md').read_text(encoding='utf-8'),
                (RAIZ / 'docs/REGRAS_ACESSIBILIDADE_LINGUAGEM_SIMPLES.md').read_text(encoding='utf-8'))

    def _prompt_ui(self):
        import html
        h = (RAIZ / 'web/index.html').read_text(encoding='utf-8')
        m = re.search(r'<pre id="promptIA">(.*?)</pre>', h, re.S)
        self.assertIsNotNone(m, 'bloco #promptIA')
        return html.unescape(m.group(1)).replace('\r\n', '\n').strip()

    def _lac(self, textos):
        r = subprocess.run(['node', str(RAIZ / 'tools/testes/referencias_lac.mjs')], input=json.dumps({'textos': textos}),
                           capture_output=True, text=True, encoding='utf-8')
        self.assertEqual(r.returncode, 0, r.stderr)
        return json.loads(r.stdout)

    def _blocos_marcados(self, doc, marca):
        return re.findall(r'<!-- %s -->\n`{4}markdown\n(.*?)\n`{4}' % marca, doc, re.S)

    def test_ca01_ca02_ca05_ca13_prompt_curto(self):
        p = self._prompt_ui()
        self.assertLessEqual(len(p), 800, 'prompt curto, sem instruções longas')
        for ph in ('[TEMA]', '[PÚBLICO-ALVO]', '[OBJETIVOS DE APRENDIZAGEM]'):
            self.assertIn(ph, p)
        self.assertIn(self.URL_PROMPT, p)
        self.assertIn('dois conteúdos Markdown', p)
        self.assertIn('(1) apresentação com narração nas notas dos próprios slides; (2) apostila complementar', p)
        self.assertIn('Use os arquivos, textos e links de referência que eu fornecer', p)
        self.assertIn('solicite que eu cole seu conteúdo antes de gerar o material', p, 'fallback se a URL não abrir')
        self.assertIn('Não diga que leu o documento se não teve acesso', p)
        for proibido in ('terceiro', 'arquivo de narração', 'Se a IA utilizada permitir'):
            self.assertNotIn(proibido, p)
        t = (RAIZ / 'web/exemplo/treinamento.md').read_text(encoding='utf-8')
        m = re.search(r'### 11\.3 O prompt curto.*?\n`{3,6}text\n(.*?)\n`{3,6}\n', t, re.S)
        self.assertIsNotNone(m, 'prompt na seção 11.3')
        self.assertEqual(m.group(1).strip(), p, 'prompt da tela e da apostila de exemplo idênticos')
        self.assertNotIn('PROMPT PADRÃO', t)
        h = (RAIZ / 'web/index.html').read_text(encoding='utf-8')
        dica = re.search(r'<p class="note" id="dicaPrompt">(.*?)</p>', h, re.S)
        self.assertIsNotNone(dica)
        self.assertIn('Se a IA utilizada permitir, anexe documentos ou forneça textos e links de referência para fundamentar o conteúdo.', dica.group(1))
        self.assertNotIn('dicaPrompt', re.search(r'<pre id="promptIA">.*?</pre>', h, re.S).group(0))

    def test_ca03_ca04_urls_e_arquivos(self):
        c, a = self._docs()
        self.assertIn(self.URL_REGRAS, c, 'documento principal aponta para as regras (URL exata)')
        self.assertIn(self.URL_PROMPT, a)
        for caminho in ('docs/PROMPT_GERACAO_IA.md', 'docs/REGRAS_ACESSIBILIDADE_LINGUAGEM_SIMPLES.md'):
            self.assertTrue((RAIZ / caminho).is_file(), caminho)
        for u in (self.URL_PROMPT, self.URL_REGRAS):
            self.assertTrue((RAIZ / u.split('/main/')[1]).is_file(), u)
        for doc in (c, a):
            for rel in re.findall(r'\]\(((?!https?:|#)[^)\s]+\.md)\)', doc):
                self.assertTrue((RAIZ / 'docs' / rel).is_file(), rel)
        self.assertIn('peça que a pessoa cole o conteúdo do documento', c)
        self.assertIn('peça que a pessoa cole o conteúdo do documento', a)
        self.assertIn('não afirme ter executado os validadores', c.lower())

    def test_ca05_somente_dois_markdown(self):
        c, _ = self._docs()
        self.assertIn('exatamente dois arquivos', c)
        self.assertIn('**Não crie um terceiro arquivo de narração.**', c)
        self.assertIn('Apresentacao_NOME.md', c)
        self.assertIn('Apostila_NOME.md', c)
        self.assertIn('Entreguei **dois** arquivos Markdown e nenhum terceiro de narração', c)

    def test_ca06_notas_ligadas_ao_slide_certo(self):
        ex = (RAIZ / 'docs/exemplos/apresentacao-exemplo.md').read_text(encoding='utf-8')
        titulo, sl = markdown.split_slides(ex)
        self.assertEqual(titulo, 'Pedido de certificação')
        self.assertEqual(len(sl), 7)
        notas = markdown.notas_para_narracao(ex)
        self.assertEqual(len(notas), 7)
        h1 = [next((b[2] for b in s[1] if b[0] == 'h' and b[1] == 1), '') for s in sl]
        self.assertEqual(h1, ['Pedido de certificação', 'O que você vai aprender', 'Etapas do pedido', 'Prazo de resposta',
                              'Quatro etapas em cartões', 'Para saber mais', 'Obrigado'])
        esperado = ['Esta apresentação mostra', 'Você vai aprender três coisas', 'O fluxo começa', 'A tabela compara os dois prazos',
                    'Cada cartão mostra', 'Para saber mais, leia', '']
        for i, e in enumerate(esperado):
            self.assertTrue(notas[i].startswith(e) if e else notas[i] == '', (i, notas[i][:40]))
        self.assertEqual(len(set(notas[:6])), 6, 'notas distintas')
        self.assertIn('antes-depois', [s[3] for s in sl])
        # a nota do slide com tabela descreve a informação visual em linguagem natural, sem instrução técnica
        self.assertNotIn('veja a tabela', notas[3].lower())
        # as notas não aparecem no conteúdo visível dos slides
        for s in sl:
            self.assertNotIn('notas', json.dumps(s[1]))

    def test_ca07_exemplos_de_divisao_aceitos_pelo_parser(self):
        c, _ = self._docs()
        validos = re.findall(r'<!-- exemplo-slides: (\d+) -->\n`{4}markdown\n(.*?)\n`{4}', c, re.S)
        self.assertGreaterEqual(len(validos), 5)
        for n, md in validos:
            _, sl = markdown.split_slides(md)
            self.assertEqual(len(sl), int(n), md[:60])
        invalidos = re.findall(r'<!-- exemplo-invalido: slides=(\d+) -->\n`{4}markdown\n(.*?)\n`{4}', c, re.S)
        self.assertEqual(len(invalidos), 4)
        for n, md in invalidos:
            _, sl = markdown.split_slides(md)
            self.assertEqual(len(sl), int(n), md[:60])
        r = self._lac([{'texto': md, 'tipo': 'apresentacao'} for _, md in invalidos])['resultados']
        self.assertIn('e2', r[2]['codigos'], 'slide sem título continua sendo apontado')
        for slug in set(re.findall(r'<!-- layout: ([\w-]+) -->', c)) - {'slug'}:
            self.assertIn(slug, markdown.LAYOUTS)
        for slug in markdown.LAYOUTS:
            self.assertIn('| `%s` |' % slug, c)
        # variantes do separador
        casos = {'# A\n\n---   \n\n# B\n': 2, '# A\r\n\r\n---\r\n\r\n# B\r\n': 2, '# A\ntexto\n---\n# B\n': 2,
                 '# A\n\n----\n\n# B\n': 1, '# A\n\n***\n\n# B\n': 1, '# A\n\n___\n\n# B\n': 1, '# A\n\ntexto\n\n# B\n': 1}
        for md, n in casos.items():
            self.assertEqual(len(markdown.split_slides(md)[1]), n, repr(md))

    def test_ca08_apostila_importavel_e_exportavel(self):
        ex = (RAIZ / 'docs/exemplos/apostila-exemplo.md').read_text(encoding='utf-8')
        tipos = [b[0] for b in markdown.blocks(ex)]
        for esperado in ('h', 'p', 'list', 'table', 'img', 'code', 'quote'):
            self.assertIn(esperado, tipos, esperado)
        self.assertEqual(sum(1 for b in markdown.blocks(ex) if b[0] == 'h' and b[1] == 1), 1)
        self.assertIn('(https://www.gov.br/anac)', ex)
        with tempfile.TemporaryDirectory() as d:
            arqs, res = gerador.gerar(ex, '', prefixo='apostila-ref', saida=d, formatos='html,md,docx,epub,odt')
            self.assertNotIn('ERRO', res)
            nomes = sorted(Path(a).suffix for a in arqs)
            self.assertEqual(nomes, ['.docx', '.epub', '.html', '.md', '.odt'])
            h = (Path(d) / 'Apostila_apostila-ref.html').read_text(encoding='utf-8')
            self.assertIn('<table', h)
            self.assertIn('<caption', h)
            self.assertIn('Informação:</strong>', h)
            self.assertIn('Atenção:</strong>', h)
            self.assertIn('gab-sec', h, 'seção Gabarito escondida até ser mostrada')
            md = (Path(d) / 'Apostila_apostila-ref.md').read_text(encoding='utf-8')
            self.assertEqual(markdown.blocks(md)[0], ('h', 1, 'Pedido de certificação: guia de estudo'))

    def test_ca09_regras_documentadas_correspondem_ao_validador(self):
        _, a = self._docs()
        d = self._lac([])
        self.assertEqual(len(d['regras']), 23)
        trecho = a.split('## 4. Inventário das 23 regras')[1].split('## 5.')[0]
        corrigir, sugestoes = trecho.split('### Sugestões')
        for r in d['regras']:
            linha = '| %s | `%s` | %s |' % (r['codigo'], r['id'], 'Para corrigir' if r['nivel'] == 'corrigir' else 'Sugestão')
            self.assertIn(linha, corrigir if r['nivel'] == 'corrigir' else sugestoes, r)
            self.assertIn('`regras/%s.js`' % r['id'], a)
            self.assertTrue((RAIZ / 'web/lib/linguagem-acessivel/regras' / ('%s.js' % r['id'])).is_file(), r['id'])
        for e in d['exemplos']:
            self.assertIn(e['ruim'], a, 'exemplo inválido de %s' % e['codigo'])
            self.assertIn(e['bom'], a, 'exemplo válido de %s' % e['codigo'])
        self.assertIn('| Palavras por frase | %d | f1 |' % d['limites']['frase'], a)
        self.assertIn('| Palavras por frase nas notas de narração | %d | n1 |' % d['limites']['narracao'], a)
        self.assertIn('| Palavras por parágrafo | %d | f2 |' % d['limites']['paragrafo'], a)
        self.assertIn('| Caracteres da descrição de imagem | %d | i3 |' % d['descricaoLonga'], a)
        self.assertIn('node tools/linguagem-acessivel/testar.mjs', a)
        self.assertTrue((RAIZ / 'tools/linguagem-acessivel/testar.mjs').is_file())

    def test_ca09_narracao_so_a_regra_n1_le_as_notas(self):
        _, a = self._docs()
        longa = ' '.join(['palavra'] * 30)
        nota = '<!-- notas: %s. A ANAC e o DECEA publicam. ATENÇÃO ESTE PRAZO TERMINA HOJE. -->' % longa
        base = '---\ntitle: T\n---\n\n# Slide\n\nTexto simples.\n\n' + nota + '\n'
        r = self._lac([base, base.replace('notas:', 'narracao:')])['resultados']
        for x in r:
            self.assertEqual(x['codigos'], ['n1'], 'as notas só acionam a regra n1: %s' % x)
        self.assertIn('**somente pela regra n1**', a)
        self.assertIn('**não leem as notas**', a)

    def test_ca10_exemplos_nao_disparam_violacoes_evitaveis(self):
        c, _ = self._docs()
        textos = [(RAIZ / 'docs/exemplos/apresentacao-exemplo.md').read_text(encoding='utf-8'),
                  (RAIZ / 'docs/exemplos/apostila-exemplo.md').read_text(encoding='utf-8')]
        textos += self._blocos_marcados(c, 'exemplo-validado: apresentacao')
        for r in self._lac(textos)['resultados']:
            self.assertEqual(r['resumo']['corrigir'], 0, r)
            self.assertEqual(r['resumo']['sugestoes'], 0, r)
        for doc in ('docs/PROMPT_GERACAO_IA.md', 'docs/REGRAS_ACESSIBILIDADE_LINGUAGEM_SIMPLES.md', 'web/exemplo/treinamento.md', 'web/exemplo/apresentacao.md'):
            self.assertEqual(self._lac([(RAIZ / doc).read_text(encoding='utf-8')])['resultados'][0]['resumo']['corrigir'], 0, doc)
        with tempfile.TemporaryDirectory() as d:
            _, res = gerador.gerar('', textos[0], prefixo='ref', saida=d, formatos='html,pptx')
            self.assertIn('slides: 7', res)
            self.assertNotIn('ERRO', res)
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