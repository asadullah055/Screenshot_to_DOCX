import fs from "node:fs";
import path from "node:path";
import JSZip from "jszip";
import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  HeightRule,
  ImageRun,
  LevelFormat,
  Packer,
  PageNumber,
  PageOrientation,
  Paragraph,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TextRun,
  VerticalAlignTable,
  WidthType,
} from "docx";

const OUT = path.resolve("Checkout - SWR BKR 2B - Primary Block.docx");
const ASSETS = path.resolve("assets");

const COLORS = {
  navy: "005695",
  darkNavy: "002B4B",
  cyan: "00AEFF",
  teal: "25C8D0",
  green: "99E928",
  grey1: "E9E9E9",
  grey2: "D2D2D2",
  grey3: "D9D9D9",
  greyText: "626569",
  black: "000000",
  white: "FFFFFF",
};

const font = "Arial";
const size = {
  body: 18,
  subLabel: 20,
  header: 22,
  title: 28,
};

const dxa = (inches) => Math.round(inches * 1440);

const noBorder = {
  style: BorderStyle.NIL,
  size: 0,
  color: COLORS.white,
};

const gridBorder = {
  style: BorderStyle.SINGLE,
  size: 4,
  color: COLORS.black,
};

const allGridBorders = {
  top: gridBorder,
  bottom: gridBorder,
  left: gridBorder,
  right: gridBorder,
  insideHorizontal: gridBorder,
  insideVertical: gridBorder,
};

const allNoBorders = {
  top: noBorder,
  bottom: noBorder,
  left: noBorder,
  right: noBorder,
  insideHorizontal: noBorder,
  insideVertical: noBorder,
};

const img = (name) => fs.readFileSync(path.join(ASSETS, name));

function run(text = "", opts = {}) {
  return new TextRun({
    text,
    font,
    size: opts.size ?? size.body,
    bold: opts.bold ?? false,
    italics: opts.italics ?? false,
    color: opts.color ?? COLORS.black,
    break: opts.break,
  });
}

function para(children, opts = {}) {
  const actualChildren = Array.isArray(children) ? children : [run(children ?? "", opts)];
  return new Paragraph({
    children: actualChildren,
    alignment: opts.alignment ?? AlignmentType.LEFT,
    spacing: {
      before: opts.before ?? 0,
      after: opts.after ?? 80,
      line: opts.line ?? 240,
    },
    indent: opts.indent,
    numbering: opts.numbering,
    keepNext: opts.keepNext,
  });
}

function cell(children, width, opts = {}) {
  const paragraphs = Array.isArray(children) ? children : [para(children ?? "", opts)];
  return new TableCell({
    children: paragraphs.length ? paragraphs : [para("")],
    width: { size: width, type: WidthType.DXA },
    columnSpan: opts.columnSpan,
    verticalAlign: opts.verticalAlign ?? VerticalAlignTable.CENTER,
    margins: {
      top: opts.marginTop ?? 80,
      bottom: opts.marginBottom ?? 80,
      left: opts.marginLeft ?? 120,
      right: opts.marginRight ?? 120,
    },
  });
}

function headerCell(children, width, opts = {}) {
  return new TableCell({
    children: Array.isArray(children) ? children : [para(children ?? "", opts)],
    width: { size: width, type: WidthType.DXA },
    borders: {
      top: noBorder,
      bottom: noBorder,
      left: noBorder,
      right: noBorder,
    },
    margins: { top: 0, bottom: 0, left: 0, right: 0 },
    verticalAlign: VerticalAlignTable.TOP,
  });
}

function table(rows, widths, opts = {}) {
  const tableWidth = widths.reduce((a, b) => a + b, 0);
  return new Table({
    rows,
    width: { size: tableWidth, type: WidthType.DXA },
    columnWidths: widths,
    layout: TableLayoutType.FIXED,
    indent: { size: opts.indent ?? 0, type: WidthType.DXA },
    borders: opts.borders ?? allGridBorders,
    alignment: opts.alignment ?? AlignmentType.LEFT,
    margins: {
      top: opts.marginTop ?? 80,
      bottom: opts.marginBottom ?? 80,
      left: opts.marginLeft ?? 120,
      right: opts.marginRight ?? 120,
    },
  });
}

