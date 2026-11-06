import argparse
from pathlib import Path
import sys
import tempfile
import unittest

RAIZ = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(RAIZ / 'tools'))
import gerador


def testar(formato):
    texto = (RAIZ / 'web/exemplo/treinamento.md').read_text(encoding='utf-8')
    apresentacao = (RAIZ / 'web/exemplo/apresentacao.md').read_text(encoding='utf-8')
    titulo, slides = gerador.split_slides(apresentacao)
    with tempfile.TemporaryDirectory() as pasta:
        raiz = Path(pasta)
        gerador.registrar_decorativas(texto)
        if formato == 'markdown':
            suite = unittest.defaultTestLoader.discover(str(Path(__file__).parent), pattern='testar_modulos.py')
            if not unittest.TextTestRunner().run(suite).wasSuccessful():
                raise AssertionError('Contratos de Markdown e modulos falharam')
        elif formato in ('html_apostila', 'html_apresentacao'):
            import testar_acessibilidade as acessibilidade
            for tema in gerador.TEMAS:
                arquivo = raiz / 'teste.html'
                if formato == 'html_apostila':
                    gerador.registrar_decorativas(texto)
                    html = gerador.treinamento_html(gerador.sem_comentarios(texto), 'Teste', tema)
                    arquivo.write_text(html, encoding='utf-8')
                    acessibilidade.testar_apostila_html(str(arquivo), False)
                else:
                    gerador.registrar_decorativas(apresentacao)
                    html = gerador.slides_html(titulo, slides, 'Teste', tema)
                    arquivo.write_text(html, encoding='utf-8')
                    acessibilidade.testar_slides_html(str(arquivo), False)
            if acessibilidade.FALHAS:
                raise AssertionError(acessibilidade.FALHAS)
        elif formato in ('docx', 'pptx', 'epub'):
            import testar_acessibilidade as acessibilidade
            arquivo = raiz / ('teste.' + formato)
            if formato == 'docx':
                gerador.treinamento_docx(gerador.sem_comentarios(texto), str(arquivo), 'Teste')
                acessibilidade.testar_docx(str(arquivo))
            elif formato == 'pptx':
                gerador.registrar_decorativas(apresentacao)
                gerador.slides_pptx(titulo, slides, str(arquivo), 'Teste')
                acessibilidade.testar_pptx(str(arquivo), 'Arial')
            else:
                for familia in ('atkinson', 'opendyslexic'):
                    gerador.registrar_decorativas(texto)
                    gerador.treinamento_epub(gerador.sem_comentarios(texto), str(arquivo), 'Teste', fonte=familia)
                    acessibilidade.testar_epub(str(arquivo), familia, False)
            if acessibilidade.FALHAS:
                raise AssertionError(acessibilidade.FALHAS)
        elif formato == 'exemplo':
            testar('html_apostila')
            testar('html_apresentacao')
        print('OK: gerador_' + formato)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--formato', choices=['markdown', 'html_apostila', 'html_apresentacao', 'docx', 'pptx', 'epub', 'exemplo'], required=True)
    testar(parser.parse_args().formato)