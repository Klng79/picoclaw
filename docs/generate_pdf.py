import sys
import os
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
import re

def convert_md_to_pdf(input_file, output_file):
    if not os.path.exists(input_file):
        print(f"Error: {input_file} not found")
        return

    doc = SimpleDocTemplate(output_file, pagesize=letter)
    styles = getSampleStyleSheet()
    
    # Custom style for tables
    table_content_style = ParagraphStyle(
        'TableContent',
        parent=styles['Normal'],
        fontSize=8,
        leading=10
    )

    story = []
    
    with open(input_file, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    in_table = False
    table_data = []

    for line in lines:
        line = line.strip('\n')
        
        # Table detection
        if line.strip().startswith('|'):
            if '---' in line:
                continue
            
            # If we were not in a table, start one
            if not in_table:
                in_table = True
                table_data = []

            # Extract row parts
            parts = [p.strip() for p in line.split('|') if p.strip() or line.count('|') > 1]
            if parts:
                # Wrap cell content in Paragraph for wrapping
                row = [Paragraph(p, table_content_style) for p in parts]
                table_data.append(row)
            continue
        else:
            # End of table
            if in_table:
                if table_data:
                    # Create table
                    col_widths = [80, 60, 320] # Tailored for the 3-column API table
                    t = Table(table_data, colWidths=col_widths, repeatRows=1)
                    t.setStyle(TableStyle([
                        ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                        ('FONTSIZE', (0, 0), (-1, -1), 8),
                        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                        ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                        ('GRID', (0, 0), (-1, -1), 1, colors.black),
                        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                    ]))
                    story.append(t)
                    story.append(Spacer(1, 12))
                in_table = False
                table_data = []

        # Image detection ![text](path)
        img_match = re.match(r'!\[.*?\]\((.*?)\)', line.strip())
        if img_match:
            img_path = img_match.group(1)
            if os.path.exists(img_path):
                # Scale image to fit width (leaving some margin)
                available_width = letter[0] - 100
                img = Image(img_path)
                img_width, img_height = img.wrap(available_width, letter[1])
                aspect = img_height / img_width
                img.drawWidth = available_width
                img.drawHeight = available_width * aspect
                story.append(img)
                story.append(Spacer(1, 12))
            continue

        # Heading detection
        if line.startswith('# '):
            story.append(Paragraph(line[2:], styles['Title']))
            story.append(Spacer(1, 12))
        elif line.startswith('## '):
            story.append(Paragraph(line[3:], styles['Heading1']))
            story.append(Spacer(1, 12))
        elif line.startswith('### '):
            story.append(Paragraph(line[4:], styles['Heading2']))
            story.append(Spacer(1, 8))
        # Bullet points
        elif line.strip().startswith('- ') or line.strip().startswith('* '):
            story.append(Paragraph(line, styles['Normal'], bulletText='•'))
        # Paragraphs
        elif line.strip():
            story.append(Paragraph(line, styles['Normal']))
            story.append(Spacer(1, 6))

    # Catch last table if file ends with one
    if in_table and table_data:
        t = Table(table_data)
        story.append(t)

    doc.build(story)
    print(f"Success: PDF generated at {output_file}")

if __name__ == "__main__":
    input_md = "docs/dashboard_documentation.md"
    output_pdf = "docs/dashboard_documentation.pdf"
    convert_md_to_pdf(input_md, output_pdf)