function bodyCellText(text, opts = {}) {
  return [para([run(text, opts)], { after: 0, alignment: opts.alignment })];
}

function sectionTitleRow(title, widths) {
  return new TableRow({
    children: [
      cell([para([run(title, { bold: true, size: size.header })], { after: 0 })], widths.reduce((a, b) => a + b, 0), {
        columnSpan: widths.length,
      }),
    ],
  });
}

function headerRow(labels, widths) {
  return new TableRow({
    tableHeader: true,
    children: labels.map((label, i) =>
      cell(bodyCellText(label, { bold: true, size: size.header, alignment: AlignmentType.CENTER }), widths[i]),
    ),
  });
}

function dataRow(values, widths) {
  return new TableRow({
    cantSplit: false,
    children: values.map((value, i) => cell(bodyCellText(value), widths[i])),
  });
}

function spacer(after = 120) {
  return para("", { after });
}

function makeHeader(firstPage = false) {
  const w = [dxa(1.45), dxa(2.8), dxa(2.25)];
  const topLeft = firstPage
    ? [
        new Paragraph({
          children: [
            new ImageRun({
              type: "png",
              data: img("mcdean-logo-header.png"),
              transformation: { width: 130, height: 20 },
              altText: { title: "M.C. Dean logo", description: "M.C. Dean logo" },
            }),
          ],
          spacing: { after: 20 },
        }),
      ]
    : [para("", { after: 0 })];

  const top = new TableRow({
    children: [
      headerCell(topLeft, w[0]),
      headerCell([para([run("M.C. Dean Proprietary", { bold: true, color: COLORS.darkNavy })], {
        alignment: AlignmentType.CENTER,
        after: 0,
      })], w[1]),
      headerCell([
        para([run("UNCONTROLLED COPY", { bold: true, color: COLORS.darkNavy })], {
          alignment: AlignmentType.RIGHT,
          after: 0,
        }),
        para([run("See online master for current revision", { size: 16, color: COLORS.greyText })], {
          alignment: AlignmentType.RIGHT,
          after: 0,
        }),
      ], w[2]),
    ],
  });

  const blockWidths = [dxa(4.25), dxa(2.25)];
  const bottom = new TableRow({
    children: [
      headerCell([
        para([run("Subject", { bold: true, size: size.subLabel, color: COLORS.darkNavy })], { after: 0 }),
        para([run("Checkout - SWR BKR 2B - Primary Block", { size: size.body })], { after: 0 }),
      ], blockWidths[0]),
      headerCell([
        para([run("Document ID: ", { bold: true, color: COLORS.darkNavy }), run("FRM")], {
          alignment: AlignmentType.RIGHT,
          after: 0,
        }),
        para([run("Revision: ", { bold: true, color: COLORS.darkNavy }), run("0")], {
          alignment: AlignmentType.RIGHT,
          after: 0,
        }),
      ], blockWidths[1]),
    ],
  });

  return new Header({
    children: [
      table([top], w, { borders: allNoBorders }),
      table([bottom], blockWidths, { borders: allNoBorders }),
    ],
  });
}

function footerInfoTable() {
  const widths = [dxa(2.55), dxa(1.4), dxa(2.55)];
  return table(
    [
      new TableRow({
        children: [
          headerCell([para([run("Classification Level: Confidential & Proprietary", { size: 16 })], { after: 0 })], widths[0]),
          headerCell([para([new TextRun({ children: [PageNumber.CURRENT], font, size: 16 })], {
            alignment: AlignmentType.CENTER,
            after: 0,
          })], widths[1]),
          headerCell([para([run("\u00A9 2025. M.C. Dean, Inc. All rights reserved.", { size: 16 })], {
            alignment: AlignmentType.RIGHT,
            after: 0,
          })], widths[2]),
        ],
      }),
    ],
    widths,
    { borders: allNoBorders },
  );
}

