# Self-hosted Noto SC fonts

This directory contains web-font derivatives used by the application:

- `noto-sans-sc-400-500.woff2`: Noto Sans SC variable font limited to weights 400-500.
- `noto-serif-sc-400-700.woff2`: Noto Serif SC variable font limited to weights 400-700.

The WOFF2 files retain the complete Simplified Chinese glyph coverage required for user-authored text. They were generated from the locally installed official Noto SC variable TTF files with FontTools 4.55.3 and Brotli 1.0.9. Only the weight-axis range and web-font container were changed.

Copyright notices embedded in the source fonts:

- Noto Sans SC: Copyright 2014-2021 Adobe, with Reserved Font Name "Source".
- Noto Serif SC: Copyright 2017-2023 Adobe.

Both fonts are distributed under the SIL Open Font License, Version 1.1. See `OFL.txt` in this directory.

The directory also contains `italianno-400.woff2`, used for the dynamic
`Collection NO.` label on the today-collection page. It is the official
Italianno Regular webfont distributed under the SIL Open Font License,
Version 1.1. See `OFL-Italianno.txt`.
