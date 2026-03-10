# Repository Instructions

## Quarto Docs

Applies to: `/docs/**/*.qmd`

Rules:

* Each file must contain **exactly one H1 (`#`)**, and it must be the first heading.
* **Never add another H1** anywhere in the file.
* **Do not include `title` in the YAML header.** Quarto uses the first H1 as the document title. Omit the YAML header entirely unless you need other front matter (e.g. format options).
* All other headings must be **H2 or deeper (`##`, `###`, etc.)**.
* **Do not hard-code section numbers** in headings. Quarto generates numbering.
* Ensure the **documentation guard comment** exists at the top of the file.

Valid:

```
# Page Title

## Section
### Subsection
```

Invalid:

```
# Page Title
# Another Title

## 1. Overview
```

Required guard comment at the top of every `.qmd` file:

```
<!--
DOC STRUCTURE RULES
- Exactly one H1 (#) heading at the top
- All other headings must be ## or deeper
- Do NOT hard-code section numbers
- Do NOT put title in YAML header (Quarto uses first H1)
-->
```

