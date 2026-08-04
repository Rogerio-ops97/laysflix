Exit code: 0
Wall time: 0.3 seconds
Output:
# LaysFlix

PWA pessoal para organizar filmes e sÃ©ries usando dados do TMDB. A biblioteca, a chave do TMDB e o progresso ficam armazenados somente no navegador do aparelho.

## Publicar no GitHub Pages

1. No GitHub, crie um repositÃ³rio pÃºblico chamado `laysflix`.
2. Envie **todo o conteÃºdo desta pasta** para a raiz do repositÃ³rio, mantendo as pastas e os nomes dos arquivos.
3. Abra **Settings â†’ Pages** no repositÃ³rio.
4. Em **Build and deployment**, selecione **Deploy from a branch**.
5. Escolha a branch `main`, a pasta `/ (root)` e clique em **Save**.
6. Aguarde alguns minutos. O endereÃ§o serÃ¡ `https://SEU-USUARIO.github.io/laysflix/`.

Os caminhos do manifest e do service worker sÃ£o relativos, portanto funcionam corretamente dentro da subpasta do GitHub Pages.

## Instalar no iPhone

1. Abra o endereÃ§o publicado no **Safari**.
2. Toque no botÃ£o **Compartilhar** (quadrado com seta para cima).
3. Role a lista e toque em **Adicionar Ã  Tela de InÃ­cio**.
4. Confirme o nome `LaysFlix` e toque em **Adicionar**.
5. Abra o novo Ã­cone, toque na engrenagem e informe a chave da API ou o token de leitura do TMDB.

Se a opÃ§Ã£o nÃ£o aparecer, confirme que a pÃ¡gina foi aberta no Safari, e nÃ£o dentro do navegador de outro aplicativo.

## AtualizaÃ§Ãµes e dados

- ApÃ³s o primeiro carregamento, a interface bÃ¡sica funciona offline. Pesquisas e imagens do TMDB precisam de internet.
- A chave e a biblioteca ficam no aparelho. Limpar os dados do Safari remove essas informaÃ§Ãµes.
- Use **Exportar backup** regularmente e guarde o arquivo em local seguro.
- Para atualizar o app, substitua os arquivos no GitHub. Se o iPhone mantiver uma versÃ£o antiga, feche o app, abra a URL no Safari e recarregue a pÃ¡gina.

## SeguranÃ§a da chave

NÃ£o coloque a chave do TMDB em `app.js` nem em outro arquivo do repositÃ³rio. O app pede a chave no prÃ³prio aparelho e a salva no armazenamento local.

## CrÃ©ditos

Este produto usa a API do TMDB, mas nÃ£o Ã© endossado nem certificado pelo TMDB.