function makeFooter(firstPage = false) {
  const children = [];
  if (firstPage) {
    children.push(
      new Paragraph({
        children: [
          new ImageRun({
            type: "png",
            data: img("mcdean-brand-bar-placeholder.png"),
            transformation: { width: 624, height: 47 },
            altText: {
              title: "M.C. Dean brand bar placeholder",
              description: "Brand bar placeholder with Building Intelligence and mcdean.com",
            },
          }),
        ],
        spacing: { after: 20 },
      }),
    );
  }
  children.push(footerInfoTable());
  return new Footer({ children });
}

const equipmentWidths = [dxa(2.23), dxa(2.29), dxa(1.97)];
const controlWidths = [dxa(2.06), dxa(1.0), dxa(1.0), dxa(0.92), dxa(1.52)];
const punchWidths = [dxa(0.51), dxa(2.14), dxa(1.97), dxa(0.88), dxa(1.37)];
const signWidths = [dxa(1.27), dxa(2.61), dxa(2.61)];

const analogPoints = [
  "Data/Amps_A",
  "Data/Amps_Avg",
  "Data/Amps_B",
  "Data/Amps_C",
  "Data/Amps_G",
  "Data/Amps_N",
  "Data/kVA",
  "Data/kW",
  "Data/kWh",
  "Data/PF",
  "Data/Pos",
  "Data/Status",
  "Data/Volts_AB",
  "Data/Volts_AN",
  "Data/Volts_BC",
  "Data/Volts_BN",
  "Data/Volts_CA",
  "Data/Volts_CN",
  "Data/Volts_LL_Avg",
  "Data/Volts_LN_Avg",
];

const digitalPoints = ["Data/CB_Position", "Data/Comm_Fail", "Data/Status_Changed"];
const alarmPoints = ["Data/Breaker_Status_Alarm", "Data/CB_NC", "Data/CB_NO", "Data/Percent_Load", "Data/Tripped"];
const memoryPoints = ["Data/Amp_Rating", "Data/CB_Normal_State", "Data/Feeds", "Data/Nominal_Volts"];

function controlRows() {
  const rows = [];
  rows.push(sectionTitleRow("Section A - Analog Control Points", controlWidths));
  rows.push(headerRow(["Data Point", "Field Value", "SCADA Value", "Values Match", "Incident Report No. / Notes"], controlWidths));
  analogPoints.forEach((point) => rows.push(dataRow([point, "", "", "", ""], controlWidths)));

  rows.push(sectionTitleRow("Section B - Digital Control Points", controlWidths));
  rows.push(headerRow(["Data Point", "Status Simulated / Command Sent", "Status Verified in SCADA", "Pass/ Fail", "Incident Report No. / Notes"], controlWidths));
  digitalPoints.forEach((point) => rows.push(dataRow([point, "", "", "", ""], controlWidths)));

  rows.push(sectionTitleRow("Section C - Alarm Points", controlWidths));
  rows.push(headerRow(["Data Point", "Status Simulated", "Status Verified in SCADA", "Pass/ Fail", "Incident Report No. / Notes"], controlWidths));
  alarmPoints.forEach((point) => rows.push(dataRow([point, "", "", "", ""], controlWidths)));

  rows.push(sectionTitleRow("Section D - Memory Points", controlWidths));
  rows.push(headerRow(["Data Point", "Status Simulated/ Command Sent or Field Value", "Status Verified in SCADA or SCADA Value", "Pass/ Fail or Values Match", "Incident Report No./Notes"], controlWidths));
  memoryPoints.forEach((point) => rows.push(dataRow([point, "", "", "", ""], controlWidths)));
  return rows;
}

