# Why there are fonts under api/

The workbook PDF is built on the server by api/workbook-pdf.js, and a PDF
carries its own type: whatever the reader has installed is irrelevant, so the
faces have to be embedded. These are the same files the app bundles, copied
rather than imported because a serverless function cannot reach into the app's
asset folder at runtime.

Four faces, because that is what the document needs: DM Sans regular, medium
and bold for the body, and Playfair Display bold for the headings. There is no
italic file here; pdfmake needs a mapping for italics, so it is given the
regular face and italic passages come through upright rather than slanted. A
real italic is one more file when someone wants one.
