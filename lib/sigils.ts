import type { SigilId } from './realm-data'

/**
 * Sigilos em ASCII: arte original, desenhada à mão para este portfólio.
 * Cada um cabe numa grade de ~26×13 caracteres monoespaçados.
 */
export const sigils: Record<SigilId, string> = {
  wolf: String.raw`
      /\              /\
     /  \____________/  \
    /   /            \   \
   |   /   \      /   \   |
   |  |    (o)  (o)    |  |
    \ |       /\       | /
     \|      /  \      |/
      \     /____\     /
       \    \_  _/    /
        \     \/     /
         \__________/
`,
  tower: String.raw`
           (  )
           _||_
          /____\
          | [] |
         /______\
         |  []  |
         |      |
        /________\
        | [] []  |
        |        |
       /__________\
       |   [][]   |
      /____________\
`,
  rose: String.raw`
          _.-~~-._
        .' ,-~~-, '.
       /  ( (@@) )  \
      |    '-,,-'    |
       \   .-~~-.   /
        '._\____/_.'
            |  |    _
        _   |  |   / )
       ( \  |  |  / /
        \ \ |  | / /
         '-.|  |.-'
            |  |
`,
  lion: String.raw`
       \\\\ |||| ////
     \\\\   .--.   ////
    \\\\   / ^^ \   ////
    ====   |o  o|   ====
    ////   \ () /   \\\\
     ////   \/\/   \\\\
       //// |||| \\\\
          ///  \\\
`,
  dragon: String.raw`
   /\                      /\
  /  \       _/\_         /  \
 / /\ \     ( oo )       / /\ \
/ /  \ \____/ \/ \______/ /  \ \
\/    \       ||        /    \/
       \     /  \      /
        \___/ /\ \____/
             /  \
            /_/\_\
`,
  raven: String.raw`
            ___
         _.'o  '.
        /   _.-._\___
       |   /    ^^---->
        \  \____.--'
        /        \
       /   /|  |\  \
      /___/ |  | \__\
            |__|
            /  \
`,
}

/** Linhas do sigilo, sem a primeira linha vazia do template. */
export function sigilLines(id: SigilId): string[] {
  const lines = sigils[id].split('\n')
  while (lines.length && !lines[0].trim()) lines.shift()
  while (lines.length && !lines[lines.length - 1].trim()) lines.pop()
  return lines
}
