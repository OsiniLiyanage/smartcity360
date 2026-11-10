# SmartCity360 project-document source

This folder contains the editable source assets for the OODP II Word project document.

## Files

- `PROJECT_DOCUMENT_SOURCE.md`: report body, assessment answers, tables, references and appendices.
- `assets/`: institution cover artwork extracted from the student's supplied previous project document.
- `figures/`: project-owned architecture, data, sequence and UML diagrams.
- `../../scripts/generate_report_diagrams.py`: regenerates the diagram PNG files with Pillow.
- `../../scripts/generate_project_document.py`: builds the Microsoft Word `.docx` file with `python-docx` and Pillow.

Candidate identifiers are not stored in the tracked source. Supply them only when generating the private Word deliverable.

## Generate

Install the two document-only Python packages outside the application runtime:

```text
python -m pip install python-docx Pillow
```

Regenerate diagrams:

```text
python scripts/generate_report_diagrams.py
```

Generate the private Word file:

```text
python scripts/generate_project_document.py \
  --name "Student name" \
  --nic "NIC" \
  --branch "Branch" \
  --student-id "Student ID" \
  --admission-no "Admission number" \
  --output SmartCity360_Project_Document_Draft.docx
```

The generated Word file is ignored to avoid publishing private candidate identifiers. Open it in Microsoft Word, select all, update every field, and review the table of contents, list of figures, list of tables, captions and page numbers.

## Before final submission

1. Confirm candidate details and official unit/assessment identifiers.
2. Complete the final application acceptance run and replace draft evidence statements with exact results.
3. Reconcile screenshots, test counts, class names and limitations with the final commit.
4. Confirm lecturer/author metadata for supplied class notes.
5. Verify native print preview and the application report's Save as PDF result.
6. Remove working-draft notices and unresolved placeholders.
7. Update all Word fields and inspect the exported PDF at normal zoom.
8. Keep the project PDF, source ZIP and demonstration MP4 as separate portal deliverables.

Do not describe planned features as implemented or convert older dated checks into a claim that they were rerun against the final build.