function evidenceImage(name, alt) {
  return new Paragraph({
    children: [
      new ImageRun({
        type: "png",
        data: img(name),
        transformation: { width: 600, height: 240 },
        altText: { title: alt, description: alt },
      }),
    ],
    alignment: AlignmentType.CENTER,
    spacing: { before: 60, after: 120 },
  });
}

function buildDoc() {
  const children = [
    para([run("Checkout - SWR BKR 2B - Primary Block", { bold: true, size: size.title, color: COLORS.darkNavy })], {
      after: 120,
      keepNext: true,
    }),
    para([run("Safety Procedures", { bold: true, size: size.header })], { after: 40, keepNext: true }),
    para([run("OFCI Equipment Checkout Safety Plan", { size: size.subLabel })], { after: 80, keepNext: true }),
  ];

  const safetyItems = [
    ["Pre-energization inspection is ", "completed", " and the equipment is ready to be energized"],
    ["Perform ORM with all personnel involved and review procedure as well as backout plan. Identify muster point"],
    ["Verify appropriate safety zones and barricades are in place in accordance to our control scheme"],
    ["Area access control is in place"],
    ["Equipment signs - nameplate, name tag, arc-flash labels, and safety signage - are installed correctly"],
    ["Verify proper operation of test equipment"],
    ["Safe work conditions have been established and verified prior to energization"],
    ["Work with Vendor support team"],
  ];

  safetyItems.forEach((item) => {
    const runs =
      item.length === 3
        ? [run(item[0]), run(item[1], { bold: true }), run(item[2])]
        : [run(item[0])];
    children.push(
      para(runs, {
        numbering: { reference: "safety-numbering", level: 0 },
        after: 40,
        line: 240,
      }),
    );
  });

  children.push(spacer(80));
  children.push(
    table(
      [
        headerRow(["Equipment Tag Name", "Equipment Manufacturer", "Equipment Model"], equipmentWidths),
        dataRow(["RIC2_DC6_SWR_B1_BKR_2B", "ABB", "EMAX 4.2"], equipmentWidths),
      ],
      equipmentWidths,
    ),
  );
  children.push(spacer(120));
  children.push(table(controlRows(), controlWidths));
  children.push(spacer(120));

  children.push(para([run("SCADA Evidence Screenshots", { bold: true, size: size.header })], { keepNext: true, after: 60 }));
  children.push(evidenceImage("scada-overview-placeholder.png", "SCADA overview status screenshot placeholder"));
  children.push(evidenceImage("scada-alerts-placeholder.png", "SCADA alerts screenshot placeholder"));

  const punchRows = [
    sectionTitleRow("Punchlist Items", punchWidths),
    headerRow(["#", "Description", "Assign To", "Status", "Incident Report No. / Notes"], punchWidths),
  ];
  for (let i = 1; i <= 6; i += 1) {
    punchRows.push(
      new TableRow({
        height: { value: 430, rule: HeightRule.ATLEAST },
        children: [
          cell(bodyCellText(String(i), { alignment: AlignmentType.CENTER }), punchWidths[0]),
          cell(bodyCellText(""), punchWidths[1]),
          cell(bodyCellText(""), punchWidths[2]),
          cell(bodyCellText(`{{STATUS_DROPDOWN_${i}}}`, { alignment: AlignmentType.CENTER }), punchWidths[3]),
          cell(bodyCellText(""), punchWidths[4]),
        ],
      }),
    );
  }
  children.push(table(punchRows, punchWidths));
  children.push(spacer(120));

  const signRows = [
    new TableRow({
      children: [
        cell(bodyCellText("M.C. Dean", { bold: true }), signWidths[0]),
        cell(bodyCellText("Engineer", { bold: true, alignment: AlignmentType.CENTER }), signWidths[1]),
        cell(bodyCellText("QC Representative", { bold: true, alignment: AlignmentType.CENTER }), signWidths[2]),
      ],
    }),
    dataRow(["Print Name:", "", ""], signWidths),
    dataRow(["Signature:", "", ""], signWidths),
    dataRow(["Date:", "", ""], signWidths),
  ];
  children.push(table(signRows, signWidths));

  return new Document({
    creator: "OpenAI Codex",
    title: "Checkout - SWR BKR 2B - Primary Block",
    description: "M.C. Dean commissioning checklist template",
    styles: {
      default: {
        document: {
          run: { font, size: size.body, color: COLORS.black },
          paragraph: { spacing: { before: 0, after: 80, line: 240 } },
        },
      },
      paragraphStyles: [
        {
          id: "Normal",
          name: "Normal",
          basedOn: "Normal",
          next: "Normal",
          run: { font, size: size.body, color: COLORS.black },
          paragraph: { spacing: { before: 0, after: 80, line: 240 } },
        },
      ],
    },
    numbering: {
      config: [
        {
          reference: "safety-numbering",
          levels: [
            {
              level: 0,
              format: LevelFormat.DECIMAL,
              text: "%1.",
              alignment: AlignmentType.LEFT,
              style: {
                paragraph: {
                  indent: { left: 540, hanging: 270 },
                  spacing: { after: 40, line: 240 },
                },
                run: { font, size: size.body },
              },
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {
          titlePage: true,
          page: {
            size: {
              width: 12240,
              height: 15840,
              orientation: PageOrientation.PORTRAIT,
            },
            margin: {
              top: dxa(1.7),
              bottom: dxa(1),
              left: dxa(1),
              right: dxa(1),
              header: dxa(0.5),
              footer: dxa(0.6),
            },
          },
        },
        headers: {
          first: makeHeader(true),
          default: makeHeader(false),
        },
        footers: {
          first: makeFooter(true),
          default: makeFooter(false),
        },
        children,
      },
    ],
  });
}

function xmlEscape(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

async function patchDropdowns(filePath) {
  const zip = await JSZip.loadAsync(fs.readFileSync(filePath));
  const documentXmlPath = "word/document.xml";
  let xml = await zip.file(documentXmlPath).async("string");
  for (let i = 1; i <= 6; i += 1) {
    const token = `{{STATUS_DROPDOWN_${i}}}`;
    const tag = `PunchlistStatus${i}`;
    const replacement = [
      `<w:sdt>`,
      `<w:sdtPr>`,
      `<w:alias w:val="${tag}"/>`,
      `<w:tag w:val="${tag}"/>`,
      `<w:id w:val="${1000 + i}"/>`,
      `<w:dropDownList>`,
      `<w:listItem w:displayText="Choose an item." w:value="Choose an item."/>`,
      `<w:listItem w:displayText="Open" w:value="Open"/>`,
      `<w:listItem w:displayText="In Progress" w:value="In Progress"/>`,
      `<w:listItem w:displayText="Closed" w:value="Closed"/>`,
      `</w:dropDownList>`,
      `</w:sdtPr>`,
      `<w:sdtContent><w:r><w:rPr><w:rFonts w:ascii="${font}" w:hAnsi="${font}"/><w:sz w:val="${size.body}"/></w:rPr><w:t>${xmlEscape(
        "Choose an item.",
      )}</w:t></w:r></w:sdtContent>`,
      `</w:sdt>`,
    ].join("");
    const escapedToken = token.replace(/[{}]/g, "\\$&");
    const runContainingOnlyToken = new RegExp(
      `<w:r>(?:(?!</w:r>).)*?<w:t[^>]*>${escapedToken}</w:t>(?:(?!</w:r>).)*?</w:r>`,
    );
    xml = xml.replace(runContainingOnlyToken, replacement);
  }
  zip.file(documentXmlPath, xml);
  fs.writeFileSync(filePath, await zip.generateAsync({ type: "nodebuffer" }));
}

const doc = buildDoc();
const buffer = await Packer.toBuffer(doc);
fs.writeFileSync(OUT, buffer);
if (process.env.SKIP_DROPDOWN_PATCH !== "1") {
  await patchDropdowns(OUT);
}
console.log(OUT);
