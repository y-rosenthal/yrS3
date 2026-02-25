# Quarto documentation book — build guide

This document explains how to build and regenerate the **HTML documentation book** for this project. The book is built with [Quarto](https://quarto.org/) and turns the markdown files in `docs/` into a single navigable HTML site.

## What gets built

- **Source:** All `.md` and `.qmd` files in `docs/` that are listed in `docs/_quarto.yml`.
- **Output:** Rendered HTML and assets go into **`docs/_book/`**. Open `docs/_book/index.html` in a browser to read the book.

## When to regenerate

Regenerate the book whenever you:

- Add, remove, or rename documentation files (and update `_quarto.yml` if needed).
- Edit any of the docs that are included in the book.

---

## 1. Installing Quarto

You need the **Quarto CLI** to render the book. If `quarto --version` works in your terminal, you can skip this section.

### Option A: Official installer (recommended)

1. Go to [https://quarto.org/docs/get-started/](https://quarto.org/docs/get-started/).
2. Choose your OS and follow the install steps. On Linux you can use the `.deb` package or the tarball; on macOS, the `.pkg`; on Windows, the `.msi`.

### Option B: Linux (tarball, single user)

Replace `VERSION` with a release from [Quarto releases](https://github.com/quarto-dev/quarto-cli/releases) (e.g. `1.4.553`):

```bash
# Download and extract
wget https://github.com/quarto-dev/quarto-cli/releases/download/v${VERSION}/quarto-${VERSION}-linux-amd64.tar.gz
mkdir -p ~/opt
tar -C ~/opt -xzf quarto-${VERSION}-linux-amd64.tar.gz

# Make quarto available (adjust if you use a different bin directory)
mkdir -p ~/.local/bin
ln -sf ~/opt/quarto-${VERSION}/bin/quarto ~/.local/bin/quarto

# Ensure ~/.local/bin is in PATH (e.g. add to ~/.bashrc or ~/.profile)
export PATH="$HOME/.local/bin:$PATH"
```

### Verify

```bash
quarto check
```

This checks the CLI and suggests any missing tools (e.g. Pandoc).

---

## 2. Regenerating the book

From **inside** the `docs/` directory (recommended):

```bash
cd docs
quarto render
```

Or from the **project root** (the directory that contains `docs/`):

```bash
quarto render docs
```

If you see errors about missing environment variables when running from the project root, run the command from inside `docs/` instead so only the book project is used.

After a successful run, open **`docs/_book/index.html`** in your browser to view the book.

### Optional: preview while editing

To auto-rebuild when files change and optionally open the book in a browser:

```bash
quarto preview docs
```

Press `Ctrl+C` to stop the preview server.

---

## 3. Adding or removing chapters

The book’s table of contents is defined in **`docs/_quarto.yml`** under `book.chapters`. To add a new doc:

1. Add the file (e.g. `My-New-Doc.md`) to `docs/`.
2. In `docs/_quarto.yml`, add an entry under the appropriate part, for example:

   ```yaml
   chapters:
     - part: "Reference"
       chapters:
         - QUESTION-FORMAT-0.0.1.md
         - SETUP-0.0.1-v001.md
         - My-New-Doc.md   # new file
   ```

3. Run `quarto render docs` again.

To remove a chapter, delete or comment out its entry in `_quarto.yml` and re-render.

---

## 4. Summary

| Task              | Command (from project root) |
|-------------------|-----------------------------|
| Build the book    | `quarto render docs`         |
| Preview live      | `quarto preview docs`        |
| View the book     | Open `docs/_book/index.html` in a browser |

For more on Quarto books, see [Quarto — Creating a Book](https://quarto.org/docs/books/).
