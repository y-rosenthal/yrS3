# How to navigate documentation for this project

This document describes the various types of documentation files and the
version numbering scheme.

## Reading the docs as an HTML book

The documentation in `docs/` can be rendered as a single **Quarto book** (HTML) for easier reading. To build or rebuild the book after documentation changes, see **[QUARTO-DOC-GUIDE.md](QUARTO-DOC-GUIDE.md)**. That guide explains how to install the Quarto tools (if needed) and how to regenerate the book. The built book is in `docs/_book/`; open `docs/_book/index.html` in a browser to read it.

## v001 version format

In general, any document (including this one) can have a -v001 format style 
version number at the end of its name. 
This notation is used to ensure that it is easy to compare
different versions of the same document - without needing to know how to use
GIT commands.

## SPEC documents

This system will be continuously developed in an incremental way.
Each incremental development phase will be versioned in 0.0.1 style.
Each incremental development phase will have a spec document named SPEC-v0.0.1.md
or something similar, where the version number for the spec matches the 
version number of the release.

## PVD documents

PVD stands for Product Vision Document. 
A PVD is a living document that describes the goals for the full system. 
The names of PVD documents e.g. PVD-0.0.1-v001 represent (a) the SPEC version
that was active at the time the PVD was modifed, as well as a 2ndary ver number.
The ver number at the end of the name of a PVD document represents different
versions of the PVD for a particular incremental development step.
If the PVD was not modified at a particular incremental development step, then 
no new PVD version would be created at that step and the PVD version number will remain
unchanged for that step. Therefore the PVD version numbers could skip numbers, for example
if the PVD was modified when SPEC-v0.0.1 was created and then again when SPEC-v0.0.5 
was created then the only versions of the PVD would be PVD-v0.0.1 and PVD-v0.0.5.

